# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-threats-g4-p80` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 46 (referee) |
| Counted | events #3 to #2778 (2246 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 46 minutes (to the end); A02 on level 1 from minute 0 for 46 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.222 USD for this run (competitors 0.222, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0043 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 47 of 47 minutes without a submission; longest without one: minutes 0-46 (47) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 3, BRAIN_REPLAY 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 won game 2 on the 40-move material cap after A02's cxd6 blunder.** A02 realized at #1401 that the c7 pawn could recapture on d6, dropping a knight. A01 confirmed the win in #1443 and A02 confirmed the loss in #1447. (#1401, #1443, #1447)
- **A02 blundered a second knight in game 3 with ...Ng4 into hxg4.** A02 noted at #1727 that hxg4 captured the g4 knight, and later admitted forgetting the h3 pawn attack in #1926. This decided game 3, which A01 won 2-1 in the series per #1926. (#1727, #1926)
- **Repeated habitual blunders of the same type (ignoring pawn attacks).** A02 overlooked exf5 at #1816 in game 3 and exd5 at #2636 in game 4, the same 'missed pawn capture' pattern as cxd6 and hxg4. The brain-version lessons in #1447 named this exact habit but it recurred. (#1447, #1816, #2636)
- **The run ended at minute 46 with the fourth game still in progress.** The referee ended the run at #2778 while A01 was tallying material at move 40 and A02 was checking king escapes at #2761. No final standings and no levels were solved. (#2761, #2770, #2778)
- **Both residents spent long stretches locked out of playMove while it was the opponent's turn.** A01 and A02 repeatedly found playMove locked and only viewBoard/readBrain open, e.g. #102, #135, #619, #720, #1980, #2047. They ended turns and idled rather than progressing. (#102, #135, #619, #1980)

## Problems

1. **No levels were solved and neither resident ever submitted.** A01 and A02 were stuck on level 1 for all 46 minutes with zero submissions. The whole run was spent on chess games that never advanced a level. (#34, #102, #2778)
2. **Residents misread the harness as a waiting/pass-phase system and idled.** Both reasoned that lockouts meant 'opponent's turn' or a 'waiting phase' (#102, #135, #619, #1469) and ended turns instead of finding the move path. The turn-locked tool set created false idle loops. (#102, #135, #619, #1469)
3. **writeBrain locked early caused contradictory reasoning about saving the brain.** At #28 and #34 residents noted writeBrain was already closed at minute 0. Later A01's writeBrain was refused with BRAIN_REPLAY at #1903 for replaying a move list rather than position rules. (#28, #34, #1903)
4. **A02's private analysis frequently contained factual board misreads.** A02 repeatedly miscounted material and piece placement (#1401, #2487, #2607), then made moves based on wrong positions. This produced the repeated knight blunders that decided games. (#1401, #2487, #2607)
5. **Illegal-move refusals from misreading legal move lists.** A01 tried f3f2 (#335) and A02 tried d2e4 (#1323) and c1g5 (#2135), all refused. A02 spent turns checking whether a blocked bishop could move at all (#2144). (#335, #1323, #2135, #2144)

## Optimizations

- **Make the level objective explicit in the tool set so residents do not idle.** Add a status field telling residents whether it is their move or the opponent's and what the current objective is, to stop the 'waiting phase' idle loops seen in #102 and #619. (#102, #619)
- **Give the brain tool a positional-rule format check at write time, not a late refusal.** A01's writeBrain was only refused at #1903 after the game ended; validate the format and give feedback when the window opens at minute 0 (#28). (#28, #1903)
- **Surface legal-move lists proactively before the move call.** Three ILLEGAL_MOVE refusals (#335, #1323, #2135) and one wasted turn checking a blocked bishop (#2144) suggest showing legal moves for the piece on request before the call. (#335, #1323, #2135, #2144)
- **Add a material/board summary in observations to reduce miscounts.** A02 repeatedly miscounted material (#1401, #2487, #2607) against the city's own point totals (e.g. #1287). Providing the exact count each turn would cut blunders. (#1287, #1401, #2487)
- **Cap or time-box games so the run advances past game 1 before the referee ends.** The run ended at #2778 in the fourth game with no level-ups; a schedule forcing level attempts would prevent wasting the whole run on chess games. (#1443, #1922, #2778)

## Loophole candidates

1. **Residents relied on the 40-move material cap instead of checkmate to decide games.** (residents) At #1170 A02 reasoned the game would be scored on material at move 40, and #1443 records game 2 ending 'on material at the 40-move cap'. This lets games end without chess conclusion, which the residents treated as a normal win path. (#1170, #1401, #1443)

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
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_scored" (seq 81) does not match its schema
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 96: event "move_played" (seq 96) does not match its schema
- line 97: event "move_scored" (seq 97) does not match its schema
- line 111: event "move_played" (seq 111) does not match its schema
- and 512 more
