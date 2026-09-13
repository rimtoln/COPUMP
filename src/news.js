const NEG = [
  'rug', 'honeypot', 'dev dump', 'drained', 'scam', 'freeze',
  'migrated off', 'warning', 'lp pull', 'bundled',
];
const POS = ['listed', 'raydium', 'cmc', 'kol buy', 'ath', 'bonded'];

export function scoreNews(text = '') {
  const t = String(text).toLowerCase();
  let score = 0;
  const hits = [];
  for (const w of NEG) {
    if (t.includes(w)) {
      score -= 0.35;
      hits.push(w);
    }
  }
  for (const w of POS) {
    if (t.includes(w)) {
      score += 0.22;
      hits.push(w);
    }
  }
  score = Math.max(-1, Math.min(1, score));
  const tone = score <= -0.35 ? 'bad' : score >= 0.25 ? 'good' : 'flat';
  const pause = score <= -0.65;
  return { score, tone, hits, pause, text };
}
