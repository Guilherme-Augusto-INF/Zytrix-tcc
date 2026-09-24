# Zytrix — Neon PostgreSQL (destino escolhido)
Status: plano técnico / **não implantado**. O site oficial continua utilizando Firebase até a migração completa ser validada.

## Objetivo e responsabilidades
- Neon: **banco primário** do Zytrix, em região próxima ao backend e público principal.
- Backend server-side: API autentica cada sessão e autoriza cada operação. A string de conexão `DATABASE_URL` fica **somente no servidor**, com TLS e pool.
- Browser: consome a API; jamais recebe usuário/senha do banco.
- Imagens/vídeos e WebSocket: serviços próprios para storage/streaming/realtime; PostgreSQL armazena dados relacionais, não vídeo.

## Sequência de execução
1. Conectar conta Neon autorizada; criar projeto separado de staging e produção, preferindo região geograficamente próxima à API.
2. Criar usuários separados de migração e runtime com privilégios mínimos; testar conexão TLS.
3. Executar `database/001_initial.sql` em **staging** após revisar privilégios. Revisar mapeamento dos campos reais das coleções Firebase antes de importar dados.
4. Criar backend Node.js server-side, API autenticada, migração de Firebase Auth (incluindo login Google e redefinição de senha), sistema de sessão, moderação e autorização por endpoint.
5. Exportar Firebase Firestore/Auth/Storage em backup privado, ETL com hashes/contagens, relatório de perdas/incompatibilidades e reconciliação de saldos.
6. Migrar frontend por etapas e validar testes end-to-end, segurança, carga, falhas e **dual-run** quando viável.
7. Corte somente após rollback ensaiado e verificação independente no ambiente de produção.

## Notebook futuro (opcional)
**Não** usar notebook residencial como primário com Neon como standby automático. Failover exige replicação contínua adequada, monitoramento de atraso, orquestração de promoção, reconfiguração de clientes, recuperação do nó antigo e proteção contra split-brain. Não presumir que Neon aceita atuar como assinante de replicação originada em PostgreSQL caseiro sem confirmar suporte atual do serviço.

Se disponível posteriormente, o notebook pode ser:
- Ambiente local de desenvolvimento, staging e testes de carga limitados;
- Destino secundário de **backups criptografados e verificados** do banco gerenciado;
- Réplica assíncrona somente após avaliação de recursos e limites vigentes Neon; sua existência **não** substitui backups testados, nem é failover automático.

Exigir SSD saudável, Ethernet, Linux suportado, ventilação, backup fora do equipamento e medidas contra perda de energia. Não publicar PostgreSQL doméstico abertamente na internet. Métricas: latência p95 da API, conexões, IOPS, atraso de replicação (se usado), RPO e RTO.

## Gate
Nenhum deploy em `zytrix-lives.vercel.app` nem desativação Firebase antes da criação autorizada do projeto Neon, migração de Auth/Storage, ETL validado e aprovação do corte.
