import axios from 'axios';
const OAUTH_BASE = 'https://auth.mercadolibre.com';
const API_BASE   = 'https://api.mercadolibre.com';

export function buildAuthUrl({ clientId, redirectUri, state }) {
  const u = new URL(OAUTH_BASE + '/authorization');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  return u.toString();
}

export async function exchangeCode({ clientId, clientSecret, redirectUri, code }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });
  const { data } = await axios.post(`${API_BASE}/oauth/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data;
}

export async function refreshToken({ clientId, clientSecret, refresh_token }) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token
  });
  const { data } = await axios.post(`${API_BASE}/oauth/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data;
}

export async function apiGet(path, accessToken, params = {}) {
  const { data } = await axios.get(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params
  });
  return data;
}

export async function itemSummary(accessToken, itemId) {
  const item = await apiGet(`/items/${itemId}`, accessToken);

  const price     = item.price ?? item.base_price ?? null;
  const available = item.available_quantity ?? null;
  const sold      = item.sold_quantity ?? null;

  let seller_permalink = null, seller_nickname = null;
  try {
    const user = await apiGet(`/users/${item.seller_id}`, accessToken);
    seller_permalink = user.permalink || null;
    seller_nickname  = user.nickname  || null;
  } catch {}

  let visits30 = null;
  try {
    const v = await apiGet(`/visits/items`, accessToken, {
      ids: itemId,
      date_from: new Date(Date.now() - 30 * 864e5).toISOString()
    });
    visits30 = (v?.results?.[itemId]?.total) ?? null;
  } catch {}

  let rank = null, total = null;
  try {
    const site = item.site_id || (item.id?.slice(0,3)) || 'MLB';
    const cat  = item.category_id;
    let offset = 0, limit = 50, pos = null, count = null;
    while (offset < 1000 && pos === null) {
      const search = await apiGet(`/sites/${site}/search`, accessToken, { category: cat, limit, offset });
      if (count === null) count = search.paging?.total ?? null;
      const ids = (search.results || []).map(r => r.id);
      const idx = ids.indexOf(itemId);
      if (idx >= 0) pos = offset + idx + 1;
      if ((search.results || []).length < limit) break;
      offset += limit;
    }
    rank = pos; total = count;
  } catch {}

  return {
    id: item.id,
    title: item.title,
    price,
    available_quantity: available,
    sold_quantity: sold,
    date_created: item.date_created,
    last_updated: item.last_updated,
    visits_30d: visits30,
    orders_30d: null,
    conversion_30d: null,
    revenue_30d: null,
    seller_permalink,
    seller_nickname,
    rank_category: (rank && total) ? { position: rank, total } : null,
    permalink: item.permalink
  };
}
