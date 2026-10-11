// A content script survives an extension update, but its runtime connection
// does not. Detect that state without reloading a page or losing site drafts.
export function createRuntimeConnection(runtime) {
  let disconnected=false;
  const listeners=new Set();
  const disconnect=()=>{if(!disconnected){disconnected=true;for(const fn of listeners)fn();}};
  const connected=()=>{
    try {if(!runtime()?.id)disconnect();}catch {disconnect();}
    return !disconnected;
  };
  const failure=()=>Object.assign(Error('Study Keys was updated or disconnected. Reload this page to reconnect.'),{code:'EXTENSION_DISCONNECTED'});
  return {
    connected,
    subscribe(fn){const live=connected();listeners.add(fn);if(!live)fn();return ()=>listeners.delete(fn);},
    async request(message){
      if(!connected())throw failure();
      let result;
      try {result=await runtime().sendMessage(message);}
      catch(error){
        if(!connected()||/extension context invalidated/i.test(error?.message||'')){disconnect();throw failure();}
        // A transient worker error must not permanently disable a healthy tab.
        throw Error('Study Keys could not connect. Please try again.');
      }
      if(!result?.ok)throw Object.assign(Error(result?.error||'Could not save. Your draft is still here.'),{code:result?.code});
      return result.value;
    },
  };
}
