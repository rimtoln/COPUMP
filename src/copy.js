import { sizeCopy } from './balance.js';
import { scoreRug } from './rug.js';
import { classifyIncident } from './incident.js';
import { scoreNews } from './news.js';

export function decideCopy(ctx = {}) {
  const incident = ctx.incident
    ? (ctx.incident.severity ? ctx.incident : classifyIncident(ctx.incident))
    : null;
  if (incident?.haltCopy) {
    return {
      copy: false,
      sizeSol: 0,
      scale: 0,
      reason: 'incident halt: ' + incident.type,
      rug: ctx.rug || null,
      incident,
    };
  }

  const rug = ctx.rug || scoreRug(ctx.token || {});
  if (rug.action === 'BLOCK') {
    return {
      copy: false,
      sizeSol: 0,
      scale: 0,
      reason: 'rug block: ' + (rug.flags.join(', ') || 'score'),
      rug,
      incident,
    };
  }

  const news = ctx.news
    ? (typeof ctx.news.score === 'number' ? ctx.news : scoreNews(ctx.news.text || ctx.news))
    : { score: 0, pause: false };
  if (news.pause) {
    return {
      copy: false,
      sizeSol: 0,
      scale: 0,
      reason: 'news halt',
      rug,
      incident,
    };
  }

  const sized = sizeCopy({
    cashSol: ctx.cashSol,
    exposedSol: ctx.exposedSol,
    tradeSol: ctx.tradeSol,
    rugScore: rug.score,
    newsScore: news.score,
    drawdown: ctx.drawdown,
    tokenExposedSol: ctx.tokenExposedSol,
    rules: ctx.rules,
  });

  return {
    copy: !sized.blocked && sized.sizeSol > 0,
    sizeSol: sized.sizeSol,
    scale: sized.scale,
    reason: sized.reason,
    rug,
    incident,
    news,
  };
}
