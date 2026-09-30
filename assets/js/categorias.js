import { db, collection, query, where, onSnapshot, mainCategory } from './firebase.js';
import { header, footer, categories, icons, authGate } from './ui.js';

header('categorias');
footer();
authGate('Faça login para acessar a aba Categorias');

const grid = document.querySelector('#categories-grid');
const order = Object.keys(categories);

function render(counts = {}) {
  grid.innerHTML = order.map(category => `
    <a class="figma-category-card" href="categoria.html?categoria=${encodeURIComponent(category)}">
      <span class="figma-category-icon">${icons[category]}</span>
      <span class="figma-category-copy">
        <strong>${category}</strong>
        <small>${Number(counts[category] || 0).toLocaleString('pt-BR')} transmissão(ões) ao vivo</small>
      </span>
      <span class="figma-category-arrow" aria-hidden="true">→</span>
    </a>
  `).join('');
}

render();

const stop = onSnapshot(
  query(collection(db, 'streams'), where('status', '==', 'live')),
  snapshot => {
    const counts = Object.fromEntries(order.map(category => [category, 0]));
    snapshot.docs.forEach(item => {
      const category = mainCategory(item.data().categoryId || '');
      if (category in counts) counts[category] += 1;
    });
    render(counts);
  },
  () => render()
);

window.addEventListener('pagehide', () => stop());
