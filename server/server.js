import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import { buildAuthUrl, exchangeCode, refreshToken, itemSummary } from './meli.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'redutron_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

const CFG = {
  clientId: process.env.ML_CLIENT_ID,
  clientSecret: process.env.ML_CLIENT_SECRET,
  redirectUri: process.env.ML_REDIRECT_URI
};

app.get('/', (_,res)=>res.send('✅ Redutron backend ativo!'));
app.get('/health', (_,res)=>res.json({ ok: true }));
app.get('/debug-config', (req,res)=>res.json({ ml_client_id: CFG.clientId||null, ml_redirect_uri: CFG.redirectUri||null, logged_in: !!req.session.token }));

app.get('/login', (req,res)=>{
  const state = uuid();
  req.session.oauth_state = state;
  const url = buildAuthUrl({ clientId: CFG.clientId, redirectUri: CFG.redirectUri, state });
  res.redirect(url);
});

app.get('/oauth/callback', async (req,res)=>{
  const { code, state } = req.query;
  if (!code || state !== req.session.oauth_state) return res.status(400).send('Estado inválido ou código ausente');
  try {
    const data = await exchangeCode({ clientId: CFG.clientId, clientSecret: CFG.clientSecret, redirectUri: CFG.redirectUri, code });
    req.session.token = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + (data.expires_in*1000) };
    res.send('✅ Login realizado! Pode fechar esta aba e voltar ao anúncio.');
  } catch (e) {
    res.status(500).json({ error: 'oauth_error', detail: e.response?.data || e.message });
  }
});

async function getAccessToken(req){
  let tok = req.session.token;
  if (!tok) return null;
  if (Date.now() > (tok.expires_at - 60_000)) {
    try {
      const r = await refreshToken({ clientId: CFG.clientId, clientSecret: CFG.clientSecret, refresh_token: tok.refresh_token });
      tok = { access_token: r.access_token, refresh_token: r.refresh_token ?? tok.refresh_token, expires_at: Date.now() + (r.expires_in*1000) };
      req.session.token = tok;
    } catch (e) { return null; }
  }
  return tok.access_token;
}

app.get('/api/me', async (req,res)=>{
  const token = await getAccessToken(req);
  if (!token) return res.status(401).json({ error: 'not_logged_in', message: 'Usuário não autenticado' });
  try {
    const { data } = await axios.get('https://api.mercadolibre.com/users/me', { headers: { Authorization: `Bearer ${token}` } });
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'backend_error', detail: e.response?.data || e.message });
  }
});

app.get('/api/item/:id/summary', async (req,res)=>{
  const token = await getAccessToken(req);
  if (!token) return res.status(401).json({ error: 'not_logged_in', message: 'Usuário não autenticado' });
  try {
    const data = await itemSummary(token, req.params.id);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'backend_error', detail: e.response?.data || e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log('🚀 Redutron backend na porta', port));
