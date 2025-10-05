// Redutron Avante - Content Script Corrigido

console.log('[Redutron Avante] Content script ativo.');

const getItemOnPage = () => {
  const urlId = (location.href.match(/(ML[ABCR][A-Z0-9]*\d{6,})/i) || [])[1];
  if (urlId) return urlId.toUpperCase();

  const canon = document.querySelector('link[rel="canonical"]')?.href;
  const canonId = canon && (canon.match(/(ML[ABCR][A-Z0-9]*\d{6,})/i) || [])[1];
  if (canonId) return canonId.toUpperCase();

  const og = document.querySelector('meta[property="og:url"]')?.content;
  const ogId = og && (og.match(/(ML[ABCR][A-Z0-9]*\d{6,})/i) || [])[1];
  if (ogId) return ogId.toUpperCase();

  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')];
  for (const s of ld) {
    try {
      const d = JSON.parse(s.textContent || '{}');
      const maybeId = d?.sku || d?.productID || d?.mpn || d?.gtin13 || d?.gtin;
      if (typeof maybeId === 'string') {
        const m = maybeId.match(/(ML[ABCR][A-Z0-9]*\d{6,})/i);
        if (m) return m[1].toUpperCase();
      }
      const url = d?.url;
      const mid = typeof url === 'string' && (url.match(/(ML[ABCR][A-Z0-9]*\d{6,})/i) || [])[1];
      if (mid) return mid.toUpperCase();
    } catch {}
  }

  try {
    const m = String(window.utag_data?.item_id || '').match(/(ML[ABCR][A-Z0-9]*\d{6,})/i);
    if (m) return m[1].toUpperCase();
  } catch {}

  const htmlId = (document.documentElement.innerHTML.match(/(ML[ABCR][A-Z0-9]*\d{6,})/i) || [])[1];
  if (htmlId) return htmlId.toUpperCase();

  return null;
};

function createFloatingCard() {
  const id = getItemOnPage();
  if (!id) return;

  let card = document.getElementById('redutron-card');
  if (card) card.remove();

  card = document.createElement('div');
  card.id = 'redutron-card';
  card.style.cssText = `
    position: fixed;
    bottom: 15px;
    right: 15px;
    z-index: 999999;
    width: 280px;
    background: rgba(15, 23, 42, 0.9);
    color: white;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    box-shadow: 0 0 10px rgba(0,0,0,0.4);
    padding: 10px;
    backdrop-filter: blur(6px);
  `;

  const title = document.createElement('div');
  title.textContent = 'Redutron Avante • ' + id;
  title.style = 'font-weight:bold; margin-bottom:8px; color:#38bdf8; font-size:13px;';

  const body = document.createElement('div');
  body.innerHTML = '<i>Carregando dados...</i>';
  body.style.fontSize = '13px';

  card.appendChild(title);
  card.appendChild(body);
  document.body.appendChild(card);

  fetch(`https://mlp-o4qk.onrender.com/api/item/${id}/summary`)
    .then(r => r.json())
    .then(resp => {
      if (resp?.error) {
        body.innerHTML = `<div style="color:#fca5a5">
          Erro ao buscar dados.<br><small>${resp.error || resp.detail || ''}</small>
        </div>`;
        return;
      }
      if (!resp || !resp.id) {
        body.innerHTML = `<div style="color:#aaa">Sem dados para este anúncio.</div>`;
        return;
      }
      const data = resp;
      body.innerHTML = `
        <div>💰 <b>Preço:</b> R$ ${data.price ?? '-'}</div>
        <div>📦 <b>Estoque:</b> ${data.available_quantity ?? '-'}</div>
        <div>🛒 <b>Vendidos:</b> ${data.sold_quantity ?? '-'}</div>
        <div>👁️ <b>Visitas (30d):</b> ${data.visits_30d ?? '-'}</div>
        <div>📈 <b>Conversão:</b> ${data.conversion_30d ? (data.conversion_30d*100).toFixed(2)+'%' : '-'}</div>
        <div>💵 <b>Faturamento (30d):</b> R$ ${data.revenue_30d?.toFixed?.(2) ?? '-'}</div>
        <div style="margin-top:6px;font-size:11px;color:#aaa">
          Criado: ${data.date_created?.slice(0,10) ?? '-'}<br>
          Atualizado: ${data.last_updated?.slice(0,10) ?? '-'}<br>
          Ranking: ${(data.rank_category?.position ?? '-')}/${(data.rank_category?.total ?? '-')}
        </div>
        <div style="margin-top:6px">
          <a href="${data.seller_permalink}" target="_blank" style="color:#38bdf8;text-decoration:none">
            👤 ${data.seller_nickname ?? 'Ver loja'}
          </a>
        </div>
      `;
    })
    .catch(err => {
      body.innerHTML = `<span style="color:#f87171">Erro de rede: ${err.message}</span>`;
    });
}

setTimeout(createFloatingCard, 3000);
