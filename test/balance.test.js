import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeCopy, freeSol, DEFAULT_RULES } from '../src/balance.js';

test('reserve floor blocks copy when cash is tight', () => {
  const r = sizeCopy({ cashSol: 0.2, exposedSol: 0, tradeSol: 0.5, rugScore: 10 });
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'reserve floor');
});

test('free sol subtracts the reserve floor', () => {
  assert.equal(freeSol({ cashSol: 1.25 }, DEFAULT_RULES), 1);
});

test('hard rug score sizes to zero', () => {
  const r = sizeCopy({ cashSol: 5, exposedSol: 0, tradeSol: 0.4, rugScore: 90 });
  assert.equal(r.sizeSol, 0);
  assert.equal(r.reason, 'rug hard block');
});

test('news halt blocks', () => {
  const r = sizeCopy({ cashSol: 5, exposedSol: 0, tradeSol: 0.4, newsScore: -0.8 });
  assert.equal(r.reason, 'news halt');
});

test('sizes a fraction of free cash, not the whole leader fill', () => {
  const r = sizeCopy({ cashSol: 5, exposedSol: 0, tradeSol: 2, rugScore: 10, newsScore: 0 });
  assert.equal(r.blocked, false);
  assert.ok(r.sizeSol > 0);
  assert.ok(r.sizeSol <= (5 - 0.25) * 0.08 + 1e-9);
  assert.ok(r.sizeSol < 2);
});
