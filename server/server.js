import express from "express";
import session from "express-session";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "redutron_secret",
    resave: false,
    saveUninitialized: true,
  })
);

// ===============================
// CONFIG MERCADO LIVRE
// ===============================
const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const ML_REDIRECT_URI = process.env.ML_REDIRECT_URI;

// ===============================
// TESTES E STATUS
// ===============================
app.get("/", (req, res) => res.send("✅ Redutron backend ativo!"));
app.get("/health", (req, res) => res.json({ ok: true }));

// ===============================
// LOGIN MERCADO LIVRE
// ===============================
app.get("/login", (req, res) => {
  const url = `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${ML_REDIRECT_URI}`;
  res.redirect(url);
});

// ===============================
// CALLBACK DE LOGIN
// ===============================
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Código ausente");

  try {
    const response = await axios.post(
      "https://api.mercadolibre.com/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri: ML_REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    req.session.token = response.data;
    res.send("✅ Login realizado com sucesso! Pode fechar esta aba e voltar à extensão.");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// ===============================
// FUNÇÃO REFRESH TOKEN
// ===============================
async function refreshAccessToken(refresh_token) {
  const response = await axios.post(
    "https://api.mercadolibre.com/oauth/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data;
}

// ===============================
// API: /api/me
// ===============================
app.get("/api/me", async (req, res) => {
  try {
    let token = req.session.token;
    if (!token) return res.status(401).send("Usuário não autenticado");

    const response = await axios.get("https://api.mercadolibre.com/users/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    res.json(response.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// ===============================
// API: /api/item/:id/summary
// ===============================
app.get("/api/item/:id/summary", async (req, res) => {
  const itemId = req.params.id;
  try {
    let token = req.session.token;
    if (!token) return res.status(401).send("Usuário não autenticado");

    // Dados principais do item
    const itemResp = await axios.get(`https://api.mercadolibre.com/items/${itemId}`);
    const item = itemResp.data;

    // Estatísticas de visitas
    const visitsResp = await axios.get(
      `https://api.mercadolibre.com/items/${itemId}/visits/time_window?last=30&unit=day`
    );

    res.json({
      id: item.id,
      title: item.title,
      price: item.price,
      available_quantity: item.available_quantity,
      sold_quantity: item.sold_quantity,
      permalink: item.permalink,
      seller_id: item.seller_id,
      visits_30d: visitsResp.data.total_visits || 0,
      date_created: item.date_created,
      last_updated: item.last_updated,
    });
  } catch (err) {
    res.status(404).json({ error: err.response?.data || err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Redutron backend rodando na porta ${PORT}`));
