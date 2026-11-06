# morris-teams-03a-005-team-vs-engine

One sample of the team arm against the engine (decided by the coordinator for Flo, 2026-11-06): a team of
three Haiku residents (A01-A03, captain rotating, proposal and vote before each move) with a brain plays X
against the engine at depth 2 (`morris-teams-vs-engine2`, seed 21), three games.

| Folder | Game 1 (X starts) | Game 2 (engine starts) | Game 3 (X starts) | X blunders | Cost |
|---|---|---|---|---|---:|
| `team-s21` | draw (repetition, 31 turns, 9 v 8) | X (engine blocked, 26) | X (pieces, 47) | 0 | 0.27 USD |
| `team-s21-stopped` | X (pieces, 45) | X (engine blocked, 24) | (stopped: container restart) | 0 | not recorded |

The first attempt was cut off by a container restart after two games (P87); it is kept as `team-s21-stopped`
and not counted. The full match: **2 wins, 1 draw, 0 forfeits, 0 blunders** by the referee's count (2 missed
wins). The team plays at least as well as a single agent (solo: 1.3-1.5 blunders per 100 turns), at three
times the cost per game (0.09 USD against about 0.03 solo).

## Digest highlights

- **The same engine weakness:** game 2 again ends with the engine blocked after 26 turns (P107), in the stopped
  attempt too (24 turns).
- **An early draw by repetition:** game 1 ended after 31 turns at 9 v 8, a single sample; no solo draw came
  this early (the earliest after 42 turns).

## Problems

- P107 (engine blocks itself), P105 and P103 as in `morris-teams-01a-004-solo-vs-engine`.
- P87: a container restart killed the first attempt; relaunched from scratch.

## Optimizations (proposals, not built)

- One match says nothing about teams against solo; if the team arm matters, run four matches like the solo
  arms (about 1.1 USD).

## Loopholes

None found.
