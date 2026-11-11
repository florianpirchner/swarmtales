# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `chess-moves-g4-p80` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 39 (referee) |
| Counted | events #3 to #2345 (1904 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 39 minutes (to the end); A02 on level 1 from minute 0 for 39 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.200 USD for this run (competitors 0.200, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0039 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 40 of 40 minutes without a submission; longest without one: minutes 0-39 (40) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, ILLEGAL_MOVE 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent the run locked out of playMove and never submitted a move through their tools.** A01 and A02 repeatedly observed that only viewBoard and readBrain were open while playMove was locked (#28, #34, #101, #168, #493). Despite that, they analyzed long opening lines move after move (#85, #117, #125, #499) and the run ended with zero submissions. (#28, #34, #101, #168, #493)
- **The residents' reasoning describes games being played and decided, but the city recorded none.** A01 reasoned about a checkmate at move 20 (#418) and A02 reviewed that loss (#437); later A02 concluded game 2 was resigned (#1212, #1243) and game 3 too (#1786, #1833), while A01 reported wins (#1222, #1829). None of these games appear in the computed facts, which show 0 submissions, so the play was happening outside the recorded moves. (#418, #437, #1212, #1243, #1829)
- **Both residents stalled on level 1 for the whole 39 minutes with no submission.** A01 and A02 were on level 1 from minute 0 to minute 39 with no submission in any minute (#2345 ends the run). Their lines are almost entirely private reasoning about candidate moves, with no playMove that took effect. (#2345)
- **The brain-length limit blocked both residents' strategy updates at the end of games.** A01's writeBrain was refused for 185 words against a 150 limit (#1225), then again at 151 words (#1798), and A02's was refused at 162 words (#1804). A02 had already saved a version 4 brain before the last refusal (#45, #1833), so the memory loop was partly throttled. (#1225, #1798, #1804, #1833)
- **Illegal moves were attempted by residents reasoning from a misread board.** A02 tried d8b6, which the city refused with a long legal-move list (#1541), and later tried d2f1 and was refused again (#2038). A01 admitted losing pieces to misreading the position (#240, #703). (#240, #703, #1541, #2038)
- **The run ended with A02 believing it had just lost its queen.** A02 realized axb5 had taken its queen and judged the position lost (#2339), while A01 was checking whether Qb5 was safe (#2330) just before the referee ended the run at minute 39 (#2345). (#2330, #2339, #2345)

## Problems

1. **No move was ever submitted, so the core chess loop never produced a result.** The computed facts show 0 submissions and 40 quiet minutes; the residents' own lines show playMove locked at numerous points (#34, #168, #493, #1856). A01 even stated the game had not started and that it would wait for A02's reply (#41, #2048). (#34, #168, #493, #1856, #2048)
2. **Residents could not tell when it was their turn or whether a game was live.** A02 inferred a phase change from the tool list (#101) and A01 assumed it was Black's turn because playMove was locked (#168). A01 later waited for White's reply after h6 without any board confirmation (#2048). (#101, #168, #2048)
3. **Private reasoning consumed the whole run, but the other resident never saw it.** Nearly every line is REASONING with no board posts, DMs or group messages (facts: 0 messages). Long tactical monologues like #223, #740 and #2247 never reached the opponent, so they produced no negotiation or deception. (#223, #740, #2247)
4. **The brain word limit rejects strategy just before it is needed.** A01 lost two writes to BRAIN_TOO_LONG (#1225, #1798) and A02 one (#1804); A01's 151-word brain missed by a single word at #1798, suggesting a tight, poorly calibrated limit. (#1225, #1798, #1804)
5. **Residents reasoned from an uncertain board and made illegal moves.** A02 attempted d8b6 while Black to move (#1541) and d2f1 while White to move (#2038), both refused. A01 admitted miscounting a knight on f6 at move 11 (#703) and a dropped bishop (#240). (#240, #703, #1541, #2038)
6. **Residents described games, resignations and a match score that the city did not record.** A02 narrated resigning game 2 (#1243) and game 3 (#1833), and A01 claimed a 3-0 lead (#1829), yet the facts show no levels solved, 0 submissions and unknown standings. The mismatch means residents were reasoning about state the harness does not track. (#1243, #1829, #1833)

## Optimizations

- **Expose whose turn it is and whether a game is live in the tool output.** The residents guessed turns and phases and stalled (#101, #168, #2048). Add a turn/phase field to viewBoard responses so a locked playMove is explained rather than guessed. (#101, #168, #2048)
- **Make brain writes fit the limit automatically or raise the cap.** Three writes were refused for being slightly over 150 words (#1225, #1798, #1804), one by a single word. Truncate or summarize before refusal, and report the word count in the refusal. (#1225, #1798, #1804)
- **Give the residents a shared channel so reasoning becomes visible play.** All 1904 events include no messages, DMs or board posts (facts), while the residents thought in private for 39 minutes (#223, #2247). Add a per-move board post or taunt channel so opponents and designers see the claims. (#223, #2247)
- **Require a board read before each playMove and reject guesses.** Both the illegal attempts came from reasoning without a confirmed board (#1541, #2038). Requiring readBrain/viewBoard immediately before a move, and echoing the current position in the refusal, would cut these errors. (#1541, #2038)
- **Reconcile the residents' narrated games with the harness's recorded state.** Residents described resignations and a 3-0 score (#1243, #1829, #1833) while the city recorded no submissions. Have the harness surface the recorded result after each game so residents cannot invent a scoreboard. (#1243, #1829, #1833)

## Loophole candidates

None found.

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
- line 79: event "move_played" (seq 79) does not match its schema
- line 80: event "move_scored" (seq 80) does not match its schema
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 95: event "move_played" (seq 95) does not match its schema
- line 96: event "move_scored" (seq 96) does not match its schema
- line 110: event "move_played" (seq 110) does not match its schema
- and 421 more
