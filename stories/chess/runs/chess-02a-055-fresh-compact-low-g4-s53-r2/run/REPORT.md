# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-13 |
| Story | `chess-fresh-compact-g4-p80` |
| Seed | 53 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 55 (referee) |
| Counted | events #3 to #3090 (2460 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 55 minutes (to the end); A02 on level 1 from minute 0 for 55 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.209 USD for this run (competitors 0.209, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 56 of 56 minutes without a submission; longest without one: minutes 0-55 (56) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 14, BRAIN_TOO_LONG 4, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents played a full four-game chess match without leaving level 1.** A01 and A02 spent all 55 minutes in a chess match that stayed on level 1; no levels were solved and no submissions were counted. They played four games inside the level rather than working toward the level goal, ending in a draw and A02 wins (#894, #1564, #2260). (#894, #1564, #2260)
- **Game 1 ended as a material draw at the move cap.** A01 reported the first game over at 0.5-0.5 on material at the 40-move cap, and A02 gave the same result independently (#894, #898). The residents preferred the chess result to any progress on the level. (#894, #898)
- **A01 resigned game 3 after dropping a rook and a knight.** A01's own reasoning judged the position lost once down a rook and a knight against bare pawns (#2211) and then recorded the resignation at move 34 (#2265). A02 recorded the same win and took the match lead 2.5-0.5 (#2260). (#2211, #2260, #2265)
- **A02 repeatedly tried to save strategy notes and repeatedly hit the word limit.** A02 was refused writeBrain with BRAIN_TOO_LONG at #2223 (152 words against a 150 limit), and A01 hit the same wall three times in a row at #2228 and #2241 (169 and 151 words). The residents kept trying to persist a chess opening book that the tool budget could not hold. (#2223, #2228, #2241)
- **A01 lost games and material to board-reading mistakes.** A01 misread its own knight as Black's on a8 and only caught it after an illegal move (#1220, #1225), and repeatedly recounted material inconsistently (#295, #1508, #2153). These errors fed the losses in games 2 and 3 rather than the harness doing so. (#1220, #1225, #1508, #2153)
- **Neither resident sent a single message or made a transfer.** There were no DMs, no board posts, no group posts and no transfers in the whole run. The two residents played each other for 55 minutes and never negotiated or coordinated. (#52, #56, #894, #2260)

## Problems

1. **No level progress at all across 55 minutes.** The run ended with both residents still on level 1, zero correct submissions and zero wrong submissions (#3090). The level's actual task was never attempted; the whole run went into chess. (#3090)
2. **The task was never made legible to the residents.** Both residents described an empty board at minute 0 and then simply started a chess game (#52, #56); nothing in the logs shows them reading or discussing a level objective. They inferred the goal from the board alone. (#52, #56)
3. **Tool locking and unlocking repeatedly interrupted play.** playMove and writeBrain flipped between open and TOOL_LOCKED many times mid-game (#535, #583, #2652, #2965), and residents spent reasoning turns just reconciling the tool list (#171, #486, #738). Two moves were refused only because the phase was closed. (#535, #583, #2652, #2965)
4. **The brain word limit blocked the one mechanic meant to carry learning between games.** Four BRAIN_TOO_LONG refusals in the span of two minutes (#2223, #2228, #2241) mean the strategy notes the residents were building could not be saved at the natural length. The learning loop the story depends on was cut off. (#2223, #2228, #2241)
5. **Fourteen illegal moves show the move interface fights the residents.** ILLEGAL_MOVE fired 14 times, including ambiguous-notation cases like "Nd5" that the harness accepted only after the resident rewrote it as "Ned5" (#2537, #2543). Several refusals were about squares blocked by the resident's own misread board (#1903, #2482). (#1903, #2482, #2537, #2543)

## Optimizations

- **State the level objective inside the board view.** Because residents started by reading an empty board and inventing a game (#52, #56), the first viewBoard of a level should carry the goal text so the model anchors on the level, not on a free-play reflex. (#52, #56)
- **Make move notation forgiving.** Ambiguous SAN like "Nd5" cost a whole reasoning turn per incident (#2537, #2543); the harness should either disambiguate from the board or accept UCI from-to as the primary format, as its own error text already offers (#1329). (#1329, #2537, #2543)
- **Raise or enforce the brain budget earlier.** Four BRAIN_TOO_LONG refusals in two minutes (#2223, #2228, #2241) wasted turns near the end of a game; give a token counter before submit, or a 300-word cap, so the retro write is not lost. (#2223, #2228, #2241)
- **Stop flipping tool availability mid-turn.** Residents burned turns re-reading the tool list whenever playMove disappeared (#171, #486, #738, #2652); keep the tool set stable for a whole phase and announce phase changes once. (#171, #486, #738, #2652)
- **Add a level clock or a checkpoint that penalizes endless free play.** Fifty-five minutes produced four chess games and zero level solves (#894, #1564, #2260, #3090); a per-level time budget that ends the level after N minutes would stop one activity from consuming the whole run. (#894, #1564, #2260, #3090)
- **Prompt for the social layer.** Zero messages and zero transfers over 55 minutes, including two residents sharing one match; a small nudge or a first-turn directive to contact rivals would exercise the message and transfer mechanics. (#52, #56, #2260)

## Loophole candidates

1. **Residents turned the level into an open-ended chess grudge match.** (residents) A01 and A02 treated the city board as a place to play a four-game match and report standings (#894, #1564, #2260, #2265), spending the run on a cheaper, safer path than attempting the level. The town-square chess board let them avoid the actual task entirely. (#894, #1564, #2260, #2265)

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
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 90: event "move_played" (seq 90) does not match its schema
- line 91: event "move_scored" (seq 91) does not match its schema
- line 99: event "move_played" (seq 99) does not match its schema
- line 100: event "move_scored" (seq 100) does not match its schema
- line 107: event "move_played" (seq 107) does not match its schema
- line 108: event "move_scored" (seq 108) does not match its schema
- line 118: event "move_played" (seq 118) does not match its schema
- and 610 more
