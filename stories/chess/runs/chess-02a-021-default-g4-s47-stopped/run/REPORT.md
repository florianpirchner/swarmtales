# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `chess-g4-p80` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 25 (no run_end event (the run did not finish cleanly)) |
| Counted | events #3 to #1517 (1237 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 25 minutes (to the end); A02 on level 1 from minute 0 for 25 minutes (to the end) |
| Final standings | unknown |
| Cost | unknown (usage.json is missing or malformed) |
| Reporter | 0.0027 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 26 of 26 minutes without a submission; longest without one: minutes 0-25 (26) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 3, BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents open with the same Ruy Lopez line and wait out locked turns instead of competing for a level.** A01 and A02 spent the first minutes reading locked tools and waiting for the game to start (#30, #43). A02 chose the Morphy defence a6 (#102) and A01 answered with Be7 (#143), so the run became a chess match rather than a level race. No submissions or transfers happened in any minute (facts). (#30, #43, #102, #143)
- **A01 loses game 1 by resigning after a self-blocked rook and a dropped piece.** A01 blocked its own Re1 with Be3 and later missed that Bf6 hit the knight on d4 (#286, #421). A01 then counted material at 28 vs 32 and resigned (#421, #664, #699). (#286, #421, #664, #699)
- **A01 misreads the board after Bc2 and loses game 2 as well.** A01 took on e4 with ...Nxe4 without seeing Bc2 recaptures on the c2-e4 diagonal (#1020, #1047, #1117). A02 recaptured and noted material was level again (#1034, #1043), and A01 resigned at game 2 after 19 moves (#1117). (#1020, #1034, #1047, #1117)
- **Repeated illegal-move refusals interrupt both residents' plans.** A01's ambiguous Nxd2 was refused and it had to respecify as b1d2 (#310, #314, #329). Later e1c3 was refused (#484, #488), and A02's c8e6 was refused because d7 blocked the bishop (#1251, #1255, #1269). (#310, #314, #329, #484, #488, #1251, #1255, #1269)
- **A01's brain rewrite is rejected and never fixed before the run dies.** A01's writeBrain was refused as BRAIN_TOO_LONG at 179 words against a 150 limit (#1094). A01 never saved a shorter version before the log ends at minute 25 (#1501). (#1094, #1501)
- **The run ends mid-game with no clean end.** The last events are residents still reasoning about the third or fourth game (#1501, #1510), and the facts record no run_end event at minute 25. No level was solved and no points were scored by either resident. (#1501, #1510)

## Problems

1. **The harness left playMove locked for long stretches, so residents idled.** Both residents repeatedly found only viewBoard and readBrain open and waited instead of acting (#36, #112, #733, #746, #1140, #1154). Across 26 quiet minutes there was no submission at all. (#36, #112, #733, #746, #1140, #1154)
2. **The story produced a chess match, not the level-race competition the facts describe.** Every action in the log is a chess move or a board read (#143, #752, #1194), while the facts show A01 and A02 stuck on level 1 the whole run with zero submissions and zero transfers. (#143, #752, #1194)
3. **The residents' move notation is unreliable, causing tool refusals.** A01 used ambiguous SAN Nxd2 and wrong-square e1c3, both refused (#314, #488). A02 tried c8e6 while d7 was occupied (#1255, #1269), showing the residents do not check their own notation before submitting. (#314, #488, #1255, #1269)
4. **The brain word limit blocks strategy updates with no warning path.** A01's writeBrain was refused for exceeding 150 words (#1094), and there is no evidence the resident knew the limit in advance or that the harness offered a retry. (#1094)
5. **The run ends without run_end, so results and cost are unknowable.** The facts record the end at minute 25 with no run_end event and no usage.json, so cost and final standings are unknown. The log just continues into another game (#1501, #1510). (#1501, #1510)

## Optimizations

- **Make the turn tool set explicit so residents never waste a turn discovering locks.** Addresses the idle-turns problem (#36, #746). Tell each resident at the start of its turn which action is legal (playMove, submit, or wait), instead of making it call viewBoard to infer whose turn it is. (#36, #746)
- **Clarify whether the story is a level race or a chess match.** Addresses the mismatch between a level-competition design and 25 minutes of chess (#143, #752). If levels are intended, cap game length or remove the endless chess game; if chess is intended, design the standings around game results. (#143, #752)
- **Validate move notation client-side and return legal alternatives before refusing.** Addresses ILLEGAL_MOVE refusals (#314, #1255). The city already lists the piece's legal moves on refusal (#314); surface the disambiguation rule before the first attempt so a turn is not spent recovering. (#314, #488, #1255)
- **Expose the brain word budget in the brain-read response.** Addresses BRAIN_TOO_LONG (#1094). Have readBrain report current word count and the 150-word limit so residents can trim before writing, and allow a partial or full replacement instead of a hard refusal. (#1094)
- **Guarantee a run_end event and usage record.** Addresses the unpackaged ending (facts: no run_end, usage.json missing). Emit a final standings and cost record at cutoff so designers can tune the next version from evidence rather than guesswork. (#1501, #1510)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 13: event "brain_written" (seq 13) does not match its schema
- line 14: event "retro_closed" (seq 14) does not match its schema
- line 23: event "brain_written" (seq 23) does not match its schema
- line 24: event "retro_closed" (seq 24) does not match its schema
- line 52: event "game_started" (seq 52) does not match its schema
- line 60: event "move_played" (seq 60) does not match its schema
- line 61: event "move_scored" (seq 61) does not match its schema
- line 68: event "move_played" (seq 68) does not match its schema
- line 69: event "move_scored" (seq 69) does not match its schema
- line 75: event "move_played" (seq 75) does not match its schema
- line 76: event "move_scored" (seq 76) does not match its schema
- line 83: event "move_played" (seq 83) does not match its schema
- line 84: event "move_scored" (seq 84) does not match its schema
- line 90: event "move_played" (seq 90) does not match its schema
- line 91: event "move_scored" (seq 91) does not match its schema
- line 105: event "move_played" (seq 105) does not match its schema
- line 106: event "move_scored" (seq 106) does not match its schema
- line 120: event "move_played" (seq 120) does not match its schema
- and 261 more
