# The cures of LH18 and LH19, measured

The two small live series of decision A29 ([`refactoring-before-release/DECISIONS.md`](refactoring-before-release/DECISIONS.md)),
run by issue M2-30 on 2026-11-14. They measure what the two cures built by M2-28 and M2-29 change, beside the
numbers of the gate ([`M2-GATE.md`](M2-GATE.md)). Nothing is gated: both specs are exploratory, and the gate's own
numbers stay as they are. Every number below is read from a file on the data branch `data/runs` (commit
`0069c997`, local until the integrator pushes it) or from the spend ledger
[`../games/a29-ledger.jsonl`](../games/a29-ledger.jsonl).

**Result: both effects stay, with the caveat removed.**

- **Quarry (LH18).** With the open quarries frozen per step, no pick request shows a pick of the same step (0 of
  864; the gate's open arm 1292 of 1728), and the table still gains **+75.5 points** (standard error 27.3, 95 %
  interval 5.3 to 145.7, 6 pairs). The gate on the same six seeds: +85.7 (standard error 21.7); on all twelve:
  +84.5 (standard error 22.0, 36 to 133).
- **Econ-lab (LH19).** With no result of an earlier game shown in either arm, the brain still lowers cooperation
  in the dilemma by **-0.667** (standard error 0.139, 95 % interval -1.024 to -0.310, 6 runs per arm). The gate:
  -0.771 (standard error 0.084, -0.954 to -0.588, 12 per arm); the old platform: -0.40 (standard error 0.13).

Six runs per arm show that each effect is still there without the loophole. They do not show how large the
loophole's own share was: both differences to the gate have intervals that hold zero and a share of several tens
of points (quarry) or tenths (econ-lab). All guardrails held, no run was excluded, no key value was found in any
file, and the runs cost 0.65 USD of the cap of 1.50 USD.

## What ran

| | |
|---|---|
| Code | commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa` of `rewrite/develop`, clean tree (`kernel.dirty` false in every manifest), runtime revision 3 |
| Model | `anthropic/haiku`, resolved to `claude-haiku-5-5` in every manifest; thinking `medium`, output cap 4000 tokens, provider-default sampling; pricing `pi-ai@1.4.0` (all as in the gate) |
| Runs | 24 finished live runs, 12 per series, at most two in flight; 2 more quarry runs were cut off at their start (deviation 1) |
| Data | branch `data/runs`: `quarry/quarry-open-quarries-frozen/`, `econ-lab/econ-lab-brain-no-results/`, `a29-ledger.jsonl` |
| Check of each run | `swt log verify` exit 0 for the 24 finished folders; a `REPORT.md` by `swt report <run> --game <game file>` in each. The two cut-off folders fail the check (`SWT-L002`) and get no report (`SWT-E006`), as they should |

## Cost

| Series | Spec, hash | Runs | Cap of the spec (USD) | Expected (USD) | Cost (USD) |
|---|---|---:|---:|---:|---:|
| `quarry-open-quarries-frozen` | `games/quarry/experiments/open-quarries-frozen.json`, `060b26c57be5` | 12 | 0.60 | 0.46 | 0.4594 |
| `econ-lab-brain-no-results` | `games/econ-lab/experiments/brain-no-results.json`, `0636c80a28b6` | 12 | 0.40 | 0.20 | 0.1920 |
| **Sum** | | 24 | cap of the ledger 1.50 | 0.66 | **0.6515** |

The ledger holds 26 reservations and 24 cost lines. Two reservations of 0.10 each are open: the two cut-off quarry
runs (deviation 1), which spent about 0.0001 USD and nothing (3 requests, and no finished request) and have no cost line. So
the ledger counts 0.85 against its cap, 0.20 more than was spent. The dearest run cost 0.0448 (cap 0.10) in
quarry and 0.0232 (cap 0.05) in econ-lab. The cost is what the platform computes from the token counts and the
price table; it was not compared with a bill of the provider.

## Quarry: open quarries frozen per step

The arm `open-frozen` shows every seat the quarries of all seats as they stood when the step opened; a pick of
the same step is not in the line. The control is the gate's control (own quarry only). Six seeds, paired, the
first six seeds of the gate.

| Seed | Control | Open, frozen | Difference | Gate: control | Gate: open, live | Gate: difference |
|---:|---:|---:|---:|---:|---:|---:|
| 31 | 1096 | 1098 | +2 | 1020 | 1119 | +99 |
| 37 | 888 | 956 | +68 | 899 | 918 | +19 |
| 41 | 855 | 989 | +134 | 863 | 1019 | +156 |
| 43 | 888 | 1024 | +136 | 994 | 1033 | +39 |
| 47 | 961 | 1085 | +124 | 988 | 1120 | +132 |
| 53 | 928 | 917 | -11 | 917 | 986 | +69 |
| **Mean** | 936.0 | 1011.5 | **+75.5** | 946.8 | 1032.5 | +85.7 |

| | This series (frozen) | Gate, the same six seeds (live) | Gate, twelve seeds (live) |
|---|---|---|---|
| **Estimate** | **+75.5** | +85.7 | +84.5 |
| Standard error | 27.3 | 21.7 | 22.0 |
| 95 % interval (t) | 5.3 to 145.7 | 29.8 to 141.5 | 36.0 to 133.0 |
| n | 6 pairs | 6 pairs | 12 pairs |
| Exact sign-flip p | 0.094 (the least possible with 6 pairs is 0.031) | | 0.00098 |
| Seats that share a lane, per match | 0.67 against 4.17: -3.50 (SE 0.89, -5.78 to -1.22) | 1.33 against 4.33 | 1.17 against 4.42: -3.25 (SE 0.35) |
| Pick requests that show a pick of the same step | **0 of 864** | 646 of 864 by the same script | 1292 of 1728 |
| Brains written | 12 in every run of both arms | | 12.0 against 11.83 |

The control of this series and the control of the gate are the same arm on the same seeds, and differ by +76,
-11, -8, -106, -27 and +11 points: the same seed does not give the same match, the model is not deterministic.
That is the noise the six pairs have to carry.

**Frozen against live.** Open-frozen of this series minus open-live of the gate, per seed: -21, +38, -30, -9,
-35, -69 (mean -21). Against each series' own control (difference of the paired differences): -97, +49, -22, +97,
-8, -80, mean **-10.2** (standard error 30.3, interval -88 to +68).

**What the six pairs show.** Open quarries raise the table's points when no seat sees a pick of the same step:
the interval excludes zero, five of six seeds are positive, and the mechanism the finding names is there without
the move order (seats spread over the lanes: shared lanes fall from 4.17 to 0.67, as in the gate). The effect is
therefore not made by the move order inside a step.

**What they cannot show.** How much of the gate's +84.5 the move order was. The best estimate of that share is
10 points, with an interval from -88 to +68: a share of zero and a share of most of the effect are both inside.
The exact p of 0.094 is not a confirmation by itself; a series of 6 pairs cannot go below 0.031. The numbers
belong beside the gate's, not in its place.

**In the play** (read line by line: `quarry-001`, open-frozen, seed 31; `quarry-003`, control, seed 47). With the
frozen line a seat reasons about what the others held when the step opened and can no longer answer a pick just
made: in `quarry-001` the four seats settle into four different lanes during game 1 and name them in their pick
reasons (#328).
What the seats of the gate did with the live line (leave a metal because the seat asked before just took it) does
not occur; a collision inside one step now happens and is seen one step later. The seats read the line as
"current", which it is at the opening of the step. One confusion is carried from the gate's open arm and not
caused by the cure: a seat takes its own row of the line for a rival (P461 below).

## Econ-lab: the brain, with no results of earlier games

Both arms play with `showResults` off: no later game starts with the points of the game before. The arm `nobrain`
then has no memory at all between games; the arm `brain` has only what the seat wrote itself. Six labels per arm
(41 to 46), unpaired.

| Label | `nobrain` | `brain` | Gate: `nobrain` | Gate: `brain` |
|---:|---:|---:|---:|---:|
| 41 | 1.00 | 0.25 | 1.00 | 0.05 |
| 42 | 1.00 | 1.00 | 1.00 | 0.10 |
| 43 | 1.00 | 0.35 | 1.00 | 0.10 |
| 44 | 1.00 | 0.10 | 1.00 | 0.10 |
| 45 | 1.00 | 0.10 | 1.00 | 0.10 |
| 46 | 1.00 | 0.20 | 1.00 | 0.00 |
| **Mean** | 1.000 | 0.333 | 1.000 | 0.075 |

A label is not a pairing here (the spec is unpaired; the label only names the run), so the rows are read as two
columns of six.

| | This series (no results) | Gate, the same six labels | Gate, twelve per arm | Old platform |
|---|---|---|---|---|
| **Estimate, `brain` minus `nobrain`** | **-0.667** | -0.925 | -0.771 | -0.40 |
| Standard error | 0.139 | 0.017 | 0.084 | 0.13 |
| 95 % interval (Welch) | -1.024 to -0.310 | | -0.954 to -0.588 | |
| n | 6 per arm | 6 per arm | 12 per arm | 8 paired seeds |
| Exact label-permutation p | 0.015 | | 0.0000022 | |
| Locked tables (cooperation 1.00), `nobrain` | 6 of 6 (Wilson 0.61 to 1.00) | 6 of 6 | 9 of 12 (0.47 to 0.91) | 2 of 8 |
| Locked tables, `brain` | 1 of 6 (Wilson 0.03 to 0.56) | 0 of 6 | 0 of 12 (0 to 0.24) | |
| Cooperation in round 1 of the dilemma | -0.333 (SE 0.083, -0.548 to -0.119) | | -0.583 (SE 0.064) | |
| Cooperation in the shared fund | +0.081 (SE 0.084, -0.136 to +0.298) | | +0.0003 (SE 0.027) | |
| Points of the table | -10.7 (SE 19.1, -59.9 to +38.4) | | -30.9 (SE 5.8) | |

**Checked by script.** Of the 2129 input texts of the twelve runs none holds a result of an earlier game from the
platform (the patterns `Results so far`, `in all`, `earlier game`, `Points:`, `game 1:`, `game 2:`), and each of
the 96 first requests of a later game starts with an empty conversation. What does cross a game border is the
seat's own writing: 21 of the 48 brain texts given back to a seat name a result of an earlier game. That is the
arm, not a leak.

**What the six runs per arm show.** The brain lowers cooperation in the dilemma against seats with no memory at
all: the interval excludes zero, and every table without a brain locks at full cooperation while five of six
with a brain do not. The caveat of LH19 ("results without a written lesson, not no memory") is therefore not
what makes the effect.

**What they cannot show.** How much of the gate's -0.771 the results line was. This series minus the gate is
+0.10 (standard error about 0.16, interval about -0.26 to +0.47): no difference shown, and a third of the effect
either way is inside. One table with a brain locked at 1.00 (`econ-lab-006`, label 42), which no table of the
gate's brain arm did; 1 of 6 against 0 of 12 is no difference by an exact test (p 0.33). The estimate is still
larger than the old -0.40, for the reason the gate gave: the tables without a brain lock.

**In the play** (read line by line: `econ-lab-003`, `nobrain`, label 41; `econ-lab-001`, `brain`, label 45; the
dilemma of `econ-lab-006`). Without a brain and without results, each game starts blank: the seats open the
dilemma with A, see A from all, and stay there for all rounds (`econ-lab-003` #718 to #912). With a brain, the
lesson a seat writes after the fund ("the others gave little, giving does not pay", `econ-lab-001` #523, #533) is
read at the start of the dilemma and B is chosen in round 1 or after the first B of another seat (#930, #1015,
#1025). In `econ-lab-006` the four brains after the fund all name cooperation as what paid, and the table locks
(#950 to #1019): the brain carries whatever the seat concluded, and here that is nearly always distrust. The seats
with a brain now write the results into it themselves, since nothing else keeps them.

## Guardrails

| Guardrail, mean of the arm | Limit | Value | Held |
|---|---|---:|---|
| Quarry control, requests per decision | within 10 % of 1.30 | 1.286 | yes |
| Quarry open-frozen, requests per decision | within 10 % of 1.30 | 1.297 | yes |
| Quarry control, cost per run | at most 0.041 | 0.0349 | yes |
| Quarry open-frozen, cost per run | at most 0.050 | 0.0417 | yes |
| Quarry, missed picks | 0 | 0 in both arms | yes |
| Econ-lab `nobrain`, requests per decision | within 10 % of 1.32 | 1.336 | yes |
| Econ-lab `brain`, requests per decision | within 10 % of 1.75 | 1.801 | yes |
| Econ-lab `nobrain`, cost per run | at most 0.015 | 0.0111 | yes |
| Econ-lab `brain`, cost per run | at most 0.025 | 0.0209 | yes |
| Econ-lab, missed decisions | 0 | 0 in both arms | yes |

Refusal codes, counted from the logs: quarry `BRAIN_TOO_LONG` 45 (control 21, open-frozen 24) and `TOOL_LOCKED`
2; econ-lab `BRAIN_TOO_LONG` 16, all in the brain arm. Every code is in the list of its spec. No `request_failed`
record in any of the 24 runs. `findLeaks` with the key broker over every file of the two series and the ledger: 0
files; no prefix of a provider key, no mail address and no local absolute path in a tracked file.

## Exclusions and deviations

- Exclusions: none. `results.json` of both series lists no deviation; "over every finished run" equals "over the
  included runs".
- Deviations:
  1. **The quarry series was started twice.** The first call of `swt experiment run` was stopped from outside
     after ten minutes by the time limit of the shell that started it (an operator error, not a cap, a leak or an
     exclusion). Four runs were finished and recorded (`quarry-001` to `-004`); two in flight were cut off:
     `quarry-005` (control, seed 41; 36 log lines, 3 requests) and `quarry-006` (open-frozen, seed 47; 18 lines,
     no finished request). The same command with the same spec, caps and ledger was called again and played the
     eight open plans as `quarry-007` to `-014`; a recorded run is not played again. No finished run was replaced
     and no cap was raised. The two folders stay on the data branch unrecorded in `experiment.json`, and their two
     reservations stay open in the ledger (P462). The seeds 41 and 47 were then played whole in both arms.
  2. `develop` moved from `77d0307e` to `12ae02c4` while the series ran (M4 issues: scaffold and oracle
     additions). The runs name the commit they ran on; this file and its rows are written on the newer commit.
  3. The run data was written to a folder beside the checkout and committed to `data/runs` in one commit after
     the last run; the ledger was a file beside the checkout and is copied to `games/a29-ledger.jsonl` here.
  4. One log per arm of each series was read from the first to the last line (four runs, named above), and part
     of a fifth; the others were read by their facts table and by script (picks with reasons, brains, retros,
     refusals).

## What it means for the two findings

| Finding | Before | Now |
|---|---|---|
| Quarry: every quarry visible during the draft | +84.5 (SE 22.0), with the caveat that the effect is "visible quarries plus a move order inside each step" (LH18) | the gate's number stays; the effect is also there with the move order taken away (+75.5, SE 27.3, 6 pairs). The share of the move order is not resolved (-10, interval -88 to +68) |
| Econ Lab: the brain lowers cooperation in the A-or-B game | -0.771 (SE 0.084), with the caveat that the arm without a brain is "results without a written lesson" (LH19) | the gate's number stays; the effect is also there against seats with no memory (-0.667, SE 0.139, 6 per arm). The share of the results line is not resolved (+0.10, interval about -0.26 to +0.47) |

The caveat lines of [`FINDINGS.md`](FINDINGS.md) and the rows LH18 and LH19 of
[`LESSONS-LEARNED.md`](LESSONS-LEARNED.md) carry these numbers. The cures stay options of the two games; the
default play of both games is unchanged, so LH18 and LH19 stay true for the default arms.

## Problems and loopholes

**Loopholes: none new.** What is left of the two known ones:

- LH18: the frozen line closes the view into the same step (0 of 864 by script). The rule text of the open arm
  still says "you see only your own pack and your own quarry" while the line shows all four quarries; the texts
  were not part of the cure.
- LH19: the cure is an option of econ-lab only. Quarry still shows the results line in every arm, and it steers
  play there: in `quarry-003` (control) the seats open game 2 from the final quarries of game 1 (#792, #802) and
  game 3 the same way (#1375).

Problems, rows of [`LESSONS-LEARNED.md`](LESSONS-LEARNED.md):

| Row | In short | Evidence |
|---|---|---|
| P461 | a seat of the open arm takes its own row of the `Quarries:` line for a rival, "denies" itself cards and writes a false lesson into its brain. Carried from the gate's open arm, not caused by the cure | `quarry-open-quarries-frozen/quarry-001`: #864, #1054, #1281 (A03, against #1218), #1507, #1676, #1735, #1767 (A04), #1696, #1718, #1776 (A02); by word pattern 163 texts in the six open-frozen runs against 3 in the control (gate: 261 against 3) |
| P462 | an `experiment run` stopped from outside leaves the runs in flight as folders without a record and their reservations open in the ledger for good; nothing closes or names them | `quarry-005`, `quarry-006` of the same series; ledger lines of the two reservations |
| P463 | a seat reads the number in a card's id as the card's value | `quarry-open-quarries-frozen/quarry-003`: #214, #252, #299, #315, #363 against the pack line #300; `quarry-001` #771 |

Seen again: P447 (the ledger names a run by a path relative to the start directory), P449 (the series README
gives `n` 12 for the unpaired estimate where each arm has 6), P456 (the game READMEs against the play).

## Left open

- The owner's: whether a larger series is worth its cost. To resolve a share of the size seen here (10 points in
  quarry, 0.10 in econ-lab) at these standard errors would take some hundred pairs in quarry and several dozen
  runs per arm in econ-lab; twelve more would only narrow the intervals by about a third. Whether the frozen line
  or the hidden results become the default of a later game (a change of the play after the baseline).
- Proposals, nothing built: mark the reader's own row of the `Quarries:` line or leave it out (P461); correct the
  rule text of the open arm; close or name the reservation of a run that was cut off when the series is resumed
  (P462); show a card's value beside its id (P463). Each of the first, second and fourth changes a prompt.
- The integrator's: the push of `data/runs` at `0069c997` after its own look at the leak scan; the row of M2-30
  in [`ISSUE-RECORD.md`](ISSUE-RECORD.md); the sentence on LH18 and LH19 in the root `README.md`, which is at its
  line limit and was left as it is.
