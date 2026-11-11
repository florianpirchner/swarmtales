# morris-teams-01a-007-sonnet-opus-vs-engine3

Stronger models against the same yardstick (2026-11-11, decided by the coordinator for Flo, who approved
Sonnet and Opus runs where Haiku shows weaknesses). Same setup as run 01a-006: one agent (A01, X) against the
engine at **depth 3** (`morris-teams-solo-vs-engine3` and `morris-teams-nobrain-solo-vs-engine3`), seeds
31-34, 3 games per match (X starts games 1 and 3), `--budget 4` per match. Only the resident model changes:
`--provider anthropic --model claude-sonnet-5-5` (4 matches per arm) and `claude-opus-5-5` (4 brain matches,
2 no-brain matches, to save money). **0 forfeits, 0 illegal moves played** in 42 games.

## Result

| Folder | Model | Arm | Game 1 (X starts) | Game 2 (engine starts) | Game 3 (X starts) | X blunders | Cost |
|---|---|---|---|---|---|---:|---:|
| `opus-brain-s31` | Opus | brain | O (pieces, 64) | O (X blocked, 39) | draw (repetition, 56) | 1 | 2.12 USD |
| `opus-brain-s32` | Opus | brain | O (X blocked, 18) | O (pieces, 53) | O (pieces, 54) | 1 | 1.66 USD |
| `opus-brain-s33` | Opus | brain | O (pieces, 40) | O (pieces, 45) | X (pieces, 61) | 0 | 2.03 USD |
| `opus-brain-s34` | Opus | brain | X (pieces, 69) | O (pieces, 45) | X (pieces, 69) | 1 | 2.37 USD |
| `opus-nobrain-s31` | Opus | no brain | O (X blocked, 18) | O (X blocked, 29) | X (pieces, 75) | 0 | 1.97 USD |
| `opus-nobrain-s32` | Opus | no brain | X (O blocked, 35) | O (pieces, 45) | O (pieces, 72) | 0 | 1.55 USD |
| `sonnet-brain-s31` | Sonnet | brain | O (X blocked, 20) | O (pieces, 49) | O (pieces, 70) | 1 | 0.69 USD |
| `sonnet-brain-s32` | Sonnet | brain | O (X blocked, 18) | O (pieces, 41) | O (pieces, 54) | 2 | 0.51 USD |
| `sonnet-brain-s33` | Sonnet | brain | O (X blocked, 18) | O (pieces, 49) | O (pieces, 38) | 1 | 0.47 USD |
| `sonnet-brain-s34` | Sonnet | brain | O (X blocked, 22) | O (pieces, 49) | O (pieces, 66) | 1 | 0.75 USD |
| `sonnet-nobrain-s31` | Sonnet | no brain | draw (quiet, 79) | O (pieces, 67) | X (O blocked, 37) | 0 | 0.71 USD |
| `sonnet-nobrain-s32` | Sonnet | no brain | O (pieces, 56) | X (pieces, 62) | O (pieces, 60) | 0 | 0.69 USD |
| `sonnet-nobrain-s33` | Sonnet | no brain | O (X blocked, 18) | O (pieces, 59) | X (pieces, 55) | 2 | 0.50 USD |
| `sonnet-nobrain-s34` | Sonnet | no brain | O (pieces, 64) | O (pieces, 49) | O (X blocked, 18) | 1 | 0.51 USD |

With Haiku from run 01a-006 (same seeds, same engine):

| Model | Games | Wins / losses / draws | Win rate | Losses blocked (of them by turn 22) | Mean game length | Cost per game |
|---|---:|---|---:|---|---:|---:|
| Haiku (01a-006) | 24 | 1 / 21 / 2 | 4 % | 13 (10) | 33 turns | 0.02 USD |
| Sonnet | 24 | 3 / 20 / 1 | 13 % | 6 (6) | 47 turns | 0.20 USD |
| Opus | 18 | 5 / 12 / 1 | 28 % | 4 (2) | 49 turns | 0.65 USD |

| Arm | Sonnet W / L / D | Opus W / L / D |
|---|---|---|
| brain | 0 / 12 / 0 | 3 / 8 / 1 |
| no brain | 3 / 8 / 1 | 2 / 4 / 0 |

Cost 16.52 USD for 42 games (Sonnet 4.83, Opus 11.69), plus about 0.03 USD for the 14 reporter drafts.
The two probe matches (seed 31) ran first, the other twelve in parallel; wall time about 40 minutes.

## Digest highlights

- **The engine ranks the models.** Win rate against the same depth-3 search rises from 4 % (Haiku) to 13 %
  (Sonnet) to 28 % (Opus), at 10x and 33x the cost per game. Every Opus win but one came in a game X opens;
  the one Sonnet win as second player (`sonnet-nobrain-s32` game 2) is the exception (P400).
- **The stronger models stop walling themselves in.** Haiku lost 10 games blocked by turn 22; Opus 2, and
  Opus's games run 49 turns on average against Haiku's 33. Opus and Sonnet now lose in the moving phase, to
  the engine's running mills (P401).
- **A textbook brain walks into the trap.** All four Sonnet brain v1 texts open with "Prefer junction points
  5, 11, 14, 20 (4 neighbours): more mobility", and all four Sonnet brain matches lose game 1 blocked on turn
  18 to 22. After the loss the brain learns it ("count legal moves before last placements (lost game 1 by
  blockade)", `sonnet-brain-s31` v3) and games 2 and 3 are never blocked again, but still lost on pieces.
- **Opus's brain is a real playbook** (`opus-brain-s31` v3): "Fork point = free point on two lines each
  holding one O ... Block one move earlier", "keep a piece next to each exit of every O mill". Opus's brain
  arm wins 3 of 12, its no-brain arm 2 of 6: no brain effect for either model (P402).

## Problems

- **P400:** stronger models beat the depth-3 engine more often, but even Opus loses two thirds of the games.
- **P401:** the blockade weakness (P200) is mostly a Haiku weakness.
- **P402:** no brain effect with Sonnet and Opus either (fourth time, after P106, P109, P202).
- **P105 again:** 17 `BRAIN_TOO_LONG` refusals in the brain arms (Opus 9, Sonnet 7; up to 391 words for 300).
- **P103 again:** the reporter drafts call the solo resident's in-thought move planning "a private game
  instead of the scored one" with "zero submissions" (they read city metrics); these loophole candidates are
  false, every move is in `move_played`. The drafts also flag morris events as schema mismatches.
- **P201 still applies:** the referee shares the engine's search, so "best" and "blunder" counts say little.

## Optimizations (proposals, not built)

- A bigger Opus sample would cost about 2 USD per 3-game match; the win-rate gap Sonnet/Opus (3 of 24 against
  5 of 18) is not yet safe. Six more Opus matches (about 12 USD) would settle it.
- An engine at depth 4 for Opus, or depth 2 for Haiku, to compare models where each wins about half.
- Mixed match: Opus against Haiku in the same morris story (no engine), as a direct model ranking.

## Loopholes

None found (the reporter's candidates are false, see P103 above).
