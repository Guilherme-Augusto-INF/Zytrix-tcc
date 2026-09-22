import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  getProfile,
  selectStream,
  mainCategory
} from './firebase.js';
import { header, footer, liveCard, categories, icons, escapeHtml } from './ui.js';

header('categorias');
footer();

const params = new URLSearchParams(location.search);
const category = params.get('categoria') || 'Gaming';
const sub = params.get('subcategoria') || '';
let selectedId = localStorage.getItem('zytrixSelectedStream') || '';
let lives = [];

const title = document.querySelector('#category-title');
const icon = document.querySelector('#category-icon');
const subnav = document.querySelector('#subcategories');
const grid = document.querySelector('#category-lives');
const watchButton = document.querySelector('#category-watch-button');

title.textContent = sub ? `${category} — ${sub}` : category;
icon.textContent = icons[category] || '◈';

const subs = categories[category] || [];
subnav.innerHTML =
  `<a class="home-filter${!sub ? ' active' : ''}" href="categoria.html?categoria=${encodeURIComponent(category)}">Todos</a>` +
  subs.map(item => `
    <a class="home-filter${sub === item ? ' active' : ''}"
       href="categoria.html?categoria=${encodeURIComponent(category)}&subcategoria=${encodeURIComponent(item)}">
      ${escapeHtml(item)}
    </a>
  `).join('');

function chooseLive(live) {
  selectedId = live.id;
  selectStream(live);
  watchButton.href = `live.html?stream=${encodeURIComponent(live.id)}`;
  watchButton.classList.remove('is-disabled');
  watchButton.removeAttribute('aria-disabled');
  render();
}

function render() {
  grid.innerHTML = lives.length
    ? lives.map(item => liveCard(item, { selected: item.id === selectedId })).join('')
    : `
      <div class="figma-state category-empty">
        <strong>Não tem ninguém... :(</strong>
        <span>Nenhuma transmissão está ao vivo agora.</span>
      </div>
    `;

  if (selectedId && lives.some(item => item.id === selectedId)) {
    watchButton.href = `live.html?stream=${encodeURIComponent(selectedId)}`;
    watchButton.classList.remove('is-disabled');
    watchButton.removeAttribute('aria-disabled');
  } else {
    watchButton.href = 'live.html';
    watchButton.classList.add('is-disabled');
    watchButton.setAttribute('aria-disabled', 'true');
  }

  grid.querySelectorAll('.figma-live-card').forEach(card => {
    const choose = () => {
      const live = lives.find(item => item.id === card.dataset.liveId);
      if (live) chooseLive(live);
    };
    card.addEventListener('click', choose);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choose();
      }
    });
  });
}

onSnapshot(
  query(collection(db, 'streams'), where('status', '==', 'live')),
  async snapshot => {
    const base = snapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data(),
        viewerCount: Math.max(0, Number(item.data().viewerCount || 0))
      }))
      .filter(item => {
        if (mainCategory(item.categoryId) !== category) return false;
        if (!sub) return true;
        return String(item.categoryId || '').trim() === `${category} - ${sub}`;
      })
      .sort((a, b) => {
        const difference = b.viewerCount - a.viewerCount;
        return difference || String(a.id).localeCompare(String(b.id));
      });

    lives = await Promise.all(base.map(async item => {
      const profile = item.streamerUid
        ? await getProfile(item.streamerUid).catch(() => null)
        : null;

      return {
        ...item,
        username: profile?.username || 'Streamer',
        photoURL: profile?.photoURL || ''
      };
    }));

    render();
  },
  () => {
    grid.innerHTML = '<div class="figma-state category-empty"><strong>Não foi possível carregar as transmissões.</strong></div>';
  }
);
