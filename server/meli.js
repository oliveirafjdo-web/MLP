  import axios from 'axios';

// Domínios oficiais
const OAUTH_BASE = 'https://auth.mercadolibre.com';   // ✅ corrigido (sem .br)
const API_BASE   = 'https://api.mercadolibre.com';

// Monta a URL de autenticação (login)
export function authUrl({ clientId, redirectUri, state }) {
  const p = new URL(OAUTH_BASE + '/authorization');
  p.searchParams.set('response_type', 'code');
  p.searchParams.set('client_id', clientId);
  p.searchParams.set('redirect_uri', redirectUri);
  p.searchParams.set('state', state);
  return p.toString();
}

// ────────────────────────────────
// Troca CODE por ACCESS TOKEN (x-www-form-urlencoded)
// ────────────────────────────────
export async function exchangeCode({ clientId, clientSecret, redirectUri, code }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });
  const { data } = await axios.post(
    `${API_BASE}/oauth/token`,
    body.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return data;
}

// ────────────────────────────────
// Refresh de token (x-www-form-urlencoded)
// ────────────────────────────────
export async function refreshToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  });
  const { data } = await axios.post(
    `${API_BASE}/oauth/token`,
    body.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return data;
}

// GET genérico autenticado
export async function apiGet(path, accessToken, params = {}) {
  const { data } = await axios.get(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params
  });
  return data;
}

// Resumo do item: preço/estoque/vendidos/visitas/pedidos/ranking
export async function itemSummary(accessToken, itemId) {
  const item = await apiGet(`/items/${itemId}`, accessToken);
  const price     = item.price ?? item.base_price ?? null;
  const available = item.available_quantity ?? null;
  const sold      = item.sold_quantity ?? null;

  // Dados do vendedor
  let seller_permalink = null, seller_nickname = null;
  try {
    const user = await apiGet(`/users/${item.seller_id}`, accessToken);
    seller_permalink = user.permalink || null;
    seller_nickname  = user.nickname  || null;
  } catch {}

  // Visitas 30d
  let visits30 = null;
  try {
    const v = await apiGet(`/visits/items`, accessToken, {
      ids: itemId,
      date_from: new Date(Date.now() - 30 * 864e5).toISOString()
    });
    visits30 = (v?.results?.[itemId]?.total) ?? null;
  } catch {}

  // Pedidos pagos 30d
  let orders30 = null;
  try {
    const dateFrom = new Date(Date.now() - 30 * 864e5).toISOString();
    const dateTo   = new Date().toISOString();
    const orders   = await apiGet(`/orders/search`, accessToken, {
      order_status: 'paid',
      tags: 'paid',
      date_created_from: dateFrom,
      date_created_to: dateTo,
      item: itemId
    });
    orders30 = orders?.paging?.total ?? orders?.results?.length ?? null;
  } catch {}

  // Ranking na categoria (estimativa via busca padrão)
  let rank = null, total = null;
  try {
    const cat = item.category_id;
    let offset = 0, limit = 50, pos = null, count = null;
    while (offset < 1000 && pos === null) {
      const search = await apiGet(`/sites/MLB/search`, accessToken, { category: cat, limit, offset });
      if (count === null) count = search.paging?.total ?? null;
      const ids = (search.results || []).map(r => r.id);
      const idx = ids.indexOf(itemId);
      if (idx >= 0) pos = offset + idx + 1;
      if ((search.results || []).length < limit) break;
      offset += limit;
    }
    rank = pos;
    total = count;
  } catch {}

  const conversion = (visits30 && orders30) ? (orders30 / visits30) : null;
  const revenue30  = (orders30 && price)    ? (orders30 * price)    : null;

  return {
    id: item.id,
    title: item.title,
    price,
    available_quantity: available,
    sold_quantity: sold,
    date_created: item.date_created,
    last_updated: item.last_updated,
    visits_30d: visits30,
    orders_30d: orders30,
    conversion_30d: conversion,
    revenue_30d: revenue30,
    seller_permalink,
    seller_nickname,
    rank_category: (rank && total) ? { position: rank, total } : null
  };
}
