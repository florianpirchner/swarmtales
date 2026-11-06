# morris-teams-01a-006-solo-vs-engine3

The last morris round, decided by the coordinator for Flo (2026-11-06, budget about 2 USD): P107 fixed (the
search's evaluation now counts, while placing, the steps every piece on the board will have and a penalty for
a piece with no free neighbour), then one Haiku agent (A01, X) against the engine at **depth 3**
(`morris-teams-solo-vs-engine3` and `morris-teams-nobrain-solo-vs-engine3`), 4 matches of 3 games per arm
(seeds 31-34 in both arms; X starts games 1 and 3). **0 forfeits, 0 illegal moves played** in 24 games.

## Result

| Folder | Arm | Game 1 (X starts) | Game 2 (engine starts) | Game 3 (X starts) | X blunders | Cost |
|---|---|---|---|---|---:|---:|
| `brain-s31` | brain | O (pieces, 50) | O (pieces, 33) | O (X blocked, 24) | 0 | 0.06 USD |
| `brain-s32` | brain | O (X blocked, 18) | O (pieces, 41) | draw (repetition, 42) | 0 | 0.06 USD |
| `brain-s33` | brain | O (X blocked, 18) | X (pieces, 62) | O (pieces, 38) | 1 | 0.07 USD |
| `brain-s34` | brain | O (X blocked, 20) | O (pieces, 85) | O (X blocked, 18) | 3 | 0.10 USD |
| `nobrain-s31` | no brain | O (X blocked, 18) | O (pieces, 37) | O (X blocked, 18) | 1 | 0.03 USD |
| `nobrain-s32` | no brain | O (X blocked, 32) | O (pieces, 41) | O (X blocked, 30) | 0 | 0.05 USD |
| `nobrain-s33` | no brain | O (X blocked, 20) | draw (repetition, 27) | O (X blocked, 18) | 1 | 0.02 USD |
| `nobrain-s34` | no brain | O (X blocked, 20) | O (pieces, 61) | O (X blocked, 20) | 1 | 0.05 USD |

| Arm | Games | Haiku wins / losses / draws | Lost blocked | Turns | X blunders per 100 turns |
|---|---:|---|---:|---:|---:|
| brain | 12 | 1 / 10 / 1 | 5 | 449 | 0.9 |
| no brain | 12 | 0 / 11 / 1 | 8 | 342 | 0.9 |

Cost 0.45 USD for 24 games, plus about 0.02 USD for the reporter drafts. Against depth 2 (run 01a-004)
Haiku won 14 of 24; against the fixed engine at depth 3 it wins 1.

## Digest highlights

- **The fix turned the engine's weakness into its weapon.** The engine that walled itself in at depth 2 now
  walls Haiku in: 13 of the 21 losses end with X having no legal move, 10 of them on turn 18 to 20, the first
  turns after the placing (P200).
- **The brain names the danger and loses to it anyway.** After a blockade loss A01 wrote "Avoid boxing our
  pieces (G2: 3,4,5,20,21 became dead). Keep 2+ free neighbours per piece" (brain-s34 v3) and lost game 3
  blocked on turn 18. Games in the brain arm last longer (449 turns against 342) and end blocked less often
  (5 against 8), and the one Haiku win is in the brain arm (brain-s33 game 2, O cut to two pieces after 62
  turns). On 12 games a side this is a hint, not an effect.
- **The engine's habits, as the brains saw them:** "always blocks an open two at once; re-blocks after we
  remove its blocker; forks when it can" (brain-s32 v3).

## Problems

- **P200:** Haiku cannot keep its pieces mobile through the placing against a search that plans for it.
- **P201:** the referee and the engine now share the same search and depth: every engine turn scores "best",
  and Haiku's blunder rate (0.9 per 100 turns) is lower than against depth 2 although it loses nearly every
  game. The referee measures against the opponent itself, so its classes say little here.
- **P202:** no brain effect, for the third time (P106, P109).
- **P105 again:** 8 `BRAIN_TOO_LONG` refusals in the brain arm.
- **P103 again:** the reporter drafts (`REPORT.md`) are left as drafts; this README is the reviewed report.

## Optimizations (proposals, not built)

- Score Haiku with a referee deeper than the engine (depth 4 with a larger node budget), or count blockade
  losses directly, instead of the shared search.
- An engine level between depth 2 and the fixed depth 3, for a balanced yardstick.
- Morris is closed after this round (the coordinator's decision): no further runs planned.

## Loopholes

None found.
