import {pageKey,supportedPage} from './core.js';
import {readerSource} from './review-background.js';

const changed=()=>Object.assign(Error('This action belongs to a different page. Choose it again on the current page.'),{code:'PAGE_CHANGED'});

// Chrome can retain the URL at which a content script was created after an
// in-document navigation. Never trust a replacement URL from the request alone:
// ask that exact content-script document and check Chrome's current tab as well.
export async function currentPageSender(api,sender,requestedURL){
  if(!sender.tab||sender.frameId!==0||!supportedPage(requestedURL))throw changed();
  const requested=pageKey(requestedURL);
  const reader=readerSource(sender,api);
  if(reader){
    if(reader!==requested||(await api.tabs.get(sender.tab.id)).url!==sender.url)throw changed();
    return {...sender,url:reader,tab:{...sender.tab,url:reader}};
  }
  // Older hosts without document identity can only use the original URL.
  if(!sender.documentId&&requested===pageKey(sender.url))return sender;
  if(!sender.documentId||new URL(requestedURL).origin!==new URL(sender.url).origin)throw changed();
  let identity,tab;
  try{
    [identity,tab]=await Promise.all([
      api.tabs.sendMessage(sender.tab.id,{type:'pageIdentity'},{documentId:sender.documentId,frameId:0}),
      api.tabs.get(sender.tab.id),
    ]);
  }catch{throw changed();}
  if(!identity?.url||!tab?.url||requested!==pageKey(identity.url)||requested!==pageKey(tab.url))throw changed();
  return {...sender,url:identity.url,tab:{...sender.tab,url:tab.url}};
}
