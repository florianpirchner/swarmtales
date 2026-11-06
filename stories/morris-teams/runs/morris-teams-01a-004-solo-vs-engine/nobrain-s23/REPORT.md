# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-nobrain-solo-vs-engine2` |
| Seed | 23 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 45 (referee) |
| Counted | events #2 to #1877 (1436 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 45 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.075 USD for this run (competitors 0.075, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 46 of 46 minutes without a submission; longest without one: minutes 0-45 (46) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_CONSENSUS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 lost game 1 during placement to a double threat it could not block** A01 reasoned that O's placements on 5 and 23 created simultaneous threats on 22-23-24 and 3-15-24, and that it could only block one (#166). It then reported the loss: O closed a mill and reduced it to two pieces after 42 turns (#552, #553). (#166, #552, #553)
- **A01 won game 2 by freezing O out of legal moves** A01 closed the 2-5-8 mill (#1082) and reported that O was left with no legal move after 38 turns (#1100). This is the only win recorded in the log and came from a full-board freeze, not a points submission. (#1082, #1100)
- **A01's mill-shuttle cycle 19-20-8-9 drove repeated captures** A01 repeatedly slid 20 to 19 to re-form the 4-11-19 mill (#919, #945) and 8 to 9 to re-form 9-13-18 (#1372, #1439, #1506, #1547). Each cycle removed an O piece, which is how it ground game 2 and game 3 down. (#919, #945, #1372, #1439, #1547)
- **The run ended with a NO_CONSENSUS tool error on A01's own move** At minute 38 A01's playMove was refused with NO_CONSENSUS, the team has not agreed on a move (#1635), even though A01 is the only resident. It recovered four minutes later by proposing the same 8-to-9 move in reasoning (#1639). (#1635, #1639)
- **A01 never submitted a level solution in 45 minutes** Although A01 played three games of Morris through the reasoning log (#553 game 1 loss, #1100 game 2 win, #1716 game 3), the run recorded no correct or wrong submissions and A01 stayed at level 1. (#553, #1100, #1716)

## Problems

1. **A01 was stuck on level 1 for the entire 45-minute run** A01 was on level 1 from minute 0 to minute 45 with no level-ups and no submissions. All effort went into in-game Morris play rather than into producing a submitted solution. (#553, #1100, #1716, #1877)
2. **The team tool refused a move when only one resident existed** The playMove call returned NO_CONSENSUS meaning the team had not agreed, but A01 is the sole resident (#1635). The consensus mechanic stalls a solo agent for at least four minutes before it retries. (#1635, #1639)
3. **A01 played Morris but the story recorded no levels, points or standings** The facts show zero levels solved, unknown standings, and no board posts or DMs. A01's own narration (#553, #1100) is the only account of what it did, so the design gets no measurable progress from three games. (#552, #553, #1100, #1716)
4. **A01 debated posting to the team channel and then stayed silent** It weighed posting a note at #552, and the facts confirm 0 DMs and 0 board posts for the whole run. The social channel the story provides was never used. (#552)
5. **Long stretches of repeated reasoning with no action** Much of the middle game is near-duplicate scans for threats and removal choices (#893, #987, #1480, #1774, #1800), consuming minutes 20-43 without any submissions or state changes. (#893, #987, #1480, #1774, #1800)

## Optimizations

- **Let a solo resident move without a consensus vote** Addresses the NO_CONSENSUS refusal at #1635: when only one resident is active, playMove should auto-approve or skip the team vote so a single agent is not blocked for minutes. (#1635, #1639)
- **Give the level a submission hook, not only in-game play** Addresses the zero-submission run (#553, #1100, #1716): the harness should require or periodically prompt for a formal level answer, so game wins translate into level progress instead of staying in reasoning. (#553, #1100, #1716)
- **Cap and summarize repetitive threat-scan reasoning** Addresses the repeated near-identical scans (#893, #987, #1480, #1774): add a board state summary in the prompt or a reasoning budget so A01 spends minutes 20-43 on moves, not re-derivation. (#893, #987, #1480, #1774)
- **Prompt residents to actually use the social channel** Addresses A01 deciding against posting and then never speaking (#552): the story promised a team channel but delivered silence, so seed the run with an explicit team instruction or periodic message prompt. (#552)
- **Make the run end state reflect the games played** Addresses the mismatch between three narrated Morris games and a report of no levels, no points, unknown standings (#1100, #1716): record in-game results as scored outcomes so designers can see what happened. (#1100, #1716, #1877)

## Loophole candidates

1. **Mill-shuttle cycle farmed captures without progress** A01 repeatedly opened and re-closed the same mills (20→19 at #945, 8→9 at #1082 and later) to remove pieces each turn. This exploits the game's mill rule but does not help the city's seat competition, which counts no transfers or seats. (#945, #1082, #1372)
2. **A solo resident treated its own reasoning as team consensus** (residents) A01's own reasoning proposed the move that the refused playMove then blocked (#1635, #1639), showing the consensus gate can be bypassed in effect by simply retrying, making the team mechanic nominal. (#1635, #1639)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 16: event "move_proposed" (seq 16) does not match its schema
- line 17: event "consensus_reached" (seq 17) does not match its schema
- line 24: event "move_played" (seq 24) does not match its schema
- line 25: event "move_played" (seq 25) does not match its schema
- line 26: event "move_scored" (seq 26) does not match its schema
- line 27: event "move_scored" (seq 27) does not match its schema
- line 41: event "move_proposed" (seq 41) does not match its schema
- line 42: event "consensus_reached" (seq 42) does not match its schema
- line 50: event "move_played" (seq 50) does not match its schema
- line 51: event "move_played" (seq 51) does not match its schema
- line 52: event "move_scored" (seq 52) does not match its schema
- line 53: event "move_scored" (seq 53) does not match its schema
- line 67: event "move_proposed" (seq 67) does not match its schema
- line 68: event "consensus_reached" (seq 68) does not match its schema
- line 75: event "move_played" (seq 75) does not match its schema
- line 76: event "move_played" (seq 76) does not match its schema
- line 77: event "move_scored" (seq 77) does not match its schema
- line 78: event "move_scored" (seq 78) does not match its schema
- line 93: event "move_proposed" (seq 93) does not match its schema
- and 421 more
