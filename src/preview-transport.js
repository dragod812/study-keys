import {createNavigationService} from './navigation-background.js';
import {capture,passages,restoreReading} from './navigation-dom.js';
// Development harness only. Never included in dist or the Chrome package.
const sessionData={};
const previewTab=()=>({id:1,windowId:1,index:0,groupId:-1,url:location.href,title:document.title,highlighted:true});
const previewNavigation=createNavigationService({storage:{session:{get:async k=>({[k]:sessionData[k]}),set:async x=>Object.assign(sessionData,x)}},
 tabs:{query:async()=>[previewTab()],get:async()=>previewTab(),sendMessage:async(id,m)=>m.action==='capture'?capture():m.action==='search'?{entries:passages(m.query)}:restoreReading(m.location),update:async()=>previewTab()},
 windows:{update:async()=>{}}}, {get:async key=>request({type:'previewNavigationGet',key}),set:async values=>request({type:'previewNavigationSet',values})});
export async function request(message){
 if(message.type==='navigation')return previewNavigation.request(message,{tab:previewTab(),url:location.href});
 if(message.type==='navigationLibrary')message={type:'library'};
 if(message.type==='openLibrary'){window.open('/library.html','_blank');return {};}
 if(message.type==='gotoMark'){const mark=await request({type:'getMark',url:message.url,name:message.name});if(mark.url!==location.href.split('#')[0]&&mark.url!==location.href)throw Error('Cross-tab marks are tested in the installed Chrome extension.');return {mark};}
 if(message.type==='navigate'){
  if(message.action==='open'){message.newTab?window.open(message.target,'_blank'):location.assign(message.target);return {};}
  if(message.action==='back')history.back();else if(message.action==='forward')history.forward();else throw Error('Browser tab switching is available only in the installed Chrome extension.');return {};
 }
 const r=await fetch('/test-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(message)}),data=await r.json();if(!data.ok)throw Object.assign(Error(data.error),{code:data.code});return data.value;
}
export function watch(callback){window.addEventListener('focus',callback);}
export const connected=()=>true,onDisconnect=()=>()=>{};
