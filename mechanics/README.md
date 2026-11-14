# Mechanics

One package per mechanic: `mechanics/<name>/`. A mechanic is one rule of a game, shipped as code (state, tools,
events). Fourteen mechanics are here so far: seven ported with the tabletop games and seven of the city slice (milestone M3);
the others follow issue by issue with the games that need them.

| Mechanic | Used by |
|---|---|
| [`grid-game`](grid-game/README.md) | Hello Game, tic-tac-toe teams |
| [`consensus`](consensus/README.md) | tic-tac-toe teams |
| [`team-channel`](team-channel/README.md) | tic-tac-toe teams |
| [`optimal-referee`](optimal-referee/README.md) | tic-tac-toe teams |
| [`strategy-brain`](strategy-brain/README.md) | tic-tac-toe teams, Quarry, Econ Lab |
| [`draft-rounds`](draft-rounds/README.md) | Quarry |
| [`econ-games`](econ-games/README.md) | Econ Lab |
| [`ledger`](ledger/README.md) | the city slice |
| [`channels`](channels/README.md) | the city slice |
| [`exile`](exile/README.md) | the city slice |
| [`decisions`](decisions/README.md) | the city slice |
| [`human-hand`](human-hand/README.md) (mechanic id `humanHand`) | the city slice |
| [`puzzles`](puzzles/README.md) | the city slice |
| [`court`](court/README.md) | the city slice; replaced by the tribunal at milestone M5 |

The first five of the city slice are base mechanics; `puzzles` and `court` are game mechanics. `exile` names no
other mechanic: `ledger` and `puzzles` listen to its one event, and the gate `scripts/gates/exile-alone.test.ts`
holds that.

[`contracts`](contracts/README.md) is no mechanic: it holds the service contracts that have two providers.

Every mechanic package has a `README.md` in one fixed shape, described in
[`docs/MECHANIC-README.md`](../docs/MECHANIC-README.md). Its generated sections (tools, events, options, services,
metrics, prompts) are written by `pnpm docs:mechanics`; `pnpm check` fails on a stale block.

Rules that the layer check enforces (see [`docs/LAYERS.md`](../docs/LAYERS.md)):

- A mechanic imports `@swarmtales/sdk` and `@swarmtales/contracts`, never `@swarmtales/kernel`.
- A mechanic imports another mechanic only through its `/contract` and `/rules` sub-paths; its tests may import
  another mechanic whole (decision A16).
- A base mechanic never imports a game mechanic.
