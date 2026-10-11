import {request} from './transport.js';
let command='';
function updateCommand(){command='python3 install.py --extension-id '+chrome.runtime.id+[...document.querySelectorAll('[name="agent-client"]:checked')].map(el=>' --client '+el.value).join('');document.querySelector('#install-command').textContent=command;}
document.querySelectorAll('[name="agent-client"]').forEach(el=>el.onchange=updateCommand);updateCommand();
document.querySelector('#copy-command').onclick=async()=>{
 try{await navigator.clipboard.writeText(command);document.querySelector('#copy-command').textContent='Copied';}
 catch{document.querySelector('#copy-command').textContent='Select and copy the command above';}
};
async function check(){
 const button=document.querySelector('#check'),line=document.querySelector('#connection-status');button.disabled=true;line.textContent='Checking the local helper…';line.className='';
 try{const s=await request({type:'storageStatus'});line.textContent=s.online?'Connected · '+s.folder+' · companion '+(s.companionVersion||'update needed'):'Setup needed · '+s.error;line.className=s.online?'':'error';document.querySelector('#agent-access').checked=s.agentAccess;document.querySelector('#agent-status').textContent=!s.mcp?'Update the companion above to install the MCP server.':s.agentAccess?'AI access enabled. Your configured agent can connect to this browser.':'MCP installed. Enable AI access below to connect agents to this browser.';}
 catch(e){line.textContent=e.message;line.className='error';}finally{button.disabled=false;}
}
document.querySelector('#check').onclick=check;
document.querySelector('#agent-access').onchange=async e=>{try{await request({type:'agentAccess',enabled:e.target.checked});await check();}catch(error){document.querySelector('#agent-status').textContent=error.message;}};
check();

const fileAccess=document.querySelector('#file-access-status');
chrome.extension.isAllowedFileSchemeAccess(allowed=>{fileAccess.textContent=allowed?'Local-file access is enabled. Reload your local document tab after updating.':'Local-file access is off. Open extension details and enable Allow access to file URLs.';});
document.querySelector('#file-access').onclick=()=>chrome.tabs.create({url:'chrome://extensions/?id='+chrome.runtime.id});
