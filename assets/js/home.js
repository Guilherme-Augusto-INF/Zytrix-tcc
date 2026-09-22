import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  getProfile,
  selectStream,
  mainCategory
} from './firebase.js';
import { header, footer, liveCard, categories, icons } from './ui.js';
import { splitHomeLives } from './live-ranking.js';

header('inicio');
footer();

const featured = document.querySelector('#featured');
const liveNow = document.querySelector('#live-now');
const categorySection = document.querySelector('#home-categories-section');
const categoryStrip = document.querySelector('#home-categories');
const emptyActions = document.querySelector('#home-empty-actions');
const liveControls = document.querySelector('#home-live-controls');
const filterWrap = document.querySelector('#home-live-filters');
const liveSearch = document.querySelector('#home-live-search');
const watchButton = document.querySelector('#watch-live-button');

let lives = [];
let selectedId = localStorage.getItem('zytrixSelectedStream') || '';
let activeFilter = 'Todos';
let searchTerm = '';
let stopLives = null;

const categoryItems = Object.keys(categories);

categoryStrip.innerHTML = categoryItems.slice(0, 5).map(category => `
  <a class="home-category-card" href="categoria.html?categoria=${encodeURIComponent(category)}">
    <span class="home-category-icon">${icons[category]}</span>
    <strong>${category}</strong>
    <small>Explorar</small>
  </a>
`).join('');

filterWrap.innerHTML = ['Todos', ...categoryItems].map(category => `
  <button class="home-filter${category === 'Todos' ? ' active' : ''}" type="button" data-category="${category}">
    ${category === 'Todos' ? '' : `<span>${icons[category]}</span>`} ${category}
  </button>
`).join('');

function setSelected(live) {
  selectedId = live.id;
  selectStream(live);
  watchButton.classList.remove('is-disabled');
  watchButton.removeAttribute('aria-disabled');
  watchButton.href = `live.html?stream=${encodeURIComponent(live.id)}`;
  render();
}

function cardMatches(live) {
  const category = mainCategory(live.categoryId || '');
  const categoryOk = activeFilter === 'Todos' || category === activeFilter;
  const haystack = `${live.username || ''} ${live.title || ''} ${live.categoryId || ''}`.toLowerCase();
  return categoryOk && (!searchTerm || haystack.includes(searchTerm));
}

function render() {
  const { ordered, featured: top3, liveNow: positions4to7 } = splitHomeLives(lives);

  const hasLives = ordered.length > 0;
  emptyActions.classList.toggle('hidden', hasLives);
  categorySection.classList.toggle('hidden', hasLives);
  liveControls.classList.toggle('hidden', !hasLives);
  watchButton.parentElement?.classList.toggle('hidden', !hasLives);

  featured.innerHTML = top3.length
    ? top3.map(item => liveCard(item, { selected: item.id === selectedId })).join('')
    : `
      <div class="figma-state figma-state-bordered">
        <strong>Não tem ninguém... :(</strong>
        <span>Nenhuma transmissão está ao vivo agora.</span>
      </div>
    `;

  const filtered = positions4to7.filter(cardMatches);
  liveNow.innerHTML = filtered.length
    ? filtered.map(item => liveCard(item, { selected: item.id === selectedId })).join('')
    : `
      <div class="figma-state figma-state-plain">
        <strong>${hasLives ? 'Nenhuma outra live :(' : 'Nenhuma outra live :('}</strong>
        <span>${hasLives ? 'Tente outro filtro ou volte mais tarde.' : ''}</span>
      </div>
    `;

  if (selectedId && ordered.some(item => item.id === selectedId)) {
    watchButton.classList.remove('is-disabled');
    watchButton.removeAttribute('aria-disabled');
    watchButton.href = `live.html?stream=${encodeURIComponent(selectedId)}`;
  } else {
    watchButton.classList.add('is-disabled');
    watchButton.setAttribute('aria-disabled', 'true');
    watchButton.href = 'live.html';
  }

  bindCards();
}

function bindCards() {
  document.querySelectorAll('.figma-live-card').forEach(card => {
    const choose = () => {
      const live = lives.find(item => item.id === card.dataset.liveId);
      if (live) setSelected(live);
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

filterWrap.addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeFilter = button.dataset.category;
  filterWrap.querySelectorAll('.home-filter').forEach(item => {
    item.classList.toggle('active', item === button);
  });
  render();
});

liveSearch.addEventListener('input', () => {
  searchTerm = liveSearch.value.trim().toLowerCase();
  render();
});

function startLives() {
  stopLives?.();
  const liveQuery = query(collection(db, 'streams'), where('status', '==', 'live'));

  stopLives = onSnapshot(liveQuery, async snapshot => {
    const base = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data(),
      viewerCount: Math.max(0, Number(item.data().viewerCount || 0))
    }));

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
  }, () => {
    featured.innerHTML = '<div class="figma-state figma-state-bordered"><strong>Não foi possível carregar os destaques.</strong></div>';
    liveNow.innerHTML = '<div class="figma-state"><strong>Não foi possível carregar as transmissões.</strong></div>';
  });
}

onAuthStateChanged(auth, () => {
  if (!stopLives) startLives();
});

window.addEventListener('pagehide', () => stopLives?.());
