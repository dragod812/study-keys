import test from 'node:test';
import assert from 'node:assert/strict';
import {createPageLoader} from '../src/page-loader.js';

function fixture(){
  let href='https://example.com/first';
  const requests=[],entered=[],applied=[],errors=[],timers=new Map();let timer=0;
  const load=createPageLoader({href:()=>href,enter:url=>entered.push(url),apply:data=>applied.push(data),report:e=>errors.push(e),
    request:m=>new Promise((resolve,reject)=>requests.push({m,resolve,reject})),
    schedule:fn=>{timers.set(++timer,fn);return timer;},cancel:id=>timers.delete(id)});
  return {load,requests,entered,applied,errors,timers,navigate:url=>href=url,
    runRetry(){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}};
}
const changed=()=>Object.assign(Error('The page changed. Please try again.'),{code:'PAGE_CHANGED'});
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('passive loads use the live route before the periodic navigation check',async()=>{
  const f=fixture();f.navigate('https://example.com/second#heading');const p=f.load();
  assert.deepEqual(f.entered,['https://example.com/second']);assert.equal(f.requests[0].m.url,f.entered[0]);
  f.requests[0].resolve({items:['new page']});await p;assert.deepEqual(f.applied,[{items:['new page']}]);
});
test('navigation quietly discards stale errors and old-page annotations before another refresh starts',async()=>{
  for(const fail of [false,true]){
    const f=fixture(),p=f.load();f.navigate('https://example.com/second');
    fail?f.requests[0].reject(changed()):f.requests[0].resolve({items:['old page']});await p;
    assert.deepEqual(f.applied,[]);assert.deepEqual(f.errors,[]);
    const next=f.load();f.requests[1].resolve({items:['new page']});await next;
    assert.deepEqual(f.applied,[{items:['new page']}]);
  }
});
test('newer refreshes win, but real failures on the current page remain visible',async()=>{
  const f=fixture(),old=f.load(),next=f.load();f.requests[1].resolve({items:['latest']});await next;
  f.requests[0].reject(Error('old failure'));await old;assert.equal(f.errors.length,0);
  const failed=f.load(),error=Error('Local library disconnected');f.requests[2].reject(error);await failed;
  assert.deepEqual(f.errors,[error]);assert.deepEqual(f.applied,[{items:['latest']}]);
});
test('sender-context races retry silently with a bound and do not retry after navigation',async()=>{
  const f=fixture(),first=f.load();f.requests[0].reject(changed());await first;
  assert.equal(f.timers.size,1);f.runRetry();f.requests[1].reject(changed());await settle();
  f.runRetry();f.requests[2].reject(changed());await settle();
  assert.equal(f.requests.length,3);assert.equal(f.timers.size,0);assert.equal(f.errors.length,0);
  const retry=f.load();f.requests[3].reject(changed());await retry;f.navigate('https://example.com/second');f.runRetry();
  assert.equal(f.requests.length,4);
});
test('a transient sender mismatch recovers without a warning',async()=>{
  const f=fixture(),first=f.load();f.requests[0].reject(changed());await first;f.runRetry();
  f.requests[1].resolve({items:['restored']});await settle();assert.deepEqual(f.applied,[{items:['restored']}]);assert.deepEqual(f.errors,[]);
});
