import {vocabulary,assetVersion,backgroundImage,lifeImage} from './data.js?v=startup1';
import {Game} from './engine.js?v=repeatedletters1';
import {Sounds} from './audio.js?v=5fbabca978ce';
import {decodeImage,loadImage} from './loading.js?v=startup1';
const $=id=>document.getElementById(id),game=new Game(vocabulary),sounds=new Sounds();
const keys=new Map();let timer=null,generation=0,loadGeneration=0,ready=false;
const assetUrl=src=>`${encodeURI(src)}?v=${assetVersion}`;
const essentials=Promise.all([loadImage(assetUrl(backgroundImage),'high'),loadImage(assetUrl(lifeImage),'high')]);
function fit(){const scale=Math.min(innerWidth/1920,innerHeight/1080);$('stage').style.transform=`translate(-50%, -50%) scale(${scale})`;$('stage').setAttribute('data-fitted','');}
addEventListener('resize',fit);fit();
for(const row of ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM']){const container=document.createElement('div');container.className='key-row';for(const letter of row){const button=document.createElement('button');button.className='key';button.textContent=letter;button.setAttribute('aria-label',`Type ${letter}`);button.onclick=()=>type(letter);keys.set(letter,button);container.append(button);}$('keyboard').append(container);}
// Keep the existing editing-key footprint; accepted letters cannot be erased.
const backspaceKey=document.createElement('button');backspaceKey.className='key action-key';backspaceKey.textContent='⌫';backspaceKey.disabled=true;backspaceKey.setAttribute('aria-label','Accepted letters cannot be deleted');$('keyboard').children[2].append(backspaceKey);
for(let i=0;i<4;i++){const p=document.createElement('img');p.className='life-icon';p.src=assetUrl(lifeImage);p.alt='';p.onerror=()=>{$('load-error').textContent='The life.png image could not load. Please check the project files.';$('load-error').hidden=false;};$('lives').append(p);}
function drawLetters(){$('letters').replaceChildren();for(const word of game.current.answer.split(' ')){const group=document.createElement('div');group.className='word';for(const letter of word.toUpperCase()){const cell=document.createElement('span');cell.className='letter'+(game.phase==='revealing'?' revealed':game.revealed.has(letter)?' accepted':'');const value=game.phase==='revealing'?letter:(game.revealed.has(letter)?letter:'');cell.textContent=value;cell.setAttribute('aria-label',value||'empty letter');group.append(cell);}$('letters').append(group);}}
function render(){drawLetters();[...$('lives').children].forEach((p,i)=>p.style.visibility=i<game.lives?'visible':'hidden');$('lives').setAttribute('aria-label',`${game.lives} lives remaining`);for(const b of keys.values()){b.disabled=!ready||game.phase!=='playing';}}
function showWord(){
 const ticket=++loadGeneration;ready=false;$('stage').setAttribute('aria-busy','true');
 $('activity').classList.remove('victory');$('restart').hidden=true;$('results').hidden=true;$('message').textContent='';$('load-error').hidden=true;
 $('progress').textContent=`${game.index+1} / ${vocabulary.length}`;render();$('picture').fetchPriority='high';
 Promise.all([essentials,decodeImage($('picture'),assetUrl(game.current.image))]).then(()=>{
  if(ticket!==loadGeneration)return;
  ready=true;$('stage').setAttribute('aria-busy','false');render();
  const next=game.order[game.index+1];if(next)loadImage(assetUrl(next.image),'low').catch(()=>{});
 }).catch(()=>{if(ticket!==loadGeneration)return;$('load-error').textContent='Pictures could not load. Please reload the game.';$('load-error').hidden=false;});
}

function later(fn,delay){clearTimeout(timer);const token=generation;let fired=false;timer=setTimeout(()=>{if(token===generation&&!fired){fired=true;fn();}},delay);}
function restart(){generation++;clearTimeout(timer);game.restart();showWord();}
function nextPicture(){game.advance();if(game.phase==='results'){sounds.play('victory');$('activity').classList.add('victory');$('message').textContent='';$('results').hidden=false;$('results-title').textContent='Your Results';$('correct-total').textContent=`Correct: ${game.correct}`;$('incorrect-total').textContent=`Incorrect: ${game.incorrect}`;$('restart').hidden=false;$('restart').focus();}else showWord();}
function type(letter){if(!ready)return;const result=game.type(letter);if(!result)return;sounds.unlock();sounds.play('click');sounds.play(result.correct?'correct':'incorrect');render();if(result.phase==='revealing'){sounds.play('lost');$('message').textContent='Not quite! Look at the correct spelling.';later(nextPicture,2000);}else if(result.phase==='completed'){sounds.play('completed');$('message').textContent='Well done!';later(nextPicture,1300);}else{$('message').textContent=result.correct?'':'Try again!';}}
addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target===$('restart'))return;if(/^[a-z]$/i.test(e.key)){e.preventDefault();type(e.key.toUpperCase());}});
$('restart').onclick=()=>{sounds.unlock();restart();};showWord();
