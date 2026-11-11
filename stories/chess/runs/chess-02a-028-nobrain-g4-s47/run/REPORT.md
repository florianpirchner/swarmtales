# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-nobrain-g4-p80` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 49 (referee) |
| Counted | events #2 to #2968 (2421 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 49 minutes (to the end); A02 on level 1 from minute 0 for 49 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.215 USD for this run (competitors 0.215, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0046 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 50 of 50 minutes without a submission; longest without one: minutes 0-49 (50) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 8, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 won game 1 by taking a hanging queen on the b5-e8 diagonal.** A02 left its queen on c6 and then moved it to e8 into the line of A01's queen on b5; A01 took it with Qxe8+ and the game ended at minute 11. A02 assessed itself as lost (30 to 19) and resigned. #702 #711 #724 (#702, #711, #724)
- **A02 evened the match by punishing A01's rook blunder.** A01 played ...Kd6 and left its rook on d2 next to A02's king on e1; A02 took it with Kxd2 and converted to a rook for a bishop, and A01 resigned at minute 26. A01 later called this the losing moment of move 25. #1263 #1619 #1632 (#1263, #1619, #1632)
- **Most moves were talk, not action: 8 ILLEGAL_MOVE refusals came from carefully described plans that were not legal.** Residents wrote long candidate-move analyses, then submitted moves the board rejected, e.g. A01's "d3g3" at minute 5 and "e4e5" at minute 9, A02's "h6g7" at minute 10 and "Rf5" at minute 23. The reasoning was often correct about the position while the submitted coordinate was wrong. #328 #565 #627 #1463 (#328, #565, #627, #1463)
- **Both residents read the tool-lock notices as legitimate instructions and sat out turns.** When only viewBoard was listed, A02 reasoned that the notice "sits in the user turn rather than in a tool result" and treated it as authoritative (#64); A02 also skipped a move because it thought it was White's turn (#569). This recurred at each game boundary (#763, #1657, #2235). (#64, #569, #763, #1657, #2235)
- **The full run produced zero scoreboard progress despite four games of chess.** Both residents stayed at level 1 for all 49 minutes with 0 correct submissions, 0 messages and 0 transfers. All effort went into the chess match, which the run's level/submission metric never registered. #2968 (#724, #1632, #2968)

## Problems

1. **The run's scoring model (levels, submissions) is disconnected from what the residents actually did (chess).** The facts show 0 submissions, 0 correct and both residents stuck on level 1 from minute 0 to 49, while the log shows two complete games played and resignations (#724, #1632). The story appears to be chess-only, but the harness counts level-ups that never can occur. (#724, #1632, #2968)
2. **Tool availability toggling caused stalls and wasted turns.** playMove and resign were repeatedly locked, and residents responded by ending their turn with only a viewBoard call (#340, #1311). Each game boundary cost several idle minutes (minutes 12-13, 27-28, 36-37). (#340, #763, #1311, #1657, #2281)
3. **Frequent illegal moves show a mismatch between reasoning and submitted coordinates.** Eight ILLEGAL_MOVE refusals, several on moves the residents had just analyzed correctly, e.g. A01 reasoning about Bg5 then submitting "e7c5" (#1005) and about Kd5 then submitting "e6d5" (#1237). This burns minutes and derails plans. (#1005, #1237, #1424, #1463)
4. **The 40-move-per-side material-scored rules were misunderstood, producing resignations on shaky material counts.** A01 resigned game 2 at minute 26 believing the position lost (#1619), and A02 counted material inconsistently throughout (e.g. "material roughly even" then 30 to 19, #315, #375). Residents repeatedly argued over piece counts rather than play. (#315, #375, #711, #1619)
5. **No social mechanics were used at all: no DMs, board posts or group posts.** The game is designed as a social competition for seats, yet A02 only ever spoke to itself (#570, #1628) and there were 0 board posts and 0 transfers. Nothing in the run engaged the social or competition layer. (#570, #1628)
6. **The familiarity of chess let residents autopilot openings instead of engaging the story's objective.** Both residents spent the opening replaying known Ruy Lopez theory (#797, #1693) rather than pursuing any level or competition goal. The chess domain gave them a safe, memorized path. (#797, #1693, #2256)

## Optimizations

- **Make the chess result feed the level/submission score.** Award points or level progress for winning a game so the run's metrics reflect play. Addresses the disconnect between games won (#724, #1632) and the recorded 0 submissions and stalled level 1. (#724, #1632, #2968)
- **Keep playMove available during the opponent's turn or make the lock explicit to the model.** Stop ending turns on tool locks; give a clear "waiting for opponent" state so residents do not waste minutes (#340, #1311, #1657). This addresses the tool-lock stalls. (#340, #1311, #1657, #2281)
- **Validate the move before spending a turn and echo legal destinations back.** Have the harness return the piece's legal target squares whenever a coordinate is submitted, and surface them at analysis time, so residents don't lose minutes to illegal moves (#1005, #1237, #1463). (#1005, #1237, #1463)
- **Show a live material counter on the board view and in tool results.** Residents repeatedly miscounted pieces (#315, #375, #711) and A01 resigned game 2 on a mistaken read (#1619). A harness-computed material tally would ground resign decisions. (#315, #375, #711, #1619)
- **Give the residents an explicit way to talk to each other between games.** The story intends social competition, but A02 only talked to itself (#570, #1628). Add a between-games chat or banter step and scoreboard messages so the social layer is actually used. (#570, #1628)

## Loophole candidates

1. **Resigning was the cheap exit from losing games.** (residents) A02 resigned game 1 at minute 11 (#711) and A01 resigned game 2 at minute 26 (#1619) and game 4 at minute 48 (#2962), cutting games short instead of playing to the 40-move material limit. The resign tool let residents abandon rather than be scored out. (#711, #1619, #2962)
2. **Treating tool-lock notices as authority to do nothing.** (residents) A02 explicitly reasoned the system notice could be treated as a legitimate instruction and then only called viewBoard (#64), turning a lock into a free idle turn rather than a forced choice. (#64, #763, #1657)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 11: event "move_played" (seq 11) does not match its schema
- line 12: event "move_scored" (seq 12) does not match its schema
- line 19: event "move_played" (seq 19) does not match its schema
- line 20: event "move_scored" (seq 20) does not match its schema
- line 26: event "move_played" (seq 26) does not match its schema
- line 27: event "move_scored" (seq 27) does not match its schema
- line 40: event "move_played" (seq 40) does not match its schema
- line 41: event "move_scored" (seq 41) does not match its schema
- line 49: event "move_played" (seq 49) does not match its schema
- line 50: event "move_scored" (seq 50) does not match its schema
- line 57: event "move_played" (seq 57) does not match its schema
- line 58: event "move_scored" (seq 58) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- line 73: event "move_scored" (seq 73) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 97: event "move_played" (seq 97) does not match its schema
- and 527 more
