import {buildIndex,fromSelection,available} from './dom.js';
import {pageKey,makeAnchor} from './core.js';
import {hash} from './agent-core.js';

let details=new Map();
export async function readAgentPage(){
 const index=buildIndex(),limit=350000,text=index.text.slice(0,limit),contentHash=await hash(text);
 const boundaries=[0,...index.breaks.keys()].filter(n=>n<text.length),blocks=[];
 for(let i=0;i<boundaries.length;i++){let start=boundaries[i],end=boundaries[i+1]??text.length;while(text[start]===' ')start++;while(text[end-1]===' ')end--;if(end<=start)continue;const parent=index.points[start]?.node.parentElement,heading=parent?.closest('h1,h2,h3,h4,h5,h6');blocks.push({id:'b'+i,start,end,type:heading?'heading':parent?.closest('pre')?'code':parent?.closest('table')?'table':'text',...(heading?{level:Number(heading.tagName[1])}:{}),text:text.slice(start,end)});}
 details=new Map([...document.querySelectorAll('details:not([open])')].filter(e=>!e.closest('[data-study-keys]')).map((e,i)=>['details-'+i,e]));
 const privateFields='input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]';
 const readable=e=>available(e)&&!e.closest(privateFields)&&!e.querySelector(privateFields);
 const tables=[...document.querySelectorAll('table')].filter(readable).slice(0,20).map(t=>({caption:t.caption?.innerText||'',rows:[...t.rows].slice(0,100).map(row=>[...row.cells].filter(readable).map(c=>c.innerText.slice(0,500)))}));
 const code=[...document.querySelectorAll('pre')].filter(readable).slice(0,40).map(p=>p.innerText.slice(0,20000));
 return {url:pageKey(location.href),title:document.title.slice(0,500),text,blocks,tables,code,contentHash,capturedAt:new Date().toISOString(),coverage:{truncated:index.truncated||index.text.length>limit,collapsed:[...details].map(([id,e])=>({id,title:e.querySelector('summary')?.textContent?.trim().slice(0,200)||'Details'})),unsupported:{iframes:document.querySelectorAll('iframe').length,canvases:document.querySelectorAll('canvas').length},note:'Rendered top-document text only. Hidden/unloaded text, embedded frames and canvas text are not read. Form fields and Study Keys UI are excluded. Auxiliary tables/code are capped at 20 tables × 100 rows and 40 code blocks × 20,000 characters; text and offsets use normalized whitespace.'}};
}
export function agentSelection(){const index=buildIndex(),span=fromSelection(index);return {url:pageKey(location.href),anchor:span?makeAnchor(index.text,span.start,span.end):null};}
export function revealAgentSection(id){const el=details.get(id);if(!el?.isConnected||el.tagName!=='DETAILS')throw Error('Read the page first and choose an observed details section.');el.open=true;return {revealed:id};}
