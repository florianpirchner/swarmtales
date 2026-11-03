# act1-06a-002-f4g4-host-smoke: the first live run on the new host

Act I of [cityofkeys](../../../../docs/STORY-CITYOFKEYS.md) with 6 residents, played by the rewritten
engine (PR #90: kernel, mechanics, overseers) to check that real models work on it. Offline tests
cannot show that.

| | |
|---|---|
| Date | 2026-11-03 |
| Code | swarmtales PR #90 (commit 64fd5fd) |
| Command | `pnpm start --story cityofkeys --agents 6 --minutes 12 --seed 7 --provider anthropic --model haiku --classifier-provider anthropic --no-reporter --budget 1` |
| Residents, classifier, judge | `claude-haiku-5-5` via Anthropic |
| Gamemaker | the story's: `deepseek/deepseek-v4.1-flash-1017` via OpenRouter |
| Cost | 0.130 USD, 250 requests |

## Result

All 6 residents played 12 minutes without a tool or turn error: 11 gamemaker looks, 0 gamemaker
errors, 0 referee interventions, 6 core motives dealt (`motive_dealt`). The leader stood on level 11
(A01, 160 points). `swt log verify` reports the signed chain intact over 2349 lines.

## Loopholes

None looked for in a smoke run.

## Problems

None in this run. Run 001 found P75 (below).

## Solutions

n/a
