# Docs

The documentation of Swarm Tales. During the rewrite it holds the rules of the repository, the plan of the rewrite and
the documents carried from the old platform. Tutorials, how-to guides and the generated reference arrive with the
milestones that build what they describe.

## Rules of the repository

- [`../CLAUDE.md`](../CLAUDE.md): vocabulary, workflow, limits, models and keys, what to do after a live run.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md): the licence of contributions and the sign-off.
- [`GLOSSARY.md`](GLOSSARY.md): the words, one meaning each, and the retired words.
- [`LAYERS.md`](LAYERS.md): which package may import which.
- [`LICENCE-POLICY.md`](LICENCE-POLICY.md): Apache 2.0, the allowlist, the licence gate.
- [`MECHANIC-README.md`](MECHANIC-README.md): the fixed shape of a mechanic's README and its generated sections.
- [`ISSUE-RECORD.md`](ISSUE-RECORD.md): tokens, wall time and changed lines per issue; the budget.

## The rewrite

- [`refactoring-before-release/DECISIONS.md`](refactoring-before-release/DECISIONS.md): what is decided. Binding.
- [`refactoring-before-release/REWRITE.md`](refactoring-before-release/REWRITE.md): the plan, the milestones and
  the first issues.
- [`refactoring-before-release/`](refactoring-before-release/README.md): the role papers behind both.
- The gates and reviews of the milestones: [`M2-GATE.md`](M2-GATE.md) (the gate of M2 with the findings of its
  review), [`M4-GATE.md`](M4-GATE.md) (the gate of M4) and [`M4-REVIEW.md`](M4-REVIEW.md) (the challenger's review of
  M4 and how M4-72 closed it).

## Carried from the old platform

These documents were written for the old platform and are kept as evidence. Their links into code and runs point
at the tag `v0-final`; their words are the old ones (see the retired words in the glossary).

- [`LESSONS-LEARNED.md`](LESSONS-LEARNED.md): the design checklist and the log of problems and loopholes.
- [`FINDINGS.md`](FINDINGS.md) (until M2 `CROSS-GAME-FINDINGS.md`): what helped the residents across the games.
  Every row is an "old platform" result until it is reproduced; the table at its top lists the rows measured again
  on the rewrite (two after the M2 gate).
- [`RUNTIME-REVISIONS.md`](RUNTIME-REVISIONS.md): revisions 1 and 2 of the old engine. The new kernel starts at 3.
- [`RELATED-WORK.md`](RELATED-WORK.md): comparison with other projects; rewritten at milestone M6.
- [`ideas/readme-structures.md`](ideas/readme-structures.md) and [`ideas/readme-drafts/`](ideas/readme-drafts/):
  the three README drafts that the decided outline draws on.

## How the checks work

`pnpm check` runs these gates: typecheck, lint (size limits, TSDoc, 4 GB heap per process), tests (unit tests plus
the gates under `scripts/gates/`: budgets, kernel word list, English only, README length, name lint, exception format,
workspace shape, the mechanic READMEs, `exile` names no other mechanic), the layer check, the licence gate, the
sign-off check, the build and the API reports. They run in three lanes side by side, the gates of a lane one after
the other (`scripts/lib/check-run.ts`, M4-71): the typecheck, then the build (its declarations come from the
typecheck's `tsc -b` output) and the API reports (which read the build); the quick gates, then lint (two ESLint
processes at a time over groups of three folders, `scripts/lint.ts`); the tests (two Vitest workers, the standing
checks first). The output of a gate is printed when it ends. The first failure stops the check. It prints a summary
table and fails when the whole takes more than 10 minutes, or when all gates running at once hold more than 6 GB; a
gate that is still running when the time ends is stopped.
