import {supportedPage,pageKey} from './core.js';

export async function resolveReaderSender(api,sender){
  const page=sender.url?.split(/[?#]/)[0],
    isReader=page===api.runtime.getURL('review.html'),
    isNotebook=page===api.runtime.getURL('notebook.html');
  if((!isReader&&!isNotebook)||sender.tab)return sender;
  if(!sender.documentId||!api.runtime.getContexts)return sender;
  const contexts=await api.runtime.getContexts({documentIds:[sender.documentId],contextTypes:['TAB']});
  const context=contexts.find(c=>(isReader?c.frameId===0:c.frameId>0)&&c.tabId>=0&&c.documentUrl===sender.url);
  if(!context)return sender;
  const tab=await api.tabs.get(context.tabId);
  // A notebook embedded in our reader can also lack sender.tab. Bind it using
  // Chrome's document identity; the background still checks its opaque session.
  const matches=isReader?tab.url===sender.url:!!readerSource({url:tab.url,frameId:0,tab},api);
  return matches?{...sender,tab,frameId:context.frameId}:sender;
}
export function readerSource(sender,api) {
  if(!api.runtime?.getURL)return null;
  if(sender.frameId!==0||!sender.tab||!sender.url)return null;
  const u=new URL(sender.url);
  if(u.protocol+'//'+u.host+u.pathname!==api.runtime.getURL('review.html'))return null;
  const source=u.searchParams.get('url');
  return source?.startsWith('file:')&&supportedPage(source)?pageKey(source):null;
}
export async function reviewRequest(api,native,message,sender){
  const source=readerSource(sender,api);
  if(!source||message.url!==source)throw Error('Review actions belong to the document opened in the reader.');
  if(!['reviewLoad','reviewGrant','reviewProbe','reviewSave','reviewRevoke','reviewStage','reviewAsset'].includes(message.action))throw Error('Unknown review action.');
  const tab=await api.tabs.get(sender.tab.id);
  if(tab.url!==sender.url)throw Error('This reader navigated. Open the review again.');
  const value=await native(message.action,{url:source,state:message.state,expected:message.expected,
    ref:message.ref,side:message.side,offset:message.offset});
  if(message.action==='reviewAsset'&&value.remote)return remoteImage(value.remote);
  return value;
}

// Only the companion can approve a URL referenced by the granted document.
// Image requests contain no cookies, authorization headers or referrer.
export async function remoteImage(url){
  const u=new URL(url);
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid image URL.');
  const response=await fetch(u,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Image could not be loaded ('+response.status+').');
  const mime=response.headers.get('content-type')?.split(';')[0];
  if(!['image/png','image/jpeg','image/gif','image/webp','image/svg+xml','image/avif'].includes(mime))throw Error('Unsupported image format.');
  const reader=response.body.getReader(),parts=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;
    if(total>8*1024*1024)throw Error('This image exceeds 8 MiB.');parts.push(value);}}
  finally{await reader.cancel();}
  const bytes=new Uint8Array(total);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  return {data:'data:'+mime+';base64,'+btoa(binary),hash};
}
