import {readerTabAPI} from './reader-tabs.js';
const readingAPI=readerTabAPI(chrome);
document.querySelector('#library').onclick=()=>chrome.runtime.openOptionsPage();
document.querySelector('#review').onclick=async()=>{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  const result=await chrome.runtime.sendMessage({type:'openReview',tabId:tab.id});
  if(result?.ok)window.close();else document.querySelector('#review').textContent=result?.error||'Open a local document first';
};
document.querySelector('#panel').onclick=()=>{chrome.windows.getCurrent().then(w=>chrome.sidePanel.open({windowId:w.id}));};

document.querySelector('#drawing').onclick=async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});try{await readingAPI.tabs.sendMessage(tab.id,{type:'openNotebook'});window.close();}catch{document.querySelector('#drawing').textContent='Reload the webpage first';}};
