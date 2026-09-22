import { auth, onAuthStateChanged, db, doc, onSnapshot, ensureWallet } from './firebase.js';
import { header, footer } from './ui.js';

header();
footer();

const packages = [
  { id: 'zy100', coins: 100, priceCents: 490, label: 'Pacote Inicial', description: 'Para mandar seus primeiros apoios.' },
  { id: 'zy500', coins: 500, priceCents: 1490, label: 'Pacote Stream', description: 'Uma boa quantidade para apoiar várias lives.', popular: true },
  { id: 'zy1200', coins: 1200, priceCents: 2990, label: 'Pacote Plus', description: 'Mais Zy Coins para apoiar seus criadores favoritos.' },
  { id: 'zy2500', coins: 2500, priceCents: 4990, label: 'Pacote Ultra', description: 'Para quem quer apoiar muito mais.' }
];

const grid = document.querySelector('#packages');
const balance = document.querySelector('#shop-balance');
const note = document.querySelector('#shop-selection');
const continueButton = document.querySelector('#shop-continue');
let selectedId = '';
let stopWallet = null;

try {
  const stored = localStorage.getItem('zytrixSelectedCoinPackage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      selectedId = parsed?.id || '';
    } catch {
      selectedId = stored;
    }
  }
} catch {}

function money(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function renderPackages() {
  grid.innerHTML = packages.map(pack => `
    <button class="shop-package-card${pack.id === selectedId ? ' selected' : ''}" type="button" data-package="${pack.id}">
      ${pack.popular ? '<span class="shop-popular">MAIS POPULAR</span>' : ''}
      <span class="shop-package-label">${pack.label}</span>
      <strong class="shop-package-coins">◈ ${pack.coins.toLocaleString('pt-BR')}</strong>
      <span class="shop-package-price">${money(pack.priceCents)}</span>
      <p>${pack.description}</p>
      <span class="shop-package-action">${pack.id === selectedId ? '✓ Selecionado' : 'Selecionar pacote'}</span>
    </button>
  `).join('');

  const selected = packages.find(pack => pack.id === selectedId);
  if (selected) {
    note.textContent = `Pacote selecionado: ${selected.coins.toLocaleString('pt-BR')} Zy Coins`;
    continueButton.classList.remove('is-disabled');
    continueButton.removeAttribute('aria-disabled');
  } else {
    note.textContent = 'Selecione um pacote para continuar';
    continueButton.classList.add('is-disabled');
    continueButton.setAttribute('aria-disabled', 'true');
  }
}

grid.addEventListener('click', event => {
  const card = event.target.closest('[data-package]');
  if (!card) return;
  const pack = packages.find(item => item.id === card.dataset.package);
  if (!pack) return;

  selectedId = pack.id;
  localStorage.setItem('zytrixSelectedCoinPackage', JSON.stringify(pack));
  renderPackages();
});

renderPackages();

onAuthStateChanged(auth, async user => {
  stopWallet?.();
  stopWallet = null;

  if (!user) {
    balance.textContent = 'Entre para ver seu saldo';
    return;
  }

  try {
    await ensureWallet(user.uid);
    stopWallet = onSnapshot(
      doc(db, 'wallets', user.uid),
      snapshot => {
        balance.textContent = snapshot.exists()
          ? `◈ ${Number(snapshot.data().balance || 0).toLocaleString('pt-BR')}`
          : '◈ 0';
      },
      () => balance.textContent = 'Saldo indisponível'
    );
  } catch {
    balance.textContent = 'Saldo indisponível';
  }
});

window.addEventListener('pagehide', () => stopWallet?.());
