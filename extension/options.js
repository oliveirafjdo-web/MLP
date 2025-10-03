const backendInput=document.getElementById('backend');const msg=document.getElementById('msg');
chrome.storage.sync.get(['backendUrl'],({backendUrl})=>{if(backendUrl)backendInput.value=backendUrl;});
document.getElementById('save').addEventListener('click',async()=>{const url=backendInput.value.trim().replace(/\/+$/,'');await chrome.storage.sync.set({backendUrl:url});msg.textContent='Salvo!';});