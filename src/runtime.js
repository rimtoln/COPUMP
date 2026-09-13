import { decideCopy } from './copy.js';
import { DEFAULT_RULES, equityOf } from './balance.js';
import { seedToken, driftToken, rotateSlot, leaderFill, rollNews, rollIncident } from './sim.js';
import { fmt, hash } from './hash.js';

export function createWorld() {
  const tokens = [];
  for (let i = 0; i < 24; i++) tokens.push(seedToken(i, i * 3, tokens.map((x) => x.sym)));
  return {
    t: 0,
    mode: 'paper',
    cashSol: 4.8,
    exposedSol: 0,
    peakEquity: 4.8,
    drawdown: 0,
    pnlSol: 0,
    rules: { ...DEFAULT_RULES },
    tokens,
    positions: {},
    copies: [],
    blocked: [],
    copyCount: 0,
    blockCount: 0,
    lastUsd: 0,
    lastSym: '',
    lastSide: '',
    upnl: 0,
    pnlTotal: 0,
    news: [],
    incidents: [],
    agents: {
      RUG: { job: 'RUG', load: 0.4, last: 'scan' },
      NEWS: { job: 'NEWS', load: 0.3, last: 'idle' },
      BANK: { job: 'BANK', load: 0.35, last: 'reserve 0.25' },
      COPY: { job: 'COPY', load: 0.25, last: 'armed' },
      GATE: { job: 'GATE', load: 0.2, last: 'open' },
    },
  };
}

export function tickWorld(w, dt = 0.7) {
  w.t += dt;
  w.tokens.forEach((tok, i) => driftToken(tok, w.t, i));
  const slot = Math.floor(hash(w.t * 9.1) * w.tokens.length);
  const old = w.tokens[slot].sym;
  if (w.positions[old]) {
    w.cashSol += w.positions[old].sol;
    w.exposedSol = Math.max(0, w.exposedSol - w.positions[old].sol);
    delete w.positions[old];
  }
  const neu = rotateSlot(w.tokens, w.t, slot);
  w.news.unshift({ t: w.t, text: 'new mint ' + neu.sym + ' listed on pump.fun', tone: 'good', score: 0.2, hits: ['listed'], pause: false, sym: neu.sym });
  if (w.news.length > 40) w.news.pop();
  const i = Math.floor(w.t * 3) % w.tokens.length;
  const tok = w.tokens[i];
  const news = rollNews(w.t, tok);
  w.news.unshift({ t: w.t, ...news, sym: tok.sym });
  if (w.news.length > 40) w.news.pop();
  w.agents.NEWS.last = news.tone + ' ' + tok.sym;
  w.agents.NEWS.load = 0.25 + Math.abs(news.score);

  const inc = rollIncident(w.t, tok);
  if (inc) {
    w.incidents.unshift({ t: w.t, ...inc });
    if (w.incidents.length > 30) w.incidents.pop();
    w.agents.GATE.last = inc.type;
    w.agents.GATE.load = inc.severity === 'crit' ? 0.95 : 0.55;
    if (inc.closePosition && w.positions[tok.sym]) {
      const pos = w.positions[tok.sym];
      w.cashSol += pos.sol * 0.4;
      w.exposedSol = Math.max(0, w.exposedSol - pos.sol);
      w.pnlSol -= pos.sol * 0.6;
      delete w.positions[tok.sym];
    }
  } else {
    w.agents.GATE.load = Math.max(0.15, w.agents.GATE.load * 0.92);
  }

  w.agents.RUG.last = tok.sym + ' ' + tok.rug.action + ' ' + tok.rug.score;
  w.agents.RUG.load = 0.2 + tok.rug.score / 140;

  const fill = leaderFill(w.t, i, tok);
  const pos = w.positions[tok.sym];
  const decision = decideCopy({
    cashSol: w.cashSol,
    exposedSol: w.exposedSol,
    tradeSol: fill.side === 'BUY' ? fill.sol : (pos ? pos.sol : 0),
    token: tok,
    rug: tok.rug,
    news,
    incident: inc,
    drawdown: w.drawdown,
    tokenExposedSol: pos ? pos.sol : 0,
    rules: w.rules,
  });

  w.agents.COPY.last = decision.copy
    ? fill.side + ' ' + tok.sym + ' ' + fmt(decision.sizeSol, 3)
    : decision.reason;
  w.agents.COPY.load = decision.copy ? 0.7 : 0.22;

  if (decision.copy && fill.side === 'BUY') {
    w.cashSol -= decision.sizeSol;
    w.exposedSol += decision.sizeSol;
    const p = w.positions[tok.sym] || { sol: 0, entryMc: tok.mc };
    p.sol += decision.sizeSol;
    p.entryMc = tok.mc;
    w.positions[tok.sym] = p;
    w.copyCount += 1;
    w.lastUsd = Math.round(decision.sizeSol * (130 + (tok.mc % 40)));
    w.lastSym = tok.sym;
    w.lastSide = 'BUY';
    w.copies.unshift({
      t: w.t,
      side: 'BUY',
      sym: tok.sym,
      leader: fill.leader,
      leadSol: fill.sol,
      sizeSol: decision.sizeSol,
      usd: w.lastUsd,
      reason: decision.reason,
    });
  } else if (decision.copy && fill.side === 'SELL' && pos) {
    const cut = Math.min(pos.sol, decision.sizeSol || pos.sol);
    const ret = cut * (tok.mc / Math.max(1, pos.entryMc));
    w.cashSol += ret;
    w.exposedSol = Math.max(0, w.exposedSol - cut);
    w.pnlSol += ret - cut;
    pos.sol -= cut;
    if (pos.sol < 0.01) delete w.positions[tok.sym];
    w.copyCount += 1;
    w.lastUsd = Math.round(cut * (130 + (tok.mc % 40)));
    w.lastSym = tok.sym;
    w.lastSide = 'SELL';
    w.copies.unshift({
      t: w.t,
      side: 'SELL',
      sym: tok.sym,
      leader: fill.leader,
      leadSol: fill.sol,
      sizeSol: cut,
      usd: w.lastUsd,
      reason: decision.reason,
    });
  } else if (!decision.copy) {
    w.blockCount += 1;
    w.lastSym = tok.sym;
    w.blocked.unshift({
      t: w.t,
      sym: tok.sym,
      reason: decision.reason,
      rug: tok.rug.score,
    });
    if (w.blocked.length > 40) w.blocked.pop();
  }
  if (w.copies.length > 40) w.copies.pop();

  let upnl = 0;
  for (const [sym, p] of Object.entries(w.positions)) {
    const tk = w.tokens.find((x) => x.sym === sym);
    if (!tk || !p.entryMc) continue;
    upnl += p.sol * (tk.mc / p.entryMc - 1);
  }
  w.upnl = upnl;
  w.pnlTotal = (w.pnlSol || 0) + upnl;
  const eq = equityOf({ cashSol: w.cashSol, exposedSol: w.exposedSol }) + upnl;
  if (eq > w.peakEquity) w.peakEquity = eq;
  w.drawdown = w.peakEquity > 0 ? Math.max(0, 1 - eq / w.peakEquity) : 0;
  w.agents.BANK.last = '+PNL ' + (w.pnlTotal >= 0 ? '+' : '') + fmt(w.pnlTotal, 3);
  w.agents.BANK.load = 0.2 + Math.min(0.7, w.exposedSol / Math.max(0.2, eq));
  return w;
}
