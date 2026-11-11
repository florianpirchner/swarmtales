# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-moves-threats-g4-p80` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 50 (referee) |
| Counted | events #3 to #3028 (2457 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 50 minutes (to the end); A02 on level 1 from minute 0 for 50 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.271 USD for this run (competitors 0.271, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0047 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 51 of 51 minutes without a submission; longest without one: minutes 0-50 (51) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2, ILLEGAL_MOVE 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 and A02 opened with a full Ruy Lopez and played it out largely from memory.** A01 played Bb5 into Ba4, Nc3 and castling (#94, #124, #141, #158) while A02 answered Nf6, castled and pushed d6 (#133, #167, #190); the game reached a real middlegame rather than stalling immediately. (#94, #133, #141, #167, #190)
- **A01 won game 2 after A02 retreated a bishop onto a square Black covered.** A02 admitted it put the bishop on b3 without noticing the e6 bishop covered that square, losing a piece (#1108), and resigned on move 33 (#1619); A02's own summary gives the match as A01 1.5, A02 0.5 (#1646). (#1108, #1619, #1646)
- **A02 lost game 3 to a back-rank mate after dropping a rook to the king.** A02 overlooked that Kf1 covered e2 and lost a rook (#2214), and A01 finished with Rd8# on move 30 (#2268, #2309); A02's self-review lists the missed bxc4 recapture, a6 left undefended and the Re2 hang (#2320). (#2214, #2268, #2309, #2320)
- **A01's games were repeatedly interrupted by tool locks mid-position.** A01 tried to move at minute 24 and got TOOL_LOCKED (#1526), and both residents saw playMove disappear and reappear between phases (#103, #978, #2342), with A02's Rd7 refused as illegal because the board was on a different turn than it believed (#1519). (#978, #1519, #1526, #2342)
- **Both residents wrote and revised strategy brains between games.** A01 saved brain version 3 after game 2 (#1650) and version 4 after game 3 (#2309) with new rules about pawn moves opening diagonals (#2286), and A02 compiled lessons from each loss (#2280, #2320). (#1650, #2280, #2286, #2309, #2320)
- **Neither resident was ever credited a level-up despite playing four games.** The standings show no level solved, and the tool list was still gated by level and phase when A01 tried a move (#1526); A01 assumed the game capped at 40 moves and moved on that basis (#1311, #1523). (#1311, #1523, #1526)

## Problems

1. **Level 1 never advanced, so both residents stayed stuck for the full 50 minutes.** The facts record A01 and A02 on level 1 from minute 0 to 50 with zero submissions, yet the log shows four complete games with mates and resignations (#1619, #2268); the win condition and the level progression are disconnected. (#1619, #2268)
2. **The move tool was locked during positions that were clearly still in progress.** A01 was refused a move at minute 24 with TOOL_LOCKED (#1526) while its reasoning treats the game as live (#1523), and A02 was told it was not White's turn when it believed otherwise (#1519); the residents could not tell whose turn it was from the tool list. (#1519, #1523, #1526)
3. **Brain writes failed on the word limit twice and cost turns.** A02's brain was rejected at 161 words against a 150 limit (#2283) and A01's at 165 words (#2289), both right after games where they had just formulated new rules. (#2283, #2289)
4. **Residents burned many minutes reasoning from stale or wrong board pictures.** A01 lost track of its own knight (#358) and later had to recheck whether a2 still covered b3 (#1984), while A02 repeatedly miscounted material (#287, #1245, #1343); much of the 50 minutes went to self-correction rather than play. (#287, #358, #1245, #1343, #1984)
5. **No coordination mechanics were used at all.** The facts show 0 messages, 0 transfers and no gamemaker actions, so the messaging and points systems that the harness offers never entered the story (#39, #45 are the only self-talk at the start). (#39, #45)

## Optimizations

- **Link match results to level progress so a won game counts as a solved level.** Both residents won or lost full games (#1646, #2320) yet the standings show no level solved and a 50-minute stall; award the level on game end, not on an unreachable submission. (#1646, #2320)
- **Make the active player's turn explicit in the tool list or a status field.** A02's Rd7 was refused as illegal because it was White to move (#1519), and A01 hit TOOL_LOCKED mid-game (#1526); showing side-to-move would prevent both. (#1519, #1526)
- **Raise or warn on the brain word limit before submission.** Two brain writes were rejected at 161 and 165 words against a 150 limit (#2283, #2289), wasting turns exactly when residents had new lessons; report the word count while writing. (#2283, #2289)
- **Give residents a compact board summary to reduce miscounts.** A02 misread material in nearly every game (#287, #1245, #1343, #2214); a piece list with the last move would cut the long recapitulation lines. (#287, #1245, #1343, #2214)
- **Add a reason for residents to talk or transfer, or drop those systems.** The run had 0 messages and 0 transfers over 50 minutes (#39, #45), so either the story needs an incentive to interact or the unused machinery should be removed. (#39, #45)

## Loophole candidates

1. **Residents reasoned from memory of the opening rather than the live board.** (residents) A01 and A02 played book moves and only later discovered the position did not match their assumptions (#358, #1984, #1108); this is a cheap path that avoids reading the board but produces blunders the city then records as fact. (#358, #1108, #1984)
2. **Resident treated the 40-move material cap as an acceptable way to concede.** (residents) A02 reasoned that resigning and playing on to move 40 give the same result because the game is scored on material (#1458, #1492), using the scoring rule to skip the effort of defending. (#1458, #1492)

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
- line 97: event "move_played" (seq 97) does not match its schema
- line 98: event "move_scored" (seq 98) does not match its schema
- line 111: event "move_played" (seq 111) does not match its schema
- line 112: event "move_scored" (seq 112) does not match its schema
- line 127: event "move_played" (seq 127) does not match its schema
- and 551 more
