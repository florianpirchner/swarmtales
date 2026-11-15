# @swarmtales/mechanic-contracts

The service contracts that have two providers: consensus-source, brain-source, identity, allowance and
receipt-source. A provider that is not loaded is the second provider of the last three: the caller's `tryCall` comes
back empty and the caller keeps the old answer (the id, no marks part, `none`).

| Export | Service name | Provided by | Used by |
|---|---|---|---|
| `ConsensusSourceService` | `consensus-source` | the mechanic that owns the gated tool (`grid-game`) | `consensus` |
| `BrainSourceService` | `brain-source` | a game other than the grid game | `strategy-brain` |
| `IdentityService` | `identity` | `names`; without it, the id itself | `channels`, `ledger`, `exile` |
| `AllowanceService` | `allowance` | `marks`; without it, no marks part in a reply | `channels` |
| `ReceiptSourceService` | `receipt-source` | `receipts`; without it, `none` | `ledger`, `channels` |
| `FiguresService` | `figures` | `cast`; without it, a message to a figure is refused `UNKNOWN_AGENT` | `channels` |
| `CapExemptionService` | `cap-exemption` | `standoff-tribunal`; without it, no message is exempt from the DM cap | `channels` |

The last three were written by the scaffold of M5 (`12-m5-spec.md`, section 2.2, pattern 4) as service definitions
only, so that their users and providers can be built in any wave.

Its place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).
