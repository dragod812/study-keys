import {createRuntimeConnection} from './runtime-connection.js';
const connection=createRuntimeConnection(()=>chrome.runtime);
export const request=connection.request,connected=connection.connected,onDisconnect=connection.subscribe;
export function watch(callback) {
  chrome.runtime.onMessage.addListener(m=>{if(m?.type==='invalidate')callback();});
  window.addEventListener('focus',callback);
}
