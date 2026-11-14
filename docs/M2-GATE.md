# The gate of milestone M2

The result of the experiment protocol of
[`refactoring-before-release/09-m2-spec.md`](refactoring-before-release/09-m2-spec.md) section 8, run by issue
M2-24 on 2026-11-14 after the plan in [`RERUN-PLAN.md`](RERUN-PLAN.md). Every number below is read from a file on
the data branch `data/runs` (commit `5bfb55ff`) or from the spend ledger [`../games/m2-ledger.jsonl`](../games/m2-ledger.jsonl).

**Result: both series keep their sign.** Open quarries raise the table's points by 84.5 (standard error 22.0,
95 % interval 36 to 133, 12 pairs). The strategy brain lowers cooperation in the dilemma by 0.771 (standard error
0.084, 95 % interval -0.954 to -0.588, 12 runs per arm). Both intervals exclude zero. All guardrails held, no run
was excluded, no key value was found in any file, and the runs cost 1.60 USD of the cap of 4.00 USD.

## What ran

| | |
|---|---|
| Code | commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06` of `rewrite/develop`, clean tree (`kernel.dirty` false in every manifest), runtime revision 3 |
| Model | `anthropic/haiku`, resolved to `claude-haiku-5-5` in every manifest; thinking `medium`, output cap 4000 tokens, provider-default sampling; pricing `pi-ai@1.4.0` |
| Runs | 61 live runs: 3 single runs, 10 of the two noise floors, 48 of the two series; at most two in flight |
| Data | branch `data/runs`: `smoke/`, `quarry/`, `econ-lab/`, `legacy/` and the ledger |
| Check of each run | `swt log verify` exit 0 for all 61 folders; a `REPORT.md` by `swt report <run> --game <game file>` in each |

## Steps and cost

| Step | What | Runs | Expected (USD) | Cost (USD) | Result |
|---|---|---:|---:|---:|---|
| 0 | `pnpm vitest --run games packages/models apps/cli packages/lab` (45 files, 323 tests: oracle files, canary test, ledger and cap tests); `swt run --fake` of quarry and econ-lab | 0 | 0 | 0 | green; both fake runs ended and verified |
| 1 | Hello Game (`--budget 0.05`); quarry pilot (seed 31, control, `--budget 0.10`); econ-lab pilot (label 41, `brain=false`, `--budget 0.05`) | 3 | 0.11 | 0.0478 | no leak, no `error` end, no cap reached; requests per decision 1.278 (quarry) and 1.306 (econ-lab) |
| 2 | `quarry-noise-floor` | 5 | 0.17 | 0.1715 | within the noise of the old platform |
| 2 | `econ-lab-noise-floor` | 5 | 0.06 | 0.0628 | within |
| 3 | `quarry-open-quarries` | 24 | 0.91 | 0.9099 | sign kept |
| 3 | `econ-lab-brain` | 24 | 0.40 | 0.4101 | sign kept |
| | **Sum** | 61 | 1.65 | **1.6022** | under the hard stop of 4.00 and under every experiment cap (0.50, 0.25, 1.50, 0.75) |

Single runs of step 1: Hello Game 0.0015, quarry pilot 0.0337, econ-lab pilot 0.0125. The ledger holds 61
reservations and 61 cost lines; none is open. The dearest run cost 0.0445 (cap 0.10) in quarry and 0.0237 (cap
0.05) in econ-lab. The cost is what the platform computes from the token counts and the price table
`pi-ai@1.4.0`; it was not compared with a bill of the provider.

## Step 2: the noise floors (reported, not gated)

| | Quarry, control at seed 31 | Econ-lab, `nobrain` at label 41 |
|---|---|---|
| New values | 1112, 995, 1012, 1170, 1151 | 1.00, 0.10, 0.25, 1.00, 1.00 |
| New platform | mean 1088 (standard error 35.8) | 3 of 5 tables locked: share 0.60 (Wilson 0.23 to 0.88) |
| Old platform | mean 1081 (SD 58, n 5) | 4 of 5 locked: share 0.80 |
| Difference | +6.8, standard error 44.2 | -0.20, standard error 0.28 |
| Tolerance | **within** (`withinNoise`) | **within** (`shareWithinNoise`, threshold 1.00) |
| Requests per decision | 1.292 (within 10 % of 1.30): held | 1.306 (within 10 % of 1.32): held |
| Cost per run | 0.0343 (at most 0.041): held | 0.0126 (at most 0.015): held |
| Missed picks or decisions | 0: held | 0: held |

With five runs both checks show only a gross break (specification 8.4). One first turn was read against the old
platform: seat A04 of the quarry pilot against `quarry-31-rep1` of the legacy noise floor. The system prompt, the
two input lines and the three open tools are the same text, and the same seat is asked first. The two-against-two
reading of 8.4 was not done, because both checks are within; no econ-lab log was compared.

## Step 3: the two pass rules

| | Quarry: open quarries | Econ-lab: the brain |
|---|---|---|
| Spec, hash | `games/quarry/experiments/open-quarries.json`, `bd19298de593` | `games/econ-lab/experiments/brain.json`, `d967092e2dfb` |
| Purpose, design | confirmatory, paired by seed | confirmatory, unpaired |
| Arm means | control 952.8, open 1037.3 | `nobrain` 0.858, `brain` 0.088 |
| **Estimate** | **+84.5 points** | **-0.771** |
| Standard error | 22.0 | 0.084 |
| 95 % interval | 36.0 to 133.0 (t, 11 degrees of freedom) | -0.954 to -0.588 (Welch) |
| n | 12 complete pairs | 12 runs in each arm |
| Permutation p (not gated) | 0.00098 (exact sign flip) | 0.0000022 (exact label permutation) |
| Rule | greater than 0, at least 10 pairs | less than 0, at least 10 runs per arm |
| **Verdict** | **kept** (`swt experiment analyse` exit 0) | **kept** (exit 0) |
| Reaches half the old estimate | yes: +84.5 against "at least +38" (old +77, SE 22) | yes: -0.771 against "at most -0.20" (old -0.40, SE 0.13) |
| Over every finished run | the same: no run was excluded | the same |
| Excluded runs per arm | 0 and 0 | 0 and 0 |

Not gated, quarry: the open arm is ahead on 11 of the 12 seeds (differences 99, 19, 156, 39, 132, 69, -14, 20,
256, 143, 32, 63 for the seeds 31 to 79 in the order of the spec). Seats that share a lane: 4.42 against 1.17 per
match, difference -3.25 (standard error 0.35, interval -4.02 to -2.48). Brains written: 12.0 against 11.83
(difference -0.17, standard error 0.11; P446).

Not gated, econ-lab: locked tables (cooperation 1.00) are 9 of 12 without the brain (share 0.75, Wilson 0.47 to
0.91) and 0 of 12 with it (0, Wilson 0 to 0.24). Cooperation in round 1 of the dilemma: -0.583 (standard error
0.064, interval -0.720 to -0.447). Cooperation in the shared fund: +0.0003 (standard error 0.027, interval -0.056
to +0.057): no difference shown. Points of the table: -30.9 (standard error 5.8, interval -43.2 to -18.5). The
brain arm wrote 12 brains in every run.

A kept sign shows that the port did not turn an effect around. Here both intervals also exclude zero, so both
effects are reproduced on the rewrite with the model of today: +84.5 (SE 22.0, n 12 pairs) and -0.771 (SE 0.084,
n 12 per arm).

## Guardrails

| Guardrail, mean of the arm | Limit | Value | Held |
|---|---|---:|---|
| Quarry control, requests per decision | within 10 % of 1.30 | 1.289 | yes |
| Quarry open, requests per decision | within 10 % of 1.30 | 1.299 | yes |
| Quarry control, cost per run | at most 0.041 | 0.0343 | yes |
| Quarry open, cost per run | at most 0.050 | 0.0416 | yes |
| Quarry, missed picks | 0 | 0 in both arms | yes |
| Econ-lab `nobrain`, requests per decision | within 10 % of 1.32 | 1.308 | yes |
| Econ-lab `brain`, requests per decision | within 10 % of 1.75 | 1.813 | yes |
| Econ-lab `nobrain`, cost per run | at most 0.015 | 0.0123 | yes |
| Econ-lab `brain`, cost per run | at most 0.025 | 0.0219 | yes |
| Econ-lab, missed decisions | 0 | 0 in both arms | yes |

Refusal codes, counted from the logs of the two series: quarry `BRAIN_TOO_LONG` 85 (control 30, open 55),
`TOOL_LOCKED` 6, `NOT_IN_PACK` 1; econ-lab `BRAIN_TOO_LONG` 31 and `TOOL_LOCKED` 3, all in the brain arm. Every
code is in the list of its spec. No `request_failed` record in any of the 61 runs.

## Exclusions and deviations

- Exclusions: none. No run was replaced; every plan ran once, in the shuffled order of its spec.
- Deviations from section 8: none in a threshold, a spec or a pass rule. The `results.json` of all four
  experiments lists no deviation.
- Differences in how the work was done:
  1. The run data was written to a folder beside the checkout and committed to `data/runs` after the last run, in
     four commits (step 1, step 2, step 3, the legacy runs with the ledger), not one commit per step while running.
  2. The ledger of the runs was a copy of `games/m2-ledger.jsonl` beside the checkout, so that the tree stayed
     clean for the confirmatory runs; the final file is copied back in this commit.
  3. The reviewer read the facts table of every run and, by script, the brains, the reasons of picks and choices,
     the refusals and the free texts; the full log of two runs per arm (8.5) was not read line by line.
  4. The README findings block, the recorded moment and `docs/FINDINGS.md` (8.5) are not part of this commit.
  5. `develop` moved from `b7de6505` to `a4e7ea7d` while the series ran; the runs name the commit they ran on.

## The kill procedure (8.6)

| # | Check | Result |
|---|---|---|
| 1 | Effort | Not recounted here. The totals of [`ISSUE-RECORD.md`](ISSUE-RECORD.md) (state at `0ac3e89`): 60 merged issues of M1 and M2 and 3 rows of M0 against the kill line of 150; 15.6 million agent tokens against 600 million. Does not fire |
| 2 | Size | The full `pnpm check` was not run by this issue; it is the integrator's at the merge. The tests of step 0 and `pnpm vitest --run scripts` (the budget tests among them) are green |
| 3 | Sign | `swt experiment analyse` exit 0 for both series: **pass**. No bridge is run |
| 4 | Keys | The canary test is green (step 0). `findLeaks` with the key broker over every file of the data branch: 0 files. No file holds the prefix of a provider key. No `LEAK` file was written |

## Problems and loopholes

Loopholes: none seen in these runs. Problems are the rows P444 to P449 of
[`LESSONS-LEARNED.md`](LESSONS-LEARNED.md); none of them touches a pass rule.

| Row | In short |
|---|---|
| P444 | `swt report` without `--game` leaves the game's metrics out of the facts table |
| P445 | the Hello Game ends at its tick limit with no finished game under a live model |
| P446 | a brain rewrite is lost to the word limit in 2 of 12 open-quarry runs |
| P447 | the ledger and the series lines name a run by a path relative to the start directory |
| P448 | the result line of a live run counts input tokens without the cache |
| P449 | the series README gives `n` 24 for an unpaired estimate where the pass rule counts 12 per arm |

## Left open

- The owner's: pushing `data/runs`; the data repository (O8); O10 after the exit note.
- The integrator's: the full `pnpm check` with the size budgets on the merge commit (check 2), the row of M2-24 in
  `ISSUE-RECORD.md`, the tag.
- From 8.5: the README findings block with the two estimates, one recorded moment, the two rows of
  `docs/FINDINGS.md`. A candidate for the moment: resident A02 in `econ-lab/econ-lab-brain/econ-lab-007`, #949,
  writing its brain after the shared fund: "Free-riding is dominant regardless of others".
