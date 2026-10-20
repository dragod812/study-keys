const EXCLUDE='script,style,noscript,template,svg,canvas,iframe,input,textarea,select,video,audio,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[data-study-keys],[data-study-keys-ui],[hidden],[inert],[aria-hidden="true"]';
export const owned=e=>e.composedPath().some(el=>el?.matches?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="slider"],video,audio,canvas,iframe,[data-keyboard-owned],.monaco-editor,.cm-editor,.CodeMirror'));
export function available(el) {
  if(!el?.isConnected||el.closest('[hidden],[inert],[aria-hidden="true"],[data-study-keys]')||el.disabled||el.getAttribute('aria-disabled')==='true')return false;
  const s=getComputedStyle(el);if(s.display==='none'||s.visibility!=='visible'||s.opacity==='0'||!el.getClientRects().length)return false;
  for(let p=el.parentElement;p;p=p.parentElement)if(p.matches('details:not([open])')&&!p.querySelector(':scope>summary')?.contains(el))return false;
  return true;
}
export function visibleRect(range) {
  if(!range?.startContainer.isConnected)return null;
  const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
  if(!rects.length)return null;
  for(const r of rects) {
    if(r.left<2||r.right>innerWidth-2||r.top<15||r.bottom>innerHeight-116)return null;
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2),parent=range.startContainer.parentElement;
    if(!hit||!(hit===parent||parent?.contains(hit)||hit.contains(parent)))return null;
    // Text clipped by a nested scroll pane can still have client rectangles.
    for(let el=parent;el&&el!==document.body;el=el.parentElement) {
      const s=getComputedStyle(el),box=el.getBoundingClientRect();
      if(/hidden|clip|auto|scroll/.test(s.overflowY)&&(r.top<box.top||r.bottom>box.bottom))return null;
      if(/hidden|clip|auto|scroll/.test(s.overflowX)&&(r.left<box.left||r.right>box.right))return null;
    }
  }
  return rects[0];
}
export function buildIndex(root=document.body) {
  const text=[],points=[],styles=new Map(),breaks=new Map();let previousBlock=null,truncated=false;
  const css=el=>{if(!styles.has(el))styles.set(el,getComputedStyle(el));return styles.get(el);};
  function blockOf(el){for(let p=el;p;p=p.parentElement){const display=css(p).display;if(!['inline','contents','none'].includes(display))return p;}return root;}
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      if(node.nodeType===1){
        if(node.matches(EXCLUDE))return NodeFilter.FILTER_REJECT;
        const style=css(node);
        if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0')return NodeFilter.FILTER_REJECT;
        if(node.parentElement?.matches('details:not([open])')&&!node.matches('summary'))return NodeFilter.FILTER_REJECT;
        return node.tagName==='BR'?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
      }
      for(let parent=node.parentElement;parent;parent=parent.parentElement)if(parent.matches('details:not([open])')&&!parent.querySelector(':scope>summary')?.contains(node))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  function space(point,separator){if(text.length&&text.at(-1)!==' '){text.push(' ');points.push(point);}if(separator&&text.length){const at=text.length-1;if((breaks.get(at)?.length||0)<separator.length)breaks.set(at,separator);}}
  let node;
  while((node=walker.nextNode())) {
    if(node.nodeType===1){space(null,'\n');continue;}
    if(node.nodeType!==3||node.parentElement?.closest(EXCLUDE))continue;
    const block=blockOf(node.parentElement);
    if(block!==previousBlock)space(null,'\n\n');previousBlock=block;
    for(let i=0;i<node.length;i++) {
      if(/\s/.test(node.data[i]))space({node,offset:i});
      else {text.push(node.data[i]);points.push({node,offset:i});}
    }
    if(text.length>2000000){truncated=true;break;}
  }
  if(text.at(-1)===' '){text.pop();points.pop();}
  function range(start,end) {
    while(start<end&&!points[start])start++;
    while(end>start&&!points[end-1])end--;
    const a=points[start],b=points[end-1];
    if(!a?.node.isConnected||!b?.node.isConnected||a.offset>=a.node.length||b.offset>=b.node.length)return null;
    try{const r=document.createRange();r.setStart(a.node,a.offset);r.setEnd(b.node,b.offset+1);return r;}catch{return null;}
  }
  return {text:text.join(''),points,range,truncated,breaks};
}
export function fromSelection(index,selection=getSelection()) {
  if(!selection?.rangeCount||selection.isCollapsed)return null;
  const r=selection.getRangeAt(0);let start=-1,end=-1;
  // comparePoint handles selections that start/end at element boundaries too.
  index.points.forEach((p,i)=>{if(!p)return;try{if(r.comparePoint(p.node,p.offset)===0&&r.comparePoint(p.node,p.offset+1)===0){if(start===-1)start=i;end=i+1;}}catch{}});
  return start>=0&&end>start?{start,end}:null;
}
export function wordTokens(text){return [...text.matchAll(/\S+/gu)].map(m=>({start:m.index,end:m.index+m[0].length,word:m[0]}));}
export function scrollPane(seed) {
  for(let el=seed;el&&el!==document.body;el=el.parentElement||el.getRootNode()?.host){
    const s=getComputedStyle(el);if(/auto|scroll/.test(s.overflowY)&&el.scrollHeight>el.clientHeight+4)return el;
  }
  return document.scrollingElement;
}
export function label(el) {return (el.getAttribute('aria-label')||el.labels?.[0]?.innerText||el.innerText||el.getAttribute('title')||el.getAttribute('placeholder')||el.getAttribute('name')||el.tagName).replace(/\s+/g,' ').trim().slice(0,220);}
export function pageDialog(){return [...document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')].find(available);}
export function targets(viewport=false) {
  const scope=pageDialog()||document;
  return [...scope.querySelectorAll('a[href],button,input:not([type="hidden"]),textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],summary,[role="button"],[role="checkbox"],[role="tab"],[tabindex="0"]')].filter(el=>{
    if(!available(el)||el.parentElement?.closest('button,a[href],summary'))return false;
    if(!viewport)return true;
    const r=el.getBoundingClientRect(),x=(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,y=(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2;
    if(x<0||x>innerWidth||y<0||y>innerHeight||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth)return false;
    const hit=document.elementFromPoint(x,y);return hit&&(hit===el||el.contains(hit));
  });
}
