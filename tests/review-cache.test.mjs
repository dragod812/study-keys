import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewAssetCache} from '../src/review-cache.js';
test('view switches deduplicate asset loads; latest clears and failures can retry',async()=>{
 const cache=reviewAssetCache();let loads=0;
 const load=async()=>{loads++;return {data:'picture'};};
 const a=cache.get('after:image.png',load),b=cache.get('after:image.png',load);assert.equal(a,b);await a;
 await cache.get('after:image.png',load);assert.equal(loads,1);
 await cache.get('head:image.png',load);assert.equal(loads,2,'baselines must stay distinct');
 cache.clear();await cache.get('after:image.png',load);assert.equal(loads,3);
 await assert.rejects(cache.get('bad',async()=>{throw Error('retry');}));
 assert.equal(await cache.get('bad',async()=>42),42);
});
test('asset cache evicts by retained size and old in-flight results cannot refill after clear',async()=>{
 const cache=reviewAssetCache(16);let count=0;
 const load=async()=>{count++;return {data:'12345678'};};
 await cache.get('a',load);await cache.get('b',load);await cache.get('a',load);assert.equal(count,3);
 let resolve;const pending=cache.get('pending',()=>new Promise(r=>resolve=r));await Promise.resolve();cache.clear();
 const fresh=cache.get('pending',async()=>({data:'fresh'}));resolve({data:'old'});await pending;
 assert.equal((await fresh).data,'fresh');assert.equal((await cache.get('pending',load)).data,'fresh');
});
