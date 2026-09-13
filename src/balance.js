export const DEFAULT_RULES = {
  reserveFloorSol: 0.25,
  maxPctFree: 0.08,
  maxTokenSol: 1.5,
  maxExposurePct: 0.45,
  minCopySol: 0.01,
  rugHard: 72,
  rugSoft: 45,
  newsHard: -0.65,
};

export function equityOf(b) {
  return (b.cashSol || 0) + (b.exposedSol || 0);
}

export function freeSol(b, rules = DEFAULT_RULES) {
  return Math.max(0, (b.cashSol || 0) - rules.reserveFloorSol);
}

export function sizeCopy(input) {
  const r = { ...DEFAULT_RULES, ...(input.rules || {}) };
  const cash = input.cashSol ?? 0;
  const exposed = input.exposedSol ?? 0;
  const tradeSol = Math.max(0, input.tradeSol ?? 0);
  const rugScore = input.rugScore ?? 0;
  const newsScore = input.newsScore ?? 0;
  const drawdown = Math.max(0, input.drawdown ?? 0);
  const tokenExposed = input.tokenExposedSol ?? 0;
  const equity = cash + exposed;
  const free = Math.max(0, cash - r.reserveFloorSol);

  if (tradeSol <= 0) {
    return { sizeSol: 0, scale: 0, blocked: true, reason: 'empty leader fill' };
  }
  if (free < r.minCopySol) {
    return { sizeSol: 0, scale: 0, blocked: true, reason: 'reserve floor' };
  }
  if (rugScore >= r.rugHard) {
    return { sizeSol: 0, scale: 0, blocked: true, reason: 'rug hard block' };
  }
  if (newsScore <= r.newsHard) {
    return { sizeSol: 0, scale: 0, blocked: true, reason: 'news halt' };
  }

  let scale = 1;
  if (rugScore >= r.rugSoft) {
    scale *= 1 - (rugScore - r.rugSoft) / Math.max(1, r.rugHard - r.rugSoft);
  }
  if (newsScore < 0) scale *= Math.max(0, 1 + newsScore);
  if (drawdown > 0) scale *= Math.max(0.15, 1 - drawdown);

  const roomExposure = Math.max(0, r.maxExposurePct * equity - exposed);
  const roomToken = Math.max(0, r.maxTokenSol - tokenExposed);
  const capPct = free * r.maxPctFree;
  let size = Math.min(tradeSol, capPct, roomExposure, roomToken, free) * scale;
  size = Math.floor(size * 1000) / 1000;

  if (size < r.minCopySol) {
    return { sizeSol: 0, scale, blocked: true, reason: 'dust after scale' };
  }
  return { sizeSol: size, scale, blocked: false, reason: 'sized' };
}
