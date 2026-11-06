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
| End | minute 49 (referee) |
| Counted | events #5 to #6762 (5606 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 49 minutes (to the end); A02 on level 1 from minute 0 for 49 minutes (to the end); A03 on level 1 from minute 0 for 49 minutes (to the end); A04 on level 1 from minute 0 for 49 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.300 USD for this run (competitors 0.300, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0064 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 50 of 50 minutes without a submission; longest without one: minutes 0-49 (50) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 53, BRAIN_TOO_LONG 8 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent the whole run stuck on level 1 with zero submissions.** A01, A02, A03 and A04 never solved a level and never submitted; the referee ended the run at minute 49 with the standings unknown and 0 correct and 0 wrong submissions. (#1790, #1822, #1831)
- **The residents played poker hands for three full games but the level never advanced.** The log shows complete hands being dealt and resolved (hand 1 won by A01, hand 2 by A04, and so on through game 3), yet every resident stayed on level 1 to the end, so the poker play never counted toward a level-up. (#1790, #1822, #1831, #5057)
- **Game 1 scoring was clear and the residents updated their brains between games.** After game 1 the residents reported scores of A04 +65, A01 +12, A03 -31 and A02 -46, and they revised their strategy brains in the retro window (versions 2 and later 4), so the between-game loop worked even though levels did not. (#1790, #1822, #1831, #5057)
- **Brain writes were repeatedly refused for exceeding 150 words.** Several residents tried to save revised brains and were refused with BRAIN_TOO_LONG at 152, 163, 158, 171, 156 and 151 words, so their lessons were lost or had to be trimmed, and some later writeBrain calls were refused as TOOL_LOCKED. (#1782, #1787, #3460, #3465, #4988, #5015, #5025)
- **TOOL_LOCKED dominated the run and blocked many intended actions.** There were 53 TOOL_LOCKED refusals, often when a resident tried to act on its own turn or a valid-looking decision, so residents spent many steps waiting or re-checking the table instead of playing. (#314, #376, #495, #730, #2688, #3712, #5681)
- **Residents repeatedly misread their seat and hand, burning steps on self-correction.** Residents questioned whether they were A01/A04, which blind they posted, and whether a board pair was their own hand, e.g. A01 checking whether a "pair of fours" was its hand and A04 confusing its seat, which cost steps and led to wrong-looking folds and calls. (#1273, #2804, #3299, #4126, #6445, #6657)

## Problems

1. **No level was ever solved, so the story's progression mechanic never engaged.** All four residents stayed on level 1 for all 49 minutes with 0 submissions, so the run produced poker hands but no level progress; either the win condition was unreachable or the residents never understood what a submission required. (#1790, #1822, #1831)
2. **TOOL_LOCKED fired constantly and often on the resident's own turn.** 53 TOOL_LOCKED refusals include cases where the resident believed it was acting (A02 at #730, A03 at #314, A01 at #5681), so the act gating did not match the turn state the residents saw. (#314, #376, #730, #5681)
3. **The 150-word brain limit is too tight for the lessons residents try to record.** Six BRAIN_TOO_LONG refusals at 151-171 words show the brain format is barely above the natural length of a useful strategy note, so improvements between games were blocked. (#1782, #1787, #3460, #3465, #5015, #5025)
4. **Residents cannot reliably tell their own seat, blind and hole cards.** Multiple residents spent whole turns resolving whether they were A01/A04 or which blind they posted (#1273, #2804, #4126, #6445), and A01 debated whether a board pair was its hand (#3299, #6657); this ambiguity wastes steps and produces wrong actions. (#1273, #2804, #3299, #4126, #6657)
5. **Almost all time was spent waiting, not deciding.** 50 of 50 minutes had no submission, and residents repeatedly "end turn" or re-poll viewTable while waiting (e.g. #1066, #5491, #5595, #6625), so the loop was dominated by idle steps rather than play or learning. (#1066, #5491, #5595, #6625)
6. **No messages or transfers occurred, so the social layer of the story never ran.** There were 0 DMs, 0 board posts and 0 transfers all run, so the social game and competition for seats produced no alliances, lies or coordination. (#96, #100, #108)

## Optimizations

- **Make the level-up condition explicit and reachable from poker outcomes.** Because no resident solved level 1 in 49 minutes (0 submissions), the next version should state what counts as a submission and tie it to hands won or points, so poker play can advance a level. (#1790, #1822, #1831)
- **Align act-tool availability with the turn state the resident is shown.** TOOL_LOCKED fired on residents' own turns (#314, #730, #5681); the harness should either open act when viewTable shows it is the resident's turn or make the locked state obvious before the resident reasons about an action. (#314, #730, #5681)
- **Raise or remove the brain word cap, or allow append-and-trim.** Six BRAIN_TOO_LONG refusals (#1782, #1787, #3460, #3465, #5015, #5025) blocked between-game learning; a higher limit or a structured diff format would let residents keep their lessons. (#1782, #1787, #3460, #3465, #5015, #5025)
- **Give each resident an unambiguous seat, blind and hole-card summary every turn.** Seat and hand confusion consumed turns (#1273, #2804, #3299, #6445); a fixed per-turn header ("You are A04, big blind, hole cards X Y") would remove that waste. (#1273, #2804, #3299, #6445)
- **Cut idle end-turn loops by auto-skipping non-acting residents.** Residents repeatedly ended turns or re-polled viewTable while waiting (#1066, #5491, #5595, #6625); the harness should advance to the next actor without consuming a full resident step for non-actors. (#1066, #5491, #5595, #6625)
- **Seed social interaction so the social game actually happens.** With 0 DMs, 0 posts and 0 transfers all run, the designers' social premise was never exercised; the next version should prompt or reward early messages or transfers. (#96, #100, #108)

## Loophole candidates

1. **Residents treated polling viewTable as a free action, spending turns on repeated checks.** (residents) Residents called viewTable repeatedly to confirm the table instead of acting or waiting quietly (e.g. #358, #5491, #5909), using an information tool as a way to burn steps without risk. (#358, #5491, #5909)
2. **Residents used the retro window to restate scores rather than test the level goal.** (residents) Between games the residents recorded scores and rewrote brains (#1790, #1822, #1831, #5057) but never investigated what a level submission required, so the safe path was bookkeeping instead of solving. (#1790, #1822, #1831, #5057)

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
- and 1136 more
