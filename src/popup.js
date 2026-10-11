document.querySelector('#library').onclick=()=>chrome.runtime.openOptionsPage();
document.querySelector('#panel').onclick=()=>{chrome.windows.getCurrent().then(w=>chrome.sidePanel.open({windowId:w.id}));};

document.querySelector('#drawing').onclick=async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});try{await chrome.tabs.sendMessage(tab.id,{type:'openNotebook'});window.close();}catch{document.querySelector('#drawing').textContent='Reload the webpage first';}};
