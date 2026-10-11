export const COLORS = [
  {id:'yellow', label:'Key idea', hex:'#ffe18b'},
  {id:'blue', label:'Key word', hex:'#afd8ff'},
  {id:'green', label:'Positives', hex:'#b8e4c4'},
  {id:'orange', label:'Negatives', hex:'#ffb454'},
  {id:'purple', label:'Game changer', hex:'#d5c4ff'},
  {id:'red', label:'Question', hex:'#ff3b30'},
];
// Pink was the Question category before the six-color palette. Preserve old
// records and backups without exposing a seventh, obsolete choice.
export const normalizeColor = color => color==='pink'?'red':color;
export const normalizePageColors = page => ({...page,items:page.items.map(item=>({...item,color:normalizeColor(item.color)}))});
export const ALPHABET = 'asdfghjklqwertyuiopzxcvbnm';
export function hintCodes(count) {
  const width = Math.max(1, Math.ceil(Math.log(Math.max(count,1))/Math.log(ALPHABET.length)));
  return Array.from({length:count},(_,i)=>{let code='';for(let n=0;n<width;n++){code=ALPHABET[i%ALPHABET.length]+code;i=Math.floor(i/ALPHABET.length);}return code;});
}
export function keyOf(e) {
  if(e.metaKey||e.altKey||e.isComposing||['Dead','Process'].includes(e.key))return null;
  return e.ctrlKey?'Ctrl-'+e.key.toLowerCase():e.key===' '?'Space':e.key;
}
// Only local Markdown and HTML documents are supported on file://. Never fetch a path,
// traverse directories, or interpret a local path as a library storage path.
export function isLocalDocument(raw) {
  try {
    const u=new URL(raw),path=decodeURIComponent(u.pathname);
    return u.protocol==='file:'&&!u.host&&!/%(?:2f|5c|00)/i.test(u.pathname)&&!/[\\\x00-\x1f]/.test(path)&&/\.(md|markdown|mdown|mkd|mkdn|html|htm)$/i.test(path);
  }catch{return false;}
}
export function supportedPage(raw){try{pageKey(raw);return true;}catch{return false;}}
export function pageScope(raw){const u=new URL(pageKey(raw));return u.protocol==='file:'?u.href:u.origin;}
export function pageSource(raw){const u=new URL(raw);return u.protocol==='file:'?'Local '+(/\.html?$/i.test(decodeURIComponent(u.pathname))?'HTML':'Markdown')+' · '+decodeURIComponent(u.pathname):u.hostname;}
export function pageKey(raw) {
  const u=new URL(raw);
  if(u.protocol==='file:'&&isLocalDocument(u.href)){u.search='';u.hash='';return u.href;}
  if(!['http:','https:'].includes(u.protocol))throw Error('Only HTTP/HTTPS pages and local Markdown/HTML files are supported.');
  u.username='';u.password='';
  for(const key of [...u.searchParams.keys()])if(/^(utm_|fbclid$|gclid$|msclkid$)/i.test(key))u.searchParams.delete(key);
  u.searchParams.sort();
  if(!/^#(?:\/|!)/.test(u.hash))u.hash='';
  return u.href;
}
export function makeAnchor(text,start,end,limit=100000) {
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>text.length||end<=start)throw Error('Choose some text first.');
  if(end-start>limit)throw Error('Choose a passage under '+limit.toLocaleString('en-US')+' characters.');
  return {quote:text.slice(start,end),prefix:text.slice(Math.max(0,start-64),start),suffix:text.slice(end,end+64),start,end};
}
function sharedSuffix(a,b){let i=0;while(i<Math.min(a.length,b.length)&&a.at(-1-i)===b.at(-1-i))i++;return i;}
function sharedPrefix(a,b){let i=0;while(i<Math.min(a.length,b.length)&&a[i]===b[i])i++;return i;}
// Position is a hint, never a reason to silently attach an ambiguous quotation.
export function resolveAnchor(text,a) {
  if(!a?.quote)return null;
  const candidates=[];let at=-1;
  while((at=text.indexOf(a.quote,at+1))!==-1) {
    const prefix=sharedSuffix(text.slice(Math.max(0,at-64),at),a.prefix||'');
    const suffix=sharedPrefix(text.slice(at+a.quote.length,at+a.quote.length+64),a.suffix||'');
    candidates.push({start:at,end:at+a.quote.length,score:prefix+suffix});
    if(candidates.length>1000)return null;
  }
  if(candidates.length===1)return candidates[0];
  candidates.sort((a,b)=>b.score-a.score);
  if(candidates.length && candidates[0].score>=8 && candidates[0].score>candidates[1].score)return candidates[0];
  return null;
}
export function score(label,query) {
  label=label.toLocaleLowerCase();query=query.trim().toLocaleLowerCase();
  if(!query)return 0;
  if(label.includes(query))return 1000-label.indexOf(query);
  if(query.split(/\s+/).every(w=>label.includes(w)))return 500;
  let at=-1,gap=0;for(const c of query){const n=label.indexOf(c,at+1);if(n<0)return -1;gap+=n-at-1;at=n;}return 100-gap/Math.max(label.length,1);
}
export function highlightSegments(regions) {
  const edges=[...new Set(regions.flatMap(r=>[r.start,r.end]))].sort((a,b)=>a-b),result=[];
  for(let i=0;i<edges.length-1;i++){
    const start=edges[i],end=edges[i+1],cover=regions.filter(r=>r.start<=start&&r.end>=end).sort((a,b)=>b.updatedAt-a.updatedAt||b.id.localeCompare(a.id))[0];
    if(!cover)continue;
    const previous=result.at(-1);
    if(previous?.end===start&&previous.color===cover.color)previous.end=end;
    else result.push({start,end,color:cover.color});
  }
  return result;
}
export function cleanItem(raw) {
  if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||!/^[\w-]{1,80}$/.test(raw.id))throw Error('Invalid annotation ID.');
  const color=normalizeColor(raw.color);
  if(!COLORS.some(c=>c.id===color))throw Error('Invalid highlight color.');
  if(typeof raw.note!=='string'||raw.note.length>100000)throw Error('Notes must be under 100,000 characters.');
  let anchor=null;
  if(raw.anchor!=null) {
    const a=raw.anchor;
    if(typeof a.quote!=='string'||!a.quote.length||a.quote.length>100000||typeof a.prefix!=='string'||a.prefix.length>64||typeof a.suffix!=='string'||a.suffix.length>64||!Number.isInteger(a.start)||a.start<0||!Number.isInteger(a.end)||a.end!==a.start+a.quote.length)throw Error('Invalid text anchor.');
    anchor={quote:a.quote,prefix:a.prefix,suffix:a.suffix,start:a.start,end:a.end};
  }
  if(!anchor&&!raw.note.trim())throw Error('A page note cannot be empty.');
  return {id:raw.id,color,note:raw.note,anchor,archived:!!raw.archived,...(raw.resolved?{resolved:true}:{}),updatedAt:Number.isSafeInteger(raw.updatedAt)&&raw.updatedAt>=0?raw.updatedAt:0};
}
export function validateBackup(raw) {
  if(raw?.format!=='study-keys'||![1,2,3].includes(raw.version)||!Array.isArray(raw.pages)||raw.pages.length>10000)throw Error('Not a supported Study Keys backup.');
  let count=0;
  return raw.pages.map(p=>{
    if(typeof p.url!=='string'||typeof p.title!=='string'||!Array.isArray(p.items))throw Error('Invalid page in backup.');
    count+=p.items.length;if(count>100000)throw Error('Backup contains too many annotations.');
    const seen=new Set();const items=p.items.map(cleanItem);
    for(const i of items){if(seen.has(i.id))throw Error('Duplicate annotation in backup.');seen.add(i.id);}
    return {url:pageKey(p.url),title:p.title.slice(0,500),items};
  });
}
