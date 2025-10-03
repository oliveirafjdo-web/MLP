(function(){
  let currentItem = null;
  const getItemOnPage = () => {
    const url = location.href;
    const match = url.match(/(ML[ABCR]\d{8,})/i) || document.body.innerHTML.match(/(ML[ABCR]\d{8,})/i);
    return match ? match[1].toUpperCase() : null;
  };

  function ensureCard(){
    let card=document.querySelector('.meli-avante-card');
    if(card) return card;
    card=document.createElement('div'); card.className='meli-avante-card';
    card.innerHTML=`
      <header>
        <div class="brand"><span class="dot"></span><span>Redutron Avante • <span id="avante-item"></span></span></div>
        <span class="meli-muted" id="avante-refresh" title="Atualizar">↻</span>
      </header>
      <div class="body" id="avante-body"><div class="meli-muted">Carregando…</div></div>`;
    document.documentElement.appendChild(card);
    return card;
  }

  async function load(itemId){
    const card = ensureCard();
    card.querySelector('#avante-item').textContent = itemId || '-';
    const body = card.querySelector('#avante-body');
    body.innerHTML = `<div class="meli-muted">Carregando…</div>`;
    chrome.runtime.sendMessage({type:'GET_ITEM_SUMMARY', itemId, pageUrl: location.href}, (resp)=>{
      if(!resp) return;
      if(resp.needsLogin){
        body.innerHTML = `<div class="login"><p>Faça login para puxar dados da API do Mercado Livre.</p><p class="meli-muted">Uma aba foi aberta com o login seguro.</p></div>`;
        return;
      }
      if(resp.error){ body.innerHTML = `<div style="color:#fca5a5">Erro: ${resp.error}</div>`; return; }
      const d=resp.data; const fmt=(n)=> (typeof n==='number' ? n.toLocaleString('pt-BR',{maximumFractionDigits:2}) : '-');
      const sellerLink = d.seller_permalink ? `<a href="${d.seller_permalink}" target="_blank" rel="noopener">Loja: ${d.seller_nickname||'vendedor'}</a>` : '';
      let rankLine = '-';
      if (d.rank_category && d.rank_category.total) {
        const pos = d.rank_category.position, tot = d.rank_category.total;
        rankLine = `<span class="${pos<=50?'rank-ok':'rank-miss'}">#${fmt(pos)}</span> de ${fmt(tot)} (busca padrão)`;
      }
      body.innerHTML = `
        <div class="meli-avante-grid">
          <div class="meli-pill"><div class="meli-muted">Preço</div><div>R$ ${fmt(d.price)}</div></div>
          <div class="meli-pill"><div class="meli-muted">Estoque</div><div>${fmt(d.available_quantity)}</div></div>
          <div class="meli-pill"><div class="meli-muted">Vendidos</div><div>${fmt(d.sold_quantity)}</div></div>
          <div class="meli-pill"><div class="meli-muted">Visitas (30d)</div><div>${fmt(d.visits_30d)}</div></div>
          <div class="meli-pill"><div class="meli-muted">Conversão (30d)</div><div>${d.conversion_30d!=null?(d.conversion_30d*100).toFixed(2)+'%':'-'}</div></div>
          <div class="meli-pill"><div class="meli-muted">Faturamento est. (30d)</div><div>R$ ${fmt(d.revenue_30d)}</div></div>
        </div>
        <div style="margin-top:10px" class="meli-muted">Criado: ${d.date_created ?? '-'} • Atualizado: ${d.last_updated ?? '-'}</div>
        <div style="margin-top:6px">${sellerLink}</div>
        <div style="margin-top:4px" class="meli-muted">Ranking na categoria: ${rankLine}</div>
      `;
    });
  }

  // Detecta navegação SPA do ML (muda a URL sem recarregar)
  const observeUrlChange = () => {
    let last = location.href;
    new MutationObserver(()=>{
      const now = location.href;
      if(now!==last){
        last = now;
        setTimeout(()=>{
          const id = getItemOnPage();
          if(id && id!==currentItem){ currentItem=id; load(currentItem); }
        }, 200);
      }
    }).observe(document, {subtree:true, childList:true});
    window.addEventListener('popstate', ()=>{
      const id=getItemOnPage(); if(id && id!==currentItem){ currentItem=id; load(currentItem); }
    });
  };

  // Botão refresh
  document.addEventListener('click',(e)=>{
    if(e.target && e.target.id==='avante-refresh'){
      if(currentItem) load(currentItem);
    }
  });

  // Auto refresh periódico
  setInterval(()=>{ if(currentItem) load(currentItem); }, 30000);

  // Inicializa
  const first = getItemOnPage();
  if(first){ currentItem=first; load(first); }
  observeUrlChange();
})();