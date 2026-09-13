import { hash, pick } from './hash.js';
import { scoreRug } from './rug.js';
import { scoreNews } from './news.js';
import { classifyIncident } from './incident.js';

export const LEADERS = ['alpha.sol', 'jito.bag', 'curve.fox', 'mint.owl'];
export const SYMS = [
  'FROG', 'BOX', 'RING', 'COIN', 'NOVA', 'WORM', 'GOO', 'PUMP',
  'CAT', 'DOG', 'ORB', 'RAY', 'APE', 'MOON', 'WIF', 'BONK',
  'PEPE', 'SLERF', 'POP', 'MEW', 'LOCK', 'KEY', 'DUST', 'GLINT',
];

export function seedToken(i, t = 0) {
  const h = hash(i * 9.1 + 2);
  const tok = {
    sym: SYMS[i % SYMS.length],
    mint: 'pmp' + String(1000 + i),
    mc: 2000 + h * 80000,
    curve: 0.08 + hash(i * 3) * 0.7,
    mintAuthority: hash(i * 4.2) > 0.55,
    freezeAuthority: hash(i * 5.1) > 0.72,
    lpUnlocked: hash(i * 6.3) > 0.6,
    lpPulled: false,
    creatorSoldPct: hash(i * 7.2) * 55,
    topHolderPct: 8 + hash(i * 8.1) * 40,
    uniqueHolders: Math.floor(12 + hash(i * 2.2) * 180),
    bundlePct: hash(i * 1.7) * 40,
    ageSec: 20 + hash(i * 11) * 900,
    volumeCliff: hash(i * 13) > 0.82,
  };
  tok.rug = scoreRug(tok);
  tok.leader = pick(LEADERS, i + t);
  return tok;
}

export function driftToken(tok, t, i) {
  tok.mc = Math.max(400, tok.mc * (1 + (hash(t * 3 + i) - 0.48) * 0.04));
  tok.curve = Math.max(0.02, Math.min(0.99, tok.curve + (hash(t + i) - 0.45) * 0.01));
  tok.ageSec += 0.7;
  if (hash(t * 17 + i) > 0.997) tok.lpPulled = true;
  if (hash(t * 19 + i) > 0.993) tok.creatorSoldPct = Math.min(100, tok.creatorSoldPct + 12);
  tok.rug = scoreRug(tok);
  return tok;
}

export function leaderFill(t, i, tok) {
  const side = hash(t * 8 + i) > 0.38 ? 'BUY' : 'SELL';
  const sol = 0.08 + hash(t * 2.4 + i) * 2.6;
  return { side, sol, sym: tok.sym, leader: tok.leader, t };
}

const HEADLINES = [
  'kol buy on $SY — still uncapped',
  'warning: $SY bundle prints look packed',
  '$SY bonded → raydium talk',
  'dev dump rumor on $SY',
  '$SY lp pull watch from desk',
  'ath wick on $SY then fade',
  'scam ping in tg for $SY',
  '$SY listed on a tracker — cmc noise',
];

export function rollNews(t, tok) {
  const raw = pick(HEADLINES, t * 3 + tok.sym.length).replace('$SY', tok.sym);
  return scoreNews(raw);
}

const INC = ['slip_spike', 'rpc_timeout', 'tx_fail', 'curve_stall', 'authority_change', 'lp_pull'];

export function rollIncident(t, tok) {
  if (tok.lpPulled) return classifyIncident({ type: 'lp_pull', token: tok.sym, detail: 'lp gone' });
  if (hash(t * 21) > 0.92) {
    return classifyIncident({
      type: pick(INC, t * 5),
      token: tok.sym,
      detail: 'tape',
    });
  }
  return null;
}
