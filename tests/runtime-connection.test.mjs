import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntimeConnection} from '../src/runtime-connection.js';

test('an updated runtime disconnects once and rejects saves without sending',async()=>{
  let calls=0,notices=0;
  const runtime={id:'study',sendMessage:async()=>{calls++;return {ok:true,value:'saved'};}};
  const c=createRuntimeConnection(()=>runtime);c.subscribe(()=>notices++);
  assert.equal(await c.request({type:'save'}),'saved');
  delete runtime.id;assert.equal(c.connected(),false);assert.equal(c.connected(),false);
  await assert.rejects(c.request({type:'save'}),{code:'EXTENSION_DISCONNECTED'});
  assert.equal(notices,1);assert.equal(calls,1);
});
test('invalidation during a request notifies an open editor and preserves failure',async()=>{
  let notices=0;
  const c=createRuntimeConnection(()=>({id:'study',sendMessage:async()=>{throw Error('Extension context invalidated.');}}));
  c.subscribe(()=>notices++);
  await assert.rejects(c.request({type:'save'}),{code:'EXTENSION_DISCONNECTED'});
  assert.equal(notices,1);assert.equal(c.connected(),false);
});
test('a transient worker failure can recover without marking the tab disconnected',async()=>{
  let first=true,notices=0;
  const c=createRuntimeConnection(()=>({id:'study',sendMessage:async()=>{if(first){first=false;throw Error('Message port closed');}return {ok:true,value:42};}}));
  c.subscribe(()=>notices++);
  await assert.rejects(c.request({}),/try again/);
  assert.equal(await c.request({}),42);assert.equal(notices,0);
});
test('repository errors retain their conflict codes without disconnecting',async()=>{
  const c=createRuntimeConnection(()=>({id:'study',sendMessage:async()=>({ok:false,error:'Draft conflict',code:'CONFLICT'})}));
  await assert.rejects(c.request({}),{message:'Draft conflict',code:'CONFLICT'});
  assert.equal(c.connected(),true);
});
