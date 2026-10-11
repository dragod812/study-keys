import test from 'node:test';
import assert from 'node:assert/strict';
import {pageKey,pageScope,pageSource,supportedPage,makeAnchor} from '../src/core.js';
import {createRepository} from '../src/repository.js';
import {copyableURL} from '../src/link-copy.js';
import {rankEntries} from '../src/navigation-core.js';
const url='file:///Users/reader/My%20Notes/Queue.md';
const position={x:0,y:300,pageX:0,pageY:300,pane:null,anchor:null,viewportY:0};
function storage(){const data={};return {data,get:async k=>structuredClone(k==null?data:{[k]:data[k]}),set:async v=>Object.assign(data,structuredClone(v))};}

test('local Markdown identity ignores viewer cache queries and headings, preserves path and case',()=>{
 assert.equal(pageKey(url+'?preventCache=123#queues'),url);
 assert.equal(pageKey('file://localhost/Users/reader/My Notes/Queue.md'),url);
 assert.equal(pageKey('file:///notes/日本語.MD'),new URL('file:///notes/日本語.MD').href);
 assert.notEqual(pageKey(url),pageKey(url.replace('Queue','queue')));
 assert.notEqual(pageKey(url),pageKey(url.replace('My%20Notes','Other')));
 for(const ext of ['md','MD','markdown','mdown','mkd','mkdn','html','htm','HTML','HTM'])assert.equal(supportedPage('file:///notes/readme.'+ext),true);
 for(const bad of ['file:///etc/passwd','file:///notes/','file:///notes/secret.pdf','file:///notes/source.js','file:///notes/document.txt','file:///notes/page.html.pdf','file://server/notes/a.md','file:///notes/a%00.md','file:///notes/a%2fb.md','file:///notes/a%5cb.md','file:///notes/%FE.md','chrome-extension://other/viewer.html','javascript:alert(1)'])assert.equal(supportedPage(bad),false,bad);
 assert.equal(pageScope(url),url);assert.equal(pageScope('https://example.com/a'),'https://example.com');
 assert.equal(pageSource(url),'Local Markdown · /Users/reader/My Notes/Queue.md');
 const html=url.replace('.md','.html');assert.equal(pageKey(html+'?cache=1#section'),html);assert.equal(pageScope(html),html);
 assert.equal(pageSource(html),'Local HTML · /Users/reader/My Notes/Queue.html');assert.notEqual(pageScope(url),pageScope(html));
});

for(const ext of ['md','html'])test('local '+ext+' annotations, drawings, marks and workspaces survive restart and backup without merging same-name files',async()=>{
 const url='file:///Users/reader/My%20Notes/Queue.'+ext;
 const disk=storage(),repo=createRepository(disk,()=>1234),other=url.replace('My%20Notes','Other');
 const item={id:'local-note',color:'yellow',note:'Remember the quota',anchor:makeAnchor('Quota keeps work bounded',0,5)};
 await repo({type:'save',url:url+'#heading',title:'Queue',item,base:null});
 await repo({type:'enabled',url,enabled:false});
 assert.equal((await repo({type:'page',url:other})).enabled,true);
 assert.equal((await repo({type:'page',url:other})).items.length,0);
 const scene={type:'excalidraw',elements:[{id:'box',type:'rectangle',x:1,y:2,width:100,height:50}],appState:{},files:{}};
 await repo({type:'drawingSave',url,title:'Queue',scene,base:null});
 await repo({type:'setMark',url,title:'Queue',name:'M',position});
 disk.data.navigation={spots:[{url,title:'Queue',position}],workspaces:[{id:'md',name:'Markdown',tabs:[{url,title:'Queue',position,group:'Notes'}]}]};
 const restarted=createRepository(disk);
 assert.equal((await restarted({type:'page',url})).items[0].note,item.note);
 assert.equal((await restarted({type:'drawingLoad',url})).drawing.scene.elements[0].id,'box');
 const copy=createRepository(storage());await copy({type:'import',backup:await restarted({type:'export'})});
 assert.equal((await copy({type:'page',url})).items[0].anchor.quote,'Quota');
 assert.equal((await copy({type:'getMark',url,name:'M'})).url,url);
 assert.equal((await copy({type:'export'})).navigation.workspaces[0].tabs[0].url,url);
});

test('local links resolve against the file without stripping the chosen heading, and search can filter local files',()=>{
 assert.equal(copyableURL('../Other/Guide.md#limits',url),'file:///Users/reader/Other/Guide.md#limits');
 assert.equal(copyableURL('#queues',url),url+'#queues');
 assert.equal(copyableURL('../Other/Guide.htm#limits',url),'file:///Users/reader/Other/Guide.htm#limits');
 assert.equal(copyableURL('file://server/shared/a.md',url),null);
 assert.equal(copyableURL(url,'https://example.com'),null);
 const entries=[{label:'Quota',url},{label:'Quota',url:'https://example.com/'}];
 assert.deepEqual(rankEntries(entries,'quota site:local'),[entries[0]]);
});
