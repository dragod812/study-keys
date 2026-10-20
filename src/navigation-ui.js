import {documentURL} from './document-context.js';
import {pageKey,supportedPage,COLORS} from './core.js';
import {capture,headings,passages,findRanges,restoreReading} from './navigation-dom.js';
import {rankEntries} from './navigation-core.js';
import {alignReadingTarget} from './reading-alignment.js';
export function createNavigationUI(ctx){
  const {request,openPicker,openDialog,closeDialog,el,button,say,setDialogKey,consume,paint}=ctx;
  const send=(action,extra={})=>request({type:'navigation',url:pageKey(documentURL()),action,...extra});
  let query='',at=-1,activeRange=null,recording=Promise.resolve();
  const checkpoint=jump=>send('checkpoint',{jump,location:capture(ctx.seed())});
  function remember(){return checkpoint(false).catch(()=>{});}
  function track(action){recording=recording.catch(()=>{}).then(async()=>{await checkpoint(true);await action();await checkpoint(true);});return recording;}
  async function go(location){await send('open',{location});}
  function focusHeading(h){h.scrollIntoView({block:'center',behavior:'instant'});if(!h.hasAttribute('tabindex'))h.tabIndex=-1;h.focus({preventScroll:true});activeRange=null;paint('preview',[]);}
  function section(delta,count=1){return track(()=>{
    const hs=headings();if(!hs.length)return say('No section headings in the loaded article.');
    const focused=document.activeElement,from=hs.indexOf(focused),next=from>=0?Math.max(0,Math.min(hs.length-1,from+delta*count)):delta>0?hs.findIndex(h=>h.getBoundingClientRect().top>70):hs.findLastIndex(h=>h.getBoundingClientRect().top<60);
    const initial=next<0?(delta>0?hs.length-1:0):next;const chosen=from>=0?initial:Math.max(0,Math.min(hs.length-1,initial+delta*(count-1)));
    const h=hs[chosen];focusHeading(h);say(h.textContent.trim());
  });}
  function literal(){
    const box=openDialog('Find in document');if(!box)return;
    const input=el('input');input.type='search';input.setAttribute('aria-label','Find literal text');input.placeholder='Find exact text…';input.value=query;input.autocomplete='off';input.spellcheck=false;
    const status=el('p',null,'muted');status.setAttribute('role','status');box.append(input,status,el('p','Literal text · case insensitive · Enter jumps · n / N moves between occurrences','muted'));
    let matches=[];
    function update(){query=input.value;matches=findRanges(query);paint('find',matches.map(m=>m.range));status.textContent=query?`${matches.length}${matches.length===2000?'+':''} matches`:'Type to find text';at=-1;}
    function choose(){if(!matches.length)return;closeDialog(true);return nextMatch(1);}
    input.oninput=update;setDialogKey(e=>{if(e.key==='Enter'){consume(e);ctx.attempt(choose);}});update();input.focus();
  }
  function nextMatch(delta,count=1){return track(async()=>{
    if(!query)return say('Press / to find text first.');const matches=findRanges(query);paint('find',matches.map(m=>m.range));if(!matches.length)return say('No matches in the loaded text.');
    at=at<0?(delta>0?count-1:matches.length-count):(at+delta*count);at=((at%matches.length)+matches.length)%matches.length;
    activeRange=matches[at].range;await restoreReading({anchor:matches[at].anchor});say(`Match ${at+1} of ${matches.length}`);
  });}
  function clearFind(){paint('find',[]);activeRange=null;}
  function align(position){
    const selection=getSelection(),selected=selection?.rangeCount&&!selection.isCollapsed?selection.getRangeAt(0):null;
    const preview=CSS.highlights?.get('studykeys-preview')?.values().next().value;
    const focused=document.activeElement,heading=focused?.matches('h1,h2,h3,h4,h5,h6')?focused:null;
    const targets=[selected,preview,heading,activeRange,focused!==document.body?focused:null];
    if(!targets.some(target=>alignReadingTarget(target,position,ctx.readingBounds?.())))say('Choose a section with ]] / [[ or select a passage first.');
  }
  function picker(title,provider){return openPicker(title,provider,'',true,{pin:true,onPin:entries=>send('pinResults',{entries:entries.map(e=>e.location)}).then(r=>say(`${r.count} results pinned · Space j / k visits them`))});}
  function documentSearch(){picker('Search this document',q=>({entries:passages(q).map(p=>({...p,location:{url:pageKey(documentURL()),anchor:p.anchor},run:()=>track(()=>restoreReading(p))})),coverage:'Current document · loaded readable passages'}));}
  function tabs(){picker('Switch tabs',async q=>{const result=await send('tabs',{query:q});return {...result,entries:result.entries.map(e=>({...e,location:{tabId:e.tabId,...(supportedPage(e.url)?{url:e.url}:{})},run:()=>go({tabId:e.tabId})}))};});}
  function searchTabs(){picker('Search open tabs',async q=>{const result=await send('search',{query:q});return {...result,entries:result.entries.map(e=>({...e,location:e,run:()=>go(e)}))};});}
  async function jumpList(){const r=await send('jumps');openPicker('Reading jumplist',r.entries.map(e=>({...e,run:()=>send('jump',{index:e.index})})));}
  async function groupPicker(move=false){const r=await send('groups');openPicker(move?'Move selected browser tabs to a group':'Switch tab group',r.entries.map(e=>({...e,run:()=>send(move?'groupMove':'groupOpen',move?{groupId:e.id,selected:true}:{groupId:e.id})})));}
  function named(title,action){const box=openDialog(title);if(!box)return;const input=el('input');input.type='search';input.maxLength=100;input.setAttribute('aria-label','Name');const status=el('p',null,'error');let saving=false;const save=button('Save',async()=>{if(saving)return;saving=true;save.disabled=true;try{const result=await send(action,{name:input.value,selected:true});closeDialog(true);say(result.count!=null?`${result.count} pages saved in the local workspace`:'Group created');}catch(e){status.textContent=e.message;}finally{saving=false;save.disabled=false;}});box.append(input,status,save);setDialogKey(e=>{if(e.key==='Enter'){consume(e);save.click();}});input.focus();}
  async function spots(){const r=await send('spots');openPicker('Quick spots',r.entries.map(e=>({...e,run:()=>send('spotOpen',{slot:e.slot})})), '',true,{remove:e=>send('spotRemove',{slot:e.slot}).then(spots)});}
  async function workspaces(){const r=await send('workspaces');openPicker('Saved study workspaces',r.entries.map(e=>({...e,run:()=>send('workspaceOpen',{id:e.id}).then(r=>say(`${r.count} workspace pages open · ${r.restored} positions restored${r.count>r.restored?' · remaining positions restore as pages load':''}`))})), '',true,{remove:e=>send('workspaceRemove',{id:e.id}).then(workspaces)});}
  async function library(questions=false){
    const data=await request({type:'navigationLibrary',url:pageKey(documentURL())}),entries=[];
    for(const page of data.pages)for(const item of page.items){if(item.archived||(questions&&(item.color!=='red'||item.resolved)))continue;entries.push({url:page.url,color:item.color,note:item.note,drawing:data.drawings.some(d=>d.url===page.url),label:page.title+' · '+(item.anchor?.quote||item.note).slice(0,150),detail:COLORS.find(c=>c.id===item.color)?.label+' · '+item.note,location:{url:page.url,anchor:item.anchor},run:()=>go({url:page.url,anchor:item.anchor}),item});}
    picker(questions?'Unresolved questions':'Search saved highlights and notes',q=>({entries:rankEntries(entries,q),coverage:'Local library · site: · color: · has:note · has:drawing'}));
  }
  function allCommands(){return [
    {keys:['Space','s'],label:'Toggle Chrome vertical tabs (optional macOS helper)',hint:'Vertical tabs',run:()=>send('verticalTabs')},
    {keys:['Space','Enter'],label:'Switch tabs · titles, URLs and groups',hint:'Switch tab',run:tabs},
    {keys:['Space','p','s'],label:'Search passages across loaded tabs',hint:'Search open tabs',run:searchTabs},
    {keys:['Space','Space'],label:'Return to the previous tab',hint:'Previous tab',run:()=>send('lastTab')},
    {keys:['Ctrl-o'],label:'Older reading location',run:count=>recording.catch(()=>{}).then(()=>send('jump',{delta:-1,count}))},
    {keys:['Ctrl-i'],label:'Newer reading location',run:count=>recording.catch(()=>{}).then(()=>send('jump',{delta:1,count}))},
    {keys:['Space','p','j'],label:'Search the reading jumplist',hint:'Jumplist',run:jumpList},
    {keys:[']',']'],label:'Next article section',run:count=>section(1,count)},
    {keys:['[','['],label:'Previous article section',run:count=>section(-1,count)},
    {keys:['z','t'],label:'Align the active section or passage at the top',run:()=>align('start')},
    {keys:['z','z'],label:'Center the active section or passage',run:()=>align('center')},
    {keys:['z','b'],label:'Align the active section or passage at the bottom',run:()=>align('end')},
    {keys:['Space','g','g'],label:'Search tab groups',run:()=>groupPicker()},
    {keys:['Space','g','n'],label:'Create a group from selected browser tabs',hint:'Create group',run:()=>named('New tab group','groupCreate')},
    {keys:['Space','g','m'],label:'Move selected browser tabs to a group',hint:'Move to group',run:()=>groupPicker(true)},
    {keys:['Space','g','u'],label:'Ungroup selected browser tabs',hint:'Ungroup tabs',run:()=>send('groupRemove',{selected:true})},
    {keys:['Space','g','f'],label:'Focus group / restore groups',run:()=>send('groupFocus').then(r=>say(r.focused?'Group focused · tab searches use this group':'All groups restored'))},
    {keys:['Space','e','a'],label:'Save this reading position as a quick spot',hint:'Save quick spot',run:()=>send('spotSave').then(r=>say(`Quick spot ${r.slot} saved · Space ${r.slot} returns`))},
    {keys:['Space','e','e'],label:'Search quick spots',run:spots},
    ...Array.from({length:9},(_,i)=>({keys:['Space',String(i+1)],label:`Jump to quick spot ${i+1}`,hint:'Quick spots',hintGroup:'quick-spots',run:()=>send('spotOpen',{slot:i+1})})),
    {keys:['Space','j'],label:'Next pinned search result',hint:'Next result',run:()=>send('nextResult',{delta:1}).then(r=>say(`Result ${r.at} of ${r.total}`))},
    {keys:['Space','k'],label:'Previous pinned search result',hint:'Previous result',run:()=>send('nextResult',{delta:-1}).then(r=>say(`Result ${r.at} of ${r.total}`))},
    {keys:['Space','w','s'],label:'Save this window as a study workspace',hint:'Save workspace',run:()=>named('Save study workspace','workspaceSave')},
    {keys:['Space','w','o'],label:'Open a saved study workspace',hint:'Open workspace',run:workspaces},
    {keys:['Space','p','q'],label:'Review unresolved red questions',hint:'Review questions',run:()=>library(true)},
  ].map(c=>({...c,run:count=>ctx.attempt(()=>c.run(count||1))}));}
  return {commands:allCommands(),literal,nextMatch,clearFind,documentSearch,library,remember,track,checkpoint};
}
