// Install at document_start on Window, before site capture listeners. Claim a
// physical key for its entire down/press/up cycle, even if a command changes
// mode or focus. Keys left to the website stay with it until release.
export function keyboardBoundary(target,{onKey,ownsUI=()=>false,onUIKey=()=>{}}) {
  const held=new Map();
  const identity=e=>e.code||e.key?.toLowerCase();
  const stop=(e,prevent)=>{if(prevent)e.preventDefault();e.stopImmediatePropagation();};
  const down=e=>{
    if(!e.isTrusted)return;
    const id=identity(e),previous=e.repeat&&held.get(id);
    if(previous==='site')return;
    const ui=previous==='ui'||ownsUI(e);
    onKey(e);
    if(ui&&!e.defaultPrevented)onUIKey(e);
    const owner=previous==='study'||e.defaultPrevented?'study':ui?'ui':'site';
    held.set(id,owner);
    if(owner!=='site')stop(e,owner==='study');
  };
  const rest=e=>{
    if(!e.isTrusted)return;
    const id=identity(e),owner=held.get(id);
    if(e.type==='keyup')held.delete(id);
    if(owner==='study')stop(e,true);
    else if(owner==='ui'||(!owner&&ownsUI(e)))stop(e,false);
  };
  const reset=()=>held.clear();
  target.addEventListener('keydown',down,true);
  target.addEventListener('keypress',rest,true);
  target.addEventListener('keyup',rest,true);
  target.addEventListener('blur',reset);
  return ()=>{
    reset();target.removeEventListener('keydown',down,true);target.removeEventListener('keypress',rest,true);target.removeEventListener('keyup',rest,true);target.removeEventListener('blur',reset);
  };
}
