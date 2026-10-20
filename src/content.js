import {COLORS,hintCodes,keyOf,pageKey,supportedPage,makeAnchor,resolveAnchor,score,highlightSegments} from './core.js';
import {buildIndex,fromSelection,wordTokens,visibleRect,owned,available,scrollPane,label,targets,pageDialog} from './dom.js';
import {paragraphSpans,visibleScopes,expandScope,selectionText} from './selection-scopes.js';
import {spanRebaser,wordCodePool} from './selection-dom.js';
import {linkEntries,linkRect,currentLink,createLinkCollection} from './link-copy.js';
import {placeWordLabels} from './label-layout.js';
import {request,watch,connected,onDisconnect} from './transport.js';
import uiCSS from './ui.css';
import {capturePosition,restorePosition} from './mark-dom.js';
import {notebookWindow} from './notebook-window.js';
import {keyboardBoundary} from './key-events.js';
import {createPageLoader} from './page-loader.js';
import {createNavigationUI} from './navigation-ui.js';
import {capture,passages,restoreReading} from './navigation-dom.js';
import {rankEntries} from './navigation-core.js';
import {readAgentPage,agentSelection,revealAgentSection} from './agent-dom.js';
import {shortcutHints} from './shortcut-hints.js';
import {editableFields,activeElement,returnToNormalKey} from './focus.js';
import {toggleMedia} from './media.js';
import {documentURL,reviewDocument} from './document-context.js';
import {prepareReview,createReviewUI} from './review-ui.js';
import {renderDocument} from './review-render.js';
import readerCSS from '../review.css';

// The isolated content-script world owns reading state. Ordinary websites keep
// their text nodes; plain local Markdown and the owned review reader use the
// packaged parser to construct a safe reading view without executing source HTML.
let keyHandler=null,uiOwner=null,uiKeyHandler=null,readerTabId=null;
const releaseKeys=keyboardBoundary(window,{onKey:e=>keyHandler?.(e),ownsUI:e=>!!uiOwner?.(e),onUIKey:e=>uiKeyHandler?.(e)});
async function ready(){
  if(!supportedPage(documentURL())){releaseKeys();return;}
  if(document.querySelector(typeof STUDY_KEYS_PREVIEW!=='undefined'&&STUDY_KEYS_PREVIEW?'[data-study-keys-preview]':'[data-study-keys]')){releaseKeys();return;}
  if(reviewDocument()){
    if(globalThis.chrome?.tabs?.getCurrent)readerTabId=(await chrome.tabs.getCurrent())?.id;
    await prepareReview();
  }
  else if(location.protocol==='file:'&&/\.(md|markdown|mdown|mkd|mkdn)$/i.test(location.pathname)&&document.body.children.length===1&&document.body.firstElementChild?.tagName==='PRE'){
    const source=document.body.firstElementChild.textContent,article=document.createElement('main');article.id='review-document';
    renderDocument(article,source,false);document.body.replaceChildren(article);
    const style=document.createElement('style');style.textContent=readerCSS;document.head.append(style);
  }
  start();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
function start() {
  const host=document.createElement('div');host.dataset.studyKeys='';if(typeof STUDY_KEYS_PREVIEW!=='undefined'&&STUDY_KEYS_PREVIEW)host.dataset.studyKeysPreview='';
  host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;';
  const shadow=host.attachShadow({mode:typeof STUDY_KEYS_PREVIEW!=='undefined'&&STUDY_KEYS_PREVIEW?'open':'closed'}),style=document.createElement('style');style.textContent=uiCSS;
  const surface=document.createElement('div');surface.className='surface';shadow.append(style,surface);document.documentElement.append(host);
  function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  function button(text,run,cls){const n=el('button',text,cls);n.type='button';n.onclick=run;return n;}
  const badge=button('Normal · ?',()=>disconnected?reconnect():help(),'badge'),toast=el('div',null,'toast'),layer=el('div'),which=el('div',null,'which');
  badge.setAttribute('aria-label','Study Keys keyboard help');toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=which.hidden=true;surface.append(badge,toast,layer,which);
  let url=pageKey(documentURL()),items=[],enabled=true,insert=false,disconnected=false,index=null,resolved=new Map();
  let dialog=null,dialogKey=null,previousFocus=null,closeGuard=null,mode=null,bar=null,labels=[],prefix='',startWord=null,pending=null;
  let sequence=[],sequenceTimer,toastTimer,renderTimer,scrollFrame,hover=null,lastPane=null,lastPicker=null,findResults=[],findAt=-1;
  let disposed=false,routeHref=location.href,observed=null;
  let review=null;
  let copySession=null,normalCount='',normalInSiteDialog=false;
  let drawer=null,drawerSearch='',annotationAt=-1,newTabHints=false;
  let writingHighlight=false,selectionMode='visual',markMode=null;
  let indexDirty=false,wordCache=[],nextWordCode=null,layoutTimer=0,scopeMenu=false,blockKind=null;
  const selecting=()=>['start','end','blocks','visual','highlight'].includes(mode);
  const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
  const say=text=>{toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,4500);};
  const attempt=fn=>Promise.resolve().then(fn).catch(e=>say(e.message));
  const notebook=notebookWindow({surface,getPage:()=>({url,title:document.title}),say,clearMode});
  function openNotebook(){if(closeDialog())notebook.open();}
  function updateBadge(){
    const modeLabel=insert?'Insert':markMode?'Mark':mode==='visual'?'Visual':mode==='highlight'?'Highlight':['start','end','blocks'].includes(mode)?selectionMode[0].toUpperCase()+selectionMode.slice(1):'Normal';
    badge.dataset.mode=disconnected?'disconnected':enabled?modeLabel.toLowerCase():'off';
    badge.textContent=disconnected?'Reconnect':enabled?modeLabel+' · ?':'Keys off · ?';
    badge.title=disconnected?'Study Keys updated · Reload to reconnect':`Study Keys · ${enabled?modeLabel+' mode':'Shortcuts off'} · ${items.filter(i=>!i.archived).length} saved · Keyboard help`;
    badge.setAttribute('aria-label',badge.title);if(drawer)renderDrawer();
  }
  function reconnect(){
    const d=openDialog('Reconnect Study Keys');if(!d)return;
    d.append(el('p','Study Keys was updated while this tab was open. Reload this page to reconnect. Your saved highlights, notes and drawings remain in your local library.'),el('p','Finish or copy any unsaved website edits before reloading.'),button('Reload this page',()=>location.reload()));
  }
  function paint(name,ranges){if(CSS.highlights&&globalThis.Highlight)CSS.highlights.set('studykeys-'+name,new Highlight(...ranges));}
  function clearPreview(){CSS.highlights?.delete('studykeys-preview');}
  function resetSequence(){sequence=[];clearTimeout(sequenceTimer);which.hidden=true;}
  function clearMode(){review?.cancel();copySession=null;layer.hidden=false;scopeMenu=false;blockKind=null;clearTimeout(layoutTimer);layoutTimer=0;wordCache=[];nextWordCode=null;indexDirty=false;mode=null;markMode=null;labels=[];prefix='';startWord=null;pending=null;layer.replaceChildren();bar?.remove();bar=null;clearPreview();resetSequence();updateBadge();}
  function focusBack(){if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});}
  function closeDialog(force=false){if(!dialog)return true;if(!force&&closeGuard&&!closeGuard())return false;dialog.close();dialog.remove();dialog=null;dialogKey=null;closeGuard=null;focusBack();return true;}
  function openDialog(title){
    if(!closeDialog())return null;
    clearMode();previousFocus=document.activeElement;dialog=el('dialog');dialog.setAttribute('aria-label',title);
    const header=el('div',null,'row');header.append(el('h2',title,'grow'),button('Esc · Close',()=>closeDialog()));dialog.append(el('p','STUDY KEYS / LOCAL LIBRARY','eyebrow'),header);
    dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});surface.append(dialog);dialog.showModal();return dialog;
  }
  function makeBar(title,description){
    bar?.remove();bar=el('section',null,'bar');bar.setAttribute('aria-label','Study Keys selection');
    const row=el('div',null,'row');row.append(el('strong',title,'grow'),button('Esc',cancel));bar.append(row,el('p',description));surface.append(bar);return row;
  }
  function cancel(){
    if(mode==='copy-links'){
      if(copySession?.busy){copySession.finish=true;layer.hidden=true;renderCopyLabels();return;}
      clearMode();return;
    }
    if(scopeMenu){scopeMenu=false;layer.hidden=false;renderCurrent();return;}
    if(prefix){prefix='';renderLabels();return;}
    if(mode==='blocks'&&startWord){startWord=null;renderLabels();return;}
    if(mode==='end'){mode='start';startWord=null;renderLabels();return;}
    if(mode==='highlight'){mode='visual';selectionMode='visual';renderSelection();return;}
    if(mode==='visual'){clearMode();return;}
    clearMode();
  }
  function selectedIndex(){index=buildIndex();const selection=fromSelection(index);return selection?{...selection,anchor:makeAnchor(index.text,selection.start,selection.end)}:null;}
  function enterPage(next){
    if(next===url)return false;
    url=next;items=[];annotationAt=-1;normalInSiteDialog=false;clearMode();findResults=[];
    clearTimeout(toastTimer);toast.hidden=true;
    restore();if(drawer)renderDrawer();return true;
  }
  const load=createPageLoader({request,href:()=>documentURL(),enter:enterPage,
    apply:data=>{items=data.items;enabled=data.enabled;updateBadge();restore();},
    report:error=>say(error.message)});
  function restore(){
    resolved.clear();for(const c of COLORS)paint(c.id,[]);
    if(!items.some(i=>i.anchor&&!i.archived))return;
    const restoredIndex=buildIndex();
    const groups=Object.fromEntries(COLORS.map(c=>[c.id,[]])),regions=[];
    for(const item of items.filter(i=>!i.archived&&i.anchor)){
      const match=resolveAnchor(restoredIndex.text,item.anchor),range=match&&restoredIndex.range(match.start,match.end);
      if(range){resolved.set(item.id,range);regions.push({...match,color:item.color,updatedAt:item.updatedAt,id:item.id});}
    }
    for(const segment of highlightSegments(regions)){const r=restoredIndex.range(segment.start,segment.end);if(r)groups[segment.color].push(r);}
    for(const c of COLORS)paint(c.id,groups[c.id]);
    if(drawer)renderDrawer();
  }
  async function save(item,base=null,key=url,title=document.title){
    const saved=await request({type:'save',url:key,title,item,base});
    if(key===url){items=items.filter(i=>i.id!==saved.id).concat(saved);updateBadge();restore();}
    return saved;
  }
  function newItem(anchor=null,color='yellow'){return {id:crypto.randomUUID(),anchor,color,note:'',archived:false};}
  async function saveColor(color){
    if(writingHighlight)return;
    if(selecting()&&!refreshSelection(true))return;
    if(!pending){const selection=selectedIndex();if(selection)pending=selection;}
    if(!pending)return say('Press v, choose start and end labels, then a color.');
    if(!canAnnotate())return;
    const anchor=pending.anchor;
    writingHighlight=true;
    try{await save(newItem(anchor,color));clearMode();getSelection()?.removeAllRanges();say(`${COLORS.find(c=>c.id===color).label} saved on this device`);}
    catch(e){say(e.message);}finally{writingHighlight=false;}
  }
  function copyPassage(){if(!refreshSelection(true)||!pending)return;const text=selectionText(index,pending.start,pending.end);attempt(async()=>{await navigator.clipboard.writeText(text);clearMode();say('Selection copied · NORMAL mode');});}
  function canAnnotate(){if(pending?.anchor.quote.length>100000){say('This selection is ready to copy. Select a smaller section to highlight or add a note (100,000 characters maximum).');return false;}return true;}
  function noteSelection(){if(refreshSelection(true)&&canAnnotate())edit(newItem(pending.anchor));}
  function renderSelection(){
    const highlighting=mode==='highlight';
    makeBar(highlighting?'HIGHLIGHT · choose a color':'VISUAL · '+(pending.kind||'passage')+' selected',highlighting?'1–6 save color · n add note · e change end · o change start · Esc visual mode':'y copy · h highlight · n note · p paragraph · s section · a whole page · Space selection menu · Esc normal');
    const row=el('div',null,'row selection-actions');bar.append(row);
    if(highlighting)for(const [i,c]of COLORS.entries()){const b=button(`${i+1} ${c.label}`,()=>saveColor(c.id),'color');b.style.background=c.hex;row.append(b);}
    else row.append(button('h Highlight',()=>{if(canAnnotate()){mode=selectionMode='highlight';renderSelection();}}),button('y Copy',copyPassage));
    row.append(button('n Note',noteSelection),button('Space · Select…',openScopeMenu));
    if(pending.kind==='paragraph')bar.append(el('p','j / k next / previous paragraph · Shift+J / Shift+K extend down / up','muted'));
    if(pending.kind==='page')bar.append(el('p','Loaded readable text, including navigation. Expand collapsed sections first.','muted'));
    if(review)bar.append(button('c · Review comment',()=>review.comment()));
    bar.append(el('p',selectionPreview(),'selected-quote'));
    const range=index.range(pending.start,pending.end);paint('preview',range?[range]:[]);updateBadge();
  }
  function selectionPreview(){const quote=pending.anchor.quote;return quote.length>150?quote.slice(0,100)+' … '+quote.slice(-45):quote;}
  function choosePassage(start,end,kind=null){
    try{pending={start,end,kind,anchor:makeAnchor(index.text,start,end,Infinity)};}catch(e){say(e.message);return;}
    startWord=null;mode=selectionMode;layer.replaceChildren();wordCache=[];labels=[];prefix='';getSelection()?.removeAllRanges();renderSelection();review?.afterSelection();
  }
  const scopeChoices=[
    {key:'w',label:'Words',run:()=>beginWords(null,selectionMode)},
    {key:'t',label:'Sentences',run:()=>beginBlocks('sentence',selectionMode)},
    {key:'p',label:'Paragraphs',run:()=>beginBlocks('paragraph',selectionMode)},
    {key:'s',label:'Heading sections',run:()=>beginBlocks('section',selectionMode)},
    {key:'a',label:'Whole page',run:()=>selectPage(selectionMode)},
  ];
  function renderCurrent(){
    if(['visual','highlight'].includes(mode))renderSelection();
    else {makeBar('VISUAL · Select text','');rebuildLabels();}
  }
  function openScopeMenu(){
    scopeMenu=true;layer.hidden=true;
    makeBar('SELECT · choose a scope','w words · t sentences · p paragraphs · s heading sections · a whole page · Esc back');
    const row=el('div',null,'row selection-actions');
    for(const c of scopeChoices)row.append(button(c.key+' '+c.label,()=>{scopeMenu=false;c.run();}));bar.append(row);
  }
  function beginBlocks(kind,intent='visual'){
    clearMode();layer.hidden=false;selectionMode=intent;blockKind=kind;index=buildIndex();mode='blocks';
    lastPane=scrollPane(hover||document.activeElement);getSelection()?.removeAllRanges();
    makeBar('VISUAL · Choose '+kind,'');rebuildLabels();updateBadge();trackLayout();
    if(!labels.length)say(kind==='section'?'No visible heading sections. Scroll to one, or press Space then a for the page.':'No visible paragraphs. Scroll to readable text.');
  }
  function selectPage(intent='visual'){
    const next=buildIndex();
    if(next.truncated||!next.text.trim()){
      scopeMenu=false;layer.hidden=false;if(selecting())renderCurrent();
      say(next.truncated?'This page is too large to select completely. Select a section instead.':'No readable text on this page.');return;
    }
    clearMode();index=next;selectionMode=intent;choosePassage(0,index.text.length,'page');trackLayout();
  }
  function expandSelection(kind){
    const span=expandScope(index,pending,kind);
    if(!span){say('No enclosing heading section. Use Space then s to choose a section.');return;}
    choosePassage(span.start,span.end,kind);
  }
  function stepParagraph(key){
    const spans=paragraphSpans(index),forward=key.toLowerCase()==='j';
    const next=forward?spans.find(s=>s.start>=pending.end):spans.findLast(s=>s.end<=pending.start);
    if(!next){say(forward?'Last paragraph.':'First paragraph.');return;}
    const extending=key===key.toUpperCase();
    choosePassage(extending?Math.min(pending.start,next.start):next.start,extending?Math.max(pending.end,next.end):next.end,'paragraph');
    next.owner?.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  function beginWords(existing=null,intent='visual'){
    if(!CSS.highlights)return say('This Chrome version cannot render highlights. Update Chrome to use Study Keys.');
    clearMode();selectionMode=intent;index=buildIndex();getSelection()?.removeAllRanges();
    if(index.truncated)say('This very large page is indexed up to 2 million characters.');
    mode=existing?'end':'start';startWord=existing;lastPane=scrollPane(hover||document.activeElement);
    makeBar(selectionMode.toUpperCase()+' · Choose start word','Type a word label · Space: paragraphs / sections / page · ↓ ↑ scroll · Esc cancels');rebuildLabels();updateBadge();trackLayout();
  }
  function refreshSelection(force=false){
    if(pageKey(documentURL())!==url){load();return false;}
    if(!selecting())return false;
    if(!force&&!indexDirty)return true;
    const next=buildIndex(),rebase=spanRebaser(index,next);
    // A whole-page selection denotes a scope, not a frozen quotation. Keep it
    // complete when live counters or newly loaded content change the page.
    if(pending?.kind==='page'&&(next.truncated||!next.text.trim())){
      clearMode();say(next.truncated?'This page is too large to select completely. Select a section instead.':'No readable text remains on this page.');return false;
    }
    const nextStart=startWord&&rebase(startWord),nextPending=pending&&(pending.kind==='page'?{start:0,end:next.text.length}:rebase(pending));
    if((startWord&&!nextStart)||(pending&&!nextPending)){
      clearMode();say('The selected text was removed or changed. Press v to choose another passage.');return false;
    }
    wordCache=wordCache.flatMap(item=>{const span=rebase(item);if(!span)item.tag.remove();return span?[{...item,...span}]:[];});
    if(nextStart)startWord=nextStart;
    if(nextPending)pending={...pending,...nextPending,anchor:makeAnchor(next.text,nextPending.start,nextPending.end,Infinity)};
    index=next;indexDirty=false;
    if(pending){const range=index.range(pending.start,pending.end);paint('preview',range?[range]:[]);const quote=bar?.querySelector('.selected-quote');if(quote)quote.textContent=selectionPreview();}
    return true;
  }
  function trackLayout(){
    clearTimeout(layoutTimer);
    if(document.hidden)return;
    if(mode==='copy-links'){layoutTimer=setTimeout(()=>{rebuildCopyLabels();trackLayout();},120);return;}
    if(!selecting())return;
    layoutTimer=setTimeout(()=>{
      if(refreshSelection()){if(['start','end','blocks'].includes(mode)&&!scopeMenu)rebuildLabels();trackLayout();}
    },120);
  }
  function rebuildLabels(){
    if(!['start','end','blocks'].includes(mode)||scopeMenu)return;
    if(!refreshSelection())return;
    const words=mode==='blocks'?visibleScopes(index,blockKind):wordTokens(index.text).map(t=>({...t,rect:visibleRect(index.range(t.start,t.end))})).filter(t=>t.rect);
    nextWordCode??=wordCodePool(words.length);
    const previous=new Map(wordCache.map(item=>[item.start,item]));
    labels=words.map(word=>{
      let item=previous.get(word.start);
      if(!item||item.end!==word.end){item={...word,code:nextWordCode(),tag:el('span',null,'hint')};wordCache.push(item);layer.append(item.tag);}
      Object.assign(item,word);return item;
    });
    const active=new Set(labels);for(const item of wordCache)if(!active.has(item))item.tag.hidden=true;
    const positions=placeWordLabels(labels,2,innerWidth-3);
    for(const item of labels){
      const tag=item.tag,p=positions.get(item.start);tag.dataset.code=item.code;
      tag.textContent=item.code;tag.setAttribute('aria-label',`${item.code}: ${mode==='blocks'?blockKind+' · ':''}${item.word.slice(0,180)}`);tag.title=item.word.slice(0,180);
      tag.style.left=p.left+'px';tag.style.top=p.top+'px';tag.style.width=p.width+'px';
    }
    renderLabels();
  }
  function renderLabels(){
    if(mode==='copy-links'){renderCopyLabels();return;}
    if(mode==='links'){
      for(const item of labels)item.tag.hidden=!item.code.startsWith(prefix);return;
    }
    if(!['start','end','blocks'].includes(mode)||scopeMenu)return;
    let count=0;
    for(const item of labels){item.tag.hidden=!item.code.startsWith(prefix)||(mode==='end'&&item.start<startWord.start);item.tag.classList.toggle('start',item.start===startWord?.start);if(!item.tag.hidden)count++;}
    const paragraphMode=mode==='blocks'&&['paragraph','sentence'].includes(blockKind);
    const blockPrompt=paragraphMode?(startWord?`Choose end ${blockKind} · from “${index.text.slice(startWord.start,startWord.end).slice(0,35)}”`:`Choose start ${blockKind}`):`Choose ${blockKind}`;
    bar.querySelector('strong').textContent=selectionMode.toUpperCase()+' · '+(mode==='blocks'?`${blockPrompt} ${prefix?'· '+prefix:''}`:mode==='start'?`Choose start word ${prefix?'· '+prefix:''}`:`Choose end word · from “${index.text.slice(startWord.start,startWord.end).slice(0,35)}” ${prefix}`);
    bar.querySelector('p').textContent=count?`${count} labels · ${paragraphMode?(startWord?`Same label selects one ${blockKind} · `:'Choose start, then end · '):''}Space selects sentences / paragraphs / sections · ↑ ↓ scroll · Backspace corrects · Esc back`:`No matching visible ${mode==='blocks'?blockKind+'s':'words'}. Scroll to reveal more, or Backspace to correct.`;
    if(startWord){const remaining=labels.filter(l=>!l.tag.hidden),target=prefix&&remaining.length===1?remaining[0]:startWord;const r=index.range(Math.min(startWord.start,target.start),Math.max(startWord.end,target.end));paint('preview',r?[r]:[]);}else clearPreview();
  }
  function chooseLabel(item){
    if(mode==='copy-links'){copyLabeledLink(item);return;}
    if(mode==='links'){if(available(item.target)){const inNewTab=newTabHints;clearMode();if(inNewTab&&item.target.matches('a[href]'))attempt(()=>request({type:'navigate',action:'open',target:item.target.href,newTab:true}));else activate(item.target);}else{clearMode();say('That control changed. Press f again.');}return;}
    if(mode==='blocks'){
      if(['paragraph','sentence'].includes(blockKind)){
        if(!startWord){startWord=item;lastPane=scrollPane(index.range(item.start,item.end)?.startContainer.parentElement);prefix='';renderLabels();}
        else choosePassage(Math.min(startWord.start,item.start),Math.max(startWord.end,item.end),blockKind);
      }else choosePassage(item.start,item.end,blockKind);
      return;
    }
    if(!visibleRect(index.range(item.start,item.end))){rebuildLabels();say('The page moved. Choose a current label.');return;}
    if(mode==='start'){startWord=item;lastPane=scrollPane(index.range(item.start,item.end)?.startContainer.parentElement);mode='end';prefix='';renderLabels();}
    else choosePassage(startWord.start,item.end);
  }
  function typeLabel(key){
    if(mode==='copy-links'){if(copySession?.finish||(copySession?.busy&&!copySession.multiple))return;rebuildCopyLabels();}
    if(['start','end','blocks'].includes(mode))rebuildLabels();
    if(key==='Backspace'){prefix=prefix.slice(0,-1);renderLabels();return;}
    if(!/^[a-z]$/i.test(key))return;
    const next=prefix+key.toLowerCase(),matching=labels.filter(i=>i.code.startsWith(next)&&(mode!=='end'||i.start>=startWord.start));
    if(!matching.length){prefix='';renderLabels();say('No such label. Type one of the visible labels.');return;}
    prefix=next;const exact=matching.find(i=>i.code===next);if(exact)chooseLabel(exact);else renderLabels();
  }
  function activate(target){
    if(!available(target))return say('That control is no longer available.');
    target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});target.focus({preventScroll:true});lastPane=scrollPane(target);
    if(!target.matches('input:not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable]'))target.click();
  }
  function linkHints(inNewTab=false,fieldsOnly=false){
    clearMode();newTabHints=inNewTab;const found=fieldsOnly?editableFields(true):targets(true).filter(t=>!inNewTab||t.matches('a[href]')),codes=hintCodes(found.length);mode='links';
    labels=found.map((target,i)=>{const rect=target.getBoundingClientRect(),tag=el('span',codes[i],'hint link');tag.style.left=Math.max(2,Math.min(innerWidth-45,rect.left))+'px';tag.style.top=Math.max(2,rect.top)+'px';tag.setAttribute('aria-label',codes[i]+': '+label(target));layer.append(tag);return {target,code:codes[i],tag};});
    makeBar(fieldsOnly?'Focus a text field':'Open a visible control',fieldsOnly?'Type its label · Tab / Shift+Tab move between controls · Ctrl+C returns to Normal':'Type its label · Esc cancels');if(!found.length)say(fieldsOnly?'No visible text fields. Use gi or a count, such as 2gi, to focus a field farther down.':'No visible controls. Press s to search the page.');
  }
  function openPicker(title,entries,query='',remember=true,options={}){
    const box=openDialog(title);if(!box)return;
    if(remember)lastPicker={title,entries,query,options};
    const input=el('input'),list=el('div',null,'results'),count=el('p',null,'muted');
    input.type='search';input.placeholder='Type to narrow…';input.setAttribute('aria-label',title);input.setAttribute('role','combobox');input.setAttribute('aria-expanded','true');input.setAttribute('aria-controls','sk-results');input.autocomplete='off';input.spellcheck=false;input.value=query;
    list.id='sk-results';list.setAttribute('role','listbox');list.setAttribute('aria-label','Results');
    box.append(input,count,list,el('p','Ctrl-j / Ctrl-k or ↑ / ↓ choose · Enter opens · Esc returns','muted'));
    let found=[],at=0,generation=0,delay;
    const actions=el('div',null,'row');
    if(options.pin)actions.append(button('Pin results · Space j / k',()=>attempt(()=>options.onPin(found))));
    if(options.remove)actions.append(button('Remove selected from this list',()=>{if(found[at])attempt(()=>options.remove(found[at]));}));
    box.append(actions);
    function select(next){at=Math.max(0,Math.min(next,found.length-1));[...list.children].forEach((row,i)=>row.setAttribute('aria-selected',String(i===at)));const row=list.children[at];if(row){input.setAttribute('aria-activedescendant',row.id);row.scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
    function choose(i){const result=found[i];if(result){closeDialog(true);attempt(()=>result.run());}}
    async function render(){
      const ticket=++generation,currentQuery=input.value;
      try{
        const data=typeof entries==='function'?await entries(currentQuery):{entries:rankEntries(entries,currentQuery)};
        if(ticket!==generation||!box.isConnected)return;
        found=data.entries.slice(0,150);list.replaceChildren();count.textContent=`${data.entries.length} results${data.entries.length>150?' · narrow to see more':''}`+(data.coverage?' · '+data.coverage:'');
        found.forEach((entry,i)=>{const row=el('div',null,'result');row.id='sk-result-'+i;row.setAttribute('role','option');row.append(el('strong',entry.label),el('span',entry.detail||''));row.onclick=()=>choose(i);list.append(row);});select(0);if(remember&&lastPicker)lastPicker.query=currentQuery;
      }catch(error){if(ticket===generation&&box.isConnected){found=[];list.replaceChildren();count.textContent=error.message;}}
    }
    input.oninput=()=>{generation++;found=[];list.replaceChildren();count.textContent='Searching…';clearTimeout(delay);delay=setTimeout(render,typeof entries==='function'?120:0);};
    dialogKey=e=>{const k=keyOf(e);if(['ArrowDown','Ctrl-j','ArrowUp','Ctrl-k','Enter'].includes(k)){consume(e);if(k==='Enter')choose(at);else select(at+(['ArrowDown','Ctrl-j'].includes(k)?1:-1));}};render();input.focus();
  }
  function writeLinkClipboard(text){
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
    // HTTP pages lack the async Clipboard API. Keep this fallback inside the
    // direct key/click gesture, with no new extension clipboard permission.
    const field=el('textarea');field.value=text;field.readOnly=true;field.tabIndex=-1;field.setAttribute('aria-hidden','true');field.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;';
    const parent=dialog||surface,focused=shadow.activeElement;parent.append(field);
    try{field.focus({preventScroll:true});field.select();if(!document.execCommand('copy'))throw Error('Chrome blocked copying. Focus this page and try the label again.');return Promise.resolve();}
    finally{field.remove();focused?.focus({preventScroll:true});}
  }
  function copyLinks(multiple=false){
    clearMode();getSelection()?.removeAllRanges();mode='copy-links';lastPane=scrollPane(hover||document.activeElement);
    copySession={multiple,collection:createLinkCollection(writeLinkClipboard),cache:new Map(),nextCode:wordCodePool(linkEntries().filter(entry=>linkRect(entry.target)).length,1),busy:false,queued:[],message:''};
    makeBar(multiple?'COPY LINKS · build a list':'COPY LINK · choose a label','');
    bar.classList.add('copy-bar');bar.setAttribute('aria-label','Study Keys copy links');bar.querySelector('p').setAttribute('aria-live','polite');
    rebuildCopyLabels();trackLayout();
  }
  function rebuildCopyLabels(){
    const session=copySession;if(mode!=='copy-links'||!session)return;
    if(session.finish){renderCopyLabels();return;}
    const active=[];
    for(const entry of linkEntries()){
      const rect=linkRect(entry.target);if(!rect)continue;
      let item=session.cache.get(entry.target);
      if(!item||item.url!==entry.url){item?.tag.remove();item={...entry,code:session.nextCode(),tag:el('span',null,'hint link copy-link')};session.cache.set(entry.target,item);layer.append(item.tag);}
      item.rect=rect;item.label=entry.label;active.push(item);
      const copied=session.collection.has(item.url),text=item.code+(copied?' ✓':'');
      if(item.tag.textContent!==text)item.tag.textContent=text;
      item.tag.dataset.code=item.code;item.tag.dataset.copied=String(copied);item.tag.setAttribute('aria-label',item.code+': copy '+item.label+(copied?' · copied':''));item.tag.title=item.label+' · '+item.url;
      item.tag.style.left=Math.max(2,Math.min(innerWidth-48,rect.left))+'px';item.tag.style.top=Math.max(2,rect.top)+'px';
    }
    const visible=new Set(active);for(const item of session.cache.values())if(!visible.has(item))item.tag.hidden=true;
    labels=active;renderCopyLabels();
    // Keep the nonmodal status out of the way of bottom-of-page links when
    // there is more room above. Label hit tests pass through this status bar.
    bar.classList.remove('copy-bar-top');
    const box=bar.getBoundingClientRect(),hits=top=>active.filter(({rect:r})=>r.right>box.left&&r.left<box.right&&r.bottom>top&&r.top<top+box.height).length;
    bar.classList.toggle('copy-bar-top',hits(12)<hits(box.top));
  }
  function renderCopyLabels(){
    const session=copySession;if(!session)return;
    for(const item of labels)item.tag.hidden=!item.code.startsWith(prefix);
    const count=session.collection.urls.length;
    const title=session.finish?'Finishing clipboard list…':session.multiple?`COPY LINKS · ${count} ${count===1?'URL':'URLs'} copied`:'COPY LINK · type a label';
    const heading=title+(prefix?' · '+prefix:'');if(bar.querySelector('strong').textContent!==heading)bar.querySelector('strong').textContent=heading;
    const description=session.finish?'Completing the chosen links before returning to Normal…':(session.busy?'Copying… · ':session.message?session.message+' · ':'')+(labels.length?'Type a link label':'No visible links; scroll to find more')+(session.multiple?' · one URL per line':'')+' · ↑ ↓ scroll · Backspace corrects · Esc finishes';
    if(bar.querySelector('p').textContent!==description)bar.querySelector('p').textContent=description;
  }
  async function copyLabeledLink(item){
    const session=copySession;if(!session)return;
    if(session.busy){if(session.multiple){session.queued.push(item);prefix='';renderCopyLabels();}return;}
    session.busy=true;prefix='';renderCopyLabels();
    try{
      const destination=currentLink(item);if(!linkRect(item.target))throw Error('That link is no longer visible. Choose a current label.');
      if(session.multiple){
        const result=await session.collection.copy(destination);
        session.message=result.duplicate?'Already copied':`Added ${item.label.slice(0,85)}`;
      }else{
        await writeLinkClipboard(destination);
        if(copySession===session){clearMode();say('Link copied · '+destination);}
      }
    }catch(e){if(copySession===session){session.message=e.message||'Copy failed. Try again.';say(session.message);}}
    finally{
      session.busy=false;
      if(copySession===session){
        rebuildCopyLabels();
        if(session.queued.length)copyLabeledLink(session.queued.shift());
        else if(session.finish){const count=session.collection.urls.length;clearMode();say(count?`${count} ${count===1?'URL':'URLs'} on clipboard`:'No links copied');}
      }
    }
  }
  function jump(){openPicker('Jump to a link or control',targets().map(target=>({label:label(target),detail:target.tagName==='A'?'Link · '+target.getAttribute('href'):target.tagName.toLowerCase(),run:()=>activate(target)})));}
  function focus(target){if(!target?.isConnected)return say('This section moved. Search again.');target.scrollIntoView({block:'center',behavior:'instant'});if(!target.hasAttribute('tabindex'))target.tabIndex=-1;target.focus({preventScroll:true});lastPane=scrollPane(target);}
  function outline(){openPicker('Page outline',[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(available).map(h=>({label:h.textContent,detail:`Heading ${h.tagName.slice(1)}`,run:()=>navigation.track(()=>focus(h))})));}
  function find(){
    const blocks=[...document.querySelectorAll('h1,h2,h3,h4,p,li,pre,td,summary')].filter(available).filter(x=>x.innerText?.trim());
    openPicker('Find text on this page',blocks.map(b=>({label:b.innerText.slice(0,280),detail:b.innerText.slice(280,900),run:()=>{findResults=blocks.filter(n=>n.isConnected&&score(n.innerText,lastPicker?.query||'')>=0);findAt=findResults.indexOf(b);focus(b);previewBlock(b);}})));
  }
  function previewBlock(b){const r=document.createRange();r.selectNodeContents(b);paint('preview',[r]);}
  function nextFind(delta){if(!findResults.length)return say('Press / to find text first.');findAt=(findAt+delta+findResults.length)%findResults.length;const b=findResults[findAt];if(!b.isConnected)return say('This page changed. Press / to search again.');focus(b);previewBlock(b);say(`Match ${findAt+1} of ${findResults.length}`);}
  function move(x,y,edge){
    const pane=['start','end','blocks'].includes(mode)?lastPane:scrollPane(hover||document.activeElement);lastPane=pane;
    const height=pane===document.scrollingElement?innerHeight:pane.clientHeight;
    pane.scrollTo({left:pane.scrollLeft+x,top:edge==='start'?0:edge==='end'?pane.scrollHeight:pane.scrollTop+y*height,behavior:'instant'});
  }
  function edit(item=newItem(),existing=false){
    const editURL=url,editTitle=document.title,draft={...item},box=openDialog(existing?'Your annotation':'Add a note');if(!box)return;
    const quote=el('blockquote',draft.anchor?.quote||'Page note — attached to this URL','quote');box.append(quote);
    const palette=el('div',null,'row');
    for(const [i,c]of COLORS.entries()){const b=button(`${i+1} ${c.label}`,()=>{draft.color=c.id;for(const n of palette.children)n.setAttribute('aria-pressed',String(n===b));},'color');b.style.background=c.hex;b.setAttribute('aria-pressed',String(c.id===draft.color));palette.append(b);}
    const input=el('textarea');input.setAttribute('aria-label','Your note');input.placeholder='Connect the idea. Ask a question. Leave a thought for later.';input.value=draft.note;input.maxLength=100000;
    const error=el('p',null,'error'),status=el('p','Saved only on this device. Cmd/Ctrl-Enter saves.','muted'),actions=el('div',null,'row');let saving=false,discardArmed=false;
    closeGuard=()=>{if(saving)return false;if((input.value!==item.note||draft.color!==item.color||!!draft.resolved!==!!item.resolved)&&!discardArmed){discardArmed=true;error.textContent='Unsaved changes. Save, or press Esc again to discard this draft.';return false;}return true;};
    input.oninput=()=>{discardArmed=false;error.textContent='';};
    const saveButton=button('Save note · ⌘/Ctrl ↵',async()=>{
      if(saving)return;saving=true;saveButton.disabled=true;error.textContent='';
      try{draft.note=input.value;await save(draft,existing?item.updatedAt:null,editURL,editTitle);closeDialog(true);say('Note saved on this device');}
      catch(e){error.textContent=e.message;}finally{saving=false;saveButton.disabled=false;}
    },'primary');actions.append(saveButton);
    if(existing){
      actions.append(button('Show passage',()=>{const r=resolved.get(item.id);if(!r){error.textContent='This passage is not currently found. Expand the page content or keep this note for reference.';return;}if(!closeDialog())return;r.startContainer.parentElement.scrollIntoView({block:'center',behavior:'instant'});paint('preview',[r]);}));
      actions.append(button(item.archived?'Restore':'Move to trash',async()=>{try{await save({...item,archived:!item.archived},item.updatedAt,editURL,editTitle);closeDialog(true);say(item.archived?'Annotation restored':'Moved to trash · recover it in the library');}catch(e){error.textContent=e.message;}}));
    }
    const resolvedLabel=el('label'),resolvedCheck=el('input');resolvedCheck.type='checkbox';resolvedCheck.checked=!!draft.resolved;resolvedCheck.onchange=()=>draft.resolved=resolvedCheck.checked;resolvedLabel.append(resolvedCheck,document.createTextNode(' Question resolved'));
    box.append(palette,input,resolvedLabel,status,error,actions);dialogKey=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){consume(e);saveButton.click();}};input.focus();
  }
  function closeDrawer(){drawer?.remove();drawer=null;}
  function pageSidebar(){
    if(drawer){closeDrawer();return;}
    if(review){review.closeSidebar();annotations();return;}
    if(typeof STUDY_KEYS_PREVIEW!=='undefined'&&STUDY_KEYS_PREVIEW)return annotations();
    request({type:'togglePanel'}).then(result=>{if(result.fallback)annotations();}).catch(e=>say(e.message));
  }
  function annotations(){
    if(drawer){closeDrawer();return;}
    clearMode();drawer=el('aside',null,'drawer');drawer.tabIndex=-1;drawer.setAttribute('aria-label','This page’s highlights and notes');
    const header=el('div',null,'row');header.append(el('h2','In the margins','grow'),button('×',closeDrawer));header.lastChild.setAttribute('aria-label','Close page sidebar');
    const input=el('input');input.type='search';input.placeholder='Search this page’s notes…';input.setAttribute('aria-label','Search page annotations');input.value=drawerSearch;input.oninput=()=>{drawerSearch=input.value;renderDrawer();};
    const actions=el('div',null,'row');actions.append(button('+ Page note',()=>edit()),button('Drawing notebook',openNotebook),button('All pages ↗',()=>attempt(()=>request({type:'openLibrary'}))));
    const list=el('div',null,'drawer-list');list.setAttribute('aria-live','polite');drawer.append(el('p','STUDY KEYS / THIS PAGE','eyebrow'),header,el('p','[ h / ] h jump between passages · Esc closes','muted'),input,actions,list);surface.append(drawer);renderDrawer();drawer.focus();
  }
  function showAnnotation(item){
    const r=resolved.get(item.id);if(!r)return say('Passage not found in the current text. Expand collapsed content, or keep the note for reference.');
    r.startContainer.parentElement.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});paint('preview',[r]);
    if(drawer){for(const c of drawer.querySelectorAll('.annotation'))c.classList.toggle('active',c.dataset.id===item.id);}
  }
  function renderDrawer(){
    const list=drawer.querySelector('.drawer-list');if(!list)return;const scroll=list.scrollTop;list.replaceChildren();
    const selected=items.filter(i=>!i.archived&&[i.note,i.anchor?.quote].join(' ').toLowerCase().includes(drawerSearch.toLowerCase())).sort((a,b)=>(a.anchor?.start??Infinity)-(b.anchor?.start??Infinity));
    if(!selected.length)list.append(el('p',drawerSearch?'No matching notes.':'Your highlights and notes will appear here. Press v to begin.','muted'));
    for(const item of selected){
      const card=el('article',null,'annotation');card.dataset.id=item.id;const color=COLORS.find(c=>c.id===item.color);card.style.setProperty('--accent',color.hex);
      const meta=el('div',null,'row');meta.append(el('span',color.label,'tag'));if(item.anchor&&!resolved.has(item.id))meta.append(el('span','Passage not found','unmatched'));
      card.append(meta);
      if(item.anchor){const quote=button(item.anchor.quote,()=>showAnnotation(item),'annotation-quote');quote.setAttribute('aria-label','Jump to passage: '+item.anchor.quote.slice(0,90));card.append(quote);}
      if(item.note)card.append(el('p',item.note,'annotation-note'));
      card.append(button('Edit / add note',()=>edit(item,true)));list.append(card);
    }
    list.scrollTop=scroll;
  }
  function nextAnnotation(delta){const live=items.filter(i=>!i.archived&&resolved.has(i.id)).sort((a,b)=>a.anchor.start-b.anchor.start);if(!live.length)return say('No restored highlights on this page yet.');annotationAt=(annotationAt+delta+live.length)%live.length;showAnnotation(live[annotationAt]);say(`Highlight ${annotationAt+1} of ${live.length}`);}
  function openAddress(newTab=false){
    const box=openDialog(newTab?'Open a URL in a new tab':'Open a URL');if(!box)return;
    const input=el('input');input.type='search';input.placeholder='https://example.com or file:///…/notes.md';input.setAttribute('aria-label','Website or local document URL');const error=el('p',null,'error');
    const go=button('Open',async()=>{try{const target=/^(?:https?|file):\/\//i.test(input.value)?input.value:'https://'+input.value;await request({type:'navigate',action:'open',target,newTab});closeDialog(true);}catch(e){error.textContent=e.message;}},'primary');box.append(input,error,go);input.onkeydown=e=>{if(e.key==='Enter'){consume(e);go.click();}};input.focus();
  }
  function help(){
    const box=openDialog('Keyboard shortcuts');if(!box)return;box.classList.add('help-dialog');
    box.append(el('p','v → choose start + end labels → y copy, h highlight, n note. Space shows available shortcuts.','muted'));
    const tips=el('details',null,'help-tips');tips.append(el('summary','Selection, modes & marks'),el('p','v then Space offers paragraphs, sections and the whole page. Paragraphs use start and end labels; choose the same label twice for one paragraph. After choosing a passage, p expands to paragraphs, s to its enclosing heading section, and a selects the page. y copies with paragraph breaks. NORMAL: navigate. v → labels → VISUAL: h highlights, y copies, n adds a note. Shift+V → labels → HIGHLIGHT: 1–6 saves a color. Esc steps back. ma / '+"'a"+' set / jump to a page mark; mA / '+"'A"+' work across tabs. d labels visible links to copy one URL; Shift+D keeps labels active and builds a clipboard list, one URL per line. Everything stays on this device.','muted'));
    const setting=el('label'),check=el('input');check.type='checkbox';check.checked=enabled;check.onchange=async()=>{try{await request({type:'enabled',url,enabled:check.checked});enabled=check.checked;insert=false;updateBadge();}catch(e){check.checked=enabled;say(e.message);}};setting.append(check,document.createTextNode(' Enable letter shortcuts on '+(location.protocol==='file:'?'this local file':location.hostname)));
    const filter=el('input');filter.type='search';filter.placeholder='Filter keyboard shortcuts…';filter.setAttribute('aria-label','Filter keyboard shortcuts');
    const grid=el('div',null,'keymap');for(const c of commands){const row=el('div');row.append(el('kbd',c.keys.join(' ')),el('span',c.label));grid.append(row);}
    filter.oninput=()=>{for(const row of grid.children)row.hidden=!row.textContent.toLowerCase().includes(filter.value.toLowerCase());};
    const actions=el('div',null,'row');actions.append(button('Drawing notebook',()=>{closeDialog(true);openNotebook();}),button('Local library',()=>attempt(()=>request({type:'openLibrary'}))));
    box.append(setting,filter,grid,tips,el('p','i passes every key to the website. Ctrl+C returns to Normal. Esc closes other modes.','muted'),actions);
  }
  function beginMark(action){clearMode();markMode=action;makeBar(action==='set'?'SET MARK · choose a letter':'JUMP TO MARK · choose a letter','a–z: this page · A–Z: global, across tabs · Esc cancels');updateBadge();}
  function setMark(name){attempt(async()=>{const position=capturePosition(hover||document.activeElement);await request({type:'setMark',url,title:document.title,name,position});say((/^[A-Z]$/.test(name)?'Global':'Page')+' mark '+name+' saved · press '+"'"+name+' to return');});}
  function jumpMark(name){attempt(()=>navigation.track(async()=>{const result=await request({type:'gotoMark',url,name});if(result.mark){lastPane=await restorePosition(result.mark);hover=lastPane;say('Page mark '+name+' · position restored');}}));}
  function markPicker(){attempt(async()=>{const data=await request({type:'marks',url});const entries=[...Object.entries(data.local).map(([name,mark])=>({name,mark,scope:'This page'})),...Object.entries(data.global).map(([name,mark])=>({name,mark,scope:'Global'}))];if(!entries.length)return say('No marks yet. Use ma for this page or mA for a global mark.');openPicker('Jump to a saved mark',entries.map(({name,mark,scope})=>({label:name+' · '+mark.title,detail:scope+' · '+mark.url,run:()=>jumpMark(name)})));});}
  const navigation=createNavigationUI({request,openPicker,openDialog,closeDialog,el,button,say,paint,consume,attempt,setDialogKey:fn=>dialogKey=fn,seed:()=>hover||document.activeElement,readingBounds:()=>({bottom:bar?bar.getBoundingClientRect().top-12:innerHeight})});
  review=createReviewUI({surface,openDialog,closeDialog,clearMode,say,beginBlocks,getSelectionState:()=>({index,pending}),setDialogKey:fn=>dialogKey=fn});
  const commands=[
    ...navigation.commands,
    ...(review?review.commands:[{keys:['Space','r','r'],label:'Review this local document',run:()=>attempt(()=>request({type:'openReview',url}))}]),
    {keys:['v'],label:'Visual mode · choose a passage with labels',run:()=>beginWords()},
    ...['p','s','a'].map(key=>({keys:['Space','v',key],label:{p:'Visually select whole paragraphs',s:'Visually select a heading section',a:'Visually select the whole page'}[key],run:()=>key==='a'?selectPage():beginBlocks(key==='p'?'paragraph':'section')})),
    {keys:['V'],label:'Highlight mode · label a passage and choose a color',run:()=>beginWords(null,'highlight')},
    {keys:['m'],label:'Set a scroll mark · a–z local, A–Z global',run:()=>beginMark('set')},
    {keys:["'"],label:'Jump to a mark · a–z local, A–Z across tabs',run:()=>beginMark('jump')},
    {keys:['`'],label:'Jump to a saved scroll position',run:()=>beginMark('jump')},
    {keys:['Space','m'],label:'Search local and global marks',hint:'Saved marks',run:markPicker},
    {keys:['s'],label:'Search links and controls',run:jump},
    {keys:['d'],label:'Copy a link · type its visible label',run:()=>copyLinks()},
    {keys:['D'],label:'Copy labeled links · one URL per line',run:()=>copyLinks(true)},
    {keys:['f'],label:'Label visible links and controls',run:()=>linkHints()},
    {keys:['F'],label:'Open a labeled link in a new tab',run:()=>linkHints(true)},
    {keys:['o'],label:'Open a URL',run:()=>openAddress()},
    {keys:['O'],label:'Open a URL in a new tab',run:()=>openAddress(true)},
    {keys:['H'],label:'Back in tab history',run:()=>attempt(()=>request({type:'navigate',action:'back'}))},
    {keys:['L'],label:'Forward in tab history',run:()=>attempt(()=>request({type:'navigate',action:'forward'}))},
    {keys:['J'],label:'Next browser tab',run:()=>attempt(()=>request({type:'navigate',action:'next'}))},
    {keys:['K'],label:'Previous browser tab',run:()=>attempt(()=>request({type:'navigate',action:'previous'}))},
    {keys:['g','0'],label:'First browser tab',run:()=>attempt(()=>request({type:'navigate',action:'first'}))},
    {keys:['g','$'],label:'Last browser tab',run:()=>attempt(()=>request({type:'navigate',action:'last'}))},
    {keys:['g','i'],label:'Focus a text field · gi first, 2gi second',run:(count=1)=>{const fields=editableFields(),target=fields[count-1];if(target){activate(target);say(`Field ${count} of ${fields.length} · Tab / Shift+Tab move · Ctrl+C returns to Normal`);}else say(fields.length?`Only ${fields.length} editable fields on this page. Use gI to choose a visible field.`:'No editable field found.');}},
    {keys:['g','I'],label:'Label visible text fields · choose one to focus',run:()=>linkHints(false,true)},
    {keys:['Space','p','p'],label:'Play / pause this page’s video or audio',hint:'Play / pause media',run:()=>attempt(async()=>say(await toggleMedia()))},
    {keys:['y','y'],label:'Copy the current URL',run:()=>attempt(async()=>{await navigator.clipboard.writeText(documentURL());say('URL copied');})},
    {keys:['/'],label:'Find literal text · individual occurrences',run:navigation.literal},
    {keys:['n'],label:'Next text match',run:count=>attempt(()=>navigation.nextMatch(1,count))},
    {keys:['N'],label:'Previous text match',run:count=>attempt(()=>navigation.nextMatch(-1,count))},
    ...[['j',0,.14],['k',0,-.14],['h',-80,0],['l',80,0],['Ctrl-d',0,.5],['Ctrl-u',0,-.5]].map(([key,x,y])=>({keys:[key],label:{j:'Scroll down',k:'Scroll up',h:'Scroll left',l:'Scroll right','Ctrl-d':'Half page down','Ctrl-u':'Half page up'}[key],repeat:true,run:(count=1)=>move(x*count,y*count)})),
    {keys:['g','g'],label:'Top of page or pane',run:()=>move(0,0,'start')},
    {keys:['G'],label:'Bottom of page or pane',run:()=>move(0,0,'end')},
    {keys:['Space','d','n'],label:'Open this page’s floating drawing notebook',hint:'Drawing notebook',run:openNotebook},
    {keys:['Space','d','o'],label:'Page outline',run:outline},
    {keys:['Space','d','s'],label:'Fuzzy search passages in this document',hint:'Search document',run:navigation.documentSearch},
    {keys:['Space','h'],label:'Toggle this page’s annotation sidebar',hint:'Toggle notes',run:pageSidebar},
    {keys:[']','h'],label:'Next highlight',run:()=>nextAnnotation(1)},
    {keys:['[','h'],label:'Previous highlight',run:()=>nextAnnotation(-1)},
    {keys:['Space','n'],label:'Add a page note',hint:'Page note',run:()=>edit()},
    {keys:['Space','p','f'],label:'Search saved highlights and notes',hint:'Highlights & notes',run:()=>attempt(()=>navigation.library())},
    {keys:['Space','p','l'],label:'Resume the last search',run:()=>lastPicker?openPicker(lastPicker.title,lastPicker.entries,lastPicker.query,true,lastPicker.options):jump()},
    {keys:['?'],label:'Keyboard guide and site setting',run:help},
    {keys:['i'],label:'Insert mode · pass keys through until Ctrl+C',run:()=>{clearMode();closeDrawer();insert=true;updateBadge();say('Insert mode · all keys go to the website · Ctrl+C returns to Normal');}},
  ];
  function onKey(e){
    if(!e.isTrusted)return;
    if(!connected()){
      if(dialog&&keyOf(e)==='Escape'){consume(e);closeDialog();}
      return;
    }
    // A client-side route may change between the periodic route checks and the
    // next keystroke. Commands must use the article currently on screen.
    if(enterPage(pageKey(documentURL())))load();
    // Ctrl+C is the deliberate handoff from website editing to navigation,
    // whether entry began via i, gi, Tab or a mouse click. Never alter the draft.
    const k=keyOf(e);
    const inUI=e.composedPath().includes(host);
    if(returnToNormalKey(e,{enabled,insert,owned:!inUI&&owned(e)})){
      consume(e);insert=false;normalInSiteDialog=!!pageDialog();
      const field=activeElement();
      if(!inUI&&field&&field!==document.body){lastPane=scrollPane(field);hover=lastPane;field.blur();}
      getSelection()?.removeAllRanges();
      clearMode();mountOverlay();say('Normal mode');return;
    }
    if(insert)return;
    if(!k||e.defaultPrevented)return;
    if(dialog){if(k==='Escape'){consume(e);navigation.clearFind();closeDialog();}return;}
    if(k==='Escape'&&drawer&&!mode&&!sequence.length){consume(e);closeDrawer();return;}
    if(!enabled)return;
    if(owned(e))return;
    if(e.composedPath().includes(host)&&shadow.activeElement!==drawer)return;
    // Native/site dialogs own keys; they remain operable via ordinary Tab.
    if(pageDialog()&&!normalInSiteDialog)return;
    if(selecting()&&k!=='Escape'&&!refreshSelection(true)){consume(e);return;}
    if(k==='Escape'){normalCount='';navigation.clearFind();if(mode||markMode||sequence.length){consume(e);if(sequence.length){resetSequence();updateBadge();}else if(mode||markMode)cancel();}else{clearPreview();getSelection()?.removeAllRanges();}return;}
    if(markMode){consume(e);if(/^[a-zA-Z]$/.test(k)&&!e.repeat){const action=markMode;clearMode();if(action==='set')setMark(k);else jumpMark(k);}return;}
    if(scopeMenu){consume(e);const choice=scopeChoices.find(c=>c.key===k);if(choice){scopeMenu=false;choice.run();}return;}
    if(selecting()&&k==='Space'){consume(e);openScopeMenu();return;}
    if(['start','end','blocks','links','copy-links'].includes(mode)){
      if(k==='Tab'){clearMode();return;}
      if(['ArrowDown','ArrowUp','PageDown','PageUp','Ctrl-d','Ctrl-u'].includes(k)&&mode!=='links'){consume(e);move(0,['ArrowUp','PageUp','Ctrl-u'].includes(k)?-.5:.5);return;}
      if(k==='Backspace'||/^[a-z]$/i.test(k)){consume(e);if(!e.repeat)typeLabel(k);}return;
    }
    if(sequence[0]!=='z'&&(['visual','highlight'].includes(mode)||getSelection()?.toString())){
      if(/^[1-6]$/.test(k)){consume(e);saveColor(COLORS[+k-1].id);return;}
      if(['visual','highlight'].includes(mode)&&['p','s','a'].includes(k)){consume(e);if(k==='a')selectPage(selectionMode);else expandSelection(k==='p'?'paragraph':'section');return;}
      if(pending?.kind==='paragraph'&&['j','k','J','K'].includes(k)){consume(e);stepParagraph(k);return;}
      if(k==='h'){consume(e);if(!pending)pending=selectedIndex();if(pending&&canAnnotate()){mode=selectionMode='highlight';getSelection()?.removeAllRanges();renderSelection();}return;}
      if(k==='y'&&pending){consume(e);copyPassage();return;}
      if(k==='c'&&review){consume(e);if(!pending)pending=selectedIndex();if(pending)review.comment();return;}
      if(k==='n'){consume(e);if(!pending)pending=selectedIndex();if(pending&&canAnnotate())edit(newItem(pending.anchor));return;}
      if(['visual','highlight'].includes(mode)&&k==='e'){consume(e);const selected=pending;const start=wordTokens(index.text).find(t=>t.start===selected.start);beginWords(start,mode);return;}
      if(['visual','highlight'].includes(mode)&&k==='o'){consume(e);beginWords(null,mode);return;}
      if(!['v','V','z'].includes(k)&&!(k==='i'&&!mode))return;
    }
    if(!sequence.length&&!mode&&/^[0-9]$/.test(k)&&(normalCount||k!=='0')){consume(e);normalCount=(normalCount+k).slice(0,2);say('Count '+normalCount);return;}
    const next=[...sequence,k],matching=commands.filter(c=>next.every((x,i)=>c.keys[i]===x));
    if(!matching.length){normalCount='';if(sequence.length){consume(e);resetSequence();say('No command for that sequence. Space shows the menu.');}return;}
    const exact=matching.find(c=>c.keys.length===next.length);consume(e);if(e.repeat&&!exact?.repeat)return;
    if(exact){const count=Number(normalCount)||1;normalCount='';resetSequence();exact.run(count);}else{
      sequence=next;const header=el('div',null,'which-header'),list=el('div',null,'which-list'),choices=shortcutHints(matching,sequence);
      header.append(el('strong',sequence.join(' ')+' …'),el('span','Esc to cancel'));
      which.replaceChildren(header,list);which.dataset.columns=choices.length>6?'2':'1';
      which.setAttribute('role','region');which.setAttribute('aria-label','Available keyboard shortcuts');
      for(const {key,label,detail}of choices){const row=el('div');row.title=detail;row.append(el('kbd',key),el('span',label));list.append(row);}
      which.hidden=false;clearTimeout(sequenceTimer);sequenceTimer=setTimeout(resetSequence,5000);
    }
  }
  keyHandler=onKey;
  uiOwner=e=>e.composedPath().includes(host);
  uiKeyHandler=e=>{
    // Site listeners see a closed-shadow host, not its textbox. Keep extension
    // text entry private to its controls while preserving native input defaults.
    const active=shadow.activeElement;
    active?.onkeydown?.(e);
    if(!e.defaultPrevented)active?.closest('.review-drawer')?.onkeydown?.(e);
    if(!e.defaultPrevented&&dialog&&active?.closest('dialog')===dialog)dialogKey?.(e);
  };
  document.addEventListener('pointerover',e=>{if(e.target instanceof Element&&!e.composedPath().includes(host))hover=e.target;},true);
  document.addEventListener('focusin',e=>{if(!e.composedPath().includes(host)){lastPane=scrollPane(e.composedPath()[0]);hover=null;if(owned(e)){normalInSiteDialog=false;clearMode();}}},true);
  function mountOverlay(){
    const siteModal=pageDialog(),full=document.fullscreenElement;
    if(!siteModal)normalInSiteDialog=false;
    // Native modal/fullscreen top layers hide document siblings. Mount inside
    // the layer only after the user explicitly hands navigation back to us.
    const container=normalInSiteDialog&&siteModal?siteModal:full&&!full.matches('video,audio,iframe')?full:document.documentElement;
    if(host.parentElement!==container)container.append(host);
  }
  document.addEventListener('fullscreenchange',()=>{mountOverlay();clearMode();});
  document.addEventListener('close',mountOverlay,true);
  const scrolled=()=>{
    if(mode==='copy-links'){rebuildCopyLabels();return;}
    if(mode==='links'){clearMode();return;}
    if(['start','end','blocks'].includes(mode)&&!scrollFrame){scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;rebuildLabels();});}
  };
  document.addEventListener('scroll',scrolled,true);window.addEventListener('resize',()=>{indexDirty=true;scrolled();});
  let lastWidth=document.body.offsetWidth,lastHeight=document.body.offsetHeight;
  new ResizeObserver(()=>{const w=document.body.offsetWidth,h=document.body.offsetHeight;if(w!==lastWidth||h!==lastHeight){lastWidth=w;lastHeight=h;scrolled();}}).observe(document.body);
  const observer=new MutationObserver(records=>{
    if(records.every(r=>r.target===host||host.contains(r.target)))return;
    if(!host.isConnected)mountOverlay();
    indexDirty=true;
    clearTimeout(renderTimer);renderTimer=setTimeout(()=>{if(!disposed){mountOverlay();restore();}},500);
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','hidden','aria-expanded','aria-hidden','class','style']});
  setInterval(()=>{
    if(!connected())return;
    if(location.href!==routeHref){routeHref=location.href;if(enterPage(pageKey(documentURL())))load();}
    if(document.body!==observed){observed=document.body;observer.disconnect();if(observed)observer.observe(observed,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','hidden','aria-expanded','aria-hidden','class','style']});}
  },700);
  onDisconnect(()=>{disconnected=true;clearMode();clearTimeout(toastTimer);toast.hidden=true;});
  watch(()=>{if(connected()&&!dialog&&!mode)load();});
  if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener((message,sender,respond)=>{
    if(sender.id!==chrome.runtime.id)return;
    if(message?.type==='readerMessage'){
      if(readerTabId==null||message.tabId!==readerTabId)return;
      message=message.payload;
    }
    if(message?.type==='pageIdentity'){respond({url:location.href});return;}
    if(message?.type==='agentPage'){
      (async()=>{
        if(pageKey(documentURL())!==message.url)throw Error('Requested page navigated. Read its new URL before editing.');
        if(message.action==='read')return readAgentPage();
        if(message.action==='selection')return agentSelection();
        if(message.action==='reveal')return revealAgentSection(message.sectionId);
        if(message.action==='refresh'){await load();return {restored:[...resolved.keys()]};}
        if(message.action==='notebookState')return notebook.state();
        if(message.action==='openNotebook'){await notebook.open();return {opened:true};}
        throw Error('Unsupported agent page action.');
      })().then(value=>respond({ok:true,value}),error=>respond({ok:false,error:error.message}));return true;
    }
    if(message?.type==='restoreMark'){if(message.url!==url){respond({restored:false});return;}clearMode();restorePosition(message.mark).then(p=>{lastPane=p;hover=p;say('Global mark '+message.name+' · '+message.mark.title);respond({restored:true});},()=>respond({restored:false}));return true;}
    if(message?.type==='openNotebook'){openNotebook();respond({opened:true});}
    if(message?.type==='studyNavigation'){
      if(message.action==='capture')respond(capture(hover||document.activeElement));
      else if(message.action==='search')respond({entries:enabled?passages(message.query):null});
      else if(message.action==='restore'){if(message.location.url&&pageKey(message.location.url)!==url){respond({restored:false});return;}clearMode();restoreReading(message.location).then(respond,()=>respond({restored:false}));return true;}
      return;
    }
    if(message?.type==='context')respond({url,title:document.title,restored:[...resolved.keys()],enabled});
    if(message?.type==='jumpAnnotation'){const item=items.find(i=>i.id===message.id);if(item)showAnnotation(item);respond({found:!!item&&resolved.has(item.id)});}
    if(message?.type==='beginHighlight'){closeDialog();beginWords();respond({started:true});}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(selecting()||mode==='copy-links'){indexDirty=true;trackLayout();}else if(!dialog&&!mode)load();}});
  document.addEventListener('click',e=>{if(e.isTrusted&&e.target?.closest?.('a[href]'))navigation.checkpoint(true).catch(()=>{});},true);
  let positionTimer;document.addEventListener('scroll',()=>{clearTimeout(positionTimer);positionTimer=setTimeout(()=>navigation.remember(),350);},true);
  window.addEventListener('pagehide',()=>navigation.remember());
  navigation.remember();
  load();
}
