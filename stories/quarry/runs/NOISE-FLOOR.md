# Noise floor of Quarry

Milestone M0, issue 4 of [REWRITE.md](../../../docs/refactoring-before-release/REWRITE.md) section 8; the method is section 3.4 of
[02-experiment-science.md](../../../docs/refactoring-before-release/02-experiment-science.md). No series in this repository ever ran
the same game, arm and seed twice, so nobody knows how much two identical runs differ. That number is needed before
[quarry-04a-007-paired-seeds](quarry-04a-007-paired-seeds/) can serve as the baseline of the rewritten platform.

## Plan (written and committed before the first live run)

| | |
|---|---|
| Game | `quarry`: 3 games of 2 packs of 6, 4 seats, no burns, place bonus 10/5 (the rules of the baseline series) |
| Arm | `quarry` (private strategy brain, hidden quarries): the control arm of the firm effect "open quarries against the brain arm, +77 (SE 22)" |
| Seed | 31, the first seed of the baseline series (chosen by that rule, not by its result). The seed fixes the deal and the turn order; an offline run of this commit deals the same deck as the recorded `quarry-31` |
| Replicates | 5, one run at a time |
| Command | `pnpm swt run --story quarry --seed 31 --provider anthropic --model haiku --budget 0.40 --no-reporter --runs <dir>` (the baseline's command plus the budget; the reporter is off because it plays no part in the run) |
| Model | Haiku via Anthropic, `claude-haiku-5-5`, thinking level as the story sets it (the default), sampling parameters the provider's defaults; the same as the baseline |
| Code | the commit that adds this plan and the analysis script; every run's signed genesis records it. Runtime revision r2 (the baseline ran on r1; r2 changes only tool answers that end a turn, which Quarry does not use, see [RUNTIME-REVISIONS.md](../../../docs/RUNTIME-REVISIONS.md)) |
| Primary metric | **table points per match**: the sum of the four seats' scores in the one `draft_match_ended` line of `events.jsonl` |
| Also reported | shared lanes (sum of `sharedLanes` over the `draft_game_scored` lines); requests per decision (`request` lines over `draft_card_picked` lines); cost per run (`totals.costUsd` of `usage.json`); missed picks and `turn_error` lines |
| Analysis | `scripts/noise-floor.ts` (code in `scripts/noise-floor-stats.ts`, test `test/scripts/noise-floor.test.ts`): mean, sample SD, range, a percentile bootstrap interval of the mean (10000 resamples, seed 20261114) and a t interval; compared with the SD across the 8 seeds of the baseline and with the effect. Result in [noise-floor.json](noise-floor.json) |
| Exclusion | a run with a `turn_error` or a missed pick is recorded and reported, and run once more for the statistics (P431); nothing else is excluded or repeated |
| Budget | 0.40 USD cap per run (`--budget`); a run costs about 0.035 USD. The whole task (both games and the extensions) stops at 5 USD |
| Reading rule | the effect counts as larger than the replicate noise when it is more than twice the standard error that replicate noise alone would give the series (root of the summed replicate variances of both arms, or root 2 times the control's when only the control is measured, over root 8) |

Extensions, run in this order only when the spending allows it, with the same command and rules:

1. five replicates of the treatment arm `quarry-open` at seed 31;
2. five replicates of the control arm at seed 37, the second seed of the series, to see whether the replicate spread depends on the deal.

Runs go into `quarry-04a-008-noise-floor-r2/` as `<arm>-<seed>-rep<k>/run/`.

## Result

Run on 2026-11-14, commit `5593de4` (clean tree), runtime r2: 15 matches in
[quarry-04a-008-noise-floor-r2](quarry-04a-008-noise-floor-r2/), the five planned ones and both extensions. No `turn_error`, no missed
pick, so nothing was excluded or repeated; every signed log verifies. Cost 0.556 USD. The tables are the output of

```
pnpm tsx --conditions=development scripts/noise-floor.ts --game quarry --replicates stories/quarry/runs/quarry-04a-008-noise-floor-r2 \
  --baseline stories/quarry/runs/quarry-04a-007-paired-seeds --control quarry --treatment quarry-open --seed 31 --digits 0 \
  --out stories/quarry/runs/noise-floor.json
```

Primary metric: `tablePoints`. Bootstrap: percentile interval of the mean, 10000 resamples, seed 20261114.

| Arm | Seed | n | Values | Mean | SD | Range | Bootstrap 95% | t 95% | Requests per decision | Cost per run (USD) | Missed / turn errors |
|---|---:|---:|---|---:|---:|---|---|---|---|---|---|
| `quarry` | 31 | 5 | 1080, 1163, 1109, 1033, 1021 | 1081 | 58 | 1021 to 1163 (142) | 1038 to 1126 | 1009 to 1153 | 1.30 (1.26 to 1.35) | 0.0344 (0.0326 to 0.0362) | 0 / 0 |
| `quarry-open` | 31 | 5 | 1042, 1038, 1132, 1139, 1004 | 1071 | 61 | 1004 to 1139 (135) | 1025 to 1117 | 996 to 1146 | 1.29 (1.26 to 1.33) | 0.0417 (0.0391 to 0.0441) | 0 / 0 |
| `quarry` | 37 | 5 | 948, 877, 882, 874, 936 | 903 | 36 | 874 to 948 (74) | 877 to 931 | 859 to 948 | 1.30 (1.27 to 1.35) | 0.0351 (0.0335 to 0.0385) | 0 / 0 |

Baseline series (runtime r1, seeds 31, 37, 41, 43, 47, 53, 59, 61):

| | Mean | SD across seeds | Range |
|---|---:|---:|---|
| `quarry` | 949 | 52 | 849 to 1003 |
| `quarry-open` | 1026 | 75 | 924 to 1117 |
| paired difference | 77 (SE 22) | 63 | -37 to 153 |

| Comparison | Value |
|---|---:|
| replicate SD of the control / SD across seeds | 1.12 |
| share of the across-seed variance that is the deal, not replicate noise | 0.00 |
| SD of a paired difference from replicate noise alone | 84 |
| SD of the paired difference observed in the baseline | 63 |
| effect / replicate SD of one control run | 1.32 |
| SE of the series effect from replicate noise alone (8 seeds) | 30 |
| effect / that SE | 2.58 |
| baseline control run at seed 31 | 1003 (-1.35 replicate SDs from the replicate mean) |
| treatment minus control at seed 31, replicate means | -10 (SE 38, 95% -99 to 79) |
| the baseline's paired difference at that seed (one run per arm) | 113 |

### What it says

1. **Two identical runs differ by a lot.** Same arm, same deal, same code, same model: the table scores 1021 to 1163 points at seed 31
   (SD 58, 5 % of the mean) and 874 to 948 at seed 37 (SD 36). The spread is made in the later games: at seed 31 game 1 scores 379 to
   428, game 3 283 to 362.
2. **One run per seed says little about that seed.** The baseline's single runs lie 78 points below (seed 31: 1003 against a replicate
   mean of 1081) and 88 points above (seed 37: 991 against 903) the mean of five replicates.
3. **The deal matters too.** The replicate means of the two seeds are 178 points apart (SE about 30). The "share of the across-seed
   variance that is the deal" of 0.00 in the table is not that finding: it compares the replicate SD of one seed (58) with the SD of
   eight single runs (52), which is itself an estimate with a wide interval. Pairing on the seed is right for Quarry.
4. **The paired difference of the baseline is replicate noise and nothing else.** Replicate noise alone gives a paired difference an SD
   of 84; the baseline observed 63 (95 % interval of an SD from 8 values: about 42 to 128). Pairing removes the deal; what is left is
   the model's sampling, and only more seeds or more replicates per seed reduce it.
5. **Is the firm effect larger than the replicate noise? By the reading rule yes, by a small margin, and not at this seed.** The series
   effect of +77 is 2.6 times the standard error that replicate noise alone gives eight seeds (30), above the rule's 2. But with five
   replicates per arm at seed 31 open quarries score 1071 against 1081: a difference of -10 (SE 38, 95 % interval -99 to +79), where
   the baseline's one pair at that seed showed +113. The +113 was noise. A likely reason for no effect on this deal: the control arm
   already shares no lane in games 1 and 2 in all five replicates (shared lanes per match 2.0 against 1.6 with open quarries; seed 37
   has 4.4), so there is nothing for the open quarries to fix. The effect of open quarries depends on the deal, and +77 is the average
   over eight deals measured once each.
6. **Requests and cost are stable.** Requests per decision 1.30 (1.26 to 1.35) against 1.29 (1.26 to 1.32) in the r1 baseline: runtime
   r2 changes nothing in Quarry, as expected. Cost per run 0.034 USD (0.033 to 0.036), the baseline's 0.035.

### What it means for the rerun tolerances (paper 02, section 5.2, row 1)

- A 12-seed paired effect has a standard error of 18 (from the baseline's SD of 63) to 24 (from the replicate SD of 84) points.
- "Open effect at least +38": passed with 95 to 98 % if the true effect is +77. If the true effect is nearer +50, which the seed-31
  result makes possible, a correct port fails this line one time in three or four. "Interval above 0" needs an effect above about 40 to
  53 and fails 2 to 16 % of the time at a true +77.
- The sign rule of DECISIONS D11 is safe: the sign is kept with more than 99 % at a true +77 and about 98 % at +50.
- "Brain effect inside +/-60" is 2.5 to 3.3 standard errors wide and holds.
- A tolerance on the control arm's mean has to allow +/-50 points on the same eight seeds (two series of single runs differ by an SE of
  about 24 from replicate noise alone), and more when the seeds are not the same, because seed means differ by up to 178.
- Guardrails: requests per decision moved +/-4 % between replicates and cost +/-6 %; the +10 % and +20 % limits hold for a series
  mean and are tight but workable for a single run.
- Two replicates per seed and arm would halve the replicate variance of every paired difference for twice the price (0.07 to 0.15 USD
  a seed); more seeds buy the same and also average over deals, so more seeds are the better use of the money.

### Limits

Five replicates give an SD with a wide interval (a 95 % interval of about 0.6 to 2.9 times the value). The bootstrap interval of the
mean is too narrow at n = 5; read the t interval. The comparison uses the replicate SD of seed 31 only. The baseline ran on r1 and
three days earlier; drift of the model behind the name cannot be told apart from noise with these runs (seed 31 came out higher, seed
37 lower). The baseline's story hash is not the one this commit produces (P443), so "the same configuration" rests on the same deck,
the same system prompts, the same first inputs and the same tool lists, which were compared.
