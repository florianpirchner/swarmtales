# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `chess-moves-threats-g4-p80` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (no run_end event (the run did not finish cleanly)) |
| Counted | events #3 to #1470 (1197 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | unknown (usage.json is missing or malformed) |
| Reporter | 0.0028 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 resigned game 1 after hanging its queen to a recapturing pawn** A02 considered Qxd4+ at #420, then realized at #442 that the c3 pawn recaptures and it had dropped its queen for a pawn, and it resigned at #468. This was the first decisive result of the match. (#420, #442, #468)
- **A01 resigned game 2 after leaving its queen on a6 to Bxa6** A01 admitted at #991 that it had dropped its queen to the c4 bishop covering a6, judged the position lost, and resigned; it reported the match level at 1-1 at #1024. Each resident lost exactly one game to a queen oversight. (#991, #1001, #1024, #1029)
- **Both residents repeatedly attempted moves from the wrong square** A02 tried f6d4 at #261 and A01 tried f6d4 at #636, c8d7 at #701 and again f6d4 at #1232, each refused as ILLEGAL_MOVE with the legal list returned. The pattern repeated across games, with the knight actually on c6, not f6. (#261, #636, #701, #1232)
- **Residents spent early minutes with no playable tools** At minutes 0-2 both residents only had viewBoard and readBrain, note-playing that writing was locked (#28, #34, #110). They filled the time reasoning about openings before the first game opened. (#28, #34, #110)
- **A02 showed a recurring blind spot for recapturing pawns** A02's own notes at #468 record the game-1 lesson to check every capture for recapturing pawns, yet at #1257 it again lost a knight to exd4 after Nd4. The same error class recurred in game 3. (#468, #1249, #1257, #1281)

## Problems

1. **Neither resident submitted a scored move all run** The facts record 0 correct and 0 wrong submissions, and a 24-minute stall on level 1 for both A01 and A02 with no level solved. Every playMove ended as a REFUSED ILLEGAL_MOVE or a checkout pushed past the phase, so the competitive ladder never advanced. (#261, #636, #701, #1232)
2. **Run ended without a clean finish** No run_end event exists and the run stopped at minute 24 with usage.json missing or malformed. A01 was mid-game at #1467 ("I've played Qf4"), so the match was cut off rather than concluded. (#1467)
3. **Tool availability flip-flopped, forcing residents to wait** playMove locked and unlocked repeatedly: A01 noted it unavailable at #95 and #1046, A02 at #110 and #547, with only viewBoard and readBrain left. Residents burned turns calling viewBoard instead of playing. (#95, #110, #547, #1046)
4. **Illegal move errors kept coming from the same wrong square** Four ILLEGAL_MOVE refusals were all caused by residents grabbing the f6 square when the knight sat on c6 (#261, #636, #1232) or a blocked bishop (#701). The error message lists legal moves, yet residents repeated the slip. (#261, #265, #640, #1240)
5. **No social or competitive mechanics were exercised** The facts show 0 messages, 0 board posts, 0 DMs, 0 transfers and no gamemaker actions across 1197 events. The closed-city social layer of the game did nothing. (#41, #45, #468)

## Optimizations

- **Validate or auto-correct move squares from the returned legal list** The repeated f6d4 and c8d7 refusals (#261, #636, #701, #1232) wasted turns; the harness could map a piece name to its only legal square from the legal-move list, or have the refusal strongly prompt the corrected move. (#261, #636, #701, #1232)
- **Keep playMove available while it is the resident's turn** Residents lost the play tool mid-turn (#95, #110, #547, #1046) and defaulted to viewBoard. Locking should be driven strictly by whose turn it is, with the current turn clearly shown on each board view. (#95, #110, #547, #1046)
- **Add a pre-move capture check or board hint about defended squares** Both queen losses came from missing a recapture on a defended square, as A02 realized at #442 and A01 at #991. A harness hint or forced confirm before a capture would prevent the two resignations that decided both games. (#442, #991)
- **Give residents something to do before the first game opens** Minutes 0-2 were idle tool-wise (#28, #34, #110); the story could open with a puzzle or intro phase so the early stall does not count against the clock. (#28, #34, #110)
- **Guarantee a clean run_end and usage record** The run cut off at #1467 with no run_end and no usage.json. A watchdog should close the match and record the score so the designers get final standings. (#1467)
- **Wire in the social layer with an explicit opening prompt** With 0 messages and 0 posts, the closed-city premise never appeared; the harness could prompt each resident to post or message at match start, citing #41 and #45 where residents only talked to themselves. (#41, #45)

## Loophole candidates

1. **Residents could stall indefinitely by reasoning without ever submitting** (residents) Both residents spent the whole 24 minutes reasoning and viewing the board (#86, #127, #1228) without a single submission, and the facts show no submission in minutes 0-24. Reasoning alone is a zero-cost path that avoids any scored risk. (#86, #127, #1228)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 13: event "brain_written" (seq 13) does not match its schema
- line 14: event "retro_closed" (seq 14) does not match its schema
- line 22: event "brain_written" (seq 22) does not match its schema
- line 23: event "retro_closed" (seq 23) does not match its schema
- line 50: event "game_started" (seq 50) does not match its schema
- line 58: event "move_played" (seq 58) does not match its schema
- line 59: event "move_scored" (seq 59) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 73: event "move_played" (seq 73) does not match its schema
- line 74: event "move_scored" (seq 74) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 89: event "move_played" (seq 89) does not match its schema
- line 90: event "move_scored" (seq 90) does not match its schema
- line 103: event "move_played" (seq 103) does not match its schema
- line 104: event "move_scored" (seq 104) does not match its schema
- line 121: event "move_played" (seq 121) does not match its schema
- and 254 more
