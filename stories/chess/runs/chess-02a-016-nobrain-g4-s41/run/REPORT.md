# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-nobrain-g4-p80` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 50 (referee) |
| Counted | events #2 to #3020 (2450 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 50 minutes (to the end); A02 on level 1 from minute 0 for 50 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.227 USD for this run (competitors 0.227, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0048 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 51 of 51 minutes without a submission; longest without one: minutes 0-50 (51) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 10, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 won the first chess game after A01 blundered its queen.** A02's knight took the queen on c2 at move 16 (#313), and A01 resigned at minute 6 down about a queen (#373, #387). A02 recorded the win 1-0 (#391). (#313, #373, #387, #391)
- **A01 resigned at minute 6, the only decisive chess result before the long stall.** A01 judged the position lost at 19 vs 32 material and resigned rather than play on (#373). No other game reached a win. (#373, #387)
- **From minute 7 the residents looped through repeated opening sequences instead of submitting.** A01 and A02 replayed Ruy Lopez and Giuoco Piano lines (#448, #458, #520, #1356, #2202) but the run facts record 0 submissions and no level solved. (#448, #520, #1356, #2202)
- **Both residents were stuck on level 1 for the whole run.** A01 and A02 each sat on level 1 from minute 0 to minute 50 with no level-up (#3020). The stalemate extended to the referee's end. (#3020)
- **A01 hit repeated illegal moves by guessing blocked or wrong-square piece moves.** A01 tried c8b7 with the b7 pawn still in place (#571), e6c8 (#688), d7b5 blocked by c6 (#776), c4c1 (#1105), b1b5 (#1832), and c8e6 with no bishop left there (#2336). Each was REFUSED as ILLEGAL_MOVE. (#571, #688, #776, #1105, #1832, #2336)
- **The tool set kept collapsing to viewBoard-only, forcing idle turns.** At minute 7 both residents found playMove locked and only viewBoard open (#413, #427), and again at minute 21 (#1288, #1301) and minute 35 (#2141, #2154), so turns passed with no move or submission. (#413, #427, #1288, #1301, #2141, #2154)

## Problems

1. **No resident ever submitted, so the run produced no progress.** The facts show 0 correct and 0 wrong submissions and 0 levels solved across 51 quiet minutes, despite constant playMove attempts (#571, #1832, #2336). (#571, #1832, #2336)
2. **The residents played long private chess games that the story never counted.** A01 and A02 narrated full games (#313, #391, #2434) but no board post, DM, or transfer appears in the facts, so their effort fed nothing. (#313, #391, #2434)
3. **Tools locked mid-game repeatedly broke the move flow.** TOOL_LOCKED hit A02 when it tried Rxa6 (#1117), and viewBoard-only phases interrupted both players several times (#427, #1301, #2154), producing wasted turns. (#427, #1117, #1301, #2154)
4. **A01 kept miscalculating legal moves, racking up ten ILLEGAL_MOVE refusals.** A01 repeatedly reasoned a move was legal then had it refused (#571, #688, #776, #2336), showing the board state in its reasoning did not match the city board. (#571, #688, #776, #2336)
5. **The 40-move chess scoring rule dominated reasoning over the city's goals.** Residents spent many turns counting material toward the move-40 cap (#1246, #1255, #2898) instead of pursuing levels or messages. (#1246, #1255, #2898)

## Optimizations

- **Give a clear submission instruction at turn start.** Because 0 submissions were made (#3020), the harness should surface the exact submit action and its cost each turn so residents do not spend turns on chess narration (#2434). (#2434, #3020)
- **Keep playMove unlocked during active play phases.** TOOL_LOCKED and viewBoard-only phases wasted turns (#1117, #427, #1301); the harness should not lock playMove while a game is live. (#427, #1117, #1301)
- **Show the legal move list to residents before they move.** A01 produced ten ILLEGAL_MOVE refusals (#571, #688, #776, #1105); returning legal moves with the board view would prevent these. (#571, #688, #776, #1105)
- **Cap or score the private chess games against the run goal.** Both residents poured the run into private chess games (#313, #2434) with no submission; a turn budget or reward for submissions would redirect effort. (#313, #2434)
- **Separate chess results from city progress in the report.** The only win was a private game (#391) while the facts show 0 levels solved; the design should state whether chess results count toward standings. (#391, #3020)

## Loophole candidates

1. **Residents treated user-turn system notes as authorization for locked tools.** (residents) A02 and A01 both said a lock notice arrived in the user turn and treated it as authorized, calling viewBoard on that basis (#413, #427). (#413, #427)
2. **Residents stalled indefinitely by ending turns while waiting for an opponent move that never came.** (residents) Several turns ended with 'it's White's/Black's move, I'm ending my turn' (#1289, #1842, #2142), producing idle minutes without any submission. (#1289, #1842, #2142)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 11: event "move_played" (seq 11) does not match its schema
- line 12: event "move_scored" (seq 12) does not match its schema
- line 19: event "move_played" (seq 19) does not match its schema
- line 20: event "move_scored" (seq 20) does not match its schema
- line 26: event "move_played" (seq 26) does not match its schema
- line 27: event "move_scored" (seq 27) does not match its schema
- line 34: event "move_played" (seq 34) does not match its schema
- line 35: event "move_scored" (seq 35) does not match its schema
- line 42: event "move_played" (seq 42) does not match its schema
- line 43: event "move_scored" (seq 43) does not match its schema
- line 57: event "move_played" (seq 57) does not match its schema
- line 58: event "move_scored" (seq 58) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 73: event "move_played" (seq 73) does not match its schema
- line 74: event "move_scored" (seq 74) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 89: event "move_played" (seq 89) does not match its schema
- and 550 more
