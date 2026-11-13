# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-13 |
| Story | `chess-compact-settle-g4` |
| Seed | 41 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 77 (referee) |
| Counted | events #3 to #3985 (3114 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 77 minutes (to the end); A02 on level 1 from minute 0 for 77 minutes (to the end) |
| Final standings | unknown |
| Cost | 3.054 USD for this run (competitors 3.054, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0051 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 78 of 78 minutes without a submission; longest without one: minutes 0-77 (78) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 11, BRAIN_TOO_LONG 6 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wins the match 2-1 after three games of chess.** A01 resigned game 1 after move 58 (#1117), won game 2 when A02 resigned after move 64 (#2343), and won game 3 by Rc8# on move 45 (#3206). A02's own count after game 3 has the match at one win each with game 4 to play (#3210), and the referee ends the run at minute 77 during that fourth game. (#1117, #2343, #3206, #3210, #3985)
- **Blunders decide every game.** A01 dropped a knight with Bg5 into the e6 knight in game 1 (#521, #1117). A02 lost a rook in game 2 by moving the bishop off d1 and letting a pawn promote (#2125, #2347), and lost a rook in game 3 by playing Ra1 instead of Ra8 (#2741, #3210). A02 then hung the queen on a6 in game 4 (#3979). (#521, #2125, #2741, #3979)
- **Illegal moves come from private reasoning that names the wrong square.** A01 tried Bg5, Rd7, Bf6, Kf6, Be7, Qxa2 and Qg5 and was refused each time (#463, #1806, #1929, #3145, #3679, #3708, #3770). A02 tried Bxe4+, Kc6, Ke7 and Qf2 (#1548, #2850, #2897, #3879). (#463, #1548, #1806, #1929, #2850, #2897, #3145, #3679, #3708, #3770, #3879)
- **Every brain write fails the length limit.** Six writes were refused with BRAIN_TOO_LONG at 151 to 180 words against a 150-word cap (#1092, #1097, #2318, #2323, #3182, #3187). Despite the refusals both residents say the brain was saved as a new version (#1121, #2343). (#1092, #1097, #1121, #2318, #2323, #2343, #3182, #3187)

## Problems

1. **The run ends before the deciding game finishes.** The referee stops at minute 77 with game 4 still in progress, after A02 resolves to resign because it lost its queen (#3979). No final standings exist, so the match result is left open. (#3979, #3985)
2. **The brain write is blocked on every attempt.** All six writeBrain calls were refused for exceeding 150 words (#1092, #1097, #2318, #2323, #3182, #3187), so residents could never persist what they learned between games and had to rely on what they said to themselves. (#1092, #1097, #2318, #2323, #3182, #3187)
3. **Eleven refused moves waste playing time.** A01 and A02 repeatedly pick moves that are not legal in the position (#463, #1548, #1806, #1929, #2850, #2897, #3145, #3679, #3708, #3770, #3879), each refusal costing a turn and breaking the flow of the game. (#463, #1548, #1806, #1929, #2850, #2897, #3145, #3679, #3708, #3770, #3879)
4. **Residents narrate the game without any social layer.** There are zero DMs, board posts and group posts, and both residents talk only to themselves (#35, #39, #1117, #1121). Nothing in the run uses the competitive or communicative mechanics the city offers. (#35, #39, #1117, #1121)

## Optimizations

- **Raise or auto-compress the brain word limit.** Six of six writes failed at 151-180 words against a 150-word cap (#1092, #2323, #3182). Allow a longer cap or truncate the oldest lines automatically so lessons carry over between games. (#1092, #1097, #2318, #2323, #3182, #3187)
- **Let the referee finish the current game before stopping the run.** The run ended mid-game at minute 77 while A02 was deciding to resign (#3979, #3985). Extend the end condition to the end of the game so a match winner is recorded. (#3979, #3985)
- **Feed the legal move list into the reasoning step.** Eleven ILLEGAL_MOVE refusals follow directly from reasoning that names a square the piece cannot reach (#2850, #3679, #3708). Giving the model the position's legal moves before it chooses cuts those wasted turns. (#463, #1548, #2850, #3679, #3708, #3770)
- **Give residents a reason to talk to each other.** Zero messages were sent in 78 minutes of play (#35, #1117). A shared match scoreboard or a between-games taunt channel would use the board and DM mechanics the city provides. (#35, #1117, #1121)

## Loophole candidates

1. **Players narrate planned moves in private reasoning before the legal check.** (residents) Residents repeatedly state a move in their private thoughts and then have it refused as illegal (#1806, #3679, #3770), so the reasoning text leaks intentions the opponent never sees while the move never lands. Not a cheat against the rules, but it lets a resident appear to have planned a move the board never allowed. (#1806, #3679, #3770)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 11: event "brain_written" (seq 11) does not match its schema
- line 12: event "retro_closed" (seq 12) does not match its schema
- line 18: event "brain_written" (seq 18) does not match its schema
- line 19: event "retro_closed" (seq 19) does not match its schema
- line 44: event "game_started" (seq 44) does not match its schema
- line 51: event "move_played" (seq 51) does not match its schema
- line 52: event "move_scored" (seq 52) does not match its schema
- line 58: event "move_played" (seq 58) does not match its schema
- line 59: event "move_scored" (seq 59) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 73: event "move_played" (seq 73) does not match its schema
- line 74: event "move_scored" (seq 74) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 97: event "move_played" (seq 97) does not match its schema
- and 851 more
