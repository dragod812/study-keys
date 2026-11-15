import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {prepareReview,createReviewUI} from '../src/review-ui.js';
import {reviewVersions,reviewChanged,sourceHash} from '../src/review-model.js';

const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
test('review lifecycle: selection, drafts, combined prompt, delete/undo, Git views and second round',async t=>{
  const {document,window,Node}=parseHTML('<html><head><title></title></head><body><h1 id="review-title"></h1><div id="review-controls"></div><p id="review-status"></p><main id="review-document"></main></body></html>');
  const source='# Review\n\nUse four workers.\n\nKeep this paragraph.\n',hash=await sourceHash(source);
  let backend={document:{url:'file:///tmp/Review.md',path:'/tmp/Review.md',source,hash},git:{index:source,indexHash:hash,head:source,headHash:hash},state:{revision:null,comments:[],draft:null,rounds:[]}};
  let clipboard='',box=null,dialogKey,failSave=false,poll;
  const calls=[],cache=new Map();
  const storage={get length(){return cache.size;},key:i=>[...cache.keys()][i],getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
  Object.assign(globalThis,{document,window,Node,location:{href:'chrome-extension://test/review.html?url=file%3A%2F%2F%2Ftmp%2FReview.md'},localStorage:storage,
    chrome:{runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,sendMessage:async m=>{
      calls.push(m);
      if(m.action==='reviewSave'){
        if(failSave)return {ok:false,error:'Review changed in another tab'};
        assert.equal(m.expected,backend.state.revision);
        backend.state={...structuredClone(m.state),revision:crypto.randomUUID()};
        return {ok:true,value:{state:structuredClone(backend.state)}};
      }
      if(m.action==='reviewProbe')return {ok:true,value:{hash:backend.document.hash,indexHash:backend.git?.indexHash??null,headHash:backend.git?.headHash??null}};
      if(m.action==='reviewStage'){
        backend.git.index=backend.document.source;backend.git.indexHash=backend.document.hash;
        return {ok:true,value:{staged:true}};
      }
      return {ok:true,value:structuredClone(backend)};
    }}}});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async s=>clipboard=s}}});
  const interval=globalThis.setInterval;globalThis.setInterval=fn=>{poll=fn;return 0;};t.after(()=>globalThis.setInterval=interval);
  Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this._testValue;},set(value){this._testValue=value;}});
  window.HTMLElement.prototype.focus=function(){};
  window.HTMLElement.prototype.scrollIntoView=function(){};
  await prepareReview();
  const surface=document.createElement('div');document.body.append(surface);
  let selection;
  const ui=createReviewUI({surface,openDialog:()=>{box=document.createElement('div');surface.append(box);return box;},closeDialog:()=>{box?.remove();box=null;},clearMode:()=>{},say:()=>{},beginBlocks:()=>{},getSelectionState:()=>selection,setDialogKey:fn=>dialogKey=fn});
  const find=(text,root=document)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
  const click=async text=>{const b=find(text);assert.ok(b,'button '+text);b.onclick();await settle();};
  function select(quote){const p=[...document.querySelectorAll('#review-document p')].find(p=>p.textContent===quote),n=p.firstChild;
    selection={index:{text:quote,points:[...quote].map((_,offset)=>({node:n,offset}))},pending:{start:0,end:quote.length}};}
  async function save(text){
    const input=box.querySelector('textarea');input.value=text;input.oninput();
    find('Save comment').onclick();await Promise.resolve();
    assert.equal(input.readOnly,true,'typing is locked while a comment is saving');
    input.oninput(); // A late input event cannot resurrect the saved draft.
    await settle();assert.equal(backend.state.draft,null);
  }
  select('Use four workers.');ui.comment();await save('Explain worker sizing.');
  select('Keep this paragraph.');ui.comment();await save('Add an example.');
  await click('Comments (2)');
  assert.match(surface.textContent,/Lines 3–3/);assert.match(surface.textContent,/Lines 5–5/);
  await click('Copy handoff · y');
  assert.match(clipboard,/Review.md":3/);assert.match(clipboard,/Review.md":5/);
  assert.match(clipboard,/Explain worker sizing/);assert.match(clipboard,/Add an example/);
  const first=clipboard;
  await click('Copy handoff · y');assert.equal(backend.state.rounds.length,1);
  failSave=true;await click('Delete');assert.equal(surface.querySelectorAll('.review-comment').length,2);
  failSave=false;await click('Delete');assert.equal(backend.state.comments.length,1);
  const undo=find('Undo delete');undo.onclick();undo.onclick();await settle();assert.equal(backend.state.comments.length,2,'rapid undo clicks restore only one copy');
  await click('Resolve');await click('Copy handoff · y');assert.doesNotMatch(clipboard,/Explain worker sizing/);
  await click('Delete');await click('Copy handoff · y');assert.equal(backend.state.rounds.length,2,'deleting resolved feedback does not duplicate the handoff');
  assert.equal(backend.state.rounds[0].prompt,first,'past handoffs are unchanged');
  backend.document.source=source.replace('four','eight');backend.document.hash=await sourceHash(backend.document.source);
  await click('Load latest');assert.ok(document.querySelector('[data-change=add]'));
  // External git add changes the comparison even when source bytes stay equal.
  backend.git.index=backend.document.source;backend.git.indexHash=backend.document.hash;
  await poll();assert.match(document.querySelector('#review-status').textContent,/Git comparison changed/);
  await click('Load latest');assert.equal(document.querySelector('[data-change=add]'),null);
  const selectView=async value=>{const s=document.querySelector('select');s.value=value;s.onchange();await settle();};
  await selectView('staged');assert.equal(document.querySelector('[data-change=add]').textContent,'eight');
  await selectView('all');assert.equal(document.querySelector('[data-change=add]').textContent,'eight');
  await selectView('unstaged');
  await click('Delete');assert.equal(backend.state.comments.length,0);
  select('Use eight workers.');ui.comment();await save('Explain the retry limit.');
  await click('Copy handoff · y');assert.match(clipboard,/Explain the retry limit/);assert.doesNotMatch(clipboard,/Add an example/);
  backend.document.source=backend.document.source.replace('eight','twelve');backend.document.hash=await sourceHash(backend.document.source);
  await click('Load latest');assert.equal(document.querySelector('[data-change=delete]').textContent,'eight');
  await click('Stage file · Space r g');assert.equal(document.querySelector('[data-change=add]'),null);
  assert.ok(calls.some(c=>c.action==='reviewStage'));
  // An unfinished comment prevents an incomplete prompt from being copied.
  select('Use twelve workers.');ui.comment();box.querySelector('textarea').value='Unfinished';box.querySelector('textarea').oninput();
  dialogKey({key:'c',ctrlKey:true,preventDefault(){}});
  const previous=clipboard;await click('Copy handoff · y');assert.equal(clipboard,previous);
  await click('Resume comment draft');await click('Discard draft');
  assert.equal(backend.state.comments.length,1);
  // Flush the discard timer rather than leaving it active after this test.
  await click('Copy handoff · y');
});

test('Git comparisons choose exact baselines and detect external staging or commits',()=>{
  const data={document:{source:'working',hash:'w'},git:{index:'staged',indexHash:'i',head:'committed',headHash:'h'}};
  assert.equal(reviewVersions(data).before.source,'staged');
  assert.equal(reviewVersions(data,'staged').after.source,'staged');
  assert.equal(reviewVersions(data,'staged').before.source,'committed');
  assert.equal(reviewVersions(data,'all').after.source,'working');
  assert.equal(reviewChanged(data,{hash:'w',indexHash:'i',headHash:'h'}),false);
  assert.equal(reviewChanged(data,{hash:'w'}),false,'older helpers do not produce a constant changed warning');
  assert.equal(reviewChanged(data,{hash:'w',indexHash:'new',headHash:'h'}),true);
  assert.equal(reviewChanged(data,{hash:'w',indexHash:'i',headHash:'new'}),true);
  assert.equal(reviewChanged({document:data.document},{hash:'w',indexHash:null,headHash:null}),false);
});
