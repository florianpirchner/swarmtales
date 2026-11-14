# Issue record

One row per merged issue: what the work cost. The budget of milestones M0 to M2 and the kill criterion are counted
from this table (decision D4 in [`refactoring-before-release/DECISIONS.md`](refactoring-before-release/DECISIONS.md)).
Work without a row is not allowed.

## Budget for M0 to M2

| | Budget | Kill criterion fires above |
|---|---|---|
| Issues (M0 14, M1 37, M2 24; decision A4) | 75 | 150 |
| Agent tokens, all kinds, cache reads included | 300 million | 600 million |
| Agent cost, where sessions are billed per token | 750 USD | 1500 USD |
| Live model spend | 10 USD | not a kill number; a run stops at its own budget |

The token budget assumes 6 million tokens per issue (builder 3.5, challenger 1.5, rework 1.0). After the first ten
merged issues the median of their recorded tokens replaces that number once; the rule is in D4, and the
recalibration is recorded in an issue.

## How to fill a row

- **Tokens** come from the usage report of the sessions that worked on the issue (builder, challenger, rework),
  in millions with one decimal: input, output, cache read, cache write. Write "not recorded" only when the session
  gives no report, and say why in the note.
- **Wall time** is from the first commit of the work to the merge, in hours.
- **Changed lines** are hand-written lines added plus removed, source and tests apart (`git diff --shortstat`
  without generated and carried files). The issue rule is at most 400.
- **Cost** in USD, where the session is billed per token; otherwise a dash.

## Record

| # | Issue | Milestone | Merged | Tokens in (M) | Tokens out (M) | Cache read (M) | Cache write (M) | Cost (USD) | Wall time (h) | Lines source | Lines tests | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Root of the new `main`: scaffold, licence, gates, check, docs (issues 6 to 13 and 15 of `REWRITE.md` section 8) | M0 | pending | not recorded | not recorded | not recorded | not recorded | - | pending | pending | pending | built in one agent session before the switch; the integrator fills the row from the session's usage report |
