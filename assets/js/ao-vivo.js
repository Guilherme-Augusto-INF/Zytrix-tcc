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
  normalize,
  mainCategory
} from './firebase.js';
import { header, footer, liveCard, icons, authGate } from './ui.js';

header('ao-vivo');
footer();
authGate('Faça login para acessar a aba Ao Vivo');

let lives = [];
let filter = 'todos';
let search = '';
let stopLives = null;

const grid = document.querySelector('#lives-grid');
const filters = document.querySelector('#filters');
const searchInput = document.querySelector('#search');

const names = ['todos', 'Gaming', 'Música', 'Just Chatting', 'Criatividade', 'Esportes', 'Tecnologia', 'Podcasts', 'IRL'];

filters.innerHTML = names.map(name => `
  <button class="home-filter${name === 'todos' ? ' active' : ''}" type="button" data-filter="${name}">
    ${name === 'todos' ? 'Todos' : `<span>${icons[name]}</span> ${name}`}
  </button>
`).join('');

filters.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;

  filter = button.dataset.filter;
  filters.querySelectorAll('[data-filter]').forEach(item => {
    item.classList.toggle('active', item === button);
  });
  render();
});

searchInput.addEventListener('input', event => {
  search = event.target.value;
  render();
});

function openLive(live) {
  selectStream(live);
  location.href = `live.html?stream=${encodeURIComponent(live.id)}`;
}

function render() {
  const term = normalize(search);

  const list = lives.filter(live => {
    if (filter !== 'todos' && mainCategory(live.categoryId) !== filter) return false;
    if (!term) return true;

    return normalize([
      live.username,
      live.title,
      live.description,
      live.categoryId
    ].join(' ')).includes(term);
  });

  grid.innerHTML = list.length
    ? list.map(item => liveCard(item)).join('')
    : '<div class="figma-state live-browser-empty"><strong>Nenhuma transmissão encontrada.</strong><span>Tente outro filtro ou volte mais tarde.</span></div>';

  grid.querySelectorAll('.figma-live-card').forEach(card => {
    const choose = () => {
      const live = lives.find(item => item.id === card.dataset.liveId);
      if (live) openLive(live);
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

function startLives() {
  stopLives?.();
  stopLives = onSnapshot(
    query(collection(db, 'streams'), where('status', '==', 'live')),
    async snapshot => {
    const base = snapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data(),
        viewerCount: Math.max(0, Number(item.data().viewerCount || 0))
      }))
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
      grid.innerHTML = '<div class="figma-state live-browser-empty"><strong>Não foi possível carregar as transmissões.</strong></div>';
    }
  );
}

onAuthStateChanged(auth, user => {
  if (user) {
    startLives();
  } else {
    stopLives?.();
    stopLives = null;
    lives = [];
    render();
  }
});

window.addEventListener('pagehide', () => stopLives?.());
