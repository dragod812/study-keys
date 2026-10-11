import {COLORS,pageKey,pageSource} from './core.js';
import {request} from './transport.js';
const $=s=>document.querySelector(s);
for(const selector of ['#filter-color','#color'])for(const c of COLORS){const option=document.createElement('option');option.value=c.id;option.textContent=c.label;$(selector).append(option);}
let pages=[],drawings=[],trash=false,filter='',selectedColor='',activeDraft=false;
function node(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,run,cls){const n=node('button',text,cls);n.type='button';n.onclick=run;return n;}
function status(message,error=false){$('#status').textContent=message;$('#status').classList.toggle('error',error);}
async function load(){try{const data=await request({type:'library'});pages=data.pages;drawings=data.drawings||[];render();}catch(e){status(e.message,true);}}
function render(){
  const all=pages.flatMap(page=>page.items.map(item=>({...item,page}))),live=all.filter(i=>!i.archived);
  $('#total').textContent=live.length;$('#page-count').textContent=new Set([...pages.filter(p=>p.items.some(i=>!i.archived)).map(p=>p.url),...drawings.map(d=>d.url)]).size;$('#note-count').textContent=live.filter(i=>i.note).length;
  const filtered=all.filter(i=>i.archived===trash&&(!selectedColor||i.color===selectedColor)&&(!filter||[i.anchor?.quote,i.note,i.page.title,i.page.url].join(' ').toLowerCase().includes(filter.toLowerCase()))).sort((a,b)=>b.updatedAt-a.updatedAt);
  $('#result-count').textContent=`${filtered.length} ${trash?'archived':'saved'} annotations`;const list=$('#cards');list.replaceChildren();
  const visibleDrawings=trash||selectedColor?[]:drawings.filter(d=>!filter||[d.title,d.url].join(' ').toLowerCase().includes(filter.toLowerCase()));
  $('#result-count').textContent+=visibleDrawings.length?' · '+visibleDrawings.length+' notebooks':'';
  for(const drawing of visibleDrawings){const card=node('article',null,'card');card.style.setProperty('--accent','#b6d3bb');const link=node('a',drawing.title||pageSource(drawing.url),'page-link');link.href=drawing.url;link.target='_blank';link.rel='noopener noreferrer';card.append(node('span','Drawing notebook','tag'),link,node('p',pageSource(drawing.url),'origin'),node('p','Open this page, then press Space d n to continue drawing.','note'),node('time',new Date(drawing.updatedAt).toLocaleString()));list.append(card);}
  if(!filtered.length&&!visibleDrawings.length){const empty=node('div',null,'empty');empty.append(node('div','⌁','empty-icon'),node('h2',filter?'Nothing matches yet':'Make an idea your own'),node('p',filter?'Try another word, color or page name.':'On a website, press v, choose the start and end labels, then 1–6. Your highlights and notes will appear here.'));list.append(empty);return;}
  for(const item of filtered){
    const card=node('article',null,'card');card.style.setProperty('--accent',COLORS.find(c=>c.id===item.color).hex);
    const meta=node('div',null,'meta');meta.append(node('span',COLORS.find(c=>c.id===item.color).label,'tag'),node('time',new Date(item.updatedAt).toLocaleDateString()));
    const heading=node('a',item.page.title||pageSource(item.page.url),'page-link');heading.href=pageKey(item.page.url);heading.target='_blank';heading.rel='noopener noreferrer';
    const origin=node('p',pageSource(item.page.url),'origin');card.append(meta,heading,origin);
    if(item.anchor)card.append(node('blockquote',item.anchor.quote));
    if(item.note)card.append(node('p',item.note,'note'));
    const actions=node('div',null,'actions');actions.append(button('Edit note',()=>edit(item)),button(trash?'Restore':'Move to trash',()=>archive(item)));card.append(actions);list.append(card);
  }
}
async function archive(item){try{await request({type:'save',url:item.page.url,title:item.page.title,item:{...item,archived:!item.archived},base:item.updatedAt});await load();status(trash?'Annotation restored.':'Moved to trash. You can restore it at any time.');}catch(e){status(e.message,true);}}
function edit(item){
  const dialog=$('#editor'),input=$('#note'),error=$('#edit-error'),color=$('#color');$('#quote').textContent=item.anchor?.quote||'Page note';$('#edit-page').textContent=item.page.title;input.value=item.note;color.value=item.color;error.textContent='';activeDraft=true;let saving=false;
  const close=()=>{if(saving)return;if(input.value!==item.note||color.value!==item.color){error.textContent='Unsaved changes. Save them or use Discard draft.';return;}dialog.close();activeDraft=false;};
  $('#close-editor').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};$('#discard').onclick=()=>{if(!saving){dialog.close();activeDraft=false;}};
  $('#edit-form').onsubmit=async e=>{e.preventDefault();if(saving)return;saving=true;$('#save').disabled=true;
    try{await request({type:'save',url:item.page.url,title:item.page.title,item:{...item,note:input.value,color:color.value},base:item.updatedAt});dialog.close();activeDraft=false;await load();status('Note saved locally.');}
    catch(e){error.textContent=e.message;}finally{saving=false;$('#save').disabled=false;}
  };
  dialog.onkeydown=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();$('#edit-form').requestSubmit();}};dialog.showModal();input.focus();
}
$('#search').oninput=e=>{filter=e.target.value;render();};$('#filter-color').onchange=e=>{selectedColor=e.target.value;render();};
$('#saved-tab').onclick=()=>{trash=false;$('#saved-tab').setAttribute('aria-pressed','true');$('#trash-tab').setAttribute('aria-pressed','false');render();};
$('#trash-tab').onclick=()=>{trash=true;$('#saved-tab').setAttribute('aria-pressed','false');$('#trash-tab').setAttribute('aria-pressed','true');render();};
$('#export').onclick=async()=>{try{const data=await request({type:'export'}),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),href=URL.createObjectURL(blob),a=node('a');a.href=href;a.download=`study-keys-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(href),30000);status('Backup downloaded. Keep it somewhere safe before removing the extension.');}catch(e){status(e.message,true);}};
$('#import').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>50*1024*1024)throw Error('Choose a backup smaller than 50 MB.');const backup=JSON.parse(await file.text()),result=await request({type:'import',backup});await load();status(`Merged ${result.imported} annotations and ${result.importedDrawings||0} notebooks. Existing newer edits were preserved.`);}catch(e){status(e.message,true);}finally{e.target.value='';}};
window.addEventListener('focus',()=>{if(!activeDraft)load();});
document.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.isComposing||e.target.matches('input,textarea,select')||$('#editor').open)return;if(e.key==='/'){e.preventDefault();$('#search').focus();}});
load();

request({type:'storageStatus'}).then(s=>{const line=node('p',s.online?'Local library · '+s.folder:'Local folder unavailable · showing cached notes. '+s.error,s.online?'origin':'error');document.querySelector('main')?.prepend(line);}).catch(()=>{});
