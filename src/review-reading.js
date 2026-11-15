// Anchor view changes to a visible source fragment, rather than a large wrapper
// that can cover the entire document and move the reader to an unrelated place.
export function reviewPosition(root,viewportHeight){
 const visible=[...root.querySelectorAll('[data-source-start]')].map(node=>({node,rect:node.getBoundingClientRect?.()}))
  .filter(({rect})=>rect&&rect.bottom>0&&rect.top<viewportHeight)
  .sort((a,b)=>Math.abs(a.rect.top)-Math.abs(b.rect.top));
 const match=visible[0];return match?{line:+match.node.dataset.sourceStart,top:match.rect.top}:null;
}
export function restoreReviewPosition(root,position){
 if(!position)return null;
 const score=n=>Math.abs(+n.dataset.sourceStart-position.line)*1e6+Math.abs(+(n.dataset.sourceEnd||n.dataset.sourceStart)-(+n.dataset.sourceStart));
 const node=[...root.querySelectorAll('[data-source-start]')].reduce((best,n)=>!best||score(n)<score(best)?n:best,null);
 return node?node.getBoundingClientRect().top-position.top:null;
}
