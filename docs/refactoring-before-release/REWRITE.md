# REWRITE: the merged plan for the rewrite before release

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Status: **decided on 2026-11-14, see [`DECISIONS.md`](DECISIONS.md); where the two differ, `DECISIONS.md` holds.**
Phase 1 (analysis and definition); nothing is built.
Date: 2026-11-13, brought in line with `DECISIONS.md` on 2026-11-14.

This paper merges four role papers and one challenge into one plan. Where the papers disagree, it follows the
resolution of the challenge unless stated otherwise. Read `DECISIONS.md` first, then this paper; the others are the
evidence. Section numbers without a file name mean this paper; sections of the decisions are written as
"`DECISIONS.md` 8.3".

| Paper | Role | What it gives |
|---|---|---|
| [`BRIEF.md`](BRIEF.md) | owner's decisions | the goal and the fixed decisions that no paper reopens (its repository line is replaced by `DECISIONS.md` section 8) |
| [`DECISIONS.md`](DECISIONS.md) | decision panel of the agent team | D1 to D15 decided, the 49 open decisions of the role papers, the README of the new `main`, the licence policy and gate, the owner's actions, where the rewrite happens |
| [`01-architecture.md`](01-architecture.md) | software architect | measured state of kernel and packages, new kernel, scheduler, layering, security, milestones |
| [`02-experiment-science.md`](02-experiment-science.md) | experiment scientist | seeds, manifest, reproducibility levels, statistics, rerun plan and budget, ISTAnt |
| [`03-game-design.md`](03-game-design.md) | game designer | inventory of 39 mechanic packages, 26 historical couplings, recut, anatomy of a Game |
| [`04-developer-experience.md`](04-developer-experience.md) | developer experience | audit for three personas, first hour, typed builder rules, CLI, errors, docs, sample ladder |
| [`05-challenge.md`](05-challenge.md) | challenger | fact check of 54 claims, 13 contradictions with resolutions, cut list, smallest plan, kill criterion |
| [`06-chess-engine.md`](06-chess-engine.md) | research and decision | the chess reference engine that replaces Stockfish (Garbochess-JS, `BSD-3-Clause`; fallback `js-chess-engine`, `MIT`), integration, migration of the old analyses |

## 1. Verdict

1. **Go for the rewrite on a new `main` of this repository, as a port and not as a redesign.** The measured
   problems are real: two game formats, two runners, two event formats, a kernel of 5180 lines (4127 code lines)
   against a target of 1500, and 1085 lines in `mechanics/shared` of which a good part exists only to reproduce the
   bytes of a deleted engine.
2. **The expensive parts are healthy and are carried or ported, not reinvented:** the mechanic model (head and body,
   typed services between mechanics, the tool pipeline), the 13 newer games, the chain log, the viewer, the prompt
   package, the seeded random generator, the mechanic README generator and the mechanic tests.
3. **The union of the four papers is not one plan.** Together they ask for about 25 library packages, 40 plugin
   packages, 10 samples and 74 first issues in four different orders. Built as written that is the second system.
   The plan below is the cut version: about 130 to 170 issues, estimated seven to ten weeks, against four to six
   months for the union. Both numbers are estimates from the pull-request pace of the last week and must be
   replaced by measurement after milestone M1. **The budget for M0 to M2 is fixed (D4): 50 issues, 300 million
   agent tokens, 750 USD of agent cost and 10 USD of live model spend.** Kill criterion 1 fires at twice the first
   three numbers (section 7).
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
| Human Hand, dials, grants, Plugin | as today | `ARENA_*` environment names become `SWT_*`, with no alias for the old names. Issue 8 first tests that the cloud runtime leaves `SWT_ANTHROPIC_API_KEY` intact; if it strips it, the name becomes `SWT_CLAUDE_API_KEY` (E5) |
| Licence gate | the check that fails on a licence outside the allowlist, in every package of the lockfile, every file, every download and every workflow action | 100% Apache 2.0; no GPL and no other copyleft licence anywhere, ever. Allowlist, gate and the two exceptions: `DECISIONS.md` section 5 |

### 3.2 Kernel

- A single-writer state machine over an append-only log with seven parts: log, state slices, actors, tool
  dispatch, services, clock and jobs, ports (scheduler, model driver, sink). No role words, no game words; a
  word-list test enforces it.
- Assembled from a `KernelDefinition` that the sdk resolves from the game ("definable kernel").
- **Two budget tests, both counting code lines** (TSDoc on every export would eat a raw-line budget):
  kernel at most 1500; engine total (kernel, sdk authoring, the turn scheduler, run assembly) at most 4100, which
  is today's kernel. The second test stops the budget from being met by moving code next door.
- **A code line** is a non-blank, non-comment line of a `.ts` file under `src/`, tests excluded (D13). One counting
  function serves the budget tests and the ESLint limits. There is no cap on the number of exports.
- What moves out of today's kernel: Directors (884 lines), the authoring API (612), the decision gate (307), Human
  Hand (279), the turn loop (208), names and grants (268). They start as folders of one package and become packages
  only when a second consumer needs one without the rest.

### 3.3 Scheduler

- An interface from the first commit (owner's decision: pluggable).
- `turns` (seeded, a port of today) is the only production implementation at 1.0 and the reference for every
  comparison that is used as evidence. It gains a third activation value, "to act": wake whoever the turn source
  names. That is what turn games and the one-minute Hello Game need.
- `turns` is a folder of the engine, not a package, and counts in the engine total. There is no `schedulers`
  package.
- `parallel` (agents act on their own; calls commit in arrival order through one lane; no rollback) is a time-boxed
  spike of at most three issues plus one expert sample at M6, after the first rerun. The log envelope carries a
  `basis` field (what the actor had seen) from day one, so the format does not change when the mode arrives. None of
  the 15 games needs it today.
- The lane is always held in `review`: the world does not change under an approved call. The tick advance in the
  parallel spike is the commit count, with no option and no wall clock.
- Replay is a test tool in the testkit (feed recorded calls, compare events), not a scheduler plugin.
- Reproducibility levels: reproducible (turns with scripted models), replayable (any mode, the log is the
  schedule), authentic (hash chain). LLM sampling is not seeded and never was; seeds control the world only.

### 3.4 Mechanics and how they depend on each other

- **Model:** head and body are the model (D1), because the README generator, the composed game schema and
  compile-time checks must read a head without running a body. The one-object `defineMechanic` of paper 04 ships
  only as sugar that compiles to it, and only if a type spike passes before any kernel code is written. The spike is
  time-boxed to two issues and passes only if all four hold on `channels` (2247 lines) and `chess`:
  1. the head is written with no explicit type argument and no cast;
  2. `tsc --noEmit` on the two packages takes at most 1.5 times what the head-and-body form takes on the same
     machine, and a completion inside a tool handler answers within 2 seconds;
  3. a wrong service name and a wrong event payload each give an error of at most 15 lines that names the property;
  4. lint runs with a 4 GB heap.

  On a pass the sugar ships; new mechanics and sample 5 use it, and ported mechanics stay head and body until after
  1.0. On a fail, or when the spike is not finished inside its time box, there is no sugar at 1.0: head and body
  with one registration site, and sample 5 is written in that form. The question returns only with a new spike
  result.
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
  time. It is unproven on Salt Market, Convoy and Harbor Lights. It is earned (D9): tic-tac-toe, quarry, econ-lab
  and liar's dice are ported as they are, then `match` and `Ruleset` are built on those four in at most six issues,
  with the mechanical ports as the oracle. The frame is adopted for the other nine games only if all three hold:
  1. all four games match their oracle on the frame;
  2. the four games on the frame, the frame included, have fewer source lines than the four mechanical ports;
  3. Salt Market is written out as a `Ruleset` in which no ruleset owns a timer or a job.

  If one fails, the nine games are ported as they are and the frame waits until after 1.0. `match` is not built
  before M4, and no game except the four is ported twice.
- **Names:** an original game and its ruleset get one name; traditional rules get generic names. The renaming is
  one mechanical issue at M6, before names are published. It touches folder, package and log names only, never a
  model-facing name.

### 3.5 Game definition

- One `defineGame` (today's `CoreStory`, used by 13 of 15 games). The old `StoryDefinition`, `validate.ts`, the old
  story schema and the translation layer in the CLI are dropped (about 4000 lines).
- A game is plain data: residents, teams and roles as typed game-level data, mechanics with options, Directors,
  typed `params` (replacing 232 lines of variant-name parsing in `stories/index.ts`), end and win conditions as
  sugar for mechanics. No build functions, so YAML and JSON stay equal to the TypeScript builder. The JSON Schema is
  composed from the plugins' option schemas.
- Teams and roles are written once, in `defineGame`; the sdk writes them into actor attributes at genesis. Their
  ids are checked at load with an `SwtError`, not at compile time.
- Tool names: canonical `<package>/<mechanic>/<tool>` in the log, bare names in the game when unique, a clash is a
  load error. Ported games keep their old model-facing tool names and their old prompt texts by key.
- A model-facing tool name has at most 64 characters from `[a-zA-Z0-9_-]`, checked at load. There is no derived
  alias.

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
- The kernel revision is one integer and starts at 3 on the new kernel: r1 and r2 belong to the old engine, and no
  number may mean two things. Scheduler, driver and prompt identity are fields of the manifest, not parts of the
  revision.
- A computed facts table in every report, built only from metrics that mechanics export, with "absent" instead of
  zero. This fixes the class of defect seen in chess run 051, where the report says no move was submitted and the
  log has 299 `move_played`. The model-written draft stays for loophole candidates only, marked unverified.
- Statistics for small n in code (paired bootstrap, permutation, effect sizes) and a noise floor: no series ever
  ran the same game, arm and seed twice, so five replicates per game come before any comparison.
- The rerun proves a small thing well: the four firm paired series (quarry, econ-lab, harbor-lights, lanterns) keep
  their sign, and the chess request counts hold. All other games establish new baselines. The rerun plan (games,
  arms, seeds, metric, pass rule) is committed before the first live run, and each series runs once at its planned
  seed count.
- Budget about 34 USD on Haiku, cap 50 USD, of which 10 USD through M2 (for scale: the 655 recorded runs cost about
  157 USD). No Sonnet or Opus runs before 1.0.
- Chess (`DECISIONS.md` 5.5): the request counts need no chess engine. `stockfish.js` is GPL-3.0 and is replaced by
  the engine of paper 06. Centipawn-loss numbers from the old runs are not compared with numbers from the new
  engine; the moves are in the old logs, so the old games are scored again with the new engine once, and that sets
  the chess baseline.
- City of Keys gets a new Act I base on the new platform: one recording for 1.0, two more before an Act II
  comparison is used as evidence.
- Postponed until after 1.0: preregistration with anchors, blind judging protocol, typed claims, the ISTAnt
  prerequisites. ISTAnt stays the first study on the new platform.

### 3.8 Developer experience

- Three author-facing plugin kinds at 1.0, one per persona: mechanic, Director, model provider.
- The audit found no working path today for two of three personas: the docs describe the old game format while 13
  of 15 games use `defineCoreStory`, which the sdk does not export; a mechanic needs five registration sites and ten
  type parameters; a third-party Director cannot be run from the CLI at all.
- Before 1.0: one runner for any game file; `swt run --fake`; scaffolds `swt game new`, `swt mechanic new`,
  `swt director new`; one error standard (`SwtError`: what, where, why, fix, docs link, stable code) for load
  errors; samples 1 (Hello Game: tic-tac-toe, 11 lines, under one minute on Haiku), 5 (own mechanic) and 6 (own
  Director with a decision and Human Hand) written as tests; a glossary with a name lint; the API checklist as the
  pull-request template. Samples 2 to 4 follow after M4.
- `--fake` plays from the turn source where one exists and from a tool's `sample` elsewhere. `sample` is optional;
  conformance warns about a tool that has neither.
- One umbrella package `swarmtales` only re-exports the scoped packages. It exists as a workspace package from M1,
  so samples use the final import path; it is published at M6.
- **The README of the new `main`** (`DECISIONS.md` section 4) is a landing page of at most 120 lines; a test in the
  check fails a longer one. Its code block is an include of sample 1. It states a finding only when the effect is
  reproduced on this platform (two effects at M2, four at M4). A root `GAMES.md` is the catalogue: an overview table
  generated from the registered games plus one hand-written card per game. A new game adds a card to `GAMES.md`,
  never a line to the README.
- No docs site before 1.0: Markdown under `docs/` plus the TypeDoc output.
- After 1.0: `npm create`, watch mode, the docs site with tested blocks (VitePress, if it passes the licence gate),
  samples 7 and 8, the fresh agent test as a trend measure (not as a release gate; it is too flaky to block).
- The DX veto is kept simple: a change of a public signature needs the checklist filled in and a counter-proposal
  if DX objects; if one round does not settle it, the question goes to the owner.

### 3.9 Security

- In-process plugins have no boundary; the docs say so. Keys go through a key broker and the model port, never to a
  plugin, a prompt or a log; a canary test scans every run artefact. The QuickJS sandbox, plugin manifest and lock
  file wait until a third-party plugin exists.
- This is decided (paper 01, decision 8): trust only at 1.0, said plainly in the docs; a serialized boundary and
  QuickJS come when the first third-party plugin exists.

### 3.10 Carry, port, drop

| | What |
|---|---|
| Carry as is | `packages/chain` (extended to envelopes), viewer including the read-only legacy log reader so old runs stay readable, `packages/prompts`, `random.ts` bit for bit, pure rule code of the 13 games, mechanic README generator, conformance checks, mutation harness with its gate for kernel and sdk (E7) |
| Port | models, tool pipeline, turn loop, testkit, reporter, the 19 newer mechanics (about 13,300 lines) each with its test file from `test/mechanics` |
| Recut | the City cluster and the four Directors |
| Drop | old game format and its validator, legacy log writer, `mechanics/shared` order tables, old-engine goldens, `arena`, `stockfish.js` and `lab/chess-engine.ts` in their present form, `LICENSE-FAQ.md`, the contributor agreement |

## 4. Migration steps

| # | Milestone | Content | Done when |
|---|---|---|---|
| M0 | Oracle and frame | **On the old state, before the freeze:** oracle files per game (seed, scripted call sequence from recorded logs, emitted events); replace `stockfish.js` by the engine of paper 06; lockfile and a recorded green check so it stays runnable. **Then the new `main`:** Apache 2.0 with `NOTICE` and SPDX headers, the licence gate and `THIRD-PARTY-LICENSES.md`, the sign-off check, the README skeleton with its line test, `CLAUDE.md` and `AGENTS.md`, ESLint limits, TSDoc rule, layer check, both budget tests, the record of D4 (tokens as input, output, cache read and cache write, wall time and changed lines per issue, in a table in the repository), issue and pull-request templates; the `defineMechanic` type spike | the spike has a verdict; an empty package passes the check; oracles exist |
| M1 | Skeleton | contracts, kernel, sdk, `turns`, scripted driver, chain over envelopes, manifest; one fixture mechanic; tic-tac-toe ported as it is with its tests | tic-tac-toe matches its oracle; `swt log verify` passes; the viewer opens the run; kernel under 1500 code lines |
| M2 | Live and measured | models with key broker and canary test; computed facts table; quarry and econ-lab ported as they are; noise floor and the two paired series; the first findings block and the recorded moment enter the README; the data repository `swarmtales-runs` receives the runs | both firm effects keep their sign at 12 seeds (about 2 USD); no key canary in any artefact. **Kill criterion checked here** |
| M3 | City slice | six scripted residents, talk, ledger, exile that knows nothing about pieces, one piece-owning mechanic that listens to the exile event, one decision, one Director, a pause by the human, snapshot and resume | the slice replays exactly from its log and resumes from a snapshot; `exile` names no other game mechanic; no service cycle |
| M4 | Frame decision and the bulk | `match` and `Ruleset` on four ported games against their mechanical ports; then the remaining nine games on the winner; harbor-lights and lanterns rerun; `GAMES.md` complete for the tabletop games | every tabletop game matches its oracle or a registered change; four firm effects reproduced in sign |
| M5 | City and Whispers | recut of the City cluster, Whispers first; Act I and Act II at six residents; API freeze after this, not before | City plays Act I and II; a new Act I base snapshot is recorded |
| M6 | Release | samples 2 to 4, the parallel spike of at most three issues and its sample, a mechanic and a Director installed from outside the repository, the rename of original games, `swt doctor --online`, names and publishing | the 1.0 list of section 5 holds |

### 4.1 Where the rewrite happens

Decided in `DECISIONS.md` section 8, which replaces the repository line of the brief at the owner's request.

- **The rewrite happens in this repository.** The current state is frozen as branch `legacy` and tag `v0-final`.
  The new `main` is an orphan commit (no parent), and `develop` branches from it. An orphan `main` has no old
  ancestor, so it never reaches the 766 MB of run data and carries a clean Apache 2.0 history.
- The URL, the pull requests #1 to #155, the settings, the agents' access and the Pages address of the viewer stay.
  Old runs open in the viewer with `ref=legacy`. Old code is read with
  `git worktree add ../swarmtales-legacy legacy`; a carried file is copied with its path at `v0-final` in the commit
  message.
- The repository stays private until the M2 kill check passes.
- Run data of the new platform goes to the separate data repository `swarmtales-runs` under Apache 2.0, not into the
  code repository. The code repository holds indexes only.
- `legacy` keeps its old licence until it is deleted. It is protected and receives no commits after the tag, except
  a fix that an oracle or a bridge run needs.

**The switch** (the owner's action O3; nothing is deleted by it):

1. The M0 issues on the old state are merged into today's `main`: oracle files, Stockfish replaced, the noise
   floor, the run 051 correction, a recorded green `pnpm check`.
2. That commit is tagged `v0-final`. The branch `main` is renamed to `legacy` on GitHub (a rename, not a force
   push; open pull requests follow it).
3. The orphan root commit is pushed as the new `main`, `develop` is created from it, and `main` is set as the
   default branch.

**On `main` at the start (the root commit):**

- `LICENSE` (Apache 2.0), `NOTICE`, `CONTRIBUTING.md` (sign-off), new `CLAUDE.md` and `AGENTS.md`, `.gitignore`,
  `.gitattributes`, `.node-version`.
- `README.md`: the M0 sections of the README decision, plus a status line: the old platform is on `legacy` (tag
  `v0-final`), under its old licence, and will be removed after 1.0.
- `docs/refactoring-before-release/` whole, `docs/LESSONS-LEARNED.md`, `docs/CROSS-GAME-FINDINGS.md`,
  `docs/RELATED-WORK.md`, `docs/RUNTIME-REVISIONS.md`, `docs/ideas/readme-structures.md` and
  `docs/ideas/readme-drafts/`. Links into old code or runs point at `v0-final`.
- `oracles/`: the oracle files exported in step 1.
- `.github/`: the new check workflow and the issue and pull-request templates. `pages.yml` returns with the viewer
  at M1.

**Not on `main` at the start:** `packages/`, `apps/`, `mechanics/`, `stories/` with all run data, `examples/`,
`library/`, `archetypes/`, `lab/`, `test/`, `scripts/`, every build and lint configuration, the lockfile,
`story.schema.json`, `LICENSE-FAQ.md`, and all other docs. Code that is carried comes back issue by issue.

**The save list, before `legacy` is deleted.** The branch is temporary: the owner deletes it himself (O6). That is
not recommended before the 1.0 tag, and never before M2, because the kill-criterion fallback needs the branch.
Everything that must outlive it is on `main` or in the data repository first.

| Must outlive | Where it is saved | When |
|---|---|---|
| Oracle files | `oracles/` on `main` | M0 |
| Lessons log, cross-game findings, runtime revisions | on `main`; before the deletion a script rewrites every link from `v0-final` to the data repository and fails on one it cannot resolve | M0, links at M6 |
| The recorded runs (`stories/*/runs/`, `examples/`, 787 MB) with their reports and analyses | `swarmtales-runs/legacy/`, same relative paths | M6, before the deletion |
| Everything on the carry list of section 3.10, each mechanic's tests, the legacy log reader of the viewer | on `main`, through the port issues | M1 to M5 |
| Papers under `docs/ideas/` and `docs/design/` that a lesson row or a kept doc cites | `docs/history/` on `main`, marked as written for the old platform | M6 |
| Bridge runs and the noise floor on the old code | done, with results in the data repository | M2 |
| The whole old state | one file from `git bundle create swarmtales-v0-final.bundle v0-final`, kept by the owner outside GitHub | before the deletion |

The tag goes with the branch: a tag that stays is fetched by every plain clone and keeps the run data in it. Until
then `git clone --single-branch --no-tags` gives a small clone.

**Undo.** Before the deletion, the whole decision is undone by renaming `main` to `rewrite` and `legacy` back to
`main`. That is also the fallback of the kill criterion. After the deletion only the bundle brings the old state
back.

### 4.2 Workflow on the new `main`

- Every change has an issue with "done when", allowed paths and the proving test. An issue changes at most 400
  hand-written lines (source plus tests; generated and carried files do not count); a larger issue is split before
  work starts.
- **Who opens an issue (E2):** any agent, for M0 to M6 work that `DECISIONS.md` or this paper covers. A new game, a
  new mechanic idea or anything labelled `after-1.0` needs the owner's go.
- **Who merges (E3):** the builder opens the pull request to `develop`; a challenger on another model approves; the
  builder squash-merges on a green check. `main` moves only at milestone tags, by the milestone review, until 1.0.
- At most three open pull requests at a time (generated files conflict otherwise).
- Every issue records its tokens, wall time and changed lines (the record of D4).

## 5. Definition of 1.0

1. One game format, one runner, one event format, chain over envelopes.
2. Kernel and engine-total budgets hold; file, function and complexity limits hold with no unexplained exception.
3. All fifteen games (thirteen tabletop games, Whispers, City of Keys) run offline against their oracle file and
   have one recorded live baseline each.
4. The four firm effects are reproduced in sign.
5. City of Keys plays Act I and Act II at six residents.
6. The three first-hour tutorials (game, mechanic, Director) pass as tests.
7. A mechanic and a Director written outside the repository run from a packed install.
8. Licence, notices, headers and package names are in place.
9. The licence gate is green; no copyleft licence in the lockfile, the files or the data.

Everything else in the four papers is after 1.0.

## 6. Decisions (decided, see `DECISIONS.md`)

Ordered by how much later work depends on each. The reasons, what each decision rules out and its first consequence
for the issue list are in `DECISIONS.md` section 2.

| # | Decision | Options | Decision | Reason |
|---|---|---|---|---|
| D1 | Port or redesign of the mechanic API | (a) head and body ported, one-object form as sugar if the spike passes; (b) the new one-object API as the only form; (c) port with no sugar | (a). The M0 spike on `channels` and `chess` decides only whether the sugar ships (four criteria, section 3.4); on a fail, (c) | 39 mechanics prove the current model; nothing proves the new one yet |
| D2 | One variable at a time | (a) kernel first, games, prompts and tool names as they are, then frame, then prompts; (b) everything at once | (a) | otherwise no failure can be attributed and the old runs are no baseline |
| D3 | CI on the new `main` | (a) GitHub Actions with the full check required on pull requests; (b) local check with a recorded result; (c) as today (docs job and Pages only) | (a), required on `develop` and `main`, within 10 minutes and a 6 GB heap. Until the owner has switched Actions and branch protection on, (b) applies automatically: the pull request body carries the recorded result of the local `pnpm check` | the limits, the layer rules and the TSDoc rule are only real if a machine enforces them |
| D4 | Budget and stop rule | (a) token and issue budget for M0 to M2 plus the kill criterion of section 7; (b) no budget | (a), with numbers for M0 to M2: 50 issues, 300 million agent tokens, 750 USD of agent cost, 10 USD of live model spend; at most 400 hand-written lines per issue; one recalibration of the token and cost numbers after the tenth merged issue | no paper could price the work; without a number the rewrite cannot fail, only continue |
| D5 | Scope of 1.0 | (a) the list of section 5; (b) the union of the four papers; (c) tabletop games only, City after 1.0 | (a), for all fifteen games, with the licence gate as the ninth line | (b) is four to six months; (c) ships without the home game |
| D6 | City slice early | (a) at M3; (b) City only at the end | (a) | the only early test of Directors, decisions, Human Hand, resume and the exile example |
| D7 | Oracles from the old state (`legacy`) | (a) export oracle files and port mechanic tests; (b) new goldens only | (a), before the freeze | replaces the lost differential test against the old engine |
| D8 | Dependencies between mechanics | (a) "service", provider-owned contract, shared package only for contracts with two providers, events first; (b) a central capabilities package; (c) a standard contracts package with four entries | (a) | (b) rebuilds the hub that caused the question about exile |
| D9 | Game frame `match` | (a) earned on four games, then decided; (b) built first; (c) never | (a), by the three adoption criteria of section 3.4, in at most six issues | the evidence for it is real, the interface is unproven on three games |
| D10 | Schedulers at 1.0 | (a) the interface, `turns` with "to act", parallel as spike and sample; (b) a production parallel scheduler at M4; (c) three schedulers | (a) | pluggable from day one without hardening a mode no game uses |
| D11 | What the rerun must prove | (a) four firm effects in sign plus chess request counts, the rest set new baselines; (b) fifteen equivalence rows | (a) | (b) cannot be passed even by a correct port at this sample size |
| D12 | Names, licence, data | (a) now: reserve npm name and scope, Apache with `NOTICE` and SPDX headers, Stockfish removed, replacement under the allowlist, runs in a data repository; (b) at release | (a). No rename and no archive: the rewrite happens in this repository (section 4.1) | cheap now, awkward after a public launch. Reserving names is an action outside the repository and needs the owner's go |
| D13 | Kernel budget counting | (a) code lines, plus the engine-total test; (b) raw lines | (a) | the TSDoc rule would otherwise punish documentation |
| D14 | Ported games keep old prompts and tool names | (a) yes until their baseline is reproduced, new games get generated briefings; (b) new prompts everywhere at once | (a) | this constrains DX polish on ported games for a while, which is the price of a baseline |
| D15 | Contributor terms | (a) sign-off rule (DCO); (b) keep the current agreement that allows relicensing under any terms | (a) | the current agreement fits a source-available licence, not an Apache project |

Settled by the merge and listed for the record: `tick` instead of minute; no `kind` field;
the word "experiment"; the Director shape of paper 04; the scripted `script` stays a mechanic; `roster` is a small
mechanic the sdk adds, not a kernel service; "referee" for silent scorers.

Two facts that need attention whatever is decided:

- **"100% Apache 2.0" is a relicensing.** `LICENSE` is source-available today. The owner is the licensor and can do
  it; the old state keeps its licence until it is deleted; the owner accepts that.
- **`stockfish.js` (GPL-3.0) is replaced on the old state and never enters the new `main`;** see `DECISIONS.md`
  5.5.

## 7. Kill criterion

Checked at the end of M2, agreed before M0 starts. Stop the new `main` and rename the branches back
(`DECISIONS.md` 8.5), then fall back to a staged recut inside the old state, if any of these holds:

1. M0 to M2 took more than 100 issues, 600 million agent tokens or 1500 USD of agent cost (after the one
   recalibration of D4).
2. The kernel exceeds 1500 code lines or the engine total exceeds 4100, with only tic-tac-toe, quarry and econ-lab
   running.
3. A firm effect (quarry, econ-lab) changes sign in the new runs while a bridge run on the old code keeps it.

Softer check at the end of M3: if the City slice needs a kernel change that the tabletop games did not need, the
kernel API is not frozen and M4 waits. The fallback loses little: oracles, manifest, computed facts table, the exile
recut and the licence work apply to the old state (`legacy`) unchanged.

## 8. First issues

For M0 and M1, plus one M6 issue that is noted now. Later milestones get their issues when the one before is done.
The numbers 1 to 25 are kept because `DECISIONS.md` refers to them; issue 7 is split into 7a and 7b, and new issues
continue from 26.

**M0, the old state (before the freeze)**

- **1.** Export oracle files for tic-tac-toe, quarry, econ-lab and liar's dice (seed, scripted calls, emitted events).
- **2.** Export oracle files for the remaining tabletop games, for Whispers and for the City slice.
- **3.** Record a green `pnpm check` with the lockfile and document how to run the old state from `legacy`; the commit is
  tagged `v0-final` at the switch.
- **4.** Measure the noise floor on the old code: five replicates of one arm of quarry and econ-lab, within the 10 USD
  limit for live spend through M2.
- **5.** Fix the wrong report of chess run 051 or mark it (the log has 299 moves).
- **26.** Replace `stockfish.js` by the engine of paper 06 and score the old chess games again with it.

**M0, the new `main`**

- **27.** Prepare the root commit of the new `main`: the start list of section 4.1 (`DECISIONS.md` 8.3).
- **6.** Workspace scaffold: pnpm workspace, tsdown, strict TypeScript, `main` and `develop`.
- **7.** Split in two:
  - **7a.** Licence files, `NOTICE`, SPDX headers.
  - **7b.** Licence gate, allowlist, third-party inventory (`THIRD-PARTY-LICENSES.md`).
- **8.** `CLAUDE.md` and `AGENTS.md`: issue-driven workflow, challenger review, model roles, limits. It first tests that
  the cloud runtime leaves `SWT_ANTHROPIC_API_KEY` intact (E5).
- **9.** ESLint limits: 300 lines per file (warn 250), 50 per function, complexity 10, exception format.
- **10.** TSDoc on every export: eslint-plugin-jsdoc, api-extractor reports, Typebox description rule.
- **11.** Layer check and the two budget tests (kernel 1500, engine total 4100 code lines), word-list test.
- **12.** Issue and pull-request templates with the API checklist; the record of D4: tokens (input, output, cache read,
  cache write), wall time and changed lines per issue, in a table in the repository.
- **13.** CI: full check on pull requests, within 10 minutes and a 6 GB heap.
- **14.** Type spike: one-object `defineMechanic` on `channels` and `chess`; done when the four criteria of D1 (section
  3.4) have a verdict. Time box: two issues.
- **15.** Glossary and name lint.
- **28.** Sign-off check: a script in the check verifies the `Signed-off-by` line on every commit.
- **29.** README skeleton (the M0 sections) with the 120-line test.
- **30.** Recalibrate the token and cost budget once, after the tenth merged issue (D4).
- **31.** Commit the rerun plan (games, arms, seeds, metric, pass rule) before the first live run.

**M1**

- **16.** Contracts: envelope with `basis`, actor, tool, service, event, game definition version 1.
- **17.** Kernel: log and state slices.
- **18.** Kernel: actors, tool dispatch pipeline, services.
- **19.** Kernel: clock, jobs, ports; `KernelDefinition`.
- **20.** Scheduler interface and `turns` with the "to act" activation.
- **21.** Carry `packages/chain`; sign envelopes; `RunManifest` in the genesis; `swt log verify`.
- **22.** sdk: `defineGame`, `defineMechanic` (shape per issue 14), game resolution, `SwtError` for load errors.
- **23.** Testkit: scripted driver, fixture mechanic, oracle runner, replay as a test tool.
- **24.** Port `grid-game` and tic-tac-toe as they are, with their tests; match the oracle.
- **25.** CLI: `swt run` for any game file, `--fake`; carry the viewer and open the M1 run.

**M6, noted now**

- **32.** Save list before `legacy` goes: every row of the save list in section 4.1 (`DECISIONS.md` 8.4) is ticked.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Second-system effect | the cut list of the challenge (section 6.1 there), the rule of two, the engine-total budget |
| The work is not priced | the record of D4 from the first issue, the M0 to M2 budget of D4, kill criterion at M2 |
| Losing the differential test against the old engine | oracle files and ported mechanic tests before the freeze |
| City of Keys does not fit an API frozen by tabletop games | City slice at M3, API freeze only after M5 |
| Type inference of the new builder fails on large mechanics | spike before kernel code; head and body remain the model |
| Order without hook order numbers changes behaviour silently | mechanic tests ported with each mechanic; the City slice tests `after:` |
| A rerun fails and nobody can say why | one variable at a time, noise floor first, bridge run on the old code |
| Parallel mode makes turn-designed rules exploitable | parallel stays a spike until a game is designed for it |
| The replacement chess engine changes the scale of the chess metric | score the old games again with the new engine; old and new centipawn numbers are never compared |
| Actions minutes on a private repository | the 10-minute budget of the check, the local fallback of D3 |
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
