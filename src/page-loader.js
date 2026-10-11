import {pageKey} from './core.js';

// Passive refreshes belong to the current route, never to the page we just left.
export function createPageLoader({request,href,enter,apply,report,schedule=setTimeout,cancel=clearTimeout}) {
  let generation=0,retry;
  return async function load(attempt=0) {
    cancel(retry);
    const ticket=++generation,url=pageKey(href());
    enter(url);
    const current=()=>ticket===generation&&url===pageKey(href());
    try {
      const data=await request({type:'page',url});
      if(current())apply(data);
    } catch(error) {
      if(!current())return;
      // Chrome's sender context may still be catching up with an SPA route.
      // Retry briefly; this routine refresh needs no user-facing warning.
      if(error.code==='PAGE_CHANGED') {
        if(attempt<2)retry=schedule(()=>{if(current())load(attempt+1);},250);
        return;
      }
      report(error);
    }
  };
}
