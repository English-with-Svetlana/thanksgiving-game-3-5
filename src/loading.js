// Resolve on actual image load/decode, never on an artificial timer.
export function decodeImage(image, src) {
 return new Promise((resolve, reject) => {
  let finishing=false;
  const fail=()=>{image.onload=image.onerror=null;reject(new Error('An essential game image could not load.'));};
  const finish=async()=>{
   if(finishing)return;finishing=true;
   try{if(typeof image.decode==='function')await image.decode();if(!image.naturalWidth)throw new Error('Empty image');image.onload=image.onerror=null;resolve(image);}catch{fail();}
  };
  image.onload=finish;image.onerror=fail;image.src=src;
  if(image.complete){if(image.naturalWidth)finish();else fail();}
 });
}
const images=new Map();
export function loadImage(src, priority='auto') {
 if(!images.has(src)) {const image=new Image();image.fetchPriority=priority;images.set(src,decodeImage(image,src));}
 return images.get(src);
}
