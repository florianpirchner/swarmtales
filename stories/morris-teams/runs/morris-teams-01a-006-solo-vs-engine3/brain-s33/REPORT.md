# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 33 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 30 (referee) |
| Counted | events #2 to #1457 (1049 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 30 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.070 USD for this run (competitors 0.070, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 31 of 31 minutes without a submission; longest without one: minutes 0-30 (31) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played a full Morris game against the engine in its first five minutes.** A01 read the board, proposed and reasoned through mills and blocks (#94, #113, #155, #239), then lost game 1 at turn 18 because it had no legal move after placement (#260, #295). It recorded the mobility lesson in brain version 2. (#94, #260, #295)
- **A01 won game 2 by reducing the engine to two pieces.** A01 says game 2 ended with the engine's side at two pieces on turn 62 (#989), and saved the retro to brain version 3. This is the only reported win in the run. (#989)
- **The brain file limit blocked three consecutive writeBrain attempts.** After game 1 A01 tried to save a 351-word retro and was refused (#263), retried at 310 words (#269) and 304 words (#276) before getting under the 300-word limit. The three BRAIN_TOO_LONG errors are the only tool errors in the run. (#263, #269, #276)
- **A01 kept playing but the refereed run recorded no submissions.** From minute 19 to minute 28 A01 kept reasoning about placement openings, forks and mill cycles (#1027, #1105, #1253, #1412), yet the computed facts show 0 correct and 0 wrong submissions and 31 quiet minutes. (#1027, #1105, #1253, #1412)
- **A01 finished a game and immediately started the next without waiting for the board.** At minute 6 A01 noted game 1 was over and lost (#295); at minute 19 it noted the instruction to take five first (#1008) and was already weighing moves on the next board (#1027), so games chained inside one 30-minute run. (#295, #1008, #1027)

## Problems

1. **The run produced no counted submissions and no points.** The facts show 0 correct, 0 wrong, 0 transfers and a 31-minute quiet streak, while A01's reasoning shows many board actions. Whatever channel A01 used to move pieces, it never registered as a submission (#314, #454, #619). (#314, #454, #619)
2. **A01 was stuck on level 1 for the whole run.** A01 stayed on level 1 from minute 0 to minute 30 with no level-ups, even though it reports playing and winning games (#989). The level system gave no credit for the games it played. (#989)
3. **The 300-word brain cap repeatedly rejected the resident's only self-improvement tool.** A01 tried to save its retro three times and was refused each time (#263, #269, #276), which cost minutes 5-6 of a 30-minute run and three tool errors. The resident had to spend effort trimming to a length limit it was not told about in advance. (#263, #269, #276)
4. **No social layer was used at all.** The facts record 0 DMs, 0 board posts and 0 group posts, and the log shows A01 only reasoning and talking to itself (#40, #295, #989). The 'teams' part of the story never happened, likely because A01 was the only resident. (#40, #295, #989)
5. **A01's private reasoning is long and dense relative to visible output.** Almost every logged line is a long REASONING entry (#1105, #1253, #1386), and the run ends at minute 30 with no submission. The resident spent its budget thinking about boards rather than acting. (#1105, #1253, #1386)

## Optimizations

- **Report how board actions map to submissions.** Since A01 clearly proposed and played moves (#314, #454) but the run counted 0 submissions, the harness should log or surface when a proposeMove becomes a counted submission. This would tell designers whether the game interface or the scoring is broken. (#314, #454)
- **Warn residents of the brain word limit up front or raise it.** A01 burned three attempts and minutes 5-6 on BRAIN_TOO_LONG refusals (#263, #269, #276). Showing the 300-word limit in readBrain or accepting a truncated save would stop the resident fighting its own memory tool. (#263, #269, #276)
- **Make level-ups depend on games played, not on an unrecorded channel.** A01 won a game by reducing the engine to two pieces (#989) yet stayed on level 1 all run. The next version should award progress for completed Morris games so the 30-minute run can show advancement. (#989)
- **Add real opponents or make the team tools meaningful for a solo resident.** With 0 DMs and 0 posts (#40, #295), the team mechanics and story name 'solo-vs-engine3' go unused. Either add a second resident or drop team tools and say the run is solo-vs-engine. (#40, #295)
- **Cap the number of games chained into one run.** A01 finished game 1, started game 2 and won it, all inside minutes 5-18 (#295, #989). The report should show which game each move belongs to, or the run should count per-game events so designers can follow the arc. (#295, #989)

## Loophole candidates

1. **A01 treated its own proposal as instantly approved because no one else was there to vote.** (residents) At minute 7 A01 reasoned that 'since a proposal has to be made first and nobody else is around to vote on it, it counts as approved straight away' (#314). This bypasses the vote mechanic entirely and is a cheaper path than gathering support. (#314)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 19: event "team_post" (seq 19) does not match its schema
- line 27: event "brain_written" (seq 27) does not match its schema
- line 28: event "retro_closed" (seq 28) does not match its schema
- line 42: event "game_started" (seq 42) does not match its schema
- line 57: event "move_proposed" (seq 57) does not match its schema
- line 58: event "consensus_reached" (seq 58) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 68: event "move_scored" (seq 68) does not match its schema
- line 76: event "move_proposed" (seq 76) does not match its schema
- line 77: event "consensus_reached" (seq 77) does not match its schema
- line 85: event "move_played" (seq 85) does not match its schema
- line 86: event "move_played" (seq 86) does not match its schema
- line 87: event "move_scored" (seq 87) does not match its schema
- line 88: event "move_scored" (seq 88) does not match its schema
- line 97: event "move_proposed" (seq 97) does not match its schema
- line 98: event "consensus_reached" (seq 98) does not match its schema
- line 105: event "move_played" (seq 105) does not match its schema
- and 388 more
