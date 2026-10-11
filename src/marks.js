import {pageKey,cleanItem} from './core.js';
export function cleanPosition(raw) {
 if(!raw||typeof raw!=='object')throw Error('Invalid scroll mark.');
 const point=v=>{if(!Number.isFinite(v)||v<0||v>1e9)throw Error('Invalid scroll position.');return v;};
 const selector=typeof raw.pane==='string'?raw.pane.slice(0,2000):null;
 let anchor=null;if(raw.anchor)anchor=cleanItem({id:'mark',color:'yellow',note:'',anchor:raw.anchor}).anchor;
 return {x:point(raw.x),y:point(raw.y),pageX:point(raw.pageX),pageY:point(raw.pageY),pane:selector,anchor,viewportY:Number.isFinite(raw.viewportY)?Math.max(-10000,Math.min(10000,raw.viewportY)):0};
}
export function cleanMark(raw,name) {
 if(!/^[a-zA-Z]$/.test(name)||!raw||typeof raw.title!=='string'||!Number.isSafeInteger(raw.updatedAt)||raw.updatedAt<0)throw Error('Invalid Vim mark.');
 return {url:pageKey(raw.url),title:raw.title.slice(0,500),position:cleanPosition(raw.position),updatedAt:raw.updatedAt};
}
