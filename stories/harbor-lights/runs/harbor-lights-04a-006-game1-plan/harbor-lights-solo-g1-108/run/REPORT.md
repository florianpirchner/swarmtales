# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 108 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #777 (682 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.047 USD for this run (competitors 0.047, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1, NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent minute 0 waiting for a game that never opened on their side.** A01, A02, A03 and A04 all read the brain, wrote a first strategy version, then repeatedly reported that the first game had not started (#92, #98, #102, #114, #118). No submissions followed for the whole run. (#92, #98, #102, #114, #118)
- **A03 was refused a brain write for exceeding the word limit.** At minute 0 A03's writeBrain was refused with BRAIN_TOO_LONG because the brain had 163 words against a limit of 150 (#42). A03 later reported saving version 1 at 127 words (#118), so the retry succeeded. (#42, #118)
- **The residents played a cooperative card game (towers, hints, signals) instead of a competitive seat race.** Residents discussed lit and lost piles, hint tokens and playable ranks for colors such as Moss, Rose, Amber, Cobalt and Violet (#143, #152, #188, #288). They shared information openly rather than competing for seats. (#143, #152, #188, #288)
- **A01 tried to signal out of turn and was refused.** At minute 3 A01's giveSignal was refused with NOT_YOUR_TURN because it was A04's turn (#505). This is the only recorded turn-order enforcement in the run. (#505)
- **A04 discarded a playable Amber 2 by mistake and flagged it.** A04 discarded slot 1 at minute 2, which was Amber 2, a card that was playable, and called it a mistake caused by having no information about its hand (#334, #335). (#334, #335)
- **The run ended at minute 5 with no submission and no correct or wrong answer.** The referee ended the run at minute 5 (#777). The computed facts record 0 submissions, 0 messages, 0 transfers and no level solved across all four residents. (#777)

## Problems

1. **No resident ever submitted anything.** The run had 0 correct and 0 wrong submissions and no level solved; all four residents stayed at level 1. Every minute from 0 to 5 passed without a submission (quiet minutes 6 of 6). (#92, #118, #777)
2. **Residents believed the game had not started and idled on status checks.** A01 repeatedly said the first game hadn't started and that it would check the towers again later (#92, #114), and A04 said the same (#98). This misunderstanding consumed the opening minutes without any play. (#92, #98, #114)
3. **A tool error blocked a brain write for being too long.** A03's writeBrain was refused with BRAIN_TOO_LONG at 163 words against a 150-word limit (#42), showing the limit was not signalled before the write. (#42)
4. **An out-of-turn tool call was refused.** A01 attempted giveSignal while it was A04's turn and got NOT_YOUR_TURN (#505), indicating turn order was not clear to the resident before acting. (#505)
5. **The residents played a cooperative card game that does not match a competitive seat-race story.** Residents coordinated hints and safe plays for a shared lit pile (#160, #219, #452, #606) rather than competing. The run's design intent (a few seats, competition) is not reflected in any action. (#160, #219, #452, #606)

## Optimizations

- **Signal clearly when the game is open and what the first required action is.** Residents spent minute 0 reporting the game had not started (#92, #98, #114). Add an explicit start event and a required first action so residents do not idle on status checks. (#92, #98, #114)
- **Warn about the brain word limit before the write.** A03's writeBrain was refused at 163 words against a 150 limit (#42). Show the remaining word budget in the tool schema or reject with the count before submission. (#42)
- **Make turn order visible before any tool call.** A01's giveSignal was refused with NOT_YOUR_TURN (#505). Include the current turn holder in every prompt so residents do not attempt out-of-turn actions. (#505)
- **Align the played game with the story's competitive seat race.** Residents played a cooperative tower-building game with shared hints (#143, #152, #606). Either change the story to match the cooperative game or change the rules to force competition for seats. (#143, #152, #606)
- **Add a deadline pressure so residents must submit, not only reason.** The run ended at minute 5 with 0 submissions (#777) despite continuous reasoning. Add a per-minute submission requirement or scoring that rewards acting over discussing. (#777)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 136: event "cards_dealt" (seq 136) does not match its schema
- line 137: event "game_started" (seq 137) does not match its schema
- line 138: event "deal_revealed" (seq 138) does not match its schema
- line 146: event "signal_given" (seq 146) does not match its schema
- line 155: event "signal_given" (seq 155) does not match its schema
- line 172: event "card_played" (seq 172) does not match its schema
- line 173: event "card_drawn" (seq 173) does not match its schema
- line 183: event "card_played" (seq 183) does not match its schema
- and 75 more
