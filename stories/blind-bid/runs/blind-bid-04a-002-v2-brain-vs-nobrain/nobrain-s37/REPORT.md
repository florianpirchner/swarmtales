# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `blind-bid-nobrain-s37` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #4 to #838 (681 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.029 USD for this run (competitors 0.029, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 8 of 8 minutes without a submission; longest without one: minutes 0-7 (8) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OVER_PURSE 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Residents spent minute 0 cycling through four different auction formats without ever bidding** In the opening minute the residents reasoned through first-price (#19, #26, #33), third-price (#50, #64), shared-value (#74, #88) and everyone-pays (#105, #126) rules in a handful of seconds each, but no submission resulted and the log shows 0 correct and 0 wrong bids for the whole run. (#19, #43, #64, #88, #126)
- **A02 and A03 both tried to bid more coins than they held** A02 was refused at minute 2 for bidding above its 44 remaining coins (#329), and A03 was refused at minute 3 for bidding above its 21 remaining coins (#451). A03 then corrected itself in a later reasoning line, cutting 25 down to 20 (#469). (#329, #451, #469)
- **All four residents converged on truthful bidding in second-price and third-price lots** Starting around minute 1, A02 (#137), A03 (#144), A01 (#151) and A04 (#158) each reasoned that bidding true value is dominant under a runner-up-pays rule, and the same conclusion reappears for third-price lots at #484, #491 and #622. (#137, #144, #151, #158, #484, #491)
- **Residents discussed earlier lots' outcomes as if the games had been played** From minute 4 the residents narrated results of finished lots that the run's own metrics record as zero: A02 says game 2 ended with 43 points (#557), A04 says it ended at 22 (#561), A01 reports 45.75 (#577) and A03 lists per-bidder scores (#581). (#557, #561, #577, #581)
- **Everyone-pays lots repeatedly drove residents to pass rather than bid** A01 passed on everyone-pays lots at #249 and #698, A02 at #396 and #514, A03 at #546, and A04 closed the run by finding every candidate bid negative and passing (#829). (#249, #396, #546, #698, #829)

## Problems

1. **No bid was ever submitted, so the story never started** The run shows 0 correct and 0 wrong submissions and 8 quiet minutes across minutes 0-7, with the first real action being the referee's end at #838. Residents produced dozens of private reasoning lines but no city-recorded bid except the two refused ones. (#329, #451, #838)
2. **Residents burned the entire clock on private deliberation** Minutes 0-3 are almost entirely REASONING lines (#12 through #505), with no board posts and no DMs, and the run ended in minute 7. The pacing left no room to observe outcomes and adapt. (#12, #199, #309, #505)
3. **Budget errors show residents misread the coin limit** A02 bid above its 44 remaining coins (#329) and A03 bid above its 21 remaining coins (#451), producing the only two tool errors of the run, both OVER_PURSE. A03's own correction at #469 shows it knew the limit but had not applied it. (#329, #451, #469)
4. **The everyone-pays format turned the risk of losing into a reason not to act** Residents reasoned that any bid costs coins whether they win or not, and so passed: A01 at #249, A02 at #396, A03 at #546, A04 at #829. Because leftover coins convert at 0.25 each (stated at #26 and #822), bidding became strictly worse in their analysis. (#249, #396, #546, #822, #829)
5. **Residents hallucinated past lot results that the city never recorded** A02, A04, A01 and A03 all recounted final scores and won lots (#557, #561, #577, #581), but the computed facts record 0 transfers, 0 correct submissions and unknown standings. The residents' private summaries contradict the city record and could mislead later decisions. (#557, #561, #577, #581)

## Optimizations

- **Force a submission before the end of each minute** The run ended with no bids; make the harness reject a minute with no city-recorded bid, or give residents a hard deadline. Problem: 0 submissions across minutes 0-7 (#838). (#838)
- **Show the coin limit inside every bid prompt and validate before the tool call** Two OVER_PURSE refusals cost A02 and A03 a turn each (#329, #451). Put the remaining balance in the prompt and make the tool pre-check the amount so a refused bid does not consume a minute. (#329, #451)
- **Cut the number of lot formats per run** Residents reasoned through four auction formats in the first minute alone (#43, #64, #88, #126), each with a different optimal strategy. Reusing one or two formats per run would let them build a bidding heuristic instead of re-deriving it every lot. (#43, #64, #88, #126)
- **Drop or reprice the everyone-pays lot** All four residents concluded that any bid in an everyone-pays lot loses points and passed (#249, #396, #546, #829). Either remove the format or reduce the 0.25 coin conversion so that winning has value. (#249, #396, #546, #829)
- **Keep residents from seeing or inventing final results they did not live** The residents narrated game-2 scores (#557, #561, #577, #581) that the city never recorded. The harness should either feed real results or strip private summaries that reference results, so the story cannot drift from the log. (#557, #581)

## Loophole candidates

1. **Residents could count on never being forced to bid** (residents) With no submission enforced, passing was a legal and cost-free move on every lot, and all four residents took it in several formats (#249, #396, #546, #829), turning the auction into a non-event. (#249, #396, #546, #829)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "lots_dealt" (seq 2) does not match its schema
- line 3: event "lot_opened" (seq 3) does not match its schema
- line 15: event "bid_placed" (seq 15) does not match its schema
- line 22: event "bid_placed" (seq 22) does not match its schema
- line 29: event "bid_placed" (seq 29) does not match its schema
- line 36: event "bid_placed" (seq 36) does not match its schema
- line 37: event "lot_resolved" (seq 37) does not match its schema
- line 38: event "lot_opened" (seq 38) does not match its schema
- line 46: event "bid_placed" (seq 46) does not match its schema
- line 53: event "bid_placed" (seq 53) does not match its schema
- line 60: event "bid_placed" (seq 60) does not match its schema
- line 67: event "bid_placed" (seq 67) does not match its schema
- line 68: event "lot_resolved" (seq 68) does not match its schema
- line 69: event "lot_opened" (seq 69) does not match its schema
- line 77: event "bid_placed" (seq 77) does not match its schema
- line 84: event "bid_placed" (seq 84) does not match its schema
- line 91: event "bid_placed" (seq 91) does not match its schema
- line 98: event "bid_placed" (seq 98) does not match its schema
- line 99: event "lot_resolved" (seq 99) does not match its schema
- and 137 more
