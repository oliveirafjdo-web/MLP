import express from 'express';
import axios from 'axios';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';

const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = cfg;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [/^https:\/\/.*\.mercadolivre\.com\.br$/, 'https://www.mercadolivre.com.br', 'https://produto.mercadolivre.com.br'],
  credentials: true
}));

function getToken(req){ return req.cookies?.ml_access_token || null; }
function setToken(res, token){
  const maxAge = 60 * 60 * 1000;
  res.cookie('ml_access_token', token, { httpOnly:true, secure:true, sameSite:'None', path:'/', maxAge });
}

app.get('/', (req,res)=> res.type('html').send('✅ Redutron backend ativo!'));

app.get('/api/me', async (req,res)=>{
  const token = getToken(req);
  if (!token) return res.status(401).json({ error:'not_logged_in' });
  try{
    const me = await axios.get('https://api.mercadolibre.com/users/me',{ headers:{ Authorization:`Bearer ${token}` }});
    res.json(me.data);
  }catch(e){ res.status(500).json({ error:'backend_error', detail:e.response?.data || String(e) }); }
});

app.get('/login', (req,res)=>{
  const state = Math.random().toString(36).slice(2);
  const url = `https://auth.mercadolibre.com/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
  res.redirect(url);
});

app.get('/oauth/callback', async (req,res)=>{
  const { code } = req.query;
  if (!code) return res.status(400).send('Faltou code');
  try{
    const r = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
      params: { grant_type:'authorization_code', client_id:CLIENT_ID, client_secret:CLIENT_SECRET, code, redirect_uri:REDIRECT_URI },
      headers: { 'Content-Type':'application/x-www-form-urlencoded' }
    });
    setToken(res, r.data.access_token);
    res.type('html').send('<script>window.close();</script>Login OK, pode fechar esta aba.');
  }catch(e){ res.status(500).json({ error:'oauth_exchange_failed', detail:e.response?.data || String(e) }); }
});

app.get('/api/item/:id/summary', async (req,res)=>{
  const token = getToken(req);
  if (!token) return res.status(401).json({ error:'not_logged_in', message:'Usuário não autenticado' });
  const id = String(req.params.id||'').toUpperCase();
  try{
    const item = await axios.get(`https://api.mercadolibre.com/items/${id}`, { headers:{ Authorization:`Bearer ${token}` }});
    const it = item.data;
    let visits30 = null;
    try{
      const v = await axios.get(`https://api.mercadolibre.com/items/${id}/visits/time_window`, { params:{ last:30 }, headers:{ Authorization:`Bearer ${token}` }});
      if (Array.isArray(v.data?.results)) visits30 = v.data.results.reduce((a,r)=>a+(r.total||0),0);
      else if (typeof v.data?.total === 'number') visits30 = v.data.total;
    }catch(e){}
    let seller_permalink=null, seller_nickname=null;
    try{
      if (it.seller_id){
        const s = await axios.get(`https://api.mercadolibre.com/users/${it.seller_id}`, { headers:{ Authorization:`Bearer ${token}` }});
        seller_permalink = s.data?.permalink || null;
        seller_nickname = s.data?.nickname || null;
      }
    }catch(e){}
    res.json({
      id: it.id, title: it.title, price: it.price, currency_id: it.currency_id,
      available_quantity: it.available_quantity, sold_quantity: it.sold_quantity,
      date_created: it.date_created, last_updated: it.last_updated,
      visits_30d: visits30, seller_permalink, seller_nickname
    });
  }catch(e){
    res.status(e.response?.status || 500).json({ error:'backend_error', detail:e.response?.data || String(e) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log('Backend on', PORT));
