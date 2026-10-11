import {pageKey} from './core.js';
import {appendJump,cleanLocation,cleanStudyState,rankEntries,parseSearch,matchesFilters} from './navigation-core.js';
const EMPTY={x:0,y:0,pageX:0,pageY:0,pane:null,anchor:null,viewportY:0};
const readable=tab=>/^https?:/.test(tab?.url||'');
export function createNavigationService(api,library,verticalTabs=null){
  const searches=new Map();let queue=Promise.resolve();const enqueue=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
  const session=api.storage.session,key='reading-navigation';
  const state=async()=>((await session.get(key))[key]||{entries:[],at:-1,latest:{},active:{},previous:{},focus:{},results:[],resultAt:-1});
  const save=s=>session.set({[key]:s});
  function trackActive(s,target,sender){const old=s.active[target.windowId]??(target.windowId===sender.tab.windowId?sender.tab.id:null);if(old!=null&&old!==target.id)s.previous[target.windowId]=old;s.active[target.windowId]=target.id;}
  const call=async(id,action,extra={})=>{let timer;try{return await Promise.race([api.tabs.sendMessage(id,{type:'studyNavigation',action,...extra}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Page is not available.')),1800);})]);}finally{clearTimeout(timer);}};
  async function position(tab){
    if(!readable(tab))return null;
    const fallback=async()=>{const cached=(await state()).latest?.[tab.id];return cached?.url===pageKey(tab.url)?cleanLocation({...cached,title:tab.title||cached.title,tabId:tab.id}):{url:pageKey(tab.url),title:tab.title||'',tabId:tab.id,position:{...EMPTY}};};
    if(tab.discarded)return fallback();
    try{return cleanLocation({...await call(tab.id,'capture'),tabId:tab.id});}catch{return fallback();}
  }
  async function tabs(sender){return (await api.tabs.query({})).filter(t=>!!t.incognito===!!sender.tab.incognito);}
  async function groups(sender){if(!api.tabGroups)throw Error('This browser does not expose native tab groups.');return (await api.tabGroups.query({})).filter(g=>g.windowId===sender.tab.windowId);}
  async function activate(location,sender){
    const all=await tabs(sender);let target=all.find(t=>t.id===location.tabId&&(!location.url||(readable(t)&&pageKey(t.url)===pageKey(location.url))));
    if(!target&&location.url)target=all.find(t=>readable(t)&&pageKey(t.url)===pageKey(location.url));
    if(!target){if(!location.url)throw Error('That tab has closed. Search again.');target=await api.tabs.create({url:pageKey(location.url),windowId:sender.tab.windowId,active:true});}
    else await api.tabs.update(target.id,{active:true});
    await api.windows.update(target.windowId,{focused:true});
    if(location.position||location.anchor){
      let response;
      for(let i=0;i<15;i++){try{response=await call(target.id,'restore',{location});if(response?.restored)break;if(response?.reason)throw Error(response.reason);}catch(error){if(i===14)throw error;}await new Promise(r=>setTimeout(r,150));}
      if(!response?.restored)throw Error('The tab opened, but its reading position is not available yet.');
    }
    return target;
  }
  async function handle(m,sender,ticket=null){
    if(sender.tab?.incognito)throw Error('Study navigation is disabled in private windows.');
    const s=await state(),action=m.action;
    if(action==='checkpoint'){
      let point=cleanLocation({...m.location,tabId:sender.tab.id});if(point.url!==pageKey(sender.url))throw Error('Reading position belongs to another page.');
      const pending=s.pending?.[sender.tab.id];if(pending&&pending.url===point.url){try{const restored=await call(sender.tab.id,'restore',{location:pending});if(restored?.restored){delete s.pending[sender.tab.id];point=await position(sender.tab)||point;}}catch{}}
      const previous=s.latest[sender.tab.id];if(previous&&previous.url!==point.url){appendJump(s,previous);appendJump(s,point);}
      s.latest[sender.tab.id]=point;
      if(m.jump)appendJump(s,point);await save(s);return {};
    }
    if(action==='tabs'||action==='search'){
      const all=await tabs(sender),gs=api.tabGroups?await api.tabGroups.query({}):[],groupMap=new Map(gs.map(g=>[g.id,g.title||'Untitled group']));
      let focus=s.focus[sender.tab.windowId];if(focus&&!gs.some(g=>g.id===focus.id))focus=null;const scoped=focus?all.filter(t=>t.groupId===focus.id):all;
      const entries=scoped.sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0)).map(t=>({tabId:t.id,url:t.url||'',label:t.title||t.url||'Untitled tab',group:groupMap.get(t.groupId)||'',detail:[groupMap.get(t.groupId),t.url,t.audible?'Playing audio':'',t.pinned?'Pinned':'',t.discarded?'Unloaded':''].filter(Boolean).join(' · ')}));
      if(action==='tabs')return {entries:rankEntries(entries,m.query||''),coverage:`${entries.length} tabs${focus?' · focused group':''}`};
      const {text,filters}=parseSearch(m.query||'');if(!text)return {entries:[],coverage:'Type a passage to search loaded tabs. Filters: site: and group:'};
      const candidates=scoped.filter(t=>readable(t)&&!t.discarded&&matchesFilters({url:t.url,group:groupMap.get(t.groupId)},filters)),results=[];let covered=0,cursor=0;
      await Promise.all(Array.from({length:Math.min(4,candidates.length)},async()=>{
        while(cursor<candidates.length&&(!ticket||searches.get(sender.tab.id)===ticket)){const tab=candidates[cursor++];try{const response=await call(tab.id,'search',{query:text});if(response?.entries){covered++;for(const entry of response.entries.slice(0,30))results.push({...entry,url:pageKey(tab.url),tabId:tab.id,group:groupMap.get(tab.groupId)||'',label:tab.title+' · '+entry.label,detail:entry.detail+' · '+tab.url});}}catch{}}
      }));
      return {entries:rankEntries(results,m.query).slice(0,150),coverage:`${covered} of ${scoped.length} tabs searchable · loaded text only`};
    }
    if(action==='open'){
      const before=await position(sender.tab);if(before)appendJump(s,before);
      const target=await activate(m.location,sender),after=await position(target);if(after)appendJump(s,after);trackActive(s,target,sender);await save(s);return {opened:true};
    }
    if(action==='lastTab'){
      const id=s.previous[sender.tab.windowId];if(!id)throw Error('Switch tabs once to establish a previous tab.');return handle({action:'open',location:{tabId:id}},sender);
    }
    if(action==='jumps')return {entries:s.entries.map((location,i)=>({location,index:i,label:(i===s.at?'● ':'')+location.title,detail:location.position.anchor?.quote||location.url})).reverse()};
    if(action==='jump'){
      const current=await position(sender.tab);if(current&&s.at===s.entries.length-1)appendJump(s,current);
      const next=Number.isInteger(m.index)?m.index:Math.max(0,Math.min(s.entries.length-1,s.at+Math.sign(m.delta)*Math.min(99,Math.max(1,m.count||1))));
      if(next<0||next===s.at||!s.entries[next])return {edge:true};
      // Commit the cursor only after restoration succeeds.
      const target=await activate(s.entries[next],sender);s.at=next;trackActive(s,target,sender);await save(s);return {opened:true};
    }
    if(action==='pinResults'){s.results=(m.entries||[]).slice(0,150);s.resultAt=-1;await save(s);return {count:s.results.length};}
    if(action==='nextResult'){
      if(!s.results.length)throw Error('Pin a search using the Pin results button first.');
      s.resultAt=s.resultAt<0?(m.delta<0?s.results.length-1:0):(s.resultAt+m.delta+s.results.length)%s.results.length;await save(s);await handle({action:'open',location:s.results[s.resultAt]},sender);return {at:s.resultAt+1,total:s.results.length};
    }
    if(action==='groups')return {entries:(await groups(sender)).map(g=>({id:g.id,label:g.title||'Untitled group',detail:g.color+(g.collapsed?' · collapsed':'')}))};
    if(action==='groupCreate'||action==='groupMove'||action==='groupRemove'){
      const all=await api.tabs.query({windowId:sender.tab.windowId}),selected=m.selected?all.filter(t=>t.highlighted):all.filter(t=>t.id===sender.tab.id),ids=selected.map(t=>t.id);
      if(action==='groupRemove')await api.tabs.ungroup(ids);
      else if(action==='groupMove'){if(!(await groups(sender)).some(g=>g.id===m.groupId))throw Error('This group is no longer in the current window.');await api.tabs.group({tabIds:ids,groupId:m.groupId});}
      else{const name=String(m.name||'').trim().slice(0,100);if(!name)throw Error('Give the group a name.');const id=await api.tabs.group({tabIds:ids});await api.tabGroups.update(id,{title:name,color:'green'});}
      return {done:true};
    }
    if(action==='groupOpen'){
      const all=await api.tabs.query({windowId:sender.tab.windowId,groupId:m.groupId});if(!all.length)throw Error('This group has no open tabs.');await api.tabGroups.update(m.groupId,{collapsed:false});return handle({action:'open',location:{tabId:all[0].id}},sender);
    }
    if(action==='groupFocus'){
      const windowId=sender.tab.windowId,gs=await groups(sender),existing=s.focus[windowId];
      if(existing){for(const g of gs){const collapsed=existing.collapsed[g.id];if(typeof collapsed==='boolean')await api.tabGroups.update(g.id,{collapsed});}delete s.focus[windowId];}
      else{const tab=await api.tabs.get(sender.tab.id);if(tab.groupId<0)throw Error('Put this tab in a group first.');s.focus[windowId]={id:tab.groupId,collapsed:Object.fromEntries(gs.map(g=>[g.id,g.collapsed]))};for(const g of gs)await api.tabGroups.update(g.id,{collapsed:g.id!==tab.groupId});}
      await save(s);return {focused:!existing};
    }
    if(['spots','spotSave','spotOpen','spotRemove','workspaces','workspaceSave','workspaceOpen','workspaceRemove'].includes(action)){
      const data=cleanStudyState((await library.get('navigation')).navigation||{});
      if(action==='spots')return {entries:data.spots.map((location,i)=>({slot:i+1,location,label:`${i+1} · ${location.title}`,detail:location.position.anchor?.quote||location.url}))};
      if(action==='spotSave'){
        const point=await position(sender.tab);if(!point)throw Error('Save quick spots on a readable webpage.');
        const duplicate=data.spots.findIndex(p=>p.url===point.url&&p.position.pane===point.position.pane&&Math.abs(p.position.y-point.position.y)<20);if(duplicate>=0)data.spots[duplicate]=point;else{if(data.spots.length>=9)throw Error('All nine slots are occupied. Remove a spot from the quick-spots picker first.');data.spots.push(point);}
        await library.set({navigation:data});return {slot:duplicate>=0?duplicate+1:data.spots.length};
      }
      if(action==='spotOpen'){const location=data.spots[m.slot-1];if(!location)throw Error('That quick spot is empty.');return handle({action:'open',location},sender);}
      if(action==='spotRemove'){data.spots.splice(m.slot-1,1);await library.set({navigation:data});return {};}
      if(action==='workspaces')return {entries:data.workspaces.map(w=>({id:w.id,label:w.name,detail:`${w.tabs.length} pages · notes and drawings stay with their URLs`}))};
      if(action==='workspaceSave'){
        const name=String(m.name||'').trim().slice(0,100);if(!name)throw Error('Give the workspace a name.');if(data.workspaces.length>=50)throw Error('Remove an old workspace before saving another.');
        const gs=await groups(sender),all=(await api.tabs.query({windowId:sender.tab.windowId})).filter(readable).slice(0,100),records=[];
        for(const tab of all){const point=await position(tab),g=gs.find(x=>x.id===tab.groupId);records.push({...point,group:g?.title||'',groupKey:g?'group:'+g.id:'',color:g?.color||'grey'});}
        data.workspaces.push({id:crypto.randomUUID(),name,tabs:records});await library.set({navigation:data});return {count:records.length};
      }
      const workspace=data.workspaces.find(w=>w.id===m.id);if(!workspace)throw Error('Workspace not found.');
      if(action==='workspaceRemove'){data.workspaces=data.workspaces.filter(w=>w.id!==m.id);await library.set({navigation:data});return {};}
      const existing=(await api.tabs.query({windowId:sender.tab.windowId})).filter(readable),newGroups=new Map(),usedTabs=new Set();let count=0,restored=0;s.pending??={};
      for(const location of workspace.tabs){let tab=existing.find(t=>!usedTabs.has(t.id)&&t.id===location.tabId&&pageKey(t.url)===location.url)||existing.find(t=>!usedTabs.has(t.id)&&pageKey(t.url)===location.url);if(!tab){tab=await api.tabs.create({url:location.url,windowId:sender.tab.windowId,active:false});existing.push(tab);}usedTabs.add(tab.id);
        const groupKey=location.groupKey||location.group;
        if(groupKey){let id=newGroups.get(groupKey);id=await api.tabs.group({tabIds:[tab.id],...(id==null?{}:{groupId:id})});newGroups.set(groupKey,id);await api.tabGroups.update(id,{title:location.group,color:location.color});}
        s.pending[tab.id]=location;try{const r=await call(tab.id,'restore',{location});if(r?.restored){restored++;delete s.pending[tab.id];}}catch{}count++;
      }
      await save(s);return {count,restored};
    }
    if(action==='verticalTabs'){if(!verticalTabs)throw Error('This browser has no native vertical-tabs integration. Space s is reserved for the browser sidebar.');return verticalTabs();}
    throw Error('Unknown navigation action.');
  }
  const request=(m,sender)=>{if(m.action==='search'){const ticket={};searches.set(sender.tab.id,ticket);return handle({...m,query:String(m.query||'').slice(0,300)},sender,ticket);}if(m.action==='tabs')return handle(m,sender);return enqueue(()=>handle(m,sender));};
  async function activated(info){return enqueue(async()=>{const s=await state(),old=s.active[info.windowId];if(old===info.tabId)return;if(old!=null)s.previous[info.windowId]=old;s.active[info.windowId]=info.tabId;const tab=await api.tabs.get(info.tabId);if(tab.incognito)return;const before=s.latest[old];if(before)appendJump(s,before);const point=await position(tab);if(point){s.latest[tab.id]=point;appendJump(s,point);}await save(s);});}
  return {request,activated};
}
