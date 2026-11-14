# Refactoring before release

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Phase 1 (analysis and definition) of the planned rewrite of Swarm Tales. Papers only; nothing here is built.

Read [`DECISIONS.md`](DECISIONS.md) first: what the agent team decided on the owner's delegation, including the
licence policy and where the rewrite happens. Then read [`REWRITE.md`](REWRITE.md), the merged plan with the target
design, the migration steps and the first issue list. Where the two differ, `DECISIONS.md` holds. The other papers
are their evidence:

- [`BRIEF.md`](BRIEF.md): the goal and the owner's fixed decisions.
- [`01-architecture.md`](01-architecture.md): kernel, scheduler, plugin cut, layering, security.
- [`02-experiment-science.md`](02-experiment-science.md): seeds, manifest, statistics, rerun plan.
- [`03-game-design.md`](03-game-design.md): inventory and recut of the mechanics, anatomy of a Game.
- [`04-developer-experience.md`](04-developer-experience.md): audit, first hour, CLI, errors, docs, sample ladder.
- [`05-challenge.md`](05-challenge.md): fact check, contradictions between the papers, cut list, kill criterion.
- [`06-chess-engine.md`](06-chess-engine.md): the chess reference engine that replaces Stockfish.

The specification of a milestone is written and challenged before its issues start:

- [`08-m1-spec.md`](08-m1-spec.md): milestone M1, the skeleton: packages, the layer table, contracts, kernel,
  scheduler, sdk, testkit, the port of tic-tac-toe teams, and the issue list with its waves.
- [`09-m2-spec.md`](09-m2-spec.md): milestone M2, live and measured: models with the key broker, redaction and
  the canary test, the cost cap, the lab, the port of quarry and econ-lab, the experiment protocol of the gate,
  and the issue list with its waves. Challenged on 2026-11-14 (its section 14); decisions A12 to A15.
- [`10-m3-spec.md`](10-m3-spec.md): milestone M3, the City slice: seven mechanics, the Director, the decision
  window, the Human Hand, snapshot, resume and replay, and the issue list with its waves. Challenged on
  2026-11-14 (its section 19); decisions A19 to A24.

What the builders found against a specification is in its errata file:
[`08-m1-spec-errata.md`](08-m1-spec-errata.md), [`09-m2-spec-errata.md`](09-m2-spec-errata.md),
[`10-m3-spec-errata.md`](10-m3-spec-errata.md). [`RESUME.md`](RESUME.md) is the integrator's note on where the work
stands.
