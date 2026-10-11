import test from 'node:test';
import assert from 'node:assert/strict';
import {PLACEMENTS,windowRect,snapPlacement,cleanScene} from '../src/notebook-core.js';
import {createRepository} from '../src/repository.js';
const url='https://notebook.example/article';
const scene=(text='A drawing')=>({type:'excalidraw',version:2,elements:[{id:'x',type:'text',text,x:1,y:2}],appState:{zoom:{value:1},scrollX:40,scrollY:20},files:{}});
const storage=()=>{const data={};return {data,get:async k=>structuredClone(k==null?data:{[k]:data[k]}),set:async v=>Object.assign(data,structuredClone(v))};};
test('every dock, corner and floating rectangle stays inside narrow and desktop viewports',()=>{
 for(const [w,h]of [[1440,900],[480,820],[320,240],[2200,1200]])for(const [placement]of PLACEMENTS){const r=windowRect({placement,x:9999,y:9999,width:9999,height:9999},w,h);assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=w&&r.y+r.height<=h,placement);}
 assert.equal(snapPlacement(1,1,1000,800),'top-left');assert.equal(snapPlacement(999,799,1000,800),'bottom-right');assert.equal(snapPlacement(500,400,1000,800),null);
});
test('drawing, image bytes, viewport and layout survive close and worker restart, scoped to URL',async()=>{
 const disk=storage();let repo=createRepository(disk);const data=scene();data.files={img:{id:'img',dataURL:'data:image/png;base64,AAAA',mimeType:'image/png'}};
 const saved=await repo({type:'drawingSave',url,scene:data,base:null,title:'Article'});
 await repo({type:'drawingLayout',layout:{placement:'bottom-right',width:550,height:400}});repo=createRepository(disk);
 const restored=await repo({type:'drawingLoad',url});assert.deepEqual(restored.drawing.scene,data);assert.equal(restored.drawing.revision,saved.revision);assert.equal(restored.layout.placement,'bottom-right');assert.equal((await repo({type:'drawingLoad',url:url+'/other'})).drawing,null);
});
test('concurrent drawing editors never overwrite a newer scene and keep recovery drafts',async()=>{
 const repo=createRepository(storage(),()=>100);const a=await repo({type:'drawingSave',url,scene:scene('first'),base:null,title:'Test'});
 const b=await repo({type:'drawingSave',url,scene:scene('newest'),base:a.revision,title:'Test'});
 await assert.rejects(repo({type:'drawingSave',url,scene:scene('stale draft'),base:a.revision,recoveryId:'draft-1',title:'Test'}),/another tab/);
 const data=await repo({type:'drawingLoad',url});assert.equal(data.drawing.revision,b.revision);assert.equal(data.drawing.scene.elements[0].text,'newest');assert.equal(data.recoveries[0].scene.elements[0].text,'stale draft');
});
test('current backup round trips notebooks and recovery copies; old note backups preserve drawings',async()=>{
 const repo=createRepository(storage(),()=>100);await repo({type:'drawingSave',url,scene:scene(),base:null,title:'Test'});
 await assert.rejects(repo({type:'drawingSave',url,scene:scene('recovery'),base:null,title:'Test'}));
 const backup=await repo({type:'export'}),target=createRepository(storage(),()=>200);assert.equal(backup.version,3);
 assert.equal((await target({type:'import',backup})).importedDrawings,1);
 let loaded=await target({type:'drawingLoad',url});assert.deepEqual(loaded.drawing.scene,scene());assert.equal(loaded.recoveries.length,1);await target({type:'import',backup});assert.equal((await target({type:'drawingLoad',url})).recoveries.length,1);
 await target({type:'import',backup:{format:'study-keys',version:1,pages:[]}});assert.ok((await target({type:'drawingLoad',url})).drawing);
 const revision=loaded.drawing.revision;await target({type:'drawingSave',url,scene:scene('newer'),base:revision,title:'Test'});await target({type:'import',backup});assert.equal((await target({type:'drawingLoad',url})).drawing.scene.elements[0].text,'newer');
});
test('remote scene assets and malformed drawing backups fail before any writes',async()=>{
 assert.throws(()=>cleanScene({...scene(),files:{x:{dataURL:'https://example.com/tracker.png'}}}),/embedded/);
 const disk=storage(),repo=createRepository(disk);
 await assert.rejects(repo({type:'import',backup:{format:'study-keys',version:2,pages:[],drawings:[{url,title:'x',updatedAt:1,revision:'x',scene:scene()},{url,title:'bad',scene:{}}],recoveries:[]}}));assert.deepEqual(disk.data,{});
});
test('quota failures preserve the last saved drawing and report failure',async()=>{
 const disk=storage(),repo=createRepository(disk);const saved=await repo({type:'drawingSave',url,scene:scene('safe'),base:null,title:'Test'});disk.set=async()=>{throw Error('Quota exceeded');};
 await assert.rejects(repo({type:'drawingSave',url,scene:scene('draft'),base:saved.revision}),/Quota/);assert.equal((await repo({type:'drawingLoad',url})).drawing.scene.elements[0].text,'safe');
});
