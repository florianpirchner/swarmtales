# Requests of team T3 (puzzles, progression, goals)

The frozen APIs in `mechanics/shared` were not enough for some of what the old world did. Nothing
in `mechanics/shared` was edited; each request below is met by a local adapter that the integration
owner can fold into `mechanics/shared` (then the copies are deleted). A mechanic never imports
another, so an API two mechanics share is defined twice, identically, and matched by its name; a test
keeps both copies equal.

| # | Request | Local adapter | Used by |
|---|---------|---------------|---------|
| 1 | `PuzzlesApi.kindOf(level)`: the puzzle kind of a dealt level (`fragments`, `additive`, `none`). Progression needs it for the digits-only format check and the `awaitsCode` status part. | `puzzles-extras.kindOf` | progression |
| 2 | `PuzzlesApi.taskValues(resident, level)`: the task placeholders a puzzle fills (`length`, `overlap`, `fragment`, `digits`, `factors`; old `#puzzleValues`). | `puzzles-extras.taskValues` | progression |
| 3 | `PuzzlesApi.holders(resident, level)`: who holds what the resident needs on an additive level (old `#holdersOf`). | `puzzles-extras.holders` | progression, standoff |
| 4 | `PuzzlesApi.revealFactor(level, target)`: the director's release of a city factor (old `revealFactor`, writes `factor_revealed`). | `puzzles-extras.revealFactor` | script |
| 5 | `ProgressionApi.nextPenalty(resident)` and `nextBlamePenalty(resident)`: the price of the next wrong code or lost blame in the act (old `nextPenalty`, `nextBlamePenalty`). Task texts and the standoff use them. | `progression-extras` | progression, standoff-tribunal |
| 6 | `ProgressionApi.chargeBlame(resident)`: a lost blame counts toward the ladder and returns its price (old `#chargeBlame`). | `progression-extras` | tribunal, standoff-tribunal |
| 7 | `ProgressionApi.endAct(fromLevel)`: a tribunal reaching its target ends the act (old `#endAct`). It resolves the goals and, later, the seal. | `progression-extras` | tribunal |
| 8 | `MarksApi` names no prices. The holder notice ("piece ... costs a mark") says that giving costs nothing (`progression/cost-free`) instead of the marks price. Add `MarksApi.priceOf(channel)` to restore the text. | none (text differs) | progression |
| 9 | The task text had addenda of other mechanics: the names rule, the marks rule and the holdout rule (old `#renderTask`). Progression renders the story's template and nothing else. Either `NamesApi`, `MarksApi` and the holdout mechanic contribute lines to the `task` input kind, or `ProgressionApi` gets a hook for addenda. | none (text differs) | progression |
| 10 | `getStatus` of the old tool listed unread DMs, the lines of every receipt and the tools in the story's order. Progression prints the marks, the DM window and the receipt count; it needs `ChannelsApi.pendingDms(resident)` and `ReceiptsApi.list(resident)` for the rest. `activeTools` lists the managed tools only (the tools the levels open), not the tools no level manages. | none (reply differs in `getStatus` and `activeTools`) | progression |
| 11 | `GoalsApi.actStarted`, `actEnded`, `noteLeaders`, `noteHeir` and `goalOf`: the old world dealt and resolved goals inside `#noteActStarts` and `#endAct`, and the tribunal and the wills told the book who led and who inherited. | `goals-extras` | progression (calls `actStarted`, `actEnded`), tribunal (`noteLeaders`), exile (`noteHeir`) |
| 12 | `CoresApi.drivesOf(resident)`: the drive ids of a core, the strongest first. Goals follow the core. | `cores-extras` | goals |

## Notes for the integration owner

- **Load order.** Progression deals the goals of the start act in its `runStarted`, so the cores
  must be dealt by then (the cores mechanic must load before progression, or deal in its own
  `runStarted` hook that runs first). Without cores the goals are dealt at random.
- **Exile.** Goals does not listen to `exiled`: the exile calls `GoalsApi.onExiled` in the old order
  (pieces, burn, goal, seal, contraction). A second call for the same resident is a no-op.
- **Task once per level** moved into progression (`delivered`); the finished notice is a `task`
  line, so it stays before the DMs.
- **The door opening** enters the waiting residents in roster order and logs their `level_up` after
  the door's `deal`; a resident who passed the door level is logged with `level_up` at the pass, as
  before.
- **Tool locks** use `ctx.access`: progression opens the tools of the resident's level and closes the
  other managed ones. A tool no loaded mechanic defines is skipped, since the story names more tools
  than the loaded mechanics define while the carve is partial.
- **Stand-ins in the tests** (named so in the test titles): ledger, channels, receipts (golden
  ids), cores (golden drives) and a one-tool exile.
