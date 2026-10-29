# act2-06a-017-f10g10-p46: the cache measurement

A short Act II of [nexus](../../../../docs/STORY-NEXUS.md) (minutes 9-21) with 6 residents, resumed
from [`examples/nexus-act1-06a-04/`](../../../../examples/nexus-act1-06a-04/), both dials at 10, to
measure the fix for P46: every tool's schema goes out in every request, a locked tool answers
`TOOL_LOCKED: not available to you at this level or in this phase`, a `[tools]` notice names the
open tools whenever they change, and `activeTools` lists them. It is a measurement, not a full act.

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #30 (all tools in every request) |
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 10 --minutes 22` |
| Residents, classifier, judge, souffleur | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter |
| End | minute 21 (`--minutes 22`) |
| Cost | 0.289 USD |

## The measurement (minutes 9-21, residents only)

| | 013 f10g10 | 014 f10g10 | 017 (fix) |
|---|---:|---:|---:|
| Requests | 191 | 214 | 200 |
| Cache misses | 44 | 36 | 6 (the first request of each resident after the resume) |
| Share of cost in misses | 67% | 56% | 10% |
| Resident cost | 0.322 USD | 0.293 USD | 0.154 USD |
| Cost per request | 1.69 mUSD | 1.37 mUSD | 0.77 mUSD |

Half the cost per request, at the same output. Residents called a locked tool once
(`listPetitions`) against four times in 014, and never needed `activeTools`.

## What happened in 13 minutes

- Mercer won the black seal for 35 and broke it on Brassard, the leader at 120 points and the
  target of his secret goal; Harrow lost the certificate Brassard held for him.
- Mercer promised Maren her counter-factor once her certificate landed, then asked for more. Maren
  stayed on door 8 to the end of the measurement (P43 again).
- Herald and Registrar deadlocked on door 8, then both gave in and passed.

The reporter's draft is in `run/REPORT.md`; it was not reviewed further, as this is a measurement.
