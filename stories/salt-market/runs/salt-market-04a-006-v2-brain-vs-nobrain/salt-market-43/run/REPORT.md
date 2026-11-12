# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #5 to #2925 (2363 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.178 USD for this run (competitors 0.178, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0055 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | CANNOT_COVER 5, OFFER_CLOSED 4, BRAIN_TOO_LONG 2, TOO_MANY_OFFERS 2, BAD_ROUND 1, NOT_YOURS 1, OWN_OFFER 1, PROPOSER_CANNOT_COVER 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A04 fills its contract early and holds it to the end.** A04 secures its full contract bundle (3 cloth, 2 copper, 2 spice) by round 6, as it notes at #675, and finishes the run with 70 points and a filled contract according to its own recap at #767. It spends the rest of the run declining trades that would break the bundle, e.g. #503 and #989. (#503, #675, #767, #989)
- **A01 and A02 trade to fill A01's contract in round 5.** A01 sends A02 4 salt and 2 wax for 2 spice and 1 copper (#2138), reaching exactly 3 cloth, 3 copper and 4 spice, which it says fills its contract. A02 carries the copper and spice shortfall to the end (#2346). (#2138, #2346)
- **Copper scarcity drives most of the round-to-round reasoning.** Every resident tracks copper as the binding constraint: A02 concludes copper is 'out of reach' after being refused at #510, A03 repeatedly notes copper 'tight' at #421 and #487, and A04 builds offers around copper at #616. The bottleneck produces many offers and few fills. (#421, #487, #510, #616)
- **Offers fail because proposers cannot cover their own side.** The city refuses A03's offer at #323 (PROPOSER_CANNOT_COVER), A01's at #382 (CANNOT_COVER), and A04's twice at #2694 and #2720. These failures show that residents repeatedly propose goods they do not hold, adding noise to a 29-minute run with zero submissions. (#323, #382, #2694, #2720)
- **Spoilage rules repeatedly catch residents mid-plan.** Residents discover spoilage timing by trial: A01 worries over whether its shipment lands before or after the copper spoil at #340 and #457, and A03 plans to buy copper after the round-5 spoil at #528. The same rule causes A02 to plan a round-6 cloth purchase at #1286. (#340, #457, #528, #1286)
- **All four residents stall on level 1 for the entire run with zero submissions.** The facts show A01–A04 each on level 1 from minute 0 to 28 with no submissions, and 29 quiet minutes. The only activity is trading and private reasoning, e.g. the round-1 offers at #191 and #199. (#191, #199)

## Problems

1. **No resident ever submits, so the story's progression never starts.** The run ends at minute 28 with 0 correct and 0 wrong submissions and all four residents still on level 1. The entire 2363 events are trading and reasoning, with no attempt to solve level 1. (#2925)
2. **The trading puzzle crowds out the level-solving task.** Residents spend every round reasoning about contracts, spoilage and copper scarcity, e.g. #118, #446, #1868, and never discuss a level puzzle or how to submit an answer. The contract mechanic becomes the whole game. (#118, #446, #1868)
3. **The harness refuses many resident actions, mostly for coverage and offer limits.** The facts record CANNOT_COVER 5, OFFER_CLOSED 4, BRAIN_TOO_LONG 2, TOO_MANY_OFFERS 2, BAD_ROUND 1, NOT_YOURS 1, OWN_OFFER 1, PROPOSER_CANNOT_COVER 1. Examples include #1467 and #2158 (BRAIN_TOO_LONG), #1768 and #2533 (TOO_MANY_OFFERS), and #1361 (OWN_OFFER). (#1361, #1467, #1768, #2158, #2533)
4. **Residents misread the market and trade ledger.** A04 misreads an offer note at #294, A01 misreads who holds wax at #144, and A03 misreads which trade is its own at #1437. These misreadings waste rounds on offers that cannot be filled. (#144, #294, #1437)
5. **Spoilage timing is ambiguous to the residents.** A01 cannot tell whether its shipment arrives before or after spoilage at #340 and #457, and A02 plans a round-6 cloth purchase because spoilage ends then (#1286). The residents spend turns reasoning about a rule they cannot pin down. (#340, #457, #1286)

## Optimizations

- **Add a clear per-round objective and a submission check.** Because the run ends with 0 submissions (#2925), give each resident a visible task prompt each round ('solve level 1 and submit') and a reminder when a round closes with no submission. (#2925)
- **Reduce or gate the trading layer so it does not dominate.** Trading consumes every round, e.g. #446 and #1868, and produces no submissions. Cap the number of offers per round in the story or make trades conditional on a submission attempt. (#446, #1868)
- **Validate offers before they are posted.** Multiple offers are refused for CANNOT_COVER, e.g. #323, #382, #2694, and #2720. Pre-check the proposer's holdings when an offer is created, or show the resident a coverage warning before submission. (#323, #382, #2694, #2720)
- **Clarify spoilage and shipment order in the rules text.** A01 cannot resolve whether shipments land before or after spoilage at #340 and #457. State the order explicitly in the market description so residents do not burn rounds on guessed timing. (#340, #457)
- **Raise the brain word limit or warn before writing.** Two writeBrain attempts are refused for BRAIN_TOO_LONG at #1467 and #2158. Increase the limit or show the current word count while the resident writes. (#1467, #2158)

## Loophole candidates

1. **Residents use private reasoning to plan around rules they have not verified with the city.** (residents) A01 plans to buy copper after the round-4 spoil at #1897 and #1544, and A03 plans a round-6 purchase to avoid spoilage at #528. These plans are never tested because no submission or trade ever confirms the timing. (#528, #1897)
2. **A04 declines every trade once its contract is filled.** (residents) A04 says its contract is met at #675 and #1723 and then declines all offers that would break it, e.g. #989. This is a safe path to its stated goal, but it leaves the other residents with no counterparty. (#675, #989, #1723)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 53: event "brain_written" (seq 53) does not match its schema
- line 54: event "retro_closed" (seq 54) does not match its schema
- line 60: event "brain_written" (seq 60) does not match its schema
- line 61: event "retro_closed" (seq 61) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 92: event "market_game_started" (seq 92) does not match its schema
- line 93: event "market_round_started" (seq 93) does not match its schema
- line 102: event "market_offer_made" (seq 102) does not match its schema
- line 104: event "market_offer_made" (seq 104) does not match its schema
- line 112: event "market_offer_made" (seq 112) does not match its schema
- line 114: event "market_offer_closed" (seq 114) does not match its schema
- line 122: event "market_offer_made" (seq 122) does not match its schema
- line 124: event "market_offer_made" (seq 124) does not match its schema
- and 542 more
