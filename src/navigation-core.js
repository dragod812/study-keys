import {pageKey,score} from './core.js';
import {cleanPosition} from './marks.js';
export function literalMatches(text,query,limit=2000){
  if(!query)return [];const pattern=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const matches=[];for(const m of text.matchAll(new RegExp(pattern,'giu'))){matches.push({start:m.index,end:m.index+m[0].length});if(matches.length>=limit)break;}return matches;
}
export function parseSearch(query=''){
  const filters={};const text=String(query).replace(/\b(site|group|color|has):("[^"]*"|\S+)/g,(_,key,value)=>{filters[key]=value.replace(/^"|"$/g,'').toLowerCase();return '';}).trim();return {text,filters};
}
export function matchesFilters(entry,filters){
  let host='';try{host=new URL(entry.url).protocol==='file:'?'local':new URL(entry.url).hostname;}catch{}
  return (!filters.site||host===filters.site||host.endsWith('.'+filters.site))&&(!filters.group||String(entry.group||'').toLowerCase().includes(filters.group))&&(!filters.color||entry.color===filters.color)&&(!filters.has||(filters.has==='note'?!!entry.note:filters.has==='drawing'?!!entry.drawing:false));
}
export function rankEntries(entries,query){const {text,filters}=parseSearch(query);return entries.map((entry,i)=>({entry,i,rank:matchesFilters(entry,filters)?score([entry.label,entry.detail,entry.url,entry.group].join(' '),text):-1})).filter(x=>x.rank>=0).sort((a,b)=>b.rank-a.rank||a.i-b.i).map(x=>x.entry);}
export function cleanLocation(raw){
  if(!raw||typeof raw!=='object')throw Error('Invalid reading location.');
  return {url:pageKey(raw.url),title:String(raw.title||'').slice(0,500),position:cleanPosition(raw.position),tabId:Number.isInteger(raw.tabId)?raw.tabId:null};
}
export function sameLocation(a,b){return a?.url===b?.url&&a?.tabId===b?.tabId&&a?.position?.pane===b?.position?.pane&&Math.abs((a?.position?.y||0)-(b?.position?.y||0))<20;}
export function appendJump(state,location){
  const next=cleanLocation(location);if(sameLocation(state.entries[state.at],next)){state.entries[state.at]=next;return;}
  state.entries=state.entries.slice(0,state.at+1);state.entries.push(next);if(state.entries.length>100)state.entries.shift();state.at=state.entries.length-1;
}
export function cleanStudyState(raw={}){
  if(!raw||typeof raw!=='object'||(raw.spots!=null&&!Array.isArray(raw.spots))||(raw.workspaces!=null&&!Array.isArray(raw.workspaces)))throw Error('Invalid study navigation data.');
  for(const workspace of raw.workspaces||[])if(!workspace||!Array.isArray(workspace.tabs))throw Error('Invalid study workspace.');
  return {spots:(raw.spots||[]).slice(0,9).map(cleanLocation),workspaces:(raw.workspaces||[]).slice(0,50).map(w=>({id:String(w.id).slice(0,80),name:String(w.name).slice(0,100),tabs:(w.tabs||[]).slice(0,100).map(t=>({...cleanLocation(t),group:String(t.group||'').slice(0,100),...(t.groupKey?{groupKey:String(t.groupKey).slice(0,100)}:{}),color:['grey','blue','red','yellow','green','pink','purple','cyan','orange'].includes(t.color)?t.color:'grey'}))}))};
}

export function passageScore(text,query){
  const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);if(!terms.length)return 0;
  const words=text.toLocaleLowerCase().match(/[\p{L}\p{N}_-]+/gu)||[];
  const ranks=terms.map(term=>Math.max(-1,...words.map(word=>word.includes(term)?1000:score(word,term)>=98?100: -1)));
  return ranks.some(r=>r<0)?-1:ranks.reduce((a,b)=>a+b,0)+(text.toLocaleLowerCase().includes(query.toLocaleLowerCase())?100:0);
}
