import test from 'node:test';
import assert from 'node:assert/strict';
import {hintCodes,keyOf,pageKey,makeAnchor,resolveAnchor,validateBackup,highlightSegments} from '../src/core.js';
import {createRepository} from '../src/repository.js';
import {placeWordLabels} from '../src/label-layout.js';
const url='https://example.com/docs';
function storage(){const data={};return {data,get:async k=>structuredClone(k==null?data:{[k]:data[k]}),set:async v=>Object.assign(data,structuredClone(v))};}
function item(id='one',note='A thought'){return {id,note,color:'yellow',anchor:null,updatedAt:0};}
const backup=pages=>({format:'study-keys',version:1,pages});
test('word and link codes remain unique and prefix-free at every length transition',()=>{
 for(const n of [0,1,23,24,25,529,576,1000,1800]){const codes=hintCodes(n);assert.equal(new Set(codes).size,n);assert.ok(codes.every(c=>codes.every(other=>c===other||!other.startsWith(c))));}
});
test('preserves browser shortcuts, IME and case',()=>{
 for(const extra of [{metaKey:true},{altKey:true},{isComposing:true},{key:'Dead'},{key:'Process'}])assert.equal(keyOf({key:'v',...extra}),null);
 assert.equal(keyOf({key:'G'}),'G');assert.equal(keyOf({key:'d',ctrlKey:true}),'Ctrl-d');assert.equal(keyOf({key:' '}),'Space');
});
test('URL identities retain meaningful queries and SPA routes, remove tracking and anchors',()=>{
 assert.equal(pageKey('https://example.com/docs?b=2&utm_source=x&a=1#section'),'https://example.com/docs?a=1&b=2');
 assert.notEqual(pageKey(url+'?page=1'),pageKey(url+'?page=2'));
 assert.notEqual(pageKey(url+'#/one'),pageKey(url+'#/two'));
 assert.equal(pageKey('https://user:pass@example.com/docs'),url);
 assert.throws(()=>pageKey('javascript:alert(1)'));
});
test('restores a passage after content is inserted and inline formatting changes',()=>{
 const text='Before this paragraph: persistent notes make a difference. After this paragraph.';
 const start=text.indexOf('persistent'),end=text.indexOf('. After');const anchor=makeAnchor(text,start,end);
 const changed='New introduction. '+text;const found=resolveAnchor(changed,anchor);
 assert.equal(changed.slice(found.start,found.end),anchor.quote);assert.equal(found.start,start+18);
 assert.equal(resolveAnchor('The passage has been removed',anchor),null);
});
test('repeated quotes use context and ambiguous duplicates are never guessed from position',()=>{
 const text='Cats before. Same words. Cats after. Dogs before. Same words. Dogs after.';
 const start=text.lastIndexOf('Same words');const a=makeAnchor(text,start,start+10);
 assert.equal(resolveAnchor(text,a).start,start);
 assert.equal(resolveAnchor('Same words / Same words',{quote:'Same words',prefix:'',suffix:'',start:0,end:10}),null);
 const same=' identical repeated sentence ';const b=makeAnchor(same,1,same.length-1);
 assert.equal(resolveAnchor(same.repeat(2),b),null);
});
test('word label geometry keeps neighboring labels apart',()=>{
 const words=Array.from({length:20},(_,i)=>({start:i,code:'aa',rect:{left:10+i*25,top:50}}));
 const positions=[...placeWordLabels(words,0,600).values()];
 for(let i=1;i<positions.length;i++)assert.ok(positions[i].left>=positions[i-1].left+positions[i-1].width);
});
test('overlapping highlights show the newest color only in the overlapping passage',()=>{
 assert.deepEqual(highlightSegments([{id:'old',start:0,end:20,color:'green',updatedAt:10},{id:'new',start:4,end:12,color:'yellow',updatedAt:11}]),[{start:0,end:4,color:'green'},{start:4,end:12,color:'yellow'},{start:12,end:20,color:'green'}]);
});
test('concurrent tabs retain independent annotations and protect same-note edits',async()=>{
 const disk=storage(),repo=createRepository(disk,()=>100);
 await Promise.all(Array.from({length:25},(_,i)=>repo({type:'save',url,item:item('id-'+i),base:null})));
 const page=await repo({type:'page',url});assert.equal(page.items.length,25);
 const old=page.items[0];const saved=await repo({type:'save',url,item:{...old,note:'changed'},base:old.updatedAt});assert.equal(saved.updatedAt,101);
 await assert.rejects(repo({type:'save',url,item:{...old,note:'stale'},base:old.updatedAt}),/another tab/);
 assert.equal((await repo({type:'page',url})).items.find(i=>i.id===old.id).note,'changed');
 // A rejected job must not poison later writes.
 await repo({type:'save',url,item:item('after-error'),base:null});
});
test('saved notes and site settings survive service-worker restart',async()=>{
 const disk=storage();let repo=createRepository(disk);
 await repo({type:'save',url,item:item(),base:null});await repo({type:'enabled',url,enabled:false});
 repo=createRepository(disk);const page=await repo({type:'page',url});assert.equal(page.items[0].note,'A thought');assert.equal(page.enabled,false);
 assert.equal((await repo({type:'page',url:'https://another.example/'})).enabled,true);
});
test('trash is reversible and backup restores notes, colors and anchors without overwriting newer changes',async()=>{
 const disk=storage(),repo=createRepository(disk,()=>100);let saved=await repo({type:'save',url,item:item(),base:null});
 saved=await repo({type:'save',url,item:{...saved,archived:true},base:saved.updatedAt});const exported=await repo({type:'export'});
 const target=createRepository(storage());await target({type:'import',backup:exported});assert.equal((await target({type:'page',url})).items[0].archived,true);
 saved=await repo({type:'save',url,item:{...saved,archived:false,note:'newest'},base:saved.updatedAt});await repo({type:'import',backup:exported});
 assert.equal((await repo({type:'page',url})).items[0].note,'newest');
});
test('malformed backups are rejected atomically and do not permit unsafe URLs',async()=>{
 const disk=storage(),repo=createRepository(disk);
 await assert.rejects(repo({type:'import',backup:backup([{url,title:'Okay',items:[item()]},{url:'javascript:alert(1)',title:'bad',items:[item()]}])}));
 assert.equal((await repo({type:'library'})).pages.length,0);
 assert.throws(()=>validateBackup(backup([{url,title:'x',items:[item(),item()]}])),/Duplicate/);
 assert.throws(()=>validateBackup(backup([{url,title:'x',items:[{...item(),color:'bad'}]}])),/color/);
 assert.throws(()=>validateBackup(backup([{url,title:'x',items:[{...item(),anchor:{quote:'test',prefix:'',suffix:'',start:10,end:2}}]}])),/anchor/);
});
test('storage failures surface rather than claiming a successful save',async()=>{
 const repo=createRepository({get:async()=>({}),set:async()=>{throw Error('QUOTA');}});
 await assert.rejects(repo({type:'save',url,item:item(),base:null}),/QUOTA/);
});
test('legacy pink Questions survive page/library reads, backup round trips and editing as red',async()=>{
 const disk=storage(),original={...item('legacy-question','Keep this question'),color:'pink',updatedAt:50,archived:true};
 disk.data['page:'+url]={url,title:'Legacy page',items:[original]};
 const repo=createRepository(disk,()=>100);
 const question=(await repo({type:'page',url})).items[0];
 assert.deepEqual(question,{...original,color:'red'});
 assert.equal((await repo({type:'library'})).pages[0].items[0].color,'red');
 assert.equal((await repo({type:'export'})).pages[0].items[0].color,'red');
 assert.equal(disk.data['page:'+url].items[0].color,'pink'); // Reading does not rewrite user files.
 const target=createRepository(storage());
 await target({type:'import',backup:backup([{url,title:'Legacy page',items:[original]}])});
 assert.deepEqual((await target({type:'page',url})).items[0],question);
 await repo({type:'save',url,item:{...question,note:'Updated question'},base:50});
 assert.equal(disk.data['page:'+url].items[0].color,'red');
 for(const color of ['orange','red'])await repo({type:'save',url,item:{...item(color),color},base:null});
 assert.equal((await repo({type:'page',url})).items.length,3);
});
