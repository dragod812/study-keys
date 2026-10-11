import test from 'node:test';
import assert from 'node:assert/strict';
import {shortcutHints} from '../src/shortcut-hints.js';

test('compact hints include only valid next keys and retain complete descriptions',()=>{
  const commands=[
    {keys:['Space','d','n'],label:'Open this page’s drawing notebook',hint:'Drawing notebook'},
    {keys:['Space','d','s'],label:'Search passages in the current document',hint:'Search document'},
    {keys:['Space','h'],label:'Open the annotation sidebar',hint:'Highlights & notes'},
    {keys:['v'],label:'Visual mode'},
  ];
  assert.deepEqual(shortcutHints(commands,['Space']).map(({key,label})=>[key,label]),[['d','Document →'],['h','Highlights & notes']]);
  const submenu=shortcutHints(commands,['Space','d']);
  assert.deepEqual(submenu.map(({key,label})=>[key,label]),[['n','Drawing notebook'],['s','Search document']]);
  assert.equal(submenu[0].detail,commands[0].label);
  assert.deepEqual(shortcutHints(commands,['Space','d','n']),[]);
});

test('quick spots collapse to a range without inventing unavailable shortcuts',()=>{
  const spots=Array.from({length:9},(_,i)=>({keys:['Space',String(i+1)],label:`Jump to quick spot ${i+1}`,hint:'Quick spots',hintGroup:'quick-spots'}));
  assert.deepEqual(shortcutHints(spots,['Space']).map(({key,label})=>[key,label]),[['1–9','Quick spots']]);
  assert.equal(shortcutHints([spots[0],spots[2],spots[8]],['Space'])[0].key,'1 / 3 / 9');
  assert.equal(shortcutHints([spots[0]],['Space'])[0].key,'1');
  const unrelated={keys:['Space','2'],label:'Something else'};
  assert.deepEqual(shortcutHints([spots[0],unrelated],['Space']).map(x=>x.key),['1','2']);
  assert.equal(spots.length,9); // Hint grouping does not change key execution.
});
