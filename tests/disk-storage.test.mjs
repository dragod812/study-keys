import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiskStorage,nativeClient} from '../src/disk-storage.js';
const cache=()=>{const d={};return {d,get:async k=>structuredClone(k==null?d:{[k]:d[k]}),set:async v=>Object.assign(d,structuredClone(v))};};
test('disk writes precede cache writes, migrate once, and failed writes never report success',async()=>{
 const c=cache();c.d['page:https://example.com/']={url:'https://example.com/',title:'Original',items:[]};const data={};let fail=false,migrations=0;
 const rpc=async(op,m={})=>{if(fail)throw Error('Disk unavailable');if(op==='migrate'){migrations++;Object.assign(data,m.values);return {folder:'/test/.study-keys'};}if(op==='status')return {folder:'/test/.study-keys'};if(op==='get'){const values=m.key==null?{...data}:{[m.key]:data[m.key]??null};return {values,versions:Object.fromEntries(Object.keys(values).map(k=>[k,'version']))};}if(op==='set'){Object.assign(data,m.values);return {versions:Object.fromEntries(Object.keys(m.values).map(k=>[k,'new']))};}};
 const storage=createDiskStorage(c,rpc),key='page:https://example.com/';assert.equal((await storage.get(key))[key].title,'Original');
 await storage.set({[key]:{...data[key],title:'Saved to disk'}});assert.equal(c.d[key].title,'Saved to disk');assert.equal(data[key].title,'Saved to disk');
 fail=true;await assert.rejects(storage.set({[key]:{...data[key],title:'Unsaved draft'}}),/Not saved/);assert.equal(c.d[key].title,'Saved to disk');assert.equal((await storage.get(key))[key].title,'Saved to disk');assert.equal((await storage.status()).online,false);
 fail=false;await storage.get(key);assert.equal(migrations,1);assert.equal((await storage.status()).online,true);
});
test('native response chunks decode large Unicode scenes in order',async()=>{
 let receive,disconnect;const data={text:'日本語 📝'.repeat(100000)};
 const runtime={connectNative:()=>({onMessage:{addListener:f=>receive=f},onDisconnect:{addListener:f=>disconnect=f},postMessage:m=>queueMicrotask(()=>{const payload=Buffer.from(JSON.stringify({ok:true,value:data})).toString('base64');for(let i=0;i<payload.length;i+=100000)receive({id:m.id,chunk:payload.slice(i,i+100000)});receive({id:m.id,done:true});})})};
 assert.deepEqual(await nativeClient(runtime)('get'),data);
});
test('a readable helper status never hides a failed file read',async()=>{
 const c=cache();c.d['disk-library-v1']={folder:'/test/.study-keys'};
 const storage=createDiskStorage(c,async op=>{if(op==='get')throw Error('A drawing file is missing');return {folder:'/test/.study-keys'};});
 await storage.get(null);const state=await storage.status();assert.equal(state.online,false);assert.match(state.error,/drawing file is missing/);
});
