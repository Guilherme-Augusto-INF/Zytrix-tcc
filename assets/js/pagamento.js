import {
  auth,
  db,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
  collection,
  ensureWallet
} from './firebase.js';
import { header, footer } from './ui.js';

header();
footer();

const packages = [
  { id: 'zy100', coins: 100, priceCents: 490, label: 'Pacote Inicial' },
  { id: 'zy500', coins: 500, priceCents: 1490, label: 'Pacote Stream' },
  { id: 'zy1200', coins: 1200, priceCents: 2990, label: 'Pacote Plus' },
  { id: 'zy2500', coins: 2500, priceCents: 4990, label: 'Pacote Ultra' }
];

const raw = localStorage.getItem('zytrixSelectedCoinPackage');
let pack = null;

if (raw) {
  try {
    const parsed = JSON.parse(raw);
    pack = packages.find(item => item.id === parsed?.id) || null;
  } catch {
    pack = packages.find(item => item.id === raw) || null;
  }
}

const root = document.querySelector('#payment-root');
let user = null;
let isAdmin = false;
let balance = 0;

function money(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function render() {
  if (!pack) {
    root.innerHTML = `
      <div class="payment-empty">
        <div class="payment-empty-icon">◈</div>
        <h1>Nenhum pacote selecionado</h1>
        <p>Volte para a Loja de Zy Coins, selecione um pacote e depois abra esta página novamente.</p>
        <a class="figma-btn figma-btn-primary" href="loja.html">Voltar à loja</a>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <section class="payment-hero">
      <div>
        <div class="figma-eyebrow">ZYTRIX • PAGAMENTO</div>
        <h1>Finalize seu pedido</h1>
        <p>Revise o pacote escolhido e selecione a forma de pagamento.</p>
      </div>

      <aside class="payment-balance">
        <span>SEU SALDO</span>
        <strong>◈ ${balance.toLocaleString('pt-BR')}</strong>
      </aside>
    </section>

    <div class="payment-layout">
      <section class="payment-methods">
        <div class="figma-eyebrow">FORMA DE PAGAMENTO</div>
        <h2>Como deseja continuar?</h2>

        <label class="payment-method-card">
          <input type="radio" name="payment-method" value="pix" checked>
          <span class="payment-method-icon">◇</span>
          <span><strong>PIX</strong><small>Crie um pedido demonstrativo usando PIX.</small></span>
        </label>

        <label class="payment-method-card">
          <input type="radio" name="payment-method" value="card">
          <span class="payment-method-icon">▣</span>
          <span><strong>Cartão</strong><small>Simulação visual. Nenhum dado real de cartão é coletado.</small></span>
        </label>

        <div class="payment-security">
          <strong>Ambiente demonstrativo do TCC</strong>
          <span>Nenhum pagamento real é processado no navegador. Usuários comuns criam apenas pedidos pendentes.</span>
        </div>

        ${isAdmin ? '<div class="payment-admin-note"><strong>Modo administrador</strong><span>O botão abaixo pode simular um pagamento aprovado para testes.</span></div>' : ''}

        <div id="pay-msg"></div>
      </section>

      <aside class="payment-summary">
        <div class="payment-summary-label">RESUMO DO PEDIDO</div>
        <div class="payment-summary-coin">◈</div>
        <strong class="payment-summary-coins">${Number(pack.coins).toLocaleString('pt-BR')}</strong>
        <span class="payment-summary-name">Zy Coins</span>
        <span class="payment-summary-pack">${pack.label || 'Pacote Zy Coins'}</span>

        <div class="payment-divider"></div>

        <div class="payment-summary-row"><span>Pacote</span><strong>${pack.label || pack.id}</strong></div>
        <div class="payment-summary-row"><span>Zy Coins</span><strong>◈ ${Number(pack.coins).toLocaleString('pt-BR')}</strong></div>
        <div class="payment-summary-total"><span>Total</span><strong>${money(Number(pack.priceCents))}</strong></div>

        <button id="pay" class="payment-confirm" type="button">
          ${isAdmin ? 'SIMULAR PAGAMENTO APROVADO' : 'CRIAR PEDIDO'}
        </button>

        <p class="payment-summary-note">Ao continuar, nenhum valor real será cobrado nesta versão.</p>
      </aside>
    </div>
  `;

  document.querySelector('#pay').addEventListener('click', pay);
}

async function pay() {
  const msg = document.querySelector('#pay-msg');
  if (!user) {
    msg.innerHTML = '<div class="message err">Faça login para continuar.</div>';
    return;
  }

  const method = document.querySelector('input[name="payment-method"]:checked')?.value || 'pix';
  const button = document.querySelector('#pay');
  button.disabled = true;
  button.textContent = 'PROCESSANDO...';

  try {
    const orderRef = doc(collection(db, 'zyCoinOrders'));

    if (isAdmin) {
      await runTransaction(db, async tx => {
        const walletRef = doc(db, 'wallets', user.uid);
        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists()) throw new Error('wallet');

        const wallet = walletSnap.data();
        tx.set(orderRef, {
          uid: user.uid,
          packageId: pack.id,
          coins: Number(pack.coins),
          priceCents: Number(pack.priceCents),
          paymentMethod: method,
          status: 'paid',
          mode: 'admin_demo',
          createdAt: serverTimestamp(),
          paidAt: serverTimestamp()
        });
        tx.update(walletRef, {
          balance: Number(wallet.balance || 0) + Number(pack.coins),
          updatedAt: serverTimestamp()
        });
      });

      msg.innerHTML = `<div class="message ok">Pagamento demonstrativo aprovado. ${Number(pack.coins).toLocaleString('pt-BR')} Zy Coins foram adicionadas à sua carteira.</div>`;
    } else {
      await setDoc(orderRef, {
        uid: user.uid,
        packageId: pack.id,
        coins: Number(pack.coins),
        priceCents: Number(pack.priceCents),
        paymentMethod: method,
        status: 'pending',
        mode: 'prototype',
        createdAt: serverTimestamp(),
        paidAt: null
      });

      msg.innerHTML = '<div class="message ok">Pedido criado. Nesta versão do TCC o pagamento real ainda não está conectado; por segurança, o navegador não credita Zy Coins sem confirmação do servidor ou de um administrador.</div>';
    }
  } catch (error) {
    console.error(error);
    msg.innerHTML = '<div class="message err">Não foi possível criar o pedido.</div>';
  } finally {
    button.disabled = false;
    button.textContent = isAdmin ? 'SIMULAR PAGAMENTO APROVADO' : 'CRIAR PEDIDO';
  }
}

onAuthStateChanged(auth, async current => {
  user = current;
  isAdmin = false;
  balance = 0;

  if (user) {
    try {
      await ensureWallet(user.uid);
      const [adminSnap, walletSnap] = await Promise.all([
        getDoc(doc(db, 'admins', user.uid)).catch(() => null),
        getDoc(doc(db, 'wallets', user.uid)).catch(() => null)
      ]);
      isAdmin = Boolean(adminSnap?.exists?.() && adminSnap.data().active === true);
      balance = walletSnap?.exists?.() ? Number(walletSnap.data().balance || 0) : 0;
    } catch {}
  }

  render();
});
