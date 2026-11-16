# The challenger's review of milestone M5

The review of the result of M5 by a challenger session that saw the specification
([`refactoring-before-release/12-m5-spec.md`](refactoring-before-release/12-m5-spec.md) with its
[errata](refactoring-before-release/12-m5-spec-errata.md)), `DECISIONS.md` section 9 (A1 to A115), the gate write-ups
([`M5-GATE.md`](M5-GATE.md), "The gate of M5" in [`ISSUE-RECORD.md`](ISSUE-RECORD.md)) and the code, and not the
builders' or the integrator's reasoning (`CLAUDE.md`, "Builder plus challenger"). It stands against `rewrite/develop`
at `f2702953`, the old platform at `origin/legacy` (`a73e6a92`) and the data branch `data/runs` at `053457c5` (read
only, extracted with `git archive`). Only targeted tests were run (a machine of four cores); no live model was called.

**Result: no blocker in the code.** The ports hold where the gate says they do (section "What was attacked and
held"), and the live records match their logs. The API freeze gate has three holes, each held as a failing test
(findings 1 to 3): once the freeze is in force, a break can still pass it without the owner's go. Done-when 2 is
marked met although the specification holds a file of it to level 3 that no test compares, and that file does not
match at level 1 (finding 4, held as a failing test). The rest are notes.

## Findings

| No | Severity | Finding |
|---|---|---|
| 1 | should fix | A second freeze row without a date admits any change after the freeze |
| 2 | should fix | The gate trusts the `base` of `frozen.json`: a break passes as an addition |
| 3 | should fix | A new required field of a frozen format passes as an addition |
| 4 | owed (a decision row or a fix) | Addition 3, `cityofkeys-act1-classifier-s7.json`, is held to level 3 by 3.4 and does not match at level 1 |
| 5 | note | A lint worker that dies by a signal hangs `pnpm lint` instead of failing it |
| 6 | note | "Resumed from every boundary" samples; the long fake runs of both games are resumed from one boundary |
| 7 | note | Two code commits of the runs indexes are on no branch, and `M5-GATE.md` "Left open" is stale |
| 8 | note | The frozen set itself, and the wording "the owner's go", are not guarded |

### 1. A second freeze row without a date admits any change after the freeze (should fix)

**What is wrong.** `freezeProblem` (`scripts/api-freeze/gate.ts`) checks a freeze row only once its date cell holds a
date; a freeze row without a date admits whatever text `--write` recorded. `recordFrozen` takes the newest row that
names a path (`newestRow`), and a freeze row names every path. So after F1 is in force, adding the line
`| F2 | (later) | every file of the frozen list | freeze | A60 | ... |` to `docs/API-FREEZE.md` and running
`pnpm api:freeze --write` records any changed report under F2, and the gate passes: no kind is asked, no owner's go,
no comparison with the text at the freeze. The test "refuses a change passed off as the freeze once the freeze is in
force" covers only the reuse of F1.

**Evidence.** `scripts/gates/api-freeze-review.test.ts`, "refuses a break admitted by a new freeze row without a date
once the freeze is in force" (committed as `it.fails`): F1 in force since 2026-11-15, `export function a(): void;`
changed to `export function a(): string;` and `b` removed, F2 added without a date; `freezeProblems` returns `[]`.

**Fix.** Once a freeze row is dated, the gate refuses any other row of kind `freeze` (or any freeze row after the
first); a freeze row without a date is refused while a dated one exists. A few lines in `rowProblem`, with the test
turned into `it`.

### 2. The gate trusts the `base` of `frozen.json`: a break passes as an addition (should fix)

**What is wrong.** Section 5.2 names the reason for `base`: "A hash alone would not hold: the builder who changes a
report also writes the new hash, and the gate would compare a file with itself." The gate now compares the text with
the text at `base`, but it checks of `base` only that `HEAD` reaches it (`entryProblems`). Nothing ties `base` to the
text recorded before the change. A builder who commits the break and then writes `frozen.json` by hand with the new
hash, a row of kind `addition` and as `base` the commit of the break makes the gate compare the file with itself
again: `onlyAdds` of a text against itself is true. An `addition` row needs no owner's go.

**Evidence.** `scripts/gates/api-freeze-review.test.ts`, "refuses a break called an addition whose base is moved to
the commit of the break" (`it.fails`): `freezeProblems` returns `[]`.

**Fix.** Derive the base instead of reading it: the gate walks the history of `scripts/api-freeze/frozen.json`
(`git log -p` of the file, or `git show <commit>:frozen.json` at the parent of the commit that last changed an
entry) and takes the hash the entry had before; the base must hold that hash (`commitHolding`, which exists). Or at
least: the text at `base` must hash to the entry's hash at the previous version of the list.

### 3. A new required field of a frozen format passes as an addition (should fix)

**What is wrong.** Section 5.3 lets "a new optional field of a format" in as an addition. The gate decides by lines
only: a text that keeps every old line in order is an addition. The text forms under `scripts/api-freeze/surface/`
write each `required` array one name per line (`stable` of `surface.ts`), so a new required property placed before
the last name adds two blocks of lines and changes none: the gate calls it an addition. A required field is a break:
every manifest, snapshot file or hand file written before it no longer parses. The same holds for an API report: a
new required member of an interface that authors implement or pass (a game's or mechanic's options) adds a line.

**Evidence.** `scripts/gates/api-freeze-review.test.ts`, "refuses a new required field of a frozen format called an
addition" (`it.fails`): a property `budget` added to a manifest form with `"budget"` first in `required`, under an
`addition` row; `freezeProblems` returns `[]`. The real forms have the shape the test uses
(`scripts/api-freeze/surface/run-manifest.json`, lines 104 to 110 and 125 to 131).

**Fix.** For the JSON forms, compare parsed schemas, not lines: a name that enters a `required` list, a removed or
narrowed property, a removed enum value is a break. For the reports, a line-level rule cannot tell a required member
from an optional one; the rule of 5.2 could say that an added line inside an existing `interface` block whose member
has no `?` is a break. Either needs a decision row (the rule of 5.2 rule 4 is the specification's).

### 4. Addition 3 is held to level 3 and does not match at level 1 (owed)

**What is wrong.** Section 3.4 of the specification: "Done-when 1 and 2 hold for the additions of issue 11 too:
addition 1 and 3 at level 3". Addition 3 is `oracles/cityofkeys/cityofkeys-act1-classifier-s7.json` (the City with the
Confessor). Row 2 of "The gate of M5" marks done-when 2 "yes" and says in the same cell: "Addition 3 ... is recorded
and compared by no game test: the oracle harness does not drive the Confessor". J278 says the same for the facts
table, and J310 says cut 3 of the cut list (this file) was never applied by a decision row. So nothing released the
file from 3.4, and the claim "yes" does not hold for it.

**Evidence.** `games/city/test/classifier-oracle.test.ts` (`it.fails`), the file played as `oracle.test.ts` plays the
other Act I files (`registered`, `gameOf`, level 3). `runOracle` reports three differences: at level 1 the setup
(`mechanics` holds `interpretations`, the file does not), at level 1 the event at `timeline[117]` (the file has
`classifier.interpretation` of `overseer:classifier`, `labels: ["helpRequest"]`; the run writes `names.name_chosen`),
and at level 3 the turn at `timeline[77]` (the run has `core.overseer_answered` of `confessor` there).

**Fix.** Either a decision row that applies cut 3 (the file is recorded and proven by the Confessor's carried tests
in `mechanics/city-directors`, the way out of 3.4), with the gate row corrected; or drive the Confessor in the oracle
harness (a scripted answerer of the `interpret` role from the file's `interpretation` events) and register the
plugin name and the actor mapping in `oracles/cityofkeys/README.md`. Then the test turns into `it`.

### 5. A lint worker that dies by a signal hangs `pnpm lint` (note)

**What is wrong.** `scripts/lint.ts` (M5-100), `startWorker`: `child.on("exit", (code) => { if (code === 0 || code ===
null) return; ... })`. A worker that dies by a signal exits with code `null`, which is ignored like the deliberate
`kill()` at the end. Its `busy` count never falls, `dispatch` never reports the end, and the idle workers keep the
process alive: `pnpm lint` waits forever, and inside `pnpm check` until the time budget stops it (it then fails as
"stopped", so the check does not pass on nothing). A worker that runs out of its 4 GB heap is such a worker: V8
aborts.

**Evidence.** A child forked with `--max-old-space-size=32` that fills its heap ends with `exit null SIGABRT`; one
killed by the OOM killer ends with `null SIGKILL` (tried in the scratchpad). The lint lane is the one that holds 4.4
GB of the 6 GB (M5-103's comment in `vitest.config.ts`).

**Fix.** Count a `null` exit with a signal as a crash unless the pool killed that child itself (a set of the children
it killed); then it fails at once with "1 worker(s) ended early".

### 6. "Resumed from every boundary" samples (note)

**What is wrong.** `checkResumeEveryBoundary` of `@swarmtales/testkit` (frozen since F1) takes `sampleBoundaries` by
default, and M5-92 lowered its threshold from 30 to 12 ticks (J289): a run of 13 ticks or more is resumed from at most
eight boundaries. The City's "fake Act I" run of 28 ticks is sampled, though A102 named only runs "longer than 30
ticks"; J289 names the cut with its measurement, as A102 asked, so it is decided. Still, the tests are named
"resumed from every boundary" (`games/city/test/standing.test.ts`, `games/whispers/test/standing.test.ts`), the frozen
name says "every", and the long fake runs the command line plays (Whispers 45 ticks, the City 80) are resumed from one
boundary each (the middle, A102): the premise of A97, "every boundary of such a game is already the job of its
in-process check", does not hold (J256 says so). Done-when 3 is "yes, with the boundaries of A97, A102, A107 and
A108", which is accurate; the names are not.

**Fix.** Rename the test titles ("resumed from its boundaries (every one up to 12 ticks, eight beyond)"); the export
keeps its frozen name, and its TSDoc says that it samples (an "addition: docs only" row).

### 7. Two code commits are on no branch; "Left open" is stale (note)

**What is wrong.** `games/city/RUNS.md` names `8e11ab1e` as the code of run 5a and `0d119aa9` as that of 5c, and the
manifests of both folders carry them as `kernel.commit`. Neither commit is on any branch of this clone or of
`origin` (`git branch -a --contains` lists none): they are the builder's unsquashed commits, which a fetch cannot get
and a `git gc` removes. Their trees differ from the parents the rows name only in docs and the ledger (`git diff
--stat 04891abb 8e11ab1e`: `docs/RERUN-PLAN-M5.md`, `games/city/RUNS.md`, `games/m5-ledger.jsonl`; `a39b6b34
0d119aa9`: the ledger only), so the code of the runs is known; but the manifest of a run names a commit nobody can
check out. Separately, `M5-GATE.md` "Left open" says the data commits of the eight rows "say 'pending (the
integrator's push)'": every row now names its data commit.

**Fix.** Push the two commits under a tag (`runs/m5-5a`, `runs/m5-5c`) or write in each row that the manifest's
commit is unreachable and the reachable equal tree is the parent named; strike the stale item of "Left open".

### 8. The frozen set, and the owner's go, are not guarded (note)

`frozenPaths()` is code (`scripts/api-freeze/surface.ts`, the lists `PACKAGES`, `MECHANICS`, `FORMS`), and the test
"holds every frozen file as recorded" compares `frozen.json` with that list. Taking a package out of `PACKAGES` and its
entry out of `frozen.json` unfreezes it without a row of `docs/API-FREEZE.md` or a failing gate. And rule 5 tests the
decision row by the substring "the owner's go" (`rowProblem`): a row that says "without the owner's go" passes.
**Fix:** pin the frozen paths in the gate test as a literal list (a removal is then a visible test change that needs
a break row), and match the owner's go as a field of the decision row, not a substring.

## What was attacked and held

**Port parity** (priority 1), against `origin/legacy`:

- the oracle files the gate compares are byte-equal to `legacy` (`whispers-s7`, `-s11`, `-rumours-s7`, the City's
  `act1-s7`, `act1-s11`, `act1-s7-resumed`, `act2-s7`, `burn-s7` and the four setup files); the three additions are
  new, as issue 11 says;
- `runOracle` at level 3 passes for the six files the gate names (`games/{whispers,city}/test/oracle.test.ts`), and
  the comparison is not vacuous: without the registered changes `whispers-s7.json` differs at levels 1 and 2, and one
  changed `sendDM` reply in the file is found at level 2 (scratch tests, removed);
- every transformation of `games/{whispers,city}/test/support.ts` (the moves within a burst, the receipt counts of
  the status line, the source names of the task lines, the dropped start locks, the renumbered posts of a moved look,
  the look after the end of the burn file) has its row in the registered changes of `oracles/{whispers,cityofkeys}/README.md`;
- the prompt pins: all 308 pins of Whispers and 297 of the City hash to the body of their old file on `legacy`, read
  independently from an extract of `origin/legacy`; 4 and 3 of them carry an `undo` with its erratum (J35, J68), the
  only changed prompt words.

**The API freeze** (priority 2): besides findings 1 to 3 and 8, the five failing fixtures of the gate fail as
claimed, the text forms are what the code writes, a base that `HEAD` does not reach (a shallow clone) is a problem, not a
pass (read in `entryProblems`, not tried), and F1 is dated 2026-11-16 on a base of the same day.

**The check-time changes** (priority 3): the include glob of `vitest.config.ts` is the one of M4; no test file stubs
a global, the environment or the timers without restoring them, and the one `vi.mock` is the file the comment names,
so `isolate: false` drops no check found here (B3 stays as recorded). `scripts/lint.ts` types every project of the
root `tsconfig.json` as `tsc -b` does, lints every listed file once and the rest with the project service, and fails
on a type error, a skipped dependent, an ESLint error and "no project or no file"; the old `typecheck` gate is
replaced, not dropped. The command-line standing parts fail on a run without an accepted call, a warning, an `error`
end and a missing snapshot. Finding 5 and 6 are the faults found.

**The live records** (priority 4), from the eight folders on `data/runs` at `053457c5`: the costs of the response
records (of the resumed runs, after `run_resumed`) are 0.9517, 0.2145, 0.0686, 0.0000, 0.0741, 0.3724, 0.3261 and
0.2907 USD, as in the runs indexes, the ledger (17 lines, sum 2.2980) and `M5-GATE.md`; no `cost_unknown`; no answer
above the second price tier in the City (63 in Whispers run 1, P479); the ends, tick ranges, the three exiles and 17
tribunal votes of each Act II run, the 16 gamemaker notes of the base, the 47 guard reviews of Whispers run 1 and the
upheld blame #2159 of the check resume are in the logs; every resumed run carries the base's snapshot hash and the
game hash `9418a743...` of the base. `swt replay` of this commit is equal for `whispers/smoke/whispers-001` (the dirty
run, revision 6) and for `city/act2/5c` with `--previous`, whose `swt log verify --previous` holds. The prices are
those of `pi-ai@1.4.0` for `claude-haiku-5-5` (0.10 and 0.50 USD per million tokens); as the gate says, they were not
compared with a bill.

**Budgets and limits** (priority 5): `codeLinesOf` on `f2702953`: kernel 1473 (gate 1473, limit 1500), sdk 2198,
engine 384, total 4055 of 4100, as recorded. No `any`, no assertion besides `as const`, no new `@ts-ignore`; the one
new `@ts-expect-error` is in a test (`packages/contracts/test/kernel-types.test.ts`).

## The failing tests

| Test | Finding | Turns into `it` when |
|---|---|---|
| `scripts/gates/api-freeze-review.test.ts`, "refuses a break admitted by a new freeze row without a date once the freeze is in force" | 1 | the gate refuses a second freeze row |
| the same file, "refuses a break called an addition whose base is moved to the commit of the break" | 2 | the gate derives or checks the base |
| the same file, "refuses a new required field of a frozen format called an addition" | 3 | the forms are compared as schemas |
| `games/city/test/classifier-oracle.test.ts`, "cityofkeys-act1-classifier-s7.json: runOracle finds no mismatch at level 3" | 4 | the file matches, or a decision row applies cut 3 (then the test goes) |

**Status after A116** (added by the integrator): the four tests are plain `it` and pass. Findings 1, 2, 3 and 8
are fixed by M5-104, finding 4 by M5-105 (addition 3 at level 3, no cut), findings 5 to 7 by M5-106 (the
TSDoc of the frozen `checkResumeEveryBoundary` still says "every"; a docs-only addition row is owed, J319).
