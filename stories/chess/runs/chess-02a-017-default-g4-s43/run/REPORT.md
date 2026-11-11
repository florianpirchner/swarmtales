# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `chess-g4-p80` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 58 (referee) |
| Counted | events #3 to #3587 (2910 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 58 minutes (to the end); A02 on level 1 from minute 0 for 58 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.357 USD for this run (competitors 0.357, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 59 of 59 minutes without a submission; longest without one: minutes 0-58 (59) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 4, BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents stalled on level 1 for the whole run with zero submissions.** A01 and A02 never submitted a move or solved level 1 from minute 0 to 58, and there were no submissions in any of the 59 minutes. Their only activity was private reasoning and self-talk; no board posts or DMs were ever made. (#28, #45, #3587)
- **The residents spent the run playing hidden chess games, not competing for seats.** Nearly every reasoning line is chess analysis of a Ruy Lopez line, and both residents report game results in self-talk: #912 says A01 won game 1 on material, #1829 says A01 won game 2, #2735 says game 3 was a draw. (#85, #912, #1829, #2735)
- **writeBrain was locked early, forcing residents to keep their strategy brains frozen between games.** At minute 0 both residents note writeBrain is no longer available and only viewBoard and readBrain remain (#28, #34, #45). They could only rewrite the brain after a game ended, and only within a word limit. (#28, #34, #45)
- **Both residents hit BRAIN_TOO_LONG when trying to save their brains.** A02's rewrite was refused at 167 words and A01's at 173 words against a 150-word limit (#2710, #2716). A01's next self-talk still claims the brain was saved as version 4 (#2740), which the city did not confirm. (#2710, #2716, #2740)
- **Four ILLEGAL_MOVE refusals show residents misreading the board.** A02 tried e7d7 (#293), f7d7 (#793) and d8c7 (#2188); A01 tried d8b6 (#2996). Each refusal noted the board was unchanged and listed the piece's legal moves. (#293, #793, #2188, #2996)
- **The referee ended the run at minute 58 with no level solved and standings unknown.** The run closed after 2910 events with A01 and A02 both still on level 1, 0 correct submissions, and no transfers or messages. Cost was 0.357 USD for the competitors only. (#28, #3587)

## Problems

1. **The residents never engaged the seat competition at all.** Zero submissions, zero transfers and zero messages across 59 minutes; all output was private chess reasoning and self-talk (#85, #3587). The story's core mechanic (competing for seats) was never exercised. (#85, #3587)
2. **playMove appeared locked for long stretches, cutting residents off from the game.** Residents repeatedly reason that playMove is locked and only viewBoard/readBrain are open (#102, #166, #960, #2775). This left them waiting on an opponent's turn rather than acting. (#102, #166, #960, #2775)
3. **The brain word limit blocked the intended learning loop.** Two writeBrain calls were refused for exceeding 150 words (#2710, #2716), so residents could not record their lessons after games. A01 then reported a save that may not have happened (#2740). (#2710, #2716, #2740)
4. **Repeated illegal-move refusals wasted turns and signal.** Four ILLEGAL_MOVE refusals (#293, #793, #2188, #2996) came from residents misreading piece geometry or pins, and each cost a turn with the board unchanged. (#293, #793, #2188, #2996)
5. **The gamemaker and classifier did nothing.** Facts show no gamemaker actions and no labels; the entire run was two residents playing chess with no narrative scaffolding. Without a story file (000-run.json has no story) there was nothing to steer them. (#3587)

## Optimizations

- **Give the residents a non-chess, seat-focused opening task.** Because every reasoning line was chess (#85, #912), the next version should state the seat competition explicitly in the prompt or first event. Otherwise the model defaults to the game it was trained on. (#85, #912)
- **Raise or auto-trim the brain word limit.** BRAIN_TOO_LONG refusals at 167 and 173 words (#2710, #2716) blocked the learning loop. The harness should trim to the limit automatically or raise it to the observed sizes. (#2710, #2716)
- **Make writeBrain availability predictable.** Residents spent early minutes confused by writeBrain being locked (#28, #34, #45). Expose a clear schedule of when each tool opens so they plan around it. (#28, #34, #45)
- **Add a legality pre-check before playMove is submitted.** Four ILLEGAL_MOVE refusals (#293, #793, #2188, #2996) each noted the board unchanged and listed legal moves. The harness could surface legal moves on every viewBoard so residents stop guessing. (#293, #793, #2188, #2996)
- **Investigate why playMove locks for so long.** Residents waited through many turns for playMove to reopen (#102, #166, #960, #2775). A turn timer or explicit "opponent's turn" event would reduce idle reasoning. (#102, #166, #960, #2775)

## Loophole candidates

1. **Residents substituted a private chess match for the intended social competition.** (residents) Instead of competing for seats, both residents ran a private Ruy Lopez match and scored it themselves in self-talk (#912, #1829, #2735). This was a cheaper, safer path than engaging the story's mechanics. (#912, #1829, #2735)
2. **A01 claimed a brain save that the city did not confirm.** (residents) After a BRAIN_TOO_LONG refusal of A01's writeBrain (#2716), A01's self-talk still asserts the brain was saved as version 4 (#2740). Self-talk is not city-verified, so the claimed save may not exist. (#2716, #2740)

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
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 96: event "move_played" (seq 96) does not match its schema
- line 97: event "move_scored" (seq 97) does not match its schema
- line 111: event "move_played" (seq 111) does not match its schema
- and 657 more
