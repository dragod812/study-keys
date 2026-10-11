export async function request(message) {
  let result;
  try{result=await chrome.runtime.sendMessage(message);}catch {throw Error('Study Keys was updated or disconnected. Reload this page to reconnect.');}
  if(!result?.ok)throw Error(result?.error||'Could not save. Your draft is still here.');
  return result.value;
}
export function watch(callback) {
  chrome.runtime.onMessage.addListener(m=>{if(m?.type==='invalidate')callback();});
  window.addEventListener('focus',callback);
}
