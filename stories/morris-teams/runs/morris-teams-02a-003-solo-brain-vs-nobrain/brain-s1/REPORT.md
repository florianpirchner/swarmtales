# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-solo` |
| Seed | 13 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 88 (referee) |
| Counted | events #3 to #6117 (5230 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 88 minutes (to the end); A04 on level 1 from minute 0 for 88 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.506 USD for this run (competitors 0.506, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 89 of 89 minutes without a submission; longest without one: minutes 0-88 (89) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 9, NOT_ON_MOVE 3, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 and A04 played out game 1 with no audience: no DMs, board posts or group posts all run.** The two residents negotiated every mill, block and fork through private reasoning and SAYS TO ITSELF lines only; the computed facts record 0 DMs, 0 board posts and 0 group posts for the whole run. So the story had no visible social layer at all, only two solvers talking past each other. (#16, #55, #120, #458)
- **Game 1 turned on A04 failing to stop A01's 3-15-24 mill shuttle.** A04 itself diagnosed the loss: X (A01) set up a double threat at 13 and 24 in placement and A04 could only block one (#378), and later A01 repeatedly opened and re-closed 3-15-24 while A04 could not reach 15 (#818, #1049). A01 finally won on 15→2 completing 1-2-3 (#2109). (#378, #818, #1049, #2109, #2159)
- **Both residents tried to rewrite their strategy brains after games and were rejected nine times with BRAIN_TOO_LONG.** After game 1 A04's 359-word brain and A01's 392-word brain were refused (#2162, #2176), and the same block recurred after game 2 (#4254, #4267, #4278, #4283, #4296, #4307), eating minutes 32-64 of the run. A01 only got a brain saved after trimming to 297 words (#4328). (#2162, #2176, #4254, #4307, #4328)
- **A04 was locked out of playMove while A01 held the captaincy, causing NOT_ON_MOVE refusals.** A01 noted playMove and proposeMove were locked to it while O's captain was A04 (#113, #2288), and A01's proposeMove was refused twice as NOT_ON_MOVE (#1140, #1640), while A04 hit TOOL_LOCKED calling playMove (#858). The captain/phase rule was misunderstood by both sides. (#113, #858, #1140, #1640, #2288)
- **Game 2 flipped the result: A04 beat A01 by shuttling the 1-2-3 mill via 15↔3.** A04 set up the 1-2-3 mill and repeatedly reopened it with 3→15 and reclosed with 15→3 (#3630, #3760, #3966, #3995), while A01 conceded it could not block 3 and kept playing 16→12 (#3708, #3830). A01 ended with three pieces and fly, but lost at turn 71 per its own summary (#4301, #4328). (#3630, #3708, #3995, #4301, #4328)
- **Games 3 and 4 were cut off by the 88-minute referee end with no submissions recorded.** A third game started at minute 65 with A01 opening on 5 (#4349) and a fourth game went to turn 14 of the no-mill counter in minute 86 (#6057). The run ended at minute 88 by referee (#6117) with 0 submissions and neither resident having solved a level. (#4349, #6057, #6117)

## Problems

1. **Ninety minutes of play produced no scored levels and no visible social output.** The facts show levels solved: none, submissions 0 correct and 0 wrong, and 89 of 89 quiet minutes. The whole run was two agents playing private board games with no board posts, DMs or transfers, so the intended team/social story never surfaced. (#16, #55, #6117)
2. **A hard 300-word brain limit blocked the main learning loop.** Nine BRAIN_TOO_LONG refusals (#2162, #2176, #4254, #4267, #4278, #4283, #4296, #4307) meant the residents spent long stretches retrying instead of playing. A04's own reasoning describes the game summary it was trying to write (#2159). (#2159, #2162, #2176, #4254, #4307)
3. **The captain/phase tool locking confused both residents.** A01 repeatedly concluded playMove was locked and that it must wait (#113, #61, #2273), and A04 called playMove when not on move and got TOOL_LOCKED (#858). A01 also misread whose turn it was, posting NOT_ON_MOVE refusals (#1140, #1640). (#61, #113, #858, #1140, #2273)
4. **Residents kept believing it was not their turn or that the board had not changed.** A04 logged many turns waiting because the board still showed X to move (#161, #2265, #2745, #3469, #4201, #4707, #5692), and A04 checked viewBoard repeatedly for this reason (#4392, #4442). This wasted many minutes per game. (#161, #2265, #2745, #3469, #4707, #5692)
5. **The run ended mid-game with no result recorded.** The referee ended the run at minute 88 (#6117) while game 4 was still on the no-mill counter and standings are unknown. Neither resident got a third finished game or any review time. (#6057, #6117)

## Optimizations

- **Raise or auto-trim the brain word limit.** Give writeBrain a 600-word cap or truncate gracefully instead of refusing, since nine BRAIN_TOO_LONG refusals (#2162, #4254, #4307) burned minutes and forced A01 to self-trim to 297 words (#4328). (#2162, #4254, #4307, #4328)
- **Show current turn and captaincy in every tool response.** The residents misread whose turn it was (#161, #2265, #2745) and called tools out of phase (#858, #1140, #1640); a one-line 'side to move / your captain status' header in viewBoard would remove most waiting loops. (#161, #858, #1140, #1640, #2745)
- **Make turn advance explicit instead of leaving stale boards.** A04 kept waiting because the board still showed X to move (#4201, #4707, #5692); the harness should return a change marker or a 'move registered' ack after each playMove so agents stop re-polling viewBoard. (#4201, #4707, #5692)
- **Force at least one visible team message per turn or per game.** With 0 DMs and 0 board posts the social story is empty; requiring the captain to post its reasoning to the team channel (or nudging non-captains to propose) would create the visible coordination the design intends. (#16, #55, #120)
- **Give the referee a clean stop or a longer clock to finish games.** The run ended at minute 88 mid-game (#6117) with game 4 at no-mill counter 14 (#6057); either end after a completed game or extend the clock so both residents get a recorded result and a review. (#6057, #6117)

## Loophole candidates

1. **Residents used the open/shuttle mill cycle to farm captures on an unreachable third point.** (residents) A04's 1-2-3 mill could be reopened and reclosed via 15↔3 because A01 could not reach 3 (#3630, #3995), and A01's 3-15-24 mill worked the same way against A04 (#818, #1049). This is a legal but degenerate path that decides games without any real block option for the defender. (#818, #1049, #3630, #3995)
2. **Residents mined the rulebook in private instead of using the team channel.** (residents) All coordination happened in private reasoning with 0 DMs and 0 board posts (#16, #55), so the intended team coordination was bypassed by silent solo play. (#16, #55, #120)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 28: event "team_post" (seq 28) does not match its schema
- line 35: event "team_post" (seq 35) does not match its schema
- line 42: event "brain_written" (seq 42) does not match its schema
- line 43: event "retro_closed" (seq 43) does not match its schema
- line 49: event "brain_written" (seq 49) does not match its schema
- line 50: event "retro_closed" (seq 50) does not match its schema
- line 74: event "game_started" (seq 74) does not match its schema
- line 91: event "move_proposed" (seq 91) does not match its schema
- line 92: event "consensus_reached" (seq 92) does not match its schema
- line 100: event "move_played" (seq 100) does not match its schema
- line 101: event "move_scored" (seq 101) does not match its schema
- line 127: event "move_proposed" (seq 127) does not match its schema
- line 128: event "consensus_reached" (seq 128) does not match its schema
- line 137: event "move_played" (seq 137) does not match its schema
- line 138: event "move_scored" (seq 138) does not match its schema
- line 156: event "move_proposed" (seq 156) does not match its schema
- line 157: event "consensus_reached" (seq 157) does not match its schema
- line 170: event "move_played" (seq 170) does not match its schema
- and 867 more
