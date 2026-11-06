# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 26 (referee) |
| Counted | events #2 to #1281 (920 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 26 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.057 USD for this run (competitors 0.057, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 27 of 27 minutes without a submission; longest without one: minutes 0-26 (27) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2, NO_CONSENSUS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 spent the whole run on level 1 without a single submission** Across 920 events from minute 0 to minute 26 A01 never submitted a move; the referee ended the run at #1281. Every minute was quiet, so the design never got past the first board. (#15, #38, #1281)
- **Three games ran inside the single run, all lost by A01** A01 reports game 1 ended after 50 turns with it reduced to two pieces (#591), game 2 lost after 33 turns with X down to two pieces (#1027), and a third board was still in progress at the end (#1246, #1268). None of these counted as a solved level. (#591, #1027, #1246, #1268)
- **The multi-agent framing broke: A01 negotiated a move consensus with itself** A01 was the only resident, yet playMove was refused with NO_CONSENSUS because 'the team has not agreed on a move' (#726). A01 had planned to post a team message and read teammates (#15, #31) that did not exist. (#15, #31, #726)
- **A01 diagnosed the losing pattern and revised its own brain twice** After game 1 A01 traced the loss to O forking at 14/15/24 and saved brain version 2 (#576, #591). After game 2 it named the 17/20 mill shuttle as the unstoppable threat and saved brain version 3 (#1004, #1027). (#576, #591, #1004, #1027)
- **Both brain writes that mattered were refused for length** The version-2 brain was rejected at 308 words and the version-3 brain at 341 words against a 300-word cap (#579, #1014). A01 then claimed versions of 222 and 266 words (#591, #1027), but those are its own claims, not verified saves. (#579, #591, #1014, #1027)
- **A01 played both sides of the board in its own reasoning** In game 2 A01 first reasoned as the opening player choosing 20 or 5 (#609), then proposed 'O' moves and hunted O fork points (#628, #665, #701), then moved its own mill at 16 as X (#1132). It never resolved which side it was playing. (#609, #628, #665, #1132)

## Problems

1. **No level was ever solved and no submission was ever made** The computed facts show 0 correct and 0 wrong submissions and A01 stuck on level 1 for all 26 minutes. The run produced no scored progress for the story at all. (#726, #1281)
2. **Team mechanics were activated for a one-resident game** A01's opening plan was a team message (#15) and the toolset offered postTeam and castVote (#31), yet there were 0 DMs and 0 board posts. The only result of these tools was a NO_CONSENSUS refusal (#726). (#15, #31, #726)
3. **The 300-word brain cap blocked the strategy updates** Two writeBrain calls were refused with BRAIN_TOO_LONG at 308 and 341 words (#579, #1014) in the only moments A01 was consolidating lessons. The cap is small relative to the detailed line-by-line notes A01 generates. (#579, #1014)
4. **A01 lost track of which side it was playing** Within game 2 A01 reasons as the first mover picking 20 or 5 (#609), later plans O forks (#665, #701), and later still completes its own mill as X at 16 (#1132). This ambiguity corrupts the strategy notes it tries to save. (#609, #665, #701, #1132)
5. **The run ended mid-game with no referee outcome** The facts list final standings as unknown and the last event is the referee stopping at minute 26 (#1281) while A01 was mid-analysis of a forced move 13 to 18 (#1268). Games were abandoned rather than finished and scored. (#1268, #1281)
6. **No gamemaker activity or feedback loop** The facts record no gamemaker actions, no labels and no messages, and the log shows the gamemaker never stepping in. A01's only feedback was self-reflection in SAYS TO ITSELF lines (#591, #1027). (#591, #1027)

## Optimizations

- **Disable team tools in solo runs** Because A01 alone produced a NO_CONSENSUS refusal (#726) and wasted its opening on a nonexistent team message (#15), the harness should hide proposeMove, castVote, postTeam and readTeam when only one resident is seated. (#15, #31, #726)
- **Raise or summarise the brain word limit** The 300-word cap rejected the two brain versions that contained A01's distilled lessons (#579, #1014); allow a larger cap or auto-summarise to 300 words so the learning persists. (#579, #1014)
- **Make the resident's side explicit on every turn** A01 reasoned as both X and O in one game (#609, #1132); include the side and the turn in each board view so the resident cannot switch perspective. (#609, #628, #1132)
- **Cap or time-box games so a level can be solved** A01 chained unsolved games and the referee cut the run mid-move at #1281 with no standings; set a per-level turn limit and a scored outcome so a submission can register. (#591, #1027, #1268, #1281)
- **Give the gamemaker a role in a one-resident run** The gamemaker took no actions and issued no labels in a run where A01 floundered for 26 minutes (#591, #1027); have it nudge or reset a resident that is stuck on level 1 from minute 0. (#591, #1027, #1281)
- **Reduce the reasoning-to-action ratio** Nearly every event in the log is a REASONING line with almost no plays; require a move proposal after a fixed number of reasoning steps to convert analysis into submissions. (#600, #982, #1224)

## Loophole candidates

1. **A01 wrote to itself to record results the city never verified** (residents) A01 used SAYS TO ITSELF lines to announce brain versions and game outcomes (#591, #1027) after writeBrain was refused (#579, #1014), creating an unverified narrative record. (#579, #591, #1014, #1027)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 18: event "team_post" (seq 18) does not match its schema
- line 25: event "brain_written" (seq 25) does not match its schema
- line 26: event "retro_closed" (seq 26) does not match its schema
- line 40: event "game_started" (seq 40) does not match its schema
- line 56: event "move_proposed" (seq 56) does not match its schema
- line 57: event "consensus_reached" (seq 57) does not match its schema
- line 59: event "move_played" (seq 59) does not match its schema
- line 60: event "move_played" (seq 60) does not match its schema
- line 61: event "move_scored" (seq 61) does not match its schema
- line 62: event "move_scored" (seq 62) does not match its schema
- line 70: event "move_proposed" (seq 70) does not match its schema
- line 71: event "consensus_reached" (seq 71) does not match its schema
- line 73: event "move_played" (seq 73) does not match its schema
- line 74: event "move_played" (seq 74) does not match its schema
- line 75: event "move_scored" (seq 75) does not match its schema
- line 76: event "move_scored" (seq 76) does not match its schema
- line 91: event "move_proposed" (seq 91) does not match its schema
- line 92: event "consensus_reached" (seq 92) does not match its schema
- line 94: event "move_played" (seq 94) does not match its schema
- and 341 more
