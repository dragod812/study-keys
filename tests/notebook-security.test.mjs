import test from 'node:test';
import assert from 'node:assert/strict';
function storage(){const data={};return {get:async k=>structuredClone(k==null?data:{[k]:data[k]}),set:async x=>Object.assign(data,structuredClone(x)),remove:async keys=>{for(const k of keys)delete data[k];},setAccessLevel:async()=>{}};}
test('embedded notebooks require a session for the correct tab and cannot access the library',async()=>{
 let listener,installed;const created=[];const own='chrome-extension://test-extension/';
 globalThis.chrome={storage:{local:storage(),session:storage(),onChanged:{addListener(){}}},runtime:{id:'test-extension',getURL:p=>own+p,onInstalled:{addListener:fn=>installed=fn},onMessage:{addListener:fn=>listener=fn}},tabs:{create:async x=>created.push(x),onRemoved:{addListener(){}}}};
 const disk={};
 chrome.runtime.connectNative=()=>{let receive;return {onMessage:{addListener:f=>receive=f},onDisconnect:{addListener(){}},postMessage:m=>queueMicrotask(()=>{let value={folder:'/test/.study-keys'};if(m.op==='migrate')Object.assign(disk,m.values);if(m.op==='get'){const values=m.key==null?{...disk}:{[m.key]:disk[m.key]??null};value={values,versions:Object.fromEntries(Object.keys(values).map(k=>[k,'v']))};}if(m.op==='set'){Object.assign(disk,m.values);value={versions:Object.fromEntries(Object.keys(m.values).map(k=>[k,'v']))};}receive({id:m.id,chunk:Buffer.from(JSON.stringify({ok:true,value})).toString('base64')});receive({id:m.id,done:true});})};};
 await import('../src/background.js?security-test');
 const call=(m,sender)=>new Promise(resolve=>listener(m,{id:'test-extension',...sender},resolve));
 installed({reason:'update'});assert.equal(created.length,0);
 installed({reason:'install'});assert.deepEqual(created,[{url:own+'setup.html'}]);
 assert.equal((await call({type:'storageStatus'},{url:own+'setup.html'})).ok,true);
 const parent={url:'https://example.com/article',tab:{id:1,windowId:1},frameId:0};
 // Passive reads receive a typed navigation race; writes still reject another page.
 for(const type of ['page','save']){const mismatch=await call({type,url:'https://other.example/'},parent);assert.equal(mismatch.ok,false);assert.equal(mismatch.code,'PAGE_CHANGED');}
 assert.equal((await call({type:'page',url:parent.url},parent)).value.items.length,0);
 let r=await call({type:'openNotebook',url:parent.url,title:'Article'},parent);assert.equal(r.ok,true);const session=r.value.session;
 const iframe={url:own+'notebook.html?session='+session,tab:{id:1},frameId:2};
 assert.equal((await call({type:'notebookRequest',action:'drawingLoad',session},iframe)).ok,true);
 assert.equal((await call({type:'notebookRequest',action:'drawingLoad',session},{...iframe,tab:{id:2}})).ok,false);
 assert.equal((await call({type:'library'},iframe)).ok,false);
 assert.equal((await call({type:'notebookRequest',action:'export',session},iframe)).ok,false);
 assert.equal((await call({type:'notebookRequest',action:'drawingLoad',session:'guessed'},iframe)).ok,false);
 assert.equal((await call({type:'drawingSave',url:parent.url,scene:{}},parent)).ok,false);
 assert.equal((await call({type:'openNotebook',url:'https://other.example'},parent)).ok,false);
 const scene={type:'excalidraw',elements:[],files:{},appState:{}};
 assert.equal((await call({type:'notebookRequest',action:'drawingSave',session,base:null,scene,url:'https://other.example'},iframe)).ok,true);

 for(const ext of ['md','html']){
 const local={url:'file:///notes/Queue.'+ext,tab:{id:5,windowId:1},frameId:0};
 assert.equal((await call({type:'page',url:local.url},local)).ok,true);
 assert.equal((await call({type:'page',url:'file:///notes/Other.md'},local)).code,'PAGE_CHANGED');
 const localSession=(await call({type:'openNotebook',url:local.url,title:'Local Markdown'},local)).value.session;
 const localFrame={url:own+'notebook.html?session='+localSession,tab:{id:5},frameId:2};
 assert.equal((await call({type:'notebookRequest',action:'drawingSave',session:localSession,scene,base:null},localFrame)).ok,true);
 assert.equal((await call({type:'notebookRequest',action:'drawingLoad',session:localSession},localFrame)).value.drawing.url,local.url);
 assert.equal((await call({type:'notebookRequest',action:'drawingLoad',session:localSession},{...localFrame,tab:{id:6}})).ok,false);
 assert.equal((await call({type:'page',url:'file:///etc/passwd'},{...local,url:'file:///etc/passwd'})).ok,false);
 }
 const saved=await call({type:'notebookRequest',action:'drawingLoad',session},iframe);assert.equal(saved.value.drawing.url,parent.url);
 // Marks reuse an open matching tab, prefer the sender when duplicates exist,
 // and reopen a closed page before restoring its position.
 const markPosition={x:0,y:500,pageX:0,pageY:500,pane:null,anchor:null,viewportY:0};
 assert.equal((await call({type:'setMark',url:parent.url,name:'A',title:'Article',position:markPosition},parent)).ok,true);
 const updates=[],restores=[];let tabs=[{id:1,windowId:1},{id:2,windowId:2}];
 chrome.tabs.query=async()=>tabs;
 chrome.tabs.sendMessage=async(id,m)=>{if(m.type==='context')return {url:id===1?parent.url:'https://other.example/'};restores.push({id,m});return {restored:true};};
 chrome.tabs.update=async(id,value)=>updates.push({id,value});
 chrome.windows={update:async(id,value)=>updates.push({window:id,value})};
 chrome.tabs.create=async value=>{updates.push({create:value});return {id:3,windowId:2};};
 const other={url:'https://other.example/',tab:{id:2,windowId:2},frameId:0};
 assert.equal((await call({type:'gotoMark',url:other.url,name:'A'},other)).value.jumped,true);
 assert.equal(restores[0].id,1);assert.equal(restores[0].m.mark.position.y,500);
 assert.deepEqual(updates[0],{id:1,value:{active:true}});
 tabs=[{id:2,windowId:2}];
 assert.equal((await call({type:'gotoMark',url:other.url,name:'A'},other)).value.jumped,true);
 assert.equal(restores[1].id,3);assert.ok(updates.some(x=>x.create?.url===parent.url));
 assert.equal((await call({type:'setMark',url:parent.url,name:'a',title:'Article',position:markPosition},other)).ok,false);
});
