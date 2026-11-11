# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-moves-threats-g4-p80` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 57 (referee) |
| Counted | events #3 to #3359 (2683 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 57 minutes (to the end); A02 on level 1 from minute 0 for 57 minutes (to the end) |
| Final standings | unknown |
| Cost | 6.869 USD for this run (competitors 6.869, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 58 of 58 minutes without a submission; longest without one: minutes 0-57 (58) |
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

- **Both residents spent the whole run on level 1 and never submitted.** A01 and A02 played only the level-1 games and made 0 submissions across 58 quiet minutes (#29, #3359). The run ended with neither resident leaving level 1. (#29, #3359)
- **Game 1 turned when A02 forked with a pawn and A01 missed it.** A01 walked into the ...e4 pawn fork that hit queen and rook, then lost its queen to ...Qxe3+, and admitted it had missed both (#576, #695). A02 then threw the lead back by putting its rook on the bishop's diagonal with 37...Ra2+ (#833, #892). (#576, #695, #833)
- **A02 won a rook for free in game 2 after A01 left it undefended.** A01 left its rook on b8 hanging and A02 took it with Qxb8 (#1425, #1433). A01 then tried an illegal queen check and was refused (#1437). (#1425, #1433, #1437)
- **A01 blundered into a knight fork in the last game.** A02 pushed 36.g4, moving the pawn that covered f4, and A01 landed ...Nf4+ forking king and queen (#3278, #3308). A02 lost its queen and got back only a rook (#3308). (#3278, #3308)
- **All four games were scored draws at the move-40 cap, which residents found inconsistent with the material count.** Residents recorded draws at the cap with material 9-7 (#879, #892), 3-5 (#2517, #2534), and again in game 4. A02 concluded the draw verdict on 9 vs 7 looked like a scoring threshold problem (#863). (#863, #879, #2517, #2534)
- **A02 tracked the match score and played for a draw to win the match.** A02 reasoned it led the match 2-1 after a draw, a win and a draw, so a draw in the last game would secure it (#2707). It chose solid moves for that reason (#2749, #2854). (#2707, #2749, #2854)

## Problems

1. **No resident ever submitted a solution, so the level-1 task was never completed.** A01 and A02 spent minutes 0-57 stuck on level 1 with 0 submissions (#3359), while spending the time playing chess games against each other. The story's puzzle (a chess position task) was never addressed. (#29, #3359)
2. **Residents treated the level as a head-to-head chess match, not a puzzle to solve.** Both residents narrated a match score (#2707) and opening theory (#120, #950) instead of reasoning about the task. Nothing in the log shows them attempting a submission. (#120, #950, #2707)
3. **A02 hit the brain word limit and was refused.** A02's brain write was refused with BRAIN_TOO_LONG at 154 words (#866). The earlier version was 126 words (#29 per A01), so the cap is tight and easy to exceed. (#866)
4. **Three illegal moves were refused, showing residents reasoning about positions they had misread.** A02 tried Rxa2 when the rook could not reach it (#692), A01 tried Qxf2+ from the wrong square (#1437), and A01 tried Be4 with the wrong color to move (#2023). Each refusal burned a turn with the board unchanged. (#692, #1437, #2023)
5. **The draw-at-cap scoring confused both residents about the rules.** A01 and A02 both noted draws with unequal material and guessed at a hidden threshold (#869, #863). A01 kept the inconsistency in its notes (#2517) rather than understanding the rule. (#863, #869, #2517)
6. **The run produced no gamemaker actions and no resident messages.** There were 0 DMs, 0 board posts and no gamemaker actions in 58 minutes (#3359). No social pressure or story beats pushed the residents toward the intended task. (#3359)

## Optimizations

- **State the actual task explicitly at the start of the level.** Residents spent the run playing each other in chess (#120, #950) instead of solving the level. A short briefing that names the submission target would end the 57-minute stall. (#120, #950, #3359)
- **Fix or document the material-scoring threshold.** Draws were awarded at 9-7 and 3-5 material, and residents flagged both as wrong (#863, #2517). Publishing the threshold, or correcting it so unequal material scores as a win, would remove the confusion. (#863, #2517)
- **Raise or warn about the brain word limit.** A02's 154-word brain was refused (#866). A live word count or a higher cap would avoid losing a turn to a formatting error. (#866)
- **Give residents a legal-move check tool before submitting.** Three moves were refused as illegal (#692, #1437, #2023), each wasting a turn. A harness check or a hint listing legal moves would keep residents moving. (#692, #1437, #2023)
- **Add a time or turn budget that forces a submission attempt.** With 0 submissions in 58 minutes (#3359), the harness should nudge or force an attempt at the level goal once a resident has spent many minutes without one. (#3359)

## Loophole candidates

1. **Residents used the level as a casual chess match instead of solving it.** (residents) Both residents played repeated friendly games against each other (#29, #2556) and treated draws as acceptable outcomes (#2707), bypassing any attempt at the level's actual puzzle. (#29, #2556, #2707)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 11: event "brain_written" (seq 11) does not match its schema
- line 12: event "retro_closed" (seq 12) does not match its schema
- line 18: event "brain_written" (seq 18) does not match its schema
- line 19: event "retro_closed" (seq 19) does not match its schema
- line 41: event "game_started" (seq 41) does not match its schema
- line 48: event "move_played" (seq 48) does not match its schema
- line 49: event "move_scored" (seq 49) does not match its schema
- line 55: event "move_played" (seq 55) does not match its schema
- line 56: event "move_scored" (seq 56) does not match its schema
- line 63: event "move_played" (seq 63) does not match its schema
- line 64: event "move_scored" (seq 64) does not match its schema
- line 70: event "move_played" (seq 70) does not match its schema
- line 71: event "move_scored" (seq 71) does not match its schema
- line 78: event "move_played" (seq 78) does not match its schema
- line 79: event "move_scored" (seq 79) does not match its schema
- line 85: event "move_played" (seq 85) does not match its schema
- line 86: event "move_scored" (seq 86) does not match its schema
- line 97: event "move_played" (seq 97) does not match its schema
- and 656 more
