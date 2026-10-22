import mermaid from 'mermaid';

mermaid.initialize({startOnLoad:false,securityLevel:'strict',suppressErrorRendering:true,
  theme:'default',fontFamily:'system-ui, sans-serif',htmlLabels:false,
  flowchart:{htmlLabels:false,useMaxWidth:true},maxTextSize:80000,maxEdges:1000,
  secure:['secure','securityLevel','startOnLoad','suppressErrorRendering','maxTextSize','maxEdges',
    'theme','themeCSS','themeVariables','fontFamily','htmlLabels','flowchart']});
let queue=Promise.resolve(),sequence=0;
const cache=new Map();
export function diagramImage(source){
  if(cache.has(source))return cache.get(source);
  const result=queue.catch(()=>{}).then(async()=>{
    const host=document.createElement('div');host.dataset.studyKeysUi='';
    host.style.cssText='position:fixed;left:-10000px;top:0;width:960px;visibility:hidden';document.body.append(host);
    try{
      const {svg}=await mermaid.render('study-keys-diagram-'+(++sequence),source,host);
      // SVG images need intrinsic dimensions; width="100%" otherwise collapses
      // inside an inline media frame, making diagrams unreadably small.
      const tree=new DOMParser().parseFromString(svg,'image/svg+xml'),root=tree.documentElement;
      const dimensions=root.getAttribute('viewBox')?.split(/[ ,]+/).map(Number);
      if(dimensions?.length===4&&dimensions[2]>0&&dimensions[3]>0){
        root.setAttribute('width',String(Math.ceil(dimensions[2])));root.setAttribute('height',String(Math.ceil(dimensions[3])));
      }
      return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(root));
    }finally{host.remove();}
  });
  queue=result;cache.set(source,result);if(cache.size>80)cache.delete(cache.keys().next().value);return result;
}
