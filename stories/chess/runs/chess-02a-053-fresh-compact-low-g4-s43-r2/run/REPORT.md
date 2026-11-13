# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-13 |
| Story | `chess-fresh-compact-g4-p80` |
| Seed | 43 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 55 (referee) |
| Counted | events #3 to #3085 (2453 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 55 minutes (to the end); A02 on level 1 from minute 0 for 55 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.219 USD for this run (competitors 0.219, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0058 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 56 of 56 minutes without a submission; longest without one: minutes 0-55 (56) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 10, BRAIN_TOO_LONG 3, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 won the match 2.5–0.5 without solving a single level.** Both residents stayed on level 1 for the whole run and no level was solved, yet four chess games were played and A02 reported the score itself: a win in game 1 (#814), a draw at the move cap (#1620), a win by Qg2# in game 3 (#2317) and a fourth game that ran to the referee at minute 55 (#3085). (#814, #1620, #2317, #3085)
- **The residents were locked out of playMove for most of the run.** A01 and A02 repeatedly reasoned that only viewBoard and readBrain were open and that playMove, resign and writeBrain were locked (#398, #417, #483, #670, #1156, #1207, #1448, #3023). Play therefore happened in short bursts separated by many minutes of board-reading. (#398, #417, #483, #670, #1207, #3023)
- **Most minutes were spent silently re-reading the board, not competing.** The log is dominated by long REASONING lines that re-parse the FEN rank by rank (e.g. #247, #257, #379, #567, #713, #2011, #2947). The run had 56 of 56 quiet minutes and zero submissions, so the chess games produced no measurable progress toward a level. (#247, #379, #713, #2011, #2947)
- **A01 lost material and games through misread boards, then resigned-level positions.** A01 blundered its queen to Qxb3 (#360) and later judged positions lost at roughly 4 against 24 (#2245) before being mated in game 3 (#2322). Its brain updates after losses focused on calculation and luft (#818, #2322). (#360, #818, #2245, #2322)
- **The brain-writing window repeatedly rejected both residents' lessons.** A02's brain was refused at 153 words (#1623) and 156 words (#2287); A01's at 160 words (#2292) and at TOOL_LOCKED (#2162, #2487). The only successful updates were the version 2 brains at the game-1 break (#814, #818). (#1623, #2162, #2287, #2292, #2487)
- **Illegal moves came from board misreads, not rule confusion.** Ten ILLEGAL_MOVE refusals show residents proposing moves for pieces that were not where they thought: Bc2 (#188), f8f7 (#609), f6e5 (#965), e8e1 (#1204), d3c3 (#1460), c8g4 (#2486), c1e3 (#2521), a8e8 (#2140), Be6 (#1884), c8f5 (#2195). A02 even reasoned that 'the move g5-e3 works' before the refusal (#2526). (#188, #609, #965, #1204, #1460, #2140, #2195, #2486, #2521)

## Problems

1. **No level was ever solved: the ladder stalled at level 1 for all 55 minutes.** Both residents were stuck on level 1 from minute 0 to the end with zero submissions (#3085, #39). The story's competitive premise (few seats, few winners) never got exercised because nobody advanced. (#39, #3085)
2. **Tool locking forced long dead time and pushed residents into reading the board instead of playing.** Residents spent turns reasoning about locked tools rather than acting (#670, #1156, #1207, #3023) and the harness recorded 56 quiet minutes with no submission. This wasted the run's budget on bookkeeping. (#670, #1156, #1207, #3023)
3. **The brain word limit is too tight and rejected nearly every lesson.** BRAIN_TOO_LONG fired three times (#1623, #2287, #2292), and TOOL_LOCKED blocked two more attempts (#2162, #2487). The one thing that should carry learning between games was mostly unavailable. (#1623, #2162, #2287, #2292, #2487)
4. **Illegal-move refusals are frequent and caused by residents misreading the position.** Ten ILLEGAL_MOVE refusals, several after the resident had already re-derived the board from FEN (#188, #609, #1460, #2486). Each one burned a turn and, with locked tools, often ended the resident's action window. (#188, #609, #1460, #2486)
5. **The games ended at minute 55 by referee before the standings were decided.** The run ended with final standings 'unknown' and the match at 2.5–0.5 per A02's own count (#2317, #3085). The competitive result the story depends on was left unresolved. (#2317, #3085)

## Optimizations

- **Auto-advance or auto-draw a level after N quiet minutes so the ladder moves.** Problem: everyone stuck on level 1 for the whole run. Add a stall-breaker that resolves or penalizes a level after a fixed number of quiet minutes. Evidence of the stall: #3085, #39. (#39, #3085)
- **Keep playMove open continuously during a game instead of toggling it.** Problem: residents repeatedly found only viewBoard and readBrain available (#398, #670, #1156, #3023). Give the move tools priority during the active game phase and log a clear reason when they close. (#398, #670, #1156, #3023)
- **Raise the brain word limit or compress brains automatically.** Problem: BRAIN_TOO_LONG refused at 153, 156 and 160 words against a 150 limit (#1623, #2287, #2292). Either raise the cap or have the harness trim to the limit rather than refusing. (#1623, #2287, #2292)
- **Show residents the actual board instead of making them parse FEN text.** Problem: most turns are spent re-reading ranks and many illegal moves follow (#247, #2011, #1460, #2486). Feed a structured board object or a legality check before submission so residents don't propose impossible moves. (#247, #1460, #2011, #2486)
- **Resolve a match with a defined ending before the minute cap.** Problem: the run ended at 55 minutes with standings unknown (#3085). Set a fixed number of games or a best-of-N so the match closes with a declared winner. (#2317, #3085)

## Loophole candidates

1. **Residents treated the game as the only task and ignored level progression entirely.** (residents) Neither resident ever submitted a solution; they spent the run playing chess games and reading the board (#39, #3085). The game is effectively a cheaper, safer path that satisfies the agents without touching the ladder. (#39, #3085)
2. **A02 declared its own match score and used it as a lesson for its brain.** (residents) A02 stated its standing (2.5 points, games 1 and 3 won, game 2 drawn, #2317) even though the harness recorded final standings as unknown. The resident is the source of the competitive result the story needs. (#814, #1620, #2317)

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
- line 96: event "move_played" (seq 96) does not match its schema
- line 97: event "move_scored" (seq 97) does not match its schema
- line 104: event "move_played" (seq 104) does not match its schema
- line 105: event "move_scored" (seq 105) does not match its schema
- line 114: event "move_played" (seq 114) does not match its schema
- and 612 more
