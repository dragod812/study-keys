import {buildIndex,available,scrollPane} from './dom.js';
import {makeAnchor,resolveAnchor} from './core.js';
import {capturePosition,restorePosition} from './mark-dom.js';
import {literalMatches,passageScore} from './navigation-core.js';
export const readingRoot=()=>document.querySelector('main,article,[role=main]')||document.body;
export const headings=()=>[...readingRoot().querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(n=>available(n)&&!n.closest('nav,aside,[role=navigation]'));
export function capture(seed){return {url:location.href,title:document.title,position:capturePosition(seed||document.activeElement)};}
export function passages(query=''){
  const root=readingRoot(),index=buildIndex(root),nodes=[...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,pre,td,summary')].filter(n=>available(n)&&!n.closest('nav,aside,[role=navigation]'));
  const spans=new Map(),owners=new Set(nodes);let previousNode=null,owner=null;
  for(let i=0;i<index.points.length;i++){const point=index.points[i];if(!point)continue;if(previousNode!==point.node){previousNode=point.node;owner=point.node.parentElement;while(owner&&!owners.has(owner))owner=owner.parentElement;}if(owner){const span=spans.get(owner)||{start:i,end:i+1};span.end=i+1;spans.set(owner,span);}}
  const results=[];let heading='';
  for(const node of nodes){
    if(/^H[1-6]$/.test(node.tagName))heading=node.textContent.trim();
    if(node.matches('li')&&node.querySelector('p,li,pre'))continue;
    const span=spans.get(node);if(!span)continue;const text=index.text.slice(span.start,span.end);if(!text.trim())continue;
    const rank=passageScore(text,query);if(rank<0)continue;
    const term=query.trim().split(/\s+/)[0]||'',hit=term?text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()):0;
    let offset=text.length<=900?0:Math.max(0,hit-70);while(offset>0&&!/\s/.test(text[offset-1]))offset--;
    const start=span.start+offset,end=Math.min(span.end,start+900),quote=index.text.slice(start,end),anchor=makeAnchor(index.text,start,end);
    results.push({label:quote.slice(0,160),detail:heading+' · '+quote.slice(160),anchor,rank});
  }
  return results.sort((a,b)=>b.rank-a.rank).slice(0,150);
}
export function findRanges(query){const index=buildIndex(readingRoot());return literalMatches(index.text,query).map(m=>({anchor:makeAnchor(index.text,m.start,m.end),range:index.range(m.start,m.end)})).filter(m=>m.range);}
export async function restoreReading(location){
  if(location.anchor){
    const index=buildIndex(readingRoot()),match=resolveAnchor(index.text,location.anchor),range=match&&index.range(match.start,match.end);
    if(range){const node=range.startContainer.parentElement;node.scrollIntoView({block:'center',behavior:'instant'});const pane=scrollPane(node),base=pane===document.scrollingElement?0:pane.getBoundingClientRect().top;pane.scrollTop+=range.getBoundingClientRect().top-base-(pane===document.scrollingElement?innerHeight:pane.clientHeight)/2;
      if(CSS.highlights&&globalThis.Highlight)CSS.highlights.set('studykeys-preview',new Highlight(range));return {restored:true};}
    return {restored:false,reason:'The saved passage is not in the currently loaded text.'};
  }
  await restorePosition(location);if(document.activeElement!==document.body)document.activeElement?.blur?.();return {restored:true};
}
