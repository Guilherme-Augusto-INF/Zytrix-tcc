import { header, footer, categories, icons, authGate } from './ui.js';

header('categorias');
footer();
authGate('Faça login para acessar a aba Categorias');

const grid = document.querySelector('#categories-grid');
const order = Object.keys(categories);
const referenceCounts = {
  Gaming: 245,
  Música: 128,
  'Just Chatting': 189,
  Criatividade: 96,
  Esportes: 84,
  Tecnologia: 72,
  Podcasts: 56,
  IRL: 35
};

grid.innerHTML = order.map(category => `
  <a class="figma-category-card" href="categoria.html?categoria=${encodeURIComponent(category)}">
    <span class="figma-category-icon">${icons[category]}</span>
    <span class="figma-category-copy">
      <strong>${category}</strong>
      <small>${referenceCounts[category].toLocaleString('pt-BR')} transmissões</small>
    </span>
    <span class="figma-category-arrow" aria-hidden="true">→</span>
  </a>
`).join('');
