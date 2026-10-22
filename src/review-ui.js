import {request} from './transport.js';
import {reviewDocument} from './document-context.js';
import {changedLines,makePrompt,sourceHash,reviewEditorCommand} from './review-model.js';
import {renderDocument,renderLines,loadReviewMedia,locationForSelection} from './review-render.js';
import {stampVersion,renderRichDiff} from './review-diff.js';
import {reviewDrafts} from './review-drafts.js';

let session=null;
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,run)=>{const n=node('button',text);n.type='button';n.onclick=run;return n;};
const call=(action,extra={})=>request({type:'review',action,url:reviewDocument(),...extra});
const versionsFor=data=>({before:{source:data.git?.index??data.document.source,hash:data.git?.indexHash??data.document.hash},after:data.document});
async function renderedReview(target,data,onlyChanges=false){
  const versions=versionsFor(data),html=/\.html?$/i.test(data.document.path),cache=new Map();
  const loadAsset=side=>ref=>{
    const key=side+':'+ref;if(cache.has(key))return cache.get(key);
    const promise=(async()=>{
      let value=await call('reviewAsset',{ref,side});if(value.data||value.missing)return value;
      const chunks=[value.chunk],hash=value.hash,mime=value.mime;
      while(value.next!=null){value=await call('reviewAsset',{ref,side,offset:value.next});chunks.push(value.chunk);}
      return {data:'data:'+mime+';base64,'+chunks.join(''),hash};
    })();cache.set(key,promise);return promise;
  };
  const after=node('div');renderDocument(after,versions.after.source,html);stampVersion(after,'after',versions.after);
  await loadReviewMedia(after,loadAsset('after'));
  if(!data.git){target.replaceChildren(...after.childNodes);return;}
  const before=node('div');renderDocument(before,versions.before.source,html);stampVersion(before,'before',versions.before);
  await loadReviewMedia(before,loadAsset('before'));
  const changes=renderRichDiff(target,before,after,{onlyChanges});
  if(onlyChanges&&!changes)target.append(node('p','No unstaged changes in this document.'));
}

export async function prepareReview(){
  if(!reviewDocument())return;
  const status=document.querySelector('#review-status'),controls=document.querySelector('#review-controls');
  const title=document.querySelector('#review-title');
  title.textContent=decodeURIComponent(new URL(reviewDocument()).pathname).split('/').at(-1);
  document.title=title.textContent+' · Study Keys Review';
  // Only this packaged extension page can grant read access. The file's HTML
  // is parsed as data later; scripts and styles never run in this origin.
  while(!session){
    try{
      const data=await call('reviewLoad');
      if(!data.needsGrant){session=data;break;}
      status.textContent=`Allow reading this document and its referenced images:\n${data.path}\nComments are saved in ~/.study-keys. Your source is not edited.`;
      await new Promise(resolve=>{
        controls.replaceChildren(button('Allow this document',async()=>{
          try{session=await call('reviewGrant');resolve();}catch(e){status.textContent=e.message;}
        }),button('Open original',()=>location.href=reviewDocument()));
      });
    }catch(e){
      status.textContent=e.message+'\nUpdate the Study Keys local helper, then retry.';
      await new Promise(resolve=>controls.replaceChildren(button('Retry connection',resolve)));
    }
  }
  await renderedReview(document.querySelector('#review-document'),session);
}

export function createReviewUI({surface,openDialog,closeDialog,clearMode,say,beginBlocks,getSelectionState,setDialogKey}){
  if(!session)return null;
  let data=session,state=data.state,sidebar=null,view='rendered',versions=versionsFor(data),
      queue=Promise.resolve(),draftTimer,selectedId=null,polling=false,selectionComment=false,saveError=null,staging=false,renderNumber=0;
  const doc=document.querySelector('#review-document'),controls=document.querySelector('#review-controls'),
    status=document.querySelector('#review-status'),drafts=reviewDrafts(localStorage,data.document.url);
  const run=fn=>Promise.resolve().then(fn).catch(e=>{say(e.message);status.textContent=e.message;});
  const openComments=()=>state.comments.filter(c=>c.status==='open');
  function updateStatus(extra=''){
    status.textContent=`${state.comments.length} comments · ${openComments().length} open · Saved locally${data.git?' · Unstaged: green additions / red deletions':''}${extra?' · '+extra:''}`;
  }
  function persist(){
    queue=queue.catch(()=>{}).then(async()=>{
      try{
        const result=await call('reviewSave',{state:structuredClone(state),expected:state.revision});
        state.revision=result.state.revision;saveError=null;updateStatus();return result;
      }catch(e){saveError=e;throw e;}
    });
    return queue;
  }
  function keepDraft(draft){
    const previous=state.draft;
    state.draft=draft;
    try{if(draft)drafts.put(draft);else if(previous)drafts.remove(previous.id);}catch(e){status.textContent='Draft cache unavailable; saving to the local helper. '+e.message;}
    clearTimeout(draftTimer);draftTimer=setTimeout(()=>run(persist),450);
  }
  try{
    const recovered=drafts.list(),matching=recovered.find(d=>d.id===state.draft?.id);
    if(matching||!state.draft)state.draft=matching||recovered[0]||null;
  }catch{}
  async function render(){
    const number=++renderNumber,target=node('div');
    clearMode();
    versions=versionsFor(data);
    if(view==='source'){
      const rows=data.git?changedLines(versions.before.source,versions.after.source):
        data.document.source.split(/\r?\n/).map((text,i)=>({text,newLine:i+1,change:'same'}));
      renderLines(target,rows,
        versions.before,versions.after);
    }else await renderedReview(target,data,view==='changes'&&!!data.git);
    if(number!==renderNumber)return;
    doc.replaceChildren(...target.childNodes);
    renderControls();updateStatus();
  }
  function renderControls(){
    controls.replaceChildren();
    for(const [id,text] of [['rendered','Read'],['source','Source'],...(data.git?[['changes','Changes only']]:[])]){
      const b=button(text,()=>run(async()=>{view=id;await render();}));b.setAttribute('aria-pressed',String(view===id));controls.append(b);
    }
    if(data.git){const stage=button(staging?'Staging…':'Stage file · Space r g',()=>run(stageFile));stage.disabled=staging;
      stage.title='git add — only this document, including all its current changes';controls.append(stage);}
    controls.append(button(`Comments (${openComments().length})`,toggleSidebar),
      button('Add comment · C',()=>comment()),button('Copy handoff',()=>run(copyHandoff)),
      button('Load latest',()=>run(latest)),button('Original ↗',()=>request({type:'navigate',action:'open',target:data.document.url,newTab:true})),
      button('Revoke source access',()=>run(async()=>{
        await persist();await call('reviewRevoke');location.reload();
      })));
  }
  function renderSidebar(){
    if(!sidebar)return;
    sidebar.replaceChildren();
    const header=node('div',null,'row');
    header.append(node('h2','Review comments','grow'),button('Close',toggleSidebar));sidebar.append(header);
    sidebar.append(node('p','y copies the agent handoff · j / k choose · Enter opens · a resolves · u reopens · Esc closes','muted'));
    sidebar.append(button('Copy handoff · y',()=>run(copyHandoff)));
    if(state.rounds.length)sidebar.append(button('View last handoff',()=>showHandoff(state.rounds.at(-1))));
    if(state.draft)sidebar.append(button('Resume comment draft',()=>comment(null,true)));
    for(const d of drafts.list().filter(d=>d.id!==state.draft?.id)){
      sidebar.append(button('Recover draft · '+d.text.slice(0,60),()=>edit(d)));
    }
    if(!state.comments.length)sidebar.append(node('p','Select a passage with v, then c to comment. C adds a comment about the whole file.'));
    for(const c of state.comments){
      const card=node('section',null,'review-comment');card.dataset.id=c.id;card.dataset.selected=String(c.id===selectedId);
      const jump=button(`${c.status==='resolved'?'✓ ':'○ '}${c.line?`Lines ${c.line}–${c.endLine}`:'Whole document'}`,()=>reveal(c));
      card.append(jump);
      if(c.quote)card.append(node('blockquote',c.quote));
      card.append(node('p',c.text),button('Edit',()=>edit(c)),button(c.status==='open'?'Resolve':'Reopen',()=>run(()=>setStatus(c,c.status==='open'?'resolved':'open'))));
      sidebar.append(card);
    }
  }
  function toggleSidebar(){
    if(sidebar){sidebar.remove();sidebar=null;document.body.removeAttribute('data-review-comments');doc.focus({preventScroll:true});return;}
    clearMode();sidebar=node('aside',null,'review-drawer');sidebar.tabIndex=0;sidebar.setAttribute('aria-label','Document review comments');
    sidebar.onkeydown=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
      const direct=sidebar.getRootNode().activeElement===sidebar;
      if(e.key==='Enter'&&!direct)return;
      if(['Escape','y','j','k','Enter','a','u'].includes(e.key)){
        e.preventDefault();e.stopImmediatePropagation();
        if(e.key==='Escape')return toggleSidebar();
        if(e.key==='y')return run(copyHandoff);
        const at=Math.max(0,state.comments.findIndex(c=>c.id===selectedId));
        if(e.key==='j'||e.key==='k'){selectedId=state.comments[Math.max(0,Math.min(state.comments.length-1,at+(e.key==='j'?1:-1)))]?.id;renderSidebar();sidebar.querySelector('[data-selected=true]')?.scrollIntoView({block:'nearest'});}
        const c=state.comments.find(c=>c.id===selectedId)||state.comments[0];
        if(c&&e.key==='Enter')reveal(c);
        if(c&&['a','u'].includes(e.key))run(()=>setStatus(c,e.key==='a'?'resolved':'open'));
      }
    };
    document.body.setAttribute('data-review-comments','');surface.append(sidebar);renderSidebar();sidebar.focus();
  }
  function reveal(c){
    selectedId=c.id;
    const all=[...doc.querySelectorAll('[data-source-start]')];
    doc.querySelectorAll('[data-current-comment]').forEach(n=>delete n.dataset.currentComment);
    // Never pretend old coordinates are current coordinates.
    const candidates=c.hash===data.document.hash?all.filter(n=>+n.dataset.sourceStart<=c.line&&+n.dataset.sourceEnd>=c.line):
      all.filter(n=>c.quote&&n.textContent.includes(c.quote));
    const target=candidates.sort((a,b)=>a.textContent.length-b.textContent.length)[0];
    if(target){target.dataset.currentComment='';target.scrollIntoView({block:'center'});}
    else say('This passage has changed. Its original quote is saved with the comment.');
    renderSidebar();
  }
  function comment(selection=null,resume=false){
    let anchor;
    if(state.draft&&(resume||state.draft.text?.trim())){edit(state.draft);return;}
    try{anchor=locationForSelection(selection?.index,selection?.pending,data,versions);}catch(e){say(e.message);return;}
    edit({id:crypto.randomUUID(),...anchor,text:'',status:'open',createdAt:Date.now()});
  }
  function edit(comment){
    if(state.draft?.text?.trim()&&state.draft.id!==comment.id){
      say('Finish or discard the saved draft before starting another comment.');
      comment=state.draft;
    }
    const box=openDialog(comment.text?'Edit review comment':'Add review comment');if(!box)return;
    const draft={...comment},input=node('textarea');
    input.setAttribute('aria-label','Review comment');input.placeholder='What should the agent change, and why?';input.rows=6;input.maxLength=100000;input.value=draft.text;
    box.append(node('p',draft.line?`Source lines ${draft.line}–${draft.endLine} · ${draft.quality}`:'Whole-document comment','muted'));
    if(draft.quote)box.append(node('blockquote',draft.quote,'review-quote'));
    const message=node('p','Ctrl+Enter saves · Ctrl+C returns to navigation with your draft kept','muted');
    let saving=false;
    const save=async()=>{
      if(saving)return;
      if(!input.value.trim())return say('Write a comment before saving.');
      saving=true;
      clearTimeout(draftTimer);
      const item={...draft,text:input.value.trim(),updatedAt:Date.now()};
      const old=state.comments.find(c=>c.id===item.id);
      state.comments=state.comments.filter(c=>c.id!==item.id).concat(item);
      state.draft=null;
      try{
        await persist();
        // Cache cleanup must never roll back an already committed comment.
        try{drafts.remove(item.id);}catch{}
        closeDialog(true);selectedId=item.id;renderControls();renderSidebar();say('Review comment saved');
      }
      catch(e){state.comments=state.comments.filter(c=>c.id!==item.id);if(old)state.comments.push(old);state.draft=item;message.textContent=e.message;}
      finally{saving=false;}
    };
    input.oninput=()=>keepDraft({...draft,text:input.value});
    setDialogKey(e=>{
      const command=reviewEditorCommand(e);
      if(command==='save'){e.preventDefault();run(save);}
      if(command==='leave'){e.preventDefault();keepDraft({...draft,text:input.value});closeDialog(true);say('Draft kept · Space r c to resume');}
    });
    box.append(input,message,button('Save comment',()=>run(save)),button('Discard draft',()=>{
      keepDraft(null);closeDialog(true);renderSidebar();
    }));input.focus();keepDraft(draft);
  }
  async function setStatus(c,value){
    const before=c.status;c.status=value;
    try{await persist();renderSidebar();renderControls();}catch(e){c.status=before;throw e;}
  }
  async function copyHandoff(){
    clearTimeout(draftTimer);await persist();
    if(state.draft?.text?.trim())throw Error('Save or discard your comment draft before copying the handoff.');
    const signature=await sourceHash(JSON.stringify({format:2,comments:state.comments}));
    let round=state.rounds.at(-1);
    if(round?.signature!==signature){
      round={id:crypto.randomUUID(),number:state.rounds.length+1,hash:data.document.hash,signature,
        createdAt:Date.now(),prompt:makePrompt(data,state.comments,state.rounds.length+1)};
      state.rounds.push(round);
      try{await persist();}catch(e){state.rounds.pop();throw e;}
      data.previous=data.document.source;data.previousHash=data.document.hash;
    }
    try{await navigator.clipboard.writeText(round.prompt);}
    catch{showHandoff(round,'Clipboard access is unavailable. Copy the selected text or download the prompt.');return;}
    updateStatus('Handoff '+round.number+' copied');say('Agent prompt copied · round '+round.number+' saved');renderSidebar();
  }
  function showHandoff(round,message='This saved handoff is unchanged from the moment you created it.'){
    const box=openDialog('Agent handoff · round '+round.number);if(!box)return;
    const input=node('textarea');input.readOnly=true;input.value=round.prompt;input.rows=12;input.setAttribute('aria-label','Agent handoff');
    const status=node('p',message,'muted');
    box.append(status,input,button('Copy prompt',async()=>{
      try{await navigator.clipboard.writeText(round.prompt);status.textContent='Copied.';}
      catch{status.textContent='Press Cmd+C / Ctrl+C to copy the selected prompt.';input.focus();input.select();}
    }),button('Download prompt',()=>{
      const url=URL.createObjectURL(new Blob([round.prompt],{type:'text/markdown;charset=utf-8'})),a=node('a');
      a.href=url;a.download='study-keys-review-round-'+round.number+'.md';box.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }),button('Close',()=>closeDialog(true)));
    input.focus();input.select();
  }
  async function latest(){
    clearTimeout(draftTimer);
    if(!saveError)await persist();else await queue.catch(()=>{});
    const draft=state.draft;
    const fresh=await call('reviewLoad');
    if(fresh.needsGrant)throw Error('Document access was revoked. Reload to allow this file again.');
    if(fresh.state.draft?.text?.trim())try{drafts.put(fresh.state.draft);}catch{}
    const changed=fresh.document.hash!==data.document.hash;
    data=fresh;state=fresh.state;session=fresh;saveError=null;
    if(draft){state.draft=draft;await persist();}
    if(!data.git&&view==='changes')view='rendered';
    await render();renderSidebar();say(changed?'Latest revision loaded. Original comment locations are preserved.':'You have the latest revision.');
  }
  async function stageFile(){
    if(!data.git||staging)return;
    staging=true;renderControls();
    try{
      const result=await call('reviewStage');
      if(result.staged){await latest();say('Staged this file. Other files were not staged.');}
    }finally{staging=false;renderControls();}
  }
  function stepComment(direction){
    const i=state.comments.findIndex(c=>c.id===selectedId);
    const c=state.comments[(i+direction+state.comments.length)%state.comments.length];if(c)reveal(c);
  }
  function stepChange(direction){
    if(!data.git)return;
    const changes=[...doc.querySelectorAll('[data-change=add],[data-change=delete]')];
    const match=direction>0?changes.find(n=>n.getBoundingClientRect().top>60):changes.filter(n=>n.getBoundingClientRect().top<0).at(-1);
    match?.scrollIntoView({block:'center'});
  }
  renderControls();updateStatus();
  if(state.draft?.text)say('An unfinished review comment is saved. Space r c resumes it.');
  setInterval(async()=>{
    if(document.hidden||polling)return;polling=true;
    try{const probe=await call('reviewProbe');if(probe.hash!==data.document.hash)updateStatus('New revision available · Load latest when ready');}catch(e){status.textContent=e.message;}finally{polling=false;}
  },10000);
  window.addEventListener('pagehide',()=>{if(state.draft)try{drafts.put(state.draft);}catch{}});
  const commands=[
    ...[['r','Resume document review',()=>{if(!sidebar)toggleSidebar();}],
      ['c','Toggle review comments',toggleSidebar],['y','Copy review handoff',()=>run(copyHandoff)],
      ...(data.git?[
        ['d','Toggle unstaged changes only',()=>run(async()=>{view=view==='changes'?'rendered':'changes';await render();})],
        ['g','Stage this file',()=>run(stageFile)],
      ]:[]),
      ['v','Toggle rendered / source',()=>run(async()=>{view=view==='source'?'rendered':'source';await render();})],
      ['e','Load latest revision',()=>run(latest)],
      ['a','Resolve selected review comment',()=>{const c=state.comments.find(c=>c.id===selectedId);if(c)run(()=>setStatus(c,'resolved'));}],
      ['u','Reopen selected review comment',()=>{const c=state.comments.find(c=>c.id===selectedId);if(c)run(()=>setStatus(c,'open'));}],
    ].map(([key,label,run])=>({keys:['Space','r',key],label,run})),
    {keys:['c'],label:'Comment on paragraphs · choose start and end labels',run:()=>{beginBlocks('paragraph');selectionComment=true;}},
    {keys:['C'],label:'Add a whole-document review comment',run:()=>comment()},
    ...[[']',1],['[',-1]].flatMap(([key,direction])=>[
      {keys:[key,'r'],label:direction>0?'Next review comment':'Previous review comment',run:()=>stepComment(direction)},
      {keys:[key,'c'],label:direction>0?'Next change':'Previous change',run:()=>stepChange(direction)}]),
  ];
  return {commands,closeSidebar:()=>{if(sidebar)toggleSidebar();},comment:()=>comment(getSelectionState()),
    afterSelection:()=>{if(selectionComment){selectionComment=false;comment(getSelectionState());}},
    cancel:()=>{selectionComment=false;}};
}
