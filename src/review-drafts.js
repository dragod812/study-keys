// Separate recovery records prevent two review tabs from replacing one draft.
export function reviewDrafts(storage,url){
  const prefix='study-keys-review-draft:'+url+':';
  return {
    put(draft){storage.setItem(prefix+draft.id,JSON.stringify({...draft,recoveredAt:Date.now()}));},
    remove(id){storage.removeItem(prefix+id);},
    list(){
      const drafts=[];
      // Recovery is an extra safeguard; a browser storage failure must not
      // prevent reading or saving through the authoritative local helper.
      try{
        for(let i=0;i<storage.length;i++){
          const key=storage.key(i);
          if(!key?.startsWith(prefix))continue;
          try{const draft=JSON.parse(storage.getItem(key));if(draft?.id&&typeof draft.text==='string'&&draft.text.trim())drafts.push(draft);}catch{}
        }
      }catch{}
      return drafts.sort((a,b)=>(b.recoveredAt||0)-(a.recoveredAt||0));
    },
  };
}
