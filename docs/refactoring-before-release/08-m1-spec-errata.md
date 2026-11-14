# 08 M1 specification: errata

Corrections and additions to [`08-m1-spec.md`](08-m1-spec.md), found by the challenger of wave 1 (issues M1-01 to
M1-04) on 2026-11-14. The specification itself is not edited while issues are built against it; where this file
and the specification differ, this file holds. Each row says which side was right and what the code does now.

Severity as in the challenge log of the specification: **A** a later issue or a security property would fail,
**B** an interface that does not fit or leaves a guess, **C** a statement that was not exact.

## Section 2: contracts

| # | Sev | Section | The specification says | What holds | Why |
|---|---|---|---|---|---|
| E1 | C | 2.7 | `ActorDriver = (activation) => Promise<DriverResult \| undefined \| void>` | `(activation) => Promise<DriverResult \| undefined> \| Promise<void>` | The code is right. `void` inside a union is refused by the lint rule against invalid `void` types. Every driver the first form accepts is accepted (an `async` function without a `return`, one that returns a result, one that returns `undefined`), and `(await driver(a))?.pending` type-checks. Returning nothing means "not pending" |
| E2 | B | 2.1 | `actorId(kind, name): ActorId`, nothing about checks | `actorId` joins and checks nothing. Untrusted text is checked with `ActorIdSchema` (issue 05); the sdk checks a game's resident ids with `ResidentIdSchema`, whose pattern is the name part of `ActorIdSchema` | The code is right: contracts hold no logic, and a throwing `actorId` would need an error code of a catalogue that contracts do not have |
| E3 | B | 2.2 | "`tool` is set on `tool_called`, `tool_refused`, `tool_result`" | `tool` is absent on these three when the name the caller used stands for no tool of the caller's grant (`TOOL_UNKNOWN`, `TOOL_NOT_GRANTED`): one shown name may stand for tools of several grants (3.1 `byShownName`), so there is no single canonical name to write | The specification was not exact. `EnvelopeSchema` keeps `tool` optional |
| E4 | B | 2.6 | `Listener.source` is "the plugin id that declares the event" | At M1 a listener names a plugin id only. The events of the kernel and of the scheduler cannot be listened to (`kit.on` is reserved, 1.4); the loader refuses a listener whose `source` is no loaded plugin as `SWT-R002` | The specification left it open |
| E5 | B | 2.7, 2.8 | `SchedulerDefinition<O>.create(options: O)`, `KernelDefinition.scheduler.options: JsonValue` | The options in the kernel definition are already parsed with `SchedulerDefinition.options` and have their defaults (the sdk does it, 6.5 step 9); the kernel passes them to `create` unchanged. `create` must stay a method signature: a typed definition is assignable to `SchedulerDefinition` (`O = unknown`) only through method bivariance, and the type test of issue 01 holds this | The specification did not say who fills the defaults |
| E6 | C | 2.7 | `RunEnd.tick`, no meaning given | The clock when the run ended, after the last tick's advance (3.5 step 6): `maxTicks` for the reason `ticks`. An idle tick with a breach held does not advance, so there it is the tick that did not play | Old `RunEnd.minute` behaves so |
| E7 | C | 2.7 | `OpenActivation.quietEnd` is a readonly property | It is live (a getter over the kernel's state). The gated copy that `turns` hands the driver (4.3) must not be used to read it: a spread copy holds the value of the moment of the copy. `turns` reads it on the object `port.open` returned, after the driver has settled | A trap found while writing a scheduler by hand (`packages/contracts/test/usability.test.ts`) |
| E8 | B | 2.9, 2.10 | `seed: Type.Integer({ minimum: 0 })` in the game and in the manifest | Both have `maximum: 4294967295` | The specification was wrong. The generator takes `seed >>> 0` (3.6), so the seeds `n` and `n + 2^32` play the same world, and a manifest would name two different seeds for it. A number above 2^53 is also not exact in JSON |
| E9 | C | 2.9 | `briefing: Type.Record(ResidentId, Type.String())` | The record is closed: a key that is no resident id is refused | The code is right (closed objects at every level) |
| E10 | C | 2.10 | `scheduler.revision: Type.Integer()`, `limits.maxTicks: Type.Integer()`, `limits.maxCallsPerTick`, `limits.budgetUsd`, `log.version` without bounds | `revision`, `maxTicks`, `maxCallsPerTick` and `log.version` have `minimum: 1`, `budgetUsd` has `minimum: 0` | The code is right; none of these can be zero or negative |
| E11 | C | 2.11 | `formatIssue` prints five lines | Four lines when the issue has no `where`, or a `where` without a field: there is no empty `at` line. The place is `file[:line], path, package <name>`, joined by `, ` | The code is right |
| E12 | C | 2.11 | `closest`: "edit distance of at most 2" | At most 2 **and** smaller than the longer of the two names; the first known name wins a tie; the comparison keeps case apart; a known name is its own match | The specification was not enough: `closest("x", ["id"])` answered `id`, and an empty name matched every name of two letters |
| E13 | C | 2.11 | `SwtError(issues)` | An empty list is a mistake of the caller. The error then has the message `error: no issue was given` and the code `""`. It does not throw from its constructor | Accepted as built: an error thrown while an error is built hides the first one |
| E14 | B | 2.11 | "the catalogue lives in `packages/sdk/src/errors.ts` for G, M and P"; one P code, `SWT-P003` | `SWT-P003` stays in the sdk. The prompts package has its own catalogue in `packages/prompts/src/errors.ts` and builds the codes itself with `new SwtError(...)`, as `engine/turns` does with its three R codes: it may import contracts and not the sdk. See the table below | The carried loader threw a `PromptError` that was no `SwtError`, against "an error for a developer is an `SwtError`" |

### The P codes of the prompt loader (E14)

`PromptError` is a subclass of `SwtError`, so `instanceof PromptError` and the carried message tests keep working;
the `summary` is the old message.

| Code | Raised when | By |
|---|---|---|
| `SWT-P003` | a declared prompt has no text (found at resolution, not in a run) | the sdk, `texts.ts` (issue 27). It catches `SWT-P010` of the lookup and reports `P003` with the game's data path; it passes `P011` to `P014` through unchanged, since they name a file |
| `SWT-P010` | no folder has a file for the prompt | `createPromptLookup().render` |
| `SWT-P011` | the frontmatter of a prompt file is missing or malformed | `parsePromptFile` |
| `SWT-P012` | a file states another id than the one it was found under | `createPromptLookup().render` |
| `SWT-P013` | a file and the owner of the prompt declare different variables | `createPromptLookup().render` |
| `SWT-P014` | a prompt is rendered with a missing, an unknown or an undeclared variable | `renderBody` |
| `SWT-P015` | no directory above the package holds `library/prompts/` | `libraryRoot` |

How the sdk finds a missing text at resolution with `PromptLookup.render` alone (the interface has no `has`): it
renders each declared prompt once with a placeholder value for every declared variable. No interface change is
needed for it.

## Section 5: chain

| # | Sev | The specification says | What holds | Why |
|---|---|---|---|---|
| E15 | A | A version 2 log whose last line is not `run_ended` "holds"; `verifyRun` of the run log says "unfinished" | `ChainHolds` has `finished: boolean`: true when the last covered line ends a run. `verifyChainText` and `verifyRunTexts` answer `ok: true, finished: false` for a log that was cut back to a signed head (a snapshot's checkpoint, from M3) and for a head over no line | Without the field a truncated log and a whole run gave the same verdict, and every caller of the chain package (the viewer verifies in the browser, without the run log) had to find the last line itself. The run log reports "unfinished" from this field |
| E16 | A | "Each line of `events.jsonl` is ... written as canonical JSON" (a rule for the writer only) | The verifier enforces it for a version 2 genesis: a line whose text is not its own canonical JSON is broken (`kind: "chain"`, "not canonical JSON"). Version 1 lines are compared by value, as before | The hash is taken over the canonical form of the **parsed** line, so a text that parses to the same value passed as the signed line: `9007199254740993` for `9007199254740992`, another key order, an escape, a trailing carriage return. A reader with another JSON parser (exact integers) would then read a different event from a log that "holds". With the rule the signature covers the bytes of the file. `chain-writer.ts` (issue 22) must write `canonicalJson(line)`; the test signer shows it |
| E17 | B | `ChainBroken { ok, line?, reason }` | `ChainBroken` has `kind: ChainFault`, one of `chain`, `signature`, `unsigned`, `manifest`, `continuity` | The run log maps a verdict to `SWT-L001` to `L003` (2.11) and had only a sentence to read. Mapping: `chain` is `L001`; `signature` and `unsigned` are `L002` (`unsigned`: lines no signed head covers, which is what a run that crashed leaves; the run log may word it as "the run did not end"); `manifest` is `L003`; `continuity` has no code at M1 (resume from the command line is M3) |
| E18 | B | `log: Type.Object({ format, version })` in `ChainGenesisV2Schema` | The object is closed and `version` has `minimum: 1` | Closed objects at every level of a signed document |
| E19 | C | `canonicalJson` takes "a parsed JSON value" | It refuses a Date, a Map, a Set and a hole of a sparse array (`CanonicalJsonError`). An object without a prototype is taken | They were written as `{}` or as nothing, so two different values shared one form and one hash. `jsonHash` of a game built in TypeScript can meet them |
| E20 | C | "`verifyChainText` keeps accepting a version 1 genesis" | Confirmed, and the other direction too: a verifier that knows only version 1 (the old package) refuses a version 2 chain at its first line ("not a genesis entry"), because its genesis schema is closed and wants `version: 1`. It never reads a version 2 log by the old rules | Checked against the old schema; `attack.test.ts` holds the case |

## Open points for later issues (no code in wave 1)

| # | Sev | Point | Goes to |
|---|---|---|---|
| O1 | B | `verifyRunTexts` compares the manifest by the hash of its **parsed** value, so `manifest.json` has the weakness of E16 for integers beyond 2^53 (the seed is now bounded, E8; `maxTicks`, revisions and `game.params` are not). Either the run log writes `manifest.json` as canonical JSON and `verifyRun` checks that, or `RunManifestSchema` bounds every integer | issue 22 (run log) |
| O2 | B | `verifyRun` must also compare what the genesis and the manifest both say: `genesis.log` with `manifest.log`, and `genesis.resumedFrom` with `manifest.resumedFrom`. The chain package cannot (it does not import contracts) | issue 22 (`runlog/src/verify.ts`) |
| O3 | B | `verifyContinuityText` looks for the old marker line `run_resumed` after the prefix. The kernel events of 2.3 have no such event, so a resumed version 2 run cannot pass it yet | M3, with resume in the command line |
| O4 | C | `GAME_FORMAT_VERSION` in `packages/contracts/src/index.ts` shows `{ version: GAME_FORMAT_VERSION }` in its example; the field of a game is `schema` | the integrator (root barrel) |
| O5 | C | The carry of `packages/prompts` leaves out `registry.ts`, `keys/` and `validate.ts` (8.2 says "`packages/prompts/src/*` carried"). Accepted: they list prompt ids of parts that are not on this platform, and resolution step 8 does the check per game. The budget row of 1.3 for prompts counts fewer lines than planned | none |

# Wave 2 review

Found by the challenger of wave 2 (issues M1-05 to M1-09, M1-20 and M1-23) on 2026-11-14. The numbering continues.
The port contract files of issue 23 were checked against the old checkout (commit 9765702): the seven sha256
values in the tests were computed again there and are the same.

## Section 2: contracts and the error catalogues

| # | Sev | Section | The specification says | What holds | Why |
|---|---|---|---|---|---|
| E21 | C | 2.3, 2.6 | `run_started.seed: Type.Number()`, and no bound for the `seed` of `KernelSnapshotSchema` | Both are `Type.Integer({ minimum: 0, maximum: 4294967295 })`. The static types stay `number` | E8 again: a snapshot or a log line that names `n + 2^32` or `1.5` names another seed for the same world |
| E22 | B | 2.11, 6.1 | "a fact checks its value", without a code; no code for a body that does not fit its head | Three codes are added to `packages/sdk/src/errors.ts`: `SWT-M023` (`factMismatch`: the value of a fact does not match its `output` schema), `SWT-M012` (`bodyMismatch`: the head declares a tool or a provided service and the body has no handlers, or the other way round), `SWT-M014` (`stateUnsaved`: the head has `state` and no `start`, or `snapshot` and no `state` schema; the code is the one paper 04 section 5 gave this case) | Decision A8 moved the tools into the head, so "head and body differ" is a new case; a bare `Error` is forbidden in a package. `M012` and `M014` are raised by `defineMechanic` when the mechanic is defined, `M023` by the kit's `fact` |
| E23 | C | 2.11 | "`engine/turns` builds `R010`, `R011` and `R014` itself" | It does, and the kernel's catalogue has `orderNoPermutation`, `noDriver` and `noToAct` too, with other words and no caller. One code has two texts | Left as built; see O6 |

## Section 4: `turns`

| # | Sev | Section | The specification says | What holds | Why |
|---|---|---|---|---|---|
| E24 | B | 4.3, E7 | "start its driver at once with a gated copy of the activation" | The copy is written field by field, never as a spread. Its `basis` is a getter over the open activation; `quietEnd` is read on the object `port.open` returned, after the driver settled and before `close`. The stub port of `turns.test.ts` has a live `quietEnd` (true only once a call landed), so a scheduler that reads a copy fails the test | E7 was a rule without a test: the stub's `quietEnd` was a fixed value |
| E25 | C | 4.3 | `repeat ... until end is defined or until.ticks ticks were played` | `until.ticks: 0` plays no tick, writes nothing and returns `undefined` (the pseudo-code would play one). A fraction plays the next whole number of ticks; a negative number or `NaN` plays none | The loop tests before the tick. A caller that wants only the start of a run can pass 0 |
| E26 | C | 4.2, 2.11 | `SWT-R014` "at the first tick" | It is thrown when `run` is called, before the first `beginTick`: no `tick_started` is written, also with `until.ticks: 0`, and every later call of `run` checks again. `port.toAct()` is asked once for it, outside a tick | A wrong option is no reason to open a tick. The kernel must answer `toAct()` before the first `beginTick` |
| E27 | C | 4.3 step 5 | "none is `SWT-R011`" | The driver is looked up when the member is reached: after the wake rule (an actor that is skipped needs no driver), before `inputsFor` and `open` (no `inputs` hook runs for it, so no inbox is emptied, and no `activation_opened` stays without its `activation_closed`). The other members of the block play. The error is thrown after the block; `turns` does not call `endTick`. The first failure of a block, in the order of the block, is thrown as it is: a driver's own error is not wrapped | The specification gave the code and not the moment |
| E28 | C | 4.1 | the payloads of `pass_started` and `activation_skipped` | Both are closed objects, and so is the scheduler's slice `{ pending }`. The reason of a wake is in `activation_opened.detail.reason`; a skip has no reason field | As the kernel's events (the notes of wave 3) |
| E29 | C | 4.2 | "a `{ source }` entry takes the lines of that plugin id" | `source` is the plugin id (`team-channel`), not the canonical name of the envelope. An entry that is listed twice gives its lines twice (the old behaviour for a kind). A joined line has the source `a+b` and is taken by no `{ source }` entry | The example of `arrange` named a package; corrected |
| E30 | C | 4.2 | "Pending is kept by `turns` per actor" | It is fixed when the activation closes. The old loop asked `lastCallNeedsNoAnswer` when it woke the actor, so a call submitted for the actor outside an activation (`Kernel.submit`) between two passes changed the answer there and does not here | No user at M1: the oracle player submits inside activations. The six recorded sequences of the old loop still hold |

## Section 6: sdk types (decision A8)

The five mechanics of tic-tac-toe teams can be written against the types of issue 07 without a cast: the type test
holds `consensus`, `grid-game` and the referee, and the challenge compiled a `team-channel` and a `strategy-brain`
skeleton (a state of maps with a snapshot, a tool under a computed name, a prompt chosen by an option, a `lock`
handler, a listener, lines of mixed kinds). Nothing that 1.4 reserves has a type; `types.test-d.ts` now holds one
refused use per reserved name (`decisions`, a tool `limit`, `turnOpened`, `afford`, `commits`, the game's `texts`).

| # | Sev | The specification or the spike says | What holds | Why |
|---|---|---|---|---|
| E31 | B | `snapshot?: { save(state: C): ...; load(data, setup): C }`, `start` with `NoInfer` | The type of a custom state is read from the **parameter of `save`** only: `save: (state: GateState) => ...`. With `save: (state) => ...` and a return type on `load` or on `start`, `C` is `never`, the state becomes the value of the schema, and the errors point at `start` | Both functions of `snapshot` wait for their parameter types, so neither return type is read in time. No cast is needed, only the annotation; the comment of `MechanicHead.snapshot` says so |
| E32 | B | "things that must not compile" | Five things compile and are refused when the mechanic is defined or loaded, not by a type: (1) a head with `state` and no `start` (`SWT-M014`); (2) a head with `snapshot` and no `state` schema (`SWT-M014`; without the check the state would never be saved, because the slice is bound from `head.state`); (3) a body whose `tools` or `services` get a stray entry through a spread, for example the unit of another head (`SWT-M012`; an object literal is refused by the type); (4) `ctx.access.lock(resident, "typo")` and `ctx.schedule.at(tick, "noJob")`, which take any string (the kernel refuses an unknown job with a throw that becomes `SWT-R003`; what an unknown tool name of a lock does is for issue 11, access, to say); (5) an `options` schema that is no object | TypeScript has no exact types and cannot require one property because of another without losing the inference of the head. Issue 16 or 26 (`defineMechanic`) must raise (1) to (3) |
| E33 | C | "`ErasedBody`: every typed body fits it" | The body of the generic signature fits it (`const erased: ErasedBody = body` inside `defineMechanic<H, F>`), and an implementation signature `(head: AnyHead, body: ErasedBody)` is accepted under the typed overload. The body of one concrete head does not fit: a service function takes a narrower input. `SliceSpec.snapshot` and `migrations` are left out, not set to `undefined` (exact optional properties) | Checked by compiling; the type test has `erase` for it |

## Open points for later issues (no code in wave 2)

| # | Sev | Point | Goes to |
|---|---|---|---|
| O6 | B | `R010`, `R011` and `R014` exist twice (E23). Either the kernel exports its three functions and `turns` uses them (the layer table allows `engine` to import `kernel`, and the package already depends on it), or the kernel drops them and wins about 30 lines of its budget | issue 25 (assembly) or a follow-up |
| O7 | B | An unknown option key is not refused by a schema: `TurnsOptions` and the option schemas of the ported mechanics are open objects (they are carried byte for byte), so `Value.Check` accepts `{ pases: 2 }` and the game plays one pass. Game resolution must refuse unknown keys itself (`SWT-G020`, "is unknown") in steps 4 and 9 | issues 18 and 19 |
| O8 | C | `serviceMismatch` and `payloadMismatch` print two spaces after the colon when the path is empty (`...: ` + `""` + ` must be`); `factMismatch` does not | the integrator, with issue 17 |
| O9 | C | A payload whose value is `undefined` under a present key passes `Value.Check(EnvelopeSchema, ...)` in memory and fails as a line of the file, where the key is gone. The notes of wave 3 say "write `null`"; nothing enforces it | issue 10 (log) or 22 (run log) |

# Wave 3 review, kernel

Found by the challenger of the kernel parts of wave 3 (issues M1-10 to M1-15) on 2026-11-14. The numbering
continues. The parts were read against the old kernel (commit 9765702) and wired together by hand, without
`createKernel`, in `packages/kernel/test/parts-together.test.ts`: two plugins, a scheduler written in the test,
three ticks, a resume. The event order, the frames, `causedBy` and the answers of that test were written down from
the old kernel's rules before the test was run, and the parts gave them.

## Section 2 and 3: what holds

| # | Sev | Section | The specification says | What holds | Why |
|---|---|---|---|---|---|
| E34 | A | 2.7, 3.3, 3.5 | A throw ends the run; nothing about the scheduler's port | Whatever throws inside the port (`hasNews`, `toAct`, `inputsFor`, `emit`, `open`, `close` of an activation: plugin code as `SWT-R003`, a sink as `SWT-R020`) ends the run through `Lifecycle.fail` before it is thrown on to the scheduler. `close` on a run that failed throws `SWT-R001`; a scheduler must report the first failure of a block, not what `close` threw (`turns` does) | The port threw to the scheduler and left the run open. In a block the members that were already playing went on writing events while the error was on its way out |
| E35 | B | 3.5 | "Finish: append `run_ended { reason }`, then the sinks' `close`" | When a sink throws at that `run_ended`, the log keeps it as its last event: the failure path adds no `run_ended { reason: "error" }` behind it. The step throws `SWT-R020`, and the sinks are closed with the end `error` | Two `run_ended` events, the second after the first |
| E36 | B | 3.1 `Log.fail` | "listeners off, the queue goes to the sinks, `last` writes the closing event, then closed" | `last` runs also when a sink throws while the queue goes to the sinks; the throw (`SWT-R020`) leaves `fail` after the closing event is in the log | A run whose sink broke in the last flush ended without `run_ended` |
| E37 | B | 2.2, 3.2 | 2.2: `tool` is on "every event a plugin emits while that call runs (the frame carries it)". 3.2: a listener runs in `{ actor: event.actor, causedBy: event.seq }`, a command's provider in `{ actor, causedBy }` | Both frames keep the tool: a listener's frame has the `tool` of the event it reacts to, and the provider's frame the `tool` of the caller's frame. `service_called` had it already | The two frames of 3.2 dropped the field, so the reaction of another plugin to a call's event (the referee's judgement of a move) and what a provider wrote had no `tool`, and a report could not group the consequences of a call by one field, which is the reason 2.2 gives. Nothing of the old log changes: the field is new. One commit, easy to take back if the owner reads 3.2 as the rule |
| E38 | C | 2.2, 2.8 | `Submission.basis` "defaults to the log length" | The log length when `submit` is called, not when the call reaches the head of the lane | A call queued behind others claimed to have seen their events |
| E39 | C | 2.6 | `AccessPort.lock` and `unlock`, nothing about the ids (E32, point 4, left it to issue 11) | Both throw a `RangeError` (`SWT-R003` once it leaves the plugin's code) for a tool the definition neither names nor grants, and now also for an id that is no actor of the run, as `suspend` does | A lock for an unknown id was written into the snapshot, and `restore` then refused that snapshot |
| E40 | C | 2.7 | `open(actor, inputs, detail)` with `InputNote[]` | `activation_opened.inputs` holds `source`, `kind` and `text` only. An `OrderedNote` is an `InputNote` for the compiler, so a scheduler that hands the lines of `inputsFor` straight to `open` passed the sort key into a closed payload | Found by the scheduler of the integration test |
| E41 | C | 3.2 | "Listener delivery (one mode)" | Listeners are added to the log after every plugin is created (the old loader added them plugin by plugin). An event a plugin emits inside `create` is written before `run_started`, at tick 0, in the frame of the kernel, and reaches no listener; it reaches a sink only when the assembly adds the sinks before it loads | None of the five mechanics emits in its setup; said so that issue 25 adds the sinks first |
| E42 | C | 2.6, 3.3 | "A snapshot ... holds no step counter and no open activation" | It also holds nothing of dispatch: `quietEnd` and `answerSeq` are empty after a resume (the scheduler keeps `pending` itself, E30), and the job ids start again above the highest id that is still queued, so the snapshot of a resumed run can differ from the one of the straight run in `jobs[].id` and in nothing else. The log of a resumed run is the log of the straight run (tested) | As the old scheduler |

## Open points for issue 25 (assembly) and later

| # | Sev | Point | Goes to |
|---|---|---|---|
| O10 | A | After a normal end the parts take everything: `Dispatch.submit` writes `tool_called` and `tool_result` behind `run_ended` and hands them to sinks that are closed, `Lifecycle.start` writes a second `run_started`, `beginTick` a `tick_started`. The old host was the same for a call. The assembly must refuse `submit`, `start`, a tick and the calls of an activation whose driver is still running once `ended` is set. There is no R code for "used after it ended" (`SWT-R001` says "failed"); it needs one, or the decision that such a call is answered with a refusal | issue 25 |
| O11 | B | `Submission.causedBy` and `basis` are written as given. A `causedBy` or `basis` beyond the log gives a log that `envelopeLogIssues` refuses (`SWT-L005`). `Kernel.submit` must check them (an integer from 1, or 0 for `basis`, up to the log length) before the call enters the lane; a throw inside the lane would end the run | issue 25 |
| O12 | B | Dispatch knows only its own failure. After a failure of the lifecycle (a hook, a job, a limit, the port) a call is refused with `SWT-R001` without a cause, also the call of an activation, which does not go through `Kernel.submit`. The assembly must give `createSchedulerPort` a `dispatch` whose `submit` refuses with the first failure as the cause | issue 25 |
| O13 | B | A rejection of `SchedulerInstance.run` that no part has seen (`SWT-R010`, `R011`, `R014` of `turns`, a driver's own error after its block) must be given to `Lifecycle.fail`, which writes `run_ended { reason: "error" }`; `fail` acts once, so a second call does no harm | issue 25 |
| O14 | B | `audienceOf` and `Kernel.fact` must look names up with `Object.hasOwn`: a plugin may declare an event `constructor` or `toString`, and `audiences[type]` then gives a function of `Object.prototype`, which the log spreads into the envelope. The parts themselves were checked for this (tools, jobs, service methods, grants, replies, events, slices) | issue 25 |
| O15 | B | The kernel has 1280 code lines without `kernel.ts` (1256 before this review; the fixes of E34 to E40 cost 24), and the gate of M1 is 1380. Where lines are: `parts.ts` 140 (planned 10), of which `PartFactories` 16 and the six part bundles 46; `errors.ts` 95 (planned 30), of which `orderNoPermutation`, `noDriver` and `noToAct` 27 have no caller (O6); `lifecycle.ts` 154 (planned 120); `log.ts` 134 (planned 120). With a `kernel.ts` of 150 to 200 lines the kernel is 50 to 100 over the gate. See the report of the review for what can go | issue 25, the integrator |
| O16 | C | `Log.fail` called from inside a listener gives the sinks the event of that listener after the closing event (`log.test.ts` holds it). No part calls `fail` there: dispatch, the lifecycle and the port call it at the top | none unless a caller appears |
| O17 | C | `restoreKernel` checks game, hash, seed, log length, slices and jobs. It does not check that `snapshot.tick` is at least the tick of the last event, that the plugins that hold a suspension are loaded, or that a locked tool exists. A snapshot is trusted beyond its hash | M3, with resume in the command line |
| O18 | C | A driver that keeps `Activation.call` after `close` can still call: the call is written, caused by an activation that is closed. The old loop was the same | M2, with the model driver |
| O19 | C | O9 is still open: `PluginPort.emit(type, undefined)` writes an envelope without a payload key in the file. The kernel's own payloads write `null` | issue 22 or 26 |

## M1-37: catalogue codes and checks that wave 3 left as stand-ins

The issue has no row in 10.3; it collects what the reports of wave 3 named. Two codes are new (`SWT-M024` in the
catalogue, `SWT-M025`), one that issue 26 built by hand enters the catalogue (`SWT-M013`), and every change of an
exported signature is additive.

| # | Sev | Before | What holds | Why |
|---|---|---|---|---|
| E43 | B | `kit.ts` built `SWT-M023` and an invented `SWT-M024` by hand | `SWT-M024` is in the sdk's catalogue as `sliceMismatch` (`problem`: `saved`, `loaded`, `newer`, `no-migration`, also in `details`); the kit uses it and `factMismatch`. `factMismatch.fact` is optional: `MechanicKit.fact(spec)` is not told the name of the fact, so the issue of the kit names the mechanic only | A code is in a catalogue or it does not exist. Passing the name needs a change of `MechanicKit.fact` (open, see below) |
| E44 | B | "a fact calls queries only" was held by the type of `FactView` | `SWT-M025` (`commandInView`): `viewFor(...).call` and `tryCall` refuse a declared method whose `kind` is not `query` before the port is asked, so the command is not called and writes no `service_called`. `tryCall` refuses it also when nobody provides the service. A method the service does not declare is not judged here | A cast or plain JavaScript gets past the type, and a fact is computed any number of times |
| E45 | C | `serviceMismatch` required `provider`; `context.ts` passed the text "the provider of <service>" | `provider` is optional. Without it the summary reads `(caller "<id>")` and the fix names `the implementation of "<service>"` | The port does not say who provides a service |
| E46 | C | O8: two spaces after the colon for a mismatch without a path | `payloadMismatch`, `serviceMismatch`, `factMismatch` and `sliceMismatch` print the message alone when the path is empty. O8 is closed | One helper in `errors.ts` |
| E47 | B | `toolNames` ignored a key of `as` that names no tool of its mechanic | One `SWT-G012` per such key (`toolNotDefined` with `place: "renamed"`, at `mechanics[i].as.<key>`, `defined` holds the tools of that mechanic). The tools of the mechanic are named as before | A rename with a typing error changed nothing and said nothing |
| E48 | C | `envelopeLogIssues` gave `{ line, reason }`, and `verify.ts` compared the reason text | Each entry has `kind`: `envelope`, `seq`, `tick`, `causedBy` or `basis`. `reason` is for a reader only | A changed wording would have turned every L004 into an L005 |
| E49 | B | `verifyRun` checked three fields of the manifest by hand and `at` as any string; `openRunFolder` wrote what it was given | `@swarmtales/runlog` depends on `typebox` (the workspace's version; the lockfile gains the edge and no package). `openRunFolder` checks the manifest against `RunManifestSchema` before it creates the folder and throws `SwtError` `SWT-L003`; `verifyRun` reports a file that does not match the schema as `SWT-L003` with the first mismatch; `SWT-L004` is every line that does not match `StoredEnvelopeSchema` (so also a stamp that is no time, and an unknown field) | The schemas exist; a hand check drifts from them |
| E50 | C | E32, item 5: `define-mechanic.ts` builds `SWT-M013` by hand | `SWT-M013` is in the catalogue as `optionsNoObject({ mechanic, package? })`, with the texts of the stand-in. `define-mechanic.ts` still holds its local function: the swap is for the integrator | The file is not on the branch of this issue |

Open after this issue: `MechanicKit.fact` takes no name (the `SWT-M023` of the kit cannot name the fact); the row
of `runlog` in `docs/LAYERS.md` does not mention `typebox` (the layer check judges workspace packages and Node
modules only).

## M1-38: the kernel's budget of 1380 lines and the open points of the kernel review

The issue has no row in 10.3; it closes O10 to O15 and takes back E4. The kernel has 1341 code lines (1448
before), the gate of `packages/kernel/test/budget.test.ts` is 1380 again. `createKernel` and the types of
`packages/contracts` are unchanged.

| # | Sev | Before | What holds | Why |
|---|---|---|---|---|
| E51 | C | 3.1: `parts.ts` holds an interface per part, a bundle per factory and `PartFactories`, and every factory checks itself with `satisfies` | A part is what its factory returns: `Log`, `Actors`, `Access`, `Steps`, `Services`, `Clock`, `Loaded` and `Dispatch` are `ReturnType<typeof create...>`, documented at the factory, which is a plain function with typed parameters. `Lifecycle` stays an interface (a class implements it and the assembly wraps it), as `Frame`, `LoadedTool` and `Placed`. What a factory gets is a `Pick` of the one bag `Parts`; the names `LoaderParts`, `DispatchParts` and so on stay as those picks. `PartFactories` is gone | O15: 140 lines of types became 61. A test still fakes a neighbour against the same names |
| E52 | C | 2.11: the kernel's catalogue has ten R codes | The kernel's `errors.ts` has the seven it raises. `SWT-R010`, `SWT-R011` and `SWT-R014` are built where they are raised (`packages/engine`: `turns.ts`, `manifest.ts`); nothing in contracts lists the codes by function, and no test outside the kernel used the three functions | O6, O15. The codes stay reserved: a code is never reused |
| E53 | C | `createSchedulerPort` raises `SWT-R013` for two `toAct` hooks | Only the loader raises it; the port reads the first plugin with the hook | The same check twice. A port is built after loading in the kernel; a test that builds a port from a fake `Loaded` gets no check |
| E54 | B | O11 | `Kernel.submit` refuses, with a `RangeError` and before the lane, a `causedBy` that is no integer from 1 to the log length and a `basis` that is no integer from 0 to it. The run goes on. The calls of an activation are not checked: the kernel sets their two fields itself | A call from outside could write a log that `envelopeLogIssues` refuses |
| E55 | B | O12 | Every call goes through one gate of the assembly, also the call of an activation: after a failure it rejects with `SWT-R001` and the first failure as the cause. A call that was waiting in the lane when another part failed rejects the same way: `DispatchParts.fail` answers the first failure of the run, and dispatch wraps what it caught when that is another error. `Dispatch.broken` is gone (nothing read it) | The cause was missing for the call of an activation |
| E56 | B | O13 | Held by the assembly (`run` gives every rejection of `SchedulerInstance.run` to `Lifecycle.fail`), now with a test of a scheduler that rejects by itself | No test |
| E57 | B | O14 | Held: `audienceOf` uses `Object.hasOwn`, and `Kernel.fact` looks keys up in a `Map` built from own entries. Tested with an event `toString` and a fact key `constructor` | No test |
| E58 | A | O10 | After a normal end `start`, `submit`, `beginTick`, `endTick` and the call of an activation that is still held are refused with a `RangeError`, and nothing is written. Such a refusal is no failure: `Kernel.ended` keeps the end, `run` answers it again, `snapshot` works, and a scheduler that ticks on gets the `RangeError` out of `Kernel.run`. `snapshot` inside a `run` is a `RangeError`. There is still no R code for "used after the end" | Before, the refusal that a ticking scheduler got was recorded as the first failure of a run that had ended well, and the call of a held activation was written behind `run_ended` |
| E59 | B | E4: "the loader refuses a listener whose `source` is no loaded plugin as `SWT-R002`" | A listener whose source plugin is not loaded is left out, silently, and the plugin loads (decision 10 of section 11: "same softness as `listen`; a mechanic stays loadable alone"; `strategy-brain` listens to `grid-game`). `SWT-R002` stays for a listener whose loaded source does not declare the event or declares it with another schema object. E4 holds otherwise: a listener names a plugin id, so the events of the kernel and of the scheduler reach no listener (such a listener is now left out, not refused) | E4 contradicted decision 10 and the old loader |
| E60 | C | A check added and taken back inside this issue: `Kernel.submit` refused an actor that is not in the definition with a `RangeError` | 3.3 holds as written (row 1: "a reserved id is never counted"; row 2: "The actor is not in the definition, or its grant does not hold a tool of that name: `TOOL_NOT_GRANTED`"). A call of a reserved id (`script`, `human`) or of an unknown id is a normal call: `tool_called`, then `tool_refused` at the stage `lock`, both with that actor. `kernel-review.test.ts` pins it for an unknown id and for `script` | The oracle files of the old platform may hold such calls; E39 is about `suspend`, `lock` and `unlock` only |
| E61 | C | 7: the runner compares "per mechanic id the effective options, deep" | An oracle file holds the options of a mechanic as the old game wrote them, before the defaults of the schema (old `scripts/oracles/record.ts`). The runner compares only the fields the file states; an option the file leaves out is not compared. A default that changed shows in the timeline | All nine files of `oracles/tictactoe/` leave four options of `team-channel` and `strategy-brain` to their defaults |
| E62 | C | 7: the runner's driver is never pending; 8.2 and row 35 name seven files | For a file with `source.kind` `live-replay` the driver is pending after every activation in which it made a call, as the old replay agent was (`awaitsAnswer`), so `turns` wakes the resident again without news. A scripted file stays never pending. The folder has nine files (two more of the default variant with the seed 13); all nine match at level 3 | `tictactoe-teams-5x5-nobrain-solo-s1.json` timeline[18], `-s3` timeline[23]: a `turn` with empty `inputs` |

E37 stays as the review set it: the frame of a listener and of a provider keeps `tool`.

Open after this issue:

| # | Sev | Point | Goes to |
|---|---|---|---|
| O20 | C | After a normal end the scheduler's port still writes for a scheduler that goes on without a tick: `open`, `close` of an activation, `emit`, and the plugin code behind `hasNews`, `toAct` and `inputsFor` run. `turns` does none of it. Closing it costs a check in each of the six entries of the port | with the R code for "used after the end" (follow-up list) |
| O21 | C | A typing error in `Listener.source` is now silent in the kernel. The sdk knows the mechanics of a game and their heads, so `resolveGame` can warn about a source that is no mechanic of any installed package | sdk, M2 |
