// Visibility is per window. Panel ports restore it after a worker restart;
// browser events also cover the native close button and switching panels.
export function createSidePanelController(chrome) {
  const states=new Map(),ports=new Map(),pending=new Map();
  const supported=()=>!!(chrome.sidePanel?.open&&chrome.sidePanel?.close&&chrome.sidePanel?.onOpened&&chrome.sidePanel?.onClosed);
  const state=id=>states.get(id)||{open:false,editing:false,revision:0};
  const update=(id,patch)=>states.set(id,{...state(id),...patch,revision:state(id).revision+1});
  const ownPath=path=>path==='panel.html'||path===chrome.runtime.getURL('panel.html');
  chrome.sidePanel?.onOpened?.addListener(info=>{if(ownPath(info.path))update(info.windowId,{open:true});});
  chrome.sidePanel?.onClosed?.addListener(info=>{if(ownPath(info.path))update(info.windowId,{open:false,editing:false});});
  chrome.windows?.onRemoved?.addListener(id=>{states.delete(id);ports.delete(id);pending.delete(id);});
  chrome.runtime.onConnect?.addListener(port=>{
    if(port.sender?.id!==chrome.runtime.id||port.sender?.url!==chrome.runtime.getURL('panel.html'))return;
    const match=/^study-keys-panel:(\d+)$/.exec(port.name);if(!match)return;
    const id=Number(match[1]);ports.set(id,port);
    port.onMessage.addListener(m=>{
      if(ports.get(id)!==port||typeof m?.visible!=='boolean'||typeof m.editing!=='boolean')return;
      update(id,{open:m.visible,editing:m.editing});
    });
    port.onDisconnect.addListener(()=>{if(ports.get(id)===port){ports.delete(id);update(id,{open:false,editing:false});}});
  });
  function change(windowId,closeOnly=false){
    if(!Number.isInteger(windowId)||windowId<0)return Promise.reject(Error('A browser window is required.'));
    // Older browser hosts use the in-page drawer, without disabling panels in
    // other windows to emulate closing the current one.
    if(!supported())return Promise.resolve({fallback:true});
    if(pending.has(windowId))return pending.get(windowId);
    const before=state(windowId),closing=closeOnly||before.open;
    if(closing&&before.editing)return Promise.reject(Error('Save or discard your note before closing the sidebar.'));
    let result;
    // Call open during the user gesture, before any asynchronous lookup.
    try{result=chrome.sidePanel[closing?'close':'open']({windowId});}catch(error){result=Promise.reject(error);}
    const operation=Promise.resolve(result).then(()=>{
      if(state(windowId).revision===before.revision)update(windowId,{open:!closing});
      return {opened:!closing};
    }).finally(()=>{if(pending.get(windowId)===operation)pending.delete(windowId);});
    pending.set(windowId,operation);return operation;
  }
  return {toggle:windowId=>change(windowId),close:windowId=>change(windowId,true)};
}

export function sidebarShortcut({close,editable=()=>false,schedule=setTimeout,cancel=clearTimeout}){
  let prefix=false,timer;
  const reset=()=>{prefix=false;cancel(timer);};
  return e=>{
    if(e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||editable(e)){reset();return;}
    if(e.repeat)return;
    if(prefix){reset();if(e.key==='h'){e.preventDefault();e.stopImmediatePropagation();close();return;}}
    if(e.key===' '){e.preventDefault();e.stopImmediatePropagation();prefix=true;timer=schedule(reset,5000);}
  };
}
