import test from 'node:test';
import assert from 'node:assert/strict';
import {changedLines,makePrompt,sourceHash,sourceLocation,reviewEditorCommand} from '../src/review-model.js';
import {reviewRequest,readerSource,resolveReaderSender} from '../src/review-background.js';
import {currentPageSender} from '../src/page-sender.js';
import {readerTabAPI} from '../src/reader-tabs.js';
import {reviewDrafts} from '../src/review-drafts.js';

test('review comparisons preserve removals, line positions, whitespace and bounded context',()=>{
  const rows=changedLines('one\nold\nthree\n','one\nnew\nthree\n');
  assert.deepEqual(rows.map(r=>[r.change,r.oldLine,r.newLine]),[['same',1,1],['delete',2,null],['add',null,2],['same',3,3]]);
  assert.equal(changedLines('same\n','same\n',true).filter(r=>!r.gap).length,0);
  assert.ok(changedLines('x\n\n','x\n',true).some(r=>r.change==='delete'));
  assert.ok(changedLines(' '.repeat(8)+'x',' x').some(r=>r.change==='add'));
});
test('source mapping never labels ambiguous or formatted text as exact',()=>{
  assert.deepEqual(sourceLocation('a\nsame\nsame\n','same',1,3),{line:1,endLine:3,quality:'block'});
  assert.deepEqual(sourceLocation('# H\n\nThis **key** idea.\n','key idea',3,3),{line:3,endLine:3,quality:'block'});
  assert.deepEqual(sourceLocation('a\nb\nc\n','b',1,3),{line:2,endLine:2,quality:'exact'});
});
test('handoff is plain feedback: no Git commands, hash checks or staging prerequisites',()=>{
  const data={document:{path:"/tmp/it's $(no).md",hash:'a'.repeat(64)},git:{root:"/tmp/it's",relative:'$(no).md'}};
  const comments=[{id:'r1',hash:'a'.repeat(64),status:'open',text:'Explain the tradeoff.',quote:'Some text',line:4,endLine:7,quality:'block'}];
  const prompt=makePrompt(data,comments,1);
  assert.ok(prompt.includes(JSON.stringify(data.document.path)));
  assert.ok(prompt.includes('r1'));assert.ok(prompt.includes('4–7'));
  for(const git of [undefined,{partiallyStaged:true},{conflicted:true}]){
    const text=makePrompt({...data,git},comments,2);
    assert.doesNotMatch(text,/sha-?256|hash|git|staging|verify|stop before/i);
    assert.ok(text.includes('Explain the tradeoff.'));
  }
  assert.throws(()=>makePrompt(data,[],1),/open review comment/);
});
test('review native operations require packaged top-frame reader bound to its exact document',async()=>{
  const url='file:///tmp/review.md',reader='chrome-extension://test/review.html?url='+encodeURIComponent(url);
  const api={runtime:{getURL:p=>'chrome-extension://test/'+p},tabs:{get:async()=>({url:reader})}};
  const sender={url:reader,frameId:0,tab:{id:3}};
  const calls=[],native=async(op,args)=>{calls.push([op,args]);return {ok:true};};
  assert.equal(readerSource(sender,api),url);
  await reviewRequest(api,native,{action:'reviewLoad',url},sender);
  assert.equal(calls.length,1);
  await reviewRequest(api,native,{action:'reviewStage',url,path:'/tmp/unrelated.md'},sender);
  assert.equal(calls.at(-1)[0],'reviewStage');assert.equal(calls.at(-1)[1].url,url);
  assert.equal(calls.at(-1)[1].path,undefined);
  await reviewRequest(api,native,{action:'reviewAsset',url,ref:'image.svg',side:'before',offset:100},sender);
  assert.equal(calls.at(-1)[1].ref,'image.svg');assert.equal(calls.at(-1)[1].offset,100);
  for(const other of [{...sender,url:'https://test/review.html?url='+url},{...sender,frameId:1},{...sender,url:'chrome-extension://test/notebook.html?url='+url}])
    await assert.rejects(reviewRequest(api,native,{action:'reviewGrant',url},other));
  await assert.rejects(reviewRequest(api,native,{action:'reviewGrant',url:'file:///tmp/other.md'},sender));
  await assert.rejects(reviewRequest(api,native,{action:'set',url},sender));
  const normalized=await currentPageSender(api,sender,url);assert.equal(normalized.url,url);
  await assert.rejects(currentPageSender(api,sender,'file:///tmp/other.md'));
  api.tabs.get=async()=>({url:'https://elsewhere.test/'});
  await assert.rejects(reviewRequest(api,native,{action:'reviewLoad',url},sender));
});
test('hashes preserve source bytes including CRLF and Unicode',async()=>{
  assert.notEqual(await sourceHash('🙂\r\n'),await sourceHash('🙂\n'));
  assert.equal((await sourceHash('hello')).length,64);
});
test('review editor uses real Ctrl+C to leave, preserves Cmd+C copy, and respects IME',()=>{
  assert.equal(reviewEditorCommand({key:'c',ctrlKey:true}),'leave');
  assert.equal(reviewEditorCommand({key:'c',metaKey:true}),null);
  assert.equal(reviewEditorCommand({key:'Enter',ctrlKey:true}),'save');
  assert.equal(reviewEditorCommand({key:'Enter',metaKey:true}),'save');
  assert.equal(reviewEditorCommand({key:'Enter',ctrlKey:true,isComposing:true}),null);
  assert.equal(reviewEditorCommand({key:'c',ctrlKey:true,shiftKey:true}),null);
});
test('extension reader contexts resolve missing sender tab identity without trusting a message tab ID',async()=>{
  const url='chrome-extension://test/review.html?url=file%3A%2F%2F%2Ftmp%2Fnotes.md';
  const sender={url,documentId:'doc'},api={runtime:{getURL:p=>'chrome-extension://test/'+p,
    getContexts:async filter=>{assert.deepEqual(filter,{documentIds:['doc'],contextTypes:['TAB']});return [{documentUrl:url,frameId:0,tabId:4}];}},
    tabs:{get:async()=>({id:4,url})}};
  assert.equal((await resolveReaderSender(api,sender)).tab.id,4);
  api.tabs.get=async()=>({id:4,url:'https://other.test/'});
  assert.equal(await resolveReaderSender(api,sender),sender);
});
test('reading services retain file identities and route messages to the correct reader tab',async()=>{
  const file='file:///tmp/notes.md',reader='chrome-extension://test/review.html?url='+encodeURIComponent(file);
  const tabs=[{id:1,url:reader},{id:2,url:'https://example.test/'}],calls=[];
  const api={runtime:{getURL:p=>'chrome-extension://test/'+p,sendMessage:async m=>calls.push(m)},
    tabs:{query:async()=>tabs,get:async id=>tabs.find(t=>t.id===id),sendMessage:async(...args)=>calls.push(args)}};
  const wrapped=readerTabAPI(api);
  assert.equal((await wrapped.tabs.query({}))[0].url,file);
  await wrapped.tabs.sendMessage(1,{type:'context'});
  await wrapped.tabs.sendMessage(2,{type:'context'});
  assert.deepEqual(calls,[{type:'readerMessage',tabId:1,payload:{type:'context'}},[2,{type:'context'},undefined]]);
  assert.equal(tabs[0].url,reader);
});
test('notebooks in reader tabs resolve only their browser-owned embedded document context',async()=>{
  const reader='chrome-extension://test/review.html?url=file%3A%2F%2F%2Ftmp%2Fnotes.md',
    notebook='chrome-extension://test/notebook.html?session=opaque',sender={url:notebook,documentId:'frame'};
  let frameId=2,tabURL=reader;
  const api={runtime:{getURL:p=>'chrome-extension://test/'+p,
    getContexts:async()=>[{documentUrl:notebook,frameId,tabId:4}]},
    tabs:{get:async()=>({id:4,url:tabURL})}};
  assert.equal((await resolveReaderSender(api,sender)).tab.id,4);
  frameId=0;assert.equal(await resolveReaderSender(api,sender),sender);
  frameId=2;tabURL='https://other.test/';assert.equal(await resolveReaderSender(api,sender),sender);
});
test('independent draft recovery survives competing tabs without mixing documents',()=>{
  const map=new Map(),storage={get length(){return map.size;},key:i=>[...map.keys()][i],
    setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k),removeItem:k=>map.delete(k)};
  const first=reviewDrafts(storage,'file:///one.md'),second=reviewDrafts(storage,'file:///one.md');
  first.put({id:'a',text:'First draft'});second.put({id:'b',text:'Second draft'});
  assert.equal(first.list().length,2);
  first.remove('a');assert.equal(second.list()[0].text,'Second draft');
  assert.equal(reviewDrafts(storage,'file:///two.md').list().length,0);
  const blocked={get length(){throw Error('Storage unavailable');}};
  assert.deepEqual(reviewDrafts(blocked,'file:///one.md').list(),[]);
});
