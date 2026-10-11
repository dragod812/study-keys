import React from 'react';
import {createRoot} from 'react-dom/client';
import {Excalidraw,MainMenu,serializeAsJSON,loadFromBlob} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import './editor.css';
import {cleanScene} from './notebook-core.js';
import {request} from './transport.js';
window.EXCALIDRAW_ASSET_PATH=new URL('./',import.meta.url).href;
const $=s=>document.querySelector(s),session=new URLSearchParams(location.search).get('session');
const root=createRoot($('#canvas'));
const rpc=(action,extra={})=>request({type:'notebookRequest',action,session,...extra});
let scene=null,revision=null,api=null,ready=false,dirty=false,conflict=false,downloaded=false,saved='',inflight=null,timer,port=null,version=0,lastStatus='Opening local canvas…',lastError=false,recoveries=[],filename='Study Keys notebook',saveLocation='this device';
function status(text,error=false){lastStatus=text;lastError=error;$('#message').textContent=error?text:'';$('#message').hidden=!error;port?.postMessage({type:'status',text,error});$('#retry').hidden=!error||conflict;$('#reload').hidden=!conflict;}
function snapshot(elements,appState,files){const data=JSON.parse(serializeAsJSON(elements,appState,files,'local'));data.appState={...data.appState,theme:appState.theme,scrollX:appState.scrollX,scrollY:appState.scrollY,zoom:appState.zoom};return data;}
function capture(){if(!api)return;changed(api.getSceneElementsIncludingDeleted(),api.getAppState(),api.getFiles());}
function changed(elements,appState,files){if(!ready)return;const next=snapshot(elements,appState,files),json=JSON.stringify(next);if(json===JSON.stringify(scene))return;scene=next;if(json===saved){dirty=!!inflight;return;}dirty=true;downloaded=false;if(conflict)return;status('Saving locally…');clearTimeout(timer);timer=setTimeout(flush,450);}
async function flush(){
 clearTimeout(timer);if(!ready)return false;if(inflight){await inflight;return dirty?flush():true;}
 if(conflict)return false;if(!dirty)return true;
 const json=JSON.stringify(scene),base=revision;
 inflight=(async()=>{try{const result=await rpc('drawingSave',{scene:JSON.parse(json),base});saveLocation=result.storage?.online?'~/.study-keys':'this device';revision=result.revision;saved=json;dirty=JSON.stringify(scene)!==saved;status(dirty?'Saving latest changes…':'Saved to '+saveLocation+' · ⌘/Ctrl Enter closes');return true;}catch(e){conflict=/another tab/.test(e.message);status(e.message,true);return false;}finally{inflight=null;}})();
 const ok=await inflight;if(ok&&dirty)return flush();return ok;
}
function download(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name+'.excalidraw';a.click();setTimeout(()=>URL.revokeObjectURL(href),30000);}
function exportFile(){capture();if(!scene)return;download(scene,filename);downloaded=true;status(dirty?'Draft exported. Your local save still needs attention.':'Exported .excalidraw copy · saved on this device',dirty);}
async function close(){document.activeElement?.blur();await new Promise(requestAnimationFrame);capture();if(!dirty&&!inflight){port?.postMessage({type:'close'});return;}if(await flush()){port?.postMessage({type:'close'});return;}if(downloaded){port?.postMessage({type:'close'});return;}status('Could not save. Retry, or export your drawing before closing. '+lastStatus,true);}
class Boundary extends React.Component {
 state={error:false};static getDerivedStateFromError(){return {error:true};}
 componentDidCatch(){ready=false;status('The editor could not render this scene. Export remains available; your saved drawing is unchanged.',true);}
 render(){return this.state.error?<p className="error-screen">The drawing could not open. Export a copy and reopen the notebook.</p>:this.props.children;}
}
function mount(imported=false){
 ready=false;api=null;root.render(<Boundary key={++version}><Excalidraw initialData={{...scene,scrollToContent:!scene?.appState?.zoom}} excalidrawAPI={value=>{api=value;requestAnimationFrame(()=>{
   scene=snapshot(api.getSceneElementsIncludingDeleted(),api.getAppState(),api.getFiles());ready=true;
   if(imported){dirty=true;flush();}else{saved=JSON.stringify(scene);dirty=false;status('Saved to '+saveLocation+' · ⌘/Ctrl Enter closes');}
 });}} onChange={changed} name={filename} autoFocus handleKeyboardGlobally validateEmbeddable={false} onLinkOpen={(element,event)=>event.preventDefault()} UIOptions={{canvasActions:{loadScene:false,export:false,saveAsImage:false}}}>
 <MainMenu><MainMenu.Item onSelect={exportFile}>Export .excalidraw file</MainMenu.Item><MainMenu.DefaultItems.ToggleTheme/><MainMenu.DefaultItems.ChangeCanvasBackground/><MainMenu.DefaultItems.Help/></MainMenu>
 </Excalidraw></Boundary>);
}
async function start(){try{
 const data=await rpc('drawingLoad');saveLocation=data.storage?.online?'~/.study-keys':'this device';revision=data.drawing?.revision||null;scene=data.drawing?.scene||{type:'excalidraw',version:2,source:'Study Keys',elements:[],appState:{viewBackgroundColor:'#fffefa'},files:{}};
 recoveries=data.recoveries||[];$('#recovery').hidden=!recoveries.length;filename=(data.drawing?.title||'Study Keys notebook').replace(/[/\\:*?"<>|]/g,'-').slice(0,130);
 $('#export').disabled=$('#import').disabled=$('#fit').disabled=false;mount();
 }catch(e){status(e.message,true);root.render(<p className="error-screen">Open this notebook using Study Keys on its webpage. Your saved drawings are unchanged.</p>);}
}
window.addEventListener('message',e=>{
 if(e.source!==parent||e.data?.type!=='study-keys-connect'||e.data.session!==session||!e.ports[0]||port)return;
 port=e.ports[0];port.onmessage=event=>{if(event.data?.command==='close')close();};port.start();port.postMessage({type:'ready'});port.postMessage({type:'status',text:lastStatus,error:lastError});
});
$('#fit').onclick=()=>api?.scrollToContent(api.getSceneElements(),{fitToViewport:true,viewportZoomFactor:.8,animate:false});
$('#export').onclick=exportFile;$('#retry').onclick=flush;
$('#window').onclick=()=>port?.postMessage({type:'focusWindow'});
$('#reload').onclick=()=>{if(dirty&&!downloaded){status('Export this draft before reopening the saved version.',true);return;}conflict=false;dirty=false;start();};
$('#recovery').onclick=()=>{for(const [i,r]of recoveries.entries())download(r.scene,filename+' recovery '+(i+1));};
$('#import').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
 if(file.size>20*1024*1024)throw Error('Choose an Excalidraw file smaller than 20 MB.');
 const parsed=cleanScene(JSON.parse(await file.text()));
 if(!(await flush()))throw Error('Save or export your current draft before importing.');
 // Keep a local downloadable copy before explicitly replacing a nonempty canvas.
 if(scene.elements.some(e=>!e.isDeleted))download(scene,filename+' before import');
 const restored=await loadFromBlob(new Blob([JSON.stringify(parsed)],{type:'application/json'}),null,null);
 scene=snapshot(restored.elements,restored.appState,restored.files||{});mount(true);
 }catch(e){status(e.message,true);}finally{e.target.value='';}};
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(e.shiftKey)port?.postMessage({type:'focusWindow'});else close();}},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)flush();});
window.addEventListener('beforeunload',e=>{if(dirty){flush();e.preventDefault();e.returnValue='';}});
start();
