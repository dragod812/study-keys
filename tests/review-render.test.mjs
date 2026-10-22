import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {renderDocument,loadReviewMedia,locationForSelection} from '../src/review-render.js';
import {renderRichDiff,stampVersion} from '../src/review-diff.js';
import {reviewAnnotationAnchor,resolveReviewAnnotation} from '../src/review-anchors.js';

function dom(){const {document,Node}=parseHTML('<html><body></body></html>');Object.assign(globalThis,{document,Node,
  location:{href:'file:///tmp/Notes.md'},chrome:{}});return document;}
function rendered(source,side='after',html=false){
  const root=document.createElement('main');renderDocument(root,source,html);stampVersion(root,side,{hash:side});return root;
}
test('rendered diff keeps Markdown structure, colors only changed words, and marks removed text',()=>{
  dom();const out=document.createElement('main');
  renderRichDiff(out,rendered('# Quotas\n\nKeep the **old** limit.\n\n- One\n- Two\n','before'),
    rendered('# Quotas\n\nKeep the **new** limit.\n\n- One\n- Two\n'));
  assert.equal(out.querySelector('h1').textContent,'Quotas');
  assert.equal(out.querySelector('[data-change=delete]').textContent,'old');
  assert.equal(out.querySelector('[data-change=add]').textContent,'new');
  assert.equal(out.querySelectorAll('li').length,2);
  assert.equal(out.querySelector('[data-change=delete]').dataset.sourceSide,'before');
  assert.equal(out.querySelector('[data-change=add]').dataset.sourceStart,'3');
});
test('plain word diff and changes-only retain context within changed paragraphs',()=>{
  dom();const out=document.createElement('main');
  renderRichDiff(out,rendered('# Same\n\nThis remains.\n\nUse four workers.\n','before'),
    rendered('# Same\n\nThis remains.\n\nUse eight workers.\n'),{onlyChanges:true});
  assert.equal(out.querySelectorAll('p').length,1);
  assert.equal(out.textContent.trim(),'Use foureight workers.');
  assert.equal(out.querySelector('[data-change=delete]').textContent,'four');
  assert.equal(out.querySelector('[data-change=add]').textContent,'eight');
});
test('images and Mermaid are rendered media with old/new change boundaries',async()=>{
  dom();const out=document.createElement('main');
  const old=rendered('![plan](diagram.svg)\n\n```mermaid\ngraph LR\n A --> B\n```','before');
  const next=rendered('![plan](diagram.svg)\n\n```mermaid\ngraph LR\n A --> C\n```');
  await loadReviewMedia(old,async()=>({data:'data:image/png;base64,b2xk',hash:'old'}));
  await loadReviewMedia(next,async()=>({data:'data:image/png;base64,bmV3',hash:'new'}));
  // The browser-only Mermaid module is tested in the real browser. Unit tests
  // still verify its source, mapping and replacement boundaries on fallback.
  assert.equal(old.querySelector('[data-review-media=mermaid]').dataset.sourceStart,'3');
  renderRichDiff(out,old,next);
  const images=[...out.querySelectorAll('[data-review-media=image]')];
  assert.equal(images.length,2);
  assert.deepEqual(images.map(n=>n.closest('[data-change]').dataset.change),['delete','add']);
  assert.ok(images.every(n=>n.querySelector('img')));
  assert.equal(out.querySelectorAll('[data-review-media=mermaid]').length,2);
});
test('safe HTML renders SVG and Mermaid sources without executing document code',async()=>{
  dom();const root=rendered('<script>evil()</script><style>body{display:none}</style><h1>Report</h1><svg onload="evil()"><text>Diagram</text></svg><pre class="mermaid">graph LR; A-->B</pre><img src="chart.png" onerror="evil()">','after',true);
  await loadReviewMedia(root,async()=>({data:'data:image/png;base64,eA==',hash:'x'}));
  assert.equal(root.querySelectorAll('script,style,svg,[onerror],[onload]').length,0);
  assert.equal(root.querySelector('[data-review-media=svg] img').src.startsWith('data:image/svg+xml'),true);
  assert.equal(root.querySelectorAll('[data-review-media]').length,3);
  assert.ok(root.textContent.includes('Report'));
});
test('comments may span removed and current words in one paragraph',()=>{
  dom();const out=document.createElement('main');out.id='review-document';document.body.append(out);
  renderRichDiff(out,rendered('Use four workers.','before'),rendered('Use eight workers.'));
  const points=[];let text='';
  const walk=n=>{if(n.nodeType===3){for(let i=0;i<n.data.length;i++){points.push({node:n,offset:i});text+=n.data[i];}}else for(const c of n.childNodes)walk(c);};walk(out);
  const result=locationForSelection({points,text},{start:0,end:points.length},
    {document:{source:'Use eight workers.',hash:'after'}},
    {before:{source:'Use four workers.',hash:'before'},after:{source:'Use eight workers.',hash:'after'}});
  assert.equal(result.hash,'after');assert.equal(result.line,1);
  assert.equal(result.quote,'Use eight workers.');
  assert.equal(result.quality,'exact');
});

test('Markdown embedded HTML retains images and strips executable content',async()=>{
  dom();const root=rendered('# Notes\n\n<div><script>evil()</script><img src="chart.png" onerror="evil()"><p>Caption</p></div>');
  await loadReviewMedia(root,async()=>({data:'data:image/png;base64,eA==',hash:'x'}));
  assert.equal(root.querySelectorAll('script,[onerror]').length,0);
  assert.ok(root.querySelector('[data-review-media=image] img'));
  assert.equal(root.querySelector('div[data-source-start]').dataset.sourceStart,'3');
});

test('review highlights survive staging and new comparison text',()=>{
  dom();const out=document.createElement('main');
  const indexFor=root=>{
    const points=[];let text='';
    const walk=n=>{if(n.nodeType===3){for(let i=0;i<n.data.length;i++){points.push({node:n,offset:i});text+=n.data[i];}}else for(const c of n.childNodes)walk(c);};
    walk(root);return {points,text};
  };
  renderRichDiff(out,rendered('Use four workers.','before'),rendered('Use eight workers.'));
  const initial=indexFor(out),anchor=reviewAnnotationAnchor(initial,0,initial.text.length);
  assert.equal(anchor.quote.trim(),'Use eight workers.');
  assert.deepEqual([resolveReviewAnnotation(initial,anchor).start,resolveReviewAnnotation(initial,anchor).end],[0,initial.text.length]);
  const staged=indexFor(rendered('Use eight workers.'));
  assert.equal(resolveReviewAnnotation(staged,anchor).end,staged.text.length);
  const oldStart=initial.text.indexOf('four'),deleted=reviewAnnotationAnchor(initial,oldStart,oldStart+4);
  assert.equal(deleted.quote,'four');
  assert.equal(resolveReviewAnnotation(initial,deleted).start,oldStart);
  assert.equal(resolveReviewAnnotation(staged,deleted),null);
});
