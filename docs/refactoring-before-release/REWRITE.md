# REWRITE: the merged proposal for the rewrite before release

Status: **proposal, phase 1 (analysis and definition). Nothing is built.** The owner decides the next step.
Date: 2026-11-13.

This paper merges four role papers and one challenge into one plan. Where the papers disagree, it follows the
resolution of the challenge unless stated otherwise. Read this paper first; the others are the evidence.

| Paper | Role | What it gives |
|---|---|---|
| [`BRIEF.md`](BRIEF.md) | owner's decisions | the goal and the fixed decisions that no paper reopens |
| [`01-architecture.md`](01-architecture.md) | software architect | measured state of kernel and packages, new kernel, scheduler, layering, security, milestones |
| [`02-experiment-science.md`](02-experiment-science.md) | experiment scientist | seeds, manifest, reproducibility levels, statistics, rerun plan and budget, ISTAnt |
| [`03-game-design.md`](03-game-design.md) | game designer | inventory of 39 mechanic packages, 26 historical couplings, recut, anatomy of a Game |
| [`04-developer-experience.md`](04-developer-experience.md) | developer experience | audit for three personas, first hour, typed builder rules, CLI, errors, docs, sample ladder |
| [`05-challenge.md`](05-challenge.md) | challenger | fact check of 54 claims, 13 contradictions with resolutions, cut list, smallest plan, kill criterion |

## 1. Verdict

1. **Go for the new repository, as a port and not as a redesign.** The measured problems are real: two game
   formats, two runners, two event formats, a kernel of 5180 lines (4127 code lines) against a target of 1500, and
   1085 lines in `mechanics/shared` of which a good part exists only to reproduce the bytes of a deleted engine.
2. **The expensive parts are healthy and are carried or ported, not reinvented:** the mechanic model (head and body,
   typed services between mechanics, the tool pipeline), the 13 newer games, the chain log, the viewer, the prompt
   package, the seeded random generator, the mechanic README generator and the mechanic tests.
3. **The union of the four papers is not one plan.** Together they ask for about 25 library packages, 40 plugin
   packages, 10 samples and 74 first issues in four different orders. Built as written that is the second system.
   The plan below is the cut version: about 130 to 170 issues, estimated seven to ten weeks, against four to six
   months for the union. Both numbers are estimates from the pull-request pace of the last week and must be
   replaced by measurement after milestone M1.
4. **One variable at a time.** A new kernel, a new mechanic API, a new game frame and new prompts in the same step
   would make every failure unattributable and would end the old runs' value as a baseline. Order: kernel first with
   games, prompts and tool names as they are; then the game frame; then prompts.
5. **The owner's example is the acceptance test.** "Why does exile need puzzles" must be fixed and proven at
   milestone M3 with a slice of City of Keys, not at the end.
6. **There is a stop rule.** Section 7 gives a measurable kill criterion at the end of M2.

## 2. The answer to "why does exile need puzzles"

Confirmed in code by three papers (fact check rows 22 and 23 in the challenge):

- `mechanics/exile/package.json` has no dependency on the `puzzles` package. The coupling runs through
  `mechanics/shared`: the exile head requires the puzzles service (`mechanics/exile/src/head.ts:36`), and the code
  that runs when a resident is exiled calls `heldPieces`, `burn` and `contract` on it (`gone.ts:103-119`,
  `will.ts:48,88`).
- The reason is history. The old engine had one function `World#onExiled` that did everything that follows an
  exile: burn the exiled resident's puzzle fragments, hand certificates to the standoff shop, rewrite level deals.
  When the engine was carved into mechanics, that function moved into `exile` whole.
- Essentially, exile needs only a roster (who is present), accounts and messaging. Its couplings to `puzzles`,
  `standoff`, `progression`, `tribunal`, `seal` and `goals` are historical.
- **The fix is a direction change:** exile emits an `exiled` event and knows nothing else. The mechanic that owns
  pieces listens and burns them; the shop listens and takes the certificates. The rule "what happens to X when a
  resident leaves" belongs to the owner of X.
- The same pattern explains most of the 26 historical couplings in paper 03: 14 mechanics call `exile`, 11 of them
  only to ask "is this resident still here"; `channels` uses ten rule services; `strategy-brain` imports
  `grid-game`; all 13 newer games load `strategy-brain` even when it is disabled because it also delivers the fresh
  context and the briefing.

## 3. Target design

### 3.1 Vocabulary

| Term | Meaning | Note |
|---|---|---|
| Game | what is played; one definition format, one runner | replaces Story. No `kind` field in schema version 1; "story" stays the word for the narrative written from a run |
| Resident | a model actor that plays | unchanged |
| Mechanic | a rule, packaged as a plugin | unchanged |
| Director | a model actor that is not a resident | replaces Overseer. The scripted `script` stays a mechanic |
| Referee | a silent scorer that judges moves against a reference | replaces "optimal referee" style names |
| Service | what one mechanic offers to others | one word instead of API, service and capability; "capability" is reserved for sandbox permissions |
| Event | a notification on the log that others may listen to | preferred over service calls for reactions |
| Tick | logical time in kernel and log | replaces "minute"; a game labels it |
| Experiment | arms, seeds and repetitions over a game | arms live in the experiment only, as overrides of the game's typed `params` |
| Human Hand, dials, grants, Plugin | as today | `ARENA_*` environment names become `SWT_*` (check the cloud runtime constraint first) |

### 3.2 Kernel

- A single-writer state machine over an append-only log with seven parts: log, state slices, actors, tool
  dispatch, services, clock and jobs, ports (scheduler, model driver, sink). No role words, no game words; a
  word-list test enforces it.
- Assembled from a `KernelDefinition` that the sdk resolves from the game ("definable kernel").
- **Two budget tests, both counting code lines** (TSDoc on every export would eat a raw-line budget):
  kernel at most 1500; engine total (kernel, sdk authoring, the turn scheduler, run assembly) at most 4100, which
  is today's kernel. The second test stops the budget from being met by moving code next door.
- What moves out of today's kernel: Directors (884 lines), the authoring API (612), the decision gate (307), Human
  Hand (279), the turn loop (208), names and grants (268). They start as folders of one package and become packages
  only when a second consumer needs one without the rest.

### 3.3 Scheduler

- An interface from the first commit (owner's decision: pluggable).
- `turns` (seeded, a port of today) is the only production implementation at 1.0 and the reference for every
  comparison that is used as evidence. It gains a third activation value, "to act": wake whoever the turn source
  names. That is what turn games and the one-minute Hello Game need.
- `parallel` (agents act on their own; calls commit in arrival order through one lane; no rollback) is a time-boxed
  spike plus one expert sample after the first rerun. The log envelope carries a `basis` field (what the actor had
  seen) from day one, so the format does not change when the mode arrives. None of the 15 games needs it today.
- Replay is a test tool in the testkit (feed recorded calls, compare events), not a scheduler plugin.
- Reproducibility levels: reproducible (turns with scripted models), replayable (any mode, the log is the
  schedule), authentic (hash chain). LLM sampling is not seeded and never was; seeds control the world only.

### 3.4 Mechanics and how they depend on each other

- **Model:** head and body stay, because the README generator, the composed game schema and compile-time checks
  must read a head without running a body. The one-object `defineMechanic` of paper 04 is allowed as sugar that
  compiles to it, if a type spike passes on `channels` (2247 lines) and `chess` before any kernel code is written.
- **Dependencies:** no hub. A provider owns its service contract in a `/contract` sub-path; pure rule code is
  shared through `/rules`. A shared contracts package holds only contracts with two providers today (the turn
  source and the game lifecycle). Events before calls. A layer check forbids cycles, forbids plugins importing the
  kernel (38 mechanics do today for `defineMechanic`) and forbids base mechanics using game mechanics.
- **`mechanics/shared` disappears.** Its order tables are dropped (order becomes load order plus `after:`; the City
  slice at M3 tests whether that suffices), its contracts move to their providers.
- **Recut of the City cluster** (19 mechanics, about 15,900 lines) follows paper 03's direction (one ballot instead
  of six vote implementations, one talk mechanic instead of five chats, removal without knowledge of pieces) but
  under the rule of two: a general mechanic is created only when two real users exist. It happens after the
  tabletop games, with the M3 slice as the early proof.
- **Game frame:** paper 03's `match` mechanic plus pure `Ruleset` objects would remove 13 copies of the same frame
  (turn order, deadline and forfeit, fresh context, hidden score), where seven turn bugs were fixed one game at a
  time. It is unproven on Salt Market, Convoy and Harbor Lights. It is earned: four games are ported as they are,
  then `match` is built on those four with the mechanical ports as the oracle, then the decision for the other nine.

### 3.5 Game definition

- One `defineGame` (today's `CoreStory`, used by 13 of 15 games). The old `StoryDefinition`, `validate.ts`, the old
  story schema and the translation layer in the CLI are dropped (about 4000 lines).
- A game is plain data: residents, teams and roles as typed game-level data, mechanics with options, Directors,
  typed `params` (replacing 232 lines of variant-name parsing in `stories/index.ts`), end and win conditions as
  sugar for mechanics. No build functions, so YAML and JSON stay equal to the TypeScript builder. The JSON Schema is
  composed from the plugins' option schemas.
- Tool names: canonical `<package>/<mechanic>/<tool>` in the log, bare names in the game when unique, a clash is a
  load error. Ported games keep their old model-facing tool names and their old prompt texts by key.

### 3.6 Directors and Human Hand

- `defineDirector` with triggers, a structured answer and code that acts on it (paper 04's shape; testable
  offline); model-driven tool use is the declared exception. One generic Director runtime instead of one model
  runtime file per Director as today.
- Human Hand is a plugin over external input at safe points. A post-game judge is an analysis step that reads a
  finished log, not a Director.

### 3.7 Science

- A `RunManifest` hashed into the chain's genesis: game definition hash, kernel revision, scheduler id and options,
  plugin versions, resolved model ids, sampling parameters, prompt hashes, seed. The chain signs the kernel
  envelopes (today it signs the flattened legacy lines, so tool and service calls are outside the signed log).
- A computed facts table in every report, built only from metrics that mechanics export, with "absent" instead of
  zero. This fixes the class of defect seen in chess run 051, where the report says no move was submitted and the
  log has 299 `move_played`. The model-written draft stays for loophole candidates only, marked unverified.
- Statistics for small n in code (paired bootstrap, permutation, effect sizes) and a noise floor: no series ever
  ran the same game, arm and seed twice, so five replicates per game come before any comparison.
- The rerun proves a small thing well: the four firm paired series (quarry, econ-lab, harbor-lights, lanterns) keep
  their sign, and the chess request counts hold. All other games establish new baselines. Budget about 34 USD on
  Haiku, cap 50 USD (for scale: the 655 recorded runs cost about 157 USD).
- Postponed until after 1.0: preregistration with anchors, blind judging protocol, typed claims, the ISTAnt
  prerequisites. ISTAnt stays the first study on the new platform.

### 3.8 Developer experience

- Three author-facing plugin kinds at 1.0, one per persona: mechanic, Director, model provider.
- The audit found no working path today for two of three personas: the docs describe the old game format while 13
  of 15 games use `defineCoreStory`, which the sdk does not export; a mechanic needs five registration sites and ten
  type parameters; a third-party Director cannot be run from the CLI at all.
- Before 1.0: one runner for any game file; `swt run --fake` (offline play derived from the turn source); scaffolds
  `swt game new`, `swt mechanic new`, `swt director new`; one error standard (`SwtError`: what, where, why, fix,
  docs link, stable code) for load errors; samples 1 (Hello Game: tic-tac-toe, 11 lines, under one minute on
  Haiku), 5 (own mechanic) and 6 (own Director with a decision and Human Hand) written as tests; a glossary with a
  name lint; the API checklist as the pull-request template. Samples 2 to 4 follow after M4.
- After 1.0: `npm create`, watch mode, the docs site with tested blocks, samples 7 and 8, the fresh agent test as a
  trend measure (not as a release gate; it is too flaky to block).
- The DX veto is kept simple: a change of a public signature needs the checklist filled in and a counter-proposal
  if DX objects; the owner decides after one round.

### 3.9 Security

- In-process plugins have no boundary; the docs say so. Keys go through a key broker and the model port, never to a
  plugin, a prompt or a log; a canary test scans every run artefact. The QuickJS sandbox, plugin manifest and lock
  file wait until a third-party plugin exists.

### 3.10 Carry, port, drop

| | What |
|---|---|
| Carry as is | `packages/chain` (extended to envelopes), viewer including the read-only legacy log reader so old runs stay readable, `packages/prompts`, `random.ts` bit for bit, pure rule code of the 13 games, mechanic README generator, conformance checks, mutation harness |
| Port | models, tool pipeline, turn loop, testkit, reporter, the 19 newer mechanics (about 13,300 lines) each with its test file from `test/mechanics` |
| Recut | the City cluster and the four Directors |
| Drop | old game format and its validator, legacy log writer, `mechanics/shared` order tables, old-engine goldens, `arena` |

## 4. Migration steps

| # | Milestone | Content | Done when |
|---|---|---|---|
| M0 | Oracle and frame | **In the old repository, before it is archived:** oracle files per game (seed, scripted call sequence from recorded logs, emitted events); tag, lockfile and a recorded green check so it stays runnable. **Then the new repository:** Apache 2.0 with `NOTICE` and SPDX headers, `CLAUDE.md` and `AGENTS.md`, ESLint limits, TSDoc rule, layer check, both budget tests, token and time logging per issue, issue and pull-request templates; the `defineMechanic` type spike | the spike has a verdict; an empty package passes the check; oracles exist |
| M1 | Skeleton | contracts, kernel, sdk, `turns`, scripted driver, chain over envelopes, manifest; one fixture mechanic; tic-tac-toe ported as it is with its tests | tic-tac-toe matches its oracle; `swt log verify` passes; the viewer opens the run; kernel under 1500 code lines |
| M2 | Live and measured | models with key broker and canary test; computed facts table; quarry and econ-lab ported as they are; noise floor and the two paired series | both firm effects keep their sign at 12 seeds (about 2 USD); no key canary in any artefact. **Kill criterion checked here** |
| M3 | City slice | six scripted residents, talk, ledger, exile that knows nothing about pieces, one piece-owning mechanic that listens to the exile event, one decision, one Director, a pause by the human, snapshot and resume | the slice replays exactly from its log and resumes from a snapshot; `exile` names no other game mechanic; no service cycle |
| M4 | Frame decision and the bulk | `match` and `Ruleset` on four ported games against their mechanical ports; then the remaining nine games on the winner; harbor-lights and lanterns rerun | every tabletop game matches its oracle or a registered change; four firm effects reproduced in sign |
| M5 | City and Whispers | recut of the City cluster, Whispers first; Act I and Act II at six residents; API freeze after this, not before | City plays Act I and II; a new Act I base snapshot is recorded |
| M6 | Release | samples 2 to 4, parallel spike and sample, a mechanic and a Director installed from outside the repository, names and publishing | the 1.0 list of section 5 holds |

Repository move: the current repository is renamed `swarmtales_old` and archived only after M0's first half
(oracles, tag, runnable proof). The Pages address of the viewer changes with the rename and run READMEs link to it;
the move needs a redirect plan. `docs/LESSONS-LEARNED.md` and `docs/CROSS-GAME-FINDINGS.md` move to the new
repository with their run links pointing at a tag of the old one. Run data (766 MB under `stories/`) goes into a
separate data repository, not into the new code repository.

Workflow in the new repository: every change has an issue with "done when", allowed paths and the proving test;
pull requests go to `develop` with a challenger review by another model; `main` moves only at milestone tags until
1.0; at most three open pull requests at a time (generated files conflict otherwise); every issue records its token
use and wall time.

## 5. Definition of 1.0

1. One game format, one runner, one event format, chain over envelopes.
2. Kernel and engine-total budgets hold; file, function and complexity limits hold with no unexplained exception.
3. Every game listed for 1.0 runs offline against its oracle file and has one recorded live baseline.
4. The four firm effects are reproduced in sign.
5. City of Keys plays Act I and Act II at six residents.
6. The three first-hour tutorials (game, mechanic, Director) pass as tests.
7. A mechanic and a Director written outside the repository run from a packed install.
8. Licence, notices, headers and package names are in place.

Everything else in the four papers is after 1.0.

## 6. Open decisions for the owner

Ordered by how much later work depends on each. Each has a recommendation.

| # | Decision | Options | Recommendation | Reason |
|---|---|---|---|---|
| D1 | Port or redesign of the mechanic API | (a) head and body ported, one-object form as sugar if the spike passes; (b) the new one-object API as the only form; (c) port with no sugar | (a), decided by the M0 spike on `channels` and `chess` | 39 mechanics prove the current model; nothing proves the new one yet |
| D2 | One variable at a time | (a) kernel first, games, prompts and tool names as they are, then frame, then prompts; (b) everything at once | (a) | otherwise no failure can be attributed and the old runs are no baseline |
| D3 | CI in the new repository | (a) GitHub Actions with the full check required on pull requests; (b) local check with a recorded result; (c) as today (docs job and Pages only) | (a) | the limits, the layer rules and the TSDoc rule are only real if a machine enforces them |
| D4 | Budget and stop rule | (a) token and issue budget for M0 to M2 plus the kill criterion of section 7; (b) no budget | (a) | no paper could price the work; without a number the rewrite cannot fail, only continue |
| D5 | Scope of 1.0 | (a) the list of section 5; (b) the union of the four papers; (c) tabletop games only, City after 1.0 | (a) | (b) is four to six months; (c) ships without the home game |
| D6 | City slice early | (a) at M3; (b) City only at the end | (a) | the only early test of Directors, decisions, Human Hand, resume and the exile example |
| D7 | Oracles from the old repository | (a) export oracle files and port mechanic tests; (b) new goldens only | (a), before the archive | replaces the lost differential test against the old engine |
| D8 | Dependencies between mechanics | (a) "service", provider-owned contract, shared package only for contracts with two providers, events first; (b) a central capabilities package; (c) a standard contracts package with four entries | (a) | (b) rebuilds the hub that caused the question about exile |
| D9 | Game frame `match` | (a) earned on four games, then decided; (b) built first; (c) never | (a) | the evidence for it is real, the interface is unproven on three games |
| D10 | Schedulers at 1.0 | (a) the interface, `turns` with "to act", parallel as spike and sample; (b) a production parallel scheduler at M4; (c) three schedulers | (a) | pluggable from day one without hardening a mode no game uses |
| D11 | What the rerun must prove | (a) four firm effects in sign plus chess request counts, the rest set new baselines; (b) fifteen equivalence rows | (a) | (b) cannot be passed even by a correct port at this sample size |
| D12 | Names, licence, data | (a) now: reserve npm name and scope, Apache with `NOTICE` and SPDX headers, Stockfish outside every package, runs in a data repository; (b) at release | (a) | cheap now, awkward after a public launch. Reserving names is an action outside the repository and needs the owner's go |
| D13 | Kernel budget counting | (a) code lines, plus the engine-total test; (b) raw lines | (a) | the TSDoc rule would otherwise punish documentation |
| D14 | Ported games keep old prompts and tool names | (a) yes until their baseline is reproduced, new games get generated briefings; (b) new prompts everywhere at once | (a) | this constrains DX polish on ported games for a while, which is the price of a baseline |
| D15 | Contributor terms | (a) sign-off rule (DCO); (b) keep the current agreement that allows relicensing under any terms | (a) | the current agreement fits a source-available licence, not an Apache project |

Settled by the merge and listed for the record (say so if you disagree): `tick` instead of minute; no `kind` field;
the word "experiment"; the Director shape of paper 04; the scripted `script` stays a mechanic; `roster` is a small
mechanic the sdk adds, not a kernel service; "referee" for silent scorers.

Two facts that need attention whatever is decided:

- **"100% Apache 2.0" is a relicensing.** `LICENSE` is source-available today. The owner is the licensor and can do
  it; the archived repository keeps the old licence unless it is changed too.
- **`lab/chess-engine.ts` uses `stockfish.js`, which is GPL-3.0.** It must stay an optional tool outside every
  published package; the primary chess metric depends on it.

## 7. Kill criterion

Checked at the end of M2, agreed before M0 starts. Stop the new repository and fall back to a staged recut inside
the old one if any of these holds:

1. M0 to M2 took more than twice the issue count or the token budget set for them in M0.
2. The kernel exceeds 1500 code lines or the engine total exceeds 4100, with only tic-tac-toe, quarry and econ-lab
   running.
3. A firm effect (quarry, econ-lab) changes sign in the new runs while a bridge run on the old code keeps it.

Softer check at the end of M3: if the City slice needs a kernel change that the tabletop games did not need, the
kernel API is not frozen and M4 waits. The fallback loses little: oracles, manifest, computed facts table, the exile
recut and the licence work apply to the old repository unchanged.

## 8. First issues

For M0 and M1 only. Later milestones get their issues when the one before is done.

**M0, old repository**

1. Export oracle files for tic-tac-toe, quarry, econ-lab and liar's dice (seed, scripted calls, emitted events).
2. Export oracle files for the remaining tabletop games and for the City slice.
3. Tag the repository, record a green `pnpm check`, document how to run it after the archive.
4. Measure the noise floor on the old code: five replicates of one arm of quarry and econ-lab.
5. Fix the wrong report of chess run 051 or mark it (the log has 299 moves).

**M0, new repository**

6. Repository scaffold: pnpm workspace, tsdown, strict TypeScript, `main` and `develop`.
7. Apache 2.0 licence, `NOTICE`, SPDX header rule, third-party licence inventory.
8. `CLAUDE.md` and `AGENTS.md`: issue-driven workflow, challenger review, model roles, limits.
9. ESLint limits: 300 lines per file (warn 250), 50 per function, complexity 10, exception format.
10. TSDoc on every export: eslint-plugin-jsdoc, api-extractor reports, Typebox description rule.
11. Layer check and the two budget tests (kernel 1500, engine total 4100 code lines), word-list test.
12. Issue and pull-request templates with the API checklist; token and wall-time record per issue.
13. CI: full check on pull requests (depends on D3).
14. Type spike: one-object `defineMechanic` on `channels` and `chess`, with editor timing; verdict for D1.
15. Glossary and name lint.

**M1**

16. Contracts: envelope with `basis`, actor, tool, service, event, game definition version 1.
17. Kernel: log and state slices.
18. Kernel: actors, tool dispatch pipeline, services.
19. Kernel: clock, jobs, ports; `KernelDefinition`.
20. Scheduler interface and `turns` with the "to act" activation.
21. Carry `packages/chain`; sign envelopes; `RunManifest` in the genesis; `swt log verify`.
22. sdk: `defineGame`, `defineMechanic` (shape per issue 14), game resolution, `SwtError` for load errors.
23. Testkit: scripted driver, fixture mechanic, oracle runner, replay as a test tool.
24. Port `grid-game` and tic-tac-toe as they are, with their tests; match the oracle.
25. CLI: `swt run` for any game file, `--fake`; carry the viewer and open the M1 run.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Second-system effect | the cut list of the challenge (section 6.1 there), the rule of two, the engine-total budget |
| The work is not priced | token and time record from issue 1, budget set in M0, kill criterion at M2 |
| Losing the differential test against the old engine | oracle files and ported mechanic tests before the archive |
| City of Keys does not fit an API frozen by tabletop games | City slice at M3, API freeze only after M5 |
| Type inference of the new builder fails on large mechanics | spike before kernel code; head and body remain the model |
| Order without hook order numbers changes behaviour silently | mechanic tests ported with each mechanic; the City slice tests `after:` |
| A rerun fails and nobody can say why | one variable at a time, noise floor first, bridge run on the old code |
| Parallel mode makes turn-designed rules exploitable | parallel stays a spike until a game is designed for it |
| No paper ran any code (the analysis container has no installed dependencies) | every number is from reading and counting; M0 measures |

## 10. Errata to the role papers

The challenge checked 54 factual claims: 40 confirmed, 12 imprecise, 1 wrong, 1 partly unverified; none reverses a
conclusion. The role papers are left as written. Corrections that matter:

- Paper 01: `defineApi` is imported by 7 mechanics, not 12. The kernel has 36 files, not 34. 35 mechanic packages
  depend on `shared` (the brief's 36 counts `shared` itself). The viewer is 5264 lines with `.tsx`. Tool naming
  option A is an idea in `docs/ideas/tool-naming.md`, not a decision.
- Paper 01: "56,464 test lines pin the old bytes" overstates it; about 25,000 of them test mechanics and games
  through the host API and are ported with the mechanics.
- Papers 01 and brief: GitHub Actions is partly on (docs job on every push, Pages deploy); only the full check is
  manual.
- Paper 03: 12 of 13 game packages separate a `model.ts`; `morris` has `rules.ts` and `search.ts`.
