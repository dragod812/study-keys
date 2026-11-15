// Per-loaded-revision cache: shared across view switches, discarded on Load latest.
// Keep in-flight deduplication without retaining unlimited image data URLs.
export function reviewAssetCache(limit=24*1024*1024){
 const items=new Map();let bytes=0;
 return {
  get(key,load){
   if(items.has(key)){const entry=items.get(key);items.delete(key);items.set(key,entry);return entry.promise;}
   const entry={bytes:0,promise:null};
   entry.promise=Promise.resolve().then(load).then(value=>{
    if(items.get(key)!==entry)return value;
    entry.bytes=2*(value.data?.length||0);bytes+=entry.bytes;
    for(const [old,item] of items){if(bytes<=limit)break;items.delete(old);bytes-=item.bytes;}
    return value;
   },error=>{if(items.get(key)===entry)items.delete(key);throw error;});
   items.set(key,entry);return entry.promise;
  },
  clear(){items.clear();bytes=0;},
 };
}
