# Matriz de reconstrução Figma → Web

Esta matriz registra a auditoria visual e funcional usada na reconstrução. As 17 imagens abaixo foram abertas individualmente; as imagens são a fonte visual, e os Code Layers são a fonte funcional.

## Referências por tela

| Imagem | Página/estado | Componentes e interações | Code Layer relacionado | Implementação Web |
| --- | --- | --- | --- | --- |
| `docs/sem login/inicio.png` | Home visitante, sem lives | Header público, hero, destaques vazios, categorias, cadastro e footer | `home/destaques/main.tsx`, `home/ao-vivo-na-zytrix/main.tsx` | `index.html`, `assets/js/home.js`, `assets/js/ui.js` |
| `docs/sem login/ao-vivo.png` | Ao Vivo visitante | Conteúdo desfocado, modal de autenticação, busca e filtros | consulta de streams e filtros dos Code Layers | `ao-vivo.html`, `assets/js/ao-vivo.js` |
| `docs/sem login/categorias.png` | Categorias visitante | Grade desfocada e modal de autenticação | `categorias/main.tsx` | `categorias.html`, `assets/js/categorias.js` |
| `docs/sem login/entrar.png` | Login | E-mail, senha, Google, recuperação e redirecionamento | fluxo Firebase Auth | `login.html`, `assets/js/auth-pages.js` |
| `docs/sem login/registro.png` | Cadastro | Nome, e-mail, senha, Google, termos e redirecionamento | fluxo Firebase Auth | `registro.html`, `assets/js/auth-pages.js` |
| `docs/sem login/recuperar-senha.png` | Recuperação | Envio de redefinição por e-mail | fluxo Firebase Auth | `recuperar-senha.html`, `assets/js/auth-pages.js` |
| `docs/sem login/live.png` | Live visitante | Player, dados da transmissão e estado indisponível | Code Layers de live e integrações Twitch/Kick/YouTube | `live.html`, `assets/js/live.js`, `assets/js/streaming.js` |
| `docs/sem login/sobre.png` | Sobre visitante | Missão, valores, público e CTA | `sobre/main.tsx` | `sobre.html` |
| `docs/com login/inicio-log-com-login.png` | Home autenticada com lives | Hero, TOP 3, cards 4–7, filtros, busca e categorias | `home/destaques/main.tsx`, `home/ao-vivo-na-zytrix/main.tsx` | `index.html`, `assets/js/home.js`, `assets/js/live-ranking.js` |
| `docs/com login/inicio-log-sem-login.png` | Home autenticada sem lives | Estados vazios estáveis para as duas seções | mesmos Code Layers da Home | `index.html`, `assets/js/home.js` |
| `docs/com login/categoriass-log.png` | Categorias autenticada | Oito cards em 2×4 no desktop, contagem e subcategorias | `categorias/main.tsx` | `categorias.html`, `assets/js/categorias.js` |
| `docs/com login/live-log.png` | Live autenticada | Player, presença, chat e ações permitidas | Code Layers de live | `live.html`, `assets/js/live.js` |
| `docs/com login/padrão-por-categoria.png` | Template de categoria | Título, subcategorias, filtros, busca, cards e vazio | oito categorias e suas subcategorias | `categoria.html`, `assets/js/categoria.js` |
| `docs/com login/config-live.png` | Configuração da live | Título, descrição, thumbnail, categoria, subcategoria e status | `configlive/main.tsx` | `config-live.html`, `assets/js/config-live.js` |
| `docs/com login/perfil.png` | Perfil autenticado | Dados reais, avatar, username, bio, verificação, streamer e logout | `perfil/main.tsx` | `perfil.html`, `assets/js/perfil.js` |
| `docs/com login/sair.png` | Confirmação de saída | Cancelar ou encerrar sessão Firebase | fluxo de logout dos Code Layers | `sair.html`, `assets/js/sair.js` |
| `docs/com login/sobre-log.png` | Sobre autenticada | Conteúdo institucional com shell autenticado | `sobre/main.tsx` | `sobre.html`, `assets/js/ui.js` |

## Regras funcionais preservadas

- O Firestore continua sendo a fonte de streams e perfis; somente documentos com `status == "live"` entram na Home.
- A ordenação usa `viewerCount` decrescente. Destaques recebe `slice(0, 3)` e Ao Vivo na Zytrix recebe `slice(3, 7)`.
- O clique no card mantém `zytrixSelectedStream`, `zytrixSelectedStreamName` e `zytrixSelectedStreamTitle` antes de abrir `live.html`.
- As oito categorias e suas 32 subcategorias usam a taxonomia dos Code Layers.
- Firebase Auth, sessão, Google, redefinição, verificação de e-mail e proteção de rotas permanecem ativos.
- Players continuam limitados a Twitch, Kick e YouTube por HTTPS e pelas validações existentes.
- A política CSP, o escape de conteúdo, as allowlists de URL e as rotas legais foram preservados.

## Tipografia e tokens

As imagens de referência não contêm metadados que revelem a família tipográfica original, e os Code Layers não fornecem os arquivos dessa fonte. A implementação anterior dependia de `Bahnschrift`, que não existe de forma consistente fora do Windows. Para evitar fallback silencioso para Arial, foram incorporadas localmente as famílias OFL `Rajdhani` (interface e títulos) e `Teko` (display condensado), visualmente próximas da referência. Os arquivos de licença estão em `assets/fonts/`.

Os tokens de cor, superfície, borda, ciano, vermelho, texto, glow, radius e tipografia estão centralizados no início de `assets/css/figma.css`.

## Diferenças removidas da Web anterior

- Navegação e blocos institucionais que não pertenciam às referências principais.
- Ícones improvisados em emoji ou caracteres brutos nos componentes centrais.
- Repetição das três lives em destaque na seção secundária.
- Dependência de fonte exclusivamente instalada no sistema operacional.
- Acesso visual irrestrito às páginas Categorias e Ao Vivo por visitantes.

## Limitações de validação

Fluxos autenticados dependem de uma conta Firebase válida e das permissões reais do projeto. Os testes automatizados cobrem estrutura, segurança, parsing de streaming e partição das lives; a validação de produção deve usar uma conta autorizada sem registrar credenciais neste repositório.
