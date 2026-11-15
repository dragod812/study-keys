import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {remoteCodeFindings} from './drawing-policy.mjs';
export async function auditPackage(directory){
 const findings=[];
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);
  else if(/\.(?:m?js|html)$/i.test(entry.name)){
   const source=await readFile(file,'utf8');
   // HTML entrypoints may reference only files within the package.
   const labels=entry.name.endsWith('.html')?[...source.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)/gi)].filter(m=>/^(?:https?:)?\/\//.test(m[1])).map(()=> 'remote HTML script'):remoteCodeFindings(source);
   for(const label of labels)findings.push(path.relative(directory,file)+': '+label);
  }
 }}
 await walk(directory);if(findings.length)throw Error('MV3 package audit failed:\n'+findings.join('\n'));
}
