# Experiment chess-requests

How many requests does a half-move cost?

## Plan

- Purpose: confirmatory; design: replicates
- Game: `games/chess/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `fresh-compact` (control) `{"games":4,"maxPlies":80,"fresh":true,"compact":true}`
- Seeds: 41, 43, 47, 53; replicates: 1
- Primary metric: `models.requests`; secondary: `chess.plies`, `chess.refusedMoves`, `run.noCallActivations`, `strategy-brain.brainWrites`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.8 USD per run, 2 USD in total
- Spec hash: `8a59a795497817d4c9aa8f3f69bfb744879d7884f8c807f2554999f30b7a7712`; code: commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`, runtime revision 4

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `chess-001` | `fresh-compact` | 41 | 0 | included |  | 0.3048 | `bea365089a98` |
| `chess-002` | `fresh-compact` | 53 | 0 | included |  | 0.2878 | `91e97dbf949e` |
| `chess-003` | `fresh-compact` | 43 | 0 | included |  | 0.2348 | `0d904faaf08a` |
| `chess-004` | `fresh-compact` | 47 | 0 | included |  | 0.3181 | `d6e37d52fd83` |

## Means by arm (included runs)

| Metric | `fresh-compact` |
| --- | --- |
| `models.requests` | 335.5 (n 4) |
| `chess.plies` | 277.8 (n 4) |
| `chess.refusedMoves` | 9.25 (n 4) |
| `run.noCallActivations` | 7.25 (n 4) |
| `strategy-brain.brainWrites` | 8 (n 4) |
| `models.costUsd` | 0.2864 (n 4) |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `models.requests` | primary | included | 335.5 | 15.35 | 286.6 to 384.4 | 4 | 1 | mean of the arm; none |
| `models.requests` | primary | finished | 335.5 | 15.35 | 286.6 to 384.4 | 4 | 1 | mean of the arm; none |
| `chess.plies` | secondary | included | 277.8 | 14.5 | 231.6 to 323.9 | 4 | 1 | mean of the arm; none |
| `chess.plies` | secondary | finished | 277.8 | 14.5 | 231.6 to 323.9 | 4 | 1 | mean of the arm; none |
| `chess.refusedMoves` | secondary | included | 9.25 | 1.109 | 5.722 to 12.78 | 4 | 1 | mean of the arm; none |
| `chess.refusedMoves` | secondary | finished | 9.25 | 1.109 | 5.722 to 12.78 | 4 | 1 | mean of the arm; none |
| `run.noCallActivations` | secondary | included | 7.25 | 1.109 | 3.722 to 10.78 | 4 | 1 | mean of the arm; none |
| `run.noCallActivations` | secondary | finished | 7.25 | 1.109 | 3.722 to 10.78 | 4 | 1 | mean of the arm; none |
| `strategy-brain.brainWrites` | secondary | included | 8 | 0 | 8 to 8 | 4 | 1 | mean of the arm; none |
| `strategy-brain.brainWrites` | secondary | finished | 8 | 0 | 8 to 8 | 4 | 1 | mean of the arm; none |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

none: the experiment is reported, not gated

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` | `chess.plies` | `fresh-compact` | 1.209 | held |
| `chess.refusedMoves` | `chess.plies` | `fresh-compact` | 0.03306 | held |
| `models.costUsd` |  | `fresh-compact` | 0.2864 | held |
| `run.refusals` |  | `fresh-compact` | 0 | held |

## Tolerance

none: no baseline was compared

## Deviations

none

## Review (issue M4-59): loopholes, problems and solutions

Read from `events.jsonl`: `chess-001` (seed 41) and `chess-002` (seed 53); the rest by script. The write-up is
`docs/M4-GATE.md` on `develop`.

**Result:** 1.209 requests per half-move on average (range 1.196 to 1.238; per seed 41: 1.207, 43: 1.238, 47: 1.196,
53: 1.196) beside the old 1.18 to 1.22 of the runs 048 to 051. No pass rule; the integrator writes "hold" or not.
Refused moves 3.31 per 100 half-moves (2.80 to 4.01), cost 0.2348 to 0.3181 USD per match, 29 turns without a call
(all answer turns: 8 before game 1, 19 between games, 2 inside a game). 11 of 16 games ended at the move cap, 3 by
checkmate, 2 by resignation. All 4 runs verify and replay equal.

**Loopholes:** no new one. LH16 seen again (playing for the material verdict at the cap): 7 of the 11 games at the cap
were scored on material; the brains say so ("a new rule to convert material before the cap", `chess-002` #1521; "a
material lead at move 40 is not a reliable win", `chess-001` #4042). Open as before.

**Problems:** P464 (the seats are woken before game 1 opens, "The first game hasn't started yet, so there's no
position to play", `chess-002` #74; 8 answer turns in 4 matches). No row of its own for chess.

**Solutions built:** none. The first run (`chess-001`) was played alone as the series' smoke.
