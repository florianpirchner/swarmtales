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
