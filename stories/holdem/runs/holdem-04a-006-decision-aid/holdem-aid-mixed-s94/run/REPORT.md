# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 94 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 41 (referee) |
| Counted | events #6 to #4864 (3898 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 41 minutes (to the end); A02 on level 1 from minute 0 for 41 minutes (to the end); A03 on level 1 from minute 0 for 41 minutes (to the end); A04 on level 1 from minute 0 for 41 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.129 USD for this run (competitors 0.129, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 42 of 42 minutes without a submission; longest without one: minutes 0-41 (42) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No resident ever submitted a solve on level 1 in 41 minutes.** All four residents spent the whole run on level 1 and the city recorded 0 correct and 0 wrong submissions. The only recorded referee events involving residents are refusals, not plays (#1752, #3991, #4832). (#1752, #3991, #4832)
- **A01 and A04 repeatedly folded while thinking they had already folded a hand they were still in.** A01 says it folded on the turn (#175), then again describes the same board later in the hand (#201, #2689), and A04 folds at #197 then reasons about the same hand at #2323. Residents are tracking hand state from memory rather than from the table. (#175, #197, #201, #2323)
- **A01 called itself already folded and ended turns without acting.** At #1514 and #1515 A01 refuses to act because it believes it folded, and #2634 and #4788 show the same pattern of ending turns while waiting on others. (#1514, #1515, #2634, #4788)
- **Tool lock-outs hit three different residents mid-hand.** A04 (#1752), A02 (#3991) and A01 (#4832) each tried an action the referee refused as TOOL_LOCKED during a live hand. Each refusal happened at a different point, so no resident learned the rule from another's mistake. (#1752, #3991, #4832)
- **A04's hole-card reading drifted from the board it was dealt.** A04 first reasons about 7-high with the Ten (#15) and later about the same 4s 9c 2c board as a club flush draw needing one more (#99, #1520). Later it holds 5-4 but describes the board as K-9-8-3 (#1698). (#15, #99, #1520, #1698)
- **Mutual 'not my turn' loops consumed many minutes.** Residents repeatedly end turns saying another seat must act, e.g. #90-91, #95, #140-141, #2216-2217, #4391-4392, #4756, #4788. Several hands stall in these wait loops with no submission. (#90, #91, #95, #140, #141, #2216, #2217, #4391, #4392)

## Problems

1. **Nobody solved the level, so the story produced no competitive progress.** The facts show 0 levels solved and 0 submissions, with all four residents stuck on level 1 for 41 minutes (e.g. #4864, #15-#2689 reasoning only). The story's core contest never started. (#4864)
2. **Residents misread whose turn it was and burned turns waiting.** Examples: A01 ends its turn because 'A04 is to act' while A04 also says it's not its turn (#90-91, #321-322, #2216-2217). These loops repeatedly stalled action and consumed minutes without a submission. (#90, #91, #321, #322, #2216, #2217)
3. **Residents lost track of hand state after folding.** A04 says it folded the hand (#197) and later reasons about the same hand's turn (#2323); A04 also reasons on a board 3-7-8-9-T-A while describing holding 5-4 (#1698). This suggests the referee messages are not giving clean state. (#197, #1698, #2323)
4. **TOOL_LOCKED refusals interrupted live decisions.** Three attempts to act were refused as unavailable tools (#1752, #3991, #4832), each at a different moment and seat. Residents then had to reason again about what to do, adding delay. (#1752, #3991, #4832)
5. **No messages, no transfers, no gamemaker actions: the social layer never used.** The facts record 0 DMs, 0 board posts, 0 group posts and 0 transfers, and 'no actions' from the gamemaker. Residents only spoke 'to itself' (e.g. #91, #95, #249). (#91, #95, #249)

## Optimizations

- **Give each resident an explicit, authoritative turn marker in every message.** Make the referee message always state the active seat and the exact options, since residents repeatedly ended turns for the wrong reason (#90-91, #2216-2217, #4391-4392). This directly addresses the mutual 'not my turn' loops. (#90, #91, #2216, #2217, #4391, #4392)
- **Send a compact verified hand/board state each turn so residents stop reconstructing it.** Residents folded but kept reasoning about the hand (#197 vs #2323) and misremembered hole cards (#15 vs #1520, #1698). A state line (hole cards, board, pot, who acted) per turn would remove the guesswork. (#15, #197, #1520, #1698, #2323)
- **Expose the allowed tool set up front instead of refusing mid-action.** TOOL_LOCKED refusals hit A04, A02 and A01 during live hands (#1752, #3991, #4832). Listing active tools in every message would prevent the wasted attempts and re-reasoning. (#1752, #3991, #4832)
- **Make a social or transfer objective visible to push the message layer** The facts show 0 DMs, 0 posts and 0 transfers, so the intended social mechanic never ran. Requiring at least one board post or DM to advance a level, or rewarding it, would force use of the message tools. (#91, #95, #249)
- **Break the no-submission stall with a per-level timer or hint.** All residents sat at level 1 for 41 minutes with 0 submissions (#4864). A hint or forced progress after a few minutes would keep the contest alive. (#4864)

## Loophole candidates

1. **Residents used 'not my turn' replies to skip acting.** (residents) Several residents ended turns without acting by naming another seat as the actor (#90-91, #141, #4788), a cheap way to avoid a decision inside the hand. (#90, #91, #141, #4788)
2. **Residents declared a fold and then kept acting as if still in the hand** (residents) A04 folds (#197) but continues to reason about the turn (#2323), suggesting folded seats can still get spending turns, which is against the intent of a fold. (#197, #2323)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 18: event "decision_scored" (seq 18) does not match its schema
- line 19: event "action_taken" (seq 19) does not match its schema
- line 29: event "decision_scored" (seq 29) does not match its schema
- line 30: event "action_taken" (seq 30) does not match its schema
- line 37: event "decision_scored" (seq 37) does not match its schema
- line 38: event "action_taken" (seq 38) does not match its schema
- line 50: event "decision_scored" (seq 50) does not match its schema
- line 51: event "action_taken" (seq 51) does not match its schema
- line 68: event "decision_scored" (seq 68) does not match its schema
- line 69: event "action_taken" (seq 69) does not match its schema
- line 70: event "board_dealt" (seq 70) does not match its schema
- line 76: event "decision_scored" (seq 76) does not match its schema
- line 77: event "action_taken" (seq 77) does not match its schema
- line 85: event "decision_scored" (seq 85) does not match its schema
- line 86: event "action_taken" (seq 86) does not match its schema
- and 946 more
