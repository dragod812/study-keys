import {diffArrays,diffWordsWithSpace} from 'diff';

const isText=node=>node.nodeType===3;
const isMedia=node=>node.nodeType===1&&node.hasAttribute('data-review-media');
const limits={timeout:800,maxEditLength:10000};
const key=node=>isText(node)?'#'+node.data:JSON.stringify([node.tagName,
  ...[...node.attributes].filter(a=>!a.name.startsWith('data-source-')&&!['src','data-media-source'].includes(a.name)).map(a=>[a.name,a.value]),
  isMedia(node)?node.dataset.mediaSignature||node.dataset.mediaSource:[...node.childNodes].map(key)]);

export function stampVersion(root,side,version){
  for(const n of root.querySelectorAll('[data-source-start]')){
    n.dataset.sourceSide=side;n.dataset.sourceHash=version.hash;
  }
}
function copyLocation(from,to){
  const owner=(isText(from)?from.parentElement:from)?.closest('[data-source-start]');
  if(owner)for(const attr of ['sourceStart','sourceEnd','sourceSide','sourceHash'])if(owner.dataset[attr])to.dataset[attr]=owner.dataset[attr];
}
function mark(node,change){
  if(isText(node)){
    const wrap=document.createElement('span');copyLocation(node,wrap);wrap.textContent=node.data;wrap.dataset.change=change;return wrap;
  }
  const clone=node.cloneNode(true);clone.dataset.change=change;return clone;
}
function textDiff(before,after){
  const result=document.createDocumentFragment();
  const parts=diffWordsWithSpace(before.data,after.data,limits);
  if(!parts){result.append(mark(before,'delete'),mark(after,'add'));return result;}
  for(const part of parts){
    if(!part.added&&!part.removed){result.append(document.createTextNode(part.value));continue;}
    const span=document.createElement('span');span.textContent=part.value;span.dataset.change=part.added?'add':'delete';
    copyLocation(part.removed?before:after,span);result.append(span);
  }
  return result;
}
function compatible(a,b){return isText(a)&&isText(b)||a.nodeType===1&&b.nodeType===1&&a.tagName===b.tagName&&!isMedia(a)&&!isMedia(b);}
function merge(before,after){
  if(isText(before)&&isText(after))return textDiff(before,after);
  const result=after.cloneNode(false);
  if(['P','LI','BLOCKQUOTE'].includes(after.tagName)&&before.textContent.length>20&&after.textContent.length>20){
    const parts=diffWordsWithSpace(before.textContent,after.textContent,limits);
    const shared=parts?.filter(p=>!p.added&&!p.removed).reduce((n,p)=>n+p.value.length,0)||0;
    if(shared<.45*Math.max(before.textContent.length,after.textContent.length)){
      const fragment=document.createDocumentFragment();fragment.append(mark(before,'delete'),mark(after,'add'));return fragment;
    }
  }
  if(before.getAttribute('href')!==after.getAttribute('href')){
    const fragment=document.createDocumentFragment();fragment.append(mark(before,'delete'),mark(after,'add'));return fragment;
  }
  result.append(mergeChildren(before,after));return result;
}
function mergeChildren(before,after){
  const a=[...before.childNodes],b=[...after.childNodes],fragment=document.createDocumentFragment();
  const parts=diffArrays(a,b,{...limits,comparator:(x,y)=>key(x)===key(y)});
  if(!parts){for(const n of a)fragment.append(mark(n,'delete'));for(const n of b)fragment.append(mark(n,'add'));return fragment;}
  for(let i=0;i<parts.length;i++){
    const part=parts[i];
    if(!part.added&&!part.removed){for(const n of part.value)fragment.append(n.cloneNode(true));continue;}
    const removed=[],added=[];
    while(i<parts.length&&(parts[i].added||parts[i].removed)){
      (parts[i].removed?removed:added).push(...parts[i].value);i++;
    }i--;
    let old=0,next=0;
    while(old<removed.length||next<added.length){
      const x=removed[old],y=added[next];
      if(x&&y&&compatible(x,y)){fragment.append(merge(x,y));old++;next++;}
      else if(x){fragment.append(mark(x,'delete'));old++;}
      else {fragment.append(mark(y,'add'));next++;}
    }
  }
  return fragment;
}

export function renderRichDiff(target,before,after,{onlyChanges=false}={}){
  target.replaceChildren(mergeChildren(before,after));
  if(onlyChanges){
    function prune(parent){
      for(const child of [...parent.childNodes]){
        if(isText(child)){if(!parent.closest('[data-change]')&&!child.data.trim())continue;}
        if(child.nodeType===1&&(child.hasAttribute('data-change')||child.querySelector('[data-change]'))){
          if(['DIV','SECTION','ARTICLE','MAIN','UL','OL','TABLE','TBODY'].includes(child.tagName)&&!child.hasAttribute('data-change'))prune(child);
        }else child.remove();
      }
    }
    prune(target);
  }
  for(const media of target.querySelectorAll('[data-review-media]')){
    const change=media.closest('[data-change]')?.dataset.change;if(!change)continue;
    const badge=document.createElement('span');badge.className='review-media-label';badge.dataset.studyKeysUi='';
    badge.textContent=change==='add'?'Added / updated':'Removed / previous';media.append(badge);
  }
  return target.querySelectorAll('[data-change]').length;
}
