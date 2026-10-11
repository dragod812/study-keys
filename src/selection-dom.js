import {ALPHABET,hintCodes,makeAnchor,resolveAnchor} from './core.js';

// Prefer DOM identity, then an unambiguous quotation when a framework replaces
// text nodes. Never reuse stale offsets against a new document index.
export function spanRebaser(previous,next) {
  const positions=new Map();
  next.points.forEach((p,i)=>{if(!p)return;let offsets=positions.get(p.node);if(!offsets)positions.set(p.node,offsets=new Map());offsets.set(p.offset,i);});
  return span=>{
    if(!span)return null;
    const quote=previous.text.slice(span.start,span.end),a=previous.points[span.start],b=previous.points[span.end-1];
    const start=a&&positions.get(a.node)?.get(a.offset),last=b&&positions.get(b.node)?.get(b.offset);
    if(start!=null&&last!=null&&next.text.slice(start,last+1)===quote)return {start,end:last+1};
    const match=resolveAnchor(next.text,span.anchor||makeAnchor(previous.text,span.start,span.end,Infinity));
    return match?{start:match.start,end:match.end}:null;
  };
}

// Reserve several unused branches for growth. Expand them breadth-first so
// constantly refreshed widgets cannot produce increasingly long label codes.
// Existing labels are never reassigned, and every code remains prefix-free.
export function wordCodePool(count,minimum=ALPHABET.length+1) {
  const width=hintCodes(Math.max(minimum,Math.ceil((count+1)/.75)))[0].length;
  let pool=hintCodes(ALPHABET.length**width),at=0;
  const branches=pool.splice(-Math.ceil(pool.length/4));
  return ()=>{
    if(at===pool.length){pool=[...ALPHABET].map(c=>branches[0]+c);branches.shift();branches.push(pool.pop());at=0;}
    return pool[at++];
  };
}
