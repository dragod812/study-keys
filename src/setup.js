import {request} from './transport.js';
const command='python3 install.py --extension-id '+chrome.runtime.id;
document.querySelector('#install-command').textContent=command;
document.querySelector('#copy-command').onclick=async()=>{
 try{await navigator.clipboard.writeText(command);document.querySelector('#copy-command').textContent='Copied';}
 catch{document.querySelector('#copy-command').textContent='Select and copy the command above';}
};
async function check(){
 const button=document.querySelector('#check'),line=document.querySelector('#connection-status');button.disabled=true;line.textContent='Checking the local helper…';line.className='';
 try{const s=await request({type:'storageStatus'});line.textContent=s.online?'Connected · '+s.folder:'Setup needed · '+s.error;line.className=s.online?'':'error';}
 catch(e){line.textContent=e.message;line.className='error';}finally{button.disabled=false;}
}
document.querySelector('#check').onclick=check;
check();
