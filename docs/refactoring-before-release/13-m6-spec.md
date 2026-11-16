# 13 M6 specification: release: samples 2 to 4, outside plugins, the rename, `swt doctor`, names and publishing

Status: **specification for milestone M6**, written 2026-11-16. It stands against `rewrite/develop` at `4604a127`
(M5 closed, decision A117) and the old platform at the branch `legacy` (`a73e6a9`). Builders code against this file.
Precedence: [`BRIEF.md`](BRIEF.md), then [`DECISIONS.md`](DECISIONS.md) (with its addendum A1 to A117, and the rows
A118 to A134 that section 17 indexes and that are entered there with this file), then [`REWRITE.md`](REWRITE.md),
then the specifications of M1 to M5 with their errata, then this file, then papers 01 to 07. Where this file decides
something the papers left open, section 16 lists it. Section 11 lists what only the owner can decide or do.

**Errata:** `13-m6-spec-errata.md` is started by the first builder who finds a difference between this file and the
code (rows K1 onward, the letter after J of M5); where the two differ, the errata hold.

Words as in the earlier specifications. "Carried" means copied with at most import changes; carried lines do not
count against the 400-line rule. A "code line" is a non-blank, non-comment line of a `.ts` file (D13), counted with
`scripts/lib/budget.ts`. **"Outside the repository"** means a folder that is not inside the work tree of this
repository and reaches no file of it: no link into the workspace, no `--conditions development`, no `tsconfig` of
the repository. **"Owner's hand"** marks a step of `DECISIONS.md` section 6 (O1 to O13) or a tag push (O3): the
specification prepares it in the repository (a script with a dry run, a checklist with the exact commands and the
check after each), and **no issue of M6 plans an agent to do it**.

**M6 starts after A117** (M5 closed; the cold check green in 474.5 s, peak 5660 MB, on `557c7ecf`). The runtime
revision at the start is 7.

**M6 is done when** (REWRITE section 4, row M6, "the 1.0 list of section 5 holds", made testable):

1. **samples 2 to 4** exist, each its own package under `samples/`, each played by a test with the fake model that
   asserts on its log, each with a README in the fixed format of paper 04 section 7; the game tutorial
   `docs/tutorials/game.md` is built from samples 1 to 4, and the three first-hour tutorials (game, mechanic,
   Director) pass as tests (1.0 line 6);
2. **outside the repository:** a gate packs the published packages (section 6.1) into tarballs, installs them
   offline into a folder outside the repository, and there plays, verifies and replays a fake run of the code of
   samples 5 and 6 and of a mechanic package and a Director package installed from tarballs; a call of a service
   that a mechanic's head does not declare is refused at run time with an `SwtError` (A37) (1.0 line 7);
3. **the rename** of section 4 is applied: no package name, folder or mechanic id of the old column of its table is
   left outside the places 4.4 allows; every oracle test of a renamed game matches at level 3; the model-facing
   texts of every renamed game are byte-equal before and after (4.3);
4. **`swt doctor`** reports Node, versions, keys by name and the `SWT_` names offline, and `swt doctor --online`
   makes one minimal request per chosen provider after printing its cost; both are tested offline, and one online
   call is recorded live (section 5);
5. **names and publishing** are ready: the published list and its gate, the content check of every tarball, a
   green `pnpm release:check`, and `docs/RELEASE.md` with every owner's-hand step; nothing is published, reserved,
   pushed as a tag or made public by an agent (1.0 line 8, section 6);
6. **the data repository, the legacy removal and the main switch** are prepared: each by a script with a dry run and
   its test, the save list of REWRITE 4.1 with a status per row, every link to `v0-final` and to `data/runs`
   classified by a gate (section 7);
7. **the 1.0 list** of REWRITE section 5 is answered line by line in `docs/ISSUE-RECORD.md` ("The gate of M6"),
   each line with its test or its record; line 3 with one recorded live baseline per game (A124), tic-tac-toe teams
   (to be `tictactoe`) by a run of M6;
8. **the carries of M5** are closed or named with their owner: the docs-only row of `checkResumeEveryBoundary`
   (J318), P494, B2, B3 built; P488 and P493 built; B1 and P495 with their owner's point (section 8);
9. **budgets:** the kernel adds no line (1473), kernel + sdk + engine at most 4100; the cold full check is green
   inside 600 s and 6 GB, with 540 s as the goal (section 9); the live spend is inside the cap of section 10;
10. the **stop rules and the softer check** of section 12 are answered in writing in `docs/ISSUE-RECORD.md`.

What M6 is **not**: no new game and no new mechanic idea (the hidden-role game of paper 04's sample 3, the quests
mechanic and every game the runs suggest need Flo's go after a brainstorm, section 11); **no change of a game's
rules, prompt texts, tool names or refusal codes** (D2, D14, A41: B1, P445, P465, P484, P485, P491, P492 and LH21
are the owner's points), with one exception that A104 already named: B2, after the Whispers baseline of M5, gives the
guard's review the answer tool its carried text asks for ("call the tool", J174), under runtime revision 8 (section 8); no new Act I base used as evidence (D8 of paper 02); no run with 12 or more residents; no
generic mechanic with new model-facing names (A50); no viewer views per game (A133); no `npm create`, no docs site,
no watch mode (REWRITE 3.8, after 1.0); **no publish to npm, no name reservation, no tag push, no force push, no
repository created, made public or deleted, no branch or tag deleted by an agent** (O2 to O13).

## 1. Scope, packages, budgets

### 1.1 What M6 adds

| Path | Kind | What |
|---|---|---|
| `samples/team-game/` | sample package | sample 2: team tic-tac-toe with a team channel and a vote, as a game file and as YAML |
| `samples/roles/` | sample package | sample 3: roles, a private briefing per role, audiences (section 3.3) |
| `samples/shipped-director/` | sample package | sample 4: a shipped Director and its dial (section 3.4) |
| `docs/tutorials/game.md` | tutorial | the game builder's first hour, from samples 1 to 4 |
| `scripts/gates/fixtures/outside/` | test data | a mechanic and a Director package in plain JavaScript, with `package.template.json` (not a workspace package, 2.2) |
| `scripts/gates/packed-install.test.ts` | gate | section 2 |
| `scripts/rename/` | script | the rename of section 4, with its table and its test |
| `scripts/release/` | scripts | `packages.json` (the published list), `release:check`, `release:names` (read-only), `switch-main` (dry run), `data-repo` (dry run), `legacy-runs` (local only), `links` (classify and, after O8, rewrite) |
| `docs/RELEASE.md` | checklist | every owner's-hand step of M6 with its exact commands and the check after each |
| `docs/history/` | carried docs | the papers of `docs/ideas/` and `docs/design/` at `v0-final` that a kept doc cites (save list) |
| `CITATION.cff` | file | the citation of the release (A132) |
| `games/m6-ledger.jsonl`, `docs/RERUN-PLAN-M6.md` | live | section 10 |
| `apps/cli` | changed | `swt doctor`, the installed table of the project, a build and the `swt` bin |
| `packages/sdk` | changed | the run-time check of service calls (A37) |
| `packages/models`, `mechanics/city-directors` | changed | B2: the guard answers by a tool |

No package is added under `packages/`. No dependency from the registry is planned: packing and the offline install
use `pnpm`, the build uses `tsdown` (both in the lockfile). An issue that finds it needs a new package stops and
names it with its licence (`CLAUDE.md`, "Licence").

### 1.2 Where M6 starts: the inputs from M5

| From M5 | Where it is handled |
|---|---|
| `12-m5-spec.md` 15: samples 2 to 4, outside plugins, the check of A37 | sections 2 and 3 |
| a data game with a Director (P2, A61) | issue 02 (A121) |
| the rename of original games (paper 03 D3) | section 4 |
| baselines of the games that had only a smoke | A124, issue 24 |
| two more Act I bases before an Act II comparison is evidence | the owner's (section 11) |
| game-specific viewer views, the game tab | after 1.0 (A133) |
| `swt doctor --online`, names and publishing, the data repository | sections 5, 6, 7 |
| the 45 lines left of the engine total; the check of A37 claims them first (J312) | 1.3 |
| the frozen API (F1, 2026-11-16): every change an addition, a break only with the owner's go | 1.4 |
| the tick trigger `{ every: n }` frozen without a game user (J288) | sample 4 gives it its first user if its first test holds (3.4) |
| the TSDoc of the frozen `checkResumeEveryBoundary` (A117 says J319; the row is J318) | issue 13 |
| P495, B1 to B3, P494 | section 8 |
| the tags `v0-final`, `runtime-r3` to `runtime-r7`, the milestone tag of M5; the switch of `main` | owner's hand (7.4, section 11) |
| the cold check at 474.5 s of 600 | section 9 |

### 1.3 Code-line budgets

Measured on `4604a127` with `scripts/lib/budget.ts`:

| Package | Today | M6 may add | After M6, at most | Limit |
|---|---:|---:|---:|---|
| `kernel` | 1473 | **0** | 1473 | gate 1473, hard 1500 |
| `sdk` | 2198 | **15** (issue 01) | 2213 | |
| `engine` | 384 | **10** (issue 16, only if the guard's tool answer needs the Director driver) | 394 | |
| **kernel + sdk + engine** | **4055** | **25** | **4080** | **4100** |
| `apps/cli`, `packages/models`, `packages/testkit` | 2031, 1227, 1058 | about 900 together | | none |

The 20 lines left after M6 are not booked. **When a part does not fit:** the builder stops, writes the measured
lines into `docs/ISSUE-RECORD.md`, and the integrator decides by a decision row. Ways out, in order: (1) the check of
A37 drops its view half (the read-only `FactView` keeps the provider's checks only); (2) B2 keeps the Director
driver as it is and reads the tool call in `packages/models` alone; (3) B2 is cut (cut 1 of 13.2). Never: a kernel
line, raising 1500 or 4100, or code moved next door.

### 1.4 The API freeze in M6

Every change of a frozen file (`docs/API-FREEZE.md`, "The frozen files") is a row of `docs/API-FREEZE.md` of kind
`addition` or `addition: docs only`, naming a decision row `A<n>` of section 9 of `DECISIONS.md` (the gate refuses
any other decision; the column "Decision" below names it); `pnpm api:freeze --write` records it. M6
plans **no break**; an issue that would need one stops and goes to the owner (section 11). The additions planned:

| Issue | Frozen file | Addition | Decision |
|---|---|---|---|
| 01 | `scripts/api-freeze/surface/error-codes.json` | the code of an undeclared service call | A119 |
| 02 | `error-codes.json` | the codes of a Director the installed table does not hold (if not covered by `SWT-C030`) | A121 |
| 03, 04 | `scripts/api-freeze/surface/cli.json`, `error-codes.json` | the command `doctor` with `--online`, `--provider`, `--budget`, `--ledger`, its exit codes; its codes | none of A118 to A134 decides it: proposed row PD1 of "Independent challenge"; 03 does not merge before it |
| 05 | `packages/testkit/testkit.api.md` | an option of `runOracle` that maps renamed sources (4.3) | A122 |
| 13 | `packages/testkit/testkit.api.md` | `addition: docs only`, the TSDoc of `checkResumeEveryBoundary` | A126 |
| 16 | `packages/models/models.api.md`, `packages/contracts/contracts.api.md` (`ModelQuestion` lives in `packages/contracts/src/run/ask.ts`) | an answer tool of a model question (B2) | A126 |

The game mechanics are not frozen (A60), so the rename of section 4 changes no frozen file except where a frozen
report names a renamed package (none today: the frozen reports are those of `packages/*` and the base mechanics).

### 1.5 What stays reserved and is not built at M6

| Not built | Stays for |
|---|---|
| a kernel line of any kind | after 1.0, by an issue that names the extension point |
| the reserved parts of `12-m5-spec.md` 1.4 (`afford`/`settle` handlers, actor attributes, `schedule.every`, `kit.on`, `Kernel.stop`, `instruct`, `step`, standing orders) | as there |
| game-specific viewer views, the game tab, views of the City's events | after 1.0 (A133) |
| `npm create swarmtales`, `swt game new`, `swt mechanic new`, `swt director new`, watch mode, the docs site, `llms.txt` | after 1.0 (REWRITE 3.8) |
| publishing the games (`games/*`) | after 1.0 (A123) |
| samples 7 and 8, the fresh agent test | after 1.0 (REWRITE 3.8) |
| the sandbox, a plugin manifest, a lock file of plugins | when the first third-party plugin exists (01 #8, REWRITE 3.9) |
| the game frame of D9, the generic mechanics of paper 03, `parallel` as a production scheduler | after 1.0 (A31, A50, A30) |

## 2. Outside the repository

### 2.1 What runs outside

The gate `scripts/gates/packed-install.test.ts` (issue 08) builds the case a person outside the repository has after
`npm install swarmtales`, without the registry:

1. `pnpm build` has run (the build gate of the check). The gate packs, with `pnpm pack`, the packages of the
   published list that the case needs (the closure of `swarmtales` and of the mechanics the case's games load),
   into a temporary folder outside the work tree.
2. It writes a project there: a `package.json` that lists `swarmtales`, `typebox`, the mechanics by name and every
   package the copied project code imports (the `dependencies` of the sample's own `package.json`: samples 5 and 6
   import `@swarmtales/sdk`, `@swarmtales/contracts` and, sample 6, `@swarmtales/engine`, which pnpm's isolated
   `node_modules` does not give to the project through `swarmtales`), with
   `pnpm.overrides` that map every `@swarmtales/*` package and `swarmtales` to its tarball (`file:`), because a
   packed `workspace:*` names a version that no registry holds; it is `"type": "module"`, as samples 5 and 6 are.
   It installs with `--offline --ignore-scripts`: every third-party package comes from the pnpm store that
   `pnpm install --frozen-lockfile` filled, so the gate needs no network. **First test of issue 08:** a frozen
   install fills the store with tarballs but not always with the registry's metadata, which a resolution without a
   lockfile needs; so the first test runs the install on a fresh runner with an empty cache. **Way out:** the gate
   writes the outside project's `pnpm-lock.yaml` from the workspace lockfile's entries of the closure (versions and
   integrity are known) and installs with `--frozen-lockfile --offline`; if that fails too, A120's own CI job with
   network. A link into the workspace's `node_modules` is never a way out (it breaks "outside").
3. It plays there, through the `swt` bin of the installed `swarmtales` (`node_modules/.bin/swt`), without
   `--conditions development`, so the code that runs is the built `dist`:
   - **project code:** the `src/` and `game.ts` of samples 5 and 6, copied unchanged (they import packages by name).
     Node strips the types of a `.ts` file outside `node_modules`, so a mechanic written in the project runs as
     the tutorial writes it. `swt run game.ts --fake`, `swt log verify`, `swt replay --game game.ts`; the outcome
     line equals the sample's committed `output.txt`;
   - **installed packages:** a mechanic package and a Director package written in plain JavaScript
     (`scripts/gates/fixtures/outside/`), packed by the gate and installed as tarballs. Node does not strip types
     under `node_modules`, so a published plugin ships JavaScript, and the fixture shows that path. A game file
     (`.ts`) imports both; a YAML game names both by id (issue 02's installed table); each plays, verifies and
     replays;
   - **the planted call:** the fixture mechanic has an option under which one hook calls a service its head does not
     declare; the fake run ends with the code of issue 01 and exit 1, and the log ends with an `error` end.
4. It checks every packed tarball (6.2).

The fixture packages carry no file named `package.json` in the repository (`package.template.json`), so the
workspace, the layer check and the licence gate's lockfile do not take them for packages of this repository; their
source files carry the SPDX header like every other source file.

### 2.2 Where it runs, and what it costs

The gate needs the build, so it runs in lane 0 after `build` (`scripts/lib/check-run.ts`), as its own command
`pnpm check:pack`. The root `vitest.config.ts` collects every `scripts/**/*.test.ts` into the test lane (lane 2),
which does not wait for the build and gives each worker a heap of 384 MB; so the file of the gate is excluded from
that glob (issue 08 changes `vitest.config.ts`), and `check:pack` runs it alone. Lane 0 is the critical path of the
check (lint, then build, then the API reports, one after the other), so every second of the gate adds to the total. Its planned cost is at
most 45 s cold (packing about 20 tarballs, an offline install, five fake runs); issue 08 measures it. If the cold
full check then passes 540 s, the way out is A120's: the gate runs as its own CI job `Packed install` (as A69 made
the licence gate one), and `pnpm check:pack` is run by the integrator after every merge that touches a
`package.json`, an `exports` map, a `bin` or the build; no other gate is dropped or moved for it.

### 2.3 The run-time check of service calls (A37)

A mechanic in this repository cannot call a service it does not declare: `call` takes a service of `requires`,
`tryCall` and `has` one of `uses` (`packages/sdk/src/mechanic/context-types.ts`). A JavaScript plugin, or one
type-checked against another version, is not held by the types. Issue 01 adds the check in the sdk, where the call
is made (`callChecked`, `has` and `tryCall` of `contextFor` and `viewFor` in `packages/sdk/src/mechanic/context.ts`):

| Call | Refused when | Code |
|---|---|---|
| `ctx.call(service, …)` | `service.name` is not in the head's `requires` | the next free `SWT-M` code: "the mechanic calls a service its head does not declare" |
| `ctx.tryCall(service, …)`, `ctx.has(service)` | `service.name` is in neither `requires` nor `uses` | the same code |
| a method the service definition does not name | already refused by the provider's kit (`kit.ts`, `serviceMismatch`) | unchanged |

At most 15 sdk lines (1.3). No runtime revision: no game of this repository makes such a call (the types forbid
it), so no committed log changes. **First test:** every test of the repository passes with the check on; a mechanic
that fails it is a fault found, written as an erratum and fixed in that mechanic's own issue. The docs say plainly
that the check guards against mistakes, not against a hostile plugin: plugins are trusted code at 1.0 (01 #8).

### 2.4 The installed table of a project, and a data game with a Director (A121, P2)

Today `swt` builds the installed table of a game in its data form from its own `package.json` only
(`apps/cli/src/run.ts`, `PACKAGE_FILE`), which lists no mechanic, so a YAML game outside the repository cannot name
an installed mechanic, and no data game can name a Director at all (P2 of the errata of M3). Issue 02: the table
also reads the nearest `package.json` above the game file (the project's), its dependencies first; a package's
`swarmtales` field may list `directors` beside `mechanics` (the exports that are Director definitions); a data game's
`directors` names them by id, and resolution gets them as `ResolveInput.directors`. An id installed twice is
`SWT-C030` as today. Sample 2's YAML form (3.2) and the YAML game of 2.1 are its users.

## 3. Samples 2 to 4 and the game tutorial

### 3.1 Rules of a sample

As paper 04 section 7, with the facts of this repository: each sample is a package under `samples/` (class `L6` in
the layer table, referenced in the root `tsconfig.json`), imports the platform by the names a person outside imports
(`swarmtales` and the mechanic packages), has a `game.test.ts` (or `test/`) that plays it with the fake model and
asserts on its log, a `commands.sh` whose lines its tutorial test runs in process, and a README in the fixed format
(**What you build**, **Run it**, **The code**, **What is new**, **Try next**, **Reference**). A sample is not a game
of the catalogue: it is not on `games/index.ts`, has no card in `GAMES.md` and no live run. **A sample adds no rule
that no shipped mechanic has**; where a planned sample would need one, that part is a new game or mechanic and goes
to the owner (section 11).

### 3.2 Sample 2: combine mechanics (`samples/team-game/`)

Team tic-tac-toe: four residents in two teams, the board of `grid` (renamed by section 4), a `team-channel` per
team and a `consensus` vote before each move. New against sample 1: teams, three mechanics, a service one provides
and another requires, a grant override, `params` and `--set`, and **the same game as YAML** (needs issue 02). The
README shows the error a person gets when the vote's provider is left out (`SWT-G030`), taken from the test. Lines:
about 30 for `game.ts`, 25 for the test. It differs from `games/tictactoe` (no strategy brain, no referee, no
briefing file) so that the sample stays the smallest correct use.

### 3.3 Sample 3: roles and private texts (`samples/roles/`)

Sample 2's game with `roles` (game-level data, DECISIONS paper 04 #10): one captain per team, a briefing per role
and per resident (`briefing` of the game format), and what each resident can and cannot read (the team channel's
audience against the board). **First test:** whether the game format lets two residents play on different models;
today `model` is one choice for every resident (`packages/contracts/src/game/game.ts`). If it does not, mixed models
per resident are not taught and not added (a change of the frozen game format for a sample); the README says that a
run with mixed models is an experiment arm. The hidden-role game of paper 04 ("one saboteur") is a new game: the
owner's (section 11). Lines: about 60 + 30.

### 3.4 Sample 4: a shipped Director and its dial (`samples/shipped-director/`)

A shipped Director placed in a small game, with its dial at two values and the difference read from the log. The
shipped Directors are those of `mechanics/city-directors`; the gamemaker's dial is `direction` (0, 4, 6, 8, 10). The
gamemaker needs `arena` (its look on `arena.round_end`) and `channels` (its notes), and `defineGamemaker({ facts,
events, every })` chooses what it reads (A73, A84). **First test:** sample 2's game with `arena` and `channels`
added and `defineGamemaker({ facts: [] , every: 2 })` plays a fake run whose gamemaker is asked every second round,
at direction 0 and 8, with a different system text. **Way out**, chosen by a decision row: the sample shows the
Confessor (`interpretations`) and its `every`, or the tick trigger `{ every: n }` of a Director written in the
sample, which gives J288's trigger its first user. Lines: about 45 + 30.

### 3.5 The game tutorial and the three tutorials as tests

Issue 12 writes `docs/tutorials/game.md` from samples 1 to 4, every code block an include of a file of a sample. A
gate (`scripts/gates/tutorials.test.ts`) fails when a tutorial of `docs/tutorials/` (`game.md`, `mechanic.md`,
`director.md`; `scheduler.md` too) has a fenced code block that is not an include of a file of a sample or a block
marked `no-test` with its reason, or names a sample whose tutorial test does not exist. With it, 1.0 line 6 is a
test: the three first-hour tutorials pass when the tutorial tests of samples 1 to 6 pass. Sample 1 stays
`games/hello/` (the README's include); issue 22 makes it import `swarmtales` instead of `@swarmtales/sdk`.

## 4. The rename of original games

### 4.1 The rule (DECISIONS paper 03 D3)

"One name for original games, generic names for traditional rules. The renaming is one mechanical issue at M6,
before names are published; folder, package and log names only, never model-facing names." The game mechanics are
not frozen (A60), so the rename is no break of the freeze.

### 4.2 The table

| Game folder now | Game folder after | Mechanic now | Mechanic after | Why |
|---|---|---|---|---|
| `games/tictactoe-teams` | `games/tictactoe` (id `tictactoe`) | `grid-game` | `grid` | traditional rules get a generic name; teams are a parameter (paper 03, 4.4) |
| `games/hello` | unchanged | `grid-game` | `grid` | the same mechanic |
| `games/morris-teams` | `games/morris` (id `morris`) | `morris`, `morris-referee` | unchanged | teams are a parameter |
| `games/quarry` | unchanged | `draft-rounds` | `quarry` | an original game: one name |
| `games/lanterns` | unchanged | `clue-grid` | `lanterns` | the same |
| `games/harbor-lights` | unchanged | `hint-towers` | `harbor-lights` | the same |
| `games/ember-tricks` | unchanged | `trick-play` | `ember-tricks` | the same |
| `games/blind-bid` | unchanged | `sealed-auction` | `blind-bid` | the same |
| `games/econ-lab` | unchanged | `econ-games` | `econ-lab` | the same; the split into three rulesets of paper 03 is a recut, not a rename, and waits until after 1.0 |

Unchanged: chess, hold'em, liar's dice, Convoy, Salt Market (each has one name already), Whispers, the City and the
city slice, and the helpers (`card-table`, `strategy-brain`, `optimal-referee`, `team-channel`, `consensus`) and the
City cluster. A package is renamed with its mechanic: `@swarmtales/mechanic-<old>` becomes
`@swarmtales/mechanic-<new>`, `@swarmtales/game-<old folder>` becomes `@swarmtales/game-<new folder>`.

### 4.3 What changes, and what must not

| Changes | Must not change |
|---|---|
| folder names, package names, the mechanic id (and with it the event types `<id>.<event>`, the canonical tool names `<package>/<mechanic>/<tool>` and the sources in the log), the game id, the prompt folders named by mechanic id, the generated READMEs, API reports and `GAMES.md`, the layer table rows, `games/index.ts`, the README's include | every model-facing text: system texts, tool names, tool descriptions and parameters, refusal codes and texts, turn inputs and replies (D14, A50). **Proving test:** for every renamed game, the model inputs of a scripted run (the `request` records of a fake run at its fake seed, hashed per resident and turn) are byte-equal at the commits before and after the rename. A text that names a renamed id keeps the old word and is a row of the script's exceptions |
| the oracle comparison: the oracle files stay byte-equal to `legacy`; `runOracle` gets an option that maps renamed ids (an addition, 1.4) wherever an oracle file holds one: the event sources, the event types `<id>.<event>`, the fact names of an end reason (`limit grid-game.match`), the mechanic ids of `setup.mechanics[]` and the game id; and each oracle README gets one registered change "the mechanic is named `<new>`" | the level of any oracle test (3 stays 3) |
| the game hash of each renamed game (it hashes the game data with its mechanic ids) | the game hash of the City (none of its mechanics is renamed), so the Act I base stays resumable; a test of issue 06 resumes `city/base/city-001`'s snapshot at the commit after the rename |

**Recorded runs are data, not code.** A committed fixture run that names an old id (`apps/cli/test/fixtures/cap-run/`,
69 lines name `grid-game`, counted with `grep -c` on `797a55fa`; the legacy run of `packages/viewer-core/test/fixtures/`) is not rewritten: its chain and
hashes are what was recorded. A test that only reads it stays as it is; a test that plays it against the current
code gets the fixture written again by its generator in the same commit, which the commit body names. The kernel's
tests name `grid-game` too; they change, the kernel's source does not (no kernel line). The dry run fails when a new
id equals an id of another mechanic or game kind it would clash with in one table (the installed table, the
catalogue of `games/index.ts`), so `quarry` as a mechanic beside the game `quarry` is checked, not assumed.

Two consequences are accepted and written into the gate: a run folder recorded before the rename replays at its
own code commit (its manifest names it), not at a later one, because its game file imports the old package names;
and the lab's `sameArm` (`packages/lab/src/experiment/compare.ts`, which compares `game.hash`) does not pair a run
before the rename with one after it, so no series of M6 spans the rename.

### 4.4 How it is done

Issue 05 writes `scripts/rename/rename.ts`: the table of 4.2 as data, a dry run that lists every file and line it
would change, and an apply that moves folders (`git mv`), rewrites package names, imports, mechanic ids, the
workspace and `tsconfig` references, and then runs the generators (`pnpm docs:mechanics`, `pnpm docs:games`,
`pnpm api:update`); its test runs it on a fixture tree. Issue 06 applies it in one commit. The renamed files are the
script's output and do not count against the 400-line rule; the issue's hand-written lines are the oracle README
rows, the exceptions and the fixes the check asks for. After the apply, the name lint gets the old package names
and mechanic ids as retired identifiers, in a list of their own in `scripts/lib/names.ts` (not `RETIRED`, whose
words the glossary test requires in `docs/GLOSSARY.md`); they may still stand only in oracle files, run data
(`games/*-ledger.jsonl`, `apps/cli/test/fixtures/`, `packages/viewer-core/test/fixtures/`), carried docs
(`docs/refactoring-before-release/`, `docs/ideas/`, `LESSONS-LEARNED.md`, `FINDINGS.md`, the record, the runs
indexes' data paths, and the records of past runs: `docs/M2-GATE.md`, `docs/M4-GATE.md`, `docs/M4-REVIEW.md`,
`docs/RERUN-PLAN.md`, `docs/RERUN-PLAN-M4.md`) and the errata. Every other doc that names an old id today
(`README.md`, `GAMES.md`, `docs/SCHEDULERS.md`, the generated mechanic READMEs, TSDoc examples in `packages/sdk`,
`packages/lab`, `packages/prompts` and `apps/cli/src/run.ts`) is rewritten by the apply.

## 5. `swt doctor` and `--online`

DECISIONS paper 04 #12: "Opt-in flag, cost printed first; built at M6". `process.env` is read in
`apps/cli/src/env.ts` only, keys in the key broker of `packages/models` only (A13).

| | `swt doctor` (issue 03) | `swt doctor --online` (issue 04) |
|---|---|---|
| reads | the Node version against `.node-version`'s major and the `engines` of the installed `swarmtales`; the versions of the installed `@swarmtales/*` packages (in step per version line, 6.1); per provider whether a key is set and under which name (`SWT_ANTHROPIC_API_KEY` or `ARENA_ANTHROPIC_API_KEY`; `SWT_OPENROUTER_API_KEY` or `OPENROUTER_API_KEY`), never its value; the other `SWT_` names it knows | the same, then per provider with a key (or only those of `--provider`): the estimated cost of one minimal request from the price table, printed first, then that request (the provider's cheapest alias, one input line, an output cap of 1 token), its answer time, and the cost of its usage |
| writes | nothing; one line per check, `ok`, `warn` or `fail`, and `--json` | the same; with `--ledger`, a reservation and a cost line like a run |
| caps | none | `--budget` (default 0.01 USD) held by the cost meter; a provider whose estimate is above the budget is skipped with `warn` |
| exit | 0 all ok, 1 a `fail`, the code of a usage error as the other commands | the same; a refused key or an unreachable provider is a `fail` |
| test | offline, the environment and the installed tree as fixtures | offline, a fake provider behind the model port; the canary test scans the printed lines and the `--json` |

The CLI's table gains the command (an addition to `cli.json`). One online call is recorded live by issue 25, with
`--provider anthropic` only: the environment also holds an OpenRouter key, and OpenRouter spending stays small
(`CLAUDE.md`).

## 6. Names and publishing

### 6.1 What is published (A123)

`scripts/release/packages.json` lists every package of the release with its folder and its version line. The gate
`scripts/gates/release-list.test.ts` (issue 07) fails when a workspace package is neither on the list nor
`"private": true`, when a listed package depends on a workspace package that is not listed, or when a listed package
lacks `files`, `license` (`LicenseRef-SUL-1.0`), `repository`, `engines`, a `types` entry of every export, or a
README.

| Line | Packages | Version at 1.0 |
|---|---|---|
| platform | `swarmtales` (the umbrella, with the `swt` bin of `@swarmtales/cli`), `@swarmtales/cli`, `contracts`, `kernel`, `sdk`, `engine`, `chain`, `prompts`, `runlog`, `testkit`, `models`, `lab` (needed by the CLI; no stability promise, `docs/reference/stability.md`), the base mechanics and `@swarmtales/mechanic-contracts` | `1.0.0`, all in step |
| plugins | every other mechanic under `mechanics/` (the renamed names of section 4), `@swarmtales/city-directors` | `0.1.0` in step: they are not frozen (A60), and a minor of a `0.x` package may break |
| not published | `games/*`, `samples/*`, `apps/viewer-web`, `packages/viewer-core`, `packages/viewer-ui` | private |

The CLI gets a `tsdown` build and its `bin` (`dist/bin.js`). A package manager links the bins of the direct
dependencies only, so the umbrella declares its own `bin` `swt`, a file of a few lines that starts the CLI's
exported entry; one install of `swarmtales` gives the builder API and the command line (paper 04, 2.1). Every tarball carries `LICENSE` and `NOTICE`
(copied into the package by its `prepack`, or by the build into `dist/`; which one, issue 07 decides by measurement
of the check) and its README; a frozen package also its API report.

### 6.2 The content of a tarball

Checked by the packed-install gate for the tarballs it packs, and by `pnpm release:check` for all: `LICENSE`,
`NOTICE`, `README.md`, `package.json` with `license` and exact versions of every dependency, `dist/` with `.js` and
`.d.ts` for every export, no test file, no `.env`, no `.npmrc`, no file outside `files`; `swt scan` of the unpacked
tarballs is clean (no key canary, no local path). Also: every file that the tarball's `NOTICE` names is in the
tarball or the `NOTICE` of the tarball does not name it (the root `NOTICE` names `LICENSE-FAQ.md`,
`THIRD-PARTY-LICENSES.md` and `third_party/`); no third-party package is inlined into `dist/` by the build (every
import of a package stays external), or the tarball carries its licence; and a third-party file that a package
needs at run time ships with its licence and its manifest row. The one case today: the CLI's chess analysis looks
for `third_party/garbochess/garbochess.js` (BSD-3-Clause) in a folder above its own (`apps/cli/src/chess-engine.ts`,
`ENGINE_PATH`), which an installed `@swarmtales/cli` does not have; issue 07 either ships the file with its
`LICENSE` in the CLI's tarball or makes the command refuse with an `SwtError` that says it runs in a clone only.

### 6.3 The release scripts (issue 21)

| Command | What it does | Network |
|---|---|---|
| `pnpm release:check [<version>]` | packs every listed package into a temporary folder, runs 6.2 on each, checks the version lines (one version per line, the plugins' line below the platform's), that `THIRD-PARTY-LICENSES.md` is fresh, that the tree is clean and the head is on `rewrite/develop` (`develop` after the switch, A5), and prints the exact publish commands for the owner, in dependency order | none |
| `pnpm release:version <platform> <plugins>` | writes the versions into every listed `package.json`; its commit is the release candidate (an integrator's commit) | none |
| `pnpm release:names` | asks the registry, read-only, whether each planned name and the scope are free or held by the owner's account (an HTTPS `GET` of `https://registry.npmjs.org/<name>` with Node's `fetch`, not `npm view`: the npm command line is under Artistic-2.0, which is not on the allowlist, and `pnpm view` hands the command to npm) | read-only, by hand, never in a test |

No script of the repository runs `npm publish`, `pnpm publish`, `git push` or `git tag` against the remote; a test
reads `scripts/release/` (its tests included) and fails on any of these words outside a printed command. The printed
publish commands use `pnpm publish` (MIT), never the npm command line. The tests of issue 20 build the states of their
fixture remote inside the bare repository itself (`git -C <bare> update-ref`), so they need none of these words.

### 6.4 `docs/RELEASE.md`

The checklist the owner works through, in order, each step with its commands, what to check after it and how to
undo it while it can be undone: O2 (reserve `swarmtales`, `@swarmtales`, `create-swarmtales`), the legal look at
`LICENSE` that A65 suggests, O3 (tags and the switch, 7.3 and 7.4), O4 (Actions and branch protection, with the
checks `check` and `Licence gate`, and `Packed install` if A120's way out is taken), O8 (the data repository, 7.1),
O10 (public), O12 (publish in dependency order with 2FA, the tag `v1.0.0`, the GitHub release), and what is not
recommended before 1.0 (O6, O11, O13). Issue 21 writes it; the gate of M6 checks that every command it names exists.

## 7. The data repository, the legacy removal, the main switch

### 7.1 The data repository (O8, A129)

A15 kept the run data on the orphan branch `data/runs` of this repository until the owner creates
`swarmtales-runs` at release. The move keeps every commit id: the branch is pushed as the default branch of the new
repository, so every "data commit" of a runs index stays true. Issue 17 writes `scripts/release/data-repo.ts`:

- `--dry-run` (the default): lists what the new repository's first push holds (`data/runs` at its head), checks
  that every row of every `games/*/RUNS.md` names a path and a data commit that exist on `data/runs`, that
  `swt scan` is clean over the branch, and that the branch has its `README.md` and a `LICENSE` (the project's,
  A65); prints the owner's commands (create the repository, push the branch, set it as default). The branch has
  no `LICENSE` today (`git ls-tree origin/data/runs` on `797a55fa`), so issue 17 adds the project's `LICENSE` to
  `data/runs` in one data commit, which the integrator pushes after the leak scan (A25), before its dry run can pass;
- the link classes of 7.2 for every link to `tree/data/runs` (9 today, in `README.md` and `docs/FINDINGS.md`).

### 7.2 The save list (REWRITE 4.1, DECISIONS 8.4), with its status

| Must outlive `legacy` | Where | Status at the start of M6 | M6 |
|---|---|---|---|
| oracle files | `oracles/` | done (M0) | none |
| lessons log, findings, runtime revisions: their links to `v0-final` | rewritten to the data repository or `docs/history/` before O6 | 344 links in 22 Markdown files | issue 17 classifies every link (a gate: run data, a carried doc, old code, unknown; unknown fails); issue 28 rewrites them after O8 |
| the recorded runs (`stories/*/runs/`, `examples/`, about 787 MB) | `swarmtales-runs/legacy/stories/…` and `legacy/examples/…`, same relative paths | not copied | issue 18: `scripts/release/legacy-runs.ts` builds the tree from `v0-final` into a local branch `data/legacy-staging` (never pushed by an agent), with a sha256 manifest and an `swt scan` report; the owner pushes it into the data repository. A build session's container is ephemeral (A25), so the branch an agent stages is lost with it: the owner runs the script on his own clone (a step of `docs/RELEASE.md`) and compares its manifest digest with the one issue 18 records; about 816 MB in 8902 files under `stories/` and `examples/` at `v0-final`, largest file 7.9 MB |
| the carry list of 3.10, each mechanic's tests, the legacy log reader of the viewer | on `main` | done (M1 to M5) | the gate of M6 confirms it row by row |
| papers of `docs/ideas/` and `docs/design/` that a kept doc cites | `docs/history/` | not copied | issue 19 carries the cited ones, each with a header "written for the old platform" |
| bridge runs and the noise floor on the old code | the data repository | on `data/runs` under `legacy/` | none |
| the whole old state | `git bundle create swarmtales-v0-final.bundle v0-final`, kept by the owner outside GitHub | not made | owner's hand before O6; `docs/RELEASE.md` names the command and `git bundle verify` |

The deletion of `legacy` and `v0-final` (O6) is the owner's, after 1.0, after every row above is ticked. Old code
links cannot be rewritten into the data repository: the link script rewrites them to a code span
(`v0-final:<path>`) with one sentence that the bundle holds them.

### 7.3 The main switch (O3, A130)

Today `main` and `legacy` both point at `a73e6a9` on the remote, `v0-final` is a local tag only, and
`rewrite/root` (`89927a0`) is the root of `rewrite/develop` (390 commits). The switch makes `main` the new platform at
its last reviewed milestone and `develop` the line of work (A5). It replaces the history of `main`, so it is a force
push and the owner's. Issue 20 writes `scripts/release/switch-main.ts`:

1. **checks, read-only:** `git ls-remote` shows `legacy` at `a73e6a9` and `v0-final` on the remote at `a73e6a9`
   (until then it stops: "push the tag first"); the target commit (the close of the last reviewed milestone: M5's
   `4604a127`, or M6's after its review) descends from `rewrite/root`; the target's check is recorded green; and the
   open pull requests whose base is `main` (read-only, through the GitHub API), because DECISIONS 8.3 planned a
   rename, which open pull requests follow, and a force push leaves them against an unrelated history: the printed
   steps retarget each of them to `legacy` before the push;
2. **prints** the owner's commands: the tag pushes of 7.4; `git push origin <target>:refs/heads/main
   --force-with-lease=main:a73e6a9214767509c042cf572ba87ef586e133cc`; `git push origin
   rewrite/develop:refs/heads/develop`; set `main` as the default branch; O4;
3. **after**, `--verify`: `main` at the target, `develop` at `rewrite/develop`, `legacy` and `v0-final` unchanged.

The undo while `legacy` exists: push `a73e6a9` back to `main` with `--force-with-lease` (DECISIONS 8.5). After the
switch, issue 29 moves the workflows' triggers and the docs that say "until the switch" from `rewrite/develop` to
`develop`; deleting `rewrite/root` and `rewrite/develop` is the owner's.

### 7.4 Tags owed

| Tag | Commit | Source |
|---|---|---|
| `v0-final` | `a73e6a9` | DECISIONS 8.3; local only today |
| `runtime-r3` | `9d3ba515` (M1-06, the commit that set `RUNTIME_REVISION = 3`; `git log -S` on `packages/kernel/src/revision.ts`): a tag marks the commit a revision starts at (`docs/RUNTIME-REVISIONS.md`, line 19), and "set when `main` moves" says when, not where; the switch target is at revision 7 or 8 | `docs/RUNTIME-REVISIONS.md`; issue 20 writes the commit into the row r3 |
| `runtime-r4`, `runtime-r5`, `runtime-r6` | `b158a5b`, `6d1a685`, `390448d` | `RESUME.md` |
| `runtime-r7` | `d022725` | `RESUME.md` |
| `runtime-r8` | the merge of issue 16, if built | B2 (section 8) |
| the milestone tags of M1 to M6 (`milestone-m1` to `milestone-m6`, decision 6 of section 16) | their close commits, read from the record | E3 ("`main` moves only at milestone tags"); none is set today |
| `runs/m5-5a`, `runs/m5-5c` (optional) | `8e11ab1e`, `0d119aa9` | finding 7 of `docs/M5-REVIEW.md`: the manifests of two Act II runs name commits on no branch |
| `v1.0.0` | the release commit | O12 |

`switch-main.ts` prints them from `docs/RUNTIME-REVISIONS.md` and `RESUME.md` and checks that each commit exists.
Every tag push is the owner's (O3: the build session cannot push tags).

## 8. The carries of M5

| Carry | What M6 does | Issue |
|---|---|---|
| J318 (A117 names J319): the TSDoc of the frozen `checkResumeEveryBoundary` says "for every boundary" while it samples | the TSDoc says what it does; a row `addition: docs only` in `docs/API-FREEZE.md`; the five test titles and the tutorial sentence J318 lists | 13 |
| P494: run 1 of Whispers on a dirty tree, and no record says so | `swt report` names `kernel.dirty: true` in its header; the row of `games/whispers/RUNS.md` says "dirty tree"; a line of the design checklist: a runs index row names a dirty tree | 14 |
| P493: the report of a resumed run counts its base | `swt report` of a resumed run counts from the last `run_resumed` and shows the base's part apart, its header naming the base | 14 |
| P488: a paused run gets no report | `swt report` writes a report of a paused run, its facts marked "up to the pause" | 14 |
| B3 (J309): 16 tests in 10 files depend on their order | each made independent; the check runs the tests with `--sequence.shuffle` and a seed derived from the head commit, printed in the summary, so a failure is reproducible | 15 |
| B2 (rest of P480): the guard answers by a tool | the guard's review is answered by a tool call of an answer tool, as its carried text says ("call the tool", J174), in `packages/models` and the guard of `mechanics/city-directors`; an unreadable answer is logged as today; the answer tool is offered only to a Director that asks for it (the guard), so the requests of the Confessor and the judge, whose carried texts say "call the tool" too (J174, J177), stay byte-equal and the City's game hash does not move (a test resumes `city/base/city-001`; if it moves, issue 27's trigger holds); the tool's name and description come from what the guard already passes (its `output` schema and the carried text `guard/tool-verdict`), not from a new field of the sdk's Director definition, because the sdk has no line booked for B2 (1.3); **runtime revision 8**, a row in `docs/RUNTIME-REVISIONS.md`, the tag owed; one live Whispers run (issue 26) | 16 |
| B1 (P486): the rumours variant keeps delivery receipts though its text says the city keeps no proof | A104 named it an issue after the baseline but chose no option; both options change a game rule or a game text, so the choice is **the owner's** (section 11); once chosen it is one issue with its own runtime row, added by a decision row, not planned here | none |
| P495: the Confessor writes no classifier name | the fix changes the City's game hash, which the base binds (A54); it lands with the next base, which is the owner's go (section 11), or, if an M6 issue changes the City's hash anyway, in issue 27 with a replacement base | 27 (conditional) |

## 9. The check budget

The cold full check is green in 474.5 s of 600, peak 5660 MB of 6144 (A117). M6 keeps it so:

| M6 adds | Planned cold cost | Where |
|---|---:|---|
| the packed-install gate | at most 45 s | lane 0, after the build |
| the CLI's build | at most 5 s | lane 0, in the build |
| the tests of samples 2 to 4, `doctor`, the release, switch, data and link scripts, the tutorials gate | at most 15 s of test time | the test lane |
| the typecheck and lint of three new sample packages, the new scripts and the fixture packages | not estimated; measured by issue 00 (stubs) and by 09 to 11 | lane 0, in `pnpm lint` |
| B3's shuffle | none | |

Lane 0 runs lint, build and the API reports one after the other and is the critical path, so the packed-install gate
and the CLI's build add their full 50 s to the total: 474.5 s plus 50 s is about 525 s before the typecheck of the
new packages, 15 s under the goal. Lever 1 below is the likely one; the peak of 5660 MB leaves 484 MB for an offline
install that runs while the tests of lane 2 hold their workers.

**Rules.** The goal stays 540 s (A107); the budget of 600 s and 6 GB stays. Every issue that adds a gate names its
measured cold cost in its commit body. The integrator measures the cold check (`clean.sh`, nothing else running) after
waves 3 and 5 and at the gate. Above 540 s, the levers in this order, each measured and written as a decision row:
(1) A120's way out for the packed-install gate; (2) the command-line plays of Whispers and the City (J305, J308);
(3) the API reports' concurrency (J309). No gate, lint rule or test is dropped.

## 10. Live runs

### 10.1 Rules

Haiku through Anthropic (`claude-haiku-5-5`) for every live call, residents and Directors (A52). Every run under
`games/m6-ledger.jsonl` (`--ledger`), with its `--budget`; the caps are refusals by code (A14). The plan is
`docs/RERUN-PLAN-M6.md`, committed before the first run (issue 23). Each folder verifies, replays equal, is clean
under `swt scan`, goes to `data/runs` with its README (loopholes, problems, solutions), a row in its runs index with
its runtime revision and `kernel.dirty` (P494), rows in `docs/LESSONS-LEARNED.md`, and the short German summary to
Flo. A run tunes nothing. One run in flight at a time.

### 10.2 The runs and the cap (A125)

| # | Run | Why (done-when) | Cap | Expected | Issue |
|---|---|---|---:|---:|---|
| 1 | `tictactoe` (renamed tic-tac-toe teams), the default game, its first fake seed | 1.0 line 3: the only game without a live run (A124) | 0.30 | 0.10 | 24 |
| 2 | `swt doctor --online --provider anthropic`, from the packed install | done-when 4 | 0.01 | 0.0001 | 25 |
| 3 | the Hello Game from the packed install, `swt run game.ts` live | the release smoke: the built `dist` against the real provider (6.1); it needs no winner (P445) | 0.03 | 0.002 | 25 |
| 4 | Whispers `whispers`, seed 11, 45 ticks, under runtime revision 8 | B2's check: the guard's answers are read (r7 run 2: 2 of 19 unreadable) | 1.00 | 0.25 to 0.95 | 26 |
| | reserve: a second attempt of one run above, or a replacement Act I base (issue 27, by a decision row) | | 1.00 | | |
| | **M6 cap** | | **3.00** (A125): 1.34 for the four runs and 1.00 of reserve make 2.34; 0.66 is not booked (proposed row PD3) | **0.36 to 1.06** | |

Run 4's expectation: 0.25 is the cost of `whispers-001-r7`, which played the variant `whispers-rumours` under r7
(0.2145); the variant `whispers` at seed 11 and 45 ticks, which run 4 plays, cost 0.9517 under r6 (`whispers-001`, 63
answers above the second price tier, P479), against a cap of 1.00. If run 4 reaches its cap before tick 45, the
reserve pays its second attempt only after a decision row; B2's check reads the reviews that were played.

The rewrite has spent 9.6985 of 50 USD on this platform; with the cap of M6 it stands at 12.70 at most. The owner's
go items of section 11 that cost money (two more Act I bases, 12 residents, a DeepSeek gamemaker) are outside this
cap.

## 11. The owner's

### 11.1 The owner's hand: actions outside the repository

None of these is done by an agent. Each is prepared in the repository; the column "Prepared by" names the issue.

| # | Action | When | Prepared by |
|---|---|---|---|
| O2 | reserve the npm name `swarmtales`, the scope `@swarmtales`, `create-swarmtales` | now, before the publish; `pnpm release:names` says whether they are held | 21 |
| O3 | push the tags of 7.4; force-push `main` to the new platform; create `develop`; set the default branch | after the milestone review of M5 (done) or of M6; `v0-final` first | 20 |
| O4 | Actions on; protect `main`, `develop`, `legacy`; required checks `check`, `Licence gate` (and `Packed install`) | with O3 | 21 |
| O6 | delete `legacy` and `v0-final` | after 1.0, after the save list of 7.2 is ticked and the bundle is kept | 17, 18, 19, 28 |
| O8 | create `swarmtales-runs`, push `data/runs` and the staged legacy runs | before the release; links rewritten after it (issue 28) | 17, 18 |
| O9 | Pages from the new `main` | with O3, if the viewer is deployed | none in M6 |
| O10 | make the repository public | the owner's choice; not before the license look | 21 |
| O11 | a domain | not recommended before 1.0 (no docs site) | none |
| O12 | publish to npm, tag `v1.0.0`, the GitHub release | after the milestone review of M6 and O2 | 07, 21 |
| O13 | a trademark | not recommended before 1.0 | none |
| | the look at the final `LICENSE` text by a lawyer (A65: "not legal advice") | before O10 and O12 | 21 |
| | one look at the provider's usage page against the ledger of M5 (2.2980) and of M6 | after each run | 24 to 26 |

The short German summary of each live run is not the owner's hand: `CLAUDE.md` ("After every live run", point 5)
makes it the job of the session that played the run, in its reply to Flo; issues 24 to 26 name it in their done-when,
and the gate of M6 lists whether the summary of the M5 runs (open in `docs/M5-GATE.md`, "Left open") was given.

### 11.2 Needs the owner's go: decisions

Nothing here is decided by this file, and no issue builds it.

| # | What | Proposal | Why it is the owner's |
|---|---|---|---|
| 1 | the quests mechanic | a brainstorm first, after 1.0 | a new mechanic idea |
| 2 | the hidden-role game of paper 04's sample 3 ("one saboteur"), and any game a run suggests | a brainstorm first | a new game |
| 3 | B1 (P486): the rumours variant without delivery receipts, or its rule text saying that a receipt proves delivery, never content | options laid out in P486; the leaning is the text change (no rule moves) | a game rule or text |
| 4 | P445: the Hello Game's tick limit (12 ticks hold 8 of 9 moves live) | 20 ticks, before the release smoke, so the first live run a reader makes shows a result | a game rule of sample 1 |
| 5 | P484, P485, P491, P492, LH21, P465 | proposals in their rows | game rules or prompts |
| 6 | two more Act I bases, so that Act II comparisons are evidence; P495 lands with the next | after 1.0 or in M6 with its own cap | money; a series |
| 7 | runs with 12 residents | after Act II at six, which holds (M5) | `CLAUDE.md` |
| 8 | a gamemaker on DeepSeek via OpenRouter | an arm after 1.0 (A52) | money on OpenRouter |
| 9 | a break of the frozen API | none planned | A60 |
| 10 | spend above the cap of M6 | none | money |
| 11 | publishing the games, `npm create`, the docs site | after 1.0 | the 1.0 list does not need them |

## 12. Stop rules and the softer check

M6 is **stopped and planned again** when one of these holds:

1. more than 62 issues are merged or open (A19: twice the plan of A118);
2. a kernel line is added, or kernel + sdk + engine is above 4100;
3. a renamed game does not match its oracle files at level 3 with the mapping, or a model-facing text changes: the
   rename is reverted and replanned;
4. the cold check cannot be brought under 600 s by the levers of section 9.

**The softer check of M6**, answered by the gate issue in `docs/ISSUE-RECORD.md`:

| Question | Planned answer |
|---|---|
| Did M6 add a kernel line? | no |
| Where do the budgets stand? | kernel 1473, total at most 4080 |
| Did an outside plugin need a mechanism the sdk does not offer? | no; if the packed-install gate finds one, it is named and goes to after 1.0 or to a decision row |
| Did the frozen surface take a break? | no; the additions of 1.4, each with its row |
| Is every line of the 1.0 list held, and by what? | the table of the gate, line by line |
| What is left for the owner? | 11.1 and 11.2 with their status |

## 13. Issues

Rules as in M1 to M5: at most 400 hand-written lines per issue, tests included, carried and generated lines not
counted (the rename's output, generated READMEs, API reports, carried docs); the allowed paths are a fence; `pnpm
check` green before the merge, run by the integrator. Ids are `M6-00` to `M6-30`; the table writes the number only.
An issue whose "done when" starts with **First test** runs that test first and follows its way out when it fails.

**The budget (A19, A118): 31 issues planned, of them three conditional (27, 28, 29, each built only when its trigger
holds). The cut list of 13.2 is applied when 40 issues are merged or open; M6 is stopped and planned again above
62.**

| # | Title | Scope and done when | Allowed paths | Depends on | Lines | Variable |
|---|---|---|---|---|---:|---|
| 00 | Scaffold of M6 | the budgets at the start measured into the record; the sentences of 13.1; the open questions of section 20 and the owner's lists of section 11 in the resume note; the three sample packages with README stubs, their workspace and `tsconfig` entries and their layer rows; `games/m6-ledger.jsonl` with its cap line. Done when the layer check, the workspace gate and the licence gate are green | `samples/{team-game,roles,shipped-director}/` (stubs), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, root `tsconfig.json`, `docs/LAYERS.md`, `docs/ISSUE-RECORD.md`, `docs/refactoring-before-release/{REWRITE.md,RESUME.md,12-m5-spec.md}` (the third sentence of 13.1 is in `12-m5-spec.md`), `games/m6-ledger.jsonl` | none | 150 | none |
| 01 | The run-time check of service calls (A37, `interface-change`) | 2.3. **First test:** every test of the repository with the check on. Done when a test mechanic that calls an undeclared service through `call`, `tryCall` and `has`, in a tool, a hook and a fact, is refused with the new code, and every oracle and standing test is green; sdk at most +15 | `packages/sdk/src/mechanic/`, `packages/sdk/test/`, `packages/sdk/sdk.api.md`, `docs/reference/errors.md`, `scripts/api-freeze/` (the record), `docs/API-FREEZE.md` | 00 | 140 | kernel |
| 02 | The installed table of a project; a data game with a Director (A121, P2) | 2.4. Done when a YAML game in a fixture project names a mechanic and a Director of its own dependencies by id and plays fake, verifies and replays, and the games of the repository load as before | `apps/cli/src/{installed.ts,run.ts,report.ts,load-game.ts}`, `apps/cli/test/`, `docs/reference/cli.md`, the error docs and the frozen record if a code is added | 00 | 300 | none |
| 03 | `swt doctor` (`interface-change`) | section 5, the offline column. Done when its tests pass on fixtures of the environment and of an installed tree (a key set under each name, none, a stale version, an old Node), the canary test holds, and `cli.json` has the addition row under the decision row of PD1; the Node it accepts is the line PD2 settles (an installed tree has no `.node-version`, so outside the repository only `engines` counts) | `apps/cli/src/`, `apps/cli/test/`, `docs/reference/cli.md`, `docs/reference/errors.md`, `scripts/api-freeze/` (the record), `docs/API-FREEZE.md` | 00, PD1 | 280 | none |
| 04 | `swt doctor --online` (`interface-change`) | section 5, the online column; a minimal request through the model port with the cost meter and the ledger. Done when the offline tests with a fake provider show: the estimate printed before the request, a provider above the budget skipped, a refused key a `fail`, `--provider` choosing one, the ledger lines | `apps/cli/src/`, `apps/cli/test/`, `packages/models/src/` (a minimal request, if the port lacks one), `packages/models/models.api.md`, `docs/reference/cli.md`, `docs/reference/errors.md`, `scripts/api-freeze/`, `docs/API-FREEZE.md` | 03 | 320 | none |
| 05 | The rename 1: the script | 4.4: `scripts/rename/rename.ts` with the table of 4.2, the dry run, the apply, the exceptions list; the `runOracle` option that maps renamed sources (testkit, an addition). Done when the script's test renames a fixture tree and the dry run on this repository lists the changes of 4.3 and no model-facing text | `scripts/rename/`, `packages/testkit/src/oracle/`, `packages/testkit/test/`, `packages/testkit/testkit.api.md`, `scripts/api-freeze/`, `docs/API-FREEZE.md` | 00 | 330 | none |
| 06 | The rename 2: apply | the script applied in one commit; the oracle README rows; the name lint's retired identifiers. **First test:** the model inputs of every renamed game's fake run hashed before the apply. Done when they are byte-equal after it, every oracle test is at level 3, the City's base snapshot resumes, and the check is green | every path the script writes (4.3), `oracles/*/README.md`, `scripts/lib/names.ts` (the list of retired ids of 4.4, beside `RETIRED`), `scripts/gates/` | 05 | 200 | none |
| 07 | Packaging: the published list (A123) | 6.1: `scripts/release/packages.json` and its gate; `files`, `repository`, `engines`, versions lines, LICENSE and NOTICE in every tarball; the CLI's build and `bin`; the umbrella's `swt` and its dependency on `@swarmtales/cli` (today it depends on `sdk` and `testkit` only); the chess engine of 6.2. **First test:** the game hash of `city/base/city-001` is unchanged after the version fields change, and its snapshot still resumes. Done when the gate is green and `pnpm pack` of each listed package passes 6.2 | `package.json` of every listed package, `apps/cli/{package.json,tsdown.config.ts}`, `apps/cli/src/chess-engine.ts`, `packages/swarmtales/`, `scripts/release/packages.json`, `scripts/gates/release-list.test.ts`, `tsdown.base.ts`, `pnpm-lock.yaml`, `THIRD-PARTY-LICENSES.md` | 06 | 300 | none |
| 08 | The packed-install gate | section 2: pack, the offline install, samples 5 and 6 outside, the JavaScript mechanic and Director packages, the YAML game, the planted call, 6.2; its place in `check-run.ts`; its measured cold cost. Done when the gate passes, fails on a fixture with an undeclared call that is not refused, on a tarball without `LICENSE`, and on a missing `bin` (the three failing cases are tests of the gate's checks on prepared folders, not three more packs), and `pnpm test` does not collect it (2.2). If the way out of 2.1 (an outside lockfile written from the workspace's) or A120's CI job is needed, that part is a new issue by a decision row: 380 lines leave no room for it | `scripts/gates/packed-install.test.ts`, `scripts/gates/fixtures/outside/`, `scripts/lib/check-run.ts` and its test, `scripts/check.ts`, `vitest.config.ts` (the exclusion), `package.json` (the script `check:pack`) | 01, 02, 07, 15 | 380 | none |
| 09 | Sample 2 | 3.2, with its YAML form and the error of a missing provider. Done when its tests and its tutorial test pass | `samples/team-game/` | 02, 06 | 250 | none |
| 10 | Sample 3 | 3.3. **First test:** mixed models per resident in the game format. Done when its tests and its tutorial test (the lines of its `commands.sh`, 3.1) pass, its README has the fixed format of 3.1, and the README says what a resident reads and what it does not | `samples/roles/` | 09 | 250 | none |
| 11 | Sample 4 | 3.4. **First test** as there; way out by a decision row. Done when its tests show two runs with the dial at two values and a difference in the log, its tutorial test (the lines of its `commands.sh`) passes, and its README has the fixed format of 3.1 | `samples/shipped-director/` | 09 | 300 | none |
| 12 | The game tutorial and the tutorials gate | 3.5. Done when `docs/tutorials/game.md` holds only includes and `no-test` blocks, the gate fails on a fixture tutorial with a free code block, and the tutorial tests of samples 1 to 6 pass | `docs/tutorials/`, `scripts/gates/tutorials.test.ts`, `samples/*/test/tutorial.test.ts`, `games/hello/test/` | 09, 10, 11 | 300 | none |
| 13 | The docs-only row of `checkResumeEveryBoundary` (J318) | section 8. Done when `pnpm api:freeze` passes with the row `addition: docs only` | `packages/testkit/src/standing.ts` (TSDoc only), `packages/testkit/testkit.api.md`, `docs/API-FREEZE.md`, `scripts/api-freeze/`, the five test files and `docs/tutorials/mechanic.md` (titles and one sentence) | 00 | 60 | none |
| 14 | Reports: P494, P493, P488 | section 8. Done when the reports of a scripted paused run, a resumed run and a run on a dirty tree say so, with the base's part apart | `apps/cli/src/report.ts` and what it reads in `packages/lab/src/`, `apps/cli/test/`, `games/whispers/RUNS.md`, `docs/LESSONS-LEARNED.md`, `docs/reference/cli.md` | 00 | 320 | none |
| 15 | B3: tests independent of their order | section 8: the 16 tests of J309; the check's seed. Done when `pnpm test --sequence.shuffle --sequence.seed=<n>` passes for four seeds, and the check prints its seed | the ten test files of J309, `vitest.config.ts`, `scripts/lib/check-run.ts` and its test | 03, 04, 14 | 300 | none |
| 16 | B2: the guard answers by a tool | section 8. Done when a scripted guard answers by the tool and replays and resumes equal, the Whispers oracle tests stay at level 3, the revision is 8 with its row; engine at most +10, sdk +0; the requests of the Confessor and the judge in a fake City run are byte-equal before and after, and `city/base/city-001` resumes (section 8) | `packages/models/src/`, `packages/contracts/src/run/ask.ts` (`ModelQuestion`), `packages/engine/src/directors/`, `mechanics/city-directors/src/guard/`, tests, the API reports, `docs/RUNTIME-REVISIONS.md`, `docs/API-FREEZE.md`, `scripts/api-freeze/` | 00 | 350 | kernel |
| 17 | The data repository and the link classes | 7.1, 7.2 row 2: `scripts/release/data-repo.ts` (dry run) and `scripts/release/links.ts` (classify); a gate that every link to `v0-final` and `data/runs` has a class. Done when the dry run passes on this repository (after the `LICENSE` commit on `data/runs` of 7.1) and the gate fails on a fixture link of no class | `scripts/release/`, `scripts/gates/links.test.ts`, branch `data/runs` (the `LICENSE` only) | 00 | 330 | none |
| 18 | The legacy runs, staged locally | 7.2 row 3: `scripts/release/legacy-runs.ts`. Done when its test stages a fixture tag into a branch with the manifest and the scan report, and a run on this clone writes `data/legacy-staging` locally (not pushed) with its numbers and its manifest digest in the record, which the owner's own run of the script (a step of `docs/RELEASE.md`, issue 21) must reproduce | `scripts/release/`, `docs/ISSUE-RECORD.md` | 17 | 250 | none |
| 19 | `docs/history/` | 7.2 row 5: the cited papers carried from `v0-final` with their header; `scripts/lib/carried.ts` lists the folder | `docs/history/`, `scripts/lib/carried.ts` | 17 | 120 | none |
| 20 | The switch, prepared | 7.3, 7.4: `scripts/release/switch-main.ts` (checks, the printed commands, `--verify`). Done when its test passes on a fixture remote (a bare repository, its states made by `update-ref` inside it, 6.3) in each state: tag missing, ready, switched, an open pull request against `main`; and it prints `runtime-r3` at `9d3ba515` (7.4) | `scripts/release/`, `scripts/release/test/`, `docs/RUNTIME-REVISIONS.md` (the commit of the row r3) | 00 | 260 | none |
| 21 | The release scripts and `docs/RELEASE.md` | 6.3, 6.4: `release:check`, `release:version`, `release:names`; the test that no script publishes or pushes. Done when `pnpm release:check` is green on the head and fails on a fixture tarball without `NOTICE` | `scripts/release/`, `package.json` (scripts), `docs/RELEASE.md` | 07, 17, 20 | 350 | none |
| 22 | The docs of 1.0 | the README (status, install (until O12 the clone path stands first and the npm line says "from the release"), the commands from an install, "Choose your path" with its four targets, keys, honest limits, citation), at most 120 lines; sample 1 imports `swarmtales`; `GAMES.md`'s status; `docs/README.md`; `docs/RELATED-WORK.md` rewritten (DECISIONS section 4) and taken off the carried list; `docs/reference/stability.md` (semantic versions from 1.0, the two version lines); `CITATION.cff` (A132) | `README.md`, `GAMES.md`, `docs/README.md`, `docs/RELATED-WORK.md`, `docs/reference/stability.md`, `CITATION.cff`, `games/hello/`, `scripts/lib/carried.ts`, `scripts/game-docs/` | 12, 21 | 300 | none |
| 23 | The rerun plan of M6 | 10.2, the plan with its commands and caps | `docs/RERUN-PLAN-M6.md`, `games/m6-ledger.jsonl` | 06, 07 | 100 | none |
| 24 | Live: the tic-tac-toe baseline | run 1 of 10.2; 10.1, with the German summary in the session's reply (11.1) | `games/tictactoe/RUNS.md`, `games/m6-ledger.jsonl`, `docs/LESSONS-LEARNED.md`, branch `data/runs` | 23 | 60 | none |
| 25 | Live: the release smoke | runs 2 and 3 of 10.2, from the packed install of the release candidate, under the Node line PD2 settles; 10.1, with the German summary in the session's reply (11.1) | `games/hello/RUNS.md`, `games/m6-ledger.jsonl`, `docs/LESSONS-LEARNED.md`, branch `data/runs`, `docs/ISSUE-RECORD.md` | 04, 08, 22, 23 | 80 | none |
| 26 | Live: B2's check | run 4 of 10.2; 10.1, with the German summary in the session's reply (11.1) | `games/whispers/RUNS.md`, `games/m6-ledger.jsonl`, `docs/LESSONS-LEARNED.md`, branch `data/runs` | 16, 23 | 80 | none |
| 27 | P495 and a replacement base (conditional) | trigger: the owner's go for the next base, or an M6 change of the City's game hash. The Confessor's label; a new base by A54 from the reserve | `games/city/`, `games/city/RUNS.md`, `games/m6-ledger.jsonl`, branch `data/runs` | its trigger | 150 | prompts |
| 28 | The links rewritten (conditional) | trigger: O8 done. `links.ts --write`, every link to its class's target | the 22 files of 7.2 and the 2 of 7.1, `scripts/release/` | 17, O8 | 200 | none |
| 29 | After the switch (conditional) | trigger: O3 done. The workflows' triggers, `docs/LICENCE-POLICY.md` and the docs that say "until the switch"; the README's links to `main` | `.github/workflows/`, `docs/`, `README.md` | 20, O3 | 120 | none |
| 30 | Gate of M6 | the ten done-whens, the 1.0 list line by line (line 3: a baseline recorded before the rename counts for its renamed game, since it replays at its own code commit, 4.3; the gate names that commit per game), the softer check, the save list's status, the errata, REWRITE row M6 ticked, the resume note | `scripts/gates/`, `docs/` | everything not cut | 200 | none |

31 issues; the sum of the estimates is about 7,000 hand-written lines.

### 13.1 The sentences issue 00 changes

| File, place | Sentence today | Becomes | Decision |
|---|---|---|---|
| `REWRITE.md` section 4, after the table, "State of the milestones" | ends with M5 | adds: "M6: specified in `13-m6-spec.md` (31 issues, A118)." | A118 |
| `REWRITE.md` 3.8, "Samples 2 to 4 follow after M4." | as is | followed by: "They are built at M6 from shipped mechanics only (A128)." | A128 |
| `12-m5-spec.md` 1.4, the row "game-specific viewer views, the game tab": "M6" | M6 | "after 1.0 (A133)" | A133 |

### 13.2 The cut list

The integrator cuts from the top when the count reaches 40 merged or open, one entry at a time, each by a decision
row:

| Cut | What goes | Saved | What it costs |
|---|---|---|---|
| 1 | B2 and its live check (16, 26) | two issues, 1.00 USD of cap | P480's rest stays open after 1.0; no runtime revision 8 |
| 2 | P488 of issue 14 | part of an issue | a paused run keeps no report |
| 3 | run 3 of 10.2 (the Hello Game live from the packed install) | 0.03 USD | the built `dist` meets the real provider first at the owner's release |
| 4 | issues 18 and 19 move to after 1.0 | two issues | the save list waits; O6 waits for them anyway |

Never cut: 01, 02, 05 to 12, 17, 20 to 22, 24, 30.

## 14. Waves

Six builders at most. One integrator merges, in wave order.

| Wave | Issues | Opens when |
|---|---|---|
| 0 | 00 | A117 |
| 1 | 01, 02, 03, 05, 13, 17 | 00; 03 also the decision row of PD1 (its freeze row needs one) |
| 2 | 04, 06, 14, 16, 18, 20 | 03 for 04; 05 for 06; 17 for 18 |
| 3 | 07, 09, 15, 19 | 06 for 07 and 09 (09 also 02); 03, 04, 14 for 15 |
| 4 | 08, 10, 11, 21, 23 | 01, 02, 07, 15 for 08; 09 for 10, 11; 07, 17, 20 for 21; 06, 07 for 23 |
| 5 | 12, 24, 26 | 09 to 11 for 12; 23 for 24; 16, 23 for 26; 24 and 26 one after the other (one run in flight, 10.1) |
| 6 | 22 | 12, 21 |
| 7 | 25 | 04, 08, 22, 23 |
| 8 | 30 | everything not cut; 27, 28, 29 when their triggers hold |

**Longest chain:** 00, 05, 06, 09, 10, 12, 22, 25, 30: nine issues.

Issues that share files run in sequence:

| Files | Issues, in this order |
|---|---|
| `apps/cli/src/` | 02, 03, 04, 14, then 06 (it rewrites the TSDoc example of `run.ts` that names `grid-game`; `run.ts` has no default game) |
| `apps/cli/test/` and the files of J309 | 02, 03, 04, 14, then 15 |
| `scripts/api-freeze/`, `docs/API-FREEZE.md`, `docs/reference/errors.md` | 01, 02, 03, 13, 05, 04, 16 (each rebases and runs `pnpm api:freeze --write` and `pnpm docs:errors`) |
| `packages/models/src/`, `models.api.md` | 04, then 16 |
| `scripts/release/` | 17, 18, 20, 07, 21 |
| `scripts/lib/check-run.ts`, `vitest.config.ts` | 15, then 08 (15 is in wave 3, 08 in wave 4) |
| `games/m6-ledger.jsonl`, `docs/LESSONS-LEARNED.md`, branch `data/runs` | 00, 14, 17, 23, then 24, 26, 25 (one run in flight) |
| every path of the rename's dry run | 06 merges last in wave 2, after 04, 14 and 16; its dry run is made again on that head; no issue opens on a renamed path before it is merged |

Hidden dependencies that were checked:

| Looks independent | Is not, because | Handled by |
|---|---|---|
| 06 (the rename) and the samples | sample 2 imports `grid` | 09 after 06 |
| 07 (versions) and the City's base | a changed game hash voids the base (A54) | 07's first test; issue 27's trigger |
| 09's YAML form and the CLI | the installed table read the CLI's own `package.json` only | 02 before 09 |
| 08 and 01 | the planted call needs the check | 01 before 08 |
| 24 and 06 | the baseline is recorded under the final name | 24 after 06 (through 23) |
| 25 and 22 | the release smoke runs the README's commands | 25 after 22 |
| 16 (B2) and the City's base | an answer tool offered to every Director would change the Confessor's and the judge's requests, and one declared in the game data the City's hash | 16 offers it to the guard only, and its done-when resumes the base (section 8) |
| 08 and samples 5 and 6 | their code imports `@swarmtales/sdk`, `@swarmtales/contracts` and `@swarmtales/engine`, not `swarmtales` | the outside project lists the sample's own dependencies (2.1) |
| 08 and `pnpm test` | `vitest.config.ts` collects every `scripts/**/*.test.ts` into lane 2, before the build is done | the exclusion of 2.2, in 08 |

## 15. Risks

| # | Risk | Sign | Answer |
|---|---|---|---|
| 1 | the packed-install gate is slow on a cold machine | its measured cost above 45 s | A120's way out |
| 2 | a packed package resolves differently from the workspace (a missing `files` entry, an export that only `development` holds) | the packed run fails where the workspace one passes | that is the gate's purpose; the fix is in the package |
| 3 | the rename changes a model-facing text | the hash test of 06 | the text keeps the old word (an exception row) |
| 4 | the rename breaks paired comparisons | a series across it | none is planned; 4.3 |
| 5 | the version change or the rename voids the City's base | 07's first test, 06's resume test | issue 27 with the reserve |
| 6 | the shipped gamemaker does not play outside the City | 11's first test | its way out |
| 7 | B2 changes how Whispers plays, right before the release | the revision 8 row | it is cut 1; the baseline of M5 stays at r7 |
| 8 | an agent session publishes or pushes by mistake | a command in a script | 6.3's test; no token in the environment |
| 9 | the legacy runs hold a leak | the scan report of 18 | the owner decides before the push; nothing is pushed by an agent |
| 10 | the check budget | above 540 s | section 9 |

## 16. Decisions made in this file

| # | Decision | Reason |
|---|---|---|
| 1 | samples are named by what they teach (`team-game`, `roles`, `shipped-director`), not `NN-name` | the samples 5, 6 and the scheduler sample are named so already |
| 2 | the fixture plugins of the packed install are plain JavaScript | Node strips no types under `node_modules`, so a published plugin ships JavaScript |
| 3 | the gate packs the closure it needs, `release:check` packs all | the check budget |
| 4 | `swt doctor --online` has a `--provider` filter and a default budget of 0.01 USD | OpenRouter spending stays small; a cap is a precondition of a live call (A14) |
| 5 | the link script turns an old code link into a code span | old code has no place in the data repository; the bundle keeps it |
| 6 | the milestone tags are named `milestone-m1` to `milestone-m6`, at the close commit of each milestone, and the owner pushes them with the others of 7.4 | E3 moves `main` only at milestone tags, and no milestone tag exists; added by the independent challenge |

## 17. Decision rows for `DECISIONS.md` (A118 to A134)

| # | Decision, in short | Section here |
|---|---|---|
| A118 | issue budget: 31 planned (three conditional), cut list at 40, stop above 62 | 13 |
| A119 | the run-time check of A37 in the sdk, at most 15 lines; M6 books 25 of the 45 left | 1.3, 2.3 |
| A120 | the packed install: what it is; a gate in the check; its way out | 2 |
| A121 | the installed table reads the project's `package.json`; Directors by id; P2 | 2.4 |
| A122 | the rename table and its rules | 4 |
| A123 | what is published, the two version lines, the bin | 6.1 |
| A124 | what a recorded live baseline is for 1.0 line 3; tic-tac-toe's run | 10.2 |
| A125 | the live cap of M6: 3.00 USD | 10.2 |
| A126 | the carries: B2 built (revision 8), B3 built, B1 the owner's, P495 with the next base | 8 |
| A127 | the reports of a paused, a resumed and a dirty run | 8 |
| A128 | samples from shipped mechanics only | 3 |
| A129 | the data repository, the legacy runs, the links: prepared, the owner pushes | 7.1, 7.2 |
| A130 | the main switch: a dry-run script; the owner's force push with a lease | 7.3, 7.4 |
| A131 | the check budget of M6 | 9 |
| A132 | `CITATION.cff` written in the repository; RELATED-WORK off the carried list | 6.4, issue 22 |
| A133 | what M6 does not build | 1.5 |
| A134 | the owner's lists of M6 | 11 |

## 18. What M6 leaves for after 1.0

| Left | Why |
|---|---|
| the owner's go items of 11.2 | the owner's |
| game-specific viewer views | A133 |
| `npm create`, the scaffolds, watch mode, the docs site, `llms.txt`, samples 7 and 8, the fresh agent test | REWRITE 3.8 |
| publishing the games | A123 |
| the sandbox and a plugin manifest | 01 #8 |
| the game frame, the generic mechanics, the split of `econ-lab`, `parallel` in production | A31, A50, paper 03, A30 |
| O6 (the deletion of `legacy`) | after 1.0, by the save list |

## 19. What was checked and how

| Claim | Checked by |
|---|---|
| kernel 1473, sdk 2198, engine 384, total 4055; `apps/cli` 2031, `models` 1227, `testkit` 1058 | `codeLinesOf` of `scripts/lib/budget.ts` on `4604a127`, from a scratch script |
| the service calls are typed but not checked at run time | `packages/sdk/src/mechanic/context.ts` (`callChecked`, `tryCall`, `has`), `context-types.ts`; the provider's input check in `kit.ts` |
| the installed table reads only the CLI's own `package.json` | `apps/cli/src/installed.ts`, `run.ts` line 87 (`PACKAGE_FILE`) |
| the CLI has no build and no `bin`; every package is `0.0.0` and `private` | `apps/cli/package.json`, `packages/swarmtales/package.json` |
| no `doctor` command | `docs/reference/cli.md`, `scripts/api-freeze/surface/cli.json` |
| the games and the mechanics they load | the imports of `games/*/game.ts` and `src/` |
| tic-tac-toe teams has no live run on this platform | `games/*/RUNS.md` (no file for it), `git ls-tree origin/data/runs`, its README ("No run on this platform yet") |
| 344 links to `v0-final` in 22 Markdown files, 9 to `tree/data/runs` in 2 | `git grep -o` on the head |
| `main` and `legacy` at `a73e6a9` on the remote; `v0-final` and `runtime-r4` to `r6` local tags only; `rewrite/root` the root of `rewrite/develop` | `git ls-remote`, `git rev-parse`, `git merge-base --is-ancestor` |
| the game hash hashes the game data (mechanic uses), not the package versions | `packages/sdk/src/game/resolve.ts` (`assembled`, `jsonHash(filled)`) |
| one `model` for every resident in the game format | `packages/contracts/src/game/game.ts` |
| the gamemaker's facts, events and `every` are chosen by `defineGamemaker` | `mechanics/city-directors/src/gamemaker/director.ts` |
| A117 names J319 for the TSDoc row, which is J318 | `12-m5-spec-errata.md` |

**Not checked.** The author ran the line counter, `git` and `grep`, and read the files named. Settled by the first
test of the named issue, or a stated assumption: the cost of the packed-install gate (08); that `pnpm install
--offline` resolves on a fresh runner without a lockfile (08, with its way out in 2.1); that the rename changes no
model-facing text (06); that the gamemaker plays outside the City (11); the line estimates of section 13.

## 20. Open questions

| # | Question | Leaning | Settled by |
|---|---|---|---|
| 1 | Does the packed-install gate fit the check, or does it need its own CI job? | it fits (45 s) | issue 08's measurement |
| 2 | Can the game format express mixed models per resident? | no | issue 10's first test |
| 3 | Does the shipped gamemaker play outside the City? | yes, with `facts: []` | issue 11's first test |
| 4 | Does any model-facing text name a renamed id? | no | issue 06's first test |
| 5 | Are the npm names already reserved (O2)? | unknown | `pnpm release:names`, the owner |
| 6 | Does B2 need engine lines? | no | issue 16 |

## Challenge

Challenged on 2026-11-16 in a separate pass over the draft above, against the repository at `4604a127` and `legacy`
at `a73e6a9`. The counts of 1.3, the link counts of 7.2, the remote state of 7.3 and the tags of 7.4 were made
again and hold. Each row says what a hostile reader would attack, the evidence, and what changed above.

| # | What was wrong or unprovable | Evidence | What changed |
|---|---|---|---|
| 1 | "M6 changes no tool names or prompt texts" while B2 gives the guard a tool | A104 named B2 "after the baseline"; the guard is asked with `tools: []` (P480) | the "not" list names B2 as the one exception, by A104, under revision 8 |
| 2 | `pnpm install --offline` without a lockfile needs the registry's metadata, which a frozen install does not always cache; the gate could pass on a warm laptop and fail on a fresh runner | how a frozen install fetches by integrity | 2.1: a first test on an empty cache; way out: a lockfile for the outside project written from the workspace's, then A120's CI job; never a link into the workspace |
| 3 | the umbrella cannot "expose" the CLI's bin: only direct dependencies' bins are linked into `node_modules/.bin` | how package managers link bins | 6.1: `swarmtales` declares its own `bin` that starts the CLI's entry |
| 4 | the project of 2.1 runs `.ts` files; without `"type": "module"` Node reads them as CommonJS | `samples/own-*/package.json` all set it | 2.1 sets it |
| 5 | the rename touches more than games and mechanics: `apps/cli/src/run.ts` (the default game), the kernel's tests, a lab TSDoc, a committed fixture run with 66 lines of `grid-game` | `git grep` on the head | 4.3: recorded fixture runs stay as recorded or are written again by their generator; kernel source unchanged; 14's file sequence adds 06 after `apps/cli` |
| 6 | "06 alone in its wave" contradicted wave 2, which holds 04, 06, 14, 16, 18, 20 | section 14 | 06 merges last in wave 2, its dry run made again on that head |
| 7 | a renamed mechanic id may equal a game id (`quarry`) or another id in one table | 4.2 | the dry run checks clashes per table |
| 8 | `release:check` asked for the head on `develop`, which does not exist until the switch | A5 | `rewrite/develop` until the switch |
| 9 | B1 was called the owner's although A104 made it an issue | A104 | it stays without an issue because both options change a rule or text; A104 chose none; the owner chooses, a decision row adds the issue |
| 10 | the README of issue 22 would tell a reader to `npm install` a package nobody has published | O12 is the owner's, after the review | until O12 the clone path stands first |
| 11 | A117 cites J319 for the TSDoc row | `12-m5-spec-errata.md`: J318 is the TSDoc, J319 the lint signal | 1.2 and section 8 name J318; A126 says so |
| 12 | the game hash might hash the package versions, so 07's version bump would void the City's base | `resolve.ts` hashes the filled game data (mechanic uses, options, seed), no version | 07's first test proves it rather than assumes it; issue 27 stays conditional |
| 13 | the rename voids paired comparisons and the replay of old runs at the head | `compare.ts` compares `game.hash`; old game files import old names | written into 4.3 as accepted, no series spans the rename; old runs replay at their own commit |
| 14 | the saboteur sample of paper 04 and mixed models per resident would slip a new game or a format change into a sample | the game format has one `model`; paper 04 sample 3 | 3.1: a sample adds no rule; 3.3: the saboteur game is the owner's, mixed models a first test that is not a format change |
| 15 | a data game "names a Director" might need a format change of the frozen contracts | `packages/contracts/src/game/game.ts` already has `directors` | none needed: only the CLI's installed table lacks them (2.4) |
| 16 | a script that "prints" a push could be run by an agent as a push | 6.3 | the test that fails on `publish`, `git push`, `git tag` outside a printed string; no token in the environment |
| 17 | `doctor --online` could spend on OpenRouter by default | both keys are set here | `--provider`, the default budget of 0.01, the live run with `--provider anthropic` only |
| 18 | the data repository's licence | D12 spoke of Apache for data; A65 put everything under the project's licence | 7.1 checks the project's `LICENSE` on the branch |
| 19 | the cap of 3.00 USD looks large against an expected 0.36 | 10.2 | it is the sum of the per-run caps (2.34) and one reserve; the caps refuse by code, so the spend cannot pass the parts |

**Open points after the challenge** (they need a first test or the owner, not a better text): the offline install
on a fresh runner (row 2); whether the shipped gamemaker plays outside the City (3.4); whether the game format can
take mixed models (3.3); the owner's choice for B1 and P445; whether the npm names are free (O2).

## Independent challenge

Challenged on 2026-11-16 in a separate session that saw only this file, the documents it cites and the repository,
not the author's reasoning, against `rewrite/develop` at `797a55fa` (the commit of this file; the code is that of
`4604a127`). The section "Challenge" above was not taken on trust: its row 19 is wrong (C14), its row 5 overstates
(C22). Every number below was made again on `797a55fa`.

**Held when checked:** kernel 1473, sdk 2198, engine 384 (total 4055, 45 left), `apps/cli` 2031, `models` 1227,
`testkit` 1058 (`codeLinesOf` of `scripts/lib/budget.ts`, from a scratch script); 344 links to `tree/v0-final` or
`blob/v0-final` in 22 Markdown files and 9 to `tree/data/runs` in `README.md` and `docs/FINDINGS.md` (`git grep -o`,
this file left out); `main` and `legacy` at `a73e6a9` on the remote, `rewrite/root` `89927a0` the one root, 391
commits on `rewrite/develop` with this one; `runtime-r4` to `r6` and `v0-final` local tags only, `runtime-r7`'s commit
`d022725` exists; `PACKAGE_FILE` at `apps/cli/src/run.ts` line 30 and its use at line 87; `callChecked`, `tryCall` and
`has` in `packages/sdk/src/mechanic/context.ts`; `ResolveInput.directors` exists, so A121 needs no sdk line; no
tic-tac-toe run on `data/runs`, and every other game of the fifteen has a runs index with a live row; the game
format has one `model` and has `directors`; no frozen API report names a renamed package. No issue plans an agent
to publish, reserve a name, push a tag, force-push, create, delete or make public a repository or a branch: every
step of O2 to O13 is printed or listed for the owner, and the data branch is pushed by the integrator under A25. No
issue adds a dependency from the registry, and `tsdown` (with `rolldown`) and `pnpm` are in the lockfile or the
`packageManager` field already.

### Findings

| # | Severity | Finding | Evidence | Correction | Status |
|---|---|---|---|---|---|
| C1 | blocker | The rows of `docs/API-FREEZE.md` for `doctor` (issues 03, 04) have no decision row to name. 1.4 said "a decision row of this file", but the gate accepts only a row `A<n>` of section 9 of `DECISIONS.md`, and none of A118 to A134 decides the command (paper 04 #12 is in section 3; section 16's decision 4 is no A-row) | `docs/API-FREEZE.md`: "Its decision is one row `A<n>` of section 9 of `DECISIONS.md`"; A118 to A134 | 1.4 names the A-row of each addition; 03 waits for PD1 | applied to 1.4, issue 03, wave 1; PD1 proposed |
| C2 | blocker | The packed-install gate as `scripts/gates/packed-install.test.ts` is collected by `pnpm test`, which runs in lane 2 beside the build of lane 0 (so it packs a missing or stale `dist`), with a worker heap of 384 MB | `vitest.config.ts`: include `scripts/**/*.test.ts`, `execArgv: ["--max-old-space-size=384"]`; `scripts/lib/check-run.ts`: tests lane 2, build lane 0 | the file is excluded from that glob and run by `check:pack` in lane 0; 08 gets `vitest.config.ts` and runs after 15, which writes the same file | applied to 2.2, issue 08, waves, file sequence |
| C3 | blocker | The outside project of 2.1 listed `swarmtales`, `typebox` and the mechanics, but the copied code of samples 5 and 6 imports `@swarmtales/sdk`, `@swarmtales/contracts` and `@swarmtales/engine`; pnpm's isolated `node_modules` gives no transitive package to the project, and the umbrella re-exports `@swarmtales/sdk` only | the imports of `samples/own-mechanic/src` and `samples/own-director/src`; `samples/own-*/package.json`; `packages/swarmtales/src/index.ts` | the project lists the dependencies of the sample's own `package.json` | applied to 2.1 and section 14 |
| C4 | blocker | Issue 17 is done when the data-repository dry run "passes on this repository", and the dry run checks a `LICENSE` on `data/runs`, which has none | `git ls-tree origin/data/runs` at `053457c5`: `README.md`, ledgers, game folders, no `LICENSE` | issue 17 adds the project's `LICENSE` to `data/runs` in one data commit, pushed by the integrator after the leak scan (A25) | applied to 7.1 and issue 17 |
| C5 | should fix (decision) | The Node line. `.node-version` says 26.13.0, the root `engines` `>=26.13`, `tsdown.base.ts` `target: "node26"`; every `node` of this environment is 22.23.4 (`/opt/node22/bin/node`, `/usr/local/bin/node`), and `docs/M5-GATE.md` records Node 22.23.4 for the M5 runs. `swt doctor` checks Node against `.node-version`'s major: the recorded online call of done-when 4 would print a `fail` and exit 1 here, and the published `engines` would promise a line no recorded check ran on. An installed tree has no `.node-version` at all | `node --version`; `.node-version`; `package.json`; `tsdown.base.ts`; `docs/M5-GATE.md`, "What ran" | PD2 settles the line before 03 and 25; outside the repository 03 checks `engines` | applied to issues 03 and 25; PD2 proposed |
| C6 | should fix | `runtime-r3` was to be set at "the commit `main` first holds", the switch target at revision 7 or 8. A tag marks the commit a revision starts at, so `git merge-base --is-ancestor <run> runtime-r3` would put every run of r4 to r7 on the wrong side; a pushed tag is hard to take back | `docs/RUNTIME-REVISIONS.md` line 19; `git log -S'RUNTIME_REVISION = 3'`: `9d3ba515` (M1-06) | `runtime-r3` at `9d3ba515`; issue 20 writes the commit into the row r3 | applied to 7.4 and issue 20 |
| C7 | should fix | The switch replaces DECISIONS 8.3's rename of `main` (which open pull requests follow) by a force push (A130); open pull requests against `main` would stand against an unrelated history | DECISIONS 8.3 step 2 ("a rename, not a force push; open pull requests follow it"); 7.3 | `switch-main.ts` lists the open pull requests based on `main` (read-only), the printed steps retarget them to `legacy` first, and a fixture state tests it | applied to 7.3 and issue 20 |
| C8 | should fix | B2 can reach the City. J174 and J177 say that the carried texts of the Confessor and the judge ask for a tool too; an answer tool in `packages/models` offered to every Director would change their requests, and one declared in the game data the City's game hash, which voids `city/base/city-001` (A54). `ModelQuestion` lives in `packages/contracts` (frozen), outside issue 16's paths; where the tool's name comes from was unsaid, while the sdk has no line booked for B2 | `packages/contracts/src/run/ask.ts`; `packages/engine/src/directors/driver.ts` line 142 (`tools: []`); 1.3 | the guard only; the requests of the Confessor and the judge byte-equal, the base resumes; name and description from the guard's `output` schema and `guard/tool-verdict`; contracts in the paths | applied to section 8, 1.4, issue 16, the hidden dependencies |
| C9 | should fix | The name lint: putting the old ids into `RETIRED` breaks the glossary test, which requires every retired word in `docs/GLOSSARY.md` (outside issue 06's paths); and the places where an old id may stay missed run data and records that name them today | `scripts/gates/names.test.ts` ("every retired word is listed"); `git grep -l` of the old ids: `docs/M2-GATE.md`, `docs/M4-GATE.md`, `docs/M4-REVIEW.md`, `docs/RERUN-PLAN.md`, `docs/RERUN-PLAN-M4.md`, `docs/ideas/`, `games/m4-ledger.jsonl`, `apps/cli/test/fixtures/`, `packages/viewer-core/test/` | a separate list of retired ids; the full list of places in 4.4 | applied to 4.4 and issue 06 |
| C10 | should fix | `runOracle`'s mapping "maps renamed sources", but an oracle file holds the old ids also in event types (`grid-game.move_played`), fact names (`grid-game.match`), `setup.mechanics[].id` and the game id | `oracles/tictactoe/tictactoe-teams-s7.json`: 94 lines name `grid-game` | the mapping covers every place | applied to 4.3 |
| C11 | should fix | The tarball of the CLI: its chess analysis walks up from its own folder for `third_party/garbochess/garbochess.js` (BSD-3-Clause), which an installed package has not; the root `NOTICE`, copied into every tarball, names `LICENSE-FAQ.md`, `THIRD-PARTY-LICENSES.md` and `third_party/`, which a tarball does not hold; and 6.2 did not check that the build inlines no third-party package without its licence | `apps/cli/src/chess-engine.ts` (`ENGINE_PATH` at line 45, the walk at lines 109 to 114); `NOTICE`; `third_party/manifest.json` | 6.2 checks all three; issue 07 ships the engine with its licence or refuses the command outside a clone | applied to 6.2 and issue 07 |
| C12 | should fix | `release:names` by `npm view`: the npm command line is under Artistic-2.0, which is not on the allowlist, and `pnpm view` hands the command to npm; "if there is doubt about a licence, the answer is no" (`CLAUDE.md`), and the rule covers tools | `docs/LICENCE-POLICY.md`, "The rule"; `scripts/licences/allowlist.ts` | an HTTPS `GET` of the registry with Node's `fetch`; printed publish commands use `pnpm publish` | applied to 6.3 |
| C13 | should fix | The word test of 6.3 reads `scripts/release/`, and issue 20's own test must build a fixture remote in several states, which with `git push` or `git tag` would fail that test | 6.3; row 20 | the fixture states are made by `update-ref` inside the bare repository | applied to 6.3 and issue 20 |
| C14 | should fix (decision) | The cap arithmetic. The four runs' caps are 0.30 + 0.01 + 0.03 + 1.00 = 1.34; with the reserve of 1.00 the parts are 2.34, not "2.34 and one reserve" (row 19 of "Challenge"); 0.66 of A125's 3.00 serves nothing. Run 4's expectation of 0.25 is the cost of the variant `whispers-rumours` under r7; the variant `whispers` at the same seed and ticks cost 0.9517 under r6, against a cap of 1.00 | 10.2; `docs/M5-GATE.md`, "Steps and cost", rows 1 and 2 | 10.2 states the booked parts and the range 0.25 to 0.95 for run 4; PD3 corrects the cap | applied to 10.2; PD3 proposed |
| C15 | should fix | Issue 00 changes a sentence of `12-m5-spec.md` (13.1, third row), which was not in its allowed paths | 13.1; row 00 | `12-m5-spec.md` added | applied |
| C16 | should fix | The file sequence put 08 before 15 on `scripts/lib/check-run.ts`, while 15 is in wave 3 and 08 in wave 4; 02 writes the error docs and the frozen record but was missing from their sequence; 04 and 16 both write `packages/models/src/` and `models.api.md` in wave 2; 24 and 26 are both in wave 5 and write the ledger and `data/runs`, while 10.1 allows one run in flight; 03 and 04 add codes without `docs/reference/errors.md` in their paths, which `scripts/gates/error-docs.test.ts` needs | section 14; rows 02, 03, 04, 08, 15, 16, 24, 26 | the sequences corrected and added; `errors.md` in 03 and 04 | applied to section 14 and rows 03, 04 |
| C17 | should fix | Issues 10 and 11 were done without the tutorial test, the `commands.sh` and the README format that 3.1 asks of every sample; issue 12 then needs them from 09 to 11 | 3.1; rows 09 to 12 | the done-whens of 10 and 11 name them | applied |
| C18 | should fix | Issue 07 makes `swarmtales` depend on `@swarmtales/cli` (for its `bin`, 6.1), which changes `pnpm-lock.yaml` and with it the inputs of `THIRD-PARTY-LICENSES.md`; neither was in its paths. Its first test checked the game hash only, not that the base still resumes | `packages/swarmtales/package.json` (depends on `sdk` and `testkit` only); `CLAUDE.md`, "Licence" | paths and first test widened | applied to issue 07 |
| C19 | should fix | Issue 18 stages about 816 MB into a local branch of an agent's container, which is ephemeral (A25's own reason): the owner cannot push what is gone | `git ls-tree -r -l v0-final -- stories examples`: 816 MB in 8902 files, largest 7.9 MB | the owner runs the script on his clone; the agent's run records the manifest digest to compare | applied to 7.2 and issue 18 |
| C20 | should fix | Lane 0 is the critical path (lint, build and the API reports in series): the packed install and the CLI's build add their full 50 s, about 525 s before the typecheck and lint of three new packages, which section 9 did not count; the peak leaves 484 MB | `scripts/lib/check-run.ts` lines 28 to 34; A117 | section 9 counts the new packages and names lever 1 as the likely one | applied to section 9 |
| C21 | should fix | Tags: the milestone tags cited A3 (squash commits); E3 is the rule that moves `main` at milestone tags, and M1 to M4 have none either; finding 7 of `docs/M5-REVIEW.md` (two run commits on no branch) had no tag in 7.4 | DECISIONS E3; `git tag`; `docs/M5-REVIEW.md`, finding 7 | 7.4 lists `milestone-m1` to `milestone-m6` (section 16, decision 6) and the two optional run tags | applied |
| C22 | note | "the default game in `run.ts`" (row 5 of "Challenge", section 14): `run.ts` names `grid-game` only in a TSDoc example; the cap-run fixture has 69 lines with `grid-game`, not 66 | `apps/cli/src/run.ts` line 186; `grep -c` over the fixture | text corrected | applied |
| C23 | note | 1.0 line 3 after the rename: the baselines of the renamed games were recorded under the old ids and replay only at their own commit (4.3); A124 asks for tic-tac-toe's baseline "under its final name", which reads as if the others no longer count | A124; 4.3 | the gate says a baseline from before the rename counts and names its commit | applied to issue 30 |
| C24 | note | The German summary of a live run was listed as the owner's hand; `CLAUDE.md` ("After every live run", point 5) makes it the job of the session that ran it, and the summary of M5 is still open | 11.1; `docs/M5-GATE.md`, "Left open" | 11.1 keeps the usage page for the owner; issues 24 to 26 give the summary | applied |
| C25 | should fix (decision) | A133 moves `swt game new`, `swt mechanic new` and `swt director new` after 1.0 and cites REWRITE 3.8, but REWRITE 3.8 lists them under "Before 1.0", and the keep list of paper 05 keeps "scaffolds for mechanic and Director". The 1.0 list of section 5 does not name them, so the move may be right, but its stated reason is not | REWRITE 3.8; `05-challenge.md` line 589; A133 | PD4 | proposed |
| C26 | note | O12 reads "Publish to npm, tag the release, add `CITATION.cff`"; A132 lets issue 22 write the file and says a file in the repository is no action of section 6. Writing it can be undone, but the row of section 6 is the owner's text | DECISIONS section 6, O12; A132 | PD5, for the owner's confirmation | proposed |
| C27 | note | Issue 08 at 380 of 400 lines leaves no room for either way out of 2.1 (an outside lockfile written from the workspace's) or A120's CI job (a workflow under `.github/workflows/`, with allowlisted actions pinned by commit); its three failing cases would cost three more packs if built as packs | row 08 | a way out becomes its own issue by a decision row; the failing cases test the checks on prepared folders | applied to issue 08 |
| C28 | note | Both `swarmtales` and `@swarmtales/cli` declare a bin `swt`, so a project that lists both gets two links of one name; and the fixture plugins of 2.1 are written in the repository and run outside it, which is how 1.0 line 7 is read here | 6.1; REWRITE section 5, line 7 | the README of issue 22 says to install `swarmtales` alone | none |

### Proposed decision rows

Not written into `DECISIONS.md`; the integrator enters, changes or refuses each. The numbers are placeholders after
A134; each row is written in the columns of section 9 (number, date, decision, evidence).

**PD1**

| A135 | 2026-11-16 | The command `doctor` of `swt` and its flag `--online` (with `--provider`, `--budget`, default 0.01 USD, and `--ledger`), as `13-m6-spec.md` section 5 describes them, are additions to the frozen `scripts/api-freeze/surface/cli.json` and `error-codes.json`; the rows of `docs/API-FREEZE.md` of issues M6-03 and M6-04 name this row. | Paper 04 #12 ("built at M6") is a row of section 3, and the freeze gate accepts only a row of section 9 (independent challenge of `13-m6-spec.md`, C1). |
|---|---|---|---|

**PD2**

| A136 | 2026-11-16 | The Node line of 1.0: the published `engines.node`, `.node-version` and the build target name one line, the one the recorded checks and live runs run on. Either (a) the gate of M6, the packed-install gate and the live calls of M6-25 run under Node 26.13 (`.node-version`), recorded in the manifest and the check summary; or (b) if the build environment cannot install Node 26, `engines` becomes the 22 line the checks ran on (`>=22.18`, the first 22 release that strips types by default), and `.node-version` and `tsdown.base.ts` follow. Leaning: (b), because no check of the rewrite is recorded under 26. Outside the repository `swt doctor` checks the `engines` of the installed `swarmtales`. | Every `node` of the build environment is 22.23.4; `docs/M5-GATE.md` records Node 22.23.4; DECISIONS section 4, row 8 makes `.node-version` the one source (C5). |
|---|---|---|---|

**PD3**

| A137 | 2026-11-16 | The live cap of M6 is 2.34 USD, not 3.00 (A125): the caps of the four runs of `13-m6-spec.md` 10.2 (1.34) and the reserve (1.00); run 4 is expected at 0.25 to 0.95. The rewrite then stands at 12.04 USD of 50 at most. | A125 counted the reserve twice, and the 0.66 left over served no done-when (C14). |
|---|---|---|---|

**PD4** (the other option: three issues of at most 200 lines each in M6 for the three scaffolds, with their tests, held by the cut list of 13.2)

| A138 | 2026-11-16 | The scaffolds `swt game new`, `swt mechanic new` and `swt director new`, which REWRITE 3.8 lists before 1.0, wait until after 1.0: the 1.0 list of REWRITE section 5 does not name them, and the first-hour tutorials teach from samples 1 to 6. This corrects the reason of A133, which cited REWRITE 3.8 for the move; the owner is told in the summary of M6. | C25; the keep list of `05-challenge.md` keeps the scaffolds for mechanic and Director. |
|---|---|---|---|

**PD5**

| A139 | 2026-11-16 | O12's "add `CITATION.cff`" is read as "publish the release that holds it": M6-22 writes the file with the version of the release candidate and no `date-released`, `release:version` sets both, and the owner's release commit holds the final text. | A132 writes the file in the repository, while section 6 names it in the owner's row O12 (C26). |
|---|---|---|---|

**Open after this challenge** (each needs a decision row, a first test or the owner): PD1 before issue 03 merges;
PD2 before issues 03 and 25; PD3 before the plan of issue 23 is committed; PD4 and PD5 before the gate; and the open
points of "Challenge" above, which hold.
