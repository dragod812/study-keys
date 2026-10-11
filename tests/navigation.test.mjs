import test from 'node:test';
import assert from 'node:assert/strict';
import {literalMatches,parseSearch,rankEntries,appendJump,cleanStudyState,passageScore} from '../src/navigation-core.js';
import {createNavigationService} from '../src/navigation-background.js';
const pos=y=>({x:0,y,pageX:0,pageY:y,pane:null,anchor:null,viewportY:0});
const point=(url,y=0,tabId=1)=>({url,title:url,tabId,position:pos(y)});
function store(){const data={};return {data,get:async k=>structuredClone(k==null?data:{[k]:data[k]}),set:async values=>Object.assign(data,structuredClone(values))};}
function harness(){
  const session=store(),library=store(),calls=[],positions={1:0,2:500},groups=[{id:5,windowId:1,title:'Kueue',color:'green',collapsed:false},{id:6,windowId:1,title:'Reference',color:'blue',collapsed:false}];
  let tabs=[{id:1,windowId:1,url:'https://docs.test/one',title:'Concurrency',groupId:5,index:0,highlighted:true},{id:2,windowId:1,url:'https://docs.test/two',title:'Fair sharing',groupId:6,index:1,highlighted:false},{id:3,windowId:1,url:'https://docs.test/three',title:'Unloaded',discarded:true,groupId:-1,index:2}];
  const api={storage:{session},windows:{update:async()=>{}},tabGroups:{query:async()=>structuredClone(groups),update:async(id,v)=>Object.assign(groups.find(g=>g.id===id),v)},tabs:{
    query:async filter=>structuredClone(tabs.filter(t=>Object.entries(filter).every(([k,v])=>t[k]===v))),get:async id=>structuredClone(tabs.find(t=>t.id===id)),
    update:async(id,v)=>{calls.push({update:id,...v});return Object.assign(tabs.find(t=>t.id===id),v);},
    create:async v=>{const t={...v,id:tabs.length+10,groupId:-1,windowId:1,title:v.url};tabs.push(t);return t;},
    group:async({tabIds,groupId})=>{const id=groupId??groups.length+10;if(groupId==null)groups.push({id,windowId:1,title:'',color:'grey',collapsed:false});for(const t of tabs)if(tabIds.includes(t.id))t.groupId=id;return id;},
    ungroup:async ids=>{for(const t of tabs)if(ids.includes(t.id))t.groupId=-1;},
    sendMessage:async(id,m)=>{calls.push({id,action:m.action});const tab=tabs.find(t=>t.id===id);if(m.action==='capture')return point(tab.url,positions[id]||0,id);if(m.action==='restore'){positions[id]=m.location.position?.y||0;return {restored:true};}if(m.action==='search')return {entries:[{label:'Quota borrowing',detail:'Fair sharing',anchor:{quote:'quota',prefix:'',suffix:'',start:0,end:5},rank:1}]};}
  }};
  const service=createNavigationService(api,library),sender=()=>({tab:structuredClone(tabs[0]),url:tabs[0].url});
  return {service,session,library,calls,positions,groups,api,sender,request:m=>service.request(m,sender())};
}
test('literal find escapes regex and preserves Unicode offsets',()=>{
  assert.deepEqual(literalMatches('a.b A.B a+b','a.b'),[{start:0,end:3},{start:4,end:7}]);
  assert.deepEqual(literalMatches('İ needle NEEDLE','needle'),[{start:2,end:8},{start:9,end:15}]);assert.deepEqual(literalMatches('x',''),[]);
});
test('query scopes filter domains, groups and annotation properties',()=>{
  assert.deepEqual(parseSearch('quota group:"Kueue learning" site:docs.test'),{text:'quota',filters:{group:'kueue learning',site:'docs.test'}});
  const entries=[{label:'quota',url:'https://docs.test/x',color:'red',note:'why?'},{label:'quota',url:'https://notdocs.test/x',color:'red'}];
  assert.equal(rankEntries(entries,'quota site:docs.test color:red has:note').length,1);
});
test('jump history deduplicates nearby locations, branches and caps at 100',()=>{
  const s={entries:[],at:-1};appendJump(s,point('https://example.test',0));appendJump(s,point('https://example.test',10));assert.equal(s.entries.length,1);
  appendJump(s,point('https://example.test',100));s.at=0;appendJump(s,point('https://example.test',200));assert.equal(s.entries.length,2);assert.equal(s.entries[1].position.y,200);
  for(let i=0;i<150;i++)appendJump(s,point('https://example.test',i*100));assert.equal(s.entries.length,100);
});
test('cross-tab search does not wake discarded tabs and reports coverage',async()=>{
  const h=harness(),result=await h.request({action:'search',query:'quota'});assert.equal(result.entries.length,2);assert.match(result.coverage,/2 of 3/);assert.equal(h.calls.some(c=>c.id===3),false);
  assert.equal((await h.request({action:'tabs',query:'fair'})).entries[0].tabId,2);
});
test('jump back and forward restores position; worker recreation retains the cursor',async()=>{
  const h=harness();await h.request({action:'checkpoint',location:point(h.sender().url,0),jump:true});h.positions[1]=700;await h.request({action:'checkpoint',location:point(h.sender().url,700),jump:true});
  await h.request({action:'jump',delta:-1});assert.equal(h.positions[1],0);
  const recreated=createNavigationService(h.api,h.library);await recreated.request({action:'jump',delta:1},h.sender());assert.equal(h.positions[1],700);
});
test('group focus restores prior collapse state and constrains search',async()=>{
  const h=harness();await h.request({action:'groupFocus'});assert.equal(h.groups[1].collapsed,true);assert.equal((await h.request({action:'tabs'})).entries.length,1);
  await h.request({action:'groupFocus'});assert.equal(h.groups[1].collapsed,false);assert.equal((await h.request({action:'tabs'})).entries.length,3);
});
test('group mutations operate on selected tabs and reject foreign groups',async()=>{
  const h=harness();await h.request({action:'groupMove',groupId:6,selected:true});assert.equal((await h.api.tabs.get(1)).groupId,6);
  await assert.rejects(h.request({action:'groupMove',groupId:999}),/no longer/);await h.request({action:'groupRemove'});assert.equal((await h.api.tabs.get(1)).groupId,-1);
});
test('quick spots and workspaces persist through local library storage',async()=>{
  const h=harness();h.positions[1]=240;assert.equal((await h.request({action:'spotSave'})).slot,1);
  h.positions[1]=1000;await h.request({action:'spotOpen',slot:1});assert.equal(h.positions[1],240);
  await h.request({action:'workspaceSave',name:'Reading'});assert.equal(h.library.data.navigation.workspaces[0].tabs.length,3);
  const saved=h.library.data.navigation.workspaces[0];await h.request({action:'workspaceOpen',id:saved.id});assert.equal((await h.api.tabs.query({})).length,3);
  await h.request({action:'spotRemove',slot:1});assert.equal(h.library.data.navigation.spots.length,0);
});
test('invalid workspace URLs and cross-page checkpoints are rejected',async()=>{
  const h=harness();await assert.rejects(h.request({action:'checkpoint',location:point('https://different.test/')}),/another page/);
  assert.throws(()=>cleanStudyState({spots:[point('file:///private/key')]}),/HTTP/);
});
test('pinned results traverse and closed tabs are reopened by URL',async()=>{
  const h=harness();await h.request({action:'pinResults',entries:[{url:'https://new.test/',position:pos(300)}]});
  const result=await h.request({action:'nextResult',delta:1});assert.equal(result.total,1);assert.ok((await h.api.tabs.query({})).some(t=>t.url==='https://new.test/'));
});

test('search cancellation leaves history untouched and annotation filters do not broaden scope',async()=>{
  const h=harness();await h.request({action:'tabs',query:'docs'});await h.request({action:'search',query:'quota site:elsewhere.test'});
  assert.equal((await h.request({action:'jumps'})).entries.length,0);
  assert.equal((await h.request({action:'search',query:'quota group:Reference'})).entries.length,1);
});
test('native toggle only invokes the explicitly supplied fixed action',async()=>{
  const h=harness();await assert.rejects(h.request({action:'verticalTabs'}),/no native/);
  let invoked=0;const service=createNavigationService(h.api,h.library,async()=>({toggled:++invoked}));assert.equal((await service.request({action:'verticalTabs',command:'ignored'},h.sender())).toggled,1);
});

test('previous-tab command toggles after programmatic tab switches',async()=>{
  const h=harness();await h.request({action:'open',location:{tabId:2}});
  await h.service.activated({tabId:2,windowId:1});
  await h.service.request({action:'lastTab'},{tab:await h.api.tabs.get(2),url:'https://docs.test/two'});
  assert.equal(h.calls.filter(c=>c.update).at(-1).update,1);
  await h.request({action:'lastTab'});assert.equal(h.calls.filter(c=>c.update).at(-1).update,2);
});
test('passage fuzzy matching requires terms within words and bounds literal results',()=>{
  assert.ok(passageScore('Use a bounded retry budget with jitter','bnded rtry')>=0);
  assert.equal(passageScore('Read a book. Understand design. Keep every word. Try once.','bounded retry'),-1);
  assert.equal(literalMatches('a'.repeat(10000),'a',5).length,5);
  assert.throws(()=>cleanStudyState({spots:{}}),/Invalid study/);
});
test('navigation data and resolved questions survive backup restore without duplicates',async()=>{
  const {createRepository}=await import('../src/repository.js');const disk=store();
  disk.data.navigation={spots:[point('https://docs.test/one',500)],workspaces:[{id:'one',name:'Study',tabs:[point('https://docs.test/one',500)]}]};
  const source=createRepository(disk);await source({type:'save',url:'https://docs.test/one',title:'One',item:{id:'question',note:'Answered',anchor:null,color:'red',resolved:true},base:null});
  const backup=await source({type:'export'}),targetDisk=store(),target=createRepository(targetDisk);
  await target({type:'import',backup});await target({type:'import',backup});
  assert.equal(targetDisk.data.navigation.spots.length,1);assert.equal(targetDisk.data.navigation.workspaces.length,1);
  assert.equal((await target({type:'page',url:'https://docs.test/one'})).items[0].resolved,true);
  const old=structuredClone(targetDisk.data);await assert.rejects(target({type:'import',backup:{...backup,navigation:{spots:{}}}}),/Invalid study/);assert.deepEqual(targetDisk.data,old);
});

test('workspace restore preserves duplicate URLs and separate groups with the same name',async()=>{
  const h=harness();await h.api.tabs.update(2,{url:h.sender().url});h.groups[1].title=h.groups[0].title;
  await h.request({action:'workspaceSave',name:'Two reading positions'});
  const workspace=h.library.data.navigation.workspaces[0];await h.request({action:'workspaceOpen',id:workspace.id});
  assert.equal(h.positions[1],0);assert.equal(h.positions[2],500);
  assert.notEqual((await h.api.tabs.get(1)).groupId,(await h.api.tabs.get(2)).groupId);
});
test('workspace saving retains the last known position of a discarded tab without waking it',async()=>{
  const h=harness();await h.request({action:'checkpoint',location:point(h.sender().url,820)});
  await h.api.tabs.update(1,{discarded:true});h.calls.length=0;await h.request({action:'workspaceSave',name:'Suspended reading'});
  assert.equal(h.library.data.navigation.workspaces[0].tabs[0].position.y,820);
  assert.equal(h.calls.some(c=>c.id===1),false);
});
test('quick spots distinguish separate scroll panes on the same page',async()=>{
  const h=harness(),send=h.api.tabs.sendMessage;let pane='#left';h.api.tabs.sendMessage=async(id,m)=>{const r=await send(id,m);if(m.action==='capture')r.position.pane=pane;return r;};
  await h.request({action:'spotSave'});pane='#right';await h.request({action:'spotSave'});assert.equal(h.library.data.navigation.spots.length,2);
});
test('previous pinned result starts at the last result',async()=>{
  const h=harness();await h.request({action:'pinResults',entries:[{tabId:1},{tabId:2},{tabId:3}]});
  const r=await h.request({action:'nextResult',delta:-1});assert.equal(r.at,3);
});
test('a stale group search cannot overwrite a concurrent reading checkpoint',async()=>{
  const h=harness();await h.request({action:'groupFocus'});h.groups.splice(0,1);
  let release,started;const ready=new Promise(r=>started=r),gate=new Promise(r=>release=r),query=h.api.tabGroups.query;
  h.api.tabGroups.query=async()=>{started();await gate;return query();};
  const search=h.request({action:'tabs'});await ready;await h.request({action:'checkpoint',location:point(h.sender().url,550),jump:true});release();await search;
  assert.equal((await h.request({action:'jumps'})).entries[0]?.location.position.y,550);
});


test('loaded Markdown participates in passage search, jumps, quick spots and workspace restoration',async()=>{
 const h=harness(),url='file:///notes/Queue.md';await h.api.tabs.update(1,{url,title:'Queue.md'});
 const result=await h.request({action:'search',query:'quota site:local'});assert.equal(result.entries.length,1);assert.equal(result.entries[0].url,url);
 await h.request({action:'checkpoint',jump:true,location:point(url,300)});
 assert.equal(h.session.data['reading-navigation'].entries[0].url,url);
 await h.request({action:'spotSave'});assert.equal(h.library.data.navigation.spots[0].url,url);
 await h.request({action:'workspaceSave',name:'Local documents'});
 const workspace=h.library.data.navigation.workspaces[0];assert.equal(workspace.tabs[0].url,url);
 await h.api.tabs.update(1,{url:'https://example.com/elsewhere'});
 await h.request({action:'workspaceOpen',id:workspace.id});
 assert.equal((await h.api.tabs.query({})).filter(t=>t.url===url).length,1);
});
