# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/yasfaa/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/yasfaa/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed snapshot of 758 DeFi protocols and ranks the ones that record
no token yet by what their launch would plausibly be worth, with a costed farm plan for each.

The implied value comes only from the snapshot's own figures — never from a hand-written list of names:

```text
base       = tvl_usd x category_multiple
growth     = clamp(change_7d, -60, +120) per cent
growthMult = 1 + (growth / 100) x 0.5
maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4
implied    = max(1, round(base x growthMult x maturity))
```

`category_multiple` is the one place a category earns its own number: lending and CDP protocols hold
capital more tightly than a bridge or a DEX passes it through, so they claim a larger share of their own
TVL. Every row runs through the same function, and no slug, name or chain is special-cased.

The board carries 200 rows: all 40 watchlist protocols plus 160 pre-token protocols below the TVL floor —
the early rows the radar exists to find. Protocols whose token already trades are held apart and shown
with the market's own values, never mixed into the ranking.

Each row's farm plan is six concrete steps with a cost and a time, derived from that protocol's own
category, chain, TVL and age. A young protocol gets a longer qualifying window, because its own record
says its activity is likelier still to be counted.

The dashboard is a static page: no framework, no network request. The board is sortable and filterable,
every protocol opens a detail view that shows how its number was built, and the model's constants are
stated on the page so a reader can check the arithmetic.

## Run it

The grader mounts the sealed snapshot at `/input` and reads `/output`. Locally, point it at any snapshot:

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

It writes `board.json`, `data.js`, the `dashboard/` and `screenshots/` copies, and `dossier.json` last —
the summary the judge reads, built by `vendor/makefun-board.ts`.

Repository layout:

| Path | What it is |
|---|---|
| `main.ts` | the entrypoint: reads the snapshot, writes `/output` |
| `lib/model.ts` | the value model, the board, and the farm plans |
| `dashboard/` | the static page: `index.html`, `app.css`, `app.js` |
| `vendor/makefun-board.ts` | make.fun's dossier library, copied unchanged |

Requires Node.js 22.18 or later. Standard library only: nothing to install.

---

<sub>Entered on [make.fun](https://make.fun/?ref=f7smpc1q&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
