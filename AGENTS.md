# Agent rules

Every coding agent working in this repository follows [`CLAUDE.md`](CLAUDE.md). It holds the vocabulary, the
workflow, the limits, the licence rule, how to work with the owner, models and keys, and what to do after every
live run. The decisions behind it are in
[`docs/refactoring-before-release/DECISIONS.md`](docs/refactoring-before-release/DECISIONS.md), which wins where
the two differ.

In short, for an agent that starts here: take an issue id from the specification of the milestone, build it in
your own git worktree and branch, commit with the `Signed-off-by` line of the person who operates your session
(never `git commit -s` in an agent session), run the tests of what you changed, and hand the branch to the
integrator, who merges one issue at a time as one squash commit on `develop`. A challenger in a separate session
reviews the work.
