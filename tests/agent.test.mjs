import test from 'node:test';
import assert from 'node:assert/strict';
import {createRepository} from '../src/repository.js';
import {hash,layerElements,patchDrawing} from '../src/agent-core.js';
const url='https://study.example/queues';
const memory=()=>{const data={};return {data,get:async k=>structuredClone(k==null?data:{[k]:data[k]}),set:async values=>Object.assign(data,structuredClone(values))};};
const source={url,title:'Queueing',text:'A queue holds work until capacity is available. Queues keep workers busy.'};source.contentHash=await hash(source.text);
const read=repo=>repo({type:'agentRead',url});
const request=async(repo,id='run-1',extra={})=>{const state=await read(repo);return {url,requestId:id,pageRevision:state.pageRevision,drawingRevision:state.drawingRevision,contentHash:source.contentHash,annotations:[{quote:'A queue holds work until capacity is available.',color:'yellow',note:'Separate waiting from execution.'}],layers:[{title:'1 · Core idea',body:'Queue work until workers are ready.'},{title:'3 · Mechanics',body:'Producers enqueue; available workers consume.',diagram:{nodes:[{id:'producer',label:'Producer'},{id:'queue',label:'Queue'},{id:'worker',label:'Worker'}],edges:[{from:'producer',to:'queue'},{from:'queue',to:'worker'}]}}],...extra};};
const apply=(repo,r,s=source)=>repo({type:'agentApply',url,requestId:r.requestId,request:r,source:s});
test('atomic study appends editable layers and exact highlights to the SAME notebook; retries survive restart',async()=>{
 const disk=memory();let repo=createRepository(disk,()=>100);
 await repo({type:'drawingSave',url,title:'My notes',base:null,scene:{type:'excalidraw',elements:[{id:'manual',type:'rectangle',x:10,y:20,width:50,height:70}],files:{},appState:{}}});
 const original=(await read(repo)).drawing.scene.elements[0],r=await request(repo),result=await apply(repo,r);
 const state=await read(repo);assert.equal(state.page.items.length,1);assert.equal(state.page.items[0].anchor.quote,r.annotations[0].quote);assert.deepEqual(state.drawing.scene.elements[0],original);assert.equal(state.drawing.scene.elements.filter(e=>e.type==='frame').length,2);assert.ok(state.drawing.scene.elements.some(e=>e.type==='arrow'));assert.equal(result.run.status,'applied');
 repo=createRepository(disk);assert.equal((await apply(repo,r)).replayed,true);assert.equal((await read(repo)).page.items.length,1);
 await assert.rejects(apply(repo,{...r,annotations:[]}),/different changes/);
});
test('bad passages, stale content/revisions and invalid drawing batches never partially save',async()=>{
 const disk=memory(),repo=createRepository(disk);const initial=JSON.stringify(disk.data);
 for(const extra of [{contentHash:'stale'},{annotations:[{quote:'Invented source',color:'yellow'}]},{drawingRevision:'stale'},{layers:[{title:'bad',body:'edge',diagram:{nodes:[{id:'one',label:'One'}],edges:[{from:'one',to:'missing'}]}}]},{drawingOperations:[{op:'add',element:{id:'bad',type:'rectangle',x:NaN}}]}]){
  await assert.rejects(apply(repo,await request(repo,'invalid',extra)));assert.equal(JSON.stringify(disk.data),initial);
 }
 const r=await request(repo);await repo({type:'save',url,item:{id:'human',note:'Manual note',color:'blue'},base:null});await assert.rejects(apply(repo,r),/Annotations changed/);assert.equal((await read(repo)).page.items.length,1);
});
test('undo is targeted, idempotent and refuses to overwrite later manual edits',async()=>{
 const disk=memory(),repo=createRepository(disk);await apply(repo,await request(repo));
 await repo({type:'save',url,item:{id:'unrelated',note:'Keep this',color:'green'},base:null});
 await repo({type:'agentUndo',url,requestId:'run-1'});let state=await read(repo);assert.deepEqual(state.page.items.map(i=>i.id),['unrelated']);assert.equal(state.drawing.scene.elements.length,0);
 await repo({type:'agentUndo',url,requestId:'run-1'});await apply(repo,await request(repo,'run-2'));
 const edited=(await read(repo)).page.items.find(i=>i.anchor);await repo({type:'save',url,item:{...edited,note:'Human correction'},base:edited.updatedAt});
 await assert.rejects(repo({type:'agentUndo',url,requestId:'run-2'}),/edited after/);assert.equal((await read(repo)).page.items.find(i=>i.anchor).note,'Human correction');
});
test('run receipts, annotations and diagrams round-trip in normal backups',async()=>{
 const repo=createRepository(memory());await apply(repo,await request(repo));const backup=await repo({type:'export'}),target=createRepository(memory());await target({type:'import',backup});
 assert.equal((await target({type:'agentRun',url,requestId:'run-1'})).status,'applied');assert.equal((await read(target)).page.items.length,1);assert.equal((await read(target)).drawing.scene.elements.filter(e=>e.type==='frame').length,2);
});
test('notebook saves with reordered JSON keys keep the revision; stale saves still retain recovery',async()=>{
 const disk=memory(),repo=createRepository(disk);
 const first=await repo({type:'drawingSave',url,base:null,scene:{type:'excalidraw',elements:[{id:'manual',type:'rectangle',x:10,y:20,width:50,height:70}],files:{},appState:{}}});
 const scene=(await read(repo)).drawing.scene;
 const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value;
 const next=await repo({type:'drawingSave',url,base:first.revision,scene:reorder(scene)});
 assert.equal(next.revision,first.revision);
 await assert.rejects(repo({type:'drawingSave',url,base:'stale',scene:reorder(scene)}),/recovery copy/);
 assert.equal(Object.keys(disk.data).filter(k=>k.startsWith('recovery:')).length,1);
});
test('layout contains wrapped text and diagrams inside separated frames, and patches preserve images',()=>{
 const layers=Array.from({length:5},(_,i)=>({title:`${i+1} · Layer`,body:'A long explanation about queues. '.repeat(40),diagram:{nodes:[{id:'a',label:'First stage'},{id:'b',label:'Second stage'},{id:'c',label:'Third stage'},{id:'d',label:'Fourth stage'}],edges:[{from:'a',to:'b'}]}}));
 const elements=layerElements(layers,[],'run',1),frames=elements.filter(e=>e.type==='frame');assert.equal(frames.length,5);
 for(const e of elements.filter(e=>e.frameId)){const f=frames.find(f=>f.id===e.frameId);assert.ok(e.y>=f.y&&e.y+e.height<=f.y+f.height,e.id);}
 for(let i=1;i<frames.length;i++)assert.ok(frames[i].y>frames[i-1].y+frames[i-1].height);
 const scene={type:'excalidraw',elements,files:{x:{dataURL:'data:image/png;base64,AA=='}},appState:{zoom:{value:1}}};assert.deepEqual(patchDrawing(scene,[{op:'update',id:frames[0].id,changes:{x:120}}],2).files,scene.files);
});
test('long diagram labels expand row spacing without overlapping the next row',()=>{
 const elements=layerElements([{title:'Long labels',body:'Mechanics',diagram:{nodes:Array.from({length:6},(_,i)=>({id:'n'+i,label:'A detailed explanation of this stage. '.repeat(4)}))}}],[],'layout',1);
 const shapes=elements.filter(e=>e.type==='rectangle');
 assert.ok(shapes[3].y>Math.max(...shapes.slice(0,3).map(e=>e.y+e.height)));
});
test('undo drawing patches preserves the original stacking order and accepts reordered object keys',async()=>{
 const disk=memory(),repo=createRepository(disk),original=[{id:'a',type:'rectangle',x:0,y:0,width:50,height:50},{id:'b',type:'rectangle',x:10,y:10,width:50,height:50}];
 await repo({type:'drawingSave',url,base:null,scene:{type:'excalidraw',elements:original,files:{},appState:{}}});
 await apply(repo,await request(repo,'patch-order',{annotations:[],layers:[],drawingOperations:[{op:'update',id:'a',changes:{x:100}}]}));
 const drawing=disk.data['drawing:'+url];drawing.scene.elements=drawing.scene.elements.map(e=>Object.fromEntries(Object.entries(e).reverse()));
 await repo({type:'agentUndo',url,requestId:'patch-order'});
 assert.deepEqual((await read(repo)).drawing.scene.elements,original);
});
