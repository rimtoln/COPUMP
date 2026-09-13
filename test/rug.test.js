import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreRug } from '../src/rug.js';

test('clean token stays ALLOW', () => {
  const r = scoreRug({
    mintAuthority: false,
    freezeAuthority: false,
    lpUnlocked: false,
    creatorSoldPct: 0,
    topHolderPct: 8,
    uniqueHolders: 200,
    bundlePct: 2,
    ageSec: 600,
  });
  assert.equal(r.action, 'ALLOW');
  assert.ok(r.score < 45);
});

test('lp pull is a hard BLOCK', () => {
  const r = scoreRug({ lpPulled: true, mintAuthority: true, freezeAuthority: true });
  assert.equal(r.action, 'BLOCK');
  assert.ok(r.flags.includes('lp pulled'));
});

test('fresh bundle + mint authority reduces or blocks', () => {
  const r = scoreRug({
    mintAuthority: true,
    freezeAuthority: true,
    lpUnlocked: true,
    bundlePct: 40,
    uniqueHolders: 10,
    ageSec: 20,
  });
  assert.ok(r.score >= 45);
  assert.ok(r.action === 'REDUCE' || r.action === 'BLOCK');
});
