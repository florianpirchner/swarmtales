# Refactoring before release

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
