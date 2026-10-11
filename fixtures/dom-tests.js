import {linkEntries,linkRect,currentLink} from '/src/link-copy.js';
import {paragraphSpans,sectionSpans,expandScope,selectionText} from '/src/selection-scopes.js';
import {spanRebaser} from '/src/selection-dom.js';
import {buildIndex,fromSelection,wordTokens,pageDialog} from '/src/dom.js';
import {makeAnchor,resolveAnchor} from '/src/core.js';
const root=document.querySelector('#fixture'),results=document.querySelector('#results');let passed=0,failed=0;
function test(name,run){const li=document.createElement('li');try{run();li.textContent='PASS · '+name;li.className='pass';passed++;}catch(e){li.textContent='FAIL · '+name+' · '+e.message;li.className='fail';failed++;}results.append(li);}
function eq(a,b){if(a!==b)throw Error(JSON.stringify(a)+' !== '+JSON.stringify(b));}
root.innerHTML='<p>Alpha <strong>bold</strong> words.\n  More text.</p><p>Another paragraph.</p><a class="block">First link</a><a class="block">Second link</a><p>Line one<br>Line two</p><div class="hidden">Hidden secret</div><textarea>Editor secret</textarea><div contenteditable="true">Editable secret</div><script>Script secret</script><details><summary>Disclosure title</summary><p>Collapsed secret</p></details>';
let index=buildIndex(root);
test('inline markup, block links and line breaks preserve word boundaries',()=>eq(index.text,'Alpha bold words. More text. Another paragraph. First link Second link Line one Line two Disclosure title'));
test('hidden content, closed panels, scripts and editors are excluded',()=>eq(index.text.includes('secret'),false));
test('a range crossing inline markup selects exactly the intended words',()=>{const start=index.text.indexOf('Alpha'),end=index.text.indexOf('. More');eq(index.range(start,end).toString(),'Alpha bold words');});
test('normalized whitespace anchors map back to the source DOM',()=>{const at=index.text.indexOf('More text.');eq(index.range(at,at+10).toString(),'More text.');});
test('mouse selections map to the same normalized word positions',()=>{const at=index.text.indexOf('bold');const selection=getSelection();selection.removeAllRanges();selection.addRange(index.range(at,at+10));const found=fromSelection(index);eq(index.text.slice(found.start,found.end),'bold words');selection.removeAllRanges();});
test('opening details makes its body indexable',()=>{root.querySelector('details').open=true;eq(buildIndex(root).text.includes('Collapsed secret'),true);});
test('bare text inside closed details stays excluded',()=>{const d=document.createElement('details');d.innerHTML='<summary>Summary</summary>Bare secret';root.append(d);eq(buildIndex(root).text.includes('Bare secret'),false);d.remove();});
test('hidden site dialogs do not block keyboard navigation',()=>{const d=document.createElement('div');d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.hidden=true;root.append(d);eq(pageDialog(),undefined);d.hidden=false;eq(pageDialog(),d);d.remove();});
const anchor=makeAnchor(index.text,index.text.indexOf('bold'),index.text.indexOf('. More'));
test('framework replacement and prepended content reanchor the passage',()=>{root.innerHTML='<p>New introductory material.</p>'+root.innerHTML;const changed=buildIndex(root);const match=resolveAnchor(changed.text,anchor);eq(changed.range(match.start,match.end).toString(),'bold words');});
test('Unicode and punctuation keep exact UTF-16 offsets',()=>{root.innerHTML='<p>Naïve café — 東京 👩🏽‍💻. Next</p>';const data=buildIndex(root);for(const token of wordTokens(data.text))eq(data.range(token.start,token.end).toString(),token.word);});
test('selection rebases across unrelated inserted text and retains DOM identity',()=>{
  root.innerHTML='<p id="first">Identical words.</p><p id="second">Identical words.</p>';
  const before=buildIndex(root),span={start:17,end:32};
  root.prepend(document.createTextNode('Advertisement update. '));
  const after=buildIndex(root),found=spanRebaser(before,after)(span);
  eq(after.range(found.start,found.end).startContainer.parentElement.id,'second');
  eq(after.text.slice(found.start,found.end),'Identical words');
});
test('selection follows replaced framework nodes with the same passage',()=>{
  root.innerHTML='<p>Before the target. Unique selected passage. After the target.</p>';
  const before=buildIndex(root),start=before.text.indexOf('Unique'),span={start,end:start+24};
  root.innerHTML='<p>New material.</p>'+root.innerHTML;
  const after=buildIndex(root),found=spanRebaser(before,after)(span);
  eq(after.text.slice(found.start,found.end),'Unique selected passage.');
});
test('removed selected text cannot silently highlight stale offsets',()=>{
  root.innerHTML='<p>Before. Unique selected passage. After.</p>';
  const before=buildIndex(root),start=before.text.indexOf('Unique'),span={start,end:start+24};
  root.querySelector('p').textContent='Before. A different passage. After.';
  eq(spanRebaser(before,buildIndex(root))(span),null);
});
test('ambiguous replacement does not choose another duplicate passage',()=>{
  root.innerHTML='<p>word</p>';
  const before=buildIndex(root);
  root.innerHTML='<p>word</p><p>word</p>';
  eq(spanRebaser(before,buildIndex(root))({start:0,end:4}),null);
});
test('hidden selected text is treated as unavailable',()=>{
  root.innerHTML='<p>Unique selected passage.</p>';
  const before=buildIndex(root);root.querySelector('p').hidden=true;
  eq(spanRebaser(before,buildIndex(root))({start:0,end:24}),null);
});
test('paragraph selection includes inline markup without selecting its neighbors',()=>{
 root.innerHTML='<p>First paragraph.</p><p>Second <strong>bold</strong> paragraph.</p><p>Last paragraph.</p>';
 const data=buildIndex(root),spans=paragraphSpans(data);eq(spans.length,3);eq(data.text.slice(spans[1].start,spans[1].end),'Second bold paragraph.');
 const at=data.text.indexOf('bold'),expanded=expandScope(data,{start:at,end:at+4},'paragraph');eq(expanded.start,spans[1].start);eq(expanded.end,spans[1].end);
});
test('section includes nested headings and stops before its next sibling',()=>{
 root.innerHTML='<article><h1>Title</h1><h2>First section</h2><p>First body.</p><h3>Child</h3><p>Child body.</p><h2>Second section</h2><p>Second body.</p></article><footer>Footer.</footer>';
 const data=buildIndex(root),sections=sectionSpans(data),first=sections.find(s=>s.word==='First section');
 eq(data.text.slice(first.start,first.end),'First section First body. Child Child body.');
 const second=sections.find(s=>s.word==='Second section');eq(data.text.slice(second.start,second.end),'Second section Second body.');
 const at=data.text.indexOf('Child body.'),scope=expandScope(data,{start:at,end:at+11},'section');eq(scope.word,'Child');
});
test('copy preserves paragraphs and line breaks while excluding hidden/editor text',()=>{
 root.innerHTML='<p>First <b>bold</b> paragraph.</p><p>Second line<br>Third line.</p><div hidden>SECRET</div><textarea>PRIVATE INPUT</textarea><script>TRACKING</script>';
 const data=buildIndex(root);eq(selectionText(data,0,data.text.length),'First bold paragraph.\n\nSecond line\nThird line.');
});
test('paragraph expansion covers every paragraph touched by the selection',()=>{
 root.innerHTML='<p>One paragraph.</p><p>Two paragraph.</p><p>Three paragraph.</p>';
 const data=buildIndex(root),at=data.text.indexOf('Two'),scope=expandScope(data,{start:4,end:at+3},'paragraph');
 eq(selectionText(data,scope.start,scope.end),'One paragraph.\n\nTwo paragraph.');
});
test('pages without headings still have paragraphs and copied page text',()=>{
 root.innerHTML='<div>First bare block.</div><div>Second bare block.</div>';
 const data=buildIndex(root);eq(sectionSpans(data).length,0);eq(paragraphSpans(data).length,2);eq(selectionText(data,0,data.text.length),'First bare block.\n\nSecond bare block.');
});
test('large page can be selected for copy without expanding saved-anchor limits',()=>{
 root.innerHTML='<p>'+('Readable word. '.repeat(9000))+'</p>';
 const data=buildIndex(root),span={start:0,end:data.text.length,anchor:makeAnchor(data.text,0,data.text.length,Infinity)};
 eq(selectionText(data,0,data.text.length).length>100000,true);
 root.prepend(document.createTextNode('Background prefix. '));
 const next=buildIndex(root),found=spanRebaser(data,next)(span);eq(next.text.slice(found.start,found.end),span.anchor.quote);
 let rejected=false;try{makeAnchor(data.text,0,data.text.length);}catch{rejected=true;}eq(rejected,true);
});
test('link inventory includes below-fold links and excludes hidden, collapsed, executable and editor links',()=>{
 root.innerHTML='<a href="/visible#part">Visible link</a><a href="/far" style="position:absolute;top:9000px">Far link</a><div hidden><a href="/hidden">Hidden link</a></div><details><summary>Closed</summary><a href="/closed">Closed link</a></details><a href="javascript:void(0)">Script</a><button>Not a link</button><div contenteditable><a href="/editor">Editor</a></div><div style="opacity:0"><a href="/invisible">Invisible</a></div>';
 const links=linkEntries(root);eq(links.map(x=>x.label).join(','),'Visible link,Far link');eq(links[0].url,new URL('/visible#part',location.href).href);
});
test('copy checks the displayed destination still belongs to a connected available link',()=>{
 root.innerHTML='<a href="/original">Changing link</a>';const entry=linkEntries(root)[0];eq(currentLink(entry),entry.url);
 entry.target.href='/different';let failed=false;try{currentLink(entry);}catch{failed=true;}eq(failed,true);
 entry.target.href='/original';root.style.opacity='0';failed=false;try{currentLink(entry);}catch{failed=true;}eq(failed,true);root.style.opacity='';
 entry.target.remove();failed=false;try{currentLink(entry);}catch{failed=true;}eq(failed,true);
});
test('link hints exclude below-fold, obscured and scroll-clipped links',()=>{
 root.innerHTML='<a href="/hint" style="position:fixed;left:40px;top:40px;z-index:10">Visible hint</a><a href="/far" style="position:absolute;top:9000px">Far link</a><div style="position:fixed;left:40px;top:80px;overflow:hidden;height:10px"><a href="/clipped" style="display:block;margin-top:30px">Clipped link</a></div>';
 const entries=linkEntries(root);eq(!!linkRect(entries[0].target),true);eq(linkRect(entries[1].target),null);eq(linkRect(entries[2].target),null);
 const cover=document.createElement('div');cover.style.cssText='position:fixed;left:0;top:0;width:400px;height:70px;z-index:11;background:white';root.append(cover);eq(linkRect(entries[0].target),null);
});
const summary=document.createElement('h2');summary.id='summary';summary.textContent=`${passed} passed, ${failed} failed`;document.body.append(summary);
