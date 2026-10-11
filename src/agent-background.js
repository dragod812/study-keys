import {pageKey} from './core.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const disconnected=e=>/Receiving end does not exist|No tab with id|The tab was closed/.test(e?.message||'');
export function createAgentService(chrome,repository,storage,authorize=async()=>{}){
 const editors=new Map();let commandQueue=Promise.resolve();
 chrome.runtime.onConnect?.addListener(port=>{
  if(!port.name.startsWith('study-keys-editor:')||port.sender?.id!==chrome.runtime.id||port.sender.url?.split(/[?#]/)[0]!==chrome.runtime.getURL('notebook.html'))return;
  const session=port.name.slice('study-keys-editor:'.length),entry={port,pending:new Map(),url:null};
  port.onDisconnect.addListener(()=>{editors.delete(session);for(const p of entry.pending.values())p.reject(Error('Notebook disconnected. Reopen it before applying changes.'));entry.pending.clear();});
  port.onMessage.addListener(m=>{const p=entry.pending.get(m.id);if(p){clearTimeout(p.timer);entry.pending.delete(m.id);m.error?p.reject(Error(m.error)):p.resolve(m.value);}});
  chrome.storage.session.get('notebook:'+session).then(data=>{const record=data['notebook:'+session];if(!record||record.tabId!==port.sender.tab?.id){port.disconnect();return;}entry.url=record.url;entry.tabId=record.tabId;editors.set(session,entry);}).catch(()=>port.disconnect());
 });
 function editorCall(entry,action){return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{entry.pending.delete(id);reject(Error('Notebook did not respond. Finish its current edit and try again.'));},15000);entry.pending.set(id,{resolve,reject,timer});entry.port.postMessage({id,action});});}
 async function matches(url){return (await chrome.tabs.query({})).filter(t=>{try{return pageKey(t.url)===url;}catch{return false;}});}
 async function tabFor(url,open=false){
  let tabs=(await matches(url)).sort((a,b)=>Number(b.active)-Number(a.active));
  if(!tabs.length&&open)tabs=[await chrome.tabs.create({url,active:false})];
  if(!tabs.length)throw Error('Open the requested page in the connected browser first.');
  for(let i=0;i<40;i++){for(const tab of tabs){try{const context=await chrome.tabs.sendMessage(tab.id,{type:'context'},{frameId:0});if(context?.url===url)return tab;}catch{}}await sleep(200);}
  throw Error('Study Keys is unavailable on this page. Enable site/file access and reload it.');
 }
 async function content(tab,url,action,extra={}){
  const r=await chrome.tabs.sendMessage(tab.id,{type:'agentPage',url,action,...extra},{frameId:0});
  if(!r?.ok)throw Error(r?.error||'Page did not respond. Reload it and retry.');return r.value;
 }
 async function withEditors(url,fn){
  const locked=[];
  try{
   // Content reports an editor that is still connecting; never silently treat
   // an unregistered dirty iframe as a closed notebook.
   for(const tab of await matches(url)){
    let state;
    try{state=await content(tab,url,'notebookState');}
    catch(error){
     // Reloading an extension leaves old duplicate tabs without a receiver.
     // They cannot host an editor connected to this extension instance.
     if(disconnected(error)&&!editorsHasTab(tab.id,url))continue;
     throw error;
    }
    if(state.open&&!editorsHasTab(tab.id,url))throw Error('Notebook is still connecting. Wait for its saved status and retry.');
   }
   for(const entry of [...editors.values()].filter(e=>e.url===url)){await editorCall(entry,'prepare');locked.push(entry);}
   return await fn();
  }finally{await Promise.allSettled(locked.map(e=>editorCall(e,'release')));}
 }
 const editorsHasTab=(id,url)=>[...editors.values()].some(e=>e.tabId===id&&e.url===url);
 async function refresh(url){await Promise.allSettled((await matches(url)).map(t=>chrome.tabs.sendMessage(t.id,{type:'agentPage',action:'refresh',url},{frameId:0})));}
 async function notebook(url){const tab=await tabFor(url,true);await content(tab,url,'openNotebook');for(let i=0;i<60;i++){const entry=[...editors.values()].find(e=>e.url===url&&e.tabId===tab.id);if(entry)return entry;await sleep(200);}throw Error('Notebook did not connect. Open it on the requested page and retry.');}
 async function handle({tool,arguments:a={}}){
  if(tool==='bridge_status')return {extensionVersion:chrome.runtime.getManifest().version,hasPage:a.url?!!(await matches(pageKey(a.url))).length:false,protocol:1};
  if(!(await storage.status()).online)throw Error('The local library is unavailable; no agent edits were saved.');
  const url=pageKey(a.url);
  if(tool==='read_page'){
   const tab=await tabFor(url,a.open!==false);
   return withEditors(url,async()=>({source:await content(tab,url,'read'),...await repository({type:'agentRead',url})}));
  }
  if(tool==='get_page'||tool==='get_notebook')return withEditors(url,()=>repository({type:'agentRead',url}));
  if(tool==='read_selection')return content(await tabFor(url),url,'selection');
  if(tool==='reveal_section')return content(await tabFor(url),url,'reveal',{sectionId:a.sectionId});
  if(tool==='open_notebook'){await notebook(url);return {opened:true,url};}
  if(tool==='render_notebook'){const entry=await notebook(url);return editorCall(entry,'render');}
  if(tool==='get_study_run')return repository({type:'agentRun',url,requestId:a.requestId});
  if(tool==='undo_study_run')return withEditors(url,async()=>{const result=await repository({type:'agentUndo',url,requestId:a.requestId});await refresh(url);return result;});
  let request={...a,url};
  if(tool==='create_highlight'){const {quote,prefix,suffix,color,note,...rest}=a;request={...rest,url,annotations:[{quote,prefix,suffix,color,note}]};}
  else if(tool==='add_note'){const {note,color,...rest}=a;request={...rest,url,annotations:[{note,color:color||'yellow'}]};}
  else if(tool==='update_annotation'){const {annotation,...rest}=a;if(!annotation?.id||!Number.isSafeInteger(annotation.updatedAt))throw Error('Provide the existing annotation id and updatedAt.');request={...rest,url,annotations:[annotation]};}
  else if(!['apply_study_changes','apply_drawing_operations'].includes(tool))throw Error('Unknown agent operation.');
  return withEditors(url,async()=>{
   const needsSource=request.annotations?.some(x=>x.quote!==undefined),source=needsSource?await content(await tabFor(url),url,'read'):null;
   const result=await repository({type:'agentApply',url,requestId:a.requestId,request,source});
   await refresh(url);return result;
  });
 }
 return command=>{const promise=commandQueue.then(async()=>{await authorize();return handle(command);});commandQueue=promise.catch(()=>{});return promise;};
}
