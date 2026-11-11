# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-g4-p80` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 60 (referee) |
| Counted | events #3 to #3643 (2967 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 60 minutes (to the end); A02 on level 1 from minute 0 for 60 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.319 USD for this run (competitors 0.319, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 61 of 61 minutes without a submission; longest without one: minutes 0-60 (61) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 10, BRAIN_TOO_LONG 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent the opening phase waiting on locked tools.** At minute 0 A01 and A02 found writeBrain locked and playMove unavailable, so they only called viewBoard and read their saved brains (#30, #36, #44, #48). A02 hit the same lock again at the start of later games (#1013, #1913, #2817), so every game began with dead minutes. (#30, #36, #44, #48, #1013, #1913, #2817)
- **A01 lost a rook to a missed pawn recapture in game 1, then lost a bishop the same way in game 3.** In game 1 A01 played into cxb4, admitted the miss after the fact (#406, #415), and fell behind. In game 3 A01 left the bishop on b3 where Na5 attacked it and Nxb3 won it (#2051, #2059, #2069) — the exact error A01 later named as the turning point of the drawn game (#2767). (#406, #415, #2051, #2059, #2069, #2767)
- **A02 blundered a queen to a discovered line in game 4.** A02 put the queen on g4 while Black's queen on d7 could reach that diagonal, and after Nxe3 the line opened (#3211, #3228). From there A02 was down material and played safe until the 40-move cap (#3517, #3573, #3621). (#3211, #3228, #3517, #3573, #3621)
- **A01 won game 2 and drew the others, ending ahead in the match by its own account.** A01 reported a win in game 2 on material at the cap (#1873), a drawn game 3 by repetition (#2767), while A02 reported the game 1 draw (#954) and its own loss in game 2 (#1858). So A01 led the match 2–1 with one game left going into game 4 (#2748). (#954, #1858, #1873, #2748, #2767)
- **Both brains were repeatedly rejected for being too long.** A01's writeBrain was refused three times for exceeding 150 words: 158 words at #942, 153 at #1855 and 159 at #2754. A02's brain saves succeeded at versions 2–4 (#954, #1858, #2748), so only A01 lost those retro updates. (#942, #954, #1855, #1858, #2748, #2754)
- **Illegal moves were frequent and mostly from guessed piece geometry.** The city refused 10 moves, e.g. A02's e7g5 (#584) and A01's d8d1 (#1168), Rxe3 (#3240) and Rf4 (#3587). Each refusal came with the legal move list, and several residents then corrected themselves on the spot (#593, #1177, #3127, #3596). (#584, #593, #1168, #1177, #3127, #3240, #3587, #3596)

## Problems

1. **No resident ever made a submission or solved a level in 60 minutes.** The run counted 0 correct submissions and both A01 and A02 were stuck on level 1 from minute 0 to minute 60. The whole run was chess games with reasoning and tool calls, not level progress. (#3643)
2. **The residents repeatedly could not tell whose turn it was or whether the game was still running.** A02 concluded playMove was locked because it was A01's turn (#105, #1038, #1913), and A01 saw a conflict between the board and the retro message (#967). These wrong turn reads likely produced some of the illegal moves, e.g. A02 calling an e7 bishop move while Black was to move (#584). (#105, #584, #967, #1038, #1913)
3. **The 150-word brain limit silently blocked A01's learning.** A01's brain was refused for length at #942, #1855 and #2754, so its retro lessons were never saved, unlike A02's versions 2–4. The harness gave no warning before the cutoff that a revision would be rejected. (#942, #954, #1855, #1858, #2748, #2754)
4. **Games started with the playing tool locked, wasting early minutes.** A01 and A02 both noted at minute 0 that writeBrain and playMove were closed (#30, #36), and the same lock appeared at the start of games 2, 3 and 4 (#1013, #1913, #2817). The first minutes of each game were spent on viewBoard and waiting. (#30, #36, #1013, #1913, #2817)
5. **The gamemaker took no actions and classified nothing, so no story pressure existed.** The facts record 0 gamemaker actions, 0 messages, 0 DMs and 0 board posts, and no labels. The run was two agents reasoning alone with no events from the city to react to. (#3643)

## Optimizations

- **Announce whose turn it is in every tool result or board view.** Problem: residents misread the turn and played illegal moves (#105, #584, #1038). Put the side to move in the viewBoard output and the playMove refusal so the agent never has to infer it. (#105, #584, #1038)
- **Return the legal move list on request before a move, not only after a refusal.** Problem: 10 illegal moves from guessed geometry (#584, #1168, #3240, #3587). A per-piece legal-move query would stop these guesses and save the retry cycles. (#584, #1168, #3240, #3587)
- **Unlock playMove at the start of each game instead of after an unexplained delay.** Problem: the first minutes of each game were idle because playMove was locked (#30, #36, #1013, #1913, #2817). Open the tool when the game opens, or state the unlock time in the tool description. (#30, #36, #1013, #1913, #2817)
- **Give a word-count budget in the writeBrain response and auto-trim on refusal.** Problem: A01 lost three brain revisions to the 150-word cap (#942, #1855, #2754). Report the remaining budget as the brain is edited, or trim to the cap and save, so lessons are not lost. (#942, #1855, #2754)
- **Add a clock or move budget that the resident can read.** Problem: residents repeatedly recounted moves against the 40-move cap (#1638, #2507, #3613). Show move number and remaining moves in the board view so they can plan the endgame instead of re-deriving it. (#1638, #2507, #3613)
- **Make the gamemaker inject at least one event per game.** Problem: zero gamemaker actions, zero messages and no beats; the story had no pressure (#3643). A scheduled event, e.g. a position twist or a public message, would give the residents something to react to. (#3643)

## Loophole candidates

1. **Playing quiet repetition moves to run out the cap instead of pushing for a result.** (residents) Problem: with material roughly level, A01 chose a repetition draw on purpose (#2690) and described a draw at equal material as acceptable (#2690), and game 3 ended in repetition (#2767). A resident can protect a lead by shuffling rather than playing for a win. (#2690, #2767)
2. **Playing safe, non-committal moves near the move cap to protect a material lead.** (residents) A02 stated it was up 4 points and would win on material at move 40, so it played safe quiet moves (#3517, #3573, #3621). This turns the material-scored cap into a reason to stop playing chess. (#3517, #3573, #3621)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 13: event "brain_written" (seq 13) does not match its schema
- line 14: event "retro_closed" (seq 14) does not match its schema
- line 23: event "brain_written" (seq 23) does not match its schema
- line 24: event "retro_closed" (seq 24) does not match its schema
- line 53: event "game_started" (seq 53) does not match its schema
- line 60: event "move_played" (seq 60) does not match its schema
- line 61: event "move_scored" (seq 61) does not match its schema
- line 67: event "move_played" (seq 67) does not match its schema
- line 68: event "move_scored" (seq 68) does not match its schema
- line 75: event "move_played" (seq 75) does not match its schema
- line 76: event "move_scored" (seq 76) does not match its schema
- line 82: event "move_played" (seq 82) does not match its schema
- line 83: event "move_scored" (seq 83) does not match its schema
- line 91: event "move_played" (seq 91) does not match its schema
- line 92: event "move_scored" (seq 92) does not match its schema
- line 99: event "move_played" (seq 99) does not match its schema
- line 100: event "move_scored" (seq 100) does not match its schema
- line 113: event "move_played" (seq 113) does not match its schema
- and 656 more
