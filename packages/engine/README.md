# @swarmtales/engine

The turn scheduler and the run manifest builder.

| Folder | What it gives |
|---|---|
| `src/turns/` | `turns`, the scheduler of every game so far: passes, blocks, the activation rules, the order (`TurnsOptions`); `afterBlocks: [kinds]` serves actors of the named kinds (a Director) after each block; `arrange` orders the inputs of an activation |
| `src/directors/` | `createDirectorDrivers({ game, ask })`: one driver per Director of a game. A driver takes the Director's queued firings, asks the model port, checks the answer against the Director's output schema and plays the acts as tool calls; `DIRECTOR_RECORDS` are the records `asked` and `answered` it writes |
| `src/run/` | `buildManifest(resolved, run)`: the manifest of a run, with the hashes of the game, the options and the texts |

The package counts toward the budget of the engine (kernel, sdk and this package: at most 4100 code lines). Its
place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).
