// Rank actual media, not page-specific player APIs. Large paused players beat
// muted hover previews; a playing, audible source remains usable when scrolled
// off screen. Nothing in another tab is inspected or controlled.
export function chooseMedia(entries){
  return entries.filter(e=>e.loaded&&!e.error&&(e.visible||e.playing||e.focused||e.fullscreen||e.pip))
    .sort((a,b)=>{
      const rank=e=>[e.pip?1:0,e.fullscreen?1:0,e.focused?1:0,e.playing&&!e.muted?1:0,e.visible?1:0,e.area||0,e.playing?1:0];
      const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return y[i]-x[i];return 0;
    })[0]?.element||null;
}
export function currentMedia(doc=document){
  const fullscreen=doc.fullscreenElement,active=doc.activeElement,pip=doc.pictureInPictureElement;
  const entries=[...doc.querySelectorAll('video,audio')].map(element=>{
    const r=element.getBoundingClientRect(),style=getComputedStyle(element);
    const width=Math.max(0,Math.min(innerWidth,r.right)-Math.max(0,r.left)),height=Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top));
    const visible=width>0&&height>0&&style.display!=='none'&&style.visibility==='visible'&&!element.closest('[hidden],[inert],[aria-hidden="true"]');
    return {element,loaded:!!(element.currentSrc||element.src||element.querySelector('source[src]')||element.srcObject),error:!!element.error,playing:!element.paused&&!element.ended,muted:element.muted||element.volume===0,visible,area:width*height,focused:active===element,fullscreen:fullscreen?.contains(element),pip:pip===element};
  });
  return chooseMedia(entries);
}
export async function toggleMedia(doc=document){
  const media=currentMedia(doc);
  if(!media)throw Error('No playable video or audio on this page. Open or focus the player first.');
  if(!media.paused&&!media.ended){media.pause();return 'Media paused';}
  try{await media.play();return 'Media playing';}
  catch{throw Error('The website could not start playback. Use its Play button, then try Space p p again.');}
}
