# @swarmtales/mechanic-contracts

The service contracts that have two providers: consensus-source and brain-source.

| Export | Service name | Provided by | Used by |
|---|---|---|---|
| `ConsensusSourceService` | `consensus-source` | the mechanic that owns the gated tool (`grid-game`) | `consensus` |
| `BrainSourceService` | `brain-source` | a game other than the grid game | `strategy-brain` |

Its place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).
