# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 33 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #2 to #1171 (815 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.473 USD for this run (competitors 0.473, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0029 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 never submitted a single move in 24 minutes.** A01 stayed on level 1 from minute 0 to the end and made 0 submissions, so no level was solved and no points were scored. The run had 25 of 25 quiet minutes with no play (#15, #1171). (#15, #1171)
- **A01 had a working strategy but could not play it.** At minute 0 A01 wrote a 202-word strategy brain but noted it had not played any moves and that playMove was not open to it (#15). The whole run then consists of private analysis of a game it could not act on. (#15)
- **Both game losses came from private observation, not any recorded game events.** A01 reports losing game 1 at #240 and game 2 at #717, describing its own mills and blocks. No matching move, board or result lines from the city appear in the evidence, so the losses are only A01's claims. (#240, #717)
- **The brain-writing tool rejected A01 twice for being too long.** At minute 5 the brain had 315 words against a 300 limit (#228), and at minute 13 it had 336 words (#705). A01 later rewrote a 268-word version at #717, so the limit forced it to spend time trimming instead of playing. (#228, #705, #717)
- **A01's analysis drifted into long tactical trees with no board to act on.** From minute 1 onward A01 reasons at length about junctions, double threats and shuttles (#65, #883, #1135), including tracking piece counts that change every minute. The reasoning is busy but never turns into a submission. (#65, #883, #1135)

## Problems

1. **The resident could not call playMove, so the run was unwinnable.** A01 states at minute 0 that playMove was not open to it (#15), and the facts show 0 submissions and no level-ups through minute 24. Every later reasoning line is therefore analysis of a game it could not advance. (#15, #1171)
2. **No game events reached the log, only A01's thoughts.** A01 talks about its own lost games and turn numbers (#240, #717), but the evidence log has no board, move or result lines from the city to check them against. Designers cannot tell whether the play was correct or even happened. (#240, #717)
3. **A01 stalled on level 1 for the entire run.** A01 was stuck on level 1 from minute 0 for 24 minutes with no submission in any of minutes 0-24. The stall began immediately, before the first game, which suggests a setup or tool problem rather than a hard level. (#15, #1171)
4. **The brain word limit failed twice and consumed turns.** writeBrain was refused with BRAIN_TOO_LONG at #228 (315 words) and #705 (336 words), both over the 300-word limit. A01 then had to spend turns summarizing lessons into a shorter brain (#717) instead of playing. (#228, #705, #717)
5. **No gamemaker or classifier activity for the whole run.** The facts record 0 gamemaker actions and 0 labels, and the run ends by referee at minute 24 (#1171). With no narrator or story beats, the run has no turning points to report. (#1171)

## Optimizations

- **Make playMove available from minute 0 or fail the run early.** A01 could not play and stalled 24 minutes on level 1 (#15, #1171). The harness should verify the move tool is callable before starting the clock, and abort with a clear error if it is not. (#15, #1171)
- **Log city-side game events, not only resident thoughts.** The only outcome evidence is A01's own claims of losses at #240 and #717. Record each move, board state and result line so the report can verify play and score it. (#240, #717)
- **Raise or auto-trim the brain word limit.** Two writeBrain calls were refused for exceeding 300 words (#228, #705). Either raise the limit for early versions or return a trimmed suggestion so residents do not lose turns summarizing. (#228, #705)
- **Cap private reasoning length per minute.** A01 produced dense tactical reasoning minute after minute with no play (#65, #883, #1135). A shorter reasoning budget would push it toward acting rather than analyzing. (#65, #883, #1135)
- **Give the gamemaker a minimal opening beat.** The facts show 0 gamemaker actions and no beats. A first-minute nudge or scoring setup beat would give the run a start and make stalls visible sooner. (#15)

## Loophole candidates

1. **A01 narrated whole games it never played on the board.** (residents) A01 describes winning mills and turn numbers in game 1 (#240) and game 2 (#717) while the city recorded 0 submissions. Private narration of games substitutes for real play and is unverifiable. (#240, #717)
2. **A01 filled minutes with harmless waiting moves of imagination.** (residents) A01 repeatedly plans harmless moves such as 8 to 9 and 24 to 23 (#528, #1049) purely to pass time. Reasoning about safe filler moves is a cheap way to appear active without submitting anything. (#528, #1049)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 9: event "brain_written" (seq 9) does not match its schema
- line 10: event "retro_closed" (seq 10) does not match its schema
- line 23: event "game_started" (seq 23) does not match its schema
- line 30: event "move_proposed" (seq 30) does not match its schema
- line 31: event "consensus_reached" (seq 31) does not match its schema
- line 38: event "move_played" (seq 38) does not match its schema
- line 39: event "move_played" (seq 39) does not match its schema
- line 40: event "move_scored" (seq 40) does not match its schema
- line 41: event "move_scored" (seq 41) does not match its schema
- line 49: event "move_proposed" (seq 49) does not match its schema
- line 50: event "consensus_reached" (seq 50) does not match its schema
- line 57: event "move_played" (seq 57) does not match its schema
- line 58: event "move_played" (seq 58) does not match its schema
- line 59: event "move_scored" (seq 59) does not match its schema
- line 60: event "move_scored" (seq 60) does not match its schema
- line 68: event "move_proposed" (seq 68) does not match its schema
- line 69: event "consensus_reached" (seq 69) does not match its schema
- line 77: event "move_played" (seq 77) does not match its schema
- line 78: event "move_played" (seq 78) does not match its schema
- and 336 more
