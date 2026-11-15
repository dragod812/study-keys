// Move the actual sender tab: no URL recreation, duplicate, or page reload.
export async function detachTab(api,sender){
 const id=sender.tab?.id;
 if(!Number.isInteger(id)||id<0)throw Error('Use this command from a webpage.');
 const tab=await api.tabs.get(id);
 if(!tab||tab.id!==id)throw Error('This tab is no longer available.');
 const window=await api.windows.create({tabId:id,type:'normal',focused:true,incognito:!!tab.incognito});
 return {done:true,windowId:window?.id};
}
