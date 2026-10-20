import test from 'node:test';
import assert from 'node:assert/strict';
import {currentPageSender} from '../src/page-sender.js';

const first='https://learning.test/introduction',next='https://learning.test/breakdowns/short-links';
function fixture(live=next,tabURL=live){
  const calls=[],sender={id:'study',url:first,documentId:'original-document',frameId:0,tab:{id:7,windowId:2,url:first}};
  const api={tabs:{get:async id=>({id,url:tabURL}),sendMessage:async(id,message,options)=>{calls.push({id,message,options});return {url:live};}}};
  return {sender,api,calls};
}
test('SPA requests resolve the same document at its current route, including fragments',async()=>{
  const f=fixture(next+'#requirements'),s=await currentPageSender(f.api,f.sender,next);
  assert.equal(s.url,next+'#requirements');assert.equal(s.tab.url,next+'#requirements');assert.equal(s.tab.windowId,2);
  assert.deepEqual(f.calls,[{id:7,message:{type:'pageIdentity'},options:{documentId:'original-document',frameId:0}}]);
  assert.equal(f.sender.url,first);
});
test('stale requests cannot write to the original route or another same-origin page',async()=>{
  const f=fixture();
  for(const url of [first,'https://learning.test/unrelated'])await assert.rejects(currentPageSender(f.api,f.sender,url),{code:'PAGE_CHANGED'});
});
test('a replaced or unavailable document cannot borrow the new tab URL',async()=>{
  const f=fixture(first,next);await assert.rejects(currentPageSender(f.api,f.sender,next),{code:'PAGE_CHANGED'});
  f.api.tabs.sendMessage=async()=>{throw Error('No receiving document');};
  await assert.rejects(currentPageSender(f.api,f.sender,next),{code:'PAGE_CHANGED'});
});
test('cross-origin, subframe, unsupported and unidentified route changes fail closed',async()=>{
  const f=fixture();
  for(const [sender,url] of [[f.sender,'https://other.test/'],[{...f.sender,frameId:1},next],[{...f.sender,documentId:undefined},next],[f.sender,'file:///etc/passwd']])await assert.rejects(currentPageSender(f.api,sender,url),{code:'PAGE_CHANGED'});
  assert.equal(f.calls.length,0);
  const legacy={...f.sender,documentId:undefined};assert.equal(await currentPageSender(f.api,legacy,first),legacy);
});
test('same-page hashes and supported local files retain their page identity',async()=>{
  const f=fixture(first+'#section');assert.equal((await currentPageSender(f.api,f.sender,first)).url,first+'#section');
  const local=fixture('file:///notes/lesson.html#topic');local.sender.url='file:///notes/lesson.html';
  assert.equal((await currentPageSender(local.api,local.sender,'file:///notes/lesson.html')).url,'file:///notes/lesson.html#topic');
});
