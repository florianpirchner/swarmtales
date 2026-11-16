# The API freeze

The record of the frozen surface of Swarm Tales (decision A60, section 5 of
[`refactoring-before-release/12-m5-spec.md`](refactoring-before-release/12-m5-spec.md)). What the freeze means for an
author is [`reference/stability.md`](reference/stability.md). Each row of `scripts/api-freeze/frozen.json` (issue
M5-51) names the row of the table "Changes" below that admitted the text of its file.

## Changes

One row for each change of a frozen file. The kind is `freeze`, `addition`, `addition: docs only` or `break`; the gate
checks the kind against the diff from the file's `base` (section 5.2 of the specification).

| Row | Date | Paths | Kind | Decision | What |
|---|---|---|---|---|---|
| F1 | (the merge of M5-57) | every file of the frozen list | freeze | A60 | the surface as M5-50 left it, with the merges up to M5-51 |

## The surface before the freeze (issue M5-50)

Issue M5-50 read every export of the frozen packages once, on `rewrite/develop` at `578e65df`. An export has a user
when a file outside its package and the package's tests imports it by name (from `@swarmtales/<name>`, or from
`swarmtales`, `swarmtales/mechanic` or `swarmtales/testing`), in `packages/`, `mechanics/`, `games/`, `samples/`,
`apps/` or `scripts/`. An export without a user stays when the signature of an export that stays names it (the API
report would otherwise name an internal type in a public one), or when a reason below says why; every other one is
tagged `@internal`.

| Package | Exports | With a user | Only in a signature | Kept, with a reason | `@internal` |
|---|---|---|---|---|---|
| `contracts` | 116 | 104 | 6 | 3 | 3 |
| `kernel` | 6 | 3 | 0 | 0 | 3 |
| `sdk` | 176 | 50 | 59 | 1 | 66 |
| `engine` | 12 | 10 | 2 | 0 | 0 |
| `chain` | 34 | 26 | 6 | 0 | 2 |
| `prompts` | 12 | 1 | 2 | 0 | 9 |
| `runlog` | 26 | 15 | 4 | 2 | 5 |
| `testkit` | 58 | 45 | 8 | 3 | 2 |
| `models` | 90 | 33 | 15 | 3 | 39 |

The umbrella package `swarmtales` holds no export of its own: it re-exports `@swarmtales/sdk` (and `swarmtales/testing`
the testkit), so its surface is theirs.

### Kept without a user, with the reason

| Package | Export | Why it stays |
|---|---|---|
| `contracts` | `ActorIdSchema` | the documented check of an actor id from untrusted text (`ActorId`'s TSDoc) |
| `contracts` | `GAME_FORMAT_VERSION` | the version of the game definition format, the package's own example |
| `contracts` | `SWT_CODE` | the pattern of the frozen error codes; `scripts/error-docs/` restates it |
| `sdk` | `defineHandlers` | the authoring helper for a mechanic body split over files; no body of the repository is split yet |
| `runlog` | `GAME_FILE`, `TEXTS_FILE` | the names of the run folder's files, beside `MANIFEST_FILE`, which has users |
| `testkit` | `ORACLE_FORMAT`, `ORACLE_VERSION` | the two values every file of the frozen oracle format version 1 states |
| `testkit` | `sampleBoundaries` | issue M5-92 gives it its user (the command-line standing checks) |
| `models` | `SAVED_SESSION_FORMAT`, `SavedSession`, `SavedSessionSchema` | the section `sessions` of the frozen snapshot file |

### Kept because the signature of an export that stays names it

- `contracts`: `DirectorUseSchema`, `KernelLimits`, `LogView`, `ModelChoiceSchema`, `ServiceMethod`, `STAGES`
- `sdk`: `AnyHead`, `BodyParts`, `CallTrigger`, `DeclaredTool`, `DefinitionOf`, `DirectorActContext`, `DirectorBody`,
  `DirectorHead`, `DirectorLimits`, `DirectorPlacement`, `DirectorTrigger`, `FactSpec`, `FactView`, `GrantTweak`,
  `HookSlot`, `LimitSpec`, `ListenKit`, `ListenOptions`, `LoadOrder`, `LoadOrderEntry`, `MechanicBody`,
  `MechanicContext`, `MechanicHead`, `MechanicHooks`, `MechanicJob`, `MechanicPipeline`, `MechanicShape`, `MetricSpec`,
  `NamedTool`, `Needs`, `None`, `NoOptions`, `OptionsInput`, `PluginHead`, `PromptKeys`, `PromptVariables`,
  `QueryMethodName`, `ResidentAccess`, `ResidentsPort`, `ResidentsView`, `ResolveInput`, `ServiceImplementation`,
  `ServicesOf`, `Setup`, `Shape`, `SnapshotSpec`, `StateOf`, `TakeAnswer`, `TakeAnswerSchema`, `TickTrigger`,
  `ToolContext`, `ToolDeclaration`, `ToolHandlers`, `ToolName`, `toolNames`, `ToolNames`, `ToolOf`, `ToolParams`,
  `ToolSource`
- `engine`: `DirectorDriverInput`, `InputEntry`
- `chain`: `ChainBroken`, `ChainGenesisSchema`, `ChainGenesisV2Schema`, `ChainTexts`, `ContinuityTextOptions`,
  `VerifiedHead`
- `prompts`: `LayeredPrompts`, `PromptLookupOptions`
- `runlog`: `FoundFiring`, `SnapshotExpectation`, `SnapshotExtras`, `VerifyRunOptions`
- `testkit`: `ConformanceOptions`, `OracleEntrySchema`, `OracleLevel`, `OracleMismatch`, `OracleOptions`,
  `ProjectionDifference`, `StandingOptions`, `StandingReview`
- `models`: `CityPromptFacts`, `CostMeterOptions`, `KeyAuth`, `Look`, `LookInput`, `ModelBinding`, `ModelDrivers`,
  `ModelDriversInput`, `ModelEnv`, `ModelOverrides`, `OpenRouterRouting`, `ProviderSpec`, `RequestLimits`,
  `SavedSessionsSchema`, `Script`

### Tagged `@internal`

These are the package's own machinery: the binders and the steps of game resolution, the builders of error issues
(the codes stay frozen through [`reference/errors.md`](reference/errors.md), not through these functions), the parts
of the model driver, and schemas that frozen schemas are built from (frozen through those schemas).

- `contracts` (3): `InputNoteSchema`, `JobSchema`, `RunEndSchema`
- `kernel` (3): `createRng`, `deriveSeed`, `seedFrom`
- `sdk` (66): `actorOf`, `actorsOf`, `appendRoster`, `bindHooks`, `bindStages`, `bodyMismatch`, `checkSchema`,
  `CollectedTexts`, `collectTexts`, `commandInView`, `contextFor`, `convertArguments`, `createKit`, `directorGrants`,
  `directorNeverActivated`, `DirectorsInput`, `directorsOf`, `directorsPlugin`, `directorsReserved`, `ErasedBody`,
  `eventTypeTaken`, `factMismatch`, `gameData`, `gameSchemaMismatch`, `GrantsInput`, `InstanceParts`, `KitBinding`,
  `MechanicKit`, `mechanicNotInstalled`, `mechanicsOf`, `mechanicTwice`, `memberNotResident`, `Mismatch`,
  `noAnswerer`, `noProvider`, `NOT_A_DIRECTOR`, `optionsNoObject`, `payloadMismatch`, `promptWithoutText`,
  `requiresCycle`, `residentId`, `residentOf`, `residentsOf`, `ResolvedGrants`, `resolveDirectors`, `resolveGrants`,
  `rosterPlugin`, `schemaVersion`, `SDK_ERRORS`, `SdkErrorCode`, `serviceMismatch`, `shownNameClash`,
  `shownNameClashes`, `shownNameMalformed`, `sliceMismatch`, `SliceSpec`, `stagedNotGranted`, `StagedOutcomeSchema`,
  `stateUnsaved`, `TextSource`, `toolNotDefined`, `triggerWithoutEvent`, `twoProviders`, `unstagedTools`,
  `UsedMechanic`, `viewFor`
- `chain` (2): `ChainGenesisInput`, `wellFormed`
- `prompts` (9): `hasStrayBraces`, `libraryDir`, `libraryRoot`, `mechanicPromptFolders`, `parsePromptFile`,
  `placeholders`, `PromptError`, `PromptFile`, `renderBody`
- `runlog` (5): `createSink`, `EventChain`, `EventChainOptions`, `snapshotFileState`, `TAKE_TOOL`
- `testkit` (2): `OracleSetup`, `OracleSource`
- `models` (39): `asksReset`, `BUILTIN_PROVIDERS`, `callOutsideActivation`, `closedModels`, `CONTEXT_RESET_KIND`,
  `createResidentSession`, `createToolsNotice`, `EMPTY_QUESTION`, `emptyModel`, `isSafeguardRefusal`,
  `isToolChoice`, `limitedStream`, `limitsFor`, `LOOK_REQUESTS`, `MODEL_DEFAULTS`, `modelOf`, `noCostCap`, `noKey`,
  `noPrice`, `openRouterProviderPreferences`, `outcomeText`, `PROVIDER_RETRIES`, `recordMismatch`, `residentRecord`,
  `ResidentRecords`, `ResidentSession`, `savedSessionInvalid`, `SessionInput`, `shortKey`, `StepFrame`, `thrown`,
  `TOOL_CHOICES`, `ToolChoice`, `toolChoiceDefaults`, `toolsNotice`, `ToolsNotice`, `unknownModel`,
  `unknownProvider`, `withRequestDefaults`

An `@internal` export is still printed in its package's report, marked `// @internal` with the notice
`ae-internal-missing-underscore` (erratum J280): the reports are written in api-extractor's "complete" variant. Until
J280 is settled, a change of such a block reads as a change of the report.

A merge after M5-50 can add an export; issue M5-51 runs the listing again (section 11 of the specification).

## Not in the frozen surface

The reserved parts that M5 did not build (section 1.4 of the specification). None of them has an export; when one is
built, it is an addition.

| Reserved | Stays for |
|---|---|
| handlers of the stages `afford` and `settle` in the kernel, actor attributes, `schedule.every`, `kit.on`, `ctx.log`, `kit.kernel` | a later issue that names a game and the measured lines. The names `afford` and `settle` in `STAGES` are frozen as stage labels only |
| `Kernel.stop`, `SchedulerPort.safePoint`, an intervention inside a tick (A22) | after 1.0 |
| the Human Hand's `instruct`, `step`, standing orders | after 1.0, or an issue that names a game that needs them |
| generic mechanics with new model-facing names (`ballot`, `talk`, `removal`, `trial`, `holdings`, `doors`, `split-secret`, `objectives`) | after 1.0 (A50) |
| the weaver, fate and the souffleur | after 1.0 (A58) |
| a data game with a Director | M6 (A61) |
| tool limits, `$param`, game `texts` overrides | the first user |
| the game frame of D9 | after 1.0 (A31) |
| `parallel` as anything but the sample | after 1.0 (A30, A41) |
| game-specific viewer views, the game tab | M6 |
