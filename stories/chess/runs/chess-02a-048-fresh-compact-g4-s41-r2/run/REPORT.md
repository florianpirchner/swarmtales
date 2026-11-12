# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-12 |
| Story | `chess-fresh-compact-g4-p80` |
| Seed | 41 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 52 (referee) |
| Counted | events #3 to #3087 (2485 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 52 minutes (to the end); A02 on level 1 from minute 0 for 52 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.295 USD for this run (competitors 0.295, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0057 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 53 of 53 minutes without a submission; longest without one: minutes 0-52 (53) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 7, BRAIN_TOO_LONG 4, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Two residents played four full chess games with no levels or points at stake.** A01 and A02 spent the whole run in a chess match, from the first board read at #39 and #45 through game 4 still running at #3087. The computed facts record no levels solved, no submissions and no transfers, so the visible activity is entirely chess play. (#39, #45, #537, #3087)
- **A01 won game 1 by back-rank mate after A02 left a rook undefended.** A02 recorded the loss at #514 and named 22. Rxe8# in its own summary at #548, and A01 confirmed 22. Rxe8# at #537. The referee counted this as a game result, though it never became a level or a submission. (#514, #537, #548)
- **Game 2 ended at the 40-move cap scored on material, giving A02 the point.** A01 reported at #1402 that game 2 ended at the 40-move cap and was scored on material, with A02 taking the point. A02's parallel note at #1406 describes its last move Kd4 and a retro win on the move cap. (#1402, #1406)
- **Game 3 also hit the move cap and went to A01, making the match 2-1.** A01's board read at #2265 says the scoreboard shows A01 2, A02 1 after game 3. A02's #2261 says game 3 reached the 40-move cap and was scored on material, with A01 taking the point. (#2261, #2265, #2266)
- **The brain was locked during play and hit by a word limit four times.** A01 tried writeBrain at #429 and was refused TOOL_LOCKED. Both residents then hit BRAIN_TOO_LONG at #517, #2223, #2229 and #2242 while trying to record lessons between games. (#429, #517, #2223, #2229, #2242)
- **Residents repeatedly treated tool-lock notices as genuine instructions and stopped playing.** At #144, #338, #416, #785, #924, #1142 and #2062, A01 and A02 read a system notice that playMove was locked and chose to wait instead of acting. These notices recur throughout the run and mark most of the phase transitions. (#144, #338, #416, #785, #924, #1142, #2062)

## Problems

1. **No resident ever submitted a move for a level.** The facts record 0 correct and 0 wrong submissions and a 53-minute quiet stretch from minute 0 to 52. The whole run was consumed by chess games that never turned into level progress, as seen in the continuous game logs from #95 to #3087. (#95, #3087)
2. **Level 1 was never solved by either resident.** Both A01 and A02 stayed on level 1 from minute 0 to minute 52, the whole run. The logs show only chess moves and board reads, never a level-completion or scoring event. (#95, #514, #3087)
3. **Tool-lock notices kept interrupting play and were interpreted as stop signals.** Notices that only viewBoard and readBrain were open appear again and again, for example #144, #416, #785 and #2905. In each case the resident paused and read the board rather than continuing the game, which adds turns without progress. (#144, #416, #785, #2905)
4. **The 150-word brain limit blocked lesson-writing after every game.** A02 was refused three times in a row at #2229 and #2242 for BRAIN_TOO_LONG, and A01 once at #2223. The residents had to compress their notes instead of saving the strategy they had just described. (#2223, #2229, #2242)
5. **Illegal moves were frequent and often based on a misread board.** There were 7 ILLEGAL_MOVE refusals, for example #990, #1298, #1543, #1771, #1807 and #2606. In several cases the reasoning just before shows the resident misplacing pieces, such as A02 thinking a bishop could reach e6 at #1547. (#990, #1298, #1543, #1547, #1771, #1807, #2606)
6. **The city recorded no messages, posts or transfers at all.** The facts show 0 DMs, 0 board posts and 0 transfers, and the logs contain no direct address to the other resident. A01 and A02 only spoke to themselves, for example at #52, #537 and #2261. (#52, #537, #2261)

## Optimizations

- **Give a visible level or scoring task during chess.** Problem: no submissions or levels in the whole run (#95, #3087). Proposal: tie each chess game to a level target, such as winning a game or solving a position, so play produces counted results. (#95, #3087)
- **Make tool-lock notices clearly mechanical, not instructional.** Problem: residents stopped playing whenever they saw a lock notice, for example #144, #416 and #1142. Proposal: phrase locks as status text with a replay prompt, so residents do not treat them as an instruction to wait. (#144, #416, #1142)
- **Raise or check the brain word limit before refusing.** Problem: four BRAIN_TOO_LONG refusals at #517, #2223, #2229 and #2242 wasted turns after every game. Proposal: raise the cap, or let the resident submit and have the city trim the brain to the limit. (#517, #2223, #2229, #2242)
- **Give residents a reliable board view before they commit a move.** Problem: 7 ILLEGAL_MOVE refusals such as #990, #1543 and #2606 followed reasoning that misread the position. Proposal: require a fresh viewBoard result in the same turn as playMove, or return a corrected board after each refusal. (#990, #1543, #2606)
- **Add an explicit channel for interaction between residents.** Problem: the city recorded 0 DMs and 0 board posts, and both residents only said things to themselves (#52, #2261). Proposal: prompt residents to post or send one message between games so the social side of the story appears. (#52, #2261)

## Loophole candidates

1. **Residents spent the run in free chess games instead of competing for seats.** (residents) A01 and A02 played sequential chess games from #95 to #3087 with no level submissions, points or transfers. That path is safe and cheap, but it bypasses the intended competition for seats. (#95, #3087)
2. **Waiting out locked tools became an easy default action.** (residents) Whenever playMove was locked, the residents chose viewBoard or readBrain and did nothing else, for example #338, #924 and #2905. This lets a resident avoid decisions while still appearing active. (#338, #924, #2905)

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
- line 73: event "move_played" (seq 73) does not match its schema
- line 74: event "move_scored" (seq 74) does not match its schema
- line 82: event "move_played" (seq 82) does not match its schema
- line 83: event "move_scored" (seq 83) does not match its schema
- line 89: event "move_played" (seq 89) does not match its schema
- line 90: event "move_scored" (seq 90) does not match its schema
- line 98: event "move_played" (seq 98) does not match its schema
- line 99: event "move_scored" (seq 99) does not match its schema
- line 106: event "move_played" (seq 106) does not match its schema
- line 107: event "move_scored" (seq 107) does not match its schema
- line 116: event "move_played" (seq 116) does not match its schema
- and 582 more
