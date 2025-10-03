import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { authUrl, exchangeCode, refreshToken, itemSummary } from './meli.js';

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(session({
  secret:'troque-isto',
  resave:false,
  saveUninitialized:false,
  cookie:{ httpOnly:true, sameSite:'lax' }
}));

// CORS só para a extensão/origem que você usa
app.use(cors({ origin: true, credentials: true }));

const CFG={
  clientId: process.env.ML_CLIENT_ID,
  clientSecret: process.env.ML_CLIENT_SECRET,
  redirectUri: process.env.ML_REDIRECT_URI,
  baseUrl: process.env.BASE_URL
};

const store=new Map(); // sessionId -> tokens

function ensureAuth(req,res,next){
  const sid=req.session.id; const t=store.get(sid);
  if(!t) return res.status(401).json({error:'not_logged_in'});
  next();
}
async function getValidToken(req){
  const sid=req.session.id; let t=store.get(sid); if(!t) return null;
  if(Date.now()>t.expires_at-60_000){
    const r=await refreshToken({clientId:CFG.clientId, clientSecret:CFG.clientSecret, refreshToken:t.refresh_token});
    t={access_token:r.access_token, refresh_token:r.refresh_token??t.refresh_token, expires_at:Date.now()+r.expires_in*1000};
    store.set(sid,t);
  }
  return t.access_token;
}

app.get('/login',(req,res)=>{
  const state=uuid(); req.session.state=state;
  const redirect=req.query.redirect||''; if(redirect) req.session.post_login_redirect=redirect;
  res.redirect(authUrl({clientId:CFG.clientId, redirectUri:CFG.redirectUri, state}));
});

app.get('/oauth/callback', async (req,res)=>{
  const {code,state}=req.query;
  if(!code || state!==req.session.state) return res.status(400).send('Estado inválido.');
  try{
    const tok=await exchangeCode({clientId:CFG.clientId, clientSecret:CFG.clientSecret, redirectUri:CFG.redirectUri, code});
    store.set(req.session.id, {access_token:tok.access_token, refresh_token:tok.refresh_token, expires_at:Date.now()+tok.expires_in*1000});
    res.send('<script>window.close && window.close();</script>Login concluído. Volte para a aba do anúncio.');
  }catch(e){ res.status(500).send('Falha no OAuth: '+e); }
});

app.get('/api/item/:id/summary', ensureAuth, async (req,res)=>{
  try{
    const token = await getValidToken(req);
    const data = await itemSummary(token, req.params.id);
    res.json(data);
  }catch(e){ res.status(500).json({error:String(e)}); }
});

const port=process.env.PORT||8080;
app.listen(port, ()=> console.log('Backend on', port));