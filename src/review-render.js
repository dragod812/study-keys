import MarkdownIt from 'markdown-it';
import {parse,serializeOuter} from 'parse5';
import {sourceLocation} from './review-model.js';
import {documentURL} from './document-context.js';
import {supportedPage} from './core.js';
import {request} from './transport.js';

// Raw Markdown HTML goes through the same allowlist as standalone HTML below.
const markdown=new MarkdownIt({html:true,linkify:true,typographer:false});
const original=markdown.renderer.renderToken.bind(markdown.renderer);
markdown.renderer.renderToken=(tokens,i,options)=>{
  const token=tokens[i];
  if(token.map&&token.nesting===1){token.attrSet('data-source-start',String(token.map[0]+1));token.attrSet('data-source-end',String(token.map[1]));}
  return original(tokens,i,options);
};
for(const name of ['fence','code_block']){
  const render=markdown.renderer.rules[name];
  markdown.renderer.rules[name]=(tokens,i,...rest)=>`<div data-source-start="${tokens[i].map[0]+1}" data-source-end="${tokens[i].map[1]}">${render(tokens,i,...rest)}</div>`;
}
markdown.renderer.rules.html_block=(tokens,i)=>`<div data-source-start="${tokens[i].map[0]+1}" data-source-end="${tokens[i].map[1]}">${tokens[i].content}</div>`;
const allowed=new Set('article main section div span p h1 h2 h3 h4 h5 h6 ul ol li pre code blockquote table thead tbody tfoot tr td th strong em b i s del a br hr details summary dl dt dd sup sub kbd mark figure figcaption'.split(' '));
const blocked=new Set('head script style iframe object embed template noscript svg math form button input textarea select video audio link meta base'.split(' '));
const element=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;};
const textOf=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(textOf).join('');
function media(kind,value,alt=''){
  const frame=element('span');frame.className='review-media';frame.dataset.reviewMedia=kind;
  frame.dataset.mediaSource=value;frame.dataset.mediaAlt=alt;
  frame.append(element('span',alt||'Loading diagram…'));return frame;
}
export function renderDocument(target,source,isHTML){
  const tree=parse(isHTML?source:markdown.render(source),{sourceCodeLocationInfo:true});
  function visit(node,parent){
    if(node.nodeName==='#text'){
      if(isHTML&&node.sourceCodeLocation){
        const span=element('span',node.value),loc=node.sourceCodeLocation;
        span.dataset.sourceStart=loc.startLine;span.dataset.sourceEnd=loc.endLine;
        parent.append(span);
      }else parent.append(document.createTextNode(node.value));
      return;
    }
    const tag=node.tagName;
    const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
    if(attrs.hidden!==undefined||attrs['aria-hidden']==='true')return;
    const mermaid=(tag==='pre'||tag==='div')&&((attrs.class||'').split(/\s+/).includes('mermaid')||
      node.childNodes?.some(n=>n.tagName==='code'&&(n.attrs||[]).some(a=>a.name==='class'&&a.value.split(/\s+/).includes('language-mermaid'))));
    if(tag==='svg'||mermaid){
      const frame=media(mermaid?'mermaid':'svg',mermaid?textOf(node):serializeOuter(node),mermaid?'Mermaid diagram':'SVG diagram');
      if(isHTML&&node.sourceCodeLocation){frame.dataset.sourceStart=node.sourceCodeLocation.startLine;frame.dataset.sourceEnd=node.sourceCodeLocation.endLine;}
      else if(parent.dataset.sourceStart){frame.dataset.sourceStart=parent.dataset.sourceStart;frame.dataset.sourceEnd=parent.dataset.sourceEnd;}
      parent.append(frame);return;
    }
    if(blocked.has(tag)||node.nodeName==='#comment')return;
    if(tag==='img'){
      const image=media('image',attrs.src||'',attrs.alt||'Document image');
      if(isHTML&&node.sourceCodeLocation){image.dataset.sourceStart=node.sourceCodeLocation.startLine;image.dataset.sourceEnd=node.sourceCodeLocation.endLine;}
      parent.append(image);return;
    }
    let next=parent;
    if(allowed.has(tag)){
      next=element(tag);
      if(isHTML&&node.sourceCodeLocation){
        next.dataset.sourceStart=node.sourceCodeLocation.startLine;
        next.dataset.sourceEnd=node.sourceCodeLocation.endLine;
      }else if(!isHTML&&attrs['data-source-start']){
        next.dataset.sourceStart=attrs['data-source-start'];next.dataset.sourceEnd=attrs['data-source-end'];
      }
      if(tag==='a'&&attrs.href){
        try{
          const u=new URL(attrs.href,documentURL());
          if(['http:','https:','mailto:'].includes(u.protocol)||(u.protocol==='file:'&&supportedPage(u.href))){
            next.href=u.href;next.target='_blank';next.rel='noopener noreferrer';
            if(u.protocol==='file:')next.onclick=e=>{e.preventDefault();request({type:'navigate',action:'open',target:u.href,newTab:true}).catch(()=>{});};
          }
        }catch{}
      }
      if(tag==='details')next.open=true;
      if(tag==='code'&&/^language-[\w-]+$/.test(attrs.class||''))next.className=attrs.class;
      if(tag==='ol'&&/^\d+$/.test(attrs.start||''))next.start=+attrs.start;
      parent.append(next);
    }
    for(const child of node.childNodes||[])visit(child,next);
  }
  target.replaceChildren();visit(tree,target);
}

let mediaModule;
const diagrams=()=>mediaModule??=import(typeof STUDY_KEYS_PREVIEW!=='undefined'&&STUDY_KEYS_PREVIEW?
  new URL('/review-media.js',location.href).href:chrome.runtime.getURL('review-media.js'));
export async function loadReviewMedia(target,loadAsset){
  const nodes=[...target.querySelectorAll('[data-review-media]')];
  let cursor=0;
  async function worker(){
    while(cursor<nodes.length){
      const frame=nodes[cursor++],kind=frame.dataset.reviewMedia,source=frame.dataset.mediaSource;
      try{
        let src,signature=source;
        if(kind==='mermaid')src=await (await diagrams()).diagramImage(source);
        else if(kind==='svg')src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);
        else if(/^data:image\/(png|jpeg|gif|webp|svg\+xml|avif)[;,]/i.test(source))src=source;
        else if(loadAsset){
          const value=await loadAsset(source);signature=value.hash||source;
          if(value.missing)throw Error('No image in the staged version.');
          src=value.data;
        }else{
          const url=new URL(source,documentURL());
          if(url.protocol!=='file:')throw Error('Open the review reader to load this image.');
          src=url.href;
        }
        const image=element('img');image.alt=frame.dataset.mediaAlt;image.src=src;image.decoding='async';
        image.onerror=()=>{image.remove();frame.append(element('span','Image could not be displayed · '+frame.dataset.mediaAlt));};
        frame.dataset.mediaSignature=signature;frame.replaceChildren(image);
      }catch(e){
        frame.dataset.mediaSignature='unavailable:'+source;frame.replaceChildren(element('span',frame.dataset.mediaAlt+' · '+e.message));
        if(kind==='mermaid'){const details=element('details'),summary=element('summary','Diagram source');details.append(summary,element('pre',source));frame.append(details);}
      }
    }
  }
  await Promise.all(Array.from({length:Math.min(4,nodes.length)},worker));
}
export function renderLines(target,rows,before,after){
  target.replaceChildren();
  for(const row of rows){
    if(row.gap){const gap=element('div','Unchanged lines');gap.className='review-gap';gap.dataset.studyKeysUi='';target.append(gap);continue;}
    const line=element('div',row.text||'\u200b'),deleted=row.change==='delete';
    line.className='review-line';line.dataset.change=row.change;
    line.dataset.sourceStart=line.dataset.sourceEnd=String(deleted?row.oldLine:row.newLine);
    line.dataset.lineLabel=(deleted?'−':row.change==='add'?'+':'')+(deleted?row.oldLine:row.newLine);
    line.dataset.sourceSide=deleted?'before':'after';
    line.dataset.sourceHash=deleted?before.hash:after.hash;
    target.append(line);
  }
}
export function locationForSelection(index,pending,data,versions){
  if(!pending)return {hash:data.document.hash,quote:'',quality:'document',side:'working'};
  const owners=new Set();
  for(let i=pending.start;i<pending.end;i++){
    const owner=index.points[i]?.node.parentElement?.closest('[data-source-start]');
    if(owner)owners.add(owner);
  }
  const all=[...owners],first=all[0];
  if(!first)throw Error('Choose text in the document, or add a whole-document comment.');
  const side=all.every(n=>n.dataset.sourceSide==='before')?'before':
    all.some(n=>n.dataset.sourceSide==='after')?'after':'working';
  const relevant=all.filter(n=>(n.dataset.sourceSide||'working')===side);
  const version=side==='working'?data.document:versions[side];
  // A mixed diff selection refers to the current passage. Keep a removed-only
  // selection attached to the old source, without joining old/new words together.
  let quote='';
  for(let i=pending.start;i<pending.end;i++){
    const owner=index.points[i]?.node.parentElement?.closest('[data-source-start]');
    if(side==='before'||owner?.dataset.sourceSide!=='before')quote+=index.text[i];
  }
  quote=quote.trim();
  const source=sourceLocation(version.source,quote,
    Math.min(...relevant.map(n=>+n.dataset.sourceStart)),Math.max(...relevant.map(n=>+n.dataset.sourceEnd)));
  const headings=[...document.querySelectorAll('#review-document h1,#review-document h2,#review-document h3,#review-document h4')];
  const heading=headings.filter(h=>h===first||!!(h.compareDocumentPosition(first)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1)?.textContent||'';
  return {hash:version.hash,quote,heading,...source,side};
}
