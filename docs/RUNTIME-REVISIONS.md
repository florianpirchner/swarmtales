# Runtime revisions

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
- The git tag `runtime-rN` marks the commit a revision starts at (`runtime-r1` the last commit of revision 1).
  `git merge-base --is-ancestor <run commit> runtime-r2` tells on which side a run lies; `git checkout
  runtime-r1` brings the old runtime back to replay an old run exactly.
- A PR that changes how a run plays raises the revision, adds a row here and sets the tag at its merge commit.

| Revision | From | What changed | Effect seen |
|---|---|---|---|
| r1 | every run up to commit `b6f991c` (tag `runtime-r1`), including the runs of the older arena runtime | the baseline | - |
| r2 | the merge of the runtime-revision PR (tag `runtime-r2`) | A tool answer may end the caller's turn (`ToolSuccess.endsTurn`): its answer alone wakes no new step, so no model call is spent on answering "end your turn". Set by chess (`playMove`, `resign`), Hold'em (an action after which another seat is to act) and liar's dice (a bid or call after which another seat is to act). Under r1 the seat was woken during the opponent's move to answer its own tool result: 114-133 extra requests per four-game chess match, about 15% of the cost (Opus commented on its move, Sonnet called `viewBoard` and put one more board into its context). | chess: about 15% fewer requests per match (to be measured in the r2 baseline run) |
