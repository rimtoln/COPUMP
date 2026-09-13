export function scoreRug(s = {}) {
  let score = 0;
  const flags = [];

  if (s.lpPulled) {
    score += 40;
    flags.push('lp pulled');
  }
  if (s.mintAuthority) {
    score += 22;
    flags.push('mint live');
  }
  if (s.freezeAuthority) {
    score += 18;
    flags.push('freeze live');
  }
  if (s.lpUnlocked) {
    score += 20;
    flags.push('lp unlocked');
  }

  const creator = s.creatorSoldPct || 0;
  if (creator > 40) {
    score += 16;
    flags.push('creator dump');
  } else if (creator > 15) {
    score += 8;
    flags.push('creator sell');
  }

  if ((s.topHolderPct || 0) > 35) {
    score += 12;
    flags.push('top heavy');
  }
  if ((s.uniqueHolders ?? 99) < 40) {
    score += 10;
    flags.push('thin book');
  }
  if ((s.bundlePct || 0) > 25) {
    score += 14;
    flags.push('bundle');
  }
  if ((s.ageSec ?? 9999) < 90) {
    score += 8;
    flags.push('fresh mint');
  }
  if (s.volumeCliff) {
    score += 10;
    flags.push('vol cliff');
  }

  score = Math.min(100, score);
  const action = score >= 72 ? 'BLOCK' : score >= 45 ? 'REDUCE' : 'ALLOW';
  return { score, flags, action };
}
