# 11 M4 specification: the remaining tabletop games and the scheduler sample `parallel`

Status: **specification for milestone M4**, written 2026-11-14 and **revised after its challenge** the same day
(section 17). It stands against `rewrite/develop` at `0ecabab9` and the old platform at the branch `legacy`
(`a73e6a9`). Builders code against this file. Precedence: [`BRIEF.md`](BRIEF.md), then
[`DECISIONS.md`](DECISIONS.md) (with its addendum A1 to A29, and the rows A30 to A41 that section 14 words),
then [`REWRITE.md`](REWRITE.md), then the specifications of M1 to M3 with their errata, then this file, then
papers 01 to 07. Where this file decides something that the papers left open, section 13 lists it. Where it
changes a decision that stands, the integrator ruled on it, and section 14 holds the ruling as the text of a
decision row. Section 8 lists what only the owner can decide.

**Errata:** [`11-m4-spec-errata.md`](11-m4-spec-errata.md) lists every difference between this file and the code
that the builders and the integrator found (H1 to H47); where the two differ, the errata hold.

Words as in the earlier specifications. An "old" path is a path on the branch `legacy` (read with
`git show origin/legacy:<path>`). "Carried" means copied with at most import changes and the renames of M1
section 8.1; carried lines do not count against the 400-line rule. "Ported" means the same design written against
the new contracts. A "code line" is a non-blank, non-comment line of a `.ts` file (D13); every count of old and
new code in this file was measured with `scripts/lib/code-lines.ts`, test files left out. Old names that the name
lint retires appear only in backticks.

**The second scheduler is called `parallel`**, as in REWRITE 3.3 and decision D10. The word `match` is not used
for it: `match` is the frame of D9, the limit id of chess, the event `match_ended`, and the word of every briefing
for a series of games. The first version of this file, the M3 specification (1.3, 17) and the resume note said
"the scheduler `match`"; issue 00 corrects the two older places.

**M4 is done when** (REWRITE section 4, row M4, made testable):

1. **every tabletop game is ported:** each of the ten games of section 2 plays on the new platform, and
   `runOracle` finds no mismatch at level 3 for each of its oracle files (48 today, up to 11 more by issues 17
   and 18), or the difference is a row of the registered changes in `oracles/<game>/README.md`. A game that the
   cut list of section 2.6 removed is named in a decision row and in the gate's write-up; it is not counted as
   done;
2. **standing checks:** every game under `games/` passes the four checks of section 4.3: replay, resume from
   every tick boundary in process, resume from every boundary through the command line, and a `swt run --fake`
   that ends without an `error` end and holds at least one accepted call;
3. **the scheduler sample `parallel`:** `samples/own-scheduler/` holds a second scheduler that is written outside
   the engine; its sample game plays to its end under `turns` and under `parallel`; sixty runs under `parallel`
   (twenty seeds for each of its three activation values, drivers that wait a seeded random time) each replay to
   their own log; a run resumes from every boundary and the rest replays; a Director works under it (section
   3.7). **Kernel, sdk and engine have no line for it.** This is the first thing the cut list removes; when it is
   cut, the gate names it and D10's spike returns to M6;
4. **no log position in a payload:** a run of the city slice resumed through the command line from every boundary
   differs from the straight run only in the marker line and in the envelope fields `seq`, `causedBy` and `basis`
   (section 4.1);
5. **gates:** the gate "a mechanic is a plain `defineMechanic` value" and the gate "a base mechanic names no game
   mechanic" are in the check, each with a fixture that fails (section 4.2);
6. **developer experience:** the mechanic tutorial and the Director tutorial pass as tests (samples 5 and 6);
   `docs/reference/errors.md` has an anchor for every code of every catalogue; `swt --help` prints the commands
   (sections 4.4, 4.6, 4.7);
7. **live:** Harbor Lights and Lanterns keep the sign of their old effect at 12 seeds; the chess request count is
   measured on the old arm and stands beside the old range in the gate's write-up (D11 says "hold" and names no
   number; section 7.2); every other ported game has one recorded live run; the spend is inside the caps of
   section 7; no key is in any artefact. With quarry and econ-lab of M2 these are the four firm effects of D11;
8. **`GAMES.md` is complete** for the tabletop games: thirteen cards beside the Hello Game and the city slice,
   and the overview table is generated (issue 62);
9. the **stop rules and the softer check** of section 9 are answered in writing: the lines the kernel got, the
   three budgets, the issue count.

What M4 is **not**: no part of the City of Keys and not Whispers (M5); no game frame of D9 (section 2.7, decision
A31); **no change of a game's rules, prompt texts or tool names** (D2, D14; section 8 lists what the findings ask
for, the Hello Game included); no production scheduler beside `turns`: `parallel` is a sample, `swt` has no flag
for it, no ported game is played under it and no evidence is taken from it (paper 01, D1).

## 1. Scope, packages, budgets

### 1.1 Packages of M4

| Package | Path | Class | What |
|---|---|---|---|
| `@swarmtales/mechanic-liars-dice` | `mechanics/liars-dice` | game | the rules of liar's dice |
| `@swarmtales/mechanic-card-table` | `mechanics/card-table` | game | a deck, hands, deals; used by two games |
| `@swarmtales/mechanic-hint-towers` | `mechanics/hint-towers` | game | the rules of Harbor Lights |
| `@swarmtales/mechanic-clue-grid` | `mechanics/clue-grid` | game | the rules of Lanterns |
| `@swarmtales/mechanic-chess` | `mechanics/chess` | game | chess; its rules library is `chess.js` |
| `@swarmtales/mechanic-trick-play` | `mechanics/trick-play` | game | the rules of Ember Tricks |
| `@swarmtales/mechanic-sealed-auction` | `mechanics/sealed-auction` | game | the rules of Blind Bid |
| `@swarmtales/mechanic-holdem` | `mechanics/holdem` | game | fixed-limit hold'em with duplicate deals |
| `@swarmtales/mechanic-morris` | `mechanics/morris` | game | nine men's morris with its built-in search |
| `@swarmtales/mechanic-morris-referee` | `mechanics/morris-referee` | game | the Referee that scores every morris move |
| `@swarmtales/mechanic-convoy` | `mechanics/convoy` | game | the rules of Convoy |
| `@swarmtales/mechanic-salt-market` | `mechanics/salt-market` | game | the rules of Salt Market |
| ten game packages | `games/{liars-dice,harbor-lights,lanterns,chess,ember-tricks,blind-bid,holdem,morris-teams,convoy,salt-market}` | game package | the game, its briefing, its tests |
| three samples | `samples/own-mechanic`, `samples/own-director`, `samples/own-scheduler` | sample | samples 5 and 6, and the scheduler sample; each a test |
| `sdk`, `kernel`, `contracts`, `testkit`, `lab`, `runlog`, `apps/cli`, `viewer-*` | | changed | section 4 |

No package is added under `packages/`, and **the engine package is not changed by M4**. The scheduler `parallel`
lives in `samples/own-scheduler/`: `resolveGame` takes the table of schedulers from its caller
(`packages/sdk/src/game/resolve.ts`, `schedulerOf`), so a scheduler needs no line in kernel, sdk or engine. That
is D10's "spike plus one sample", not production code moved next door: nothing of the platform imports the
sample, and no command of `swt` knows it. All twelve mechanics are of class `game`; none of them is imported by a
base mechanic. The mechanic imports M4 creates (each through `/contract` or `/rules`):

| Mechanic | Imports the contract of | Why |
|---|---|---|
| `hint-towers`, `trick-play` | `card-table`, `strategy-brain` | the deck and the hands; the game lifecycle of the brain |
| `chess`, `clue-grid` | `strategy-brain`, `team-channel` | the brain; the team chat of the team variants |
| `morris` | `consensus`, `strategy-brain`, `team-channel`; provides `consensus-source` | as `grid-game` does today |
| `morris-referee` | `morris` (`/rules` and its events) | replays the moves in its own copy |
| `liars-dice`, `sealed-auction`, `holdem`, `convoy`, `salt-market` | `strategy-brain` | the brain; each provides `brain-source` of `mechanics/contracts` |
| `card-table` | none | |

One new dependency from the registry: `chess.js` 1.4.0, exact, as the old platform pins it. Its licence is
`BSD-2-Clause`: the challenger read it in the installed package of the old platform (`package.json`, `LICENSE`
with two clauses, the header of `src/chess.ts`; no runtime dependency), and the allowlist holds it. It was **not
checked against the registry**; issue 00 adds it, runs `pnpm licences:write`, and the licence gate decides. A
licence outside the allowlist stops issue 27 and chess is cut (section 2.6). The chess reference engine is
section 2.5.

### 1.2 Code-line budgets

Measured on `0ecabab9` with `scripts/lib/budget.ts` (code lines):

| Package | Today | M4 may add | After M4, at most | Limit |
|---|---:|---:|---:|---|
| `kernel` | 1393 | **17** (issue 16 only) | 1410 | gate 1420 (`packages/kernel/test/budget.test.ts`), hard 1500 |
| `sdk` | 2065 | **25** (issues 02 and 16) | 2090 | |
| `engine` | 360 | **0** | 360 | |
| **kernel + sdk + engine** | **3818** | **42** | **3860** | **4100** (A20) |
| `contracts` | 991 | about 20 | | none |
| `testkit` | 807 | about 300 | | none |
| `lab` | 1184 | about 150 | | none |
| `apps/cli` | 1269 | about 350 | | none |
| twelve mechanics | 0 | about 8300 carried (old: 8334) | | none |

What each part may take, exactly:

| Part | Kernel | Sdk | Engine | Issue |
|---|---:|---:|---:|---|
| the two activation hooks (`activationOpened`, `activationClosed`) | 17 | 15 | 0 | 16 |
| firing numbers in the plugin `directors` | 0 | 10 | 0 | 02 |
| the scheduler sample `parallel` | 0 | 0 | 0 | 53 to 55 |
| everything else of M4 | 0 | 0 | 0 | |

No reserve is booked: a line beyond this table is taken only when it is measured and written into the record.
An unknown scheduler id keeps its code `SWT-G020` under `scheduler.id`, which already names the known ids; the
code `SWT-G023` of the first version is dropped.

**When a part does not fit.** A builder who would cross a number of this table stops the part, writes the measured
lines and the missing extension point into `docs/ISSUE-RECORD.md`, and the integrator decides. The ways out, in
this order:

1. **The activation hooks above 17 kernel lines:** no new hook kind is built. A plugin listens to the kernel's
   own line `activation_closed` through `kit.on` (booked with 5 kernel lines in M1 1.4). The forfeit of chess then
   lands after the closing line of the activation and not before it; the rule is the same, the place of one line
   differs, and that is a registered change of `oracles/chess/README.md`. If this does not fit either, the port
   of chess stops and goes to the integrator. Counting the idle turn at `tickEnded` is **not** a way out: it
   moves a forfeit by up to three turns, which is a rule change of chess and the owner's (section 8).
2. **The sdk above 25 lines:** the builder names the line and the integrator books it; 240 lines are free under
   the total.
3. **`parallel` needs a line in kernel, sdk or engine:** the sample is cut (cut 1 of section 2.6). The missing
   line is a finding of the softer check (section 9) and the first input of the M5 specification.
4. Never: raising a limit inside M4, or moving code of the platform into a package outside `ENGINE_FOLDERS`
   (`scripts/lib/budget.ts`). A raise needs the issue of A20, with the measured lines.

**What M5 can then take.** After M4 the kernel has 90 lines under its hard limit (10 under its gate) and the
total has 240 lines under 4100.

| | Kernel | Kernel + sdk + engine |
|---|---:|---:|
| today | 1393 | 3818 |
| M4: hooks 17 and 15, firing numbers 10 | 1410 | 3860 |
| left under the limit | 90 | 240 |
| M5, as M1 1.4 reserved it: staged calls 65, attributes 20, `runEnded` 8, `afford`/`settle` 10, `guard`/`consult` 15, `every` 10, `stop`/`safePoint` 10, `kit.on` 5 | 143: **does not fit** | |
| M5, what fits: staged calls 65 and `runEnded` 8 | 73, kernel at 1483 | with 100 to 150 sdk lines: 4033 to 4083 |

So M5 can take staged calls and `runEnded` in the kernel, and nothing else of its reserved list. Each of the
others has a way that costs no kernel line: `stop` and `safePoint` are dropped by A22; `schedule.every` is a job
that sets itself again with `schedule.at`; attributes are a slice and a service; `afford`, `settle`, `guard` and
`consult` were not needed by the ledger, by `decisions` or by the Directors at M3. The gate of 1420 is raised by
the issue of A20 when M5 measures its lines. With the first version of this file (the scheduler in the engine,
130 lines) 90 lines were left for kernel, sdk and engine together, and M5 was not buildable as reserved; that is
the reason of the ruling on the scheduler (decision A30).

### 1.3 What stays reserved and must not be built at M4

| Reserved | Stays for |
|---|---|
| staged calls, the hook `runEnded` | M5 |
| the stage handlers `afford`, `settle`, `guard`, `consult`, per-plugin actor attributes, `schedule.every` | M5, without kernel lines (1.2) |
| `Kernel.stop`, `SchedulerPort.safePoint`, an intervention inside a tick (A22) | after 1.0, or an issue that names a game |
| `kit.on` | way out 1 of 1.2, else its first user |
| `ctx.log`, `kit.kernel`, tool limits, `$param`, game `texts` overrides | first user |
| the game frame of D9 (`Ruleset`, one frame mechanic) | after 1.0 (A31) |
| for `parallel`: a place in the engine, a flag of `swt run`, an experiment factor, a fair queue, a stale policy, lane release, a cap on requests in flight, ticks by wall clock (D10) | after 1.0 |
| game-specific viewer views (the old `mechanics/chess/views.json`), the game tab | M6 |
| samples 2 to 4, a mechanic installed from outside, the rename of original games | M6 |
| a run-time check of service calls against `requires` and `uses` | M6 (A37) |
| Whispers, the City of Keys, resume of a live run, a data game with a Director (errata P2) | M5 |

### 1.4 Where M4 starts, and what runs beside it

**M3 is closed** (A28, `936e8ded`). Since the first version of this file was written, `develop` got: `decisions`
as a plain mechanic and the seven manifests without `mechanic-contracts` (M3-34, `6b010bbf`); package READMEs
that no longer say "empty"; a `session-opened` notice of `court`; the README's line "the tutorial arrives with
milestone M4" for the mechanic and the Director tutorial; decision A27 (three payload places, not one). M4 builds
none of these again; where an issue of the first version held one, it is taken out (sections 4.2, 4.6, 5).

**M2-28 and M2-29 run beside M4** (A29): the cures of LH18 and LH19 as options that are off by default, with a
small series of their own (cap 1.50 USD, not in the ledger of M4). They edit `mechanics/draft-rounds`,
`mechanics/econ-games`, `games/quarry` and `games/econ-lab`. Three M4 issues touch the same packages:

| M4 issue | Same files | Rule |
|---|---|---|
| 04 (samples for the ported mechanics) | the heads of `draft-rounds` and `econ-games` | whichever merges second rebases; a `sample` function is no part of the game hash, the option is off by default, so neither changes the other's proving test |
| 06 (standing checks) | `games/quarry/test/`, `games/econ-lab/test/` | the standing checks play the default params; a new option gets no standing check of its own at M4 |
| 12 (docs chores) | the READMEs of quarry and econ-lab | 12 starts after M2-28 and M2-29 are merged, and describes the two options |

## 2. The games

### 2.1 What the old platform holds

The old platform has fourteen games beside the City of Keys (`stories/` on `legacy`): thirteen tabletop games and
Whispers. Three tabletop games are ported (tic-tac-toe teams at M1, quarry and econ-lab at M2). **Ten are left**:
liar's dice, Harbor Lights, Lanterns, chess, Ember Tricks, Blind Bid, hold'em, nine men's morris, Convoy and Salt
Market. Their twelve mechanics hold 8334 old code lines; the ten game files hold 1095 lines. Every one of them
loads `strategy-brain` (ported), and every one runs on `turns` with `activation: "onNews"`, between 3 and 8
passes a tick, and a limit of calls per resident and tick, all of which the new `turns` has.

What the twelve mechanics need from the platform was checked by a search of the hook names and context calls in
their `index.ts` files, not by reading all 8334 lines. Eleven use only what `draft-rounds`, `econ-games`,
`grid-game`, `consensus` and `strategy-brain` use, which are ported: `runStarted`, tick start and end, `news`,
`turnInputs`, `toAct`, jobs set with `schedule.at`, limits, facts, the `lock` handler of the pipeline, locks on
tools. **One needs more: `chess` has the old hooks `turnOpened` and `turnEnded`** (old
`mechanics/chess/src/index.ts`, lines 638 to 660): a turn of the seat on move that ends without a move counts
toward the forfeit clock. These are the hooks `activationOpened` and `activationClosed` that M1 1.4 reserved
"for their first user". Chess is that user; issue 16 brings them back (section 4.9).

### 2.2 Rules of a port

As M2 section 7, unchanged: one variable, the kernel. Prompt files, tool names, refusal codes, reply strings,
event types and payloads, option names and defaults, random labels and the wake rule are byte-identical. The
renames of M1 8.1 apply. A file above 300 code lines is split by moving code (head, flow, texts, index, as
`draft-rounds` was), and decision A8 puts the tool declarations into the head. Further, new at M4:

1. **Two issues per game at least:** the mechanic (carried, split, its carried tests green), then the game with
   its oracle files. An addition (metrics, the game family) comes only after the oracle files match (M2 decision
   16).
2. **Every resident tool gets a `sample` function in the mechanic's port issue**, and the game issue has a test
   that `swt run --fake` of the game ends without an `error` end and with at least one accepted call per resident
   tool that the game grants and a fake run can reach (A24 found this late at M3).
3. **The four standing checks of section 4.3** are part of the game issue.
4. **A prompt file that holds a word the name lint retires stays as it is**; the port issue names the file, and
   the file goes on the lint's list of carried texts (`scripts/lib/names.ts`). The text is not reworded. The two
   texts that M3 reworded (errata G11) stay as registered.
5. **`carried.test.ts` in every game**: the sha256 of every prompt file, of the briefings and of every tool name
   list, computed on `legacy`.
6. **A card in `GAMES.md`** and a row in the games list of section 4.3 come with the game issue. No card carries
   a finding before the finding is reproduced here.
7. **Variants become params** of a game family (as quarry): the old registry parsed variant names
   (`harbor-lights-solo-g1`); the 232 lines of `stories/index.ts` are not carried.
8. **The model block of the old entry is carried into the game file.** The old entries of liar's dice, Lanterns,
   chess, hold'em, nine men's morris and Convoy set `maxOutputTokens: 16000` (each with the note of P94: "a
   4000-token cap made thinking models end turns without a tool call"); the game file gets `model: { …,
   maxOutputTokens: 16000 }`, as tic-tac-toe did at M2 (`09-m2-spec.md`, section 10.3). The entries of Harbor
   Lights, Ember Tricks, Blind Bid and Salt Market set no cap; these four keep the default of 4000. The cap is
   part of the game hash that the additions issue pins, and `carried.test.ts` holds it.
9. **`carried.test.ts` pins the variant names** of the old parser against the params: for every variant name
   that an oracle file or an old runs index uses, the params that give it, and that the default params give the
   old registry default.
10. **A refusal that the old game file threw as a bare error** (chess: "the coach needs the brain") becomes a
    refusal of the family's params with a code of the game's own catalogue; the port issue names the code.

### 2.3 Game by game

Old code lines are of `src/` of the old mechanic. "Exists" names mechanics that are ported already. The scheduler
options are those of the old game file; the old `maxStepsPerMinute` is `limits.maxCallsPerTick`.

| # | Game | Old game file | New mechanics (old code lines) | Exists | Residents | `turns`: passes, calls per tick | Oracle files | Old tests to port |
|---|---|---|---|---|---|---|---:|---|
| 1 | liar's dice | `stories/liars-dice/story.ts` | `liars-dice` (672) | `strategy-brain` | 4 (2 heads-up) | 6, 14 | 6 | `test/stories/liars-dice.test.ts` (202) |
| 2 | Harbor Lights | `stories/harbor-lights/story.ts` | `card-table` (220), `hint-towers` (721) | `strategy-brain`, `team-channel` | 4 | 8, 12 | 6 | `test/stories/harbor-lights.test.ts` (124), `test/mechanics/card-table` (138), `test/mechanics/hint-towers` (264) |
| 3 | Lanterns | `stories/lanterns/story.ts` | `clue-grid` (797) | `strategy-brain`, `team-channel` | 6 (two teams of three) | 5, 12 | 4 | `test/stories/lanterns.test.ts` (242) |
| 4 | chess | `stories/chess/story.ts` | `chess` (760) | `strategy-brain`, `team-channel` | 2 (4 with teams) | 4, 16 | 5 | `test/stories/chess.test.ts` (365) |
| 5 | Ember Tricks | `stories/ember-tricks/story.ts` | `trick-play` (786) | `card-table` (from game 2), `strategy-brain` | 4 | 8, 8 | 4 | `test/stories/ember-tricks.test.ts` (104), `test/mechanics/trick-play` (295) |
| 6 | Blind Bid | `stories/blind-bid/story.ts` | `sealed-auction` (540) | `strategy-brain` | 4 | 4, 6 | 5 | `test/stories/blind-bid.test.ts` (169) |
| 7 | hold'em | `stories/holdem/story.ts` | `holdem` (993) | `strategy-brain` | 4 (2 heads-up) | 6, 14 | 5 | `test/stories/holdem.test.ts` (334) |
| 8 | nine men's morris | `stories/morris-teams/story.ts` | `morris` (833), `morris-referee` (98) | `consensus`, `team-channel`, `strategy-brain` | 6 (two teams of three), 2, or 1 against the search | 5, 12 | 5 | `test/stories/morris-teams.test.ts` (187), `test/mechanics/morris` (105), `test/mechanics/morris-referee` (66) |
| 9 | Convoy | `stories/convoy/story.ts` | `convoy` (896) | `strategy-brain` | 6 | 3, 8 | 4 | `test/stories/convoy.test.ts` (314) |
| 10 | Salt Market | `stories/salt-market/story.ts` | `salt-market` (1018) | `strategy-brain` | 4 | 3, 12 | 4 | `test/stories/salt-market.test.ts` (231) |

Per game, what is special:

| Game | What is ported beside the rules | Text equality | Known traps |
|---|---|---|---|
| liar's dice | the roll stream `("liars-dice", "roll", game, round)`; the `toAct` hook; the decision score `dice_decision_scored` | level 3 on all six files | no file replays a live run (all recorded runs are of runtime revision 1); the checker of `oracles/liars-dice/README.md` restates the rules |
| Harbor Lights | the deal stream `("card-table", "deal", n)`; the three arms `crew`, `solo`, `nobrain`; soft and hard strikes; the aid `playableOdds`; the reference crew of bots per deal; locks on the chat tools while a game runs | level 3 | the silent file is 706 KB; the crew arm uses the rotating captain of `strategy-brain` and the team chat between games |
| Lanterns | the grid stream `("clue-grid", "grid", game)`; the rotating keeper; the handicap of the second team; `clue_game_scored` with recall and precision (`model.ts`, lines 188 to 216) | level 3 | the `lock` handler refuses the keeper's team post (`KEEPER_SILENT`); three of four files are cut |
| chess | the forfeit stream; the views `default`, `compact`, a fresh context per move; legal-move lists, threats, the coach; teams; the old one-ply score `move_scored` | level 3 | the activation hooks (2.1); no file covers lists, threats, coach or teams (2.4); three of five files are cut after game 1 |
| Ember Tricks | the forfeit and reference streams of `trick-play`; the levers (bid sum, calibration line, the worth at the bid) | level 3; `ember-tricks-mcbid-g4-s32` shows today's wording, not the recording's | the silent file wakes four seats per forfeited turn |
| Blind Bid | the deal and tie streams; first-price, second-price and shared-worth lots | level 3; `blind-bid-s31-live` shows today's wording in 12 of 104 turns | `game_scored.secondPrice.capped` is what the frozen code writes |
| hold'em | the deal stream with duplicate deals; `cards.ts` (253) carried; the equity samples of `decision_scored`; mixed tables and the decision aid | level 3 | no replay of a live run; the aid and the mixed tables have no file (2.4) |
| nine men's morris | `rules.ts` (173) and `search.ts` (128) carried; the seat of the search (`engine.side`, depth); the Referee | level 3 | the search's moves are events of its side and must match; a team of three is covered only by the silent file |
| Convoy | the role stream; crews, sealed votes, hidden cards, the audit, accusations; the tracker of the report | level 3 | three of four files are cut after game 1; damage and cooldown variants have no file |
| Salt Market | the deal and spoil streams; offers, trades with tax, promises, escrow, shipments | level 3 | the hard case for any later frame (REWRITE 3.4); games 3 and 4 of a played match have no file |

Level 3 is the plan for all ten, as it was reached for the three ported games. Where a file replays a live run,
the pending rule of `runOracle` (M2 7.2) applies. A game that reaches level 2 and not level 3 on a file says so in
its README with the first `turn` entry that differs; that is a registered change only when a decision changed the
wake rule, and none has.

What the challenge found missing in two rows, read against `legacy`; each line is part of the named issue:

| Game | Also ported | Issue |
|---|---|---|
| chess | `settleCap` (LH17) and `adjudicateMargin: 3`; `showThreats`; the run length `minutesFor(games, maxPlies) * (teams ? 2 : 1)`; the grant and start-lock lists that depend on `brain` and `teams` | 27, 29, 30 |
| chess | `wakeTeam` and the `told` list (the advisor's wake), which only the team variant exercises | 28, with the team file of issue 17 as a must |
| Harbor Lights | `debriefNote` (the retro question of the crew arm, a model-visible text of the game file; in `carried.test.ts`); `maxIdleMinutes: 2` and `maxConsecutiveForfeits: 24` (the move timer, exercised only by the silent file); the briefing as a function of the number of residents; hard strikes | 23, 24 |

The file `chess-fresh-compact-g4-p80-s47.json` replays run 054, which was played with `--thinking low`. It is a
valid oracle file; it is not evidence for the arm of the count series (section 7.2).

### 2.4 Oracle files: what exists and what is recorded anew

**The files exist.** Issue 2 of M0 exported them before the freeze: 48 files for the ten games, checked twice
byte for byte (`oracles/README.md`). No port waits for a recording. Sources per game:

| Game | Files | Replays of live runs | Scripted | Cut |
|---|---:|---:|---:|---:|
| liar's dice | 6 | 0 | 6 | 3 |
| Harbor Lights | 6 | 5 | 1 | 1 |
| Lanterns | 4 | 3 | 1 | 3 |
| chess | 5 | 3 | 2 | 3 |
| Ember Tricks | 4 | 3 | 1 | 2 |
| Blind Bid | 5 | 1 | 4 | 0 |
| hold'em | 5 | 0 | 5 | 4 |
| nine men's morris | 5 | 4 | 1 | 1 |
| Convoy | 4 | 3 | 1 | 3 |
| Salt Market | 4 | 3 | 1 | 3 |

**What issues 17 and 18 record anew**, on the old platform, for options that M4 ports and that no file
exercises. How: a worktree of `legacy`, Node 26.13, one check at a time (A6); a new entry in
`scripts/oracles/catalog.ts`; `scripts/export-oracles.ts <game>` writes each file twice and compares; the file,
its row in `oracles/<game>/README.md`, `oracles/COVERAGE.md` and `oracles/checksums.txt` are committed on
`develop`. The catalogue entry, and a scripted player where one is missing, is a commit on `legacy` (allowed by
REWRITE 4.1: "a fix that an oracle needs"; decision A39); whether the build session can push it was not checked,
so the patch is also kept as `oracles/m4-catalog.patch`.

| # | File to record | Variant of the old registry | Source | Seed | Why | Issue |
|---|---|---|---|---:|---|---|
| 1 | `chess/chess-moves-s13.json` | `chess-moves` | scripted, the player `chessMates` | 13 | the legal-move list is an arm of the old chess runs and has no file | 17 |
| 2 | `chess/chess-moves-coach-s13.json` | `chess-moves-coach` | scripted, `chessMates` | 13 | `coach_review` never occurs in a file | 17 |
| 3 | `chess/chess-nobrain-s13.json` | `chess-nobrain` | scripted, `chessMates` | 13 | the control arm | 17 |
| 4 | `chess/chess-teams-s13.json` | `chess-teams` | scripted; **a must:** when `chessMates` cannot play as a captain, a new scripted player is written on `legacy` | 13 | `team_post`, `NOT_CAPTAIN`, `wakeTeam` and the captain's idle turn never occur in a file, and chess is the mechanic that brings two kernel hooks back | 17 |
| 5 | `chess/chess-cap-p12-s13.json` | the default with a ply cap of 12 | scripted, `chessMates` | 13 | every game of the count series ends at the cap or by adjudication, and no file ends there (`oracles/chess/README.md`, "not covered") | 17 |
| 6 | `chess/chess-cap-settle-p12-s13.json` | the same with `settleCap` | scripted, `chessMates` | 13 | `settleCap` (LH17) has no file | 17 |
| 7 | `chess/chess-threats-s13.json` | `chess-threats` | scripted, `chessMates` | 13 | `showThreats` has no file; way out: no file, registered as "proven by carried tests only" | 17 |
| 8 | `holdem/holdem-aid-mixed-s7.json` | `holdem-aid-mixed` | scripted, the player `holdem` | 7 | the decision aid carries the strongest old result of the game and has no file | 18 |
| 9 | `harbor-lights/harbor-lights-nobrain-aid-g1-s103.json` | `harbor-lights-nobrain-aid-g1` | replay of run `harbor-lights-04a-007-decision-aid`; **first test:** `--survey` shows that the run replays exactly | 103 | the aid `playableOdds`; way out: no file, registered | 18 |
| 10 | `harbor-lights/harbor-lights-hard-s13.json` | the default with hard strikes | scripted, the scripted crew of the silent file's catalogue entry made to misfire | 13 | hard strikes are ported and no file covers them; way out: registered as "proven by carried tests only" | 18 |
| 11 | `ember-tricks/ember-tricks-nobrain-g1-s31.json` | `ember-tricks-nobrain-g1` | replay of a run of `ember-tricks-04a-002-long-matrix`; **first test:** `--survey` finds one that replays exactly | 31 | the control arm has no file; way out: no file, registered | 18 |

Whether the old registry can name a ply cap of 12 and hard strikes as variants was not checked; where it cannot,
the catalogue entry builds the options directly, as the entries of the cut files do. Nothing else is recorded. In
particular no file is recorded for a second scheduler: an oracle file is a schedule of `turns`.

### 2.5 What is dropped, and the chess engine

| Dropped | Reason |
|---|---|
| the variant-name parsers of every game file and `stories/index.ts` | params of a game family replace them (REWRITE 3.5) |
| `HOOK_ORDER`, `STATUS_ORDER` of `mechanics/shared` | load order and `after:`; the order numbers are replaced as in M2 7.1, and each port names the `after:` it needed |
| `mechanics/chess/views.json` | game-specific viewer views are M6 |
| the runs of Sonnet and Opus tables (liar's dice, hold'em, morris) as anything to reproduce | no such run before 1.0 (REWRITE 3.7) |
| `stories/liars-dice/BLUFFING.md` and the old run folders | they stay on `legacy` and move to the data repository by the save list |
| `stockfish.js` | GPL-3.0, never on this branch (DECISIONS 5.5) |

**The chess engine question, answered from the decisions as they stand.** DECISIONS 5.5 and paper 06: Stockfish
is out for good; the reference engine is Garbochess-JS (`BSD-3-Clause`, one vendored file, no weights), with
`js-chess-engine` (`MIT`) as the fallback; the old games were scored again with it once on `legacy`
(`stories/chess/runs/REANALYSIS.md`), and that is the chess baseline; numbers of the two engines are never
compared. For M4 this means:

- The **game** chess needs no engine. Legal moves come from `chess.js`; `move_scored` is the old platform's own
  one-ply material score. The port of chess (issues 27 to 30) does not wait for an engine.
- The **criterion of D11** for chess is the request count, which needs no engine (section 7).
- The **analysis** (centipawn loss, blunders, missed mates) is a step over a finished log, not a Director and not
  part of a run (REWRITE 3.6). Issue 56 carries `third_party/garbochess/` from `legacy` with its licence text and
  a row in `third_party/manifest.json`, the loader (old `lab/chess-engine.ts`, 123 lines) and the analysis (old
  `lab/chess-analyse.ts`, 158 lines) into `packages/lab`, with the hash test of the engine file
  (`b0ebcf80...938c`, old `third_party/garbochess/README.md`). The manifest row names the upstream commit: the
  engine file itself carries no licence header, and that the LICENSE file belongs to it rests on the old README
  (not verified upstream). It is on the cut list.

### 2.6 Order, and what is cut when the issue budget runs out

The order follows what M4 must prove, then the cost of a port:

| Order | Game | Why here |
|---|---|---|
| 1 | liar's dice | one mechanic, no team, six scripted files: the cheapest port, and it proves the `toAct` path of a card-like game |
| 2 | Harbor Lights | a firm effect of D11 (private notes against nothing, +3.2 points, SE 0.8); brings `card-table` |
| 3 | Lanterns | a firm effect of D11 (recall +0.08, SE 0.03) |
| 4 | chess | the request counts of D11; the first user of the activation hooks |
| 5 | Ember Tricks | reuses `card-table`; its aid result (2.36 against 0.73 points per seat and round) rests on three seeds |
| 6 | Blind Bid | the smallest mechanic of the rest |
| 7 | hold'em | the decision aid (EV loss 0.03 against 0.26 over 24 tables) |
| 8 | nine men's morris | two mechanics; no memory effect in any old series |
| 9 | Convoy | 896 lines; the old effect is not firm |
| 10 | Salt Market | 1018 lines; a null result |

This is the order of merging the game issues, not of starting the ports: the ports of the four late games start
in waves 2 and 3 (section 11), so that a cut can still take what the list names.

**The cut list.** The integrator cuts from the top of this list when the count of section 10 reaches its re-plan
line, or earlier when a way out of section 1.2 says so; one entry at a time, each written as a decision row.
Everything that REWRITE row M4 does not ask for comes before any game:

| Cut | What goes | Issues saved | What it costs |
|---|---|---:|---|
| 1 | the scheduler sample `parallel` | 3 (53 to 55) | done-when 3 falls; the spike returns to M6, after the freeze of M5, which is what A30 wanted to avoid |
| 2 | the viewer issue | 1 (57) | the viewer keeps saying "minute" |
| 3 | the chess analysis | 1 (56) | no centipawn numbers on this platform until M6 |
| 4 | sample 6, the Director tutorial | 1 (14) | done-when 6 is met for the mechanic tutorial only; sample 6 returns to M6 |
| 5 | Salt Market | 3, and a part of 52 and 61 | done-when 1 is met for nine games |
| 6 | Convoy | 3 | eight games |
| 7 | nine men's morris | 3 | seven games |
| 8 | hold'em | 4 | six games |

Never cut: liar's dice, Harbor Lights, Lanterns, chess, Ember Tricks, Blind Bid. A cut game is not dropped from
1.0 (REWRITE section 5, line 3): it is ported at the start of M5, before Whispers (decision A38).

### 2.7 The game frame of D9: not tried at M4

D9 as it stands: after the fourth game (liar's dice) is ported, a frame mechanic and `Ruleset` are built on four
games in at most six issues, and the other nine are ported on the frame only if three criteria hold; "if one
fails, the nine games are ported as they are and the frame waits until after 1.0". REWRITE row M4 is named
"Frame decision and the bulk".

**The trial is not run at M4.** No trial failed: this is a **change of D9 and of REWRITE row M4**, ruled by the
integrator and worded as decision A31. The ten games are ported as they are, and the frame waits until after 1.0.
The reasons that carry it:

- three mechanical ports reached level 3 on 20 oracle files at a known price (rows 49, 51, 68 to 75 of the
  record: two issues per game and one for the additions);
- a port on a frame cannot be carried: every game becomes hand-written lines under the 400-line rule, and its
  oracle check falls from level 3 to level 1 with a mapping, while D14 still asks for byte-identical texts;
- the trial costs six issues and four games ported twice before any of the nine starts, and M4 plans 64 issues
  without it.

This is a decision, not a measurement. In particular this file does **not** claim that a criterion of D9 would
fail: the challenger read Salt Market against criterion 3 and found one round timer and one job, which a frame
could own. What the decision costs: thirteen copies of the game lifecycle stay in thirteen mechanics until after
1.0. The owner is told in the summary of M4.

## 3. The scheduler sample `parallel`

### 3.1 What it is for

`turns` plays residents one after another: the drivers of a block run at once, but the calls of member k wait
until member k-1 is closed, so calls land in the seeded order (`packages/engine/src/turns/turns.ts`). `parallel`
drops that wait: **every resident that is woken acts on its own, and its calls are committed in the order in
which they arrive.** The kernel stays a single writer; what is parallel is the time a model thinks.

It is D10's "spike of at most three issues plus one sample", built at M4 and not at M6 (decision A30), because
REWRITE freezes the interface after M5 and a spike after the freeze cannot change `SchedulerPort`.

| Purpose | What M4 does with it |
|---|---|
| the owner's decision that the scheduler is pluggable | a second scheduler written **outside the engine**, against the public contract only, with no line in kernel, sdk or engine |
| the questions the City needs answered before its interface freezes: what a boundary, a pause, a snapshot and a Director's activation are under a second scheduler | section 3.5 |
| a tutorial for an expert: "write your own scheduler" | `docs/tutorials/scheduler.md`, every code block an include of the sample |
| replay that does not lean on the order of `turns` | the rule of 3.4 goes into the testkit and holds for every scheduler |

It is **not** a scheduler of the platform. `swt run` has no flag for it, `swt experiment` cannot name it, no
ported game is played under it (offline or live), no live run is made with it, and no error code is added for it.
`turns` is the reference of every comparison through 1.0 (paper 01, D1).

**It was run before it was specified.** The challenger built a prototype of 65 code lines over the real kernel
and sdk and the fixture `guess-number`: four residents, drivers that sleep a seeded random time; `toAct` once,
`toAct` three times and `always` twice a tick; 20 seeds each. It plays to the end with no kernel, sdk or engine
line changed, and 60 of 60 logs differ from each other. Not covered by that run, and so the first tests of the
issues: `onNews`, a failed driver, a Director kind, resume, the replay tests of M3 under the changed replay.

### 3.2 Contract

`parallel` is a `SchedulerDefinition` (`packages/contracts/src/kernel/ports.ts`), like `turns`. The contract of
the port does not change. The sample imports `@swarmtales/contracts` for the types and `arrange` and
`InputEntrySchema` from `@swarmtales/engine`, which the engine exports today.

```ts
// samples/own-scheduler/src/options.ts
export const ParallelOptions = Type.Object({
	activations: Type.Integer({ minimum: 1, default: 1, description: "Activations an actor gets in one tick at most" }),
	activation: Type.Union([Type.Literal("onNews"), Type.Literal("always"), Type.Literal("toAct")], { default: "onNews", description: "Who of the residents is woken" }),
	kinds: Type.Array(Type.String(), { default: ["resident"], description: "The actor kinds this scheduler activates; a kind other than resident is woken by news only" }),
	inputs: Type.Array(InputEntrySchema, { default: [], description: "The order of an activation's input lines, as in turns" }),
});
// samples/own-scheduler/src/parallel.ts
export const parallel: SchedulerDefinition<ParallelOptions>; // revision 1, determinism "recorded", events {}
```

A game names it with `scheduler: { id: "parallel" }`, and the sample resolves the game with the table
`{ turns, parallel }`. For that the helpers `play` and `replay` of the testkit get an option `schedulers` (today
both pass `{ turns }`); a game without `scheduler.id` resolves to `turns` and has the hash of today. The sample
scheduler is at most 150 code lines; that is the size of a tutorial, not a budget of the platform.

| Part of the port | How `parallel` uses it |
|---|---|
| `beginTick`, `endTick(idle)` | once per tick. **`idle` follows the rule of `turns`:** true only when the tick was halted before its first scan, as `turns` passes `started === 0` when no pass started. A tick in which nobody was woken is not idle. The kernel uses the flag only to keep the clock when a breach was seen (`packages/kernel/src/lifecycle.ts`), so a run that ends by a limit in a quiet tick reports the same end tick under both schedulers |
| `actors.ids`, `actors.mayAct` | a scan goes through the actors in the definition's order; no seeded shuffle, no random stream is drawn |
| `hasNews`, `toAct` | the wake rule of `turns`, per actor: `always`, `news`, `answer` (a pending driver), `toAct` |
| `inputsFor`, `open` | per actor, in one synchronous step for all actors a scan wakes, so their inputs show the same state |
| `OpenActivation.call` | passed to the driver as it is: no wait for another actor |
| `OpenActivation.close`, `quietEnd` | as `turns`; a pending driver without a quiet end is woken again |
| `halted` | read before every scan |
| `emit` | not used: `parallel` declares no event; `activation_opened` and `activation_closed` say everything |
| `rng` | not used |
| `SchedulerInstance.slice` | the pending actors, as `turns` |

The activation's `detail` is `{ reason, n }`: the wake reason and the number of this activation of the actor in
the tick, from 1.

### 3.3 One tick

1. `beginTick()`.
2. **Scan.** For every actor of `kinds`, in the definition's order: when it may act, has no open activation, has
   had fewer than `activations` activations in this tick and has a wake reason, its inputs are built and its
   activation is opened. No `await` inside a scan. An actor without a driver fails the tick with `SWT-R011`.
3. Every opened driver runs. A call is dispatched when it arrives.
4. **When an activation closes, the next scan runs in the same synchronous step**, so the line
   `activation_closed` is followed at once by the `activation_opened` lines of that scan.
5. The tick ends when no activation is open and a scan opens none. A halted run opens nothing more; the open
   activations end first.
6. `endTick(idle)`, with `idle` as in 3.2. A failed driver closes its activation as failed; the others end; then
   the first failure, in the order of opening, is thrown, as in `turns`.

**When a waiting actor is woken.** A scan runs at the start of a tick and at every close, and nowhere else. An
actor that gets news while others are open is therefore not woken at once: it waits until some activation closes.
While no activation is open the tick has ended, and the actor is woken by the first scan of the next tick. So
"acts on its own" means: an open actor never waits for another actor; a closed actor waits for the next close.
The tutorial says so in these words.

**A tick is bounded without a clock** (decision A35): every actor has at most `activations` activations in it.
Timers of mechanics keep counting ticks, and a deadline of two ticks keeps its meaning. This changes one sentence
of REWRITE 3.3 ("The tick advance in the parallel spike is the commit count, with no option and no wall clock";
issue 00 rewrites it) and decision 7 of paper 01, which was taken against the wall clock: a commit count would
change what a deadline means in every game that counts ticks.

### 3.4 Determinism and replay

| Level (REWRITE 3.3) | `turns` | `parallel` |
|---|---|---|
| reproducible: the same seed and scripted drivers give the same log | yes | **not promised.** With drivers that answer without waiting the order is that of the JavaScript job queue, which is stable in one Node version and nothing more. No test compares two `parallel` runs with each other |
| replayable: the recorded inputs, applied in log order, give every result again | yes | **yes, and tested** (below). The log is the schedule |
| authentic: the hash chain | yes | yes |

The manifest carries `scheduler.id`, the options hash and the determinism, as today. Random draws of mechanics
are labelled streams, so the order of arrival moves nobody's dice.

**Replay** (`packages/testkit/src/replay.ts`). The replay driver already makes each call when the replayed log
has reached the line before it (`reach`). Under `turns` the scheduler's wait orders the rest. One more input is
taken from the log: **the line at which an activation closed.** The plan remembers the `seq` of each
`activation_closed`, and the replay driver of an activation returns only when the replayed log has reached the
line before it. Calls, records and returns are then released in log order, each scan runs at the same line as in
the run, and the result lines must come out equal.

The challenger tested exactly this on the prototype, with a copy of `replay.ts` and three more lines: **60 of 60
logs replay equal with the gate, 0 of 60 without it.** The rule is right and necessary. It is independent of the
scheduler and goes into the testkit for every replay; its proving test is that every replay test of M1 to M3
stays green under `turns` (not run by the challenger). Whether a driver is still `pending` is inferred from the
reason `answer` of the actor's next activation, as today; under `onNews` with `parallel` that path is untested,
and test 5 covers it.

`basis` is in the envelope since M1: a call carries the log length its actor had seen. Under `parallel` that is
how a reader tells a seat that ignored a move from a seat that could not know it. No `stale` policy (paper 01,
decision 5).

### 3.5 Boundary, pause, snapshot, slots, Directors, state

The questions `turns` answered at M3, answered for `parallel`:

| Question | Answer |
|---|---|
| What is a tick boundary? | the same as under `turns`: `endTick` has returned. At a boundary no activation is open and no call is in flight. `SchedulerInstance.run(port, drivers, { ticks: 1 })` returns there |
| Pause | between ticks only (A22), by the run loop that reads `humanHand.paused`; nothing new. A pause never stops an open activation |
| Snapshot (`Kernel.snapshot`) | between ticks, as today. No snapshot inside a tick: an open activation is not in a snapshot |
| What of its state is in the snapshot? | the pending actors (`{ pending: string[] }`, the slice of `turns`). The count of activations per tick is not: it is zero at every boundary |
| Resume | a kernel resumed from the snapshot of any boundary plays on. **The resumed part is a new race:** it is not compared with the straight log line by line. The check is: the replay drivers of the rest of the straight log, given to the resumed kernel, write the rest of that log. The standing check "resume equals the straight log" of 4.3 is a check of games under `turns` and is not run under `parallel` |
| Slots (`afterBlocks`, errata G14) | none: `parallel` has no blocks. An actor kind that `turns` serves in a slot is listed in `kinds` |
| Does it activate Directors? | yes, when `kinds` holds `director`: a Director is woken by news (a firing in its queue) at the next scan, also while residents are open. `SWT-D003` needs no change: it asks whether a list option of the scheduler names the kind (`packages/sdk/src/game/directors.ts`, `activates`) |
| The human | never scheduled; `Kernel.submit` between ticks |
| `SchedulerPort.safePoint` | not built. "The lane is idle" inside a tick (paper 01) stays reserved |
| Mechanics | a mechanic never sees the scheduler. One that keeps a mark from `turnInputs` to the end of the same activation and assumes that no other activation is open (the board's "seen" mark of `channels`, M3 section 8) is **not supported under `parallel`**; `docs/SCHEDULERS.md` says so, and a test of the sample shows the fault with `channels` (issue 55). The activation hooks of issue 16 are what M5 needs to lift the limit |

### 3.6 What is not built

A place in the engine, a flag of `swt run`, the codes `SWT-G023` and `SWT-E012` of the first version, an
experiment factor, a live run, a fair queue, a cap on requests in flight, a stale policy, lane release in a
review stage, ticks by wall clock or by commit count, a `schedulers` package (D10 rules the last six out).

### 3.7 Tests

All of them live in `samples/own-scheduler/test/` except where a path is named.

| # | Test | Issue |
|---|---|---|
| 1 | **First test:** two open activations whose calls interleave are committed in arrival order, and each call's `basis` is its own actor's last answer. The prototype showed it; when it fails here, the fault is reported with the smallest kernel change, and way out 3 of section 1.2 applies | 53 |
| 2 | the wake rule: `onNews` wakes on news and on a pending answer, `always` gives `activations` activations, `toAct` wakes whom the plugin names; `activations` is a cap per tick; a second activation of one actor opens while another actor is still open; a closed actor with news is woken at the next close and not before | 53 |
| 3 | `idle` as under `turns`: a quiet tick is not idle; a run that ends by a limit in a quiet tick reports the same end tick under `turns` and under `parallel`; a tick halted before its first scan is idle | 53 |
| 4 | a failed driver; an actor without a driver (`SWT-R011`); a halted run opens nothing more; `resolveGame` with the table `{ turns, parallel }`; a game without `scheduler.id` has the hash of today; an id outside the table is `SWT-G020` and names the known ones | 53 |
| 5 | **replay under sixty interleavings:** the fixture game is played with twenty seeds for each of `toAct`, `always` and `onNews`, with drivers that wait a seeded random time before each call; each log replays to itself; at least two logs of each twenty differ from each other; under `onNews` at least one run holds a pending driver that is woken with the reason `answer` | 54 |
| 6 | **the close line under `turns`:** every replay test of M1 to M3 stays green with the changed `replay.ts` (`packages/testkit/test/`, the tests of the games and of `apps/cli`) | 54 |
| 7 | **resume from every boundary, by replay:** for each boundary of one run of test 5, a kernel resumed from the snapshot and driven by the replay drivers of the rest of the log writes the rest of the log | 54 |
| 8 | a Director under `parallel`: `kinds: ["resident", "director"]`, a firing wakes it while a resident is open; without `director` in `kinds` the game is `SWT-D003`; the pause between ticks through `humanHand.paused` | 54 |
| 9 | **the sample game in both modes:** the game of the sample (a sealed guess per round, so that the order of arrival moves no score) ends with the same result lines under `turns` and under `parallel` with scripted drivers | 55 |
| 10 | the limit of `channels`: the "seen" mark goes wrong when two activations are open; the test shows the wrong line and is named in `docs/SCHEDULERS.md` | 55 |
| 11 | every code block of `docs/tutorials/scheduler.md` is an include of the sample | 55 |

## 4. Platform items

### 4.1 No log position in a payload (decision A34, which closes the choice of A27)

**The rule.** No event payload, no tool reply and no input line holds a log position. A mechanic that must name
an earlier thing gives it a number of its own (a counter in its slice); the envelope's `causedBy` links lines.
The marker `run_resumed` stays a line of the log.

A27 asked this file to choose between two cures. **The other cure, a marker that takes no position, is
refused:** the resumed log would then be byte-equal, but `run_resumed` is the line that the continuity check
reads (`packages/chain/src/continuity.ts`), so a marker outside the log reopens M3-17.

The three places of A27, each changed:

| Place today | Becomes | Issue |
|---|---|---|
| `decisions`: `decision_settled.amendments[].seq`, and the closure variable that carries the call's position | `amendments[].n`: the number of the amendment of this decision, from 1, kept in the slice; `decision_amended` carries `n` too. The closure variable goes | 01 |
| the plugin `directors`: `Firing.seq` in the reply of `take` and in `DirectorContext.firings` (`packages/sdk/src/director/plugin.ts`) | `Firing.n`: the number of the firing of this Director, from 1, counted in the plugin's slice | 02 |
| the engine's record `asked { firings: seq[] }` (`packages/engine/src/directors/driver.ts`) | `asked { firings: n[] }`; the schema's description changes, the code line count of the engine does not | 02 |

Then "the resumed log equals the straight log" reads: **equal after the marker line is taken out and the envelope
fields `seq`, `causedBy` and `basis` behind it are moved back by one.** Nothing inside a payload is touched by the
comparison. A live Director then gets the same input after a resume, which is what M5 needs.

**How a reader gets from `asked.firings[n]` to the event that fired.** Today `Firing.seq` is the link; it goes.
The link is then the reply of the Director's `take`: the `tool_result` line of the same activation, directly
before the `asked` record, lists each firing with `n`, `tick`, `event` (the type) and `payload`. The triggering
line is the line of that tick with that type and payload; the viewer's projection and `swt report` find it so,
through one function of `packages/runlog` that both use. A report that cites a firing cites the `#seq` of the
`asked` line and the `#seq` it found for the trigger; neither number is stored in a payload. Two lines of one
tick with the same type and payload are told apart by their order: `n` counts in log order.

**The runtime revision moves.** The repository's rule: a change of what a run plays (what an actor is shown, how
answers arrive) raises the revision in the same pull request. Issues 01 and 02 change the played log of every
game that has a decision with an amendment or a Director: the payload of `decision_settled`, the reply of `take`
that a Director's `input` may print into its model's prompt, and the record `asked`. So:

- issue 01 raises `RUNTIME_REVISION` to 4 and adds the row to `docs/RUNTIME-REVISIONS.md`; issue 02 merges
  directly behind it and extends the row; the tag `runtime-r4` marks the merge commit of 02 (set by hand, as the
  doc says). No run is recorded between the two merges;
- the row says what does **not** change: when a resident is woken and what a resident is shown. No tabletop game
  has a decision or a Director, so no oracle file and no log of the M2 gate changes; the proving test of both
  issues is that every oracle test stays green. The series of M4 are recorded as revision 4 and stay comparable
  with the revision-3 runs of M2 for the games without a Director, and the row says so;
- the three timelines of `games/city-slice/test/timelines/`, the viewer fixture `resumed-run`,
  `apps/cli/test/fixtures/hand.ts` and the pinning test of A27 (`apps/cli/test/city-slice.test.ts` at
  `--snapshot-at 6`) are written again: the pinning test now asserts equality by the rule above. No file under
  `oracles/` holds `amendments` or `firings` (searched by the challenger), and the live logs of M3 hold no asked
  Director (A28), so nothing on `data/runs` changes.

The split: 01 is `decisions` with its timelines; 02 is the Directors (sdk, engine, runlog, viewer, the command
line fixtures) with the test of a Director's amendment that the review of M3 missed and the corrected errata P3.
The test that resumes the slice from every boundary through the command line is not built here: it is the
standing check of issue 06.

**A call position on the tool context** (asked for by the review) is **not built** (decision A36): with this
rule its one user is gone, and a position on the context invites the fault the rule forbids.

### 4.2 Gates

`decisions` is a plain mechanic since M3-34 and the seven manifests are clean; issue 03 builds the gates only.

| Gate | What it reads | Fails on |
|---|---|---|
| `scripts/gates/plain-mechanic.test.ts` | every file under `mechanics/*/src` | an import or a use of `ResolvedPlugin`, `PluginPort`, `KernelDefinition` or `.port`; an exported mechanic that is not the value `defineMechanic` returned (its `resolve` or `create` replaced). Fixture: a file of the gate's own fixture folder that wraps `resolve` as `decisions` did before M3-34 |
| `scripts/gates/base-alone.test.ts` (generalises `exile-alone.test.ts`, which stays) | `package.json` and every import of each mechanic package of class `base` | a package, service, event or tool id of a mechanic of class `game`. Fixture: `ledger` importing `puzzles` |
| unused dependencies, in the same file | the manifest of every mechanic and game package against its imports | a dependency that no file imports. Fixture: a manifest with `@swarmtales/mechanic-contracts` and no import of it |
| `scripts/gates/kernel-words.test.ts` | as today | the words M3 and M4 brought are added to `GAME_WORDS` where they are missing (banish, pause, holder, amend, verdict, court, channel, fragment, transfer, bid, deal, trick, pawn, lantern, convoy, market) |

Each gate has a test that shows it failing, and none passes on nothing.

### 4.3 The standing checks of a game

`packages/testkit/src/standing.ts`, and `apps/cli/test/standing.test.ts` over the games list
`games/index.ts` (one line per game: the game file, the seeds, the fake seeds; a gate fails when a folder under
`games/` with a `game.ts` is not on the list).

| Check | Function | What it proves |
|---|---|---|
| replay | `checkReplay(game, drivers, options)` | the log of a scripted run replays equal (`replay`), also the log of a fake run |
| resume in process | `checkResumeEveryBoundary(game, drivers, options)` | for every boundary: snapshot, `createKernel` with resume, the rest played by the same drivers; the log equals the straight log. A driver must depend only on what its activation shows (M3 7.2) |
| resume through the command line | `standing.test.ts` | `swt run --fake --snapshot-at N`, `swt resume`, for every N: equal by 4.1; `swt log verify --previous` holds; `swt replay` of both folders is equal |
| fake run | same | `swt run --fake` ends without an `error` end and holds an accepted call |

The review ran 64 and 66 such cases of the slice in 20 seconds. For a long game the boundaries are sampled: the
first three, the last three and every tenth (`options.boundaries`), so the check budget of ten minutes holds. The
five games that exist get the checks in issue 06; each of the ten in its game issue. A game whose match holds
more than one game is checked on a variant with one game.

The command-line check runs `swt replay`, so issue 06 depends on issue 05. The standing checks need a fake run
"with at least one accepted call" for the five games that exist, and of their mechanics only `grid-game` has a
`sample` function today (one of two tools); issue 04 writes them first (section 4.11).

### 4.4 Command line

| Item | What | Lesson or review |
|---|---|---|
| `swt replay <run> --game <file>` | replays the folder with the record sources the manifest names; prints "equal" or the first differing line (`SWT-C031`, exit 1). A log without `run_ended` whose last tick is not closed is refused with `SWT-T005` (a crashed run is not replayable) | P455 |
| `swt scan <folder>` | the leak scan of M2 (`apps/cli/src/leak-scan.ts`) as a command over any folder, also a checkout of `data/runs`; exit 1 and `SWT-X030` on a hit | P455 |
| `swt --help`, `swt <command> --help` | the commands with their flags and exit codes, written from the table in `flags.ts`; `swt` without arguments prints the same and exits 0 | review of M3, DX 6 |
| a refused line of `--hand` | printed with its code as it happens, and counted in the result lines | P453 |
| `--snapshot-at` beyond the last tick | a warning line, exit code unchanged | review of M3 |
| fix texts | `SWT-X009`: "resume with the hand file of the stopped run plus a `resume` line"; `SWT-D002` for a data game says that a data game cannot carry a Director definition yet; the hand file's format gets a section in `docs/reference/cli.md` | F2, P2 |
| the token line | "… requests, I input, R cache-read, W cache-write and O output tokens" | P448 |
| the name of a run in the ledger and in the series lines | `<experiment id>/<run id>`, or `smoke/<run id>`; never a path relative to the start directory | P447 |

`swt run` gets no flag for a scheduler.

### 4.5 Report and lab

| Item | What | Lesson |
|---|---|---|
| `swt report` without `--game` | resolves the mechanics from the plugin ids of the manifest through the installed table; a plugin it cannot find is named in a line "metrics absent: <id>" at the head of the facts table | P444 |
| "human-influenced" | a header line of the report when the log holds a `tool_called` of `human`, with the count | P452 |
| requests and cost per actor | `RunFacts` gets per-actor keys (`models.requests.<actor>`, `models.costUsd.<actor>`); an actor without a request reads 0 requests, not "absent"; the table "Spend" shows them | P454 |
| `n` of an unpaired estimate | n per arm; the interval of a count is cut at zero | P449 |
| the refusal-code guardrail | `results.json` records it as held or not, with the codes outside the list | review of M2 |
| a `started` line in the ledger | the runner writes a line with the run's reservation before the run starts and the cost line after it, so a killed process does not lose its reservation; the next start counts an open `started` line at its full cap | review of M2, finding B14 |

Finding B5 of the same review (a run may report more than its cap) gets no code at M4: the cost meter is asked
between requests, so the last request can pass the cap of a run, and the totals of section 7.1 hold a reserve for
the runs in flight (A17). The rerun plan states it. Both findings are taken from the challenger's account; the
review file itself is not in the repository and was not read for this revision.

### 4.6 Docs

| Item | What | Issue |
|---|---|---|
| `docs/reference/errors.md` | generated by `pnpm docs:errors` from the code catalogues of all packages: per code its summary, why, fix. `pnpm docs:errors --check` is in the check; a gate fails on a code without an anchor and on an anchor without a code. Every `SwtError` already prints `docs/reference/errors.md#<code>` (`packages/contracts/src/error.ts`); today the file does not exist | 10 |
| the generated service tables of a mechanic README | show the output of a method with its codes (`banish`: `UNKNOWN_RESIDENT`, `ALREADY_EXILED`), not "object". **Merged first in wave 1**, before any port regenerates its README; the stale `mechanics/README.md` goes with it | 11 |
| the game READMEs of quarry and econ-lab | corrected in the four places of P456 (place bonus, no retro after the last game, the tool list of econ-lab, the burn text); the two options of A29 described | 12 |
| `RESUME.md` | no local absolute path; "the scheduler `match`" becomes "the scheduler sample `parallel`"; the errata of M3 get a row for P452 and the corrected P3 | 12 |
| the design checklist of `docs/LESSONS-LEARNED.md` | two lines: "a payload holds no log position" and "a mechanic tells its residents what is open" (P451) | 12 |
| `docs/SCHEDULERS.md` | what each scheduler promises (3.4), when a waiting actor is woken (3.3), what is not supported under `parallel` (3.5) | 55 |

### 4.7 Samples 5 and 6: the two tutorials as tests

REWRITE 3.8 asks for samples 5 and 6 before 1.0; the root README says both tutorials arrive with milestone M4.

| Sample | Folder | What it shows | Tutorial |
|---|---|---|---|
| 5, own mechanic | `samples/own-mechanic/` | a mechanic of about 80 lines in the A8 form: `defineHead` with one tool, one event, one option and one service; `defineMechanic(head, body)`; a `sample` function; `requires` against `uses`, `call` against `tryCall`; a second small mechanic that **listens** to the first one's event with `after:` (the pattern of M3) and is the owner of a decision; an option checked against `Setup.actors`; a game that loads both; the conformance checks | `docs/tutorials/mechanic.md` |
| 6, own Director | `samples/own-director/` | `defineDirector` with an event trigger, a structured answer and a fallback; a game with a decision window and a grant `human`; a hand file; `swt run --fake --hand`, `swt resume`, `swt replay` | `docs/tutorials/director.md` |

Every code block of a tutorial is an include of a file of its sample, checked by the test that checks the
README's include; each sample has a test that plays it and runs the four standing checks. The READMEs of `exile`
and `decisions` get the listener and the owner snippet as includes of sample 5. The root README's "Choose your
path" links both. Sample 6 is on the cut list (cut 4). The scheduler sample is section 3.

### 4.8 The brain's option

`strategy-brain` gets an option `tooLongDetail: "plain" | "cut"`, default `"plain"`: byte-identical to today.
`"cut"` adds "Cut at least N words." to the detail of `BRAIN_TOO_LONG` (P446). **No game switches it on at M4**
(section 8). Done when the oracle tests of the three ported games are green with the option left out.

**The Hello Game is not changed.** It keeps its tick limit. That a live resident needs more activations than the
limit gives (P445) stays an open lesson row, and the proposal `end: { ticks: 20 }` is in section 8: the limit is
a rule of a game.

### 4.9 The activation hooks (issue 16, `interface-change`)

`PluginHooks` (`packages/contracts/src/kernel/plugin.ts`) gets two optional hooks, reserved since M1 1.4:

```ts
/** Runs after `activation_opened` is written, before the driver starts. */
activationOpened?(actor: ActorId): void;
/** Runs when the activation ends, before `activation_closed` is written. */
activationClosed?(actor: ActorId): void;
```

The kernel calls them in `openActivation` (`packages/kernel/src/ports.ts`), each in its own frame, in hook order
with `after:`. The sdk shows them to a mechanic as `activationOpened(resident, ctx)` and
`activationClosed(resident, ctx)`, resident-only like `turnInputs`. **The 17 kernel lines are taken** (decision
A40): M1 1.4 booked 25 lines for three hooks, and M5 needs these two for `channels`, `arena` and `progression`
anyway, so they are M5's lines spent one milestone early. No run that exists changes: no mechanic has the hooks,
so this issue raises no runtime revision (proving test: every oracle test and the three timelines stay green).

Why chess cannot do without them, as the challenger checked it: the forfeit must land between the idle turn of
the seat on move and the next wake decision (old `mechanics/chess/src/index.ts`, lines 638 to 660). Counting in
`turnInputs` of the next activation wakes the seat once more and loses level 3; counting in `tickEnded` moves the
forfeit by up to three turns; a side effect in `news` works only with a block size of 1, and a hook that is asked
must not write.

**First test** of the issue: where the events of a hook land. In `oracles/chess/chess-s13-silent.json` a
forfeited move follows the turn of the seat that let it pass and comes before the next turn; the hook's events
must land there at level 1. **Way out, tried first when the count grows above 17:** way out 1 of section 1.2
(`kit.on` on `activation_closed`). There is no second way out inside M4.

### 4.10 Error codes

| Code | Raised by | When |
|---|---|---|
| `SWT-T005` | `testkit`, `replay` | the log ends inside a tick without `run_ended` |
| `SWT-C031` | `apps/cli`, `swt replay` | the replayed log differs; the issue names the first line |

The codes `SWT-G023` and `SWT-E012` of the first version are not built. Each game's catalogue gets the codes its
port needs (rule 10 of 2.2).

### 4.11 `sample` functions for the mechanics ported before M4 (issue 04)

No mechanic of M1 and M2 has `sample` functions for its game tools: `draft-rounds`, `econ-games`, `consensus`,
`strategy-brain` and `team-channel` have none, `grid-game` has one of two (counted by the challenger in
`mechanics/*/src`). The standing checks of the five games that exist need them, and so does rule 2 of 2.2 for all
ten ports: every one loads `strategy-brain`, most load `team-channel`, morris loads `consensus`.

Issue 04 writes a `sample` function for every resident tool of these six mechanics, and of `optimal-referee`
where it has a resident tool. A `sample` function is used by the fake driver only: it is no model-visible text,
and a head is no part of the game hash (M2 10.3). Done when `swt run --fake` of tic-tac-toe teams, quarry and
econ-lab each holds an accepted call of every tool that a fake run can reach, every oracle test is green and
every game hash is the hash of today.

## 5. The inputs of the reviews: taken or refused

### 5.1 Review of M3, section 8 ("what the M4 specification must take")

| # | Item | Taken? | Where, or why not |
|---|---|---|---|
| 1 | log positions in payloads | **taken**: payloads hold no position | 4.1, issues 01 and 02 |
| 2 | a tool context carries the position of its call | **refused** in that form; taken as "the sdk gives it another way": a counter in the slice | 4.1; decision A36 |
| 3 | a gate that mechanics are plain `defineMechanic` values | **taken**; `decisions` itself is plain since M3-34 | 4.2, issue 03 |
| 4 | a run-time check of service calls, or a written decision that types suffice | **the decision**: types suffice while every mechanic is in this repository; the check comes with the first mechanic from outside (M6) | decision A37 |
| 5 | generalise `exile-alone` to every base mechanic | **taken** | 4.2 |
| 6 | `sample` functions in every port, a `--fake` test per game | **taken**, also for the mechanics ported before M4 | 2.2 rule 2; 4.11, issue 04 |
| 7 | resume from every boundary and replay as a standing test per game | **taken** | 4.3 |
| 8 | the second scheduler answers the questions `turns` answered | **taken** | 3.5 |
| 9 | `channels` holds only with `blockSize: 1` | **taken** as a stated limit and a failing-case test; no tabletop game loads `channels` (checked: none of the ten game files imports it) | 3.5 |
| 10 | `swt replay <run>` before the gate | **taken** | 4.4, issue 05 |
| 11 | the mechanic tutorial as a tested sample | **taken**, and the Director tutorial with it | 4.7 |
| 12 | every mechanic says what is open (P451) | **taken** as a line of the design checklist; `court` got its `session-opened` notice on `develop` before M4 | 4.6 |

### 5.2 Review of M3, section 7 (follow-ups)

| Item | Taken? | Where, or why not |
|---|---|---|
| unused `mechanic-contracts` in seven manifests; `manifestOffences` | done on `develop` (M3-34) | |
| a check for unused dependencies | taken | 4.2 |
| pin a Director's amendment in a test | taken | issue 02 |
| an erratum row for P452 | taken | issue 12 |
| package READMEs that say "empty" | done on `develop` before M4 | |
| the fix text of `SWT-D002` for a data game | taken | issue 07 |
| `--snapshot-at` beyond the last tick, a refused hand line | taken | issue 07 |
| the M3 words in `GAME_WORDS` | taken | issue 03 |
| outputs in the generated service tables | taken | issue 11 |
| `docs/reference/errors.md`, `swt --help` | taken | issues 10, 07 |
| a listener snippet and an owner snippet in two READMEs | taken | issue 13 |
| replay of a log cut inside a tick | taken as a refusal with a code (`SWT-T005`); **refused** as a feature: a crashed run has no closed tick to replay | 4.4 |
| a test that pins the kernel's line count | **refused**: the gate of 1420 is the pin; an exact number would fail on every honest change and say nothing more | |

### 5.3 Review of M2 (follow-ups)

| Item | Taken? | Where, or why not |
|---|---|---|
| the owner compares 1.60 USD with the provider's usage page | **the owner's**; asked for before the series of M4 | section 8 |
| an open arm with frozen quarries, or new texts (LH18); the results line (LH19) | **decided meanwhile** by A29: issues M2-28 and M2-29, beside M4 | section 1.4 |
| the game READMEs of quarry and econ-lab | taken | issue 12 |
| `results.json` records the refusal-code guardrail | taken | issue 08 |
| P444 to P449 | taken, each; **P445 is not**: the Hello Game keeps its limit | 4.4, 4.5, 4.8, section 8 |
| the one recalibration of D4 | **refused**: the budget it would recalibrate ended with M2, and the rows after 82 hold no token number. Issue 00 writes that sentence into the record | |
| a live run that really ends at `models.budget` | taken: the Hello Game run of smoke part 1 | section 7.3 |
| `RESUME.md` without local absolute paths | taken | issue 12 |
| finding B14 (no `started` line in the ledger) | taken | 4.5, issue 08 |
| finding B5 (a run may report more than its cap) | **refused** as code, stated in the rerun plan | 4.5 |

### 5.4 The integrator's list of follow-ups

Taken at M4 because a neighbouring issue touches the file: spend per actor in `RunFacts` (08); the viewer says
"minute" (57); the stale `mechanics/README.md` (11). **Refused:** an own code for an unknown scheduler id,
because `SWT-G020` under `scheduler.id` already names the known ids. Every other line of the list stays there
with no M4 issue: none blocks a done-when of M4, and three need a decision first (descriptions on carried schemas
are model-visible, so they are a prompt change; `PluginHead` in `contracts` is an interface change; the file lock
of the ledger matters only for two processes, and M4 runs its series in one).

## 6. What the old runs found, game by game

Read from `stories/<game>/runs/README.md` on `legacy`. All these runs are of runtime revision 1 except the chess
runs 045 to 057.

| Game | Old runs (cost) | What they found | Firm? | At M4 |
|---|---|---|---|---|
| Harbor Lights | 7 series (7.9 USD) | private notes against nothing: +3.2 points (SE 0.8) over 12 deals, from fewer misfires; the crew brain is weaker than private caution; the aid does not help | **firm** (D11) | confirmatory series |
| Lanterns | 6 series (2.9 USD) | a team brain raises recall by 0.08 (SE 0.03) over 12 seeds, nothing in game 1, +0.11 in games 2 to 4 | **firm** (D11) | confirmatory series |
| chess | 57 runs | on revision 2: 1.13 requests per half-move on the default variant (one run), 1.18 to 1.22 with `fresh` and `compact` (four seeds); legal-move lists and the coach lower the centipawn loss | the request count (D11) | count series on `fresh` with `compact` |
| hold'em | 7 series (15.6 USD) | the decision aid: EV loss 0.03 against 0.26 per decision over 24 mixed tables; the brain changes style, not points | strong, one series | smoke; a series is the first candidate after M4 |
| Ember Tricks | 5 series (6.8 USD) | the worth at the bid: 2.36 against 0.73 points per seat and round | three seeds | smoke; second candidate |
| Convoy | 4 series (4.2 USD) | saboteurs with a brain win 5 against 3 of 15; detection 0.88 against 0.93 | not firm | smoke |
| nine men's morris | 7 series (20.7 USD, 16.5 of it stronger models) | no brain effect in any series; against the search at depth 3 the residents win 1 of 24 | a null result | smoke |
| Salt Market | 6 runs (3.4 USD) | no brain effect: gain over idle 0.228 against 0.223 (paired +0.005, SE 0.025) | a null result | smoke |
| Blind Bid | 1 smoke (0.03 USD) | shading 0.66 to 0.82 of the value | n = 1 | smoke |
| liar's dice | 3 runs (10.8 USD, 10.6 of it stronger models) | honest talk, no deliberate bluff on the small model | n = 1 for the small model | smoke |

## 7. Live runs

The offline done-whens need no live run. Done-when 7 does. Everything below is on Haiku through Anthropic,
thinking `medium`; no other model and no other provider. **The output cap is that of each game's old entry**
(rule 8 of 2.2), because an effect measured under 16000 tokens is not rerun under 4000:

| Output cap | Games |
|---:|---|
| 16000 | liar's dice, Lanterns, chess, hold'em, nine men's morris, Convoy |
| 4000 (the default; the old entry sets none) | Harbor Lights, Ember Tricks, Blind Bid, Salt Market |

The plan is committed as `docs/RERUN-PLAN-M4.md` with the experiment specs before the first run (issue 58), each
series runs once at its planned seed count (D11), and the caps are refusals by code (A14). The budget of the
project is 50 USD. Spent or capped before M4: 1.62 (M0 to M2), 0.02 (M3), 1.50 as the cap of A29. With the cap of
M4 the project stands at 15.14 USD at most.

### 7.1 Caps

| Cap | USD | Held by |
|---|---:|---|
| **M4 as a whole** | **12.00** | `games/m4-ledger.jsonl`; a run that does not fit is refused |
| one smoke run | 0.40 (0.002 for the cap run of the Hello Game) | the cost meter of the run |
| smokes, part 1 (three games and the cap run) | 1.25 | the ledger |
| smokes, part 2 (four games) | 1.60 | the ledger |
| Harbor Lights: series | 1.60 (0.12 per run) | the experiment runner |
| Lanterns: series | 2.35 (0.20 per run) | the experiment runner |
| chess: request count | 2.00 (0.80 per run, one run in flight) | the experiment runner |
| **one bridge on a lost sign** (7.2) | **2.00** | a reservation line in the ledger, written by hand |
| a broken series | three excluded runs in a row | the experiment runner |

**The parts sum to 10.80, the bridge included.** The 1.20 between that and 12.00 are not assigned and are spent
only by a decision row. The expected spend without a bridge is about 5.2 USD: Harbor Lights 24 runs at the old
0.05 for a one-game match (1.2), Lanterns 24 at 0.07 (1.7), chess four matches at the old 0.104 to 0.109 USD per
100 half-moves and at most 320 half-moves (1.4), seven smokes (0.9). A cap per run is more than twice the old
cost, so it catches a loop and not a normal run; each total holds its expected spend plus the reserve the runner
keeps for the runs in flight (A17). Two runs are in flight at most, one for chess.

**No noise floor is played at M4.** The first version planned five replicates of each control arm (1.70 USD).
The old platform has no noise floor for these two games, so the new one would have gated nothing; the money is
the bridge's.

### 7.2 The two series and the count

Series are played for exactly the three that D11 names. Every other game gets a smoke (7.3).

| | Harbor Lights: private notes | Lanterns: the team brain | chess: requests |
|---|---|---|---|
| Question | Do private notes raise the crew's score? | Does a team brain raise recall? | How many requests does a half-move cost? |
| Control arm | `nobrain`: `{ brain: "nobrain", games: 1 }` | `nobrain`: `{ brain: false }` | one arm: `{ games: 4, maxPlies: 80, fresh: true, compact: true }`, the old `chess-g4-p80-fresh-compact` |
| Treatment arm | `solo`: `{ brain: "solo", games: 1 }` | `brain`: `{}` | |
| Output cap | 4000 | 16000 | 16000 |
| Primary metric | `hint-towers.score`: the points of the game | `clue-grid.recall`: per team and game, averaged | `models.requests` divided by `chess.plies` |
| Design | paired on the deal | paired on the seed | replicates |
| Seeds | 101 to 112 | 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107 | 41, 43, 47, 53 |
| Runs | 24 | 24 | 4 |
| Old platform | +3.2 (SE 0.8), run `harbor-lights-04a-006-game1-plan` | +0.08 (SE 0.03), runs `lanterns-06a-005` and `-006` | 1.18 to 1.22 on the revision-2 runs 048 to 051, the same arm and the same four seeds |
| **Kept** | the mean of the paired differences is greater than 0 | greater than 0 | **no pass rule in this file:** the mean and the range are reported beside 1.18 to 1.22 |
| Smallest n for a verdict | 10 complete pairs | 10 complete pairs | 3 finished matches |
| Reported, not gated | SE, 95 % interval, the exact sign-flip p, whether it reaches +1.6, misfires per arm, the control mean against 16.5 to 20.5 | the same, the difference in games 2 to 4 (old +0.11), precision, games that ran out of clues | refused moves per 100 half-moves (old: at most 4), cost per match, turns that ended without a call |

**The chess arm, corrected.** The first version named the default variant and "1.13 to 1.22 on the runs 045 to
055". On `legacy` (`stories/chess/runs/README.md`, the table of the revision-2 runs) the default variant has one
revision-2 run (045, seed 41: 1.13); seeds 43, 47 and 53 were played at revision 2 only as `-fresh -compact`
(048 to 051), and 052 to 055 were played with `--thinking low`. The arm with four old points is `fresh` with
`compact`, and that is the arm of the count. Whether 048 to 051 ran with thinking `medium` is read from their
manifests by issue 58 before the plan is committed; when they did not, the plan says so and the arm stays.

**The chess number is reported, not passed.** D11 says "the chess request counts hold" and states no bound. The
first version's "at most 1.30" was this file's own number and is struck. The gate's write-up
(`docs/M4-GATE.md`) puts the new mean and range beside the old range, and the integrator writes the word "hold"
or not with one sentence of reason. A numeric pass rule would be a rule of D11 and needs a decision row (section
8).

Guardrails and exclusions as at M2 (8.3): requests per decision, cost per run, missed decisions, an allowed list
of refusal codes; a guardrail that does not hold is a deviation and a lesson row, not a failed gate. The first
run of each series is read as a smoke is (7.3) before the second starts.

**If a series does not keep its sign,** nothing is run again on the new platform. The same arms and seeds are
played once on the old code at `v0-final` (the bridge), with the same model and the game's old output cap. The
money is the reserve of 7.1: one bridge of 24 runs costs about 1.7 USD for Lanterns and about 1.2 for Harbor
Lights. The old code does not write `games/m4-ledger.jsonl`, so the integrator writes a reservation line of 2.00
before the first bridge run and the true cost, read from the old run reports, after the last. The bridge keeps
the old sign: the port changed the effect, M4 is not closed, and two logs per arm are read against two old ones
before anything else. The bridge loses it too: the model moved; the gate is not passed and the owner decides. **A
second bridge** (both series lose their sign) is not funded and needs the owner's go.

### 7.3 The smokes

One live run per game that has no series, which is also the game's first recorded run on this platform (REWRITE
section 5, line 3). Harbor Lights, Lanterns and chess get no smoke: the runs of their series are their recorded
runs. Each folder verifies, replays equal with `swt replay`, is clean under `swt scan`, and goes to `data/runs`
under `<game>/smoke/<run>/` with a README (loopholes, problems, solutions) and a row in `games/<game>/RUNS.md`
with runtime revision 4.

| Part | Runs | Expected USD |
|---|---|---:|
| 1 (issue 60) | the Hello Game once with `--budget 0.002` (it must end at `models.budget`); liar's dice; Ember Tricks (`games: 1`); Blind Bid | 0.35 |
| 2 (issue 61) | hold'em; nine men's morris (one resident against the search at depth 3); Convoy; Salt Market | 0.55 |

No game is played live under `parallel`. A smoke tunes nothing. A game that does not play live (as the slice did
not, P450) is a lesson row and a finding for the owner; the port is judged by its oracle files.

### 7.4 What gets no series at M4

Hold'em (the aid) and Ember Tricks (the worth at the bid) are aid effects and are not in D11; they are the next
candidates and are named in the rerun plan with their old numbers. Convoy, morris, Salt Market, Blind Bid and
liar's dice set new baselines later, by the plan of paper 02 (5.3, steps 3 to 5). None of them is run as a series
inside the cap of M4.

## 8. Needs the owner's go

Nothing in this list is decided here, and no M4 issue builds it. **No game rule is changed in M4.**

| # | What | Proposal | Why it is the owner's |
|---|---|---|---|
| 1 | the Hello Game's tick limit (P445): a live resident uses one activation to look and one to move, so the game ends before a result | `end: { ticks: 20 }`; the game stays eleven code lines and the README include follows | the limit is a rule of a game; P445 stays open until then |
| 2 | chess counts an idle turn at `tickEnded` | none: asked only when both the hooks and `kit.on` fail (1.2) | it moves a forfeit by up to three turns |
| 3 | a numeric pass rule for the chess request count | if a bound is wanted: the mean of the four matches is at most 1.30, the number of the first version | a pass rule of a D11 criterion |
| 4 | switching `tooLongDetail: "cut"` on in any game, or a longer retro window (P446) | on in the brain arms of a later series, as an arm | a changed refusal text is a changed prompt; it moves the brain arms |
| 5 | the burn parameter of `pick` in a game without burns (P442), descriptions on the schemas of carried mechanics | none yet | model-visible texts |
| 6 | a rule change that a smoke of M4 suggests for any of the ten games | proposals only, in the summary of the run | "brainstorm before building" |
| 7 | playing a ported game under `parallel`, live or as evidence; `passes: 4` read as `activations: 4` | none before 1.0 | a second scheduler is a treatment (paper 02, 2.3) |
| 8 | series beyond section 7.2 (hold'em, Ember Tricks), a second bridge, any spend above 12.00 USD | hold'em first | money |
| 9 | once, before the series: compare the 1.60 USD of M2 with the provider's usage page | | the caps are only as good as the price table |
| 10 | the tag `v0-final` on the remote and the switch of `main` | | O3; unchanged by M4 |

Told to the owner, not asked: the frame trial of D9 is not run (A31), so thirteen copies of the game lifecycle
stay until after 1.0; the second scheduler is a sample at M4 and not a spike at M6 (A30). LH18 and LH19 left this
list with A29.

## 9. Stop rules and the softer check

M4 has no kill criterion of its own; that of the rewrite was checked at M2. M4 is **stopped and planned again**
when one of these holds:

1. more than 128 issues are merged or open (A19: twice the plan; section 10);
2. the kernel is above its gate of 1420 without the issue of A20, or kernel + sdk + engine are above 4100;
3. a ported game does not reach level 1 on an oracle file and the difference is no registered change: that game
   stops, the others go on, and the gate names it.

**The softer check of M4**, answered in writing by the gate issue in `docs/ISSUE-RECORD.md`:

| Question | Planned answer |
|---|---|
| Which kernel lines did M4 add? | at most 17, for the two activation hooks that M1 1.4 reserved; their first user is chess. If `kit.on` was taken instead, the lines and the registered change |
| Did a tabletop game need a kernel mechanism that was not reserved? | no. If a port issue finds one, it stops, names it, and the game moves behind the others |
| Did `parallel` need a line in kernel, sdk or engine, or a change of `SchedulerPort`? | no (the prototype needed none). If it does, the scheduler port is **not** ready to freeze: the sample is cut, and the M5 specification gets the finding as its first input |
| Where do the three budgets stand, and what can M5 take? | kernel at most 1410, kernel + sdk + engine at most 3860; the table of section 1.2 with the measured numbers: staged calls and `runEnded` fit, the rest of the reserved list does not |
| Did a firm effect change sign? | section 7.2 |

## 10. Issues

Rules as in M1 to M3: at most 400 hand-written lines per issue, tests included, carried lines and committed data
(timelines, oracle files) not counted; the allowed paths are a fence; `pnpm check` green before the merge. Ids are
`M4-00` to `M4-63`; the table writes the number only. An issue whose "done when" starts with **First test** runs
that test before anything else and follows the way out when it fails. Every port issue states "prompt texts and
tool names byte-identical: yes or no". "Variable" is the variable of D2 that the issue changes.

**The budget (A19, decision A32): 64 issues planned. The integrator applies the cut list of section 2.6 when 90
issues are merged or open, and M4 is stopped and planned again above 128.**

The estimates of the game issues are read off the record as the challenger read it: M1-35 took 269 + 514 = 783
lines, M2-13 152 + 483 = 635, M2-14 145 + 255 = 400, M2-15 681 for the additions of two games. So a game with
more than five oracle files, with arms or with variants is two issues from the start, and additions are written
for two games at a time, three only where the metrics are few.

| # | Title | Scope and done when | Allowed paths | Depends on | Lines | Variable |
|---|---|---|---|---|---:|---|
| 00 | Scaffold of M4 | the twelve mechanic packages and ten game packages exist with empty barrels and class `game`; the three sample folders; `chess.js` 1.4.0 in the lockfile with its licence row; the mechanic list of the README generator; `games/index.ts` with the five games that exist; the closing sentence on D4 and the owed rows in the record; **the sentences of REWRITE and of two older papers that decisions A30, A31 and A35 change (section 10.1)**. Done when the layer check and the licence gate are green | config, barrels and README stubs under `mechanics/`, `games/`, `samples/`; `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `tsconfig.json`, `THIRD-PARTY-LICENSES.md`, `scripts/mechanic-docs.ts`, `docs/ISSUE-RECORD.md`, `docs/refactoring-before-release/{REWRITE.md,10-m3-spec-errata.md}` | none | 250 | none |
| 01 | No log position 1: `decisions` (`interface-change`) | section 4.1, first row: `n` in `decision_settled.amendments` and in `decision_amended`, the counter in the slice, the closure variable gone; the timelines written again; `RUNTIME_REVISION` 4 with its row. Done when every oracle test is green and the slice's timelines hold no `seq` inside a payload of `decisions` | `mechanics/decisions/`, `games/city-slice/test/`, `packages/kernel/src/revision.ts`, `docs/RUNTIME-REVISIONS.md` | 00 | 250 | kernel |
| 02 | No log position 2: the Directors (`interface-change`) | section 4.1, rows 2 and 3: `Firing.n`, `asked { firings: n[] }`, the function of `runlog` that finds the trigger, the viewer's projection and the fixture `resumed-run`, the fixture `hand.ts`, the pinning test of A27 turned into equality; a test of a Director's amendment; the row of revision 4 extended; errata P3. At most 10 sdk lines | `packages/sdk/src/director/`, `packages/engine/src/directors/`, `packages/runlog/`, `packages/viewer-core/`, `apps/cli/test/`, `games/city-slice/test/`, `docs/RUNTIME-REVISIONS.md`, the errata of M3 | 01 | 330 | kernel |
| 03 | Gates: plain mechanics, base alone, unused dependencies, kernel words | section 4.2. Done when each gate fails on its fixture | `scripts/gates/` | 00 | 300 | none |
| 04 | `sample` functions for the mechanics ported before M4 | section 4.11. Overlap with M2-28 and M2-29: section 1.4 | `mechanics/{draft-rounds,econ-games,consensus,strategy-brain,team-channel,grid-game,optimal-referee}/`, `games/{tictactoe-teams,quarry,econ-lab}/test/fake.test.ts` | 00 | 360 | none |
| 05 | Command line 1: `swt replay`, `swt scan` | section 4.4, the first two rows; `SWT-C031`, `SWT-T005` | `apps/cli/src/`, `apps/cli/test/`, `packages/testkit/src/replay.ts` | 00 | 300 | none |
| 06 | testkit: the standing checks and the games list | section 4.3 for the five games that exist; the gate of the list; the command-line check that resumes the slice from every boundary and compares by 4.1 | `packages/testkit/src/standing.ts`, `packages/testkit/test/`, `apps/cli/test/standing.test.ts`, `games/*/test/standing.test.ts`, `scripts/gates/` | 02, 04, 05 | 380 | none |
| 07 | Command line 2: `swt --help`, the hand's lines, fix texts | section 4.4, rows 3 to 6; `docs/reference/cli.md` | `apps/cli/`, `packages/sdk/src/errors.ts` (texts only), `docs/reference/cli.md` | 05 | 320 | none |
| 08 | Lab: facts per actor, n per arm, the guardrail, the `started` line | section 4.5, rows 3 to 6 | `packages/lab/` | 00 | 340 | none |
| 09 | Report and result lines | section 4.5, rows 1 and 2; section 4.4, the token line and the run names | `apps/cli/src/`, `apps/cli/test/`, `packages/lab/src/report*` | 07, 08 | 300 | none |
| 10 | `docs/reference/errors.md`, generated and gated | section 4.6, row 1 | `scripts/error-docs/`, `scripts/gates/`, `docs/reference/errors.md`, `package.json` | 00 | 300 | none |
| 11 | Mechanic READMEs: outputs in the service tables | section 4.6, row 2. Merged first in wave 1 | `scripts/mechanic-docs/`, `mechanics/*/README.md`, `mechanics/README.md` | 00 | 200 | none |
| 12 | Docs chores | section 4.6, rows 3 to 5 | `games/{quarry,econ-lab}/README.md`, `docs/` | M2-28 and M2-29 merged | 150 | none |
| 13 | Sample 5: own mechanic, with its tutorial | section 4.7, row 1; the README's line | `samples/own-mechanic/`, `docs/tutorials/mechanic.md`, `mechanics/{exile,decisions}/README.md`, `README.md`, `scripts/gates/readme.test.ts` | 03 | 380 | none |
| 14 | Sample 6: own Director, with its tutorial | section 4.7, row 2 | `samples/own-director/`, `docs/tutorials/director.md`, `README.md` | 02, 07 | 360 | none |
| 15 | The brain's option | section 4.8 | `mechanics/strategy-brain/` | 04 | 100 | none |
| 16 | The activation hooks (`interface-change`) | section 4.9; **First test** as there; kernel at most 1410 and sdk at most 15 lines more, counted in the record; way out: `kit.on` | `packages/contracts/src/kernel/plugin.ts`, `packages/kernel/src/{ports,loader,parts}.ts`, `packages/sdk/src/mechanic/`, tests | 00 | 230 | kernel |
| 17 | Oracle additions: chess | section 2.4, rows 1 to 7; the team file is a must | `oracles/chess/`, `oracles/{COVERAGE.md,checksums.txt,m4-catalog.patch}`, and the catalogue and scripted players on `legacy` | none | 200 | none |
| 18 | Oracle additions: hold'em, Harbor Lights, Ember Tricks | section 2.4, rows 8 to 11, each with its first test and way out | `oracles/{holdem,harbor-lights,ember-tricks}/`, the three shared files of 17, and the catalogue on `legacy` | none | 150 | none |
| 19 | Port: `liars-dice` | the mechanic, carried and split; `sample` functions; its part of the old test file | `mechanics/liars-dice/` | 00 | 330 | kernel |
| 20 | Game: liar's dice and its oracle files | six files at level 3; `carried.test.ts`; rules 2 to 9 of 2.2; output cap 16000 | `games/liars-dice/`, `GAMES.md`, `games/index.ts` | 04, 06, 19 | 380 | kernel |
| 21 | Port: `card-table` | carried with its test | `mechanics/card-table/` | 00 | 180 | kernel |
| 22 | Port: `hint-towers` | carried and split; the three arms, strikes, the aid, the reference crew, the move timer | `mechanics/hint-towers/` | 21 | 360 | kernel |
| 23 | Game: Harbor Lights, the arms of the series | the game with `solo` and `nobrain` at one game; the files of these arms and the silent file at level 3; the briefing as a function of the number of residents; `carried.test.ts` | `games/harbor-lights/`, `GAMES.md`, `games/index.ts` | 04, 06, 22 | 380 | kernel |
| 24 | Harbor Lights: the crew arm and the options | the crew arm with `debriefNote`, the aid, hard strikes; the remaining files and additions 9 and 10 at level 3 | `games/harbor-lights/` | 18, 23 | 300 | kernel |
| 25 | Port: `clue-grid` | carried and split; the `lock` handler | `mechanics/clue-grid/` | 00 | 350 | kernel |
| 26 | Game: Lanterns and its oracle files | four files at level 3; output cap 16000 | `games/lanterns/`, `GAMES.md`, `games/index.ts` | 04, 06, 25 | 380 | kernel |
| 27 | Port: `chess` 1 | the old `index.ts` (587 lines) carried into head, flow, texts and index; moves, the forfeit clock on the activation hooks, the views, `settleCap` and adjudication; `sample` functions that pick a legal move | `mechanics/chess/` | 16 | 380 | kernel |
| 28 | Port: `chess` 2: teams, lists, threats, the coach | `wakeTeam` and the `told` list, `NOT_CAPTAIN`, legal-move lists, `showThreats`, the coach | `mechanics/chess/` | 27 | 340 | kernel |
| 29 | Game: chess and the five files that exist | the game with the default, `fresh` and `compact`; five files at level 3; the run length; output cap 16000; `carried.test.ts` | `games/chess/`, `GAMES.md`, `games/index.ts` | 04, 06, 27 | 380 | kernel |
| 30 | Chess: the variants | lists, coach, teams, threats, no brain and the cap as params, with the grant and start-lock lists; "the coach needs the brain" as a refusal with a code; additions 1 to 7 at level 3 | `games/chess/` | 17, 28, 29 | 360 | kernel |
| 31 | Additions: Harbor Lights and Lanterns | `hint-towers.score`, `misfires`; `clue-grid.recall`, `precision`, `recallLater`; the two families. Done when each metric over an oracle replay equals the number computed by hand from the file, and the default params give the game hash of the game issue | `mechanics/{hint-towers,clue-grid}/src/metrics.ts` and the `metrics` line of each head, the two game files, tests | 23, 26 | 340 | none |
| 32 | Additions: chess | `chess.plies`, `refusedMoves`, turns without a call; the family. Done when as 31 | `mechanics/chess/src/metrics.ts` and the head's line, the game file, tests | 29 | 200 | none |
| 33 | Port: `trick-play` | carried and split; the levers; the reference player | `mechanics/trick-play/` | 21 | 360 | kernel |
| 34 | Game: Ember Tricks and its oracle files | four files (five with addition 11) at level 3 | `games/ember-tricks/`, `GAMES.md`, `games/index.ts` | 04, 06, 18, 33 | 360 | kernel |
| 35 | Port: `sealed-auction` | carried and split | `mechanics/sealed-auction/` | 00 | 300 | kernel |
| 36 | Game: Blind Bid and its oracle files | five files at level 3 | `games/blind-bid/`, `GAMES.md`, `games/index.ts` | 04, 06, 35 | 360 | kernel |
| 37 | Port: `holdem` 1 | `cards.ts` and `model.ts` carried with their tests; the head | `mechanics/holdem/` | 00 | 300 | kernel |
| 38 | Port: `holdem` 2 | the flow, the texts, the index; the aid and mixed tables | `mechanics/holdem/` | 37 | 360 | kernel |
| 39 | Game: hold'em and the five files that exist | five files at level 3; output cap 16000 | `games/holdem/`, `GAMES.md`, `games/index.ts` | 04, 06, 38 | 380 | kernel |
| 40 | Hold'em: the aid and mixed tables | the two params; addition 8 at level 3; the rest of the old test file (334 lines) | `games/holdem/` | 18, 39 | 250 | kernel |
| 41 | Port: `morris` | `rules.ts` and `search.ts` carried; the provider of `consensus-source`; the seat of the search | `mechanics/morris/` | 00 | 380 | kernel |
| 42 | Port: `morris-referee` | the Referee with its old test (66 lines); it replays the moves in its own copy | `mechanics/morris-referee/` | 41 | 200 | kernel |
| 43 | Game: nine men's morris and its oracle files | five files at level 3; output cap 16000 | `games/morris-teams/`, `GAMES.md`, `games/index.ts` | 04, 06, 42 | 380 | kernel |
| 44 | Port: `convoy` 1 | `model.ts` carried, the head, crews and votes | `mechanics/convoy/` | 00 | 340 | kernel |
| 45 | Port: `convoy` 2 | cards, the audit, accusations, the tracker, the index | `mechanics/convoy/` | 44 | 340 | kernel |
| 46 | Game: Convoy and its oracle files | four files at level 3; output cap 16000. The old test file has 314 lines: the builder counts before the first commit and splits the issue when the count is above 400 | `games/convoy/`, `GAMES.md`, `games/index.ts` | 04, 06, 45 | 380 | kernel |
| 47 | Port: `salt-market` 1 | `model.ts` carried, the head, offers and trades | `mechanics/salt-market/` | 00 | 360 | kernel |
| 48 | Port: `salt-market` 2 | promises, escrow, shipments, spoilage, the index | `mechanics/salt-market/` | 47 | 360 | kernel |
| 49 | Game: Salt Market and its oracle files | four files at level 3 | `games/salt-market/`, `GAMES.md`, `games/index.ts` | 04, 06, 48 | 360 | kernel |
| 50 | Additions: liar's dice and Blind Bid | metrics and families, as 31 | the two mechanics' `metrics.ts`, the two game files, tests | 20, 36 | 300 | none |
| 51 | Additions: Ember Tricks and hold'em | metrics and families, as 31 | the two mechanics' `metrics.ts`, the two game files, tests | 34, 40 | 340 | none |
| 52 | Additions: nine men's morris, Convoy, Salt Market | metrics and families, as 31; the Referee's metrics exist with issue 42 | the three mechanics' `metrics.ts`, the three game files, tests | 43, 46, 49 | 380 | none |
| 53 | `parallel` 1: the sample scheduler | sections 3.2 and 3.3; tests 1 to 4 of 3.7; the option `schedulers` of the testkit's `play`. Done when no file under `packages/{kernel,sdk,engine}` changed | `samples/own-scheduler/`, `packages/testkit/src/play.ts`, `packages/testkit/test/` | 00 | 380 | none |
| 54 | `parallel` 2: replay by the close line, resume, a Director | section 3.4: the close line as an input of every replay, the option `schedulers` of `replay`; tests 5 to 8 of 3.7 | `packages/testkit/src/replay.ts`, `packages/testkit/test/`, `samples/own-scheduler/test/` | 05, 06, 53 | 380 | none |
| 55 | `parallel` 3: the sample game, the tutorial | tests 9 to 11 of 3.7; `docs/tutorials/scheduler.md`, `docs/SCHEDULERS.md`, the line in `samples/README.md` | `samples/own-scheduler/`, `docs/tutorials/scheduler.md`, `docs/SCHEDULERS.md`, `samples/README.md` | 54 | 330 | none |
| 56 | Chess analysis: the vendored engine | section 2.5, last bullet; `swt analyse chess <run>`; the manifest row names the upstream commit | `third_party/garbochess/`, `third_party/manifest.json`, `packages/lab/src/chess/`, `apps/cli/src/`, tests | 29 | 300 | none |
| 57 | Viewer: ticks, overlapping activations | the word "tick" in the replay header, the sliders and the lanes; activations that overlap are shown in commit order with their `basis` (a log of test 5 as the fixture; without issue 54, the word only); a test that renders `App` | `packages/viewer-core/`, `packages/viewer-ui/` | 02; 54 for the fixture | 300 | none |
| 58 | The rerun plan of M4 and its specs | `docs/RERUN-PLAN-M4.md` with the caps of 7.1, the arms of 7.2, the thinking setting of the old chess runs, the sentence on B5; the three experiment specs; the cap line of `games/m4-ledger.jsonl`. Done when `swt experiment --plan` prints each plan and its caps | `docs/RERUN-PLAN-M4.md`, `games/{harbor-lights,lanterns,chess}/experiments/`, `games/m4-ledger.jsonl` | 08, 31, 32 | 150 | none |
| 59 | The three series of D11 | section 7.2; `docs/M4-GATE.md` with the two verdicts and the chess number; the findings block of the README and `docs/FINDINGS.md` when a sign is kept; two logs per arm read; run rows, READMEs, lessons | `docs/M4-GATE.md`, `docs/FINDINGS.md`, `README.md`, `GAMES.md`, `games/*/RUNS.md`, `games/m4-ledger.jsonl`, `docs/LESSONS-LEARNED.md`, branch `data/runs` | 05, 09, 58 | 150 | none |
| 60 | Live smokes 1 | section 7.3, part 1; run rows, READMEs, lessons | `games/*/RUNS.md`, `games/m4-ledger.jsonl`, `docs/LESSONS-LEARNED.md`, branch `data/runs` | 05, 09, 20, 34, 36 | 80 | none |
| 61 | Live smokes 2 | section 7.3, part 2 | as 60 | 39, 43, 46, 49, 60 | 60 | none |
| 62 | `GAMES.md` complete, the overview generated | the overview table is written from `games/index.ts` and the game heads (`pnpm docs:games --check` in the check); thirteen cards | `GAMES.md`, `scripts/game-docs/`, `package.json`, `games/README.md` | 24, 30, 50, 51, 52 | 250 | none |
| 63 | Gate of M4 | the nine done-whens, each with its test or its write-up; the softer check of section 9 in the record; the errata file of this specification; REWRITE row M4 ticked; the resume note | `scripts/gates/`, `docs/` | everything that is not cut | 200 | none |

64 issues; the sum of the estimates is about 19,200 hand-written lines.

### 10.1 The sentences issue 00 changes

Each is a decision of section 14 written into the paper it changes; no other sentence of these files is touched.

| File, place | Sentence today | Becomes | Decision |
|---|---|---|---|
| `REWRITE.md` 3.3, the bullet on `parallel` | "is a time-boxed spike of at most three issues plus one expert sample at M6, after the first rerun." | "is a time-boxed spike of at most three issues plus one expert sample at M4, before the interface freezes: a scheduler written outside the engine, in `samples/own-scheduler/` (A30)." | A30 |
| `REWRITE.md` 3.3, the bullet on the lane | "The tick advance in the parallel spike is the commit count, with no option and no wall clock." | "A tick of the parallel spike ends when no actor can be opened any more; an option caps the activations of an actor per tick; there is no commit count and no wall clock (A35)." | A35 |
| `REWRITE.md` 3.4, the bullet on the frame | "It is earned (D9): tic-tac-toe, quarry, econ-lab and liar's dice are ported as they are, then `match` and `Ruleset` are built on those four in at most six issues, with the mechanical ports as the oracle." and its last paragraph "If one fails, the nine games are ported as they are and the frame waits until after 1.0. `match` is not built before M4, and no game except the four is ported twice." | the first sentence stays, followed by: "The trial is not run before 1.0 (A31): all thirteen tabletop games are ported as they are, and the frame, with the three criteria below, waits until after 1.0." The last paragraph becomes: "No game is ported twice before 1.0." | A31 |
| `REWRITE.md` section 4, row M4, name and content | "Frame decision and the bulk" and "`match` and `Ruleset` on four ported games against their mechanical ports; then the remaining nine games on the winner; harbor-lights and lanterns rerun; `GAMES.md` complete for the tabletop games" | "The bulk" and "the remaining ten tabletop games ported as they are; the parallel spike of at most three issues and its sample; harbor-lights and lanterns rerun; `GAMES.md` complete for the tabletop games" | A30, A31 |
| `REWRITE.md` section 4, row M5, content | "recut of the City cluster, Whispers first; Act I and Act II at six residents; API freeze after this, not before" | "a tabletop game that M4 cut, first; recut of the City cluster, Whispers first; Act I and Act II at six residents; API freeze after this, not before (the scheduler port was tried by a second scheduler at M4)" | A30, A38 |
| `REWRITE.md` section 4, row M6, content | "samples 2 to 4, the parallel spike of at most three issues and its sample, a mechanic and a Director installed …" | "samples 2 to 4, a mechanic and a Director installed …" | A30 |
| `REWRITE.md`, the table of decisions, row D10, option (a) | "parallel as spike and sample" | "parallel as spike and sample (at M4, A30)" | A30 |
| `REWRITE.md`, the risk row "Parallel mode makes turn-designed rules exploitable" | "parallel stays a spike until a game is designed for it" | unchanged; named here because it is why no ported game is played under `parallel` | |
| `10-m3-spec-errata.md`, a new row | | "the M3 specification (1.3, 17) says 'the scheduler `match`'; the second scheduler is `parallel` (D10), built as a sample at M4" | A30 |

`DECISIONS.md` is not touched by issue 00: the coordinator adds the rows A30 to A41 (section 14), and D9 and
D10 stay as written with the addendum winning over them. `RESUME.md` is corrected by issue 12.

## 11. Waves and what runs side by side

Six builders at most. One integrator merges, in wave order. Issues 17 and 18 are work on the old platform and
run beside wave 0.

| Wave | Issues | Width | Opens when |
|---|---|---:|---|
| 0 | 00; beside it 17, 18 | 1 + 2 | now |
| 1 | 01, 04, 05, 11, 16, 21 | 6 | 00; 11 merges first |
| 2 | 02, 19, 22, 25, 27, 47 | 6 | 01 for 02; 21 for 22; 16 for 27 |
| 3 | 06, 07, 08, 37, 41, 44 | 6 | 02, 04 and 05 for 06; 05 for 07 |
| 4 | 20, 23, 26, 28, 29, 48 | 6 | 06 for the four games; 27 for 28; 47 for 48 |
| 5 | 09, 31, 32, 33, 35, 38 | 6 | 07 and 08 for 09; 23 and 26 for 31; 29 for 32; 37 for 38 |
| 6 | 34, 36, 39, 42, 45, 58 | 6 | 33 and 18 for 34; 35 for 36; 38 for 39; 41 for 42; 44 for 45; 08, 31 and 32 for 58 |
| 7 | 03, 24, 43, 46, 49, 59 | 6 | 18 and 23 for 24; 42, 45, 48 for the three games; 05, 09 and 58 for 59 |
| 8 | 13, 15, 30, 40, 53, 60 | 6 | 03 for 13; 17, 28 and 29 for 30; 18 and 39 for 40; 09, 20, 34 and 36 for 60 |
| 9 | 10, 50, 51, 52, 54, 61 | 6 | the game issues for the additions; 53 for 54; 60 and the four late games for 61 |
| 10 | 12, 14, 55, 56, 57, 62 | 6 | M2-28 and M2-29 for 12; 54 for 55 and 57; the additions, 24 and 30 for 62 |
| 11 | 63 | 1 | everything that is not cut |

**Longest chain:** 00, 01, 02, 06, 23, 31, 58, 59, 63: nine issues. The series of D11 (59) wait for the three
games they play, their additions, the plan and the two command-line issues, and for nothing else: not for a
smoke and not for another game. The base game issue of each of the ten games is merged with wave 7. What the cut
list names first (53 to 55, 57, 56, 14) sits in waves 8 to 10, so a cut at the re-plan line can still take it;
the ports of the four late games start in waves 2 and 3.

Issues that share files run in sequence:

| Files | Issues, in this order |
|---|---|
| `packages/testkit/src/replay.ts` | 05, then 54 |
| `packages/testkit/` otherwise | 06, then 53, then 54 |
| `apps/cli/src/` | 05, 07, 09, then 56 |
| `mechanics/decisions/`, the slice's timelines | 01, then 02 |
| `mechanics/strategy-brain/` | 04, then 15 |
| `packages/viewer-core/` | 02, then 57 |
| one mechanic each | 27 and 28; 37 and 38; 44 and 45; 47 and 48 |
| one game each | 23 and 24; 29, 30 and 32; 39 and 40 |
| the ledger | 59, 60, 61 |
| `draft-rounds`, `econ-games`, quarry, econ-lab | M2-28 and M2-29 against 04, 06 and 12 (section 1.4) |

Every game issue adds one line to `games/index.ts` and one card to `GAMES.md`: the integrator's single merge
lane resolves that. Issue 11 changes the generated tables of every mechanic README; it merges before any port,
and a port that merges later regenerates with the new generator.

Hidden dependencies that were checked:

| Looks independent | Is not, because | Handled by |
|---|---|---|
| 06 (standing checks) and the mechanics of M1 and M2 | a fake run needs `sample` functions that do not exist | 04 before 06 and before every game issue |
| 06 and 05 | the command-line check runs `swt replay` | 05 before 06 |
| 16 (hooks) and every oracle test | a hook point that runs for nobody must change no log | the proving test of 16 |
| 02 and the viewer | the Director row reads the firings from the reply of `take` | 02 owns the projection and the fixture |
| 15 (the brain's option) and the oracle files of ten games | `BRAIN_TOO_LONG` is in three oracle files with its old detail text | the option's default is the old text |
| 31, 32 (metrics) and the game hashes | a head is no part of the game hash (M2 10.3); the output cap is | additions after the oracle files match; the cap is set in the game issue |
| 59 (series) and the smokes | none | no edge: 59 does not wait for 60 |
| 27 (chess) and `chess.js` | the licence gate decides in 00 | 00 before 27; section 1.1 |
| 54 and the replay tests of M1 to M3 | the close line becomes an input of every replay | test 6 of 3.7 |
| 53 (`parallel`) and the hashes of the games | a second scheduler in a table could change what `resolveGame` fills in | a game without `scheduler.id` resolves to `turns` as today; test 4 of 3.7 |

## 12. Risks

| # | Risk | Sign | Answer |
|---|---|---|---|
| 1 | **The line budget of M5.** After M4 the kernel has 90 lines under its hard limit and M5's reserved list asks for 143 | the count after issue 16 is above 1410, or M5's specification books more than staged calls and `runEnded` | section 1.2: the table of what fits; the ways without kernel lines; the issue of A20 for the gate of 1420 |
| 2 | Ten games in one milestone: 31 port and game issues, each against oracle files that were recorded from live runs with a pending rule | a game issue that does not reach level 3 in its first session | the order of 2.6 puts the cheapest first; a game that sticks stops alone (section 9, rule 3); the cut list |
| 3 | The check budget of ten minutes with up to 59 more oracle files and the standing checks of fifteen games | the full check above 480 s on a quiet machine | boundaries are sampled (4.3); the oracle tests of a game run in its package; the integrator measures after waves 4 and 7 |
| 4 | A firm effect of 2026-11-11 does not keep its sign because the model moved, not the port | the bridge loses the sign too | section 7.2; the owner decides; M4's offline done-whens stand |
| 5 | A series runs under a condition the old effect was not measured in | a game file without the old entry's output cap | rule 8 of 2.2; `carried.test.ts`; the table of section 7 |
| 6 | The chess hooks cost more than 17 kernel lines | the count of issue 16 | `kit.on` first; then chess stops; no rule change |
| 7 | Replay under `parallel` rests on "the scan runs in the step of the close" | test 5 of 3.7 is flaky | the rule is in the specification of the tick (3.3, step 4); a flaky test is a fault of the scheduler, not of the test |
| 8 | The close line as an input breaks a replay test of M1 to M3 | test 6 of 3.7 | issue 54 stops; the gate stays an option of `replay` that only the sample switches on, and the softer check records it |
| 9 | A mechanic of the ten needs something the search of 2.1 did not see | a port issue stops on a missing hook | the issue names it; the game moves behind the others; the softer check records it |
| 10 | `chess.js` fails the licence gate against the registry | issue 00 | chess is cut; D11's count for chess then waits for a rules library under the allowlist |
| 11 | Live smokes of games without a result (P445, P450) are read as port faults | a smoke ends with no decision | a smoke gates nothing; the oracle files judge the port |
| 12 | M2-28 and M2-29 land in the middle of 04 or 06 | a merge conflict in a head of `draft-rounds` or `econ-games` | section 1.4 |

## 13. Decisions made in this file

| # | Decision | Reason |
|---|---|---|
| 1 | The second scheduler is called `parallel`; `match` is the word of D9 and of the games | D10, REWRITE 3.3; `match` already names four other things |
| 2 | All ten games get level 3 as their target | the three ported games reached it; a lower target would hide a wake-rule fault |
| 3 | The oracle files that exist are the proof; eleven more are recorded only for options that M4 ports and no file exercises | a port must not wait for a recording, and an option without any file is an unproven port |
| 4 | Order and cut list of 2.6: what REWRITE row M4 does not ask for is cut before any game | the cut list must be able to cut what it names |
| 5 | The chess game is ported without an engine; the analysis is a separate, cuttable issue with the engine of paper 06 | DECISIONS 5.5: the count of D11 needs no engine |
| 6 | `parallel` declares no event and draws no random number | the two activation brackets say everything; a draw would move the streams of `turns` for nothing |
| 7 | Replay takes the line of `activation_closed` as an input, for every scheduler | then the log is the whole schedule; tested on the prototype |
| 8 | A resumed `parallel` run is checked by replay, not line by line | a resumed part is a new race |
| 9 | `idle` under `parallel` is the rule of `turns` | the end tick of a run must not depend on the scheduler |
| 10 | The other cure of A27 (a marker that takes no position) is refused | it reopens M3-17 |
| 11 | Issues 01 and 02 raise the runtime revision to 4, once | the repository's rule; the played log of a game with a Director changes |
| 12 | The standing checks sample the boundaries of a long game | the check budget |
| 13 | Samples 5 and 6 are built at M4 | the README promises them; M4 writes the most mechanics |
| 14 | A prompt file with a retired word is exempted by path, not reworded | D14; level 2 of the oracle files |
| 15 | The P446 cure is an option that is off | the mechanism is cheap; switching it on is a prompt change |
| 16 | The output cap of a game is that of its old entry | P94; an effect is rerun under the condition it was measured in |
| 17 | Two confirmatory series, one count series on the arm with four old points, a smoke for the rest; no noise floor | D11 names exactly these; the floors gated nothing and the bridge needs the money |
| 18 | The mechanics ported before M4 get `sample` functions in an issue of their own | every later issue leans on them |

Decisions that reach outside M4 are rows of section 14.

## 14. The integrator's rulings, as rows for `DECISIONS.md`

The eleven open points of the first version were ruled on by the integrator after the challenge. The text below
is the final wording of each row for section 9 of `DECISIONS.md`; the coordinator adds them. Open point 10 of the
first version (M4 before M3 is closed) is moot: M3 is closed (A28).

| # | Date | Decision | Reason |
|---|---|---|---|
| A30 | 2026-11-14 | The second scheduler is built at M4, not at M6, as D10's spike of at most three issues plus one sample: `samples/own-scheduler/`, named `parallel`, written against the public contract with no line in kernel, sdk or engine. It has no flag of `swt run`, no error code, no experiment factor and no live run; `turns` stays the only scheduler of the platform and of all evidence. It is the first thing the cut list of M4 removes. This changes D10 ("at M6"), REWRITE 3.3 and the rows M4, M5 and M6 of REWRITE section 4; issue M4-00 rewrites the sentences (`11-m4-spec.md`, section 10.1) | REWRITE freezes the interface after M5, and a spike at M6 could no longer change the scheduler port. The challenger ran a prototype over the real kernel: it plays with no changed line, and 60 of 60 logs replay once the closing line of an activation is an input of replay. In the engine it would have taken 130 of the last 282 lines and left M5 unbuildable as reserved |
| A31 | 2026-11-14 | The frame trial of D9 is not run at M4. The ten remaining tabletop games are ported as they are, and the frame (`Ruleset`, one frame mechanic), with the three criteria of D9, waits until after 1.0. This changes D9 and REWRITE row M4 ("Frame decision and the bulk" becomes "The bulk"). No trial failed and no criterion is claimed to fail; thirteen copies of the game lifecycle stay until after 1.0, and the owner is told | three mechanical ports reached level 3 on 20 oracle files at two issues per game; a port on a frame cannot be carried, so its oracle check falls to level 1 while D14 still asks for byte-identical texts; the trial costs six issues and four games ported twice before the bulk starts |
| A32 | 2026-11-14 | Issue budget for M4 (A19): 64 issues planned (`11-m4-spec.md`, section 10); the cut list of its section 2.6 is applied when 90 issues are merged or open; M4 is stopped and re-planned above 128 | the first plan of 53 read the record too low: a game with its oracle files took 400 to 783 lines at M1 and M2, so seven issues were split and one was missing |
| A33 | 2026-11-14 | Live spending of M4 is approved inside the caps of `11-m4-spec.md` section 7.1: hard stop 12.00 USD, held by `games/m4-ledger.jsonl`; Haiku through Anthropic; the output cap of each game as its old entry had it (16000 for liar's dice, Lanterns, chess, hold'em, nine men's morris and Convoy, 4000 for the other four); a confirmatory series for Harbor Lights and Lanterns and a count series for chess, each once; one smoke of at most 0.40 USD for each other game; no noise floor; 2.00 USD reserved for one bridge on the old code when a series loses its sign. The parts sum to 10.80. The chess count runs on the arm `fresh` with `compact` at seeds 41, 43, 47 and 53 (old: 1.18 to 1.22 requests per half-move) and is reported beside the old range; D11 states no bound and none is set. A second bridge, a further series or any spend above the cap needs the owner's go | D11 names exactly these three; the old effects were measured under these output caps (P94); the default chess variant has one old point at runtime revision 2, the arm chosen has four; a noise floor would have gated nothing |
| A34 | 2026-11-14 | No event payload, tool reply or input line holds a log position. This replaces the reading of A23 and takes the first of the two cures A27 left open; the other (a marker that takes no position) is refused because the continuity check reads `run_resumed`. The three places of A27 carry a number of their own, counted from 1 in the owner's slice. "The resumed log equals the straight log" reads: equal after the marker line is taken out and the envelope fields `seq`, `causedBy` and `basis` behind it are moved back by one. A reader gets from `asked.firings[n]` to the trigger through the reply of the Director's `take` (tick, event type, payload). The change raises the runtime revision to 4 (issues M4-01 and M4-02, one row, tag `runtime-r4`): the played log of a game with an amended decision or a Director changes, that of a game without them does not | a moved position inside a payload is model input for a live Director, so a resumed run would not ask the same question; the list of places grew from one to three in one milestone and would grow with every mechanic |
| A35 | 2026-11-14 | Under `parallel` a tick ends when no actor can be opened any more; the option `activations` caps the activations of an actor per tick; there is no commit count and no wall clock. `idle` is reported as under `turns`. This changes the sentence of REWRITE 3.3 on the tick advance of the parallel spike and decision 7 of paper 01 | decision 7 was taken against the wall clock; a commit count would change what a deadline of two ticks means in every game that counts ticks, and the end tick of a run must not depend on the scheduler |
| A36 | 2026-11-14 | The position of a call is not put on the tool context (asked for by the review of M3) | with A34 no mechanic needs it, and a position on the context invites the fault A34 forbids |
| A37 | 2026-11-14 | A run-time check of service calls against `requires` and `uses` is not built before M6; it comes with the first mechanic installed from outside the repository | the types check every mechanic that lives in this repository; the check would cost sdk lines that M5 needs |
| A38 | 2026-11-14 | A tabletop game that the cut list of M4 removes is ported at the start of M5, before Whispers, as issues of M5 under its count. The 1.0 list does not change | REWRITE section 5 asks for every game at 1.0; a game ported after the City would be ported against a frozen interface it never tested |
| A39 | 2026-11-14 | Issues M4-17 and M4-18 may commit catalogue entries and scripted players for new oracle files on a branch `oracle/m4` cut from `legacy` (REWRITE 4.1: "a fix that an oracle needs"); the branch `legacy` itself is not moved, because it is the owner's frozen state and the tag `v0-final` is not on the remote yet. Where this paper says "a commit on `legacy`" for these two issues, read `oracle/m4`: seven files for chess (the team file is a must, with a new scripted player where the old one cannot captain; a game that ends at the ply cap, with and without `settleCap`), one for hold'em, two for Harbor Lights (hard strikes among them), one for Ember Tricks. The integrator pushes `oracle/m4` | an option that M4 ports and no file exercises is an unproven port; every game of the chess series ends at the cap, and chess is the mechanic that brings two kernel hooks back |
| A40 | 2026-11-14 | The two activation hooks that M1 reserved (`activationOpened`, `activationClosed`) are built at M4 for chess, with at most 17 kernel lines (kernel at most 1410) and 15 sdk lines. If the count grows, the way out tried first is a plugin that listens to the kernel's `activation_closed` (`kit.on`), with the moved line as a registered change. After M4 kernel + sdk + engine stand at 3860 at most; of its reserved list M5 can take staged calls and `runEnded` in the kernel (about 73 lines) and builds the rest without kernel lines or not at all | the forfeit clock of chess must land between the idle turn and the next wake decision, and no way without kernel lines keeps level 3; M5 needs the two hooks anyway, so the lines are M5's, spent one milestone early |
| A41 | 2026-11-14 | No game rule is changed in M4. Chess does not count an idle turn at `tickEnded`; the Hello Game keeps its tick limit and P445 stays open with the proposal of 20 ticks; `tooLongDetail` stays off in every game; no ported game is played under `parallel`. Each of these needs the owner's go (`11-m4-spec.md`, section 8) | D2 and D14: one variable at a time; the standing rule "brainstorm before building" covers a game's rules, also those of a new game |

## 15. What M4 leaves for M5 and M6

| Milestone | Left for it |
|---|---|
| M5 | Whispers and the City; a cut game (A38); `channels` under blocks above 1 (on the activation hooks); resume of a live run; a data game with a Director; the live proof of a Director's model port (A28); the series of hold'em and Ember Tricks if the owner wants them before 1.0 |
| M6 | a cut scheduler sample or sample 6; a run-time check of service calls; samples 2 to 4; game-specific viewer views; baselines of the games that had only a smoke; the game frame only after 1.0 |

## 16. What was checked and how

| Claim | Checked by |
|---|---|
| ten tabletop games are left, with twelve mechanics of 8334 code lines | `git ls-tree` of `legacy`; `scripts/lib/code-lines.ts` over an extract of `mechanics/*/src`; counted again by the challenger |
| every remaining game runs on `turns` with `onNews`, 3 to 8 passes | the `turns:` and `limits:` lines of the ten old game files |
| 48 oracle files exist for the ten games, with the sources of 2.4 | `oracles/README.md` (the table "Games"), the ten `oracles/<game>/README.md`, a listing of the folders |
| what each oracle folder does not cover | the "Not covered" paragraph of each README |
| `chess` is the only mechanic of the twelve with `turnOpened` and `turnEnded` | a search of the hook names in the `index.ts` files; searched again by the challenger |
| kernel 1393, sdk 2065, engine 360 code lines | `scripts/lib/budget.ts`, by the challenger on `0ecabab9` |
| a second scheduler plays on the port as it stands, with no changed line; replay needs the close line | **run** by the challenger: the prototype of section 3.1 (`match.ts`, `replay-match.ts`, `proto.test.ts`, kept outside the repository) |
| `resolveGame` takes the scheduler table from its caller; the testkit's `play` and `replay` pass `{ turns }` | `packages/sdk/src/game/resolve.ts` (`schedulerOf`), `packages/testkit/src/play.ts`, `replay.ts` |
| the engine exports `arrange` and `InputEntrySchema` | `packages/engine/src/index.ts` |
| `idle` under `turns` is "no pass started" | `packages/engine/src/turns/turns.ts` (`started === 0`) |
| a firing holds the `seq` of its trigger and no event is written when it is queued | `packages/sdk/src/director/plugin.ts`, `packages/engine/src/directors/driver.ts` |
| the old output caps | a search of `maxOutputTokens` in the ten old game files: six set 16000, four set none |
| the old chess runs at revision 2 | `stories/chess/runs/README.md` on `legacy`, the table of the r2 runs |
| the licence of `chess.js` 1.4.0 and of the vendored engine | by the challenger, in the installed package and in `third_party/garbochess/` on `legacy`; not against the registry or upstream |
| the old results and costs of section 6, the seeds of 7.2 | `stories/<game>/runs/README.md` on `legacy`; `lanterns-06a-006-more-seeds/README.md` for the eight seeds |
| the codes `SWT-T005` and `SWT-C031` are free | a search of every `SWT-` code in the sources |
| issue sizes of ports | `docs/ISSUE-RECORD.md`, rows 43, 49, 51, 68 to 75 |

**Not checked.** The author of this file ran nothing but the line counter. Each point below is settled by the
first test of the named issue, or is a stated assumption:

1. the prototype did not cover `onNews`, a failed driver, a Director kind or resume (issues 53 and 54);
2. that every replay test of M1 to M3 stays green with the close line as an input (issue 54, test 6);
3. the licence of `chess.js` 1.4.0 in the registry (issue 00), and that the LICENSE file of the vendored engine
   belongs to the engine file, which carries no header (issue 56 names the upstream commit);
4. where the events of an `activationClosed` hook land against the chess oracle (issue 16);
5. that `chessMates` can play the variants of 2.4, that the old registry can name a ply cap of 12 and hard
   strikes, and that the two named live runs replay exactly (issues 17 and 18);
6. that the build session can commit to `legacy` (A39);
7. the thinking setting of the old chess runs 048 to 051 (issue 58);
8. the expected live costs: they are the old platform's costs per run, and the M2 gate found the new platform
   within a few percent of the old for two games only;
9. the line estimates of section 10: they are read off the port rows of the record, not measured;
10. the findings B5 and B14 of the M2 review: taken from the challenger's account;
11. whether M2-28 and M2-29 are merged when issues 04 and 06 start (section 1.4).

## 17. The challenge and what it changed

The first version of this file (`ad397979`) was challenged on 2026-11-14 by a session that had not seen its
reasoning. Verdict: **build after nine changes.** The challenger ran the one claim the first version could not
test (a second scheduler on the port as it stands, replayable) and found it true. All nine changes are made:

| # | Change asked for | Where it is made |
|---|---|---|
| 1 | rebase on `develop` at `0ecabab9`; decision rows from A30; name the overlap with M2-28 and M2-29 | the header; 1.4; 4.2; 4.6; 5; 8; 14 |
| 2 | the scheduler ruling: the name `parallel`, where it lives, its budget, `idle` as under `turns` | 1.1, 1.2, section 3, A30, A35 |
| 3 | section 7: output caps per game from the old entries; the chess arm and its bound; the bridge's money | 2.2 rule 8; 7; A33 |
| 4 | a new issue "samples for the ported mechanics" before the standing checks; `swt replay` before them | 4.11; issues 04, 05, 06 |
| 5 | D9 written as a change of D9 and of REWRITE row M4, with the owner told | 2.7; 8; 10.1; A31 |
| 6 | re-cut the waves; the four late ports early; the series depend only on what they play; the cut list reordered | 2.6; 11 |
| 7 | split the oversized issues; set the count and its two lines | section 10: 01 into 01 and 02; Harbor Lights into 23 and 24; chess into 27 to 30 and 32; morris into 42 and 43; hold'em into 39 and 40; the additions into 31, 32, 50, 51, 52; A32 |
| 8 | the oracle additions: the cap game, hard strikes, the chess team file as a must, a `-threats` file | 2.4; issues 17 and 18; A39 |
| 9 | resume under the second scheduler by replay; when a waiting actor is woken; `pending` under `onNews`; strike the way out that edits `turns` | 3.3, 3.4, 3.5, 3.7; 1.2 |

Also taken from the challenge: the missing rows of chess and Harbor Lights (2.3); the generator change of the
mechanic READMEs before any port (issue 11); finding B14 of the M2 review (issue 08); the manifest row of the
vendored engine names the upstream commit (issue 56); every rule that the first version decided without the
owner is struck or moved to section 8 (A41).

**Where this file does not follow the challenge**, each by the integrator's ruling or for a stated reason:

| The challenge | This file | Why |
|---|---|---|
| the cut list starts with the viewer and the chess analysis, then the scheduler | the scheduler sample is cut 1 | the integrator's ruling: it is the first thing cut, before any game |
| Convoy's game issue "may need two" | one issue (46) with a count before the first commit | four oracle files and no variant with a file; a split, when the count asks for it, is inside the line of 90 |
| finding B5 of the M2 review: take it or refuse it in writing | refused as code, stated in the rerun plan | the meter is asked between requests; the totals hold the reserve of A17 |
| "the bound 1.30 … belongs in the committed rerun plan with a reason" | no bound; the number is reported | the integrator's ruling: D11 states none; a bound is in section 8 as a proposal |
| reserve 2.00 for a bridge "(cap 14.00, or drop the noise floors)" | the noise floors are dropped, the cap stays 12.00 | the integrator's ruling |
