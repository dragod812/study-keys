import {buildDrawing} from './drawing-build.mjs';
import {mkdir,copyFile,readFile,readdir,writeFile,cp,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=path.dirname(fileURLToPath(import.meta.url));process.chdir(root);
await mkdir('dist',{recursive:true});
await mkdir('dist/icons',{recursive:true});
for(const size of [16,32,48,128])await copyFile(`icons/${size}.png`,`dist/icons/${size}.png`);
for(const name of ['manifest.json','highlights.css','library.html','library.css','popup.html','panel.html','panel.css','notebook.html','setup.html','setup.css','privacy.html'])await copyFile(name,'dist/'+name);
await build({entryPoints:['src/content.js'],bundle:true,format:'iife',target:'chrome131',outfile:'dist/content.js',loader:{'.css':'text'},logLevel:'warning'});
for(const name of ['background','library','popup','panel','setup'])await build({entryPoints:['src/'+name+'.js'],bundle:true,format:'esm',target:'chrome131',outfile:'dist/'+name+'.js',logLevel:'warning'});
await buildDrawing('dist/drawing');
await mkdir('dist/native',{recursive:true});
for(const name of ['host.py','install.py','library-README.md','library-gitignore'])await copyFile('native/'+name,'dist/native/'+name);
const {zipSync}=await import('fflate');const helperFiles={};
for(const name of ['host.py','install.py','library-README.md','library-gitignore'])helperFiles[name]=new Uint8Array(await readFile('native/'+name));
helperFiles['README.md']=new Uint8Array(await readFile('native/setup-README.md'));
await writeFile('dist/study-keys-local-helper.zip',zipSync(helperFiles));
await copyFile('README.md','dist/README.md');
await cp('third-party','dist/third-party',{recursive:true});
await copyFile('THIRD-PARTY-NOTICES.txt','dist/THIRD-PARTY-NOTICES.txt');
if(process.argv.includes('--zip')){
  const files={};
  async function collect(dir,prefix=''){for(const file of await readdir(dir,{withFileTypes:true})){if(file.isDirectory())await collect(path.join(dir,file.name),prefix+file.name+'/');else files[prefix+file.name]=new Uint8Array(await readFile(path.join(dir,file.name)));}}
  await collect('dist');
  await writeFile('study-keys-chrome.zip',zipSync(files));
}
console.log('Study Keys built: '+path.join(root,'dist'));
