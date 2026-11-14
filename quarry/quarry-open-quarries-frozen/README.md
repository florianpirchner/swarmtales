# Experiment quarry-open-quarries-frozen

How much do open quarries raise the table's points when no seat sees a pick of the same step (the gate's open arm, with the live line of lesson LH18: +84.5, standard error 22.0, 12 pairs)?

## Plan

- Purpose: exploratory; design: paired
- Game: `games/quarry/game.ts`; model: anthropic `haiku`, thinking medium
- Arms: `control` (control) `{}`; `open-frozen` `{"openHands":true,"frozenHands":true}`
- Seeds: 31, 37, 41, 43, 47, 53; replicates: 1
- Primary metric: `draft-rounds.tablePoints`; secondary: `draft-rounds.sharedLanes`, `strategy-brain.brainWrites`
- Exclusions: failed-request, missed-decision, cost-cap, error-end
- Budget: 0.1 USD per run, 0.6 USD in total
- Spec hash: `060b26c57be57a11f51ee3dfe363530ea0b96eb0da5d7a570fc20f22f050601d`; code: commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`, runtime revision 3

## Runs

| Run | Arm | Seed | Replicate | Status | Reason | Cost (USD) | Signed head |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `quarry-001` | `open-frozen` | 31 | 0 | included |  | 0.0391 | `9de20718b610` |
| `quarry-002` | `open-frozen` | 53 | 0 | included |  | 0.04157 | `36e13d132ea0` |
| `quarry-004` | `open-frozen` | 37 | 0 | included |  | 0.04169 | `75e44b13e733` |
| `quarry-003` | `control` | 47 | 0 | included |  | 0.03497 | `e388409ca42a` |
| `quarry-007` | `control` | 41 | 0 | included |  | 0.03431 | `1a0035212fe7` |
| `quarry-008` | `open-frozen` | 47 | 0 | included |  | 0.04484 | `00b9d0f40ba8` |
| `quarry-010` | `control` | 43 | 0 | included |  | 0.03433 | `1c3e25010a8c` |
| `quarry-009` | `control` | 37 | 0 | included |  | 0.0364 | `fd7b43cc401f` |
| `quarry-012` | `control` | 53 | 0 | included |  | 0.0337 | `fd011748a25f` |
| `quarry-011` | `open-frozen` | 43 | 0 | included |  | 0.04109 | `51240e881f41` |
| `quarry-013` | `control` | 31 | 0 | included |  | 0.03561 | `9e71b2913abe` |
| `quarry-014` | `open-frozen` | 41 | 0 | included |  | 0.04182 | `4e60dd84ff2a` |

## Means by arm (included runs)

| Metric | `control` | `open-frozen` |
| --- | --- | --- |
| `draft-rounds.tablePoints` | 936 (n 6) | 1012 (n 6) |
| `draft-rounds.sharedLanes` | 4.167 (n 6) | 0.6667 (n 6) |
| `strategy-brain.brainWrites` | 12 (n 6) | 12 (n 6) |
| `models.requests` | 185.2 (n 6) | 186.8 (n 6) |
| `draft-rounds.decisions` | 144 (n 6) | 144 (n 6) |
| `models.costUsd` | 0.03489 (n 6) | 0.04169 (n 6) |
| `draft-rounds.missedPicks` | 0 (n 6) | 0 (n 6) |

## Estimates

| Metric | Role | Over | Estimate | SE | 95 % interval | n | p | Estimator and test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft-rounds.tablePoints` | primary | included | 75.5 | 27.31 | 5.285 to 145.7 | 6 | 0.09375 | mean of the paired differences, treatment minus control; sign-flip exact |
| `draft-rounds.tablePoints` | primary | finished | 75.5 | 27.31 | 5.285 to 145.7 | 6 | 0.09375 | mean of the paired differences, treatment minus control; sign-flip exact |
| `draft-rounds.sharedLanes` | secondary | included | -3.5 | 0.8851 | -5.775 to -1.225 | 6 | 0.0625 | mean of the paired differences, treatment minus control; sign-flip exact |
| `draft-rounds.sharedLanes` | secondary | finished | -3.5 | 0.8851 | -5.775 to -1.225 | 6 | 0.0625 | mean of the paired differences, treatment minus control; sign-flip exact |
| `strategy-brain.brainWrites` | secondary | included | 0 | 0 | 0 to 0 | 6 | 1 | mean of the paired differences, treatment minus control; sign-flip exact |
| `strategy-brain.brainWrites` | secondary | finished | 0 | 0 | 0 to 0 | 6 | 1 | mean of the paired differences, treatment minus control; sign-flip exact |

The exclusion `missed-decision` depends on what the residents did, so the rows over the included runs are conditioned on their play. The rows over the finished runs count every finished run that has a value, an excluded run in place of its replacement; read both.

## Pass rule

none: the experiment is reported, not gated

## Guardrails

| Metric | Per | Arm | Mean | Result |
| --- | --- | --- | --- | --- |
| `models.requests` | `draft-rounds.decisions` | `control` | 1.286 | held |
| `models.requests` | `draft-rounds.decisions` | `open-frozen` | 1.297 | held |
| `models.costUsd` |  | `control` | 0.03489 | held |
| `models.costUsd` |  | `open-frozen` | 0.04169 | held |
| `draft-rounds.missedPicks` |  | `control` | 0 | held |
| `draft-rounds.missedPicks` |  | `open-frozen` | 0 | held |

## Tolerance

none: no baseline was compared

## Deviations

none

## Reading, loopholes, problems and solutions (written by the reviewer, issue M2-30)

The series of decision A29 for the cure of loophole LH18 (issue M2-28): the control arm against open quarries that
are frozen at the start of each pick (`openHands` and `frozenHands`), on the first six seeds of the gate's series
`quarry/quarry-open-quarries`. Write-up: `docs/M2-CURES.md` on `develop`. Ledger: `a29-ledger.jsonl`.

**The cure holds in play.** By script over the six `open-frozen` runs: 864 pick requests carry a `Quarries:` line,
every one shows the quarries as they were when the pick opened, none shows a pick of the same step (the same script
finds 1292 of 1728 in the gate's open arm).

**The estimate beside the gate's.**

| | This series (frozen) | Gate, the same six seeds (live line) | Gate, all 12 seeds |
|---|---|---|---|
| Open minus control, table points | +75.5 (SE 27.3, 95 % interval 5.3 to 145.7, 6 pairs) | +85.7 (SE 21.7, 29.8 to 141.5, 6 pairs) | +84.5 (SE 22.0, 36.0 to 133.0, 12 pairs) |
| Per seed 31, 37, 41, 43, 47, 53 | 2, 68, 134, 136, 124, -11 | 99, 19, 156, 39, 132, 69 | |
| Arm means | control 936.0, open-frozen 1011.5 | control 946.8, open 1032.5 | control 952.8, open 1037.3 |
| Seats that share a lane, per match | 0.67 against 4.17 (difference -3.5, SE 0.89) | 1.33 against 4.33 | 1.17 against 4.42 (difference -3.25, SE 0.35) |

Frozen minus live, seed by seed on the six seeds (the runs of the two series are different runs of the same
deals): -10.2 (SE 30.3, 95 % interval -88 to +68). The exact sign-flip p of this series is 0.094; with six pairs
it cannot go below 0.031.

**What six pairs show and what not.** The effect of open quarries is still positive when no seat sees a pick of
the same step: the interval excludes zero, by a small margin, and the lanes separate as in the gate (the shared
lanes fall as far). The series cannot show how much of the gate's +84.5 was the move order: the difference of
-10 has an interval from -88 to +68, which holds "nothing" and "all of it". Two controls at the same seed differ
by up to 106 points between the two series (seed 43: 994 and 888), so one pair is mostly noise.

**The stopped command and the two folders without a record.** The first call of `swt experiment run` was stopped
from outside after 10 minutes (the time limit of the operator's tool, not a cap, a leak or an exclusion). Four runs
were finished (`quarry-001` to `quarry-004`). The two runs in flight were cut off: `quarry-005` (control, seed 41,
36 log lines, 3 requests) and `quarry-006` (open-frozen, seed 47, 18 lines, 1 request). They have no record in
`experiment.json`, no signed end (`swt log verify`: `SWT-L002`, exit 1), no `REPORT.md`, and their reservations of
0.10 USD each stay open in the ledger. The same command, called again with the same spec, caps and ledger, played
the eight open runs of the plan (`quarry-007` to `quarry-014`; seed 41 control is `quarry-007`, seed 47 open-frozen
is `quarry-008`). No run with a record was played twice, no cap was raised. The two folders are kept as they are.

**Read line by line** (from `events.jsonl`: every input, call, answer, thinking, text, brain and retro):
`quarry-001` (open-frozen, seed 31) and `quarry-003` (control, seed 47). By script over all twelve runs: the
same-step check, the refusals, the texts in which a seat names its own seat.

**Loopholes: none new.** LH18 is cured for this arm (see above). What stays of it: the rules in every pick request
still say "you see only your own pack and your own quarry" above a line that shows all four quarries (the option
changes no text). LH19 is unchanged in this series (`showResults` is on): games 2 and 3 start with the points and
final quarries of every seat, and the first pick follows them ("cobalt is the color that carried the highest quarry
last game", `quarry-003` #792, #802; "jade is the color that ran away in game 2", #1375).

**Problems** (rows in `docs/LESSONS-LEARNED.md` on `develop`):

- P461: a seat of the open arm takes its own row of the `Quarries:` line for a rival. `quarry-001`: A03 "A03 also
  has cobalt 3 as a point of contention" (#864), "A03 is also heavy in cobalt" (#1054), and into its brain "In game
  2 A03 also reached 10 cobalt, so a tie cost me the bonus" (#1281; it held the cobalt majority alone, #1218); A04
  "A04 also has three amber" (#1507, #1676, #1735, #1767); A02 "keeps the rival from a sixth copy" (#1696, #1718,
  #1776). By a word pattern over the texts: 163 texts in the six open-frozen runs, 3 in the six control runs; 261
  and 3 in the gate's series. Carried from the gate's open arm, not from the cure. Proposed: mark the reader's own
  row or leave it out. Built: nothing. Open.
- P462: a stopped `swt experiment run` leaves its runs in flight without a record and their reservations open for
  good (`quarry-005`, `quarry-006`, 0.20 USD held in `a29-ledger.jsonl`). Proposed: settle and record a run on a
  stop signal, and name unrecorded folders when a series continues. Built: nothing. Open.
- P463: a seat reads the number in a card id as a value. `quarry-003`, A04 in game 1: "J10 is the highest-numbered
  card" (#214, also #252, #299, #315, #363), until its brain says "Card numbers are labels only" (#733). Carried.
  Proposed: say in the rules that an id is a label. Built: nothing. Open.
- Known rows seen again: P446 is not seen (12 brains in every run; 45 `BRAIN_TOO_LONG`, 21 in control and 24 in
  open-frozen, each followed by a shorter text); P447 (the ledger names runs by `../runs-data/...`); P456.

Refusals: `BRAIN_TOO_LONG` 45, `TOOL_LOCKED` 2; both in the list of the spec. No `request_failed`. Model as
resolved: `claude-haiku-5-5` in every response; code commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`, clean tree.
Cost: 0.4594 USD for the twelve runs with a record (cap 0.60), plus the two cut-off runs (0.0001 USD by their
logs, at most three requests more).
