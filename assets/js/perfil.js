import { auth, db, googleProvider, onAuthStateChanged, EmailAuthProvider, reauthenticateWithPopup, reauthenticateWithCredential, sendEmailVerification, deleteUser, doc, getDoc, getDocs, deleteDoc, onSnapshot, updateDoc, query, collection, collectionGroup, where, limit, serverTimestamp, writeBatch } from './firebase.js';
import { header, footer, escapeHtml, escapeAttr } from './ui.js';
import { parseStreamingSource, streamingPlatformLabel } from './streaming.js';
header();
footer();
const root = document.querySelector('#profile-root');
let user = null;
let profile = null;
let account = null;
let wallet = null;
let channel = null;
let stream = null;
let walletUnsubscribe = null;
let verificationCooldownUntil = 0;

function timestampMs(value) {
    return value?.toMillis?.() || value?.toDate?.()?.getTime?.() || 0;
}

function usernameCooldownRemaining() {
    const updatedAt = timestampMs(profile?.usernameUpdatedAt);
    if (!updatedAt)
        return 0;
    return Math.max(0, updatedAt + 7 * 24 * 60 * 60 * 1000 - Date.now());
}

function cooldownText(milliseconds) {
    const days = Math.floor(milliseconds / 86400000);
    const hours = Math.ceil((milliseconds % 86400000) / 3600000);
    return `${days} dia(s) e ${hours} hora(s)`;
}
function dateText(timestamp) {
    try {
        return timestamp?.toDate?.().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }) || 'Data indisponível';
    }
    catch {
        return 'Data indisponível';
    }
}
async function findStream(uid) {
    const streamQuery = query(collection(db, 'streams'), where('streamerUid', '==', uid), limit(1));
    const result = await getDocs(streamQuery);
    if (result.empty) {
        return null;
    }
    return {
        id: result.docs[0].id,
        ...result.docs[0].data()
    };
}
async function load() {
    const [profileSnap, accountSnap, walletSnap, channelSnap] = await Promise.all([
        getDoc(doc(db, 'profiles', user.uid)),
        getDoc(doc(db, 'users', user.uid)),
        getDoc(doc(db, 'wallets', user.uid)),
        getDoc(doc(db, 'channels', user.uid))
    ]);
    profile = profileSnap.exists() ? profileSnap.data() : null;
    account = accountSnap.exists() ? accountSnap.data() : null;
    wallet = walletSnap.exists() ? walletSnap.data() : null;
    channel = channelSnap.exists() ? channelSnap.data() : null;
    stream = channel ? await findStream(user.uid) : null;
    render();
    if (walletUnsubscribe) {
        walletUnsubscribe();
        walletUnsubscribe = null;
    }
    walletUnsubscribe = onSnapshot(doc(db, 'wallets', user.uid), snapshot => {
        if (!snapshot.exists()) {
            return;
        }
        wallet = snapshot.data();
        const balanceElement = document.querySelector('#wallet-balance');
        if (balanceElement) {
            balanceElement.textContent = Number(wallet.balance || 0).toLocaleString('pt-BR');
        }
    }, error => {
        console.error('Erro ao acompanhar saldo:', error);
    });
}
function render() {
    if (!profile || !account) {
        root.innerHTML = '<div class="state">Perfil indisponível.</div>';
        return;
    }
    const initials = (profile.username || 'U').charAt(0).toUpperCase();
    const streamSource = parseStreamingSource(stream?.playbackURL || '');
    const platformLabel = streamSource
        ? streamingPlatformLabel(streamSource.platform)
        : 'Não vinculada';
    root.innerHTML = `
    <div class="card panel">
      <h1 style="text-align:center;margin-top:0">Perfil</h1>

      <div class="profile-grid">
        <div>
          ${profile.photoURL
        ? `<img class="profile-photo" src="${escapeAttr(profile.photoURL)}" alt="Foto de ${escapeAttr(profile.username || 'usuário')}">`
        : `<div class="profile-photo" style="display:grid;place-items:center;font-size:42px;color:#334155">${escapeHtml(initials)}</div>`}

          <button id="edit-toggle" class="btn" style="width:140px;margin-top:8px">
            Editar perfil
          </button>
        </div>

        <div class="info-list">
          <div class="info-row">
            <strong>Nome</strong>
            <span>${escapeHtml(profile.username || '')}</span>
          </div>

          <div class="info-row">
            <strong>ID</strong>
            <span>${escapeHtml(account.zytrixId || user.uid)}</span>
          </div>

          <div class="info-row">
            <strong>Membro desde</strong>
            <span>${dateText(account.createdAt)}</span>
          </div>

          <div class="info-row">
            <strong>E-mail</strong>
            <span>
              ${escapeHtml(user.email || '')}
              ${user.emailVerified ? '✓' : '(não verificado)'}
            </span>
          </div>

          ${user.emailVerified ? '' : `
          <div class="profile-email-verification">
            <p>Verifique seu e-mail para liberar chat, Zy Coins e recursos de criador.</p>
            <div>
              <button id="resend-verification" class="btn" type="button">Reenviar verificação</button>
              <button id="check-verification" class="btn btn-primary" type="button">Já verifiquei</button>
            </div>
            <span id="verification-message" role="status"></span>
          </div>`}

          <div class="info-row">
            <strong>Zy Coins</strong>
            <span class="coin-pill">
              ◈ <span id="wallet-balance">${Number(wallet?.balance || 0).toLocaleString('pt-BR')}</span>
            </span>
          </div>

          <div class="info-row">
            <strong>Bio</strong>
            <span>${escapeHtml(profile.bio || 'Nenhuma descrição adicionada.')}</span>
          </div>
        </div>
      </div>

      <div id="edit-area" class="hidden" style="margin-top:18px">
        <div class="form-group">
          <label for="edit-name">Nome</label>
          <input
            id="edit-name"
            class="input"
            maxlength="30"
            value="${escapeAttr(profile.username || '')}"
          >
          ${usernameCooldownRemaining() ? `<small class="muted">Nova alteração de nome em ${cooldownText(usernameCooldownRemaining())}.</small>` : ''}
        </div>

        <div class="form-group">
          <label for="edit-photo">URL da foto</label>
          <input
            id="edit-photo"
            class="input"
            value="${escapeAttr(profile.photoURL || '')}"
          >
        </div>

        <div class="form-group">
          <label for="edit-bio">Bio</label>
          <textarea
            id="edit-bio"
            class="input textarea"
            maxlength="500"
          >${escapeHtml(profile.bio || '')}</textarea>
        </div>

        <button id="save-profile" class="btn btn-primary">
          Salvar alterações
        </button>

        <div id="profile-msg"></div>
      </div>
    </div>

    <div class="card panel" style="margin-top:16px">
      <div class="eyebrow">Streamer</div>

      ${channel
        ? `
          <h2>Seu canal está pronto</h2>

          <p class="muted">
            Status:
            <span class="${stream?.status === 'live' ? 'status-live' : 'status-offline'}">
              ${stream?.status === 'live' ? 'AO VIVO' : 'OFFLINE'}
            </span>
          </p>

          <div class="stream-source-summary">
            <span class="platform-badge platform-${streamSource?.platform || 'unknown'}">
              ${escapeHtml(platformLabel)}
            </span>

            ${streamSource
            ? `<a href="${escapeAttr(streamSource.canonicalUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(streamSource.canonicalUrl)}</a>`
            : '<span class="muted">Nenhum canal de transmissão válido vinculado.</span>'}
          </div>

          <p class="muted" style="margin-top:10px">
            Você pode trocar entre YouTube, Twitch e Kick no painel de configuração da live.
          </p>

          <a class="btn btn-primary" href="config-live.html">
            Configurar live
          </a>
        `
        : `
          <h2>Você deseja fazer lives?</h2>

          <p class="muted">
            Vincule uma live do YouTube ou um canal da Twitch/Kick para criar seu canal na Zytrix.
          </p>

          <div class="form-group">
            <label for="stream-url">Link do YouTube, Twitch ou Kick</label>
            <input
              id="stream-url"
              class="input"
              placeholder="https://youtube.com/watch?v=... | twitch.tv/... | kick.com/..."
              autocomplete="url"
            >
            <small class="muted">
              Use a URL completa do canal. A Zytrix detecta a plataforma automaticamente.
            </small>
          </div>

          <button id="be-streamer" class="btn btn-primary">
            Criar meu canal
          </button>

          <div id="streamer-msg"></div>
        `}
    </div>

    <div class="card panel" style="margin-top:16px;border-color:#7f1d1d">
      <div class="eyebrow">Configurações da conta</div>
      <h2>Excluir conta</h2>
      <p class="muted">
        Exclui sua conta de autenticação e os dados principais do perfil na Zytrix. Registros necessários para segurança, moderação e histórico de transações podem ser preservados quando aplicável.
      </p>
      <button id="delete-account" class="btn btn-danger">Excluir minha conta</button>
      <div id="delete-account-msg"></div>
    </div>

    <div style="margin-top:16px">
      <a class="btn btn-danger" href="sair.html">Sair da conta</a>
    </div>
  `;
    document.querySelector('#edit-toggle').onclick = () => {
        document.querySelector('#edit-area').classList.toggle('hidden');
    };
    document.querySelector('#save-profile').onclick = saveProfile;
    document.querySelector('#delete-account').onclick = deleteAccount;
    document.querySelector('#resend-verification')?.addEventListener('click', resendVerification);
    document.querySelector('#check-verification')?.addEventListener('click', checkVerification);
    if (!channel) {
        document.querySelector('#be-streamer').onclick = createStreamer;
    }
}
async function saveProfile() {
    const message = document.querySelector('#profile-msg');
    const name = document.querySelector('#edit-name').value.trim();
    const photoURL = document.querySelector('#edit-photo').value.trim();
    const bio = document.querySelector('#edit-bio').value.trim();
    if (name.length < 2 || name.length > 30) {
        message.innerHTML = '<div class="message err">O nome precisa ter entre 2 e 30 caracteres.</div>';
        return;
    }
    if (bio.length > 500) {
        message.innerHTML = '<div class="message err">A bio pode ter no máximo 500 caracteres.</div>';
        return;
    }
    if (name !== profile.username && usernameCooldownRemaining() > 0) {
        message.innerHTML = `<div class="message err">Você ainda precisa esperar ${cooldownText(usernameCooldownRemaining())} para alterar o nome.</div>`;
        return;
    }
    try {
        const data = {
            photoURL,
            bio
        };
        if (name !== profile.username) {
            data.username = name;
            data.usernameUpdatedAt = serverTimestamp();
        }
        await updateDoc(doc(db, 'profiles', user.uid), data);
        message.innerHTML = '<div class="message ok">Perfil atualizado.</div>';
        await load();
    }
    catch (error) {
        console.error(error);
        message.innerHTML = '<div class="message err">Não foi possível atualizar o perfil.</div>';
    }
}

async function resendVerification() {
    const message = document.querySelector('#verification-message');
    const button = document.querySelector('#resend-verification');
    if (!message || !button || Date.now() < verificationCooldownUntil)
        return;
    try {
        button.disabled = true;
        await sendEmailVerification(user);
        verificationCooldownUntil = Date.now() + 60000;
        message.textContent = 'E-mail enviado. Confira sua caixa de entrada.';
        let remaining = 60;
        button.textContent = `Reenviar em ${remaining}s`;
        const timer = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0 || !document.body.contains(button)) {
                clearInterval(timer);
                if (document.body.contains(button)) {
                    button.disabled = false;
                    button.textContent = 'Reenviar verificação';
                }
                return;
            }
            button.textContent = `Reenviar em ${remaining}s`;
        }, 1000);
    }
    catch (error) {
        console.warn('Falha ao reenviar verificação.', error?.code || error?.name || 'unknown');
        message.textContent = error?.code === 'auth/too-many-requests'
            ? 'Muitas tentativas. Aguarde antes de reenviar.'
            : 'Não foi possível enviar o e-mail.';
        button.disabled = false;
    }
}

async function checkVerification() {
    const message = document.querySelector('#verification-message');
    if (!message)
        return;
    message.textContent = 'Verificando...';
    await user.reload();
    if (user.emailVerified) {
        message.textContent = 'E-mail verificado com sucesso.';
        render();
    }
    else {
        message.textContent = 'Seu e-mail ainda não foi verificado.';
    }
}
async function createStreamer() {
    const message = document.querySelector('#streamer-msg');
    const input = document.querySelector('#stream-url');
    const source = parseStreamingSource(input.value);
    if (!source) {
        message.innerHTML = `
      <div class="message err">
        Use um link válido do YouTube, Twitch ou Kick.
      </div>
    `;
        return;
    }
    try {
        const existingStream = await findStream(user.uid);
        const streamId = existingStream?.id || user.uid;
        const batch = writeBatch(db);
        batch.set(doc(db, 'channels', user.uid), {
            ownerUid: user.uid,
            channelName: profile.username || 'Streamer',
            description: profile.bio || '',
            avatarURL: profile.photoURL || '',
            bannerURL: '',
            categoryId: existingStream?.categoryId || 'Just Chatting',
            isLive: existingStream?.status === 'live',
            currentStreamId: streamId,
            createdAt: serverTimestamp()
        }, { merge: true });
        if (existingStream) {
            batch.update(doc(db, 'streams', streamId), {
                playbackURL: source.canonicalUrl
            });
        }
        else {
            batch.set(doc(db, 'streams', streamId), {
                streamerUid: user.uid,
                channelId: user.uid,
                title: 'Minha primeira live na Zytrix',
                description: '',
                categoryId: 'Just Chatting',
                thumbnailURL: profile.photoURL || '',
                status: 'offline',
                playbackURL: source.canonicalUrl,
                startedAt: null,
                endedAt: null,
                createdAt: serverTimestamp(),
                viewerCount: 0
            });
        }
        await batch.commit();
        message.innerHTML = `
      <div class="message ok">
        Canal ${streamingPlatformLabel(source.platform)} vinculado e conta de streamer criada.
      </div>
    `;
        await load();
    }
    catch (error) {
        console.error(error);
        message.innerHTML = '<div class="message err">Não foi possível criar o canal.</div>';
    }
}
async function reauthenticateForDeletion() {
    const providers = user.providerData.map(item => item.providerId);
    if (providers.includes('google.com')) {
        await reauthenticateWithPopup(user, googleProvider);
        return;
    }
    if (providers.includes('password')) {
        const password = window.prompt('Para confirmar a exclusão, digite sua senha atual:');
        if (!password) throw new Error('Senha não informada.');
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        return;
    }
    throw new Error('Não foi possível reautenticar este método de login.');
}
async function deleteRefsInBatches(refs) {
    const unique = [...new Map(refs.map(ref => [ref.path, ref])).values()];
    for (let offset = 0; offset < unique.length; offset += 400) {
        const batch = writeBatch(db);
        unique.slice(offset, offset + 400).forEach(ref => batch.delete(ref));
        await batch.commit();
    }
}
async function collectAccountRefs(uid) {
    const refs = [];
    const ownLists = await Promise.all([
        getDocs(collection(db, 'users', uid, 'following')),
        getDocs(collection(db, 'users', uid, 'watchHistory')),
        getDocs(collection(db, 'channels', uid, 'followers')).catch(() => null),
        getDocs(query(collection(db, 'streams'), where('streamerUid', '==', uid)))
    ]);
    ownLists.forEach(snap => snap?.docs?.forEach(item => refs.push(item.ref)));
    try {
        const followerRefs = await getDocs(query(collectionGroup(db, 'followers'), where('uid', '==', uid)));
        followerRefs.docs.forEach(item => refs.push(item.ref));
    }
    catch (error) {
        console.warn('Não foi possível limpar todas as referências de seguidores.', error);
    }
    try {
        const ownMessages = await getDocs(query(collectionGroup(db, 'chat'), where('uid', '==', uid)));
        ownMessages.docs.forEach(item => refs.push(item.ref));
    }
    catch (error) {
        console.warn('Não foi possível limpar todas as mensagens do usuário.', error);
    }
    refs.push(
        doc(db, 'channels', uid),
        doc(db, 'wallets', uid),
        doc(db, 'profiles', uid),
        doc(db, 'users', uid)
    );
    return refs;
}
async function deleteAccount() {
    const message = document.querySelector('#delete-account-msg');
    const button = document.querySelector('#delete-account');
    const confirmation = window.prompt('Esta ação é permanente. Digite EXCLUIR para confirmar:');
    if (confirmation !== 'EXCLUIR') {
        message.innerHTML = '<div class="message err">Exclusão cancelada.</div>';
        return;
    }
    button.disabled = true;
    message.innerHTML = '<div class="message">Confirmando sua identidade...</div>';
    try {
        await reauthenticateForDeletion();
        message.innerHTML = '<div class="message">Removendo dados da conta...</div>';
        walletUnsubscribe?.();
        walletUnsubscribe = null;
        const refs = await collectAccountRefs(user.uid);
        await deleteRefsInBatches(refs);
        await deleteUser(user);
        localStorage.removeItem('zytrixSelectedStream');
        localStorage.removeItem('zytrixSelectedStreamName');
        localStorage.removeItem('zytrixSelectedStreamTitle');
        location.href = 'index.html';
    }
    catch (error) {
        console.error('Falha ao excluir conta:', error);
        const text = error?.code === 'auth/requires-recent-login'
            ? 'Entre novamente na conta e repita a exclusão.'
            : 'Não foi possível concluir a exclusão. Nenhuma nova tentativa será feita automaticamente.';
        message.innerHTML = `<div class="message err">${text}</div>`;
        button.disabled = false;
    }
}
onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
        location.href = 'login.html';
        return;
    }
    user = currentUser;
    try {
        await load();
    }
    catch (error) {
        console.error(error);
        root.innerHTML = '<div class="state">Não foi possível carregar seu perfil.</div>';
    }
});
