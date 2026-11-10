import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('production-build.json','utf8'));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
test('production integrity: hashed runtime-only files, relative references and original preservation',()=>{
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name).replace(/^docs\//,'')]);
 assert.deepEqual(walk('docs').sort(),Object.keys(manifest.files).sort());assert.equal(Object.keys(manifest.files).length,13);
 for(const [name,info]of Object.entries(manifest.files)){const data=fs.readFileSync('docs/'+name);assert.equal(data.length,info.bytes);assert.equal(hash(data),info.sha256);if(name!=='index.html')assert.ok(name.includes(info.sha256.slice(0,12)));}
 for(const [name,digest]of Object.entries(manifest.source_hashes))assert.equal(hash(fs.readFileSync(name)),digest);
 const html=fs.readFileSync('docs/index.html','utf8'),js=fs.readFileSync('docs/'+Object.keys(manifest.files).find(n=>n.endsWith('.js')),'utf8'),css=fs.readFileSync('docs/'+Object.keys(manifest.files).find(n=>n.endsWith('.css')),'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.ok(fs.existsSync('docs/'+match[1]));
 for(const match of css.matchAll(/url\(["']?([^)'"\s]+)/g))assert.ok(fs.existsSync('docs/assets/'+match[1]));
 for(const match of js.matchAll(/assets\/[a-z_]+\.[a-f0-9]+\.webp/g))assert.ok(fs.existsSync('docs/'+match[0]));
 for(const image of manifest.images)assert.ok(js.includes(image.output)||css.includes(path.basename(image.output)));
 assert.ok(!/\/Users\/|localhost|127\.0\.0\.1|https?:\/\//.test(html+js+css));assert.ok(!js.includes('serviceWorker'));
 assert.ok(manifest.optimized_runtime_bytes<manifest.original_runtime_bytes);assert.equal(manifest.images.length,10);
});
class Element{constructor(){this.children=[];this.style={};this.textContent='';this.attributes={};this.disabled=false;this.hidden=false;this.classList={add(){},remove(){}};}append(e){this.children.push(e);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}focus(){}}
test('minified production gameplay: mixed outcomes, every picture, repeated letters, timers, results and restart',async()=>{
 const ids=new Map(),events=new Map(),timers=new Map(),notes=[],gains=[];let now=0,nextId=0;
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
 globalThis.document={getElementById(id){if(!ids.has(id))ids.set(id,new Element());return ids.get(id);},createElement(){return new Element();}};
 globalThis.Image=Element;globalThis.innerWidth=960;globalThis.innerHeight=540;globalThis.addEventListener=(name,fn)=>events.set(name,fn);
 class Param{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
 globalThis.window={AudioContext:class{constructor(){this.state='running';this.currentTime=0;}createGain(){const g={gain:new Param(),connect(){},disconnect(){}};gains.push(g);return g;}createOscillator(){return {frequency:{},connect(){},disconnect(){},start(t){notes.push(t);},stop(){}};}}};
 globalThis.setTimeout=(fn,ms)=>{timers.set(++nextId,{fn,at:now+ms,ms});return nextId;};globalThis.clearTimeout=id=>timers.delete(id);
 const tick=ms=>{now+=ms;for(const [id,t]of timers)if(t.at<=now){timers.delete(id);t.fn();}};
 try{
  const name=Object.keys(manifest.files).find(n=>n.endsWith('.js'));await import('../docs/'+name);
  assert.match(ids.get('stage').style.transform,/scale\(0.5\)/);
  const key=(letter,extra={})=>events.get('keydown')({key:letter,preventDefault(){},...extra});const buttons=ids.get('keyboard').children.flatMap(r=>r.children);assert.equal(buttons.length,27);assert.ok(buttons.every(b=>b.textContent!=='Submit'));
  const answers={pumpkin:'PUMPKIN',turkey:'TURKEY',corn:'CORN',potatoes:'POTATOES',pumpkin_pie:'PUMPKIN PIE',parade:'PARADE',celebrate:'CELEBRATE',thankful:'THANKFUL'};
  const cells=()=>ids.get('letters').children.flatMap(g=>g.children);const text=()=>cells().map(c=>c.textContent).join('');const seen=[];
  for(let i=0;i<8;i++){
   const image=ids.get('picture').src;assert.ok(fs.existsSync('docs/'+image));const name=image.match(/assets\/([a-z_]+)\./)[1],answer=answers[name];assert.ok(answer);seen.push(answer);
   assert.equal(ids.get('lives').attributes['aria-label'],'4 lives remaining');assert.equal(text(),'');
   const first=answer[0];buttons.find(b=>b.textContent===first).onclick();for(const [position,letter]of [...answer.replaceAll(' ','')].entries())if(letter===first){assert.equal(cells()[position].textContent,first);assert.equal(cells()[position].className,'letter accepted');}
   const previous=text(),audioCount=notes.length;key(first.toLowerCase());assert.equal(text(),previous);assert.equal(notes.length,audioCount);assert.equal(ids.get('lives').attributes['aria-label'],'4 lives remaining');
   if(i%2===0){
    for(let j=0;j<4;j++){key('X');assert.equal(ids.get('lives').attributes['aria-label'],`${3-j} lives remaining`);if(j<3)assert.equal(text(),previous);}
    assert.ok(cells().every(c=>c.className==='letter revealed'));assert.equal(text(),answer.replaceAll(' ',''));assert.equal(ids.get('picture').src,image);assert.ok(buttons.every(b=>b.disabled));assert.equal([...timers.values()][0].ms,2000);const t=[...timers.values()][0];key('A');tick(1999);assert.equal(ids.get('picture').src,image);assert.equal(text(),answer.replaceAll(' ',''));tick(1);const progress=ids.get('progress').textContent;t.fn();assert.equal(ids.get('progress').textContent,progress);
   }else{
    const remaining=[...new Set(answer.replaceAll(' ',''))].filter(c=>c!==first);const repeated=remaining.find(c=>answer.split(c).length>2);if(repeated){remaining.splice(remaining.indexOf(repeated),1);remaining.push(repeated);}
    for(const c of remaining)key(c.toLowerCase());assert.ok(cells().every(c=>c.className==='letter accepted'));assert.equal(ids.get('message').textContent,'Well done!');assert.equal([...timers.values()][0].ms,1300);tick(1299);assert.equal(ids.get('picture').src,image);tick(1);
   }
  }
  assert.equal(new Set(seen).size,8);assert.equal(ids.get('results-title').textContent,'Your Results');assert.equal(ids.get('correct-total').textContent,'Correct: 4');assert.equal(ids.get('incorrect-total').textContent,'Incorrect: 4');assert.equal(ids.get('restart').hidden,false);assert.equal(gains[0].gain.value,.35);assert.ok(notes.length>0);
  ids.get('restart').onclick();assert.equal(ids.get('progress').textContent,'1 / 8');assert.equal(ids.get('results').hidden,true);assert.equal(ids.get('restart').hidden,true);assert.equal(text(),'');assert.equal(ids.get('lives').attributes['aria-label'],'4 lives remaining');assert.ok(ids.get('lives').children.every(p=>fs.existsSync('docs/'+p.src)));assert.equal(timers.size,0);
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
