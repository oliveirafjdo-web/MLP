# Avante-like Redutron

Extensão MV3 + backend Node para métricas de anúncios do Mercado Livre.

## Recursos
- Card com métricas (preço, estoque, vendidos, visitas, conversão, faturamento).
- **Link clicável para a loja do vendedor**.
- **Ranking estimado do anúncio na categoria** (busca padrão, até 1000 resultados).
- Atualização automática ao trocar de anúncio (detecta navegação SPA) e a cada 30s.
- Login OAuth no **mesmo perfil do Chrome** (a aba abre normalmente no perfil atual).

## Como usar
1. Crie app no Mercado Livre e defina Redirect URI: `https://SEU-BACKEND.example.com/oauth/callback`.
2. Publique o backend (Render/Railway/etc.).
3. Na extensão (opções), configure a URL do backend.
4. Abra um anúncio e veja o card no canto inferior direito.

## Segurança
Nunca coloque o `client_secret` na extensão. Ele fica no backend.

## Cores
Aplicadas com paleta Redutron (azul marinho + acentos neon ciano/verde).

