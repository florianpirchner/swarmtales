# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-nobrain-g4-p80` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 42 (referee) |
| Counted | events #2 to #2466 (2005 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 42 minutes (to the end); A02 on level 1 from minute 0 for 42 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.166 USD for this run (competitors 0.166, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0039 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 43 of 43 minutes without a submission; longest without one: minutes 0-42 (43) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 7, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 wins game 1 on the 40-move material cap despite never getting a level-up.** A02 reported at minute 13 that game 1 ended 0-1 on material (roughly 20 to 9) after Black's Bxe4 and Bxf3 won the exchange (#845). A01 also read the position as lost (#797, #840). Neither resident solved anything, but the chess games produced the run's only decisive results. (#797, #840, #844, #845)
- **A01 blunders its queen in game 2 and resigns at move 21.** A01 played 21...Qxb2 into Bc1 recapturing on b2 (#1281, #1291), then wrote that it had lost its queen for a pawn (#1299) and resigned (#1312). A02 won as White (#1318). This was A01's clearest self-assessed turning point (#1312). (#1281, #1291, #1299, #1312, #1318)
- **A02 resigns game 3 after hanging a knight with Nc4.** A02 noted on move 11 that it played Nc4 expecting ...dxc4, but its pawn sat on d6 so nothing could recapture (#1525), and later resigned (#1887, #1895). A01 tried to resign too but the tool was locked (#1902), and it noted it was ahead 27 to 16 (#1907). (#1525, #1887, #1895, #1902, #1907)
- **Both residents misread the tool lock notices all run long.** At minute 0 A01 and A02 both read the system note that only viewBoard was open (#17, #31), and the same pattern repeats at minutes 14, 23, 32 (#882, #1399, #1927). A01 even skipped playMove because it thought it was not its turn (#406). This blocked play until the next phase unlocked moves. (#17, #31, #406, #882, #1399, #1927)
- **The run ends at minute 42 with no level solved by either resident.** The referee stopped the run at minute 42 (#2466) with A01 and A02 both still on level 1, zero submissions and zero messages. All activity in the log is chess reasoning, says-to-itself lines and refusals. (#2466)

## Problems

1. **The whole run stalled: no resident ever submitted a solution.** A01 and A02 were stuck on level 1 from minute 0 to 42 (#17, #2466), with zero submissions and 43 quiet minutes. The only productive output was the chess games, not the level mechanic. (#17, #2466)
2. **Tool-lock messages were misread as turn instructions.** Residents repeatedly treated a notice that only viewBoard was open as meaning playMove was unavailable and ended their turn (#17, #406, #882, #1927). A01 explicitly said it would skip playMove because it was not time (#406). (#17, #406, #882, #1927)
3. **Frequent illegal move attempts show the residents were guessing at legal moves.** There were 7 ILLEGAL_MOVE refusals, e.g. A02 tried d8b6 when only Qc8/Qb8 were legal (#397), A02 tried c4f7 with a blocked diagonal (#1218), and A01 tried d1d2 ignoring the pin (#1680). A01 later admitted the bishop could not leave the diagonal (#2260). (#397, #1218, #1680, #2260)
4. **One resignation attempt was blocked by TOOL_LOCKED.** A01 tried to resign while ahead at minute 31 and got TOOL_LOCKED (#1902). The tool being locked at that level made the resign mechanic inconsistent, and A01 then chose to continue (#1906, #1907). (#1902, #1906, #1907)
5. **No messages, beats or gamemaker actions occurred.** The facts show 0 DMs, 0 board posts and no gamemaker actions, and the digest found no beats. The social dimension of the story was completely absent. (#2466)

## Optimizations

- **Clarify tool availability vs. turn phases in the system prompt.** Addresses the misread lock notices (#17, #406, #1927): tell residents explicitly that a locked playMove means 'wait for your turn', not 'end the turn and do nothing', and expose whose move it is in the viewBoard output. (#17, #406, #1927)
- **Validate moves in a preview before committing, or show legal moves in viewBoard.** Addresses the 7 ILLEGAL_MOVE refusals (#397, #1218, #1680): have viewBoard print the list of legal moves for the side to move, or let playMove return the legal list first so residents stop guessing. (#397, #1218, #1680)
- **Make the resign tool state consistent across levels.** Addresses TOOL_LOCKED on resign (#1902): if the story allows resignation at some points, either keep resign always available or remove it from the active list entirely, and say so. (#1902)
- **Give residents a reason and a channel to talk.** Addresses the zero messages and zero beats: add a group task or a negotiation step around the chess games (e.g. side bets on who wins) so the social mechanics are exercised. Currently all output is private reasoning or self-talk (#1312, #1318). (#1312, #1318)
- **Cap or simplify the chess game so it does not consume the whole run.** Addresses the 42-minute stall (#2466): the games reached move 40+ (#845, #2460) and the level mechanic never started. A shorter game or a move budget tied to level progress would leave time for submissions. (#845, #2460, #2466)

## Loophole candidates

1. **Residents used says-to-itself as a private scoreboard instead of the social channel.** (residents) A01 and A02 repeatedly posted results and self-assessments to themselves (#840, #845, #1312, #1318, #1907) while the facts record 0 messages to other residents. This is a cheaper private path that mimics communication without exercising the social mechanic. (#840, #845, #1312, #1318, #1907)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 11: event "move_played" (seq 11) does not match its schema
- line 12: event "move_scored" (seq 12) does not match its schema
- line 25: event "move_played" (seq 25) does not match its schema
- line 26: event "move_scored" (seq 26) does not match its schema
- line 39: event "move_played" (seq 39) does not match its schema
- line 40: event "move_scored" (seq 40) does not match its schema
- line 48: event "move_played" (seq 48) does not match its schema
- line 49: event "move_scored" (seq 49) does not match its schema
- line 56: event "move_played" (seq 56) does not match its schema
- line 57: event "move_scored" (seq 57) does not match its schema
- line 71: event "move_played" (seq 71) does not match its schema
- line 72: event "move_scored" (seq 72) does not match its schema
- line 84: event "move_played" (seq 84) does not match its schema
- line 85: event "move_scored" (seq 85) does not match its schema
- line 98: event "move_played" (seq 98) does not match its schema
- line 99: event "move_scored" (seq 99) does not match its schema
- line 107: event "move_played" (seq 107) does not match its schema
- line 108: event "move_scored" (seq 108) does not match its schema
- line 115: event "move_played" (seq 115) does not match its schema
- and 441 more
