# COPUMP

Paper copy desk for pump.fun. Green control room, five agents, no keys in the repo.

cryptopsihoz / session desk.

## What it does

Watches a simulated leader tape and decides whether to **copy** a fill.

1. **BANK** sizes the bag from cash, reserve, exposure, drawdown.
2. **RUG** scores mint / freeze / LP / creator dump / bundle / thin book.
3. **NEWS** scores headlines and can halt the desk.
4. **GATE** stops the book on incidents (RPC, slip, LP pull).
5. **COPY** only fires if the others let a size through.

Default mode is **paper**. Live sending is not wired on purpose.

## Rules (flexible balance)

| rule | default |
|---|---|
| reserve floor | 0.25 SOL stays untouched |
| per-copy cap | 8% of free cash |
| per-token cap | 1.5 SOL |
| total meme exposure | 45% of equity |
| rug hard block | score ≥ 72 |
| rug scale-down | score ≥ 45 |
| news halt | score ≤ −0.65 |

Change them in `src/balance.js` (`DEFAULT_RULES`).

## Agents

- **RUG** — rug / honeypot / LP / authority
- **NEWS** — token headlines
- **BANK** — cash, free, exposure, drawdown
- **COPY** — leader fill → sized paper order
- **GATE** — incidents, force-close on LP pull

## Run

```bash
cd D:\pumploo
npm test
npm start
```

Then open http://127.0.0.1:8788

Or: `python -m http.server 8788 --bind 127.0.0.1` and open the same URL.

## Layout

```
src/balance.js    size a copy from cash + risk
src/rug.js        0–100 rug score → ALLOW / REDUCE / BLOCK
src/news.js       headline tone
src/incident.js   halt / close flags
src/copy.js       final yes/no + size
src/sim.js        paper tape (no chain calls)
src/runtime.js    desk tick
src/terminal.js   1920×1080 pump.fun green room
```

## Live later

`.env.example` is a stub. If you wire a real leader wallet, keep the key off disk and off git. The desk should still refuse a copy when RUG / NEWS / GATE say no.
