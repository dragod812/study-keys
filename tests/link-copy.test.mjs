import test from 'node:test';
import assert from 'node:assert/strict';
import {wordCodePool} from '../src/selection-dom.js';
import {copyableURL,createLinkCollection} from '../src/link-copy.js';
test('copied destinations resolve relative URLs but preserve the full query and fragment',()=>{
 assert.equal(copyableURL('../guide?order=2&utm_source=example#part','https://example.com/docs/one'),'https://example.com/guide?order=2&utm_source=example#part');
 assert.equal(copyableURL('#chapter','https://example.com/docs'),'https://example.com/docs#chapter');
 assert.equal(copyableURL('mailto:hello@example.com','https://example.com/'),'mailto:hello@example.com');
 for(const value of ['', 'javascript:alert(1)','data:text/plain,secret','blob:https://example.com/id'])assert.equal(copyableURL(value,'https://example.com/'),null);
});
test('multiple links copy in chosen order, deduplicate, and only commit successful clipboard writes',async()=>{
 const writes=[];let fail=false;const list=createLinkCollection(async text=>{if(fail)throw Error('Clipboard blocked');writes.push(text);});
 await list.copy('https://example.com/b');await list.copy('https://example.com/a#part');
 assert.equal(writes.at(-1),'https://example.com/b\nhttps://example.com/a#part');
 assert.deepEqual(await list.copy('https://example.com/b'),{count:2,duplicate:true});
 assert.equal(list.urls.length,2);fail=true;
 await assert.rejects(list.copy('https://example.com/failed'),/blocked/);assert.equal(list.has('https://example.com/failed'),false);
 fail=false;await list.copy('https://example.com/retry');assert.equal(list.urls.length,3);
 assert.deepEqual(createLinkCollection(async()=>{}).urls,[]);
});
test('an in-flight clipboard write cannot race another write or expose uncommitted links',async()=>{
 let finish;const list=createLinkCollection(()=>new Promise(r=>finish=r));const first=list.copy('https://example.com/first');
 assert.equal(list.has('https://example.com/first'),false);await assert.rejects(list.copy('https://example.com/second'),/progress/);
 finish();await first;assert.deepEqual(list.urls,['https://example.com/first']);
});

test('short link labels remain stable and prefix-free as more links appear',()=>{
 const next=wordCodePool(6,1),codes=Array.from({length:700},()=>next());
 assert.equal(codes[0].length,1);assert.equal(new Set(codes).size,codes.length);
 for(const code of codes)assert.equal(codes.some(other=>other!==code&&other.startsWith(code)),false);
});
