import {wordTokens,visibleRect} from './dom.js';
const HEADING='h1,h2,h3,h4,h5,h6,[role="heading"][aria-level]';
const PARAGRAPH='p,pre,li,blockquote,td,th,summary,'+HEADING;

export function paragraphSpans(index) {
  const owners=new Map(),spans=[];let current=null;
  const ownerOf=node=>{
    if(owners.has(node))return owners.get(node);
    let el=node.parentElement,owner=el?.closest(PARAGRAPH);
    if(!owner){for(;el;el=el.parentElement){if(!['inline','contents','none'].includes(getComputedStyle(el).display)){owner=el;break;}}}
    owners.set(node,owner);return owner;
  };
  for(let i=0;i<index.points.length;i++){
    const p=index.points[i];if(!p||/\s/.test(index.text[i]))continue;
    const owner=ownerOf(p.node);
    if(!current||current.owner!==owner){current={owner,start:i,end:i+1};spans.push(current);}else current.end=i+1;
  }
  return spans.map(s=>({...s,word:index.text.slice(s.start,s.end),kind:'paragraph'}));
}
export function sectionSpans(index) {
  const headings=[],roots=new Map(),seen=new Set();
  for(let i=0;i<index.points.length;i++){
    const p=index.points[i];if(!p)continue;
    const el=p.node.parentElement,root=el?.closest('main,article,[role="main"]')||document.body;
    roots.set(root,i+1);
    const heading=el?.closest(HEADING);
    if(heading&&!seen.has(heading)){
      seen.add(heading);headings.push({owner:heading,root,start:i,level:+(heading.getAttribute('aria-level')||heading.tagName.slice(1)),word:heading.textContent.trim(),kind:'section'});
    }
  }
  return headings.map((h,i)=>{
    let end=roots.get(h.root)||index.text.length;
    for(let j=i+1;j<headings.length;j++)if(headings[j].start>=end)break;else if(headings[j].root===h.root&&headings[j].level<=h.level){end=headings[j].start;break;}
    while(end>h.start&&/\s/.test(index.text[end-1]))end--;
    return {...h,end};
  });
}
export function sentenceSpans(index) {
  const segmenter=new Intl.Segmenter(undefined,{granularity:'sentence'});
  return paragraphSpans(index).flatMap(p=>[...segmenter.segment(index.text.slice(p.start,p.end))].map(part=>{
    const leading=part.segment.length-part.segment.trimStart().length;
    const start=p.start+part.index+leading,end=p.start+part.index+part.segment.trimEnd().length;
    return {owner:p.owner,start,end,word:index.text.slice(start,end),kind:'sentence'};
  }).filter(s=>s.end>s.start));
}
export function visibleScopes(index,kind) {
  const spans=kind==='section'?sectionSpans(index):kind==='sentence'?sentenceSpans(index):paragraphSpans(index),words=wordTokens(index.text);
  return spans.flatMap(span=>{
    // A long paragraph or a section whose heading is above the viewport can
    // still be chosen from any of its visible words.
    let lo=0,hi=words.length;while(lo<hi){const mid=(lo+hi)>>>1;if(words[mid].start<span.start)lo=mid+1;else hi=mid;}
    for(let i=lo;i<words.length&&words[i].start<span.end;i++){const word=words[i],rect=visibleRect(index.range(word.start,word.end));if(rect)return [{...span,rect}];}
    return [];
  });
}
export function expandScope(index,span,kind) {
  const spans=kind==='section'?sectionSpans(index):paragraphSpans(index);
  if(kind==='section')return spans.filter(s=>s.start<=span.start&&s.end>=span.end).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0]||null;
  const found=spans.filter(s=>s.end>span.start&&s.start<span.end);
  return found.length?{start:found[0].start,end:found.at(-1).end,kind}:null;
}
export function selectionText(index,start,end) {
  // Use only indexed readable text, retaining paragraph / BR boundaries. Never
  // copy hidden DOM, editors or scripts simply because they lie inside a Range.
  let text='';
  for(let i=start;i<end;i++)text+=index.breaks?.get(i)||index.text[i];
  return text.trim();
}
