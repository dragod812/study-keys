import {available,label} from './dom.js';

// Copy destinations exactly: preserve query strings and fragment identifiers.
// Executable pseudo-links and embedded payloads are not useful shareable URLs.
export function copyableURL(raw,base) {
  if(!raw?.trim())return null;
  try{const url=new URL(raw,base);return ['http:','https:','mailto:','tel:','sms:','ftp:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
function copyAvailable(target) {
  return available(target)&&!target.closest('[contenteditable]:not([contenteditable="false"]),[data-keyboard-owned]')&&(!target.checkVisibility||target.checkVisibility({opacityProperty:true,visibilityProperty:true}));
}
export function linkEntries(root=document) {
  return [...root.querySelectorAll('a[href]')].filter(copyAvailable).flatMap(target=>{
    const url=copyableURL(target.getAttribute('href'),target.baseURI);if(!url)return [];
    const name=label(target),alt=target.querySelector('img[alt]')?.alt;
    return [{target,url,label:name&&name!=='A'?name:alt||url,detail:url}];
  });
}
// Use a visible, unobscured fragment, including wrapped links and scroll panes.
export function linkRect(target) {
  if(!copyAvailable(target))return null;
  for(const rect of target.getClientRects()){
    const left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right),top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom);
    if(right<=left||bottom<=top)continue;
    const hit=document.elementFromPoint((left+right)/2,(top+bottom)/2);
    if(hit&&(hit===target||target.contains(hit)))return {left,top,right,bottom};
  }
  return null;
}
export function currentLink(entry) {
  if(!copyAvailable(entry.target)||copyableURL(entry.target.getAttribute('href'),entry.target.baseURI)!==entry.url)throw Error('That link changed or disappeared. Choose a current link label.');
  return entry.url;
}
export function createLinkCollection(write) {
  let urls=[],busy=false;
  return {
    get urls(){return [...urls];},
    has:url=>urls.includes(url),
    async copy(url){
      if(busy)throw Error('A copy is still in progress.');
      const duplicate=urls.includes(url),next=duplicate?urls:[...urls,url];
      busy=true;
      try{await write(next.join('\n'));urls=next;return {count:urls.length,duplicate};}
      finally{busy=false;}
    }
  };
}
