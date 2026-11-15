# Experiment lanterns-team-brain

Does a team brain raise recall?

## Plan

- Purpose: confirmatory; design: paired
- Game: `games/lanterns/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `nobrain` (control) `{"brain":false}`; `brain` `{}`
- Seeds: 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107; replicates: 1
- Primary metric: `clue-grid.recall`; secondary: `clue-grid.recallLater`, `clue-grid.precision`, `strategy-brain.brainWrites`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.2 USD per run, 2.35 USD in total
- Spec hash: `be3337f8c8cb57bfdc8c5536315a8fce6cdba19f212aeb5ac1fd4d71441e3ed2`; code: commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`, runtime revision 4

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lanterns-001` | `brain` | 101 | 0 | included |  | 0.09575 | `d95f1cc7566a` |
| `lanterns-003` | `nobrain` | 71 | 0 | included |  | 0.05525 | `9cebb574d828` |
| `lanterns-002` | `brain` | 103 | 0 | included |  | 0.1053 | `0d74f2905428` |
| `lanterns-005` | `nobrain` | 103 | 0 | included |  | 0.05171 | `0bec2d9e13a3` |
| `lanterns-004` | `nobrain` | 89 | 0 | included |  | 0.05406 | `9d055c34f8cc` |
| `lanterns-007` | `brain` | 83 | 0 | included |  | 0.07345 | `e52f396e4d11` |
| `lanterns-006` | `brain` | 79 | 0 | included |  | 0.089 | `6abf7566ac29` |
| `lanterns-009` | `nobrain` | 59 | 0 | included |  | 0.054 | `9542a988a7cf` |
| `lanterns-008` | `brain` | 71 | 0 | included |  | 0.08095 | `e32e8b6e5a72` |
| `lanterns-011` | `nobrain` | 97 | 0 | included |  | 0.05768 | `13664f8eb2c0` |
| `lanterns-010` | `brain` | 97 | 0 | included |  | 0.08566 | `336c50464aa7` |
| `lanterns-013` | `nobrain` | 101 | 0 | included |  | 0.05805 | `e424d40623ab` |
| `lanterns-012` | `brain` | 59 | 0 | included |  | 0.07534 | `b279769592d4` |
| `lanterns-015` | `nobrain` | 73 | 0 | included |  | 0.05114 | `098326a3dada` |
| `lanterns-014` | `brain` | 73 | 0 | included |  | 0.06525 | `bde24b4720f7` |
| `lanterns-016` | `nobrain` | 61 | 0 | included |  | 0.04748 | `8da7e806bac5` |
| `lanterns-017` | `nobrain` | 107 | 0 | included |  | 0.05644 | `aaf467ec0e17` |
| `lanterns-018` | `brain` | 67 | 0 | included |  | 0.08287 | `df5273f28145` |
| `lanterns-019` | `brain` | 107 | 0 | included |  | 0.07487 | `0096f5dccaaf` |
| `lanterns-021` | `nobrain` | 67 | 0 | included |  | 0.05196 | `09d55ae4a04a` |
| `lanterns-020` | `brain` | 61 | 0 | included |  | 0.08383 | `b5ae0d52a5d9` |
| `lanterns-022` | `nobrain` | 79 | 0 | included |  | 0.06748 | `43db7d62b85b` |
| `lanterns-023` | `brain` | 89 | 0 | included |  | 0.08521 | `b0d10bef0a68` |
| `lanterns-024` | `nobrain` | 83 | 0 | included |  | 0.06041 | `d2bdf55bbc26` |

## Means by arm (included runs)

| Metric | `nobrain` | `brain` |
| --- | --- | --- |
| `clue-grid.recall` | 0.7593 (n 12) | 0.8169 (n 12) |
| `clue-grid.recallLater` | 0.7867 (n 12) | 0.835 (n 12) |
| `clue-grid.precision` | 0.8354 (n 12) | 0.87 (n 12) |
| `strategy-brain.brainWrites` | absent | 8 (n 12) |
| `models.requests` | 215.2 (n 12) | 284.5 (n 12) |
| `models.costUsd` | 0.05547 (n 12) | 0.08312 (n 12) |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `clue-grid.recall` | primary | included | 0.05759 | 0.02176 | 0.009707 to 0.1055 | 12 | 0.02393 | mean of the paired differences, treatment minus control; sign-flip exact |
| `clue-grid.recall` | primary | finished | 0.05759 | 0.02176 | 0.009707 to 0.1055 | 12 | 0.02393 | mean of the paired differences, treatment minus control; sign-flip exact |
| `clue-grid.recallLater` | secondary | included | 0.04828 | 0.02029 | 0.003613 to 0.09294 | 12 | 0.0332 | mean of the paired differences, treatment minus control; sign-flip exact |
| `clue-grid.recallLater` | secondary | finished | 0.04828 | 0.02029 | 0.003613 to 0.09294 | 12 | 0.0332 | mean of the paired differences, treatment minus control; sign-flip exact |
| `clue-grid.precision` | secondary | included | 0.03466 | 0.01533 | 0.0009048 to 0.06841 | 12 | 0.02246 | mean of the paired differences, treatment minus control; sign-flip exact |
| `clue-grid.precision` | secondary | finished | 0.03466 | 0.01533 | 0.0009048 to 0.06841 | 12 | 0.02246 | mean of the paired differences, treatment minus control; sign-flip exact |
| `strategy-brain.brainWrites` | secondary | included | absent | absent | absent | absent | absent |  |
| `strategy-brain.brainWrites` | secondary | finished | absent | absent | absent | absent | absent |  |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

- Rule: clue-grid.recall, brain minus nobrain over the included runs, is greater than 0; a verdict needs 10 complete pairs
- Verdict: **kept** (estimate 0.05759, n 12)

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` |  | `nobrain` | 215.2 | held |
| `models.requests` |  | `brain` | 284.5 | held |
| `models.costUsd` |  | `nobrain` | 0.05547 | held |
| `models.costUsd` |  | `brain` | 0.08312 | held |
| `run.refusals` |  | `nobrain` | 0 | held |
| `run.refusals` |  | `brain` | 0.08333 | not held: BAD_CLUE |

## Tolerance

none: no baseline was compared

## Deviations

none

## Review (issue M4-59): loopholes, problems and solutions

Read from `events.jsonl`: `lanterns-003` and `lanterns-004` (`nobrain`), `lanterns-001` and `lanterns-002`
(`brain`); the rest by script. The write-up is `docs/M4-GATE.md` on `develop`.

**Result:** +0.058 recall (SE 0.022, 95 % interval +0.010 to +0.106, exact sign-flip p 0.024, 12 pairs): sign kept,
the size agrees with the old +0.08 (SE 0.03). Games 2 to 4 +0.048 (SE 0.020, old +0.11); game 1 +0.086 (SE 0.062,
old +0.00). One game of 96 ran out of clues (`brain`). All 24 runs verify and replay equal.

**The state file was repaired by hand once (P468).** Three starts (seed 73 in both arms, seed 61 `nobrain`) were
refused with `SWT-C023` before any model call, because the operator had written a file into the checkout; the runner
recorded them as stopped at 0.20 USD each and would never have played them. Their records (no folder, no ledger line)
were removed; `experiment.before-repair.json` is the file as the runner wrote it. The same command then played the
three runs (`lanterns-014`, `-015`, `-016`). The series was also paused once by the ledger (deviation 3 of
`docs/M4-GATE.md`); nothing was lost.

**Loopholes:** no new one. LH15 seen again (a silenced keeper writes its warning into its own answer): "For the
record, attic is a fog word" (`lanterns-004` #93, #207, #614), "pine is a shadow" (`lanterns-002` #494); 107 such
answers in 24 runs, nobody reads them. Closed by design.

**Problems** (rows in `docs/LESSONS-LEARNED.md` on `develop`):

- P466: 101 `BRAIN_TOO_LONG` refusals in the 12 `brain` runs; every brain is written in the end. Proposed: show the
  word count. Built: nothing. Open.
- P467: the spec's allowed refusals miss `BAD_CLUE` (`lanterns-020` #1172), so the refusal guardrail of the `brain`
  arm is "not held". Proposed: add it to the next spec. Built: nothing. Open.
- P468: a refusal before any call for a dirty tree is charged as a failed run. Proposed: treat it as a `RunRefused`.
  Built: the hand repair above. Open (code).
- P469: the amber brain of `lanterns-002` asks the keeper to name its targets in chat, which `KEEPER_SILENT` forbids;
  the seekers waited for it and the last clue of game 1 closed by `timeout` with no guess (#937, #957, #979, #997).
  Proposed: tell the retro what a keeper may not do. Built: nothing. Open.

**Solutions built:** none in the game. The first run (`lanterns-001`) was played alone as the series' smoke.
