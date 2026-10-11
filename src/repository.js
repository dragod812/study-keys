import {pageKey,pageScope,cleanItem,validateBackup,normalizePageColors} from './core.js';
import {cleanStudyState} from './navigation-core.js';
import {cleanMark,cleanPosition} from './marks.js';
import {cleanScene,cleanDrawing,cleanLayout} from './notebook-core.js';
import {hash,canonical,prepareStudy,undoStudy,validId} from './agent-core.js';

// A single serialized service-worker queue prevents read/modify/write races
// between tabs. A timestamp check protects two editors of the same annotation.
export function createRepository(storage,now=()=>Date.now()) {
  let queue=Promise.resolve();
  const enqueue=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
  const get=async k=>(await storage.get(k))[k];
  const page=async url=>normalizePageColors((await get('page:'+url))||{url,title:'',items:[]});
  async function handle(m) {
    if(['agentRead','agentApply','agentUndo','agentRun'].includes(m.type)) {
      const url=pageKey(m.url),data=await storage.get(null);
      const p=normalizePageColors(data['page:'+url]||{url,title:'',items:[]}),drawing=data['drawing:'+url]||null;
      if(m.type==='agentRead')return {page:p,pageRevision:await hash(p),drawing,drawingRevision:drawing?.revision||null};
      if(!validId(m.requestId))throw Error('Invalid requestId.');
      const key='agent-run:'+m.requestId,prior=data[key];
      if(prior&&prior.url!==url)throw Error('This requestId belongs to another page.');
      if(m.type==='agentRun'){if(!prior)throw Error('Study run not found.');return prior;}
      if(m.type==='agentApply'&&prior){if(prior.requestHash!==await hash(m.request))throw Error('requestId already used with different changes.');return {run:prior,replayed:true};}
      if(m.type==='agentUndo'&&!prior)throw Error('Study run not found.');
      const result=m.type==='agentApply'?await prepareStudy({page:p,drawing,source:m.source,request:m.request,stamp:now()}):undoStudy(p,drawing,prior,now());
      const values={['page:'+url]:result.page,[key]:result.run};
      if(result.drawing&&(m.type==='agentUndo'||result.changesDrawing))values['drawing:'+url]=result.drawing;
      await storage.set(values);
      // Read back from disk before acknowledging a committed batch.
      const committed=await get(key);if(committed?.requestHash!==result.run.requestHash||committed?.status!==result.run.status)throw Error('Could not verify the study run on disk. Retry with the same requestId.');
      return {run:committed,pageRevision:await hash(result.page),drawingRevision:result.drawing?.revision||null};
    }
    if(m.type==='marks') {const url=pageKey(m.url);return {local:(await get('marks:'+url))?.marks||{},global:(await get('global-marks'))||{}};}
    if(m.type==='setMark') {
      if(!/^[a-zA-Z]$/.test(m.name))throw Error('Choose a–z for this page or A–Z for a global mark.');
      const url=pageKey(m.url),mark=cleanMark({url,title:String(m.title||''),position:cleanPosition(m.position),updatedAt:now()},m.name),global=/^[A-Z]$/.test(m.name),key=global?'global-marks':'marks:'+url;
      const record=(await get(key))||(global?{}:{url,title:mark.title,marks:{}});if(global)record[m.name]=mark;else{record.marks[m.name]=mark;record.title=mark.title;}
      await storage.set({[key]:record});return mark;
    }
    if(m.type==='getMark') {if(!/^[a-zA-Z]$/.test(m.name))throw Error('Choose a mark letter.');const record=await get(/^[A-Z]$/.test(m.name)?'global-marks':'marks:'+pageKey(m.url)),mark=/^[A-Z]$/.test(m.name)?record?.[m.name]:record?.marks?.[m.name];if(!mark)throw Error('Mark '+m.name+' is not set. Use m'+m.name+' to set it.');return mark;}
    if(m.type==='drawingLoad') {
      const url=pageKey(m.url),data=await storage.get(null);
      return {drawing:data['drawing:'+url]||null,layout:cleanLayout(data['notebook-layout']),
        recoveries:Object.entries(data).filter(([k,v])=>k.startsWith('recovery:')&&v.url===url).map(([,v])=>v)};
    }
    if(m.type==='drawingLayout') {const layout=cleanLayout(m.layout);await storage.set({'notebook-layout':layout});return layout;}
    if(m.type==='drawingSave') {
      const url=pageKey(m.url),scene=cleanScene(m.scene),old=await get('drawing:'+url);
      if((old?.revision||null)!==m.base) {
        const id=/^[\w-]{1,80}$/.test(m.recoveryId||'')?m.recoveryId:crypto.randomUUID();
        await storage.set({['recovery:'+id]:{id,url,title:String(m.title||'').slice(0,500),scene,revision:String(m.base||''),updatedAt:now()}});
        throw Error('This notebook changed in another tab. Your draft is kept locally as a recovery copy. Export it, then reopen the saved version.');
      }
      if(old&&canonical(old.scene)===canonical(scene))return {revision:old.revision,updatedAt:old.updatedAt};
      const drawing={url,title:String(m.title||old?.title||'').slice(0,500),scene,revision:crypto.randomUUID(),updatedAt:Math.max(now(),(old?.updatedAt||0)+1)};
      await storage.set({['drawing:'+url]:drawing});return {revision:drawing.revision,updatedAt:drawing.updatedAt};
    }
    if(m.type==='page') {
      const url=pageKey(m.url),settings=(await get('settings'))||{};
      const drawing=await get('drawing:'+url);
      return {...await page(url),drawing:drawing?{updatedAt:drawing.updatedAt}:null,enabled:settings[pageScope(url)]!==false};
    }
    if(m.type==='save') {
      const url=pageKey(m.url),p=await page(url),item=cleanItem(m.item),old=p.items.find(i=>i.id===item.id);
      if(old&&m.base!==old.updatedAt)throw Error('This note changed in another tab. Your draft is still here. Reopen the saved note before replacing it.');
      item.updatedAt=Math.max(now(),(old?.updatedAt||0)+1);
      p.items=p.items.filter(i=>i.id!==item.id).concat(item);p.title=String(m.title||p.title).slice(0,500);
      await storage.set({['page:'+url]:p});return item;
    }
    if(m.type==='enabled') {
      const origin=pageScope(m.url),settings=(await get('settings'))||{};
      settings[origin]=!!m.enabled;await storage.set({settings});return {enabled:!!m.enabled};
    }
    if(m.type==='library'||m.type==='export') {
      const data=await storage.get(null),pages=Object.entries(data).filter(([k])=>k.startsWith('page:')).map(([,v])=>normalizePageColors(v));
      const drawings=Object.entries(data).filter(([k])=>k.startsWith('drawing:')).map(([,v])=>v),recoveries=Object.entries(data).filter(([k])=>k.startsWith('recovery:')).map(([,v])=>v);
      const marks=Object.entries(data).filter(([k])=>k.startsWith('marks:')).map(([,v])=>v),globalMarks=data['global-marks']||{};
      return {format:'study-keys',version:3,agentRuns:m.type==='library'?[]:Object.entries(data).filter(([k])=>k.startsWith('agent-run:')).map(([,v])=>v),navigation:cleanStudyState(data.navigation||{}),marks,globalMarks,exportedAt:new Date(now()).toISOString(),pages,drawings:m.type==='library'?drawings.map(({scene,...rest})=>rest):drawings,recoveries:m.type==='library'?[]:recoveries};
    }
    if(m.type==='import') {
      const navigation=m.backup.navigation?cleanStudyState(m.backup.navigation):null;
      const pages=validateBackup(m.backup);let imported=0,importedDrawings=0;const updates={};
      const runs=m.backup.agentRuns||[];
      if(!Array.isArray(runs)||runs.length>10000)throw Error('Invalid study runs in backup.');
      for(const r of runs){if(!validId(r.id)||typeof r.title!=='string'||typeof r.requestHash!=='string'||!['applied','undone'].includes(r.status)||!Array.isArray(r.annotationChanges)||!Array.isArray(r.drawingChanges))throw Error('Invalid study run.');pageKey(r.url);for(const c of r.annotationChanges){cleanItem(c.after);if(c.before.updatedAt!==undefined)cleanItem(c.before);}for(const c of r.drawingChanges)cleanScene({type:'excalidraw',elements:[c.after,...(c.before.type?[c.before]:[])]});const key='agent-run:'+r.id;if(!await get(key))updates[key]=r;}
      const drawingList=m.backup.version>=2?m.backup.drawings:[],recoveryList=m.backup.version>=2?m.backup.recoveries:[];
      if(!Array.isArray(drawingList)||!Array.isArray(recoveryList)||drawingList.length+recoveryList.length>10000)throw Error('Invalid notebook backup.');
      const marks=m.backup.version>=3?m.backup.marks:[],globalMarks=m.backup.version>=3?m.backup.globalMarks:{};
      if(!Array.isArray(marks)||marks.length>10000||!globalMarks||typeof globalMarks!=='object'||Array.isArray(globalMarks))throw Error('Invalid marks backup.');
      const cleanedMarks=marks.map(p=>{const url=pageKey(p.url),entries={};if(!p.marks||typeof p.marks!=='object')throw Error('Invalid page marks.');for(const [name,mark]of Object.entries(p.marks)){if(!/^[a-z]$/.test(name))throw Error('Invalid local mark.');entries[name]=cleanMark(mark,name);if(entries[name].url!==url)throw Error('Mark belongs to another page.');}return {url,title:String(p.title||'').slice(0,500),marks:entries};});
      const cleanedGlobal={};for(const [name,mark]of Object.entries(globalMarks)){if(!/^[A-Z]$/.test(name))throw Error('Invalid global mark.');cleanedGlobal[name]=cleanMark(mark,name);}
      // Validate every scene before touching storage; old version 1 files stay compatible.
      const drawings=drawingList.map(d=>({...cleanDrawing(d),url:pageKey(d.url)}));
      const recoveries=recoveryList.map(d=>{if(!/^[\w-]{1,80}$/.test(d.id||''))throw Error('Invalid recovery ID.');return {...cleanDrawing(d),url:pageKey(d.url),id:d.id};});
      for(const p of pages) {
        const existing=updates['page:'+p.url]||await page(p.url),items=new Map(existing.items.map(i=>[i.id,i]));
        for(const item of p.items){const old=items.get(item.id);if(!old||item.updatedAt>old.updatedAt){items.set(item.id,item);imported++;}}
        updates['page:'+p.url]={url:p.url,title:existing.title||p.title,items:[...items.values()]};
      }
      for(const drawing of drawings){
        const key='drawing:'+drawing.url,old=updates[key]||await get(key);
        if(!old||drawing.updatedAt>old.updatedAt){updates[key]={...drawing,revision:crypto.randomUUID()};importedDrawings++;}
      }
      for(const recovery of recoveries){const key='recovery:'+recovery.id,old=await get(key);if(!old||recovery.updatedAt>old.updatedAt)updates[key]=recovery;}
      for(const record of cleanedMarks){const key='marks:'+record.url,old=(await get(key))||{...record,marks:{}};for(const [name,mark]of Object.entries(record.marks))if(!old.marks[name]||mark.updatedAt>old.marks[name].updatedAt)old.marks[name]=mark;updates[key]=old;}
      if(Object.keys(cleanedGlobal).length){const old=(await get('global-marks'))||{};for(const [name,mark]of Object.entries(cleanedGlobal))if(!old[name]||mark.updatedAt>old[name].updatedAt)old[name]=mark;updates['global-marks']=old;}
      // Validate the entire file before this one atomic storage write.
      if(navigation){const old=cleanStudyState((await get('navigation'))||{});old.spots=[...old.spots,...navigation.spots.filter(p=>!old.spots.some(o=>o.url===p.url&&o.position.pane===p.position.pane&&o.position.y===p.position.y))].slice(0,9);old.workspaces=[...old.workspaces,...navigation.workspaces.filter(w=>!old.workspaces.some(o=>o.id===w.id))].slice(0,50);updates.navigation=old;}
      await storage.set(updates);return {imported,importedDrawings};
    }
    throw Error('Unknown request.');
  }
  return m=>enqueue(()=>handle(m));
}
