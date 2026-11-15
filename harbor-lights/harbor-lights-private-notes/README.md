# Experiment harbor-lights-private-notes

Do private notes raise the crew's score?

## Plan

- Purpose: confirmatory; design: paired
- Game: `games/harbor-lights/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `nobrain` (control) `{"brain":"nobrain","games":1}`; `solo` `{"brain":"solo","games":1}`
- Seeds: 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112; replicates: 1
- Primary metric: `hint-towers.score`; secondary: `hint-towers.misfires`, `strategy-brain.brainWrites`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.12 USD per run, 1.6 USD in total
- Spec hash: `b215ccf393cc4fd8db697e9267c171a39e9cb0daca8cb905056154a9741de43d`; code: commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`, runtime revision 4

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `harbor-lights-001` | `nobrain` | 105 | 0 | included |  | 0.05593 | `b942b9fbfbc9` |
| `harbor-lights-002` | `solo` | 101 | 0 | included |  | 0.05728 | `2ede6f350a66` |
| `harbor-lights-003` | `solo` | 105 | 0 | included |  | 0.05951 | `3cbbf2178f0b` |
| `harbor-lights-005` | `nobrain` | 111 | 0 | included |  | 0.0535 | `226e1b468421` |
| `harbor-lights-004` | `solo` | 109 | 0 | included |  | 0.05742 | `5a978562a6f7` |
| `harbor-lights-007` | `nobrain` | 101 | 0 | included |  | 0.05695 | `ab289bc1406b` |
| `harbor-lights-006` | `nobrain` | 109 | 0 | included |  | 0.06049 | `2eb5890fcaef` |
| `harbor-lights-008` | `nobrain` | 107 | 0 | included |  | 0.05146 | `645c66b5eb7b` |
| `harbor-lights-009` | `solo` | 111 | 0 | included |  | 0.049 | `069a9b6b3a4d` |
| `harbor-lights-010` | `nobrain` | 103 | 0 | included |  | 0.04933 | `7f78a9d2417e` |
| `harbor-lights-011` | `solo` | 104 | 0 | included |  | 0.04925 | `80fdbaae069a` |
| `harbor-lights-013` | `solo` | 107 | 0 | included |  | 0.05979 | `63376ec71530` |
| `harbor-lights-012` | `solo` | 112 | 0 | included |  | 0.06447 | `de8ef11a3453` |
| `harbor-lights-015` | `solo` | 102 | 0 | included |  | 0.05078 | `c6706c76bfd7` |
| `harbor-lights-014` | `nobrain` | 102 | 0 | included |  | 0.05144 | `768b613d3a2e` |
| `harbor-lights-016` | `nobrain` | 110 | 0 | included |  | 0.04255 | `885edea33cae` |
| `harbor-lights-017` | `nobrain` | 108 | 0 | included |  | 0.05647 | `1c1cbea5e68f` |
| `harbor-lights-018` | `nobrain` | 104 | 0 | included |  | 0.05024 | `8eb823b8e9b6` |
| `harbor-lights-019` | `solo` | 110 | 0 | included |  | 0.05677 | `f09b00f7a2de` |
| `harbor-lights-020` | `nobrain` | 106 | 0 | included |  | 0.04456 | `bbff45d29b77` |
| `harbor-lights-021` | `solo` | 108 | 0 | included |  | 0.04554 | `aa027b1cd22e` |
| `harbor-lights-022` | `solo` | 103 | 0 | included |  | 0.05279 | `e068d0520cd2` |
| `harbor-lights-023` | `solo` | 106 | 0 | included |  | 0.05117 | `b576d6c56a94` |
| `harbor-lights-024` | `nobrain` | 112 | 0 | included |  | 0.05473 | `f3dcfedb8e74` |

## Means by arm (included runs)

| Metric | `nobrain` | `solo` |
| --- | --- | --- |
| `hint-towers.score` | 18.67 (n 12) | 20.25 (n 12) |
| `hint-towers.misfires` | 1.917 (n 12) | 1.583 (n 12) |
| `strategy-brain.brainWrites` | absent | 4 (n 12) |
| `models.requests` | 97 (n 12) | 116.4 (n 12) |
| `models.costUsd` | 0.0523 (n 12) | 0.05448 (n 12) |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hint-towers.score` | primary | included | 1.583 | 1.373 | -1.439 to 4.606 | 12 | 0.3252 | mean of the paired differences, treatment minus control; sign-flip exact |
| `hint-towers.score` | primary | finished | 1.583 | 1.373 | -1.439 to 4.606 | 12 | 0.3252 | mean of the paired differences, treatment minus control; sign-flip exact |
| `hint-towers.misfires` | secondary | included | -0.3333 | 0.3098 | -1.015 to 0.3485 | 12 | 0.4375 | mean of the paired differences, treatment minus control; sign-flip exact |
| `hint-towers.misfires` | secondary | finished | -0.3333 | 0.3098 | -1.015 to 0.3485 | 12 | 0.4375 | mean of the paired differences, treatment minus control; sign-flip exact |
| `strategy-brain.brainWrites` | secondary | included | absent | absent | absent | absent | absent |  |
| `strategy-brain.brainWrites` | secondary | finished | absent | absent | absent | absent | absent |  |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

- Rule: hint-towers.score, solo minus nobrain over the included runs, is greater than 0; a verdict needs 10 complete pairs
- Verdict: **kept** (estimate 1.583, n 12)

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` |  | `nobrain` | 97 | held |
| `models.requests` |  | `solo` | 116.4 | held |
| `models.costUsd` |  | `nobrain` | 0.0523 | held |
| `models.costUsd` |  | `solo` | 0.05448 | held |
| `run.refusals` |  | `nobrain` | 0 | held |
| `run.refusals` |  | `solo` | 0 | held |

## Tolerance

none: no baseline was compared

## Deviations

none

## Review (issue M4-59): loopholes, problems and solutions

Read from `events.jsonl`: `harbor-lights-001` and `harbor-lights-006` (`nobrain`), `harbor-lights-002` and
`harbor-lights-004` (`solo`); the rest by script. The write-up is `docs/M4-GATE.md` on `develop`.

**Result:** +1.58 points per game (SE 1.37, 95 % interval -1.44 to +4.61, exact sign-flip p 0.33, 12 pairs): sign
kept, size not reproduced (old +3.2, SE 0.8). Six deals ahead, six behind; seed 109 (10 against 23) carries the mean.
Misfires 19 (`solo`) against 23 (`nobrain`) over 12 games. All 24 runs verify and replay equal.

**Loopholes:** no new one. LH14 seen again (a harmless signal keeps the game going): "I passed this turn by signalling
A04 'Amber', which touched their Amber cards and nothing else useful" (`harbor-lights-006` #600, #621),
"keeps the round alive" (`harbor-lights-012` #814, #930, #945, #989); in 6 of 24 runs. Kept on purpose; open as before.

**Problems** (rows in `docs/LESSONS-LEARNED.md` on `develop`):

- P464: a `solo` seat polls the board before game 1 opens (64 `viewTowers` calls in 12 runs, `harbor-lights-012`
  #140). Proposed: no wake after a closed retro until the game opens. Built: nothing. Open.
- P465: a seat calls a move in the answer turn after its own move, refused with `NOT_YOUR_TURN` (39 in 24 runs,
  `harbor-lights-006` #608). Proposed: no game tool in an answer turn (changes the play, needs the owner's go). Built:
  nothing. Open.

**Solutions built:** none. The first run (`harbor-lights-001`) was played alone as the series' smoke under a ledger
that held one run, then the rest with the same command (deviation 1 of `docs/M4-GATE.md`).
