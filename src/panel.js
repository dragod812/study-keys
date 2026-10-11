import {COLORS,isLocalDocument} from './core.js';
import {request} from './transport.js';
import {sidebarShortcut} from './side-panel.js';
const $=s=>document.querySelector(s);
let context=null,page=null,lastSignature='',editing=false,filter='',polling=false;
let panelPort=null,panelWindowId=null,reconnectTimer;
const publishPanel=()=>{try{panelPort?.postMessage({visible:document.visibilityState==='visible',editing});}catch{}};
async function connectPanel(){
 try{
  panelWindowId=(await chrome.windows.getCurrent()).id;
  const port=chrome.runtime.connect({name:'study-keys-panel:'+panelWindowId});panelPort=port;publishPanel();
  port.onDisconnect.addListener(()=>{if(panelPort!==port)return;panelPort=null;clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connectPanel,500);});
 }catch{}
}
document.addEventListener('visibilitychange',publishPanel);connectPanel();
document.addEventListener('keydown',sidebarShortcut({
 editable:e=>!!e.target.closest?.('input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'),
 close:()=>request({type:'closePanel',windowId:panelWindowId}).catch(e=>status(e.message))
}),true);
function node(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,run,cls){const b=node('button',text,cls);b.type='button';b.onclick=run;return b;}
function status(text){$('#status').textContent=text;}
async function activeContext(){const tabs=await chrome.tabs.query({active:true,currentWindow:true});if(!tabs[0])throw Error('Open a webpage or local Markdown or HTML file.');const data=await chrome.tabs.sendMessage(tabs[0].id,{type:'context'});if(!data?.url)throw Error('Open a supported webpage.');return {...data,tabId:tabs[0].id};}
async function refresh(){
 if(polling||editing)return;polling=true;
 try{const next=await activeContext(),data=await request({type:'page',url:next.url}),sig=JSON.stringify([next,data]);context=next;page=data;
  if(sig!==lastSignature){lastSignature=sig;$('#page-title').textContent=next.title||next.url;$('#enabled').checked=data.enabled;$('#enabled-scope').textContent=isLocalDocument(next.url)?'Enable keyboard shortcuts for this local file':'Enable keyboard shortcuts on this site';$('#enabled').disabled=false;$('#add').disabled=false;status(data.storage?.online?'Saved in ~/.study-keys':data.storage?.error?'Local folder unavailable · cached copy':'');render();}
 }catch{context=page=null;lastSignature='';$('#page-title').textContent='This tab is not available to Study Keys.';$('#enabled').disabled=true;$('#add').disabled=true;$('#annotations').replaceChildren(node('p','Open a webpage or local Markdown or HTML file and reload it after updating. For local files, enable Allow access to file URLs in Study Keys’ Chrome extension details. Chrome pages, PDFs and embedded frames are not supported.','origin'));}
 finally{polling=false;}
}
function render(){
 const list=$('#annotations');list.replaceChildren();if(!page)return;
 const items=page.items.filter(i=>!i.archived&&[i.anchor?.quote,i.note].join(' ').toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>(a.anchor?.start??Infinity)-(b.anchor?.start??Infinity));
 if(!items.length){const empty=node('div',null,'empty');empty.append(node('h2','Make an idea your own'),node('p','Press v on the webpage, choose its start and end labels, then 1–6. Your highlights and notes appear here.'));list.append(empty);}
 for(const item of items){const color=COLORS.find(c=>c.id===item.color),card=node('article',null,'card');card.style.setProperty('--accent',color.hex);const meta=node('div',null,'meta');meta.append(node('span',color.label,'tag'));if(item.anchor&&!context.restored.includes(item.id))meta.append(node('span','Passage not found','warning'));card.append(meta);
  if(item.anchor){const b=button('',async()=>{try{const result=await chrome.tabs.sendMessage(context.tabId,{type:'jumpAnnotation',id:item.id});status(result.found?'Passage shown in the page.':'Expand the page’s collapsed content to help restore this passage. Your annotation is preserved.');}catch{status('The page changed. Reopen this annotation.');}},'quote-jump');b.setAttribute('aria-label','Jump to passage: '+item.anchor.quote.slice(0,100));b.append(node('blockquote',item.anchor.quote));card.append(b);}
  if(item.note)card.append(node('p',item.note,'note'));
  const actions=node('div',null,'actions');actions.append(button('Edit / add note',()=>edit(item,card)),button('Move to trash',async()=>{try{await request({type:'save',url:page.url,title:page.title,item:{...item,archived:true},base:item.updatedAt});lastSignature='';await refresh();status('Moved to trash. Restore it from All pages → Trash.');}catch(e){status(e.message);}}));card.append(actions);list.append(card);
 }
}
function edit(item,card=null){
 if(editing)return;editing=true;publishPanel();const currentPage=page,original=item||{id:crypto.randomUUID(),note:'',color:'yellow',anchor:null,archived:false},box=node('section',null,'editor');
 $('#add').disabled=true;$('#search').disabled=true;$('#enabled').disabled=true;
 box.append(node('h2',item?'Your annotation':'Page note'));if(original.anchor)box.append(node('blockquote',original.anchor.quote));
 const select=node('select');select.setAttribute('aria-label','Highlight color');for(const c of COLORS){const o=node('option',c.label);o.value=c.id;select.append(o);}select.value=original.color;
 const input=node('textarea');input.setAttribute('aria-label','Your note');input.placeholder='Leave a thought for your next visit.';input.value=original.note;input.maxLength=100000;
 const error=node('p',null,'error'),actions=node('div',null,'actions');let saving=false;
 const finish=async()=>{editing=false;publishPanel();$('#search').disabled=false;lastSignature='';await refresh();};
 const save=button('Save · ⌘/Ctrl ↵',async()=>{if(saving)return;saving=true;save.disabled=true;try{await request({type:'save',url:currentPage.url,title:currentPage.title,item:{...original,note:input.value,color:select.value},base:item?.updatedAt??null});await finish();status('Note saved on this device.');}catch(e){error.textContent=e.message;}finally{saving=false;save.disabled=false;}},'primary');
 actions.append(save,button('Discard draft',()=>{if(!saving)finish();}));box.append(node('label','Highlight color'),select,node('label','Your note'),input,error,actions);
 if(card)card.replaceWith(box);else $('#annotations').prepend(box);
 box.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();save.click();}});input.focus();
}
$('#search').oninput=e=>{filter=e.target.value;render();};$('#add').onclick=()=>edit();$('#library').onclick=()=>chrome.runtime.openOptionsPage();
$('#enabled').onchange=async e=>{if(!page)return;try{await request({type:'enabled',url:page.url,enabled:e.target.checked});lastSignature='';refresh();}catch(err){status(err.message);}};
chrome.storage.onChanged.addListener(()=>refresh());chrome.tabs.onActivated.addListener(()=>refresh());
setInterval(refresh,1200);refresh();

$('#drawing').onclick=async()=>{try{const c=await activeContext();await chrome.tabs.sendMessage(c.tabId,{type:'openNotebook'});}catch{status('Reload this page to open its notebook.');}};
