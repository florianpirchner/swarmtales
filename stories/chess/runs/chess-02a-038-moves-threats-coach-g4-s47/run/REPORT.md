# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-moves-threats-coach-g4-p80` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 41 (referee) |
| Counted | events #3 to #2452 (2000 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 41 minutes (to the end); A02 on level 1 from minute 0 for 41 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.175 USD for this run (competitors 0.175, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 42 of 42 minutes without a submission; longest without one: minutes 0-41 (42) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 4, BRAIN_TOO_LONG 2, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 lost game 1 after blundering its queen to a knight** A01 put its queen on e4, attacked by the f6 knight, and A02 took it (#500). A01 had been ahead after winning the exchange but resigned on move 26 (#594, #663). (#500, #594, #663)
- **A02 lost game 2 by walking its queen onto a bishop diagonal** A02 played Qb3 into the e6 bishop, and A01 took it with Bxb3 (#989, #1035). A02 resigned after 15 moves and recorded the miss (#1031). (#989, #1031, #1035)
- **A01 won game 3 when A02 hung its queen on f2** A02's queen on f2 was captured by A01's queen on c5 along the diagonal (#1638, #1647). A02 resigned at move 29 (#1679, #1698). (#1638, #1647, #1679, #1698)
- **Neither resident submitted anything across the whole run** The run counted 0 correct and 0 wrong submissions and 42 quiet minutes, with both residents stuck on level 1 the whole time (#2452). All play was inside practice games via playMove. (#2452)
- **Residents treat TOOL_LOCKED notices as system messages and adapt** Both residents noted the tool list changing and kept to viewBoard/readBrain between turns (#1051, #1065, #1730). This let them wait out locked phases without erroring. (#1051, #1065, #1730)

## Problems

1. **The match produced no level progress or points in 41 minutes** Both A01 and A02 stayed on level 1 from minute 0 to the end, with no submissions and 0 points (#2452). The story's competitive seat mechanic never engaged. (#2452)
2. **Residents spent most of the run on private chess games, not the shared task** The residents played a three-game match and concluded it 2-1 to A01 (#1698). The facts record these as unsubmitted play, so all this effort counted for nothing. (#663, #1035, #1698)
3. **Repeated illegal moves wasted turns and show board-state confusion** There were 4 ILLEGAL_MOVE refusals, e.g. A02 trying c5b3 (#1222) and A01 trying Rg8 with its king already on g8 (#2110). Both residents repeatedly misread the board in their reasoning. (#611, #1222, #1999, #2110)
4. **writeBrain limits caused avoidable tool errors** A01 had two BRAIN_TOO_LONG refusals at 154 and 151 words against a 150 limit (#1661, #1668). It had been composing to roughly 120 words (#1009) but overshot twice. (#1661, #1668)
5. **A resign attempt was refused for being out of phase** A01 tried to resign in-game and got TOOL_LOCKED (#619). The refusal is a mechanics mismatch, since resign was not in the active tool list at that point. (#616, #619)
6. **No messages or transfers between residents** The facts show 0 DMs, 0 board posts and 0 transfers, so there is no social play, alliance or deception to report. The residents only spoke to themselves (#52, #1031). (#52, #1031)

## Optimizations

- **Give the level puzzle a visible clock or prompt so residents stop drifting into practice games** Both residents stayed on level 1 for 41 minutes without a submission (#2452) while running a private chess match. A countdown or explicit 'submit here' cue would refocus them. (#1698, #2452)
- **Expose board-state as a machine-readable summary to cut illegal moves** Four ILLEGAL_MOVE errors came from residents misremembering the board, e.g. #2110 where A01 tried to move its own king's rook onto g8. A compact legal-move plus piece-list view would reduce these. (#611, #1222, #1999, #2110)
- **Warn on brain length before submission** A01 hit BRAIN_TOO_LONG twice (#1661, #1668) despite aiming for 120 words. A live word counter in the writeBrain tool would prevent the wasted turns. (#1661, #1668)
- **Align resign and playMove availability with turn phase** A01 was refused a resign with TOOL_LOCKED (#619) after deciding the position was lost (#616). Either keep resign open in-game or say clearly it is unavailable. (#616, #619)
- **Seed a reason for residents to interact socially** With 0 messages and 0 transfers, no alliances or lies can form, which starves the social-game intent (#52, #1031). Add an incentive like shared points or a transfer goal. (#52, #1031)

## Loophole candidates

1. **Residents used practice games as a safe stand-in for the scored task** (residents) Both residents played a full multi-game match with playMove (#663, #1035, #1698) while making 0 scored submissions (#2452). It gave them competitive play without risking a wrong count. (#663, #1035, #1698, #2452)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 58: event "game_started" (seq 58) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 74: event "move_played" (seq 74) does not match its schema
- line 75: event "move_scored" (seq 75) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 89: event "move_played" (seq 89) does not match its schema
- line 90: event "move_scored" (seq 90) does not match its schema
- line 96: event "move_played" (seq 96) does not match its schema
- line 97: event "move_scored" (seq 97) does not match its schema
- line 112: event "move_played" (seq 112) does not match its schema
- line 113: event "move_scored" (seq 113) does not match its schema
- line 130: event "move_played" (seq 130) does not match its schema
- and 432 more
