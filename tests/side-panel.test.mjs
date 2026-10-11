import test from 'node:test';
import assert from 'node:assert/strict';
import {createSidePanelController,sidebarShortcut} from '../src/side-panel.js';
const event=()=>{const listeners=[];return {addListener:f=>listeners.push(f),emit:(...args)=>listeners.forEach(f=>f(...args))};};
function harness(){
 const calls=[],chrome={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onConnect:event()},windows:{onRemoved:event()},sidePanel:{onOpened:event(),onClosed:event(),open:args=>{calls.push(['open',args]);return Promise.resolve();},close:args=>{calls.push(['close',args]);return Promise.resolve();}}};
 const controller=createSidePanelController(chrome);
 const port=(id,sender={id:'test',url:chrome.runtime.getURL('panel.html')})=>{const p={name:'study-keys-panel:'+id,sender,onMessage:event(),onDisconnect:event()};chrome.runtime.onConnect.emit(p);return p;};
 return {chrome,controller,calls,port};
}
test('Space h alternates the native panel, without awaiting a lookup before opening',async()=>{
 const {controller,calls}=harness();const opening=controller.toggle(7);
 assert.deepEqual(calls,[['open',{windowId:7}]]);
 assert.deepEqual(await opening,{opened:true});
 assert.deepEqual(await controller.toggle(7),{opened:false});
 assert.deepEqual(await controller.toggle(7),{opened:true});
 assert.deepEqual(calls.map(c=>c[0]),['open','close','open']);
});
test('native close, toolbar opens and separate windows stay in sync',async()=>{
 const {chrome,controller,calls}=harness();
 chrome.sidePanel.onOpened.emit({windowId:1,path:'panel.html'});
 await controller.toggle(1);await controller.toggle(2);
 chrome.sidePanel.onClosed.emit({windowId:2,path:'panel.html'});
 await controller.toggle(2);
 assert.deepEqual(calls,[['close',{windowId:1}],['open',{windowId:2}],['open',{windowId:2}]]);
});
test('a live panel restores worker state and stale ports cannot clear a newer panel',async()=>{
 const {controller,port,calls}=harness();const old=port(1),current=port(1);
 current.onMessage.emit({visible:true,editing:false});old.onDisconnect.emit();old.onMessage.emit({visible:false,editing:false});
 await controller.toggle(1);assert.equal(calls[0][0],'close');
 current.onDisconnect.emit();await controller.toggle(1);assert.equal(calls[1][0],'open');
});
test('other extension pages and website frames cannot forge panel visibility',async()=>{
 const {controller,port,calls}=harness();
 for(const sender of [{id:'test',url:'https://example.org/'},{id:'other',url:'chrome-extension://test/panel.html'},{id:'test',url:'chrome-extension://test/notebook.html'}])port(1,sender).onMessage.emit({visible:true,editing:false});
 await controller.toggle(1);assert.equal(calls[0][0],'open');
});
test('an editing note is protected; save/discard makes the next toggle close',async()=>{
 const {controller,port,calls}=harness(),p=port(1);
 p.onMessage.emit({visible:true,editing:true});
 await assert.rejects(controller.toggle(1),/Save or discard/);assert.equal(calls.length,0);
 p.onMessage.emit({visible:true,editing:false});await controller.toggle(1);assert.equal(calls[0][0],'close');
});
test('rapid presses coalesce, failures remain retryable, native close wins over a pending open',async()=>{
 const {chrome,controller,calls}=harness();let finish;
 chrome.sidePanel.open=()=>new Promise(resolve=>finish=resolve);
 const first=controller.toggle(1);assert.equal(controller.toggle(1),first);
 chrome.sidePanel.onOpened.emit({windowId:1,path:'panel.html'});
 chrome.sidePanel.onClosed.emit({windowId:1,path:'panel.html'});finish();await first;
 chrome.sidePanel.open=()=>Promise.reject(Error('Unavailable'));
 await assert.rejects(controller.toggle(1),/Unavailable/);
 chrome.sidePanel.open=args=>{calls.push(['open',args]);return Promise.resolve();};
 await controller.toggle(1);assert.equal(calls[0][0],'open');
 chrome.sidePanel.close=()=>Promise.reject(Error('Close failed'));
 await assert.rejects(controller.toggle(1),/Close failed/);
 chrome.sidePanel.close=args=>{calls.push(['close',args]);return Promise.resolve();};
 await controller.toggle(1);assert.equal(calls[1][0],'close');
});
test('older hosts choose the in-page toggle without globally disabling native panels',async()=>{
 const {chrome,controller,calls}=harness();delete chrome.sidePanel.close;
 assert.deepEqual(await controller.toggle(1),{fallback:true});assert.deepEqual(calls,[]);
 await assert.rejects(controller.toggle(-1),/browser window/);
});
test('panel Space h closes only outside text entry, modifiers, composition and expired prefixes',()=>{
 let closed=0,expire;const key=sidebarShortcut({close:()=>closed++,editable:e=>e.editable,schedule:f=>expire=f,cancel:()=>{}});
 const press=(k,other={})=>{const e={key:k,...other,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){}};key(e);return e;};
 assert.equal(press(' ').defaultPrevented,true);press('h');assert.equal(closed,1);
 press(' ',{editable:true});press('h',{editable:true});assert.equal(closed,1);
 press(' ');press('Escape');press('h');assert.equal(closed,1);
 press(' ');expire();press('h');assert.equal(closed,1);
 press(' ');press('h',{ctrlKey:true});assert.equal(closed,1);
 press(' ',{isComposing:true});press('h');assert.equal(closed,1);
 press(' ');press('h',{repeat:true});press('h');assert.equal(closed,2);
});
