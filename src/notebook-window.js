import {request} from './transport.js';
import {PLACEMENTS,cleanLayout,windowRect,snapPlacement} from './notebook-core.js';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,label,run)=>{const b=node('button',text);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.onclick=run;return b;};
export function notebookWindow({surface,getPage,say,clearMode}) {
 let shell=null,frame=null,port=null,session=null,layout=cleanLayout(),pinned=null,opening=false,connected=false,closed=false,layoutTimer,focusBefore;
 let position,status,maximize,move,ghost;
 const viewport=()=>[innerWidth,innerHeight];
 function apply(){if(!shell)return;const r=windowRect(layout,...viewport());Object.assign(shell.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});position.value=layout.placement;maximize.textContent=layout.placement==='max'?'❐':'□';maximize.setAttribute('aria-label',layout.placement==='max'?'Restore notebook size':'Maximize notebook');}
 function persist(){clearTimeout(layoutTimer);layoutTimer=setTimeout(()=>request({type:'notebookRequest',action:'drawingLayout',session,layout}).catch(e=>say(e.message)),180);}
 function setPlacement(p){layout.placement=p;apply();persist();}
 function destroy(){clearTimeout(layoutTimer);port?.close();port=null;shell?.remove();ghost?.remove();shell=frame=ghost=null;connected=false;closed=true;window.removeEventListener('resize',apply);if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});}
 function close(){if(connected)port.postMessage({command:'close'});else if(!opening)destroy();else say('The notebook is loading. Please wait before closing.');}
 function gesture(e,direction){
  if(e.button!==0)return;e.preventDefault();move.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);
  const handle=e.currentTarget,initial=windowRect(layout,...viewport()),start={x:e.clientX,y:e.clientY};let snap=null;
  layout={...initial,placement:'float'};apply();shell.classList.add('moving');
  const onMove=ev=>{let dx=ev.clientX-start.x,dy=ev.clientY-start.y;const r={...initial};
   if(direction==='move'){r.x+=dx;r.y+=dy;snap=snapPlacement(ev.clientX,ev.clientY,...viewport());ghost.hidden=!snap;if(snap){const g=windowRect({...layout,placement:snap},...viewport());Object.assign(ghost.style,{left:g.x+'px',top:g.y+'px',width:g.width+'px',height:g.height+'px'});}}
   else {if(direction.includes('e'))r.width+=dx;if(direction.includes('s'))r.height+=dy;if(direction.includes('w')){r.x+=dx;r.width-=dx;}if(direction.includes('n')){r.y+=dy;r.height-=dy;}const minW=Math.min(360,innerWidth-16),minH=Math.min(300,innerHeight-16);if(r.width<minW){r.width=minW;if(direction.includes('w'))r.x=initial.x+initial.width-minW;}if(r.height<minH){r.height=minH;if(direction.includes('n'))r.y=initial.y+initial.height-minH;}}
   layout={...r,placement:'float'};apply();
  };
  const finish=()=>{handle.removeEventListener('pointermove',onMove);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);shell?.classList.remove('moving');if(ghost)ghost.hidden=true;if(snap)layout.placement=snap;apply();persist();};
  handle.addEventListener('pointermove',onMove);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
 }
 async function open(){
  if(shell){if(pinned.url!==getPage().url)say('This notebook stays attached to '+pinned.title+'. Save and close it to open this page’s notebook.');frame.focus();return;}
  if(opening)return;opening=true;closed=false;clearMode();focusBefore=document.activeElement;pinned=getPage();
  try{
   const data=await request({type:'openNotebook',url:pinned.url,title:pinned.title});session=data.session;layout=cleanLayout(data.layout);
   shell=node('section',null,'notebook-window');shell.dataset.keyboardOwned='';shell.setAttribute('aria-label','Floating drawing notebook');
   const header=node('header',null,'notebook-titlebar'),identity=node('div',null,'notebook-identity');
   move=button('⠿','Move notebook: drag, arrow keys to move, Shift + arrows to resize',()=>{});move.className='notebook-move';move.onpointerdown=e=>gesture(e,'move');move.ondblclick=()=>setPlacement(layout.placement==='max'?'float':'max');
   move.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||e.metaKey||e.ctrlKey||e.altKey)return;e.preventDefault();const r=windowRect(layout,...viewport()),dx=e.key==='ArrowLeft'?-24:e.key==='ArrowRight'?24:0,dy=e.key==='ArrowUp'?-24:e.key==='ArrowDown'?24:0;layout={...r,placement:'float'};if(e.shiftKey){layout.width+=dx;layout.height+=dy;}else{layout.x+=dx;layout.y+=dy;}apply();persist();};
   identity.append(node('strong','Drawing notebook'),node('span',pinned.title||pinned.url));identity.title=pinned.url;identity.onpointerdown=e=>gesture(e,'move');identity.ondblclick=move.ondblclick;
   position=node('select');position.setAttribute('aria-label','Dock notebook');for(const [value,label]of PLACEMENTS){const o=node('option',label);o.value=value;position.append(o);}position.onchange=()=>setPlacement(position.value);
   maximize=button('□','Maximize notebook',()=>setPlacement(layout.placement==='max'?'float':'max'));
   header.append(move,identity,position,maximize,button('×','Save and close notebook · Cmd/Ctrl Enter',close));
   frame=node('iframe');frame.title='Excalidraw page notebook';frame.src=data.src;frame.setAttribute('allow','clipboard-read; clipboard-write');
   status=node('footer','Opening local canvas…','notebook-status');status.setAttribute('role','status');
   shell.append(header,frame,status);ghost=node('div',null,'notebook-snap');ghost.hidden=true;surface.append(ghost,shell);
   for(const direction of ['n','s','w','e','nw','ne','sw','se']){const handle=node('div',null,'notebook-resize '+direction);handle.setAttribute('aria-hidden','true');handle.onpointerdown=e=>gesture(e,direction);shell.append(handle);}
   frame.onload=()=>{if(closed)return;const channel=new MessageChannel();port=channel.port1;port.onmessage=e=>{if(e.data?.type==='status'){status.textContent=e.data.text;status.classList.toggle('error',!!e.data.error);}if(e.data?.type==='ready'){connected=true;opening=false;}if(e.data?.type==='close')destroy();if(e.data?.type==='focusWindow')move.focus();};port.start();frame.contentWindow.postMessage({type:'study-keys-connect',session},new URL(data.src).protocol+'//'+new URL(data.src).host,[channel.port2]);};
   window.addEventListener('resize',apply);apply();
   // A blocked iframe can be dismissed; no drawing editor exists to lose changes.
   setTimeout(()=>{if(shell&&!connected){opening=false;status.textContent='Canvas did not connect. Close and reopen to retry.';}},15000);
  }catch(e){opening=false;destroy();say(e.message);}
 }
 return {open};
}
