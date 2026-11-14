# Mechanics

One package per mechanic: `mechanics/<name>/`. A mechanic is one rule of a game, shipped as code (state, tools,
events). The folder is empty at milestone M0; mechanics are ported issue by issue from milestone M1 on.

Rules that the layer check enforces (see [`docs/LAYERS.md`](../docs/LAYERS.md)):

- A mechanic imports `@swarmtales/sdk` and `@swarmtales/contracts`, never `@swarmtales/kernel`.
- A mechanic imports another mechanic only through its `/contract` and `/rules` sub-paths.
- A base mechanic never imports a game mechanic.
