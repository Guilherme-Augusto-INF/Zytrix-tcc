import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safeHttpsUrl,
  safeStreamingUrl,
  safeSocialUrl,
  safeImageUrl,
  strongPassword
} from '../assets/js/security.js';

test('bloqueia protocolos executáveis e HTTP', () => {
  assert.equal(safeHttpsUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpsUrl('data:text/html,boom'), '');
  assert.equal(safeHttpsUrl('http://example.com'), '');
  assert.equal(safeHttpsUrl('https://example.com/path'), 'https://example.com/path');
});

test('streaming aceita somente Twitch/Kick/YouTube em HTTPS', () => {
  assert.equal(safeStreamingUrl('https://www.twitch.tv/example'), 'https://www.twitch.tv/example');
  assert.equal(safeStreamingUrl('https://kick.com/example'), 'https://kick.com/example');
  assert.equal(safeStreamingUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(safeStreamingUrl('https://youtu.be/dQw4w9WgXcQ'), 'https://youtu.be/dQw4w9WgXcQ');
  assert.equal(safeStreamingUrl('https://evil.example/twitch.tv/example'), '');
  assert.equal(safeStreamingUrl('https://twitch.tv.evil.example/example'), '');
  assert.equal(safeStreamingUrl('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'), '');
});

test('redes sociais respeitam allowlist de host', () => {
  assert.ok(safeSocialUrl('youtube', 'https://www.youtube.com/@zytrix'));
  assert.equal(safeSocialUrl('youtube', 'https://evil.example/@zytrix'), '');
  assert.ok(safeSocialUrl('instagram', 'https://instagram.com/zytrix'));
  assert.equal(safeSocialUrl('instagram', 'javascript:alert(1)'), '');
});

test('imagens aceitam HTTPS e bloqueiam protocolos inseguros', () => {
  assert.equal(safeImageUrl('https://images.example.com/avatar.png'), 'https://images.example.com/avatar.png');
  assert.equal(safeImageUrl('http://images.example.com/avatar.png'), '');
  assert.equal(safeImageUrl('javascript:alert(1)'), '');
});

test('senha local exige ao menos 10 caracteres, letra e número', () => {
  assert.equal(strongPassword('1234567890'), false);
  assert.equal(strongPassword('abcdefghij'), false);
  assert.equal(strongPassword('abc123'), false);
  assert.equal(strongPassword('abc12345'), false);
  assert.equal(strongPassword('Zytrix2026!'), true);
});
