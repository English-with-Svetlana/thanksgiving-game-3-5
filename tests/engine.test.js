import {test} from 'node:test';import assert from 'node:assert/strict';import {Game,shuffle} from '../src/engine.js';import {vocabulary} from '../src/data.js';import {Sounds} from '../src/audio.js';import fs from 'node:fs';
test('eight unique words map to existing pictures',()=>{assert.equal(vocabulary.length,8);assert.equal(new Set(vocabulary.map(v=>v.answer)).size,8);for(const v of vocabulary)assert.ok(fs.existsSync(v.image));});
test('Fisher–Yates permutes a copy and responds to randomness',()=>{const a=[1,2,3,4];assert.deepEqual(shuffle(a,()=>.999),a);assert.notDeepEqual(shuffle(a,()=>0),a);assert.deepEqual(a,[1,2,3,4]);});
const spell=(g,word)=>{for(const c of word.replaceAll(' ',''))g.type(c);};
for(let mistakes=0;mistakes<4;mistakes++)test(`revealed-letter spelling succeeds with ${mistakes} mistakes and counts once`,()=>{const g=new Game([{answer:'PUMPKIN'}]);assert.deepEqual(g.type('P'),{correct:true,phase:'playing'});assert.deepEqual([...g.revealed],['P']);assert.equal(g.lives,4);for(let i=0;i<mistakes;i++){assert.equal(g.type('X').correct,false);assert.equal(g.lives,3-i);assert.equal(g.index,0);assert.deepEqual([...g.revealed],['P']);}spell(g,'UMPKIN');assert.equal(g.correct,1);assert.equal(g.incorrect,0);assert.equal(g.type('X'),null);g.advance();assert.equal(g.phase,'results');assert.equal(g.advance(),false);});
test('four wrong keypresses immediately reveal and lock input',()=>{const g=new Game(vocabulary,()=>.999);const first=g.current;g.type('P');for(let i=1;i<=4;i++){assert.equal(g.lives,5-i);g.type('X');assert.equal(g.lives,4-i);assert.equal(g.current,first);assert.deepEqual([...g.revealed],['P']);}assert.equal(g.phase,'revealing');assert.equal(g.incorrect,1);assert.equal(g.correct,0);assert.equal(g.type('A'),null);g.advance();assert.equal(g.index,1);assert.notEqual(g.current,first);assert.equal(g.lives,4);assert.equal(g.revealed.size,0);assert.equal(g.advance(),false);});
test('mixed results count every task once without repeats and restart resets',()=>{const g=new Game(vocabulary);const seen=[];for(let i=0;i<8;i++){seen.push(g.current.answer);assert.equal(g.lives,4);if(i%2)for(let j=0;j<4;j++)g.type('X');else spell(g,g.current.answer);g.advance();}assert.equal(new Set(seen).size,8);assert.equal(g.correct,4);assert.equal(g.incorrect,4);assert.equal(g.correct+g.incorrect,8);assert.equal(g.phase,'results');g.restart();assert.equal(g.correct,0);assert.equal(g.incorrect,0);assert.equal(g.index,0);assert.equal(g.revealed.size,0);assert.equal(g.lives,4);assert.equal(g.phase,'playing');});
test('repeated required letters work and word spaces need no input',()=>{const g=new Game([{answer:'PUMPKIN PIE'}]);spell(g,'PUMPKIN PIE');assert.equal(g.phase,'completed');assert.equal(g.lives,4);});
test('invalid keys ignored and unavailable audio is harmless',()=>{const g=new Game(vocabulary);for(const c of [' ','Enter','12','Backspace'])assert.equal(g.type(c),null);assert.equal(g.lives,4);const s=new Sounds();s.unlock();s.play('click');});
test('audio master volume, all six effects, sequential schedules',()=>{
 const starts=[],gains=[];class Param{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
 globalThis.window={AudioContext:class{constructor(){this.currentTime=0;this.state='running';}createGain(){const g={gain:new Param(),connect(){},disconnect(){}};gains.push(g);return g;}createOscillator(){return {frequency:{},connect(){},disconnect(){},start(t){starts.push(t);},stop(){}};}}};
 const s=new Sounds();s.unlock();assert.equal(gains[0].gain.value,.35);for(const n of ['click','correct','incorrect','completed','lost','victory'])s.play(n);assert.equal(starts.length,17);for(let i=1;i<starts.length;i++)assert.ok(starts[i]>starts[i-1]);delete globalThis.window;
});
test('life panel is centered above the screen with larger proportional icons and safe bounds',()=>{
 const css=fs.readFileSync('src/style.css','utf8');const rule=css.match(/#lives\{([^}]+)\}/)[1];
 for(const value of ['display:flex','gap:16px','background:#fff0cf','border:2px solid #b86427','border-radius:12px','box-shadow:0 4px 0 #6f391d'])assert.ok(rule.includes(value));
 const number=key=>Number(rule.match(new RegExp(`(?:^|;)${key}:(\\d+)px`))[1]);
 // Background's black frame is approximately x=438..1602, top=149 on the logical stage.
 assert.equal(number('left')+number('width')/2,(438+1602)/2);
 const gap=149-number('top')-number('height');assert.ok(gap>=8&&gap<=16);
 assert.ok(number('left')>=0&&number('left')+number('width')<=1920);assert.ok(number('top')>=0);
 assert.match(css,/\.life-icon\{width:92px;height:92px;object-fit:contain;flex-shrink:0\}/);
 assert.ok(4*92+3*16+2*24+4<=number('width'));assert.ok(92+2*12+4<=number('height'));
 for(const [w,h]of [[1920,1080],[960,540],[844,390],[390,844]]){const scale=Math.min(w/1920,h/1080),x=(w-1920*scale)/2,y=(h-1080*scale)/2;assert.ok(x+number('left')*scale>=0);assert.ok(x+(number('left')+number('width'))*scale<=w);assert.ok(y+number('top')*scale>=0);assert.ok(y+(number('top')+number('height'))*scale<=h);}
 const iframe=fs.readFileSync('iframe-preview.html','utf8');assert.ok(iframe.includes('overflow:hidden'));assert.ok(css.includes('overflow:hidden'));
 assert.ok(fs.existsSync('life.png'));assert.match(css,/\.letter\.accepted\{color:#38652c\}/);assert.match(css,/\.letter\.revealed\{color:#ac2824\}/);
 const game=fs.readFileSync('src/game.js','utf8');assert.ok(!game.includes('game.submit'));assert.ok(!game.includes("['submit'"));
});
for(const [answer,letter,positions]of [['APPLE','P',[1,2]],['PUMPKIN','P',[0,3]],['BANANA','A',[1,3,5]],['balloon','l',[2,3]]])test(`one ${letter} reveals every occurrence in ${answer}, case insensitively`,()=>{
 const g=new Game([{answer}]);g.type(letter);const visible=[...g.current.answer.toUpperCase()].map(c=>g.revealed.has(c)?c:'');
 assert.deepEqual(visible.flatMap((c,i)=>c?[i]:[]),positions);assert.equal(g.lives,4);assert.equal(g.type(letter.toLowerCase()),null);assert.equal(g.type(letter.toUpperCase()),null);assert.equal(g.lives,4);assert.equal(g.correct,0);
});
test('several repeated letters and final selection filling multiple slots completes once',()=>{
 const g=new Game([{answer:'BALLOON'}]);for(const letter of 'BNAL')g.type(letter);assert.equal(g.phase,'playing');assert.ok(g.revealed.has('L'));g.type('o');assert.equal(g.phase,'completed');assert.equal(g.correct,1);assert.equal(g.lives,4);assert.equal(g.type('O'),null);assert.equal(g.correct,1);
});
test('repeated correct letters remain harmless after a wrong press; genuinely wrong repeats cost lives',()=>{
 const g=new Game([{answer:'APPLE'}]);g.type('p');g.type('X');g.type('P');assert.equal(g.lives,3);assert.ok(g.revealed.has('P'));g.type('X');assert.equal(g.lives,2);
});
