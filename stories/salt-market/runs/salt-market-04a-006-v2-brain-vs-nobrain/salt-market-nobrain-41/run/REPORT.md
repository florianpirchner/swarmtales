# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market-nobrain` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #3 to #2698 (2153 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end); A03 on level 1 from minute 0 for 24 minutes (to the end); A04 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.166 USD for this run (competitors 0.166, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0050 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OFFER_CLOSED 4, CANNOT_COVER 3, NOT_FOR_YOU 3, other 1, TOO_MANY_OFFERS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident stalls on level 1 for the whole run.** All four residents (A01-A04) stay on level 1 from minute 0 to minute 24 with no submission. The run ends at #2698 with no level solved and 25 quiet minutes. (#2698)
- **Contracts are traded but never submitted.** Residents spend the run assembling contract goods but never turn them in. A03 believes its contract is covered by holding 3 cloth, 3 copper and 3 wax (#2683), and A02 says its contract is already met (#609), yet no submission is ever recorded. (#609, #2683)
- **Spoilage confusion dominates the early rounds.** Residents repeatedly misread spoilage timing and quantities, debating whether shipments land before or after spoilage (#1514, #816) and losing goods to spoilage they did not fully plan for (#913, #2125). (#816, #913, #1514, #2125)
- **Scarce wax makes the contracts unreachable.** Every resident concludes the wax requirement cannot be met because wax holders refuse to sell. A01 says it is short one spice and will not break its wax holding (#2006), A04 concludes its contract needs two more wax that nobody will sell (#2658), and A02 declares its contract out of reach (#2673). (#2006, #2658, #2673)
- **The city refuses several trades on mechanics, not on merits.** Offers are refused for reasons unrelated to the residents' strategy: CANNOT_COVER for insufficient goods (#1025, #1076), NOT_FOR_YOU for public offers (#335), TOO_MANY_OFFERS (#1603), and OFFER_CLOSED (#1810, #1860). (#335, #1025, #1076, #1603, #1810, #1860)
- **Late-game residents switch from contracts to raw points.** Once contracts look unreachable, residents pivot to maximizing holdings value. A04 abandons its contract and trades for point value (#521, #1177), and A02 switches to points once its wax is gone (#2522). (#521, #1177, #2522)

## Problems

1. **Residents never submit, so no level is ever attempted.** The run has 0 submissions and 25 of 25 quiet minutes, with all four residents stuck on level 1 to the end. Residents repeatedly believe they hold contract goods (#609, #2683) but the log shows no submission event and the harness records 0 levels solved. (#609, #2683, #2698)
2. **Spoilage and shipment ordering are misunderstood, not just complex.** Residents openly debate whether the end-of-round shipment arrives before or after spoilage and what counts for the tax (#816, #1514). These are rules questions, not strategy, and they consume whole turns. (#816, #1514)
3. **Offer mechanics generate refusals that look like noise.** The run logs 12 tool errors including CANNOT_COVER (#1025), NOT_FOR_YOU (#335) and OFFER_CLOSED (#1810, #1860). Residents sometimes need turns to discover an offer is withdrawn before acting (#1810). (#335, #1025, #1603, #1810, #1860)
4. **Wax scarcity locks the central contract for everyone.** All four residents need wax but holders refuse to trade it. A01 refuses offers that cost wax (#1643, #1916), A04 declines because it needs its single wax (#2153), and A02 keeps its two wax for the contract (#1681). (#1643, #1681, #1916, #2153)
5. **The gamemaker never acted.** The facts record no gamemaker actions, and one resident hit a missing tool when trying to end a turn (#2413 'Tool end_turn not found'). The story had no referee interventions to break the deadlock. (#2413)

## Optimizations

- **Make the submit action obvious and testable.** Residents hold complete or near-complete contract sets but never submit (#609, #2683). Add a visible submit prompt when a resident holds the required goods, and log the submission attempt so a stalled run shows where it failed. (#609, #2683)
- **Publish a one-line spoilage and shipment order in each round message.** Residents burn turns debating whether shipments land before or after spoilage (#816, #1514). State the order explicitly in the round announcement so residents spend turns trading instead of guessing. (#816, #1514)
- **Reduce wax scarcity or add a fallback supply.** Every resident's contract fails on wax because holders refuse to sell it (#1916, #2153, #2658). Either lower the wax requirement or add a city supply so contracts stay reachable. (#1916, #2153, #2658)
- **Fix and pre-check offer mechanics.** The run logs CANNOT_COVER, NOT_FOR_YOU, TOO_MANY_OFFERS and OFFER_CLOSED refusals (#1025, #335, #1603, #1810). Validate offer acceptance against the resident's holdings before it is posted, and clear stale offers automatically. (#335, #1025, #1603, #1810)
- **Fix the missing end_turn tool and give the gamemaker a role.** One resident hit 'Tool end_turn not found' (#2413), and the gamemaker took no actions at all. Repair the tool and have the gamemaker step in when a resident has stalled for several minutes. (#2413)

## Loophole candidates

None found.

## Log issues

- line 1: event "market_game_started" (seq 1) does not match its schema
- line 2: event "market_round_started" (seq 2) does not match its schema
- line 15: event "market_offer_made" (seq 15) does not match its schema
- line 17: event "market_offer_made" (seq 17) does not match its schema
- line 25: event "market_offer_closed" (seq 25) does not match its schema
- line 27: event "market_offer_made" (seq 27) does not match its schema
- line 35: event "market_offer_closed" (seq 35) does not match its schema
- line 37: event "market_offer_made" (seq 37) does not match its schema
- line 46: event "market_offer_closed" (seq 46) does not match its schema
- line 48: event "market_offer_made" (seq 48) does not match its schema
- line 50: event "market_offer_made" (seq 50) does not match its schema
- line 59: event "market_trade" (seq 59) does not match its schema
- line 60: event "market_offer_closed" (seq 60) does not match its schema
- line 62: event "market_offer_closed" (seq 62) does not match its schema
- line 69: event "market_offer_closed" (seq 69) does not match its schema
- line 77: event "market_offer_made" (seq 77) does not match its schema
- line 79: event "market_offer_made" (seq 79) does not match its schema
- line 87: event "market_offer_closed" (seq 87) does not match its schema
- line 89: event "market_offer_made" (seq 89) does not match its schema
- line 97: event "market_offer_closed" (seq 97) does not match its schema
- and 525 more
