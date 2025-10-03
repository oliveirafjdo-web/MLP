# Avante-like Redutron 🔵✨

Extensão **Chrome MV3** + **Backend Node/Express** para exibir métricas avançadas de anúncios do **Mercado Livre**, inspirado no Avante Black — mas 100% customizado com as cores e identidade **Redutron**.

---

## 🚀 Recursos

- 📊 **Métricas em tempo real**: preço, estoque, vendidos, visitas, conversão, faturamento estimado.  
- 🏬 **Link direto e clicável para a loja do vendedor**.  
- 📈 **Ranking estimado do anúncio na categoria** (posição e total de itens).  
- 🔄 **Atualização automática** a cada troca de anúncio (detecta SPA) + refresh a cada 30s.  
- 🔐 **Login OAuth seguro** (abre no mesmo perfil do Chrome, não em janela anônima).  
- 🎨 **Interface com paleta Redutron** (azul marinho + neon ciano/verde).  

---

## 📦 Estrutura do projeto

```
meli-avante-like/
  extension/   -> código da extensão Chrome (manifest v3, content script, styles)
  server/      -> backend Node/Express que faz o proxy seguro com a API do Mercado Livre
```

---

## 🛠️ Como rodar

### 1) Backend
1. Crie um app em [Mercado Livre Developers](https://developers.mercadolivre.com.br/).  
   - Configure o **Redirect URI**: `https://SEU-BACKEND/oauth/callback`  
   - Pegue o `CLIENT_ID` e `CLIENT_SECRET`  
2. No servidor, configure:
   ```bash
   cd server
   cp .env.example .env
   # edite .env com suas credenciais
   npm install
   npm start
   ```
3. Suba o backend em HTTPS (Render, Railway, VPS etc).

### 2) Extensão
1. Abra `chrome://extensions`  
2. Ative **Modo do desenvolvedor**  
3. Clique em **Carregar sem compactação** e selecione a pasta `extension/`  
4. Nas **Opções** da extensão, configure a URL do backend  
5. Abra um anúncio do Mercado Livre → o card Redutron aparece no canto inferior direito 🎉  

---

## 🎨 Screenshots (placeholder)

> *(Adicione aqui prints do card funcionando no anúncio)*

---

## ⚠️ Segurança

- Nunca publique o arquivo real `.env` no GitHub.  
- O repositório já contém um `.gitignore` que ignora `server/.env` e `node_modules`.  
- Use sempre o `.env.example` como referência.

---

## 📜 Licença

[MIT License](LICENSE) © 2025 [Julio Oliveira](https://github.com/SEU_USUARIO)

---

## ⭐ Dê um Star!

Se este projeto te ajudou, deixe um ⭐ no repositório para apoiar o desenvolvimento 😉  
