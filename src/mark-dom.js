import {buildIndex,scrollPane,available} from './dom.js';
import {makeAnchor,resolveAnchor} from './core.js';
export function paneSelector(el){
 if(el===document.scrollingElement)return null;
 if(el.id)return '#'+CSS.escape(el.id);
 const path=[];for(let p=el;p&&p!==document.body;p=p.parentElement){const tag=p.tagName.toLowerCase(),siblings=[...p.parentElement.children].filter(n=>n.tagName===p.tagName);path.unshift(tag+':nth-of-type('+(siblings.indexOf(p)+1)+')');}
 return 'body>'+path.join('>');
}
export function capturePosition(seed){
 const pane=scrollPane(seed),index=buildIndex(),base=pane===document.scrollingElement?0:pane.getBoundingClientRect().top;
 let chosen=null;
 // Store nearby readable text as well as exact scroll offsets. Context lets a
 // mark survive text being inserted above it, without guessing ambiguous text.
 for(const block of document.querySelectorAll('h1,h2,h3,h4,p,li,pre')){
  if(!available(block)||!pane.contains(block))continue;
  const rect=block.getBoundingClientRect();if(rect.bottom<=base+10||rect.top>=innerHeight-30)continue;
  const text=block.textContent.replace(/\s+/g,' ').trim().slice(0,120),at=text?index.text.indexOf(text):-1;
  if(at<0||index.text.indexOf(text,at+1)>=0)continue;
  const range=index.range(at,at+text.length);if(range){chosen={anchor:makeAnchor(index.text,at,at+text.length),viewportY:range.getBoundingClientRect().top};break;}
 }
 return {x:pane.scrollLeft,y:pane.scrollTop,pageX:scrollX,pageY:scrollY,pane:paneSelector(pane),anchor:chosen?.anchor||null,viewportY:chosen?.viewportY||0};
}
export async function restorePosition(mark){
 const pos=mark.position;let pane=document.scrollingElement;
 if(pos.pane){try{pane=document.querySelector(pos.pane)||pane;}catch{}}
 window.scrollTo({left:pos.pageX,top:pos.pageY,behavior:'instant'});
 pane.scrollTo({left:pos.x,top:pos.y,behavior:'instant'});
 await new Promise(requestAnimationFrame);
 if(pos.anchor){const index=buildIndex(),match=resolveAnchor(index.text,pos.anchor),range=match&&index.range(match.start,match.end);if(range&&pane.contains(range.startContainer))pane.scrollTop+=range.getBoundingClientRect().top-pos.viewportY;}
 if(pane!==document.scrollingElement){if(!pane.hasAttribute('tabindex'))pane.tabIndex=-1;pane.focus({preventScroll:true});}
 return pane;
}
