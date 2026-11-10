import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {decodeImage,loadImage} from '../src/loading.js';
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
class Element{
 constructor(){this.children=[];this.style={};this.attributes={};this.hidden=false;this.disabled=false;this.complete=false;this.naturalWidth=0;this.textContent='';this.classList={add(){},remove(){}};}
 append(e){this.children.push(e);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}focus(){}decode(){return Promise.resolve();}
}
const loaded=e=>{e.complete=true;e.naturalWidth=940;e.onload?.();};
test('image readiness waits for decode; cached images resolve; failures reject',async()=>{
 const image=new Element();let release,ready=false;image.decode=()=>new Promise(resolve=>release=resolve);const p=decodeImage(image,'test.webp').then(()=>ready=true);await settle();assert.equal(ready,false);loaded(image);await settle();assert.equal(ready,false);release();await p;assert.equal(ready,true);
 const cached=new Element();cached.complete=true;cached.naturalWidth=92;await decodeImage(cached,'cached.webp');
 const failed=new Element();const error=decodeImage(failed,'missing.webp');const rejected=assert.rejects(error,/essential game image/);failed.onerror();await rejected;
 const invalid=new Element();invalid.complete=true;await assert.rejects(decodeImage(invalid,'empty.webp'));
});
test('startup gates all input on essential decode, requests first picture immediately and defers prefetch',async()=>{
 const ids=new Map(),events=new Map(),images=[];
 globalThis.document={getElementById(id){if(!ids.has(id))ids.set(id,new Element());return ids.get(id);},createElement(){return new Element();}};
 globalThis.Image=class extends Element{constructor(){super();images.push(this);}};globalThis.innerWidth=960;globalThis.innerHeight=540;globalThis.addEventListener=(name,fn)=>events.set(name,fn);globalThis.window={};
 const originalSet=globalThis.setTimeout;globalThis.setTimeout=()=>{throw new Error('Startup must not use artificial delay timers');};
 try{
  await import('../src/game.js');const stage=ids.get('stage'),picture=ids.get('picture');const buttons=ids.get('keyboard').children.flatMap(r=>r.children);
  assert.equal(stage.attributes['aria-busy'],'true');assert.ok(picture.src.endsWith('.png?v=5fbabca978ce'));assert.equal(picture.fetchPriority,'high');assert.ok(buttons.every(b=>b.disabled));assert.equal(images.length,2);assert.ok(images.every(i=>i.fetchPriority==='high'));
  const key=letter=>events.get('keydown')({key:letter,preventDefault(){}});key('X');buttons.find(b=>b.textContent==='X').onclick();assert.equal(ids.get('lives').attributes['aria-label'],'4 lives remaining');
  loaded(images[0]);loaded(images[1]);await settle();assert.equal(stage.attributes['aria-busy'],'true');assert.equal(images.length,2);
  let release;picture.decode=()=>new Promise(resolve=>release=resolve);loaded(picture);await settle();assert.ok(buttons.every(b=>b.disabled));release();await settle();assert.equal(stage.attributes['aria-busy'],'false');assert.equal(buttons.filter(b=>!b.disabled).length,26);assert.equal(images.length,3);assert.equal(images[2].fetchPriority,'low');
  assert.equal(ids.get('load-error').hidden,true);key('X');assert.equal(ids.get('lives').attributes['aria-label'],'3 lives remaining');
  // A nonessential upcoming-picture failure must not hide or lock the current game.
  images[2].onerror();await settle();assert.equal(stage.attributes['aria-busy'],'false');assert.equal(ids.get('load-error').hidden,true);
 }finally{globalThis.setTimeout=originalSet;}
});
test('production delivers inline style and existing-art fallback with early background preload',()=>{
 const html=fs.readFileSync('docs/index.html','utf8');assert.ok(!html.includes('rel="stylesheet"'));assert.match(html,/<style>/);assert.match(html,/data:image\/webp;base64,/);assert.match(html,/<link rel="preload" as="image" fetchpriority="high" href="assets\/background\.[a-f0-9]+\.webp">/);assert.match(html,/id="stage" aria-busy="true"/);assert.ok(!/loading-screen|loading-overlay|spinner/.test(html));
});
