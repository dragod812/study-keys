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
  if(!['reviewLoad','reviewGrant','reviewProbe','reviewSave','reviewRevoke'].includes(message.action))throw Error('Unknown review action.');
  const tab=await api.tabs.get(sender.tab.id);
  if(tab.url!==sender.url)throw Error('This reader navigated. Open the review again.');
  return native(message.action,{url:source,state:message.state,expected:message.expected});
}
