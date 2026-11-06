# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-solo-vs-engine2` |
| Seed | 23 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 39 (referee) |
| Counted | events #2 to #1832 (1387 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 39 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.077 USD for this run (competitors 0.077, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 40 of 40 minutes without a submission; longest without one: minutes 0-39 (40) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2, NO_CONSENSUS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played three full games against the engine while stuck on level 1** A01 lost game 1 by blockade at #364, won game 2 after cutting O to two pieces at #1118, and was still mid-game 3 when the referee ended the run at #1832. The level-1 counter never advanced because no submission was ever made. (#364, #1118, #1832)
- **The brain write-back failed twice on length, forcing A01 to keep shrinking its strategy notes** A01 was refused twice by the city: BRAIN_TOO_LONG at #352 (314 words against a 300 limit) and again at #1106 (388 words). Between them it recorded a 220-word version at #364 and a 264-word version at #1118, spending early minutes on housekeeping instead of play. (#352, #364, #1106, #1118)
- **The mill-reopen loop became A01's main winning pattern in game 2** From #631 onward A01 repeatedly stepped its mill piece out (23→24, 23→22) and back to re-close 17-20-23, removing an O piece each cycle (#666, #724, #782, #840, #898). This grinding cycle drove O from eight pieces to three by minute 17. (#631, #653, #666, #898)
- **A01 correctly pinned all three remaining O pieces and then passed to force a release** At #1055 A01 noted each O piece guarded a different line and used its free piece on 15 to pass. O flew off 19 at #1076, and A01 took 11→19 to complete the mill and finish the game. (#1055, #1076, #1077)
- **Game 3 opened with a team-consensus failure that cost A01 a move** A01 started game 3 at #1127 with a viewBoard, and its first playMove was refused with NO_CONSENSUS at #1138. It only resumed reasoning about a placement at #1167, so the opening move was lost to a tool error. (#1127, #1138, #1167)
- **The run ended with A01 about to win game 3** At #1801 A01 reasoned that closing the mill 23→22 would leave O with two pieces and lose the game, but the referee ended the run at minute 39 before the move resolved (#1832). (#1801, #1832)

## Problems

1. **The run produced no level progress at all** A01 stayed on level 1 from minute 0 to minute 39 with zero submissions, zero transfers and no DMs or posts. The whole 1387-event log is engine play that the level counter never saw. (#40, #1832)
2. **The brain length limit is too tight for the strategy A01 accumulates** A01's writeBrain was refused for exceeding 300 words at #352 and again at #1106, forcing it to compress or lose lessons. A resident playing three long games cannot fit its playbook in 300 words. (#352, #1106)
3. **The NO_CONSENSUS refusal blocked a legal opening move** At #1138 A01's playMove was refused with NO_CONSENSUS even though no other resident existed to disagree. A single resident cannot form a team consensus, so the check misfires. (#1138)
4. **A01 never used any social mechanism** The facts record 0 DMs, 0 board posts, 0 group posts and 0 transfers across the run, though the story is a social game about competing for seats. A01's only self-directed speech is private monologue, e.g. #407 and #528. (#407, #528)
5. **The gamemaker took no actions** The facts show no gamemaker actions and no labels for the entire run, so nothing pushed the story or reacted to A01's long stall. A game that ran three full engine matches without a single gamemaker beat is effectively unmanaged. (#1832)

## Optimizations

- **Give residents an explicit path from engine games to level submissions** A01 played three games but never submitted a solution; add a prompt step after each game that asks the resident whether the board it solved counts as a level submission. Evidence: games finished at #364 and #1118 with 0 submissions and no level-ups. (#364, #1118)
- **Raise or auto-summarize the brain word limit** Two writeBrain refusals cost A01 in-run time (#352, #1106); the harness should either raise the 300-word cap or automatically compress the brain on refusal instead of discarding it. (#352, #1106)
- **Skip the consensus check when only one resident is active** The NO_CONSENSUS refusal at #1138 blocked a legal first move in a solo city; make the consensus requirement conditional on two or more active residents. (#1138)
- **Add a gamemaker beat when a resident is stuck for many minutes** A01 sat on level 1 for the full 39 minutes with no intervention; a scripted gamemaker hint or event after, say, 10 minutes would keep the story moving. Evidence: stall from minute 0 to 39 and no gamemaker actions (#40, #1832). (#40, #1832)
- **Give the resident a reason to use messages or transfers** With 0 DMs and 0 transfers the social layer never engaged; the story should hand a resident a goal that requires contacting another resident or spending points. Evidence: zero social events across #2-#1832, alongside private-only notes like #528. (#528)
- **Lower the repetition risk in the mill-reopen loop** The out-and-back mill cycle (#631 through #898) ran many turns of near-identical moves; cap repeated reopens or make the engine respond differently to avoid a grind. (#631, #653, #885, #898)

## Loophole candidates

1. **A01 used the reopen-and-reclose mill as a free piece-removal engine** (residents) Stepping 23→24 or 23→22 and back each turn re-closed the same mill and removed another O piece (#653, #711, #769, #827, #885), turning one mill into repeated captures. This grinds the engine down rather than strategizing a new attack. (#653, #711, #769, #885)
2. **A01 passed a turn with an unused piece to force the opponent to move** (residents) At #1055 A01 deliberately moved a piece uninvolved in any pin to make O release a pinned square, manufacturing a threat from a null move. The engine then flew off 19 (#1076) and A01 won on the next move. (#1055, #1076)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 18: event "team_post" (seq 18) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 42: event "game_started" (seq 42) does not match its schema
- line 57: event "move_proposed" (seq 57) does not match its schema
- line 58: event "consensus_reached" (seq 58) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 68: event "move_scored" (seq 68) does not match its schema
- line 77: event "move_proposed" (seq 77) does not match its schema
- line 78: event "consensus_reached" (seq 78) does not match its schema
- line 86: event "move_played" (seq 86) does not match its schema
- line 87: event "move_played" (seq 87) does not match its schema
- line 88: event "move_scored" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 98: event "move_proposed" (seq 98) does not match its schema
- line 99: event "consensus_reached" (seq 99) does not match its schema
- line 106: event "move_played" (seq 106) does not match its schema
- and 425 more
