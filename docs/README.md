# Docs

The documentation of Swarm Tales. At milestone M0 it holds the rules of the repository, the plan of the rewrite and
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

## Carried from the old platform

These documents were written for the old platform and are kept as evidence. Their links into code and runs point
at the tag `v0-final`; their words are the old ones (see the retired words in the glossary).

- [`LESSONS-LEARNED.md`](LESSONS-LEARNED.md): the design checklist and the log of problems and loopholes.
- [`CROSS-GAME-FINDINGS.md`](CROSS-GAME-FINDINGS.md): what helped the residents across the games. Every row is an
  "old platform" result until it is reproduced.
- [`RUNTIME-REVISIONS.md`](RUNTIME-REVISIONS.md): revisions 1 and 2 of the old engine. The new kernel starts at 3.
- [`RELATED-WORK.md`](RELATED-WORK.md): comparison with other projects; rewritten at milestone M6.
- [`ideas/readme-structures.md`](ideas/readme-structures.md) and [`ideas/readme-drafts/`](ideas/readme-drafts/):
  the three README drafts that the decided outline draws on.

## How the checks work

`pnpm check` runs, in this order: typecheck, lint (size limits, TSDoc, 4 GB heap), tests (unit tests plus the
gates under `scripts/gates/`: budgets, kernel word list, English only, README length, name lint, exception format,
workspace shape), the layer check, the licence gate, the sign-off check, the build and the API reports. The first
failure stops it. It prints a summary table and fails above 10 minutes or 6 GB; a gate that is still running when
the time ends is stopped.
