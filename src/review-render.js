import MarkdownIt from 'markdown-it';
import {parse} from 'parse5';
import {sourceLocation} from './review-model.js';
import {documentURL} from './document-context.js';
import {supportedPage} from './core.js';
import {request} from './transport.js';

const markdown=new MarkdownIt({html:false,linkify:true,typographer:false});
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
const allowed=new Set('article main section div span p h1 h2 h3 h4 h5 h6 ul ol li pre code blockquote table thead tbody tfoot tr td th strong em b i s del a br hr details summary dl dt dd sup sub kbd mark figure figcaption'.split(' '));
const blocked=new Set('head script style iframe object embed template noscript svg math form button input textarea select video audio link meta base'.split(' '));
const element=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;};
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
    if(blocked.has(tag)||node.nodeName==='#comment')return;
    const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
    if(attrs.hidden!==undefined||attrs['aria-hidden']==='true')return;
    if(tag==='img'){
      const image=element('span','[Image: '+(attrs.alt||'open the original document to view')+']');image.className='review-image';parent.append(image);return;
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
      if(tag==='ol'&&/^\d+$/.test(attrs.start||''))next.start=+attrs.start;
      parent.append(next);
    }
    for(const child of node.childNodes||[])visit(child,next);
  }
  target.replaceChildren();visit(tree,target);
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
  const first=index.points[pending.start]?.node.parentElement?.closest('[data-source-start]');
  const last=index.points[pending.end-1]?.node.parentElement?.closest('[data-source-start]');
  if(!first||!last)throw Error('Choose text in the document, or add a whole-document comment.');
  const side=first.dataset.sourceSide||'working';
  if(side!==(last.dataset.sourceSide||'working'))throw Error('Select additions or deletions separately so the comment has one source revision.');
  // Matching endpoints can still enclose an intervening deletion/addition.
  for(let i=pending.start;i<pending.end;i++){
    const owner=index.points[i]?.node.parentElement?.closest('[data-source-start]');
    if(owner&&(owner.dataset.sourceSide||'working')!==side)throw Error('Select additions or deletions separately so the comment has one source revision.');
  }
  const version=side==='working'?data.document:versions[side];
  const quote=index.text.slice(pending.start,pending.end).trim();
  const source=sourceLocation(version.source,quote,+first.dataset.sourceStart,+last.dataset.sourceEnd);
  const headings=[...document.querySelectorAll('#review-document h1,#review-document h2,#review-document h3,#review-document h4')];
  const heading=headings.filter(h=>h===first||!!(h.compareDocumentPosition(first)&Node.DOCUMENT_POSITION_FOLLOWING)).at(-1)?.textContent||'';
  return {hash:version.hash,quote,heading,...source,side};
}
