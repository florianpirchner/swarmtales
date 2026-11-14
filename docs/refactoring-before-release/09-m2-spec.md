# 09 M2 specification: live and measured

Status: **specification for milestone M2 ("Live and measured")**, written 2026-11-14 and challenged the same day
against the old code, the new platform as built (through M1-28 and M1-37) and the noise-floor results; the challenge
log is section 14. Builders code against this file. Precedence: [`BRIEF.md`](BRIEF.md), then
[`DECISIONS.md`](DECISIONS.md) (with its addendum A1 to A15), then [`REWRITE.md`](REWRITE.md), then
[`08-m1-spec.md`](08-m1-spec.md) with [`08-m1-spec-errata.md`](08-m1-spec-errata.md) for everything M1 fixed, then
this file, then papers 01 to 07. Where this file decides something the papers left open, section 11 lists it with
its reason; section 12 lists what could not be decided from the material. A change of an interface of sections 2
to 6 after its issue is merged needs an issue with the label `interface-change`.

Words as in the M1 specification: an "old" path is a path at the tag `v0-final` (read at `/home/user/swarmtales`,
commit `87844a7`; code identical to `9765702`). "Carried" means copied with at most import changes and the renames
of M1 section 8.1; carried lines do not count against the 400-line rule. "Ported" means the same design rewritten
against the new contracts. A "code line" is a non-blank, non-comment line of a `.ts` file (D13); every count of old
code in this file was measured with `scripts/lib/code-lines.ts` of this branch.

**M2 is done when** (REWRITE section 4, row M2):

1. quarry and econ-lab match their eleven oracle files at level 3 (section 7);
2. a live run plays through the key broker and the model driver, stops at its cost cap, and the canary test finds
   no key in any artefact (sections 3 and 5);
3. every run report has the computed facts table (section 6.5);
4. the noise floor on the new platform and the two series are run by the committed plan, and **both firm effects
   keep their sign at 12 seeds** (section 8);
5. the runs are in this repository on the data branch `data/runs` (decision A15, section 8.5; the data repository
   `swarmtales-runs` of the plan is an open point for the owner at M6), the README has its first findings block
   and one recorded moment;
6. the kill criterion is checked and recorded (section 8.6).

One finding of the code reading stopped both ports and is closed by M1: the kernel refused a listener whose
source plugin is not loaded (`packages/kernel/src/loader.ts`, `addListeners`, erratum E4). `strategy-brain` listens
to two events of `grid-game` and is loaded without it in quarry and in econ-lab. The old loader skipped such a
listener (`packages/kernel/src/host/loader.ts:172`, `continue`). **M1-38 restores the old rule** and brings the
kernel back to its M1 gate of 1380 code lines; M2 holds only a test for it (issue 05) and no M2 issue touches
`loader.ts`. Every M2 issue that changes the kernel or loads `strategy-brain` without `grid-game` merges after
M1-38.

## 1. Packages, layers, dependencies, budgets

### 1.1 Packages of M2

| Package | Path | Purpose | Status |
|---|---|---|---|
| `@swarmtales/models` | `packages/models` | key broker, provider adapters (Anthropic direct, OpenRouter), model settings, the resident driver (an `ActorDriver` that calls a provider), cost meter, the scripted source for offline tests | ported (old `packages/models` 405 code lines, old `packages/roles/src/agents/host-runner.ts` 252, the neutral part of `system-prompt.ts` about 25) and new |
| `@swarmtales/lab` | `packages/lab` | folders `facts/` (metric extraction), `stats/`, `experiment/` (spec, plan, runner, results, tolerance check), `report/` (the computed report) | new; `stats/` carries about 150 code lines of `scripts/noise-floor-stats.ts` (branch `m0/noise-floor`, 423 code lines) |
| `@swarmtales/mechanic-draft-rounds` | `mechanics/draft-rounds` | the rules of quarry | carried with renames, `index.ts` split (section 7) |
| `@swarmtales/mechanic-econ-games` | `mechanics/econ-games` | the rules of econ-lab | carried with renames, `index.ts` split |
| games | `games/quarry`, `games/econ-lab` | the two ported games | ported |
| changed | `contracts`, `kernel`, `sdk`, `engine`, `runlog`, `testkit`, `apps/cli` | sections 2 to 6 | each change is named in an issue |

**The count against E6.** M1 has ten library packages (M1 spec 1.1). `models` and `lab` make **twelve**, which is
`MAX_LIBRARY_PACKAGES` in `scripts/layers/table.ts`. The ceiling is reached with no slack, as M1 1.1 predicted. No
M2 issue may add a thirteenth package; `facts`, `stats`, `experiment` and `report` are folders of `lab` (challenge
4.1, REWRITE 3.2 "a folder becomes a package when a second consumer needs it alone"). The six packages of paper 02
section 3.1 are not built.

### 1.2 Layer rows added to `scripts/layers/table.ts` (final for M2)

| Layer | Package | May import: workspace | May import: third party and Node | Forbidden globals |
|---|---|---|---|---|
| L4 | `models` | `contracts` | `@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`, `typebox`; no `node:` | `process`, `Date`, `Math.random`, `setTimeout` (the provider library holds its own timers) |
| L4 | `lab` | `contracts`, `chain` (for `jsonHash`), `runlog` (for `verifyRun` and the file names of a run folder) | `typebox`, `node:fs`, `node:path` | `process`, `Math.random` |
| L3 | `draft-rounds`, `econ-games` | the row of every mechanic; `mechanic-contracts`; `@swarmtales/mechanic-strategy-brain/contract` | `typebox` | those of L1 |
| L4 | `testkit` (changed) | adds nothing | adds nothing | |
| L6 | `apps/cli` (unchanged row) | the only package that imports `models`, `lab`, `kernel` and `runlog` together | anything | none |

Rules beside the table:

- `models` does not import `kernel`, `sdk`, `engine`, `prompts` or `runlog`. It gets the kernel as the type
  `Kernel` of contracts, texts through `PromptLookup` of contracts, and the environment as a plain record.
- `lab` does not import `kernel`, `sdk`, `engine` or `models`. It reads run folders (log, manifest, chain),
  verifies them with `verifyRun` of `runlog` (one verifier, not two), and is given the function that plays one run
  (6.3), so every number can be recomputed from a published log by code that cannot reach a live kernel.
- **`process.env` is read in exactly one file, `apps/cli/src/env.ts`.** An ESLint rule (`scripts/eslint/restricted.ts`)
  forbids `process.env` in every other file under `packages/`, `mechanics/`, `games/`, `samples/` and `apps/`, tests
  included (the scripts under `scripts/` are not part of a run and keep their own reads); a gate test shows it
  failing on a planted read. `env.ts` returns only the variables it is asked for by name (the key variables of
  3.1, `SWT_PROVIDER`, `SWT_MODEL`), never the whole environment.
- **The provider library must not read the environment by itself.** `createModels()` of `pi-ai` takes its auth
  context from `process.env` by default (`dist/models.js`, `defaultProviderAuthContext`), and the lint rule cannot
  see into a dependency. `models` therefore creates every `Models` object with a closed auth context (`env` answers
  `undefined`, `fileExists` answers `false`); a test plants a key variable in `process.env` and shows that a
  provider built without the broker's auth object gets no key.
- `draft-rounds` and `econ-games` are `"class": "game"`; neither imports another game mechanic. `strategy-brain`
  keeps its import of `grid-game/contract` (M1), which is why it is not `base`.
- No dependency cycle, no exemption (M1 1.2).

### 1.3 Dependencies, with licence notes

Allowlist only (DECISIONS 5.2). No copyleft, ever. Versions are exact.

| Package | Version | Licence | Used by | Note |
|---|---|---|---|---|
| `@earendil-works/pi-ai` | 1.4.0 | MIT | `models` | the provider clients and the price table; DECISIONS 01 #13 keeps it through 1.0 if it passes the gate |
| `@earendil-works/pi-agent-core` | 1.4.0 | MIT | `models` | the agent loop of the resident driver |
| their production closure | 85 packages | MIT 39, Apache-2.0 33, BSD-3-Clause 11, Unlicense 1, 0BSD 1 | transitive | measured on the old lockfile with `pnpm licenses list --json --prod --filter @swarmtales/models`; all five ids are on the allowlist |

- Issue 00 adds the two packages to the lockfile, runs `pnpm licences:write` and commits
  `THIRD-PARTY-LICENSES.md`. The gate judges every package of the lockfile, also optional and platform packages,
  which the measurement above did not list. **If one package of the closure fails the gate, issue 00 stops** and
  the fallback of DECISIONS 01 #13 applies: an own loop on `@anthropic-ai/sdk` (MIT) and `openai` (Apache-2.0),
  as a re-plan of issues 07 to 10, not as a silent swap.
- `lab` has no new dependency: the statistics are own code (carried), no statistics library.
- No other new dependency in M2. A package not named here needs the issue of DECISIONS 5.3.

### 1.4 Code-line budgets

The two hard tests stay: kernel at most 1500, engine total (`kernel` + `sdk` + `engine`) at most 4100. Measured
on this branch after M1-25 to M1-28 and M1-37 (the counting rule of `packages/kernel/test/budget.test.ts`): kernel
**1448** under an interim gate of 1450, sdk 1592, engine 272, total 3312. M1-38 brings the kernel back to at most
**1380** (the gate of M1) and makes the loader skip a listener of an unloaded plugin; the kernel numbers of M2
count from there.

| Package | New or changed file | Ports | Planned code lines |
|---|---|---|---|
| contracts | `redact.ts` 25, `run/metric.ts` 25, additions to `kernel/ports.ts`, `kernel/kernel-def.ts`, `game/game.ts`, `run/manifest.ts`, `error.ts` 60 | old `packages/kernel/src/redact.ts` 8 | 110 |
| kernel | `record` on `Kernel` and `Activation` with `records` 25, external limits 8, redaction 5 (`detailOf` and the payload of a record) | booked in M1 1.4: 15 + 10 | **about 38** (M2 gate: kernel at most **1420**, counted from the 1380 of M1-38) |
| sdk | `game/family.ts` 50, `mechanic/metrics.ts` 30, fields in `game/types.ts`, `game/resolve.ts`, `mechanic/types.ts`, `mechanic/define-head.ts` 30 | new | 110 |
| engine | `run/manifest.ts` additions | new | 45 |
| **engine total** | measured 3312 today; M1 plan 3481; plus 38 + 110 + 45 | | **about 3675 of 4100** |
| models | `keys.ts` 80, `errors.ts` 70, `records.ts` 60, `providers.ts` 150, `settings.ts` 60, `request.ts` 20, `source.ts` 110, `scripted.ts` 40, `driver/session.ts` 230, `driver/notice.ts` 40, `driver/prompt.ts` 40, `driver/create.ts` 120, `meter.ts` 45 | 405 + 252 + 25 | 1065 (review target 1100) |
| lab | `facts/` 220, `stats/` 240, `experiment/` 420, `report/` 180, `errors.ts` 60 | 423 (about 150 carried) | 1120 (review target 1200) |
| runlog | `sink.ts` +10, `folder.ts` +15 (the `redact` option and the refusal of 2.2), `leaks.ts` 40 | new | 65 |
| testkit | `oracle/run.ts` +40 (cut files; the pending rule of a live replay if M1-31 has not built it, 7.2) | new | 40 |
| apps/cli | `env.ts` 25, `live.ts` 180, `flags.ts` 90, `leak-scan.ts` 30, `ledger.ts` 60, `report.ts` 50, `experiment.ts` 150 | old `apps/cli/src/host/core-play.ts` 152, `core-run.ts` 141 | 585 |

The kernel returns of M1 1.4 that M2 does not take (staged calls, attributes, three hook points, four stage
handlers, `every`, `stop`, `safePoint`, `ctx.log`) stay booked for M3: 150 lines. From the 1380 of M1-38 and the 38
lines of M2 the kernel stands at about 1418 before M3, so the M3 returns do not fit under 1500 as booked: the
overrun the M1 specification states (25 lines) grows to about 70. That is a planning fact for M3 (which return is
built outside the kernel), not a gate of M2. If M1-38 lands above 1380, issue 05 wins the difference before it adds
a line (open point 8).

## 2. What returns from M1's "reserved" list, and the contract changes

### 2.1 The reserved items of M1 1.4, each checked against the old code of the two games

Checked by search in old `mechanics/draft-rounds/src`, `mechanics/econ-games/src`, `mechanics/strategy-brain/src`,
`stories/quarry/story.ts`, `stories/econ-lab/story.ts`, and in the runner that played them
(`apps/cli/src/host/core-run.ts`, `packages/roles/src/agents/host-runner.ts`).

| Reserved at M1 | Used by the two games or their runner? | M2 |
|---|---|---|
| Staged calls, actor `script`, the `then` job | no | stays reserved (M3) |
| Per-plugin actor attributes | no | stays reserved (M3) |
| Hook points `activationOpened`, `activationClosed`, `runEnded` | no (the three mechanics use `runStarted`, `tickStarted`, `tickEnded`, `inputs`, `news` only) | stays reserved (M3) |
| Stage handlers `afford`, `settle`, `guard`, `consult` | no (`rule` and `lock` only) | stays reserved (M3) |
| `schedule.every` | no (`schedule.at` only: `nextGame`, `nextBlock`) | stays reserved |
| `Kernel.stop`, `SchedulerPort.safePoint`, external input | the runner stops a run at its cost cap (`Host.recordCost`, limit `core.maxCostUsd` in old `referee.ts:119`) | **partly returns, in another shape:** the cap is an external run limit (2.3). `stop`, `safePoint` and external input stay reserved for the Human Hand (M3) |
| `Activation.record`, driver events, `KernelDefinition.records` | yes: the runner writes `turn_input`, `request`, `thinking`, `text`, `usage`, `turn_error`, `agent_profile` (`Host.record`) | **returns** (2.3, 4.4) |
| Tool limits, limit windows, `TOOL_LIMIT` | no (no tool of the three mechanics has `limit`; the game sets `maxStepsPerMinute: 6`, which is `limits.maxCallsPerTick`, built at M1) | stays reserved |
| `params` with `$param`, `--set` | the experiment needs arms as overrides of typed params (REWRITE 3.1); the old variants are name suffixes in `stories/index.ts`. Both games are TypeScript games, and the control arm of econ-lab (`brain: false`) changes the grant list and the briefing, which a reference inside plain data cannot do | **partly returns:** typed params of a TypeScript game (a game family) and `--set` (2.4). The `params` field and the `$param` reference of a data game have no user in quarry or econ-lab and stay reserved |
| The game's `texts` overrides | no | stays reserved: D14 forbids a changed text in a ported game |
| `ctx.log`, `kit.on`, `kit.kernel` | no | stays reserved |
| `defineDirector` | no | M3 |
| Replay | no | M3 |
| `kernel.subscribe` | no | never |

Not on the M1 list and needed by the two games: listeners of an unloaded plugin (now M1-38, above), an oracle
file that is cut before its end (`quarry-open-s59.json`, `truncated.afterMinute: 7`; `runOracle` refuses cut files
at M1), the pending answer of a driver in the seven files that replay a live run (7.2), and the file limit of 300
code lines for two carried files of 432 and 496 (section 7).

### 2.2 Secret redaction (the blocker of wave 1)

**The defect.** `detailOf` in `packages/kernel/src/lifecycle.ts` writes the thrown message into
`run_ended.detail` as it is; `packages/runlog/src/sink.ts` signs every line as it is. The old kernel redacted
(`packages/kernel/src/host/host.ts:719`), and the old model source redacted provider errors (`redacted` and
`redactingStream` in `packages/models/src/source.ts`). A signed line cannot be edited later. Nothing live may run
before this is closed: **issue 01 is wave 1 and every issue that calls a provider merges after it.**

```ts
// packages/contracts/src/redact.ts  (carried patterns of old `packages/kernel/src/redact.ts`, unchanged)
/** A function that takes secrets out of a text. */
export type Redact = (text: string) => string;
/** URL credentials, keys of the form `sk-...` and bearer tokens become `[redacted]`. */
export function redactSecrets(text: string): string;
/** Applies `redact` to every string value of a JSON value (not to object keys); the value is not changed in place. */
export function redactValue<T>(value: T, redact: Redact): T;
/** Both in order: `first`, then `second`. */
export function redactWith(first: Redact, second: Redact): Redact;
```

**Decided here:** the function lives in `contracts`. Reason: the kernel (which may import contracts only), the
run log, `models` and the command line all need the same function; paper 01 put it into `runlog`, which the
kernel may not import.

Where it is applied. Five places, one function. The order matters: **a line is redacted before it is chained and
signed**, never after.

| Place | What | Function | Issue |
|---|---|---|---|
| kernel, `lifecycle.ts` `fail` | `run_ended.detail` | `ports.redact ?? redactSecrets` | 01 (fixed function), 05 (the port) |
| kernel, `record` (2.3) | every string of a recorded payload, in memory and so in every sink | the same | 05 |
| `models` | every error text of a provider before it is recorded or thrown (an error event of the stream, and a throw of the library); every `SwtError` of the X catalogue | `broker.redact` (3.1) | 04, 08, 09 |
| `runlog`, `createSink(chain, now, redact)` | every string value of every envelope, in `write`, before `chain.append`: what is chained and signed is the redacted line | `redact` of `RunFolderOptions`, default `redactSecrets` | 01 |
| `runlog`, `openRunFolder` | `manifest.json`, `game.json`, `texts.json` are written once and the manifest's hash is in the genesis, so they are not rewritten: when `redact` would change any string in one of them, the folder is **not created** and `SWT-L006` names the file and the path of the value, never the value | the same `redact` | 01 |
| `apps/cli` | every text printed to the terminal (`formatIssue` output, the result line) | `broker.redact` | 20 |

Three rules beside the table:

- **An error object is never printed, logged or recorded; only its redacted message is.** No `console.log(error)`,
  no `util.inspect`, no stack, no `cause` chain: a provider library's error object can carry the request with its
  headers. The command line prints `formatIssue` of an `SwtError` and, for anything else, `redact(message)`.
- A redacted line in the file may differ from the envelope the kernel holds in memory: the arguments of a tool
  call reach the plugin unchanged, and the sink redacts them on the way to the file. That is accepted: the file is
  what is signed and published. Nothing but a sink may write the in-memory log to disk; the snapshot of M3 passes
  the same `redact` (5.2).
- The redaction of the sink changes a game text only where a model writes something shaped like a key; `request`
  and `text` records then show `[redacted]`.

### 2.3 Kernel-facing contract changes (`interface-change`, issues 02 and 05)

Issue 02 adds what is optional or new (`RecordSource`, `RunLimit`, the three optional fields). The two `record`
members are **required** members of interfaces the kernel implements, so they are added to the contracts by issue
05, in the same merge that implements them; a merge of 02 alone must leave `pnpm check` green.

```ts
// packages/contracts/src/kernel/kernel-def.ts
/** Events that are written by something outside the plugins: a driver. Declared like a plugin's events. */
export interface RecordSource {
	readonly id: string;                       // the envelope's `source`, for example "@swarmtales/models/resident"
	readonly events: EventSchemas;
}
/** A run limit that is not a plugin's: checked before the plugins' limits, at the same moments (M1 3.5). */
export interface RunLimit {
	readonly id: string;                       // "<owner>.<limit>", for example "models.budget"; never a plugin id before the dot
	check(): string | undefined;               // the reason of the breach, or undefined
}
export interface KernelDefinition {            // one field more
	readonly records?: readonly RecordSource[];
}
export interface KernelPorts {                 // two fields more
	readonly sinks?: readonly EventSink[];
	readonly limits?: readonly RunLimit[];
	readonly redact?: Redact;                  // default: redactSecrets
}
export interface Kernel {                      // one member more (added by issue 05)
	/** Appends one declared event of a record source outside an activation: after `start()`, between ticks. */
	record(source: string, actor: ActorId, type: string, payload: unknown): Envelope;
}

// packages/contracts/src/kernel/ports.ts
export interface Activation {                  // one member more (added by issue 05)
	/** Appends one declared event of a record source, caused by this activation, with the activation's actor. */
	record(source: string, type: string, payload: unknown): Envelope;
}
```

Rules:

- A recorded event has `source` = the record source's id, `actor` = the given actor, the audience `["human"]`
  (a model's thinking is never shown to another actor), and inside an activation `causedBy` = the
  `activation_opened`. It reaches the sinks like every event. No plugin can listen to it (`kit.on` stays reserved).
- The kernel checks that the source and the type are declared (`SWT-R017` otherwise) and redacts the payload
  (2.2). It does not check the payload against the schema; the writer does, as the sdk does for plugins. A
  record source id that equals a loaded plugin's canonical source is `SWT-R002`.
- `Kernel.record` before `start()` or after the end, or inside a tick, is `SWT-R017`.
- A `RunLimit` breach ends the run like a plugin's limit: `limit_reached { limit, reason }`, then
  `RunEnd { reason: "limit", limit }`. External limits are checked first, in the order given (the old referee
  checked the cost cap before the mechanics' limits). Because `turns` reads `halted` between activations, a run
  stops inside the tick in which the cap is reached.
- **Listeners of an unloaded plugin** are skipped at load by M1-38, as the old loader did; a listener of a loaded
  plugin's undeclared event, or with another schema, stays `SWT-R002`. Issue 05 adds only the test that the game
  shape of quarry (`strategy-brain` without `grid-game`) loads and that its listener of a present plugin runs.
- **A driver never calls after its activation closed** (erratum O18, left to M2): the model driver awaits the
  provider library's request with all its tool calls before it returns, and a test of issue 09 shows that no
  `tool_called` is caused by a closed activation.
- No runtime revision is raised: none of the three changes alters when a resident is woken or what it is shown.
  The row for revision 3 in `docs/RUNTIME-REVISIONS.md` (written by M1) gets one line that names them.
New R code: `SWT-R017` (a record of an undeclared source or type, or at a wrong moment).

### 2.4 Game families, `--set`, `model`

**Cut by the challenge:** the `params` field of a data game and the `{ "$param": ... }` reference, with
`SWT-G040` and `SWT-G042`. Neither quarry nor econ-lab is a data game, and the control arm of econ-lab changes
grants and a briefing, which a reference cannot. They stay reserved (M1 1.4) until a data game needs an arm. The
game format gets one additive change; the schema version stays 1.

```ts
// packages/contracts/src/game/game.ts
const ModelChoice = Type.Object({
	id: Type.String(),                                              // "<provider>/<model id or alias>"
	thinking: Type.Optional(Type.Union([Type.Literal("off"), Type.Literal("minimal"), Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")])),
	maxOutputTokens: Type.Optional(Type.Integer({ minimum: 1 })),
}, { additionalProperties: false });
// in GameDefinitionSchema:
	model: Type.Optional(Type.Union([Type.String(), ModelChoice])),   // was Type.String()
```

- **A TypeScript game with variants** is a game family (sdk, `game/family.ts`):

```ts
// packages/sdk/src/game/family.ts
/** A game built from typed params. What is hashed and recorded is the data `build` returns. */
export interface GameFamily<P extends TObject = TObject> { readonly params: P; build(params: Static<P>): Game }
export function defineGameFamily<P extends TObject>(params: P, build: (params: Static<P>) => Game): GameFamily<P>;
// packages/sdk/src/game/types.ts
export interface ResolveInput {                 // two fields more, `game` wider
	readonly game: Game | GameData | GameFamily;
	readonly params?: Readonly<Record<string, unknown>>;   // overrides: `--set`, an experiment arm
	readonly records?: readonly RecordSource[];            // passed through into `KernelDefinition.records`
}
export interface ResolvedGame {                 // one field more
	readonly params: Readonly<Record<string, JsonValue>>;  // effective: defaults plus overrides; `{}` for a game without params
}
```

  For a family the overrides are parsed with `params` (defaults filled; an unknown key or a value of the wrong
  type is `SWT-G041` with the name), then `build` runs. Overrides for a game that is no family are `SWT-G041`
  too. A game file may default-export a `Game` or a `GameFamily` (`apps/cli/src/load-game.ts`).
- **What is hashed.** `game.hash` stays what M1 built: the hash of the filled game data (`resolve.ts`). The
  manifest records the effective values in `game.params`. Two arms therefore differ in `game.hash` and in
  `game.params`, and the cost cap is in neither (lesson P443: the old `--budget` changed the game hash). The heads
  of the mechanics are not part of the hash, so a metric added to a head (7.3) does not change it.
- **`model`.** The string form is the id. `thinking` defaults to `medium` and `maxOutputTokens` to 4000, the
  values of the old runner (`core-run.ts:146`; `RESIDENT_LIMITS` in old `apps/cli/src/host/residents.ts:26`). The
  tic-tac-toe game gets `maxOutputTokens: 16000` (its old registry entry; M1 8.2 left this to M2).

New G code: `SWT-G041`.

### 2.5 `RunManifest`: the fields M1 left for M2

The schema of M1 2.10 already has `actors[].model`, `experiment`, `game.params`, `replicate`, `limits.budgetUsd`
and `run.purpose`. M2 fills them and adds two things (`interface-change`, issue 02):

| Field | M1 | M2 |
|---|---|---|
| `run.purpose` | always `smoke` | from `--purpose`; default `smoke`. `confirmatory` needs `kernel.dirty === false` and an `experiment` block (`SWT-C023` otherwise; lesson P443) |
| `game.params` | `{}` | `ResolvedGame.params` |
| `actors[].driver` | `fake/sample`, `scripted` | `@swarmtales/models/resident` for a model actor |
| `actors[].model` | absent | `provider`, `requestedId` (what the game or the command said), `resolvedId` (after the alias), `params { temperature: "provider-default", topP: "provider-default", maxOutputTokens, thinking }` (DECISIONS 02 D4: provider defaults, recorded as such), and **new: `pricing: string`**, the price table that computes the cost, `"pi-ai@<version>"`. The field is required inside `model`; no manifest written before M2 has a `model`, so the manifest version stays 1 and `openRunFolder` (which checks the schema since M1-37) accepts every M1 manifest |
| `actors[].textHashes` | `briefing`, `tools` | **new keys:** `system` (the whole system prompt as sent) and `toolSpecs` (name, description and parameter schema of every granted tool, in grant order) |
| `replicate` | 0 | from `--replicate` or the experiment plan |
| `limits.budgetUsd` | absent | the cost cap of the run; a live run without one is refused (`SWT-X005`) |
| `experiment` | absent | `{ id, specHash, arm }` when the run belongs to an experiment |

`ManifestRun` of the manifest builder (`packages/engine/src/run/manifest.ts`) gains `purpose`, `replicate`,
`budgetUsd?`, `experiment?`, `models?: Readonly<Record<string, RunManifest["actors"][number]["model"]>>` (by actor id
or kind) and `systemPrompts?: Readonly<Record<string, string>>`. The builder still imports no kernel and no models.

**Comparable runs** (DECISIONS 02 D2). `lab` exports `COMPARE_FIELDS` and `comparable(a, b)`
(`experiment/compare.ts`, issue 18): two manifests compare when these are equal: `kernel.revision`,
`scheduler.id`, `scheduler.revision`, `scheduler.optionsHash`, per actor `model.provider`, `model.resolvedId`,
`model.params`, `model.pricing`, `textHashes.toolSpecs`, and, **inside one arm**, `game.hash` and
`textHashes.system`. Across the arms of one experiment the game hash is the factor, and the system prompt may
differ with it (the briefing of the no-brain arm has one paragraph less). Runs that do not compare are not pooled
(`SWT-E005`).

### 2.6 Metrics and error codes

```ts
// packages/contracts/src/run/metric.ts
/** One number a mechanic exports about a finished run, computed from its own events. */
export interface MetricDefinition {
	readonly id: string;                        // "tablePoints"; the key in a table is "<plugin id>.<id>"
	readonly title: string;
	readonly unit?: string;
	readonly reads: readonly string[];          // event types of the declaring plugin
	/** Gets the envelopes of `reads` in log order. `undefined` is "absent": the run has no value, never zero. */
	compute(events: readonly Envelope[]): number | undefined;
}
```

- `MechanicHead` (sdk, A8 form) gains `readonly metrics?: readonly MetricDefinition[]`; the erased head and
  `MechanicDefinition` carry it, so it is readable without a body. The sdk helper
  `defineMetric(events, { id, title, unit?, reads, compute })` types `compute` by the event schemas and parses
  each payload with them (a payload that does not parse makes the metric absent and is reported by conformance).
- `SWT_CODE` becomes `^SWT-[GMDRXPLCE][0-9]{3}$`: **E** for experiments and the lab. `SWT-C020` ("a live run before
  M2") is retired and never reused.

| Code | Raised when | By |
|---|---|---|
| `SWT-X001` | no key for a provider; the message names the variable, never a value | `models/keys.ts` |
| `SWT-X002`, `X003`, `X004` | unknown provider; the model does not exist at the provider (lists at most 12 ids); empty model id | `models/settings.ts`, `source.ts` |
| `SWT-X007` | the price table has no price above zero for the model's input or output tokens: the cost cap could not hold | `models/source.ts` |
| `SWT-X005` | a live run has no cost cap | `models/meter.ts` |
| `SWT-X006` | a key value is shorter than 16 characters (it cannot be told from ordinary text when redacting) | `models/keys.ts` |
| `SWT-X030` | a held key value occurs in a file of the run folder | `apps/cli/src/leak-scan.ts`, with `findLeaks` of `runlog` and the broker's test |
| `SWT-L006` | `redact` would change a string of the manifest, the game data or the texts of a run folder that is being opened (2.2) | `runlog/folder.ts` |
| `SWT-X040` | a record payload of the driver does not match its schema | `models/records.ts` |
| `SWT-G041` | 2.4 | `sdk/errors.ts` |
| `SWT-R017` | 2.3 | `kernel/errors.ts` |
| `SWT-E001`, `E002` | an experiment spec does not match its schema; an arm overrides a param the game does not declare | `lab/errors.ts` |
| `SWT-E003`, `E004` | the plan's estimated cost is above the cap; the cap was reached between two runs | `lab/experiment` |
| `SWT-E005`, `E006` | two runs of one experiment do not compare (2.5); a run folder is unfinished, unverified or of another experiment | `lab/experiment` |
| `SWT-E007` | three runs in a row were excluded or ended with an error, or a run reported a leak: the experiment stops (6.3) | `lab/experiment` |
| `SWT-E010`, `E011` | a metric of the spec is exported by no loaded mechanic; the analysis is asked for before every planned run has a status | `lab/facts`, `lab/experiment` |
| `SWT-C021`, `C022`, `C023`, `C024` | a malformed `--set`; an unknown `--purpose` or `--thinking`; `confirmatory` on a dirty tree or without an experiment; an experiment file not found | `apps/cli` |
| `SWT-C025` | the spend ledger is unreadable, or the run's cap does not fit under the ledger's cap (6.6) | `apps/cli/src/ledger.ts` |

## 3. Models: key broker, providers, settings

Everything in this section is `@swarmtales/models`. Old sources: `packages/models/src/providers.ts` (169 code
lines), `settings.ts` (60), `request-defaults.ts` (16), `source.ts` (119), `scripted.ts` (36).

### 3.1 The key broker

Rule (paper 01, 6.3): **a key exists in exactly one object and leaves it only into a provider's request.**

```ts
// packages/models/src/keys.ts
/** The variables a provider's key is read from, first match wins (decision A13). */
export const KEY_VARIABLES: Readonly<Record<string, readonly string[]>> = {
	anthropic: ["SWT_ANTHROPIC_API_KEY", "ARENA_ANTHROPIC_API_KEY"],
	openrouter: ["SWT_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
};
/** What the provider library asks for when it builds a request. Only the adapters of 3.2 receive it. */
export type KeyAuth = import("@earendil-works/pi-ai").ApiKeyAuth;
export interface KeyBroker {
	/** The variables of `provider` that are missing; empty when a key is held. Names only. */
	missing(provider: string): readonly string[];
	/** The auth object for one provider: its `resolve` answers the key to the provider library. @throws SwtError SWT-X001 */
	auth(provider: string): KeyAuth;
	/** `redactSecrets`, then every held value replaced by `[redacted]`. */
	readonly redact: Redact;
	/** True when a held value occurs in the text. Never returns the value or its position. */
	leaks(text: string): boolean;
}
/** Reads the keys once from the given record and keeps them in private fields. @throws SwtError SWT-X006 */
export function createKeyBroker(env: Readonly<Record<string, string | undefined>>, variables?: Readonly<Record<string, readonly string[]>>): KeyBroker;
```

Rules, each with a test in issue 04:

- **Names (decision A13, which replaces E5's "no alias" for these two names).** The `SWT_` name is read first; the
  second name is the one this environment provides today. A run uses whichever is set and never asks for a key:
  not in chat, not at a prompt. `SWT-X001` lists every name that was tried. The command line may print the name
  that was used, never a value. `ANTHROPIC_API_KEY` is never read (the cloud runtime strips it, and a shared name
  would mix this project's spending with other tools').
- The broker has no method that returns a key. `JSON.stringify(broker)`, `String(broker)` and Node's inspection
  give a fixed text without a value; the object is frozen and the values live in a closure, not in a property.
- `auth(provider).resolve` returns the key only in the shape the provider library reads (`{ auth: { apiKey } }`);
  `login` and `check` are absent (no prompt, no stored credential). **This is the one way a value leaves the
  broker**, so who holds the broker matters: `apps/cli/src/live.ts` creates it and hands it to
  `createModelSource` only. The driver, the kernel, the lab and every plugin get `broker.redact` or
  `broker.leaks` (functions), never the broker. The adapters never call `resolve` themselves.
- `leaks(text)` answers true for a held value as it is, base64 and base64url encoded, and percent-encoded.
  `redact` replaces the value as it is (a key holds no character that JSON escapes).
- An error of the X catalogue is built from names and ids only, and its text passes `redact` before it is thrown.
- A value shorter than 16 characters is `SWT-X006` (the message names the variable). A value of the first name
  that is set wins also when it is the short one: the broker does not fall through to the second name, so a typo
  in the new variable is seen.
- A key in a test is built at run time from parts (`"sk-" + "a".repeat(37)`), so no committed file holds a
  string that a secret scanner reads as a key, and the canary values are not real ones.

### 3.2 Provider adapters

Ported one variable at a time: the same provider library, the same request shape, the same retries. The only
change is where the key comes from.

```ts
// packages/models/src/providers.ts
export interface ProviderSpec {
	readonly id: string;                                   // "anthropic", "openrouter"
	readonly label: string;
	readonly defaultModelId: string;
	readonly modelAliases?: Readonly<Record<string, string>>;   // "haiku" and the other short names of the old file
	/** Builds the provider with the broker's auth object; called once, when a run starts. */
	create(auth: KeyAuth): import("@earendil-works/pi-ai").Provider;
}
export const BUILTIN_PROVIDERS: readonly ProviderSpec[];  // anthropic (direct), openrouter
export function createProviderRegistry(extra?: readonly ProviderSpec[]): ProviderRegistry;   // `has`, `get`, `require` (SWT-X002), `ids`
```

| Old adapter | Old place | M2 |
|---|---|---|
| Anthropic direct (`anthropicDirectProvider`: the library's model list and messages client, the key from `ARENA_ANTHROPIC_API_KEY` only) | `providers.ts:108` | ported: `auth: { apiKey: auth }` with the broker's object in place of `envApiKeyAuth`; `ApiKeyAuth` is the library's interface (`dist/auth/types.d.ts`: `name`, `resolve`, optional `login` and `check`), so the broker's object needs no cast |
| OpenRouter (`openrouterProvider()` of the library takes no argument: it fixes `envApiKeyAuth("OpenRouter API key", ["OPENROUTER_API_KEY"])` and an OAuth login inside; fixed routing through `openRouterProviderPreferences`) | `providers.ts:63`, `:42` | ported as the Anthropic one is: `createProvider({ id, name, baseUrl, auth: { apiKey: auth }, models, api })` with the library's `OPENROUTER_MODELS` and its two chat APIs, **without** `oauth`, image and classifier models (checked in `dist/providers/openrouter.js` of 1.4.0: the provider object cannot be given another auth after it is built). Routing ported; no M2 run uses it |
| DeepSeek direct, Z.ai direct | `providers.ts:79`, `:87` | not ported: no user in M2 or M3 named by DECISIONS; return with their first user |
| A self-hosted endpoint (`createOpenAiCompatibleProvider`, `customProviderSpec`) | `providers.ts:167` | not ported at M2 (the third plugin kind "model provider" of REWRITE 3.8 is M6 work) |
| `scripted` (offline) | `providers.ts:95`, `scripted.ts` | ported as `scriptedSource` (3.4), not as a provider id of the command line: offline play is `--fake` |

### 3.3 Settings and request limits

```ts
// packages/models/src/settings.ts  (port of old `settings.ts`; `ARENA_PROVIDER`, `ARENA_MODEL` become `SWT_PROVIDER`, `SWT_MODEL`)
export interface ModelSettings { readonly provider: string; readonly modelId: string; readonly requestedId: string; readonly thinking: ThinkingLevel; readonly maxOutputTokens: number; readonly routing?: OpenRouterRouting }
export interface ModelOverrides { readonly provider?: string; readonly modelId?: string; readonly thinking?: ThinkingLevel }
/** Precedence as before: command line, then environment, then the game. @throws SwtError SWT-X002, SWT-X004 */
export function resolveModelSettings(overrides: ModelOverrides, env: { readonly SWT_PROVIDER?: string; readonly SWT_MODEL?: string }, game: GameData["model"], registry: ProviderRegistry): ModelSettings;
// packages/models/src/request.ts  (carried: `withRequestDefaults`, `toolChoiceDefaults`, `TOOL_CHOICES`)
// packages/models/src/source.ts
export interface RequestLimits { readonly maxOutputTokens: number; readonly timeoutMs: number }   // timeout 120000, retries 6, as before
/** A model and its stream function, opaque to everything outside `models`. */
export interface ModelBinding { /* the library's model, stream function and fixed request fields */ }
export interface ModelSource { bind(actor: ActorId, limits: RequestLimits): ModelBinding }
/** @throws SwtError SWT-X001, SWT-X003 */
export function createModelSource(settings: ModelSettings, registry: ProviderRegistry, broker: KeyBroker): ModelSource;
```

Carried behaviour of old `source.ts`: `limitsFor` (the output cap is cut to the model's own maximum, P75), six
client retries (`maxRetries: 6`, passed to the library's stream; the retries are the library's, not a loop of
the driver), and the redacting stream. The redacting stream now uses `broker.redact`. New in `bind`: a model whose
price for input or output tokens is not above zero is `SWT-X007`, because the cost cap counts what the price table
says (4.3); the scripted source is exempt. Every `Models` object is created with the closed auth context of 1.2.
**Decided here:** the `ModelPort` of paper 01 (`complete(request)`, models named by role) is not built at M2.
Reason: its first user is a Director (M3); the resident driver needs the agent loop of the provider library,
which takes a model and a stream function, and one variable at a time forbids a second loop now.

### 3.4 The scripted source

```ts
// packages/models/src/scripted.ts  (port of `ScriptedModelSource`, `act`, `say`; `oracleScript` is not carried)
export type Script = Readonly<Record<string, readonly ScriptStep[]>>;       // actor id -> the answers of its requests, in order
export function act(...calls: readonly { readonly name: string; readonly args?: JsonObject }[]): ScriptStep;
export function say(text?: string): ScriptStep;
/** A step that fails like a provider: the driver sees an error message (used by the canary test). */
export function fail(message: string): ScriptStep;
export function scriptedSource(script: Script): ModelSource;
```

It is the only way a test reaches the driver: no network, no key, the same agent loop. `fail` is new.

## 4. The model driver

### 4.1 What it is

One `ActorDriver` per resident: a persistent session of the provider library's agent for the whole run. A port of
old `HostResidentRunner` (`packages/roles/src/agents/host-runner.ts`, 252 code lines) and of the assembly in
`apps/cli/src/host/core-run.ts`. One variable: what the model is sent is byte-identical to the old runner for the
same activation inputs.

```ts
// packages/models/src/driver/create.ts
export const RESIDENT_DRIVER = "@swarmtales/models/resident";
/** The record source of the driver: pass it to `ResolveInput.records`. */
export const RESIDENT_RECORDS: RecordSource;
export interface ModelDriversInput {
	readonly kernel: Kernel;                               // started; used for `toolSpecs`, `openTools`, `record`
	readonly actors: readonly ActorSpec[];                 // the actors this driver plays
	readonly source: ModelSource | ((actor: ActorId) => ModelSource);
	readonly settings: ModelSettings;
	readonly systemPrompts: Readonly<Record<string, string>>;   // actor id -> the prompt, built by `systemPrompt` before the genesis
	readonly meter: CostMeter;
	readonly redact: Redact;
	readonly texts: PromptLookup;                          // for the tools notice
}
export interface ModelDrivers {
	readonly drivers: DriverTable;                         // by actor id
	/** Writes `prompt_fixed` for every actor; call once, after `kernel.start()` and before the first tick. */
	fix(): void;
}
export function createModelDrivers(input: ModelDriversInput): ModelDrivers;

// packages/models/src/driver/prompt.ts
/** The neutral system prompt: who the resident is, the game's briefing, the steps per tick, the speech rule. */
export function systemPrompt(facts: { readonly id: string; readonly passes: number; readonly briefing: string }, texts: PromptLookup): string;
```

### 4.2 Behaviour that is ported unchanged

| Behaviour | Old place | Note |
|---|---|---|
| The system prompt: `header-neutral`, the briefing, `steps` with `tools-neutral`, `speak`, joined by newlines | `system-prompt.ts:60` (`neutralSystemPrompt`) | frame, persona, motive and shift are City parts and are not carried |
| One model request per activation; tool calls of one answer run in order, each through `activation.call` | `host-runner.ts:157` (`finishTurn`, `toolExecution: "sequential"`) | |
| The fixed fields of the library's agent: `sessionId` = the resident's id, `identity: { attribution: null }`, `onPayload` with `withRequestDefaults` | `host-runner.ts:174` to `:176` | they decide what the provider is sent beside the messages (the session id is the cache key of a provider); carried as they are |
| The inputs of a step: the activation's input texts, then the tools notice when the set of open tools changed since the last notice | `host-runner.ts:226`, `:298` | the notice text is model-facing and carried byte for byte |
| Only the tools open at the start are declared; a tool that opens later is declared before the next request | `core-run.ts:142`, `host-runner.ts:283` (`lateTool`) | in quarry `pick` is declared when the first pick opens |
| An input line of kind `context-reset` drops the conversation (the system prompt stays) and forgets the last notice | `host-runner.ts:224`, `:251` | recorded as `context_reset` |
| No request when there is no input and no unanswered tool result | `host-runner.ts:229` (P76) | the driver returns `{ pending: false }` without a record |
| `pending` is true when the context ends with tool results the model has not answered | `host-runner.ts:188` (`awaitsAnswer`) | the "answer" wake of `turns` |
| A failed request is recorded and the run goes on; when the error text names the provider's safeguards (`/safeguards/i`), the inputs of that step leave the context again | `host-runner.ts:328` to `:334`, `:83` (`isSafeguardRefusal`, P44) | `request_failed`, redacted, `refusal: true`. Only the rewrite of such a step by a second model is not carried (below) |
| The tool result text a model reads: the reply, or `CODE: detail`, or the bare code | `host-runner.ts:66` (`outcomeText`) | |
| Message time stamp `tick * 60000` | `host-runner.ts:322` | internal to the library's messages |
| Thinking level `medium` by default, output cap 4000, request timeout 120 s | `core-run.ts:144`, `residents.ts:26` | recorded in the manifest (2.5) |

Not carried, each returns with its City user at M5: the rewrite of a refused step by a second model (`souffleur`), inner voices,
`rewriteSystemPrompt`, the leading lines of a figure, and the order of the old tool catalogue (`inCatalogOrder`:
checked, none of the eight tool names of the two games is in old `TOOL_NAMES`, so its sort left the order of
`host.openTools` as it was; the new driver takes the order of `kernel.openTools`, and a test of issue 10 pins the
notice text of seat A01 at its first activation in both games against the first `turn_input` of a legacy run). Context snapshot and restore (`snapshot`, `restore`) return with resume at M3.

**Prompt files.** Five files are carried from old `library/prompts/competitor/` to `library/prompts/resident/`
with the new ids `resident/system/header-neutral`, `resident/system/steps`, `resident/system/tools-neutral`,
`resident/system/speak`, `resident/input/tools-notice`. The bodies are byte-identical; only the `id` line of the
front matter changes. A test compares the sha256 of each body, and of the system prompt of seat A01 of both
games in both arms, with values computed at `v0-final`.

### 4.3 Cost and token accounting, the cost cap

```ts
// packages/models/src/meter.ts
export interface Spend { readonly requests: number; readonly input: number; readonly output: number; readonly cacheRead: number; readonly cacheWrite: number; readonly costUsd: number }
export interface CostMeter {
	add(actor: ActorId, usage: Omit<Spend, "requests">): void;      // one answered request; a negative or non-finite number throws
	readonly total: Spend;
	readonly byActor: Readonly<Record<string, Spend>>;
	readonly capUsd: number;
	/** The run limit `models.budget`: breached when `total.costUsd >= capUsd`. Pass it to `KernelPorts.limits`. */
	readonly limit: RunLimit;
}
/** @throws SwtError SWT-X005 when the cap is not a positive finite number */
export function createCostMeter(capUsd: number): CostMeter;
```

- Tokens and cost come from the answer of the provider library (`usage.input`, `output`, `cacheRead`,
  `cacheWrite`, `cost.total`), as in the old runner; the price table is the library's and is named in the
  manifest (`pricing`). A model without a price is refused before the run (`SWT-X007`, 3.3): with a price of zero
  the meter would never reach the cap.
- **One place for the cap.** The breach reason is `cost <x.xx> USD reached the cap of <y.yy> USD` (the old text).
  The limit id is `models.budget` (old: `core.maxCostUsd`). The driver also asks the meter before it sends: at or
  above the cap it sends nothing. A run can pass its cap by at most the requests in flight when the cap is
  reached: one request with `blockSize: 1`. Independent of prices, a run is bounded by its game: at most residents
  times passes times ticks requests (quarry: 4 x 4 x 84).
- The cap is in the manifest (`limits.budgetUsd`), not in the game and not in `game.hash`.
- **Decided here:** no `usage.json` is written. Reason: the `response` records hold every number, the lab
  computes the totals from the log (6.1), and one file less is one artefact less to scan. The command line prints
  the total.

### 4.4 Records of the driver (source `@swarmtales/models/resident`)

Declared in `packages/models/src/records.ts` as `RESIDENT_RECORDS`, each schema with descriptions.

| Type | Payload | Written | Replaces (old runner) |
|---|---|---|---|
| `prompt_fixed` | `system` (text), `systemHash`, `tools` (name, description, parameters of every granted tool, grant order), `declared` (names declared at the start) | once per actor by `fix()`: after `run_started`, before the first `tick_started` | `agent_profile`, the file `agents/<id>.md` |
| `request` | `inputs` (every text sent as new input, the notice included), `tools` (open now, grant order), `messages` (context length before the request) | when the step starts, before any await | `turn_input`, `request` |
| `context_reset` | `messages` (dropped) | before the `request` of a step with a reset line | none (implicit before) |
| `thinking` | `text` | per block of the answer | `thinking` |
| `text` | `text` | per block of the answer | `text` |
| `response` | `provider`, `model` (as the provider answered), `stopReason`, `input`, `output`, `cacheRead`, `cacheWrite`, `costUsd` | once per answered request | `usage` |
| `request_failed` | `message` (redacted), `refusal` (true for a refusal by the provider's safeguards) | when the request ended with an error | `turn_error` |

- `prompt_fixed` closes gap 3 of paper 02 section 1.2: the prompt is fixed and hashed before the genesis (2.5) and
  written out as the first events. `texts.json` of M1 stays (every plugin text by key).
- The old `tool_call` and `tool_result` records are not written: the kernel's `tool_called`, `tool_result` and
  `tool_refused` hold the same, caused by the activation.
- Log event names are not model-facing; D14 is not touched by the renames.
- The oracle runner ignores record sources (M1 section 7 folds plugin events only), so no oracle changes.

## 5. Security checks

### 5.1 What must hold

| Property | Enforced by |
|---|---|
| A key is read from the environment in one file | the ESLint rule of 1.2 and its gate test |
| A key is held in one object and has no getter | `keys.test.ts` (3.1) |
| A key never reaches a plugin or a prompt | layers: no mechanic imports `models`; `createModelDrivers` gets texts and a kernel, never the broker |
| A key never reaches a log line, an error text, a manifest or the terminal | redaction in five places and the rule on error objects (2.2) |
| The provider library reads no environment | the closed auth context of 1.2 and its test |
| The viewer shows no key | it reads the files of a run folder only, and those are redacted before they are signed and scanned after the run |
| No artefact of a run holds a key | the leak scan after every live run (5.3) and the canary test (5.2) |

### 5.2 The canary test (issue 21)

`apps/cli/test/canary.test.ts`, offline, in `pnpm check`. It plays the fixture game `guess-number` through the
whole live path of the command line (`runLive` of 6.6 with an injected environment and `scriptedSource`, and one
extra sink that the test adds through `LiveInput.sinks`: it receives every envelope as the kernel emits it, before
the run log's own redaction).

| Step | Detail |
|---|---|
| Canaries | two values of 40 characters in the injected environment, built at run time: one shaped like a key (`sk-...`) under `SWT_ANTHROPIC_API_KEY`, one **not** shaped like any pattern under `OPENROUTER_API_KEY` (the fallback name of A13). The second proves the broker's value redaction, which the patterns alone would miss |
| Leak attempts, one sub-test each | (a) a scripted step `fail(...)` whose message holds a canary, a URL with credentials and a bearer token; (b) a plugin that throws an `Error` with the canary (it ends the run: `run_ended.detail`); (c) a model answer whose text and whose tool arguments hold the canary; (d) a sink that throws with the canary while the folder closes; (e) a missing key (`SWT-X001`) and an unknown model (`SWT-X003`); (f) `--set` with a canary as a value: the run folder is not created (`SWT-L006`) |
| Scan of the files | every file under the run folder (`manifest.json`, `events.jsonl`, `events.chain.jsonl`, `game.json`, `texts.json`, `run.pub`, `REPORT.md` after `swt report`), the captured terminal output, the text of every thrown error and `JSON.stringify` of the broker, for both canaries, also base64 and URL encoded |
| Scan of the memory | the envelopes of the extra sink: no canary in `run_ended.detail` and in any event of a record source (the kernel and the driver redact these themselves). The arguments of `tool_called` and what a plugin emits from them are left out: they are redacted by the run log's sink only (2.2) |
| Passes when | no canary in either scan; the log still verifies (`swt log verify`); at least one `[redacted]` is present in each sub-test that writes a log (a gate never passes on nothing: the test fails when the leak attempt did not reach the log at all) |
| Shown failing | once, by the builder, and written into the commit: with the sink's redaction switched off the file scan fails on (a), (b) and (c); with the kernel's off the memory scan fails on (b) and (c) (`text` record); with the driver's off the memory scan fails on (a). **Without the memory scan the last two could not fail**, because the sink would hide what the layers before it let through |

Snapshots hold model contexts; they are not written before M3, and the canary test gains them there.

### 5.3 The leak scan of a real run

```ts
// packages/runlog/src/leaks.ts
/** Reads every file under `directory` and returns the paths in which `leaks` answers true. */
export function findLeaks(directory: string, leaks: (text: string) => boolean): readonly string[];
```

After every live run and after `swt report`, the command line calls `findLeaks(folder, broker.leaks)`. A hit
prints `SWT-X030` with the file names (never the value), exits with code 4 and writes the marker file `LEAK` into
the folder. Such a folder is never committed to the data branch (8.5), and `runExperiment` stops at once
(`SWT-E007`). This makes the gate line "no key canary in any artefact" a check of every real run of section 8, not
only of the offline test. `broker.leaks` also finds the encoded forms (3.1).

## 6. The lab, the report, the command line

### 6.1 Facts: from a run folder to numbers

```ts
// packages/lab/src/facts/
export type FactValue = number | "absent";
export interface RunFacts {
	readonly run: string;                                  // manifest.run.id
	readonly manifestHash: string;
	readonly head: string;                                 // the last signed head of the chain
	readonly game: string; readonly seed: number; readonly replicate: number; readonly arm?: string;
	readonly end: { readonly reason: string; readonly limit?: string; readonly tick: number };
	readonly values: Readonly<Record<string, FactValue>>;  // "<plugin id>.<metric id>" and the generic keys below
}
/** Parses a run folder (Typebox), verifies it with `verifyRun` of `runlog`, and computes every metric. @throws SwtError SWT-E006 */
export function readRun(directory: string, metrics: Readonly<Record<string, readonly MetricDefinition[]>>): RunFacts;
/** The same from parsed envelopes; no file access. */
export function factsOf(manifest: RunManifest, events: readonly Envelope[], metrics: Readonly<Record<string, readonly MetricDefinition[]>>): RunFacts["values"];
```

`metrics` is plugin id to definitions; the command line builds it from the installed table (`MechanicDefinition
.metrics`). `lab` never names a game.

| Generic key (computed by `lab` from kernel events and driver records) | Meaning | "absent" when |
|---|---|---|
| `run.ticks`, `run.activations`, `run.toolCalls`, `run.toolRefusals` | counts of `tick_started`, `activation_opened`, `tool_called`, `tool_refused` | never |
| `run.refusals.<CODE>` | refusals per code | the code did not occur (the row is left out) |
| `models.requests`, `models.failedRequests`, `models.contextResets` | counts of `request`, `request_failed`, `context_reset` | the run has no model driver |
| `models.inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `costUsd` | sums over `response` | the run has no model driver |

**The rule of "absent".** A metric whose mechanic is not loaded has no row. A metric whose mechanic is loaded and
whose `compute` returns `undefined` is `"absent"`. A count that is truly zero is `0`. Nothing prints zero for a
thing it did not measure (the defect of chess run 051, paper 02 section 1.6).

### 6.2 Statistics

```ts
// packages/lab/src/stats/   (pure functions; `mean`, `sd`, `t95`, `quantile`, `summarize`, `bootstrapMean95` carried from `scripts/noise-floor-stats.ts`)
export interface Summary { readonly n: number; readonly mean: number; readonly sd: number; readonly min: number; readonly max: number; readonly t95: readonly [number, number]; readonly bootstrap95: readonly [number, number] }
export function summarize(values: readonly number[], seed?: number): Summary;
export interface Effect { readonly estimate: number; readonly se: number; readonly n: number; readonly interval95: readonly [number, number]; readonly p: number; readonly test: string }
/** Mean of the paired differences b - a, t interval, exact sign-flip permutation test (n at most 12: 4096 assignments). */
export function pairedEffect(a: readonly number[], b: readonly number[]): Effect;
/** Difference of means b - a for unpaired runs, Welch interval, exact label permutation test up to 24 runs, sampled above. */
export function unpairedEffect(a: readonly number[], b: readonly number[], seed?: number): Effect;
/** A share with its Wilson interval. */
export function share(hits: number, n: number): { readonly share: number; readonly interval95: readonly [number, number] };
// stats/tolerance.ts  (pure: value lists in, no file format)
export interface Tolerance { readonly baselineMean: number; readonly newMean: number; readonly difference: number; readonly se: number; readonly within: boolean }
/** Is the difference of the two means at most 2 standard errors, se = sqrt(sdA^2 / nA + sdB^2 / nB)? */
export function withinNoise(baseline: readonly number[], values: readonly number[]): Tolerance;
/** A two-outcome measure: the share of runs at or above `threshold` in both, with Wilson intervals; `within` when the intervals overlap. */
export function shareWithinNoise(baseline: readonly number[], values: readonly number[], threshold: number): Tolerance;
```

`pairedEffect` takes two lists of the same length in the same block order and throws on another shape; a block
with a missing arm is dropped by the caller (`analyse`), which reports how many were dropped. The t interval of
`pairedEffect` has n - 1 degrees of freedom; `unpairedEffect` uses Welch's.

The bootstrap draws from an own Mulberry32 with a fixed seed (`BOOTSTRAP_SEED = 20261114`, 10000 resamples, as in
the noise floor of M0), so every number of a results file is reproducible. `lab` uses no `Math.random`.

### 6.3 Experiment: spec, plan, runner, results

```ts
// packages/lab/src/experiment/spec.ts
export const ExperimentSpecSchema = Type.Object({
	format: Type.Literal("swarmtales-experiment"), version: Type.Literal(1),
	id: Type.String({ pattern: "^[a-z][a-z0-9-]*$" }),
	question: Type.String(),
	purpose: Type.Union([Type.Literal("pilot"), Type.Literal("exploratory"), Type.Literal("confirmatory")]),
	game: Type.String(),                                              // path of the game file, relative to the repository root
	model: Type.Object({ provider: Type.String(), id: Type.String(), thinking: Type.Optional(Type.String()) }),
	arms: Type.Array(Type.Object({ id: Type.String(), params: Type.Record(Type.String(), Type.Unknown()), control: Type.Optional(Type.Boolean()) }), { minItems: 1 }),
	seeds: Type.Array(Type.Integer({ minimum: 0, maximum: 4294967295 }), { minItems: 1 }),
	replicates: Type.Integer({ minimum: 1 }),                         // per arm and seed
	design: Type.Union([Type.Literal("paired"), Type.Literal("unpaired"), Type.Literal("replicates")]),
	metrics: Type.Object({ primary: Type.String(), secondary: Type.Array(Type.String()), guardrails: Type.Array(Guardrail) }),
	pass: Type.Optional(Type.Object({ contrast: Type.Tuple([Type.String(), Type.String()]), sign: Type.Union([Type.Literal("positive"), Type.Literal("negative")]), minN: Type.Integer({ minimum: 2 }) })),   // contrast: [treatment arm, control arm]; minN: complete pairs, or runs in each arm
	allowedRefusals: Type.Optional(Type.Array(Type.String())),          // guardrail: a refusal code outside this list is reported
	exclusions: Type.Array(Type.Union([Type.Literal("failed-request"), Type.Literal("missed-decision"), Type.Literal("cost-cap"), Type.Literal("error-end")])),
	budget: Type.Object({ perRunUsd: Type.Number({ exclusiveMinimum: 0 }), totalUsd: Type.Number({ exclusiveMinimum: 0 }), estimateUsdPerRun: Type.Record(Type.String(), Type.Number()) }),
	concurrency: Type.Optional(Type.Integer({ minimum: 1, maximum: 4 })),   // default 1
	baseline: Type.Optional(Type.String()),                           // path of a noise-floor file (6.4)
	tolerance: Type.Optional(Type.Union([Type.Object({ kind: Type.Literal("mean") }), Type.Object({ kind: Type.Literal("share"), threshold: Type.Number() })])),
}, { additionalProperties: false });
// Guardrail: { metric, per?: metric, arm?: arm id, max?: number, min?: number, within?: { of: number, share: number } }  -> "models.requests per draft-rounds.decisions within 10 % of 1.30"; judged on the mean of the arm (all arms without `arm`)
```

- **Arms are diffs of params** (REWRITE 3.1) of a game family. An arm that names a param the family does not
  declare is `SWT-E002`. `game` names a game file whose default export is a `GameFamily` (2.4).
- **`design`.** `paired`: the seed is the block and both arms share it (quarry: the seed fixes the deal).
  `unpaired`: runs are independent replicates per arm; the seeds are only run labels (econ-lab: the seed fixes
  no deal, decision A10). `replicates`: one arm, one seed, k runs (the noise floor). The spec says which; nothing
  guesses it (the `seededAspects` export of paper 02 is not built).

```ts
// packages/lab/src/experiment/plan.ts, run.ts, results.ts
export interface PlannedRun { readonly index: number; readonly arm: string; readonly seed: number; readonly replicate: number; readonly params: Readonly<Record<string, unknown>> }
/** arm x seed x replicate, shuffled with a generator seeded from the spec's hash, so arms are interleaved and the order is fixed by the spec. */
export function planRuns(spec: ExperimentSpec): readonly PlannedRun[];
export interface RunOutcome { readonly directory: string; readonly costUsd: number }
/** Plays one planned run with a cost cap. Injected by the command line; `lab` does not know how a run is played. */
export type PlayRun = (run: PlannedRun, capUsd: number, experiment: { readonly id: string; readonly specHash: string }) => Promise<RunOutcome>;
export interface ExperimentState { readonly spec: ExperimentSpec; readonly specHash: string; readonly runs: readonly RunRecord[]; readonly spentUsd: number }
export interface RunRecord { readonly planned: PlannedRun; readonly directory: string; readonly status: "included" | "excluded" | "stopped"; readonly reason?: string; readonly replaces?: number; readonly costUsd: number }
/** Runs the plan, resumable: a run with a record is not played again. @throws SwtError SWT-E003, SWT-E004, SWT-E005 */
export function runExperiment(spec: ExperimentSpec, play: PlayRun, options: { readonly directory: string; readonly metrics: MetricTable }): Promise<ExperimentState>;
/** Estimates from the included runs. @throws SwtError SWT-E011 */
export function analyse(state: ExperimentState, facts: readonly RunFacts[], baseline?: NoiseFloor): ExperimentResults;
```

Rules of the runner (paper 02 section 3.4, lesson P431). **Every cap is checked by code before a run starts;
none depends on a person or an agent reading a number.**

- Before the first run: `estimate = sum over the planned runs of estimateUsdPerRun[arm]`; above
  `budget.totalUsd` is `SWT-E003`.
- Before each run: `spentUsd + reservedUsd + perRunUsd > totalUsd` stops the experiment (`SWT-E004`), never
  inside a run. `reservedUsd` is `perRunUsd` for every run in flight, so with `concurrency: 2` the second run of a
  pair cannot be started on money the first may still spend. `spentUsd` is read from the state file, so it counts
  the runs of an earlier, stopped call. The state file `experiment.json` in the experiment's folder is rewritten
  after every run, so a stopped experiment continues with the same plan.
- A run that ends with a leak (5.3) stops the experiment at once; three runs in a row that are excluded or end
  with an error stop it too (`SWT-E007`). A systematic fault costs three runs, not the series.
- An excluded run (a rule of `exclusions` holds for its facts) keeps its folder and its record and is played
  **once more** with the same arm, seed and replicate plus 100; the replacement is not replaced again. Nothing
  else is repeated (D11: a series runs once).
- Every run is checked against the first of its arm, and across arms, with `comparable` (2.5).
- `analyse` reports every estimate twice: over the included runs (the pass rule reads this one) and over every
  finished run that has a value, excluded ones included (the sensitivity line; an exclusion rule that depends on
  what the residents did, such as `missed-decision`, must not be able to make an effect).
`ExperimentResults` (`results.json`, written by code only, validated by its schema; the shape is paper 02 section
3.6 without `judging` and `preregistration`): `spec { id, hash }`, `code { commit, kernelRevision }`, `runs`,
`values` (long format, `"absent"` kept), `estimates` (metric, role, contrast, estimator, estimate, se, interval,
n, test, p, and `over: "included" | "finished"`), `pass?: { rule, estimate, n, verdict: "kept" | "not-kept" | "no-verdict" }` (`no-verdict` when n is below `pass.minN`), `guardrails` (each with its value and `held`),
`tolerance?` (6.4), `deviations`. `values.csv` holds the same long table.

### 6.4 Noise floor and the tolerance check

```ts
// packages/lab/src/experiment/noise-schema.ts  (issue 03)
export interface NoiseFloor {
	readonly format: "swarmtales-noise-floor"; readonly version: 1;
	readonly game: string; readonly arm: string; readonly seed: number; readonly metric: string;
	readonly platform: "legacy" | "rewrite"; readonly kernelRevision: number;
	readonly values: readonly number[]; readonly summary: Summary;
	readonly guardrails: Readonly<Record<string, Summary>>;            // requests per decision, cost per run
}
```

`analyse` gives `baseline.values` and the new values to `withinNoise` or `shareWithinNoise` of `stats` (6.2) and
writes the result into `tolerance`; which of the two is a field of the spec (`tolerance: { kind: "mean" } |
{ kind: "share", threshold }`, beside `baseline`).

The two baseline files `games/quarry/noise-floor.legacy.json` and `games/econ-lab/noise-floor.legacy.json` are
written by hand from `stories/*/runs/noise-floor.json` of branch `m0/noise-floor` (issue 03) and are the input of
section 8.4. Decision A10 is built in: econ-lab's control arm is checked with `shareWithinNoise` (locked tables),
never with a band on its mean.

### 6.5 The report with the computed facts table

DECISIONS 02 D5 keeps two things: a facts table computed in code, and a model-written section for loophole
candidates, marked unverified. M2 builds the first and the frame of the second.

```ts
// packages/lab/src/report/
/** `REPORT.md` of one run: header, result, the facts table, the refusal table, the spend per actor, and the section below. */
export function renderRunReport(facts: RunFacts, manifest: RunManifest, titles: Readonly<Record<string, { readonly title: string; readonly unit?: string }>>): string;
/** `README.md` of a series: the plan, the run table, the estimates, the guardrails, the tolerance, the deviations. */
export function renderSeriesReport(results: ExperimentResults, spec: ExperimentSpec): string;
```

- The header and the result line come from the manifest and the `RunEnd`; the facts table has one row per key of
  `RunFacts.values` with title, unit and value, `absent` printed as the word.
- The report ends with the heading `## Loophole candidates (unverified)` and the line `none written: this
  report has no model-written part`. **Decided here:** the model that writes candidates is not built at M2.
  Reason: its old model runs through OpenRouter, the live budget through M2 is Haiku money for the gate, and no
  gate line depends on it; the reviewer reads the two games' logs by hand (section 8.5). It returns at M3 behind
  this heading, and the heading is a fixed string that a test pins.
- `REPORT.md` is not signed and is written by `swt report`, never during a run.

### 6.6 Command line

| Command | Does | Exit |
|---|---|---|
| `swt run <game file>` (no `--fake`) | a live run: resolves the game with `--set` overrides, resolves the model, builds the system prompts, writes the manifest, plays with the model driver under the cost cap, verifies the log, scans for leaks, prints the result line and the spend | 0 finished; 1 an `SwtError` before the run; 2 the run ended with `error`; 4 a leak (`SWT-X030`); 5 the run ended at its cost cap |
| flags of a live run | `--provider`, `--model`, `--thinking`, `--budget <usd>` (required, `SWT-X005`), `--ledger <file>` (below), `--seed`, `--set name=json` (repeatable), `--purpose`, `--replicate n`, `--out` | |
| `swt report <run dir>` | `readRun`, `renderRunReport`, writes `REPORT.md`, scans for leaks | 0; 1 unreadable; 4 a leak |
| `swt experiment run <spec file> [--out dir] [--ledger <file>]` | `runExperiment` with a `PlayRun` that calls the live run in process; prints the plan and the estimate first, then one line per run | 0 complete; 1 an `SwtError`; 4 a leak; 6 stopped at the experiment's cap or by `SWT-E007` |
| `swt experiment analyse <experiment dir>` | `analyse`, writes `results.json`, `values.csv` and the series `README.md`; prints the pass line when the spec has a `pass` rule | 0 kept, or no pass rule; 3 not kept; 7 no verdict (too few runs, 8.2) |

**The spend ledger** (`apps/cli/src/ledger.ts`, issue 21). A JSON-lines file with a first line `{ "capUsd": n }`
and one line per run: `{ "run", "reservedUsd" }` written before the run starts, `{ "run", "costUsd" }` after it.
With `--ledger`, a live run is refused (`SWT-C025`, exit 1) when the sum of the costs, plus the reservations
that have no cost line yet, plus this run's `--budget` is above `capUsd`; a run that crashed keeps its whole
reservation. A line `{ "run": "legacy/...", "costUsd" }` may be added by hand for a run of the old platform
(8.6). The ledger makes the hard stop of a milestone (8.5) a refusal by code and not a sum somebody has to
remember. A run without `--ledger` has its own `--budget` only; every command of section 8 names the ledger.

The live run in `apps/cli/src/live.ts` (`runLive(input): Promise<LiveResult>`, the function the canary test and
`swt experiment` call; `LiveInput` takes the environment record, the model source (a provider's or the scripted
one) and optional extra sinks, so a test needs no network and no real key). Its order is fixed, because the
manifest must exist before the first event:

1. `readEnv(names)` (`env.ts`), `createKeyBroker(env)`; resolve the model settings; `SWT-X001` when the key is
   missing; with `--ledger`, the check and the reservation.
2. `resolveGame({ game, params, records: [RESIDENT_RECORDS], ... })`.
3. Build every actor's system prompt (`systemPrompt`); build the manifest (`buildManifest` with models, prompts,
   budget, purpose, replicate, experiment); open the run folder with `redact: broker.redact` (`SWT-L006` when a
   secret would be written).
4. `createCostMeter(budget)`; `createKernel(definition, { sinks, limits: [meter.limit], redact: broker.redact })`;
   check `win.fact`; `kernel.start()`.
5. `createModelDrivers(...)`; `fix()`; `kernel.run(drivers)`.
6. Close the folder; `verifyRun`; `findLeaks`; the ledger's cost line; print through `broker.redact`.

## 7. The port of quarry and econ-lab

Rule of the port as in M1 section 8 (D2, D14): one variable, the kernel. Prompt files, tool names, refusal codes,
reply strings, event types and payloads, option names and defaults, random labels (`("draft-rounds", "deck",
game)`; `econ-games` draws nothing) and the wake rule are byte-identical. The renames of M1 8.1 apply. Each port
issue states "prompt texts and tool names byte-identical: yes" and proves it with `carried.test.ts` (sha256 of
every prompt file and of every tool name list, computed at `v0-final`). Paths of game files are written as in the
M1 specification (`games/<id>/game.ts`); the file sits where M1-35 put the tic-tac-toe game (under `src/`, by the
workspace-shape rule).

### 7.1 File by file

Code lines are of the old file. "Split" means the code is moved, not changed: both `index.ts` files are above the
file limit of 300 code lines (432 and 496), and decision A8 puts the tool declarations into the head.

| Old path | Code lines | New path | Action | Proved by |
|---|---:|---|---|---|
| `mechanics/draft-rounds/src/model.ts` | 245 | `mechanics/draft-rounds/src/model.ts`; new `rules.ts` re-exports what the tests use (`deckOf`, `gainOf`, `greedyTable`, `laneOf`, `packsOf`, `receiverOf`, `scoreTable`, `setScore`, `Card`) | carried, unchanged | `test/model.test.ts` (the block "Quarry rules" of old `test/stories/quarry.test.ts:44-124`) |
| `mechanics/draft-rounds/src/index.ts` | 432 | `src/head.ts` (options, events, audiences, prompts, the two tool declarations, state schema; about 120), `src/flow.ts` (`startNext`, `openPackRound`, `pass`, `take`, `pickNow`, `problemWith`, `refreshLocks`, end of a game; about 190), `src/texts.ts` (`rulesText`, `tableText`, `taskText`; about 80), `src/index.ts` (`defineMechanic(head, body)`: handlers, the `brain-source` service, hooks, the job `nextGame`, the limit `match`, the fact `scores`; about 70) | carried with 8.1, split, A8 form. `runStarted` gets `after: ["strategy-brain"]` (old order 0 after -100); the numbers 150 (`minuteEnded`) and 350 (`turnInputs`) go. **Not changed although a lesson asks for it:** the `burn` parameter stays in the schema of `pick` when burns are off (P442); a changed tool schema is a changed prompt | all six files of `oracles/quarry/` at level 3 (issue 12); `oracles/mechanics/draft-rounds.md` for tool descriptions and parameters |
| `mechanics/draft-rounds/prompts/draft-rounds/*.md` (5 files) | text | same | carried, byte-identical | `carried.test.ts` |
| `mechanics/draft-rounds/README.md` | text | same | carried; regenerated by issue 23 | |
| `mechanics/econ-games/src/model.ts` | 157 | `mechanics/econ-games/src/model.ts`; new `rules.ts` re-exports `pairsOf`, `referenceOf`, `Block` | carried, unchanged | `test/model.test.ts` (the block "econ-games rules" of old `test/stories/econ-lab.test.ts:40-66`) |
| `mechanics/econ-games/src/index.ts` | 496 | `src/head.ts` (options, events, audiences, prompts, five tool declarations; about 150), `src/flow.ts` (`startNext`, `openRound`, `refreshLocks`, `decide`, `advance`, `resolve`, end of a block; about 210), `src/texts.ts` (`rulesText`, `taskText`, `outcomeLine`, `tableText`; about 100), `src/index.ts` (about 80) | carried with 8.1, split, A8 form; `runStarted` gets `after: ["strategy-brain"]` | all five files of `oracles/econ-lab/` at level 3 (issue 13); `oracles/mechanics/econ-games.md` |
| `mechanics/econ-games/prompts/econ-games/*.md` (17 files) | text | same | carried, byte-identical | `carried.test.ts` |
| `mechanics/econ-games/README.md` | text | same | carried; regenerated by issue 23 | |
| `mechanics/strategy-brain/**` | 444 | already ported by M1 issues 23 and 33 | **no change.** The two games use options the tic-tac-toe game does not: `solo: true`, `shared: false`, `brainAtStart: true`, per-seat teams, and the service `brain-source` in place of `grid-game` | the brain events and `BRAIN_TOO_LONG` refusals in eight of the eleven files; `oracles/mechanics/strategy-brain.md` |
| `stories/quarry/story.ts`, `quarryStory` | 55 (whole file) | `games/quarry/game.ts`: `quarryGame(options)` and the default export | ported: same options and defaults; `minutes` becomes `ticks`; returns `defineGame({...})` | `test/oracle.test.ts`, `test/quarry.test.ts` |
| the same file, `briefing(brain)` | | `games/quarry/briefing.ts` | carried: the template strings byte-identical; built at build time into the game's `briefing` record | sha256 of the eight briefings (four seats, with and without the brain) against `v0-final` |
| the same file, `quarryEntry`; `stories/index.ts` lines 21 to 23, 94 to 98 (the names `quarry-nobrain`, `quarry-open`, `quarry-burn`, the alias `quarry-noburn`) | | not carried | variants are options; the id is always `quarry` | the variant table of 7.2 |
| `stories/econ-lab/story.ts`, `econLabStory` | 63 (whole file) | `games/econ-lab/game.ts`: `econLabGame(options)`, `DEFAULT_BLOCKS`, the default export | ported, as above | `test/oracle.test.ts`, `test/econ-lab.test.ts` |
| the same file, `briefing(brain)` | | `games/econ-lab/briefing.ts` | carried | sha256 against `v0-final` |
| the same file, `econLabEntry`, `storyName`; `stories/index.ts` lines 19, 20, 84 to 89 | | not carried | the id is always `econ-lab` | 7.2 |
| `stories/quarry/README.md` (52 lines), `stories/econ-lab/README.md` (27) | text | `games/<id>/README.md` | rewritten short; run links point at `v0-final`; a card in `GAMES.md` | |
| `test/stories/quarry.test.ts` | 205 | `mechanics/draft-rounds/test/model.test.ts` (lines 44 to 124) and `games/quarry/test/quarry.test.ts` (the rest) | carried with the changes of M1 8.3 (`createHost`, `playStory` become `host`, `play`; `order: (view) => view.residents` becomes `order: "roster"`); the two name-registry assertions (lines 169 and 234) are dropped and named in the commit | green on the new kernel |
| `test/stories/econ-lab.test.ts` | 141 | `mechanics/econ-games/test/model.test.ts` (lines 40 to 66) and `games/econ-lab/test/econ-lab.test.ts` | the same; the registry assertion of line 165 is dropped | green on the new kernel |
| `field`, `ofType` of `test/stories/tictactoe-support.ts` | 2 functions | `games/<id>/test/support.ts` | copied (a relative import may not leave its package) | |
| new | | `games/<id>/test/oracle.test.ts` | one case per oracle file, level 3 | 7.2 |
| new | | `mechanics/<id>/test/carried.test.ts` | the byte-identity list | |

No test file exists for the two mechanics under old `test/mechanics/` (checked); the two game tests are their
tests, and their rule blocks move into the mechanic packages (E7).

How the games change shape (the hand-written part), quarry shown:

```ts
return defineGame({
	id: "quarry", title: "Quarry", seed,
	residents: [...SEATS],
	mechanics: [draftRounds({ ...as before }), strategyBrain({ ...as before })],
	grants: { resident: ["viewTable", "pick", ...(brain ? ["readBrain", "writeBrain"] as const : [])] },
	locked: ["pick", ...(brain ? ["writeBrain"] as const : [])],
	scheduler: { id: "turns", options: { passes: 4, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "draft-rounds" }] } },
	limits: { maxCallsPerTick: 6 },
	end: { ticks: options.ticks ?? ticksFor(games, packs, packSize) },
	win: { fact: "draft-rounds.scores" },
	briefing: briefings(brain),
	model: "anthropic/haiku",
});
```

The old entry named the model as `{ provider: "anthropic", id: "claude-haiku-5-5" }`; the alias `haiku` of the
Anthropic adapter resolves to that id (old `providers.ts`, `ANTHROPIC_HAIKU`), and the manifest records both. The
id of the game is `quarry` for every variant (the old id carried the variant: `quarry-open`); the oracle runner
compares `setup` by options, not by the old name. `maxBurns: 0` unless `burns`, `deadline: 2`, `retroMaxPosts: 8`,
`retroMaxMinutes: 2` and the default seed 29 are carried.

`inputs` is the old `[{ kind: "context-reset" }]` plus the two `{ source }` entries that replace the old hook
numbers 300 (`strategy-brain`) and 350 (the game mechanic). The load order is expected to be the game mechanic,
then `strategy-brain`, then `roster` (neither `requires` the other; the game's order decides, M1 3.4), which
keeps the old `tickEnded` order 150 before 200. Level 3 of the oracle fails if this is wrong.

### 7.2 Oracle files, variants and levels

| File | Seed | Options of the factory | Source | Level claimed | Note |
|---|---:|---|---|---|---|
| `quarry/quarry-s41.json` | 41 | none | live replay, exact | 3 | 185 turns, 29 of them without input (the "answer" wake) |
| `quarry/quarry-s61.json` | 61 | none | live replay, exact | 3 | |
| `quarry/quarry-nobrain-s41.json` | 41 | `brain: false` | live replay, exact | 3 | |
| `quarry/quarry-open-s59.json` | 59 | `openHands: true` | live replay, **cut after tick 7** | 3 up to the cut | needs cut files in `runOracle` (below) |
| `quarry/quarry-burn-s13-probes.json` | 13 | `burns: true` | scripted | 3 | nine refusals: `TOOL_LOCKED` 4, `NOT_IN_PACK` 2, `INVALID_ARGUMENTS`, `BURN_IS_PICK`, `NO_BURNS_LEFT` |
| `quarry/quarry-s13-silent.json` | 13 | none | scripted, no call | 3 | 76 ticks, 1216 turns, every pick by the timer |
| `econ-lab/econ-lab-s41.json`, `econ-lab-s43.json` | 41, 43 | none | live replay, exact | 3 | |
| `econ-lab/econ-lab-nobrain-s41.json` | 41 | `brain: false` | live replay, exact | 3 | |
| `econ-lab/econ-lab-s13-probes.json` | 13 | none | scripted | 3 | thirteen refusals: `TOOL_LOCKED` 8, `INVALID_ARGUMENTS` 3, `OUT_OF_RANGE` 2 |
| `econ-lab/econ-lab-s13-silent.json` | 13 | none | scripted, no call | 3 | 40 ticks, every decision by the timer |

Read from the files: all eleven have `passes: 4`, `blockSize: 1`, `activation: "onNews"`, `order: "seeded"`,
`maxStepsPerMinute: 6`; every caller is a resident; the only kernel-side events are `tool_locked`,
`tool_unlocked` and `referee_intervened`, which the mapping table of M1 section 7 already has. Seven files replay
a live run and four are scripted. So the runner of M1 issue 31 needs two things:

- **Cut files.** For a file with `truncated`, `runOracle` plays `truncated.afterMinute + 1` ticks (`until.ticks`),
  compares the timeline up to the last entry of the file and does not compare `end`. Entries of the new run after
  the file's last entry are ignored (the README of the oracles says the last tick of a cut file may hold events
  another schedule does not reach).
- **The pending answer of a live replay.** In a file with `source.kind: "live-replay"` a resident is woken without
  news when its last turn made a call (the "answer" wake: 29 of the 185 turns of `quarry-s41.json`, 44 of 133 in
  `econ-lab-s41.json`). The exporter's replay agent kept that state as "the last turn made at least one call"
  (`scripts/oracles/replay.ts`, `awaits`, branch `m0/oracles`). The oracle driver must answer
  `{ pending: true }` after an activation in which it submitted at least one call, and `{ pending: false }`
  otherwise, for live-replay files only; a scripted file never has a pending driver (M1 section 7). Two of the
  tic-tac-toe files are live replays too, so M1-31 or M1-35 may have built this; issue 13 then adds only the test
  on a quarry file, otherwise the rule itself (about 10 lines in `oracle/run.ts`).
What no oracle file covers, and what covers it instead: the single-game variants of econ-lab and `showHorizon`
(the carried game test), the refusal codes behind a closed tool (`ALREADY_PICKED`, `NO_PACK`, `WRONG_DECISION`,
`NOT_YOURS`, `ALREADY_DECIDED`, `NO_ROUND`: unreachable through a resident's call because the tool is locked;
the carried rule tests), a live run of the burn variant (none replays exactly), the briefing (its hash test).

### 7.3 Additions after the oracles match (issue 15)

As M1 issue 36 did for `grid-game`: nothing is added to a mechanic before its port is proven.

| Mechanic | Metric id | Computed from | Role in section 8 |
|---|---|---|---|
| `draft-rounds` | `tablePoints` | the sum of `scores` of the one `draft_match_ended`; absent without it | primary of quarry |
| | `sharedLanes` | the sum of `reference.sharedLanes` over `draft_game_scored` | secondary |
| | `decisions`, `missedPicks` | the count of `draft_card_picked`; those with `missed: true` | guardrail, exclusion |
| `econ-games` | `dilemmaCooperation` | `reference.cooperation` of the one `block_scored` with `game: "dilemma"`; absent without it | primary of econ-lab |
| | `dilemmaRound1`, `fundCooperation`, `tablePoints` | `perRound[0]` of the same; `reference.cooperation` of the public-goods block; the sum of `match_ended.scores` | secondary |
| | `decisions`, `missedDecisions` | the count of `decision_made`; the sum of `reference.missed` over `block_scored` | guardrail, exclusion |
| `strategy-brain` | `brainWrites` | the count of `brain_written` | secondary |

These are the definitions of `scripts/noise-floor-stats.ts` (`QUARRY`, `ECON_LAB`, checked line by line), so the
numbers of the M0 noise floor and of M2 are computed the same way. `decisions` counts every pick or decision, also
one the timer made, as the noise floor did. The same issue wraps both games as families:

| Family | Params (defaults) | Arms of section 8 |
|---|---|---|
| `games/quarry/game.ts` | `games` 3, `packs` 2, `packSize` 6, `brain` true, `burns` false, `openHands` false, `maxWords` 150 | control `{}`; treatment `{ openHands: true }` |
| `games/econ-lab/game.ts` | `blocks` (the three defaults), `brain` true, `showHorizon` false, `maxWords` 150 | control `{ brain: false }`; treatment `{}` |

## 8. The experiment protocol of the M2 gate

Fixed before any run: every threshold of this section is in the specs and the plan that issue 03 commits
(`games/*/experiments/*.json`, `docs/RERUN-PLAN.md`), every manifest of a series carries the hash of its spec, and
`confirmatory` refuses a dirty tree. A change of this section after the first live run of step 3 is a deviation
and is written into the series README and into `docs/M2-GATE.md`; it never changes a pass rule.

### 8.1 The two effects

| | Quarry: open quarries | Econ-lab: the brain |
|---|---|---|
| Question | Does showing every hand raise the table's points? | Does the strategy brain lower cooperation in the dilemma? |
| Spec file (issue 03) | `games/quarry/experiments/open-quarries.json` | `games/econ-lab/experiments/brain.json` |
| Control arm | `{}` (brain on, hands hidden) | `{ brain: false }` |
| Treatment arm | `{ openHands: true }` | `{}` (brain on) |
| Primary metric | `draft-rounds.tablePoints` | `econ-games.dilemmaCooperation` |
| `design` | `paired` (the seed fixes the deal and the order of the seats; the legacy noise floor found replicate means 178 points apart between two seeds, so pairing is right) | `unpaired` (the seed fixes no deal, only the order in which seats are asked; decision A10). If the shared label still correlated the two arms, the unpaired standard error would be too large, never too small |
| Seeds | 31, 37, 41, 43, 47, 53, 59, 61 (the old baseline seeds), 67, 71, 73, 79 | 41 to 52, as run labels (41 to 48 are the old ones) |
| Replicates | 1 per arm and seed: 24 runs | 1 per arm and label: 24 runs |
| Contrast | treatment minus control, mean of the 12 paired differences | mean(treatment) minus mean(control) |
| Old estimate (8 seeds, one run per arm and seed) | **+77 points**, SE 22, SD of a paired difference 63 | **-0.40**, SE 0.13 |
| What the legacy noise floor adds (5 replicates per arm at one seed) | at seed 31 the difference is **-10** (SE 38): the effect depends on the deal, and +77 is an average over eight deals measured once. Replicate noise alone gives a paired difference an SD of 84 | at label 41 the difference is **-0.71** (SE 0.14); the control arm has two outcomes (a locked table at 1.00, or 0.25 to 0.35) |
| Expected SE at 12 | 18 to 24 points | about 0.11 |
| `pass` | `{ contrast: ["open", "control"], sign: "positive", minN: 10 }` | `{ contrast: ["brain", "nobrain"], sign: "negative", minN: 10 }` |
| Secondary (reported) | `sharedLanes`, `strategy-brain.brainWrites` | `dilemmaRound1`, `fundCooperation`, `tablePoints`, `brainWrites` |
| Purpose | `confirmatory` (clean tree, `SWT-C023`) | `confirmatory` |

Model for every run: `anthropic/haiku` through the Anthropic adapter (CLAUDE.md "any live run uses Haiku via
Anthropic"; O1 "Haiku only"), thinking `medium`, output cap 4000 tokens, request timeout 120 s, provider-default
sampling. These are the values of the old runs (`RESIDENT_LIMITS` in old `apps/cli/src/host/residents.ts:26`; the thinking
default in old `apps/cli/src/host/core-run.ts:146`).
The resolved model id and the pricing go into the manifest (2.5); `comparable` refuses a series whose runs
resolved to different ids (`SWT-E005`).

### 8.2 "Keeps its sign", in numbers

| Rule | Quarry | Econ-lab |
|---|---|---|
| **Kept** | the mean paired difference is **greater than 0** | the difference of the two arm means is **less than 0** |
| Not kept | 0 or below | 0 or above |
| Runs counted | the included runs after the one replacement of 6.3 | the same |
| Smallest n for a verdict | 10 complete pairs | 10 runs in each arm |
| Below it | **no verdict**: the gate is neither passed nor failed; the numbers go to the owner | the same |
| Chance to keep the sign if the old effect is true | above 99 % (77 over an SE of 18 to 24, t with 11 degrees of freedom) | above 99 % (0.40 over 0.11; rough, because the control arm has two outcomes) |
| Chance if the true effect is two thirds or half of it | about 98 % at +50 (SE 24) | about 96 % at -0.20 |
| Chance if the true effect is a third of it | about 85 % at +25 | about 88 % at -0.13 |
| Chance to "keep" it with no effect at all | 50 % | 50 % |

The old estimate of quarry is the larger of two readings (8.1), so the third row is not a remote case: **a correct
port loses the sign of quarry about one time in seven if the true effect is +25.** Section 8.6 says what happens
then and how often the bridge would wrongly blame the port.

The last row is the honest limit of the rule D11 fixed: a kept sign shows that the port did not turn an effect
around; it does not show the effect. So the series README reports, **not gated**: the estimate with its standard
error and 95 % interval (t with 11 degrees of freedom for quarry, Welch for econ-lab), the exact sign-flip p value
(quarry: 4096 sign patterns) or the permutation p value (econ-lab, `BOOTSTRAP_SEED`), whether the estimate
reaches half the old one ("at least +38", "at most -0.20"), the same estimate over every finished run (the
sensitivity line of 6.3), the number of excluded runs per arm, and for econ-lab the share of locked tables
(cooperation 1.00) per arm with its Wilson interval (A10). The pass rule reads only the first row. The findings
block of the README (8.5) states an effect as reproduced only with its interval, and says "sign kept" where the
interval includes zero.

Rounding: the rule is applied to the unrounded estimate; `results.json` stores it with full precision.

### 8.3 Guardrails and exclusions

| Guardrail (in the spec, `held` in `results.json`) | Quarry | Econ-lab | Source of the number |
|---|---|---|---|
| `models.requests` per `decisions`, arm mean | within 10 % of 1.30 | within 10 % of 1.32 (no brain) and 1.75 (brain) | M0 noise floor |
| `models.costUsd` per run, arm mean | at most 0.041 (control), 0.050 (open) | at most 0.015, 0.025 | noise floor plus 20 % |
| refusal codes (`allowedRefusals` of the spec) | the codes of the game's oracle files: `BRAIN_TOO_LONG`, `TOOL_LOCKED`, `NOT_IN_PACK`, `INVALID_ARGUMENTS`, `BURN_IS_PICK`, `NO_BURNS_LEFT` (the last occurs without burns too: lesson P442, twice in 2160 picks) | `TOOL_LOCKED`, `INVALID_ARGUMENTS`, `OUT_OF_RANGE`, `BRAIN_TOO_LONG` | counted in the eleven files; a kernel code outside them (`STEP_LIMIT`) is reported like any other |
| `missedPicks` / `missedDecisions` | 0 in an included run | 0 in an included run | exclusion below |

A guardrail that does not hold does not fail the gate. It is written as a deviation, a lesson row (`P`), and the
series is **not** repeated (D11). It is the first thing the kill procedure reads when a sign is lost (8.6).

Exclusions, both specs: `failed-request` (a `request_failed` record after the retries), `missed-decision`,
`cost-cap`, `error-end`. An excluded run is replaced once (6.3). Excluded runs stay on the data branch. These are
the exclusion rules of the legacy noise floor (P431: a rate limit loses turns), so the numbers stay comparable;
because a missed decision is also something a resident does, the estimate over all finished runs is reported
beside the gated one (8.2).

### 8.4 The steps, in order

| Step | What | Runs | Expected cost (USD) | Stops the next step when |
|---|---|---|---:|---|
| 0 | Offline: the eleven oracle files at level 3; the canary test; `swt run --fake` of both games; the budget tests | none live | 0 | anything is red |
| 1 | Live smoke: the Hello Game with `--budget 0.05`; one pilot of quarry (seed 31, control) and of econ-lab (label 41, control), `purpose: pilot` | 3 | 0.11 | a leak, an `error` end, a cost cap reached, requests per decision outside the guardrail by more than 25 % |
| 2 | Noise floor on the new platform: 5 replicates of quarry control at seed 31; 5 of econ-lab control at label 41 (`design: replicates`, `purpose: pilot`, `baseline:` the legacy file) | 10 | 0.17 + 0.06 | reported, not a gate (below) |
| 3 | The two series of 8.1, quarry first | 48 | 0.91 + 0.40 | |
| | **Sum** | 61 | **1.65** | with 30 % for replacements and retries: **2.15** |

Step 2, the tolerance against the legacy noise floor (6.4; quarry control at seed 31: mean 1081, SD 58, n 5;
econ-lab control at label 41: 4 of 5 tables locked, mean 0.87):

- Quarry: `withinNoise` (6.2). With SD 58 in both, the standard error of the difference of two means of five is
  about 37 points, so "within" is about **1081 plus or minus 73 points**; the function uses the SD the new runs
  really have. Two standard errors at 8 degrees of freedom cover about 92 %, not 95 %: an unchanged platform is
  "outside" about one time in twelve.
- Econ-lab: `shareWithinNoise` with threshold 1.00. No band on the mean (A10: the old band 0.35 to 0.65 is
  dropped, because the measure has two outcomes). With five runs against five the Wilson intervals overlap unless
  one set is all locked and the other has none: this check can only show a gross break. It is kept because it is
  free, and its weakness is written here so that "within" is not read as evidence. (The control level itself is
  not settled on the old platform: two of eight tables locked in the baseline, four of five in the noise floor.)
- The guardrails of 8.3 for the control arm.
Outside the tolerance is **not** a stop: with n 5 the check has little power, and the gate of D11 is the sign.
It is written into `docs/M2-GATE.md` with the numbers, and the reviewer reads two of the five logs against two
legacy logs before step 3 starts (what a resident sees at its first turn: system prompt hash, input lines, tool
list). A difference found there is a port error and is fixed before step 3; step 2 is then run again once, and
both sets of runs are kept.

Run rules: `concurrency: 2` (rate limits were not measured, so not more); the order is the shuffled plan of
`planRuns`, which interleaves the arms; per-run cap 0.10 USD for quarry and 0.05 for econ-lab (more than twice a run; decision A17 replaces 0.40); experiment caps
`totalUsd` 1.50 (quarry series), 0.75 (econ-lab series), 0.50 and 0.25 (noise floors); every command names the
ledger `games/m2-ledger.jsonl` with `capUsd: 4.00` (8.5). No test calls a model.

| Cap | Value | Enforced by |
|---|---:|---|
| one run | `--budget`, 0.40 (0.05 for the Hello Game) | the meter's `RunLimit` in the kernel, and the driver's check before each request (4.3); `SWT-X005` without one; `SWT-X007` for a model without a price |
| one experiment | `budget.totalUsd` | `runExperiment` before each run, with a reservation per run in flight (6.3) |
| a broken series | three runs | `SWT-E007` (6.3) |
| M2 as a whole | 4.00 | the ledger (6.6): a run whose cap does not fit is refused, `SWT-C025` |

### 8.5 Money, data, write-up

| Line | USD |
|---|---:|
| Spent before M2 (M0 noise floor on the old platform, 25 runs) | 0.72 |
| Planned for M2, steps 1 to 3 with reserve | 2.15 |
| Bridge series on the old code, only by 8.6 step 2 | at most 1.31 expected for both; capped per run (8.6) |
| **Hard stop of M2 live spending** (decision A14: approved by the owner inside this cap, on Haiku through Anthropic; enforced by the ledger of 6.6, not by a sum somebody keeps) | **4.00** |
| Total through M2 at the hard stop | 4.72 of the 10.00 of D4 and O1 |

- **Data (decision A15).** There is no second repository for now. Every run folder, also a stopped or excluded
  one, is committed to the branch **`data/runs`** of this repository: an orphan branch (no common history with
  `develop`) with the layout the data repository was planned to have, `<game>/<experiment id>/<run>/`, with
  `experiment.json`, `results.json`, `values.csv` and the series `README.md` beside the runs, and `smoke/` for the
  runs of step 1. The gate issue works in a second worktree (`git worktree add ../runs data/runs`) and gives its
  path to `--out`; one commit per step, signed off like every commit, subject `M2-24 data: <step>`. The branch is
  not pushed by an agent (publishing is the owner's).
  - *Why a branch and not a `runs/` folder on `develop`:* (1) a `confirmatory` run needs a clean tree
    (`SWT-C023`), and a folder inside the checkout that fills while the series runs makes it dirty after the first
    run; (2) the gates of `pnpm check` read every file of the tree (English, names, licence headers, line
    budgets), and a log holds model text that would trip them or need an exemption; (3) `develop` keeps one squash
    commit per issue, and run data would have to be cut out of that history again when the data repository
    comes, which only a rewrite of history can do; an orphan branch moves to `swarmtales-runs` with one push and
    keeps its commits and signatures; (4) a clone for the check stays small.
  - *Size:* a quarry run of the old platform is about 0.7 MB (log 370 kB, chain 110 kB, per-resident files),
    an econ-lab run about 0.4 MB (measured on branch `m0/noise-floor`: 15 runs 11 MB, 10 runs 4.2 MB). M2 plans
    29 quarry runs and 29 econ-lab runs plus 3 smoke runs: about **35 MB** in the working tree, up to 45 MB with
    replacements, and about 42 MB more if both bridges run (48 runs) and the 25 legacy noise-floor runs are
    copied. Logs are JSON lines; packed by git they are estimated at a fifth to a tenth of that (not measured):
    **4 to 18 MB** in the repository.
  - `develop` gets `games/<id>/RUNS.md`: one row per series with the path on `data/runs`, the commit of the data
    branch, the code commit, the kernel revision, n, the estimate and the cost. The legacy noise-floor runs are
    copied to `legacy/` on the data branch in the same step.
  - The data repository `swarmtales-runs` (O8) stays an open point for the owner at release (M6); `CLAUDE.md`
    ("run data goes to the data repository") is changed by issue 00 to name the data branch until then.
- **Review.** Every `REPORT.md` of steps 2 and 3 is written by `swt report`. The reviewer reads the facts table
  of every run and the full log of at least two runs per arm, and writes loopholes and problems by hand under
  the fixed heading (6.5) and as `P` and `LH` rows into `docs/LESSONS-LEARNED.md`.
- **README.** Section 4 gets the first findings block, at most ten lines: the two estimates with n, standard
  error and the link to the series; nothing without a number. Section 5 gets one recorded moment: one quotation
  of a resident with its `#seq` and run link. `docs/FINDINGS.md` gets the two rows with the status "reproduced
  on the rewrite" or "not reproduced".

### 8.6 The kill criterion, as a procedure

Done by the gate issue (24), in this order; every line is written into `docs/M2-GATE.md` with its number.

| # | Check | How | Fires when |
|---|---|---|---|
| 1 | Effort | sum the rows of `docs/ISSUE-RECORD.md` for M0 to M2 (planned: 14 + 37 + 25 = 76, decision A12; the record also has M1-37 and M1-38) | more than 150 issues (A4, A12), 600 million tokens or 1500 USD (after the one recalibration of D4) |
| 2 | Size | `pnpm check` on `develop` with the two budget tests (and the M2 gate of 1420 for the kernel, 1.4), while the oracle tests of tic-tac-toe, quarry and econ-lab are green in the same run | kernel above 1500 code lines or engine total above 4100 |
| 3 | Sign | `swt experiment analyse` of both series; exit 0 for both is a pass | see below |
| 4 | Keys | the canary test green; `findLeaks` over every run folder of M2 on the data branch | not a kill number: any hit stops O10 until it is explained and the key is rotated |

Check 3 when a series does not keep its sign (exit 3):

1. Nothing is run again on the new platform (D11). Read the guardrails of the failed series and the tolerance
   of step 2.
2. Run the **bridge**: the same two arms and the same 12 seeds of the failed effect on the old code (the tag
   `v0-final`, the old command line, as the M0 noise floor was run on branch `m0/noise-floor`), once, same model
   alias. Expected cost 0.91 (quarry) or 0.40 (econ-lab). The eight old baseline seeds are **not** reused as the
   bridge: they are weeks old, and the question is the model of today. The old command line knows no ledger and
   no experiment cap, so the bridge is capped by what it has: one run at a time, `--budget 0.07` per quarry run
   and `0.04` per econ-lab run (1.6 and 1.9 times the dearest run of the noise floor), which bounds a bridge at
   1.68 or 0.96 by code. It starts only when that bound fits under the ledger's cap; each run's cost is added to
   the ledger as a `legacy/` line. If it does not fit, or both effects need a bridge and the second does not
   fit, the owner decides: the hard stop of A14 holds.
3. The bridge keeps the old sign: **kill criterion 3 fires** (REWRITE section 7, binding on this file). The port
   changed the effect. The branches are renamed back (DECISIONS 8.5); oracles, manifest, facts table and the
   licence work move to the old state. `docs/M2-GATE.md` records beside the two signs the **difference between
   the platforms** (new estimate minus bridge estimate) with its standard error (about 34 points for quarry,
   0.16 for econ-lab) and interval, and the false-alarm rate of this step: two series of 12 disagree in sign by
   chance in about 0.4 % of the cases at a true +77, 2 % at +50, **13 % at +25** and 25 % with no effect. The
   criterion is the owner's and is applied as written; the numbers are there so that the decision to rename is
   taken with them in view.
4. The bridge loses the sign too: the model moved, not the platform. Criterion 3 does not fire, and the M2 gate
   is still **not** passed. The numbers of both go to the owner; no further series is run without his go.
5. No verdict (8.2, too few runs): the owner decides whether the missing seeds are run; they would be new seeds
   from the list 83, 89, 97, never a repeat of a played one.

After a pass of all four: tag, the M2 exit note in `docs/M2-GATE.md`, and only then O10 may be asked for.
What the gate issue no longer waits for: **O1** is given for M2 by decision A14 (inside the caps of 8.4 and 8.5),
**O7** is replaced by decision A13 (the run takes whichever variable is set), **O8** by decision A15 (the data
branch). It waits for the M1 exit check and for every issue before it.

## 9. Issues

Rules as in M1 10.2: allowed paths are disjoint inside a wave; a root `index.ts` line is added by the
integrator; an issue may be built when its "Start after" is merged and is merged when its "Merge after" is
merged and its proving test is green. A number without prefix is an M2 issue, `M1-nn` an issue of the M1
specification. "Lines" are planned hand-written lines, source plus tests (D4); carried lines are not counted.
Issues 02, 03 and 04 are the interfaces: they hold types, schemas and error catalogues and almost no behaviour.

| # | Title | Done when | Allowed paths | Proving test | Start after | Merge after | Lines |
|---|---|---|---|---|---|---|---|
| 00 | Scaffold of M2 | packages `models`, `lab`, the two mechanics and the two games exist with empty barrels; lockfile with the two pi libraries; the licence gate is green over the whole closure (1.3) or the issue stops; layer rows of 1.2 (`lab` may import `runlog`); the lint rule that allows `process.env` only in `apps/cli/src/env.ts`; `CLAUDE.md` names the key variables of A13 and the data branch of A15 | `packages/{models,lab}/` (config, barrels), `mechanics/{draft-rounds,econ-games}/package.json`, `games/{quarry,econ-lab}/package.json`, `scripts/layers/table.ts`, `docs/LAYERS.md`, `scripts/eslint/restricted.ts`, `eslint.config.js`, `scripts/licences/`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `tsconfig.json`, `THIRD-PARTY-LICENSES.md`, `CLAUDE.md` (two paragraphs) | layer check with 12 library packages; licence check; a lint fixture with `process.env` fails | now | now | 150 |
| 01 | Redaction (blocker) | 2.2: `redactSecrets`, `redactValue`, `redactWith`; the kernel's `detailOf` and the run log sink use them; `RunFolderOptions.redact`; `openRunFolder` refuses a manifest, game data or texts that `redact` would change (`SWT-L006`) | `packages/contracts/src/redact.ts`, `packages/kernel/src/lifecycle.ts` (`detailOf` only), `packages/runlog/src/{sink,folder}.ts`, their tests | a handler throws an error whose message holds a URL with credentials, an `sk-` value and a bearer token: none is in the in-memory `run_ended.detail`, in `events.jsonl` or in `manifest.json`; the line in the file is the redacted one and the chain verifies; a manifest with an `sk-` value in `game.params` creates no folder | now | M1-38 (the kernel has 2 lines to its interim gate today) | 190 |
| 02 | Contracts of M2 (`interface-change`) | the optional and new types of 2.3 to 2.6: `RecordSource`, `RunLimit`, `KernelDefinition.records`, `KernelPorts.limits` and `.redact`, `ModelChoice` and the wider `model`, the manifest fields (`pricing`, the `textHashes` keys), `MetricDefinition`, `SWT_CODE` with `E`. **Not** the two `record` members (issue 05) | `packages/contracts/src/{kernel,game,run}/`, `src/error.ts`, tests | schema tests; a game and a manifest of M1 still parse; `GAME_FORMAT_VERSION` unchanged (all additions optional); `pnpm check` green with no other change (nothing that implements an interface breaks) | now | 00 | 200 |
| 03 | Lab base | `ExperimentSpecSchema`, `ExperimentResults` and `NoiseFloor` schemas, the `E` catalogue; the committed plan: the two specs of 8.1, the two noise-floor specs, the two legacy baseline files, the ledger file with its cap line, `docs/RERUN-PLAN.md` (this section 8, short) | `packages/lab/src/experiment/{spec,results,noise-schema}.ts`, `src/errors.ts`, `games/*/experiments/*.json`, `games/*/noise-floor.legacy.json`, `games/m2-ledger.jsonl`, `docs/RERUN-PLAN.md` | every committed spec and baseline file parses; a spec with an unknown key is `SWT-E001`; the baseline numbers equal those of branch `m0/noise-floor`; the metric ids of the specs are checked against the heads in issue 22 (`SWT-E010`) | 02 | 00, 02 | 340 |
| 04 | Models base | 3.1 and the catalogue: `createKeyBroker`, `KEY_VARIABLES` (A13), the `X` codes, the record schemas of 4.4 | `packages/models/src/{keys,errors,records}.ts`, tests | the rules of 3.1: a missing key names every variable tried; the `SWT_` name wins over the fallback; a short value is `SWT-X006`; `redact` removes a held value also inside JSON; `leaks` finds the base64 and percent-encoded forms; no function and no property returns a value, and `JSON.stringify`, `String` and `inspect` show none | 01, 02 | 00, 01, 02 | 360 |
| 05 | Kernel: records, external limits, redaction port | 2.3 built: `Kernel.record` and `Activation.record` (the members are added to the contracts here), `KernelDefinition.records`, `KernelPorts.limits` and `.redact`, `SWT-R017`; the kernel is at most 1420 code lines; the test for a listener of an unloaded plugin (the rule is M1-38's) | `packages/contracts/src/kernel/{ports,kernel-def}.ts` (the two members), `packages/kernel/src/{kernel,ports,lifecycle,errors}.ts` (the named additions only), `test/{record,run-limit,soft-listener}.test.ts`, `test/budget.test.ts` (the gate number) | a record of an undeclared source is `SWT-R017`; a record inside an activation is caused by it and has the audience `human`; an external limit ends the run with its id, before a plugin's limit; a listener of an absent plugin is skipped and a listener of a present one runs; an error message and a record payload with a held value are redacted through the port, in memory | 02, M1-38 | 01, 02, M1-38 | 260 |
| 06 | sdk and engine: families, metrics on the head, manifest | 2.4 to 2.6 built: `defineGameFamily`, overrides with `SWT-G041`, `ResolveInput.records` and `.params`, `ResolvedGame.params`, `metrics` on the head and `defineMetric`, `buildManifest` with models, pricing, prompts, budget, purpose, replicate, experiment | `packages/sdk/src/game/{family,types,resolve}.ts`, `src/errors.ts`, `src/mechanic/{metrics,types,define-head}.ts`, `packages/engine/src/run/manifest.ts`, tests | a family resolved with two param sets gives two game hashes and the two `params` records; an unknown override is `SWT-G041`; a head with a metric gives the same game hash as without; the manifest of a fake run still verifies; the engine total budget test | 02 | 02 | 330 |
| 07 | Models: providers and settings | 3.2 and 3.3: the Anthropic and the OpenRouter adapter (both built with `createProvider` and the broker's auth object), model settings, request limits | `packages/models/src/{providers,settings,request}.ts`, tests | each adapter is created with the broker's auth object and a stubbed `fetch`: the key value appears in the stub's request header and in no returned object, no error text and no log; unknown provider and model are X002 to X004; the alias `haiku` resolves to the id the old registry had | 04 | 04 | 380 |
| 08 | Models: source, scripted source, cost meter | `createModelSource` with the closed auth context and `SWT-X007`, `scriptedSource` with `act`, `say`, `fail` (3.4), `createCostMeter` with the limit `models.budget` (4.3) | `packages/models/src/{source,scripted,meter}.ts`, tests | the meter stops a kernel run at the first request that passes the cap and the `RunEnd` names `models.budget`; no cap is `SWT-X005`; a model with a price of zero is `SWT-X007`; a key variable planted in `process.env` reaches no provider that was built without the broker; the scripted source replays a list | 04, 05 | 04, 05, 07 | 380 |
| 09 | Models: the resident session | 4.2 without the tools notice: one turn of one resident: context, tool calls in order, the pending answer, a failed request, the refused step, the records `request` to `request_failed`; no call after the activation closed (O18) | `packages/models/src/driver/session.ts`, tests | with the scripted source: a tool call reaches `activation.call` and its outcome text is the old one; `pending` is true after a tool call and false after a plain answer; a `fail` step is recorded redacted and the run goes on; a refusal text takes the step's inputs out of the context; usage reaches the meter; `maxRetries: 6` reaches the stream function | 05, 08 | 08 | 370 |
| 10 | Models: notice, prompt, driver assembly | 4.1 and the rest of 4.2: the tools notice with late tools and the context reset, `createModelDrivers`, `fix()`, `systemPrompt`, the `prompt_fixed` record; the prompt files carried to `library/prompts/resident/`; `maxOutputTokens: 16000` in the tic-tac-toe game file | `packages/models/src/driver/{notice,prompt,create}.ts`, `src/index.ts`, `library/prompts/resident/`, the tic-tac-toe game file (one line), tests | `guess-number` plays to its end through `play` with the scripted source; `prompt_fixed` holds the hash of each system prompt and equals `manifest.textHashes.system`; the notice is sent once and again after a reset or a change of the open tools; the hash of the five prompt bodies; the tic-tac-toe oracle test stays green | 08, 09 | 05, 09, M1-29, M1-30, M1-35 | 380 |
| 11 | Port: `draft-rounds` | the package of 7.1: `model.ts` carried, `index.ts` split into `head`, `flow`, `texts`; rule tests green; byte-identity test green | `mechanics/draft-rounds/**` | `model.test.ts`, `carried.test.ts`, `checkPackage`, `checkDeterminism` | now (M1-23 and M1-26 are merged) | M1-30, M1-33, M1-38 | 280 |
| 12 | Port: `econ-games` | the same for `econ-games` | `mechanics/econ-games/**` | the same | now | M1-30, M1-33, M1-38 | 320 |
| 13 | Game: quarry and its oracles | `games/quarry` plays; its carried game test is green; **`runOracle` returns no mismatch at level 3 for the six files**; cut files and the pending rule of a live replay in `runOracle` (7.2) | `games/quarry/**` except `experiments/` and the baseline file, `packages/testkit/src/oracle/run.ts`, `packages/testkit/test/oracle-{cut,pending}.test.ts` | `oracle.test.ts`; the sha256 of the eight briefings | 11 | 11, M1-29, M1-31, M1-33, M1-35, M1-38 | 310 |
| 14 | Game: econ-lab and its oracles | the same for the five files of econ-lab (three are live replays and need the pending rule of 13) | `games/econ-lab/**` except `experiments/` and the baseline file | `oracle.test.ts`; briefing hashes | 12 | 12, 13, M1-29, M1-31, M1-33, M1-38 | 220 |
| 15 | Additions: metrics and families | 7.3: the metrics of the three mechanics; both games as families with the arms of 8.1 | `mechanics/{draft-rounds,econ-games,strategy-brain}/src/metrics.ts` and the `metrics` line of each head, the game files of quarry and econ-lab, tests | each metric over the new log of an oracle replay equals the number computed by hand from the same oracle file (the sum of `scores` in its `draft_match_ended` entry, the `reference` of its `block_scored` entries); a metric without its event is absent; the family's default params give the game hash of issue 13 and 14; all oracle tests stay green | 06, 11, 12 | 06, 13, 14 | 330 |
| 16 | Lab: facts | 6.1: `readRun`, `factsOf`, the generic keys, the "absent" rule | `packages/lab/src/facts/**` | facts of a `guess-number` run; an unfinished run and a run that fails `verifyRun` are refused; a metric without its event is `"absent"`, not 0 | 02, 03 | 03, M1-30 | 370 |
| 17 | Lab: statistics | 6.2: `summarize`, `pairedEffect`, `unpairedEffect`, `share`, `withinNoise`, `shareWithinNoise`; no dependency | `packages/lab/src/stats/**` | the numbers of the M0 noise floor are reproduced from its value lists (+77 and SE 22; -0.40 and SE 0.13; the summary of 1080, 1163, 1109, 1033, 1021); the sign-flip p of a hand example; fixed bootstrap seed; 1081 against five values with SD 58 is within 73 and not within 74 | 00 | 00 | 330 |
| 18 | Lab: experiment | 6.3 and 2.5: `planRuns`, `runExperiment`, `analyse`, `COMPARE_FIELDS`, `comparable` | `packages/lab/src/experiment/{plan,run,analyse,compare}.ts`, tests | with a fake `PlayRun`: the plan is the same for the same spec; a stopped experiment continues without replaying; the cap stops before a run, also with two runs in flight (E004); three failed runs stop it (E007); an excluded run is replaced once; the pass rule on a hand table gives kept, not kept and no verdict; two manifests with another model id do not compare (E005) | 03, 16, 17 | 16, 17 | 390 |
| 19 | Lab: report | 6.5: `renderRunReport`, `renderSeriesReport`, the fixed heading | `packages/lab/src/report/**` | snapshot of both reports from fixture facts; the heading string is pinned; `absent` is printed as the word | 03, 16 | 16 | 300 |
| 20 | CLI 3: the live run | 6.6: `env.ts`, `flags.ts`, `runLive` in its six steps without the ledger and the leak scan; `swt run` without `--fake`; terminal output through `broker.redact`, never an error object | `apps/cli/src/{env,flags,live,main}.ts`, `apps/cli/test/live.test.ts` | `runLive` with the scripted source in place of a provider: manifest before the first event, a run that ends at `models.budget` exits 5, a missing key exits 1 with `SWT-X001` and names both variables, no `--budget` is `SWT-X005`, the key under the fallback name of A13 is found | 04, 06, 10 | 06, 10, M1-34 | 380 |
| 21 | Canary test, leak scan, spend ledger | 5.2 and 5.3: `findLeaks`, the scan at the end of `runLive` and the exported `scanFolder`; the canary test with its six parts and two scans; the ledger of 6.6 with `--ledger` | `packages/runlog/src/leaks.ts`, `apps/cli/src/{leak-scan,ledger}.ts`, `apps/cli/src/live.ts` (the two calls), `apps/cli/test/{canary,ledger}.test.ts` | the canary test itself, shown failing for each of the three layers (5.2); a planted value in a run folder gives exit 4 and the `LEAK` file without the value; a run whose cap does not fit under the ledger is refused (C025) and a crashed run keeps its reservation | 20 | 01, 05, 10, 20 | 330 |
| 22 | CLI 4: `swt report`, `swt experiment` | the two commands of 6.6 with their exit codes; both call `scanFolder`; `swt experiment run` passes the ledger on | `apps/cli/src/{report,experiment}.ts`, `apps/cli/src/main.ts` (two lines), `apps/cli/test/experiment.test.ts` | a two-arm experiment over a family of `guess-number` with the scripted source runs, is stopped, continues, is analysed; exit 3 when the pass rule fails, 7 without a verdict | 18, 19, 20 | 18, 19, 21 | 340 |
| 23 | Mechanic README generator | `scripts/mechanic-docs.ts` carried (548 code lines at `v0-final`) and changed to read the head (tools, events, options, metrics); the READMEs of all seven mechanics regenerated; the stale check in `pnpm check` | `scripts/mechanic-docs.ts`, `mechanics/*/README.md`, `package.json` (one script) | a changed head makes the check fail; the READMEs are current | 15 | 15, M1-32, M1-33 | 200 |
| 24 | The M2 gate | section 8, steps 0 to 3; the runs on the branch `data/runs`; README sections 4 and 5; `docs/FINDINGS.md` (today's `CROSS-GAME-FINDINGS.md`, renamed as DECISIONS section 7 says, rows marked); lesson rows; `docs/M2-GATE.md` with the kill procedure | `docs/M2-GATE.md`, `docs/FINDINGS.md`, `docs/CROSS-GAME-FINDINGS.md`, `docs/README.md` (the link), `docs/LESSONS-LEARNED.md`, `README.md`, `games/*/RUNS.md`, `games/m2-ledger.jsonl`, the branch `data/runs` | `swt experiment analyse` exits 0 for both series; the four checks of 8.6 | all | all, the M1 exit check, M1-36 | 150 |

**25 issues** (decision A12): the 24 of A4 and one more, because the models package needs five issues under the
400-line rule (section 11, row 30). M0 to M2 are 14 + 37 + 25 = 76 planned issues against the kill line of 150;
the two M1 follow-ups M1-37 and M1-38 are M1 issues and are counted in the record, not here. The challenge moved
work between issues so that none is planned at the limit: `notice.ts` from 09 to 10, the tolerance functions from
18 to 17, `comparable` from 06 to 18, the `$param` reference out of 06, the ledger into 21. The largest are 18
(390), 07, 08, 10 and 20 (380). If the diff of one of them passes 400 lines, its builder stops and reports the
part that is coherent (rule of the build agents); it is not stretched.

## 10. Waves and dependencies

### 10.1 Wave plan

A wave is a set of issues whose allowed paths are disjoint and that the integrator may merge in any order once
the wave before is in. "Opens when" is the merge condition; building may start earlier (below).

| Wave | Issues | Width | Opens when |
|---|---|---|---|
| 0 | 00 | 1 | now |
| 1 | 01, 02, 17 | 3 | 00; 01 also M1-38 |
| 2 | 03, 04, 05, 06 | 4 | 01, 02; 05 also M1-38 |
| 3 | 07, 11, 12, 16 | 4 | 03, 04; M1-30, M1-33, M1-38 |
| 4 | 08, 13, 18, 19 | 4 | 05, 07, 11, 16, 17; M1-29, M1-31, M1-35 |
| 5 | 09, 14 | 2 | 08, 12, 13 |
| 6 | 10, 15 | 2 | 09; 06, 14; M1-29, M1-30, M1-35 |
| 7 | 20, 23 | 2 | 10, 15; M1-32, M1-34 |
| 8 | 21 | 1 | 20 |
| 9 | 22 | 1 | 18, 19, 21 |
| 10 | 24 | 1 | everything; the M1 exit check; M1-36 |

Longest chain of merges: 00, 02, 04, 07, 08, 09, 10, 20, 21, 22, 24 (eleven). The narrow places are the driver
(09, 10), the command line (20, 21, 22: three issues that share `live.ts` and `main.ts` and therefore merge one
after the other) and the gate (24), which is one builder and wall time. Two lines of work never touch: models
(04, 07 to 10) and the ports with the lab (11 to 19); they meet in 20. Collisions that the first plan had inside
a wave and that are now in sequence: 13 before 14 (both need the oracle runner's pending rule, which 13 owns),
21 before 22 (22 calls the scan of 21 from `report.ts`).

**What can be built before M1 is finished** (the code they are written against is on `rewrite/develop` today:
contracts, sdk with `defineMechanic` and `resolveGame`, the manifest builder, the run log, the mechanic contract
files):

| Can start | Issues | Waits only for |
|---|---|---|
| today | 00, 01, 02, 17 | 01 merges after M1-38 |
| today, against the merged `defineMechanic` | 11, 12 | merge after M1-30 (conformance), M1-33 (the body of `strategy-brain`), M1-38 |
| when 02 is merged | 03, 04, 06, then 07, 16 (with a hand-made run folder as the fixture until M1-30), 18, 19 | nothing of M1 to start; 16 merges after M1-30 |

**What waits for M1:** 05 (it changes the kernel files that M1-38 rewrites, so it starts after M1-38), and behind
05 the meter's test in 08 and with it 09; 10 (M1-29, M1-30, M1-35); 13 and 14 (M1-29, M1-31, M1-33, M1-35);
15; 20 to 22 (M1-34); 23 (M1-32, M1-33); 24 (the M1 exit check, M1-36).

### 10.2 What each M2 issue needs from M1 issues 25 to 38

| M1 issue | Gives | Needed by (M2) | Kind |
|---|---|---|---|
| 25 Kernel assembly (merged) | `createKernel`, the kernel budget test | 02, 05, 08 (the meter's test runs a kernel) | merged |
| 26 `defineMechanic` (merged) | `defineHead`, `defineMechanic(head, build)` | 06 (`metrics` on the head), 11, 12 | merged |
| 27 `resolveGame`, texts (merged) | `ResolveInput`, prompt texts and their hashes | 02, 06, 10 (`systemPrompt` reads resolved texts), 13, 14 | merged |
| 28 Viewer (merged) | | none. The viewer shows driver records as unknown events until M3 (open point 12) | |
| 29 testkit `play`, drivers | `play`, `host`, `scriptedDriver` | 10, 13, 14 (carried game tests), 20 | merge |
| 30 Fixture, conformance | `guess-number`, `checkDeterminism`, `checkPackage` | 10, 11, 12, 16, 22 | merge |
| 31 Oracle runner | `readOracle`, `runOracle`, levels | 13 (adds cut files and, if missing, the pending rule to `run.ts`), 14 | merge |
| 32 Port `team-channel`, `consensus` | the two packages | 23 only | merge |
| 33 Port `grid-game`, `optimal-referee`, `strategy-brain` | the body of `strategy-brain` | 11, 12 (their conformance tests load it), 13, 14, 15, 23 | merge |
| 34 CLI `swt run --fake` | `main.ts`, `run.ts`, exit codes 0 to 2 | 20, 21, 22 | merge |
| 35 The tic-tac-toe game | the game file and its oracle test, with two live-replay files | 10 (one line; the oracle test is its regression), 13 (where the game file sits; the pending rule), 24 (kill check 2) | merge |
| 36 Hello Game | `games/hello/game.ts` | 24 (the live smoke of step 1) | merge |
| 37 Catalogue codes and checks (merged) | `SWT-M013`, `M024`, `M025` in the catalogue; `envelopeLogIssues` entries with a `kind`; `openRunFolder` and `verifyRun` check the manifest against `RunManifestSchema` (`SWT-L003`) | 02 (a new manifest field must be in the schema or the folder is refused), 01 (`folder.ts`), 16 (`readRun` reads `kind`, not a reason text) | merged |
| 38 Kernel back to its gate | the kernel at most 1380 code lines (`parts.ts` as derived types); a listener of an unloaded plugin is skipped again | 01, 05 (kernel lines and files), 11 to 14 (the games load `strategy-brain` without `grid-game`) | merge |
| earlier: 15, 21, 22, 23 | `lifecycle.ts`; the manifest builder; the run log; the contract files of `strategy-brain` | 01; 06; 01, 16; 11, 12 | merged or in wave 3 of M1 |

### 10.3 Hidden dependencies that were checked

| Looked like parallel, is not | Resolution |
|---|---|
| quarry and econ-lab load `strategy-brain` without `grid-game`; the kernel refuses the listener | M1-38 skips it; 11 to 14 merge after it; 05 holds the test |
| the driver writes events, and only plugins may | record sources, declared by `resolveGame` input (2.3); 02 before 04 |
| the cost cap must end a run from outside a plugin | `RunLimit` in `KernelPorts` (2.3); the meter is built in 08 after 05 |
| the manifest needs the system prompt hashes before the first event, the driver needs a kernel to build them | `systemPrompt` is a pure function of the resolved game (4.1); `runLive` step 3 |
| `lab` must play runs but may not import `models` or the command line | the injected `PlayRun` (6.3) |
| metrics change a mechanic's head | the head is not part of the game hash (checked in `resolve.ts`: the hash is of the filled game data), so the oracles and the comparison of runs are untouched; metrics are still added after the oracles match (15, decision 16); the experiment specs are written against the ids in 03 and checked with `SWT-E010` in 22 |
| issue 03 writes spec files into `games/*/`, issues 13 and 14 own those folders | the paths `experiments/` and the baseline file are excluded from 13 and 14 |
| both games' families edit `game.ts` after 13 and 14 | 15 merges after them and owns the file then |
| the README generator reads heads of all mechanics | 23 after 15 and after M1-32, M1-33 |
| `runlog` scans for keys but may not know the broker | `findLeaks(directory, test)` takes the test as a function (5.3) |
| contracts gets required members that only the kernel implements | 02 adds the optional parts, 05 adds `record` to the two interfaces with the implementation (2.3) |
| the sink's redaction hides what the kernel and the driver let through | the canary test scans the envelopes in memory too (5.2) |
| `lab` must verify a run folder and the verifier is in `runlog` | `lab` may import `runlog` (1.2) |
| the provider library reads `process.env` by itself | the closed auth context (1.2, 08) |
| 14 needs the oracle runner change that 13 owns; 22 needs the scan that 21 owns | 13 before 14, 21 before 22 (10.1) |
| the kernel is 2 lines under its interim gate | 01 and 05 merge after M1-38 |
| the canary must reach the driver without a network | the scripted source (3.4) through `LiveInput`; the adapters have their own test with a stubbed `fetch` (07) |
| redaction in the kernel needs the broker's values, the kernel may not import `models` | pattern redaction in 01 (contracts), value redaction through `KernelPorts.redact` in 05 |

## 11. Decisions made in this file

| # | Decision | Reason |
|---|---|---|
| 1 | `redactSecrets` lives in `contracts`, not in the kernel | kernel, run log, models and the command line all need it; it is 25 lines without a dependency |
| 2 | Redaction in five places (kernel detail, kernel records, the models' error texts, the run log sink and the opening of a run folder, command-line output) plus the broker's value redaction; redaction always before the line is chained | patterns miss keys of an unknown shape; the broker knows the values it holds. One place alone left the defect of `detailOf`; a file that is written once (the manifest) can only be refused, not repaired |
| 3 | Issue 01 is the first wave and nothing live runs before it | a signed line cannot be edited afterwards |
| 4 | The cost cap is an external `RunLimit` given to the kernel, not `Kernel.stop` | `stop` is booked for M3 (150 lines with its neighbours); a limit ends the run through the path the tick limit already uses, 6 lines |
| 5 | A listener whose source plugin is absent is skipped again; erratum E4's refusal is withdrawn. **Built by M1-38, not by M2** | the old loader did so, and both ported games depend on it. A listener of an undeclared event of a loaded plugin is still `SWT-R002`; a misspelt plugin id shows as a listener that never runs, which the mechanic's own test catches |
| 6 | The driver writes records through a declared record source; audience is the human reader only | paper 07 section 6: nothing a model can read may come from outside the rules. The records are in the signed log, so cost and prompts are verifiable |
| 7 | Variants of a game are a game family in TypeScript. The `params` field and the `$param` reference of a data game are **not** built at M2 | M1 1.4 lets a reserved item return only with a user; both games are TypeScript games and one arm changes grants and a briefing. The reference returns with the first data game that has an arm |
| 8 | A live run without `--budget` is refused; the cap is not part of the game hash | lesson P443 (a budget change moved the game hash and split a baseline); P431 (a run without a cap) |
| 9 | No `usage.json`; usage is `response` records and the manifest's pricing | one source of truth, signed; the facts table reads it like any event |
| 10 | No `ModelPort` in contracts at M2 | one consumer (the resident driver). It returns when a second consumer exists (the judge of M3) |
| 11 | Two adapters only: Anthropic direct, OpenRouter | the task and CLAUDE.md name these two; DeepSeek direct, Z.ai and custom endpoints had no run in the two games |
| 12 | The scripted source is a test double, not a provider of the command line | a "provider" a user can pick must not produce fake science; `--fake` stays the offline path |
| 13 | `lab` is one package with four folders and reads run folders only | E6 ceiling reached at twelve; REWRITE 3.2 |
| 14 | `lab` gets its player injected (`PlayRun`) | layer rule: `lab` imports `contracts` and `chain` only; tests need no model |
| 15 | Metrics are declared on the mechanic head and computed from that mechanic's own events | the rule author knows what a number means; the lab needs no game knowledge; a head is readable without a body (A8) |
| 16 | Metrics and families are added after the oracles match | as M1 decision 28: an addition must not hide a port error |
| 17 | `design` is a field of the spec; nothing infers it | A10: econ-lab is unpaired although it has seeds; a wrong inference would report a wrong standard error |
| 18 | The model-written loophole section is not built at M2; its heading is | no gate line needs it, its old model is paid through another provider, and the gate money is Haiku money. D5 is kept in shape, completed at M3 |
| 19 | The leak scan runs at the end of every real run, not only in the canary test | the canary proves the mechanism with a planted value; the scan proves each artefact with the real one |
| 20 | Both `index.ts` files are split into `head`, `flow`, `texts` | the 300-line file limit; A8 wants the tool declarations on the head. The code is moved, not changed; the oracle proves it |
| 21 | Game ids are `quarry` and `econ-lab`; old variant names are not carried | variants are params (REWRITE 3.1); the oracle table maps each old name to its params |
| 22 | All eleven oracle files are level 3 | all are replays of resident calls with no model-side state; a lower level would hide an order error of the two hooks |
| 23 | The gate runs two arms per effect; quarry without brain and the burn variant are not run | D11 names two firm effects; every other arm is cost without a gate line |
| 24 | Twelve seeds: the eight old ones plus the next four primes (quarry), labels 41 to 52 (econ-lab) | the old seeds make the new numbers readable beside the old; D11 says 12 |
| 25 | "Kept" is the strict sign of the point estimate; at least 10 pairs or 10 runs per arm for a verdict | D11's wording, made a number. The interval and p value are reported and not gated, because the series runs once and its power for a half-size effect is stated in 8.2 |
| 26 | The noise floor on the new platform is a guardrail, not a gate | five replicates cannot reject a port; they can show a gross difference before 48 runs are paid |
| 27 | The bridge on the old code is run only when a sign is lost | it costs as much as the series; kill criterion 3 needs it only then |
| 28 | Hard stop of M2 live spending at 4.00 USD | planned 2.15, one bridge 1.31, the rest reserve; far below the 10.00 of D4 so one mistake cannot use it up |
| 29 | A new error letter `E` | experiment errors are neither game, run nor command-line errors; the catalogue stays one letter per owner |
| 30 | 25 issues, one above A4 (decision A12) | models is about 1065 source lines and about 800 test lines; four issues of 400 cannot hold them. Total M0 to M2 is 76 planned against the kill line of 150 |
| 31 | Game files and specs name the model by the alias `anthropic/haiku`; the provider's model id stands in one place, the alias table of the adapter, and the resolved id is written into every manifest | a new model id is then one line, and a run still says exactly what answered. The alias resolves to the id the old registry entries named, so the port changes nothing (open point 17 on the repository rule) |
| 32 | The resident prompt ids move to `resident/...` (files carried byte-identical from old `library/prompts/competitor/`) | the retired word of the name lint; the text and so the prompt hash are unchanged |
| 33 | Concurrency 2, per-run cap 0.40 USD | rate limits and wall time were not measured; ten times the mean cost catches a loop and never a normal run |
| 34 | The kernel's M2 gate is 1420 code lines, below the hard 1500, counted from the 1380 of M1-38 | M2 adds about 38 lines; 150 are booked for M3 and no longer fit under 1500 (1.4), which M3 planning must solve outside the kernel |
| 35 | The key broker reads `SWT_ANTHROPIC_API_KEY` and `SWT_OPENROUTER_API_KEY` first and falls back to `ARENA_ANTHROPIC_API_KEY` and `OPENROUTER_API_KEY` (decision A13) | the environment provides the fallback names today; no key is ever asked for in chat, so the gate must run with the name that is set |
| 36 | Live spending of the M2 gate is approved inside the caps of 8.4 and 8.5, hard stop 4.00 USD, Haiku through Anthropic (decision A14); a per-run cap enforced by code is a precondition of every live call | the owner's approval is tied to caps that code holds, not to a promise |
| 37 | The runs of M2 go to the orphan branch `data/runs` of this repository (decision A15) | the owner's standing limit is one repository. A folder on `develop` would make the tree dirty during a confirmatory series, put model text under the gates, and could leave `develop` only by a rewrite of history (8.5) |
| 38 | Every cap is a refusal by code: the run (`RunLimit` and the driver's check), the experiment (with reservations for runs in flight), a broken series (`SWT-E007`), the milestone (the ledger) | "the gate issue stops when the sum reaches 4.00" was a sum an agent keeps; A14 asks for code |
| 39 | A model without a price in the library's table is refused for a live run (`SWT-X007`) | the meter counts what the price table says; with a price of zero no cap would ever be reached |
| 40 | Every `Models` object of the provider library gets a closed auth context; the OpenRouter adapter is built with `createProvider`, not with the library's `openrouterProvider()` | the library reads `process.env` by default and fixes its own env auth and an OAuth login in that function; the rule "a key is read in one file" would hold in our code only |
| 41 | The canary test scans the envelopes in memory as well as the files | with redaction in layers, the last layer hides a failure of the layers before it; a test that cannot fail for two of three layers proves one |
| 42 | `lab` may import `runlog` | `readRun` must verify a folder, and the verifier with the manifest and envelope checks of M1-37 is `verifyRun`; a second verifier in `lab` would drift |
| 43 | The two `record` members enter the contracts with issue 05, not with 02 | a required member without an implementation breaks the build between two merges, and the integrator runs the check after each |
| 44 | Both estimates are reported over the included runs and over all finished runs; the pass rule reads the first | `missed-decision` excludes on something a resident does; the second number shows whether an exclusion made the effect |
| 45 | The kill rule of REWRITE section 7 is applied as written, and its false-alarm rate is written beside the verdict (8.6) | the rule is the owner's; at a true quarry effect of a third of the old estimate, two series of 12 disagree in sign 13 % of the time, and the owner should see that number before a rename |

## 12. Open points

| # | Open | Who closes it | Effect if left open |
|---|---|---|---|
| 1 | The key under its new name (O7). Closed for M2 by decision A13: the run takes the fallback name. Whether the cloud runtime strips `SWT_ANTHROPIC_API_KEY` (E5) is still untested | the owner, at release | none for M2 |
| 2 | The count of issues: A12 says 76 for M0 to M2 by the three specifications. `docs/ISSUE-RECORD.md` will also hold M1-37 and M1-38 (78 rows). Its budget table still says 75 | the integrator | none for the kill line of 150 |
| 3 | The OpenRouter adapter is specified from the library's built files (`createProvider`, `OPENROUTER_MODELS`, the two chat APIs); it was read, not compiled, and no M2 run uses it | issue 07 | 07 grows by about 20 lines; no interface changes |
| 4 | The licence gate was run over the production closure measured on the old lockfile (85 packages, no copyleft). Optional and platform packages of the new lockfile were not listed | issue 00 (it stops on a hit) | a replacement of the model library, which would re-open section 3.2 |
| 5 | The data repository `swarmtales-runs` (O8) and the move of `data/runs` into it | the owner, at M6 (decision A15) | none for M2 |
| 6 | Whether the oracle runner of M1-31 already answers a pending driver for a live replay (two tic-tac-toe files need it too) | issue 13 (7.2) | none: 13 builds it if it is missing |
| 7 | The load order "game mechanic, then `strategy-brain`, then `roster`" and the two `inputs` entries are derived from the old hook numbers and M1 3.4; not run | issues 13, 14 | level 3 fails, the fix is the order in the game file |
| 8 | The kernel's line count after M1-38 (today 1448 under an interim gate of 1450) against the M2 gate of 1420 | M1-38; then issue 05 | if M1-38 ends above 1380, issue 05 must win the difference first |
| 9 | The M3 returns booked in the kernel (150 lines) do not fit under 1500 after M2 (about 1418) | M3 planning | none for M2 |
| 10 | Wall time of a live run and the provider's rate limit were not measured on the new platform; concurrency 2 is a guess on the safe side | step 1 of 8.4 | step 3 takes longer or needs concurrency 1 |
| 11 | Whether the model-written loophole section should come before M3 (decision 18) | the owner | reviewers read logs by hand at M2 |
| 12 | How the viewer shows driver records (`request`, `thinking`, `response`); at M2 they appear as unknown events | M3 | the recorded moment of the README quotes a resident's tool call or text record by `#seq`, which needs no viewer change |
| 13 | Not in M2 by this file: the mutation gate (E7), the editor budget of A9, resume from the command line (erratum O3), a judge model, the `$param` reference of a data game | M3 planning | none for the gate |
| 14 | The expected costs are those of the old platform. The new driver sends the same prompts by design, but input lines are built by the new scheduler; step 1 measures it before step 3 is paid | step 1 of 8.4 | the cost guardrail of 8.3 reports it |
| 15 | Kill criterion 3 compares two signs, not the two platforms: a correct port is "killed" with 13 % if the true quarry effect is +25 (8.6). Whether the rule should read the difference of the platforms with its interval | the owner (REWRITE section 7 is above this file) | the rule stands; the numbers are recorded beside the verdict |
| 16 | `CLAUDE.md` says section 9 of DECISIONS holds A1 to A7, names one key variable per provider and sends run data to the data repository; issue 00 changes the last two, the first is the integrator's | the integrator | a reader of `CLAUDE.md` alone misses A8 to A15 |
| 17 | The rule "never write a model identifier into the repository" (CLAUDE.md, model roles for development) against the alias table of `models/providers.ts`, which must hold the provider's model id for `haiku`. This file reads the rule as one about the models that build the platform | the integrator | issue 07 cannot be built without the id |

## 13. What was checked and how

| Claim | How |
|---|---|
| Line counts of every old file in sections 1, 4 and 7 | measured with `scripts/lib/code-lines.ts` at `v0-final` |
| The redaction defect and the old `redact.ts` | read: `detailOf` in `packages/kernel/src/lifecycle.ts`, `packages/runlog/src/sink.ts` and `folder.ts`, old `packages/kernel/src/redact.ts` |
| The refused listener | read: `addListeners` in `packages/kernel/src/loader.ts` and the old loader (line 172); the two `kit.listen` of old `strategy-brain` (lines 339 and 342) |
| Which reserved items of M1 1.4 the two games use | read: both old `index.ts` files, the old game files and tests |
| Oracle files: count, variants, callers, events, the cut file | read: `oracles/README.md` and the heads of the eleven files |
| Licences of the model libraries | the production closure of the old lockfile, licence field of each package |
| The noise-floor numbers of section 8 | read: the `NOISE-FLOOR.md` files and lesson rows P440 to P443 on branch `m0/noise-floor` |
| Key variables | presence only, by name; no value was read or printed |
| **Assumed, not run:** the load order and `inputs` entries (open 7); the OpenRouter adapter (open 3); the sizes of the `head`, `flow`, `texts` split; every planned line count; every expected cost on the new platform (open 14); the packed size of the run data (8.5); that M1 issues 29 to 36 and M1-38 deliver the interfaces of the M1 specification unchanged | |

## 14. Challenge log

Challenged on 2026-11-14 by a session that did not see the author's reasoning, against DECISIONS (with section
9), REWRITE, the M1 specification with its errata, the old code at `/home/user/swarmtales` (read and measured with
the D13 counting rule), the new platform on `rewrite/develop` after M1-28 and M1-37 (read; the kernel, sdk and
engine counted), the built files of `pi-ai` 1.4.0, the eleven oracle files (read by script) and the noise-floor
results of branch `m0/noise-floor`. Severity: **A** would have blocked the build or made a gate claim false;
**B** left a builder to guess, or an interface that does not fit what is built; **C** wording, a wrong number or a
wrong reference; **D** something specified without a user. Every row was fixed in place unless it says otherwise.

| # | Sev | What was wrong | What was changed |
|---|---|---|---|
| 1 | A | Issue 02 added `Kernel.record` and `Activation.record` to the contracts as required members, three issues before the kernel implements them. `pnpm check` would have been red after the merge of 02, and the integrator checks after every merge | 2.3, issues 02 and 05: 02 adds only optional and new types; 05 adds the two members with the implementation. Decision 43 |
| 2 | A | The canary test could not fail for two of its three layers. The run log's sink redacts every string before it is written, so with the kernel's or the driver's redaction switched off the files are still clean; the row "shown failing" claimed otherwise | 5.2: a second scan over the envelopes in memory (an extra sink before the run log's redaction), with the events named that each layer answers for. Decision 41 |
| 3 | A | The provider library reads keys from the environment by itself: `createModels()` takes `process.env` as its auth context by default, and `openrouterProvider()` takes no argument and fixes `envApiKeyAuth(["OPENROUTER_API_KEY"])` and an OAuth login inside. "Ported with the broker's auth object" was not possible as written, and the rule "a key is read in one file" held in our code only | 1.2, 3.2, 3.3, issue 08: every `Models` object gets a closed auth context, with a test; the OpenRouter adapter is built with `createProvider` like the Anthropic one. Decision 40 |
| 4 | A | The cost cap counts `usage.cost.total` of the library's price table. A model the table has no price for costs zero, and no cap would ever be reached | 3.3, 4.3: `SWT-X007` refuses such a model before a live run. Decision 39 |
| 5 | A | Caps not held by code. The hard stop of 4.00 USD was "the gate issue stops when the sum reaches it"; the experiment's cap did not count runs in flight (`concurrency: 2`); a systematic fault would have been paid 48 times; the bridge on the old code had no bound at all (24 runs at `--budget 0.40` is 9.60) | 6.3, 6.6, 8.4, 8.6: the spend ledger (`--ledger`, `SWT-C025`), reservations per run in flight, `SWT-E007` after three failed runs or a leak, a per-run budget for the bridge that bounds it by code. Decision 38 |
| 6 | A | The oracle runner was said to need one addition (cut files). Seven of the eleven files replay a live run, and in those a resident is woken without news when its last turn made a call (29 of 185 turns in `quarry-s41.json`); the exporter's replay agent kept that state. Without it level 3 fails on the first such turn | 7.2: the pending rule, built by 13 unless M1-31 or M1-35 has it; 14 merges after 13 |
| 7 | A | The kernel has 1448 code lines under an interim gate of 1450. Issue 01 ("can start today", merge after M1-15 and M1-22) adds lines to `lifecycle.ts` and would have broken the budget test; issue 05 named a file `limits.ts` that does not exist and not `ports.ts` and `errors.ts`, which it must change | 01 and 05 merge after M1-38; the paths of 05 are the real files; the M2 gate of 1420 counts from the 1380 of M1-38 (1.4) |
| 8 | B | M1-38 makes the loader skip a listener of an unloaded plugin; the specification still had the change in issue 05 with `loader.ts` in its paths, and "soft listeners" in the kernel's line plan | the first page, 1.4, 2.3, issue 05 (a test only), 10.2 (rows for M1-37 and M1-38), 10.3, decision 5 |
| 9 | B | `lab` may not import `runlog` (1.2), and `readRun` must refuse a run "that fails `verifyRun`", which is in `runlog` | 1.2, 6.1: `lab` may import `runlog`. Decision 42 |
| 10 | B | Paths that did not cover the work: 06 did not own `sdk/src/game/{types,resolve}.ts`, `sdk/src/errors.ts`, `mechanic/{types,define-head}.ts`; 01 did not own `runlog/src/folder.ts`, where the `redact` option lives; `comparable` is `lab` code and was given to 06 (sdk and engine); 21 and 22 both changed `report.ts` in one wave; 14 needed the runner change of 13 in the same wave | the issue table; `comparable` moved to 18; waves 4 to 9 re-cut (13 before 14, 21 before 22) |
| 11 | B | Issues planned at the limit with thin tests: 09 at 400 (270 source lines), 18 at 400, with an escape clause for after the fact | `notice.ts` moved to 10, the tolerance functions to 17 as pure functions of value lists, `comparable` into 18; largest issue 390 |
| 12 | B | The guardrails of 8.3 could not be written in the spec format: no arm on a guardrail (1.32 without and 1.75 with the brain), no place for the refusal-code rule, no smallest n for a verdict, and `analyse` had no result and no exit code for "no verdict" | 6.3: `arm` on a guardrail, `allowedRefusals`, `pass.minN`, `verdict` with three values; 6.6: exit 7 |
| 13 | B | Proving tests that could not be run as written: "a failed request is retried six times" with the scripted source (the retries are the library's, and the scripted provider does not retry); "each metric equals the number in the oracle's `end`" (`end` holds a reason and a tick); "one family hash" (not defined) | issues 06, 09, 15 |
| 14 | B | "Metrics change a mechanic's head, and the head's hash is in the game hash" is false: `resolve.ts` hashes the filled game data. The same table asked that the family's default params give the hash of issues 13 and 14, which the first claim would have made impossible | 2.4, 10.3 |
| 15 | B | Behaviour of the old runner that the port table did not name: the inputs of a step that the provider's safeguards refused leave the context (P44); the fixed fields of the agent (`sessionId`, `identity`, `onPayload`); erratum O18 of M1 ("a driver that calls after close: M2, with the model driver") had no answer | 4.2 (two rows), 2.3, issue 09 |
| 16 | B | Secrets, smaller holes: the manifest, `game.json` and `texts.json` are written once and were not redacted (a `--set` value reaches `game.params`); nothing forbade printing an error object, which can carry a request with its headers; `readEnv` could hand the whole environment on; a committed test value shaped like a key; `leaks` did not look for encoded forms although the canary scan does | 2.2 (`SWT-L006`, the rule on error objects), 1.2 (`env.ts` by name), 3.1, 5.2 (f), 5.3 |
| 17 | B | Statistics. The table gave the chance to keep the sign only for the old estimate and for half of it. The noise floor found -10 (SE 38) at seed 31, so a smaller true effect is likely; a correct port then loses the sign of quarry about one time in seven, and the bridge blames the port in 13 % of the cases. Exclusion by `missed-decision` conditions on what residents do. The econ-lab tolerance check cannot fail except for five against none | 8.1 (a row with the noise-floor reading), 8.2 (a row for a third of the effect, "above 99 %" in place of "above 99.9 %"), 6.3 and 8.2 (the estimate over all finished runs), 8.4 (what each tolerance can show), 8.6 (the difference of the platforms and the false-alarm rates beside the verdict). The kill rule itself is REWRITE's and stands: open point 15 |
| 18 | D | The `params` field and the `$param` reference of a data game, with `SWT-G040` and `G042`: no user in quarry or econ-lab (both are TypeScript games; one arm changes grants and a briefing) | cut from 2.1, 2.4, 2.6 and issue 06; the game family and `--set` stay. Decision 7 |
| 19 | C | Wrong references and numbers: `RESIDENT_LIMITS` is in old `apps/cli/src/host/residents.ts`, not in `host-runner.ts`; "eleven tools" are eight names; "four briefings" are eight; open point 6 gave quarry-open "more than 70" turns without input (18) and econ-lab "up to 1060" (472; the 1060 are quarry's silent file); the redaction row of the command line named issue 19; `docs/FINDINGS.md` does not exist yet (it is the renamed `CROSS-GAME-FINDINGS.md`); the game id no longer carries the variant and the text did not say so; the kernel measurement was from before M1-25 | 2.4, 4.2, 7.1, 7.2, 8.1, 12, issue 24, 1.4 |
| 20 | C | Three owner actions (O1, O7, O8) were listed as things the gate waits for | 8.6: A14, A13 and A15 answer them for M2 |
| 21 | none | Checked and found right: every code-line count of an old file (measured again: 169, 60, 16, 119, 36, 252, 432, 245, 496, 157, 55, 63, 205, 141, 152, 141, 548, 8, and 423 for the noise-floor script); the old loader's `continue` at line 172; the old redaction at `host.ts:719`; the cap text and limit id at `referee.ts:119`; five and seventeen prompt files; that the two mechanics use `runStarted`, `tickEnded`, inputs, `news`, `rule`, `schedule.at`, one service, one limit, one fact and nothing M1 reserved; that no tool of the two games is in the old catalogue order; the alias `haiku`; `ApiKeyAuth` of the library (no cast needed); the refusal counts, tick and turn counts of the oracle files; the metric definitions against the noise-floor script; every cost and tolerance number of section 8 against the two `NOISE-FLOOR.md` files; codes `R017`, `G041`, `X0nn`, `E0nn`, `C021` to `C025`, `L006` are free; twelve library packages with `models` and `lab` | nothing |

Decisions of the integrator written in by this challenge: A12 (25 issues), A13 (key names), A14 (live spending),
A15 (the data branch); they are rows of DECISIONS section 9.

Not changed, and why: the pass rule and the seeds of 8.1 and 8.2 (they are D11's and were fixed before any data);
the kill rule (REWRITE section 7); the split of the two `index.ts` files (decision A8 and the file limit ask for
it, the oracle proves it); the choice of two adapters; the absence of a model-written report part at M2.
