async function getBackend(){const {backendUrl}=await chrome.storage.sync.get(['backendUrl']);return backendUrl;}
chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
  if(msg.type==='GET_ITEM_SUMMARY'){
    (async()=>{
      try{
        const backend=await getBackend(); if(!backend) throw new Error('Backend URL não configurada nas opções.');
        const r=await fetch(`${backend}/api/item/${encodeURIComponent(msg.itemId)}/summary`,{credentials:'include'});
        if(r.status===401){const loginUrl=`${backend}/login?redirect=${encodeURIComponent(msg.pageUrl)}`;
          await chrome.tabs.create({url:loginUrl}); sendResponse({needsLogin:true}); return;}
        const data=await r.json(); sendResponse({data});
      }catch(e){sendResponse({error:e.message});}
    })(); return true;
  }
});