# Zytrix Firebase → PostgreSQL: migração segura (em andamento)

Origem auditada: branch `main`, Zytrix-tcc. O frontend está em HTML/JS, usa `assets/js/firebase.js` e Firebase Auth/Firestore diretamente em diversas telas. **PostgreSQL puro não é acessível diretamente com segurança pelo navegador**: exige API de servidor com autenticação, autorização e pool de conexões. O esquema SQL nesta branch é a base; NÃO realizar o corte de produção ainda.

## Escopo e estado
- [x] Identificar dependências diretas de Firebase no frontend e coleções declaradas em `firestore.rules`.
- [x] Criar esquema inicial relacional com IDs legados TEXT, integridade referencial, índices e ledger Zy Coins.
- [ ] Definir/provisionar instância PostgreSQL de destino e credenciais protegidas (`DATABASE_URL` somente no servidor).
- [ ] Inventariar dados reais das coleções e subcoleções, Storage e usuários do Auth.
- [ ] Exportar backup completo dos dados, usuários e arquivos para armazenamento privado (fora do Git).
- [ ] Escrever ETL com paginação, conversão de Timestamp e validação de contagens/hashes; importar em ordem de dependência.
- [ ] Implementar API segura (`/api/*`) para todas as telas; autenticação própria ou provedor de identidade escolhido, com migração de contas e OAuth Google. Não copiar hashes/senhas sem estratégia validada.
- [ ] Migrar as leituras/escritas do frontend, chat/realtime (WebSocket/SSE), moderação, followers, perfil, lives e carteira; testar autorização endpoint a endpoint.
- [ ] Fazer dual-run e reconciliar saldos/contagens, teste de carga, plano de rollback e janela de corte.
- [ ] Trocar o frontend para a API e só então remover Firebase/Auth/Firestore/Storage das dependências e CSP.
- [ ] Verificar produção e desativar sistema anterior após período seguro de observação.

## Coleções identificadas em firestore.rules
`admins`, `users` (`following`, `notificationState`, `watchHistory`), `profiles`, `channels` (`followers`, `private`), `streams` (`supportAlerts`, `chat`, `chatBans`, `chatConfig`), `wallets`, `zyCoinTransactions`, `zyCoinOrders`, `channelProfiles`, `creatorCodes`, `clips`, `rewardRedemptions`, `coinPromotions`, `moderationPenalties`, `moderationActions`, `categories`, `featuredStreamers`, `governance/config`, `reports`, `reportLimits`, `reportKeys`, `moderationAudit`, `policyAcceptances`.

`legacy_documents` armazena temporariamente documentos cujo formato ainda não foi inventariado, sem perda de campos. O esquema de base NÃO comprova que todo campo de produção já foi mapeado.

## Cuidados obrigatórios
1. Criar banco PostgreSQL >=15 com TLS, backups automáticos, pool e banco de staging separado. Guardar `DATABASE_URL` como variável server-side da Vercel (não com prefixo público).
2. Testar `database/001_initial.sql` no staging com usuário migrator; não conceder DDL ao usuário runtime.
3. Conceder somente SELECT e operações específicas para o usuário runtime. Nenhuma conexão SQL direta a partir de código distribuído ao navegador.
4. Escrever endpoints e middleware de autenticação/autorização antes de desabilitar regras Firestore. O SQL aqui **não** substitui as regras Firestore.
5. Para Zy Coins, somente o backend pode emitir transações: idempotência por ID e `transfer_zy_coins` atômica em uma transação. A função não verifica o usuário da sessão; a API deve fazê-lo e negar a clientes qualquer SQL arbitrário.
6. Exportar/cifrar os backups em destino privado, nunca versionar service accounts, usuários, dumps, `.env` ou URLs de conexão.
7. Confirmar qual repositório/commit realmente alimenta `zytrix-lives.vercel.app` antes do deploy: esta branch não altera produção.

## Configurações necessárias para concluir
Instância PostgreSQL de destino (Railway, Neon, RDS, VPS etc.) e definição de autenticação pós-Firebase. O provedor não altera o fato de o motor ser PostgreSQL; Supabase também utiliza PostgreSQL, e Firebase pode escalar, então a troca deve ser validada por custos/limites concretos.
