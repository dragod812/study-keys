import {available,pageDialog} from './dom.js';
import {keyOf} from './core.js';

const TEXT_INPUTS=new Set(['text','search','email','url','tel','password','number']);
export function isTextField(el){
  if(!el||el.disabled||el.matches?.(':disabled,[aria-disabled="true"]')||el.readOnly||el.getAttribute?.('aria-readonly')==='true')return false;
  if(el.tagName==='INPUT')return TEXT_INPUTS.has(el.type);
  if(el.tagName==='TEXTAREA')return true;
  return !!el.isContentEditable||el.matches?.('[role="textbox"],[role="combobox"]');
}
// Include open shadow roots, without presenting each nested node in a rich-text
// editor as another field. Closed roots and embedded frames stay site-owned.
export function editableFields(viewport=false,root=pageDialog()||document){
  const found=[];
  function visit(scope){
    for(const el of scope.querySelectorAll('*')){
      if(isTextField(el)&&available(el)&&!el.parentElement?.isContentEditable){
        const r=el.getBoundingClientRect(),bottom=innerHeight-116;
        const x=(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,y=(Math.max(0,r.top)+Math.min(bottom,r.bottom))/2;
        const hit=el.getRootNode().elementFromPoint?.(x,y);
        if(!viewport||(r.bottom>0&&r.top<bottom&&r.right>0&&r.left<innerWidth&&hit&&(hit===el||el.contains(hit))))found.push(el);
      }
      if(el.shadowRoot&&!el.closest('[data-study-keys]')&&available(el))visit(el.shadowRoot);
    }
  }
  visit(root);return found;
}
export function activeElement(root=document){let field=root.activeElement;while(field?.shadowRoot?.activeElement)field=field.shadowRoot.activeElement;return field;}
export function returnToNormalKey(e,{enabled,insert,owned}){
  return enabled&&keyOf(e)==='Ctrl-c'&&!e.shiftKey&&(insert||owned);
}
