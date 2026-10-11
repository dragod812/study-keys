import {createRepository} from './repository.js';
import {createDiskStorage} from './disk-storage.js';
import {pageKey} from './core.js';
const storage=createDiskStorage(chrome.storage.local);
const repository=createRepository(storage);
const ready=Promise.all([chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})]);
chrome.runtime.onInstalled?.addListener(({reason})=>{if(reason==='install')chrome.tabs.create({url:chrome.runtime.getURL('setup.html')});});
chrome.tabs.onRemoved.addListener(async tabId=>{
  const sessions=await chrome.storage.session.get(null);
  const keys=Object.entries(sessions).filter(([k,v])=>k.startsWith('notebook:')&&v.tabId===tabId).map(([k])=>k);
  if(keys.length)await chrome.storage.session.remove(keys);
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local'||!Object.keys(changes).some(k=>k.startsWith('page:')||k==='settings'))return;
  // No tab URLs or browsing history are requested. Each content script reloads
  // only its own page's data; notes are never broadcast to other websites.
  chrome.tabs.query({}).then(tabs=>Promise.allSettled(tabs.map(t=>chrome.tabs.sendMessage(t.id,{type:'invalidate'})))).catch(()=>{});
});
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
  if(sender.id!==chrome.runtime.id)return;
  // Call directly from the user gesture, before any asynchronous storage read.
  if(m?.type==='openPanel'&&sender.tab&&sender.frameId===0){
    chrome.sidePanel.open({windowId:sender.tab.windowId}).then(()=>respond({ok:true,value:{opened:true}}),e=>respond({ok:false,error:e.message}));return true;
  }
  (async()=>{
    await ready;
    const isNotebook=sender.url?.split(/[?#]/)[0]===chrome.runtime.getURL('notebook.html');
    // A web-accessible iframe is not a general-purpose privileged extension UI.
    // Its opaque session is minted by our top-frame content script and bound to
    // that tab and original page. Scene bytes never cross into the website.
    if(isNotebook||m?.type==='notebookRequest') {
      if(!['drawingLoad','drawingSave','drawingLayout'].includes(m?.action)||!sender.tab||!m.session)throw Error('Notebook session required.');
      const key='notebook:'+m.session,session=(await chrome.storage.session.get(key))[key];
      if(!session||session.tabId!==sender.tab.id)throw Error('Reopen the notebook from Study Keys on this page.');
      if(!isNotebook&&(sender.frameId!==0||pageKey(sender.url)!==session.url))throw Error('Notebook belongs to another page.');
      const value=await repository({...m,type:m.action,url:session.url,title:session.title,recoveryId:session.recoveryId});
      return {...value,storage:await storage.status()};
    }
    const trusted=['library.html','panel.html','popup.html','setup.html'].some(p=>sender.url?.split(/[?#]/)[0]===chrome.runtime.getURL(p));
    if(!trusted) {
      if(!sender.tab||sender.frameId!==0||!['page','save','enabled','openLibrary','navigate','openNotebook','marks','setMark','getMark','gotoMark'].includes(m?.type))throw Error('Request not available to page scripts.');
      if(!['openLibrary','navigate'].includes(m.type)&&pageKey(m.url)!==pageKey(sender.url))throw Object.assign(Error('The page changed. Please try again.'),{code:'PAGE_CHANGED'});
    }
    if(m.type==='gotoMark') {
      const mark=await repository({type:'getMark',url:m.url,name:m.name});
      if(/^[a-z]$/.test(m.name))return {mark};
      const tabs=await chrome.tabs.query({}),matches=await Promise.all(tabs.map(async tab=>{try{const c=await chrome.tabs.sendMessage(tab.id,{type:'context'});return c?.url===mark.url?tab:null;}catch{return null;}}));
      let target=matches.find(t=>t?.id===sender.tab?.id)||matches.find(Boolean);
      if(!target)target=await chrome.tabs.create({url:mark.url,active:true});else await chrome.tabs.update(target.id,{active:true});
      await chrome.windows.update(target.windowId,{focused:true});
      for(let i=0;i<50;i++){try{const answer=await chrome.tabs.sendMessage(target.id,{type:'restoreMark',url:mark.url,mark,name:m.name});if(answer?.restored)return {jumped:true};}catch{}await new Promise(r=>setTimeout(r,200));}
      throw Error('Opened the marked page. It is still loading; press the mark shortcut again to restore its position.');
    }
    if(m.type==='storageStatus')return storage.status();
    if(m.type==='openNotebook') {
      if(!sender.tab||sender.frameId!==0)throw Error('Open the notebook from its webpage.');
      const session=crypto.randomUUID();
      await chrome.storage.session.set({['notebook:'+session]:{url:pageKey(sender.url),title:String(m.title||'').slice(0,500),tabId:sender.tab.id,recoveryId:crypto.randomUUID()}});
      return {session,layout:(await storage.get('notebook-layout'))['notebook-layout'],src:chrome.runtime.getURL('notebook.html')+'?session='+session};
    }
    if(m.type==='openLibrary'){await chrome.runtime.openOptionsPage();return {opened:true};}
    if(m.type==='navigate'){
      if(!sender.tab)throw Error('Use this command from a webpage.');
      if(m.action==='back')await chrome.tabs.goBack(sender.tab.id);
      else if(m.action==='forward')await chrome.tabs.goForward(sender.tab.id);
      else if(m.action==='open'){
        const target=new URL(m.target);if(!['https:','http:'].includes(target.protocol))throw Error('Enter an HTTP or HTTPS URL.');
        if(m.newTab)await chrome.tabs.create({url:target.href,active:true});else await chrome.tabs.update(sender.tab.id,{url:target.href});
      }else if(['next','previous','first','last'].includes(m.action)){
        const tabs=(await chrome.tabs.query({windowId:sender.tab.windowId})).sort((a,b)=>a.index-b.index),at=tabs.findIndex(t=>t.id===sender.tab.id);
        const next=m.action==='first'?0:m.action==='last'?tabs.length-1:(at+(m.action==='next'?1:-1)+tabs.length)%tabs.length;
        if(tabs[next])await chrome.tabs.update(tabs[next].id,{active:true});
      }else throw Error('Unknown navigation command.');
      return {done:true};
    }
    const result=await repository(m);
    return m.type==='page'?{...result,storage:await storage.status()}:result;
  })().then(value=>respond({ok:true,value}),error=>respond({ok:false,error:error.message,code:error.code}));
  return true;
});
