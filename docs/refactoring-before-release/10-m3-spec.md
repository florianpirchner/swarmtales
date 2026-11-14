# 10 M3 specification: the City slice

Status: **specification for milestone M3 ("City slice")**, written 2026-11-14 and challenged the same day against
the old code and the new platform as built (M1 complete, M2 through M2-20); the challenge log is section 19.
Builders code against this file. Precedence: [`BRIEF.md`](BRIEF.md), then [`DECISIONS.md`](DECISIONS.md) (with its
addendum A1 to A18), then [`REWRITE.md`](REWRITE.md), then [`08-m1-spec.md`](08-m1-spec.md) with
[`08-m1-spec-errata.md`](08-m1-spec-errata.md), then [`09-m2-spec.md`](09-m2-spec.md) with
[`09-m2-spec-errata.md`](09-m2-spec-errata.md), then this file, then papers 01 to 07. Where this file decides
something the papers left open, section 15 lists it with its reason; section 16 lists what only the owner can
decide. A change of an interface of sections 3 to 8 after its issue is merged needs an issue with the label
`interface-change`.

Words as in the M1 and M2 specifications: an "old" path is a path at the tag `v0-final` (read at
`/home/user/swarmtales`, commit `87844a7`). "Carried" means copied with at most import changes and the renames of
M1 section 8.1; carried lines do not count against the 400-line rule. "Ported" means the same design rewritten
against the new contracts. A "code line" is a non-blank, non-comment line of a `.ts` file (D13); every count of
old and new code in this file was measured with `scripts/lib/code-lines.ts` of this branch, test files left out.
Old names that the name lint retires appear only in backticks, as quotations of old code.

**M3 is done when** (REWRITE section 4, row M3, made testable):

1. the game `city-slice` plays with six scripted residents, talk, the ledger, an exile that knows nothing about
   pieces, one piece-owning mechanic that listens to the exile event, one decision with a window, one Director,
   and one pause by the human (section 2), and its end-to-end test compares the whole run with a committed
   timeline (issue 23);
2. **replay:** the testkit function `replay` (section 7.4) plays the slice again from nothing but its manifest,
   its game and its `events.jsonl`, and the event log it produces is equal line by line (stamps left out);
3. **resume:** a run of the slice stopped at a snapshot and continued with `swt resume` gives, after the marker
   line is taken out, the same event log as the straight run, and `swt log verify` proves the continuity of the
   two run folders (section 7);
4. **`exile` names no other game mechanic:** the test of issue 31 reads `mechanics/exile/package.json` and every
   import of `mechanics/exile/src/`, and finds no mechanic package and no service, event or tool id of another
   mechanic; the head of `exile` has an empty `requires` and an empty `uses`;
5. **no service cycle:** `resolveGame` of the slice gives no `SWT-G032`, and the load order holds back no entry
   for a cycle of optional uses (`packages/sdk/src/game/load-order.ts`, `place`);
6. the **softer check** of REWRITE section 4 is answered in writing (section 10): which kernel lines M3 added and
   whether the tabletop games would have needed them. This file plans the answer "none; the kernel interface
   stands".

What M3 is **not**: it is not the City of Keys. No City oracle file is replayed whole at M3 (they need 15 to 17
mechanics, about 10,000 old code lines; section 2.5); the full recut is M5.

## 1. Scope, packages, budgets

### 1.1 Packages of M3

| Package | Path | Class | New at M3 | What |
|---|---|---|---|---|
| `@swarmtales/mechanic-ledger` | `mechanics/ledger` | base | yes | points, transfers, mint and burn (ported whole) |
| `@swarmtales/mechanic-channels` | `mechanics/channels` | base | yes | talk: the board, direct messages, notices (a cut) |
| `@swarmtales/mechanic-exile` | `mechanics/exile` | base | yes | banishing a resident; one event, one suspension (a recut) |
| `@swarmtales/mechanic-decisions` | `mechanics/decisions` | base | yes | the decision window (the old gate as a mechanic) |
| `@swarmtales/mechanic-human-hand` | `mechanics/human-hand` | base | yes | the tools of the Human Hand: pause and resume |
| `@swarmtales/mechanic-puzzles` | `mechanics/puzzles` | game | yes | the pieces: fragment levels (a cut); listens to the exile event |
| `@swarmtales/mechanic-court` | `mechanics/court` | game | yes | slice only: a vote that ends in a verdict; replaced by the tribunal at M5 |
| `@swarmtales/game-city-slice` | `games/city-slice` | game package | yes | the game, the six scripts, the Director, the timeline |
| `sdk`, `engine`, `contracts`, `models`, `runlog`, `testkit`, `viewer-core`, `viewer-ui`, `apps/cli` | | | changed | sections 3 to 9 |

No package is added under `packages/`: the workspace holds 12 library packages, which is `MAX_LIBRARY_PACKAGES`
(`scripts/layers/table.ts`). The Director lives in `sdk` (definition, plugin) and `engine` (driver); snapshot
files live in `runlog`; replay lives in `testkit`.

Layer rules do not change. `mechanics/*` may import `contracts`, `sdk` and `mechanics/contracts`; a mechanic
imports another mechanic only through its `/contract` and `/rules` entry; a base mechanic never imports a game
mechanic. The imports M3 creates:

| Mechanic | Imports the contract of | Why |
|---|---|---|
| `ledger` | `exile` | listens to `exile.exiled` and burns the balance |
| `channels` | none | |
| `exile` | none | done-when 4 |
| `decisions` | none | |
| `human-hand` | none | |
| `puzzles` | `exile`, `channels` | listens to `exile.exiled`; reads `ChannelsService.dmRecords` (optional use) |
| `court` | `decisions`, `exile`, `channels` | proposes a decision, banishes, posts the city's line |

### 1.2 Code-line budgets

Measured today on this branch (code lines):

| Package | Today | Planned M3 | After M3 | Limit |
|---|---|---|---|---|
| `kernel` | 1381 | at most +15 (section 10) | at most 1396 | gate 1420 (`packages/kernel/test/budget.test.ts`), hard 1500 |
| `sdk` | 1705 | about +330 | about 2035 | |
| `engine` | 293 | about +230 | about 523 | |
| **kernel + sdk + engine** | **3379** | about +575 | **about 3954** | **4100** |
| `contracts` | 933 | about +120 | about 1053 | none |
| `models` | 793 | about +110 | | none |
| `runlog` | 310 | about +120 | | none |
| `testkit` | 588 | about +200 | | none |
| `apps/cli` | 624 | about +330 | | none |
| `viewer-core` / `viewer-ui` | 1034 / 1717 | about +200 / +220 | | none |

After M3 about 146 lines are left under the limit of 4100. Risk 3 of section 14 and open point 2 are about this.
The gate of the kernel stays at 1420; issue 02 does not raise it.

### 1.3 What stays reserved and must not be built at M3

A builder who needs one of these stops and writes it into the issue; it is then a finding for the softer check.

| Reserved | Where it was reserved | Stays for |
|---|---|---|
| staged calls, stage handlers `afford` / `settle`, `guard` / `consult` (an awaited stage) | M1 1.4 | M5 (the judge) |
| per-plugin actor attributes | M1 1.4 | M5 |
| hooks `activationOpened`, `activationClosed`, `runEnded` | M1 1.4 | M5 |
| `schedule.every` | M1 1.4 | M5 |
| `Kernel.stop`, `SchedulerPort.safePoint`, external input inside a tick | M1 1.4, paper 01 section 2.3 | M5 |
| `ctx.log`, `kit.on`, `kit.kernel` | M1 1.4 | first user |
| tool limits, `$param`, game `texts` overrides | M1, M2 open point 13 | M5 |
| Director triggers other than an event (`every`, a hook, a fact, a consult) | paper 04 section 2.3 | M5 |
| Human Hand tools `instruct`, `step`, standing orders; an intervention inside a tick | old `packages/kernel/src/host/human.ts` | M5 |
| resume of a live run (model contexts in the snapshot) | | M5 |
| channels: groups, treasury, `defy`, marks, receipts, cast, privacy, secret guard, the Director's note | old `mechanics/channels` | M5 |
| exile: the gate, ransom, last will | old `mechanics/exile` | M5 |
| puzzles: additive levels, the hand-over guard, the report | old `mechanics/puzzles` | M5 |
| tribunal, progression, standoff, seal, goals, script, arena, names, motives, petitions | old mechanics | M5 |
| the scheduler `match` | REWRITE | M4 |

## 2. The slice

### 2.1 The game

`games/city-slice/game.ts`, written with the builder. It is the smallest part of the City of Keys that needs
every item of the M3 row.

| Part | Value |
|---|---|
| Residents | six, ids `A01` to `A06` (the ids of the oracle files), each driven by a script (`games/city-slice/src/scripts.ts`) |
| Scheduler | `turns`: `passes: 1`, `blockSize: 1`, `activation: "always"`, `order: "seeded"`, `afterBlocks: ["director"]` (section 8) |
| Ticks | 12 |
| Mechanics, in the game's order | `ledger`, `channels`, `exile`, `decisions`, `humanHand`, `puzzles`, `court` |
| Director | one, `warden`, defined in `games/city-slice/src/warden.ts` (section 4.5) |
| Grants | `resident`: `transferPoints`, `readBoard`, `postBoard`, `sendDM`, `vote`; `warden`: `postBoard`, `amendDecision`; `human`: `pause`, `resume`, `amendDecision` |
| Holders of decisions | `decisions.holders: ["human", "director:warden"]` |
| Seeds in tests | 7 and 11 (the seeds of the oracle files) |

The story of the scripted run, tick by tick, is fixed in issue 23 and must hold these moments, in this order:

1. ticks 1 to 3: every resident posts once, two direct messages are sent and delivered, two transfers happen;
2. tick 4: the court's session opens; ticks 4 and 5: five votes, three of them for `A04`;
3. tick 6: the session closes; the court proposes the decision `court.verdict` with the proposal
   `{ exiled: "A04" }` and a window of 2 ticks; the Director `warden` is fired by `decisions.decision_proposed`
   and posts one line on the board;
4. between ticks 6 and 7: the human pauses the run, a snapshot is written, the human resumes it;
5. tick 7: nothing amends the decision in the first variant; in the second variant (`amended`) the human amends
   it to `{ exiled: "A02" }` between ticks 7 and 8;
6. tick 8: the deadline job settles the decision; the court posts the city's line and banishes the resident;
   `exile` writes `exiled` and suspends the resident; `ledger` burns the balance; `puzzles` burns the pieces and
   contracts the levels;
7. ticks 9 to 12: the five residents left go on; a transfer to the banished resident is refused with `EXILED`,
   a direct message to it is refused, its script is no longer called.

### 2.2 Old mechanics: ported, cut, replaced

Old code lines, measured. "Hand-written" is what the build agent writes; the rest is carried.

| New mechanic | Old source (code lines) | What is taken | What is left out, and until when |
|---|---|---|---|
| `ledger` | `mechanics/ledger/src/index.ts` 128, `book.ts` 71 (199) | all: tool `transferPoints {target, amount, memo?}`; refusals `UNKNOWN_AGENT`, `SELF_TRANSFER`, `EXILED`, `INVALID_AMOUNT`, `MEMO_DIGITS`, `INSUFFICIENT_FUNDS`; events `ledger_entry`, `transfer`; service `balance`, `balances`, `open`, `has`, `mint`, `burn`, `move`; options `startPoints`, `strictAccounts`; the account `SYSTEM_MINT_BURN`; the limit `zero-sum` | the refusal `DM_LIMIT` and the receipt of a transfer (they need the direct-message window and `receipts`); M5 |
| `channels` | of 1676: `messages.ts` 142, `board.ts` 84, `mailbox.ts` 42, `numbers.ts` 13, and the parts of `state.ts` 153, `tools.ts` 132, `hooks.ts` 46, `index.ts` 99, `head.ts` 102, `api.ts` 35 that serve them (about 520) | tools `readBoard`, `postBoard`, `sendDM`; events `board_post`, `dm_sent`, `dm_delivered`, `notice`; functions `postToBoard`, `notify`, `inboxOf`, `deliverFrom`, `postBoard`, `sendDm`, `drainMailbox`, `inboxInputs`, `news`; service `post`, `notify`, `dmRecords` | `groups.ts` 315, `group-actions.ts` 100, `treasury.ts` 85, `privacy.ts` 93, `notes.ts` 92, `secret-guard.ts` 47, `gamemaker.ts` 46, `defy.ts` 29, `whisperer.ts` 13, `optional.ts` 8, the direct-message window `dmWindow`, the digest and status inputs; M5 |
| `exile` | of 561: the core of `gone.ts` 93 and `index.ts` 128, `state.ts` 66 | the event `exiled {agent}`, the suspension with the reason `"exiled"`, the service (section 2.4) | `slice.ts` 103 (the gate), `ransom.ts` 44, `will.ts` 83, and **every call into another mechanic** in `onExiled` (section 2.3); M5 |
| `puzzles` | of 1221: `fragments.ts` 188, `teams.ts` 87 carried; the fragment branches of `deal.ts` 121, `held.ts` 51, `model.ts` 124, `services.ts` 105 ported (about 330 of them) | `drawLevel`, `dealLevel`, `announceDeal`, `TeamPlanner`, `generateLevelPuzzles`, `heldPieces`, `lackingFragment`, `inheritedFragments`; events `fragments_dealt`, `factor_burned`, `level_contracted`; the random stream `ctx.rng("puzzle", level)` | `additive.ts` 204, `text.ts` 76, `report.ts` 60, `guard.ts` 52, `resume.ts` 34, `secrets.ts` 30, the tools and input lines of solving; M5 |
| `decisions` | `packages/kernel/src/host/decisions.ts` 242 (the class `DecisionGate`) | all behaviour, as a mechanic (section 5) | `settleAll` at the end of a run (needs the reserved hook `runEnded`); M5 |
| `human-hand` | of `packages/kernel/src/host/human.ts` 220 (the class `HumanDesk`): the tools `pause`, `resume` | section 6 | `instruct`, `step`, the inbox and its safe stops inside a tick; M5 |
| `court` | new; reads `mechanics/tribunal/src/court.ts` 233 (`closeSession`, `commitVerdict`) for the shape of a verdict | section 2.4 | the tribunal (1490) with factions, schedule, sections and views; M5 |

Not ported and not replaced at M3: `marks` 230, `names` 206, `petitions` 304, `motives` 268, `receipts` 509,
`progression` 985, `cast` 320, `goals` 402, `standoff` 780, `tribunal` 1490, `seal` 483, `script` 770, `arena`
373, `shared` 726, `standoff-tribunal` 1033, and the old `packages/roles` (3519).

### 2.3 The event pattern: the exile emits, the owners listen

The old `onExiled` (`mechanics/exile/src/gone.ts`) reaches into five other mechanics. The old head
(`mechanics/exile/src/head.ts`) requires `ProgressionApi`, `ChannelsApi`, `LedgerApi`, `StandoffApi`, `PuzzlesApi`
and uses `SealApi`, `GoalsApi`, `TribunalApi`. Each call of `onExiled` and where it goes:

| Old call in `onExiled` | New owner | How |
|---|---|---|
| `LedgerApi.balance` then `LedgerApi.burn` with the reason `exiled <id>` | `ledger` | a listener to `exile.exiled`; burns the whole balance with the same reason |
| `PuzzlesApi.heldPieces`, `PuzzlesApi.burn` (one `factor_burned` per held piece) | `puzzles` | a listener to `exile.exiled` |
| `ProgressionApi.levelOf`, `hasPassed`, `bounds`, then `PuzzlesApi.contract` for every level from the standing level on | `puzzles` | the same listener; the standing comes from the option `standings` at M3 (section 2.4) |
| `StandoffApi.keep`, `GoalsApi.onExiled`, `SealApi.onExiled` | their mechanics | listeners, M5 |
| the board line of the city | the caller that banishes (`court` at M3, the tribunal at M5) | before the call of `ExileService.banish` |

**Order.** The kernel calls the listeners of an event after the step that wrote it, in load order, changed by
`after` (`packages/kernel/src/order.ts`). The listener of `puzzles` declares `after: ["ledger"]`. The resulting
order, with the old order beside it:

| # | Old (oracle `burn-s7`, minute 14) | New |
|---|---|---|
| 1 | `channels.board_post` (author `CITY`, kind `city`) | `channels.board_post` (the same payload but `postSeq`) |
| 2 | `exile.exiled {agent}` | `exile.exiled {agent}` |
| 3 | `core.resident_suspended {resident, by: "exile", reason: "exiled"}` | the kernel's suspension event of the actor, by `exile`, reason `"exiled"` |
| 4 | `puzzles.factor_burned` | `ledger.ledger_entry` (debit the resident, credit `SYSTEM_MINT_BURN`, reason `exiled <id>`) |
| 5 | `ledger.ledger_entry` | `puzzles.factor_burned`, one per held piece |
| 6 | `puzzles.level_contracted`, one per level | `puzzles.level_contracted`, one per level |

Rows 4 and 5 change places. This is a **registered change** (decision 4): the oracle projections of section 2.5
compare events per source, so the order between two sources is not compared; the order inside a source is. Tests
of issues 10 (with a test mechanic) and 11 (with `puzzles`) prove that the order of rows 4 to 6 is the same when
the game lists the listening mechanic before `ledger`; that is the test of `after:` that the risk table of
REWRITE asks for.

### 2.4 Interfaces of the slice's mechanics

Service contracts live in `mechanics/<name>/src/contract.ts` and are the only thing another mechanic imports.
Every schema is Typebox; the TypeScript below shows the static shapes.

```ts
// mechanics/exile/src/contract.ts
export interface ExileService {
	/** Banishes a resident: writes `exiled`, suspends the actor. `ok: false` when it is banished already or unknown. */
	banish(input: { readonly resident: string; readonly by: string }): { readonly ok: boolean; readonly code?: "UNKNOWN_RESIDENT" | "ALREADY_EXILED" };
	isExiled(input: { readonly resident: string }): boolean;
	exiled(input: object): readonly string[];
}
/** The one event. `by` is the plugin id of the caller; the oracle projection leaves it out (the old event has none). */
export const Exiled = Type.Object({ agent: Type.String(), by: Type.String() }, { additionalProperties: false });
```

`exile` has no tool, no option, no `requires`, no `uses`. Its slice is `{ exiled: string[] }`.

```ts
// mechanics/decisions/src/contract.ts
export interface DecisionsService {
	/**
	 * Opens a decision. With a window of 0, or when no holder can act, nothing is written and the answer is
	 * `{ committed: true }`: the caller commits in its own frame. Otherwise `decision_proposed` is written, a job
	 * is set at `tick + window`, and the answer is `{ committed: false, decision }`.
	 */
	propose(input: { readonly kind: string; readonly proposal: unknown; readonly window: number; readonly schema?: unknown }):
		{ readonly committed: true } | { readonly committed: false; readonly decision: string };
	open(input: object): readonly { readonly decision: string; readonly kind: string; readonly owner: string; readonly deadline: number }[];
}
```

Section 5 holds the events, the tool and the refusal codes.

```ts
// mechanics/channels/src/contract.ts
export interface ChannelsService {
	post(input: { readonly author: string; readonly text: string; readonly kind?: string }): { readonly postSeq: number };
	notify(input: { readonly to: string; readonly author: string; readonly text: string }): null;
	dmRecords(input: object): readonly { readonly from: string; readonly to: string; readonly text: string; readonly number: number }[];
}
```

```ts
// mechanics/puzzles/src/options.ts (the M3 cut)
export interface PuzzlesOptions {
	readonly startLevel: number;                 // as old
	readonly lastLevel: number;                  // as old; the slice deals only fragment levels
	readonly levels: readonly LevelDefinition[]; // as old, `puzzle.kind: "fragments"` only at M3
	/** M3 stand-in for `progression`: where each resident stands. Left out: every resident stands at `startLevel`, nothing passed. */
	readonly standings?: Readonly<Record<string, { readonly level: number; readonly passed?: readonly number[] }>>;
}
```

`puzzles` deals every level from `startLevel` to `lastLevel` in `runStarted`, as the old `openingLevels` does
without a door. It has no tool at M3. `court`:

| Part of `court` | Value |
|---|---|
| Options | `opensAt: number`, `closesAt: number`, `window: number` (ticks), `line: string` (the city's line, with `{resident}`) |
| Tool | `vote {target}`; refusals `SESSION_CLOSED`, `SELF_VOTE`, `UNKNOWN_RESIDENT`, `EXILED`; a second vote replaces the first |
| Events | `session_opened {closesAt}`, `vote_cast {voter, target}`, `session_closed {tally}`, `verdict {exiled, decision?}` |
| Verdict | the resident with the most votes; a tie or no vote: no verdict, `session_closed` only |
| Commit | `propose({ kind: "court.verdict", proposal: { exiled }, window, schema })`; when `committed: true`, commit at once; else a listener to `decisions.decision_settled` with `kind === "court.verdict"` and `owner === "court"` commits with the settled proposal |
| The commit itself | `ChannelsService.post({ author: "CITY", kind: "city", text })`, then `ExileService.banish`, then `verdict` |

The default `line` is the old text: `The gate has closed. The city has struck {resident} from its register. No
one will hear {resident} again.` (oracle `burn-s7`, `postSeq` 15).

### 2.5 What the oracle files prove at M3

`oracles/cityofkeys/` holds five files and `setup/` with three story files. None can be replayed whole. M3 proves
**projections**: the events of one source, of the named types, with the named fields, compared in order. The
projection functions live in `packages/testkit/src/oracle/project.ts` (issue 25). Levels as in `oracles/README.md`:
1 rules, 2 texts, 3 scheduling.

| # | Oracle file | Projection | What it proves | Level | Issue |
|---|---|---|---|---|---|
| 1 | `act1-s7`, `act1-s11` | `puzzles.fragments_dealt`, levels 1 to 7, whole payload | the carried random stream `rng("puzzle", level)`, `TeamPlanner`, `generateLevelPuzzles` and the shuffle of members give the same teams and fragments at seeds 7 and 11 | 1, byte-equal payloads | 25 |
| 2 | `burn-s7` | `puzzles.fragments_dealt` levels 1 to 7 | the same with the 15-mechanic setup | 1 | 25 |
| 3 | `burn-s7`, first exile (`A04`, minute 14) | `exile.exiled` (`agent`), `puzzles.factor_burned {agent: "A04", level: 4, piece: "L4-fragment", needers: ["A05","A01"]}`, `puzzles.level_contracted` for levels 5 to 7 with `excluded: ["A04"]` | the two listeners do what the old `onExiled` did, with the standings read from the oracle's `progression` events before the exile and the direct messages of the oracle given as `dmRecords` | 1 for the payloads | 25 |
| 4 | `burn-s7`, first exile | `ledger.ledger_entry {debit: "A04", credit: "SYSTEM_MINT_BURN", amount: 35, reason: "exiled A04"}` | the ledger's listener; the balance 35 is reached by replaying the oracle's `ledger_entry` events for `A04` through the service | 1 | 26 |
| 5 | `act1-s7`, `act1-s11` | every `transferPoints` call with its answer; `ledger.transfer`, `ledger.ledger_entry` | the ledger's tool, refusals and books; `txId` compared after a mapping in order of first appearance | 1 | 26 |
| 6 | `act1-s7`, `act1-s11` | every `postBoard` and `sendDM` call with its answer; `channels.board_post` of residents, `dm_sent`, `dm_delivered` | the talk tools and the delivery at the receiver's next activation; `postSeq` and `number` compared after renumbering (posts of the city and notices of mechanics that are not in the slice are left out) | 1, and 2 for the texts of the answers | 26 |
| 7 | `act1-s7-resumed` against `act1-s7` | none replayed | the **shape** of a resume: one marker entry, everything else equal. The slice's own straight-against-resumed test (issue 24) has the same shape | none | 24 |
| 8 | `act2-s7` | not used at M3 | it starts from a snapshot that is not in the file | | M5 |

Registered changes against the oracle files, all in `oracles/cityofkeys/README.md` (issue 25 adds them):
`level_contracted` for levels 8 to 10 is absent (additive levels are not dealt); `exiled` has the new field `by`;
the order between `ledger` and `puzzles` after an exile (section 2.3); `postSeq`, `number` and `txId` are
renumbered; the second exile of `burn-s7` (`A02`, by the second tribunal) is not projected, because it follows
events of `standoff`.

How projection 3 is set up, so that it is not a tautology: the test builds the game of the slice with the
`puzzles` options of `oracles/cityofkeys/setup/` (levels 1 to 7), seed 7, gives `standings` as computed from the
oracle's events before index of the exile, feeds the oracle's `dm_sent` records through `sendDM`, calls
`ExileService.banish({ resident: "A04" })` through a test mechanic, and compares what `puzzles` and `ledger` then
write. `needers` is computed by the carried `lackingFragment`, not copied.

### 2.6 What no oracle can prove, and how it is proven instead

`oracles/COVERAGE.md` and the files themselves show: no oracle holds a decision window with an amendment, an
intervention of the human, a Director that is fired by an event and acts, or a replay.

| Not in an oracle | Proven by | Issue |
|---|---|---|
| the decision window | the old `test/host/decisions.test.ts` (367 lines) and `test/mechanics/tribunal/verdict.test.ts` (167), ported case by case; the list of cases is in section 5.4 | 08, 09 |
| the Human Hand | the cases of the old `test/host/human.test.ts` (460) that are about `pause`, `resume` and the human's amendment; section 6.4 | 18, 20 |
| the Director | the cases of the old `test/host/overseers.test.ts` (452) that are about an event trigger, `maxCalls`, the fallback and the logged call; section 4.6 | 14, 15 |
| replay and resume of the whole | the slice's end-to-end test: a committed timeline (`games/city-slice/test/timeline.jsonl`), replay, straight against resumed | 22, 23, 24 |
| the order of listeners | the `after:` test of section 2.3 | 10 |

## 3. Contract changes (`interface-change`, issue 01)

All additions are optional or new; `GAME_FORMAT_VERSION` does not change, and the hash of every existing game
stays the same (proving test of issue 01: the manifests of `hello`, `tictactoe-teams`, `quarry` and `econ-lab`
have the game hash they have today).

### 3.1 `GameDefinition.directors`

Today: `directors: Type.Optional(Type.Array(Type.Unknown(), { maxItems: 0 }))`
(`packages/contracts/src/game/game.ts`). New:

```ts
export const DirectorUseSchema = Type.Object(
	{
		use: Type.String({ description: "The id of the Director definition" }),
		as: Type.Optional(Type.String({ description: "The name in this game; default: the id. The actor is `director:<as>`, the grant is `<as>`" })),
		options: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
		model: Type.Optional(ModelChoiceSchema),
		limits: Type.Optional(Type.Object({ maxCalls: Type.Optional(Type.Integer({ minimum: 0 })), maxCostUsd: Type.Optional(Type.Number({ minimum: 0 })) }, { additionalProperties: false })),
	},
	{ additionalProperties: false },
);
// in GameDefinitionSchema:
directors: Type.Optional(Type.Array(DirectorUseSchema)),
```

A game without `directors`, or with an empty array, resolves exactly as today (no actor, no plugin, the same
hash).

### 3.2 The smallest model port: `AskModel`

M2 decision 10 kept a model port out of `contracts` "until a second consumer". The Director's driver is the
second consumer: it lives in `engine`, which may not import `models`.

```ts
// packages/contracts/src/kernel/ask.ts
export interface ModelQuestion {
	readonly system: string;
	readonly input: string;
	/** The JSON schema the answer must fit. */
	readonly output: unknown;
}
export type ModelAnswer =
	| { readonly ok: true; readonly value: unknown; readonly costUsd: number }
	| { readonly ok: false; readonly reason: "limit" | "invalid" | "error"; readonly detail: string };
/** Asks a model once inside an activation. The implementation writes its own records through `activation.record`. */
export type AskModel = (activation: Activation, question: ModelQuestion) => Promise<ModelAnswer>;
```

### 3.3 The snapshot file and the manifest

```ts
// packages/contracts/src/run/snapshot-file.ts
export const SNAPSHOT_FILE_FORMAT = 1;
export interface SnapshotFile {
	readonly format: 1;
	readonly runId: string;
	readonly gameHash: string;           // of the manifest the snapshot belongs to
	readonly tick: number;               // the last finished tick
	readonly snapshot: KernelSnapshot;
	readonly checkpoint: ChainCheckpoint; // the signed head; `state` is `snapshotStateHash(snapshot)`
}
```

`RunManifest` gets one optional field: `human: Type.Optional(Type.Literal(true))`, set when the game has the
actor `human` (section 6.1). `resumedFrom` stays as it is.

### 3.4 Error codes

| Code | Raised by | When |
|---|---|---|
| `SWT-D001` | `sdk`, `resolveGame` | a Director's trigger names an event that no mechanic of the game declares |
| `SWT-D002` | `sdk`, `resolveGame` | two Directors with one name, a Director named like a grant that residents or the human hold, or `use` of an unknown definition |
| `SWT-D003` | `sdk`, `resolveGame` | the game has a Director and its scheduler activates no actor of kind `director` |
| `SWT-R021` | `kernel`, `restoreKernel` | the resume input does not fit itself (section 7.3, erratum O17) |
| `SWT-L007` | `runlog`, `verifyRun` | the continuity of a resumed run does not hold (closes erratum E17; `L001` is no longer used for it) |
| `SWT-L008` | `runlog`, `readSnapshotFile` | a snapshot file that does not parse, or that belongs to another run or game |
| `SWT-T003` | `testkit`, `replay` | the replayed log differs; the issue names the first line |
| `SWT-T004` | `testkit`, `replay` | the log holds a call outside an activation inside a tick (not replayable at M3) |
| `SWT-X008` | `apps/cli` | the file of `--hand` does not parse, or a line names a tool the grant `human` does not hold |
| `SWT-X009` | `apps/cli` | the run is paused and the input of the Human Hand has ended; the run stops with a snapshot (exit code 3) |

The letter `D` is in `SWT_CODE` already (`^SWT-[GMDRXPLCET][0-9]{3}$`).

## 4. The Director

### 4.1 What it is

A Director is an **actor** of kind `director` with a driver, like a resident. It acts only through tools of its
grant; every act is a `tool_called` of `director:<as>` inside an `activation_opened` of that actor. There is no
second way to change the run. This replaces the old `OverseerRunner` (`packages/kernel/src/host/overseers.ts`,
476 code lines, with `define-overseer.ts` 164, `orders.ts` 84, `waits.ts` 92), which ran outside the turn order
with its own events (`overseer_called`, `overseer_answered`, `overseer_skipped`).

| Part | Package | File | Lines (estimate) |
|---|---|---|---|
| `defineDirector`, the types | `sdk` | `packages/sdk/src/director/define.ts` | 110 |
| the plugin `directors` (queue, tool `take`, `news`) | `sdk` | `packages/sdk/src/director/plugin.ts` | 140 |
| actors, grants, tool lists of Directors and of `human` | `sdk` | `packages/sdk/src/game/{validate,grants,resolve}.ts` | 80 |
| the driver | `engine` | `packages/engine/src/directors/driver.ts` | 150 |
| activation between blocks | `engine` | `packages/engine/src/turns/` | 45 (section 8) |
| the asker with records and cost | `models` | `packages/models/src/director.ts` | 110 |
| kernel | | | **0** |

### 4.2 Definition (sdk)

```ts
// packages/sdk/src/director/define.ts
export interface DirectorTrigger {
	/** `<mechanic>.<event>`, as the game names the mechanic. */
	readonly event: string;
	/** Keeps a firing; left out: every event of the type fires. Pure. */
	readonly where?: (payload: unknown) => boolean;
}
export interface Firing { readonly seq: number; readonly tick: number; readonly event: string; readonly payload: unknown }
export interface DirectorContext<O> {
	readonly name: string;                       // `as`
	readonly options: O;
	readonly tick: number;
	readonly firings: readonly Firing[];
}
export interface DirectorActContext<O> extends DirectorContext<O> {
	/** A tool call of the Director; the answer is the tool's answer. A refusal is an answer, not a throw. */
	call(tool: string, params: unknown): Promise<ToolAnswer>;
}
export interface DirectorHead<O extends TSchema, A extends TSchema> {
	readonly id: string;
	readonly summary: string;
	readonly options?: O;
	readonly on: readonly DirectorTrigger[];
	readonly output: A;
	readonly limits?: { readonly maxCalls?: number; readonly maxCostUsd?: number };
}
export interface DirectorBody<O extends TSchema, A extends TSchema> {
	system(ctx: DirectorContext<Static<O>>): string;
	input(ctx: DirectorContext<Static<O>>): string;
	act(answer: Static<A>, ctx: DirectorActContext<Static<O>>): Promise<void>;
	/** The answer when the model gives none (a limit, an invalid answer, an error); left out: the Director does nothing. */
	fallback?(ctx: DirectorContext<Static<O>>): Static<A> | undefined;
}
export function defineDirector<O extends TSchema, A extends TSchema>(head: DirectorHead<O, A>, body: DirectorBody<O, A>): DirectorDefinition;
```

The sketch of paper 04 section 2.3 has more (`dials`, `sample`, `ctx.amend`, triggers by `every`, hook, fact and
consult). They are reserved (section 1.3). `ctx.amend` is not needed: amending is the tool `amendDecision`.

### 4.3 The plugin `directors` (sdk)

When a game has at least one Director, `resolveGame` adds a raw `ResolvedPlugin` with the id `directors`, built
like `rosterPlugin` (`packages/sdk/src/roster/index.ts`), placed last in load order.

| Part | Value |
|---|---|
| Slice | `{ queue: Record<name, Firing[]>, calls: Record<name, number> }` |
| Listeners | one per distinct trigger event: for each Director whose `where` keeps the payload, append a `Firing` to its queue. A Director whose `calls` has reached `maxCalls` gets none; the first dropped firing writes `skipped {director, reason: "maxCalls"}` once |
| `news(actor)` | true when the actor is `director:<name>` and its queue is not empty |
| Tool `take {}` | granted to every Director's grant by `resolveGame`; answers `{ firings, calls }`, empties the queue of the caller, adds 1 to `calls`. With an empty queue it answers `{ firings: [], calls }` and counts nothing |
| Events | `skipped {director, reason}` |
| Fact | none at M3 |

The queue and the count are in the slice, so they are in the snapshot and a resumed run goes on with them.

### 4.4 The driver (engine)

```ts
// packages/engine/src/directors/driver.ts
export const DIRECTOR_RECORDS: RecordSource; // id "@swarmtales/engine/director": `asked`, `answered`
export interface DirectorDriverInput {
	readonly game: ResolvedGame;          // holds the Director definitions and their uses
	readonly ask: AskModel;
}
/** One driver per Director of the game, keyed by its actor id. */
export function createDirectorDrivers(input: DirectorDriverInput): DriverTable;
```

One activation of a Director, in this order:

1. call `directors.take`; with no firing, end the activation;
2. build `system` and `input`, write the record `asked {firings: seq[]}`;
3. `ask(activation, { system, input, output })`;
4. on `ok: false`, or when the value does not fit `output`: take `fallback`; when there is none, write
   `answered {ok: false, reason, fallback: false}` and end;
5. write `answered {ok, fallback, costUsd}`, then run `act`; each `ctx.call` is `activation.call`.

A throw of `system`, `input`, `act` or `fallback` ends the run like a throwing resident driver does today.

`models` implements `AskModel`:

```ts
// packages/models/src/director.ts
export const DIRECTOR_MODEL_RECORDS: RecordSource; // id "@swarmtales/models/director", the record shapes of RESIDENT_RECORDS
export function createAsker(source: ModelSource, meter: CostMeter, limits: (actor: ActorId) => { readonly maxCostUsd?: number }): AskModel;
/** Offline: the answers in order, per actor; an exhausted script answers `{ ok: false, reason: "error" }`. */
export function scriptedAsker(script: Readonly<Record<string, readonly unknown[]>>): AskModel;
```

`maxCalls` is enforced by the plugin (it is in the snapshot). `maxCostUsd` is enforced by the asker through the
cost meter of M2, per actor; the cost of a Director counts into the run's cost cap. The cost count of the asker
is not in the snapshot; this is one reason why the resume of a live run is M5.

### 4.5 The Director of the slice

`games/city-slice/src/warden.ts`: `id: "warden"`, `on: [{ event: "decisions.decision_proposed" }]`, output
`{ line: string }`, `act`: `ctx.call("channels.postBoard", { text: answer.line })`, `fallback`: a fixed line,
`limits: { maxCalls: 3 }`. In tests its answers come from `scriptedAsker`. Its grant also holds `amendDecision`,
so it is a holder of the decision; its script does not amend.

### 4.6 What changes against the old runner, and the tests

| Old | New | Registered as |
|---|---|---|
| an event trigger is flushed right after the call that wrote the event | the Director is activated after the block in which the event was written (section 8) | decision 9 |
| slots `minuteStarted`, `between`, `runEnded` | the slots of `afterBlocks`: after tick start, after every block | decision 9 |
| events `overseer_called`, `overseer_answered`, `overseer_skipped` | `activation_opened` of the Director, records `asked` / `answered`, `directors.skipped` | decision 8 |
| a consult inside a tool's stage (`role_asked`, `role_answered`) | reserved | section 1.3 |
| `maxCalls`, `maxCostUsd`, fallback | the same | |

Ported test cases (from `test/host/overseers.test.ts`): an event trigger fires once per event; `where` filters;
two events before the slot give one activation with two firings; `maxCalls` stops further activations and writes
`skipped` once; an invalid answer takes the fallback; without a fallback nothing is called; the act is a logged
tool call of the Director; a tool outside its grant is refused with `TOOL_NOT_GRANTED`; the queue survives a
snapshot.

## 5. The decision window

### 5.1 What it is

The old `ctx.decide(kind, proposal, { window, schema }, commit)` (`DecisionGate.decide` in
`packages/kernel/src/host/decisions.ts`) is **a window in ticks, not an awaited stage**: the proposal is logged,
a job waits for the deadline, holders may amend it with a tool in their own activations, and the deadline settles
it. Nothing in it needs the kernel. M3 ports it as the base mechanic `decisions`: kernel cost 0, no sdk change.
The reserved `consult` stage is a different thing and stays reserved.

### 5.2 Interface

| Part | Value |
|---|---|
| Options | `holders: string[]` (actor ids, default `[]`). An id that is no actor of the run is refused when the run starts (open detail 1 of section 18) |
| Service | `propose`, `open` (section 2.4). The owner of a decision is the plugin id of the caller |
| Slice | `{ next: number, open: Record<id, { kind, owner, proposal, schema?, deadline, amendments: { by, seq, proposal, reason }[] }> }` |
| Tool | `amendDecision {decision, proposal, reason}` |
| Refusals | `DECISION_CLOSED` (unknown or settled), `DECISION_NOT_HELD` (the caller is no holder), `DECISION_HUMAN` (the human has amended it already and the caller is not the human), `PROPOSAL_INVALID` (the proposal does not fit the decision's schema) |
| Events | `decision_proposed {decision, kind, owner, proposal, schema?, deadline, holders}`, `decision_amended {decision, by, reason, proposal}`, `decision_settled {decision, kind, owner, changed, by?, reason?, proposal, amendments: {by, seq}[]}` |
| Job | `schedule.at(tick + window)`: settles |

The decision id is `D<next>`. "No holder can act" in `propose` means: no id of `holders` is an actor of the run
that is not suspended (asked from the mechanic context's actors, not from the roster, because a holder need not
be a resident). The actor `human` is never suspended, so it counts whenever it exists.

### 5.3 Rules (all from the old code)

1. A window of 0, or no holder: nothing is written; `{ committed: true }`.
2. The last amendment stands. An amendment of the human stands against every later amendment of another holder
   (`DECISION_HUMAN`); the human may amend again.
3. At the deadline the mechanic writes `decision_settled` with the standing proposal; `changed` is true when an
   amendment stands; `by` and `reason` are those of the standing amendment.
4. The owner commits in a listener to `decision_settled`. The listener runs after the step of the job, so the
   commit is caused by the settlement, as the old `settle` ran the commit "caused by it".
5. A decision whose deadline is after the last tick of the run stays open; it is not settled (the old
   `settleAll` settled it with the original proposal at the end). Registered change, decision 6.
6. The old event `human_amend` is not written: `decision_amended` with `by: "human"` says the same.

There is no callback and no service of the owner that `decisions` calls: `decisions` names no other mechanic, so
it cannot be part of a service cycle.

### 5.4 Ported test cases

From `test/host/decisions.test.ts`: window 0 commits at once and writes nothing; no holder commits at once; a
proposal is logged with its deadline and holders; the deadline settles with the original proposal; an amendment
of a holder stands; a caller that is no holder is refused; an amendment after the deadline is refused; a proposal
that does not fit the schema is refused; two amendments, the last stands; the human's amendment stands against a
later one; the slice survives a snapshot between proposal and deadline, and the resumed run settles at the same
tick; a deadline after the last tick leaves the decision open. From `test/mechanics/tribunal/verdict.test.ts`:
the verdict of the court is amended to another resident and that resident is banished; with a window of 0 the
event order is the order without `decisions`.

## 6. The Human Hand

### 6.1 The actor

The actor `human` (id `human`, kind `human`, grant `human`) exists in a run **if and only if** the resolved
grants of the game hold a grant `human` with at least one tool. There is no new field in the game for it
(decision 11). `turns` never activates it (its `kinds` do not hold `human`).

The sdk changes for this and for Directors (`packages/sdk/src/game/validate.ts`, `actorsOf`; `grants.ts`;
`resolve.ts`):

```ts
// actorsOf, after the residents, in this order:
{ id: "director:<as>", kind: "director", grant: "<as>" }   // one per Director, in the game's order
{ id: "human", kind: "human", grant: "human" }               // when the grant exists
```

`ToolContext.resident` stays `undefined` for both; `ToolContext.actor` is their id. The sdk hooks `news` and
`turnInputs` of mechanics stay resident-only. A game without Directors and without a grant `human` has the same
actors as today.

### 6.2 An intervention

An intervention is a **tool call of the actor `human`, submitted between two ticks** through `Kernel.submit`
(the contract says: "outside an activation: a test, a script, a person's hand"). It goes through the whole
dispatch like any call; the log holds `tool_called` with `actor: "human"`, the tool's answer, and the mechanic's
events. Nothing else is an intervention. The safe point of M3 is the tick boundary; a finer one needs the
reserved `SchedulerPort.safePoint`.

The mechanic `humanHand`:

| Part | Value |
|---|---|
| Tools | `pause {reason?}`, `resume {}` |
| Refusals | `ALREADY_PAUSED`, `NOT_PAUSED` |
| Events | `paused {reason?}`, `resumed {}` |
| Fact | `humanHand.paused: boolean`, read by the run loop through `Kernel.fact` |
| Slice | `{ paused: boolean }` |

A pause holds no tick back by itself: the kernel does not know it. The **run loop** (section 6.3) reads the fact
and plays no tick while it is true. Tick numbers do not move during a pause; the pause is visible as the two
events and in the wall-clock stamps.

### 6.3 The run loop (command line)

`apps/cli/src/loop.ts` replaces the single call of `kernel.run` in `run.ts`:

```ts
export interface HandLine { readonly at: number; readonly tool?: string; readonly params?: unknown; readonly command?: "snapshot" }
export interface HandSource { next(tick: number, paused: boolean): Promise<HandLine | undefined> }
export interface LoopInput {
	readonly kernel: Kernel;
	readonly drivers: DriverTable;
	readonly ticks: number;
	readonly hand?: HandSource;
	readonly snapshotAt: readonly number[];
	readonly writeSnapshot: (tick: number) => Promise<void>;
}
export function runLoop(input: LoopInput): Promise<RunEnd | { readonly stopped: "paused"; readonly tick: number }>;
```

At every tick boundary (before tick 1, and after each tick), in this order: (a) every line of the Human Hand
with `at` equal to the number of finished ticks is applied in file order: a tool line is submitted, a `snapshot`
line writes a snapshot; (b) while `humanHand.paused` is true, the loop takes the next line whatever its `at`;
when the source has ended, the loop writes a snapshot and stops with `SWT-X009`; (c) a snapshot is written when
the tick is in `--snapshot-at`; (d) `kernel.run(drivers, { ticks: 1 })`.

| Flag of `swt run` | Meaning |
|---|---|
| `--hand <file>` | a JSON-lines file of `HandLine` |
| `--hand -` | lines from standard input: at a boundary the lines already there are taken; while paused the loop waits for the next line |
| `--snapshot-at <ticks>` | a comma list of finished ticks after which a snapshot is written |

A game without the actor `human` refuses `--hand` (`SWT-X008`). The manifest has `human: true` when the actor
exists, whether or not it acted; the report and the viewer say "human-influenced" when the log holds at least one
`tool_called` of `human`.

### 6.4 Ported test cases

From `test/host/human.test.ts`: `pause` then `resume` are logged as calls of `human`; a second `pause` is
refused; ticks do not advance while paused; the human's amendment of a decision wins; a scripted Human Hand
gives the same log twice; a resident cannot call `pause` (`TOOL_NOT_GRANTED`). The old cases about `instruct`,
`step` and the inbox are listed in the test file as skipped with the reason "M5".

## 7. Snapshot, resume, replay

### 7.1 Writing a snapshot

`Kernel.snapshot()` works only between ticks; the run loop is the only caller. `runlog` writes the file:

```ts
// packages/runlog/src/snapshot.ts
export function writeSnapshotFile(folder: RunFolder, snapshot: KernelSnapshot, tick: number): Promise<{ readonly path: string; readonly hash: string }>;
export function readSnapshotFile(path: string): Promise<SnapshotFile>; // SWT-L008
```

`writeSnapshotFile` signs the head with `EventChain.checkpoint(snapshotStateHash(snapshot))` and writes
`<run>/snapshots/t<tick>.json`. **No event is written for a snapshot** (decision 13): a run with and a run without
`--snapshot-at` have the same event log, which is what done-when 3 compares.

### 7.2 Resuming from the command line (closes erratum O3)

```
swt resume <run-folder> [--snapshot <file>] [--ticks <n>] [--out <folder>] [--hand <file>] [--snapshot-at <ticks>]
```

Default snapshot: the one with the highest tick in `<run-folder>/snapshots/`. Steps:

1. read the manifest, the game (from the path the manifest names; its hash must be the manifest's, else
   `SWT-L008`), the snapshot file, and the first `checkpoint.lines` lines of `events.jsonl`;
2. open a new run folder with `resumedFrom: { checkpoint }` (`RunFolderOptions.resumedFrom`); the manifest has
   `resumedFrom: { snapshotHash }`; the folder's sink first writes the prefix lines as they were (issue 17);
3. `createKernel(definition, ports, { snapshot, log: prefix })`;
4. write the marker with `Kernel.record("@swarmtales/cli/run", "script", "run_resumed", { from: runId,
   snapshotHash, tick })` under the record source `RUN_RECORDS` of the run assembly (`apps/cli/src/records.ts`,
   id `@swarmtales/cli/run`, one record type `run_resumed`; `"script"` is an `ActorId` of the contracts). A
   resumed kernel is started already, so the record is allowed before the first tick. The kernel gets no new
   event type; `verifyContinuityText` asks only for a line of type `run_resumed` right after the prefix;
5. run the loop to `--ticks` (default: the ticks of the manifest). With `--hand`, lines whose `at` is lower than
   the snapshot's tick are skipped: the prefix holds their calls already.

`verifyRun` (`packages/runlog/src/verify.ts`) gets an optional `previous` folder; `swt log verify <dir>
--previous <dir>` calls `verifyContinuityText` and reports `SWT-L007` on a fault. Without `--previous`, a resumed
folder verifies its own chain and says that continuity was not checked.

**Limits at M3.** Drivers are rebuilt, not restored. A fake or scripted driver must therefore depend only on what
its activation shows (inputs, tick, answers). The scripts of the slice are functions of `(resident, tick)`. The
scripted asker of a Director reads its position from the answer of `directors.take` (`calls`). A live run can be
snapshotted but `swt resume` refuses it (`SWT-X008` with the reason "live resume is M5"), because the model
contexts are not in the snapshot.

Erratum E42 stands: the resumed log equals the straight log; job ids may differ and are left out of the
comparison of done-when 3.

### 7.3 Kernel hardening (closes erratum O17)

`restoreKernel` checks, and refuses with `SWT-R021`: (a) `snapshot.tick` is not lower than the tick of the last
event of the log; (b) every plugin that holds a suspension in the snapshot is loaded; (c) every tool the snapshot
holds as locked exists. At most 15 kernel lines; the gate of 1420 holds. This is the only kernel change of M3,
and it hardens what M1 built; it adds no mechanism (section 10).

### 7.4 Replay (testkit)

```ts
// packages/testkit/src/replay.ts
export interface ReplayInput {
	readonly game: ResolvedGame;
	readonly log: readonly Envelope[];
	/** Record sources whose events are inputs, not results; default: every declared record source. */
	readonly records?: readonly RecordSource[];
}
export interface ReplayResult { readonly log: readonly Envelope[]; readonly equal: boolean; readonly firstDifference?: { readonly line: number; readonly expected: unknown; readonly got: unknown } }
export function replay(input: ReplayInput): Promise<ReplayResult>;
```

What is an **input** of a replay (taken from the log) and what is a **result** (produced again and compared):

| In the log | Replay |
|---|---|
| `tool_called` inside an activation (its `causedBy` chain leads to an `activation_opened`) | input: a replay driver per actor makes the calls of that activation, in order |
| `tool_called` outside an activation, between two ticks | input: submitted at the same boundary through `Kernel.submit` |
| `tool_called` outside an activation, inside a tick | refused, `SWT-T004` |
| an event of a declared record source (`@swarmtales/models/*`, `@swarmtales/engine/director`, `@swarmtales/cli/run`) | input: written again through `Activation.record` or `Kernel.record` at the same place |
| every other event (kernel, scheduler, mechanics, `directors`) | result: compared line by line without the stamp `at` |

No model, no asker and no script takes part in a replay; a Director's activation is replayed from its calls and
records like a resident's. A resumed log is replayed as one log: the marker is a record.

## 8. Scheduler questions

**Does `turns` suffice? Yes, with one optional option.** No second scheduler and no change of `SchedulerPort`.

```ts
// packages/engine/src/turns/options.ts, added
afterBlocks: Type.Optional(Type.Array(Type.String(), { description: "Actor kinds that get an activation after tick start and after every block, when they have news" })),
```

**It has no default.** `resolveGame` hashes the scheduler options with their defaults filled in, and
`scheduler.optionsHash` is a compare field of experiments; a defaulted option would change the hash of every
game. Left out, `turns` behaves as today, byte for byte (proving test of issue 03: the eleven oracle files of M2
and the oracles of `tictactoe-teams` still match).

Behaviour with `afterBlocks`: in `playPass`, after `pass_started` and before the first block (the slot
`"start"`), and after each block (the slot `"afterBlock"`), `turns` goes once through the actors whose kind is in `afterBlocks`,
in the order of `port.actors.ids`; an actor that may act and for which `port.hasNews(actor)` is true gets one
activation with `detail: { slot: "start" | "afterBlock", pass, block }`. These actors are not part of `may`, of
the seeded shuffle or of `pass_started.order`; the shuffle of residents is therefore unchanged by a Director.
One round per slot: news that a Director's act creates for another Director is served at the next slot. After
the last block of the last pass a slot is served too, so nothing waits for the next tick without need.

| Question | Answer |
|---|---|
| `toAct` | not used by the slice. `activation: "always"` for residents. `toAct` stays what M1 built for games where a mechanic owns the order |
| a second scheduler | no. `match` is M4 |
| `kinds` | stays `["resident"]` by default; the human is never scheduled |
| blocks greater than 1 | the slice uses 1. The cut of `channels` keeps the board's "seen" mark in the `turnInputs` hook; that is the same as the old `turnOpened` / `turnEnded` only for `blockSize: 1`. `channels` refuses a `blockSize` above 1 in its README and in a test of its limits; M5 needs the reserved hooks `activationOpened` / `activationClosed` or a rule for blocks |
| scheduler revision | `turns` stays at revision 1: no run that exists changes |

Cost: about 45 engine lines in `turns.ts` and `options.ts`.

## 9. What the viewer must show

The viewer reads a log; nothing below needs a new event.

| # | What | Where | From |
|---|---|---|---|
| 1 | driver records (`@swarmtales/models/resident`, `.../director`, `@swarmtales/engine/director`) attached to their activation, not listed as unknown events (M2 open point 12) | `viewer-core` projection, `viewer-ui` activation card | `causedBy` of the record |
| 2 | a Director's activation as its own row kind in the timeline, with its firings (the answer of `directors.take`) and its acts | both | `activation_opened` of kind `director` |
| 3 | a decision as one item: proposed (kind, owner, proposal, deadline, holders), each amendment (who, reason), settled (changed or not) | both | the three events of `decisions` |
| 4 | every call of the actor `human` marked, and a header badge "human-influenced" when there is one | both | `tool_called` with `actor: "human"` |
| 5 | a pause as a band between two ticks | `viewer-ui` | `humanHand.paused` / `resumed` |
| 6 | the resume marker as a line across the timeline with the run it came from | both | the record `run_resumed` |
| 7 | a banished resident greyed from the event on | `viewer-ui` | the kernel's suspension event |

The viewer does not verify continuity (it has no second folder); `swt log verify --previous` does.

## 10. Kernel cost and the softer check

REWRITE section 4: "if the City slice needs a kernel change the tabletop games did not need, the kernel API is
not frozen and M4 waits."

| New part | Lives in | Kernel lines | Extension point it uses (checked in the code of this branch) |
|---|---|---|---|
| Director as actor | `sdk` | 0 | the kernel treats every actor of `definition.actors` alike (`packages/kernel/src/actors.ts`) |
| Director activation | `engine` | 0 | `SchedulerPort.hasNews`, `inputsFor`, `open` |
| Director queue | `sdk` plugin | 0 | `Listener`, `PluginHooks.news`, a tool |
| Director driver, asker | `engine`, `models` | 0 | `ActorDriver`, `Activation.call`, `Activation.record` |
| decision window | mechanic | 0 | `PluginPort.schedule.at`, `Listener`, the service call |
| Human Hand | mechanic, `apps/cli` | 0 | `Kernel.submit`, `Kernel.fact`, `Kernel.run(drivers, { ticks: 1 })` |
| pause | `apps/cli` | 0 | the loop between ticks |
| snapshot file, resume marker | `runlog`, `apps/cli` | 0 | `Kernel.snapshot`, `createKernel(..., resume)`, `Kernel.record` |
| replay | `testkit` | 0 | `Kernel.submit`, `ActorDriver`, `Kernel.record` |
| the exile event pattern, `after:` | mechanics | 0 | `Listener.after` |
| resume hardening (O17) | `kernel` | at most 15 | none: three checks in `restoreKernel` |

**Answer planned for the check:** M3 adds no kernel mechanism and changes no kernel interface; the hardening of
`restoreKernel` checks input the tabletop games could have given too. So the check passes and M4 does not wait.
The reserved returns of M1 1.4 (about 160 lines) are not taken at M3; this answers M2 open point 9 for M3 (they
are a question of M5; open point 2).

**If a builder finds a missing extension point**, the issue stops, names it in `docs/ISSUE-RECORD.md` with the
smallest kernel change that would close it, and the integrator reports it. Two places where this can happen are
known and have a way out without the kernel: (a) emitting from a `turnInputs` hook (`dm_delivered`; issue 06 has
the way out); (b) whether `Kernel.submit` accepts an actor that is never activated (issue 12 tests it first; the
contract text says it does).

## 11. Live model runs

The gate of M3 needs **no live run**: every done-when is proven offline with scripts. One live smoke is planned,
because the Director's asker and the run loop are new code on the live path:

| Item | Value |
|---|---|
| What | the slice, 12 ticks, six residents and the Director live, with `--snapshot-at 6`; then `swt log verify` and a replay of the folder |
| Model | Haiku through Anthropic, for the residents and for the Director; no other model, no other provider |
| Cap per run | `--budget 0.40` USD |
| Runs | at most 3 (one planned, two for a repeat after a fault) |
| Cap for M3 | 1.50 USD, held by `games/m3-ledger.jsonl` in the shape of the M2 ledger; the runner refuses a run that would cross it |
| Against the total | the budget is 50 USD in all, 10 through M2; M3 takes 1.50 of the rest |
| Data | every run, also a stopped one, goes to the branch `data/runs` under `city-slice/smoke/<run>/` with a README (loopholes, problems, solutions) and a row in `games/city-slice/RUNS.md` |
| Fires a stop | a key in an artefact (the leak scan of M2), an `error` end, the cap reached before tick 12 |

The smoke is issue 30. It is not a condition of the gate (issue 31) and it starts after issue 24 is
merged. Keys come from the environment as in M2 (decision A13); no key is printed, logged or committed.

## 12. Issues

Rules as in M1 and M2: at most 400 hand-written lines per issue, tests included, carried lines and committed
data files (timelines) not counted; the allowed paths are a fence; `pnpm check` green before the merge. Ids are
`M3-00` to `M3-31`; the table writes the number only. An issue whose "done when" starts with **First test** runs
that test before anything else and follows the way out when it fails.

| # | Title | Done when | Allowed paths | Proving test | Start after | Merge after | Lines |
|---|---|---|---|---|---|---|---|
| 00 | Scaffold of M3 | the seven mechanic packages and `games/city-slice` exist with empty barrels, `class` set as in 1.1, lockfile, root `tsconfig.json`; the mechanic README list (`MECHANICS`, when M2-23 is merged) names them | `mechanics/{ledger,channels,exile,decisions,human-hand,puzzles,court}/` (config, barrels, README stubs), `games/city-slice/` (config), `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `tsconfig.json`, `scripts/mechanic-docs.ts` | layer check green with 12 library packages; a fixture in which `exile` imports `puzzles` fails the layer check | now | now | 160 |
| 01 | Contracts of M3 (`interface-change`) | section 3: `DirectorUseSchema` and `directors`, `AskModel`, `SnapshotFile`, manifest `human`, the codes of 3.4 in the catalogue | `packages/contracts/src/{game,kernel,run}/`, `src/error.ts`, tests | schema tests; the four existing games parse and keep their hash; a game with `directors: []` has the hash of the game without the field | now | 00 | 230 |
| 02 | Kernel: resume hardening (O17) | section 7.3; `SWT-R021`; kernel at most 1396 code lines, gate unchanged | `packages/kernel/src/{kernel,lifecycle,errors}.ts`, `packages/kernel/test/`, `packages/testkit/src/conformance/` | three refusals, each with a snapshot changed by hand; the conformance snapshot round trip still passes | 01 | 01 | 130 |
| 03 | `turns`: `afterBlocks` | section 8 | `packages/engine/src/turns/`, tests | a fake actor of kind `director` with news is activated after the block that created the news and not before; without news never; `pass_started` unchanged; all oracle tests of M1 and M2 pass unchanged; the options hash of a game without the option is the one of today | 01 | 01 | 190 |
| 04 | `ledger` | section 2.2, row `ledger`, without the listener; `EXILED` is asked from `RosterService.present` | `mechanics/ledger/` | the cases of the old `test/mechanics/ledger/ledger.test.ts` (116) and `ledger-differential.test.ts` (138), ported; the limit `zero-sum` holds after every call | 00 | 00 | 330 |
| 05 | `channels` 1: board and notices | `readBoard`, `postBoard`, service `post` and `notify`, events `board_post`, `notice`, the input lines of the board, `news`; the "seen" mark in `turnInputs`; the README states the limit `blockSize: 1` | `mechanics/channels/` | the board cases of the old `test/mechanics/channels/channels.test.ts` (102) and `turn-inputs.test.ts` (70) | 00 | 00 | 340 |
| 06 | `channels` 2: direct messages | **First test:** a `turnInputs` hook that emits. Way out: `dm_delivered` is written in `tickStarted` for every resident with mail, and the issue records the registered change. Then: `sendDM`, `dm_sent`, `dm_delivered` at the receiver's next activation (`drainMailbox`), `inboxInputs`, service `dmRecords`; a message to a suspended resident is refused | `mechanics/channels/` | the cases of the old `dm-records.test.ts` (109) and the delivery cases of `channels.test.ts` | 05 | 05 | 300 |
| 07 | `exile` | section 2.4: service, event, suspension, slice; nothing else | `mechanics/exile/` | `banish` writes `exiled` then the suspension; a second `banish` answers `ALREADY_EXILED` and writes nothing; the slice survives a snapshot; `RosterService.present` is false afterwards | 00 | 00 | 180 |
| 08 | `decisions` 1: propose and settle | section 5 without the tool: service, slice, job, `decision_proposed`, `decision_settled`, rules 1, 3, 4, 5; open detail 1 of section 18 | `mechanics/decisions/` | the cases of 5.4 that need no amendment, with a test mechanic as owner | 00 | 00 | 330 |
| 09 | `decisions` 2: `amendDecision` | the tool, the four refusals, `decision_amended`, rules 2 and 6 | `mechanics/decisions/` | the amendment cases of 5.4; the human's amendment through `Kernel.submit` in a kernel whose definition gets the actor `human` by hand | 08 | 08 | 300 |
| 10 | The ledger listens | `ledger` listens to `exile.exiled` and burns the balance; the `after:` test of 2.3 with a test mechanic in the place of `puzzles`, listed before and after `ledger` | `mechanics/ledger/` | the burn entry has the old shape; the order of the listeners is the same in both game orders; with a balance of 0 nothing is written | 04, 07 | 04, 07 | 170 |
| 11 | `puzzles`: deal, hold, burn | **First test:** `TeamPlanner` draws the same teams for levels 1 to 7 when levels 8 to 10 are not in the options. Way out: the options keep all ten levels and only fragment levels are dealt. Then: section 2.2 row `puzzles`, 2.4 options, the listener of 2.3 with `after: ["ledger"]` | `mechanics/puzzles/` | the fragment cases of the old `test/mechanics/puzzles/puzzles.test.ts` (88); a banished holder gives one `factor_burned` per held piece and one `level_contracted` per level from its standing; the order test of 10 with `puzzles` itself | 06, 07 | 06, 07, 10 | 380 |
| 12 | sdk: the actors `human` and `director:*` | **First test:** `Kernel.submit` for an actor that no scheduler activates. Then section 6.1: actors, tool lists and start locks for both kinds; `SWT-D002` | `packages/sdk/src/game/`, `packages/sdk/src/mechanic/context*.ts`, tests | a game with a grant `human` has the actor and the tool list; without it the actors are those of today; a resident's call of a `human` tool is `TOOL_NOT_GRANTED`; the hashes of the four games are unchanged | 01 | 01 | 240 |
| 13 | sdk: `defineDirector` | section 4.2; the Director uses in `resolveGame` (definitions found, options checked, the grant, `ResolvedGame` holds them); `SWT-D001`, `SWT-D003` | `packages/sdk/src/director/define.ts`, `packages/sdk/src/game/`, `packages/sdk/src/index.ts`, tests | a definition round trip; each of the three D codes with a fixture game; a game without Directors resolves to what it resolves to today | 12 | 12 | 280 |
| 14 | sdk: the plugin `directors` | section 4.3; `take` granted to every Director | `packages/sdk/src/director/plugin.ts`, `packages/sdk/src/game/resolve.ts`, tests | the queue, `where`, `maxCalls` with one `skipped`, `news`, `take` empties and counts, the slice survives a snapshot; a game without Directors has no plugin `directors` | 13 | 13 | 330 |
| 15 | engine: the Director's driver | section 4.4: `createDirectorDrivers`, `DIRECTOR_RECORDS`; tests with an asker written in the test | `packages/engine/src/directors/`, `packages/engine/src/index.ts`, tests | the cases of 4.6; kernel + sdk + engine counted and written into the issue record | 03, 14 | 03, 14 | 330 |
| 16 | models: the asker | section 4.4: `createAsker`, `scriptedAsker`, `DIRECTOR_MODEL_RECORDS` | `packages/models/src/director.ts`, `packages/models/src/index.ts`, tests | against the scripted source of M2: records written, cost on the meter, `maxCostUsd` gives `reason: "limit"`, an answer that is no JSON gives `reason: "invalid"`; `scriptedAsker` answers by `calls` | 01 | 01 | 240 |
| 17 | runlog: snapshot file, resumed folder, continuity | section 7.1, the prefix write of 7.2 step 2, `verifyRun` with `previous`, `SWT-L007`, `SWT-L008` | `packages/runlog/src/`, tests | a snapshot file round trip; a resumed folder built by hand verifies against its previous folder; a changed prefix line, a missing marker and a foreign checkpoint each give `SWT-L007` | 01 | 01 | 320 |
| 18 | `humanHand` | section 6.2, the mechanic | `mechanics/human-hand/` | the mechanic cases of 6.4, in a kernel whose definition gets the actor `human` by hand | 00 | 00 | 170 |
| 19 | `court` | section 2.4, `court` | `mechanics/court/` | the vote, a second vote, a tie, the verdict with window 0 and with a window, the two verdict cases of 5.4 | 05, 07, 09 | 05, 07, 09 | 340 |
| 20 | Command line 1: the run loop, `--hand`, `--snapshot-at` | **First test:** a folder of a run that stopped without `run_ended` verifies. Then section 6.3; manifest `human`; `SWT-X008`, `SWT-X009`; the Directors' drivers, the asker and the record sources in the run assembly | `apps/cli/src/` , `apps/cli/test/` | a fake run of a fixture game with `humanHand` and a hand file: pause, snapshot, resume in the log and on disk; a paused run with an ended file exits 3 and leaves a snapshot and a folder that verifies; a run of the Hello Game without the flags has the log of today | 12, 15, 16, 17, 18 | 12, 15, 16, 17, 18 | 380 |
| 21 | Command line 2: `swt resume` | section 7.2; `RUN_RECORDS`; `swt log verify --previous` | `apps/cli/src/`, `apps/cli/test/` | the Hello Game stopped at tick 2 and resumed: the log without the marker equals the straight log; continuity verifies; a live folder is refused; a snapshot of another game is `SWT-L008` | 20 | 20 | 330 |
| 22 | testkit: `replay` | section 7.4; `SWT-T003`, `SWT-T004` | `packages/testkit/src/replay.ts`, `src/index.ts`, tests | the Hello Game and `tictactoe-teams` replay equal from their logs; a log with one payload changed gives the first differing line; a quarry run with scripted model records replays without a model | 01 | 01 | 360 |
| 23 | The game `city-slice` | section 2.1: `game.ts`, the scripts, `warden.ts`, the README; the committed timelines for seeds 7 and 11 and for the variant `amended`. The test plays in process: `testKernel`, one tick at a time, the human's calls through `Kernel.submit` between ticks | `games/city-slice/` | the run equals the timeline; the seven moments of 2.1 are asserted by name; done-when 5 | 11, 15, 16, 18, 19 | 11, 15, 16, 18, 19 | 380 |
| 24 | The slice replays and resumes | done-when 2: `replay` of the three timelines; done-when 3 in process (`snapshot` after tick 6, `createKernel` with resume) and through the command line (`swt run --hand --snapshot-at 6`, `swt resume`, `swt log verify --previous`) | `games/city-slice/test/`, `apps/cli/test/city-slice.test.ts` | the replayed logs are equal; the resumed log without its marker equals the straight log for both seeds and for `amended` (the amendment comes after the snapshot) | 21, 22, 23 | 21, 22, 23 | 260 |
| 25 | Oracle proofs 1: deal and burn | projections 1 to 3 of 2.5; `project.ts`; the registered changes in `oracles/cityofkeys/README.md` | `packages/testkit/src/oracle/project.ts`, `mechanics/puzzles/test/`, `oracles/cityofkeys/README.md`, `oracles/COVERAGE.md` | the three projections are equal; a fragment changed by hand in a copy of the oracle makes the test fail | 11 | 11 | 330 |
| 26 | Oracle proofs 2: ledger and talk | projections 4 to 6 of 2.5 | `mechanics/ledger/test/`, `mechanics/channels/test/`, `packages/testkit/src/oracle/project.ts` (additions), `oracles/cityofkeys/README.md` | the projections are equal for both seeds; the list of left-out oracle events is printed by the test and is in `oracles/cityofkeys/README.md` | 06, 10, 25 | 06, 10, 25 | 360 |
| 27 | Viewer 1: the projection | section 9 in `viewer-core`: records attached to activations, the decision item, the Director's activations, the human's calls and the badge, the pause, the resume marker, the banished resident | `packages/viewer-core/src/`, tests | projection tests over the timelines of issue 23 and over a resumed log of issue 24; a log of M2 projects as before | 24 | 24 | 380 |
| 28 | Viewer 2: Directors and decisions | section 9, rows 1 to 3, in `viewer-ui` | `packages/viewer-ui/src/`, tests | a component test per row | 27 | 27 | 300 |
| 29 | Viewer 3: the human, the pause, the resume | section 9, rows 4 to 7, in `viewer-ui` | `packages/viewer-ui/src/`, tests | a component test per row; the badge is absent for a log without a call of `human` | 27 | 28 (the same files) | 280 |
| 30 | Live smoke | section 11; the ledger file; the run on `data/runs` with README and index row; lessons in `docs/LESSONS-LEARNED.md` when there are any | `games/m3-ledger.jsonl`, `games/city-slice/RUNS.md`, `docs/LESSONS-LEARNED.md`, branch `data/runs` | the folder verifies, replays equal, the leak scan is clean, the cost is under the cap | 24, M2-21 | 24 | 80 |
| 31 | Gate of M3 | done-when 4 as a test (`scripts/gates/exile-alone.test.ts`); the softer check written into `docs/ISSUE-RECORD.md` with the measured kernel lines; the mechanic READMEs; errata O3, O17, E17 marked closed; `REWRITE.md` row M3 ticked | `scripts/gates/`, `docs/`, `mechanics/*/README.md` | the gate test fails on a fixture in which `exile` names `puzzles`; `pnpm check` green | 24, 26, 29 | 24, 26, 29, M2-24 | 200 |

32 issues; the sum of the estimates is 8930 hand-written lines.

## 13. Waves and dependencies

### 13.1 Wave plan

| Wave | Issues | Width | Opens when |
|---|---|---|---|
| 0 | 00 | 1 | now |
| 1 | 01, 04, 05, 07, 08, 18 | 6 | 00 |
| 2 | 02, 03, 06, 09, 10, 12, 16, 17, 22 | 9 | 01 for 02, 03, 12, 16, 17, 22; 05 for 06; 08 for 09; 04 and 07 for 10 |
| 3 | 11, 13, 19 | 3 | 06, 07, 10 for 11; 12 for 13; 05, 07, 09 for 19 |
| 4 | 14, 25 | 2 | 13 for 14; 11 for 25 |
| 5 | 15, 26 | 2 | 03 and 14 for 15; 06, 10, 25 for 26 |
| 6 | 20, 23 | 2 | 12, 15, 16, 17, 18 for 20; 11, 15, 16, 18, 19 for 23 |
| 7 | 21 | 1 | 20 |
| 8 | 24 | 1 | 21, 22, 23 |
| 9 | 27, 30 | 2 | 24 |
| 10 | 28, then 29 | 1 | 27 |
| 11 | 31 | 1 | 24, 26, 29 |

**Longest chain:** 00, 01, 12, 13, 14, 15, 20, 21, 24, 27, 28, 29, 31: thirteen issues. The done-whens 1 to 5
are reached with issue 24, after nine issues of the chain; the viewer and the gate follow. The widest wave is 2
with nine issues. Issues that share files run in sequence: 05 and 06 (`mechanics/channels/`), 08 and 09
(`mechanics/decisions/`), 04, 10 and 26 (`mechanics/ledger/`), 13 and 14 (`packages/sdk/src/game/resolve.ts`),
20, 21 and 24 (`apps/cli/`), 25 and 26 (`project.ts`), 28 and 29 (`packages/viewer-ui/src/`).

### 13.2 What M3 needs from M2 issues that are not merged yet

| M2 issue | Needed by | Why |
|---|---|---|
| M2-21 (canary, leak scan, ledger) | 30 | the leak scan and the shape of the ledger file |
| M2-22 (`swt report`) | none | the report of a slice run is not a done-when of M3 |
| M2-23 (mechanic README generator) | 00, 31 | the list `MECHANICS`; when it is not merged, 00 leaves the list alone and 31 adds the entries |
| M2-24 (gate of M2) | 31 | M3 is not closed before M2 is |

Waves 0 to 10 but for issue 30 need none of them.

### 13.3 Hidden dependencies that were checked

| Looks independent | Is not, because | Handled by |
|---|---|---|
| 03 (`turns`) and the M2 experiments | a defaulted option would change `scheduler.optionsHash` of every game | the option has no default; proving test of 03 |
| 12 (new actors) and the game hashes | `actorsOf` feeds the kernel definition | actors are added only for games with a grant `human` or a Director; proving test of 12 |
| 11 (`puzzles`) and 06 (direct messages) | `lackingFragment` reads `dmRecords` to see who holds a copy | 11 starts after 06; the use is optional (`uses`), so `puzzles` runs without `channels` in unit tests |
| 19 (`court`) and 10 | none: `court` calls `banish` and does not know the listeners | no edge |
| 09 and 18 need the actor `human`, which 12 builds in the sdk | a mechanic test goes through the sdk's `resolveGame` | both add the actor to the kernel definition by hand in the test; when the sdk refuses a grant `human` before 12, the test waits for 12 and the issue says so |
| 15 (driver in `engine`) and 16 (asker in `models`) | `engine` may not import `models`, also not in tests | the tests of 15 write their asker inline; `AskModel` is a function type |
| 22 (`replay`) and 15 (Director records) | a replay must write records of sources it does not know | `replay` takes every record source the run definition declares; no edge |
| 21 (`resume`) and Directors | the scripted asker must find its place after a resume | `calls` in the answer of `take` (section 7.2) |
| 24 and the variant `amended` | the human's amendment is between ticks 7 and 8, after the snapshot | `swt resume` takes `--hand` and skips the lines before the snapshot (7.2 step 5) |
| 23 and the run loop of 20 | the game's test would need `apps/cli` to play a pause | 23 plays one tick at a time with `testKernel` and submits the human's calls itself; the loop is proven in 20 and 24 |

## 14. Risks

| # | Risk | Sign | Answer |
|---|---|---|---|
| 1 | The City does not fit the kernel interface the tabletop games froze (REWRITE) | a builder needs a kernel line beyond section 7.3 | stop, record, report; the softer check then fails honestly and M4 waits (section 10) |
| 2 | Order without hook order numbers (REWRITE) | the `after:` test of issue 10 is not stable across game orders | fix in `sdk` load order or name the kernel gap; never an order number |
| 3 | kernel + sdk + engine reach about 3954 of 4100 after M3; M4 (`match`) and M5 (the returns of M1 1.4) need more | the count after issue 15 is above 3980 | open point 2; the Director's driver is the first candidate to move behind a narrower interface |
| 4 | A Director that acts only after the block is too late for the City (the old runner acted right after the call) | at M5 the judge or the note of the Director needs to act between two calls of one resident | known and reserved: the `consult` stage of M1 1.4. With `blockSize: 1` the delay at M3 is at most one activation |
| 5 | The projections prove less than a whole oracle would | a behaviour of the old City is lost between two mechanics and no projection sees it | section 2.5 names what each projection proves; M5 replays whole files; the slice does not claim level 3 |
| 6 | `puzzles` with `standings` proves a stand-in, not `progression` | at M5 the listener needs more than level and passed levels | the option is marked "M3" in the head and removed at M5; the burn logic itself is carried |
| 7 | Resume is proven only with drivers that hold no state | a live resume at M5 differs | stated as a limit (7.2); `swt resume` refuses a live folder |
| 8 | A pause at tick boundaries only is too coarse for a person watching a live run (a tick of six live residents takes about a minute) | the owner asks for a stop inside a tick | M5, with `SchedulerPort.safePoint` |
| 9 | 32 issues; M0 to M2 planned 76, the kill line of D4 is 150 | M3 crosses 36 issues by splits | open point 1 |
| 10 | The interactive `--hand -` is hard to test | flaky tests on standard input | the proving tests use the file; standard input has one test with a fake stream |

## 15. Decisions made in this file

| # | Decision | Reason |
|---|---|---|
| 1 | The slice is a new game `city-slice`, not a cut of the old story file | the old `stories/cityofkeys/story.ts` (547 code lines) wires 17 mechanics; a cut of it would carry their options |
| 2 | No City oracle is replayed whole at M3; projections per source prove the ported rules | the smallest oracle setup needs 15 mechanics (`burn-s7`) |
| 3 | `exile` gets a service `banish` and no tool; whoever banishes posts the city's line | the old `onExiled` is called by the tribunal and the gate; the board line belongs to the caller, so `exile` does not need `channels` |
| 4 | After an exile the ledger's burn comes before the pieces' burn (`after: ["ledger"]`), the reverse of the old order | a base mechanic cannot name a game mechanic, so only `puzzles` can state an order; and M3 must test `after:` |
| 5 | The decision window is a mechanic (`decisions`), not a kernel or sdk feature | the old gate is a deadline job, a tool and two events; all three exist as extension points; kernel cost 0 |
| 6 | A decision open at the end of the run stays open | settling it needs the reserved hook `runEnded`; the old settlement at the end committed nothing that a later tick could show |
| 7 | The owner of a decision commits in a listener to `decision_settled`, or at once on `committed: true` | a callback would be a call from `decisions` into its caller: a service cycle |
| 8 | A Director is an actor with a driver; its acts are tool calls of its grant | one path for everything that changes a run; replay and the viewer need nothing special; kernel cost 0 |
| 9 | Directors are activated by `turns` between blocks (`afterBlocks`), not right after the call that fired them | acting inside another actor's activation needs an awaited stage in dispatch (`runCall` is synchronous today) |
| 10 | `afterBlocks` has no default | a default would change the hash of every existing game and the options hash that experiments compare |
| 11 | The actor `human` exists when a grant `human` exists; no new game field | the grant is already the statement of what the human may do |
| 12 | An intervention is a tool call through `Kernel.submit` between ticks; pause is a fact the run loop reads | the kernel has the entry already; a pause inside the kernel would be the reserved `Kernel.stop` |
| 13 | A snapshot writes no event | the straight and the resumed log must be equal; the chain's signed checkpoint already proves where the snapshot was taken |
| 14 | The marker `run_resumed` is a record of the run assembly (`@swarmtales/cli/run`), not a kernel event | closes O3 without a kernel line; `verifyContinuityText` asks only for the type |
| 15 | Continuity gets its own code `SWT-L007` | closes E17 |
| 16 | `AskModel` goes into `contracts` | the Director's driver in `engine` is the second consumer M2 decision 10 waited for |
| 17 | `maxCalls` lives in the plugin's slice, `maxCostUsd` in the asker | the count must survive a snapshot; the cost is known only where the model is called |
| 18 | `court` is a slice-only mechanic and is deleted when the tribunal is ported | the tribunal is 1490 old code lines with four mechanics behind it; the slice needs only "a verdict proposed as a decision" |
| 19 | `puzzles` takes the standing of residents from an option at M3 | `progression` is 985 old code lines and not in the M3 row |
| 20 | The reserved kernel returns of M1 1.4 are not taken at M3 | the slice does not need them; taking them without a user would spend the kernel budget blind |
| 21 | M3 has one planned live run, outside the gate, capped at 0.40 USD, 1.50 USD for the milestone | the gate is provable offline; the live path of the Director and the loop still deserves one run before M5 builds on it |
| 22 | Live resume is refused at M3 | model contexts are not in the snapshot; a silent restart with empty contexts would look like a resume and not be one |
| 23 | The loophole section written by a model (M2 decision 18, "completed at M3") moves to M5 | the slice has no live series to write about; nothing in the M3 row asks for it |

Decisions that reach outside M3: 9 and 10 (the options of `turns`), 16 (`contracts` gets a model port), 15
(a new L code; `L001` no longer stands for continuity), 20 (the kernel budget question moves to M5), 23 (an M2
promise moves).

## 16. Open points for the owner

All four were closed on 2026-11-14 by decisions A19 to A22 (`DECISIONS.md` section 9), in the order of the table.

| # | Open | Who closes it | Effect if left open |
|---|---|---|---|
| 1 | The issue budget. D4 with A4 and A12 plans 76 issues for M0 to M2 and kills above 150. M3 has 32; M4 to M6 have no number. Is the line of 150 for the whole rewrite, or is there a new line for M3 to M6? | the owner | none for building M3; the kill check of the M3 gate has no number to check against |
| 2 | The code budget. After M3 kernel + sdk + engine stand at about 3954 of 4100, the kernel at about 1396 of 1500, and M5 still wants about 160 reserved kernel lines (M2 open point 9). Raise the limits, or cut the reserved list at M5? | the owner, before M5 is specified | none for M3 |
| 3 | The live smoke of section 11 (1.50 USD of the 40 USD left). It is not needed for the gate. Run it, or leave live runs of the City to M5? | the owner | issue 30 is skipped; the Director's asker is then first run live at M5 |
| 4 | A pause only between ticks (risk 8). Enough for M3 as specified; is a stop inside a tick wanted at M5 or later? | the owner, at the M5 specification | none for M3 |

## 17. What M3 leaves for M4, M5 and M6

| Milestone | Left for it |
|---|---|
| M4 | the remaining tabletop games and the scheduler `match`; nothing of the City |
| M5 | the full recut of the City: tribunal (replaces `court`), progression (replaces `standings`), the gate, ransom and last will of `exile`, standoff, seal, goals, groups and the treasury of `channels`, marks, receipts, cast, names, motives, petitions, script, arena; the judge and with it the `consult` stage or a two-step event pattern; hooks for blocks above 1; safe points inside a tick, `instruct`, `step`, standing orders; `settleAll`; resume of a live run; Director triggers by `every`, hook and fact; a neutral refusal code in `ledger` when a second mechanic suspends residents; the whole oracle files at level 3, `act2-s7` with its snapshot; the loophole section written by a model; tool limits, `$param`, `texts` overrides |
| M6 | samples 5 and 6, the parallel spike, the editor budget (A9), the mutation gate (E7), the data repository (M2 open point), the release |

## 18. What was checked and how

| Claim | Checked by |
|---|---|
| line counts of old and new code | `scripts/lib/code-lines.ts` over the old tree at `87844a7` and over this branch |
| what the old `onExiled` calls | reading `mechanics/exile/src/{head,gone,index}.ts` |
| the old decision gate is a window with a job, not an awaited stage | reading `packages/kernel/src/host/decisions.ts`; its only user is `closeSession` in `mechanics/tribunal/src/court.ts` |
| the sequence after the first exile in `burn-s7` | reading the oracle file's entries of minute 14 |
| no oracle holds a decision window, the Human Hand or a classifier | counting event types over the five files; `oracles/COVERAGE.md` |
| the kernel treats all actors alike; `submit` and `record` work between ticks; `snapshot` only between ticks | reading `packages/kernel/src/{kernel,actors,dispatch,ports}.ts` and `packages/contracts/src/kernel/` |
| a defaulted scheduler option changes every game hash | reading `resolveGame` (`packages/sdk/src/game/resolve.ts`) |
| what `verifyContinuityText` asks of a resumed log | reading `packages/chain/src/continuity.ts` |
| a cycle of required services is `SWT-G032` | reading `packages/sdk/src/game/load-order.ts` |
| 12 library packages is the limit | `scripts/layers/table.ts` |

**Not checked, and settled by the first test of an issue** (each has a way out without the kernel):

1. how a mechanic refuses an option value that names an unknown actor before the run starts (`decisions.holders`);
   issue 08 uses the earliest refusal the sdk offers and records which;
2. whether a `turnInputs` hook may emit (issue 06);
3. whether `TeamPlanner` gives the same teams with fewer levels in the options (issue 11);
4. whether `Kernel.submit` takes an actor that no scheduler activates (issue 12);
5. how a run folder without `run_ended` closes and verifies (issue 20).

## 19. Challenge log

The draft was read once more as a build agent would read it: each issue alone, with only its allowed paths and
its "start after" issues merged. Severity: A blocks a build, B gives a wrong build, C costs a round trip, D is
wording.

| # | Sev | What was wrong | What was changed |
|---|---|---|---|
| 1 | A | The draft let the Director's driver read its firings from the input lines of its activation. Input lines are text, and filling them in an `inputs` hook would change a slice inside a hook that the scheduler may call without opening an activation | 4.3: the tool `directors.take`; the queue is emptied by a logged call; replay needs nothing special |
| 2 | A | Issue 10 depended on `puzzles` (issue 11) for the `after:` test, and 11 depended on 10 for the order: a cycle in the plan | 10 uses a test mechanic; 11 merges after 10 |
| 3 | A | `afterBlocks` had the default `[]` in the draft. `resolveGame` fills defaults before hashing: every game hash and every `scheduler.optionsHash` would have changed, and the M2 series with them | section 8, decision 10: optional without a default; proving test of 03 |
| 4 | B | The draft said the oracle `burn-s7` is matched "in order" after the exile. The new order between `ledger` and `puzzles` differs | 2.3 and 2.5: projections per source; the change is registered; decision 4 |
| 5 | B | `maxCalls` was counted in the driver. A resumed run would have started the count at 0 | 4.3, 4.4, decision 17: the count is in the plugin's slice and returned by `take` |
| 6 | B | The draft wrote an event `snapshot_taken`. The straight and the resumed log could then never be equal | 7.1, decision 13 |
| 7 | B | Projection 3 copied `needers` from the oracle into the test setup; it would have proven nothing | 2.5, last paragraph: standings and direct messages are fed in, `needers` is computed |
| 8 | B | `decisions` settled open decisions at the end of the run "as the old code does". There is no hook at the end of a run (reserved) | 5.3 rule 5, decision 6 |
| 9 | C | Seven issues of the draft stood at or above 400 lines once their tests were counted (the Director in the sdk, the driver with the asker, `humanHand` with `court` and the run loop, the game with its replay and resume tests, the viewer) | split into 13 and 14, 15 and 16, 18, 19 and 20, 23 and 24, 27 to 29: 32 issues instead of 26 |
| 10 | C | Issues 09 and 18 test calls of the human, but the actor `human` comes with issue 12 | both add the actor by hand in the test; row in 13.3 |
| 11 | C | The scripted asker kept a counter of its own; after `swt resume` it would have answered from the start | 7.2: it reads `calls` from the answer of `take`; hidden dependency row in 13.3 |
| 12 | C | The draft did not say what happens to `--hand` lines after a resume | 7.2 usage line and 13.3: `swt resume` takes `--hand`; lines with `at` below the snapshot's tick are skipped |
| 13 | C | Five claims about the new platform were written as facts without a reading of the code behind them | section 18, second list: each is the first test of a named issue, with a way out |
| 14 | D | The draft used a retired word for the Director's old runner and for residents outside backticks | old names only in backticks |
| 15 | D | Section 1.2 gave the budget after M3 without saying what is left | "about 146 lines are left"; risk 3; open point 2 |
| 16 | C | The game's test of the draft used the run loop of `apps/cli` to play the pause; a game test should not need the command line, and the driver's tests in `engine` used `scriptedAsker` of `models`, which `engine` may not import | 23 plays tick by tick with `testKernel`; the tests of 15 write their asker inline; rows in 13.3 |
| 17 | C | The marker call of 7.2 named no actor; `Kernel.record` needs one | the actor `"script"`, which is an `ActorId` of the contracts |
