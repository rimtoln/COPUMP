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
const ROOTS = [
  'FROG', 'PEPE', 'WIF', 'BONK', 'CAT', 'DOG', 'MOON', 'APE', 'GOAT', 'PIG',
  'RAT', 'OWL', 'FOX', 'BEE', 'ANT', 'COW', 'ELK', 'BAT', 'EEL', 'KOI',
  'CRAB', 'TOAD', 'BEAN', 'MILK', 'DRIP', 'FOMO', 'JEET', 'COOK', 'ZAP',
  'RIB', 'MOSS', 'YAP', 'BLIP', 'HUSK', 'MOTH', 'SEED', 'HAZE', 'WISP',
  'NODE', 'ECHO', 'SPAR', 'GIGA', 'TURBO', 'CHAD', 'NPC', 'WAGMI', 'NGMI',
];
const TAIL = ['X', 'INU', 'OS', 'AI', 'SOL', 'FUN', 'MAX', 'CEO', 'DAO', '69'];

export function mintName(t, i, used) {
  const take = new Set(used || []);
  for (let k = 0; k < 24; k++) {
    const mode = hash(t * 11 + i * 3 + k);
    let s;
    if (mode < 0.34) s = pick(ROOTS, t * 4 + i + k);
    else if (mode < 0.7) s = (pick(ROOTS, t * 5 + k) + pick(TAIL, t * 7 + i + k)).slice(0, 8);
    else {
      const C = 'BCDFGHKLMNPRSTVWZ';
      const V = 'AEIOU';
      s = C[Math.floor(hash(t + k) * C.length)] + V[Math.floor(hash(t + k + 1) * V.length)] +
        C[Math.floor(hash(t + k + 2) * C.length)] + V[Math.floor(hash(t + k + 3) * V.length)];
    }
    if (!take.has(s)) return s;
  }
  return ('M' + Math.floor(hash(t + i) * 900 + 100));
}

export function seedToken(i, t = 0, used) {
  const h = hash(i * 9.1 + 2 + t);
  const tok = {
    sym: mintName(t + 1, i, used),
    mint: 'pmp' + String(1000 + Math.floor(hash(t + i) * 9000)),
    mc: 900 + h * 92000,
    prevMc: 0,
    chg: 0,
    curve: 0.08 + hash(i * 3 + t) * 0.7,
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
  tok.prevMc = tok.mc;
  const shock = hash(t * 3.7 + i * 1.9) > 0.88 ? 0.38 : 0.16;
  const dir = hash(t * 5.2 + i) - 0.49;
  tok.mc = Math.max(280, tok.mc * (1 + dir * shock));
  tok.chg = tok.prevMc ? (tok.mc - tok.prevMc) / tok.prevMc : 0;
  tok.curve = Math.max(0.02, Math.min(0.99, tok.curve + (hash(t + i) - 0.42) * 0.035));
  tok.ageSec += 0.7;
  if (hash(t * 17 + i) > 0.997) tok.lpPulled = true;
  if (hash(t * 19 + i) > 0.993) tok.creatorSoldPct = Math.min(100, tok.creatorSoldPct + 12);
  tok.rug = scoreRug(tok);
  return tok;
}

export function rotateSlot(tokens, t, slot) {
  const used = new Set(tokens.map((x) => x.sym));
  const neu = seedToken(slot, t + 40, used);
  tokens[slot] = neu;
  return neu;
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
