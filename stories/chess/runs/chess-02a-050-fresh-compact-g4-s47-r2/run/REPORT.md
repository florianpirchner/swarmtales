# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-12 |
| Story | `chess-fresh-compact-g4-p80` |
| Seed | 47 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 62 (referee) |
| Counted | events #3 to #3534 (2845 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 62 minutes (to the end); A02 on level 1 from minute 0 for 62 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.338 USD for this run (competitors 0.338, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0127 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 63 of 63 minutes without a submission; longest without one: minutes 0-62 (63) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 16, BRAIN_TOO_LONG 3, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents were locked out from move one and spent minute 0 doing nothing.** At minute 0 A02 found playMove locked because the game had not started (#45) and A01 confirmed there was no position to play (#52). Their only productive act was saving a strategy brain (#52, #56). (#45, #52, #56)
- **A01 won game 1 on material at the 40-move cap after A02 blundered a bishop.** A01 repeatedly counted White a bishop up with five pawns to Black's five (#648, #805) and said the retro gave it a win (#901). A02 conceded game 1 was scored 1-0 to A01 at the cap (#938). (#648, #805, #901, #938)
- **A02 equalised in game 2, then game 3 was drawn, leaving the match 1.5-1.5.** A01 lost game 2 on material at the cap (#1758) and both residents recorded the match at 1.5 each after a drawn game 3 (#2670, #2674). A02's own brain rule after game 3 was to win material early because equal endgames are not enough (#2642). (#1758, #2642, #2670, #2674)
- **Repeated illegal-move refusals cost each resident turns.** A02 tried b8c6 while its knight was on a5 (#255) and A01 tried e1e8 with its own bishop blocking the file (#615). Later A01 tried c3d4 with the e5 pawn covering d4 (#2611) and e4b4 blocked by its own c4 pawn (#3514). (#255, #615, #2611, #3514)
- **Both residents saved brains during retro windows but hit the word limit.** Three writeBrain calls were refused for BRAIN_TOO_LONG at 151, 188 and 154 words (#904, #918, #2645), and A01's later attempt was refused as TOOL_LOCKED (#3441). Successful saves were announced as versions 2 to 4 (#1780, #2670, #2674). (#904, #918, #1780, #2645, #3441)
- **Chained games ran to the referee's end with no submission ever counted.** Four games were played back to back between minute 1 and minute 62 (#96, #988, #1821, #2715) but the run ended with 0 correct and 0 wrong submissions, and the referee ended the run at minute 62 (#3534). (#96, #988, #1821, #2715, #3534)

## Problems

1. **Residents kept calling playMove in turns when the harness had locked it.** A01 and A02 repeatedly reasoned that playMove was locked and then still called viewBoard or tried moves anyway (#351, #1101, #1252, #3252, #3278). The tool list changed under them mid-game, producing a TOOL_LOCKED refusal (#3441) and wasted turns. (#351, #1101, #1252, #3252, #3441)
2. **Both residents stalled on level 1 for the whole run.** Neither resident advanced a level in 62 minutes; the attempt cost 0.338 USD and produced no submissions. The only progress was internal brain versions and draws/wins scored at the cap. (#1780, #2674, #3534)
3. **Reasoning lines show resident board models drifting from the actual position.** A01 concluded Be7 was illegal because of a d6 pawn (#1191) and A02 kept inventing knights and bishops on squares that were empty (#190, #2115). Illegal-move refusals followed (#1191, #2088, #2915), showing reads of the FEN were unreliable. (#190, #1191, #2088, #2115, #2915)
4. **The story gives no goal beyond the chess match, so the run reads as four games with no narrative beats.** The digest found no beats, there were 0 DMs, 0 board posts and 0 group posts, and no gamemaker actions. Every exchange was private self-talk (#625, #2092), so nothing in the story was visible to the other resident. (#625, #2092, #3534)
5. **Retro windows were too short for the brain word limit.** Three writeBrain refusals at 151, 188 and 154 words against a 150-word limit (#904, #918, #2645) mean brains were not saved in those windows. Brains only updated later when a shorter version was written (#1780, #2674). (#904, #918, #1780, #2645, #2674)

## Optimizations

- **Publish the active tool list as a tool result, not a user-turn notice, and stop residents retrying locked moves.** Residents wasted turns re-checking locked playMove (#351, #1101, #1252) and one attempt was refused as TOOL_LOCKED (#3441). Put the tool availability in a machine-readable result so the model can branch on it instead of guessing. (#351, #1101, #1252, #3441)
- **Give residents a per-move legal-move list when they request it.** Sixteen ILLEGAL_MOVE refusals were driven by wrong board models, e.g. b8c6 with the knight on a5 (#255), e1e8 blocked by its own bishop (#615) and e4b4 blocked by its own pawn (#3514). A legal-move tool would remove this class of error. (#255, #615, #3514)
- **Raise or enforce the brain word limit before the retro window opens.** Three brains were refused at 151, 188 and 154 words (#904, #918, #2645). Show the word count in the tool schema or auto-trim, so the retro window is not spent on a refusal. (#904, #918, #2645)
- **Add a story goal and a visible communications beat so residents have something to do besides chess.** The run had 0 DMs, 0 board posts and 0 group posts, and every message was SAYS TO ITSELF (#625, #2092). A scripted event or a required public post per game would give the designers something to tune. (#625, #2092, #3534)
- **Split the level-1 stall into a fixed opening book or eval hint so the first game starts clean.** Both residents burned their early minutes on board re-reads (#221, #241, #280) and the run ended with no level solved. A standard opening sequence for the first 6 plies would free minutes for play. (#221, #241, #280)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 58: event "game_started" (seq 58) does not match its schema
- line 67: event "move_played" (seq 67) does not match its schema
- line 68: event "move_scored" (seq 68) does not match its schema
- line 76: event "move_played" (seq 76) does not match its schema
- line 77: event "move_scored" (seq 77) does not match its schema
- line 83: event "move_played" (seq 83) does not match its schema
- line 84: event "move_scored" (seq 84) does not match its schema
- line 91: event "move_played" (seq 91) does not match its schema
- line 92: event "move_scored" (seq 92) does not match its schema
- line 99: event "move_played" (seq 99) does not match its schema
- line 100: event "move_scored" (seq 100) does not match its schema
- line 109: event "move_played" (seq 109) does not match its schema
- line 110: event "move_scored" (seq 110) does not match its schema
- line 120: event "move_played" (seq 120) does not match its schema
- and 669 more
