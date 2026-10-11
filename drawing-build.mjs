import {readFile,cp,rm,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
export async function buildDrawing(outdir,plugins=[]) {
await rm(outdir,{recursive:true,force:true});
let patched=0;
const localFonts={name:'offline-fonts',setup(b){b.onLoad({filter:/chunk-.*\.js$/},async args=>{
 if(!args.path.includes('@excalidraw/excalidraw/dist/prod/'))return;
 let contents=await readFile(args.path,'utf8');
 const pattern=/"ASSETS_FALLBACK_URL",`https:\/\/esm\.sh\/.*?\/dist\/prod\/`/g;
 if(!pattern.test(contents))return;
 contents=contents.replace(pattern,()=>{patched++;return '\"ASSETS_FALLBACK_URL\",new URL(\"./drawing/\",location.href).href';});
 return {contents,loader:'js'};
});}};
await build({entryPoints:['src/editor.jsx'],outdir:outdir,bundle:true,format:'esm',splitting:true,minify:true,legalComments:'linked',jsx:'automatic',target:'chrome131',define:{'process.env.NODE_ENV':'"production"'},conditions:['production'],loader:{'.woff2':'file'},assetNames:'assets/[name]-[hash]',chunkNames:'chunks/[name]-[hash]',plugins:[localFonts,...plugins],logLevel:'warning'});
if(patched!==1)throw Error('Verify Excalidraw local font fallback.');
await cp('node_modules/@excalidraw/excalidraw/dist/prod/fonts',path.join(outdir,'fonts'),{recursive:true});
await copyFile('LICENSE-excalidraw.txt',path.join(outdir,'LICENSE-excalidraw.txt'));
}
