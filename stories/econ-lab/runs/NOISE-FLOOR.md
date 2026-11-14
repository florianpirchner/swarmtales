# Noise floor of the econ lab

Milestone M0, issue 4 of [REWRITE.md](../../../docs/refactoring-before-release/REWRITE.md) section 8; the method is section 3.4 of
[02-experiment-science.md](../../../docs/refactoring-before-release/02-experiment-science.md). No series in this repository ever ran
the same game, arm and seed twice on purpose, so nobody knows how much two identical runs differ. That number is needed before
[econ-lab-04a-003-brain-vs-nobrain](econ-lab-04a-003-brain-vs-nobrain/) can serve as the baseline of the rewritten platform.

## Plan (written and committed before the first live run)

| | |
|---|---|
| Game | `econ-lab`: split offer 6 rounds, shared fund 7, A-or-B 5, unknown horizon, rotating pairs, 4 seats (the baseline series) |
| Arm | `econ-lab-nobrain` (no strategy brain): the control arm of the firm effect "cooperation in the A-or-B game 0.51 without a brain, 0.11 with one (-0.40, SE 0.13)" |
| Seed | 41, the first seed of the baseline series (chosen by that rule, not by its result; the recorded run of this arm and seed has cooperation 1.0) |
| What the seed fixes | Only the order in which the seats are asked within a pass. `econ-games` draws nothing: the pairs and roles of every round are the same on seeds 41 and 42 of the baseline (checked in the logs before this plan). The eight "paired seeds" of the baseline therefore share no deal, and its spread across seeds is itself a first estimate of the replicate noise |
| Replicates | 5, one run at a time |
| Command | `pnpm swt run --story econ-lab-nobrain --seed 41 --provider anthropic --model haiku --budget 0.40 --no-reporter --runs <dir>` (the baseline's command plus the budget; the reporter is off because it plays no part in the run) |
| Model | Haiku via Anthropic, `claude-haiku-5-5`, thinking level as the story sets it (the default), sampling parameters the provider's defaults; the same as the baseline |
| Code | the commit that adds this plan and the analysis script; every run's signed genesis records it. Runtime revision r2 (the baseline ran on r1; r2 changes only tool answers that end a turn, which the econ lab does not use, see [RUNTIME-REVISIONS.md](../../../docs/RUNTIME-REVISIONS.md)) |
| Primary metric | **cooperation in the A-or-B game**: `reference.cooperation` of the `block_scored` line with `game: "dilemma"` in `events.jsonl` (the share of A among the 20 choices; 0 is Nash play, 1 the social optimum) |
| Also reported | round-1 cooperation in that game (`perRound[0]`), cooperation in the shared fund, table points (sum of `match_ended.scores`); requests per decision (`request` lines over `decision_made` lines); cost per run (`totals.costUsd` of `usage.json`); missed decisions and `turn_error` lines |
| Analysis | `scripts/noise-floor.ts` (code in `scripts/noise-floor-stats.ts`, test `test/scripts/noise-floor.test.ts`): mean, sample SD, range, a percentile bootstrap interval of the mean (10000 resamples, seed 20261114) and a t interval; compared with the SD across the 8 seeds of the baseline and with the effect. Result in [noise-floor.json](noise-floor.json) |
| Exclusion | a run with a `turn_error` or a missed decision is recorded and reported, and run once more for the statistics (P431); nothing else is excluded or repeated |
| Budget | 0.40 USD cap per run (`--budget`); a run costs about 0.013 USD. The whole task (both games and the extensions) stops at 5 USD |
| Reading rule | the effect counts as larger than the replicate noise when it is more than twice the standard error that replicate noise alone would give the series (root of the summed replicate variances of both arms, or root 2 times the control's when only the control is measured, over root 8) |

Extension, run only when the spending allows it, with the same command and rules: five replicates of the treatment arm `econ-lab` (with
the brain) at seed 41.

Runs go into `econ-lab-04a-005-noise-floor-r2/` as `<arm>-<seed>-rep<k>/run/`.

## Result

Run on 2026-11-14, commit `5593de4` (clean tree), runtime r2: 10 matches in
[econ-lab-04a-005-noise-floor-r2](econ-lab-04a-005-noise-floor-r2/), the five planned ones and the extension. No `turn_error`, no missed
decision, so nothing was excluded or repeated; every signed log verifies. Cost 0.165 USD. The tables are the output of

```
pnpm tsx --conditions=development scripts/noise-floor.ts --game econ-lab --replicates stories/econ-lab/runs/econ-lab-04a-005-noise-floor-r2 \
  --baseline stories/econ-lab/runs/econ-lab-04a-003-brain-vs-nobrain --control econ-lab-nobrain --treatment econ-lab --seed 41 --digits 2 \
  --out stories/econ-lab/runs/noise-floor.json
```

Primary metric: `dilemmaCooperation`. Bootstrap: percentile interval of the mean, 10000 resamples, seed 20261114.

| Arm | Seed | n | Values | Mean | SD | Range | Bootstrap 95% | t 95% | Requests per decision | Cost per run (USD) | Missed / turn errors |
|---|---:|---:|---|---:|---:|---|---|---|---|---|---|
| `econ-lab-nobrain` | 41 | 5 | 1.00, 1.00, 1.00, 1.00, 0.35 | 0.87 | 0.29 | 0.35 to 1.00 (0.65) | 0.61 to 1.00 | 0.51 to 1.23 | 1.32 (1.29 to 1.35) | 0.0123 (0.0118 to 0.0137) | 0 / 0 |
| `econ-lab` | 41 | 5 | 0.20, 0.25, 0.10, 0.00, 0.25 | 0.16 | 0.11 | 0.00 to 0.25 (0.25) | 0.07 to 0.24 | 0.03 to 0.29 | 1.75 (1.68 to 1.82) | 0.0207 (0.0200 to 0.0214) | 0 / 0 |

Baseline series (runtime r1, seeds 41, 42, 43, 44, 45, 46, 47, 48):

| | Mean | SD across seeds | Range |
|---|---:|---:|---|
| `econ-lab-nobrain` | 0.51 | 0.32 | 0.25 to 1.00 |
| `econ-lab` | 0.11 | 0.10 | 0.00 to 0.25 |
| paired difference | -0.40 (SE 0.13) | 0.37 | -1.00 to 0.00 |

| Comparison | Value |
|---|---:|
| replicate SD of the control / SD across seeds | 0.90 |
| share of the across-seed variance that is the deal, not replicate noise | 0.19 |
| SD of a paired difference from replicate noise alone | 0.31 |
| SD of the paired difference observed in the baseline | 0.37 |
| effect / replicate SD of one control run | 1.38 |
| SE of the series effect from replicate noise alone (8 seeds) | 0.11 |
| effect / that SE | 3.65 |
| baseline control run at seed 41 | 1.00 (0.45 replicate SDs from the replicate mean) |
| treatment minus control at seed 41, replicate means | -0.71 (SE 0.14, 95% -1.07 to -0.35) |
| the baseline's paired difference at that seed (one run per arm) | -0.95 |

### What it says

1. **The control arm has two outcomes, not a spread.** Without a brain a table either locks into mutual A for all five rounds
   (cooperation 1.00: four of five replicates here, two of eight baseline runs) or falls apart (0.25 to 0.35, once 0.60). A mean of
   such runs moves in steps: one more locked table in eight changes it by about 0.09.
2. **The baseline's "spread across seeds" was replicate noise all along.** The seed fixes no deal in this game (see the plan), and the
   replicate SD at one seed (0.29) is the baseline's SD across seeds (0.32). The "paired difference" of the baseline pairs nothing: its
   SD (0.37) is what two independent runs give (0.31 from the replicate SDs of both arms). The series is eight unpaired replicates per
   arm.
3. **Is the firm effect larger than the replicate noise? Yes.** The effect of -0.40 is 3.6 times the standard error that replicate
   noise alone gives eight runs per arm (0.11), and the ten runs here show it again on their own: 0.16 with a brain against 0.87
   without, a difference of -0.71 (SE 0.14, 95 % interval -1.07 to -0.35). No brain table reached mutual A; the brain arm is narrow
   (0.00 to 0.25, SD 0.11, the baseline's 0.10).
4. **The level of the control arm is not settled.** 0.87 here against 0.51 in the baseline: four of five locked tables against two of
   eight (Fisher's exact test, one-sided, p = 0.09). That is within chance, and it is also what a small drift of the model in three
   days, or an influence of the turn order at seed 41, would look like; these runs cannot tell them apart. Thirteen runs together give
   0.65.
5. **The other measures move as much.** Shared-fund cooperation 0.00 to 0.39 in the control arm (SD 0.20) and 0.00 to 0.50 with a
   brain; table points 460 to 523 (SD 28) and 423 to 517 (SD 39). The baseline's "table -37 points per match (SE 11)" has the same
   size here (447 against 484) with a standard error of 22, so these ten runs alone do not show it.
6. **Requests and cost are stable.** Requests per decision 1.32 (1.29 to 1.35) against 1.34 (1.33 to 1.36) in the r1 baseline; cost
   per run 0.012 USD (0.012 to 0.014), the baseline's 0.013. With a brain 1.75 requests per decision and 0.021 USD.

### What it means for the rerun tolerances (paper 02, section 5.2, row 2)

- "Control within 0.35 to 0.65" is too tight to be a test. The mean of 12 control runs has a standard error of 0.09, and its distance
  to the baseline's mean of eight runs one of 0.15: the band of +/-0.15 around 0.51 is one standard error wide, so an unchanged
  platform leaves it about one time in three. These five runs (0.87) would have failed it. A band that an unchanged platform passes
  with 95 % is about 0.22 to 0.80; better is to state the control arm as a share of locked tables with its binomial interval and to
  drop the band on the mean.
- "Effect at most -0.20" holds: the standard error of a 12-run difference is 0.09 to 0.11, so a true -0.40 fails it 2 to 3 % of the
  time, and the same-seed difference here is -0.71. The sign rule of DECISIONS D11 is safe.
- The planning table of section 3.4 lists the econ lab with "SD of paired difference 0.37" and 9 blocks: the unit is an unpaired
  replicate, not a block, and the experiment spec of the rewrite should say so (the same finding as for chess in section 1.1).
- Guardrails: requests per decision moved +/-3 % between replicates and cost up to +11 % in one run; the +10 % and +20 % limits hold
  for a series mean.

### Limits

Five replicates of a two-outcome measure say little about the share of locked tables (four of five: a 95 % interval of about 0.28 to
0.99). The bootstrap interval of the mean is too narrow at n = 5 and the t interval runs past 1; neither fits a bounded two-outcome
measure well. The baseline ran on r1 and three days earlier. The baseline's story hash is not the one this commit produces (P443), so
"the same configuration" rests on the same system prompts and the same pairs and roles, which were compared.
