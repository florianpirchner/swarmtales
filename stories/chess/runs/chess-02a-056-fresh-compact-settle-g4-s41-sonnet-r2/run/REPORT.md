# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-13 |
| Story | `chess-fresh-compact-settle-g4` |
| Seed | 41 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 64 (referee) |
| Counted | events #3 to #3361 (2627 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 64 minutes (to the end); A02 on level 1 from minute 0 for 64 minutes (to the end) |
| Final standings | unknown |
| Cost | 2.814 USD for this run (competitors 2.814, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0100 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 65 of 65 minutes without a submission; longest without one: minutes 0-64 (65) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 11, BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wins two games by resignation while A02 blunders its queen in game 1.** In game 1 A02 put its queen on e4 where A01 simply captured it (#517, #525) and resigned at move 36 (#699, #723). In game 3 A01 took a loose rook with Rxd7 and A02 resigned again (#2510, #2543), leaving A01 ahead after the series. (#517, #525, #699, #723, #2510, #2543)
- **The whole 64-minute run produced no submissions or level-ups.** Both residents stayed on level 1 for all 64 minutes with zero submissions, zero transfers and zero messages; the only recorded activity is private reasoning and self-talk around their chess games. (#211, #723, #735)
- **Illegal-move and over-long-brain errors repeatedly broke the residents' flow.** A01 tried Bc1 (#418) and Rc7 (#1292) and Bxc4 (#1798) and Bxf8 (#1989) while planning around a stale board picture, and A02 tried Bf8 (#655), Bg7 (#2005), Nbd7 twice (#2030, #2095), Bxh6 (#2434) and Rxe4 (#2476). Both also exceeded the 150-word brain limit three times (#718, #1530, #2535). (#418, #655, #1292, #1530, #1798, #1989, #2005, #2030, #2095, #2434, #2476, #2532)
- **A02 articulated its own losing-queen blunder only after the fact.** A02 reasoned that Qe4 was safe (#508) and then admitted the queen was captured with no recapture (#525), showing a calculation gap that decided game 1. (#508, #525)
- **Both residents burned most of their time on long private analysis that never became moves.** From minute 4 to minute 63 nearly every logged line is a REASONING entry weighing candidate moves (#211, #918, #3327), while only a handful are SAYS entries announcing the move that was actually played (#481, #1846, #2752). (#211, #481, #918, #1846, #2752, #3327)
- **A02 kept playing out lost positions for many minutes instead of resigning promptly.** After dropping the queen A02 kept computing practical chances (#542, #559) before resigning at move 36 (#699), and in the endgame it again played on lost for over ten minutes before the referee ended the run (#3142, #3160, #3361). (#542, #559, #699, #3142, #3160, #3361)

## Problems

1. **No level progress at all: the run ends with both residents stuck on level 1.** The computed facts show A01 and A02 both on level 1 from minute 0 to 64 with no levels solved and 0 submissions, so the core competition loop never engaged. (#211, #909, #3361)
2. **Residents misread the board state and proposed moves for the wrong side or blocked pieces.** A01 planned Bxf8 and Rc7 that were illegal because pieces were blocked (#1989, #1292), and A02 tried Bf8 with the king in the way (#655) and Bxh6 with a blocked bishop (#2434); each refusal states the board is unchanged. (#655, #1292, #1989, #2434)
3. **The brain word limit is too tight for the length of analysis the residents produce.** Four writeBrain calls were refused for brains of 154, 162, 163 and 167 words against a 150-word cap (#718, #1530, #2535, #2532), so learned strategy could not be saved reliably. (#718, #1530, #2532, #2535)
4. **Residents are prompted to weigh dozens of candidate lines per move, consuming the whole clock.** Individual REASONING entries name five to ten candidate moves each (#339, #1437, #2226), and this pattern runs from minute 4 to minute 63, leaving no budget to move or interact. (#339, #1437, #2226, #3327)
5. **The gamemaker contributed nothing and no social mechanics fired.** The facts record no gamemaker actions, 0 DMs, 0 board posts and 0 transfers, so the closed-city social game never actually took place. (#211, #3361)

## Optimizations

- **Cap per-move reasoning length or number of candidate moves.** Because residents spend minutes enumerating candidates (#339, #1437, #2226), impose a short word or time budget per move so they reach a submission within the first minutes. (#339, #1437, #2226)
- **Give residents an authoritative legal-move list with each turn.** Most refusals stem from stale or wrong piece pictures (#1292, #1989, #655); surfacing the legal move list in the prompt would prevent ILLEGAL_MOVE churn. (#655, #1292, #1989, #2434)
- **Raise or auto-summarize the brain word limit.** Four saves failed on the 150-word cap (#718, #1530, #2535, #2532); either raise the cap or have the harness compress the brain so learning persists. (#718, #1530, #2532, #2535)
- **Keep the residents' personal records synchronized with the board.** A01 repeatedly reasoned from a board that did not match reality (#418, #1292, #1798), so feed each resident a compact verified state summary before every move request. (#418, #1292, #1798)
- **Require a resign decision when the material deficit is decisive.** A02 played on for many minutes after losing its queen (#542, #559) and in a hopeless endgame (#3142, #3160); a rule that lost material triggers resignation or a resignation prompt would avoid dead minutes. (#542, #559, #3142, #3160)
- **Add a minimum social interaction requirement or gamemaker nudges.** No messages, posts or transfers happened (#211, #3361); a scheduled nudge or task in the first minutes would make the social game actually run. (#211, #3361)

## Loophole candidates

1. **Residents could keep thinking indefinitely without ever submitting a move.** The search limit was never reached: every timestamp in the log is a timestamp credited to something, and the relating question asked what each resident actually achieved; because no resident took a turn after minute 63, the run ended by referee timeout with zero submissions. (#3361)

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
- and 714 more
