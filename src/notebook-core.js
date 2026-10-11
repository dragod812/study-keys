// Shared by the window, storage worker and tests. No browser dependencies.
export const PLACEMENTS = [
  ['float','Float'],['left','Left half'],['right','Right half'],['top','Top half'],['bottom','Bottom half'],
  ['top-left','Top left'],['top-right','Top right'],['bottom-left','Bottom left'],['bottom-right','Bottom right'],['max','Maximize'],
];
export function cleanLayout(raw={}) {
  const finite=(v,f)=>Number.isFinite(v)?Math.max(0,Math.min(20000,v)):f;
  return {placement:PLACEMENTS.some(([p])=>p===raw.placement)?raw.placement:'float',
    x:finite(raw.x,80),y:finite(raw.y,60),width:finite(raw.width,900),height:finite(raw.height,650)};
}
export function windowRect(raw,width,height) {
  const l=cleanLayout(raw),gap=8,w=Math.max(1,width-2*gap),h=Math.max(1,height-2*gap);
  const halfW=(w-gap)/2,halfH=(h-gap)/2,p=l.placement;
  if(p==='max')return {x:gap,y:gap,width:w,height:h};
  if(p!=='float') {
    const corner=p.includes('-'),vertical=p==='left'||p==='right';
    const rw=corner||vertical?Math.min(w,Math.max(Math.min(360,w),halfW)):w;
    const rh=corner||!vertical?Math.min(h,Math.max(Math.min(300,h),halfH)):h;
    return {x:p.includes('right')?width-gap-rw:gap,y:p.includes('bottom')?height-gap-rh:gap,width:rw,height:rh};
  }
  const rw=Math.max(Math.min(360,w),Math.min(w,l.width)),rh=Math.max(Math.min(300,h),Math.min(h,l.height));
  return {x:Math.max(gap,Math.min(width-gap-rw,l.x)),y:Math.max(gap,Math.min(height-gap-rh,l.y)),width:rw,height:rh};
}
export function snapPlacement(x,y,w,h) {
  const left=x<32,right=x>w-32,top=y<32,bottom=y>h-32;
  return top&&left?'top-left':top&&right?'top-right':bottom&&left?'bottom-left':bottom&&right?'bottom-right':left?'left':right?'right':top?'top':bottom?'bottom':null;
}
export function cleanScene(raw) {
  if(!raw||raw.type!=='excalidraw'||!Array.isArray(raw.elements)||raw.elements.length>50000)throw Error('Choose a valid Excalidraw scene with fewer than 50,000 elements.');
  const text=JSON.stringify(raw);if(text.length>20*1024*1024)throw Error('This notebook exceeds the 20 MB local scene limit. Export a copy and split it into smaller notebooks.');
  const scene=JSON.parse(text);
  if(!scene.appState||typeof scene.appState!=='object'||Array.isArray(scene.appState))scene.appState={};
  if(!scene.files||typeof scene.files!=='object'||Array.isArray(scene.files))scene.files={};
  // Only embedded image bytes may be loaded. Never fetch URLs from an import.
  for(const file of Object.values(scene.files))if(!file||typeof file.dataURL!=='string'||!/^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml|avif);base64,/i.test(file.dataURL))throw Error('Drawing images must be embedded in the .excalidraw file.');
  for(const element of scene.elements)if(!element||typeof element!=='object'||typeof element.id!=='string'||typeof element.type!=='string')throw Error('Invalid drawing element.');
  return scene;
}
export function cleanDrawing(raw) {
  if(!raw||typeof raw.title!=='string'||!Number.isSafeInteger(raw.updatedAt)||raw.updatedAt<0||typeof raw.revision!=='string')throw Error('Invalid drawing in backup.');
  return {title:raw.title.slice(0,500),scene:cleanScene(raw.scene),revision:raw.revision.slice(0,100),updatedAt:raw.updatedAt};
}
