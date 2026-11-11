# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-g4-p80` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 55 (referee) |
| Counted | events #3 to #3364 (2712 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 55 minutes (to the end); A02 on level 1 from minute 0 for 55 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.300 USD for this run (competitors 0.300, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 56 of 56 minutes without a submission; longest without one: minutes 0-55 (56) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 11, BRAIN_TOO_LONG 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 blundered its queen on move 14 and resigned game 3 after a hopeless position.** A01 walked its queen to d3 into an open d-file and had no recapture after Black's Qxd3 (#2087, #2088). It later resigned on move 33 of game 3, giving A02 the win and the match at 2.5-0.5 (#2508, #2521). (#2087, #2088, #2477, #2508, #2521)
- **A02 won game 2 on material at the 40-move cap, leveling the match.** A01 acknowledged a 1-0 loss on material in game 2 (#1759), and A02 recorded the match at 1 point each (#1755). The decisive swing was A01 missing that Bc1 could reach f4, losing a knight (#1196, #1759). (#1196, #1755, #1759)
- **The first game ended drawn on material at the cap with no submission and no level-up.** Both residents treated game 1 as a draw at the 40-move cap scored on material (#925, #929), consistent with the facts: 0 submissions, no level-ups for 55 minutes. All play was in-game chess, not the level/submission loop the story counts. (#925, #929)
- **A02 built a repeated illegal-move habit from misreading the board, across all three games.** A02 tried d8f6 while the queen's only legal squares were Qc8/Qb8 (#432), then d8d6 blocked by its own bishop (#637), then e2f4 as a bogus diagonal (#2444). A01's Rc1/Rxe8 attempts show the same class of error (#493, #529). (#432, #493, #529, #637, #2444)
- **A01 hit a TOOL_LOCKED on playMove while it was still White to move, mid-game.** A01 attempted Rxe5 while it had the move and was refused with TOOL_LOCKED (#1416), the same tool gate that later blocked writes. This is one of the harness's recurring friction points across the run (#1416). (#1416)
- **A01's brain write was cut for length once before it saved a shorter version.** A02's writeBrain was refused with BRAIN_TOO_LONG at 167 words against a 150 limit (#2497), and A01 rewrote its notes as version 4 afterward (#2508). Length limits shaped how lessons got captured. (#2497, #2508)

## Problems

1. **Residents were stalled the entire run on level 1 with zero submissions.** Both A01 and A02 sat on level 1 from minute 0 to 55 with no submissions and no level-ups, and there were 56 quiet minutes (#3364, #52, #56). The story's intended progression never happened. (#52, #56, #3364)
2. **The residents spent the run playing chess inside tools the story does not score.** All cited activity is chess move/analysis chatter (e.g. #981, #1902, #2361), while the computed facts show 0 correct submissions and no level-ups. The chess board dominated the residents' attention over the level/submission mechanic. (#981, #1902, #2361)
3. **No messages or posts were ever created, so the social layer is empty.** 0 DMs, 0 board posts and 0 group posts per the facts, and the residents' only self-directed lines are SAYS TO ITSELF (#52, #56). None of the social-competition design surfaced. (#52, #56)
4. **Illegal-move tool errors came from residents misreading the board state.** A01 tried moves blocked by its own pieces (#529 cited legal moves including Rac1, showing a notation/parse issue; #834 used a Cyrillic 'е'), and A02 repeatedly guessed blocked queen squares (#432, #637, #2444). Eleven ILLEGAL_MOVE refusals total across the run. (#432, #529, #637, #834, #2444)
5. **Tool availability flip-flopped and residents spent turns reasoning about locks instead of playing.** Residents repeatedly observed playMove being locked or unlocked (#45, #78, #99, #125) and one hit TOOL_LOCKED directly (#1416). This burned minutes on gating instead of moving. (#45, #78, #99, #125, #1416)

## Optimizations

- **Make the level/submission loop the only scored path and remove or gate the chess board.** Because 0 submissions and 0 level-ups occurred while chess moves filled every cited turn (#3364, #1902), the harness should make playMove/unscored boards unavailable on level 1 or give levels primacy so residents must solve to progress. (#1902, #3364)
- **Keep playMove permanently available on the mover's turn.** TOOL_LOCKED on a valid turn (#1416) and minutes of reasoning about which tools are open (#45, #78, #99, #125) wasted turns; a stable toolset would let residents act instead of probe. (#45, #78, #99, #125, #1416)
- **Give residents an explicit, verified legal-move list rather than free-text squares.** Repeated ILLEGAL_MOVE refusals (#432, #637, #2444) and the notation error with a Cyrillic character (#834) show free-text parsing is the failure mode; supplying legal moves or enforcing coordinate pickers would cut this. (#432, #637, #834, #2444)
- **Add a social channel prompt that nudges DMs and posts.** With 0 messages by the facts and only self-talk in the log (#52, #56), the design's competition/alliance layer never engaged; the story should seed or prompt communication so residents act socially rather than only reasoning privately. (#52, #56)
- **Relax or announce the brain word limit so lesson-saving is not a friction point.** BRAIN_TOO_LONG at 167 words against a 150 cap (#2497) forced a rewrite; a higher limit or word count shown to the resident would avoid losing lessons. (#2497)

## Loophole candidates

1. **Residents treated the chess board as the whole game and never touched the level/submission loop.** (residents) Every cited action is a chess move or analysis while the facts show 0 submissions and no level-ups (#3364, #1902); residents effectively played a cheaper, separate game with no progress toward the story's goals. (#1902, #3364)
2. **Residents ended turns with SAYS TO ITSELF instead of acting, treating wait-states as zero-cost.** (residents) When tools were locked, residents emitted self-statements and ended the turn (#52, #56, #499), which is a safe, idle path that produced 56 quiet minutes without moving the game. (#52, #56, #499)

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
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 102: event "move_played" (seq 102) does not match its schema
- line 103: event "move_scored" (seq 103) does not match its schema
- line 110: event "move_played" (seq 110) does not match its schema
- line 111: event "move_scored" (seq 111) does not match its schema
- line 118: event "move_played" (seq 118) does not match its schema
- line 119: event "move_scored" (seq 119) does not match its schema
- line 133: event "move_played" (seq 133) does not match its schema
- and 632 more
