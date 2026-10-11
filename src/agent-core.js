import {cleanItem,makeAnchor,resolveAnchor} from './core.js';
import {cleanScene} from './notebook-core.js';
import {generateKeyBetween} from 'fractional-indexing';

export const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:canonical(value)))),x=>x.toString(16).padStart(2,'0')).join('');
export const validId=value=>typeof value==='string'&&/^[\w-]{1,80}$/.test(value);
const requireId=id=>{if(!validId(id))throw Error('Use a stable requestId containing 1–80 letters, numbers, underscores or hyphens.');return id;};
const text=(value,max=5000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Provide nonempty text under '+max+' characters.');return value;};
const wrap=(value,width=54)=>value.split('\n').flatMap(line=>{const out=[];let rest=line;while(rest.length>width){let at=rest.lastIndexOf(' ',width);if(at<width/2)at=width;out.push(rest.slice(0,at));rest=rest.slice(at).trimStart();}out.push(rest);return out;}).join('\n');
const base=(id,type,x,y,width,height,stamp)=>({id,type,x,y,width,height,angle:0,strokeColor:'#263c45',backgroundColor:'transparent',fillStyle:'solid',strokeWidth:1,strokeStyle:'solid',roughness:0,opacity:100,groupIds:[],frameId:null,index:null,roundness:null,seed:1,version:1,versionNonce:1,isDeleted:false,boundElements:[],updated:stamp,link:null,locked:false});
const label=(id,value,x,y,width,stamp,size=20)=>{const content=wrap(value,Math.floor(width/(size*.62)));return {...base(id,'text',x,y,width,content.split('\n').length*size*1.3,stamp),fontSize:size,fontFamily:2,text:content,originalText:content,textAlign:'left',verticalAlign:'top',containerId:null,autoResize:false,lineHeight:1.3};};

// Native editable frames, text, rectangles and arrows. Existing elements and
// image bytes are retained, and the new lesson starts below their bounds.
export function layerElements(layers,existing,id,stamp){
 if(!Array.isArray(layers)||layers.length>5)throw Error('Use at most five learning layers.');
 let y=Math.max(0,...existing.filter(e=>!e.isDeleted).map(e=>Number(e.y||0)+Number(e.height||0)))+120;
 const elements=[],colors=['#fff3bf','#d0ebff','#d3f9d8','#ffe8cc','#e5dbff'];
 for(const [i,layer]of layers.entries()){
  const title=text(layer.title,160),body=text(layer.body,10000),prefix=id+'-L'+(i+1),children=[];
  const heading=label(prefix+'-title',title,40,y+36,800,stamp,28);children.push(heading);
  const prose=label(prefix+'-body',body,40,y+heading.height+64,800,stamp);children.push(prose);
  let bottom=prose.y+prose.height+40;
  if(layer.diagram){
   const {nodes,edges=[]}=layer.diagram;
   if(!Array.isArray(nodes)||!nodes.length||nodes.length>12||!Array.isArray(edges)||edges.length>20)throw Error('A layer diagram needs 1–12 nodes and at most 20 edges.');
   const refs=new Map(),seen=new Set();let rowY=bottom,rowHeight=0;
   for(const [j,n]of nodes.entries()){
    if(!validId(n.id)||seen.has(n.id))throw Error('Diagram node IDs must be unique.');seen.add(n.id);
    if(j&&j%3===0){rowY+=rowHeight+75;rowHeight=0;}
    const nodeId=prefix+'-n'+j,description=text(n.label,160),x=40+(j%3)*290,ny=rowY;
    const t=label(nodeId+'-label',description,x+16,ny+20,218,stamp,18);
    const rect={...base(nodeId,'rectangle',x,ny,250,Math.max(100,t.height+40),stamp),backgroundColor:colors[i],roundness:{type:3},boundElements:[{id:t.id,type:'text'}]};
    rowHeight=Math.max(rowHeight,rect.height);t.containerId=nodeId;t.verticalAlign='middle';children.push(rect,t);refs.set(n.id,rect);
   }
   for(const [j,e]of edges.entries()){
    const a=refs.get(e.from),b=refs.get(e.to);if(!a||!b||a===b)throw Error('Diagram edges must connect two existing nodes.');
    const horizontal=a.y===b.y,forward=b.x>a.x;
    const x=horizontal?a.x+(forward?a.width:0):a.x+a.width/2,sy=horizontal?a.y+a.height/2:a.y+a.height;
    const ex=horizontal?b.x+(forward?0:b.width):b.x+b.width/2,ey=horizontal?b.y+b.height/2:b.y;
    const arrow={...base(prefix+'-e'+j,'arrow',x,sy,Math.abs(ex-x),Math.abs(ey-sy),stamp),points:[[0,0],[ex-x,ey-sy]],lastCommittedPoint:null,startBinding:{elementId:a.id,focus:0,gap:0},endBinding:{elementId:b.id,focus:0,gap:0},startArrowhead:null,endArrowhead:'arrow',elbowed:false};children.push(arrow);a.boundElements.push({id:arrow.id,type:'arrow'});b.boundElements.push({id:arrow.id,type:'arrow'});
    if(e.label)children.push(label(arrow.id+'-label',text(e.label,80),(x+ex)/2+5,(sy+ey)/2-26,150,stamp,14));
   }
   bottom=Math.max(...children.map(e=>e.y+e.height))+36;
  }
  const frame={...base(prefix,'frame',16,y,890,bottom-y+12,stamp),name:title};
  for(const e of children)e.frameId=prefix;
  elements.push(frame,...children);y=bottom+100;
 }
 return elements;
}

export function patchDrawing(scene,operations,stamp){
 const next=cleanScene(scene),elements=new Map(next.elements.map(e=>[e.id,e]));
 if(!Array.isArray(operations)||operations.length>500)throw Error('Use at most 500 drawing operations.');
 for(const op of operations){
  if(op.op==='add'){
   const e=op.element;if(!validId(e?.id)||elements.has(e.id))throw Error('Drawing element ID already exists or is invalid.');
   if(!['rectangle','ellipse','diamond','text','arrow','line','frame'].includes(e.type))throw Error('Use editable shapes, text, lines, arrows or frames.');
   const last=[...elements.values()].at(-1)?.index||null;
   elements.set(e.id,{...base(e.id,e.type,0,0,100,100,stamp),...e,index:generateKeyBetween(last,null),version:1,updated:stamp});
  }else{
   const old=elements.get(op.id);if(!old)throw Error('Drawing element not found: '+op.id);
   if(op.op==='remove')elements.set(op.id,{...old,isDeleted:true,version:(old.version||1)+1,updated:stamp});
   else if(op.op==='update'){
    if(!op.changes||Object.keys(op.changes).some(k=>!['x','y','width','height','text','originalText','fontSize','strokeColor','backgroundColor','points','groupIds','frameId','name','isDeleted'].includes(k)))throw Error('Unsupported drawing change.');
    elements.set(op.id,{...old,...op.changes,version:(old.version||1)+1,versionNonce:Math.floor(Math.random()*2147483647),updated:stamp});
   }else throw Error('Unknown drawing operation.');
  }
 }
 next.elements=[...elements.values()];
 for(const e of next.elements){
  if(![e.x,e.y,e.width,e.height].every(Number.isFinite)||e.width<0||e.height<0)throw Error('Drawing geometry must be finite and have nonnegative size.');
  if(e.frameId&&!elements.has(e.frameId))throw Error('Drawing frame does not exist.');
 }
 return cleanScene(next);
}

export async function prepareStudy({page,drawing,source,request,stamp}){
 const id=requireId(request.requestId);
 if(request.pageRevision!==await hash(page))throw Error('Annotations changed. Read the page again before applying changes.');
 const changesDrawing=(request.layers?.length||request.drawingOperations?.length)>0;
 if(changesDrawing&&(drawing?.revision||null)!==request.drawingRevision)throw Error('Notebook changed. Read the notebook again before applying changes.');
 if(!Array.isArray(request.annotations||[])||(request.annotations||[]).length>200)throw Error('Use at most 200 annotation changes.');
 const next=structuredClone(page),before=[],after=[];if(!next.title)next.title=source?.title||page.url;
 for(const [i,change]of (request.annotations||[]).entries()){
  const itemId=change.id||'agent-'+(await hash(id)).slice(0,20)+'-'+i,old=next.items.find(x=>x.id===itemId);
  if(old&&change.updatedAt!==old.updatedAt)throw Error('Annotation changed. Supply its latest updatedAt before editing it.');
  let anchor=old?.anchor||null;
  if(change.quote!==undefined){
   if(!source||source.contentHash!==request.contentHash)throw Error('Source changed. Read the page again before highlighting.');
   const found=resolveAnchor(source.text,{quote:change.quote,prefix:change.prefix||'',suffix:change.suffix||''});
   if(!found)throw Error('Passage is missing or ambiguous. Use an exact quote with prefix/suffix from read_page.');
   anchor=makeAnchor(source.text,found.start,found.end);
  }
  const item=cleanItem({...old,id:itemId,color:change.color||old?.color||'yellow',note:change.note??old?.note??'',archived:change.archived??old?.archived??false,anchor,updatedAt:Math.max(stamp,(old?.updatedAt||0)+1)});
  // New requests may rediscover an existing annotation; avoid duplicate content.
  if(!old&&next.items.some(x=>!x.archived&&x.color===item.color&&x.note===item.note&&JSON.stringify(x.anchor)===JSON.stringify(item.anchor)))continue;
  before.push(old||{id:itemId});after.push(item);next.items=next.items.filter(x=>x.id!==itemId).concat(item);
 }
 const scene=drawing?.scene||{type:'excalidraw',version:2,source:'Study Keys',elements:[],appState:{viewBackgroundColor:'#fffefa'},files:{}};
 let nextDrawing=drawing;
 if(changesDrawing){
  const prefix='agent-'+(await hash(id)).slice(0,20),add=layerElements(request.layers||[],scene.elements,prefix,stamp);
  const updated=patchDrawing(scene,[...add.map(element=>({op:'add',element})),...(request.drawingOperations||[])],stamp);
  nextDrawing={url:page.url,title:next.title,scene:updated,revision:crypto.randomUUID(),updatedAt:Math.max(stamp,(drawing?.updatedAt||0)+1)};
 }
 const oldElements=new Map(scene.elements.map(e=>[e.id,e])),drawingChanges=changesDrawing?nextDrawing.scene.elements.filter(e=>JSON.stringify(e)!==JSON.stringify(oldElements.get(e.id))).map(e=>({before:oldElements.get(e.id)||{id:e.id},after:e})):[];
 const run={id,url:page.url,title:page.title,updatedAt:stamp,requestHash:await hash(request),annotationChanges:after.map((a,i)=>({before:before[i],after:a})),drawingChanges,status:'applied'};
 return {page:next,drawing:nextDrawing,run,changesDrawing};
}

export function undoStudy(page,drawing,run,stamp){
 if(run.status==='undone')return {page,drawing,run};
 const next=structuredClone(page),scene=drawing&&structuredClone(drawing.scene);
 for(const {before,after}of run.annotationChanges){const current=next.items.find(x=>x.id===after.id);if(canonical(current)!==canonical(after))throw Error('An annotation was edited after this run. Undo would overwrite it.');next.items=next.items.filter(x=>x.id!==after.id);if(before.updatedAt!==undefined)next.items.push({...before,updatedAt:stamp});}
 for(const {before,after}of run.drawingChanges){const current=scene?.elements.find(x=>x.id===after.id);if(canonical(current)!==canonical(after))throw Error('A drawing was edited after this run. Undo would overwrite it.');scene.elements=scene.elements.flatMap(e=>e.id===after.id?(before.type?[before]:[]):[e]);}
 return {page:next,drawing:scene?{...drawing,scene,revision:crypto.randomUUID(),updatedAt:stamp}:null,run:{...run,status:'undone',updatedAt:stamp}};
}
