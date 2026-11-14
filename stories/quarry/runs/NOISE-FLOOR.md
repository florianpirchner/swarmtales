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

Not run yet.
