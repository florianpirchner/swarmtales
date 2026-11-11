# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-moves-g4-p80` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 40 (referee) |
| Counted | events #3 to #2426 (1979 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 40 minutes (to the end); A02 on level 1 from minute 0 for 40 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.187 USD for this run (competitors 0.187, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0039 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 41 of 41 minutes without a submission; longest without one: minutes 0-40 (41) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5, ILLEGAL_MOVE 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents saved a strategy brain before any move was played.** A02 saved brain version 1 (105 words) and A01 saved version 1 (96 words) at minute 0 while the game had not started, and writeBrain was locked right after (#52, #56). All later thinking builds on these pre-game brains. (#52, #56)
- **A02 won all three decisive games through A01's tactical blunders.** A01 resigned game 1 after a rook blunder (#594) and game 3 after Nxe3 forked queen and rook (#1617), and lost game 2 to Qe8# (#1159). A02's own notes call game 2 unclean but still 2-0 (#1153). (#594, #1153, #1159, #1617)
- **A01 repeatedly misjudged the board and was refused for illegal moves.** A01 tried Rxe8+ at minute 6 while the e-file was blocked (#388) and Rxe6 at minute 38 (#2341), both refused as ILLEGAL_MOVE. Long stretches of its reasoning are recounts of material that flip from move to move (#563, #1035, #1515). (#388, #563, #1035, #2341)
- **A02 kept hitting the 150-word brain limit.** A02's writeBrain calls were refused five times for BRAIN_TOO_LONG, from 157 words at minute 9 (#575) through 178 words at minute 25 (#1607) and 157 words at minute 26 (#1614). Each refusal cost a retro window without a saved lesson. (#575, #1122, #1607, #1614)
- **The run ended in a long rook-and-pawn endgame grind with no submission.** From minute 35 to 40 both residents analyzed doubled rooks on the e-file and king-and-pawn trades (#2169, #2300, #2378). A01 blundered its rook to exf5 at minute 39 (#2420) and the referee ended the run at minute 40 (#2426). (#2169, #2300, #2378, #2420, #2426)

## Problems

1. **No levels were solved and no submissions were recorded in 41 quiet minutes.** Both residents stayed on level 1 from minute 0 to 40 and the run recorded 0 correct and 0 wrong submissions. The chess games advanced only through playMove reasoning, not through the scoring path. (#39, #45, #2426)
2. **The brain word limit blocked the retro mechanic that the story relies on.** Five BRAIN_TOO_LONG refusals (#575, #1122, #1128, #1607, #1614) show residents writing 152-178 words against a 150-word cap. The lessons they wanted to carry forward were never saved. (#575, #1122, #1128, #1607, #1614)
3. **Tool availability changes were misread as phase changes.** A01 and A02 repeatedly concluded the game phase had ended or was paused just because playMove was missing from the tool list (#92, #689, #1271, #1655). That burned turns on viewBoard instead of play. (#92, #689, #1271, #1655)
4. **Residents' board tracking was unreliable, producing refusals and wasted turns.** A01 played Rxe8+ and Rxe6 into blocked files (#388, #2341), and both residents recount the material total many times with different results (#272, #295, #946, #1035). The ILLEGAL_MOVE errors are the visible cost. (#272, #388, #946, #2341)
5. **The gamemaker took no actions and the run has no story beats.** The facts record no gamemaker actions and the digest found no beats. With 0 messages and 0 transfers, the only interaction was chess moves and two residents talking to themselves. (#52, #56, #2426)

## Optimizations

- **Raise or auto-trim the brain word limit.** The 150-word cap refused five writes (#575, #1122, #1128, #1607, #1614). Either raise the cap or let writeBrain truncate the oldest lesson so the retro always lands. (#575, #1122, #1128, #1607, #1614)
- **Show the current phase explicitly instead of only a tool list.** Residents inferred the phase from which tools were locked (#92, #689, #1271) and sometimes stopped playing. A phase line (opening, play, retro) in every turn would remove that guesswork. (#92, #689, #1271)
- **Give residents a board summary with material and legal moves.** Long material recounts (#563, #1035, #1515) and illegal moves (#388, #2341) show the board is hard to track from prose. A compact piece list plus the legal-move list each turn would cut both errors. (#388, #563, #1035, #1515, #2341)
- **Add a time-pressure rule for long endgames.** Minutes 35-40 were spent on a level rook endgame while the run ran out (#2378, #2403, #2426). A move or time cap per game would force more games into the 40 minutes. (#2378, #2403, #2426)
- **Make the run score on levels, not only on games.** With 0 submissions and no levels solved (#39, #2426), the standings were unknown and the scoreboard gave designers nothing. Expose the level goal next to the games so residents can actually submit. (#39, #2426)

## Loophole candidates

1. **Residents treated lock messages as permission to stall.** (residents) When playMove was missing, A01 sat and waited for a window to open (#1709) and A02 explicitly decided not to play any moves (#1655). The lock design let them idle rather than push the game forward. (#1655, #1709)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 58: event "game_started" (seq 58) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_scored" (seq 66) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- line 73: event "move_scored" (seq 73) does not match its schema
- line 86: event "move_played" (seq 86) does not match its schema
- line 87: event "move_scored" (seq 87) does not match its schema
- line 102: event "move_played" (seq 102) does not match its schema
- line 103: event "move_scored" (seq 103) does not match its schema
- line 111: event "move_played" (seq 111) does not match its schema
- line 112: event "move_scored" (seq 112) does not match its schema
- line 118: event "move_played" (seq 118) does not match its schema
- line 119: event "move_scored" (seq 119) does not match its schema
- line 132: event "move_played" (seq 132) does not match its schema
- and 427 more
