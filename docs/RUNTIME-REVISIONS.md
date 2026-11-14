# Runtime revisions

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

The runtime revision (`RUNTIME_REVISION` in `packages/kernel/src/revision.ts`) changes only when the runtime
changes how a run plays: when a resident is woken, what stays in its context, how tool notices and tool answers
arrive. It does not change with every commit. Runs of one revision are comparable; a comparison that mixes
revisions says so.

- Every run writes its revision into the genesis of its chain (`runtime`), into `000-run.json` (`runtime`) and
  into the header of its `REPORT.md`; `swt log verify` shows it.
- **A run that names no revision is revision 1.** Run data is never rewritten afterwards: `events.jsonl` is
  signed, and the run's private key is gone.
- A recorded run folder carries the revision in its name when it is not 1: `chess-02a-045-default-g4-s41-r2`.
  Folders without a suffix are r1.
- Every runs index has a `Runtime` column.
- The git tag `runtime-rN` (set by hand: the cloud container cannot push tags) marks the commit a revision starts at (`runtime-r1` the last commit of revision 1).
  `git merge-base --is-ancestor <run commit> runtime-r2` tells on which side a run lies; `git checkout
  runtime-r1` brings the old runtime back to replay an old run exactly.
- A PR that changes how a run plays raises the revision, adds a row here and sets the tag at its merge commit.

| Revision | From | What changed | Effect seen |
|---|---|---|---|
| r1 | every run up to commit `b6f991c` (tag `runtime-r1`), including the runs of the older arena runtime | the baseline | - |
| r2 | commit `4271ceb` (PR #145, tag `runtime-r2`) | A tool answer may end the caller's turn (`ToolSuccess.endsTurn`): its answer alone wakes no new step, so no model call is spent on answering "end your turn". Set by chess (`playMove`, `resign`), Hold'em (an action after which another seat is to act) and liar's dice (a bid or call after which another seat is to act). Under r1 the seat was woken during the opponent's move to answer its own tool result: 114-133 extra requests per four-game chess match, about 15% of the cost (Opus commented on its move, Sonnet called `viewBoard` and put one more board into its context). | chess: about 15% fewer requests per match (to be measured in the r2 baseline run) |
| r3 | the rewritten kernel (branch `rewrite/develop`, milestone M1; the tag `runtime-r3` is set when `main` moves) | The new kernel with the `turns` scheduler: ticks from 0, one log of envelopes, the event names of the kernel. It plays tic-tac-toe teams as r2 did (nine oracle files at level 3). Added in M2 without a new revision, because none changes when a resident is woken or what it is shown: records of declared sources (`Kernel.record`, `Activation.record`), limits given from outside (`KernelPorts.limits`), redaction of the end detail through `KernelPorts.redact` | none on play |
| r4 | issues M4-01 and M4-02 of milestone M4 (branch `rewrite/develop`, decision A34; the tag `runtime-r4` is set by hand at the merge commit of M4-02, and no run is recorded between the two merges) | No payload holds a log position. M4-01, the mechanic `decisions`: `decision_settled.amendments[]` names an amendment by `n`, its number within its decision from 1, where it held `seq`, the log position of the amending call; `decision_amended` carries the same `n`. Not changed: when a resident is woken and what a resident is shown; the reply of `amendDecision` and every prompt text are as they were | The played log of a game with an amended decision changes in these two payloads; a log without an amendment is byte-equal to its r3 log. No tabletop game has a decision, so no oracle file and no log of the M2 gate changes: r4 runs of those games stay comparable with their r3 runs. A resumed run writes the same `decisions` payloads as the straight run |
