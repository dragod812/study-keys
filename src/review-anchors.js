import {makeAnchor,resolveAnchor} from './core.js';

// Store highlights against the current document text, so staging a file does
// not detach them merely because the red comparison text disappears.
const projections=new WeakMap();
function workingText(index){
  if(projections.has(index))return projections.get(index);
  const positions=[],characters=[],deleted=new WeakMap();
  for(let i=0;i<index.text.length;i++){
    const node=index.points[i]?.node;
    if(node&&!deleted.has(node))deleted.set(node,!!node.parentElement?.closest('[data-change="delete"]'));
    if(node&&deleted.get(node))continue;
    const char=index.text[i];
    if(char===' '&&characters.at(-1)===' ')continue;
    characters.push(char);positions.push(i);
  }
  const result={text:characters.join(''),positions};projections.set(index,result);return result;
}
export function reviewAnnotationAnchor(index,start,end){
  const projection=workingText(index),a=projection.positions.findIndex(p=>p>=start&&p<end);
  if(a<0)return makeAnchor(index.text,start,end);
  let b=a;while(b<projection.positions.length&&projection.positions[b]<end)b++;
  if(!projection.text.slice(a,b).trim())return makeAnchor(index.text,start,end);
  return makeAnchor(projection.text,a,b);
}
export function resolveReviewAnnotation(index,anchor){
  const projection=workingText(index),match=resolveAnchor(projection.text,anchor);
  return match?{...match,start:projection.positions[match.start],end:projection.positions[match.end-1]+1}:resolveAnchor(index.text,anchor);
}
