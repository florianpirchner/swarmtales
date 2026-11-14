# Mechanics

One package per mechanic: `mechanics/<name>/`. A mechanic is one rule of a game, shipped as code (state, tools,
events). The table lists every mechanic package: the seven of the first tabletop games, the seven of the city slice
(milestone M3) and the twelve of the ten tabletop games of milestone M4, which are empty packages until their
issues land.

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
| [`liars-dice`](liars-dice/README.md) | liar's dice (M4) |
| [`card-table`](card-table/README.md) | Harbor Lights, Ember Tricks (M4) |
| [`hint-towers`](hint-towers/README.md) | Harbor Lights (M4) |
| [`clue-grid`](clue-grid/README.md) | Lanterns (M4) |
| [`chess`](chess/README.md) | chess (M4) |
| [`trick-play`](trick-play/README.md) | Ember Tricks (M4) |
| [`sealed-auction`](sealed-auction/README.md) | Blind Bid (M4) |
| [`holdem`](holdem/README.md) | hold'em (M4) |
| [`morris`](morris/README.md) | morris teams (M4) |
| [`morris-referee`](morris-referee/README.md) | morris teams (M4) |
| [`convoy`](convoy/README.md) | Convoy (M4) |
| [`salt-market`](salt-market/README.md) | Salt Market (M4) |

The first five of the city slice are base mechanics; `puzzles`, `court` and the twelve of M4 are game mechanics. `exile` names no
other mechanic: `ledger` and `puzzles` listen to its one event, and the gate `scripts/gates/exile-alone.test.ts`
holds that.

[`contracts`](contracts/README.md) is no mechanic: it holds the service contracts that have two providers.

Every mechanic package has a `README.md` in one fixed shape, described in
[`docs/MECHANIC-README.md`](../docs/MECHANIC-README.md). Its generated sections (tools, events, options, services,
metrics, prompts) are written by `pnpm docs:mechanics`; `pnpm check` fails on a stale block. A service table shows
what each method answers with its fields and codes, for example `{ ok: boolean, code?: "UNKNOWN_RESIDENT" or
"ALREADY_EXILED" }` for `banish` of `exile`.

Rules that the layer check enforces (see [`docs/LAYERS.md`](../docs/LAYERS.md)):

- A mechanic imports `@swarmtales/sdk` and `@swarmtales/contracts`, never `@swarmtales/kernel`.
- A mechanic imports another mechanic only through its `/contract` and `/rules` sub-paths; its tests may import
  another mechanic whole (decision A16).
- A base mechanic never imports a game mechanic.
