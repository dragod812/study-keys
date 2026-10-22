import {buildDrawing} from './drawing-build.mjs';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {createRepository} from './src/repository.js';
import {remoteImage} from './src/review-background.js';
const root=path.dirname(fileURLToPath(import.meta.url));
await mkdir(path.join(root,'.preview'),{recursive:true});
const plugin={name:'test-only-transport',setup(b){b.onResolve({filter:/^\.\/transport\.js$/},()=>({path:path.join(root,'src/preview-transport.js')}));}};
for(const name of ['content','library'])await build({entryPoints:[path.join(root,'src/'+name+'.js')],bundle:true,format:name==='content'?'iife':'esm',outfile:path.join(root,'.preview/'+name+'.js'),loader:{'.css':'text'},define:{STUDY_KEYS_PREVIEW:'true'},plugins:[plugin]});
await build({entryPoints:[path.join(root,'src/review-media.js')],bundle:true,format:'esm',outfile:path.join(root,'.preview/review-media.js'),minify:true});
process.chdir(root);await buildDrawing(path.join(root,'.preview/drawing'),[plugin]);
const sessions=new Map();
const db=path.join(root,'.preview/test-data.json');let data={};try{data=JSON.parse(await readFile(db,'utf8'));}catch{}
const repository=createRepository({get:async k=>structuredClone(k==null?data:{[k]:data[k]}),set:async v=>{const next={...data,...structuredClone(v)};await writeFile(db,JSON.stringify(next,null,2));data=next;}});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
for(const port of [8788,8789,8790]){
 http.createServer(async(req,res)=>{try{
  if(req.method==='POST'&&req.url==='/test-api'){
   if(req.headers.origin!==`http://127.0.0.1:${port}`)throw Error('Development origin required.');
   let body='';for await(const part of req){body+=part;if(body.length>30*1024*1024)throw Error('Too large');}
   let result;try{
    let m=JSON.parse(body),value;
    if(m.type==='review')value=await new Promise((resolve,reject)=>{
      const child=spawn(process.env.STUDY_KEYS_PYTHON||'python3',[path.join(root,'native/review_fixture.py')],{cwd:root});let out='',err='';
      child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);
      child.on('error',reject);child.on('close',async code=>{if(code)reject(Error(err.split('\n').filter(Boolean).at(-1)));else try{
        const result=JSON.parse(out);resolve(result.remote?await remoteImage(result.remote):result);
      }catch(e){reject(e);}});
      child.stdin.end(JSON.stringify(m));
    });
    else if(m.type==='openNotebook'){const session=crypto.randomUUID();sessions.set(session,{url:m.url,title:m.title});value={session,layout:data['notebook-layout'],src:`http://127.0.0.1:${port}/notebook.html?session=${session}`};}
    else if(m.type==='previewNavigationGet')value={[m.key]:data[m.key]};
    else if(m.type==='previewNavigationSet'){data={...data,...m.values};await writeFile(db,JSON.stringify(data,null,2));value={};}
    else{if(m.type==='notebookRequest'){const scope=sessions.get(m.session);if(!scope)throw Error('Reopen the preview notebook');m={...m,type:m.action,...scope};}value=await repository(m);}
    result={ok:true,value};}catch(e){result={ok:false,error:e.message};}
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));return;
  }
  const pathname=new URL(req.url,`http://127.0.0.1:${port}`).pathname;
  let file=pathname==='/'?path.join(root,'fixtures',port===8788?'docs.html':port===8789?'blog.html':'app.html'):path.join(root,pathname.slice(1));
  if(['/content.js','/library.js','/review-media.js'].includes(pathname))file=path.join(root,'.preview',pathname.slice(1));
  if(pathname.startsWith('/drawing/'))file=path.join(root,'.preview',pathname.slice(1));
  if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  let body=await readFile(file);
  if(path.extname(file)==='.html'&&new URL(req.url,`http://127.0.0.1:${port}`).searchParams.has('installed'))body=Buffer.from(body.toString().replace('<script src="/content.js"></script>','').replace('not the installed extension','installed extension test (no preview script)'));
  if(path.extname(file)==='.html'&&new URL(req.url,`http://127.0.0.1:${port}`).searchParams.has('isolated'))body=Buffer.from(body.toString().replace(/<script src="\/?content.js"><\/script>/,`<button id="start-preview" onclick="const s=document.createElement('script');s.src='/content.js';document.body.append(s);this.remove()">Start isolated preview (put installed extension in Insert mode first)</button>`));
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch(e){res.writeHead(404);res.end(e.message);}}).listen(port,'127.0.0.1');
}
console.log('Isolated preview fixtures: http://127.0.0.1:8788 (docs), :8789 (blog), :8790 (dynamic app). Local test data only.');
