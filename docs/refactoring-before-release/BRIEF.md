# Rewrite before release: phase 1 brief (analysis and definition)

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Status: phase 1 of a planned from-scratch rewrite of Swarm Tales. This phase produces papers only.
No code changes, no repository move, nothing is built. Flo (the owner) decides the next step.

## Why

The owner's observation: the current cut has grown historically. Some mechanics depend on others
although the logic belongs elsewhere (example he named: why does `exile` need `puzzles`?). The
kernel was meant to be super slim (target under 1500 lines, no game words) and is about 5200 lines
today. With everything learned from about 150 PRs and many live runs, the idea is to analyse,
define, recut and reprogram from zero, including the kernel.

## Decisions already made by the owner (do not reopen, build on them)

- "Story" is renamed to "Game" (a story may become one kind of game; say what you recommend).
- "Overseer" is renamed to "Director" (model actors that are not residents: Gamemaker, Confessor,
  Judge, Weaver ...).
- Licence: 100% Apache 2.0.
- The kernel is definable/configurable. Example: agents may run in parallel on their own instead
  of being stepped by a seeded turn scheduler. So the scheduler is pluggable (seeded turn-based
  versus async parallel); the hash-chained event log keeps runs auditable where they are not
  reproducible.
- Code limits enforced by ESLint in check and CI: max 300 lines per file (warn at 250), max 50
  lines per function, complexity about 10, a test for the kernel's total line budget; tests and
  generated files get a higher limit; exceptions only with a comment and a linked issue.
- Every exported symbol has TSDoc (@param, @returns, @throws; @example for key APIs), enforced
  with eslint-plugin-jsdoc and api-extractor; Typebox schemas always carry a description; TypeDoc
  API reference.
- Developer experience is a first-class goal with a veto. Three personas: game builder (uses
  shipped mechanics), mechanic author, Director author. Each must be guided from line one.
  Docs must be excellent. A sample ladder leads from beginner to expert (see the DX paper).
- Workflow after phase 1: current repository becomes `swarmtales_old` (archived, agents keep
  read access), a new repository `swarmtales` starts clean; issue-driven (no change without an
  issue); `main` and `develop` branches.
- All old runs are discarded as results and every game is rerun on the new architecture; old
  runs serve as the baseline for comparison.
- Later development: Opus for kernel, contracts, Director API and challengers; Sonnet for
  mechanical porting; Fable for milestone architecture reviews.

Carry-over candidates: chain log (`packages/chain`), viewer, mechanic README format and generator,
Typebox, Human Hand, dials. Avoid the second-system effect: the kernel gets smaller, not bigger.

## Rules for every paper

- English only. Markdown. Target 400 to 800 lines; dense, concrete, no filler.
- Ground every claim about the current state in the repository: cite paths (and line counts or
  identifiers where useful). Read the code and docs yourself; do not guess.
- Name things concretely: proposed package names, interface sketches in TypeScript (sketches in a
  paper are fine; do not create or change any source file), dependency rules.
- End with: "Open decisions" (each with options, a recommendation and the reason), "Risks", and
  "Proposed first issues" (title plus one line each).
- Write only your own paper file under `docs/refactoring-before-release/`. Do not touch any other
  file. Do not run git commit, push, or `pnpm check`. Do not call live models.

## Where to look

- `README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/HOW-IT-WORKS.md`, `docs/SPEC.md`,
  `docs/STORY-FORMAT.md`, `docs/CLI.md`, `docs/LESSONS-LEARNED.md` (problem and loophole log plus
  design checklist), `docs/RUNTIME-REVISIONS.md`, `docs/CROSS-GAME-FINDINGS.md`,
  `docs/MECHANIC-README.md`, `docs/RELATED-WORK.md`.
- Earlier idea and design papers: `docs/ideas/` (monorepo.md, overseers-and-plugins.md,
  tool-naming.md, istant.md, plugin-market.md), `docs/design/` (mechanic-api.md, overseer-api.md,
  step18-decisions.md, carve-decisions.md, event-log-signing.md, grants-auto.md).
- Code: `packages/` (contracts 3860 lines, kernel 5180, sdk 2294, roles 4791, chronicle 8235,
  chain 579, models, prompts, testkit, viewer-core, viewer-ui, novelist, legacy-log), `apps/`
  (cli 5274, viewer-web, vscode), `mechanics/` (39 packages, about 30000 lines, each with a
  generated README), `stories/` (15 games), `library/`, `archetypes/`, `lab/`, `examples/`.
