export class Sounds {
 constructor(){this.context=null;this.end=0;}
 unlock(){try{if(!this.context){this.context=new(window.AudioContext||window.webkitAudioContext)();this.master=this.context.createGain();this.master.gain.value=0.35;this.master.connect(this.context.destination);}if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch{}}
 play(name){
  try{const c=this.context;if(!c||c.state==='closed')return;
   const notes={click:[[380,.025]],correct:[[660,.11],[880,.13]],incorrect:[[220,.13],[175,.14]],completed:[[523,.12],[659,.12],[784,.22]],lost:[[330,.17],[262,.17],[196,.3]],victory:[[523,.12],[659,.12],[784,.12],[1047,.28],[784,.12],[1047,.35]]}[name];
   let t=Math.max(c.currentTime+.01,this.end);
   for(const [hz,duration]of notes){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(name==='click'?.07:.18,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};t+=duration+.025;}
   this.end=t;
  }catch{}
 }
}
