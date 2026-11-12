# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market-nobrain` |
| Seed | 45 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #3 to #2551 (2043 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end); A03 on level 1 from minute 0 for 24 minutes (to the end); A04 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.143 USD for this run (competitors 0.143, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0049 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OFFER_CLOSED 4, TOO_MANY_OFFERS 3, NOT_FOR_YOU 1, OWN_OFFER 1, PROPOSER_CANNOT_COVER 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stalled on level 1 for the entire 24-minute run.** A01, A02, A03 and A04 each stayed on level 1 from minute 0 to minute 24 with zero submissions; the referee ended the run at #2551 with no level-ups and 0 correct submissions. (#2551)
- **Wax scarcity became the binding constraint for every contract.** A01 needed 4 wax (#35), A04 needed 3 wax (#24), A03 ended one wax short (#456), and by round 3 residents concluded no one would sell wax because every holder needed it (#439, #433, #580). (#24, #35, #433, #439, #456, #580)
- **A01 and A02 reached their contract requirements and then froze.** A01 declared its 4 wax, 2 copper, 2 spice complete at #510, and A02 declared 4 cloth, 3 copper, 4 wax complete at #1161; both then stopped trading to protect the set. (#509, #510, #1160, #1161)
- **A01 abandoned its contract and sold its wax for points.** After concluding the wax target was unreachable, A01 sold 2 wax for 2 cloth and 2 copper and 1 wax for 6 salt (#1827), moving to a pure point-maximizing strategy at #1207. (#1207, #1807, #1826, #1827)
- **A04 misread a completed trade's direction and lost the wax it needed.** A04 believed it had received 2 wax in O25 but realized at #2118 it had given 2 wax away for 2 salt, leaving it at 2 wax and dooming its contract (#521, #1838). (#521, #1838, #2118)
- **No resident posted on the board or sent a DM; all coordination was offer-driven.** The facts record 0 DMs, 0 board posts and 0 group posts, and residents' SAYS lines were all addressed to themselves (e.g. #235, #447, #1161). (#235, #447, #1161)

## Problems

1. **Residents never submitted anything, so no level was ever attempted.** All four stayed on level 1 for 24 minutes with zero submissions (#2551), meaning the run tested trading behavior only and never exercised the puzzle/level mechanic the story presumably centers on. (#2551)
2. **Repeated tool errors on the trading mechanics.** The run logged OFFER_CLOSED x4, TOO_MANY_OFFERS x3, NOT_FOR_YOU x1, OWN_OFFER x1 and PROPOSER_CANNOT_COVER x1, e.g. #51, #896, #1851, #1981, #2222, #2223, #417, #199. (#51, #199, #417, #896, #1851, #1981, #2222, #2223)
3. **Residents repeatedly misread trade direction and spoilage rules.** A04 reversed the direction of a completed trade (#2118) and A02 also had a direction backwards at #664; A01 at #603 was still tracking round-2 shipments in round 6, and A01 at #1257/#1270 re-derived an early-game state in round 12. (#603, #664, #1257, #1270, #2118)
4. **Everyone hoarded the same scarce good, deadlocking contracts.** A03 said every wax holder kept it for their own contract (#426), A01 said the same (#439), and A02's contract failed because A03 refused all wax offers (#1916), so the contract mechanic became unsolvable rather than a negotiation. (#426, #439, #1051, #1916)
5. **Residents' private reasoning was inconsistent with the recorded state.** Lines like #603 and #1257 reference round 2 while the run is in round 6 and round 12 respectively, indicating the model's context drifted from the actual game state throughout the run. (#603, #1257)

## Optimizations

- **Add a clear submission/level action to the loop so residents can actually attempt levels.** With 0 submissions across 24 minutes (#2551), the harness should prompt or require a submission attempt each round, or the level mechanic is untested. (#2551)
- **Surface trade results explicitly to prevent direction errors.** A04 misread O25's direction (#2118) and A02 did the same at #664; the harness should emit an explicit 'you gave X, you received Y' receipt after each execution. (#664, #2118)
- **Reduce offer-slot errors by auto-withdrawing closed offers.** TOO_MANY_OFFERS fired three times (#896, #2222, #2223) and OFFER_CLOSED four times (#51, #417, #199, #2105); expired offers should be cleared automatically. (#51, #199, #417, #896, #2105, #2222, #2223)
- **Tune wax supply or contract requirements so the contract is achievable.** Every resident ended short on wax or hoarded it (#426, #439, #580, #1916); increasing wax supply or lowering the wax requirement would keep negotiation alive. (#426, #439, #580, #1916)
- **Give residents a periodic restatement of current round and holdings.** Drifting reasoning at #603 and #1257 shows the model losing track of the round; a compact state header each turn would anchor it. (#603, #1257)

## Loophole candidates

1. **Residents pivoted to pure point-scoring once contracts became unreachable.** (residents) A01 sold its contract wax for salt/cloth/copper (#1827) and A03 declared the contract dead and played for points (#1093, #1123), using the scoring rules as an escape from the contract objective. (#1093, #1123, #1239, #1827)

## Log issues

- line 1: event "market_game_started" (seq 1) does not match its schema
- line 2: event "market_round_started" (seq 2) does not match its schema
- line 16: event "market_offer_made" (seq 16) does not match its schema
- line 18: event "market_offer_made" (seq 18) does not match its schema
- line 20: event "market_offer_made" (seq 20) does not match its schema
- line 28: event "market_trade" (seq 28) does not match its schema
- line 29: event "market_offer_closed" (seq 29) does not match its schema
- line 31: event "market_offer_made" (seq 31) does not match its schema
- line 39: event "market_trade" (seq 39) does not match its schema
- line 40: event "market_offer_closed" (seq 40) does not match its schema
- line 42: event "market_trade" (seq 42) does not match its schema
- line 43: event "market_offer_closed" (seq 43) does not match its schema
- line 65: event "market_said" (seq 65) does not match its schema
- line 72: event "market_offer_made" (seq 72) does not match its schema
- line 80: event "market_offer_made" (seq 80) does not match its schema
- line 82: event "market_offer_closed" (seq 82) does not match its schema
- line 92: event "market_offer_closed" (seq 92) does not match its schema
- line 95: event "market_offer_made" (seq 95) does not match its schema
- line 102: event "market_trade" (seq 102) does not match its schema
- line 103: event "market_offer_closed" (seq 103) does not match its schema
- and 488 more
