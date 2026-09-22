import { auth, onAuthStateChanged } from './firebase.js';

export const interfaceIcons = {
  search: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="11" cy="11" r="6.5"></circle>
  <path d="M16 16l5 5"></path>
</svg>`,
  play: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M9 7.2v9.6L17 12 9 7.2Z" fill="currentColor" stroke="none"></path>
</svg>`,
  check: `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="m6.5 12.5 3.2 3.2 7.8-8"></path>
</svg>`
};

function ensureFigmaStyles() {
  if (document.querySelector('link[data-zytrix-figma-style]')) return;
  const existing = [...document.styleSheets].some(sheet => {
    try { return String(sheet.href || '').includes('/assets/css/figma.css') || String(sheet.href || '').endsWith('assets/css/figma.css'); }
    catch { return false; }
  });
  if (existing) return;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'assets/css/figma.css';
  stylesheet.dataset.zytrixFigmaStyle = 'true';
  document.head.append(stylesheet);
}

const cartIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.2 8H6.1"></path>
  <circle cx="10" cy="20" r="1"></circle>
  <circle cx="17" cy="20" r="1"></circle>
</svg>`;

export function header(active = '') {
  ensureFigmaStyles();
  if (!document.documentElement.dataset.zytrixImageFallback) {
    document.documentElement.dataset.zytrixImageFallback = 'true';
    document.addEventListener('error', event => {
      const image = event.target;
      if (image instanceof HTMLImageElement && image.matches('.figma-live-thumb img')) {
        image.hidden = true;
      }
    }, true);
  }
  const element = document.querySelector('[data-header]');
  if (!element) return;

  element.innerHTML = `
    <header class="site-header figma-header">
      <div class="figma-container figma-nav">
        <a class="figma-brand" href="index.html" aria-label="Zytrix - Início">
          <span class="figma-brand-mark">Z</span>
          <span class="figma-brand-name">Zytrix</span>
        </a>

        <nav class="figma-nav-links" aria-label="Navegação principal">
          <a class="${active === 'inicio' ? 'active' : ''}" href="index.html">Início</a>
          <a class="${active === 'categorias' ? 'active' : ''}" href="categorias.html">Categorias</a>
          <a class="${active === 'ao-vivo' ? 'active' : ''}" href="ao-vivo.html">Ao Vivo</a>
          <a class="${active === 'sobre' ? 'active' : ''}" href="sobre.html">Sobre</a>
        </nav>

        <div class="nav-actions figma-nav-actions">
          <a class="figma-icon-button" href="ao-vivo.html" title="Pesquisar" aria-label="Pesquisar na Zytrix">
            ${interfaceIcons.search}
          </a>

          <span id="store-nav" class="figma-icon-button figma-cart hidden" role="img" title="Loja" aria-label="Loja">
            ${cartIcon}
          </span>

          <div id="guest-nav" class="guest-nav figma-guest-nav">
            <a class="figma-btn figma-btn-dark" href="login.html">Entrar</a>
            <a class="figma-btn figma-btn-primary" href="registro.html">Registrar</a>
          </div>

          <a id="profile-nav" class="figma-btn figma-btn-profile hidden" href="perfil.html">Perfil</a>
        </div>
      </div>
    </header>
  `;

  onAuthStateChanged(auth, user => {
    const guest = document.querySelector('#guest-nav');
    const profile = document.querySelector('#profile-nav');
    const store = document.querySelector('#store-nav');
    if (!guest || !profile || !store) return;

    const signedIn = Boolean(user);
    document.body.classList.toggle('is-authenticated', signedIn);
    document.body.classList.toggle('is-guest', !signedIn);
    guest.classList.toggle('hidden', signedIn);
    profile.classList.toggle('hidden', !signedIn);
    store.classList.toggle('hidden', !signedIn);
  });
}

export function footer() {
  ensureFigmaStyles();
  const element = document.querySelector('[data-footer]');
  if (!element) return;

  element.innerHTML = `
    <footer class="figma-footer">
      <div class="figma-container figma-footer-inner">
        <a class="figma-brand figma-footer-brand" href="index.html" aria-label="Zytrix - Início">
          <span class="figma-brand-mark">Z</span>
          <span class="figma-brand-name">Zytrix</span>
        </a>

        <span class="figma-footer-copy">© 2025 Zytrix. Todos os direitos reservados.</span>

        <nav class="figma-footer-links" aria-label="Links institucionais">
          <a href="sobre.html">Sobre</a>
          <span>Termos</span>
          <span>Privacidade</span>
        </nav>
      </div>
    </footer>
  `;
}

export function liveCard(live, options = {}) {
  const initial = (live.username || 'S').charAt(0).toUpperCase();
  const selected = options.selected === true;

  return `
    <article class="figma-live-card${selected ? ' selected' : ''}" data-live-id="${escapeAttr(live.id)}" tabindex="0">
      <div class="figma-live-thumb">
        ${live.thumbnailURL
          ? `<img src="${escapeAttr(live.thumbnailURL)}" alt="Thumbnail de ${escapeAttr(live.username || 'streamer')}">`
          : `<div class="figma-live-placeholder"><span class="figma-brand-mark">Z</span><strong>ZYTRIX</strong></div>`
        }

        <span class="figma-live-badge"><i></i> AO VIVO</span>
        <span class="figma-live-viewers">● ${formatViewers(live.viewerCount)} ESPECTADORES</span>
        <span class="figma-live-play">${selected ? interfaceIcons.check : interfaceIcons.play}</span>
      </div>

      <div class="figma-live-meta">
        ${live.photoURL
          ? `<img class="figma-live-avatar" src="${escapeAttr(live.photoURL)}" alt="Foto de ${escapeAttr(live.username || 'streamer')}">`
          : `<span class="figma-live-avatar">${escapeHtml(initial)}</span>`
        }
        <div class="figma-live-copy">
          <strong>${escapeHtml(live.username || 'Streamer')}</strong>
          <span>${escapeHtml(live.title || 'Transmissão ao vivo')}</span>
          <small>${escapeHtml(live.categoryId || '')}</small>
        </div>
      </div>
    </article>
  `;
}

export function formatViewers(value = 0) {
  const number = Math.max(0, Number(value || 0));
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return number.toLocaleString('pt-BR');
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  })[character]);
}

export function escapeAttr(value = '') {
  return escapeHtml(value);
}

export const categories = {
  Gaming: ['Ação / Aventura', 'RPG', 'Esportes', 'Simulação'],
  Música: ['Rock', 'Sertanejo', 'Eletrônica', 'Funk'],
  'Just Chatting': ['Bate-Papo', 'Perguntas e Respostas', 'Histórias', 'Desafios'],
  Criatividade: ['Desenho', 'Design', 'Fotografia', 'Edição'],
  Esportes: ['Futebol', 'Basquete', 'Automobilismo', 'Lutas'],
  Tecnologia: ['Programação', 'Hardware', 'Inteligência Artificial', 'Ciência e Tech'],
  Podcasts: ['Conversas', 'Entrevistas', 'Notícias', 'Entretenimento'],
  IRL: ['Viagens', 'Eventos', 'Vida Cotidiana', 'Exploração']
};

export const icons = {
  Gaming: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 8.2h9.6a4 4 0 0 1 3.8 5.1l-1.2 4a2 2 0 0 1-3.2 1l-2.1-1.7H9.9l-2.1 1.7a2 2 0 0 1-3.2-1l-1.2-4a4 4 0 0 1 3.8-5.1Z"></path><path d="M7.3 11v4M5.3 13h4M15.8 12.2h.1M18 14h.1"></path></svg>',
  Música: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"></path><ellipse cx="6.5" cy="18" rx="2.5" ry="2"></ellipse><ellipse cx="16.5" cy="16" rx="2.5" ry="2"></ellipse><path d="M9 9l10-2"></path></svg>',
  'Just Chatting': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"></path></svg>',
  Criatividade: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a1.8 1.8 0 0 1 0-3.6h3.2A5.8 5.8 0 0 0 21 7.6C19.3 4.8 16.2 3 12 3Z"></path><circle cx="7.5" cy="10" r="1"></circle><circle cx="10" cy="6.8" r="1"></circle><circle cx="14.2" cy="6.8" r="1"></circle><circle cx="17" cy="10" r="1"></circle></svg>',
  Esportes: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7ZM5.5 9l3.5.2M15 9.2 18.5 9M7 17l3.1-4.3M13.9 12.7 17 17M9 20l-2-3M15 20l2-3"></path></svg>',
  Tecnologia: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="11" rx="1.5"></rect><path d="M2.5 19h19M8 19l1-4h6l1 4"></path></svg>',
  Podcasts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13v-2a7 7 0 0 1 14 0v2M5 13a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-7H5ZM19 13a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2v-7h2Z"></path></svg>',
  IRL: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="14" height="11" rx="2"></rect><path d="m17 11 4-2v7l-4-2M7 7l1-3h4l1 3M7 12h6"></path></svg>'
};

export function authGate(message) {
  const main = document.querySelector('main');
  if (!main) return () => {};

  let overlay = document.querySelector('#figma-auth-gate');
  if (!overlay) {
    const current = `${location.pathname.split('/').pop() || 'index.html'}${location.search}`;
    const redirect = encodeURIComponent(current);
    overlay = document.createElement('section');
    overlay.id = 'figma-auth-gate';
    overlay.className = 'figma-auth-gate hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'figma-auth-gate-title');
    overlay.innerHTML = `
      <div class="figma-auth-gate-card">
        <p id="figma-auth-gate-title">${escapeHtml(message)}</p>
        <div class="figma-auth-gate-actions">
          <a class="figma-btn figma-btn-dark" href="login.html?redirect=${redirect}">Entrar</a>
          <span>OU</span>
          <a class="figma-btn figma-btn-primary" href="registro.html?redirect=${redirect}">Registrar</a>
        </div>
      </div>`;
    main.insertAdjacentElement('afterend', overlay);
  }

  return onAuthStateChanged(auth, user => {
    const blocked = !user;
    document.body.classList.toggle('figma-auth-blocked', blocked);
    overlay.classList.toggle('hidden', !blocked);
    main.setAttribute('aria-hidden', blocked ? 'true' : 'false');
  });
}
