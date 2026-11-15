import test from 'node:test';
import assert from 'node:assert/strict';
import {detachTab} from '../src/tab-window.js';
test('W moves only the sender tab without recreating its URL or other selected tabs',async()=>{
 const calls=[];
 const api={tabs:{get:async id=>({id,windowId:1,url:'https://example.test/form',groupId:5,pinned:true})},windows:{create:async args=>{calls.push(args);return {id:9};}}};
 assert.deepEqual(await detachTab(api,{tab:{id:7}}),{done:true,windowId:9});
 assert.deepEqual(calls,[{tabId:7,type:'normal',focused:true,incognito:false}]);
 assert.equal('url' in calls[0],false,'same live tab preserves page state');
});
test('private tabs remain private using the live tab state',async()=>{
 let args;await detachTab({tabs:{get:async id=>({id,incognito:true})},windows:{create:async value=>{args=value;}}},{tab:{id:7,incognito:false}});
 assert.equal(args.incognito,true);
});
test('missing tabs and browser failures fail visibly without creating fallback duplicates',async()=>{
 let created=0;const api={tabs:{get:async()=>null},windows:{create:async()=>created++}};
 for(const sender of [{},{tab:{id:-1}},{tab:{id:'7'}}])await assert.rejects(detachTab(api,sender),/webpage/);
 await assert.rejects(detachTab(api,{tab:{id:7}}),/no longer/);assert.equal(created,0);
 api.tabs.get=async id=>({id});api.windows.create=async()=>{created++;throw Error('Chrome cannot move this tab');};
 await assert.rejects(detachTab(api,{tab:{id:7}}),/cannot move/);assert.equal(created,1);
});
