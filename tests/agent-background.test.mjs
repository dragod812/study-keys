import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgentService} from '../src/agent-background.js';

const url='https://example.test/lesson';
function fixture(state={open:false},failure=null){
 const calls=[];
 const chrome={runtime:{onConnect:{addListener(){}},getManifest:()=>({version:'1.6.0'})},tabs:{
  query:async()=>[{id:1,url,active:true},{id:2,url,active:false}],
  sendMessage:async(id,message,options)=>{
   calls.push({id,message,options});assert.deepEqual(options,{frameId:0});
   if(id===1)throw Error('Could not establish connection. Receiving end does not exist.');
   if(message.type==='context')return {url};
   if(message.action==='notebookState'){if(failure)throw Error(failure);return {ok:true,value:state};}
   if(message.action==='read')return {ok:true,value:{url,text:'A useful passage'}};
   throw Error('Unexpected message');
  }
 }};
 return {calls,run:createAgentService(chrome,async()=>({page:{url,items:[]}}),{status:async()=>({online:true})})};
}
test('agent chooses a working duplicate tab and skips disconnected old receivers',async()=>{
 const {run,calls}=fixture();const result=await run({tool:'read_page',arguments:{url,open:false}});
 assert.equal(result.source.text,'A useful passage');assert.ok(calls.some(c=>c.id===2&&c.message.action==='read'));
});
test('agent refuses a connected notebook that has not registered or cannot be checked',async()=>{
 await assert.rejects(fixture({open:true}).run({tool:'read_page',arguments:{url}}),/still connecting/);
 await assert.rejects(fixture({open:false},'Unexpected page failure').run({tool:'read_page',arguments:{url}}),/Unexpected page failure/);
});
test('queued commands check current permission before execution',async()=>{
 let enabled=true,unblock,started;
 const blocked=new Promise(resolve=>unblock=resolve),entered=new Promise(resolve=>started=resolve);
 const chrome={runtime:{onConnect:{addListener(){}},getManifest:()=>({version:'1.6.0'})},tabs:{query:async()=>[]}};
 const run=createAgentService(chrome,async()=>{started();await blocked;return {};},{status:async()=>({online:true})},async()=>{if(!enabled)throw Error('AI access is off');});
 const first=run({tool:'get_page',arguments:{url}});await entered;
 const queued=run({tool:'get_page',arguments:{url}});enabled=false;unblock();await first;
 await assert.rejects(queued,/AI access is off/);
});
