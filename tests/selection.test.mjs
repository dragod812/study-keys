import test from 'node:test';
import assert from 'node:assert/strict';
import {wordCodePool,spanRebaser} from '../src/selection-dom.js';

test('word labels remain unique and prefix-free as a session grows',()=>{
  for(const initial of [0,1,20,40,700]){
    const next=wordCodePool(initial),codes=Array.from({length:1200},next);
    assert.equal(new Set(codes).size,codes.length);
    assert.ok(Math.max(...codes.map(c=>c.length))<=4);
    const sorted=codes.toSorted();
    for(let i=1;i<sorted.length;i++)assert.equal(sorted[i].startsWith(sorted[i-1]),false);
  }
});
test('rebasing uses DOM identity for identical quotations',()=>{
  const a={},b={};
  const index=(parts)=>({text:parts.map(p=>p[1]).join(''),points:parts.flatMap(([node,text])=>[...text].map((_,offset)=>({node,offset})))});
  const before=index([[a,'same'],[b,'same']]),after=index([[{},'new'],[a,'same'],[b,'same']]);
  assert.deepEqual(spanRebaser(before,after)({start:4,end:8}),{start:7,end:11});
});
