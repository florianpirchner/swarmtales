# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab-nobrain` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #3 to #609 (491 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.313 USD for this run (competitors 0.313, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 8 of 8 minutes without a submission; longest without one: minutes 0-7 (8) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Block 1 was a uniform 5-5 split every round** A01, A02, A03 and A04 all offered and accepted even 5-5 splits in the ultimatum block; #60, #64 and #68 show the round-1 and round-2 splits, and #127 and #233 confirm the pattern continued through rounds 4-6. No resident ever made a skewed offer, so no responder ever had to decide about rejecting. (#60, #64, #68, #127, #233)
- **Everyone contributed the full 10 tokens in the public goods game** In the public goods block all four residents put in all 10 tokens every round from round 1 to round 7; #447, #452, #457 and #462 all report full contributions and 16 points per round (96 by round 6). Each resident cites the others' full cooperation as the reason to keep contributing (#258, #265, #272). (#258, #265, #272, #447, #452, #457, #462)
- **All four chose cooperation in the prisoner's dilemma block** At minute 5 each resident reasoned that earlier rounds had been full cooperation and chose A (cooperate): #470 (A03), #477 (A02), #484 (A01) and #491 (A04). This shows the trust built in the first two blocks carried over into the third. (#470, #477, #484, #491)
- **Residents spent most turns with nothing to decide** A01 (#59), A03 (#87), A04 (#446) and A03 again (#461) all ended turns because no decision was open, only viewTable. Each block's sealed-offer waiting period produced idle turns rather than negotiation. (#59, #87, #446, #461)
- **No points were scored in the city's own ledger despite in-game point talk** Residents report accumulating 15, 25, 96 and more points in their private thoughts (#115, #171, #447), but the computed facts record no levels solved, no submissions and no final standings. The game events counted in the ledger did not translate into city progress. (#115, #171, #447)

## Problems

1. **Zero submissions all run; no resident ever attempted a level** The facts show 0 correct and 0 wrong submissions with all eight minutes quiet, and the referee ended the run at minute 7 (#609). The residents spent the run inside the game sub-economy rather than solving the city's levels. (#609)
2. **Residents treated the game as the whole task** Every reasoning and self-talk line is about ultimatums, public goods and prisoner's dilemmas (#12, #251, #470); nobody mentions the city, levels or a submission. The story harness apparently gave them the game but no prompt to pursue city progress. (#12, #251, #470)
3. **The ultimatum block collapsed into a single safe convention** From round 1 onward every offer was a 5-5 split, so no resident faced a real trade-off and no rejection ever happened (#60, #127, #233). The block produced no differentiation between residents. (#60, #127, #233)
4. **Long idle phases with only viewTable available** Residents repeatedly ended turns because their only open action was viewing the table (#59, #87, #446, #461). This burned 491 events across 8 minutes without any decision being made. (#59, #87, #446, #461)
5. **No communication channel used despite messages being available** The facts record 0 DMs, 0 board posts and 0 group posts, even though residents were reasoning about reputation (#12 mentions protecting reputation). No resident ever coordinated or signalled across the table. (#12)

## Optimizations

- **Add an explicit city-progress goal to the residents' brief** Because nobody made a submission and the referee ended the run at minute 7 (#609), the next version should state that the economic game is a side activity and that residents must solve levels to advance. Give each resident a first-turn instruction naming the level and the submission tool. (#609)
- **Introduce payoff asymmetry into the ultimatum block** All offers were 5-5 and all were accepted (#60, #127, #233), which removed the intended tension. Randomise endowments or make the split unequal by design so responders face real accept/reject decisions. (#60, #127, #233)
- **Remove or shorten sealed-offer idle phases** Residents wasted turns waiting with only viewTable open (#59, #87, #446, #461). Resolve offers immediately when both sides are sealed, or give residents a second usable action during the wait. (#59, #87, #446, #461)
- **Force or reward cross-resident communication** Zero messages were sent despite residents reasoning about reputation (#12). The next version should make a DM or board post a required first action per block, or tie a bonus to communication so the social layer is actually exercised. (#12)
- **Vary the public goods and prisoner's dilemma incentives** Full contribution every round (#447, #452, #457, #462) and unanimous cooperation (#470, #477, #484, #491) made both blocks trivial. Add a known last round or a scoring bonus for a lone defector so the trust dynamic is tested rather than assumed. (#447, #452, #457, #462, #470, #477, #484, #491)

## Loophole candidates

1. **Reciprocal full cooperation made every game risk-free** (residents) All four residents chose the same safe action in each block — 5-5 split (#60), contribute 10 (#447), cooperate A (#484) — and cited the others' past cooperation as justification (#265, #272). This mutual back-scratching path earns steady points without any strategic choice or risk. (#60, #265, #272, #447, #484)
2. **Residents played the sub-game instead of the city's game** (residents) From the first reasoning line (#12) onward, every resident treated the ultimatum game as the task and never attempted a level submission. The game harness offered a cheaper scoring path than solving levels, and they took it. (#12, #251, #609)

## Log issues

- line 1: event "block_started" (seq 1) does not match its schema
- line 2: event "round_opened" (seq 2) does not match its schema
- line 15: event "decision_made" (seq 15) does not match its schema
- line 21: event "decision_made" (seq 21) does not match its schema
- line 27: event "decision_made" (seq 27) does not match its schema
- line 34: event "decision_made" (seq 34) does not match its schema
- line 35: event "round_resolved" (seq 35) does not match its schema
- line 36: event "round_opened" (seq 36) does not match its schema
- line 42: event "decision_made" (seq 42) does not match its schema
- line 48: event "decision_made" (seq 48) does not match its schema
- line 54: event "decision_made" (seq 54) does not match its schema
- line 74: event "decision_made" (seq 74) does not match its schema
- line 75: event "round_resolved" (seq 75) does not match its schema
- line 76: event "round_opened" (seq 76) does not match its schema
- line 83: event "decision_made" (seq 83) does not match its schema
- line 95: event "decision_made" (seq 95) does not match its schema
- line 103: event "decision_made" (seq 103) does not match its schema
- line 109: event "decision_made" (seq 109) does not match its schema
- line 110: event "round_resolved" (seq 110) does not match its schema
- line 111: event "round_opened" (seq 111) does not match its schema
- and 98 more
