import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPosition,restoreReviewPosition} from '../src/review-reading.js';
const node=(line,end,top,bottom)=>({dataset:{sourceStart:String(line),sourceEnd:String(end)},getBoundingClientRect:()=>({top,bottom})});
test('view changes anchor to a visible fragment instead of a document-sized wrapper',()=>{
 const root={querySelectorAll:()=>[node(1,100,-2000,1500),node(20,20,-200,-170),node(24,26,-10,90),node(28,30,150,220)]};
 const position=reviewPosition(root,600);assert.deepEqual(position,{line:24,top:-10});
 const next={querySelectorAll:()=>[node(1,100,-3000,1900),node(24,80,40,700),node(24,26,60,140)]};
 assert.equal(restoreReviewPosition(next,position),70);
});
test('view position gracefully handles no visible source and a removed passage',()=>{
 assert.equal(reviewPosition({querySelectorAll:()=>[]},600),null);
 assert.equal(restoreReviewPosition({querySelectorAll:()=>[]},{line:24,top:10}),null);
 const next={querySelectorAll:()=>[node(2,2,20,40),node(25,25,70,100)]};assert.equal(restoreReviewPosition(next,{line:24,top:10}),60);
});
