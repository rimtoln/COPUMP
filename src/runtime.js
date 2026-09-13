import { decideCopy } from './copy.js';
import { DEFAULT_RULES, equityOf } from './balance.js';
import { seedToken, driftToken, leaderFill, rollNews, rollIncident, SYMS } from './sim.js';
import { fmt } from './hash.js';

export function createWorld() {
  const tokens = SYMS.map((_, i) => seedToken(i, 0));
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
  const i = Math.floor(w.t * 3) % w.tokens.length;
  const tok = driftToken(w.tokens[i], w.t, i);
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
    w.copies.unshift({
      t: w.t,
      side: 'BUY',
      sym: tok.sym,
      leader: fill.leader,
      leadSol: fill.sol,
      sizeSol: decision.sizeSol,
      usd: Math.round(decision.sizeSol * (130 + (tok.mc % 40))),
      reason: decision.reason,
    });
  } else if (decision.copy && fill.side === 'SELL' && pos) {
    const cut = Math.min(pos.sol, decision.sizeSol || pos.sol);
    const ret = cut * (0.7 + (tok.mc > pos.entryMc ? 0.35 : 0));
    w.cashSol += ret;
    w.exposedSol = Math.max(0, w.exposedSol - cut);
    w.pnlSol += ret - cut;
    pos.sol -= cut;
    if (pos.sol < 0.01) delete w.positions[tok.sym];
    w.copies.unshift({
      t: w.t,
      side: 'SELL',
      sym: tok.sym,
      leader: fill.leader,
      leadSol: fill.sol,
      sizeSol: cut,
      usd: Math.round(cut * (130 + (tok.mc % 40))),
      reason: decision.reason,
    });
  } else if (!decision.copy) {
    w.blocked.unshift({
      t: w.t,
      sym: tok.sym,
      reason: decision.reason,
      rug: tok.rug.score,
    });
    if (w.blocked.length > 40) w.blocked.pop();
  }
  if (w.copies.length > 40) w.copies.pop();

  const eq = equityOf({ cashSol: w.cashSol, exposedSol: w.exposedSol });
  if (eq > w.peakEquity) w.peakEquity = eq;
  w.drawdown = w.peakEquity > 0 ? Math.max(0, 1 - eq / w.peakEquity) : 0;
  w.agents.BANK.last = 'cash ' + fmt(w.cashSol, 2) + '  dd ' + Math.round(w.drawdown * 100) + '%';
  w.agents.BANK.load = 0.2 + Math.min(0.7, w.exposedSol / Math.max(0.2, eq));
  return w;
}
