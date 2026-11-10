export function shuffle(items, random = Math.random) {
 const result = [...items];
 for (let i=result.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
export class Game {
 constructor(items, random=Math.random) {this.items=items;this.random=random;this.restart();}
 restart(){this.order=shuffle(this.items,this.random);this.index=0;this.correct=0;this.incorrect=0;this.newWord();}
 newWord(){this.revealed=new Set();this.lives=4;this.phase='playing';}
 get current(){return this.order[this.index];}
 type(letter){
  if(this.phase!=='playing'||typeof letter!=='string'||! /^[A-Z]$/i.test(letter))return null;
  letter=letter.toUpperCase();
  if(this.revealed.has(letter))return null;
  const target=this.current.answer.toUpperCase().replaceAll(' ','');
  const correct=target.includes(letter);
  if(correct){this.revealed.add(letter);if([...target].every(c=>this.revealed.has(c))){this.correct++;this.phase='completed';}}
  else {this.lives--;if(this.lives===0){this.incorrect++;this.phase='revealing';}}
  return {correct,phase:this.phase};
 }
 advance(){if(!['completed','revealing'].includes(this.phase))return false;if(++this.index===this.order.length)this.phase='results';else this.newWord();return true;}
}
