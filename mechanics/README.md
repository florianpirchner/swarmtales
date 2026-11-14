# Mechanics

One package per mechanic: `mechanics/<name>/`. A mechanic is one rule of a game, shipped as code (state, tools,
events). Seven mechanics are ported so far; the others follow issue by issue with the games that need them.

| Mechanic | Used by |
|---|---|
| [`grid-game`](grid-game/README.md) | Hello Game, tic-tac-toe teams |
| [`consensus`](consensus/README.md) | tic-tac-toe teams |
| [`team-channel`](team-channel/README.md) | tic-tac-toe teams |
| [`optimal-referee`](optimal-referee/README.md) | tic-tac-toe teams |
| [`strategy-brain`](strategy-brain/README.md) | tic-tac-toe teams, Quarry, Econ Lab |
| [`draft-rounds`](draft-rounds/README.md) | Quarry |
| [`econ-games`](econ-games/README.md) | Econ Lab |

[`contracts`](contracts/README.md) is no mechanic: it holds the service contracts that have two providers.

Every mechanic package has a `README.md` in one fixed shape, described in
[`docs/MECHANIC-README.md`](../docs/MECHANIC-README.md). Its generated sections (tools, events, options, services,
metrics, prompts) are written by `pnpm docs:mechanics`; `pnpm check` fails on a stale block.

Rules that the layer check enforces (see [`docs/LAYERS.md`](../docs/LAYERS.md)):

- A mechanic imports `@swarmtales/sdk` and `@swarmtales/contracts`, never `@swarmtales/kernel`.
- A mechanic imports another mechanic only through its `/contract` and `/rules` sub-paths; its tests may import
  another mechanic whole (decision A16).
- A base mechanic never imports a game mechanic.
