import {available,scrollPane} from './dom.js';

// Align within the target's own scrolling area; scrollIntoView would also move
// outer panes and can shift the page horizontally. Keep focus and ranges intact.
export function alignReadingTarget(target,position='center',viewport={}){
  const isRange=!!target?.startContainer;
  const node=isRange?(target.startContainer.nodeType===1?target.startContainer:target.startContainer.parentElement):target;
  if(!available(node)||!['start','center','end'].includes(position))return false;
  const rects=[...target.getClientRects()].filter(r=>r.width>0&&r.height>0);
  if(!rects.length)return false;
  const pane=scrollPane(node),page=pane===document.scrollingElement;
  const box=page?null:pane.getBoundingClientRect();
  let top=page?0:Math.max(0,box.top+pane.clientTop);
  let bottom=page?innerHeight:Math.min(innerHeight,box.top+pane.clientTop+pane.clientHeight);
  top=Math.max(top,viewport.top??0);bottom=Math.min(bottom,viewport.bottom??innerHeight);
  // Respect site-declared breathing room for sticky headers/footers.
  const style=getComputedStyle(pane),height=bottom-top;
  const padding=value=>value.endsWith('%')?parseFloat(value)*height/100:parseFloat(value)||0;
  top+=padding(style.scrollPaddingTop);bottom-=padding(style.scrollPaddingBottom);
  if(bottom<=top)return false;
  const first=rects[0],last=rects.at(-1);
  const delta=position==='start'?first.top-top:position==='end'?last.bottom-bottom:(first.top+last.bottom-top-bottom)/2;
  pane.scrollTo({top:pane.scrollTop+delta,left:pane.scrollLeft,behavior:'instant'});
  return true;
}
