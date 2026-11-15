// Excalidraw 0.18.1 includes social/gist srcdoc script loaders even when
// validateEmbeddable=false. Remove these branches from the shipped bundle.
// Pinned upstream boundaries deliberately fail closed when the dependency changes.
export function removeRemoteEmbedLoaders(source){
  if(!source.includes('https://platform.twitter.com/widgets.js'))return {source,patched:false};
  const start=source.indexOf('if(H2.test(e)){');
  const end=source.indexOf('return Xt.set(e,{link:e',start);
  const removed=source.slice(start,end);
  if(start<0||end<start||!removed.includes('https://embed.reddit.com/widgets.js')||
    !removed.includes('https://gist.github.com/')||(removed.match(/srcdoc:/g)||[]).length!==3)
    throw Error('Excalidraw embed loader changed; review the MV3 patch before building.');
  return {source:source.slice(0,start)+source.slice(end),patched:true};
}

export function remoteCodeFindings(source){
  const checks=[
    ['script loader in generated HTML',/<script\s+[^>]*\bsrc\s*=/i],
    ['Twitter widget script',/platform\.twitter\.com\/widgets\.js/],
    ['Reddit widget script',/embed\.reddit\.com\/widgets\.js/],
    ['remote module import',/\bimport\s*(?:\(\s*|[^;\n]*?\bfrom\s*)["'`]https?:\/\//],
    ['remote worker script',/\b(?:Worker|importScripts)\s*\(\s*["'`]https?:\/\//],
  ];
  return checks.filter(([,pattern])=>pattern.test(source)).map(([label])=>label);
}
