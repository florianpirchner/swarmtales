# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-g4-p80` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 56 (referee) |
| Counted | events #3 to #3392 (2752 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 56 minutes (to the end); A02 on level 1 from minute 0 for 56 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.322 USD for this run (competitors 0.322, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 57 of 57 minutes without a submission; longest without one: minutes 0-56 (57) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 12, BRAIN_REPLAY 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent the entire run on level 1 and never made a submission.** A01 and A02 stayed on level 1 from minute 0 to the end at minute 56, and the run recorded 0 correct and 0 wrong submissions across 57 quiet minutes (#85, #93, #3392). (#85, #93, #3392)
- **The tool lockout at the start sent both residents into a wait loop.** At minute 0 both residents saw writeBrain/playMove locked and only viewBoard and readBrain open, and each said it would wait for the game to open (#28, #34, #41, #45). The same lock pattern recurred at every game boundary (#763, #776, #1707, #1722, #2544, #2558). (#28, #34, #41, #45, #763, #776, #2544, #2558)
- **Several full chess games were played inside the run with wins on material at the 40-move cap.** A01 won game 2 on material at the cap (#1642, #1647) and game 3 on material at the cap (#2525, #2520), and game 1 ended in a checkmate reported to A01 (#722). The residents reported match scores of 1-1 then 2-2, but no points or level-ups were credited. (#722, #1642, #1647, #2520, #2525)
- **A02 concluded game 4 was lost and decided to resign at the very end.** A02 counted itself about 4 points down near move 38 (#3369) and reasoned that it would resign rather than play on (#3386); the referee ended the run at minute 56 (#3392). (#3369, #3386, #3392)
- **A02 repeatedly lost material to the same knight-fork pattern and wrote a corrective brain.** A02 dropped pieces to knight forks on c2 and d3 and said so at #1625, saved a revised strategy brain at #1642, then still lost game 3 through its own errors again (#2525). (#1625, #1642, #2525)
- **Board-state misreads produced many illegal move attempts.** A01 tried d3f5 (#566), f2f4 (#596), c6e6 (#1451), b7e7 (#2475) and e7g5 (#2960); A02 tried f7f5 (#503), e6g6 (#544), g2e2 (#1346), d3d1 (#1528) and c8d7 (#2144). The city refused each, 12 ILLEGAL_MOVE in total. (#503, #544, #566, #596, #1346, #1451, #1528, #2144, #2475, #2960)

## Problems

1. **The residents never left level 1 and never scored a submission.** Both stayed on level 1 for all 56 minutes with 0 correct submissions (#3392), so the run produced no level progression despite about four games being played (#1642, #2520, #3392). (#1642, #2520, #3392)
2. **A long initial tool lockout started both residents stalling.** Both residents spent minute 0 finding playMove/writeBrain locked and resolving to wait (#28, #34, #41, #45), and the same lock reappeared at each game change (#1707, #1722, #2544, #2558). (#28, #34, #41, #45, #1707, #1722, #2544, #2558)
3. **Residents kept playing from an inaccurate picture of the board.** A02 asked where the bishop on a3 came from (#269) and A01 later found bishops on both a4 and d4 (#1909); A01 misread its own bishop as Black's at #2485. These misreads fed the 12 ILLEGAL_MOVE refusals (#566, #596, #1451, #2475, #2960). (#269, #566, #1909, #2475, #2485, #2960)
4. **A02 hit a brain-write rule it did not understand and a locked tool.** A02's writeBrain was refused as BRAIN_REPLAY for replaying game 1's move list (#719), and its later playMove was refused as TOOL_LOCKED (#3101), costing turns. (#719, #3101)
5. **A02 spent turns narrating a match score and resigning instead of playing.** A02 computed a 1-2 deficit and reviewed its blunders (#2525), then spent its final reasoning on resigning (#3386) — no move or submission resulted. (#2525, #3386)

## Optimizations

- **Open playMove from minute 0 or replace the wait with a short timer.** Both residents burned minute 0 and each game boundary waiting on a locked playMove (#28, #34, #763, #776); making it available immediately would remove the recurring stall. (#28, #34, #763, #776)
- **Give residents a reliable board readout before each move.** Board misreads caused 12 ILLEGAL_MOVE refusals (#566, #2475, #2960); a forced viewBoard or a printed FEN before each playMove would cut these. (#566, #2475, #2960, #3101)
- **Credit chess results toward levels or points explicitly.** Four games were played (#1642, #2520) yet 0 submissions and no level-ups (#3392); tie match wins to the submission/level system so play advances the run. (#1642, #2520, #3392)
- **Explain the writeBrain rule inside the refusal.** A02's strategy brain was refused as BRAIN_REPLAY (#719) and it only later inferred the positional rule (#1642); an inline example of a legal entry would prevent the round trip. (#719, #1642)
- **Cap or redirect end-of-game resign and score narration.** A02's last turns were spent tallying the match and deciding to resign (#2525, #3386); a hard prompt to keep playing until the referee ends the run would use those turns for moves. (#2525, #3386, #3392)

## Loophole candidates

1. **Both residents treated 'wait for the opponent's turn' as a safe non-move.** (residents) Instead of looking for any legal action, A01 and A02 repeatedly ended turns after seeing playMove locked, turning a lockout into a passive no-op loop (#763, #776, #1707, #1722). (#763, #776, #1707, #1722)
2. **A02 abandoned the game at the end rather than playing out the cap.** (residents) A02 chose to resign near move 38 because material would decide the game anyway (#3386), effectively skipping its remaining moves under the 40-move cap. (#3369, #3386)

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
- line 110: event "move_played" (seq 110) does not match its schema
- and 620 more
