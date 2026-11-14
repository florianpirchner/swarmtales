# 07 Mechanic spike: can a one-object `defineMechanic` be sugar on head and body?

Role: the type spike of issue 14 (milestone M0), which decides [`DECISIONS.md`](DECISIONS.md) D1. Written 2026-11-14.
Everything below was measured by running code on the branch `m0/mechanic-spike`; the code stays there as evidence
under `spike/define-mechanic/`. Nothing under `packages/`, `mechanics/`, `stories/` or `test/` was changed.

## 1. Verdict

**Fail, by D1's rule.** Three of the four criteria hold. The second half of criterion 2 does not: a completion inside
a tool handler takes 2.6 to 3.9 seconds, not at most 2.

| # | Criterion of D1 | Result | Measured |
|---|---|---|---|
| 1 | The head is written with no explicit type argument and no cast | **pass** | 0 type arguments and 0 casts in both heads. Outside the head, 5 handlers of `chess` and 33 of `channels` need a return type (section 4.1) |
| 2a | `tsc --noEmit` on the two packages takes at most 1.5 times the head-and-body form | **pass** | ratio 1.08, 1.08 and 1.14 in three passes (a fourth, disturbed pass gave 0.98) |
| 2b | A completion inside a tool handler answers within 2 seconds | **fail** | warm 2.7 s (`chess`) and 3.6 s (`channels`); cold 3.5 s and 4.6 s. Today's head-and-body form also misses the limit: 2.8 s and 2.8 s warm |
| 3 | A wrong service name and a wrong event payload each give an error of at most 15 lines that names the property | **pass**, with one reading to settle | the error is 1 to 3 lines and names the property; a misspelled service key adds one "implicit any" line per handler parameter (33 lines in all for a service of 16 methods) |
| 4 | Lint runs with a 4 GB heap | **pass** | exit 0, 9 to 23 seconds, peak resident memory 0.93 to 1.16 GB |

By the rule, the consequence is fixed: **no sugar at 1.0 (option c). Head and body with one registration site; sample
5 is written in that form.** The question returns only with a new spike result.

Two things must be said next to the verdict, because the number alone would mislead:

1. **The 2 seconds are missed by every form, also by today's.** The cost is not in the one-object form. A generic
   function with one type parameter `O extends TSchema` and one callback typed with `Static<O>` already costs 2.8
   seconds of processor time per completion (a 12-line reproduction, section 4.5). The 40-line first mechanic of paper
   04 and today's `marks` both answer in 2.5 to 3.3 seconds. This is a defect of the type foundation (Typebox 1.3.27
   with TypeScript 5.9.3), it will hit `defineGame` and `defineDirector` in the same way, and it needs its own issue
   before M1 (section 7).
2. **The one-object form has two structural limits that would speak against it even if 2b held.** A handler that
   calls a helper outside the object makes the mechanic's type circular (section 4.1), and the object cannot be split
   over files, so the editor must infer the whole object to type one handler: on `channels` that adds 0.6 to 1.1
   seconds to every completion (section 4.4).

The inference itself is not the problem. It works on both mechanics, with no type argument and no cast.

## 2. What was built

All of it is in `spike/define-mechanic/`, outside the workspace packages, the root `tsconfig.json`, the lint paths
and knip, so the check of the old state is not affected.

| Part | File | What it is |
|---|---|---|
| The adapter | `src/define.ts` (530 lines) | `mechanic({...})`: the one-object form as paper 04 section 2.2 sketches it. Types only, plus a thin runtime part that splits the object into a head and a body and calls the kernel's own `defineMechanic(head, build)`. A mechanic written with it runs on today's kernel |
| `chess` in one object | `src/chess/` | a copy of `mechanics/chess`; the rule code (20 helper functions, `model.ts`) is unchanged, head and body became one object |
| `channels` in one object | `src/channels/` | a copy of `mechanics/channels`; the 15 rule files are unchanged but for their context type; `head.ts`, `index.ts`, `tools.ts`, `gamemaker.ts` and the tool of `defy.ts` became one object of 385 lines |
| The recommended form | `src/chess-declared/`, `src/channels-declared/` | head and body with one registration site, the head declaring the tools (section 6); built after the one-object form showed its limits |
| A middle form | `src/chess-head-apart/` | the one object with its declaring part written apart (`head`, `mechanicOf`, `toolsFor`) |
| Probes | `src/probes/` | the first mechanic of paper 04 (`guess-number.ts`), compile-time checks of what is inferred (`types.ts`), the floor of a completion (`floor.ts`) |
| The failure | `src/fail/circular.ts` | the minimal reproduction of section 4.1; `tsc -p spike/define-mechanic/tsconfig.fail.json` shows the four errors |
| Measurements | `measure/*.mjs` | `tsc-time`, `completion-time`, `error-text`, `lint`; each prints what the tables below hold |

What the one object takes, all inferred: `id`, `summary`, `options` (left out: none), `state` (a Typebox schema; the
snapshot is derived), `snapshot` (only for a state that is not plain JSON), `start`, `events`, `audiences`, `prompts`,
`requires`, `provides`, `uses`, `decisions`, `tools` (an object keyed by tool name, each with `description`, `params`,
`for`, `serves`, `check`, `guardText`, `run`), `services` (an object keyed by the name of each provided API),
`listeners`, `hooks`, `pipeline`, `facts`, `limits`, `jobs`, `commits`, `turns`, `presentation`, `guard`.

What of paper 04's sketch was **not** built, because it needs the new kernel and not a type experiment: inline texts
and `rules`, `sample` on tools, `ctx.reply`, `ctx.refuse`, `ctx.caller`, `ctx.endRun`, and the mechanic as a factory
(`guessNumber({ max: 3 })`). The spike keeps today's context, prompt ids and `with()`.

### Behaviour is unchanged

The existing tests were run against the copies: a Vitest configuration (`spike/define-mechanic/vitest.config.ts`)
resolves every import of `@swarmtales/mechanic-chess` and `@swarmtales/mechanic-channels`, from tests, stories and
other packages, to the spike. That the alias takes effect was checked by making the copy throw.

| Form | Tests run | Result |
|---|---|---|
| One-object `chess` and `channels` | the whole `test/` folder (311 files, 2589 tests, the golden replays included) | all pass |
| One-object, after later changes of the adapter | `test/stories/chess.test.ts`, `test/mechanics/channels/`, `test/mechanics/packages.test.ts` (13 files, 94 tests) | all pass |
| `chess` with the head apart | `test/stories/chess.test.ts` (22 tests) | all pass |
| Declared-head `chess` and `channels` | the 13 files, 94 tests above | all pass |
| Declared-head `chess` and `channels`, handlers in units | the whole `test/` folder (311 files, 2589 tests) | all pass |

## 3. Measurements

Machine: 4 cores (Intel Xeon 2.10 GHz), 15 GB, Node 26.13, TypeScript 5.9.3, Typebox 1.3.27, ESLint 9.39.5 with
typescript-eslint 8.72.1. **Other agents shared the machine all the time**: the load average was between 4 and 19 on 4
cores. Wall times are therefore noisy; every measurement was repeated, the load is given, and where it is known the
processor time of the request is given too, because it does not depend on the load.

### 3.1 `tsc --noEmit` (criterion 2a)

`node spike/define-mechanic/measure/tsc-time.mjs`. Both forms are checked with the same compiler options and the same
project references (the dependencies are read from their built declaration files); the head-and-body projects take
the sources under `mechanics/`. Median of the total time per project, summed over the two packages.

| Pass | Load average | Runs | Head and body | One object | Ratio |
|---|---|---|---|---|---|
| A | 7.3 to 6.7 | 3 | 7.06 + 5.83 = 12.89 s | 7.42 + 6.44 = 13.86 s | **1.08** |
| B | 5.5 to 7.1 | 3 | 6.67 + 5.78 = 12.45 s | 7.09 + 6.30 = 13.39 s | **1.08** |
| C | 5.2 to 9.6 | 3 | 5.32 + 5.04 = 10.36 s | 6.93 + 4.83 = 11.76 s | **1.14** |
| D (disturbed) | 11.3 to 10.4 | 5 | 12.09 + 7.49 = 19.58 s | 11.26 + 7.90 = 19.16 s | 0.98 |

The counts of `--extendedDiagnostics` do not depend on the load:

| Project | Own lines | Types | Instantiations | Memory |
|---|---|---|---|---|
| `channels`, head and body | 2267 | 176 623 | 1 506 739 | 400 to 440 MB |
| `channels`, one object | 2728 | 215 441 (+22 %) | 1 866 019 (+24 %) | 426 to 517 MB |
| `channels`, declared head, handlers in units | 2777 | 184 035 (+4 %) | 1 560 698 (+4 %) | 351 to 476 MB |
| `chess`, head and body | 911 | 166 864 | 1 404 667 | 349 to 394 MB |
| `chess`, one object | 1436 | 171 792 (+3 %) | 1 437 858 (+2 %) | 374 to 389 MB |
| `chess`, declared head | 1449 | 173 393 (+4 %) | 1 451 398 (+3 %) | 390 MB |

The own lines of the spike projects include the adapter (530 lines), which a real sdk would ship as a declaration
file. Note the base: a package of 911 lines needs 167 000 types and 5 to 6 seconds. That is the cost of the
dependencies' types, not of the mechanic.

### 3.2 Completion inside a tool handler (criterion 2b)

`node spike/define-mechanic/measure/completion-time.mjs` drives the TypeScript language service as an editor does:
the project is opened from its sources, `ctx.` (and `ctx.emit("`) is typed on a new line inside a tool handler
(`readBoard` of `channels`, `resign` of `chess`), and `getCompletionsAtPosition` is timed. Cold: a fresh service,
first request. Warm: the median of five further requests, each after one more typed character. The table holds the
median of five passes (load average 4.4 to 9.9); the completions offered were the right ones in every case (23
members of the context; 14 event names for `channels`, 7 for `chess`).

| Form | Mechanic | `ctx.` warm | `ctx.emit("` warm | `ctx.` cold | Processor time, warm |
|---|---|---|---|---|---|
| Head and body (today) | `channels` | 2.76 s | 2.70 s | 3.5 to 10.4 s (first case of the script) | 2.7 to 3.3 s |
| Head and body (today) | `chess` | 2.78 s | 2.84 s | 3.95 s | 2.9 to 3.4 s |
| **One object** | `channels` | **3.56 s** | **3.48 s** | **4.56 s** | 3.2 to 4.8 s |
| **One object** | `chess` | **2.69 s** | **2.71 s** | **3.54 s** | 2.7 to 3.2 s |
| Declared head, one body object (one pass, load 6.5 to 9.9) | `channels` | 5.14 s | 3.96 s | 7.10 s | 4.3 s |
| Declared head, handlers in units (one pass, load 6.5; a second at load 13 was disturbed) | `channels` | 3.28 s | 4.13 s | 4.83 s | 2.8 to 3.3 s |
| Declared head | `chess` | 2.91 s | 2.93 s | 3.9 s | 2.8 to 2.9 s |
| One object, 40 lines (`guess-number`) | | 2.5 to 3.3 s | 2.7 to 4.0 s | 3.0 to 3.9 s | 2.7 to 3.4 s |
| Head and body, small (`marks`) | | 2.6 to 3.3 s | 2.6 to 3.5 s | 3.3 to 5.7 s | 2.9 to 3.1 s |

With the dependencies read from declaration files (`--dts`) the numbers are the same within the noise (`channels`:
2.55 s head and body, 3.19 s one object).

Bringing the program up to date after a keystroke takes 7 to 44 ms; the rest is the type checker. The processor time
is about the wall time, so the limit is not missed because of the load.

### 3.3 Error texts (criterion 3)

`node spike/define-mechanic/measure/error-text.mjs --print`. Each mistake is one textual change, made in memory; the
project is compiled as `tsc` does.

| Form | Mechanic | Mistake | Errors | First error | Whole output | Names |
|---|---|---|---|---|---|---|
| One object | `channels` | service key `notes` written `notez` | 7 | 1 line | 7 lines | `'notez'`, and "Did you mean to write 'notes'?" |
| One object | `channels` | service key `channels` written `chanels` (16 methods, the worst case) | 33 | 1 line | 33 lines | `'chanels'`, "Did you mean to write 'channels'?" |
| One object | `chess` | service key `"brain-source"` written `"brain-sauce"` | 7 | 1 line | 7 lines | `'"brain-sauce"'` |
| One object | `chess` | service method `hold` written `hodl` | 3 | 1 line | 3 lines | `'hodl'` |
| One object | `channels` | `ctx.call` of a service not in `requires` | 1 | 3 lines | 3 lines | `"receipts"` |
| One object | `channels` | event name misspelled | 1 | 1 line | 1 line | the name, and the 14 declared names |
| One object | `channels` | event payload: a field missing | 1 | 2 lines | 2 lines | `'reason'` |
| One object | `channels` | event payload: an unknown field | 1 | 1 line | 1 line | `'mood'` |
| One object | `channels`, `chess` | event payload: a field of the wrong type | 1 | 1 line | 1 line | the two types; the position is the property, the text does not repeat its name |
| Head and body | `channels` | `kit.provide` of an API the head does not declare (16 methods) | 33 | 3 lines | 35 lines | `"exile"` |
| Head and body | both | the same payload and name mistakes | 1 each | 1 to 3 lines | 1 to 3 lines | the same as above |
| Declared head | `channels` | handlers for a tool the head does not declare | 4 | 1 line | 4 lines | the key |

The longest line is 100 to 710 characters: TypeScript prints the options schema in the type name. In every case the
error is at most 3 lines and the property is named or pointed at. Two readings must be settled by whoever applies D1:

- "An error of at most 15 lines": the error about the mistake is 1 line. The misspelled key also takes the contextual
  type from every handler under it, which gives one "Parameter implicitly has an 'any' type" line per parameter: 6
  lines for a service of 3 methods, 32 for the 16 methods of `ChannelsApi`. Read as "the whole output", this one case
  is over 15 lines. The head-and-body form does the same (35 lines).
- "Names the property": for a field of the wrong type TypeScript reports the two types at the position of the
  property and does not repeat the name. The head-and-body form does the same.

### 3.4 Lint with a 4 GB heap (criterion 4)

`node spike/define-mechanic/measure/lint.mjs`: `node --max-old-space-size=4096 node_modules/eslint/bin/eslint.js
spike/define-mechanic/src` with the repository's type-aware configuration (`eslint.config.js`, `projectService`).
Only this one path was linted; `pnpm lint` was not run.

| Run | Sources linted | Exit | Time | Peak resident memory |
|---|---|---|---|---|
| First | adapter, `chess`, `channels`, probes | 1 (three style findings, fixed) | 9.3 s | 934 MB |
| After the fixes | the same | 0 | 13.4 s | 954 MB |
| Last | all four forms (three copies of `channels`) | 0 | 23.2 s | 1082 MB |

No out-of-memory, no finding left. The one-object code needs no `eslint-disable` for a cast; the adapter has two for
the empty object types `{}` that stand for "no options" and "no events".

## 4. What was found

### 4.1 A helper outside the object makes the mechanic circular

`chess` has 20 helper functions that take the context; `channels` has them in nine files. In the one-object form the
context type can only come from the mechanic (`CtxOf<typeof chess>`, as paper 04 proposes). The mechanic's type comes
from its handlers, a handler calls a helper, the helper's parameter is typed by the mechanic. The minimal reproduction
(`src/fail/circular.ts`):

```ts
type Ctx = CtxOf<typeof counter>;
function bump(ctx: Ctx): number { ctx.state.count += 1; return ctx.state.count; }
export const counter = mechanic({
	id: "counter", summary: "Counts calls.",
	state: Type.Object({ count: Type.Integer() }), prompts: { "counter/tools/bump": [] }, start: () => ({ count: 0 }),
	tools: { bump: { description: "counter/tools/bump", params: Type.Object({}), run: (_params, ctx) => reply(String(bump(ctx))) } },
});
// TS2456: Type alias 'Ctx' circularly references itself.
// TS2502: 'ctx' is referenced directly or indirectly in its own type annotation.
// TS7022: 'counter' implicitly has type 'any' because it ... is referenced directly or indirectly in its own initializer.
// TS7023: 'run' implicitly has return type 'any' because it does not have a return type annotation ...
```

The first compile of the one-object `channels` gave 49 errors of these four kinds. Two ways out exist:

- **A return type on every handler that returns what a helper returns** (`run: (params, ctx): ToolOutcome => ...`).
  TypeScript then needs the handler's body only later. Needed: 5 in `chess`, 33 in `channels` (18 `ToolOutcome` or
  `Refusal | undefined`, 11 `ApiOutput<typeof ChannelsApi, "post">` and the like, 4 for hooks). A helper function can
  no longer be given as a hook (`news, turnOpened, turnEnded` in the original): the six had to be wrapped in a
  function. Forgetting one annotation brings the four errors back, and none of them says "add a return type here".
  This is the form that was measured as "one object" above.
- **The declaring part written apart** (`head({...})`, then `mechanic({ ...head, tools })` or `mechanicOf(head,
  body)`): the helpers take `CtxOf<typeof head>`, no annotation is needed (`src/chess-head-apart/`). That is head and
  body again.

So for a mechanic with helpers, a head written apart is not ceremony that sugar can remove: it is what breaks the
circle. Paper 04's "either way `defineHead` and `ContextOf` go" does not hold; only the names can go.

### 4.2 One object is one file

A tool written in another file needs the context type for its handler, and the mechanic's type needs the tool: the
same circle, and no annotation breaks it, because the parameter schema flows through it. `channels` keeps its tools in
`tools.ts`, `gamemaker.ts` and `defy.ts` today; in one object all 16 tools and 19 service methods are in one file of
385 lines. With a head apart the tools can be typed apart again (`toolsFor(head, {...})`, compiled and tested on
`chess`).

### 4.3 What the inference needed (all solved, each cost a failed attempt)

| Attempt | What happened | What works |
|---|---|---|
| The state type taken from the return type of `start` | `ctx.state` had only the properties `start` returns (no optional `winner`) | the state is `Static` of the state schema; `start` returns `NoInfer<StateOf<Snap, C>>` |
| "A state that is not its own slice needs `snapshot`" as an intersection with a conditional type on the object | the inference of the state stopped; `ctx.state` was `undefined` | one type parameter `C` for a custom state, inferred from `snapshot.load`; `StateOf<Snap, C> = [C] extends [never] ? Static<Snap> : C` |
| `services` as a mapped type with key remapping (`[A in Provides as A["name"]]`) | every handler parameter was implicitly `any`: TypeScript gives no contextual type through a remapping mapped type while it infers | `{ [N in Provides["name"]]: ApiImplementation<Extract<Provides, { name: N }>, Ctx> }` |
| Empty parts left out (`options`, `events`, `state`), filled inside a generic function | cannot be written without a cast: `Type.Object({})` is not the caller's `O` | one typed overload, an implementation on the erased shape (the kernel's own `bind` works the same way) |
| Tools as a plain object keyed by name, parameters inferred per tool | works at once, through a mapped type over the parameter schemas | `tools: { [K in keyof TP]: ToolSpec<Shape, TP[K]> }` |
| Two tools of one name (`postBoard` for residents and for the gamemaker) | an object has one key per name | the key `gamemaker/postBoard` registers the tool `postBoard` |

The order of the properties does not matter: `events`, `prompts`, `provides` and `snapshot` were moved below `tools`
on `channels` and it compiled unchanged. A service is keyed by the API's name string (`"brain-source"`), not by its
identifier; `[BrainSourceApi.name]` as the key works too.

### 4.4 The editor pays for the size of the expression around the handler

To type `ctx` in one handler, TypeScript resolves the call the handler sits in. In today's `channels` that is one
`kit.tool({...})` inside `residentTools(kit: Kit)`, with `Kit` named from the head: small. In one object it is the
whole object: 16 tools and 19 service methods, each handler checked against its helpers. Measured on `channels`,
processor time per completion: head and body 2.7 to 3.3 s; one object 3.2 to 4.8 s; a head apart with one body object
4.3 s; the same with the tool handlers in two units of their own (`handlersFor(head, {...})`) 2.8 to 3.3 s, the level
of today. `chess` is small enough for the whole body not to matter (today's `chess` also has its tools inside the one
`defineMechanic` call).

The rule for any form: **a large mechanic must be able to put handlers into units typed by the head.** The
one-object form cannot, by construction.

### 4.5 The floor of a completion is in the type foundation

`node spike/define-mechanic/measure/completion-time.mjs --floor`, warm, processor time:

| What is completed | Time |
|---|---|
| A value of `Static<typeof Schema>`, no generic function | 0.05 to 0.11 s |
| Today's `MechanicContext<MechanicShape>`, no generic function | 0.01 to 0.04 s |
| `withOptions<O extends TSchema>(spec: { options: O; start(setup: StateSetup<O>): number })`, completion on `setup.` | 2.8 to 4.1 s |
| The same with two parameters and today's context | 2.8 s |
| `ctx.state.` in the 40-line `guess-number` | 2.8 to 3.6 s |

The 12 lines are in `src/probes/floor.ts`. A profile of the request shows the time in conditional type instantiation
and type relation (`getConditionalTypeInstantiation`, `recursiveTypeRelatedTo`, `instantiateTypeWithAlias`) and a
third of it in the garbage collector. The cause is likely `Static<O>` for an `O` that is still being inferred; that
was **not proven**, only the reproduction is.

### 4.6 Smaller findings

- Paper 04 writes `start: ({ options, rng }) => ...`. With the repository's lint that is an error
  (`@typescript-eslint/unbound-method`): `StateSetup.rng` is declared as a method. The new contracts should declare
  such members as function properties.
- Today's documentation generator must instantiate every mechanic against a silent port to learn its tools
  (`scripts/mechanic-docs.ts`: "A mechanic's tools exist only once it is instantiated"). A head that is meant to be
  readable without running a body does not yet hold the tools.
- The default snapshot of the adapter (a state that is its own slice) is loaded by calling `start` and replacing the
  content of the fresh object. That is a spike device; in the new kernel the slice belongs to the kernel.
- `consult`, `decisions` and `commits`, `turns`, `presentation` and `guard` are typed by the adapter (except
  `consult`, which is left out) but neither `chess` nor `channels` uses them: they compiled, they never ran.

## 5. Why the verdict is "fail" and not "pass with a remark"

D1 says the spike passes "only if all four hold". Criterion 2b is an absolute limit and the one-object form misses it
on both mechanics, cold and warm. That the baseline misses it too explains the number; it does not turn it into a
pass, and D1 fixes what follows from a fail. Had the limit been relative to today's form, `chess` would hold (level
with today's form within the noise) and `channels` would be the open case (plus about 30 %).

A new spike result that could reopen the question needs two things: the floor of section 4.5 gone (a completion in a
40-line mechanic under 1 second, the target of paper 04 section 8.2), and then the one-object form measured again for
**small** mechanics only. For a mechanic with helpers in other files the circle of section 4.1 is a property of
TypeScript, not of this adapter.

## 6. The recommended shape of the API

### 6.1 Fail case (this verdict): head and body, one registration site, the head declares the tools

The spike built this form after the one-object form showed its limits, and ran both mechanics in it
(`src/chess-declared/`, `src/channels-declared/`; in `define.ts` the functions are called `declare`, `implement`
and `handlersFor`). It keeps what is proven (head and body) and takes from the one-object experiment what worked
without a cost:

1. **The head is all the data, the tools included**: name, description, parameters and grants of every tool. The body
   holds handlers only, keyed by the names the head declared.
2. **The type of a mechanic follows from its head alone.** Nothing is inferred from the body but the output schemas
   of the facts. So a helper takes `CtxOf<typeof head>` with no circle and no return types, `defineGame` gets the tool
   names from the head, and a handler can be a helper function itself (`news, turnOpened, turnEnded`).
3. **Empty parts are left out**, the state is a schema and its snapshot is derived, a custom state names `snapshot`.
4. **Handlers of a large mechanic go into units typed by the head** (`defineHandlers`), in the same file or another.
5. **One registration site**: the one `defineMechanic(head, body)` call. A mechanic is found by import; the five lists
   of paper 04 section 1.2 step 3 go (that is issue 22 and the package rules, not this spike).

The signatures, in the names the sdk should use (issue 22); "service" stands for today's `ApiDefinition` (D8). They
are the types compiled on `channels` and `chess` under other names: `defineHead` is `declare`, `defineMechanic` is
`implement`, `defineHandlers` is `handlersFor`, `MechanicHead` is `DeclaredHead`, `MechanicBody` is `HandlerBody`.
One difference in the text: the spike's `HandlerBody` takes the head's parameters one by one, the `MechanicBody`
below takes the finished `Shape`; that spelling was not compiled.

```ts
// @swarmtales/sdk

/** The state a mechanic holds: its custom state when `snapshot` gives one, else the value of the state schema. */
export type StateOf<Snap extends TSchema, C> = [C] extends [never] ? Static<Snap> : C;

/** A tool as the head declares it: data only. Its name is the key (`gamemaker/postBoard` registers `postBoard`). */
export interface ToolDeclaration<O extends TSchema, P extends PromptKeys, Params extends TSchema> {
	readonly description: PlainPromptId<P> | { readonly prompt: keyof P & string; variables(options: Static<O>): Readonly<Record<string, string | number | { readonly prompt: PlainPromptId<P> }>> };
	readonly params: Params;
	readonly for?: readonly GrantRole[];
	readonly serves?: readonly GrantRole[];
	readonly limit?: ToolLimit;
	readonly free?: boolean;
}

export interface MechanicHead<
	Id extends string, O extends TSchema, Snap extends TSchema, C, E extends EventSchemas, P extends PromptKeys,
	R extends readonly ServiceDefinition[], Pv extends readonly ServiceDefinition[], U extends readonly ServiceDefinition[],
	D extends DecisionSchemas, TP extends Readonly<Record<string, TSchema>>,
> {
	readonly id: Id;
	readonly summary: string;
	readonly options?: O;                      // left out: no options
	readonly state?: Snap;                     // the schema of the state and of its snapshot slice; left out: no state
	readonly snapshot?: { save(state: C): Static<Snap>; load(data: Static<Snap>, setup: StateSetup<O>): C };   // only for a state that is not plain JSON
	readonly version?: number;                 // of the slice, default 1
	readonly migrations?: Readonly<Record<number, (data: unknown) => unknown>>;
	readonly start?: (setup: StateSetup<O>) => NoInfer<StateOf<Snap, C>>;
	readonly events?: E;
	readonly audiences?: Partial<Readonly<Record<keyof E & string, readonly string[]>>>;
	readonly prompts?: P;
	readonly requires?: R;
	readonly provides?: Pv;
	readonly uses?: U;
	readonly decisions?: D;
	readonly tools?: { readonly [K in keyof TP]: ToolDeclaration<O, P, TP[K]> };
}

export function defineHead<
	const Id extends string,
	O extends TSchema = NoOptions,              // TObject<{}>
	Snap extends TSchema = TUndefined,
	C = never,
	E extends EventSchemas = {},
	const P extends PromptKeys = {},
	const R extends readonly ServiceDefinition[] = [],
	const Pv extends readonly ServiceDefinition[] = [],
	const U extends readonly ServiceDefinition[] = [],
	const D extends DecisionSchemas = {},
	TP extends Readonly<Record<string, TSchema>> = {},
>(head: MechanicHead<Id, O, Snap, C, E, P, R, Pv, U, D, TP>): MechanicHead<Id, O, Snap, C, E, P, R, Pv, U, D, TP>;

/** The handlers of one declared tool. */
export interface ToolHandlers<M extends MechanicShape, Params extends TSchema> {
	check?(params: Static<Params>, ctx: ToolContext<M>): Refusal | undefined;
	guardText?(params: Static<Params>): string | undefined;
	run(params: Static<Params>, ctx: ToolContext<M>): ToolOutcome;
}

/** M is Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>, built from the head's parameters. */
export interface MechanicBody<M extends MechanicShape, TP extends Readonly<Record<string, TSchema>>, F extends Readonly<Record<string, TSchema>>> {
	readonly tools?: { readonly [K in keyof TP]: ToolHandlers<M, TP[K]> };
	readonly services?: { readonly [N in M["provides"][number]["name"]]: ServiceImplementation<Extract<M["provides"][number], { readonly name: N }>, MechanicContext<M>> };
	readonly listeners?: (kit: Pick<MechanicKit<M>, "on" | "listen" | "core">) => readonly EventListener[];
	readonly facts?: { readonly [K in keyof F]: { readonly output: F[K]; compute(view: FactView<M>): Static<F[K]> } };
	readonly limits?: Readonly<Record<string, { readonly summary: string; breached(view: FactView<M>): string | undefined }>>;
	readonly jobs?: Readonly<Record<string, MechanicJob<M>>>;
	readonly commits?: MechanicCommits<M>;
	readonly hooks?: MechanicHooks<M>;          // whatever of today's hook families issues 18 and 19 keep
	readonly pipeline?: PipelineHandlers<M>;
}

export function defineMechanic<
	const Id extends string, O extends TSchema, Snap extends TSchema, C, E extends EventSchemas, const P extends PromptKeys,
	const R extends readonly ServiceDefinition[], const Pv extends readonly ServiceDefinition[], const U extends readonly ServiceDefinition[],
	const D extends DecisionSchemas, TP extends Readonly<Record<string, TSchema>>, F extends Readonly<Record<string, TSchema>> = {},
>(
	head: MechanicHead<Id, O, Snap, C, E, P, R, Pv, U, D, TP>,
	body: MechanicBody<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>, TP, F>,
): MechanicDefinition<Id, O, E, ToolNameOf<keyof TP>>;

/** Handlers of some declared tools as a unit of their own; spread into the body's `tools`. */
export function defineHandlers<H extends { readonly tools?: Readonly<Record<string, { readonly params: TSchema }>> }, K extends keyof NonNullable<H["tools"]>>(
	head: H,
	handlers: { readonly [N in K]: ToolHandlers<ShapeOf<H>, NonNullable<H["tools"]>[N]["params"]> },
): { readonly [N in K]: ToolHandlers<ShapeOf<H>, NonNullable<H["tools"]>[N]["params"]> };

export type ShapeOf<H> = /* the Shape of a head */;
export type CtxOf<H> = MechanicContext<ShapeOf<H>>;       // replaces ContextOf
export type ToolCtxOf<H> = ToolContext<ShapeOf<H>>;       // replaces ToolContextOf
export type ViewOf<H> = FactView<ShapeOf<H>>;
export type ToolNameOf<K> = K extends `${string}/${infer N}` ? N : K & string;
```

How it reads, on `chess` (the full files are in the spike):

```ts
export const chessHead = defineHead({
	id: "chess",
	summary: "A match of chess games between two solo seats; chess.js checks every move and ends the games.",
	options,
	state: ChessSlice,
	start: (setup) => ({ seats: names, /* ... */ }),
	events: { game_started: Type.Object({ /* ... */ }), /* ... */ },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi, TeamChannelApi],
	prompts: { "chess/tools/playMove": [], /* ... */ },
	tools: {
		playMove: { description: "chess/tools/playMove", params: Type.Object({ move: Type.String({ /* ... */ }), reason: Reason }), for: ["resident"] },
	},
});
type Ctx = CtxOf<typeof chessHead>;            // for the 20 helpers

export const chess = defineMechanic(chessHead, {
	tools: { playMove: { check: (_params, ctx) => problemWith(ctx, ctx.resident), run: (params, ctx) => play(ctx, params.move, params.reason) } },
	services: { "brain-source": { game: (_input, ctx) => ctx.state.game, /* ... */ } },
	hooks: { /* ... */ },
	jobs: { nextGame: (ctx) => { startNext(ctx); } },
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view) => (view.state.finished ? "the match is over" : undefined) } },
	facts: { scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) } },
});
```

**How a head stays readable without running a body.** The contracts hold the erased head as plain data, and the
definition carries it; the kernel takes only the instance (paper 01 section 2.3).

```ts
// @swarmtales/contracts (issue 16)

/** What can be read of a declared tool without running the mechanic. */
export interface DeclaredTool {
	readonly name: string;                     // the canonical tool name
	readonly description: string;              // the prompt id (or the text, once issue 22 has inline texts)
	readonly parameters: TSchema;
	readonly for: readonly string[];
	readonly serves: readonly string[] | undefined;
	readonly limit: ToolLimit | undefined;
	readonly free: boolean;
}

/** The static part of a plugin with every type erased: JSON data, no function. */
export interface PluginHead {
	readonly id: string;
	readonly summary: string;
	readonly options: TSchema;
	readonly state: TSchema | undefined;
	readonly version: number;
	readonly events: Readonly<Record<string, TSchema>>;
	readonly audiences: Readonly<Record<string, readonly string[]>>;
	readonly prompts: Readonly<Record<string, readonly string[]>>;
	readonly requires: readonly ServiceDefinition[];
	readonly provides: readonly ServiceDefinition[];
	readonly uses: readonly ServiceDefinition[];
	readonly decisions: Readonly<Record<string, TSchema>>;
	readonly tools: readonly DeclaredTool[];
}

/** A finished mechanic. The generics exist for typing games; the host uses the erased members. */
export interface MechanicDefinition<Id extends string = string, O extends TSchema = TSchema, E extends EventSchemas = EventSchemas, Tools extends string = string> {
	readonly head: PluginHead;                 // read by the README generator, the composed game schema, `swt mechanic show`, defineGame
	parseOptions(raw: unknown): Static<O>;
	instantiate(port: PluginPort, options: unknown): PluginInstance;   // the only place a handler can run
}
```

Three rules make "readable" checkable, as tests of the testkit's `conformance` (issue 23):
`structuredClone(definition.head)` succeeds and equals the head (no function in it); the tools of
`definition.instantiate(...)` have exactly the names, parameters and grants of `definition.head.tools`; and no code
outside the kernel and the testkit calls `instantiate` (a package rule). The functions an author writes in the typed
head (`start`, `snapshot.save`, `snapshot.load`, the `variables` of a tool description) are pure functions of the
options and the setup; `defineMechanic` keeps them out of `PluginHead`.

For the kernel issues 17 to 19 this means: the kernel knows `PluginInstance` only and holds the state slice with its
schema, so "save and load are the identity" is the kernel's code and not an adapter's (the spike's adapter had to
fake it, section 4.6).

What was proven on which mechanic, and what was not:

| Part | `chess` | `channels` | Not exercised |
|---|---|---|---|
| Tools declared in the head, handlers in the body | 3 | 16, two of one name | `consult` (left out of the spike) |
| Services keyed by name | 1 API, 3 methods | 2 APIs, 19 methods | |
| State as schema, derived snapshot | yes | | |
| Custom state with `snapshot` and a migration | | yes (classes, maps, sets; version 0 to 1) | |
| Hooks: plain, one phase, several phases, helper functions as hooks | yes | yes | |
| `pipeline.lock`, listeners, jobs, facts, limits | jobs, facts, limits | lock, listener, facts | `afford`, `settle`, `after` |
| Handlers in units typed by the head | one tool (head-apart form) | two units | units in a second file (same types, not done) |
| `decisions` and `commits`, `turns`, `presentation`, `guard` | | | typed and compiled, never run |

The body as a function of a kit (`defineMechanic(head, (kit) => ({...}))`, today's form) was **not** rebuilt with
declared tools. If issue 22 prefers it for the port (the 39 mechanics are written that way), the same types apply with
`kit.handle<K extends keyof TP & string>(name: K, handlers: ToolHandlers<M, TP[K]>)` in place of the keyed object; a
tool written in a function `tools(kit: Kit)` is then a unit by itself, as in today's `channels`. That variant is a
proposal, not a measurement.

### 6.2 Pass case (if the question is reopened and passes)

The sugar is the union of the two arguments, with the same property names, so moving a mechanic from one form to the
other is cut and paste:

```ts
/** One object: MechanicHead, with every tool holding its declaration and its handlers, plus the rest of the body. */
export function defineMechanic<
	const Id extends string, O extends TSchema = NoOptions, Snap extends TSchema = TUndefined, C = never,
	E extends EventSchemas = {}, const P extends PromptKeys = {},
	const R extends readonly ServiceDefinition[] = [], const Pv extends readonly ServiceDefinition[] = [], const U extends readonly ServiceDefinition[] = [],
	const D extends DecisionSchemas = {}, TP extends Readonly<Record<string, TSchema>> = {}, F extends Readonly<Record<string, TSchema>> = {},
>(
	mechanic: Omit<MechanicHead<Id, O, Snap, C, E, P, R, Pv, U, D, TP>, "tools">
		& Omit<MechanicBody<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>, TP, F>, "tools">
		& { readonly tools?: { readonly [K in keyof TP]: ToolDeclaration<O, P, TP[K]> & ToolHandlers<Shape<O, StateOf<Snap, C>, E, P, R, Pv, U, D>, TP[K]> } },
): MechanicDefinition<Id, O, E, ToolNameOf<keyof TP>>;
```

It compiles to the same `PluginHead` and `PluginInstance` (the adapter does exactly this split). Its documentation
must carry one rule: a mechanic whose handlers call helpers that take the context is written with `defineHead`. The
spike wrote the object as one interface (`MechanicSpec` in `define.ts`) and not as the intersection above; the
intersection is the same type but was not compiled.

## 7. Proposed follow-up issues

1. **Completion floor of generic definers over `TSchema`** (before issue 16 fixes the contracts): find the cause of
   section 4.5 with `src/probes/floor.ts`, try a newer Typebox and a `Static` that is not evaluated for an unresolved
   parameter, and put `measure/completion-time.mjs` into the check as a budget (paper 04 section 8.2: 1 second target,
   2 seconds hard limit). Without it `defineGame`, `defineMechanic` and `defineDirector` all miss the editor budget.
2. **Issue 16 and 22: the head declares the tools** (section 6.1), with the three conformance rules.
3. **Issue 22: `defineHandlers` and the body form**: decide between the keyed body object and a kit with `handle`, by
   porting `grid-game` (issue 24) in the first and measuring a completion.
4. **Contracts: members as function properties, not methods**, where authors destructure (`rng`, `random`).
5. **Type-check base cost**: 167 000 types and 5 seconds for a 911-line package with declaration files of its
   dependencies; worth one look when the contracts are recut.

## 8. What was run, and what was not

- `tsc --noEmit -p spike/define-mechanic` (all forms and probes): no error. `tsc -p
  spike/define-mechanic/tsconfig.fail.json`: the four expected errors.
- The existing tests against the copies, as in section 2. The whole `test/` folder against the declared-head copies:
  311 files, 2589 tests, all pass.
- ESLint on `spike/define-mechanic/src` only, as in section 3.4.
- **Not run:** `pnpm check`, `pnpm lint`, `pnpm knip`, `pnpm typecheck` of the repository. The spike folder is in none
  of their paths (`package.json` scripts, root `tsconfig.json`, `knip.json`), and no file outside
  `spike/define-mechanic/` and this folder was changed; that the old check is unaffected follows from that and was
  not confirmed by running it.
- No live model was called.

## 9. What was painful

- **The circle of section 4.1.** It is the first thing a real mechanic hits, its four errors do not name the cure, and
  the cure (33 return types, wrapped hooks) removes the comfort the form was meant to give.
- **Inference that fails silently.** Three attempts of section 4.3 did not end in an error at the definition but in a
  wrong type far away (`ctx.state` is `undefined`; a parameter is implicitly `any`).
- **Working without casts inside the adapter.** Defaults for parts that were left out cannot be typed in generic code;
  the overload on an erased implementation is a device, and it means the adapter's own body is checked loosely.
- **The shared machine.** With a load average of 4 to 19 on 4 cores, wall times moved by a factor of two between
  passes. Counts (types, instantiations) and processor time were the stable numbers; the wall times are given with
  their load.
- **The floor.** Half an hour went into finding out that the 2 seconds are missed by a 12-line generic function. It
  was worth it: without that, the verdict would have blamed the one-object form for a cost it does not cause.
- **Typebox type names in errors.** Every error that prints the shape prints the options schema; lines of 400 to 700
  characters are normal in both forms.
