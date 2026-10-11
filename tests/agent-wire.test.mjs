// Real MCP stdio -> private Unix socket -> Chrome native framing -> the shared
// extension service/repository -> real atomic folder store. Browser DOM alone is
// a fixture; installed-browser rendering is checked separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {nativeClient,createDiskStorage} from '../src/disk-storage.js';
import {createRepository} from '../src/repository.js';
import {createAgentService} from '../src/agent-background.js';
import {hash} from '../src/agent-core.js';

test('MCP client persists a full study in the existing notebook over both real process transports', {timeout:25000},async t=>{
 const root=await mkdtemp('/tmp/study-keys-mcp-'),children=[];
 t.after(async()=>{for(const p of children)p.kill();await rm(root,{recursive:true,force:true});});
 const host=spawn('python3',['native/host.py','--root',root],{stdio:['pipe','pipe','pipe']});children.push(host);let errors='';host.stderr.on('data',d=>errors+=d);
 let incoming=Buffer.alloc(0),receive;
 host.stdout.on('data',d=>{incoming=Buffer.concat([incoming,d]);while(incoming.length>=4){const n=incoming.readUInt32LE(0);if(incoming.length<n+4)break;const m=JSON.parse(incoming.subarray(4,n+4));incoming=incoming.subarray(n+4);receive?.(m);}});
 const runtime={connectNative:()=>({onMessage:{addListener:f=>receive=f},onDisconnect:{addListener:()=>{}},postMessage:m=>{const payload=Buffer.from(JSON.stringify(m)),header=Buffer.alloc(4);header.writeUInt32LE(payload.length);host.stdin.write(Buffer.concat([header,payload]));}})};
 let service;const rpc=nativeClient(runtime,m=>service(m)),cacheData={};
 const cache={get:async k=>structuredClone(k==null?cacheData:{[k]:cacheData[k]}),set:async v=>Object.assign(cacheData,structuredClone(v))},storage=createDiskStorage(cache,rpc),repo=createRepository(storage);
 const url='https://study-keys.test/queue',text='A queue holds work until a worker has capacity. Separate waiting from execution. Overloaded producers can cause long waits.';
 const source={url,title:'Queueing laboratory',text,contentHash:await hash(text),blocks:[],coverage:{truncated:false}};
 let refreshes=0;
 const browser={runtime:{onConnect:{addListener:()=>{}},getManifest:()=>({version:'1.6.0'})},tabs:{query:async()=>[{id:7,url,active:true}],sendMessage:async(id,m)=>{
  assert.equal(id,7);if(m.type==='context')return {url};if(m.action==='read')return {ok:true,value:source};if(m.action==='notebookState')return {ok:true,value:{open:false}};if(m.action==='refresh'){refreshes++;return {ok:true,value:{restored:['highlight']}};}throw Error('Unexpected browser request');
 }}};
 service=createAgentService(browser,repo,storage);
 await repo({type:'save',url,title:'Queueing laboratory',base:null,item:{id:'manual-note',color:'blue',note:'Keep my original thought'}});
 const manual={id:'manual-shape',type:'rectangle',x:40,y:30,width:100,height:80};
 await repo({type:'drawingSave',url,title:'Queueing laboratory',base:null,scene:{type:'excalidraw',version:2,elements:[manual],appState:{},files:{}}});
 await rpc('bridgeEnable');
 function client(){const p=spawn('python3',['native/mcp_server.py','--root',root],{stdio:['pipe','pipe','pipe']});children.push(p);let n=0;const pending=new Map();createInterface({input:p.stdout}).on('line',line=>{const r=JSON.parse(line);const wait=pending.get(r.id);if(wait){pending.delete(r.id);r.error?wait.reject(Error(r.error.message)):wait.resolve(r.result);}});return {p,call:(method,params={})=>new Promise((resolve,reject)=>{const id=++n;pending.set(id,{resolve,reject});p.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');})};}
 let agent=client();await agent.call('initialize',{protocolVersion:'2025-11-25'});
 const call=async(name,args={})=>{const r=await agent.call('tools/call',{name,arguments:args});if(r.isError)throw Error(r.content[0].text);return r.structuredContent;};
 assert.equal((await call('status')).browsers.length,1);
 const before=await call('read_page',{url});assert.equal(before.page.items[0].id,'manual-note');
 const request={url,requestId:'wire-learning',pageRevision:before.pageRevision,drawingRevision:before.drawingRevision,contentHash:before.source.contentHash,annotations:[{quote:'A queue holds work until a worker has capacity.',color:'yellow',note:'The core idea.'},{quote:'Overloaded producers can cause long waits.',color:'orange',note:'A queue is not extra processing capacity.'},{note:'Worked example: if three jobs arrive and two workers are free, one waits.',color:'green'}],layers:[{title:'1 · Core idea',body:'Hold work until a worker is ready.'},{title:'2 · Intuition',body:'Think of a waiting line feeding available workers.'},{title:'3 · Mechanics',body:'Producers enqueue work; workers take queued jobs.',diagram:{nodes:[{id:'producer',label:'Producer'},{id:'queue',label:'Queue'},{id:'worker',label:'Worker'}],edges:[{from:'producer',to:'queue'},{from:'queue',to:'worker'}]}},{title:'4 · Deep detail',body:'More queued work does not create processing capacity. Too much incoming work increases waiting.'},{title:'5 · Worked example',body:'Illustrative assumption: three jobs arrive and two workers are available. Two start; one waits.'}]};
 const committed=await call('apply_study_changes',request);assert.equal(committed.run.status,'applied');assert.equal(refreshes,1);
 const saved=await call('get_notebook',{url});assert.equal(saved.page.items.length,4);assert.deepEqual(saved.drawing.scene.elements[0],manual);assert.equal(saved.drawing.scene.elements.filter(e=>e.type==='frame').length,5);
 agent.p.kill();agent=client();await agent.call('initialize',{protocolVersion:'2025-11-25'});assert.equal((await call('apply_study_changes',request)).replayed,true);
 const folders=await readdir(root+'/pages/study-keys.test'),folder=root+'/pages/study-keys.test/'+folders[0];
 assert.match(await readFile(folder+'/notes.md','utf8'),/Keep my original thought/);assert.match(await readFile(folder+'/drawing.excalidraw','utf8'),/Worked example/);assert.equal(JSON.parse(await readFile(folder+'/agent-runs/wire-learning.json','utf8')).status,'applied');
 await call('undo_study_run',{url,requestId:'wire-learning'});const undone=await call('get_page',{url});assert.equal(undone.page.items.length,1);assert.deepEqual(undone.drawing.scene.elements,[manual]);
 assert.equal(errors,'');
});
