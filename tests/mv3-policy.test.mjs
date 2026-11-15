import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {removeRemoteEmbedLoaders,remoteCodeFindings} from '../drawing-policy.mjs';
import {auditPackage} from '../mv3-audit.mjs';
test('pinned Excalidraw patch removes Twitter, Reddit and dynamic Gist script loaders',async()=>{
 const dir='node_modules/@excalidraw/excalidraw/dist/prod';let patched=0;
 for(const file of await readdir(dir))if(file.endsWith('.js')){
  const source=await readFile(path.join(dir,file),'utf8');
  const result=removeRemoteEmbedLoaders(source);if(!result.patched)continue;patched++;
  assert.ok(remoteCodeFindings(source).length>0);assert.deepEqual(remoteCodeFindings(result.source),[]);
  assert.equal(result.source.includes('srcdoc:'),false);
  assert.ok(result.source.includes('return Xt.set(e,{link:e'));
 }
 assert.equal(patched,1);
});
test('upstream drift fails closed instead of silently shipping the loaders',()=>{
 assert.throws(()=>removeRemoteEmbedLoaders('https://platform.twitter.com/widgets.js'),/changed/);
 assert.deepEqual(removeRemoteEmbedLoaders('const local=1'),{source:'const local=1',patched:false});
});
test('remote script, module and worker loaders are detected without blocking ordinary data URLs',()=>{
 for(const source of ['<script async src="https://example.com/widget.js"></script>','<script src="${gist}.js"></script>', 'import("https://cdn.example/module.js")','import thing from "https://cdn.example/module.js"','new Worker("https://example.com/worker.js")'])assert.ok(remoteCodeFindings(source).length,source);
 assert.deepEqual(remoteCodeFindings('fetch("https://example.com/data.json"); const help="https://example.com/"'),[]);
});
test('package audit scans nested bundles and rejects remote HTML scripts',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-keys-mv3-'));
 try{
  await writeFile(path.join(dir,'local.js'),'export const ok=true;');
  await writeFile(path.join(dir,'index.html'),'<script type="module" src="local.js"></script>');await auditPackage(dir);
  await writeFile(path.join(dir,'local.js'),'<script src="https://example.com/widget.js"></script>');await assert.rejects(auditPackage(dir),/local.js/);
  await writeFile(path.join(dir,'local.js'),'');await writeFile(path.join(dir,'index.html'),'<script src="//example.com/widget.js"></script>');await assert.rejects(auditPackage(dir),/remote HTML script/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
