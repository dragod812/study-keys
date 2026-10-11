// Development harness only. Never included in dist or the Chrome package.
export async function request(message){
 if(message.type==='openLibrary'){window.open('/library.html','_blank');return {};}
 if(message.type==='gotoMark'){const mark=await request({type:'getMark',url:message.url,name:message.name});if(mark.url!==location.href.split('#')[0]&&mark.url!==location.href)throw Error('Cross-tab marks are tested in the installed Chrome extension.');return {mark};}
 if(message.type==='navigate'){
  if(message.action==='open'){message.newTab?window.open(message.target,'_blank'):location.assign(message.target);return {};}
  if(message.action==='back')history.back();else if(message.action==='forward')history.forward();else throw Error('Browser tab switching is available only in the installed Chrome extension.');return {};
 }
 const r=await fetch('/test-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(message)}),data=await r.json();if(!data.ok)throw Object.assign(Error(data.error),{code:data.code});return data.value;
}
export function watch(callback){window.addEventListener('focus',callback);}
