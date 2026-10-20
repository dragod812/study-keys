import test from 'node:test';
import assert from 'node:assert/strict';
import {keyOf} from '../src/core.js';
import {returnToNormalKey,isTextField} from '../src/focus.js';
import {chooseMedia,toggleMedia} from '../src/media.js';

test('Ctrl+C exits both explicit Insert and direct field editing, but not disabled sites or other chords',()=>{
  const state={enabled:true,insert:false,owned:true};
  assert.equal(returnToNormalKey({key:'c',ctrlKey:true},state),true);
  assert.equal(returnToNormalKey({key:'c',ctrlKey:true},{...state,owned:false,insert:true}),true);
  assert.equal(returnToNormalKey({key:'c',ctrlKey:true},{...state,owned:false}),false);
  for(const extra of [{metaKey:true},{altKey:true},{shiftKey:true},{isComposing:true}])assert.equal(returnToNormalKey({key:'c',ctrlKey:true,...extra},state),false);
  assert.equal(returnToNormalKey({key:'Escape'},state),false);
  assert.equal(returnToNormalKey({key:'c',metaKey:true},state),false);
  assert.equal(returnToNormalKey({key:'c',ctrlKey:true},{...state,enabled:false}),false);
});
test('editable-field navigation skips non-text inputs and read-only fields',()=>{
  for(const type of ['text','search','email','url','tel','password','number'])assert.equal(isTextField({tagName:'INPUT',type}),true);
  for(const type of ['checkbox','radio','range','file','color','submit','hidden','button'])assert.equal(isTextField({tagName:'INPUT',type}),false);
  for(const state of [{disabled:true},{readOnly:true}])assert.equal(isTextField({tagName:'TEXTAREA',...state}),false);
  assert.equal(isTextField({tagName:'TEXTAREA'}),true);
  assert.equal(isTextField({tagName:'DIV',isContentEditable:true}),true);
});
const entry=(element,extra={})=>({element,loaded:true,visible:true,playing:false,muted:false,area:100,...extra});
test('media selects the main paused player ahead of muted hover previews and unloaded placeholders',()=>{
  assert.equal(chooseMedia([entry('preview',{playing:true,muted:true,area:300}),entry('main',{area:10000}),entry('empty',{loaded:false,area:50000})]),'main');
});
test('audible playback offscreen stays controllable; explicit focused, fullscreen and PiP media take priority',()=>{
  const items=[entry('poster',{area:10000}),entry('music',{visible:false,playing:true})];
  assert.equal(chooseMedia(items),'music');
  for(const flag of ['focused','fullscreen','pip'])assert.equal(chooseMedia([...items,entry(flag,{[flag]:true})]),flag);
});
test('media filters hidden stopped players, stale errors and empty sources without guessing another tab',()=>{
  assert.equal(chooseMedia([entry('hidden',{visible:false}),entry('error',{error:true}),entry('empty',{loaded:false})]),null);
  assert.equal(chooseMedia([]),null);
});
test('play/pause operates on one media element, handles rejected play, and reports no player',async()=>{
  // DOM boundary is supplied so the test exercises the real playback action.
  const oldStyle=globalThis.getComputedStyle,oldWidth=globalThis.innerWidth,oldHeight=globalThis.innerHeight;
  globalThis.getComputedStyle=()=>({display:'block',visibility:'visible'});globalThis.innerWidth=1000;globalThis.innerHeight=1000;
  let played=0,paused=0;
  const media={src:'local.wav',volume:1,paused:true,getBoundingClientRect:()=>({left:0,right:500,top:0,bottom:300}),closest:()=>null,play:async()=>{played++;media.paused=false;},pause:()=>{paused++;media.paused=true;}};
  const doc={querySelectorAll:()=>[media]};
  try{
    assert.equal(await toggleMedia(doc),'Media playing');assert.equal(played,1);
    assert.equal(await toggleMedia(doc),'Media paused');assert.equal(paused,1);
    media.play=async()=>{throw Error('NotAllowedError');};
    await assert.rejects(()=>toggleMedia(doc),/Play button/);
    await assert.rejects(()=>toggleMedia({querySelectorAll:()=>[]}),/No playable/);
  }finally{globalThis.getComputedStyle=oldStyle;globalThis.innerWidth=oldWidth;globalThis.innerHeight=oldHeight;}
});

test('modifier presses do not cancel a multi-key command before its uppercase letter',()=>{
  for(const key of ['Shift','Control','Alt','Meta','AltGraph','CapsLock'])assert.equal(keyOf({key}),null);
  assert.equal(keyOf({key:'I',shiftKey:true}),'I');
});
