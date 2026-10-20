import {createRepository} from './repository.js';
import {createDiskStorage,nativeClient} from './disk-storage.js';
import {pageKey,supportedPage} from './core.js';
import {createNavigationService} from './navigation-background.js';
import {createAgentService} from './agent-background.js';
import {createSidePanelController} from './side-panel.js';
import {currentPageSender} from './page-sender.js';
import {readerSource,reviewRequest,resolveReaderSender} from './review-background.js';
import {readerTabAPI} from './reader-tabs.js';
const readingAPI=readerTabAPI(chrome);
const sidePanel=createSidePanelController(chrome);
let agentService,reconnectTimer,reconnectDelay=2000;
const native=nativeClient(chrome.runtime,async command=>{if(!(await chrome.storage.local.get('agent-access'))['agent-access'])throw Error('AI access is off. Enable it in Study Keys setup.');return agentService(command);},()=>{clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>startAgentBridge().catch(()=>{}),reconnectDelay);reconnectDelay=Math.min(reconnectDelay*2,60000);});
const storage=createDiskStorage(chrome.storage.local,native);
const repository=createRepository(storage);
agentService=createAgentService(readingAPI,repository,storage,async()=>{if(!(await chrome.storage.local.get('agent-access'))['agent-access'])throw Error('AI access is off. Enable it in Study Keys setup.');});
async function startAgentBridge(){if((await chrome.storage.local.get('agent-access'))['agent-access']){const result=await native('bridgeEnable');reconnectDelay=2000;return result;}return {enabled:false};}
startAgentBridge().catch(()=>{});
let browserNative;
const navigation=createNavigationService(readingAPI,storage,()=>{browserNative??=nativeClient();return browserNative('toggleVerticalTabs');});
chrome.tabs.onActivated?.addListener(info=>navigation.activated(info).catch(()=>{}));
const ready=Promise.all([chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})]);
chrome.runtime.onInstalled?.addListener(({reason})=>{if(reason==='install')chrome.tabs.create({url:chrome.runtime.getURL('setup.html')});});
chrome.tabs.onRemoved.addListener(async tabId=>{
  const sessions=await chrome.storage.session.get(null);
  const keys=Object.entries(sessions).filter(([k,v])=>k.startsWith('notebook:')&&v.tabId===tabId).map(([k])=>k);
  if(keys.length)await chrome.storage.session.remove(keys);
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local'||!Object.keys(changes).some(k=>k.startsWith('page:')||k==='settings'))return;
  // Each content script reloads
  // only its own page's data; notes are never broadcast to other websites.
  readingAPI.tabs.query({}).then(tabs=>Promise.allSettled(tabs.map(t=>readingAPI.tabs.sendMessage(t.id,{type:'invalidate'})))).catch(()=>{});
});
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
  if(sender.id!==chrome.runtime.id)return;
  if(m?.type==='readerMessage')return;
  // Call directly from the user gesture, before any asynchronous storage read.
  if(['openPanel','togglePanel'].includes(m?.type)&&sender.tab&&sender.frameId===0){
    sidePanel.toggle(sender.tab.windowId).then(value=>respond({ok:true,value}),e=>respond({ok:false,error:e.message}));return true;
  }
  if(m?.type==='closePanel'&&sender.url===chrome.runtime.getURL('panel.html')){
    sidePanel.close(m.windowId).then(value=>respond({ok:true,value}),e=>respond({ok:false,error:e.message}));return true;
  }
  (async()=>{
    await ready;
    sender=await resolveReaderSender(chrome,sender);
    if(m?.type==='review')return reviewRequest(chrome,native,m,sender);
    const reviewURL=readerSource(sender,chrome);
    const isNotebook=sender.url?.split(/[?#]/)[0]===chrome.runtime.getURL('notebook.html');
    // A web-accessible iframe is not a general-purpose privileged extension UI.
    // Its opaque session is minted by our top-frame content script and bound to
    // that tab and original page. Scene bytes never cross into the website.
    if(isNotebook||m?.type==='notebookRequest') {
      if(!['drawingLoad','drawingSave','drawingLayout'].includes(m?.action)||!sender.tab||!m.session)throw Error('Notebook session required.');
      const key='notebook:'+m.session,session=(await chrome.storage.session.get(key))[key];
      if(!session||session.tabId!==sender.tab.id)throw Error('Reopen the notebook from Study Keys on this page.');
      if(!isNotebook)sender=await currentPageSender(chrome,sender,session.url);
      const value=await repository({...m,type:m.action,url:session.url,title:session.title,recoveryId:session.recoveryId});
      return {...value,storage:await storage.status()};
    }
    const trusted=['library.html','panel.html','popup.html','setup.html'].some(p=>sender.url?.split(/[?#]/)[0]===chrome.runtime.getURL(p));
    if(!trusted) {
      if(!sender.tab||sender.frameId!==0||!['page','save','enabled','openLibrary','navigate','openNotebook','openReview','marks','setMark','getMark','gotoMark','navigation','navigationLibrary'].includes(m?.type))throw Error('Request not available to page scripts.');
      if(!['openLibrary','navigate'].includes(m.type))sender=await currentPageSender(chrome,sender,m.url);
    }
    if(m.type==='openReview'){
      const tab=sender.tab||await chrome.tabs.get(m.tabId);
      const target=reviewURL||readerSource({tab,frameId:0,url:tab.url},chrome)||pageKey(tab.url);
      if(!target.startsWith('file:')||!supportedPage(target))throw Error('Open a local Markdown or HTML document first.');
      await chrome.tabs.update(tab.id,{url:chrome.runtime.getURL('review.html')+'?url='+encodeURIComponent(target)});
      return {opened:true};
    }
    if(m.type==='navigation')return navigation.request(m,sender);
    if(m.type==='navigationLibrary')return repository({type:'library'});
    if(m.type==='gotoMark') {
      const mark=await repository({type:'getMark',url:m.url,name:m.name});
      if(/^[a-z]$/.test(m.name))return {mark};
      const tabs=await readingAPI.tabs.query({}),matches=await Promise.all(tabs.map(async tab=>{try{const c=await readingAPI.tabs.sendMessage(tab.id,{type:'context'});return c?.url===mark.url?tab:null;}catch{return null;}}));
      let target=matches.find(t=>t?.id===sender.tab?.id)||matches.find(Boolean);
      if(!target)target=await chrome.tabs.create({url:mark.url,active:true});else await chrome.tabs.update(target.id,{active:true});
      await chrome.windows.update(target.windowId,{focused:true});
      for(let i=0;i<50;i++){try{const answer=await readingAPI.tabs.sendMessage(target.id,{type:'restoreMark',url:mark.url,mark,name:m.name});if(answer?.restored)return {jumped:true};}catch{}await new Promise(r=>setTimeout(r,200));}
      throw Error('Opened the marked page. It is still loading; press the mark shortcut again to restore its position.');
    }
    if(m.type==='storageStatus'){const status=await storage.status();return {...status,agentAccess:!!(await chrome.storage.local.get('agent-access'))['agent-access']};}
    if(m.type==='agentAccess'){
      await chrome.storage.local.set({'agent-access':!!m.enabled});
      clearTimeout(reconnectTimer);
      if(m.enabled)await startAgentBridge();else await native('bridgeDisable');
      return {enabled:!!m.enabled};
    }
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
        const target=new URL(m.target);if(!supportedPage(target.href))throw Error('Enter an HTTP/HTTPS URL or a local Markdown or HTML file URL.');
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
