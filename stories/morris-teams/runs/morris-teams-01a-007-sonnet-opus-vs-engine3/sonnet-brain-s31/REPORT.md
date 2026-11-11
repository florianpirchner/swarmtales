# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 31 (referee) |
| Counted | events #2 to #1526 (1062 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 31 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.688 USD for this run (competitors 0.688, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 32 of 32 minutes without a submission; longest without one: minutes 0-31 (32) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2, NO_CONSENSUS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 spent the entire run alone on level 1 and never submitted.** A01 opened by noting it had written a strategy brain but no game had started yet (#21), and from minute 1 onward it only reasoned privately about placements and mills (#50, #69). No submission was ever made, and the run ended at minute 31 with A01 still on level 1 (#1526). (#21, #50, #1526)
- **A01's first game was lost by blockade within the placement phase.** A01 reasoned through mills and forks (#69, #105) but then reported losing game 1 by blockade after turn 20, with its pieces packed into one cluster (#292). This is the only concrete game outcome in the log. (#69, #292)
- **The brain-writing tool rejected A01 twice for exceeding the word limit.** At minute 6 A01's writeBrain was refused with BRAIN_TOO_LONG at 350 words against a 300-word limit (#280), and at minute 14 the same refusal came at 357 words (#779). A01 therefore never got an updated brain accepted during the run. (#280, #779)
- **A team-style move mechanic refused A01's move for lack of consensus.** At minute 7 A01's playMove was refused with NO_CONSENSUS, saying the team had not agreed on a move (#355), even though the facts show A01 was the only resident listed. This blocked at least one action in a game A01 was otherwise playing alone. (#355)
- **A01 played many games but the run is scored as zero levels solved.** A01's reasoning references game 1 (#292), an O mill at 1-2-3 in a later game (#737), and later still a run of games through minute 30 (#1468, #1507). Despite this continuous play, the final minute shows no level-ups and no submissions recorded. (#292, #737, #1468, #1507)
- **A01 repeatedly faced opponent 'shuttle' mills it could not block.** A01 identified O's repeated mill on 4-11-19 and its 19-to-20 shuttle (#516, #539) and later a 7-12-16 mill it could not reach (#1017). These unwinnable-block situations recur across games and drove A01 into losing or drawn lines. (#516, #539, #1017)

## Problems

1. **Residents-only observation: A01 never submitted a single move or level solution.** The facts show 0 correct and 0 wrong submissions, and 32 quiet minutes with no submission (#1526). A01 spent all its time reasoning and writing brain updates, so the story's core progression (solving levels) never occurred. (#1526)
2. **Brain updates were impossible because the word limit was never communicated or enforced in time.** Two writeBrain calls were refused as BRAIN_TOO_LONG (#280, #779). A01 was drafting over 300 words without apparently knowing the limit beforehand, so the strategy-learning loop the story intends was blocked twice. (#280, #779)
3. **NO_CONSENSUS refused a move for a single-resident team.** The playMove at minute 7 was refused because 'the team has not agreed on a move' (#355), but the run lists A01 as the sole resident. The consensus mechanic fired against a one-member team, which is a rules mismatch. (#355)
4. **Cost and effort went into private reasoning with no visible gameplay.** Nearly every log line from #21 to #1507 is A01 talking or reasoning to itself, with no DMs, board posts, or group posts. The spend of 0.688 USD produced no submitted moves, so the harness is charging for invisible deliberation. (#21, #1507)
5. **Game progress is invisible to the fact table: A01 reports playing many games but the run records none solved.** A01's reasoning refers to lost game 1 (#292) and later games (#737, #1468), yet the computed facts show no level-ups and the run ends with A01 stuck on level 1 (#1526). The log and the scoreboard disagree, so the designers cannot tell what actually happened. (#292, #737, #1526)
6. **No gamemaker actions and no labels leaves the referee with nothing to steer.** The facts show the gamemaker took no actions and no labels were applied. A01 got no feedback or nudge across 31 minutes, which likely contributed to it thrashing between games. (#1526)

## Optimizations

- **Surface the brain word limit before drafting.** Show the 300-word cap in the writeBrain prompt so A01 stops wasting turns on refused updates; both refusals (#280, #779) cost it a full step. Problem addressed: repeated BRAIN_TOO_LONG refusals. (#280, #779)
- **Skip consensus for single-resident teams.** When only one resident is in a team, playMove should not require NO_CONSENSUS, which refused a legal move at minute 7 (#355). Problem addressed: consensus mechanic firing against a one-member team. (#355)
- **Require at least one submission per game window.** The harness should force or prompt a submitted move each game rather than letting A01 deliberate for 31 minutes with 0 submissions (#1526). Problem addressed: the all-quiet, no-submission stall. (#1526)
- **Make game outcomes visible in the fact table.** A01 reports a lost game 1 by blockade (#292) that never appears as a level result; record each game result so the scoreboard matches the reasoning log. Problem addressed: log/scoreboard mismatch. (#292, #1526)
- **Have the gamemaker intervene during stalls.** With 0 gamemaker actions across the run and A01 stuck for 31 minutes, the gamemaker could post a hint or reset a deadlocked game. Problem addressed: no intervention despite a full-run stall. (#1526)

## Loophole candidates

1. **A01 used private reasoning as a safe substitute for acting.** (residents) A01 spent the run reasoning to itself (#69, #131, #1063) instead of submitting moves, effectively avoiding risk at the cost of all progress. This is a cheaper path than playing but defeats the story's intent. (#69, #131, #1063)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 9: event "brain_written" (seq 9) does not match its schema
- line 10: event "retro_closed" (seq 10) does not match its schema
- line 27: event "game_started" (seq 27) does not match its schema
- line 34: event "move_proposed" (seq 34) does not match its schema
- line 35: event "consensus_reached" (seq 35) does not match its schema
- line 42: event "move_played" (seq 42) does not match its schema
- line 43: event "move_played" (seq 43) does not match its schema
- line 44: event "move_scored" (seq 44) does not match its schema
- line 45: event "move_scored" (seq 45) does not match its schema
- line 53: event "move_proposed" (seq 53) does not match its schema
- line 54: event "consensus_reached" (seq 54) does not match its schema
- line 61: event "move_played" (seq 61) does not match its schema
- line 62: event "move_played" (seq 62) does not match its schema
- line 63: event "move_scored" (seq 63) does not match its schema
- line 64: event "move_scored" (seq 64) does not match its schema
- line 72: event "move_proposed" (seq 72) does not match its schema
- line 73: event "consensus_reached" (seq 73) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_played" (seq 82) does not match its schema
- and 444 more
