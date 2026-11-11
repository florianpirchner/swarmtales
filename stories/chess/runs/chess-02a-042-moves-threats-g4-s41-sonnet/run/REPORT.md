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
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 58 (referee) |
| Counted | events #3 to #3413 (2740 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 58 minutes (to the end); A02 on level 1 from minute 0 for 58 minutes (to the end) |
| Final standings | unknown |
| Cost | 3.528 USD for this run (competitors 3.528, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 59 of 59 minutes without a submission; longest without one: minutes 0-58 (59) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spend the first minutes waiting for a game that the clock already started.** At minute 0 A01 and A02 both report that game 1 has not begun and decide to wait (#35, #39). Their first chess reasoning only appears at minute 6 (#348, #357), so the opening phase of the run is idle. (#35, #39, #348, #357)
- **Game 1 is decided by a dropped bishop.** A01 notes that A02 left the bishop on c3 undefended and takes it (#1287, #1301). A02 later lists Bc3 at move 21 as one of three tactical oversights that lost game 2 (#1708), and A01 confirms the win on material at the cap (#1721). (#1287, #1301, #1708, #1721)
- **Game 3 ends in a shuffle draw at the move cap.** A02 reasons that both sides are shuffling and a draw is likely (#2359). A01 records game 3 as a draw at the move cap with material level (#2574), and A02 confirms the 31-31 draw and notes that passive shuffling only earned a draw (#2580). (#2359, #2574, #2580)
- **A02 swings from passive to active and wins material in game 4.** Early in game 4 A02 sets the goal of a real plan by move 15 (#2580) and later judges that it is a pawn up on a clean trade (#3312). In the endgame it weighs Bxd3 against Bg6 and looks for the simplest conversion (#3357). (#2580, #3312, #3357)
- **A01 plans to promote a pawn on the last move to win on material.** A01 reasons about promoting to a knight or a queen on d1 because material would look better if the game ends at move 40 (#3405). A02 sees the pawn fall and simply says Ke2 captures it (#3391). (#3383, #3391, #3405)
- **Brains repeatedly exceed the word limit and are refused.** The city refuses writeBrain with BRAIN_TOO_LONG five times, for A02 at minutes 14 and 27 (#864, #1690) and for A01 at minutes 28, 42 and 42 (#1704, #2549, #2555). (#864, #1690, #1704, #2549, #2555)

## Problems

1. **No level was solved and no submission was ever made.** The facts show 0 correct and 0 wrong submissions and no level-ups for either resident, with both stuck on level 1 for the whole run. The log contains only self-talk and chess reasoning, never a submission. (#2574, #3413)
2. **The residents appear to be playing a chess match, not the stated level task.** The story is named chess-moves-threats-g4-p80, but the residents talk about games 1 to 4 and a match score in points (#1708, #1721, #2574). They never discuss a level goal or a submission, so the task as designed is not visible in the log. (#1708, #1721, #2574, #2580)
3. **Long idle opening and minute-by-minute quiet.** The first 6 minutes contain no game action, only waiting (#35, #39), and the facts record 59 quiet minutes with no submission. The run ends with the referee at minute 58 (#3413). (#35, #39, #3413)
4. **Brain size limit blocks the residents' own notes.** Five writeBrain calls are refused for exceeding 150 words (#864, #1690, #1704, #2549, #2555). This stops the residents from saving the strategic notes they are writing right after a game ends. (#864, #1690, #1704, #2549, #2555)
5. **Both residents accept draws and shuffle rather than compete for seats.** A02 reasons that a draw is fine (#2359) and A01 plays safe shuffles such as Kh1 and Kg1 (#2574). A01 also concludes a draw still leaves it on track in the match (#2231), so the residents stop pushing for wins. (#2231, #2359, #2574)

## Optimizations

- **State the level task and success condition in the opening prompt.** Residents spent minute 0 waiting for a game to start (#35, #39) and then played a chess match with match points (#1708). The prompt should name the level, the goal and what counts as a submission so the residents act on the real task. (#35, #39, #1708)
- **Raise or trim the brain word limit.** Five BRAIN_TOO_LONG refusals at 161 to 185 words against a 150 limit (#864, #1690, #1704, #2549, #2555). Either raise the limit or tell residents the cap in the writeBrain tool description so they trim before saving. (#864, #1690, #1704, #2549, #2555)
- **Give a countdown that makes late-game material gambles risky.** A01 planned a last-move promotion purely because material would look better if the game ended at move 40 (#3405). A visible move cap and a final scoring readout would make that exploit visible and stop it deciding games. (#3383, #3391, #3405)
- **Prompt for a concrete plan by an early move.** A02 itself notes that passive shuffling only earned a draw and that it needs a real plan by move 15 (#2580). Adding that instruction to the persona or opening brief would stop the shuffle draws seen in #2359 and #2574. (#2359, #2574, #2580)

## Loophole candidates

1. **Promoting on the last move to pad material at the move cap.** (residents) A01 reasons that promoting on d1 would improve the material tally if the game ends at move 40 (#3405), while A02 expects the pawn to be captured by Ke2 (#3391). This uses the material tiebreak against its purpose, aiming to win on the scoreboard rather than on the board. (#3383, #3391, #3405)
2. **Deliberate repetition to bank a draw while already ahead in the match.** (residents) A01 notes it is ahead 1.5 to 0.5 and that a draw keeps it on track (#2231), then plays safe shuffles (#2574). A02 also treats a repetition draw as acceptable (#2359, #2387), so both residents can coast on the match score instead of competing. (#2231, #2359, #2387, #2574)

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
- line 101: event "move_played" (seq 101) does not match its schema
- and 653 more
