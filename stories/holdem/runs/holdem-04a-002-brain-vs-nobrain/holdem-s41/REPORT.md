# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 50 (referee) |
| Counted | events #5 to #6780 (5600 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 50 minutes (to the end); A02 on level 1 from minute 0 for 50 minutes (to the end); A03 on level 1 from minute 0 for 50 minutes (to the end); A04 on level 1 from minute 0 for 50 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.283 USD for this run (competitors 0.283, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0061 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 51 of 51 minutes without a submission; longest without one: minutes 0-50 (51) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 55, BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents sat on level 1 for the whole run without a single submission.** The computed facts show A01-A04 stuck on level 1 from minute 0 to minute 50 with 0 submissions and 0 correct answers. The run ended at minute 50 by referee while the table was still mid-hand (#6780). (#6780)
- **The residents treated the closed table as a long poker session and read hands competently.** From minute 1 onward residents reasoned through pot odds, draws and betting lines hand after hand (#142, #237, #650, #2095). This produced plenty of private reasoning but no progress toward the level. (#142, #237, #650, #2095)
- **Act was repeatedly locked exactly when a resident's turn came.** A03 was refused act at #491, #728, #933 and elsewhere; A01 at #904, #1173, #2324; A02 at #734, #1009, #2683; A04 at #1314, #2518, #2725. The lock recurred even after residents had already acted in the hand, so turns were lost. (#491, #728, #933, #1173, #2518)
- **Residents rewrote their brains between games and adjusted strategy.** After game 1 A02 and A04 saved version-2 brains (#1919, #1905), and by game 3 A01 recorded standings A01 +3, A02 +68, A03 -72, A04 +1 (#5106). They used the retro window to tighten preflop folds and treat A02 as the danger (#3686, #5106). (#1905, #1919, #3686, #5106)
- **The residents' battle was purely verbal: zero messages, transfers or board posts.** The facts show 0 DMs, 0 board posts, 0 group posts and 0 transfers for the whole run. All coordination happened as self-talk and private reasoning (#96, #3319, #5106). (#96, #3319, #5106)

## Problems

1. **The act tool was locked through nearly every turn, so the game could not be played normally.** TOOL_LOCKED fired 55 times, often on the exact turn a resident recognized (#728, #1173, #2518), and residents learned to retry (#1335) or give up and wait (#2441). This is the main reason no level was solved. (#491, #728, #1173, #1335, #2518)
2. **Residents could not write their brains because of the 150-word limit.** Game 1 (#1875) and game 2 (#3642, #3647) ended with BRAIN_TOO_LONG refusals, wasting retro windows that are the only time writeBrain is open. (#1875, #3642, #3647)
3. **Residents repeatedly miscounted whose turn it was and passed on hands.** A04 waited while others acted (#1368, #1421) and A02 kept ending turns because it believed it had already folded or that it was not its turn (#710, #2844, #6278). This produced many empty turns instead of decisions. (#710, #1368, #1421, #2844)
4. **Residents misread the schedule, assuming they had to play many hands before the level ended.** A03 called hand 8 'the last one in game 2' and A04 counted 'game 3' with 'hands 6 to 8 still to come' (#3539, #6279, #6693). They therefore talked about a poker match while the actual level objective was never attempted. (#3539, #6279, #6693)

## Optimizations

- **Keep act unlocked on a resident's own turn.** Make the harness open act for the acting seat and only lock it between turns; the repeated refusals at #728, #1173 and #2518 cost real turns. Retry logic like #1335 should not be needed. (#728, #1173, #1335, #2518)
- **Raise the brain word limit or trim in code.** Set the brain limit above what residents write (162-170 words seen at #1875 and #3642) or truncate automatically so no retro window is lost. (#1875, #3642, #3647)
- **Show the current turn owner in every prompt.** Residents wasted turns guessing the acting order (#1368, #1421, #2441); a single always-present 'your turn' field would remove the waiting loops. (#1368, #1421, #2441)
- **Make the level objective explicit and time-boxed.** Residents behaved as if the task were an endless poker match (#3539, #6279); state the 50-minute limit and the level goal so they attempt it instead of playing hand after hand. (#3539, #6279, #6693)
- **Do not let the level depend on a broken tool.** With 0 submissions and 55 TOOL_LOCKED errors (#491, #2518), the harness should count a lost-turn lock as a stall warning and either skip or re-open the seat. (#491, #2518)

## Loophole candidates

None found.

## Dropped from the model's answer

- Loophole candidates: missing from the answer

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 51: event "brain_written" (seq 51) does not match its schema
- line 52: event "retro_closed" (seq 52) does not match its schema
- line 58: event "brain_written" (seq 58) does not match its schema
- line 59: event "retro_closed" (seq 59) does not match its schema
- line 65: event "brain_written" (seq 65) does not match its schema
- line 66: event "retro_closed" (seq 66) does not match its schema
- line 120: event "game_started" (seq 120) does not match its schema
- line 121: event "hand_started" (seq 121) does not match its schema
- line 122: event "cards_dealt" (seq 122) does not match its schema
- line 123: event "action_taken" (seq 123) does not match its schema
- line 124: event "action_taken" (seq 124) does not match its schema
- line 135: event "decision_scored" (seq 135) does not match its schema
- line 136: event "action_taken" (seq 136) does not match its schema
- line 145: event "decision_scored" (seq 145) does not match its schema
- and 1160 more
