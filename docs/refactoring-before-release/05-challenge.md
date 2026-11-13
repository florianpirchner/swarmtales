# 05 Challenge: what is wrong, unproven or missing in papers 01 to 04

Role: challenger. Phase 1 paper, see [`BRIEF.md`](BRIEF.md). Analysis only. The owner's fixed decisions are not
reopened; where a paper reopens one, that is named. Every number about the current code was re-measured on 2026-11-13
in this repository (`wc -l`, `grep`, the run folders). Nothing could be executed: the container has no `node_modules`,
so no claim in any of the five papers rests on a run of the code. Papers are cited as 01 (architecture), 02
(experiment science), 03 (game design), 04 (developer experience).

## 1. Verdict

1. **For a rewrite.** Two game formats, two runners, two event formats, a kernel of 4127 code lines with role words,
   and 1085 lines of `mechanics/shared` that exist to reproduce a deleted engine's bytes: all measured, all real.
2. **Against a rewrite.** The same evidence says the expensive parts are healthy: 13 of 15 games already use the new
   format, the 19 game mechanics import one legacy table each, and `test/mechanics` (20,078 lines, 100 files) already
   tests mechanics through the API that 01 wants to keep. A staged recut (delete the old format, sign envelopes, move
   overseers and the human out of the kernel, recut the City cluster) reaches 01's goals in the old repository.
3. **What a staged recut cannot reach** are the owner's other decisions: a clean history under Apache 2.0, a new
   vocabulary without aliases, tests inside packages, limits enforced from commit one. Those are cheaper from zero.
4. **Decision: a new repository, but a port, not a redesign.** 01 is right and says so; 03 and 04 are redesigns of
   the two things that work (the game mechanics and the mechanic API), and 02 adds a research platform on top.
5. The union of the four papers is about 25 library packages, 40 plugin packages, 10 samples, 74 "first" issues and
   four different orders of work. It is not one plan. Built as written it is the second system.
6. **Must be carried, not rewritten:** `packages/chain`, the viewer, `packages/prompts`, `random.ts` bit for bit, the
   pure rule code (`model.ts` and its like) of the 13 games, the README generator, the conformance checks, and each
   mechanic's test file together with the mechanic.
7. **Must not happen:** a new mechanic API and a new game frame (`match`) and new prompts in the same step as a new
   kernel. Then no failure can be attributed, and the old runs stop being a baseline (02 says this; nobody else heard).
8. **The owner's own example is the test.** "Why does exile need puzzles" is answered on paper by 01 and 03, and
   scheduled last by both (M7, step 15). It has to be proven by milestone 3, with a slice of the City.
9. **Nobody priced it.** No paper states agent tokens, calendar time or a stop rule. Section 5 and 6 give the first
   estimate and a kill criterion.
10. **Bottom line:** go, with the cut list of section 6, one shared order, and the twelve decisions of section 7 made
    before the first issue is opened.

## 2. Fact check

54 claims checked. C = confirmed, I = imprecise (direction holds, number or wording off), W = wrong, U = could not be
verified here. Paths are what was read or counted.

| # | Claim | Paper | Verdict | Evidence |
|---|---|---|---|---|
| 1 | Kernel 5180 raw lines, 4127 code lines | 01, brief | C | `packages/kernel/src/**/*.ts`: 5180; non-blank, non-comment 4127 |
| 2 | Kernel has 34 files | 01 | I | 36 `.ts` files (28 in `host/`, 8 at top level) |
| 3 | `host.ts` 764 lines, ratchet 639; `overseers.ts` ratchet 476 | 01 | C | `eslint.config.js` lines 42-43; general limit there is 400 code lines |
| 4 | Concern table: overseers 884, define and kit 612, decisions 307, human 279, turns 208 | 01 | C | `overseers.ts` 582 + `define-overseer.ts` 178 + `orders.ts` 124; `define.ts` 257 + `kit.ts` 355 |
| 5 | Word counts in kernel: order 339, overseer 247, decision 238, consult 102, human 94 | 01 | I | substring count gives 394, 255, 258, 106, 107; guard 65, gamemaker 25, judge 5 match exactly |
| 6 | "minute" 160 times in `host/*.ts` | 01 | I | 164 lines, 227 occurrences |
| 7 | `Actor` type and `BUILT_IN_NAMES` name `gamemaker` | 01 | C | `packages/contracts/src/core/values.ts` lines 14, 37 |
| 8 | 393 hits for "old engine" or "old \`" | 01 | I | 456 with a case-insensitive grep over `.ts`; same order of magnitude |
| 9 | `story.ts` 1437, `story-schema.ts` 316, `tool-names.ts` 50, `roles.ts` 100, `core/story.ts` 94 | 01 | C | `packages/contracts/src/`; `core/` is 1946 lines, not "about 1850" |
| 10 | sdk `validate.ts` 1432, `define.ts` 527 | 01 | C | `packages/sdk/src/` |
| 11 | 2 of 15 games use `StoryDefinition`, 13 `CoreStory` | 01, 03, 04 | C | `defineCoreStory` in 13 `stories/*/story.ts`; cityofkeys and whispers use `defineStory` |
| 12 | `cli/host/story.ts` 278, `main.ts` 628, `host/run.ts` 551 | 01 | C | `apps/cli/src/` |
| 13 | roles: agents 593, overseer 2177, interpret 1336, gamemaker 660; depends on `mechanic-shared` for `OVERSEER_ORDER` | 01 | C | `packages/roles/src/overseer/gamemaker.ts:33`, `order.ts:5`, `package.json:32` |
| 14 | chronicle depends on roles; testkit depends on chronicle; models depends on kernel | 01 | C | the three `package.json` files |
| 15 | Run reporter is 1300 lines | 01 | I | `packages/chronicle/src/report`: 1428 (02 has the right number) |
| 16 | The chain signs the legacy lines, not the envelopes | 01 | C | `docs/design/event-log-signing.md:143` |
| 17 | `mechanics/shared` 1085 lines, 21 APIs, `order.ts` 237 | 01 | C | 21 `defineApi(` calls; 03 says 20 (I) |
| 18 | 36 of 39 mechanic packages depend on `shared` | 01 | I | 35 other packages plus `shared` itself; not: `card-table`, `morris-referee`, `optimal-referee`. 03's "35" is right |
| 19 | Newer game mechanics import only `HOOK_ORDER` from `shared` | 01, 03 | C | ten packages checked (chess, holdem, liars-dice, morris, convoy, salt-market, clue-grid, econ-games, team-channel, grid-game) |
| 20 | `defineApi` imported by 12 mechanics | 01 | W | 7 packages mention it at all: card-table, consensus, grid-game, shared, strategy-brain, team-channel, trick-play |
| 21 | `defineMechanic` and `defineHead` from the kernel in 38 mechanics | 01 | C | 38 packages each; `reply` 35 and `refuse` 38 not reproduced (29 on single-line imports; U) |
| 22 | `exile` head requires `PuzzlesApi`; `gone.ts` calls `heldPieces`, `burn`, `contract` | 01, 03 | C | `mechanics/exile/src/head.ts:36-37`, `gone.ts:103,110,112,119`, `will.ts:48,88` |
| 23 | `exile/package.json` has no dependency on `puzzles`; the coupling is through `shared` | 03 | C | dependencies: contracts, kernel, mechanic-shared, typebox |
| 24 | `channels` uses ten APIs; `ledger` uses exile, channels, receipts; `names` uses puzzles | 01, 03 | C | `channels/src/head.ts:112-113`, `ledger/src/index.ts:43`, `names/src/index.ts:57` |
| 25 | `strategy-brain` imports `grid-game` and `team-channel` | 01, 03 | C | `mechanics/strategy-brain/src/index.ts:22-23` |
| 26 | `morris-referee` and `optimal-referee` import rule code through package roots | 01 | C | `morris-referee/src/index.ts:11`, `optimal-referee/src/minimax.ts:2` |
| 27 | `apps/cli/package.json` lists 19 City mechanics | 01 | C | 19 `mechanic-*` entries |
| 28 | `check-packages.ts` has an `ALLOWED` table and "15 commented exceptions" | 01 | I | table confirmed (line 29); the file has 12 comment lines in all |
| 29 | `test/` has 311 test files and 56,464 lines; packages have none | 01 | C | 311 `*.test.ts`, 401 `.ts` files, 56,464 lines; zero test files under `packages`, `mechanics`, `apps` |
| 30 | Those tests "and the golden logs pin the old bytes" | 01 | I | `test/golden` is 3 logs and 244 lines of test; `test/engine` 7681 lines. `test/mechanics` (20,078 lines) and `test/stories` (5195) test mechanics and games through the host API that 01 ports |
| 31 | Viewer packages are 3754 lines | 01 | I | 3759 in `.ts` only; 21 `.tsx` files were not counted; with them 5264 |
| 32 | City cluster about 15,900 lines, the 19 newer mechanics about 13,500 | 01 | C | 15,891 and 13,347 |
| 33 | Eight files read `process.env`, among them `testkit/src/mutation.ts` | 01 | C | 8 files |
| 34 | Lint needs a 12 GB heap in two passes | 01 | C | `package.json:15` |
| 35 | "GitHub Actions is disabled" | 01 (from `CLAUDE.md`) | I | `.github/workflows/ci.yml` runs the `docs` job on every push and pull request; `pages.yml` deploys the viewer on push to `main`; only the full `check` job is manual |
| 36 | Tool naming option A: "decided by Flo, 2026-11-03" | 01 | I | `docs/ideas/tool-naming.md:3` says "idea, not approved for building"; only the event header (line 63) and short names in stories (line 116) are decided |
| 37 | CEL is the decided expression language | 01 | C | `docs/ideas/overseers-and-plugins.md` §13 |
| 38 | No `temperature` anywhere in the TypeScript | 02 | C | zero matches in `packages`, `apps`, `mechanics`, `lab` |
| 39 | Chess uses the seed for the forfeit move only; econ-games, grid-game, hint-towers have no `rng(` | 02 | C | `mechanics/chess/src/index.ts:659`; zero matches in the three |
| 40 | 655 recorded runs cost 157.21 USD | 02 | C | 655 `usage.json`; sum of `totals` 157.44 here (rounding or reporter spend) |
| 41 | Run 051: 3259 lines, 299 `move_played`, report says "0 correct, 0 wrong" and "never submitted a single move" | 02 | C | `stories/chess/runs/chess-02a-051-.../run/REPORT.md` lines 25, 30, 45 |
| 42 | `RUNTIME_REVISION = 2`, two rows in the revisions table | 02 | C | `packages/kernel/src/revision.ts` |
| 43 | `000-run.json` records only agents, minutes, seed under `effective` | 02 | C | run 051 |
| 44 | Removing the moving `random()` affects games that must be named in a change register | 02 | I | no mechanic calls `.random()` (zero matches in `mechanics/*/src`); the removal is free |
| 45 | Old logs can be replayed: `tool_call` lines carry tool and arguments | 02 | C | `events.jsonl` line: `{"type":"tool_call","agent":"A02","tool":"readBrain","args":{}}`; pass order is in `pass_start` |
| 46 | Lessons log: 238 P rows, 17 LH rows, 58 checklist lines | 03 | C | `docs/LESSONS-LEARNED.md` |
| 47 | "All 13 game packages already separate a `model.ts`" | 03 | I | 12 do; `morris` has `rules.ts` and `search.ts` |
| 48 | Game `index.ts` files are 326 to 878 lines; `nextGame` job in 12 of 13; 12 games call `StrategyBrainApi` | 03 | C | grid-game 326, salt-market 878; econ-games has no `nextGame`; grid-game has no brain call |
| 49 | 14 mechanics call `exile`, 14 `channels`, 11 `ledger`, 8 `puzzles` | 03 | C | `ctx.call`/`tryCall` sites per API, exact |
| 50 | `swt module list` knows 19 of 38 mechanics | 04 | C | `MODULES` in `apps/cli/src/swt/module-cmd.ts` |
| 51 | Scripted provider does not play a core game | 04 | C | comment at `apps/cli/src/host/core-play.ts:84` (paper says 88) |
| 52 | Option errors drop the Typebox detail; `OptionsInput` is `Partial` | 04 | C | `kernel/src/host/define.ts:228-233`; `contracts/src/core/mechanic.ts:395` |
| 53 | `consensus` takes `tool` and `param` as plain strings | 04 | C | `mechanics/consensus/src/index.ts:76-77` |
| 54 | README says Node 22.19, `HOW-IT-WORKS.md` says Node 26 | 04 | C | `README.md:134`, `docs/HOW-IT-WORKS.md:73`; `.node-version` is 26.13.0 |

Reading of the table. The papers are factually careful: one wrong number (20), a dozen imprecise ones, none that
reverses a conclusion. Three imprecisions matter for the plan:

- **Row 30.** 01's case for a new repository leans on "56,464 lines of tests pin the old bytes". About 25,000 of those
  lines test mechanics and games through `playStory` and the host, not through bytes. They are the only executable
  specification of the 39 mechanics, and no paper says what happens to them. 01's table says "`test/` goldens and
  old-engine fixtures: drop" and is silent on the rest.
- **Row 35.** The brief requires limits "in check and CI". Whether Actions can be used at all is unclear from the
  repository itself: `CLAUDE.md` says disabled, the workflow file says partly on. Decision 3 in section 7.
- **Row 44 and 45.** 02's replay idea has more under it than 02's own risk 9 admits (the old lines do carry the
  calls), and its change register has one entry that affects nobody.

One fact no paper states: **the brief's "100% Apache 2.0" is a relicensing.** `LICENSE` is source-available today
("not open source in the OSI sense"), with `contracts`, `sdk`, `chain` and `viewer-core` already Apache 2.0 in their
`package.json`. See 5.8.

## 3. Contradictions between the papers

Each with the two or more positions, the resolution and the reason.

### C1. Plugin kinds, packages, layers

- 01: six plugin kinds (mechanic, Director, scheduler, actor driver, model provider, sink/reporter), 19 library
  packages, seven layers, a manifest, a lock file with integrity hashes.
- 02: six more packages (`manifest`, `metrics`, `stats`, `experiment`, `report`, `replay`); its manifest knows three
  plugin kinds (`mechanic | director | model`).
- 03: five top-level folders (`mechanics`, `rulesets`, `residents`, `directors`, `games`), a `capabilities` package,
  "about 22 mechanics, 15 rulesets and 3 resident kits".
- 04: one user-facing package `swarmtales` with sub-paths, `create-swarmtales`, `samples/` (10), `templates/` (4); a
  plugin "ships mechanics, Directors or models".

Union: about 25 library packages and 40 plugin packages, against 13 and 39 today. 01 calls 19 "the ceiling I would
defend" and did not see the other three papers.

**Resolution.** Three author-facing kinds at 1.0: mechanic, Director, model provider (02 and 04 agree; the brief's
three personas need exactly these). Scheduler, driver and sink are internal interfaces with one implementation each
until a second exists; they get no `define*` call, no manifest and no docs persona. At most 12 library packages until
the first three games run (`contracts`, `kernel`, `sdk`, `chain`, `prompts`, `models`, `runlog`, `testkit`,
`viewer-core`, `viewer-ui`, `cli`, plus one `lab` that holds metrics, stats and the experiment runner as folders).
A folder becomes a package when a second consumer wants it without the rest; that is 01's own rule and it should
bind all four papers.

### C2. How mechanics depend on each other: the word and the model

- 01: "capability" (today's `ApiDefinition`), contract in the **provider's** `/contract` sub-path, plus a small
  `std-contracts` with four entries (Accounts, Messaging, Roster, Notebook). Cross-plugin imports allowed from
  `/contract` and `/rules`.
- 03: "capability", contracts in **one central package** `@swarmtales/capabilities` with twelve standard entries,
  and a lint rule that no mechanic imports any mechanic.
- 04: "**service**"; "capability" is reserved for what a sandboxed plugin may reach.
- Today: "API" in code, "service" in events and READMEs.

These are two models, not two words. 03's central package is option C of 01 ("a shared hub as today, everyone
coupled to everything"), which 01 rejects; 01's provider-owned contract is what 03 rejects in H17 ("provider imports
the consumer's package"). 03's lint forbids 01's `/rules` reuse outright, which would force `morris-referee` to copy
the rule engine or be merged.

**Resolution.**
1. Word: **service** (04 is right: 01 itself needs "capability" for the sandbox in 6.2, and `service_called` is
   already the event name).
2. Model: provider-owned `/contract` sub-path (01). A central package only for contracts that have two providers
   **today**. Measured, that is two: the turn source (`consensus-source`, provided by `grid-game` and `morris`) and
   the game lifecycle (`brain-source`, provided by 12 games). `Accounts`, `Messaging` and `Roster` each have one
   provider; they move to a shared package on the day a second provider is written, not before.
3. Events before calls (01 and 03 agree, and it is the actual answer to the exile question).
4. `/rules` stays (01): pure functions are the cheapest reuse there is; forbidding it buys nothing.

### C3. One-object `defineMechanic` (04) against the ported head and body (01)

01: "the mechanic API of the current core is good and should be ported, not reinvented"; a new concept "would cost
the port of 39 mechanics twice". 04 changes, in one sketch: one inferred object, the factory call instead of
`.with()`, state as a Typebox schema with a derived snapshot, inline texts instead of prompt files, `for` instead of
`suggest`/`serves`, a required `sample` per tool, omitted empty parts. Today `state` is a free type `S` built by a
function, and mechanics keep `Map`s (`marks` converts one by hand).

Both cannot hold. 01's "port mechanically, rename imports" (13,347 lines) is false under 04's API: every state
shape, every prompt file and roughly 150 tools would be touched by hand. 01 is also not as mechanical as it says: it
deletes `HookPhase.order`, turns lifecycle hooks into listeners and merges `guard` and `consult` into `review`, which
touches every hook of every mechanic.

**Resolution.** Keep head and body as the semantic model, because the README generator, the composed game schema and
the compile-time checks must read a head without running a body. Allow 04's one-object form as sugar that compiles to
it, **if** 04's own spike (its issue 2) passes on `channels` (2247 lines) and `chess`, not on guess-the-number. State
as a schema becomes the default for new mechanics and optional for ported ones. `sample` is optional (section
4.4, point 2, says why). The spike runs before any kernel code, because its result changes `PluginInstance`.

### C4. Pure `Ruleset` plus one `match` mechanic (03) against porting 19 mechanics mechanically (01)

01 budgets the 19 game mechanics as "port mechanically" and calls the 13 games "the regression suite for the new
kernel". 03 dissolves all 13 `index.ts` files (7520 lines, more than half of the cluster) into one new `match`
mechanic and a new `Ruleset` interface, drops ten packages and renames the tools and events (`move_played` becomes
`action_taken`). 03's own R2 says the interface may not fit Salt Market, Convoy and Harbor Lights.

If 03 is followed, 01's regression suite does not exist (every game is new code on a new frame), 02's rule replay
needs an event mapping per game, and the wake and briefing behaviour of all 13 games changes at once, which is
precisely the r1-to-r2 class of change that cost 15% of requests unseen.

**Resolution: one variable at a time.**
1. Port four games as they are (tic-tac-toe, quarry, econ-lab, liar's dice): the kernel's regression and 02's two
   cheapest firm effects.
2. Then build `match` and `Ruleset` on those four, with the mechanical port as the differential oracle (same seed,
   same scripted calls, same outcome events). 03's evidence is real: seven turn bugs fixed one game at a time (P95,
   P104, P131, P194, P283, P329, P410).
3. If the frame carries the four games and Salt Market on paper, the other nine go straight onto it. If not, they are
   ported as they are. Either way no game is ported twice except the four that prove the frame.
4. The `match` switch is a recorded behaviour revision and gets its own small experiment, never mixed into the
   equivalence rerun.

### C5. `roster`, `phases`, `score`: kernel services or default mechanics

- 01: the kernel has an actor registry with `kind: string`, an attribute bag and suspensions; `Roster` is a contract
  in `std-contracts`; a word-list test bans "resident" from the kernel.
- 03 (D1): standard mechanics loaded by default.
- 04 (decision 10): teams and roles are fields of `defineGame`, "read by mechanics through the kernel's resident
  attributes".

**Resolution.** The kernel keeps actors, opaque attributes and suspension (it has them: `residents.ts`, 113 lines).
Teams and roles are game data that the sdk writes into attributes at genesis (04). `roster` is one small mechanic
that the sdk's game resolution adds unless the game lists its own (03), so the kernel has no default list.
`phases` and `score` are ordinary mechanics a game lists; `end` and `win` in `defineGame` are sugar that adds them.
Nothing is "loaded by default" inside the kernel, or the kernel has a game vocabulary again.

### C6. Verbatim prompts and a compatibility profile (02) against generated briefings and a new API (03, 04)

02 (D7): prompts ported word for word, r2 wake rule and context policy, "prompt rewording not allowed in the
compatibility profile". 04: the briefing is generated from each mechanic's `rules` text, texts are inline, the board
moves into the turn input, only the side on move is called. 03: generic tool names (`castBallot` for `tribunalVote`,
R7), `match` owns the briefing. 01: canonical three-part tool names with derived aliases.

02 saw it ("this tension should be decided, not discovered"). The other three did not mention it.

**Resolution.** 02 wins for the ported games, 04 wins for new games, and the API must allow both from day one:
- `packages/prompts` is carried (01) and every text stays overridable by key (04 already allows this). A ported game
  ships its old texts in `prompts/` and its old model-facing tool names as aliases. The generated briefing is the
  default only where a game has no briefing file.
- The equivalence claim is cut to what can carry it: the four firm paired series (quarry, econ-lab, harbor-lights,
  lanterns) and the chess request counts. 02's own table says that seven of the fifteen rows have no firm baseline
  (n = 1 to 3, or "conformance only"). Those games are free to take new prompts at once; their rerun *establishes* a
  baseline and constrains nobody.

### C7. How many schedulers, and what "parallel" means

- 01: three: `turns`, `parallel`, `replay` (replay is a scheduler of about 200 lines).
- 02: a closed enum `"seeded-turns" | "async-parallel"` in the manifest; replay is a package with L1 and L2 levels
  and old-log adapters; turns is the reference for every confirmatory comparison.
- 03: a third, **actor-driven** scheduler, and its sample game already uses it (`clock: { scheduler: "actor" }`).
- 04: two; but the Hello Game budget (12 model calls, "only the side on move is called") assumes 03's third one.
  04 also has a `fake/replay:<run>` model, which is 02's cassette replay a third time.

"Parallel" has three meanings in the papers: per-actor free loops with commit order by arrival (01, the brief);
concurrent model calls inside a seeded block, which exists today (`turns.ts`, `blockSize`); and many runs at once in
the experiment runner (02 for ISTAnt, P431). **None of the 15 games needs the first.** 02 recommends against using it
for evidence. 01 schedules it at M4, before Directors and before ten of the games.

**Resolution.**
1. The scheduler is an interface from the first commit (owner's decision), with `turns` as the only production
   implementation until a game asks for another.
2. "Actor-driven" is not a scheduler. It is a third activation value of `turns` (today `always | onNews`,
   `packages/contracts/src/core/turns.ts:47`): wake whoever the turn source names. About 30 lines, and it is what 03
   and 04 actually need.
3. `parallel` is a time-boxed spike plus sample 8a after the first rerun, with 01's `basis` field in the envelope
   from day one so the log format does not change later. No fair queue, admission control, stale policy or lane
   release before a game uses them.
4. Replay is one thing, a test tool in `testkit` (feeds recorded calls, compares events). Not a scheduler plugin, not
   a package, not a model.
5. The manifest's scheduler field is an open plugin id plus options hash (01), not an enum (02).

### C8. What the kernel budget counts

- Brief: "under 1500 lines". `docs/ideas/monorepo.md:105`: "about 1500 lines in files of at most 400".
- 01: 1500 **code** lines plus 40 exports; its own estimate is 1420, 80 lines of slack.
- 02: eight telemetry events "about 120 lines in the kernel", `sawSeq`, typed Director views enforced by the kernel.
- 03: grants per role, team, seat and phase, a grant as an effect, audiences on every event, `drain`, free looks.
- 04: `SwtError` with where, why and fix for every kernel error; a `check` hook.

01's slack is spent three times over by the other papers. And 01's budget is met by moving, as it admits: `kernel`
1500 + `sdk` 1800 + `schedulers` 1000 + `director-host` 900 + `human-hand` 400 + `runtime` 600 = 6200 planned code
lines for what `packages/kernel` does today in 4127. The engine grows by half while the package named kernel shrinks.

**Resolution.** Count code lines (01 is right, TSDoc would eat a raw budget). Add a second test: **engine total**
(kernel plus everything a run cannot start without: sdk authoring, the turn scheduler, runtime assembly) at most 4100
code lines, today's kernel. Six of 02's eight telemetry events describe model requests, which the kernel never makes;
they are driver events and cost the kernel nothing but `activation.record`. Each of 03's requests needs an issue that
shows it cannot be a stage handler in a mechanic.

### C9. Milestone and port orders

| | First thing built | Then | City |
|---|---|---|---|
| 01 | a new tiny mechanic (guess or coin-pass) | M3 liar's dice, tic-tac-toe teams, hold'em; M4 parallel; M5 Directors; M6 ten games | M7 |
| 02 | manifest, prompt fixing, replay of all 15 games | noise floor and bridge on the **old** code; quarry, econ-lab, harbor-lights, lanterns first | step 5 of 5 |
| 03 | tic-tac-toe solo on `roster`, `match`, `Ruleset`, `score`, actor scheduler | reference, memory, teams, econ-lab, blind-bid, liar's dice ... morris | steps 14, 15 |
| 04 | samples 1, 5, 6 as failing tests before the API; `npm create` | samples 2 to 7 | a gallery, no sample |

Four orders. 02's four cheapest proofs sit at 03's steps 5, 9 and 11 and inside 01's M6. 03's step 1 needs seven new
things. 04 writes tutorials for an API that 01 defines at M1 and M3. **Resolution:** the order of section 6: one
fixture mechanic inside the testkit (01, 04 sample 5), tic-tac-toe as the first game (03, 04 sample 1, old logs
exist), then quarry and econ-lab (02), then a City slice, then the frame decision of C4.

### C10. What a Director is

- 01: `defineDirector({ id, prompt, output, triggers, tools, fallback })`; the model acts through tools.
- 04: `on`, `system`, `input`, `output`, `act` as **code** by default, `dials`, `sample`, `limits`.
- 03 (D5): the scripted `script` becomes a Director named `cues`; "the owner's definition 'model actors' would widen
  to 'non-resident actors'". 04 says the opposite: the scripted rules stay the `script` mechanic.
- 02: a judge is "an actor ... run after the game, not a Director inside it"; `role: "resident" | "director" |
  "judge"` is a closed list, against 01's open actor kind.

**Resolution.** 03's D5 reopens a fixed decision (Directors are model actors) and is rejected; `script` stays a
mechanic acting as actor `script`, which 01's `ActorId` already has. 04's shape wins over 01's (structured answer,
code acts) because it is what the judge and classifier do today and it is testable offline; model-driven tool use is
the declared exception. 02's post-game judge is not a Director and not an actor kind: it is an analysis step in the
lab that reads a finished log.

### C11. Is "story" a kind of game

01: no `kind` field ("would invite the second format back"). 04: no kind; "story" is the narrative written from a
run. 02 (D11): kind `story`, reported as invariants. 03: `kind: tabletop | experiment | story`, "a label with
defaults". Two against two.

**Resolution: no `kind` in schema version 1** (01, 04). A label that "sets defaults" is a format switch under another
name; the report shape follows from which metrics a game's mechanics declare (02's own design). `tags` is free text
for the catalogue. The brief asks for a recommendation and this is it.

### C12. Study or experiment, and where arms live

02: `ExperimentSpec` in `@swarmtales/experiment`, arms as override diffs. 03: `defineStudy` "owned by the lab", and
also `arms` inside `defineGame`. 04: `defineExperiment` in sample 7. **Resolution:** the word is **experiment** (two
papers and the glossary). A game declares typed `params` (03 and 04 agree, and it replaces 232 lines of name-parsing
regular expressions in `stories/index.ts`). Arms exist only in the experiment as overrides of params (02). `arms` in
the game is dropped: it would put the study design into the object under study.

### C13. Smaller contradictions

| Topic | Positions | Resolution |
|---|---|---|
| Tool names | 01: canonical `<package>/<mechanic>/<tool>` with a derived alias; 03: bare names, a clash is a load error with `as:`; 04: references as values | canonical in the log, bare in the game when unique, a clash is an **error** (03). A derived alias is a silent change of what the model reads |
| Logical time | 01, 04: `tick`; 02: "logical minute", `clock_tick`; 03: "seeded minutes", `turns(2)` | `tick` in kernel and envelope; a game labels it |
| "Reference" | 03: a silent scorer; 02: "reference scheduler", "reference metric"; 04: a docs kind; `CLAUDE.md`: shipped stories "as references" | the scorer is a **referee** (the packages are already called that) |
| "kind" | actor (01), plugin (01), game (03), scheduler (02), block and claim (02), input (today) | reserved for the actor kind; everything else gets its own noun |
| Run report | 01: port the reporter (model-written) at M7; 02: computed facts, typed claims, "no reporter spend" | 02's computed facts table first; it fixes the run 051 defect for free. Typed claims wait (4.2) |
| Where runs live | 01: `games/<name>/runs/`; 02 (D10): a data repository; 04: `runs/001` in the user's project | 02: `stories/` holds 766 MB today |
| Game is data | 04 rule 9 and 01 5.1: plain data, no logic; 03: `build: (p) => ({...})` with spreads and conditionals | params substitute into data; no `build` function, or YAML parity (04 decision 4) is lost |
| Public package | 04: `swarmtales` with sub-paths; 01: authors import `@swarmtales/sdk` only | scoped packages inside; the umbrella is a publish-time re-export |
| Base mechanics | 01 ports `team-channel` and `card-table` at M3; 03 drops both as packages | follows C4: ported as they are first |
| CI | brief: limits "in check and CI"; `CLAUDE.md`: Actions disabled; 01: CI from M0; 04: about ten CI jobs, `CODEOWNERS`, branch protection; 02: Python loader check in CI | decision 3 of section 7. Without it half of 04 and all of 01's enforcement is a local convention |

## 4. The five weakest points of each paper

### 4.1 Paper 01 (architecture)

1. **The budget is arithmetic on guesses.** "Assembly 764 to 250" and "dispatch 479 to 280" are targets, not
   measurements, and the sum leaves 80 lines. In practice the first real feature (grants per seat, audiences) lands
   in `sdk` or `runtime`, the kernel test stays green, and the engine is bigger than today (C8). The exported-symbol
   cap of 40 is equally unfounded: nobody counted today's exports.
2. **The kernel gains concepts while losing lines.** `ExternalInput`, `basis`, the `STALE` check, safe points, the
   `review` stage that leaves and re-enters the lane, interval heads, a revision tuple. Each is new behaviour with no
   user among the 15 games. 01's own risk list says the lane release "lets the world change under an approved call";
   that is a correctness bug designed in for a mode nothing uses.
3. **Six plugin kinds, a manifest, integrity pinning, `--trust`, a serialized-boundary test mode and a QuickJS
   spike for zero third parties.** 01 names this risk itself and then keeps all of it in the plan. The claim that
   today's `MechanicPort` is "close" to JSON-only is unverified; `ctx.call` returns values into synchronous rule code
   and listeners are closures. "Perhaps 150 lines" will be a rewrite of the port.
4. **"Port mechanically" is contradicted by the same paper.** Removing hook order numbers, turning hooks into
   listeners and merging two stages changes the execution order of every mechanic. With the tests "dropped", nothing
   detects a changed order. Section 2, row 30: the mechanic tests must be ported with the mechanics.
5. **The City comes last, and the fallback does not exist.** M5 builds `director-host`, `decisions` and `human-hand`
   for "a game with a judge and a scripted human", an invented user; the real and only user arrives at M7. Open
   decision 9 offers "port as is behind one preset" as the fallback, but `mechanics/shared` and its order tables,
   which "as is" needs, are deleted in 4.3. By M7 the API is frozen by 13 turn games that use no Director, no
   decision, no exile and no act.

### 4.2 Paper 02 (experiment science)

1. **A research-operations platform for a 50 USD budget.** Six packages, a manifest, a run registry, preregistration
   with external anchors, blind judging with two model families and a human calibration set, a sentinel battery, a
   leak lint, a typed-claims language. The evidence it would protect today: four paired effects. Only `stats` and
   `metrics` have two users. The typed-claims checker (count, order, quote, absence queries over a log) is a query
   language with no user and a model that must learn to write it.
2. **"Acceptance of the rewrite, scientifically" cannot be passed.** Fifteen rows with two to four criteria each,
   margins chosen by eye on n = 8 to 12. The paper's own power table gives 80% for the firm effects at that n; the
   chance that all rows pass with a perfect port is small, and the paper that demands one primary metric per
   experiment applies about forty at once to the rewrite. In practice a row fails, nobody can say whether it is the
   kernel, the model or chance, and the rerun is repeated until it passes, which is the selection 2.4 forbids.
3. **Stage 0a is called free and is not.** Free in dollars. In work it is an adapter per game from legacy lines to
   new calls, plus an event mapping wherever names change, plus reconstruction of job firings and deadlines. Risk 9
   retracts the "655 runs" claim to "the baseline series only". Under 03's recut (new events, new deck labels) the
   replay and the seeded-world goldens of stage 0b fail by design; 02 did not know.
4. **Telemetry and policy placed in the wrong layer.** Six of eight "kernel" events are about model requests; the
   kernel makes none (01, 2.1). `contextPolicy` is a manifest field with id, version and params that no paper
   designs. A comparability key over prompt hashes splits the data at every text edit; the mitigation (mechanics mark
   cosmetic parts, with a test) is one more mechanism.
5. **Scope beyond the question.** Section 4 designs the ISTAnt study, section 3.5 a judging protocol, 2.4 an
   anchoring service. Each adds prerequisites to the platform ("typed Director views" enforced by the kernel, a
   template camera) before one game runs. The bridge needs the **old** repository installed and running in the same
   week as the new one; nobody owns keeping it runnable after it is archived.

### 4.3 Paper 03 (game design)

1. **`match` is the next `arena`.** Series, seats, rotation, duplicate deals, who is to act, deadline, forfeit,
   fresh context, briefing, intermission, hidden scores and aids in one mechanic, with one `Ruleset` interface that
   the paper says may not fit three of thirteen games, to be fixed by letting "a ruleset own timed sub-phases",
   which ends its purity. One implementation, written before its users. See C4 for how to earn it.
2. **The rule of two is stated and then broken.** `doors`, `split-secret`, `factions` and `cast` have one user each
   (the City). `trial` has two users that are both City tribunals. `auction` joins an all-pay seal and a lot engine
   with different rules; `holdings` joins puzzle pieces and market goods; `objectives` counts Salt Market's contracts
   as a "second user" on paper. D9 half concedes. Twelve capabilities and 22 mechanics is a framework, and R1 says
   so.
3. **A long list of requests to the kernel.** Grants per role, team, seat and phase; a grant as an effect; audiences
   on every event, fact and view; Director sight by grant; `drain`; free looks; no wake after an own action; a third
   scheduler; `end` and `win` conditions. The paper calls them "requests to the kernel paper". 01 budgeted none.
4. **Renaming breaks the baseline and the lessons.** Generic tools (`castBallot`, `claimItem`, `callTrial`) change
   what every model reads; R7's mitigation (aliases and prompts per game) restores the old words by hand, per game.
   Many P rows were fixed by the exact wording of a description or a refusal. The new `deck` replaces Hold'em's own
   deck and `card-table`: other stream labels, other deals, so old and new runs are no longer paired on the seed
   (02's D3 assumes they are).
5. **No size, no cost, and the City last again.** There is no line estimate for any new mechanic and none for how
   much of the 15,891 City lines disappears. Port steps 14 and 15 introduce eleven and nine concepts after thirteen
   steps of "one or two". The inventory comes from READMEs and call sites; nothing was run. `kind` with defaults
   (C11), `defineStudy` (C12), the scripted Director (C10) and `build` functions (C13) each collide with another
   paper or a fixed decision.

### 4.4 Paper 04 (developer experience)

1. **The API rests on type inference nobody tried.** Resident ids checked against `residents`, a missing service as
   a template-literal type error, `about: keyof Static<P>`, generated option interfaces proven equal by a type test,
   completion in one second. No spike ran (no `node_modules`), and today's lint needs 12 GB. Meanwhile issue 3
   writes the tutorials "as failing tests before the API". If inference fails on `channels`, the tutorials, samples
   and error catalogue are rewritten.
2. **A required `sample` on every tool is the wrong tool for the job.** For a board game a legal random call needs
   the rule engine, which is 03's `legal()` and `forfeit()`; two papers invented the fake player twice. For talk
   tools it produces noise. A fake City run of random legal calls proves nothing and looks like a result (04's own
   risk 3). Derive the fake player from the turn source where one exists; make `sample` optional elsewhere.
3. **A developer-relations programme for a project with no external user.** `npm create`, four templates, watch
   mode, `swt explain`, an error catalogue with a lint against `throw new Error`, a docs site with three tested
   block kinds, `llms.txt`, TypeDoc, api-extractor, ten samples with line budgets that fail CI, time budgets as CI
   jobs. Every package is `private: true` and nothing is on npm. The order in "Proposed first issues" helps; the
   total does not shrink.
4. **The fresh agent test is a flaky release gate.** Three rotating tasks, five repetitions, "4 of 5", judged on a
   model whose version changes under it, weekly, at a "standing budget" with no number. It measures how well an
   agent reads `.d.ts` files. Issue 1 baselines the old repository, which cannot be installed from a registry, so
   the comparison is not like for like. Useful as a trend; unfit to block.
5. **The veto is a queue.** `CODEOWNERS`, branch protection, two gates and a one-day rule, triggered by any diff in
   an `*.api.md` report. With TSDoc on every export that is nearly every pull request until M5, in a project where
   the reviewers are agent sessions and the only person is the owner. And the one-minute Hello Game (12 calls, board
   in the turn input, only the side on move) dictates `grid-game` and scheduler behaviour, which moves the "calls
   ratio 3.4" that 02 uses as a tolerance for tic-tac-toe.

## 5. What all four papers missed

### 5.1 Cost and duration

No paper gives a number. The facts available:

- Size to replace: 34,176 lines in `packages`, 6411 in `apps`, 30,323 in `mechanics`, 3312 in `stories`, 1493 in
  `scripts`, 780 in `lab`: about 76,500 source lines, plus 56,464 lines of tests.
- Observed pace: pull requests #117 to #155 between 2026-11-06 and 2026-11-13, about five merged per day, each a
  small step on a working platform with no challenger and no TSDoc rule.
- Planned work: 74 "first issues" across the papers (about 60 after merging duplicates), which reach roughly 01's M3.

Estimate, to be replaced by measurement: the union plan is 350 to 500 issues. With a builder and a challenger per
issue and the new limits, three merged issues per day is optimistic: **four to six months**. The plan of section 6 is
about 130 to 170 issues: **seven to ten weeks**. Agent tokens were not measured by anyone and will exceed the live
model spend (02's 50 USD) by a wide factor; the Opus-for-kernel rule makes the first milestones the most expensive
per line. **Requirement: every issue records its token use and wall time from issue 1**, so that after M1 the
remaining cost is an extrapolation and not a hope.

### 5.2 How to know the rewrite is done

01 ends at "a third-party example plugin is installed". 02 ends at fifteen equivalence rows. 04 ends at release
gates. 03 has no end. One definition is needed; proposed in section 6 (the 1.0 list in 5.9).

### 5.3 Users, the viewer, the Pages site, npm names, run data

- **npm.** Nothing is published. `swarmtales` (the name of `apps/cli`) and the `@swarmtales` scope should be
  reserved before a public Apache repository advertises `npm create swarmtales`. 04 also assumes a domain
  (`swarmtales.dev`). Both are actions outside the repository and need the owner's go.
- **Pages.** `pages.yml` publishes the viewer from `main` of this repository, and the page reads runs from GitHub.
  Renaming the repository to `swarmtales_old` changes that address and may break links in run READMEs. Nobody plans
  the move.
- **The viewer and old runs.** 01 "replaces" the reader of the legacy line format. The old runs are the baseline by
  the owner's decision; if the new viewer cannot open them, the baseline can be read only in an archived app. Keep
  the legacy reader (it is read-only and small) next to the envelope reader.
- **The VS Code extension** is listed as "carry" by 01, but its schema support serves the old game format (04, 1.1).
  It is a port, and a late one.
- **Run data and the lessons log.** 766 MB under `stories/`, 21 MB under `examples/`. `docs/LESSONS-LEARNED.md` (238
  rows) and `docs/CROSS-GAME-FINDINGS.md` cite run paths in this repository. Which documents move, and how their
  links resolve (a tagged commit of `swarmtales_old`), is unplanned. `library/` and `archetypes/` appear in no
  target layout.

### 5.4 Losing the differential test

Today's correctness argument was byte equality with the old engine. 01 lists the loss as a risk without a remedy; 02
proposes replay; 03 mentions scripted bots in one line (R4). The remedy has to be produced **in the old repository,
before it is archived**, while it still installs:

1. For each game, export oracle files: seed, the scripted call sequence (taken from recorded live logs, row 45), and
   the mechanic events the current code emits. That is a few megabytes of JSON, valid whatever the new API looks
   like.
2. Port every mechanic together with its test file from `test/mechanics`. A port without its tests is not accepted.
3. Freeze the old repository as runnable: tag, lockfile, `.node-version`, and a recorded `pnpm check` result. 02's
   bridge depends on this as well.

Without step 1 the new platform is checked only against itself.

### 5.5 The City of Keys is ported last by everyone

It is the home game, half of the mechanic code (15,891 lines), the only user of Directors, decisions, the Human
Hand, exile, acts, snapshots with resume, and of `digest` and `novelist` (about 6000 lines). Three papers put it
last; 04 leaves it out of the ladder. 01's argument (thirteen games harden the contract first, so the City does not
bend the kernel) is half right: those thirteen exercise none of the features above. The likely outcome at M7 is a
frozen API that does not fit, and then either a late bend of the kernel or a 1.0 without the game the project is
named after.

Remedy: a **City slice at milestone 3**. Six scripted residents, `talk` (board and DM), `ledger`, exile as `removal`
with no knowledge of pieces, one piece-owning mechanic that listens to the removal event, one decision, one
Director, a pause by the human, a snapshot and a resume. A few hundred lines of game. It proves the owner's example
and every kernel seam the tabletop games do not touch. The full City stays late; the proof does not.

### 5.6 Testing strategy

No paper has one. Today there are 0.74 test lines per source line, a mutation harness (`packages/testkit/src/
mutation.ts`, mutant lists in `docs/design/mutants-*.json`) and type tests; none of the four papers mentions the
mutation harness. Missing decisions: whether tests count towards the line limits (the brief says a higher limit);
what replaces the goldens (5.4); property tests for pure rule code; a coverage or mutation floor for the kernel; the
type-test budget; which tests run per package and which only in the full check. Minimum: kernel and sdk keep a
mutation score gate; each ported mechanic keeps its tests; each game has one scripted end-to-end test and one oracle
file.

### 5.7 Issue-driven work with `main` and `develop`, done by agents

Only 04 touches the workflow, and only for its veto. Open: who may open an issue (an agent, or only after the
owner's go, as "brainstorm before building" in `CLAUDE.md` implies for design); what an issue must contain ("done
when", allowed paths, the test that proves it); how many agents work on `develop` at once (generated files such as
API reports, READMEs and the lockfile conflict on every parallel pull request); who merges `develop` into `main` and
when (nothing is released before 1.0, so `main` should move only at milestone tags); and where the challenger sits
(a required review on the pull request, by another model). `CLAUDE.md` and `AGENTS.md` of the new repository must be
written before issue 1, since every agent reads them first. A limit of three open pull requests keeps the
generated-file conflicts manageable.

### 5.8 Apache 2.0 relicensing mechanics

The decision is fixed; the mechanics are missing from every paper.

- `LICENSE` today is source-available with a commercial restriction; `LICENSE-FAQ.md` calls a port a derivative
  work. The owner is the licensor and `CONTRIBUTING.md` has a contributor agreement that allows relicensing, so he
  can do it. The new repository needs the Apache text, a `NOTICE` file, `"license": "Apache-2.0"` in every
  `package.json`, and a header rule (one SPDX line per file, checked by ESLint).
- The archived repository keeps the old licence unless it is changed too. Code carried from it into an Apache
  repository is then offered under two licences; say so in the FAQ.
- Third parties: `typebox`, `yaml`, `chess.js`, `@earendil-works/pi-agent-core` and `pi-ai` (licences to be read
  from the installed packages; not possible here), and **`stockfish.js`, GPL-3.0**, used by `lab/chess-engine.ts`.
  The engine must stay an optional tool outside every published package, and 02's primary chess metric depends on it.
- Apache grants no trademark. The FAQ says the name stays protected; that needs its own short statement.
- Content is not code: prompts, game texts, run data and generated novels. 02 raises a data licence for ISTAnt only.
- The agreement in `CONTRIBUTING.md` (relicensing "under any terms, including commercial") should be reconsidered
  for an Apache project; a sign-off rule is the usual choice.

### 5.9 Release criteria for 1.0

Missing everywhere. Proposal: (1) one format, one runner, one event format, chain over envelopes; (2) the kernel and
engine-total budgets hold; (3) all games that the owner lists for 1.0 run offline against their oracle files and
have one recorded live baseline; (4) the four firm effects are reproduced in sign; (5) the City plays Act I and Act
II at six residents; (6) the three first-hour tutorials pass as tests; (7) a mechanic and a Director written outside
the repository run from a packed install; (8) licence, notices and names are in place. Everything else in the four
papers is after 1.0.

### 5.10 Smaller gaps

- `ARENA_*` keys, the alias constants in `packages/models/src/providers.ts` and the cloud runtime that strips
  `ANTHROPIC_API_KEY` (`CLAUDE.md`): 04 renames, nobody checks the runtime constraint.
- The Act II base snapshot is in the old engine's format (02's D8 sees it; 01 and 03 do not).
- 01 drops `HOOK_ORDER` and says order is load order plus `after:`. 03's R3 says the City's order "exists for a
  reason". No paper shows that the City's reactions can be expressed with `after:` alone. The City slice (5.5) is
  the cheap test.
- The reporter's loophole candidates are part of the owner's after-run routine (`CLAUDE.md`). 02's "no reporter
  spend" removes them until typed claims exist. Keep the model draft for loopholes only, under 02's "unverified"
  heading.

## 6. The smallest plan that still meets the owner's decisions

### 6.1 Cut list

| From | Cut or postpone until after 1.0 | Keep |
|---|---|---|
| 01 | plugin kinds scheduler, driver, sink; manifest, lock file, `--trust`; QuickJS spike; serialized-boundary mode; `parallel` beyond a spike; lane release in `review`; `stale` policy; interval heads; `std-contracts` with four entries; `director-host`, `human-hand`, `runtime` as packages (folders first) | kernel extraction; one format; envelopes signed; `basis` in the envelope; the scheduler interface; `/contract` and `/rules`; the layer check; canonical names in the log; key broker and canary test |
| 02 | registry, preregistration and anchoring; judging plan; sentinel battery; leak lint; typed claims; `contextPolicy`; six packages; 15-row acceptance; ISTAnt prerequisites | run manifest with prompt hashes and sampling fields; computed facts table with "absent"; `stats` and `metrics` as folders of `lab`; noise floor; the four-series rerun; old-log oracle (5.4); `random.ts` bit for bit; behaviour-revision golden test |
| 03 | the 12 standard capabilities as a package; `trial`, `factions`, `doors`, `split-secret`, `holdings`, `objectives`, `auction`, `deck`, `allowance`, `secrets` as new general mechanics; `kind`; `defineStudy`; `build` functions; scripted Director; generic tool renames | exile without puzzles, by events; `roster`; typed `params`; `match` and `Ruleset` earned on four games (C4); "who is to act" as an activation rule; the lessons-to-guarantees list G1 to G12 as review criteria |
| 04 | `npm create`; watch mode; docs site and tested-block lint; `llms.txt`; samples 7, 8a, 8b, 8c; time budgets in CI; fresh agent test as a gate; `CODEOWNERS` veto machinery; `options.gen.ts`; required `sample`; compile-time resident ids | one runner for any game file; `--fake` from the turn source; `SwtError` with path and fix for load errors; scaffolds for mechanic and Director; samples 1, 5, 6; glossary and name lint; the API checklist as a pull-request template |

### 6.2 The first five milestones

| # | Milestone | Content | Done when |
|---|---|---|---|
| M0 | **Oracle and frame** (old repository, then new) | oracle files for the games in M2 to M4 and the City slice (5.4); old repository tagged and proven runnable; new repository with licence, notices, `CLAUDE.md`, limits, layer check, both budget tests, token logging per issue; decisions of section 7 recorded; the `defineMechanic` type spike on `channels` and `chess` | the spike has a verdict; an empty package passes the check; oracles exist |
| M1 | **Skeleton** | contracts, kernel, sdk, `turns`, scripted driver, `runlog` with the chain over envelopes, manifest; the fixture mechanic; **tic-tac-toe** ported as it is with its tests | tic-tac-toe matches its oracle; `swt log verify` passes; the carried viewer opens the run; kernel under 1500 code lines |
| M2 | **Live and measured** | models with key broker, the pi driver, budget, canary test; computed facts table; quarry and econ-lab ported as they are; noise floor (five replicates) and the two paired series | both firm effects keep their sign at 12 seeds, for about 2 USD; no canary in any artefact |
| M3 | **City slice** | services and events between mechanics, snapshot and resume, one decision, one Director (04's shape), the human's pause, exile without puzzles (5.5) | the slice replays exactly from its log and resumes from a snapshot; no `uses` cycle; `exile` names no other game mechanic |
| M4 | **Frame decision and the bulk** | `match` and `Ruleset` on the four ported games against their mechanical ports (C4); then the remaining nine games on the winner; harbor-lights and lanterns rerun | every tabletop game matches its oracle or a registered change; four firm effects reproduced in sign |

After M4: the City recut (Whispers first), the parallel spike, samples 2 to 4, publishing, 1.0 by the list of 5.9.
API freeze happens after the City, not before it.

### 6.3 Kill criterion

Measured, checked at the end of M2, and agreed before M0 starts. **Stop the new repository and fall back to a
staged recut inside the old one if any of these holds:**

1. M0 to M2 took more than **twice** the issue count or token budget set for them in M0 (the budget is set from the
   M0 measurement; without a number there is no criterion, so setting it is part of M0).
2. The kernel exceeds 1500 code lines, or the engine total exceeds 4100, with only tic-tac-toe, quarry and econ-lab
   running.
3. Either firm effect (quarry open against brain, econ-lab cooperation) changes sign in the new runs while the
   bridge run on the old code keeps it.

A second, softer check at the end of M3: if the City slice needs a kernel change that the tabletop games did not,
the kernel API is not frozen and M4 waits for it. The fallback is not a loss: oracles, the manifest, the computed
facts table, the exile recut and the licence work all apply to the old repository unchanged.

## 7. Decisions for the owner before any code

Ordered by how much later work depends on each.

| # | Decision | Options | Recommendation | Reason |
|---|---|---|---|---|
| 1 | Port or redesign of the mechanic API | (a) head and body ported, one-object form as sugar if the spike passes; (b) 04's new API as the only form; (c) 01's port with no sugar | (a), decided by the M0 spike on `channels` and `chess` | it fixes `PluginInstance`, every mechanic and every tutorial; 39 mechanics prove the current model, nothing proves the new one |
| 2 | One variable at a time | (a) new kernel first with games, prompts and tool names as they are, then frame, then prompts; (b) everything at once | (a) | otherwise no failure can be attributed and the old runs are no baseline (C4, C6) |
| 3 | Is CI available | (a) Actions on for the new repository with the full check required on pull requests; (b) local check with a recorded result per pull request; (c) as today | (a) once the repository is public, (b) until then | the brief's limits, 01's layer rules and 04's review trigger all assume it; today it is partly off (row 35) |
| 4 | Budget and stop rule | (a) token and issue budget for M0 to M2 plus the kill criterion of 6.3; (b) no budget | (a) | no paper priced the work; without a number the rewrite cannot fail, only continue |
| 5 | Scope of 1.0 | (a) the list of 5.9; (b) the union of the four papers; (c) only the tabletop games, City after 1.0 | (a) | defines "done"; (b) is four to six months; (c) ships without the home game |
| 6 | City slice early | (a) at M3 as in 5.5; (b) City only at the end (01, 02, 03) | (a) | the only early test of Directors, decisions, the human, resume and the exile example |
| 7 | Oracles from the old repository | (a) produce oracle files and port mechanic tests (5.4); (b) new goldens only | (a), before the archive | replaces the lost differential test; the old code must be runnable for 02's bridge anyway |
| 8 | Dependencies between mechanics | (a) "service", provider-owned `/contract`, shared package only for contracts with two providers, events first; (b) 03's central capabilities package; (c) 01's `std-contracts` with four entries | (a) | (b) rebuilds the hub the owner complained about; (c) invents three contracts with one provider |
| 9 | The game frame | (a) `match` and `Ruleset` earned on four games, then decided; (b) built first (03); (c) never (01) | (a) | 03's evidence is real, its interface is unproven on three games |
| 10 | Schedulers at 1.0 | (a) the interface, `turns` with a "to act" activation, a parallel spike and sample; (b) a production parallel scheduler at M4 (01); (c) three schedulers (03) | (a) | meets the fixed decision (pluggable) without hardening a mode no game uses and 02 advises against for evidence |
| 11 | What the rerun must prove | (a) four firm effects in sign plus chess request counts, the rest establish new baselines; (b) 02's fifteen rows | (a) | (b) cannot be passed by a correct port (4.2 point 2) and freezes all prompts for it |
| 12 | Names, licence, data | (a) reserve the npm name and scope now, Apache with `NOTICE` and SPDX headers, Stockfish kept outside, runs in a data repository, lessons log moved with links to a tag of the old repository; (b) decide at release | (a) | each is cheap now and awkward after a public launch; two need the owner's go as actions outside the repository |

Decisions the papers ask for that follow from the above and need no separate ruling: `tick` (C13), no `kind` (C11),
"experiment" (C12), Director shape (C10), budget counting (C8), tool names (C13), `roster` placement (C5).
