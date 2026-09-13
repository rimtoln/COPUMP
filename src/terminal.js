import { createWorld, tickWorld } from './runtime.js';
import { fmt, money } from './hash.js';
import { equityOf, freeSol } from './balance.js';

const AGENTS = [
  { n: 'RUG', j: 'RUG', c: '#ff5a5a' },
  { n: 'NEWS', j: 'NEWS', c: '#e8c040' },
  { n: 'BANK', j: 'BANK', c: '#14f195' },
  { n: 'COPY', j: 'COPY', c: '#7dffc4' },
  { n: 'GATE', j: 'GATE', c: '#8affd4' },
];

export function boot() {
  const stage = document.getElementById('stage');
  function fit() {
    stage.style.transform = 'scale(' + Math.min(innerWidth / 1920, innerHeight / 1080) + ')';
  }
  addEventListener('resize', fit);
  fit();

  const box = document.getElementById('agents');
  AGENTS.forEach((a, i) => {
    const d = document.createElement('div');
    d.className = 'agent';
    d.id = 'ag-' + a.n;
    d.innerHTML =
      '<i style="background:' + a.c + ';animation-delay:-' + (i * 0.12) + 's"></i>' +
      '<span>' + a.n + '</span><small id="agj-' + a.n + '">' + a.j + '</small>' +
      '<div class="load"><em id="agl-' + a.n + '" style="animation-delay:-' + (i * 0.2) + 's"></em></div>';
    box.appendChild(d);
  });

  const bars = document.getElementById('bars');
  for (let i = 0; i < 18; i++) {
    const b = document.createElement('i');
    b.style.height = (30 + Math.random() * 70) + '%';
    b.style.animationDelay = (-i * 0.07) + 's';
    bars.appendChild(b);
  }

  const news =
    '  ·  PUMPLOO PAPER COPY  ·  RESERVE 0.25 SOL  ·  RUG HARD 72  ·  NEWS HALT ON LP PULL  ·  BANK SIZES 8% FREE  ·  GATE CLOSES DRAINED BAGS  ·  NO KEYS IN REPO  ·  ';
  document.getElementById('ticker').innerHTML = '<span>' + news + '</span><span>' + news + '</span>';

  const w = createWorld();
  const logCopy = document.getElementById('log1');
  const logRisk = document.getElementById('log2');
  const clk = document.getElementById('clock');
  const books = document.getElementById('books');
  const cv = document.getElementById('candles');
  const cx = cv.getContext('2d');
  const bond = document.getElementById('bond');
  const bx = bond.getContext('2d');
  let price = 148, hist = [];

  function line(el, who, text, cls) {
    const p = document.createElement('p');
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    p.innerHTML = '<time>' + hh + '</time><b class="' + (cls || '') + '">' + who + '</b> ' + text;
    el.insertBefore(p, el.firstChild);
    while (el.children.length > 14) el.removeChild(el.lastChild);
  }

  function paintBooks() {
    books.innerHTML = '';
    w.tokens.slice(0, 12).forEach((tk) => {
      const pos = w.positions[tk.sym];
      const el = document.createElement('div');
      el.className = 'book' + (tk.rug.action === 'BLOCK' ? ' bad' : tk.rug.action === 'REDUCE' ? ' mid' : '');
      el.innerHTML =
        '<em>' + tk.sym + '</em>' +
        '<strong>$' + Math.round(tk.mc).toLocaleString('en-US') + '</strong>' +
        '<span class="r ' + tk.rug.action.toLowerCase() + '">RUG ' + tk.rug.score + ' ' + tk.rug.action + '</span>' +
        '<small>' + (pos ? 'held ' + fmt(pos.sol, 2) + ' SOL' : 'flat') + ' · curve ' + Math.round(tk.curve * 100) + '%</small>';
      books.appendChild(el);
    });
  }

  function paintBal() {
    const eq = equityOf(w);
    const free = freeSol(w, w.rules);
    document.getElementById('eq').textContent = fmt(eq, 3) + ' SOL';
    document.getElementById('cash').textContent = fmt(w.cashSol, 3);
    document.getElementById('free').textContent = fmt(free, 3);
    document.getElementById('exp').textContent = fmt(w.exposedSol, 3);
    document.getElementById('pnl').textContent = (w.pnlSol >= 0 ? '+' : '') + fmt(w.pnlSol, 3);
    document.getElementById('pnl').className = w.pnlSol >= 0 ? 'up' : 'dn';
    document.getElementById('dd').textContent = Math.round(w.drawdown * 100) + '%';
    document.getElementById('mode').textContent = w.mode.toUpperCase();
    document.getElementById('ncopy').textContent = String(w.copies.length).padStart(2, '0');
    document.getElementById('nblock').textContent = String(w.blocked.length).padStart(2, '0');
    const fill = Math.min(100, (w.exposedSol / Math.max(0.01, eq)) * 100);
    document.getElementById('expbar').style.width = fill + '%';
  }

  function paintAgents() {
    for (const n of Object.keys(w.agents)) {
      const a = w.agents[n];
      const j = document.getElementById('agj-' + n);
      const l = document.getElementById('agl-' + n);
      if (j) j.textContent = a.last.slice(0, 22);
      if (l) l.style.transform = 'scaleX(' + Math.max(0.12, Math.min(1, a.load)) + ')';
    }
  }

  function candle() {
    const o = price;
    const c = price + (Math.random() - 0.46) * (4 + w.drawdown * 12);
    price = c;
    hist.push({ o, c, h: Math.max(o, c) + Math.random() * 3, l: Math.min(o, c) - Math.random() * 3 });
    if (hist.length > 42) hist.shift();
    cx.clearRect(0, 0, cv.width, cv.height);
    const min = Math.min(...hist.map((x) => x.l)) - 4;
    const max = Math.max(...hist.map((x) => x.h)) + 4;
    const sc = cv.height / (max - min);
    const ww = cv.width / 42;
    hist.forEach((k, i) => {
      const x = i * ww + 3;
      const up = k.c >= k.o;
      cx.strokeStyle = up ? '#14f195' : '#ff5a5a';
      cx.fillStyle = cx.strokeStyle;
      cx.beginPath();
      cx.moveTo(x + ww / 2, (max - k.h) * sc);
      cx.lineTo(x + ww / 2, (max - k.l) * sc);
      cx.stroke();
      cx.fillRect(x + 1, (max - Math.max(k.o, k.c)) * sc, ww - 4, Math.max(2, Math.abs(k.c - k.o) * sc));
    });
  }

  function paintBond() {
    bx.clearRect(0, 0, bond.width, bond.height);
    bx.strokeStyle = '#14f195';
    bx.lineWidth = 1.6;
    bx.beginPath();
    for (let i = 0; i < 48; i++) {
      const x = (i / 47) * bond.width;
      const y = bond.height - (0.12 + 0.78 * Math.pow(i / 47, 1.6)) * bond.height * (0.85 + 0.08 * Math.sin(w.t + i / 8));
      if (i === 0) bx.moveTo(x, y);
      else bx.lineTo(x, y);
    }
    bx.stroke();
  }

  let lastCopy = 0, lastBlock = 0, lastNews = 0, lastInc = 0;
  function step() {
    const prevC = w.copies.length, prevB = w.blocked.length, prevN = w.news.length, prevI = w.incidents.length;
    tickWorld(w, 0.7);
    if (w.copies.length > prevC || w.copies[0] && w.copies[0].t !== lastCopy) {
      const c = w.copies[0];
      if (c) {
        lastCopy = c.t;
        line(logCopy, 'COPY', c.side + ' ' + c.sym + '  ' + fmt(c.sizeSol, 3) + ' SOL  ' + money(c.usd) + '  lead ' + c.leader, c.side === 'BUY' ? 'up' : 'dn');
      }
    }
    if (w.blocked[0] && w.blocked[0].t !== lastBlock) {
      lastBlock = w.blocked[0].t;
      line(logCopy, 'GATE', 'skip ' + w.blocked[0].sym + '  ' + w.blocked[0].reason, 'dn');
    }
    if (w.news[0] && w.news[0].t !== lastNews) {
      lastNews = w.news[0].t;
      line(logRisk, 'NEWS', w.news[0].sym + '  ' + w.news[0].text, w.news[0].tone === 'bad' ? 'dn' : 'up');
    }
    if (w.incidents[0] && w.incidents[0].t !== lastInc) {
      lastInc = w.incidents[0].t;
      const inc = w.incidents[0];
      line(logRisk, 'RUG', inc.type + '  ' + inc.token + '  ' + inc.severity, inc.severity === 'crit' ? 'dn' : '');
    }
    paintBooks();
    paintBal();
    paintAgents();
    paintBond();
    candle();
    const d = new Date();
    clk.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    document.getElementById('focusV').textContent = (w.copies[0] && w.copies[0].sym) || w.tokens[0].sym;
  }

  line(logCopy, 'BANK', 'desk armed  reserve 0.25 SOL  max 8% free', 'up');
  line(logRisk, 'RUG', 'hard block ≥ 72  reduce ≥ 45', '');
  for (let k = 0; k < 8; k++) tickWorld(w, 0.7);
  step();
  setInterval(step, 700);
}
