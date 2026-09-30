import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profile = readFileSync('assets/js/perfil.js', 'utf8');
const config = readFileSync('assets/js/config-live.js', 'utf8');
const live = readFileSync('assets/js/live.js', 'utf8');

test('perfil recupera documentos essenciais ausentes', () => {
  assert.match(profile, /repairs\.push\(setDoc\(accountRef/);
  assert.match(profile, /repairs\.push\(setDoc\(profileRef/);
});

test('configuração de live não depende de carteira Zy Coins', () => {
  assert.equal(config.includes('ensureWallet(user.uid)'), false);
});

test('live mantém presença e contador de espectadores sincronizados', () => {
  assert.match(live, /'viewers'/);
  assert.match(live, /joinViewerPresence/);
  assert.match(live, /heartbeatViewerPresence/);
  assert.match(live, /viewerCount/);
});
