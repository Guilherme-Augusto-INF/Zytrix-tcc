import test from 'node:test';
import assert from 'node:assert/strict';
import { splitHomeLives } from '../assets/js/live-ranking.js';

function makeLives(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `live-${index + 1}`,
    viewerCount: count - index
  }));
}

for (const count of [0, 1, 3, 4, 7, 9]) {
  test(`home separa destaques e ao vivo sem duplicar com ${count} live(s)`, () => {
    const { ordered, featured, liveNow } = splitHomeLives(makeLives(count));
    assert.deepEqual(featured, ordered.slice(0, 3));
    assert.deepEqual(liveNow, ordered.slice(3, 7));
    assert.equal(featured.length, Math.min(count, 3));
    assert.equal(liveNow.length, Math.min(Math.max(count - 3, 0), 4));
    assert.deepEqual(
      featured.filter(item => liveNow.some(other => other.id === item.id)),
      []
    );
  });
}
