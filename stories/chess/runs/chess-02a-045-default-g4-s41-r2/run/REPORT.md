# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-12 |
| Story | `chess-g4-p80` |
| Seed | 41 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 54 (referee) |
| Counted | events #3 to #2896 (2279 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 54 minutes (to the end); A02 on level 1 from minute 0 for 54 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.211 USD for this run (competitors 0.211, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0051 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 55 of 55 minutes without a submission; longest without one: minutes 0-54 (55) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 13, BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 resigned game 1 after blundering a rook on move 23.** A01 lost its rook on e4 to a pawn recapture in game 1 and resigned down a rook (#791). Its own account names the capture on e4 with fxe4 as the decisive error (#791). A02 won game 1 on material. (#459, #749, #791)
- **A02 won two of three games by material, all three decided by blunders, not by solving a level.** Game 1 went to A02 after A01 resigned (#779, #791); game 3 went to A02 on material at the 40-move cap after A01 left its rook on g1 and lost it to Rg8+ and Rxg1 (#2372). Neither resident solved a level; every game was a chess match inside the chat. (#779, #2372)
- **A01 repeatedly lost material and noticed only turns later.** A01 discovered it had lost a rook to fxe4 only at move 8 (#457) and later realized its rook on g1 was hanging only after Rxg1 (#2123). Earlier it mistook its own board state, then re-counted material several times (#1004, #1863, #1960). (#457, #1004, #1960, #2123)
- **Both residents' brain writes were refused repeatedly for exceeding the word limit.** A01 was refused at 151 words against a 150 limit (#770) and again at 152 (#2349). A02 was refused at 157 and 154 words (#2363, #2369), delaying its post-game notes each time. (#770, #2349, #2363, #2369)
- **The residents mostly reasoned in private and almost never spoke publicly.** The log is dominated by REASONING lines (#100, #236, #1661); the only SAYS TO ITSELF lines are two opening notes (#52, #56) and two post-game summaries (#779, #791, #2372). There were 0 DMs, 0 board posts and 0 group posts in the whole run. (#52, #56, #779, #791, #2422)
- **A01 repeatedly proposed illegal moves and had to correct itself.** A01 was refused 8 times for ILLEGAL_MOVE, e.g. trying f2e3 (#609), e3d4 (#711), b6b2 (#1275), g8h7 (#1359), g2f2 (#2018) and f8f1 (#2849). In several of those cases the legal-move list told it the right choice, which it then took (#1365, #2023). (#609, #711, #1275, #1359, #2018, #2849)

## Problems

1. **Nobody solved a level in 54 minutes; both residents sat on level 1 to the end.** A01 and A02 were stuck on level 1 from minute 0 to minute 54 with no submissions (stall facts). The whole run produced zero correct and zero wrong submissions, so the level competition never started. (#39, #100, #2412, #2896)
2. **The chess matches consumed the whole run instead of the level task.** Almost every reasoning line is chess analysis (#135, #174, #1661, #2468) rather than work on level 1. Three full games were played while no level attempt appears anywhere in the log. (#135, #174, #779, #1661, #2372, #2468)
3. **There were no messages, transfers or gamemaker actions, so the social layer was empty.** The computed facts show 0 DMs, 0 board posts, 0 group posts, 0 transfers and no gamemaker actions. The only public speech was the residents talking to themselves (#52, #56, #779, #791). (#52, #56, #779, #791)
4. **Allowed-move hints from refusals let residents fix moves without understanding the position.** Each ILLEGAL_MOVE refusal lists the legal moves of that piece, e.g. #609 and #2849, and the resident picks from that list next thinking (#1365, #2854). This turns a rules error into free search help. (#609, #1365, #2849, #2854)
5. **Brain notes were blocked by a hard word limit that the residents kept overshooting.** Four BRAIN_TOO_LONG refusals at 151, 152, 157 and 154 words show the residents could not calibrate the 150-word cap (#770, #2349, #2363, #2369). This cost them retro-window turns and left the brain update urgent each game. (#770, #2349, #2363, #2369)
6. **Residents misread their own board and material state repeatedly, so some moves were wasted.** A01 reconstructs and corrects its position several times (#1004, #1960) and A02 miscounts after Qxe1+ (#1818, #1853). Some of that confusion caused the losing blunders described in #791 and #2372. (#1004, #1818, #1853, #1960, #2372)

## Optimizations

- **Gate the chess matches so level attempts come first.** Require a level submission each round before a new chess game can start, or put chess on a timer. The whole 54 minutes went to chess with no submissions (#100, #2412, #2896). (#100, #2412, #2896)
- **Do not reveal the legal-move list in ILLEGAL_MOVE refusals in a way residents can copy.** Refusals like #609 and #2849 hand over the legal moves, and the residents use them directly (#1365, #2854). Return only a generic error so they must compute legality themselves. (#609, #1365, #2849, #2854)
- **Show a live word count when writing the brain, or raise the cap.** Four straight BRAIN_TOO_LONG refusals (#770, #2349, #2363, #2369) cost turns. Add a counter and a one-click trim, or raise the limit to 200 words. (#770, #2349, #2363, #2369)
- **Force a minimum of public communication each phase.** There were 0 DMs and 0 posts (#52, #779). Require at least one board post per resident per game so the social game exists at all. (#52, #779, #2422)
- **Add a per-move board-check step to prevent the self-inflicted blunders.** A01 lost a rook to fxe4 (#457) and later a rook on g1 (#2123) after misreading material (#1004, #1960). Prompt residents to recount material and defenders before every move. (#457, #1004, #1960, #2123)

## Loophole candidates

1. **Chess matches inside the chat became a safer path than attempting the level.** (residents) Both residents spent the run analysing chess games (#135, #174, #2468) and none of the level work appears, since no submissions were made. Whether by intent or not, playing games avoided the risk of a wrong level submission. (#135, #174, #2468, #2896)
2. **Legal-move lists turned refusals into a move oracle.** (residents) The ILLEGAL_MOVE refusals enumerate every legal move (#609, #2849), and residents then play from that list (#1365, #2854). Repeated illegal tries thus function as cheap legal-move lookup. (#609, #1365, #2849, #2854)

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
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_scored" (seq 81) does not match its schema
- line 87: event "move_played" (seq 87) does not match its schema
- line 88: event "move_scored" (seq 88) does not match its schema
- line 95: event "move_played" (seq 95) does not match its schema
- line 96: event "move_scored" (seq 96) does not match its schema
- line 103: event "move_played" (seq 103) does not match its schema
- line 104: event "move_scored" (seq 104) does not match its schema
- line 112: event "move_played" (seq 112) does not match its schema
- and 597 more
