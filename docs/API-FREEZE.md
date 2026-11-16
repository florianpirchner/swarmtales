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
| F1 | 2026-11-16 | every file of the frozen list | freeze | A60 | the surface as M5-50 left it, with the merges up to M5-57; recorded and dated by M5-57 on `565efaeb` |

A row names its paths in backticks; only a freeze row may say "every file of the frozen list". Its decision is one row
`A<n>` of section 9 of `DECISIONS.md`; a break's decision row says "the owner's go".

## The frozen list and its gate (issue M5-51)

`scripts/api-freeze/frozen.json` holds one row per frozen file: its path, the sha256 of its text, `base` and `row`.
The files are the API reports of the ten frozen packages and of the base mechanics with `mechanics/contracts`, and
nine text forms under `scripts/api-freeze/surface/` for what has no report of its own: the JSON schemas of the log
envelope, the run manifest, the kernel's snapshot, the saved sessions, the snapshot file (`snapshot-file.json`, its
section `sessions` beside the kernel's snapshot), the line of the hand file (`hand-line.json`, issue M5-95) and the
oracle format; the command line (`cli.json`: each command's argument, flags with their kind and exit codes, without
the help texts); and the list of the error codes (`error-codes.json`, without why and fix).
`scripts/api-freeze/surface.ts` names them.

- `pnpm api:freeze` checks that the text forms are what the code says and runs the gate.
- `pnpm api:freeze --write` writes the text forms, then records every frozen file whose text changed under the
  newest row of the table above that names it: the new hash, that row, and as `base` the last commit that holds the
  text recorded before. It refuses a file that no row names.
- The gate is `scripts/gates/api-freeze.test.ts`, part of the tests of `pnpm check`. It fails on a missing file or an
  empty list, a text that is not the recorded one, a row that is missing, does not name the path or names no decision
  row of section 9, an addition that removes or changes a line against the text at `base` (only added lines are an
  addition; "docs only" may change comment and `description` lines only), and a break whose decision row does not
  say "the owner's go". The base must be a commit that `HEAD` reaches, so it is a commit of `develop`, never one of a
  branch that a squash merge leaves behind.

The freeze row F1 admits the text it finds. While its date cell holds no date, `pnpm api:freeze --write` records
every merge again under F1 (its base is then the newest commit that holds the text, else `HEAD`): after a merge that
changes a frozen file before the freeze, the integrator runs `pnpm api:freeze --write` and commits `frozen.json` and
the text forms with the merge. At the merge of M5-57, the integrator writes the date into F1 and runs
`pnpm api:freeze --write` once more on the merged head, so that each base is a commit that holds its text. From that
date on, the gate requires the base of a freeze row to hold the text and to be committed on that day or before,
`--write` refuses to record a change under F1, and every change needs a new row.

**The freeze is in force since 2026-11-16.** Issue M5-57 ran `pnpm api:freeze --write` on its head, whose parent is
`565efaeb` of `rewrite/develop` (M5-103 and A114 merged, no frozen file changed by M5-57 itself), so every one of the
27 rows of `frozen.json` has the base `565efaeb`, committed on 2026-11-16 and reached from `HEAD` after the squash
merge; then it wrote the date into F1 (the order of erratum J293: with the date in the cell, `--write` refuses a
change under F1). `pnpm api:freeze` passes on that tree: "27 frozen files, each as recorded". From here on, a change
of a frozen file is an `addition`, `addition: docs only` or `break` row (section 5.3 of the specification); a break
needs the owner's go.

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

Since M5-94 (erratum J282), an `@internal` export leaves its package's report, so it is not frozen. Since M5-96
(decision A106), an import line of a report that no remaining line names leaves with it: the imports that only the
removed `@internal` declarations used (`scripts/lib/api-report.ts`; a name in a comment or a string counts as used).
It took stale imports out of the reports of `exile`, `ledger`, `models`, `prompts`, `runlog`, `sdk`, `viewer-core`
and `viewer-ui`.

### The listing again (issue M5-51)

The listing is `scripts/api-freeze/list-users.ts` (erratum J284): `node scripts/api-freeze/list-users.ts [--json]`
from the repository root. M5-51 ran it again on `aaac02b4` (M5-94 merged): the ten packages give the counts of the
table above unchanged; `sampleBoundaries` of `testkit` still waits for its user from M5-92.

M5-51 widened it to the base mechanics and `mechanics/contracts` (erratum J283), whose reports are frozen too. An
export of a mechanic has a user when a file outside the mechanic imports it from the mechanic or its `/contract`:

| Mechanic | Exports | Without a user outside the mechanic |
|---|---|---|
| `channels` | 4 | none |
| `consensus` | 4 | `ConsensusSourceService` |
| `decisions` | 5 | `AmendDecision`, `DECISION_REFUSALS` |
| `exile` | 18 | `BanishResult`, `BequestEntry`, `EXILE_SUSPENSION`, `ExileCtx`, `exileHead`, `ExileState`, `ExileToolCtx`, `GateState`, `GateView`, `ToGate` |
| `human-hand` | 1 | none |
| `ledger` | 15 | `book`, `BookOptions`, `LedgerCtx`, `LedgerEntry`, `LedgerError`, `LedgerErrorCode`, `ledgerHead`, `LedgerState`, `LedgerToolCtx`, `memoCarriesDigits`, `restored`, `SYSTEM_ACCOUNT` |
| `team-channel` | 2 | none |
| `contracts` | 8 | none |

M5-51 left these 25 exports frozen as they stood, because tagging them changes the sources of four mechanics
(erratum J290). Issue M5-95 (decision A105) read each of them once more: an export that a game author needs, because
the specification names it as part of a mechanic's contract (5.1: the `/contract` sub-path, the tools and refusal
codes a resident and a game see), stays; every other one is tagged `@internal` and leaves the report.

| Mechanic | Export | Now | Why |
|---|---|---|---|
| `consensus` | `ConsensusSourceService` | no longer exported by `consensus` | a re-export of the contract `consensus-source` of `mechanics/contracts`, which is frozen there and has its users there; a re-export cannot carry a tag of its own, so it is taken out |
| `decisions` | `AmendDecision` | stays | the tool `amendDecision` of the contract (`/contract`): what a game grants and a Director or the Human Hand stages |
| `decisions` | `DECISION_REFUSALS` | stays | the refusal codes of `amendDecision`, part of the contract a game and a resident see |
| `exile` | `EXILE_SUSPENSION` | stays | the reason of the suspension of a banished resident (`actor_suspended`), which a listener matches; `/contract` only |
| `exile` | `BanishResult`, `GateView`, `ToGate` | stay | the schemas of the output of `banish`, of `gates` and of the input of `toGate` of the service `exile`; `/contract` only |
| `exile` | `exileHead`, `ExileCtx`, `ExileToolCtx`, `ExileState`, `GateState`, `BequestEntry` | `@internal` | the head, its context types, its state and the will's entries: the mechanic's own machinery |
| `ledger` | `SYSTEM_ACCOUNT` | stays | the account of every mint and burn, the `debit` or `credit` of the events `transfer` that a game reads; also in `/contract` |
| `ledger` | `ledgerHead`, `LedgerCtx`, `LedgerToolCtx`, `LedgerState`, `LedgerEntry`, `LedgerError`, `LedgerErrorCode`, `BookOptions`, `book`, `memoCarriesDigits`, `restored` | `@internal` | the head, its context types and the book behind the service `ledger`: an author books through the service, never through `book` |

So 18 of the 25 leave the reports (17 tagged, one re-export taken out) and seven stay.

The `/contract` sub-path of a mechanic has no report of its own: the report reads the main entry (erratum J294). One
rule holds for every base mechanic (decision A106, issue M5-96): its main entry re-exports its whole `/contract`, so
the contract stands in its frozen report. `channels`, `consensus`, `decisions` and `team-channel` did so already;
since M5-96 `exile` re-exports `BanishResult`, `clearsAway`, `EXILE_SUSPENSION`, `Exiled`, `ExileEvents`,
`ExilePurseService`, `ExileService`, `GateView`, `KEEPING_STRIKE`, `Standing` and `ToGate`, and `ledger`
`LedgerEvents` and `LedgerService` beside `SYSTEM_ACCOUNT`. These are additions under the undated F1. The listing
above counts the exports of the main entry and of `/contract` together, so its numbers stay.

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
