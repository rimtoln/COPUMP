import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideCopy } from '../src/copy.js';

test('incident halt wins over a clean rug score', () => {
  const d = decideCopy({
    cashSol: 5,
    exposedSol: 0,
    tradeSol: 0.4,
    token: { mintAuthority: false, uniqueHolders: 200, ageSec: 800 },
    incident: { type: 'rpc_timeout' },
  });
  assert.equal(d.copy, false);
  assert.match(d.reason, /incident halt/);
});

test('copies a clean buy with a sized bag', () => {
  const d = decideCopy({
    cashSol: 5,
    exposedSol: 0,
    tradeSol: 0.8,
    token: {
      mintAuthority: false,
      freezeAuthority: false,
      lpUnlocked: false,
      uniqueHolders: 160,
      ageSec: 400,
      creatorSoldPct: 0,
      topHolderPct: 10,
      bundlePct: 3,
    },
    news: { score: 0.1, pause: false },
  });
  assert.equal(d.copy, true);
  assert.ok(d.sizeSol > 0);
  assert.ok(d.sizeSol < 0.8);
});

test('news halt string is scored', () => {
  const d = decideCopy({
    cashSol: 5,
    exposedSol: 0,
    tradeSol: 0.4,
    token: { uniqueHolders: 200, ageSec: 500 },
    news: 'warning: lp pull and drained honeypot scam freeze',
  });
  assert.equal(d.copy, false);
  assert.equal(d.reason, 'news halt');
});
