# Auditoria de escopo de arquivos

Data: 22 de setembro de 2026. Critério: manter somente telas representadas em `Zytrix-Figma/docs` e dependências necessárias para essas telas.

## KEEP — FIGMA

- `index.html` — Início.
- `categorias.html` — lista de categorias.
- `categoria.html` — template reutilizável de categoria e subcategoria.
- `ao-vivo.html` — catálogo de transmissões.
- `live.html` — reprodução da transmissão e chat.
- `login.html` — entrar.
- `registro.html` — cadastro.
- `recuperar-senha.html` — recuperação de senha.
- `sobre.html` — Sobre.
- `perfil.html` — perfil autenticado.
- `config-live.html` — configuração de live.
- `sair.html` — confirmação e execução de logout.

## KEEP — DEPENDÊNCIA

- `.firebaserc`, `firebase.json`, `firestore.indexes.json`, `firestore.rules` — configuração, consultas e autorização Firebase/Firestore.
- `.gitignore` — higiene do repositório.
- `vercel.json` — somente URLs limpas e cabeçalhos de segurança/CSP necessários ao deploy estático.
- `package.json` — comandos locais de teste e auditoria; sem dependências de produção.
- `assets/css/styles.css`, `assets/css/figma.css` — base visual e reconstrução fiel.
- `assets/fonts/OFL-Rajdhani.txt`, `assets/fonts/OFL-Teko.txt`, `assets/fonts/rajdhani-400.woff2`, `assets/fonts/rajdhani-600.woff2`, `assets/fonts/rajdhani-700.woff2`, `assets/fonts/teko-600-700.woff2` — tipografia e licenças.
- `assets/js/ao-vivo.js`, `assets/js/auth-pages.js`, `assets/js/categoria.js`, `assets/js/categorias.js`, `assets/js/config-live.js`, `assets/js/firebase.js`, `assets/js/home.js`, `assets/js/live-ranking.js`, `assets/js/live.js`, `assets/js/page-shell.js`, `assets/js/perfil.js`, `assets/js/sair.js`, `assets/js/security.js`, `assets/js/streaming.js`, `assets/js/support-alert-sound.js`, `assets/js/ui.js` — comportamento das telas, autenticação, dados, player, segurança, componentes globais e alerta configurável.
- `scripts/check-site.py` — valida árvore, referências locais, assets, sintaxe e rotas obsoletas.
- `tests/auth-csp.test.mjs`, `tests/live-ranking.test.mjs`, `tests/security-utils.test.mjs`, `tests/streaming.test.mjs` — regressões das integrações mantidas.
- `governance/FIGMA-MIGRATION.md`, `governance/FILE-SCOPE-AUDIT.md` — rastreabilidade da reconstrução e desta decisão de escopo.

## REMOVE — FORA DO FIGMA

### Páginas e arquivos de descoberta

- `admin.html`, `clips.html`, `conteudo-proibido.html`, `creator-center.html`, `denunciar.html`, `denuncias-e-moderacao.html`, `diretrizes-da-comunidade.html`, `explorar.html`, `faq.html`, `loja.html`, `moderacao.html`, `notificacoes.html`, `pagamento.html`, `politicas.html`, `privacidade.html`, `recursos.html`, `roadmap.html`, `status.html`, `termos.html`.
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, `llms.txt`, `google87f94d9d56cacf74.html`, `favicon.svg`, `deploy-trigger.txt`.

### CSS e JavaScript sem consumidor nas telas do Figma

- `assets/css/features.css`, `assets/css/footer.css`, `assets/css/platform.css`, `assets/css/policies.css`.
- `assets/js/admin-promotions.js`, `assets/js/admin.js`, `assets/js/category-follow.js`, `assets/js/clips.js`, `assets/js/creator-center.js`, `assets/js/explorar.js`, `assets/js/global-features.js`, `assets/js/live-extras.js`, `assets/js/live-moderator.js`, `assets/js/live-player-access.js`, `assets/js/live-social.js`, `assets/js/live-support-alerts.js`, `assets/js/live-vod.js`, `assets/js/loja.js`, `assets/js/moderation-page.js`, `assets/js/notificacoes.js`, `assets/js/notifications-plus.js`, `assets/js/pagamento.js`, `assets/js/platform-core.js`, `assets/js/platform-global.js`, `assets/js/policy-acceptance.js`, `assets/js/policy-release.js`, `assets/js/profile-plus.js`, `assets/js/profile-promotions.js`, `assets/js/profile-social.js`, `assets/js/report-link.js`, `assets/js/report-model.js`, `assets/js/report-page.js`, `assets/js/report-service.js`, `assets/js/seo-runtime.js`, `assets/js/social.js`, `assets/js/status.js`, `assets/js/streamer-dashboard.js`.

### Duplicatas, automações, documentação e testes do sistema removido

- `firebase/firestore.rules`, `REGRAS-PARA-COLAR-NO-FIREBASE.txt` — duplicatas de `firestore.rules`.
- `package-lock.json` — não há dependências instaláveis após a limpeza.
- `CHANGELOG-v3.md`, `DEPLOY-VERCEL.md`, `PRODUCTION-READINESS.md`, `README.md`.
- `governance/AUDIT.md`, `governance/DEVIL.md`, `governance/VERIFICATION.md`, `governance/policies.json`, `governance/production-smoke.json`, `governance/release.json`.
- `scripts/build-policies.py`, `scripts/preview.py`, `scripts/security-hardening-v2.py`, `scripts/security-hardening-v2-fixes.py`, `scripts/security-hardening-v2-test-fixes.py`.
- `tests/firestore.rules.test.mjs`, `tests/platform-expansion.rules.test.mjs`, `tests/profile-render.test.mjs`, `tests/report-model.test.mjs`, `tests/security-hardening.rules.test.mjs`.
- `.github/workflows/aeo-geo-check.yml`, `.github/workflows/apply-search-console-seo.yml`, `.github/workflows/export-vercel-site.yml`, `.github/workflows/governance-check.yml`, `.github/workflows/patch-firestore-security.yml`, `.github/workflows/purge-jsdelivr-cache.yml`, `.github/workflows/quality-check.yml`, `.github/workflows/security-hardening-v2.yml`.

## Ajustes de dependência feitos durante a remoção

- O envio de chat, antes instalado por `live-extras.js`, foi incorporado a `live.js`, mantendo transação Firestore e limite de envio.
- A autenticação deixou de depender do aceite de páginas de políticas removidas.
- O ícone de loja permanece como elemento visual do header autenticado, conforme a referência, mas não aponta para uma rota inexistente.
- Termos e Privacidade permanecem como rótulos visuais no footer, sem links mortos nem novas páginas inventadas.
