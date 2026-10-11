import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardBoundary} from '../src/key-events.js';
import {keyOf} from '../src/core.js';

function harness(options){
  const listeners=new Map(),received=[];
  const target={addEventListener(type,fn){listeners.set(type,[...(listeners.get(type)||[]),fn]);},removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(x=>x!==fn));}};
  const dispose=keyboardBoundary(target,options);
  for(const type of ['keydown','keypress','keyup'])target.addEventListener(type,e=>received.push([type,e.key]));
  const fire=(type,key,extra={})=>{
    const e={type,key,code:key===' '?'Space':'Key'+key.toUpperCase(),isTrusted:true,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
    for(const fn of listeners.get(type)||[]){fn(e);if(e.stopped)break;}return e;
  };
  return {fire,received,dispose};
}
const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};

test('handled shortcuts suppress site capture listeners across the complete physical key cycle',()=>{
  let normal=true;
  const h=harness({onKey:e=>{if(normal&&['Space','f'].includes(keyOf(e))){consume(e);normal=false;}}});
  for(const type of ['keydown','keypress','keyup'])assert.equal(h.fire(type,' ').defaultPrevented,true);
  assert.deepEqual(h.received,[]);
  h.fire('keydown',' ');h.fire('keyup',' ');assert.equal(h.received.length,2);
});
test('Insert entry and repeats stay claimed; website-owned keys keep their release when mode changes',()=>{
  let insert=false;
  const h=harness({onKey:e=>{if(!insert&&e.key==='i'){consume(e);insert=true;}else if(insert&&keyOf(e)==='Ctrl-c'){consume(e);insert=false;}}});
  h.fire('keydown','i');h.fire('keydown','i',{repeat:true});h.fire('keyup','i');assert.equal(h.received.length,0);
  h.fire('keydown',' ');h.fire('keydown','c',{ctrlKey:true});h.fire('keyup','c',{ctrlKey:true});h.fire('keyup',' ');
  assert.deepEqual(h.received,[['keydown',' '],['keyup',' ']]);
});
test('extension controls isolate site listeners while retaining native text-entry defaults',()=>{
  let ui=true,handled=0;
  const h=harness({ownsUI:()=>ui,onKey:()=>{},onUIKey:e=>{handled++;if(e.key==='Enter')consume(e);}});
  for(const type of ['keydown','keypress','keyup'])assert.equal(h.fire(type,'f').defaultPrevented,false);
  assert.equal(handled,1);assert.equal(h.received.length,0);
  h.fire('keydown','Enter',{code:'Enter'});ui=false;
  assert.equal(h.fire('keyup','Enter',{code:'Enter'}).defaultPrevented,true);
  assert.equal(h.received.length,0);
});
test('unclaimed browser modifiers, IME and synthetic events keep their existing behavior',()=>{
  const h=harness({onKey:e=>{if(keyOf(e)==='f')consume(e);}});
  for(const extra of [{metaKey:true},{altKey:true},{isComposing:true},{isTrusted:false}]){
    for(const type of ['keydown','keypress','keyup'])assert.equal(h.fire(type,'f',extra).defaultPrevented,false);
  }
  assert.equal(h.received.length,12);
});
test('blur and disposal clear held keys so a lost keyup cannot block a later key',()=>{
  const h=harness({onKey:consume});h.fire('keydown','f');h.fire('blur','');
  assert.equal(h.fire('keyup','f').defaultPrevented,false);
  h.dispose();h.fire('keydown','f');assert.equal(h.received.length,2);
});
