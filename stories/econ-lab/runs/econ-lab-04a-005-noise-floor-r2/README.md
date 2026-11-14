# econ-lab-04a-005-noise-floor-r2

2026-11-14, runtime r2, commit `5593de4`. The first series that plays the same arm and seed of the econ lab more than once on purpose:
10 matches of the default match (split offer 6 rounds, shared fund 7, A-or-B 5, unknown horizon, rotating pairs), 4 Haiku seats via
Anthropic, five replicates each of

- `econ-lab-nobrain` at seed 41 (the control arm of [econ-lab-04a-003-brain-vs-nobrain](../econ-lab-04a-003-brain-vs-nobrain/)),
- `econ-lab` at seed 41 (the treatment arm: a private strategy brain per seat).

The plan was committed before the first run and is, with the analysis, in [../NOISE-FLOOR.md](../NOISE-FLOOR.md) (machine-readable:
[../noise-floor.json](../noise-floor.json)). Command: `pnpm swt run --story <arm> --seed 41 --provider anthropic --model haiku --budget
0.40 --no-reporter`, one run at a time next to one batch of Quarry runs. Folders `<arm>-41-rep<k>/run/`.

All 10 matches finished with no turn error and no missed decision; every signed log verifies (`swt log verify`). **Cost 0.165 USD**
(no brain 0.062, 93 to 97 requests a match; brain 0.103, 121 to 131 requests), no reporter spend.

## Result

| Arm | A-or-B cooperation (5 replicates) | Mean | SD | Round 1 | Shared fund | Table points | Baseline (003, 8 runs) |
|---|---|---:|---:|---:|---:|---:|---:|
| `econ-lab-nobrain` | 1.00, 1.00, 1.00, 1.00, 0.35 | 0.87 | 0.29 | 0.95 | 0.17 | 484 | 0.51 (SD 0.32) |
| `econ-lab` | 0.20, 0.25, 0.10, 0.00, 0.25 | 0.16 | 0.11 | 0.50 | 0.11 | 447 | 0.11 (SD 0.10) |

**The brain effect stands: -0.71 here (SE 0.14), -0.40 in the baseline, 3.6 standard errors of pure replicate noise.** The control arm
has two outcomes, a table locked into mutual A (1.00) or a collapse (0.35); its mean is 0.87 here against 0.51 in the baseline, which
is within chance (four of five against two of eight locked tables, p = 0.09) and too far apart for the tolerance band planned for the
rerun. The seed fixes no deal in this game, so the baseline's eight "paired seeds" were eight unpaired replicates.

## Digest highlights

- **Without a brain the table opens with A and stays there.** 19 of 20 round-1 choices are A; in four replicates nobody ever chose B.
  In the fifth (rep5) one B in round 1 was answered and the table fell to 0 A in round 5.
- **With a brain half the seats open with B.** Round-1 cooperation 0.50, and by round 3 every brain table is at 0 A. No brain table
  reached mutual A.
- **The split offer differs between the arms here**, which the baseline did not show: without a brain 0.45 to 0.50 of the pot, with
  one 0.18 to 0.50 (four tables 0.18 to 0.38), still with no rejection. A refused brain draft names lowball offers
  (econ-lab-41-rep1 A04 #464: "as proposer offer 1"). Five replicates; not a finding yet.
- **The shared fund is all or nothing per table**: seven of ten tables at 0.00 to 0.05, three at 0.38 to 0.50.

## The reports

Each run has a `REPORT.md` written by `pnpm report:run` without a reporter model (no OpenRouter spend), so it holds the computed part
only, and no model-written highlights, problems or loophole candidates. Reviewed against `events.jsonl`: date, seed, runtime, model,
end minute, cost and the tool-error counts are right. The result tables are city-shaped and wrong for this game (P89, and finding 4 of
paper 02): "Levels solved: none", "Submissions: 0 correct, 0 wrong", "Final standings: unknown" and a list of "Log issues" for every
econ-lab event. The results of this series are the table above and `noise-floor.json`, computed from the `block_scored` and
`match_ended` lines.

## Loopholes

None. No reporter model looked for candidates; the tool errors of all 10 logs were read by hand (below).

## Problems

- **P441** (new): the seed fixes nothing in the econ lab, the control arm has two outcomes, and its level moved from 0.51 to 0.87
  between two series of the same configuration.
- **P443** (new): the story hash of the baseline cannot be reproduced, and `--budget` changes the hash.
- **P120 again**: 10 of 70 brain writes were first refused with `BRAIN_TOO_LONG`; all 60 brain versions exist.
- One `writeBrain` call outside a retro window was refused with `TOOL_LOCKED` (econ-lab-41-rep1 #464). Harmless.
- **P89 again**: the computed report is city-shaped.

## Solutions

- P441: proposed in [../NOISE-FLOOR.md](../NOISE-FLOOR.md): no band on the control mean (or 0.22 to 0.80), the share of locked tables
  with its binomial interval instead, the experiment declared as unpaired replicates. Nothing built; open.
- P443: proposed: the run manifest of the rewrite hashes the game and the run limits apart, and a baseline is only taken from a clean
  tree. Not built; open.
