# 04 Developer experience: audit, first hour, API shape, docs and acceptance tests

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Status: phase 1 paper of the rewrite (see [BRIEF.md](BRIEF.md)). Role: developer experience (DX) lead, with a veto
over API shapes. Analysis only; nothing here is built. Interface sketches are proposals for the architecture, kernel
and mechanics papers of this phase to check against.

Method: every claim about today comes from reading the repository. I could not run the commands (the container has no
`node_modules`, `pnpm swt` fails with `tsx: not found`), so times to first success are estimates from the number of
steps and files a newcomer must read, not measurements. Measuring them is the first acceptance test (§8).

**The one-sentence finding.** The platform has good parts a newcomer never reaches: typed tool names (`ToolOf<Ms>` in
`packages/contracts/src/core/story.ts`), generated mechanic READMEs, `swt doctor`, a signed log. But there is no path
to them. The docs describe the old story format, the CLI lists half the mechanics, the offline provider does not play
a game, and a third-party Director cannot be run from the command line at all.

## 1. DX audit of today

### 1.1 Persona A: the game builder (a new game from shipped mechanics)

Walk-through, using only what the README links.

| # | Step | What happens | Source |
|---|---|---|---|
| 1 | Read README "For builders" | Sent to `docs/STORY-FORMAT.md` and `docs/CLI.md`. No tutorial, no "your first game". The same list links five carve-plan papers | `README.md` lines 183-200 |
| 2 | Install | "not on npm yet, so you work from a clone". README says Node 22.19, `docs/HOW-IT-WORKS.md` line 73 says Node 26 | `README.md` 134, `HOW-IT-WORKS.md` 73 |
| 3 | First run `pnpm start --provider scripted --minutes 5` | Plays City of Keys (48-resident concept, levels, doors), not a small game. Output is a city log; nothing says what to change next | `README.md` 141 |
| 4 | Read the story format | Describes `defineStory` and one Typebox `StorySchema` with required `city`, `levels`, `finishedNotice`, `director` | `docs/STORY-FORMAT.md`, `story.schema.json` |
| 5 | Open the reference `stories/tictactoe-teams/story.ts` | It uses **another** API: `defineCoreStory` from `@swarmtales/kernel`. The SDK (`packages/sdk/src/index.ts`) does not export it. 13 of 15 stories use it; the documented format serves 2 (`STORIES` in `stories/index.ts`) | `stories/index.ts` 31-36, 71-131 |
| 6 | Find mechanics | `swt module list` knows 19 of the 38 mechanics; none of the five tic-tac-toe mechanics is in it. The builder must browse `mechanics/*/README.md` by hand | `apps/cli/src/swt/module-cmd.ts` 29 |
| 7 | Write the game | 141 lines for tic-tac-toe. Must hand-write: the grant list (8 tool names), `locked: ["playMove", "writeBrain"]`, `turns: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }] }`, the same `teams` object passed to four mechanics, and a 25-line `briefing` function that re-describes every tool in prose | `stories/tictactoe-teams/story.ts` 84-129 |
| 8 | Register | Export a `CoreStoryEntry` (a type defined in `stories/index.ts`, imported by the CLI through `../../../../stories/index.ts`), add it to `coreStories`, add variants as a regex over the name (`TICTACTOE_NAME`) | `stories/index.ts` 57-69, 141 |
| 9 | Validate | `swt story validate` and `pnpm validate` check `STORIES` only. A core game is never validated before it runs. `swt story list` does not list it | `apps/cli/src/validate.ts` 8, `story-cmd.ts` 45, 110 |
| 10 | Dry run `--provider scripted` | "A scripted run has no game to play: every resident only speaks". The match is random forfeits; the builder cannot see the game work without paying for a model | `apps/cli/src/host/core-play.ts` 88 |
| 11 | Live run | Needs `ARENA_ANTHROPIC_API_KEY`, not `ANTHROPIC_API_KEY` (`swt doctor` warns, the run error does not). Three games take 56 virtual minutes at 5 passes | `swt/doctor.ts` 44, `story.ts` 87 |

Where a newcomer gets stuck, in order of cost:

1. **Two formats, the wrong one documented.** `docs/STORY-FORMAT.md` never mentions `defineCoreStory`. The only prose
   on it is §6 of `docs/design/mechanic-api.md`, a design paper for carving teams whose status line still says
   "Nothing in the CLI uses it yet". YAML and the VS Code schema support (`apps/vscode/README.md`) work only for the
   city format, so the editor guidance covers the format a new game should not use.
2. **A game cannot live outside the repository.** The registry, the entry type and the briefing are repository files;
   there is no package to install and no `--game ./my-game.ts`.
3. **Knowledge that is in nobody's docs.** Why `playMove` must be locked (grid-game unlocks it for the captain); which
   input kinds exist (`"context-reset"` is a bare string); why `maxOutputTokens: 16_000` (a comment says "P86").
4. **Stringly-typed wiring.** `consensus.with({ tool: "playMove", param: "cell" })`: both are `Type.String`
   (`mechanics/consensus/src/index.ts` 76-77); a typo loads and fails in play. Resident ids are the strings
   `"A01"`..`"A06"`.
5. **Options that compile and fail at load.** `OptionsInput<O> = Partial<Static<O>>`
   (`contracts/src/core/mechanic.ts`), so a missing required option compiles; the load error is `grid-game: the
   options do not match the schema` with the Typebox detail thrown away (`kernel/src/host/define.ts` 231).

Confusing names met: story / core story; module / mechanic; agent / competitor / resident / seat (`--agents`,
`competitorIds`, `residents`, `brainSeats`); gamemaker / game master / director; `ARENA_*` environment variables in a
project called Swarm Tales; "minute" for a virtual tick.

### 1.2 Persona B: the mechanic author

| # | Step | What happens | Source |
|---|---|---|---|
| 1 | Find the guide | `docs/MECHANIC-README.md` is about the README format, not about writing a mechanic. The contract is `docs/design/mechanic-api.md` (316 lines, carve jargon: "R2-D9", "wave 3.5, T1 request 11", legacy adapters) | both files |
| 2 | Create the package | Copy `mechanics/marks/`: `package.json`, `tsconfig.json` with hand-written `references`, `tsdown.config.ts`, `src/`, `prompts/` | `mechanics/marks/` |
| 3 | Register it | Five places: root `package.json` devDependencies, root `tsconfig.json` references (39 entries), `MECHANIC_IDS` and `ALLOWED` in `scripts/check-packages.ts`, `MECHANICS` in `scripts/mechanic-docs.ts`, `MODULES` in `module-cmd.ts` (19 mechanics are missing from it) | named files |
| 4 | Write the head | `id`, `summary`, `options`, `state`, `events` are all required, "even when empty (`Type.Object({})`, `() => undefined`, `{}`)". `defineMechanic` has 10 type parameters; a type error prints all of them | `mechanic-api.md` §2, `define.ts` 205-221 |
| 5 | Type helpers outside the body | Needs the `defineHead` + `ContextOf<typeof head>` pattern; both real mechanics use it (`marksHead`, chess `head`) | `marks/src/index.ts` 51, 74 |
| 6 | Write a tool | The description must be a prompt id; the text is a Markdown file with frontmatter (`id`, `variables`) under `prompts/<id>/tools/`. A missing file fails at run time: `prompt "x" of marks: no file in the story, the owner's folder or the library` | `packages/prompts/src/lookup.ts` 49 |
| 7 | Order hooks and inputs | Numbers from global tables in another package: `HOOK_ORDER.turnInputs.status`, `STATUS_ORDER.marks`, and `INPUT_KINDS[1].kind` (an array index) | `marks/src/index.ts` 121-125 |
| 8 | Keep state | Any state needs a hand-written snapshot slice (`version`, `schema`, `save`, `load`, `migrations`), else `marks: has state but no snapshot slice`. Marks spends 12 lines converting a `Map` | `define.ts` 122, `marks/src/index.ts` 132-140 |
| 9 | Test | `playStory(options, agent)` takes raw `HostOptions` (story, prompt lookup, guard). No one-call "play this mechanic". Tests live in the root `test/mechanics/<name>/`, not in the package | `packages/testkit/src/agents.ts` |
| 10 | Document | `pnpm docs:mechanics` writes the generated blocks; the check fails while a section says `_To be written._`. This part works well | `docs/MECHANIC-README.md` |

A small mechanic is not small: `marks` (no tool at all) is 141 + 152 lines, 4 prompt keys, and needs
`@swarmtales/mechanic-shared`. A large one is one file: `mechanics/chess/src/index.ts` has 677 lines and 23 options,
and depends on two other mechanic packages (`strategy-brain`, `team-channel`), which is the coupling the brief names.

Stuck points: the ten-stage pipeline (`lock, parse, limit, afford, rule, guard, consult, execute, settle, after`) must
be understood before the first tool; three ways to react (`kit.on`, `kit.listen`, `kit.core`); `requires` / `uses` /
`provides` and `ctx.call` / `ctx.tryCall`; `suggest` versus `serves` versus the story's `grants` versus `locked`.
Errors are terse and name no fix: `marks: the payload of "marks_spent" does not match its schema` (which field?),
`chess: the match needs exactly two sides, not 3` (thrown from `state`, so it surfaces as a generic load failure).

### 1.3 Persona C: the Director author

| # | Step | What happens | Source |
|---|---|---|---|
| 1 | Find the guide | `docs/design/overseer-api.md` (601 lines) is a build plan for "step 18" with byte-identity rules for golden logs; `docs/ideas/overseers-and-plugins.md` is an idea paper ("Nothing here is built") | both files |
| 2 | Find an example | `packages/roles/src/overseer/judge.ts` (109 lines). It is not a plugin: it lives in a 4791-line package beside the old roles and is exported as a namespace "because the old roles keep their own names" | `packages/roles/src/overseer/index.ts` |
| 3 | Write the head | 15 fields. `system` and `input` are prompt ids, `answer: { tool, description }`, `model: { slot: "classifier" }` (a string; `swt.config`, where slots would be set, does not exist), `lifetime: "long" \| "short"`, `triggers`, `needs` (tool names as strings) | `overseer-api.md` §1.1 |
| 4 | Learn a rule from an error | The input prompt must end with `{{standingOrders}}`: `judge: the input prompt "judge/input" does not end with {{standingOrders}}` | `kernel/src/host/name-checks.ts` 107-111 |
| 5 | Typed triggers | `{ event: "core", type: "decision_proposed", when: (p) => ... }`: `type` is a string and `p` is `unknown` | `overseer-api.md` §1.1, §3.4 |
| 6 | Write a runtime | Each shipped overseer has its own model runtime (`judge-runtime.ts`, 60 lines, starts with `if (call.definition !== "judge") return { ok: false ... }`). A new Director needs one, or it only ever answers through `fallback` | `packages/roles/src/overseer/judge-runtime.ts` |
| 7 | Run it in a game | Not possible from the CLI for a mechanics-based game: "No overseers, no weaver, no snapshot or resume yet". Overseers run only through the city mapping in `apps/cli/src/host/run.ts` | `apps/cli/src/host/core-run.ts` 8 |
| 8 | Test | `scriptedOverseer({ name: [...] })` in the testkit works and is the one pleasant step | `packages/testkit/src/overseers.ts` |

Stuck points: the author must hold the decision gate (holders, windows, deadlines, human priority), audiences and
standing orders in mind before the first answer comes back; the vocabulary shifts between role, overseer, gamemaker
and the old `director` (the scripted rules of `defineStory`, today the `script` mechanic). Dials exist only as CLI
flags of the city (`--figure-direction`, level table in `apps/cli/src/host/direction.ts`); a Director cannot declare
one.

### 1.4 Audit summary

| | Game builder | Mechanic author | Director author |
|---|---|---|---|
| Tutorial exists | no | no | no |
| Reference doc matches the code | no (old format) | partly (stale status, jargon) | partly (plan, not a guide) |
| Scaffold command | no (`story new` "not built") | no | no |
| Registration sites | 2 | 5 | wiring in app code |
| Offline run shows the thing working | no | tests only | tests only |
| Works outside the repository | no | no | no |
| Estimated time to first success | 0.5 to 1 day for a new game (10 minutes to run a shipped one); most of it reading `story.ts`, five mechanic READMEs and `stories/index.ts` | 1 to 2 days to pass `pnpm check`; most of it package plumbing and the snapshot slice | not reachable from the docs; days for someone who reads the kernel and writes their own wiring |

What to carry over, because it already is good DX: `ToolOf<Ms>` inference; `mechanic.with(options)` with Typebox
defaults; the generated README blocks and their staleness check; `swt doctor`; `--json` on every command; exit codes
0/1/2; shell completion from one command table; `scriptedOverseer` and `scriptedHuman`; `@ts-expect-error` type tests
(`test/host/mechanic-types.check.ts`).

## 2. The first hour on the new platform

Docs first: each subsection opens with the tutorial text as it should read, then lists what the API must be for that
text to be true. These lists are requirements on the other papers.

### 2.1 Game builder

> # Your first game
>
> You will run tic-tac-toe between two AI residents, first offline, then on Claude Haiku. It takes
> five minutes and costs less than one cent.
>
> ```bash
> npm create swarmtales@latest hello-game
> cd hello-game
> npx swt run --fake
> ```
>
> You now see a finished match and a link to the replay. `--fake` used a model that plays seeded
> random legal moves, so nothing left your machine. Open `game.ts`. This is the whole game:

```ts
// game.ts
import { defineGame } from "swarmtales";
import { gridGame } from "@swarmtales/mechanic-grid-game";

export default defineGame({
	id: "hello-game",
	title: "Hello Game",
	residents: ["ada", "bob"],
	mechanics: [gridGame({ sides: { X: ["ada"], O: ["bob"] }, games: 1 })],
	model: "anthropic/haiku",
});
```

> `residents` names the players. `mechanics` lists the rules; here one mechanic that owns the board.
> Type `gridGame({` and your editor lists every option with its description. Change `"bob"` to
> `"bop"` in `sides`: the editor underlines it, because `"bop"` is not a resident.

| Minute | They type | They see | The docs page says |
|---|---|---|---|
| 0-2 | `npm create swarmtales@latest hello-game` | 5 files, dependencies installed, "Next: `npx swt run --fake`" | what each file is, in one line each |
| 2-3 | `npx swt run --fake` | a live board per move, `X wins in 7 moves`, `log verified`, `replay: npx swt view runs/001` | what a run folder holds; the fake model |
| 3-5 | `npx swt view runs/001` | the viewer: board replay, each resident's prompt and thoughts | "everything is on record": events, `#seq`, the chain check |
| 5-8 | `npx swt doctor`, sets the key, `npx swt run` | key found, estimated cost `< 0.01 USD`, the match in under one minute, real reasoning in the viewer | keys and cost; what Haiku was shown (the generated briefing) |
| 8-15 | edits `games: 3`, `size: 4, line: 4`; `npx swt run --fake --watch` | reruns on save; a wrong option is a red line in the editor and a `SWT-G` error with a fix | options, `swt mechanic show grid-game` |
| 15-30 | sample 2: adds `teamChannel()`, `consensus(...)`, a third and fourth resident | teams talk before each move | combining mechanics; services between mechanics; the compile error when one is missing |
| 30-45 | sample 3: `roles`, a secret per resident, a hand-written premise | residents with different private prompts | roles, secrets, what a resident can and cannot see |
| 45-60 | `game.test.ts` (in the template): asserts on events with the fake model; `swt check` | green test, validated game | testing a game offline; the path to samples 4 to 7 |

What the API must be:

1. **One install, one import.** `swarmtales` is the CLI and the builder API; mechanics are npm packages. A game is a
   file with a default export; no registry, no entry type, no repository clone.
2. **`grants` defaults to automatic.** Each tool declares who it is for; the game only overrides. Today's `grants:
   "auto"` (`docs/design/grants-auto.md`) becomes the default, not an opt-in.
3. **The briefing is generated.** Each mechanic ships a `rules` text; the default briefing is the game's `premise`
   plus the rules of its mechanics plus the resident's role. Today the tic-tac-toe story hand-writes it.
4. **Residents and teams are game-level, typed data.** Options that take resident ids are checked against `residents`
   at compile time (§3, rule 2).
5. **Under one minute live.** The mechanic puts the board in the turn input (no `viewBoard` round trip), `playMove`
   ends the turn, and only the side on move is called: 5 to 9 Haiku calls. This is a budget on `grid-game` and the
   scheduler, tested in CI by call count with the fake model and live before each release.
6. **The fake model plays the game.** Every tool has a `sample` function that returns a legal call for the current
   state (§2.2). The fake model calls seeded samples. No key, no network, same log format, same viewer.
7. **Variants are parameters, not names.** `swt run --set games=3` against a declared `params` schema replaces
   `tictactoe-teams-5x5-nobrain-r6`.

### 2.2 Mechanic author

> # Your first mechanic
>
> A mechanic is one rule of a game: its state, the tools residents may call, the events it writes.
> You will write "guess the number" in 40 lines, test it without a model and play it.
>
> ```bash
> npx swt mechanic new guess-number
> npx swt test
> ```

```ts
// mechanics/guess-number/src/index.ts
import { defineMechanic, t } from "swarmtales/mechanic";

/** Residents race to find a secret number; every guess is answered with higher, lower or correct. */
export const guessNumber = defineMechanic({
	id: "guess-number",
	summary: "A secret number; each guess is answered with higher, lower or correct.",
	options: t.Object({
		max: t.Default(t.Integer({ minimum: 2, description: "The secret lies between 1 and max." }), 100),
	}),
	state: t.Object({ secret: t.Integer(), winner: t.Optional(t.String()) }),
	start: ({ options, rng }) => ({ secret: rng("secret").int(1, options.max) }),
	events: {
		guessed: t.Object({ by: t.String(), value: t.Integer(), hint: t.Enum(["higher", "lower", "correct"]) }),
	},
	rules: ({ options }) => `A secret number lies between 1 and ${options.max}. Find it with guess.`,
	tools: {
		guess: {
			description: "Guess the secret number. The answer says higher, lower or correct.",
			for: ["resident"],
			params: t.Object({ value: t.Integer({ minimum: 1, description: "Your guess." }) }),
			sample: (ctx) => ({ value: ctx.rng("sample").int(1, ctx.options.max) }),
			run({ value }, ctx) {
				if (ctx.state.winner !== undefined) return ctx.refuse("GAME_OVER", "The number is already found.");
				const hint = value === ctx.state.secret ? "correct" : value < ctx.state.secret ? "higher" : "lower";
				ctx.emit("guessed", { by: ctx.caller, value, hint });
				if (hint === "correct") {
					ctx.state.winner = ctx.caller;
					ctx.endRun("solved");
				}
				return ctx.reply(`${value}: ${hint}.`, { endsTurn: true });
			},
		},
	},
});
```

```ts
// mechanics/guess-number/src/index.test.ts
import { conformance, play } from "swarmtales/testing";
test("the number is found", async () => {
	const run = await play(guessNumber({ max: 2 }), { residents: ["ada"], seed: 1, script: { ada: [["guess", { value: 1 }], ["guess", { value: 2 }]] } });
	expect(run.end.reason).toBe("solved");
});
test("conformance", () => conformance(guessNumber));   // determinism, snapshot round trip, descriptions, samples
```

| Minute | They type | They see | The docs page says |
|---|---|---|---|
| 0-5 | `npx swt mechanic new guess-number` | a package with `src/index.ts` (a working one-tool mechanic), a test, a README with generated blocks, a `demo.game.ts` | the five parts: options, state, events, tools, rules |
| 5-10 | `npx swt test`; `npx swt run demo --fake` | green; a played game | the fake model calls `sample`; why every tool needs one |
| 10-30 | replaces the template rule with the code above | autocomplete for `ctx.emit("` (declared events only), `ctx.options.`, `ctx.state.` | state is plain JSON described by a schema; the snapshot is automatic |
| 30-40 | breaks it on purpose: emits an undeclared event, returns no reply | compile errors in the editor; at run time `SWT-M` errors with the field path | refusals versus errors |
| 40-50 | `npx swt mechanic docs`; `npx swt mechanic show guess-number` | README blocks (tools, events, options) written from the code | the README format; what stays handwritten |
| 50-60 | `npx swt run demo` on Haiku | a live game on their own rule | next: services between mechanics, hooks, decisions (how-to guides) |

What the API must be:

1. **One object, inferred.** `defineMechanic({...})` infers `ctx` from `options`, `state` and `events` written above
   the tools. If a type test shows this fails on a real mechanic, the fallback is today's two-argument form. Either
   way `defineHead` + `ContextOf` go; `CtxOf<typeof guessNumber>` is the helper type.
2. **Empty parts are omitted.** No `options: Type.Object({})`, no `state: () => undefined`.
3. **State is a schema; the snapshot is derived.** Chess already declares its state as a Typebox object (`ChessSlice`,
   `type ChessState = Static<typeof ChessSlice>`). Make that the rule: save and load are the identity, and
   `migrations` is written only when the version changes.
4. **Texts inline by default.** A tool description is a string or a function of the options; a game can still override
   it by key (`guess-number.tools.guess.description`). No frontmatter, no missing-file error at run time.
5. **`sample` on every tool**, checked by `conformance`: the fake model, the README example and a fuzz test all use
   it.
6. **No registration.** A mechanic is found by import. `swt mechanic list` reads the game's imports and the installed
   packages with the `swarmtales` keyword; the docs generator takes a glob.
7. **`play()` in one call**: mechanic, residents, seed, script. No `HostOptions`.
8. **A mechanic is a factory**: `guessNumber({ max: 3 })`, not `guessNumber.with({ max: 3 })`. Typed members hang on
   it: `guessNumber.tools.guess`, `guessNumber.events.guessed`.

### 2.3 Director author

> # Your first Director
>
> A Director is a model that is not a resident. It watches the game and may change it, only through
> powers the game grants. You will write the Trickster: when a resident guesses, the game proposes
> the true hint, and the Trickster may turn it into a lie. A dial sets how often. A human can
> overrule it.

```ts
// directors/trickster/src/index.ts
import { defineDirector, dial, t } from "swarmtales/director";
import { guessNumber } from "@acme/mechanic-guess-number";

/** May replace a true hint with the opposite one. */
export const trickster = defineDirector({
	id: "trickster",
	summary: "Turns some true hints into lies.",
	dials: { mischief: dial({ default: 3, description: "0 never lies, 10 lies whenever it may." }) },
	on: [guessNumber.decisions.hint.proposed],
	system: ({ dials }) => `You are the Trickster. Mischief ${dials.mischief} of 10. Lie rarely when it is low.`,
	input: ({ fired }) => `${fired.proposal.by} guessed ${fired.proposal.value}. The true hint is "${fired.proposal.hint}".`,
	output: t.Object({
		lie: t.Boolean({ description: "True to give the opposite hint." }),
		reason: t.String({ maxLength: 200, description: "One sentence for the log." }),
	}),
	act(answer, ctx) {
		if (!answer.lie || ctx.fired.proposal.hint === "correct") return;
		const hint = ctx.fired.proposal.hint === "higher" ? "lower" : "higher";
		ctx.amend(ctx.fired, { ...ctx.fired.proposal, hint }, answer.reason);
	},
	fallback: () => ({ lie: false, reason: "no model" }),
	sample: (ctx) => ({ lie: ctx.rng("sample").chance(ctx.dials.mischief / 10), reason: "sample" }),
	limits: { maxCalls: 50, maxCostUsd: 0.05 },
});
```

```ts
// the mechanic of 2.2 gains a decision: it proposes the hint instead of replying at once
	decisions: { hint: t.Object({ by: t.String(), value: t.Integer(), hint: Hint }) },   // Hint: the enum of 2.2
	// in run(): ctx.decide("hint", { by: ctx.caller, value, hint }, { window: ctx.options.hintWindow });
// game.ts: the three lines that are new
	mechanics: [guessNumber({ max: 50, hintWindow: 1 })],
	directors: [trickster.as("trickster", { mischief: 5 })],
	human: { may: ["amend", "instruct", "pause"] },
```

| Minute | They type | They see | The docs page says |
|---|---|---|---|
| 0-5 | `npx swt director new trickster` | a package with a working Director, a test with a scripted answer, a demo game | Director versus resident versus mechanic; a Director acts only through grants |
| 5-15 | `npx swt run demo --fake` and the viewer | `decision_proposed`, `director_answered`, `decision_settled changed by trickster` in the log | the decision gate in one picture: propose, window, amend, settle |
| 15-30 | writes the code above | `fired.proposal` is typed from the mechanic's decision schema; `ctx.amend` rejects a wrong shape at compile time | triggers; output schemas; why the answer is never trusted |
| 30-40 | `npx swt run demo --fake --dial trickster.mischief=10`, then `=0` | all hints flipped, then none; the run header records the dial | dials: declared, typed, 0 to 10, recorded |
| 40-50 | `npx swt run demo --fake --hand`; types `amend 12 hint=lower` at the pause | the human's amendment wins; the report header says "human-influenced" | the Human Hand: safe points, priority, logging |
| 50-60 | `npx swt run demo` on Haiku; removes the grant | a live run; without the grant, a compile error on `directors` | limits, cost caps, fail-open; publishing a plugin |

What the API must be:

1. **No runtime to write.** The platform owns the model call, the tool loop, parsing, the fallback model and cost
   recording for every Director. Today each has its own runtime file.
2. **Typed triggers.** `on: [mechanic.events.x, mechanic.decisions.y.proposed, every(5), kernel.events.runEnded]`;
   `fired` is a union discriminated by the references given. No `type: string`, no `payload: unknown`.
3. **`act` is code by default.** The model returns a structured answer; code turns it into world calls. A Director
   that lets the model call tools itself declares `tools: [guessNumber.tools.guess]`. Both go through the same
   pipeline and limits.
4. **Needs are derived.** Using `ctx.amend` or a tool reference makes the Director need that grant; a game whose
   mechanics do not offer it gets a compile error on `directors` that names what is missing.
5. **Dials are declared.** `dial()` is an integer from 0 to 10 with a description and optional level table. The CLI
   sets it (`--dial name.dial=n`), the run header records it, an experiment varies it.
6. **Standing orders are appended by the platform**, not by a `{{standingOrders}}` placeholder the author must
   remember.
7. **Directors run in every game.** There is one runner; the split into "city" and "core" stories ends.

## 3. API design principles for the typed builder

Each rule has a before (today, cited) and an after (proposal).

**Rule 1. Derive, never enumerate.** A closed list of names in a shared package is a bug source.

```ts
// before: packages/contracts/src/tool-names.ts (37 names), and five registration sites per mechanic (1.2 step 3)
export const TOOL_NAMES = ["getStatus", "getProblem", "submitSolution", /* ... */] as const;
// after: names come from the mechanics a game lists; the editor completes playMove | resign | postTeam | readTeam
defineGame({ mechanics: [gridGame(), teamChannel()], grants: { resident: { drop: ["resign"] } } });
```

**Rule 2. An id is a reference to something declared, and the type knows it.**

```ts
// before: stories/tictactoe-teams/story.ts
const TEAMS = { X: ["A01", "A02", "A03"], O: ["A04", "A05", "A06"] };            // plain strings
consensus.with({ tool: "playMove", param: "cell", teams });                       // tool and param: Type.String
gridGame.with({ teams }); teamChannel.with({ teams }); strategyBrain.with({ teams });  // the same object four times
// after
defineGame({
	residents: ["ada", "bob", "cy", "dee"],
	teams: { X: ["ada", "bob"], O: ["cy", "dee"] },                 // checked against residents
	mechanics: [
		gridGame(),                                                    // reads the game's teams
		consensus({ gate: gridGame.tools.playMove, about: "cell" }),   // "cell" must be a parameter of playMove
	],
});
```

Typing sketch: `defineGame<const R extends string, const T extends Record<string, readonly R[]>, const Ms extends
readonly MechanicUse<R, keyof T & string>[]>`, and `consensus<P extends TSchema>({ gate: ToolRef<string, P>, about:
keyof Static<P> })`.

**Rule 3. What is required is required at compile time.**

```ts
// before: contracts/src/core/mechanic.ts
export type OptionsInput<O extends TSchema> = Partial<Static<O>>;   // every option optional; fails at load
// after: a default is part of the type
t.Default(t.Integer({ description: "..." }), 3)     // optional in the input type, present in ctx.options
t.Integer({ description: "..." })                   // required in the input type
type In<O> = /* optional where wrapped by t.Default or t.Optional */;  type Out<O> = Static<O>;
```

**Rule 4. A missing service is a compile error that says what to add.** Today `story: "consensus" requires
"consensus-source", which no loaded mechanic provides` appears at load (`kernel/src/host/loader.ts` 45). The check
moves into the type of `defineGame`; the load-time check stays for YAML and JSON games, with the same error code (§5).

```ts
type Missing<Ms> = Exclude<RequiredServices<Ms>, ProvidedServices<Ms>>;
type CheckServices<Ms> = [Missing<Ms>] extends [never] ? unknown
	: { readonly "missing service": `No mechanic provides "${Missing<Ms>}". Add one that does; see swt mechanic list --provides.` };
declare function defineGame<const Ms extends readonly MechanicUse[]>(game: Game<Ms> & CheckServices<Ms>): Game<Ms>;
```

**Rule 5. Events, decisions and tools are values, not strings.**

```ts
// before: docs/design/overseer-api.md §3.4
triggers: [{ event: "core", type: "decision_proposed", when: (p) => isKind(p, "tribunal.verdict") }]   // p: unknown
needs: ["rollDice", "amendDecision"]
// after
on: [tribunal.decisions.verdict.proposed]          // fired.proposal is Static<typeof Verdict>
```

**Rule 6. Order by relation, not by number.** Today hooks and inputs sort by numbers from
`mechanics/shared/src/order.ts`, and marks picks its input kind as `INPUT_KINDS[1].kind`. After: a mechanic exports
its input slots as typed constants and others write `after: [channels.inputs.inbox]`; the loader sorts and reports a
cycle by name. A shared order table is forbidden by the package rules.

**Rule 7. One way to do each thing.** Today: `defineStory` and `defineCoreStory`; `kit.on`, `kit.listen` and
`kit.core`; `suggest` and `serves`; role callers and overseers. After: `defineGame`; `on(ref, handler)`; `for`;
Directors.

**Rule 8. The description in the schema is the hover text.** Typebox descriptions do not show when the editor
completes `gridGame({ ga|`. The docs generator already reads them; it also writes a generated `options.gen.ts`
interface with TSDoc from the descriptions, which the factory uses as its input type. A type test proves the interface
equals `In<typeof options>`; CI fails when it is stale.

**Rule 9. Small, flat, serialisable.** A game is plain data plus references; `swt game show --json` prints the shape a
YAML game has and the run header stores. The only functions are `premise` and role texts, evaluated once at start and
recorded.

**Rule 10. Errors at the earliest point:** editor, then `swt check`, then load. Never mid-run for anything knowable
before the first model call (options, grants, services, prompt keys, dial names).

## 4. Scaffolding and CLI

Today (`docs/CLI.md`): nouns `story`, `run`, `module`, `prompt`, `archetype`, plus `doctor`, `completion` and seven
legacy commands. "Not built yet": `story new`, `run resume`, `run watch`, `run stop`, `prompt render`, reachability in
`doctor`. Thirteen of its 28 table rows document per-game name grammars. The noun-verb form, `--json`, the exit codes
and completion are kept.

| Command | What it does | Today |
|---|---|---|
| `npm create swarmtales <dir>` | a project with the Hello Game | none (clone the repository) |
| `swt game new <name>` | a game folder from a template (`--template hello\|teams\|roles\|director\|experiment`) | "not built" |
| `swt game list \| show <game> [--json\|--yaml] \| check [game]` | the games of the project; the resolved game (mechanics in load order, grants per role, the briefing each resident gets, dials); schema plus cross-checks plus a 3-tick fake run | `story list/show/validate`, which skip 13 of 15 games |
| `swt mechanic new <name>` | a mechanic package (below) | none |
| `swt mechanic list [--provides <service>] \| show <id> \| docs [--check]` | installed mechanics; tools, events, options, services, decisions; rewrites README blocks | `module list/show` (19 of 38), `pnpm docs:mechanics` |
| `swt director new <name>`, `list`, `show <id>` | the same for Directors, with triggers, dials, needs | none |
| `swt run [game] [--fake] [--watch] [--seed n] [--set k=v] [--dial d=n] [--budget usd] [--hand] [--model p/m]` | plays a game; default game is `./game.ts` | `run start`, `pnpm start`, dozens of city flags |
| `swt run list \| show \| cost \| resume <run> \| stop <run>` | as today, plus the unbuilt ones | built except `resume`, `stop` |
| `swt verify <run>` | checks the hash chain and signature; exit 1 on a changed log | `swt log verify` |
| `swt view <run>` | opens the viewer on a run | separate app |
| `swt test` | the project's tests (vitest) with the fake model forced; a live key in the environment is ignored | `pnpm test` |
| `swt check` | typecheck, lint, `game check`, `mechanic docs --check`, tests: what CI runs | `pnpm check` (repository only) |
| `swt doctor [--online]` | Node, package versions in step, keys per provider, `SWT_*` and standard key names; `--online` makes one minimal request per configured provider and says what it costs | no network check |
| `swt explain <CODE>` | prints the docs page of an error code | none |
| `swt experiment run <file>`, `report <dir>` | seeds times arms, a table, chain check of every run | lab scripts (`pnpm lab:*`) |

**Dry runs and watch mode.** `--fake` is `--model fake/sample` (seeded legal calls from `sample`). `--model
fake/script:<file>` replays a script of calls per resident; `--model fake/replay:<run>` feeds back a recorded run's
model answers. Every fake run writes the normal signed log with `models: fake/...` in the header, and a banner in the
terminal and the viewer, so it is never mistaken for a result. `swt run --fake --watch` reruns on a change of the
game, its mechanics or prompts and prints a diff of the outcome line; `--watch` without `--fake` is refused with the
cost reason and the override `--watch --live`.

What each template contains (CI scaffolds each into a temporary folder and runs `swt check` there):

| Template | Files | Notes |
|---|---|---|
| project (`create`) | `game.ts` (11 lines), `game.test.ts` (one test on the fake model), `package.json` (scripts `run`, `test`, `check`), `tsconfig.json` (extends `swarmtales/tsconfig`), `.env.example`, `README.md`, `AGENTS.md` | `AGENTS.md` tells a coding agent where the docs index and the error catalogue are |
| game | `game.ts`, `game.test.ts`, `README.md` in the sample README format (§7) | `--template` picks one ladder sample as the start |
| mechanic | `src/index.ts` (one option, one state field, one event, one tool with `sample`), `src/index.test.ts` (`play` and `conformance`), `demo.game.ts`, `README.md` with generated blocks and the handwritten sections marked, `package.json` with the `swarmtales` keyword | passes `swt check` as generated |
| director | `src/index.ts` (one trigger, one dial, `output`, `act`, `fallback`, `sample`), `src/index.test.ts` (scripted answer, fallback path, limit), `demo.game.ts`, `README.md` | same |

## 5. Error messages

Two kinds, never mixed. A **refusal** is part of the game: a resident or Director made a call the rules do not allow;
it is an event and the caller reads a reply (`TOOL_LOCKED`). An **error** is for the developer: the game, mechanic,
Director, setup or run is wrong. This section is about errors.

**Standard.** Every error is an `SwtError` with these fields, printed in this order:

```
error SWT-G012: tool "playMov" is granted but no mechanic of the game defines it       (what)
  at game.ts:14, grants.resident[5]                                                    (where)
  The game's mechanics define: playMove, resign, postTeam, readTeam.                   (why)
  fix: did you mean "playMove"? Or add the mechanic that defines "playMov".            (how to fix)
  docs: https://swarmtales.dev/errors/SWT-G012    (or: swt explain SWT-G012)           (link)
```

- **Code:** `SWT-<area><number>`, never reused, never renumbered. Areas: `G` game definition, `M` mechanic, `D`
  Director, `R` run and kernel, `X` models and providers, `P` prompts, `L` log and chain, `C` command line and
  configuration.
- **Where:** a file and line when the source is a file, else a data path (`mechanics[1].options.size`) plus the owning
  package. **Why** states the rule in one sentence. **Fix** is an action, with a "did you mean" from edit distance
  where a name was mistyped.
- One error class with `code`, `summary`, `where`, `why`, `fix`, `details` (machine-readable); `--json` prints it as
  an object. The catalogue (`errors.ts` per package) is the source of the reference pages. A lint rule forbids `throw
  new Error(` in public packages.
- Several problems are reported together (a validator returns a list), sorted by file position.

**Ten rewrites of real errors.**

| # | Today | Source | Rewritten |
|---|---|---|---|
| 1 | `grid-game: the options do not match the schema` | `kernel/src/host/define.ts` 231 | `SWT-G020: option "size" of grid-game must be an integer from 2 to 10, got "3x3"` / at `game.ts:9, mechanics[0].options.size` / fix: `size: 3`; all options: `swt mechanic show grid-game` |
| 2 | `story: tool "playMov" is granted, locked or configured, but no loaded mechanic defines it` | `loader.ts` 140 | the example above (`SWT-G012`), with which of the three places and a "did you mean" |
| 3 | `story: "consensus" requires "consensus-source", which no loaded mechanic provides` | `loader.ts` 45 | `SWT-G030: mechanic "consensus" needs the service "consensus-source", and no mechanic of the game provides it` / installed providers: grid-game, morris / fix: add `gridGame()` to `mechanics` |
| 4 | `Unknown story "tictactoe". Known: cityofkeys, whispers, ... (40 names), or a .yaml/.json story file` | `apps/cli/src/main.ts` 110 | `SWT-C004: no game "tictactoe"` / looked in: `./game.ts`, `./games/`, installed packages / closest: `tictactoe-teams` / fix: `swt game list` |
| 5 | `Missing API keys for provider "anthropic": ARENA_ANTHROPIC_API_KEY` / `Export the key or use --provider scripted (offline).` | `core-play.ts` 77 | `SWT-X001: no API key for provider "anthropic"` / checked: `SWT_ANTHROPIC_API_KEY`, `ANTHROPIC_API_KEY`, `.env` / fix: put the key in `.env`, or run offline with `swt run --fake` / `swt doctor` shows every provider |
| 6 | `prompt "marks/tools/pay" of marks: no file in the story, the owner's folder or the library` | `packages/prompts/src/lookup.ts` 49 | `SWT-P003: mechanic "marks" declares the prompt "tools/pay" but has no text for it` / looked in: the three paths, printed / fix: give `description` inline, or create the first path. Found by `swt check`, not in a run |
| 7 | `judge: the input prompt "judge/input" does not end with {{standingOrders}}` | `name-checks.ts` 111 | removed: the platform appends standing orders (§2.3). Until then: `SWT-D010`, with why (a human's orders must be the last thing the model reads) and the line to add |
| 8 | `marks: has state but no snapshot slice` | `define.ts` 122 | removed for schema state (automatic snapshot). For a custom state: `SWT-M014: mechanic "marks" keeps state that cannot be saved` / why: a run must stop and resume at any tick / fix: declare `state` as a schema, or add `snapshot: { save, load }` |
| 9 | `marks: the payload of "marks_spent" does not match its schema` | `loader.ts` 203 | `SWT-M021: mechanic "marks" emitted "marks_spent" with a wrong payload: /remaining must be a number, got undefined` / at `mechanics/marks/src/index.ts:98` (the emit call) / the run stopped at tick 14, event #212; the log up to there is valid |
| 10 | `story: overseer "terminator-1" (acme/terminator) needs rollDice, which the story does not grant to it` | `name-checks.ts` 75 | `SWT-G041: Director "terminator-1" needs the tool "rollDice", and the game does not grant it` / "rollDice" is defined by `contest` / fix: `grants: { "terminator-1": ["rollDice"] }`, or leave `grants` out to accept what the Director asks for |

Two more need a rule, not only wording. `chess: the match needs exactly two sides, not 3` is thrown inside `state`
(`mechanics/chess/src/index.ts` 110); a mechanic should declare such checks (`check: (options, game) => issues`) so
`swt check` reports them with a path. And `host: the run failed (...); create a new host` (`kernel/src/host/host.ts`
730) hides the first failure behind the second; the cause must lead.

## 6. Documentation system

**Structure** (the four kinds, strictly separated; a page belongs to one):

| Kind | Content | Source |
|---|---|---|
| Tutorials | the three first hours (§2) and the ladder (§7), one page per sample | the sample's README, included, never copied |
| How-to guides | one task each: mix models per resident, add a secret, write a service, open a decision, resume from a snapshot, publish a plugin, compare two runs, write a YAML game | handwritten; code included from tested files |
| Reference | API (TypeDoc from TSDoc), mechanics and Directors (generated READMEs), game schema (from Typebox), CLI (from the command table), error catalogue (from `errors.ts`), event reference (kernel events from their schemas), glossary | generated; edits happen in code |
| Explanation | how a run works (tick, turn, pipeline), the log and the chain, determinism versus auditability under the two schedulers, the decision gate, design lessons (today's `LESSONS-LEARNED.md` checklist), related work | handwritten |

**Generated parts and what feeds them.**

- **TSDoc on every export** (owner's decision) feeds the TypeDoc API reference and editor hovers. `@example` blocks
  are extracted and compiled in CI. `api-extractor` writes one `<package>.api.md` report per public package; a change
  of it is the trigger of the DX review (§8).
- **Typebox descriptions** feed five places from one string: the option tables of the READMEs, the game JSON Schema
  (editor completion in YAML), the tool parameter text a model reads, the generated option interfaces (§3 rule 8), and
  `swt mechanic show`. `conformance` fails on a missing description (today `checkOptionsDocumented` covers options
  only; extend it to events, tool parameters, decision proposals and Director outputs).
- **Mechanic and Director READMEs** keep today's format (`docs/MECHANIC-README.md`) and marker blocks. Changes: the
  generator takes a glob instead of the `MECHANICS` list; a Director README gets its own blocks (triggers, dials,
  output, needs, limits); the "Example" section is generated from the package's `demo.game.ts`.
- **The game schema** is composed from the installed mechanics' option schemas, which closes the gap
  `docs/STORY-FORMAT.md` admits today (mechanic sections are "open" objects without completion).

**Docs tested in CI.** A fenced code block in the docs is one of three things, and a lint fails on any other: (1) an
include of a region of a file in `samples/` or a template, which CI compiles and runs; (2) a `ts` block marked
`check`, compiled against the public packages; (3) a `sh` block marked `run`, executed against the fake model with its
printed output compared to the block below it. Blocks that cannot be tested (a live run) are marked `no-test` with a
reason and are listed in a report. Links and anchors are checked. The error catalogue test asserts that every code has
a page and every page a code.

**Versioning.** Before 1.0: one docs version, built from `develop` (next) and `main` (latest). From 1.0: docs per
minor version from release tags, with "since" on every reference page (TSDoc `@since`). The runtime revision
(`docs/RUNTIME-REVISIONS.md`) gets its own reference page, because it decides whether runs compare.

**The README's role.** A landing page of at most 120 lines: what it is in three sentences, the Hello Game (the 11
lines and two commands), one recorded moment with its log line, the three persona entry links, honest limits, licence.
Run stories and the loophole catalogue move to the site (explanation). The README's code block is an include of sample
1 and is tested like any other.

**For agents.** The site also builds `llms.txt` and `llms-full.txt`, and each package ships its README and API report
in the npm tarball, so an agent without network finds the docs in `node_modules`. The fresh agent test (§8) reads
exactly these.

## 7. The sample ladder

Rules for every sample: its own package under `samples/NN-name/`; `swt check` and a fake run in CI; a `game.test.ts`
that asserts on the log; no import from another sample except where the ladder says "builds on"; the tutorial page is
the README. A sample over its line budget fails CI, because a long sample means the API got worse. The README format
is fixed: **What you build** (two sentences), **Run it** (the fake and the live command, expected output), **The
code** (included regions with a sentence each), **What is new** (against the step before, linked to reference), **Try
next** (three edits with their expected effect), **Reference** (the mechanics and API pages used).

| # | Sample | Learning goal | New against the step before | Files | Lines (code) | The README teaches |
|---|---|---|---|---|---|---|
| 1 | Hello Game: tic-tac-toe, two residents, Haiku, under one minute | a game is data; run, replay, verify | everything: `defineGame`, residents, one mechanic, model, `--fake`, the viewer | `game.ts`, `game.test.ts` | 11 + 15 | the run folder, the log and `#seq`, the fake model, cost |
| 2 | Combine mechanics: team tic-tac-toe with chat and a vote | mechanics compose through services | teams, three mechanics, a service one provides and another needs, grant overrides, `--set` parameters | `game.ts`, `game.test.ts` | 30 + 25 | reading a mechanic README, the missing-service error, variants as parameters, the same game as YAML |
| 3 | Roles and secrets: a hidden-role game (one saboteur) | residents differ and know different things | `roles`, a secret dealt by seed, premise and role texts, audiences, mixed models per resident | `game.ts`, `roles.ts`, `game.test.ts` | 60 + 30 | what a resident sees, the secret guard, seeds |
| 4 | Director and dials: add the shipped Gamemaker | a model that steers, and a number that says how much | `directors`, `dial`, grants for a Director, limits and cost caps, fail-open | `game.ts`, `game.test.ts` | 45 + 30 | a Director's powers are grants; reading `director_answered`; two runs with the dial at 0 and 8 |
| 5 | Own mechanic: guess the number | write a rule | `defineMechanic`: options, state, event, tool, `sample`, refusal, `play`, `conformance`, generated README | `src/index.ts`, `src/index.test.ts`, `demo.game.ts`, `README.md` | 45 + 35 + 10 | refusals versus errors, determinism (`rng`), snapshots for free |
| 6 | Own Director with decisions and the Human Hand: the Trickster | amend a decision; a human overrules | a decision in the mechanic of sample 5 (builds on it), `defineDirector`, `ctx.amend`, standing orders, `--hand` | `src/index.ts`, test, `game.ts` | 40 + 40 + 15 | the decision gate, human priority, "human-influenced" runs |
| 7 | Experiment: does the Trickster change who wins? | from a game to evidence | `defineExperiment`: seeds, arms (dial 0, 5, 10), metrics from facts and events, report, `swt verify` on every run, compare in the viewer, snapshot and resume | `experiment.ts`, `metrics.ts`, test | 40 + 30 + 20 | arms and seeds, what is reproducible and what is only auditable, citing a run |
| 8a | Expert: the parallel scheduler | residents act on their own clock | `scheduler: parallel(...)`, what changes in a mechanic (no turn order), the chain as the audit | `game.ts`, test | 35 + 30 | the two schedulers, which guarantees each gives |
| 8b | Expert: a sandboxed plugin | run a third-party mechanic without trusting it | the plugin manifest, capabilities, the sandbox boundary | `plugin/`, `game.ts` | 90 + 15 | trust, what a plugin can reach |
| 8c | Expert: your own model | plug in a provider or a local model | `defineModel`: request, tool calls, usage and cost, the conformance test for a model | `model.ts`, test, `game.ts` | 60 + 30 + 10 | the model contract, tool-choice quirks (today's `--tool-choice` for Gemma) |

Changes I propose to the agreed ladder:

1. **Split step 8 into 8a, 8b, 8c.** It bundles three unrelated skills; each is its own sample, in no order.
2. **Three topics are folded into early steps instead of getting steps:** a test in every sample from step 1 on (the
   fake model makes offline testing the first habit); the YAML form of the same game in step 2; mixed models per
   resident in step 3, the most used experiment setup in the run history (`stories/tictactoe-teams/runs/README.md`).
3. **Step 6 builds on step 5.** The only dependency in the ladder, and it shows the real relation: a mechanic declares
   a decision, a Director holds it.
4. **Step 7 includes snapshot and resume,** because "one shared start, many continuations" is the platform's research
   claim (`README.md` lines 95-96).
5. **A step 0 that is a docs page, not a sample:** "Take the tour", `npx swarmtales run tictactoe --fake` and the
   viewer, for a reader who wants to see before building.
6. **Shipped games are not samples.** City of Keys, Whispers, chess and the others move to a gallery with their run
   histories; a sample never grows into a showcase.

## 8. DX acceptance tests

### 8.1 The fresh agent test

**What it proves.** That the docs alone suffice. An agent with no context is the cheapest honest stand-in for a
newcomer, and its transcript shows where it was stuck.

**Protocol.**

1. A clean container: Node, an empty folder, the packed release candidates of the public packages in a local registry,
   the built docs as files (`llms.txt` and pages). No repository checkout, no network except the registry, no API key;
   all runs use the fake model.
2. Three tasks, one fresh agent session each, one prompt of at most ten lines with no hint about the API: build a game
   from installed mechanics that ends with a winner; write a mechanic for a small rule (for example
   rock-paper-scissors, best of five) with a test and play it; write a Director with a dial that may amend a decision,
   and show a run where a scripted human overrules it. The concrete tasks rotate from a pool with every release, so
   the docs cannot be fitted to them.
3. The agent may read the docs and `node_modules`, run `swt` and edit files. Limits per task: 30 minutes, 60 tool
   calls, a fixed token budget.
4. A grader in code runs hidden checks: `swt check` green, a fake run with the required events in the log, `swt
   verify` green, imports from public entry points only, line budgets (game 60, mechanic 120, Director 120).
5. The transcript is kept and mined for **friction events**: an error met twice, a docs search without a hit, a look
   into package source code, a guessed API name that does not exist.

**Pass criteria.** Each task passes the hidden checks within the limits in at least 4 of 5 repetitions; no read of
package source beyond `README.md` and `.d.ts`; every error the agent met led to a fix within two further tool calls
(else that message is a bug); no friction event repeats from the last release.

**When it runs.** Before every release candidate (a failure blocks the release), weekly on `develop` as a trend, and
on demand for an `api-surface` issue. The mid-tier model decides the pass; the small model is a harder, non-blocking
signal. The cost is a standing budget the owner approves once. Once per minor version a person who has not seen the
project does the three first hours with a screen recording; the notes become `dx` issues.

### 8.2 Time-to-first-run budgets

Measured by script in CI on a cold cache (install and fake run) and by hand before a release (live).

| Budget | Target | Hard limit (blocks release) |
|---|---|---|
| `npm create` to the end of the first `swt run --fake` | 60 s | 120 s |
| The Hello Game on Haiku, wall clock | 45 s | 60 s |
| The Hello Game on Haiku, cost | 0.005 USD | 0.01 USD |
| Model calls in the Hello Game | 9 | 12 |
| Lines of the Hello Game `game.ts` | 11 | 15 |
| `swt mechanic new` to a green `swt test` | 30 s | 60 s |
| `swt director new` to a fake run with a settled decision | 30 s | 60 s |
| Editor: completion after `gridGame({` | 1 s | 2 s (type-check time of sample 2 under 3 s) |

The last row matters: deep inference (§3 rules 2 and 4) can make the editor slow, and a slow editor is worse than a
missing check.

### 8.3 API review checklist

Applied to every change of a public export.

1. Can the tutorial sentence that introduces it be written first, in plain words?
2. Is there exactly one way to do this? What does it replace?
3. Does the editor complete every name the user must type? Any bare `string` where a reference fits?
4. Is every wrong use an error at the earliest point (editor, check, load)? Is there a type test (`@ts-expect-error`)
   per misuse?
5. Does each new error have a code, a fix line and a catalogue page?
6. TSDoc with `@param`, `@returns`, `@throws` and an `@example` that compiles? Typebox descriptions?
7. Do defaults make the small case small? What is the line count of the smallest correct use?
8. Does the name match the glossary (§9)? No new synonym?
9. Does it work with the fake model, in `play()`, and in YAML or JSON form (or is it marked code-only)?
10. Is it serialisable into the run header, so a run records what was configured?
11. Does the hover type fit in a few lines (no ten-parameter generic shown to the user)?
12. Which sample or how-to shows it, is that code tested, and did the samples' type-check time stay inside the budget?

### 8.4 How the DX veto works in the issue workflow

- **Scope.** What a user of a public package sees: exported names and shapes, CLI commands and flags, error texts and
  codes, file formats, templates, samples, docs. Not internals, performance work or the kernel's private structure.
- **Trigger.** An issue that changes any of these gets the label `api-surface`. In a pull request the trigger is
  mechanical: a diff in a `*.api.md` report, the CLI command table, the error catalogue, `samples/` or `templates/`.
  `CODEOWNERS` assigns these paths to the DX role; branch protection on `develop` requires that review.
- **Two gates.** Before work starts, an `api-surface` issue carries the user-facing sketch (the code a user writes,
  the error they get) and the DX role approves it. The pull request is then checked against the sketch and the
  checklist.
- **A veto has a form.** It names the checklist item, states the user harm in one sentence and gives a
  counter-proposal. The DX role answers within one working day (in agent workflows, the same session), else the change
  proceeds.
- **Escalation.** After one round without agreement, both sides write three lines and the owner decides; a decision
  that sets a pattern goes into the API guidelines page.
- **The veto is also a duty.** The DX role owns the fresh agent test, the budgets and the samples; their failure
  blocks a release like a failing unit test.

## 9. Naming

Review of the vocabulary for a newcomer. "Keep" means the word works; the notes say what to watch.

| Term | Verdict | Note |
|---|---|---|
| **Game** | keep, and use it alone | Recommendation on the brief's question: do not make "story" a kind of game in the API. "Story" is already used for the output (`docs/FROM-RUN-TO-STORY.md`, the novelist). One word for the definition (Game), one for the narrative written from a run (story). Narrative games are games that use the narrative mechanics (acts, levels, cast) |
| **Mechanic** | keep | Drop "module" (`swt module list`) and "plugin" as synonyms |
| **Director** | keep, **with a clean-up** | Collides with three existing uses: the `director` rules of `defineStory` (`packages/sdk/src/define.ts`, "the director's staged rules" in `README.md` line 111), the "direction" dial (`--figure-direction`, `apps/cli/src/host/direction.ts`) and the `gamemaker` built-in grant name. In the new code the scripted rules are called **script** (the mechanic already is), the dial is a **dial**, and "gamemaker" is only the name of one shipped Director |
| **Resident** | keep | A newcomer expects "agent" or "player". Say once: "residents are the AI agents that play". Remove "competitor" (`competitorIds`, `CompetitorId`) and `--agents`. "Seat" and "side" stay as game words inside mechanics |
| **Human Hand** | keep as the feature's name; API word `human` | Evocative but opaque on first read; the glossary line must say "a person's interventions in a running game". Avoid "the hand" alone |
| **Dial** | keep | Define against "option": an option changes what the rules are; a dial is an integer from 0 to 10 that changes how strongly something acts, and is what experiment arms vary |
| **Grant** | keep, simplify the neighbours | Today four words decide who may call a tool: `suggest`, `serves`, `grants`, `locked`. Proposal: a tool says who it is `for` (replaces both `suggest` and `serves`), the game `grants` (overrides), and a mechanic may `lock` and `unlock` during play |
| **Service** | choose this one | Today three words for one thing: "API" (`defineApi`, `MarksApi`), "service" (`kit.provide`, the README section, `service_called`) and "capability" in discussion. "API" is taken by the TypeScript API. Use **service**: a mechanic `provides` and `needs` services. "Capability" is reserved for what a sandboxed plugin may reach (sample 8b) |
| **Kernel** | keep, drop the synonyms | Today "kernel" (package), "host" (`packages/kernel/src/host`, `createHost`), "core" (`CoreStory`, `source: "core"`, "the core's own tools"). Public docs say kernel; the event source becomes `kernel` |
| **Minute** | flag for the architecture paper | A virtual step called "minute" reads as wall-clock time (the README's "At minute 13"). With a parallel scheduler it may not exist. Proposal: the kernel's unit is a **tick**; a mechanic may present ticks as minutes |
| **`ARENA_*`** | rename | `SWT_*`, and read the providers' standard names (`ANTHROPIC_API_KEY`) as a fallback |
| **Classifier / Confessor** | pick one | README says "Confessor (classifier)", code says `classifier`. One name per Director: the shipped package name is the name |

**Proposed glossary** (the reference page, in the order of first use in the tutorials):

- **Game:** the definition of a closed society: residents, mechanics, Directors, models. Plain data.
- **Resident:** an AI agent that plays in a game. It has a role, private memory and the tools the game grants.
- **Mechanic:** one rule of a game, shipped as code: state, tools, events. A game lists the mechanics it uses.
- **Tool:** an action a resident or Director can take. Every call passes the same checks and is logged.
- **Run:** one play of a game with a seed and models. **Seed:** the number that fixes everything random in the engine.
- **Log:** the append-only, numbered, hash-chained record of a run. **Event:** one line of it; `#212` cites one.
- **Fake model:** a stand-in that makes seeded legal calls. Offline and free.
- **Grant:** the permission for a role or a Director to call a tool.
- **Refusal:** the rules said no to a call; part of the game. **Error:** the game, a plugin or the setup is wrong; for
  the developer, with a code.
- **Service:** a typed interface one mechanic provides and another needs.
- **Role:** the part a resident plays: text, secrets, team. **Secret:** information dealt to some residents and
  guarded from the others.
- **Director:** a model that is not a resident. It observes and acts only through granted tools and decisions.
- **Dial:** an integer from 0 to 10 that sets how strongly a Director or mechanic acts. Recorded in the run.
- **Decision:** an outcome a mechanic proposes and holds open for a window, so a Director or a human may amend it.
- **Human Hand:** a person's interventions in a running game (instruct, amend, pause), each logged. **Standing
  order:** an instruction from it that stays in force for a stated time.
- **Snapshot:** the saved state of a run at a tick, from which it can be resumed.
- **Experiment:** many runs of one game over seeds and arms, with a report. **Arm:** one setting of it (a dial value,
  a model).
- **Scheduler:** what decides when residents act: turn-based and seeded, or parallel. **Tick:** one step of the
  kernel's clock.
- **Kernel:** the small engine under everything: clock, log, tool pipeline, scheduler. It knows no game words.
- **Plugin:** a package that ships mechanics, Directors or models.

A lint on the docs and on exported identifiers rejects the retired synonyms (story for a game, overseer, module,
competitor, host, core, API for a service).

## Open decisions

| # | Decision | Options | Recommendation | Reason |
|---|---|---|---|---|
| 1 | The user-facing package | (a) one package `swarmtales` with subpaths `/mechanic`, `/director`, `/testing` and the `swt` binary, re-exporting scoped internals; (b) scoped packages only (`@swarmtales/sdk`, `@swarmtales/cli`, ...) | (a) | "One install, one import" is the first line of every tutorial. The scoped packages stay as the real units |
| 2 | Shape of `defineMechanic` | (a) one object, inferred between properties; (b) head and body as today | (a) if a type test on a chess-sized mechanic passes with readable errors, else (b) without `defineHead` | It removes the largest block of ceremony. Risk is real (see Risks 1); decide by spike, not by taste |
| 3 | Where tool and Director texts live | (a) inline strings by default, files optional, every text overridable by key; (b) files only, as today | (a) | A first mechanic in one file. Overriding by key keeps today's layering (game over mechanic over library) |
| 4 | YAML and JSON games | (a) first-class, schema composed from installed mechanics, taught in sample 2; (b) TypeScript only; (c) as today | (a) | A game is data anyway (run header, viewer). Compile-time checks are lost, so the load-time checks must carry the same error codes |
| 5 | The fake model | (a) `sample` required on every tool and Director, enforced by conformance; (b) optional, random arguments from the schema as a fallback | (a) | Schema-random arguments are mostly refused and show nothing. A required `sample` costs three lines and buys the offline path, docs examples and fuzzing |
| 6 | Docs site generator | (a) VitePress with typedoc-plugin-markdown; (b) Docusaurus (versioning built in); (c) Starlight | (a) before 1.0, revisit at 1.0 | File includes of code regions are built in, which the tested-docs rule needs; versioning is not needed before 1.0 |
| 7 | Error code format | (a) `SWT-G012` (area letter and number); (b) mnemonic (`GAME_TOOL_UNKNOWN`); (c) both | (a), with the slug in the docs URL | Numbers survive renames; mnemonics drift. Refusal codes for residents stay mnemonic because models read them |
| 8 | Time unit name | (a) tick in the kernel, minute as a presentation; (b) keep minute | (a), owned by the architecture paper | The parallel scheduler has no shared minute |
| 9 | Hover docs for options | (a) generated `options.gen.ts` interfaces from Typebox descriptions; (b) accept type-only hovers | (a) | Completion without descriptions sends the user to the README for every option |
| 10 | Teams and roles as game-level data | (a) fields of `defineGame`, typed against residents, read by mechanics through the kernel's resident attributes; (b) options of each mechanic as today | (a) | Removes four copies of the same object and makes ids checkable. Needs the kernel paper's agreement that "team" is an attribute label, not a game word in the kernel |
| 11 | Fresh agent test: blocking model and budget | (a) mid-tier model blocks, small model informs; (b) small model blocks | (a) | A release should not hang on the weakest model's variance; the trend still shows it |
| 12 | `swt doctor --online` | (a) opt-in flag, one minimal request per provider, cost printed first; (b) never call out | (a) | "Is my key valid" is the most common first failure; today's doctor says it cannot tell |
| 13 | Old names in the transition | (a) no aliases in the new repository; (b) deprecated aliases for one version | (a) | All runs are redone anyway (brief); aliases would keep two vocabularies alive |

## Risks

1. **Type-level ambition.** Rules 2 and 4 of §3 and the one-object mechanic rest on deep inference: unreadable errors,
   slow editors, or inference that breaks on a large mechanic. Mitigation: the spike of issue 2 before the kernel API
   is fixed, the type-check budget of §8.2, and the load-time check as the fallback that always exists.
2. **The one-minute Hello Game** rests on provider latency we do not control. Mitigation: the tested number is the
   model-call budget (9); the docs say "about a minute".
3. **Fake runs mistaken for results.** A played game with a winner looks real. Mitigation: the header field, the
   banner, and `swt experiment` refusing fake runs without `--allow-fake`.
4. **Second-system effect in DX itself.** Scaffolds, watch mode, explain, experiments and a docs pipeline are a lot.
   Mitigation: the order of the issue list; samples 1, 5 and 6, `--fake`, `check` and the error standard first.
5. **Generated code drift** (option interfaces, README blocks, API reports). Mitigation: one command writes all, one
   check fails on any, no handwritten text inside markers.
6. **The veto as a bottleneck** when agents open many pull requests. Mitigation: the mechanical trigger, the one-day
   rule, sketches approved in the issue.
7. **Inline texts weaken prompt review** against today's files and `swt prompt list`. Mitigation: `swt game show
   --prompts` prints every text a resident or Director will read, with key and origin.
8. **Unmeasured baseline.** The times in §1 are estimates. Mitigation: issue 1 measures the old repository with the
   same protocol, so the rewrite has numbers to beat.

## Proposed first issues

1. **Baseline the old DX.** Run the fresh agent protocol against `swarmtales_old`; record times and friction events.
2. **Spike: one-object `defineMechanic` and typed `defineGame`,** as types only, on a chess-sized mechanic; decide
   decision 2.
3. **The three tutorial openings and sample 1 as failing tests,** written before the API and green as it lands.
4. **Glossary and name lint.** The glossary page and a lint that rejects retired synonyms in exports and docs.
5. **`SwtError` and the error catalogue,** with `swt explain` and the lint against bare `throw new Error`.
6. **Fake model `fake/sample` and the `sample` conformance check.** With the one-call `play()` in the testing package.
7. **`swt run` for any game file, with `--fake`.** One runner; no registry; `--set` and `--dial`.
8. **`npm create swarmtales` and the project template.** Scaffolded in CI and checked.
9. **`swt game check`,** with load-time checks that mirror the compile-time ones under the same codes.
10. **`swt mechanic new`, `mechanic docs` by glob, generated option interfaces;** no registration lists.
11. **`swt director new` and the generic Director runtime.** No per-Director runtime; typed triggers; dials.
12. **Docs site skeleton with tested code blocks:** includes from samples, the three block kinds, `llms.txt`.
13. **TypeDoc and api-extractor reports; `CODEOWNERS` for the API surface.** The mechanical trigger of the DX review.
14. **Time-to-first-run budgets as CI jobs.** Cold install, fake run, scaffold-to-green, sample type-check time.
15. **Samples 2 to 7, one issue each,** in ladder order, each with its README in the fixed format.
16. **The fresh agent test harness.** Container, task pool, hidden checks, friction-event report; a release gate.
17. **`swt doctor --online`, `swt run --watch`, samples 8a to 8c.** The last tranche.
