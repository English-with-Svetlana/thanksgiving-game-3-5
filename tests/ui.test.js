import {test} from 'node:test';import assert from 'node:assert/strict';
class Element {
 constructor(){this.complete=true;this.naturalWidth=1;this.children=[];this.style={};this.attributes={};this.className='';this.hidden=false;this.textContent='';this.disabled=false;this.classList={add:()=>{},remove:()=>{},toggle:()=>{}};}
 append(x){this.children.push(x);} replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}focus(){}decode(){return Promise.resolve();}
}
test('UI: immediate all-occurrence validation, 2000 ms reveal, one transition, mixed results, restart and responsive sizing',async()=>{
 const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
 const ids=new Map(),events=new Map(),timers=new Map();let time=0,nextId=0;const scheduled=[];
 globalThis.document={getElementById:id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);},createElement:()=>new Element()};
 globalThis.innerWidth=960;globalThis.innerHeight=540;globalThis.addEventListener=(k,fn)=>events.set(k,fn);globalThis.Image=Element;globalThis.window={};
 const oldSet=globalThis.setTimeout,oldClear=globalThis.clearTimeout;
 globalThis.setTimeout=(fn,ms)=>{const id=++nextId;timers.set(id,{fn,at:time+ms});scheduled.push({fn,ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 function tick(ms){time+=ms;for(const [id,t]of timers)if(t.at<=time){timers.delete(id);t.fn();}}
 try{
 const {assetVersion}=await import('../src/data.js');
 const {Sounds}=await import(`../src/audio.js?v=${assetVersion}`);const soundEvents=[];const originalPlay=Sounds.prototype.play;Sounds.prototype.play=function(name){soundEvents.push(name);};
 await import('../src/game.js');await settle();
 assert.match(ids.get('stage').style.transform,/scale\(0.5\)/);
 for(const [w,h]of [[1920,1080],[390,844],[844,390]]){globalThis.innerWidth=w;globalThis.innerHeight=h;events.get('resize')();assert.ok(ids.get('stage').style.transform.includes(`scale(${Math.min(w/1920,h/1080)})`));}
 const buttons=ids.get('keyboard').children.flatMap(r=>r.children);assert.equal(buttons.length,27);assert.ok(buttons.every(b=>b.textContent!=='Submit'));
 const input=(key,extra={})=>events.get('keydown')({key,preventDefault(){},...extra});
 const pictureAnswer=()=>({'pumpkin.png':'PUMPKIN','turkey.png':'TURKEY','corn.png':'CORN','potatoes.png':'POTATOES','pumpkin_pie.png':'PUMPKIN PIE','parade.png':'PARADE','celebrate.png':'CELEBRATE','thankful.png':'THANKFUL'}[ids.get('picture').src.split('?')[0]]);
 const letters=()=>ids.get('letters').children.flatMap(g=>g.children).map(c=>c.textContent).join('');
 const spell=word=>{for(const c of word.replaceAll(' ',''))input(c);};
 const cells=()=>ids.get('letters').children.flatMap(g=>g.children);
 const checkMatches=(answer,letter)=>{[...answer.replaceAll(' ','')].forEach((c,i)=>{if(c===letter){assert.equal(cells()[i].textContent,letter);assert.equal(cells()[i].className,'letter accepted');}});};
 const seen=[];
 for(let i=0;i<8;i++){
  const answer=pictureAnswer(),src=ids.get('picture').src;seen.push(answer);const audioStart=soundEvents.length;const firstMatches=[...answer.replaceAll(' ','')].filter(c=>c===answer[0]).join('');
  assert.equal(ids.get('lives').attributes['aria-label'],'4 lives remaining');assert.equal(ids.get('lives').children.filter(p=>p.style.visibility==='visible').length,4);
  assert.equal(ids.get('letters').children.length,answer.split(' ').length);
  if(i%2===0){
   input(answer[0]);assert.equal(letters(),firstMatches);assert.equal(cells()[0].className,'letter accepted');checkMatches(answer,answer[0]);input(answer[0].toLowerCase());assert.equal(letters(),firstMatches);assert.equal(ids.get('lives').attributes['aria-label'],'4 lives remaining');
   for(let j=0;j<3;j++){spell('X');assert.equal(ids.get('picture').src,src);assert.equal(letters(),firstMatches);assert.equal(ids.get('lives').attributes['aria-label'],`${3-j} lives remaining`);}
   spell('X');assert.ok(cells().every(c=>c.className==='letter revealed'));assert.equal(letters(),answer.replaceAll(' ',''));assert.equal(ids.get('lives').attributes['aria-label'],'0 lives remaining');assert.ok(buttons.every(b=>b.disabled));assert.equal(scheduled.at(-1).ms,2000);
   input('A');input('Enter');assert.equal(letters(),answer.replaceAll(' ',''));tick(1999);assert.equal(ids.get('picture').src,src);assert.equal(letters(),answer.replaceAll(' ',''));assert.equal(soundEvents.slice(audioStart).filter(n=>n==='lost').length,1);assert.equal(soundEvents.slice(audioStart).filter(n=>n==='incorrect').length,4);const callback=scheduled.at(-1).fn;tick(1);await settle();const progress=ids.get('progress').textContent;callback();assert.equal(ids.get('progress').textContent,progress);
  }else{
   buttons.find(b=>b.textContent===answer[0]).onclick();assert.equal(letters(),firstMatches);checkMatches(answer,answer[0]);input(answer[0].toLowerCase());assert.equal(ids.get('lives').attributes['aria-label'],'4 lives remaining');input('X',{repeat:true});assert.equal(letters(),firstMatches);input('Backspace');input('Enter');assert.equal(letters(),firstMatches);
   spell(answer.replaceAll(' ','').slice(1));assert.ok(cells().every(c=>c.className==='letter accepted'));assert.equal(ids.get('message').textContent,'Well done!');assert.equal(soundEvents.slice(audioStart).filter(n=>n==='completed').length,1);assert.equal(soundEvents.slice(audioStart).filter(n=>n==='correct').length,new Set(answer.replaceAll(' ','')).size);assert.equal(scheduled.at(-1).ms,1300);assert.ok(buttons.every(b=>b.disabled));tick(1299);assert.equal(ids.get('picture').src,src);tick(1);await settle();
  }
 }
 assert.equal(soundEvents.filter(n=>n==='victory').length,1);assert.equal(new Set(seen).size,8);assert.equal(ids.get('results-title').textContent,'Your Results');assert.equal(ids.get('correct-total').textContent,'Correct: 4');assert.equal(ids.get('incorrect-total').textContent,'Incorrect: 4');assert.equal(ids.get('restart').hidden,false);
 const stale=scheduled.at(-1).fn;ids.get('restart').onclick();stale();await settle();assert.equal(ids.get('progress').textContent,'1 / 8');assert.equal(ids.get('results').hidden,true);assert.equal(ids.get('restart').hidden,true);assert.equal(letters(),'');assert.equal(ids.get('lives').attributes['aria-label'],'4 lives remaining');assert.equal(ids.get('message').textContent,'');
 assert.equal(buttons.filter(b=>!b.disabled).length,26);assert.ok(ids.get('lives').children.every(p=>p.src.startsWith('life.png?v=')));Sounds.prototype.play=originalPlay;
 }finally{globalThis.setTimeout=oldSet;globalThis.clearTimeout=oldClear;}
});
