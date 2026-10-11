// Only the background worker imports this module. Websites and public notebook
// frames never receive the native port or a generic filesystem operation.
const HOST='com.studykeys.local';
export function nativeClient(runtime=chrome.runtime,onCommand=null,onLost=null) {
 let port=null,next=0;const pending=new Map();
 const disconnected=()=>{const why=runtime.lastError?.message||'Local helper disconnected';port=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Could not write ~/.study-keys. '+why+'. Your draft is still here. Reopen the extension or reinstall its local helper.'));}pending.clear();onLost?.();};
 function connect(){if(port)return;port=runtime.connectNative(HOST);port.onDisconnect.addListener(disconnected);port.onMessage.addListener(m=>{
  if(m.event==='agent'&&onCommand){const channel=port;Promise.resolve().then(()=>onCommand(m.command)).then(value=>channel.postMessage({op:'agentResult',id:m.id,value}),error=>channel.postMessage({op:'agentResult',id:m.id,error:error.message})).catch(()=>{});return;}
  const p=pending.get(m.id);if(!p)return;
  if(typeof m.chunk==='string')p.chunks.push(m.chunk);
  if(m.done){clearTimeout(p.timer);pending.delete(m.id);try{const bytes=Uint8Array.from(atob(p.chunks.join('')),c=>c.charCodeAt(0)),result=JSON.parse(new TextDecoder().decode(bytes));if(!result.ok)throw Error(result.error);p.resolve(result.value);}catch(e){p.reject(e);}}
 });}
 return (op,args={})=>new Promise((resolve,reject)=>{try{connect();const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('The local file save timed out. Reopen the page before retrying; the write may have finished.'));},30000);pending.set(id,{resolve,reject,timer,chunks:[]});port.postMessage({id,op,...args});}catch(e){reject(e);}});
}
export function createDiskStorage(cache,rpc=nativeClient()) {
 let boot=null,online=false,error='',readError='',folder='~/.study-keys';const versions=new Map();
 const supported=k=>/^(page:|drawing:|recovery:|marks:|agent-run:)/.test(k)||['settings','notebook-layout','global-marks','navigation'].includes(k);
 async function initialize(){
  if(!boot)boot=(async()=>{
   const data=await cache.get(null),values=Object.fromEntries(Object.entries(data).filter(([k])=>supported(k)));
   const marker=data['disk-library-v1'];
   const state=marker?await rpc('status'):await rpc('migrate',{values});folder=state.folder;online=true;error='';
   if(!marker)await cache.set({'disk-library-v1':{folder,migratedAt:Date.now()}});
  })().catch(e=>{boot=null;online=false;error=e.message;throw e;});
  return boot;
 }
 return {
  async get(key){try{await initialize();const data=await rpc('get',{key});for(const [k,v]of Object.entries(data.versions))versions.set(k,v);online=true;error='';readError='';return data.values;}catch(e){online=false;readError=error=e.message;boot=null;const data=await cache.get(key);return key==null?Object.fromEntries(Object.entries(data).filter(([k])=>supported(k))):data;}},
  async set(values){await initialize();const expected={};for(const key of Object.keys(values)){if(!versions.has(key)){const current=await rpc('get',{key});versions.set(key,current.versions[key]??null);}expected[key]=versions.get(key);}
   try{const result=await rpc('set',{values,expected});for(const [k,v]of Object.entries(result.versions))versions.set(k,v);await cache.set(values);online=true;error='';}catch(e){online=false;error=e.message;boot=null;throw Error('Not saved to ~/.study-keys: '+e.message);}},
  async status(){let details={};try{await initialize();details=await rpc('status');online=true;error='';}catch(e){online=false;error=e.message;}return {...details,folder,online:online&&!readError,error:readError||error};},
 };
}
