# The challenger's review of milestone M4

The review of the result of M4 by a challenger session that saw the specification
([`refactoring-before-release/11-m4-spec.md`](refactoring-before-release/11-m4-spec.md) with its
[errata](refactoring-before-release/11-m4-spec-errata.md)), `DECISIONS.md` section 9 (A1 to A46) and the code, and
not the builders' reasoning (`CLAUDE.md`, "Builder plus challenger"). It stands against `rewrite/develop` at
`cfa3676d` and the old platform at `origin/legacy`. The repository has no `docs/reviews/` folder; the findings of the
M2 review went into the gate write-up beside this file ([`M2-GATE.md`](M2-GATE.md)), so this file sits beside
[`M4-GATE.md`](M4-GATE.md), which issue M4-63 still writes. Only targeted tests were run (a machine of four cores);
no live model was called.

**Result: no blocker in the code.** No port difference from `legacy` was found in the four areas attacked (section
"What was attacked and held"). One fault is held as a failing test (finding 1): a run whose cost meter fails closed
does not replay. The written answer of section 9 of the specification (the softer check) is still owed by M4-63 and
is the one item that stands between this review and closing M4 (finding 6).

## Findings

| No | Severity | Finding |
|---|---|---|
| 1 | should fix | A live run whose cost meter closed does not replay equal |
| 2 | should fix | The cost cap can still be passed, and the command line reference does not say by how much |
| 3 | note | The plain-mechanic gate can be fooled by a change through a nested field or an alias |
| 4 | note | The viewer's `Activation.overlaps` is documented as empty under `turns`; it is not with blocks |
| 5 | note | `SWT-E008` is raised by the command line, while the lab's catalogue says the code is unused |
| 6 | owed, blocks the close | The softer check of section 9 is not written; the measured numbers it must hold |
| 7 | note | The vendored chess engine was not checked against its upstream copy again |

### 1. A live run whose cost meter closed does not replay equal (should fix)

**What is wrong.** M4-68 made `swt replay` repeat the cost cap: it builds a meter from `limits.budgetUsd` and feeds it
the replayed `response` records (`apps/cli/src/replay.ts`, `capOf`). A meter that fails closed writes nothing: when
an answer of a model with a price comes without a cost, the resident session calls `meter.close(...)` and returns
before it records `response` (`packages/models/src/driver/session.ts`, `recordAnswer`, the branch `zero ===
"missing"`); the Director's `counted` (`packages/models/src/director.ts`) does the same, and so does `add` for a cost
that is no amount (it closes and throws). The live run then ends at `models.budget` with the reason "the cost of
the run is not known: ...". The replay has no line to close its meter at, so it plays on and writes no
`limit_reached` where the log has one. The standing check "every run folder replays equal" (done-when 7, P471) does
not hold for such a run.

**Evidence.** `apps/cli/test/cap-closed-replay.test.ts` (committed as `it.fails`): the scripted source of
`live.test.ts` with a price on the model, the third answer without a cost. The live run ends at `models.budget`
(#24); `swt replay` exits 1 with `SWT-C031`: "the replayed log differs at line 24: the log has kernel limit_reached of
kernel, the replay wrote nothing".

**Fix.** Write the closing on the log: the session and the Director record `response` with the usage they had and a
field that says the cost is unknown (or a record `cost_unknown { reason }` of the same record source), and `capOf`
closes the replay meter on it. That changes the log of a live run, so it raises the runtime revision (6) with its
row; older runs keep their rule as M4-68 did for revision 4. Then turn the test into `it`.

### 2. The cost cap can still be passed, and the reference does not say by how much (should fix)

**What is wrong.** Revision 5 reserves the dearest answer so far (`packages/models/src/meter.ts`, `breach`). Before
the first answer the reservation is 0, so the first request of a run is always sent and its answer can pass the cap
by any amount; requests that are in flight at the same time (members of one block of `turns` with `blockSize` above
1, the activations of `parallel`) are each checked against the same total and can pass it together. Row r5 of
`docs/RUNTIME-REVISIONS.md` says so, but A46 states "the cap is not passed by the requests of the tick that reaches
it", P472 is marked "fixed", and its own proposal "say in the CLI reference how far a cap can be passed" is not done:
`docs/reference/cli.md` line 30 says only "the cost cap of a live run in US dollars".

**Evidence.** `meter.ts`: `dearestUsd` starts at 0 and `breach` reads only the counted total;
`packages/models/src/driver/session.ts` line 243 checks the limit once before each request, with no reservation for
the requests already sent. `packages/engine/src/turns/turns.ts` lines 112 to 120 start every member of a block before
any closes.

**Fix.** Two parts. (a) The text: one sentence under `--budget` in `docs/reference/cli.md` (passed by at most the
first answer, and by the answers of requests in flight together), P472 back to "open" for that part, A46's wording
corrected in the errata. (b) If the cap must be a ceiling, reserve before the first answer too: the dearest possible
answer is known from the output cap (`maxOutputTokens` times the output price) plus the input of the prompt, and the
meter can count a request as reserved from the moment it is sent until its answer is counted. Both are revision 6
material and need a decision row; (a) alone is a docs chore.

### 3. The plain-mechanic gate can be fooled (note)

**What is wrong.** `scripts/gates/plain-mechanic.test.ts` finds a change of a declared mechanic only when the changed
expression starts at the mechanic's own identifier (`fieldOf`, `reflected`), and its loaded check compares only the
top-level field names and the source of `resolve` (`shapeOf`). A change through a nested field
(`Object.defineProperty(exile.head, "summary", ...)`, `exile.head.options = ...`) or through an alias
(`const alias = exile; Reflect.set(alias, ...)`) passes both. The definition `defineMechanic` returns is not frozen,
so the change also takes effect.

**Evidence.** Appending these four lines to `mechanics/exile/src/index.ts` leaves the gate green (5 of 5 passed; the
file was restored after the run):

```ts
const alias = exile;
Reflect.set(alias, "resolve", exile.resolve);
exile.head.summary.toString();
Object.defineProperty(exile.head, "summary", { value: "changed" });
```

**Fix.** Freeze the value in `defineMechanic` (the definition and its head, deeply; a few sdk lines), so a change
throws when the module loads and the gate's loaded check fails on it; or walk a property chain to its root
identifier and follow `const` aliases in `changes`. The gate is a guard against drift, not against intent, so this is
a note.

### 4. `Activation.overlaps` is documented as empty under `turns` (note)

**What is wrong.** `packages/viewer-core/src/projection-model.ts` says of `overlaps`: "empty under `turns`". Under
`turns` with `blockSize` above 1 all members of a block are opened before the first closes
(`packages/engine/src/turns/turns.ts`, `playBlock`, "No await in this loop"), so the projection
(`packages/viewer-core/src/projection.ts`, `opened`) lists them as overlapping, and the card shows "Open beside it".
That is right as a picture; the sentence is wrong.

**Fix.** "empty under `turns` with blocks of one actor"; a test of the projection on a `turns` log with
`blockSize: 2` would pin it.

### 5. `SWT-E008` has two owners (note)

**What is wrong.** The lab's catalogue says "`SWT-E008` and `SWT-E009` are not used" (`packages/lab/src/errors.ts`,
line 16), while `apps/cli/src/chess-engine.ts` line 93 raises `SWT-E008` for the chess analysis (M4-56, errata H43).
The code range E is the lab's; a later lab code E008 would collide.

**Fix.** Either the lab's remark names E008 as the command line's code of the chess analysis, or the code moves to
the lab's catalogue as a function the command line calls (the lab takes the engine as a parameter already). The
generated `docs/reference/errors.md` is not affected.

### 6. The softer check is owed (blocks the close of M4)

**What is wrong.** Done-when 9 asks for the written answer of section 9 in `docs/ISSUE-RECORD.md`. The record has
the section "The softer check of M3" and none for M4; M4-63 landed as "part 1". The measured numbers, for that
answer (`codeLinesOf` of `scripts/lib/budget.ts` on `cfa3676d`):

| | Planned after M4 (1.2) | Measured | Note |
|---|---:|---:|---|
| kernel | at most 1410 | 1402 | +9: the activation hooks (M4-16) and the constant of the revision |
| sdk | 2090 | 2099 | +34: hooks, firing numbers, the bare-name lock of M4-64, `inSchemaOrder` of M4-65 (A42, A43 booked beside the table) |
| engine | 360 | 360 | the description of `asked` only |
| kernel + sdk + engine | at most 3860 | 3861 | one line above the column of 1.2, 239 under 4100; the rule of 1.2 asks that a line beyond the table is written into the record, and the rows of M4-64 and M4-65 do not name their sdk lines |
| `samples/own-scheduler/src/parallel.ts` | at most 150 | 150 | exactly at the size of 3.2 |

`parallel` needed no line in kernel, sdk or engine (the one change of `packages/sdk/src/game/resolve.ts` in M4 is
M4-64's), and no change of `SchedulerPort`.

**Fix.** M4-63 part 2 writes the section with these numbers and the line each issue took.

### 7. The vendored chess engine was not checked upstream again (note)

`third_party/garbochess/README.md` says itself that the coverage of `garbochess.js` by the upstream `LICENSE` "was not
verified upstream again when the file was carried". This session could not reach the upstream host either. The
manifest row, the licence text (BSD-3-Clause, three clauses) and the hash test are in place. **Fix:** the owner or a
session with network access compares the SHA-256 of the README with the upstream file at the named commit once.

## What was attacked and held

**Port fidelity** (priority 1), all twelve mechanics against `origin/legacy`, mechanically:

- every string literal and template part of the old `src/` is in the new `src/`, except the tool names and the limit
  id `match`, which are object keys now;
- every comparison and arithmetic expression with a number or an order operator is in the new code, except renames
  (`ctx.minute` to `ctx.tick`, a resident passed as a parameter) and three rewrites checked by hand as equal (the
  shipment refusal of `salt-market`, `offers.ts` line 109, is the old condition negated by De Morgan; the second-price
  reference of `sealed-auction`; the ply cap of `chess`);
- every schema constraint (`minimum`, `maxLength`, `minItems`, `default`, ...) with its description is in the new
  heads; the two differences are shared constants (`Seat` of `convoy`, `Slot` of `hint-towers`);
- the prompt folders of fourteen mechanics are byte-identical to `legacy`;
- the `inputs` order of all thirteen games follows the old `HOOK_ORDER.turnInputs` numbers, and the tick hooks of
  `trick-play`, `hint-towers` and `consensus` run before the brain's as the old `minuteStarted` and `minuteEnded`
  numbers did (the brain is used, not required, so it loads after them);
- `endsTurn` is set where the old code set it (chess, hold'em, liar's dice) and nowhere else except under the new
  option `quietEnds`; the Harbor Lights game file passes the old options to its four mechanics, in the old order.

**Standing checks on other inputs** (priority 2): `checkReplay` and `checkResumeEveryBoundary` with the fake driver,
seeds 3 and 19, on 26 variants the standing tests do not play: `quietEnds` on liar's dice, Blind Bid, Convoy and
Ember Tricks; `markOwnOffers` and three games of five rounds in Salt Market; heads-up and five-seat liar's dice;
Convoy with cooldown 1 and 5 and two damaged stages; the Harbor Lights crew arm over two games and hard strikes with
the aid; Lanterns without a brain and with three clues; chess with teams, with the coach, lists and threats, and
fresh-compact over two games; hold'em heads-up, mixed tables and without duplicate deals; morris against the search
at depth 2 and with a fixed captain. 108 of 108 passed (the scratch files were removed; they add about two minutes).

**`parallel` and the testkit replay** (priority 3): with the close-line gate of `packages/testkit/src/replay.ts`
taken out, 8 of the 22 tests of `samples/own-scheduler/test/` fail (the sixty races, resume by replay, the Director,
the pause, the sample game's race, the viewer fixture), so the gate is proven necessary by the tests, as section 3.4
says.

**Revisions** (priority 4): all 153 run folders of `origin/data/runs` at `570801db` outside `legacy/` were replayed
with `swt replay` of this commit (revision 5), each with its game file. 62 of the 63 revision-4 folders (the smokes,
the 52 runs of the three series, the check of M4-70, the cap run `hello-game-002`) and 88 of the 90 revision-3
folders replay equal. The three that do not are refused as designed with `SWT-T005`: `liars-dice-001`, the smoke
stopped from outside at tick 17 (its README records it), and the two crashed quarry runs of M2. So the meter of
revision 5 left the older runs replayable, and finding 1 is the one way found for a capped run not to replay.

**Gates** (priority 5): the base-alone and unused-dependency gates read every package and fail on their fixtures; a
mechanic package without `swarmtales.class` is refused by the layer check (`scripts/layers/rules.ts`), so it cannot
slip past both lists. `GAMES.md` is gated by `scripts/game-docs/game-docs.test.ts`. In the check lanes
(`scripts/check.ts`, `scripts/lib/check-run.ts`) a gate that another stopped counts as "did not run" and fails the
check, and a machine without `ps` runs no lane and fails; lint resolves the workspace through the `development`
condition, so it does not wait for the typecheck's declarations.

**Limits, licence, strict TypeScript** (priority 6): the kernel word list, the budgets, the exception format, the
workspace shape and the layer check (60 packages) pass; no `any`, assertion or double cast in the 475 TypeScript files
M4 changed; `chess.js` is BSD-2-Clause and on the allowlist; `third_party/manifest.json` has its row.

## Closed

Issue M4-72 (decision A47) closed findings 1 to 5 and 7; finding 6 was written by M4-63 the same hour ("The softer
check of M4" in [`ISSUE-RECORD.md`](ISSUE-RECORD.md)). Only targeted tests were run; no live model was called.

| No | What was done |
|---|---|
| 1 | Runtime revision 6 (row r6 of [`RUNTIME-REVISIONS.md`](RUNTIME-REVISIONS.md)). Where a model driver closes the cost meter, it writes the record `cost_unknown { reason }` of its source (`packages/models/src/records.ts`): the resident session for an answer of a priced model without a cost and for a cost that is no amount (`recordAnswer`, `closeOnLog` in `packages/models/src/driver/session.ts`), the Director's asker for the same two and for a request that ended without an answer (`packages/models/src/director.ts`). `capOf` of `apps/cli/src/replay.ts` closes the replay meter on that record. `apps/cli/test/cap-closed-replay.test.ts` is a passing `it` now; the r4 cap run of M4-68 (`apps/cli/test/cap-replay.test.ts`) still replays equal, because an older log has no such line. P471 names the fix |
| 2 | (a) `docs/reference/cli.md`, `--budget`: the cap stops new requests and is not a ceiling; it can be passed by the first answer, by the answers of requests in flight together (a block of `turns` with `blockSize` above 1, `parallel`) and by an answer dearer than every one before. P472 is "partly fixed", and erratum H48 corrects the wording of A46. (b) A reservation before the first answer and for requests in flight is not built: it needs a decision row (open) |
| 3 | `defineMechanic` returns a frozen definition with a frozen head: the head, its lists and their entries, and its records (the schemas stay as given). A write after the definition throws in strict code (`Object.defineProperty`, an assignment) or is refused (`Reflect.set` answers false), so the four lines of the evidence make `exile` fail to load and the plain-mechanic gate fails on them (tried, then restored). Test: "the value defineMechanic returns (M4-72)" in `packages/sdk/test/define-mechanic.test.ts`. The sdk grows by 8 code lines, 2099 to 2107 (kernel + sdk + engine 3869, 231 under 4100) |
| 4 | The TSDoc of `Activation.overlaps` (`packages/viewer-core/src/projection-model.ts`) says: empty under `turns` with blocks of one actor; with a `blockSize` above 1 the members of a block overlap. No projection test of a `turns` log with blocks was added |
| 5 | One owner: the command line (`apps/cli/src/chess-engine.ts`). The lab's catalogue (`packages/lab/src/errors.ts`) now says `SWT-E008` is reserved in its range for the chess reference engine of the command line; `SWT-E009` stays unused. `pnpm docs:errors` is current (94 codes, no change) |
| 7 | Checked through the proxy on 2026-11-15: `js/garbochess.js` at commit `4ff0f9e49a0041545b645e25d3d2da7af3b36a90` of `glinscott/Garbochess-JS` has the SHA-256 `b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c`, equal to the vendored file and its README; the `LICENSE` at the root of the same commit is byte-equal to `third_party/garbochess/LICENSE`. That the commit is the last of the repository was not checked (the GitHub API is not open to this session). The sentence of `third_party/garbochess/README.md` that the coverage "was not verified upstream again" is outside the paths of M4-72 and is left for the integrator |
