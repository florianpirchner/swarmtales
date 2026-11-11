# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-coach-g4-p80` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 54 (referee) |
| Counted | events #3 to #3320 (2701 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 54 minutes (to the end); A02 on level 1 from minute 0 for 54 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.279 USD for this run (competitors 0.279, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0052 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 55 of 55 minutes without a submission; longest without one: minutes 0-54 (55) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 12, BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent the whole run on level 1 without a single submission.** A01 and A02 never left level 1: the facts record no level solved and 55 quiet minutes, and no playMove was ever accepted. The run ended at minute 54 with no score and no standings (#3320). (#670, #1163, #3320)
- **The game phase flipped repeatedly and consumed most of the residents' time.** At minute 0 playMove was already gone (#39, #45), and the pattern repeated at #109, #1057, #1784, #2679 and #2693, where the residents noted only viewBoard and readBrain were open. Each flip cost a board check instead of a move. (#39, #45, #109, #1784, #2679)
- **Many playMove attempts were rejected as illegal because the model misread the board.** The city recorded 12 ILLEGAL_MOVE refusals, e.g. A02's "b7d5" at #670, A01's "e3e7" at #796 and "c8e6" at #1163. Several refusals came with a quoted legal-move list, showing the residents reasoned about a position that was not the one on the board. (#670, #796, #1163, #1570, #2201)
- **A02 blundered its queen twice, once after wrongly believing the queen was safe.** At #540 A02 lost a knight to Qxg4, then at #641 A01 realised its queen on h4 had been hanging to Qf6. Later A02 lost its queen to the f6 pawn on g5 (#3314), calling it a slip it should have seen. (#540, #641, #3314)
- **A01 won one game by checkmate, so the three-game series stood 1-1-1.** A02 reported at #1736 that it lost game 2 to A01 by checkmate, making the score 1-1. Game 3 was drawn at the 40-move cap (#2629, #2635), ending the series level. (#1736, #2629, #2635)

## Problems

1. **Neither resident ever submitted a level-1 solution in 55 minutes.** The facts show 0 correct, 0 wrong submissions and both residents stuck on level 1 from minute 0 to 54. The entire run produced no scored output. (#3320)
2. **The writeBrain length limit rejected the residents' lessons.** There were 4 BRAIN_TOO_LONG refusals (#959, #965, #1719, #2617). In each case the resident had composed a longer set of rules from the game and had to cut it, so the tool cap blocked the learning loop the story is built on. (#959, #965, #1719, #2617)
3. **Tool availability changed mid-turn and stranded moves.** The residents repeatedly found playMove removed while the game was still live (#109, #1057, #2679), then found it back later. A02 at #1579 explicitly said it could not move the pieces itself, so turns were lost to the harness rather than to the game. (#109, #1057, #1579, #2679)
4. **The 40-move cap made games end on material, not chess.** A01 at #755 guessed the game would be scored on material at 40 moves, and A02 at #2368 played for a safe trade rather than a win. The cap turned positions into point-count endings and produced a draw (#2629). (#755, #2368, #2629)
5. **Tool errors show the board state the model held diverged from the real board.** After the "b7d5" refusal, A02 worked out the c6 pawn blocked the diagonal only afterwards (#679). A01 similarly found b7 occupied by its own pawn only after the refusal (#2998, #3002). (#679, #2998, #3002)

## Optimizations

- **Return the current board and legal moves with every refusal and before each turn.** The refusals at #670, #796 and #2998 already include legal-move lists, and those lists immediately corrected the resident. The harness should send the full board position before each playMove call so the 12 ILLEGAL_MOVE errors drop. (#670, #796, #2998)
- **Stop toggling playMove availability mid-game.** Residents lost turns at #109, #1057 and #2679 when playMove disappeared without warning. Gate the phase change on the game ending, not on tool-list updates, and announce it once. (#109, #1057, #2679)
- **Raise or remove the writeBrain word cap, or warn before submission.** The 4 BRAIN_TOO_LONG refusals (#959, #965, #1719, #2617) all came in at 152-165 words against a 150 limit. Give the tool a hard length check in the prompt and allow a longer brain. (#959, #965, #1719, #2617)
- **Give the residents a scoreboard or move budget so they can pace themselves.** A01 was guessing the move cap at #755 and again at #927, and A02 counted down at #2516. Expose the move number and remaining moves in the board view. (#755, #927, #2516)
- **Add a phase where the two residents actually interact.** The facts show 0 DMs, 0 board posts and 0 group posts, so the social competition never happened. A required post-match note or a shared board post after each game would give the story its social layer. (#1736, #2635)

## Loophole candidates

1. **The material cap lets a losing resident trade down to a draw.** (residents) A02 played for safe trades to protect a one-pawn lead at #2368 and the game ended drawn on material at the 40-move cap (#2629). The cap rewards the passive side, not the better position. (#2368, #2629)

## Dropped from the model's answer

- Loophole candidates item 2: cites unknown events #841

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
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_scored" (seq 81) does not match its schema
- line 87: event "move_played" (seq 87) does not match its schema
- line 88: event "move_scored" (seq 88) does not match its schema
- line 95: event "move_played" (seq 95) does not match its schema
- line 96: event "move_scored" (seq 96) does not match its schema
- line 103: event "move_played" (seq 103) does not match its schema
- line 104: event "move_scored" (seq 104) does not match its schema
- line 120: event "move_played" (seq 120) does not match its schema
- and 599 more
