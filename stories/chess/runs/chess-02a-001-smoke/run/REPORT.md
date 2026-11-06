# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-p80` |
| Seed | 29 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 30 (referee) |
| Counted | events #3 to #1801 (1468 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 30 minutes (to the end); A02 on level 1 from minute 0 for 30 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.153 USD for this run (competitors 0.153, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0031 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 31 of 31 minutes without a submission; longest without one: minutes 0-30 (31) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 3, BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent the whole run on level 1 and never submitted a move.** A01 and A02 were stuck on level 1 from minute 0 to minute 30, and the run ended with 0 correct and 0 wrong submissions. The city recorded 31 quiet minutes with no submission at all. (#28, #34, #1801)
- **The residents played a full chess game through reasoning lines but the city counted no submissions.** A01 and A02 reasoned through a Ruy Lopez game move by move, from 1...e5 (#958) to the 40-move cap (#923, #935), yet the facts show 0 submissions and no level solved. Their moves were apparently not registered as submissions. (#923, #935, #958)
- **A01 lost game 1 on material at the 40-move cap and A02 won it.** A01 said it lost game 1 on material at the cap and saved a revised brain (#923), while A02 said it won as Black on material and saved brain version 2 (#935). A02 admitted dropping a bishop around move 19 and later a pawn to Bxc5 (#935). (#923, #935)
- **A02's brain update was refused for exceeding the word limit.** A02's writeBrain was refused with BRAIN_TOO_LONG because the brain had 156 words against a 150 limit (#911). It later reported the brain saved as version 2 (#935), so the retry succeeded. (#911, #935)
- **A01 made three illegal move attempts, each refused by the city.** A01 tried c8g4 (#1158), e2c2 (#1383) and d7d5 (#1687), all refused as ILLEGAL_MOVE with the board unchanged. In each case the legal-move list showed the intended piece could not reach the target square. (#1158, #1383, #1687)
- **Game 2 ran to the move cap with material level and no result.** A02 reported game 2 level at 10 points each after 34 moves (#1697), and A01 was weighing a threefold repetition draw at move 36 (#1758). The run ended at minute 30 before any decisive result was recorded. (#1697, #1758, #1801)

## Problems

1. **The residents never produced a counted submission, so the level and points system never engaged.** The facts show 0 submissions, 0 correct and 0 wrong, and both residents stuck on level 1 for the full 30 minutes. Whatever the residents did with playMove was not counted as a submission, so the core competition never started. (#28, #34, #1801)
2. **The residents spent most of their turns on private chess analysis instead of the city's task.** Nearly every reasoning line is chess move analysis (#107, #150, #197, #211), and the only city-facing actions were brain reads and writes (#41, #45, #891). The story's social and competitive mechanics (messages, transfers, board posts) were never touched: 0 DMs, 0 posts, 0 transfers. (#41, #107, #150, #197)
3. **The residents repeatedly misread the board and their own material count.** A01 lost track of which rooks Black had after Rxe8 (#636) and recounted material several times with conflicting totals (#477, #508, #831). A02 also recounted pawns and found its tallies disagreed (#1634). This wasted turns and produced illegal moves. (#477, #508, #636, #1634)
4. **Illegal moves were attempted because the residents did not check the legal-move list first.** A01 tried c8g4 while the d7 pawn blocked the diagonal (#1158, #1167) and d7d5 while its own king sat on d6 (#1701). Each refusal cost a turn and left the board unchanged. (#1158, #1167, #1701)
5. **The brain word limit is too tight for the lessons the residents want to record.** A02's brain update was refused at 156 words against a 150 limit (#911), forcing a rewrite during the retro window. The limit pushes residents to drop detail exactly when they are consolidating lessons. (#911)

## Optimizations

- **Make playMove register as a submission or explain why it does not.** The run shows 0 submissions despite a full game being played (#923, #935). The harness should either count each playMove as a submission or surface a clear counter so residents and designers can see progress. (#923, #935, #1801)
- **Give residents a board-check step before every playMove.** Three ILLEGAL_MOVE refusals (#1158, #1383, #1687) came from residents not consulting the legal-move list. Requiring a viewBoard or legal-move read before playMove would cut these wasted turns. (#1158, #1383, #1687)
- **Raise or make configurable the brain word limit.** A02's brain was refused at 156 words against a 150 limit (#911). A higher limit, or a warning before the write, would let residents keep their lessons without a rewrite. (#911)
- **Prompt residents toward the city's social mechanics, not only the chess board.** The run had 0 DMs, 0 board posts, 0 group posts and 0 transfers, while all reasoning was chess analysis (#107, #150). The story should nudge residents to message, post or transfer, or those mechanics will stay unused. (#41, #107, #150)
- **Add a material-count helper or a board summary to reduce recounting.** Residents recounted material repeatedly with conflicting results (#477, #508, #831, #1634). A computed material summary in the board view would save turns and prevent blunders like the missed Rxe8 recapture (#636). (#477, #508, #636, #831)

## Loophole candidates

1. **Residents treated the run as a private chess match and ignored the city's competition.** (residents) A01 and A02 played two full games against each other (#923, #935, #1697) without ever messaging, posting or transferring, which sidesteps the social game the story intends. The chess board became a safe, self-contained path that never touched the seats or points. (#923, #935, #1697)
2. **A01 considered a threefold repetition to force a draw rather than compete.** (residents) A01 weighed repeating Bc8 to reach a threefold repetition and accepted a draw because the position was equal (#1758). That is a cheaper, safer path than fighting for the level, and it uses the draw rule against the story's competitive intent. (#1758)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 13: event "brain_written" (seq 13) does not match its schema
- line 14: event "retro_closed" (seq 14) does not match its schema
- line 22: event "brain_written" (seq 22) does not match its schema
- line 23: event "retro_closed" (seq 23) does not match its schema
- line 50: event "game_started" (seq 50) does not match its schema
- line 57: event "move_played" (seq 57) does not match its schema
- line 58: event "move_scored" (seq 58) does not match its schema
- line 64: event "move_played" (seq 64) does not match its schema
- line 65: event "move_scored" (seq 65) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- line 73: event "move_scored" (seq 73) does not match its schema
- line 79: event "move_played" (seq 79) does not match its schema
- line 80: event "move_scored" (seq 80) does not match its schema
- line 93: event "move_played" (seq 93) does not match its schema
- line 94: event "move_scored" (seq 94) does not match its schema
- line 102: event "move_played" (seq 102) does not match its schema
- line 103: event "move_scored" (seq 103) does not match its schema
- line 110: event "move_played" (seq 110) does not match its schema
- and 313 more
