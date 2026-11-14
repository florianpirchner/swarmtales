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

Not run yet.
