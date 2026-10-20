const groups={r:'Review',d:'Document',v:'Select text',g:'Tab groups',e:'Quick spots',w:'Workspaces',p:'Library & search'};

// Presentation only: key matching and execution still use the command registry.
export function shortcutHints(commands,sequence){
  const choices=new Map();
  for(const command of commands){
    if(!sequence.every((key,i)=>command.keys[i]===key))continue;
    const rest=command.keys.slice(sequence.length);if(!rest.length)continue;
    const group=rest.length===1?command.hintGroup:null;
    const id=group?'group:'+group:rest[0];
    if(group&&choices.has(id)){choices.get(id).keys.push(rest[0]);continue;}
    choices.set(id,{keys:[rest[0]],label:rest.length===1?(command.hint||command.label.split(' · ')[0]):(groups[rest[0]]||rest[0])+' →',detail:command.label});
  }
  return [...choices.values()].map(({keys,...item})=>{
    const consecutive=keys.length>2&&keys.every((key,i)=>/^[1-9]$/.test(key)&&Number(key)===Number(keys[0])+i);
    return {...item,key:consecutive?keys[0]+'–'+keys.at(-1):keys.join(' / ')};
  });
}
