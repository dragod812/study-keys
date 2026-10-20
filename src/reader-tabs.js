import {readerSource} from './review-background.js';

// Extension-owned reader tabs share the original file's identity. Runtime
// messages reach extension documents; tabs.sendMessage reaches content scripts.
export function readerTabAPI(api){
  const normalize=tab=>{
    if(!tab)return tab;
    const url=readerSource({url:tab.url,frameId:0,tab},api);
    return url?{...tab,url,readerUrl:tab.url}:tab;
  };
  return {...api,tabs:{...api.tabs,
    get:async id=>normalize(await api.tabs.get(id)),
    query:async query=>(await api.tabs.query(query)).map(normalize),
    sendMessage:async(id,message,options)=>{
      const tab=await api.tabs.get(id);
      if(readerSource({url:tab.url,frameId:0,tab},api)){
        return api.runtime.sendMessage({type:'readerMessage',tabId:id,payload:message});
      }
      return api.tabs.sendMessage(id,message,options);
    },
  }};
}
