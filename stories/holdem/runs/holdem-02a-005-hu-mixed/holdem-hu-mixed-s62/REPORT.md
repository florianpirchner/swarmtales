# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `holdem-hu-mixed` |
| Seed | 62 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 15 (referee) |
| Counted | events #2 to #1302 (951 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 15 minutes (to the end); A02 on level 1 from minute 0 for 15 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.038 USD for this run (competitors 0.038, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 16 of 16 minutes without a submission; longest without one: minutes 0-15 (16) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent the whole 15 minutes stuck on level 1 with zero submissions.** A01 and A02 never left level 1 and no submission was ever counted; the two players only played poker hands against each other until the referee ended the run at minute 15 (#1302). (#1302)
- **A02 won the first session of hands by exploiting A01's loose calling.** A02 took several pots, including a showdown with two pair sevens and threes (#176) and three jacks lost by A02 to A01 (#321), and reported ending game 1 at +9 points with A01 at -9 (#909, #914). (#176, #321, #909, #914)
- **A01 tried to save a revised brain after the first session and was refused for length.** A01 wrote up A02's tendencies (#889) but its writeBrain call was rejected with BRAIN_TOO_LONG at 161 words against a 150-word limit (#892). (#889, #892)
- **A02 hit a tool lock while trying to act mid-hand.** A02 tried to act on its jack-king raise (#986) and got TOOL_LOCKED, saying the tool was not available at this level or phase (#1015). (#986, #1015)
- **Residents used the notes from game 1 to change play in game 2.** A01 cited its notes that A02 bets small with weak hands to justify a call (#1143), and A02 folded weak hands like 74o and T2o on discipline after being burned earlier (#1239, #1280). (#1143, #1239, #1280)

## Problems

1. **No submission was ever made, so the run never advanced a level.** The facts show 0 correct and 0 wrong submissions with both residents stuck on level 1 the whole run; the residents only played poker hands from #53 to #1280 and never engaged the level's actual task (#53, #1280). (#53, #1280)
2. **The brain write path is blocked by a tight word cap, so learning could not persist cleanly.** A01's retro brain write was refused with BRAIN_TOO_LONG at 161 words against 150 (#892), and A01 had also hit a locked writeBrain earlier and simply waited (#26, #34), so strategy notes had nowhere reliable to go. (#26, #34, #892)
3. **A02 lost a turn to TOOL_LOCKED mid-decision.** A02's act call while holding jack-king was refused as unavailable at this level or phase (#1015), which is a harness/tool-visibility problem rather than a player mistake (#986). (#986, #1015)
4. **Residents misread whose turn it was and burned turns on table-bookkeeping.** A02 repeatedly stopped to reason about seat order and turn order instead of acting (#114, #685, #1120, #1186), and A01 reasoned about retro windows mid-hand (#309), which consumed turns without play. (#114, #309, #685, #1120, #1186)
5. **The intended story is unknown, so the loop had no gamemaker drive.** No beats were found, the gamemaker took no actions, and the run has no story definition (000-run.json has no story); with no gamemaker input the residents just played hands to the minute-15 referee end (#1302). (#1302)

## Optimizations

- **Make the level's actual task explicit and required before poker play.** Because 0 submissions occurred and both residents stayed on level 1 all run (#53, #1280), the harness should present the submission target up front and gate or time-limit poker hands until a submission is attempted. (#53, #1280)
- **Raise or auto-trim the brain word limit.** The writeBrain refusal at 161 words versus a 150 limit (#892) cost A01 its only chance to persist strategy; either raise the cap or have the tool summarize/trim and accept the write. (#892)
- **Expose the active tool set to residents and stop wasting turns on locked tools.** A02's TOOL_LOCKED refusal (#1015) came right after it decided to raise (#986); the harness should list active tools each turn or auto-advance instead of rejecting the decision. (#986, #1015)
- **Give residents an authoritative turn/seat-order display.** A02 spent several turns guessing whether the flop was out or whose turn it was (#1120, #1186), and A01 reasoned about retro windows mid-hand (#309); a machine-readable turn indicator would remove that overhead. (#309, #1120, #1186)
- **Supply the story to the gamemaker so it can create beats.** The digest found no beats and the gamemaker took no actions, with the referee ending the run at minute 15 (#1302); without a story definition the gamemaker has nothing to push the residents toward. (#1302)

## Loophole candidates

1. **Residents treated the poker table as the whole game and never attempted a submission.** (residents) From #53 to #1280 both residents played hand after hand without ever making a counted submission (#53, #1280); playing the poker match substituted for the level's intended challenge. (#53, #1280)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 20: event "brain_written" (seq 20) does not match its schema
- line 21: event "retro_closed" (seq 21) does not match its schema
- line 43: event "game_started" (seq 43) does not match its schema
- line 44: event "hand_started" (seq 44) does not match its schema
- line 45: event "cards_dealt" (seq 45) does not match its schema
- line 46: event "action_taken" (seq 46) does not match its schema
- line 47: event "action_taken" (seq 47) does not match its schema
- line 56: event "decision_scored" (seq 56) does not match its schema
- line 57: event "action_taken" (seq 57) does not match its schema
- line 58: event "hand_ended" (seq 58) does not match its schema
- line 59: event "hand_started" (seq 59) does not match its schema
- line 60: event "cards_dealt" (seq 60) does not match its schema
- line 61: event "action_taken" (seq 61) does not match its schema
- line 62: event "action_taken" (seq 62) does not match its schema
- line 75: event "decision_scored" (seq 75) does not match its schema
- line 76: event "action_taken" (seq 76) does not match its schema
- line 89: event "decision_scored" (seq 89) does not match its schema
- line 90: event "action_taken" (seq 90) does not match its schema
- line 91: event "board_dealt" (seq 91) does not match its schema
- and 331 more
