# 12 M5 specification: Whispers and the City of Keys, the recut, the Act I base, the API freeze

Status: **specification for milestone M5**, written 2026-11-15. It stands against `rewrite/develop` at `e3792acc`
(M4 built, its review written, decision A47) and the old platform at the branch `legacy` (`a73e6a9`). Builders code
against this file. Precedence: [`BRIEF.md`](BRIEF.md), then [`DECISIONS.md`](DECISIONS.md) (with its addendum A1
to A47, and the rows A48 to A61 that section 14 words and that are entered there with this file), then
[`REWRITE.md`](REWRITE.md), then the specifications of M1 to M4 with their errata, then this file, then papers 01 to
07. Where this file decides something that the papers left open, section 13 lists it. Where it changes a decision
that stands, section 14 holds the ruling as the text of a decision row. Section 8 lists what only the owner can
decide.

**Errata:** `12-m5-spec-errata.md` is started by the first builder who finds a difference between this file and
the code (rows J1 onward, the letter after H of M4; I is skipped because it reads like a number); where the two
differ, the errata hold.

Words as in the earlier specifications. An "old" path is a path on the branch `legacy` (read with
`git show origin/legacy:<path>`, or a detached worktree `git worktree add /tmp/legacy-<you> origin/legacy`).
"Carried" means copied with at most import changes and the renames of M1 section 8.1; carried lines do not count
against the 400-line rule. "Ported" means the same design written against the new contracts. A "code line" is a
non-blank, non-comment line of a `.ts` file (D13); every count of old and new code in this file was measured with
the counter of `scripts/lib/code-lines.ts` (the same TypeScript walk), test files and `test/` folders apart. The old
game is called `cityofkeys` in its folder and `nexus` in older run names; this file says "the City" for both.

**M5 starts after M4-72 is merged** (decision A47: the close of the review of M4, runtime revision 6). Every live
run of M5 is runtime revision 6. M5 plans no revision of its own (section 4.9).

**M5 is done when** (REWRITE section 4, row M5, and section 5 lines 3 and 5, made testable):

1. **Whispers plays on the new platform:** `games/whispers` with the variants `whispers` and `whispers-rumours` as
   params; `runOracle` finds no mismatch at level 3 for each of its three oracle files (and the additions of issue
   11 that were recorded), or the difference is a row of the registered changes in `oracles/whispers/README.md`;
2. **the City plays Act I and Act II on the new platform:** `games/city` with both acts; `runOracle` finds no
   mismatch at level 3 for `cityofkeys-act1-s7`, `cityofkeys-act1-s11` and `cityofkeys-burn-s7`, the resumed file
   `cityofkeys-act1-s7-resumed` equals `cityofkeys-act1-s7` by the rule of A34, and the projections of
   `cityofkeys-act2-s7` find no difference (decision A56); differences are registered changes in
   `oracles/cityofkeys/README.md`;
3. **standing checks:** both games pass the four checks of `11-m4-spec.md` 4.3 (replay; resume from every boundary
   in process; resume from the sampled boundaries through the command line; a fake run that ends without an `error`
   end and holds an accepted call of every resident tool a fake run can reach);
4. **the recut:** the City cluster is ported with the dependency shape of section 2.2: no base mechanic names a game
   mechanic (the gate `base-alone`), no mechanic imports the kernel, there is no service cycle (a new gate), every
   old coupling of the table in 2.3 has its owner on the new side, and `mechanics/shared` has no successor;
5. **budgets:** the kernel is at most 1490 code lines under a gate raised by the issue of A20 (M5-05), kernel + sdk +
   engine at most 4100; every kernel line M5 adds is one of the three reserved parts of section 1.3;
6. **live:** Whispers has a recorded live run of each variant; **a new Act I base snapshot is recorded** at six
   residents (decision A54); one Act II is played live from that base to its end, through `swt resume` of a live run;
   the gamemaker's answers come from a live model (the live proof of A28); every folder verifies, replays equal and
   is clean under `swt scan`; the spend is inside the caps of section 7;
7. **the API freeze:** the frozen surface of section 5 is listed, its gate is in the check with a fixture that
   fails, and the freeze is in force from the merge of the gate of M5;
8. **`GAMES.md`** has the cards of Whispers and the City, and both games are on `games/index.ts` and in
   `scripts/game-docs/catalogue.ts`;
9. the **stop rules and the softer check** of section 9 are answered in writing in `docs/ISSUE-RECORD.md`.

What M5 is **not**: no new game and no new mechanic idea (both need Flo's go; Whispers and the City are ports of
games that exist); **no change of a game's rules, prompt texts, tool names, refusal codes or event payloads** (D2,
D14, A41; section 8 lists what the findings ask for); no generic mechanic with new model-facing names (`ballot`,
`talk`, `removal` of paper 03 wait until after 1.0, decision A50); no run with 12, 48 or 96 residents (`CLAUDE.md`);
no production scheduler beside `turns` and no City run under `parallel`; no stop inside a tick (A22).

**No tabletop game was cut by M4.** REWRITE row M5 begins "a tabletop game that M4 cut, first" (A38). The cut list
of `11-m4-spec.md` 2.6 was never applied: all ten games are ported and match their 58 oracle files at level 3
(`RESUME.md`, "State at the end of M4"; `docs/ISSUE-RECORD.md`, "The softer check of M4": "No stop rule fired, nothing
was cut"). That first item of the row has no case, and M5 starts with the platform items of section 4 and Whispers
(decision A49).

## 1. Scope, packages, budgets

### 1.1 Packages of M5

| Package | Path | Class | What |
|---|---|---|---|
| `@swarmtales/mechanic-marks` | `mechanics/marks` | game | an allowance of messages per level or run; prices on tools of other mechanics; provides the contract `allowance` |
| `@swarmtales/mechanic-names` | `mechanics/names` | game | residents choose a name; provides the contract `identity` |
| `@swarmtales/mechanic-petitions` | `mechanics/petitions` | game | petitions with a threshold and a deadline |
| `@swarmtales/mechanic-receipts` | `mechanics/receipts` | game | numbered proof of a delivered message or a transfer; `showReceipt`; `blame` with a judge |
| `@swarmtales/mechanic-motives` | `mechanics/motives` | game | seeded character (drives, Big Five, figures) in the system prompt |
| `@swarmtales/mechanic-progression` | `mechanics/progression` | game | levels and doors, `submitSolution`, tool unlocks per level, acts, ranking, the task and status lines |
| `@swarmtales/mechanic-cast` | `mechanics/cast` | game | named characters of the city (STEWARD of the feast), escrow, collections |
| `@swarmtales/mechanic-whispers` | `mechanics/whispers` | game | the hidden whisperer, its duty and `forgeReceipt`; the popularity vote |
| `@swarmtales/mechanic-standoff` | `mechanics/standoff` | game | pieces held for others, hand-overs, the ultimatum, the city's shop of pieces of the exiled |
| `@swarmtales/mechanic-standoff-tribunal` | `mechanics/standoff-tribunal` | game | the holdout trial of Whispers |
| `@swarmtales/mechanic-script` | `mechanics/script` | game | the story's rules on time and events, acting through other mechanics as actor `script` |
| `@swarmtales/mechanic-arena` | `mechanics/arena` | game | the City's run frame reduced to its game rules (decision A57) |
| `@swarmtales/mechanic-goals` | `mechanics/goals` | game | a secret goal per resident and act |
| `@swarmtales/mechanic-tribunal` | `mechanics/tribunal` | game | exile by vote: planning, factions, bloc bonus, ransom prices, act target |
| `@swarmtales/mechanic-seal` | `mechanics/seal` | game | the black seal: an all-pay auction for one strike per act |
| `@swarmtales/city-directors` | `mechanics/city-directors` | director (new class, A58) | the gamemaker, the Confessor (the old classifier), the judge, the guard |
| two game packages | `games/whispers`, `games/city` | game package | the games, their story data, their tests |
| `ledger`, `channels`, `exile`, `puzzles`, `decisions` | `mechanics/*` | changed | the parts M3 left out (section 2.4) |
| `kernel`, `sdk`, `engine`, `contracts`, `models`, `runlog`, `testkit`, `apps/cli` | | changed | section 4 |

No package is added under `packages/`. `marks` and `names` are of the class `game` (Challenge 2): the old `marks`
uses `progression` (`levelOf`, old `mechanics/marks/src/index.ts` line 71) and the old `names` uses `puzzles`
(`passwordPiece`, `mechanics/names/src/index.ts` line 57), both game mechanics, so neither can be a base mechanic
(pattern 1 of 2.2). The base mechanics `channels`, `ledger` and `exile` print the name of a resident and the marks
left in their answers; they read these facts through the contracts `identity` and `allowance` of
`mechanics/contracts` (pattern 4), which issue 00 writes and `names` and `marks` provide. `city-directors` is one package for four Directors because two of them (the gamemaker and
the Confessor) are used by both games, and a folder becomes a package when a second consumer needs it alone
(`CLAUDE.md`, "Packages"); a game never imports another game.

No new dependency from the registry is planned. The old Directors used `@earendil-works/pi-agent-core` through
`packages/roles`; on this platform a Director's model is asked through `AskModel` of the models package, and
issue 07 uses the resident session of `packages/models` for the gamemaker. If an issue finds that it needs a
package from the registry, it stops and names it with its licence (`CLAUDE.md`, "Licence").

### 1.2 What the old platform holds

The two games load nineteen old mechanics and three model roles. Old code lines of `src/`, measured on `legacy`
with the counter; old test lines are `test/mechanics/<name>/` (test files and their helpers):

| Old mechanic | Old code | Old tests | Played by | On `develop` today (code, tests) |
|---|---:|---:|---|---|
| `ledger` | 199 | 221 | both | ported at M3 (263, 591): all but `DM_LIMIT` and the receipt of a transfer |
| `channels` | 1676 | 1544 | both | the board, direct messages, notices (459, 424); about 1150 old lines left |
| `exile` | 561 | 758 | both | the event and the suspension (72, 95); the gate, ransom and will left |
| `puzzles` | 1221 | 213 | both | fragment levels, the burn and contract listeners (566, 317); about 650 old lines left |
| `marks` | 230 | 308 | both | no |
| `names` | 206 | 294 | both (Whispers' oracle files play it off) | no |
| `petitions` | 304 | 241 | both | no |
| `receipts` | 509 | 462 | both | no |
| `motives` | 268 | 229 | both | no |
| `progression` | 985 | 557 | both | no (the option `standings` of `puzzles` stands in for it in the slice) |
| `cast` | 320 | 415 | both (Whispers with an empty cast) | no |
| `standoff` | 780 | 987 | both | no |
| `script` | 770 | 642 | both | no |
| `arena` | 373 | 783 | both | no |
| `whispers` | 675 | 520 | Whispers | no |
| `standoff-tribunal` | 1033 | 1031 | Whispers | no |
| `goals` | 402 | 250 | City | no |
| `tribunal` | 1490 | 794 | City | no; `court` (136) is the slice's own court of M3 and stays the slice's |
| `seal` | 483 | 816 | City (Act II) | no |
| `shared` | 726 | | both | its contracts move to their providers; its order tables are dropped (REWRITE 3.4) |
| **sum, without `shared`** | **12,485** | **11,065** | | 1360 ported code lines of these seven so far |

The model roles (old `packages/roles/src`, 3519 code lines in all; tests in `test/gamemaker` 699, `test/overseers`
1088, `test/roles` 428):

| Old role | Old files (code lines) | Played by | Asked how |
|---|---|---|---|
| gamemaker | `overseer/gamemaker.ts` 126, `overseer/gamemaker-runtime.ts` 125, `gamemaker/` 423 (look, privacy, secrets, situation, system prompt), and what they import: `overseer/recent.ts` 101 (the events since the last look), `overseer/chat-answer.ts` 113 (shared by the runtimes of the gamemaker, the classifier and the judge), and the report of the city in old `apps/cli/src/host/report.ts` 97 (`hostGamemakerReport`) | both | every tick after the residents (`schedule: { every: 1 }`), a tool loop: "a look ends when the model calls no more tools" |
| classifier (the Confessor) | `overseer/classifier.ts` 246, `overseer/classifier-runtime.ts` 184, `interpret/classifier.ts` 261, `overseer/statements.ts` 41 | both, off in every oracle file | every tick before the gamemaker; the answer is a `label` call per batch; fail open |
| judge | `overseer/judge.ts` 80, `overseer/judge-runtime.ts` 40, `interpret/judge.ts` 128 | both (the tool `blame` is in both games' grants: `setup.residentTools` of `whispers-s7.json` and `cityofkeys-act1-s7.json`; the judge asks the classifier's model, old `apps/cli/src/main.ts` line 246) | inside the call of `blame`, in the pipeline stage `consult` |
| guard | `interpret/guard.ts` 126 | Whispers (`guards: true`) | inside a guarded call (`postBoard`, `postGroup`, `transferPoints`, `createGroup`), in the stage `guard`, after the city's own check of `puzzles` (old `packages/kernel/src/host/waits.ts`, `guardStage`: the mechanics' `guardLeak` first, verdict `by: "check"`; then the model, `by: "model"`); fail open |
| weaver, fate, souffleur | `overseer/weaver*.ts` 290, `interpret/weaver-model.ts` 159, `overseer/fate.ts` 133, `interpret/fate-triggers.ts` 117, `interpret/souffleur.ts` 105 | neither game's default; flags of the old command line | not ported before 1.0 (A58) |

The two old game files: `stories/whispers/story.ts` (381 code lines) and `stories/cityofkeys/story.ts` (547) with
`characters.ts` (342) and 24 figure texts under `stories/cityofkeys/cast/` (35 to 80 lines each). They are old
`StoryDefinition`s; the old command line turned a definition and the run's dials into mechanic options in
`apps/cli/src/host/story.ts` (209, the table R2-D17) with `direction.ts` (85) and each mechanic's `*FromStory`
function. The old story format is dropped (REWRITE 3.5); section 3.1 says what is carried instead. Old game tests:
`test/stories/whispers.test.ts` 256, `whispers-direction.test.ts` 221, `cityofkeys.test.ts` 301,
`cityofkeys-levels.test.ts` 256, `cityofkeys-tribunal.test.ts` 434, `cityofkeys-wall.test.ts` 233,
`cityofkeys-beats.test.ts` 81.

What the nineteen mechanics need from the platform, found by a search of the hook names, stage handlers and context
calls in their `src/` (not by reading all 12,485 lines):

| Need | Old users | On `develop` | M5 |
|---|---|---|---|
| tick start and end, `news`, `turnInputs`, jobs, limits, facts, locks, listeners | all | yes | used as they are |
| `turnOpened` / `turnEnded` | `arena`, `channels`, `progression` | yes since M4-16 (`activationOpened`, `activationClosed`) | used; `channels` can then serve blocks above 1 (section 2.4) |
| the pipeline stages `lock`, `rule`, `after` | many | yes | used |
| `settle` | `names`, `receipts`, `standoff`, `tribunal` | no handler; `after` runs at the same point | written as `after` (section 1.3) |
| `afford` | `marks` | no handler | written in `rule` with a first test (issue 17) |
| `guard` (code) | `puzzles` (the hand-over guard, old `guard.secrets` and `guard.leaks` of its body) | no handler | a `review` handler of `puzzles` that answers at once (issues 04 and 18): the old check and the old model question are one stage, and the file `whispers-s7.json` logs the check's refusal at stage `guard` with a `core.guard_verdict` of `by: "check"` |
| `guard` and `consult` that **await a model** | Whispers' guard; `receipts.blame` with the judge | no | **the stage `review`** (issue 04) |
| staged calls (`ctx.stage`, actor `script`, the `then` job) | `script` (`directorMinute`), `petitions` (`resolvePetition`) | no | **issues 02 and 03** |
| `runEnded` | `arena`, `channels`, `petitions`, `progression`; `decisions.settleAll` (M3) | no | **issue 01** |
| per-plugin actor attributes, `schedule.every` | none found | no | not built: a slice and a service; a job that sets itself again |
| a Director woken every tick, reading the game's facts, acting by tool use | the gamemaker, the Confessor | woken by events only, reads its firings, asks once | **issues 06 and 07** |
| a live run resumed with the residents' contexts | every Act II run (old snapshot format 2: "agent contexts") | no: `swt resume` plays fake only | **issues 08 and 09** |

### 1.3 Code-line budgets

Measured on `e3792acc` with `scripts/lib/budget.ts`, and again by the challenge on `390448db` (M4-72 merged): the
kernel and the engine are unchanged, the sdk is at 2107 (M4-72 took 8 lines, `docs/ISSUE-RECORD.md` row 235). Issue
00 writes these numbers into the record.

| Package | Today | M5 may add | After M5, at most | Limit |
|---|---:|---:|---:|---|
| `kernel` | 1402 | **88** (issues 01, 02, 04 only) | 1490 | gate raised from 1420 to 1490 by issue 05 (A20), hard 1500 |
| `sdk` | 2107 (2099 before M4-72) | **80** (issues 01, 03, 04, 06, 07) | 2187 | |
| `engine` | 360 | **25** (issues 04, 07, 09) | 385 | |
| **kernel + sdk + engine** | **3869** | **193** | **4062** | **4100** (A20) |
| `contracts` | | about 40 | | none |
| `models`, `runlog`, `testkit`, `apps/cli` | | about 1500 together | | none |
| fifteen new mechanics and the four changed | | about 11,100 carried (old: 12,485 less the 1360 ported) | | none |

What each part may take, exactly:

| Part | Kernel | Sdk | Engine | Issue | Reserved since |
|---|---:|---:|---:|---|---|
| the hook `runEnded`, `decisions` settles what is open | 8 | 5 | 0 | 01 | M1 1.4, M3 1.3 |
| staged calls: `port.stage`, the actor `script`, the `then` job, "run staged calls" after every step | 65 | 20 | 0 | 02, 03 | M1 1.4 |
| the stage `review` (the old `guard` and `consult` that await an answer, merged; the lane held) | 15 | 20 | 15 | 04 | M1 1.4; DECISIONS paper 01 #4 and #6 |
| Directors: woken every n ticks, the game's facts in the context, a review answered by a Director | 0 | 30 | 0 | 06 | M3 1.3 ("Director triggers other than an event") |
| a Director that acts by tool use (REWRITE 3.6, "the declared exception") | 0 | 5 | 5 | 07 | REWRITE 3.6 |
| a live resume (the manifest of a resumed live run) | 0 | 0 | 5 | 09 | M3 1.3 |
| everything else of M5 | 0 | 0 | 0 | | |

**The parts that get no kernel line** (A40 and A51), each with its way:

| Reserved | Way without kernel lines |
|---|---|
| `afford`, `settle` (10 booked) | `settle` is `after` (it runs after `execute` on success, as `settle` did). `afford` (only `marks`) is a check in `rule` and a charge in `after`. A tool's own `rule` runs before the `rule` handlers of other plugins (`packages/kernel/src/dispatch.ts`), so where a call both breaks the tool's rule and has no marks left, the resident now reads the tool's refusal where the old pipeline gave the refusal of `marks` (stage `afford`, before `rule`). **No oracle file holds a refusal of `marks`** (the refused calls of the eight files are `INCORRECT`, `INVALID_FORMAT`, `TOOL_LOCKED`, `SELF_VOTE`, `INVALID_COUNT`, `UNKNOWN_FACTOR`, `GUARD_BLOCKED` and `DOOR_CLOSED`), so the first test of issue 17 is built from the carried tests of `test/mechanics/marks`: every carried case of a call that is out of marks, run with a tool rule that refuses too, and the answer compared with the old one. **Way out:** the two stage handlers in the kernel (10 lines, kernel at 1500, the hard limit, by a decision row), else a registered change in `oracles/cityofkeys/README.md` that names the case |
| `guard` as code (the hand-over guard of `puzzles`) | a `review` handler of `puzzles` on the guarded tools by bare name (section 4.3): the check answers at once with a refusal (code `GUARD_BLOCKED`, stage `guard`) or lets the call on to the guard's question; no kernel line beyond the 15 of the stage |
| per-plugin actor attributes (20) | the slice of the mechanic that keeps them, read through its service (as M3 and M4 did) |
| `schedule.every` (10) | a job that sets itself again with `schedule.at` |
| `kit.on` (5) | not needed: every listener of M5 listens to a mechanic's event |
| `Kernel.stop`, `SchedulerPort.safePoint` | dropped by A22 |

**When a part does not fit.** A builder who would cross a number of this table stops the part, writes the measured
lines and the missing extension point into `docs/ISSUE-RECORD.md`, and the integrator decides. The ways out, in this
order:

1. **Staged calls above 65 kernel lines:** first drop the `then` job from the kernel (the job that follows a staged
   call becomes a listener of `script` to its own event `director_action`); then `petitions` resolves a petition in
   its own hook without a staged call (a registered change: the resolve is no call entry of actor `script`). If it
   still does not fit, the issue stops: `script` cannot act as an actor without staged calls, and that is a decision
   of the integrator by a decision row.
2. **The review stage above 15 kernel lines:** no second stage is built; `guard` and `consult` stay one stage with
   one answer record. Next, the `review` handler of another plugin is dropped: the guard's check becomes a `rule`
   handler of `puzzles` (its refusal is logged at stage `rule`, a registered change of the three Whispers files),
   and the guard's question to a model is not built, so the guard plays as on `legacy` without a guard model (only
   the check, old `by: "none"`); that changes live play of Whispers and needs a decision row. Above that, the issue
   stops and reports. There is no way that keeps the old replies: the reply
   of `blame` holds the judge's verdict (old `mechanics/receipts/src/blame-tool.ts`, `consult`), and a refusal
   `GUARD_BLOCKED` is the reply of the guarded post. A pattern of two steps (the call is accepted, a Director rules
   later) changes a model-visible reply and is a rule change (A41, section 8).
3. **The sdk above 80 lines:** the builder names the line and the integrator books it; the total keeps 38 lines.
4. Never: raising the hard limit of 1500 or the total of 4100 inside M5, or moving platform code into a package
   outside `ENGINE_FOLDERS`. The Director that acts by tool use lives with its driver in `packages/models` and the
   driver table of `apps/cli` (issue 07), which is where the resident session lives today; that is not code moved
   next door, it is the model port, and the engine gets only the branch that hands the Director to it.

**What is left after M5.** Kernel 1490 of 1500, total about 4062 of 4100: the kernel has room for no further

reserved part. M6 builds samples 2 to 4, the run-time check of service calls (A37, in the sdk) and the packed
install; each costs no kernel line by its plan, and the softer check of M5 says so in writing (section 9).

### 1.4 What stays reserved and must not be built at M5

| Reserved | Stays for |
|---|---|
| `afford`/`settle` handlers in the kernel, actor attributes, `schedule.every`, `kit.on`, `ctx.log`, `kit.kernel` | not built (1.3); a later issue that names a game and the measured lines |
| `Kernel.stop`, `SchedulerPort.safePoint`, an intervention inside a tick (A22) | after 1.0 |
| the Human Hand's `instruct`, `step`, standing orders | after 1.0, or an issue that names a game that needs them (neither game does by default) |
| generic mechanics with new model-facing names (`ballot`, `talk`, `removal`, `trial`, `holdings`, `doors`, `split-secret`, `objectives` of paper 03 4.2) | after 1.0 (A50) |
| the weaver, fate and the souffleur (old model roles behind flags) | after 1.0 (A58) |
| a data game with a Director (errata P2 of M3) | M6 (A61) |
| tool limits, `$param`, game `texts` overrides | first user |
| the game frame of D9 | after 1.0 (A31) |
| runs with 12 or more residents; Act II comparisons used as evidence (two more bases, D8 of paper 02) | after M5, by the owner's go (section 8) |
| `parallel` as anything but the sample; a City or Whispers run under it | after 1.0 (A30, A41) |
| game-specific viewer views, the game tab | M6 |

### 1.5 Where M5 starts, and what runs beside it

M4 is closed by its review (A47) once M4-72 is merged. The open points of M4 that reach M5:

| From M4 | What M5 does with it |
|---|---|
| the softer check of M4: staged calls and `runEnded` fit, the rest of the reserved list does not; the gate of 1420 is raised by the issue of A20 | section 1.3; issue 05 raises the gate to 1490 with the measured lines of 01, 02 and 04 |
| A40: "M5 builds the rest without kernel lines or not at all" | kept for every part but the review stage, which A51 takes with its evidence (15 lines) |
| errata Q3: Convoy's 44 news wakes of the talk (P477) | not M5: a change of Convoy's wake rule is a rule change (A41); it waits for a Convoy series (A61) |
| errata Q5: `BAD_CLUE` in the Lanterns list; a run refused before any model call is charged nothing | not M5: M5 plays no experiment series, only single runs under a ledger (section 7); it waits for the next Lanterns series |
| `parallel` was never played live | stays so (A30); section 9 says it in the softer check |
| A28: the live proof of a Director's model port, of an amendment that lands and of the exile moves to M5 | the gamemaker of the Whispers smoke is the Director's live answer; the exile is played live in Act II; an amendment is the human's act and needs no live model, so it stays proven by the slice's hand file offline (section 7.4) |
| the tags `runtime-r4`, `runtime-r5`, `v0-final` | owed by the owner (section 8) |

Nothing else runs beside M5. The city slice (`games/city-slice`) stays as M3 built it: its committed timelines are
proofs and must stay byte-equal through every M5 change of `ledger`, `channels`, `exile`, `puzzles` and `decisions`
(a proving test of each issue that touches them).

## 2. The recut of the City cluster

### 2.1 What "recut" means at M5

REWRITE 3.4 asks for a recut "under the rule of two"; DECISIONS paper 01 #9 says "recut at M5, Whispers first, no
'port as is' fallback", because `mechanics/shared`, which "as is" needs, is deleted. D14 and A41 forbid changing what
a model reads. Decision A50 joins the two: **the recut changes who owns a rule and how mechanics reach each other,
never what a resident or a Director sees or calls.**

| Changes | Does not change |
|---|---|
| package dependencies, `requires` and `uses`, the place of a rule (the owner of the pieces burns them, not `exile`) | tool names, parameter schemas and descriptions, prompt files, reply strings, refusal codes and texts, event types and payloads, option names and defaults, random labels, the wake rule |
| who calls whom: events before calls, a listener in place of an "onX" call | the order of events **within** one source |
| the order of events **between** two sources, where a listener now follows its event (a registered change, as M3 2.3) | the scheduling of resident turns (level 3) |
| contracts move from `shared` to their providers, or to `mechanics/contracts` when two providers exist | |
| the old command line's option mapping (R2-D17) becomes the game family of each game (section 3.1) | |

The generalisations of paper 03 4.2 (`ballot` for six vote implementations, `talk` for five chats, `removal` for
`exile`) each change model-facing names (`castBallot` for `vote` and `tribunalVote`). They wait until after 1.0
(A50). Where two mechanics of the cluster share rule code (the secret vote of `tribunal` and `standoff-tribunal`,
the deadline of `petitions` and `seal`), a port may move it into the `/rules` export of one of them and import it in
the other; no new mechanic is created for it.

### 2.2 Patterns of the recut

Each port follows these five patterns; a port that cannot names the coupling in its README and in the errata.

1. **A base mechanic names no game mechanic** (gate `base-alone`, M4-03). It reads only another base mechanic or a
   contract of `mechanics/contracts`, through `uses` (`tryCall`); it never `requires` one.
2. **The owner of a rule enforces it in its own stage handler.** A game mechanic that adds a rule to a tool of a base
   mechanic (the hand-over guard of `puzzles` on `postBoard`, the prices of `marks` on `sendDM`, the locks of
   `progression` on every level-managed tool) does so in its own `lock`, `rule`, `review` or `after` handler, by the
   bare tool name (`ctx.access` of M4-64 for locks; the `review` handler of section 4.3 for the guard).
3. **Events before calls.** What a mechanic causes it announces; who cares listens (M3 2.3). A mechanic calls a
   service only for an answer it cannot go on without (a balance, a level, a receipt number).
4. **A contract with two providers lives in `mechanics/contracts`** (as `brain-source` and `consensus-source`). New
   at M5, all three written by issue 00 so that every consumer and provider can be built against them in any wave:
   `identity` (the display name of an id: `names`, or the id itself when `names` is not loaded), `allowance` (the
   marks left to a resident, `n/m`: `marks`; none when it is not loaded, and the old reply then carries no marks
   part) and `receipt-source` (the number of a receipt for a transfer or a delivered message: `receipts`; none when
   it is not loaded, and the old answer then says `none`). A contract with one provider stays in its provider's
   `/contract`.
5. **No service cycle.** If A asks B, B never asks A, also not through a third mechanic. A gate reads the
   `requires` and `uses` of every mechanic head and fails on a cycle (issue 00 writes it, with a fixture).

### 2.3 Every old coupling and its new owner

The couplings of the old `requires` and `uses` lines (paper 03 1.1) that cross from a base mechanic to a game
mechanic, or form a cycle, and where each goes. A row that names an issue is that issue's done-when.

| Old coupling | New owner, and how | Issue |
|---|---|---|
| `channels` R `marks`: the price of a message, `marks n/m left` in the reply | `marks` (game) prices the tools in its own handlers; `channels` reads the count left through `allowance` of `mechanics/contracts` for its reply, only when a provider is loaded | 00, 14, 17 |
| `channels` R `names`; `ledger` and `exile` U `names`: a name in place of an id in every text | `identity` of `mechanics/contracts`, provided by `names`; read by `channels` (14), `ledger` (12) and `exile` (15) | 00, 12, 14, 15, 16 |
| `marks` U `progression` (`levelOf`, the allowance per level); `names` U `puzzles` (`passwordPiece`, a chosen name may hold no piece of a password) | game to game through the provider's `/contract`: `progression` (19) and `puzzles` (18) add the two methods; `marks` and `names` are built after them | 17, 16 |
| `channels` U `receipts`; `ledger` U `receipts`: the receipt number in a reply | `receipt-source` of `mechanics/contracts`, provided by `receipts` | 12, 14, 21 |
| `channels` U `cast`, `standoff`, `standoff-tribunal`, `puzzles`, `progression`, `motives`, `goals`, `whispers`, `exile` | each of them listens to the events of `channels` or adds its rule in its own handler; the status and digest inputs of `channels` are each mechanic's own `turnInputs` lines | 14 and each mechanic's issue |
| `channels`: the gamemaker's note desk (`notes.ts`, `gamemaker.ts`) and `defy` | stays in `channels` as a service and tool for any Director's private note (`notes`), with no game word in an id; `standoff-tribunal` requires it as before | 14 |
| `channels`: the checks of a Director's note (old `notes.ts` `checkNote`: the length, `secret-guard.ts` with `PuzzlesApi.secrets`, the private thoughts read from the Confessor's `interpretation` events, the core motives and goals through `MotivesApi.cuesOf` and `GoalsApi.goalOf`, the whisperer's role through `whisperer.ts`, the repeat) | each check of a game fact moves to its owner as a `rule` handler on the note tools by bare name (pattern 2): the secrets to `puzzles`, the motives to `motives`, the goals to `goals`, the role to `whispers`; `channels` keeps the length and the repeat. The old order of the checks is length, secret, thoughts, motive, role, repeat; the new order is the tool's own rule (length, repeat) and then the handlers in load order, so a note that breaks two checks can get another refusal. **First test of issue 14:** every carried note case of `test/mechanics/channels` that breaks two checks, with the answer compared; way out: a registered change that names each case. The check of the private thoughts has no owner among the mechanics (it reads a Director's events): open, see the list at the end | 14, 18, 23, 26, 40 |

| `ledger` U `channels` (`dmWindow`, the refusal `DM_LIMIT`) | `channels` owns the window; `ledger` refuses through a `rule` handler of `channels` on `transferPoints`, or keeps reading the window through the service of `channels` (both base) | 12 |
| `exile` R `progression`, `standoff`, `puzzles`; U `seal`, `goals`, `tribunal` (M3 cut these in `onExiled`) | each owner listens to `exile.exiled`; the prices of ransom and will come in the call of the caller (`tribunal` passes them), not by `exile` asking `tribunal` | 15, 20, 27, 40, 44 |
| `progression` R `puzzles`, `receipts`; U `cast-extras`, `marks`, `names`, `standoff-tribunal` | `progression` owns levels and doors; `puzzles` is asked for the pieces of a level (one direction only); `receipts` charges a blame through `progression`'s service and not back | 19, 20, 22 |
| `puzzles` U `progression`, `channels` (`dmRecords`), `exile` | `puzzles` reads the standing of a resident from `progression` (replacing the M3 option `standings`, which stays for the slice), the direct messages from `channels` (both directions were "uses"; only `puzzles` asks now) | 18 |
| `receipts` U `puzzles` (`carriesSecret`), `progression` (`chargeBlame`, `ranking`), `exile`, `marks` | `receipts` asks; nobody of them asks `receipts` back except through `receipt-source` | 21, 22 |
| `standoff` U `tribunal` (`ransomPrices`), `tribunal-view` | the prices are passed by `tribunal` when it opens a gate; `standoff` listens | 27, 41 |
| `seal` R `tribunal`, `exile` | `seal` uses the strike of `exile` and listens to the tribunal's events; `tribunal` does not ask `seal` | 44 |
| `goals` U `exile`, `motives` | listeners | 40 |
| `arena` R `progression`, `ledger`; U `exile`, `tribunal-view`, `ending` | `arena` asks `progression` and `ledger` (one direction); `ending` has no provider and is dropped | 33 |
| `script` U seven mechanics | `script` acts only through tools of its grant, as the actor `script` (staged calls); it calls no service but reads | 31, 32 |
| `whispers` R `receipts`, `channels`, `ledger`, `marks`; U `exile`, `names`, `puzzles` (`isHandover`) | `whispers` asks; `forgeReceipt` uses the service of `receipts` | 26 |
| `motives` R `channels`; U `whispers` (`whisperer`) | `whispers` provides the whisperer's id through its contract; `motives` asks it (one direction) | 23, 26 |

### 2.4 The parts of the four mechanics of M3 that M5 adds

| Mechanic | Old parts left out at M3 (old code lines) | Also | Issue |
|---|---|---|---|
| `ledger` | the refusal `DM_LIMIT`, the receipt of a transfer | through the window of `channels` and `receipt-source` | 12 |
| `channels` | `groups.ts` 315, `group-actions.ts` 100, `treasury.ts` 85 | the group tools `createGroup`, `addGroupMember`, `removeGroupMember`, `leaveGroup`, `listMyGroups`, `postGroup`, `readGroup`, `depositGroup`, `withdrawGroup`, `setTreasurer`; events `group_*`, `treasury_*` | 13 |
| `channels` | `privacy.ts` 93, `notes.ts` 92, `gamemaker.ts` 46, `defy.ts` 29, `optional.ts` 8, `dmWindow`, the digest and status inputs; `secret-guard.ts` 47 and `whisperer.ts` 13 move out (2.3) | the "seen" mark of the board on the activation hooks, so `channels` serves `blockSize` above 1 (`10-m3-spec.md` 8; the City's `blockSize: "auto"` is 1 at six residents) | 14 |
| `exile` | `slice.ts` 103 (the gate), `ransom.ts` 44, `will.ts` 83, and the rest of `index.ts` | tools `payRansom`, `lastWill`; events `exile_gate`, `ransom_paid`, `ransomed`, `last_will` | 15 |
| `puzzles` | `additive.ts` 204, `text.ts` 76, `report.ts` 60, `guard.ts` 52, `resume.ts` 34, `secrets.ts` 30 | `factors_dealt`, `factor_revealed`; the hand-over guard as a `review` handler (the check, then the guard's question with the author's secrets); `passwordPiece` in a new `/contract` for `names`; `progression` replaces `standings` in the two games | 18 |

| `decisions` | `settleAll` at the end of a run | on `runEnded` | 01 |

Every one of these is off, or has no effect, in the city slice: the slice grants none of the new tools and loads
none of the new mechanics, and its timelines stay byte-equal.

### 2.5 Rules of a port

As `11-m4-spec.md` 2.2, with its rules 1 to 10, and with the lessons of M4 written into the rules:

1. **Two issues per game at least**, the mechanics first (each carried, split to the file limits, its carried
   tests green, a `sample` function for every resident tool), then the game with its oracle files. Additions
   (metrics, the family's extra params) come after the oracle files match (M2 decision 16).
2. **Turn inputs in the old hook order** (errata H9 of M4): a line of a source not named in the scheduler option
   `inputs` comes in load order, which is not the old hook order. The game names every input source in `inputs`, in
   the order of the old `HOOK_ORDER.turnInputs` numbers of `legacy` `mechanics/shared/src/order.ts` (as
   `games/harbor-lights/game.ts`, `games/lanterns/game.ts` and `games/holdem/game.ts` do). The files' status line is
   one line of five sources (`"source": "progression+ledger+marks+receipts+channels"`, `[status] minute 6 · level 1
   · 10 points · …`): each mechanic writes its part with kind `status` and the `order` of the old status parts
   (`mechanics/shared/src/turn-input.ts`), and the game's `inputs` names `{ kind: "status", join: " · " }`, which the
   scheduler joins with the sources in part order (`packages/engine/src/turns/inputs.ts`, `arrange`). The same holds for the
   tick hooks: a mechanic that ran before another at `minuteStarted` or `minuteEnded` runs before it here, by load
   order or `after:`; the port names each `after:` it needed.
3. **`call.endsTurn`** is carried by no oracle file. No mechanic of the cluster sets it on `legacy` (checked by the
   search of 1.2; the game issue checks it again); the game's oracle test maps it to `false` with the testkit's
   `withEndsTurn` and adds the registered note to `oracles/<game>/README.md`.
4. **Resume key order** (A43): snapshot files are canonical, keys sorted. A mechanic's `snapshot.load` rebuilds its
   state with `inSchemaOrder(Slice, data)` from `@swarmtales/sdk`, or an event writes its object fields explicitly.
   Each game's standing test runs `checkResumeEveryBoundary` on scripted and fake runs and expects `[]`.
5. **Registry lines** a game issue may touch without asking: `games/index.ts`, `scripts/game-docs/catalogue.ts`
   (with `pnpm docs:games`), `GAMES.md` (the card, the overview row, the "(ported)" mark, the two counts near the top
   and the bottom), `pnpm-lock.yaml` for a workspace link or a dependency that moves to runtime, the root
   `tsconfig.json`, and the generated README block of another mechanic that `pnpm docs:mechanics` rewrites. A
   mechanic package lists its export name in `package.json` `swarmtales.mechanics` (`standoffTribunal`, not
   `standoff-tribunal`; errata H14).
6. **The runtime revision is 6** after M4-72. A port changes no wake rule and no context rule, so it raises nothing.
   A run index row names revision 6.
7. **`carried.test.ts` of each game** pins the sha256 of every prompt file of its mechanics and Directors, of the
   figure texts, of the story data (section 3.1) against `oracles/<game>/setup/*.story.json`, and of every tool name
   list, computed on `legacy`. A prompt file that holds a word the name lint retires stays as it is and goes on the
   lint's list of carried texts (`scripts/lib/names.ts`).
8. **The model blocks of the old story are carried into the game file** byte for byte, as part of the game hash:
   Whispers' residents `anthropic` `claude-haiku-5-5` thinking `low`; the City's residents as its old entry
   (`openrouter` `z-ai/glm-5.3-flash`, thinking `medium`, which every old City run replaced with `--provider
   anthropic`); the gamemaker `openrouter` `deepseek/deepseek-v4.1-flash-1017`, thinking `high`, `maxOutputTokens`
   393216; the Confessor and the guard `anthropic` `claude-haiku-5-5`, thinking `off`. A live run of M5 replaces a
   model by a recorded flag of the run, never by an edit of the game (section 7, A52).
9. **A refusal that the old code threw as a bare error** becomes a refusal of the family's params with a code of
   the game's own catalogue; the port names the code.
10. **The city slice stays byte-equal** (1.5): every issue that changes `ledger`, `channels`, `exile`, `puzzles` or
    `decisions` runs the slice's timeline tests and the M3 projections of `oracles/cityofkeys/README.md` unchanged.
11. **Every new tool has a `sample` function**, and a Director's tools are reachable by a fake run through the
    fake asker of the models package (issue 07).

## 3. The two games

### 3.1 What a game file holds

The old story format is not carried (REWRITE 3.5). What is carried instead:

| Old | New, in the game package | Why |
|---|---|---|
| the story definition (`stories/<game>/story.ts`: levels, texts, rules, cast, tribunal, seal, goals, names, motives, the gamemaker's brief) | `src/story.ts`: the same data as typed constants, carried; `carried.test.ts` pins that it serialises to the content of `oracles/<game>/setup/<name>.story.json` | the texts are prompt texts (D14); the setup files are the old platform's own dump of the definition |
| the old sdk helpers the definition uses (`level`, `puzzle.fragments`, `ladderText`, `onFirstEnter`, `team`, `act`) | carried into `src/story/` of the game (old `packages/sdk/src/define.ts` 405 and `rules.ts` 36, only the functions the two games call) | they build data; they are no authoring API of the new platform |
| the option mapping R2-D17 (`apps/cli/src/host/story.ts` 209, `direction.ts` 85, the `*FromStory` functions) | `src/compose.ts` of each game: the family's params and the story data give each mechanic its options, the grants and the scheduler options | it is the game's own rule of how its parts are set up |
| the run dials (`agents`, `minutes`, `seed`, `startLevel`, `lastLevel`, `stopWhenDone`, `stopWhenSeatsDecided`, `activation`, `passesPerMinute`, `blockSize`, `personas`, `gamemaker`, `classifier`, `names`, `coreMotives`, `figureDirection`, `gmDirection`, `whisperer`, `guards`) | typed `params` of the family; the default params give the old story's defaults; the oracle files' `setup.definition.effective` give the oracle variants | REWRITE 3.5; rule 7 of M4 2.2 |
| the variants `whispers`, `whispers-rumours`, `cityofkeys-burn`, `cityofkeys-act2` | params (`receipts: false` for rumours; the burn file's reduced City as a setup of the oracle test, `oracles/cityofkeys/setup/cityofkeys-burn.story.json`; Act II is the same game played on from Act I) | |

Both games run on `turns`. The old dials become: `passesPerMinute` to `passes`, `activation: "onNovelty"` to
`"onNews"` and `"always"` to `"always"` (every oracle file of the two games plays `"always"`, `setup.turns`),
`blockSize: "auto"` (one block per six residents) to `blockSize: 1` at six residents (the family refuses
another number of residents at M5 with a code of the game's catalogue, since no larger run is allowed before Act II
works with six), the old order to `order: "seeded"` (first test of issue 38: the seeded order of the new `turns` at
seeds 7 and 11 is the order of the files' `turn` entries; in both games' files minute 0 is `A01 A03 A06 A04 A05
A02`). Directors run in the slot `afterBlocks: ["director"]` of M3 8, the Confessor before the gamemaker, as the old
`OVERSEER_ORDER`.

### 3.2 Whispers

| Part | Value |
|---|---|
| Residents | six, `A01` to `A06`; one seeded whisperer (`whisperer_chosen`), never named |
| Ticks | 45 (oracle files: 20) |
| Mechanics, in the old load order | `ledger`, `marks`, `names`, `channels`, `petitions`, `receipts`, `whispers`, `motives`, `puzzles`, `progression`, `cast`, `standoff`, `exile`, `standoff-tribunal`, `script`, `arena` (from `setup.mechanics` of the files) |
| Directors | the gamemaker (looks every tick, the role `keeper`), the Confessor (`classifier: true` by default, off in the files), the guard (answers the review of guarded calls), the judge (answers the review of `blame`, which is in Whispers' grant; old `apps/cli/src/main.ts` line 264 starts it whenever the story has a classifier and a level grants `blame`) |
| Resident tools | 31 (`setup.residentTools` of `whispers-s7.json`; `whispers-rumours` has no `forgeReceipt`) |
| Old runs | 8 (`stories/whispers/runs/`), 2026-10-30 and -31, revision 1: Haiku residents 0.13 to 0.47 USD, one DeepSeek run 1.27 |

### 3.3 The City

| Part | Value |
|---|---|
| Residents | six, `A01` to `A06` |
| Ticks | 80 in all (oracle files: Act I 12, burn 40, Act II 60 from a saved first act) |
| Mechanics | `ledger`, `marks`, `names`, `channels`, `petitions`, `motives`, `receipts`, `puzzles`, `progression`, `cast`, `goals`, `standoff`, `exile`, `tribunal`, `seal`, `script`, `arena` |
| Directors | the gamemaker (teacher in Act I, keeper in Act II), the Confessor, the judge (answers the review of `blame`) |
| Acts | Act I "Learning to talk", levels 1 to 7; Act II levels 8 to 10 with tribunals, factions, the black seal, secret goals, the feast of STEWARD on door 10 |
| Resident tools | 34 (`setup.residentTools` of `cityofkeys-act1-s7.json`) |
| Old Act I bases | `examples/cityofkeys-act1-06a-01`, `-02` and `-04` on `legacy` (`-03` only in the archived commit `d13350b`) and two of 12 residents; six-resident cost 0.097 to 0.127 USD for the three on `legacy` (Haiku residents, DeepSeek gamemaker, Haiku classifier), 189 to 291 requests |
| Old Act II runs | v01 to v12 and runs 013 to 019 at six residents (0.21 to 3.05 USD), revision 1 |

### 3.4 Oracle files: what exists, what each proves, what is missing

The files exist (issue 2 of M0, runtime revision 2, scripted). Levels as in `oracles/README.md`: 1 rules (calls,
answers, events), 2 texts (the inputs of a turn), 3 scheduling (the order of turns and skips).

| File | Ticks | Entries | Source | Target at M5 | Issue |
|---|---:|---:|---|---|---|
| `whispers/whispers-s7.json` | 20 | 561 | scripted (`whispersResidents`, `whispersGamemaker`) | level 3 | 38 |
| `whispers/whispers-s11.json` | 20 | 561 | the same | level 3 | 39 |
| `whispers/whispers-rumours-s7.json` | 20 | 563 | the same, no receipts to show | level 3 | 39 |
| `cityofkeys/cityofkeys-act1-s7.json` | 12 | 779 | scripted (`cityActOne`, `cityGamemaker`) | level 3 | 45 |
| `cityofkeys/cityofkeys-act1-s11.json` | 12 | 785 | the same | level 3 | 46 |
| `cityofkeys/cityofkeys-act1-s7-resumed.json` | 12 | 780 | the same, saved after minute 6 | equal to `act1-s7` by A34 | 46 |
| `cityofkeys/cityofkeys-burn-s7.json` | 40 (ends at 31) | 782 | scripted, a reduced City (no acts, goals, seal) | level 3 | 46 |
| `cityofkeys/cityofkeys-act2-s7.json` | 60 (ends at 59) | 883 | scripted, **from the old snapshot `examples/cityofkeys-act1-06a-01/snapshot-L7.json`** | projections at level 1 (A56) | 47 |

Done-when 1 and 2 hold for the additions of issue 11 too: addition 1 and 3 at level 3, addition 2 (from the same old
snapshot as `act2-s7`) by projection at level 1, as A56 says for its file.

**What no file covers**, from the "Not covered" paragraphs of the two READMEs and the files' `setup`:

| Not covered | Where it should be proven | How |
|---|---|---|
| the Confessor: `classifier: false` in every file | issue 36 | the carried tests of the old classifier (`test/overseers`, the classifier cases) and a scripted run of each game with the Confessor on whose `interpretation` events are pinned |
| Whispers' holdout trial beyond `blocker_found` (grace, votes, a lot, the strike) | issues 29, 30, 39 | addition 1 of issue 11; way out: the carried tests (1031 lines) |
| Whispers after minute 20: doors 5 to 7, the final vote | issue 39 | the carried story tests (477 lines) |
| `names` in Whispers (`names: false` in its files) | issue 16 | the City's files play it |
| the guard's question to a model (each Whispers file has one guarded call, refused by the city's check with `by: "check"`) | issues 18 and 37 | the carried `test/interpret/guard.test.ts` of `legacy` and a scripted answerer in 18's tests |
| a staged call of `resolvePetition` (no file holds one) | issue 25 | the carried tests of `test/mechanics/petitions` (241) |
| the black seal beyond its opening (a bid, a winner, a strike) | issue 44, 47 | addition 2 of issue 11; way out: the carried tests (816 lines) |
| levels 8 to 10 played to their end; the feast of STEWARD | issue 47 | the carried `cityofkeys-levels.test.ts` and `cityofkeys-wall.test.ts` |
| a decision window, the Human Hand | M3 | the slice (`games/city-slice`) |
| a burned certificate | none | under today's rules it is kept by the city, not burned (P43) |
| 12 or more residents | none | not played at M5 |
| model text | none | the scripted models answer with fixed words |

**Additions on the old platform** (issue 11, decision A59, the procedure of A39 on a branch `oracle/m5` cut from
`legacy`; `legacy` itself is not moved): each addition has a first test and a way out ("no file, proven by carried
tests only", registered in the README).

| # | File | Variant | Source | Seed | Why |
|---|---|---|---|---:|---|
| 1 | `whispers/whispers-holdout-s7.json` | `whispers` with a scripted blocker | scripted: a resident keeps its door-3 fragment, the gamemaker calls a trial, two votes fail, a lot strikes | 7 | the holdout trial is the default of Whispers v3 and no file reaches it |
| 2 | `cityofkeys/cityofkeys-act2-seal-s7.json` | `cityofkeys-act2` from the same old snapshot | scripted: one resident bids, wins, strikes | 7 | the seal is the default of Act II and no file goes past `seal_auction_opened` |
| 3 | `cityofkeys/cityofkeys-act1-classifier-s7.json` | `cityofkeys` with `classifier: true` and a scripted classifier | the script of `act1-s7` | 7 | the Confessor's labels are input of the gamemaker; way out first: if the old exporter cannot script the classifier, no file |

**How the composed setups are read** (issue 10). A file of the two games names no mechanic options
(`mechanics[].options` is `null`); `setup.definition` names the story file and the effective dials. `runOracle`
gets the game file and the params that give the dials, and maps the old actors and platform events:

| Old, in the file | New, in the log | Compared how |
|---|---|---|
| actor `gamemaker`, `script`, `resident:Ann` | `director:gamemaker`, `script`, `resident:Ann` | by mapping |
| `core.overseer_called`, `core.overseer_answered` | the Director's activation lines and the records `asked`, `answered` of `@swarmtales/engine/director` | the count per tick and the Director's calls; the records hold no model text in a scripted run |
| `core.guard_verdict` with `by: "model"` or `"none"`; `core.role_asked`, `core.role_answered` | the review records of issue 04 | by mapping, field by field |
| `core.guard_verdict` with `by: "check"` (the one verdict of each Whispers file: `postBoard` of `A01` at minute 6, `rule: "no-fragments"`) | no line of its own: the check of `puzzles` answers at once, nothing is asked and nothing is recorded (4.3, skip) | the refusal it caused (`GUARD_BLOCKED`, stage `guard`, the same detail as the verdict's `reason`) is compared whole; the verdict line is a registered change in `oracles/whispers/README.md` |

| `core.tool_locked`, `core.tool_unlocked` | the kernel's lock events written by `ctx.access` (M4-64) | whole payloads |
| `core.resident_suspended` | the kernel's suspension event | as at M3 |
| `core.referee_intervened` (the end by `arena.stop`) | `run_ended` with the limit of `arena` | the reason and the tick |

The registered changes of M3 stay (`oracles/cityofkeys/README.md`, "Registered changes against the files"); those
that were caused by a mechanic M3 did not port (the receipt mapped to `none`, the names mapped to ids, the marks cut
from a reply, the standings as an option) are removed by the issue that ports the mechanic, and the README row goes.

### 3.5 What the old runs found

Read from `stories/whispers/runs/README.md`, `stories/cityofkeys/runs/README.md`, `examples/cityofkeys-act2-06a/`
and the lessons log, all at runtime revision 1, with gamemakers on DeepSeek or Sonnet unless named.

| Game | Old runs | What they found | Firm? | At M5 |
|---|---|---|---|---|
| Whispers | 8 runs, 3.16 USD | the guard moves fragments to direct messages; a kept fragment freezes the run (LH10, P62), the holdout trial cures it in code; once fragments flow the clock is the whole game (P66); Haiku defuses or refuses the whisperer's role (P69, P73); the gamemaker hands the whisperer the city's data (LH11, open) | no effect measured; no series | two smokes (7.3) |
| City Act I | 4 bases at six residents, 2 at twelve | every resident passes level 7 between minute 8 and 15 | n = 4, one variant each | **one new base** (A54) |
| City Act II | v01 to v12, 013 to 019 | the loopholes LH1 to LH8 and their fixes; the gamemaker thinks to its cap and never acts (P52); a gamemaker on Haiku fails every look on its token setting (P75); the act ends before its target (P30) | no effect firm (D8 of paper 02: "two more bases before an Act II comparison is used as evidence") | one Act II run to its end, two more in the cap (7.3) |

## 4. Platform items

### 4.1 The hook `runEnded` (issue 01, `interface-change`)

`PluginHooks` gets `runEnded?(end: RunEnd): void`, reserved since M1 1.4. The kernel calls it once, after the last
tick has ended and before `run_ended` is written, in hook order with `after:`, each in its own frame; events it
writes land before `run_ended`. The sdk shows it to a mechanic as `runEnded(end, ctx)`. A run that ends by `error`
calls no hook. A hook point that runs for nobody changes no log: every oracle test and every committed timeline
stays green (the proving test). The first user is `decisions`: `settleAll` settles every open decision with its
proposal (the old `DecisionGate.settleAll`), which the slice never reaches because its windows close inside the run.
The other users come with their ports: `arena` (`run_end`), `channels`, `petitions`, `progression`. At most 8 kernel
and 5 sdk lines.

### 4.2 Staged calls (issues 02 and 03, `interface-change`)

The old platform let a mechanic stage a tool call that the kernel then made as the actor `script` after the current
step: `ctx.stage(Tool, params, { then })` (old `mechanics/script/src/index.ts` line 80: `directorMinute` at the start
of a minute; `mechanics/petitions/src/index.ts` line 57: `resolvePetition`). DECISIONS paper 03 D5 keeps `script` a
mechanic ("Directors are model actors"), so its acts are calls of the reserved actor `script` (`ActorId` already holds
it, M1 2.1).

| Part | Where | What |
|---|---|---|
| `PluginPort.stage(tool, params, options?)` | contracts, kernel | queues a call; `options.then` names a job of the same plugin that the kernel runs after the call with its outcome as data (old `stagedData`: `{ ok, reply }` or `{ ok: false, code, detail? }`) |
| run staged calls | kernel, after the outermost step that staged them (a hook, a job, a tool call with the listeners of what it emitted), depth first as the old `StagingQueue` (`packages/kernel/src/host/staging.ts`, `gateway.ts` `#drain` on `legacy`): what a staged call and its `then` job stage runs before the calls queued behind it | each passes the whole pipeline as a call of actor `script`; it is logged as `tool_called` with `causedBy` the line that staged it. The drain is synchronous, like the hooks and jobs it follows, so a tool with a `review` (4.3) cannot be staged: the kernel refuses such a staged call with the existing `TOOL_NOT_GRANTED` of stage `lock` when the grant of `script` holds it, and the sdk refuses the game at load (next row) |
| the grant of `script` | sdk | a game grants `script` the tools that its mechanics stage (`directorMinute`, `resolvePetition`); a mechanic head lists the tools it stages (`stages: [...]`), and a game whose `script` grant lacks one of them, or holds a tool with a review, is refused at load with the next free code of the sdk's catalogue (issue 03). At run time a staged call of a tool outside the grant is refused like any call (`TOOL_NOT_GRANTED`), and the refusal is the `then` job's data |
| `ctx.stage` | sdk | the typed form for a mechanic, by the tool's declared name |
| replay | testkit | a staged call is replayed from its `tool_called` line, like a Director's call |
| snapshot | kernel | the queue is empty at every boundary (a step drains it); a resume checks it |

Issue 02 builds the kernel part (at most 65 lines, the `then` job included, which way out 1 of 1.3 drops first),
with a first test: where a staged call lands against `whispers-s7.json`, whose 20 calls of `script`
(`directorMinute`) come after the tick-start events of the mechanics loaded before `script` (at minute 6:
`popularity_result`, a ledger entry, board posts and notices) and before the first resident turn. Issue 03 builds
`ctx.stage` with its typed `then`, the head's `stages` list with its load check, and replay. The way out is section
1.3, way out 1. No oracle file holds a call of `resolvePetition` (the calls of actor `script` in the eight files are
`directorMinute` only), so the staged call of `petitions` is proven by its carried tests only (issue 25).

### 4.3 The stage `review` (issue 04, `interface-change`)

DECISIONS paper 01 #4: "merging `guard` and `consult` into `review` is not done before M5"; #6: "`review` holds the
lane, always". At M5 the merge is made, because both old stages are needed and both await an answer that is not
code: the guard of Whispers asks a model whether a post keeps the city's rule, and `blame` asks the judge whether the
accused denied a receipt.

```ts
// packages/contracts/src/kernel/tool.ts, added (sketch)
/** A question asked before a call runs, answered by an actor that is not the caller; the lane is held. */
export interface ReviewSpec {
	/** Who answers: a Director of the game whose head says `answers: "<answerer>"`. Not `role`: the kernel word
	 * list (`scripts/gates/kernel-words.test.ts`) reads `packages/contracts/src/kernel` and lists "role". */
	readonly answerer: string;
	/** Builds the question from the parsed call; `answerable` says whether a Director of the run answers. A skip
	 * answers at once; a refusal ends the call (stage `consult` for a tool's own review, `guard` for a handler's). */
	ask(params: unknown, call: CallInfo, answerable: boolean): ReviewQuestion | ReviewSkip | Refusal;
}
```

A review is asked by the tool itself (`blame` of `receipts`, whose reply holds the verdict) or by a `review`
handler of another plugin on a tool by bare name, beside `lock`, `rule` and `after` (the guard of `puzzles` on
`postBoard`, `postGroup`, `transferPoints` and `createGroup` of `channels` and `ledger`: the old guard policy was
the story's, not the tool's, and its question holds the author's secrets, which only `puzzles` knows; a base
mechanic cannot ask a game mechanic for them, pattern 1 of 2.2). The handler's options (the rule's id and text, the
tools, `minRun`) come from the game's compose step, from the old story's `guards` block.

| Rule | What |
|---|---|
| place | after `rule`, before `execute`, where the old `guard` and `consult` stood. `STAGES` keeps its names, and a refusal of the review is logged under the old one: stage `guard` for a `review` handler of another plugin (the guard's check, `GUARD_BLOCKED`, as the three Whispers files have it), stage `consult` for a tool's own review (`JUDGE_ABSENT` of `blame`, which the old `ask` returned before any check when no judge ran, old `mechanics/receipts/src/blame-tool.ts` line 126). A failed or missing answer reaches `execute`, and the tool's refusal there is logged at `execute` (`JUDGE_FAILED`, line 147) |
| the lane | is held while the answer is awaited: no other call commits, as paper 01 #6 says |
| the answer | comes from the answerer port that the engine gives the kernel (`KernelPorts.review`), never from a plugin; the engine finds the Director whose head names the answerer and asks its model through `AskModel` |
| the log | the question and the answer are records of the answerer (`asked`, `answered` of a record source of the engine), so replay feeds the answer from the log and asks nothing |
| fail | an answer that fails or does not fit is handed to the tool as `{ ok: false }`; the tool decides (the guard lets the post through, "fail open"; `blame` refuses with `JUDGE_FAILED`, as the old code did) |
| skip | `ask` may answer at once (the old `skipConsult`: the city's own checks settle a blame; the guard's check that finds nothing to refuse and has no model to ask, old `by: "none"`); nothing is asked and nothing is recorded. A refusal of `ask` (the guard's check that finds a leak) ends the call at stage `guard` |
| no answerer | `ask` is told (`answerable: false`) and decides, as the old code did: `blame` refuses `JUDGE_ABSENT` at once, the guard's handler lets a call through that its check passed (old `by: "none"`). Nothing is asked and nothing is recorded. A run can lack an answerer although the game has its Director (an offline run, a provider without a key on `legacy`); the load check of the sdk refuses only a game file that names an answerer in a tool or handler and has no Director with `answers` for it, a mistake of the game's author |

| replay and resume | replay reads the answer records; a snapshot is never taken inside a call, so no review is open at a boundary |

At most 15 kernel lines, 20 sdk lines, 15 engine lines; the `review` handler of another plugin is inside these
numbers. First test, with test plugins (no City mechanic exists at issue 04): (a) a `review` handler that refuses at
once gives the shape of the one guarded call of `whispers-s7.json`: `tool_called`, `tool_refused` with stage `guard`,
code `GUARD_BLOCKED` and the detail, nothing asked (its `core.guard_verdict` is `by: "check"`; no file of `oracles/`
holds a guard question to a model); (b) a tool's own review answered by a scripted answerer gives the shape of the
two judged blames of `cityofkeys-act2-s7.json`: the question and the answer recorded inside the call, before its
`tool_result`, where the file has `core.role_asked` and `core.role_answered`. `act2-s7` itself is not replayable
(A56), so the test compares the order of the lines, not the file. The way out is section 1.3, way out 2.

### 4.4 Directors at M5 (issues 06 and 07)

The gamemaker and the Confessor need three things a Director of M3 cannot do. Each is an extension of
`defineDirector` (sdk) and of the plugin `directors`; no kernel line.

| Extension | Head and context | Why | Issue |
|---|---|---|---|
| woken every n ticks | a trigger `{ every: n }` beside the event triggers: a firing at the Director's slot of every n-th tick | the old gamemaker looks after every round (`schedule: { every: 1 }`), the Confessor too | 06 |
| the game's facts in the context | `DirectorContext.facts(id)`: the value of a fact of the game (`Kernel.fact`), read-only, by id | the gamemaker's input is the old report of the city, built from the mechanics' facts (old `hostGamemakerReport`, `apps/cli/src/host/report.ts`); `CLAUDE.md` keeps sight by grant: a Director reads only the facts its head lists | 06 |
| answers a review | `answers?: string` in the head: the answerer of section 4.3 | the judge and the guard | 06 |
| acts by tool use | `acts: "answer" \| "tools"`, default `"answer"`: with `"tools"` the model gets the tools of the Director's grant and calls them until it calls none; `output` and `act` are not used | the gamemaker's look is a tool loop (old `gamemaker.ts`: "a look ends when the model calls no more tools"), and its tools are game tools of the mechanics (notes, `ultimatum`, the tribunal's schedule); a structured answer would change what its model reads | 07 |

`acts: "tools"` is REWRITE 3.6's "declared exception". The driver of such a Director is the resident session of
`packages/models` (the same request, tool list and limits), started with the Director's system and input texts; the
driver table of `apps/cli` hands it to the engine. Its calls are calls of the Director's activation and are
replayed as such. The fake driver plays it from the `sample` functions of its tools. The asker counts its cost under
the Director's `limits.maxCostUsd`.

The four Directors of `mechanics/city-directors`:

| Director | Head | Old source to carry (prompts byte-identical) | Issue |
|---|---|---|---|
| `gamemaker` | `on: [{ every: 1 }]` with event triggers for its tracks (the old look reads the events since the last look: `level_up`, a wrong `submission`, a resident's tool call, `gamemaker_note`; old `overseer/recent.ts`), `acts: "tools"`, facts of `progression`, `channels`, `standoff`, `tribunal`, `standoff-tribunal`; its role per act (`teacher`, `coach`, `keeper`) from the game's options | `overseer/gamemaker.ts`, `gamemaker-runtime.ts`, `gamemaker/*` (674 together), `overseer/recent.ts` (101), the shared `overseer/chat-answer.ts` (113) and old `apps/cli/src/host/report.ts` (97, the report of the city); the old app events become its records and its tools' events. The tools it called in the files: `notify` (Whispers), `postBoard` (Act I), `scheduleTribunal` (Act II) | 34, 35 |
| `confessor` (the old classifier) | `on: [{ every: 1 }]`, before the gamemaker; the answer is the old `label` call's object (a list of items); `act` writes `interpretation` events through a tool of its grant | `overseer/classifier.ts`, `classifier-runtime.ts`, `interpret/classifier.ts`, `statements.ts` (732) | 36 |
| `judge` | `answers: "judge"`; the answer is the old `JudgeVerdict` | `overseer/judge.ts`, `judge-runtime.ts`, `interpret/judge.ts` (248) | 37 |
| `guard` | `answers: "guard"`; the answer is the old `verdict`; it is asked only by the `review` handler of `puzzles` after the city's own check found nothing (the check is `puzzles`', issue 18) | `interpret/guard.ts` (126) | 37 |

The Director name `confessor` is the vocabulary of `CLAUDE.md` ("Confessor (classifier)"); the old event types
(`interpretation`, `interpretation_round`, `interpretation_error`) and prompt keys keep their old names (D14).

### 4.5 Resume of a live run (issues 08 and 09)

Every Act II run continues a recorded Act I. Today `swt resume` plays a fake run from a snapshot (`apps/cli/src/flags.ts`,
`resume`: "play a fake run on from a snapshot"). A live resume needs what the residents and the Directors had in
their context.

| Part | Where | What |
|---|---|---|
| the sessions in the snapshot | `packages/models` (a session saves and loads its messages), `packages/runlog` (the snapshot file gets a section `sessions`, beside the kernel's slices, canonical like them) | each resident session's and each `acts: "tools"` Director's conversation as the provider sees it, without system text that the game gives again, and **never a key**; the canary test of M2 scans the snapshot file |
| `swt resume --budget <usd>` | `apps/cli` | a live resume, with `--provider`, `--model`, `--thinking`, `--ledger`, `--purpose` as for `swt run`; the cap counts from the resume, the ledger line names the base |
| `swt run --pause-on <plugin>.<event>` | `apps/cli` | after the tick in which that event is first written, the run pauses as by the human's `pause` (A22: between ticks), writes the snapshot and ends with exit 3. The Act I base is a run paused on `progression.act_ended` (A54). In the files the end of Act I and the start of Act II fall in one tick (`cityofkeys-act1-s7.json`, minute 10: `act_ended` `{ fromLevel: 1 }`, then `act_started` `{ fromLevel: 8 }` with the new deal), so the base snapshot holds the start of Act II and its deal. The old bases are snapshots of another format (`agent-arena-snapshot` version 2, `level: 7`, `minute: 8` in `examples/cityofkeys-act1-06a-04/snapshot-L7.json`), cut when every resident had passed level 7; whether they held Act II's start is not checked (see Challenge, not settled) |
| the manifest | `packages/engine/src/run` | a resumed live run names its base (folder and snapshot hash) and the models it replaced |
| replay | `apps/cli` | a resumed live run replays from the base's snapshot and its own log, equal by the rule of A34 |

A resumed run plays as the straight run would have, so no runtime revision is raised; a straight run does not
change (decision A55). Proving test: a live run with the scripted source of `apps/cli/test/live.test.ts`, paused on
an event, resumed live, equals the straight run by A34, and its snapshot holds no key canary.

### 4.6 Gates

| Gate | What it reads | Fails on |
|---|---|---|
| `scripts/gates/service-cycles.test.ts` (new, issue 00) | the `requires` and `uses` of every mechanic head, and the contracts of `mechanics/contracts` with their providers | a cycle of asking (2.2, pattern 5). Fixture: two heads that use each other |
| `scripts/gates/base-alone.test.ts` (M4-03) | as today | as today; M5 adds no base mechanic (`marks` and `names` are game mechanics, 1.1), and the reply texts that `channels`, `ledger` and `exile` carry byte for byte (`marks 8/8 left`) go on its list of carried strings |
| `scripts/gates/kernel-words.test.ts` | as today | the words of the cluster that are missing from `GAME_WORDS` are added: petition, receipt, ransom, seal, faction, standoff, ultimatum, door, motive, goal, feast, identity, allowance (whisper, tribunal, gamemaker, confessor, level and role are listed already). **Not** `guard`: it is a name of `STAGES` since M1 and the review stage logs its refusal under it (4.3) |
| `scripts/gates/api-freeze.test.ts` (new, issue 51) | section 5 | section 5 |
| `scripts/gates/layers` | the class `director` | a `director` package that imports the kernel, a game package, or a game mechanic other than through `/contract` and `/rules` |

### 4.7 Command line

| Item | What | Issue |
|---|---|---|
| `swt resume --budget` | 4.5 | 09 |
| `swt run --pause-on` | 4.5 | 09 |
| `--director-model <name>=<provider>/<model>[:<thinking>[:<output cap>]]` on `swt run` and `swt resume` | replaces the model of one Director for this run, recorded in the manifest; the game file is not touched (A52) | 07 |
| `swt report` of a City or Whispers run | the facts table from the metrics of issue 49; the model-written loophole candidates in the section marked unverified, as for every game | 49 |

### 4.8 Error codes

Each issue takes the next free code of its catalogue and names it in its commit body; `docs/reference/errors.md`
is regenerated (`pnpm docs:errors`). Planned: one sdk code for a game whose `script` grant lacks a staged tool or
holds a tool with a review (03), one sdk code for an answerer a head names and no Director of the game answers
(04), one code for a `--director-model` that names no Director of the

game (07), one code for a live resume without `--budget` (09), and the codes of the two games' families (a number of
residents other than six, a dial outside its range).

### 4.9 Runtime revision

M5 plans no revision. The three kernel parts are hook points and stages that no existing game uses; issues 01, 02
and 04 each prove it by the oracle tests of the thirteen tabletop games and the slice's timelines staying green.
A port changes no wake rule (2.5, rule 6). If an issue changes how an existing game plays after all, it raises the
revision to 7 in the same commit, with its row in `docs/RUNTIME-REVISIONS.md`, and the tag `runtime-r7` is owed by the
owner.

## 5. The API freeze at the end of M5

REWRITE row M5: "API freeze after this, not before". The freeze starts with the merge of the gate of M5 (issue 57)
and holds until 1.0 is tagged; after 1.0, semantic versioning takes over (decision A60).

### 5.1 What is frozen

| Surface | Frozen as | Not frozen |
|---|---|---|
| the public exports of `contracts`, `kernel`, `sdk`, `engine`, `chain`, `prompts`, `runlog`, `testkit`, `models` and the umbrella `swarmtales` | their committed API reports (`packages/*/*.api.md`) | `lab`, `viewer-core`, `viewer-ui` (tools of this repository, no author codes against them) |
| the contracts of the base mechanics (`channels`, `consensus`, `decisions`, `exile`, `human-hand`, `ledger`, `team-channel`) and of `mechanics/contracts` (with `identity`, `allowance` and `receipt-source`) | their API reports | the game mechanics, `marks` and `names` among them: D3 of paper 03 renames original games at M6 (folders, packages, log names), and a game mechanic's contract has its game as its only user |
| the formats: the log envelope (`EnvelopeSchema`), the run manifest, the snapshot file (with the section `sessions`), the hand file, the oracle format version 1 | the schema's hash in the frozen list | a new optional field, by an issue (5.3); a game file has no JSON form to freeze (there is no `swt game schema`; the commands are those of `apps/cli/src/flags.ts`), it is TypeScript against the frozen sdk |
| the command line: the commands, their flags and exit codes as `docs/reference/cli.md` lists them | the table in `apps/cli/src/flags.ts` | the wording of help texts |
| the error codes | a code keeps its meaning; `docs/reference/errors.md` | the texts of why and fix |

### 5.2 How it is checked

`scripts/gates/api-freeze.test.ts` (issue 51) reads `scripts/api-freeze/frozen.json`: one row per frozen surface,
with its path, the sha256 of its committed text, `base`: a commit that holds the text before its last recorded
change (the freeze commit at first), and `row`: the id of the row of `docs/API-FREEZE.md` that admitted the text
(the first rows name the freeze itself and A60). A hash alone would not
hold: the builder who changes a report also writes the new hash, and the gate would compare a file with itself.
The gate fails when:

1. a listed file is missing, or the list is empty (a gate never passes on nothing);
2. a file's hash differs from its row (the change is not recorded);
3. the row of `docs/API-FREEZE.md` that a `row` names does not exist, does not name that path, or names a decision
   row `A<n>` that `DECISIONS.md` section 9 does not hold;
4. the change from the text at `base` (`git show <base>:<path>`; the check needs a full clone
   already, for the sign-off) to the text now removes or changes a line, and the row calls it an **addition**: a
   removed or changed line of a report is a **break**, only added lines are an addition; the gate classifies, the
   builder does not;
5. a row names a break and its decision row does not say "the owner's go" (a break before 1.0 is the owner's,
   section 8).

The fixture (a temporary git repository) shows each of the five failing. `pnpm api:update` keeps writing the
reports; after a change the builder adds the row to `docs/API-FREEZE.md` and runs `pnpm api:freeze --write` (issue
51), which writes the new hash, `row`, and as `base` the last commit that holds the text recorded before, into
`frozen.json`, only when that row exists.


### 5.3 What may still change after the freeze

An addition (a new optional field of a format, a new export, a new hook point, a new option with no effect when left
out) by an `interface-change` issue that names its decision row; M6 needs some (samples 2 to 4, the run-time check of
service calls of A37, the packed install). A break only by the owner's go. A fix of a TSDoc text changes the report
and is a row "addition: docs only" with the decision row A60.

### 5.4 Before the freeze (issue 50)

Issue 50 reads every export of the frozen packages once: an export with no user outside its package and its tests is
marked `@internal` (and leaves the report) or is named in `docs/API-FREEZE.md` with the reason it stays; the reserved
parts that M5 did not build (1.4) are named there as "not in the frozen surface". It writes
`docs/reference/stability.md`: what is frozen, what an addition is, how to ask for a break.

## 6. Rules of the live runs

All live runs of M5 run on Haiku through Anthropic (`claude-haiku-5-5`), for residents and Directors alike (A52).
The model blocks of the old stories stay in the game files (2.5, rule 8); the run replaces them by flags that the
manifest records:

| Actor | The game file says (old entry) | M5 runs with | Why |
|---|---|---|---|
| Whispers residents | Haiku, thinking `low` | as the game file | the old entry |
| City residents | GLM via OpenRouter, thinking `medium` | `--provider anthropic --model claude-haiku-5-5`, thinking `medium` | every old City run did the same with `--provider anthropic` |
| gamemaker (both games) | DeepSeek V4.1 Flash via OpenRouter, thinking `high`, output cap 393216 | `--director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000` | `CLAUDE.md`: any live test run uses Haiku via Anthropic; Haiku refuses an output cap above 128000 (P75); with thinking `high` and a small cap the old gamemaker thought to its cap and never acted (P52); 16000 is the cap of M4's thinking games (P94) |
| Confessor, guard, judge | Haiku, thinking `off` | as the game file (the judge: Haiku `off`, the old role's setting) | the old entry |

The gamemaker on Haiku is a different model from the old bases' DeepSeek: the new Act I base and every Act II run of
M5 are a new baseline, compared with the old runs only in outcomes and always with the model named (paper 02 D8;
REWRITE 3.7). **Decided** (open question 1 of section 17, closed by the integrator for the challenge): the
gamemaker of M5 plays on Haiku through Anthropic, as A52 says, because `CLAUDE.md` says "any live test run uses
Haiku via Anthropic"; a gamemaker on DeepSeek V4.1 Flash via OpenRouter, as `CLAUDE.md`'s model list names it, is an
arm of an experiment after 1.0, not a run of M5. Cost check: Haiku 5.5 costs 0.10 USD per million input tokens and
0.50 per million output tokens; the old Act I smoke `stories/cityofkeys/runs/act1-06a-002-f4g4-host-smoke` shows 11
looks of the gamemaker with 46,565 input and 25,740 output tokens (its `usage` lines, agent `GM`), so a Haiku
gamemaker costs about 0.02 USD per 12 minutes at that size, and the caps of section 7 hold it with room.

## 7. Live runs

The offline done-whens need no live run. Done-when 6 does. The plan is committed as `docs/RERUN-PLAN-M5.md` before
the first run (issue 52); every run is a single run under `games/m5-ledger.jsonl` (`swt run --ledger`, `swt resume
--ledger`); the caps are refusals by code (A14). The budget of the project is 50 USD; 7.40 are spent before M5. With
the cap of M5 the project stands at 19.40 USD at most.

### 7.1 Caps

| Cap | USD | Held by |
|---|---:|---|
| **M5 as a whole** | **12.00** | `games/m5-ledger.jsonl`; a run that does not fit is refused |
| Whispers, one run (45 ticks) | 1.00 | the cost meter of the run (`--budget 1.00`) |
| City Act I, one run (to the pause on `act_ended`) | 0.50 | the cost meter |
| City Act II, the check resume (6 ticks from the base) | 0.40 | the cost meter |
| City Act II, one run (to its end) | 2.00 | the cost meter |
| reserve: a second Act I base, or one Act II run again | 2.00 | a reservation line in the ledger, written by the integrator by a decision row |
| the run caps of 7.2 and the reserve together | 10.90 (11.40 with the second Act I base that run 3 allows) | their sum; the cap of M5 holds it with 1.10 (0.60) of room. Before the challenge this table and A53 said the parts sum to 12.00 and 7.2 said 10.00: two Whispers runs 2.00, the base 0.50, the check resume 0.40, three Act II runs 6.00, the reserve 2.00 |
| a broken run | the run stops at its cap; a second failure of the same kind stops the part and goes to the integrator | |

### 7.2 The runs

| # | Run | Runs | Cap each | Expected USD | Issue |
|---|---|---:|---:|---:|---|
| 1 | Whispers `whispers`, seed 11 (the old default), 45 ticks | 1 | 1.00 | 0.50 | 53 |
| 2 | Whispers `whispers-rumours`, seed 11 | 1 | 1.00 | 0.45 | 53 |
| 3 | City Act I, seed 7, paused on `progression.act_ended`: **the base** (A54) | 1, a second only if the first does not reach the act's end | 0.50 | 0.20 | 54 |
| 4 | City Act II, a check resume of 6 ticks from the base (`swt resume --ticks 6`) | 1 | 0.40 | 0.15 | 55 |
| 5 | City Act II from the base to its end | 3 (one is the done-when; the second and third are cut 1 and 2 of 10.2) | 2.00 | 3.00 | 55 |
| | **sum of the caps without the reserve** | | | **8.90 cap (9.40 with a second base), 4.30 expected** | |

The expected costs are the old ones raised for a gamemaker on Haiku: the old Whispers runs on Haiku residents cost
0.13 to 0.47 with a DeepSeek gamemaker; the old six-resident Act I bases 0.10 to 0.15, of which the gamemaker 0.014
to 0.023 on DeepSeek; the old Act II runs at six residents 0.21 to 1.99 (Haiku or GLM residents). The gamemaker
on Haiku looks every tick with the city's report as input, so its share grows; the first Whispers run is read as a
smoke before any other run starts, and the integrator corrects the expected costs of the plan from it (not the caps).

Order: 1, read; 2; 3, read (the base); 4, read; 5. Run 3 waits for every City issue (A54: the base binds the game
hash). One run is in flight at a time.

### 7.3 What every run delivers

Each folder verifies (`swt log verify`), replays equal (`swt replay`; a resumed run with `--previous` of its base),
is clean under `swt scan`, and goes to `data/runs` under `whispers/smoke/<run>/` or `city/base/<run>/` and
`city/act2/<run>/`, with a README (loopholes, problems, solutions: proposed, built, or open) and a row in
`games/<game>/RUNS.md` with runtime revision 6. The integrator pushes `data/runs` after the leak scan (A25). The
reviewer reads the draft report against the log, adds every new loophole and problem to
`docs/LESSONS-LEARNED.md` (rows `LH` and `P`, the City and Whispers rows LH1 to LH11 and LH20 updated where a run
shows them: LH8 and LH9 are "fixed in code, untested live"), and sends Flo the short German summary of `CLAUDE.md`.
A run tunes nothing: a rule change it suggests is a proposal for the owner (section 8).

### 7.4 What a run must show, and what it need not

| Must show | Read from |
|---|---|
| the gamemaker answers live and its calls land (A28: the Director's model port) | the records `asked`, `answered` and the gamemaker's tool calls in runs 1 and 3 |
| the Act I base: every resident passed level 7, or Act I ended by its own rule | `progression.act_ended` and the snapshot of run 3 |
| Act II plays to its end from the base: a tribunal sits and exiles, the exile is carried out by its listeners (A28: the exile) | `tribunal.tribunal_result`, `exile.exiled` and what follows it, in run 5 |
| a review answered live (the guard in Whispers, the judge on a blame in the City), if a resident calls a guarded tool or `blame` | the review records; not a must: a resident may never blame |
| need not show | why |
| an amendment of a decision that lands (A28) | the City opens no decision window by default (A41); an amendment is the human's act, proven offline by the slice's hand file (M3-24) |
| any effect or comparison | D8 of paper 02: two more bases before an Act II comparison is evidence |

## 8. Needs the owner's go

Nothing in this list is decided here, and no M5 issue builds it. **No game rule is changed in M5.**

| # | What | Proposal | Why it is the owner's |
|---|---|---|---|
| 1 | the gamemaker on DeepSeek V4.1 Flash via OpenRouter, as `CLAUDE.md`'s model list says | **decided for M5:** Haiku through Anthropic (A52, section 6); a DeepSeek gamemaker is an arm of an experiment after 1.0, which needs the owner's go then | a model of a role of the game; money on OpenRouter |
| 2 | two more Act I bases, so that Act II comparisons can be used as evidence (D8 of paper 02) | after M5, with a rerun plan | money; a series |
| 3 | runs with 12 residents | after Act II works at six (`CLAUDE.md`) | `CLAUDE.md` |
| 4 | a rule change that a run of M5 suggests (LH11 "the gamemaker hands the whisperer the city's own data", LH20 "a public pact of abstention", P66 "the clock is the whole game", P69 and P73 "Haiku refuses the whisperer") | proposals only, in the summary of the run | "brainstorm before building" |
| 5 | Convoy's news wakes (errata Q3 of M4, P477) | with a Convoy series | a wake rule is a rule |
| 6 | the weaver, fate and the souffleur | after 1.0 (A58) | old model roles that no default game uses; a port is a new feature on this platform |
| 7 | a break of the frozen API before 1.0 | none planned | section 5 |
| 8 | spend above 12.00 USD for M5 | none | money |
| 9 | the tags `v0-final` on `a73e6a9`, `runtime-r4` (`b158a5b`), `runtime-r5` (`6d1a685`), `runtime-r6` (the merge of M4-72) | | the build session cannot push tags (O3) |
| 10 | the earlier open items: P445 (the Hello Game's tick limit), P465 (no game tool in an answer turn), `tooLongDetail: "cut"` in a game | as `11-m4-spec.md` section 8 | unchanged by M5 |

## 9. Stop rules and the softer check

M5 is **stopped and planned again** when one of these holds:

1. more than 116 issues are merged or open (A19: twice the plan of A48);
2. the kernel is above 1490, or kernel + sdk + engine above 4100;
3. a ported game does not reach level 1 on an oracle file and the difference is no registered change: that game
   stops, the other goes on, and the gate names it;
4. the spend reaches the cap of M5 before the Act I base is recorded.

**The softer check of M5**, answered in writing by the gate issue in `docs/ISSUE-RECORD.md`:

| Question | Planned answer |
|---|---|
| Which kernel lines did M5 add? | at most 88: `runEnded` (8), staged calls (65), the review stage (15), each reserved by M1 1.4, each with its first user; the gate raised to 1490 by issue 05 with the measured lines |
| Did the City or Whispers need a kernel mechanism that was not reserved? | no. If a port finds one, it stops and names it; that is the finding that says the kernel interface is **not** ready to freeze, and section 5 is not applied before the integrator rules on it |
| Did the scheduler port change? | no line of `SchedulerPort` and none of `turns` (the Directors' slot of M3 8 is used as it is). If it did, the freeze waits |
| Where do the three budgets stand, and what is left for M6? | kernel at most 1490, total at most 4062; the M6 items (samples 2 to 4, the check of A37, the packed install) each with their planned lines, all outside the kernel |

| Is the API ready to freeze? | the list of section 5 with the exports issue 50 marked internal, and the reserved parts that are not in it |
| What did the live runs cost, and is the base recorded? | section 7, against the caps |
| `parallel` | still a sample, never played live; the freeze includes `SchedulerPort` as it stands |

## 10. Issues

Rules as in M1 to M4: at most 400 hand-written lines per issue, tests included, carried lines and committed data
(timelines, oracle files, carried prompt and figure texts) not counted; the allowed paths are a fence (with the
registry lines of 2.5, rule 5); `pnpm check` green before the merge, run by the integrator. Ids are `M5-00` to
`M5-57`; the table writes the number only. An issue whose "done when" starts with **First test** runs that test
before anything else and follows the way out when it fails. Every port issue states "prompt texts, tool names,
refusal codes and event payloads byte-identical: yes or no". "Variable" is the variable of D2 that the issue
changes; a port's variable is the kernel (the code under the game), as at M4.

**The budget (A19, decision A48): 58 issues planned. The integrator applies the cut list of section 10.2 when 80
issues are merged or open, and M5 is stopped and planned again above 116.**

The estimates follow the record of M4: a mechanic of 500 to 800 old lines took one port issue of 300 to 380
hand-written lines (`liars-dice`, `sealed-auction`, `trick-play`), a mechanic near 1000 two (`holdem`, `salt-market`,
`convoy`), a game with more than three oracle files and params two or more (Harbor Lights, chess).

| # | Title | Scope and done when | Allowed paths | Depends on | Lines | Variable |
|---|---|---|---|---|---:|---|
| 00 | Scaffold of M5 | the fifteen mechanic packages and `mechanics/city-directors` with empty barrels and their class; `games/whispers` and `games/city` with README stubs; the class `director` in the layer rules with its fixture; the gate `service-cycles` with its fixture (4.6); the words of 4.6 in `GAME_WORDS`; the three contracts `identity`, `allowance` and `receipt-source` in `mechanics/contracts` (service definitions only, pattern 4 of 2.2), so that their consumers (12, 14, 15) and providers (16, 17, 21) build in any wave; the budget numbers after M4-72 measured into the record; the sentences of 10.1; the open questions of section 17 in the resume note. Done when the layer check, the two gates and the licence gate are green and the contracts' API report is written | config, barrels and README stubs under `mechanics/`, `games/`; `mechanics/contracts/`; `scripts/layers/`, `scripts/gates/`; `pnpm-workspace.yaml`, `pnpm-lock.yaml`, root `tsconfig.json`, `scripts/mechanic-docs.ts`, `docs/ISSUE-RECORD.md`, `docs/refactoring-before-release/{REWRITE.md,RESUME.md}` | M4-72 | 340 | none |
| 01 | The hook `runEnded` (`interface-change`) | section 4.1; `decisions.settleAll`. Done when every oracle test and the slice's timelines are green and a test settles an open decision at the end of a run; kernel at most +8, sdk at most +5 | `packages/contracts/src/kernel/plugin.ts`, `packages/kernel/src/`, `packages/sdk/src/mechanic/`, `mechanics/decisions/`, tests, the API reports | 00 | 160 | kernel |
| 02 | Staged calls 1: the kernel (`interface-change`) | section 4.2, the kernel rows, the `then` job among them. **First test:** where a staged call lands against `whispers-s7.json` (a test mechanic stages one call per tick at tick start). Done when the tabletop oracle tests and the slice are green; kernel at most +65, counted in the record; way out 1 of 1.3 | `packages/contracts/src/kernel/`, `packages/kernel/src/`, `packages/kernel/test/`, the API reports | 00 | 330 | kernel |
| 03 | Staged calls 2: `ctx.stage`, the typed `then`, replay | section 4.2, the sdk and testkit rows; the head's `stages` list and the load check of the `script` grant with its code. Done when a test mechanic's staged call with a `then` job replays and resumes equal, and a game whose `script` grant lacks a staged tool is refused at load; sdk at most +20 | `packages/sdk/src/`, `packages/testkit/src/replay.ts`, `packages/testkit/test/`, the API reports | 02 | 300 | kernel |
| 04 | The stage `review` (`interface-change`) | section 4.3: the merged stage, the lane held, the answerer port, the records, skip, fail, the load check. **First test** as there. Done when a scripted answerer's guard verdict and two judged calls replay and resume equal and the tabletop oracle tests are green; kernel +15, sdk +20, engine +15 at most | `packages/contracts/src/kernel/`, `packages/kernel/src/`, `packages/sdk/src/`, `packages/engine/src/`, `packages/testkit/src/replay.ts`, tests, the API reports | 00 | 380 | kernel |
| 05 | The kernel gate (the issue of A20) | the measured kernel lines of 01, 02 and 04 written into the record with the reason each cannot live in a mechanic (1.3); the gate of `packages/kernel/test/budget.test.ts` from 1420 to the measured count, at most 1490. Done when the budget tests are green with the new gate and fail one line above it | `packages/kernel/test/budget.test.ts`, `docs/ISSUE-RECORD.md` | 01, 02, 04 | 40 | none |
| 06 | Directors 1: every n ticks, facts, reviews (`interface-change`) | section 4.4, rows 1 to 3. Done when a test Director woken every two ticks reads a fact and answers a review of 04, under replay and resume; sdk at most +30 | `packages/sdk/src/director/`, `packages/engine/src/directors/`, tests, the API reports | 04 | 300 | kernel |
| 07 | Directors 2: a Director that acts by tool use | section 4.4, row 4; the driver from the resident session of `packages/models`; the fake driver from `sample`; `--director-model` (4.7). Done when a scripted tool-using Director's calls replay and resume equal, a fake run reaches its tools, and the manifest names a replaced model; sdk +5, engine +5 at most | `packages/sdk/src/director/`, `packages/engine/src/directors/`, `packages/models/src/`, `apps/cli/src/`, tests | 06 | 360 | kernel |
| 08 | Live resume 1: the sessions in the snapshot | section 4.5, row 1; the canary scan of the snapshot file. Done when a scripted live session saved and loaded asks the same next request, and the snapshot holds no key canary | `packages/models/src/`, `packages/runlog/src/`, tests | 00 | 320 | none |
| 09 | Live resume 2: `swt resume --budget`, `--pause-on` | section 4.5, rows 2 to 5; the code of a live resume without a cap. Done when the proving test of 4.5 holds and `swt replay` of the resumed folder with `--previous` is equal | `apps/cli/src/`, `apps/cli/test/`, `packages/engine/src/run/`, `docs/reference/cli.md` | 07, 08 | 360 | none |
| 10 | Oracle harness for the story games | section 3.4, "How the composed setups are read": `runOracle` with params from `setup.definition.effective`, the actor and platform-event mapping, the old stage names onto `review`. Done when a stand-in game plays the first three minutes of `whispers-s7.json` at level 1 with the mapping and a hand-changed copy of the file names the changed entry | `packages/testkit/src/oracle/`, `packages/testkit/test/` | 04 | 320 | none |
| 11 | Oracle additions on `oracle/m5` | section 3.4, the table of additions, each with its first test and way out (A59). Done when each file is in `oracles/<game>/` with its README row, `oracles/COVERAGE.md` and `oracles/checksums.txt`, or registered as not recorded | `oracles/{whispers,cityofkeys}/`, `oracles/{COVERAGE.md,checksums.txt,m5-catalog.patch}`, and the catalogue and scripted players on `oracle/m5` | none | 200 | none |
| 12 | Port: `ledger` 2 | 2.4, row 1: `DM_LIMIT`, the receipt of a transfer through `receipt-source`, the names in its replies through `identity` (both contracts of 00); the M3 mappings "receipt none" and "a resident is shown by its id" stay true without `receipts` and `names`. Done when the carried ledger tests that need these pass with stand-in providers and the slice is equal | `mechanics/ledger/` | 00 | 240 | kernel |
| 13 | Port: `channels` 2: groups and the treasury | 2.4, row 2 | `mechanics/channels/` | 00 | 360 | kernel |
| 14 | Port: `channels` 3: privacy, notes, `defy`, the window, the inputs, the "seen" mark | 2.4, row 3; `identity` and `allowance` read through `uses` (contracts of 00); the "seen" mark on the activation hooks with a test at `blockSize: 2`; the note checks of game facts moved out (2.3: to 18, 23, 26 and 40, which pick them up), the length and the repeat kept. **First test:** the note cases of 2.3 that break two checks | `mechanics/channels/` | 13 | 380 | kernel |
| 15 | Port: `exile` 2: the gate, ransom, last will | 2.4, row 4; the prices passed by the caller; the names in its texts through `identity`; no call into a game mechanic | `mechanics/exile/` | 00 | 330 | kernel |
| 16 | Port: `names` (class `game`) | carried; provides `identity`; `chooseName`, the fallback names at the deadline; `passwordPiece` of `puzzles` through its `/contract` (18); the name lint's carried texts | `mechanics/names/` | 18 | 260 | kernel |
| 17 | Port: `marks` (class `game`) | carried; provides `allowance`; prices by its own `rule` and `after` handlers on the tools of `channels`, by bare name; the allowance per level through `levelOf` of `progression`'s `/contract` (19). **First test:** section 1.3, the row of `afford` (no oracle file holds a marks refusal; the cases come from the carried tests). Done when the carried tests (308) pass and the `marks_spent` events and the `marks n/m left` parts of the City and Whispers files are the old ones (checked again at level 1 by 38 and 45) | `mechanics/marks/` | 14, 19 | 300 | kernel |
| 18 | Port: `puzzles` 2 | 2.4, row 5: additive levels, texts, the report, the hand-over guard as a `review` handler (4.3: the check answers at once, then the guard's question with the author's secrets), the secret check of a Director's note as a `rule` handler on the note tools (2.3), secrets, resume; a `/contract` with `passwordPiece` for `names`; the standing from `progression` when it is loaded, the option `standings` when not | `mechanics/puzzles/` | 04, 14, 19 | 380 | kernel |
| 19 | Port: `progression` 1 | levels and doors, `submitSolution`, the penalty ladder, the attempt window, `getStatus`, `getProblem`, `listAgents`, `activeTools`; the task and status inputs (status parts with kind `status` and the old `order`, 2.5 rule 2); `levelOf` in its `/contract` for `marks` | `mechanics/progression/` | 00 | 380 | kernel |
| 20 | Port: `progression` 2 | acts, the tool unlocks per level through `ctx.access` on other mechanics' tools, the ranking, survivors, `managed`, `runEnded`; the listener to `exile.exiled`. Done when the carried tests (557) pass | `mechanics/progression/` | 01, 19 | 360 | kernel |
| 21 | Port: `receipts` 1 | `receipt_issued`, `showReceipt`, `quoteDms`, `minRun`; provides `receipt-source` (contract of 00); listens to delivered messages and transfers | `mechanics/receipts/` | 12, 14 | 340 | kernel |
| 22 | Port: `receipts` 2: `blame` | `blame` through its own review with the answerer `judge`; `JUDGE_ABSENT` (stage `consult`), `JUDGE_FAILED` (stage `execute`), the skipped review; the charge through `progression`. Done when the carried blame tests pass with a scripted answerer | `mechanics/receipts/` | 04, 20, 21 | 340 | kernel |
| 23 | Port: `motives` | carried; the whisperer's id through the contract of `whispers` (asked, one direction; old `motives/src/index.ts` line 29); the core-motive check of a Director's note as a `rule` handler (2.3); the core-motive catalogue of `stories/cityofkeys/characters.ts` stays the games' data | `mechanics/motives/` | 26 | 270 | kernel |
| 24 | Port: `cast` | carried; STEWARD and the collections; escrow through `ledger` | `mechanics/cast/` | 12, 14 | 300 | kernel |
| 25 | Port: `petitions` | carried; `resolvePetition` as a staged call (03); `runEnded` | `mechanics/petitions/` | 01, 03 | 280 | kernel |
| 26 | Port: `whispers` | carried; the seeded whisperer, its duty, `forgeReceipt` through `receipts`, the popularity vote; `defy`'s whisperer text and the role check of a Director's note (2.3) from `channels`; provides the whisperer's id in its `/contract`; reads `marks` and `puzzles` (`isHandover`) through their contracts | `mechanics/whispers/` | 17, 18, 21 | 380 | kernel |
| 27 | Port: `standoff` 1 | pieces held for others, the hand-over in text, `claimPiece`, the shop of the city, the listener to `exile.exiled` | `mechanics/standoff/` | 15, 18 | 380 | kernel |
| 28 | Port: `standoff` 2 | the ultimatum (a tool of the gamemaker's grant), the prices from the caller; the carried tests (987) | `mechanics/standoff/` | 27 | 330 | kernel |
| 29 | Port: `standoff-tribunal` 1 | the blocker as a fact, the grace, the notes through `channels` | `mechanics/standoff-tribunal/` | 14, 18, 20 | 380 | kernel |
| 30 | Port: `standoff-tribunal` 2 | the secret votes (up to three), the lot, the strike through `exile`, `callTribunal`, `drawLot`, `announceTribunal`; the carried tests (1031) | `mechanics/standoff-tribunal/` | 15, 29 | 360 | kernel |
| 31 | Port: `script` 1 | the rules on time and on events, `directorMinute` as a staged call of actor `script` | `mechanics/script/` | 03 | 360 | kernel |
| 32 | Port: `script` 2 | the actions through other mechanics' tools, `standings_published`, `director_skipped`; the carried tests (642) | `mechanics/script/` | 31 | 330 | kernel |
| 33 | Port: `arena` | A57: the stop rules (`stopWhenDone`, `stopWhenSeatsDecided`), the standings per tick (`round_end`), the act brake, `run_start`, `run_end` on `runEnded`; the budget and the snapshot checkpoint dropped (the platform's); the carried tests that test what is kept | `mechanics/arena/` | 01, 20 | 300 | kernel |
| 34 | Directors: the gamemaker 1 | 4.4: the head, the input from the facts (the old report), the system text composed from the game's brief and the direction profile, carried; `acts: "tools"` | `mechanics/city-directors/` | 07 | 380 | kernel |
| 35 | Directors: the gamemaker 2 | the tracks, the private notes through `channels.notes`, the budget line, the roles per act; the carried tests of `test/gamemaker` (699) that apply | `mechanics/city-directors/` | 34, 14 | 360 | kernel |
| 36 | Directors: the Confessor | 4.4; the statements, batches, labels, `interpretation` events, fail open; the scripted run with the Confessor on (3.4) | `mechanics/city-directors/` | 06, 14 | 380 | kernel |
| 37 | Directors: the judge and the guard | 4.4; each answers its review (the judge `blame` of 22, the guard the question of the `review` handler of 18, whose code check runs first with `minRun`); fail open | `mechanics/city-directors/` | 06, 22 | 300 | kernel |
| 38 | Game: Whispers 1 | the game family (3.1, 3.2): the story data, the compose step, params with both variants; **first test:** the order of turns at seed 7 (3.1); `whispers-s7.json` at level 3; `carried.test.ts`; the input order of 2.5 rule 2 | `games/whispers/`, `GAMES.md`, `games/index.ts`, `scripts/game-docs/catalogue.ts` | 10, 16, 17, 23, 24, 25, 26, 28, 30, 32, 33, 35, 37 | 380 | kernel |
| 39 | Game: Whispers 2 | `whispers-s11.json`, `whispers-rumours-s7.json` and addition 1 at level 3; the standing checks; a fake run with every reachable tool; the card; the old story tests (477) where they test the game | `games/whispers/`, `GAMES.md` | 11, 38 | 360 | kernel |
| 40 | Port: `goals` | carried; listeners to `exile.exiled` and the act's end; the payout at the act's end; the goal check of a Director's note as a `rule` handler (2.3) | `mechanics/goals/` | 15, 20, 23 | 300 | kernel |
| 41 | Port: `tribunal` 1 | the schedule, the call, the accused, the secret vote (`vote`), the result; the gate and its prices passed to `exile` | `mechanics/tribunal/` | 15, 20 | 380 | kernel |
| 42 | Port: `tribunal` 2 | factions: `nominate`, `join`, `refuse`, the leaders, the bloc bonus | `mechanics/tribunal/` | 41, 13 | 360 | kernel |
| 43 | Port: `tribunal` 3 | the act target, the gamemaker's `scheduleTribunal`, the bequest per heir, the views as facts; the carried tests (794) | `mechanics/tribunal/` | 42 | 340 | kernel |
| 44 | Port: `seal` | carried; the auction (`bid`), the strike (`permaDeath`) through `exile`, the listener to the tribunal's events, the expiry | `mechanics/seal/` | 15, 41 | 360 | kernel |
| 45 | Game: City 1, Act I | the game family (3.1, 3.3), the story data with the figure texts and `characters.ts`, the compose step; `cityofkeys-act1-s7.json` at level 3; `carried.test.ts` | `games/city/`, `GAMES.md`, `games/index.ts`, `scripts/game-docs/catalogue.ts` | 36, 38, 40, 43, 44 | 380 | kernel |
| 46 | Game: City 2: the resumed file and the burn file | `act1-s11` at level 3; `act1-s7-resumed` equal to `act1-s7` by A34; the reduced City of `cityofkeys-burn.story.json` and `burn-s7` at level 3; the M3 registered changes that these ports remove (3.4) | `games/city/`, `oracles/cityofkeys/README.md` | 45 | 360 | kernel |
| 47 | Game: City 3, Act II | levels 8 to 10, the feast, tribunals, factions, the seal, goals; the projections of `act2-s7` (A56) and addition 2; the old `cityofkeys-tribunal`, `-levels`, `-wall` tests where they test the game | `games/city/` | 11, 46 | 380 | kernel |
| 48 | Game: City 4: params, standing checks, the card | the remaining params (the cast choice, the direction dials) with refusals by code; the standing checks on a variant of 12 ticks and on the whole Act I; a fake run with every reachable tool; `--pause-on` in a fake run; the card | `games/city/`, `GAMES.md` | 09, 47 | 300 | kernel |
| 49 | Additions: metrics and families | the metrics of the two games for the facts table (doors passed per resident, exiles, ransoms, votes, whispers, forgeries, blames upheld, the seal, the Confessor's labels per kind, the gamemaker's calls), each from its mechanic's events; `swt report` of both games. Done when the facts table of a scripted run of each has no "absent" for a metric the game exports | the mechanics' `metrics.ts` and their head lines, the two game files, tests | 39, 48 | 360 | none |
| 50 | API freeze 1: the surface | section 5.4. Done when every export of the frozen packages has a user or is `@internal`, and `docs/reference/stability.md` exists | `packages/*/src/` (TSDoc tags only), the API reports, `docs/reference/stability.md`, `docs/API-FREEZE.md` | 49 | 250 | none |
| 51 | API freeze 2: the gate | section 5.2: `frozen.json`, the gate with its three fixtures, `pnpm api:freeze --write`, the gate in `scripts/check.ts`. Done when each fixture fails and the check is green | `scripts/api-freeze/`, `scripts/gates/`, `scripts/check.ts`, `package.json`, `docs/API-FREEZE.md` | 50 | 260 | none |
| 52 | The rerun plan of M5 | `docs/RERUN-PLAN-M5.md` with the runs and caps of section 7, the manifests' model lines, the ledger file | `docs/RERUN-PLAN-M5.md`, `games/m5-ledger.jsonl` | 09, 39 | 120 | none |

| 53 | Live: the two Whispers runs | 7.2, runs 1 and 2; 7.3; the first run read as a smoke and the plan's expected costs corrected | `games/whispers/RUNS.md`, `games/m5-ledger.jsonl`, `docs/LESSONS-LEARNED.md`, `docs/RERUN-PLAN-M5.md`, branch `data/runs` | 52 | 80 | none |
| 54 | Live: the Act I base | 7.2, run 3; A54; the base's row in `games/city/RUNS.md` with its snapshot's hash and path on `data/runs` | `games/city/RUNS.md`, `games/m5-ledger.jsonl`, `docs/LESSONS-LEARNED.md`, branch `data/runs` | 49, 53 | 80 | none |
| 55 | Live: Act II from the base | 7.2, runs 4 and 5; 7.3, 7.4 | as 54 | 54 | 80 | none |
| 56 | Docs chores | the READMEs of the two games and of every new mechanic (generated blocks with `pnpm docs:mechanics`); `docs/tutorials/director.md` and `docs/reference` for the review stage, the tick trigger, tool use and staged calls; the design checklist line "a base mechanic names no game mechanic; the owner of a rule enforces it in its own stage handler"; `RESUME.md` | `games/{whispers,city}/README.md`, `mechanics/*/README.md`, `docs/`, `samples/own-director/` (an include only) | 49 | 250 | none |
| 57 | Gate of M5 | the nine done-whens, each with its test or its write-up; the softer check of section 9 in the record; the errata file of this specification; REWRITE row M5 ticked; the resume note | `scripts/gates/`, `docs/` | everything that is not cut | 200 | none |

58 issues; the sum of the estimates is about 17,900 hand-written lines (the challenge moved 100 lines: 00 +60, 12
+20, 23 +20).

### 10.1 The sentences issue 00 changes

Each is a decision of section 14 written into the paper it changes; no other sentence of these files is touched.

| File, place | Sentence today | Becomes | Decision |
|---|---|---|---|
| `REWRITE.md` section 4, row M5, content | "a tabletop game that M4 cut, first; recut of the City cluster, Whispers first; …" | "recut of the City cluster, Whispers first (M4 cut no tabletop game, A49); …", the rest unchanged | A49 |
| `REWRITE.md` 3.10, the row "Drop" | "… `mechanics/shared` order tables, old-engine goldens, `arena`, `stockfish.js` …" | "… `mechanics/shared` order tables, old-engine goldens, the run-frame duties of `arena` (budget and snapshot; its game rules stay a mechanic, A57), `stockfish.js` …" | A57 |
| `REWRITE.md` 3.4, the bullet on the recut | "… follows paper 03's direction (one ballot instead of six vote implementations, …) but under the rule of two: …" | the sentence stays, followed by: "At M5 the recut changes ownership and dependencies only; mechanics with new model-facing names wait until after 1.0 (A50)." | A50 |
| `REWRITE.md` 3.6, the bullet on Directors | "… model-driven tool use is the declared exception." | the sentence stays, followed by: "The gamemaker is that exception (`acts: "tools"`, A58)." | A58 |
| `REWRITE.md`, the risk row "City of Keys does not fit an API frozen by tabletop games" | "City slice at M3, API freeze only after M5" | unchanged; named here because section 5 is that freeze | |

### 10.2 The cut list

The integrator cuts from the top when the count reaches 80 merged or open, or earlier when a way out of 1.3 says
so; one entry at a time, each written as a decision row. What REWRITE row M5 does not ask for comes first:

| Cut | What goes | Saved | What it costs |
|---|---|---:|---|
| 1 | the third Act II run | 2.00 USD of cap | nothing the done-whens ask |
| 2 | the second Act II run | 2.00 USD of cap | the same |
| 3 | addition 3 of issue 11 (the Confessor's file) | part of an issue | the Confessor is proven by carried tests and a scripted run only |
| 4 | issue 49 beyond the metrics that the facts table of a City run needs (doors, exiles, cost) | part of an issue | the report of a run says less |
| 5 | the Whispers run `whispers-rumours` | 1.00 USD of cap | done-when 6 is met for one variant of Whispers |

Never cut: any port of section 1.1, the two games, the review stage, staged calls, the live resume, the Act I base,
one Act II run, the API freeze. If the count passes 116 with these open, M5 stops and is planned again (section 9).

## 11. Waves and what runs side by side

Six builders at most. One integrator merges, in wave order. Issue 11 is work on the old platform and runs beside
wave 0.

| Wave | Issues | Width | Opens when |
|---|---|---:|---|
| 0 | 00; beside it 11 | 1 + 1 | M4-72 is merged |
| 1 | 01, 02, 04, 08, 12 | 5 | 00 |
| 2 | 03, 05, 06, 13, 15, 19 | 6 | 02 for 03; 01, 02, 04 for 05; 04 for 06 |
| 3 | 07, 10, 14, 20, 25, 41 | 6 | 06 for 07; 04 for 10; 13 for 14; 01 and 19 for 20; 01 and 03 for 25; 15 and 20 for 41 (41 starts when 20 is merged) |
| 4 | 09, 17, 18, 21, 31, 33 | 6 | 07 and 08 for 09; 14 and 19 for 17; 04, 14 and 19 for 18; 12 and 14 for 21; 03 for 31; 01 and 20 for 33 |
| 5 | 22, 24, 26, 27, 29, 34 | 6 | 04, 20, 21 for 22; 17, 18, 21 for 26; 15, 18 for 27; 14, 18, 20 for 29; 07 for 34 |
| 6 | 23, 28, 30, 32, 35, 36 | 6 | 26 for 23; 27 for 28; 29 for 30; 31 for 32; 34 for 35; 06, 14 for 36 |
| 7 | 16, 37, 38, 40, 42, 44 | 6 | 18 for 16; 22 for 37; the mechanics and Directors of Whispers for 38 (16 and 37 merge first); 15, 20, 23 for 40; 41 for 42 and 44 |
| 8 | 39, 43, 52 (prep) | 3 | 11 and 38 for 39; 42 for 43 |
| 9 | 45 | 1 | the City's mechanics and Directors |
| 10 | 46, 53 | 2 | 45 for 46; 52 and 39 for 53 |
| 11 | 47 | 1 | 11, 46 |
| 12 | 48 | 1 | 09, 47 |
| 13 | 49 | 1 | 39, 48 |
| 14 | 50, 54, 56 | 3 | 49 for 50 and 56; 49 and 53 for 54 (the base waits for every City issue, A54) |
| 15 | 51, 55 | 2 | 50 for 51; 54 for 55 |
| 16 | 57 | 1 | everything that is not cut |

**Longest chain:** 00, 04, 06, 07, 34, 35, 38, 45, 46, 47, 48, 49, 54, 55, 57: fifteen issues. It is the City's
game issues, which play one game file with growing oracle files and cannot run side by side, and the base, which
binds the finished game. The Whispers game (38) waits for the most mechanics; its chain is the second longest.

Issues that share files run in sequence:

| Files | Issues, in this order |
|---|---|
| `packages/kernel/src/` | 01, 02, 04 (the integrator merges them in this order; each rebases) |
| `packages/sdk/src/director/` | 06, 07 |
| `packages/testkit/src/replay.ts` | 03, 04, 10 |
| `apps/cli/src/` | 07, 09, 49 |
| `mechanics/channels/` | 13, 14 |
| `mechanics/contracts/` | 00 only (the three contracts of M5; their providers and consumers do not touch the folder) |
| one mechanic each | 19 and 20; 21 and 22; 27 and 28; 29 and 30; 31 and 32; 41, 42 and 43 |
| `mechanics/city-directors/` | 34, 35, 36, 37 (36 and 37 rebase on 35) |
| one game each | 38 and 39; 45, 46, 47 and 48 |
| the ledger | 53, 54, 55 |

Hidden dependencies that were checked:

| Looks independent | Is not, because | Handled by |
|---|---|---|
| 01, 02, 04 and every oracle file of the tabletop games | a hook point or a stage that runs for nobody must change no log | the proving test of each |
| 12, 13, 14, 15, 18 and the city slice | they change four mechanics the slice loads | rule 10 of 2.5 |
| 18 (`puzzles` 2) and 19 (`progression` 1) | the standing comes from `progression` | 19 before 18 |
| 17 (`marks`) and 14 (`channels` 3) | the count in `channels`' reply reads `marks` | 14 reads `allowance` of 00 through `uses`; 17 provides it after 14 |
| 16 (`names`), 17 (`marks`) and the game mechanics they read | `names` asks `puzzles` (`passwordPiece`), `marks` asks `progression` (`levelOf`), both through the provider's `/contract` | 16 after 18, 17 after 19 |
| 23 (`motives`) and 26 (`whispers`) | `motives` asks the whisperer's id of the contract of `whispers` | 23 after 26 |
| 52 (the plan) and the City's game issues | the plan names the City's runs before the game exists | 52 needs 09 and 39 only: the City's rows of the plan name the runs and caps of section 7, not the game hash, which run 3 records (before the challenge 52 depended on 48 and sat in wave 8, four waves before 48) |

| 22 (`blame`) and 37 (the judge) | the judge answers the review | 22 tests with a scripted answerer; 37 after 22 |
| 34 (the gamemaker) and the mechanics whose facts it reads | its input is built from facts of five mechanics | 34 builds the input from the facts that exist and pins the old text with stand-in facts; 38 and 45 check the input against the files at level 2 |
| 38 and 45 and the oracle harness | the composed setups need the mapping | 10 before both |
| 54 (the base) and every later change of the City's game file | the snapshot binds the game hash (A54) | 54 after 48 and 49; a later change of `games/city` needs a new base, recorded by a decision row against the reserve |
| 50 (the surface) and the merges of waves 14 and 15 | a merge after 50 can add an export | 51 is the last platform merge before the gate; the integrator runs 50's listing again in 51 |

## 12. Risks

| # | Risk | Sign | Answer |
|---|---|---|---|
| 1 | **The kernel budget.** 88 lines bring the kernel to 1490 of 1500 | a count of 02 or 04 above its number | the ways out of 1.3; no limit is raised inside M5; the issue of A20 (05) writes the measured lines |
| 2 | **Level 3 for the City.** Seventeen mechanics without hook order numbers; the order between sources after a listener moved (M3 2.3) | a file that reaches level 2 and not level 3 | the order inside a source is compared; the order between sources is a registered change where a listener moved; rule 2 of 2.5; a game that does not reach level 1 stops (section 9, rule 3) |
| 3 | **The refusal order of `marks` and of the note checks** (1.3, 2.3) | a carried case that breaks two checks answered by another refusal | the first tests of 14 and 17; their ways out. No oracle file holds such a refusal, so the files cannot show it |
| 4 | **The gamemaker on Haiku** thinks to its cap or answers no tool (P52, P75), so the live runs have no direction | gamemaker turns without a call in the first Whispers run | the output cap of 16000; the run is read before the next; the finding goes into `docs/LESSONS-LEARNED.md` and the summary to Flo; the model stays Haiku for M5 (section 6), a DeepSeek gamemaker is an arm after 1.0 |
| 5 | **The check budget.** The full check takes 549 s of 600 (errata H16 of M4); two games of 80 and 45 ticks with seventeen mechanics and their standing checks | the full check above 560 s after wave 9 | boundaries sampled (4.3 of M4); command-line standing checks on a 12-tick variant, the whole Act I in process only; the type cost of `defineHead` (errata Q4 of M4) is the next lever; the integrator measures after waves 9 and 12 |
| 6 | **A model text in a snapshot.** The section `sessions` holds model conversations | a key canary in a snapshot | the canary scan of 08; `swt scan` of every folder (7.3) |
| 7 | **The Act I base goes stale** when a City issue changes the game after the base | a resume refused by the game hash | A54: the base after the last City issue; a new base costs about 0.20 USD from the reserve |
| 8 | **A live Act II costs more** than the old (a gamemaker on Haiku every tick; up to 80 ticks) | the first Act II run near its cap of 2.00 | the check resume (run 4) is read first; the cap stops a run; cuts 1 and 2 |
| 9 | **The old scripted players cannot play the additions** of issue 11 | the first test of an addition | its way out: registered as proven by carried tests only |
| 10 | **The freeze freezes a mistake** | an export that M6 must break | issue 50 marks what has no user as internal; a break stays possible with the owner's go (5.3) |
| 11 | Whispers' guard fails open in a live run | a fragment on the board in a live run | as the old platform (fail open; LH9 "fixed in code, untested live"); a finding for the owner, not a fix |
| 12 | The tool-using Director needs more than the resident session gives (its own tool list per act, the cache, P46) | issue 07's test of a role change | the session takes the tool list per activation as a resident's does; a lock keeps a tool listed (G3 of paper 03) |

## 13. Decisions made in this file

| # | Decision | Reason |
|---|---|---|
| 1 | Level 3 is the target for every oracle file of the two games but `act2-s7` | the tabletop games reached it with the same tools; a lower target hides a wake-rule fault |
| 2 | The old story data is carried as typed constants of each game and pinned to the setup files of the oracles | the setup files are the old platform's dump of its definition; the old story format is dropped (REWRITE 3.5) |
| 3 | The option mapping R2-D17 becomes each game's `compose.ts` | it is the game's rule of setting up its parts, not a format |
| 4 | `names` and `marks` are game mechanics, read by the base mechanics through contracts (changed by the challenge; the first version made them base) | the old `marks` asks `progression` and the old `names` asks `puzzles`, both game mechanics, so neither can be base (pattern 1) |
| 5 | Three new contracts of `mechanics/contracts`, written by issue 00: `identity`, `allowance` and `receipt-source` | each has two providers (the mechanic, and the id, nothing or `none` when it is not loaded); written first, so no wave waits for a provider to exist |
| 6 | `settle` handlers are written as `after`, `afford` as `rule`; the code `guard` is a `review` handler that answers at once | no kernel lines for `settle` and `afford` (A40, A51); the guard's check and its question are one stage, as on `legacy`, inside the 15 lines of the review |
| 7 | Whispers is ported and played before the City | DECISIONS paper 01 #9; its mechanics are the City's but `whispers` and `standoff-tribunal`, less `goals`, `tribunal` and `seal` |
| 8 | The city slice keeps `court` and the option `standings` | its timelines are proofs; a slice moved onto `tribunal` would be a second game |
| 9 | The Confessor is ported though no oracle file plays it | its labels are input of the gamemaker in the default games |
| 10 | Directors are woken in the slot of M3 8 (`afterBlocks: ["director"]`), the Confessor before the gamemaker | the old `between` slot and `OVERSEER_ORDER` |
| 11 | One live Act II run is the done-when, two more are in the cap and on the cut list | D8 of paper 02 asks for no comparison yet |
| 12 | A resumed live run raises no runtime revision | a straight run does not change |
| 13 | The service-cycle gate is new at M5 | "no service cycle" was a done-when of M3 and no gate holds it for nineteen more mechanics |

Decisions that reach outside M5 are rows of section 14.

## 14. Decision rows for `DECISIONS.md` (A48 to A61)

The rows are entered in section 9 of `DECISIONS.md` with this file; the text there is the text of record.

| # | Decision, in short | Section here |
|---|---|---|
| A48 | issue budget: 58 planned, cut list at 80, stop above 116 | 10 |
| A49 | M4 cut no tabletop game; M5 starts with its platform items and Whispers | the head, 10.1 |
| A50 | the shape of the recut: ownership and dependencies, never what a model reads; no generic mechanics with new names before 1.0 | 2 |
| A51 | the kernel takes `runEnded`, staged calls and the stage `review` (with the `review` handler of another plugin for the guard), at most 88 lines; the gate is raised to the measured count, at most 1490 | 1.3, 4.1 to 4.3 |
| A52 | every live run on Haiku through Anthropic; the old model blocks stay in the game files; the gamemaker on Haiku with an output cap of 16000; a DeepSeek gamemaker is an arm after 1.0 | 6 |
| A53 | live cap of M5: 12.00 USD; the run caps and the reserve sum to 10.90 | 7 |
| A54 | the Act I base: one recording, after every City issue, bound to the game hash | 7, 4.5 |
| A55 | the resume of a live run, `--pause-on`; no runtime revision | 4.5 |
| A56 | `cityofkeys-act2-s7.json` by projection at level 1; no converter of the old snapshot | 3.4 |
| A57 | `arena` kept as a game mechanic reduced to its game rules | 2.3, 10.1 |
| A58 | `mechanics/city-directors` of the class `director`; the gamemaker acts by tool use; the weaver, fate and the souffleur after 1.0 | 1.1, 4.4 |
| A59 | oracle additions on the branch `oracle/m5` | 3.4 |
| A60 | the API freeze at the merge of the gate of M5 | 5 |
| A61 | what M5 does not build; no game rule changes | 1.4, 8 |

## 15. What M5 leaves for M6

| Left for M6 | Why |
|---|---|
| samples 2 to 4; a mechanic and a Director installed from outside; the run-time check of service calls (A37) | REWRITE row M6; each an addition under the freeze |
| a data game with a Director (P2) | A61 |
| the rename of original games (paper 03 D3) | REWRITE row M6; game mechanics are not frozen for it |
| baselines of the games that had only a smoke; two more Act I bases before an Act II comparison is evidence | REWRITE 5.3; D8 of paper 02; the owner's go |
| game-specific viewer views, the game tab; views for the City's events | REWRITE 3.10 |
| `swt doctor --online`, names and publishing, the data repository | REWRITE row M6, O8 |
| after 1.0: the generic mechanics of paper 03, the game frame, the weaver, fate, the souffleur, `parallel` as a production scheduler | A31, A50, A58, A30 |

## 16. What was checked and how

| Claim | Checked by |
|---|---|
| nineteen old mechanics of 12,485 code lines and 11,065 test lines; the model roles' 3519 lines | the counter of `scripts/lib/code-lines.ts` (the same TypeScript walk, run from a scratch script) over `mechanics/*/src`, `test/mechanics/*` and `packages/roles/src` of a detached worktree of `legacy` |
| the ported parts on `develop` (ledger 263, channels 459, exile 72, puzzles 566, decisions 180, court 136, human-hand 44) | the same counter on `e3792acc` |
| kernel 1402, sdk 2099, engine 360 (sdk 2107 after M4-72, measured by the challenge on `390448db`) | the same counter over `packages/{kernel,sdk,engine}/src`; `docs/ISSUE-RECORD.md`, "The softer check of M4" and row 235 |
| the mechanics each game loads, its tools, its dials, the actors of its calls, the platform events of its files | `setup.mechanics`, `setup.residentTools`, `setup.definition.effective`, `counts` and the `call` entries of the eight files under `oracles/{whispers,cityofkeys}/` |
| the turn order of minute 0 at seed 7 in both games' files | the `turn` entries of `whispers-s7.json` and `cityofkeys-act1-s7.json` |
| which old mechanics use `runEnded`, staged calls, `consult`, `guard`, `afford`, `settle`, the turn hooks | a search of the hook names and stage handlers in `mechanics/*/src` of `legacy` (1.2) |
| the blame reply holds the verdict; `JUDGE_ABSENT`, `JUDGE_FAILED`, `skipConsult` | old `mechanics/receipts/src/blame-tool.ts` |
| the gamemaker's look is a tool loop; the classifier answers with `label`; the guard fails open | the head comments of old `packages/roles/src/overseer/gamemaker.ts`, `classifier.ts`, `interpret/guard.ts` |
| the old model blocks of the two stories | `stories/whispers/story.ts` lines 172, 242, 460, 507; `stories/cityofkeys/story.ts` lines 382, 564, 613 |
| the old costs | `stories/whispers/runs/README.md`, `stories/cityofkeys/runs/README.md`, `examples/cityofkeys-act1-06a-0*/README.md`, `examples/cityofkeys-act2-06a/README.md` on `legacy` |
| the old option mapping R2-D17 and the run dials | old `apps/cli/src/host/story.ts` (head comment, 209 code lines) |
| the Director of M3 asks once, is woken by events and reads only its firings | `packages/sdk/src/director/define.ts`, `packages/engine/src/directors/driver.ts` |
| the kernel's dispatch has the stages `lock`, `rule`, `after` and runs the tool's own `rule` first | `packages/kernel/src/dispatch.ts`, `loader.ts` |
| `swt resume` plays fake only; `--snapshot-at` takes numbers of ticks | `apps/cli/src/flags.ts` |
| decisions paper 01 #4, #6, #9; paper 02 D8; paper 03 D5, D9 | `DECISIONS.md` section 3 |
| no tabletop game was cut by M4 | `RESUME.md`; `docs/ISSUE-RECORD.md`, "The softer check of M4"; errata of M4 |

**Not checked.** The author of this file ran nothing but the line counter and read the files named above. Each point
below is settled by the first test of the named issue, or is a stated assumption:

1. that the staged calls fit in 65 kernel lines and the review stage in 15 (issues 02 and 04); the numbers are
   M1 1.4's, booked before the kernel was written;
2. that a marks refusal keeps its precedence when `afford` becomes `rule` (issue 17): no oracle file holds one, so
   the carried tests decide;
3. that the seeded order of `turns` is the old "custom" order of the story host at seeds 7 and 11 (issue 38): the
   two files agree with each other in minute 0, which says the same stream drew both, not which;
4. that level 3 is reachable for seventeen mechanics loaded in the old order with `after:` (issues 38 and 45);
5. that the old scripted players can play the three additions (issue 11);
6. that a resident session's conversation can be saved and loaded with the provider's cache intact, and what that
   costs in the first resumed request (issue 08; the cache is not a fact a run depends on, only its cost);
7. the cost of a gamemaker on Haiku: no old run had one that worked (P75); the expectations of 7.2 are read off
   DeepSeek runs and corrected after the first run;
8. that the gamemaker's tools all exist among the ported mechanics' tools (notes, `ultimatum`, `scheduleTribunal`,
   `callTribunal`, `drawLot`, `announceTribunal`): read off the heads in paper 03 1.1, not off the old grants;
9. the line estimates of section 10: read off the port rows of M4, not measured;
10. whether the 250 resident turns of `cityofkeys-act2-s7.json` can be projected without the old start state, or
    need the standing computed from the file (as M3's projection 3 did): issue 47 decides and writes it into the
    README;
11. that the check budget holds with the two games (risk 5);
12. this file was challenged by a separate session after it was committed; the changes are listed in the section
    "Challenge" at its end, with what the challenge could not settle. Differences a builder finds later are
    errata rows.

## 17. Open questions this file could not decide

Issue 00 writes these into the resume note, each with the issue that meets it first:

| # | Question | Leaning | Settled by |
|---|---|---|---|
| 1 | Should the gamemaker run on DeepSeek via OpenRouter, as `CLAUDE.md`'s model list says, rather than Haiku? | **closed:** Haiku through Anthropic for every M5 run (A52, `CLAUDE.md`: "any live test run uses Haiku"); a DeepSeek gamemaker is an arm after 1.0 | decided with the challenge (section 6) |
| 2 | Does the review stage fit 15 kernel lines, and if not, may the hard limit be met exactly (1500) with the `afford`/`settle` handlers too? | no: way out 2 of 1.3 stops the issue | issue 04's count; the integrator by a decision row |
| 3 | Is the precedence of a marks refusal kept in `rule`, or does the game need the kernel's `afford`? (No oracle file holds a marks refusal.) | `rule`, with registered changes | issue 17's first test, from the carried tests |

| 4 | Does the seeded order of `turns` equal the old story host's order? | yes (the stream is carried bit for bit, M1) | issue 38's first test |
| 5 | Can `act2-s7` be projected without its old start state? | yes for tribunals, votes and exiles; not for balances | issue 47 |
| 6 | Is the City's level 3 reachable, or does the order between sources need more registered changes than M3 listed? | reachable, with the rows of M3 and one per moved listener | issues 45 and 46 |
| 7 | What a resident session's saved context holds when the provider caches it, and whether a resumed live run's first request is a cache miss | a miss, paid once | issue 08 |

## Challenge

Challenged on 2026-11-15 by a separate session that saw only this file, the repository at `0ec6bffd` (with
`rewrite/develop` at `17a33a46`, M4-72 merged) and `legacy` at `a73e6a9`. Every count below was made with the counter
of `scripts/lib/code-lines.ts` (the same walk, from a scratch script) or read from the files named. The old line
counts of section 1.2 (the nineteen mechanics, their tests, the model roles' 3519, the parts of `channels`, `exile`
and `puzzles` in 2.4), the entry counts and ticks of the eight oracle files (3.4), their mechanics, tool lists and
dials, the turn order of minute 0, the old model blocks, the costs of the eight Whispers runs (3.16 USD) and the
spend of 7.40 USD before M5 (`docs/ISSUE-RECORD.md`, 7.4005) were checked and hold. What changed:

| # | What was wrong or unprovable | Evidence | What changed |
|---|---|---|---|
| 1 | The budgets started from the sdk before M4-72 (2099, "plus what M4-72 took"), so the total after M5 was 8 lines too low | the counter on `390448db`: kernel 1402, sdk 2107, engine 360; `docs/ISSUE-RECORD.md` row 235 ("sdk 2107 lines") | 1.3: sdk 2107, total 3869 now and 4062 after M5, 38 lines left for way out 3; 1.3's last paragraph and the softer check of section 9 say 4062; section 16 |
| 2 | `marks` and `names` cannot be base mechanics: pattern 1 forbids a base mechanic to ask a game mechanic, and the old `marks` asks `progression` (`levelOf`) and the old `names` asks `puzzles` (`passwordPiece`). The contracts they and `receipts` provide were each to be written by a different issue in a different wave (12, 14, 16, 21), while the sequence table had 14 before 16 and the waves had 16 two waves before 14; `ledger` (12) prints names too and no issue gave it `identity` | old `mechanics/marks/src/index.ts` lines 71 and 81, `mechanics/names/src/index.ts` line 57; `mechanics/puzzles/package.json` exports no `/contract` | 1.1: both of class `game`; 2.2 pattern 4: three contracts (`identity`, `allowance`, `receipt-source`) written by issue 00; 2.3: a row for `marks` and `names` asking game mechanics, the readers of `identity` named (12, 14, 15); issues 00, 12, 14, 15, 16, 17, 19, 21; section 5.1 freezes the contracts, not `marks` and `names`; 4.6 `base-alone`; section 13 rows 4 and 5 |
| 3 | The hand-over guard as a `rule` handler of `puzzles` does not match the files, and a review that only a tool can ask cannot express the guard. `whispers-s7.json` (and `-s11`, `-rumours-s7`) log the guarded post as `"stage": "guard"` with a `core.guard_verdict` of `by: "check"`: the city's check, no model asked. The old guard was a policy of the story over tools of `channels` and `ledger` (base), and its question to the model holds the author's secrets, which only `puzzles` knows | old `packages/kernel/src/host/waits.ts` `guardStage` (the mechanics' `guardLeak` first, then the model); `mechanics/puzzles/src/index.ts` line 44 (`guard:`, the only body with one); `stories/whispers/story.ts` `GUARDS` | 4.3: a `review` handler of another plugin beside the tool's own review; the check answers at once; a refusal is logged under the old stage names (`guard` for a handler, `consult` for a tool's own, as `JUDGE_ABSENT` was); 1.2, 1.3, 2.2, 2.4, 3.4 (a mapping row for `by: "check"`), way out 2 of 1.3 (a fallback), issues 18 and 37, section 13 row 6, decision A51 |
| 4 | The sketch of `ReviewSpec` in `packages/contracts/src/kernel/tool.ts` has a field `role`; the kernel word gate reads that folder and lists "role", so the sketch fails the check. Adding "guard" to `GAME_WORDS` would fail on the stage name the kernel must log (`STAGES` holds it since M1); "whisper", "tribunal", "gamemaker", "confessor" and "level" are listed already | `scripts/gates/kernel-words.test.ts` (`GAME_WORDS`, `KERNEL_FOLDERS`); `packages/contracts/src/kernel/tool.ts` line 12 | the field is `answerer` (also in 4.3 and 4.4); 4.6 adds only the missing words, not `guard`, and adds `identity` and `allowance` |
| 5 | `ask` of a review could not refuse, and "no answerer fails at load" contradicts the old play: `blame` answers `JUDGE_ABSENT` before any check when no judge runs, the guard lets a checked call through without a guard model | old `mechanics/receipts/src/blame-tool.ts` lines 126 and 147; `waits.ts` (`GUARD_NONE`) | 4.3: `ask` gets `answerable` and may refuse; the rows "skip" and "no answerer" rewritten; the load check only for an answerer no Director of the game names; 4.8 |
| 6 | The first test of issue 04 was not provable: the Whispers verdict is `by: "check"` (nothing to answer), and `cityofkeys-act2-s7.json` is not replayable (A56); issue 04 has no City mechanic to play either | the files; A56 | 4.3: the first test runs test plugins against the shape of the two cases, line order only |
| 7 | Whispers grants `blame`, so it needs the judge; 3.2 listed three Directors | `setup.residentTools` of `whispers-s7.json`; old `apps/cli/src/main.ts` line 264 (the judge whenever the story has a classifier and a level grants `blame`) | 3.2 names the judge; 1.2's judge row |
| 8 | The first test of issue 17 compared "every refused call of the oracle files that holds a marks refusal": there is none, so the test would pass on nothing | the refused calls of the eight files: `INCORRECT`, `INVALID_FORMAT`, `TOOL_LOCKED`, `SELF_VOTE`, `INVALID_COUNT`, `UNKNOWN_FACTOR`, `GUARD_BLOCKED`, `DOOR_CLOSED` | 1.3 row of `afford`, issue 17, risk 3, section 16 item 2, open question 3: the cases come from the carried tests of `test/mechanics/marks` |
| 9 | The note desk of `channels` (base) checks a Director's note against facts of `puzzles`, `motives`, `goals`, `names`, `whispers` and the Confessor's events; 2.3 kept it in `channels` and moved only the secret guard, which breaks pattern 1 | old `mechanics/channels/src/notes.ts` lines 13 to 18, 55, 62, 63 and `checkNote` | 2.3: each check to its owner as a `rule` handler on the note tools, with a first test in 14 for notes that break two checks; issues 14, 18, 23, 26, 40; the check of the private thoughts is left open (below) |
| 10 | Staged calls: the `then` job was budgeted in the kernel (1.3; way out 1 drops it "from the kernel") but scoped to the sdk issue 03; the "code of a staged call `script` may not call" was an `SWT-R` code of a kernel issue but an sdk code in 4.8; "after every step, a listener round" did not say depth first, nor what happens to a staged tool with a review, which a synchronous drain cannot await | old `packages/kernel/src/host/staging.ts`, `gateway.ts` `#drain`; `packages/kernel/src/lifecycle.ts` (hooks and jobs are synchronous) | 4.2 rows rewritten: the `then` job in 02, the drain after the outermost step, depth first, a reviewed tool cannot be staged; the load check of the `script` grant in 03 with an sdk code; 4.8; issues 02 and 03; 4.2's first test names what comes before the staged call at minute 6, and notes that no file holds a `resolvePetition` call (3.4) |
| 11 | The caps of 7.1 and 7.2 did not add up: A53 said the parts sum to 12.00, 7.2 said 10.00; they are 8.90 without the reserve and 10.90 with it (11.40 with the second base attempt) | 2 x 1.00 + 0.50 + 0.40 + 3 x 2.00 + 2.00 | 7.1 gets a sum row, 7.2's sum, A53 |
| 12 | Open question 1 (the gamemaker's model) was put to the owner although `CLAUDE.md` settles it for every live test run | `CLAUDE.md`: "Any live test run uses Haiku via Anthropic"; the integrator's instruction to this challenge | section 6, section 8 item 1, risk 4, open question 1 and A52: Haiku through Anthropic for M5, a DeepSeek gamemaker an arm after 1.0; a cost check from the old smoke's token counts at Haiku 5.5 prices (about 0.02 USD per 12 minutes) |
| 13 | The API-freeze gate could not hold: a builder who changes a report also writes its new hash, so "hash differs unless a row exists" compares the file with itself, and "addition" or "break" was the builder's own word. The frozen list named a JSON form of the game file from `swt game schema`, a command that does not exist | `apps/cli/src/flags.ts`, `docs/reference/cli.md` (no `game` command) | 5.2: each row of `frozen.json` holds `base` and `row`; the gate classifies a change by the diff against `git show <base>:<path>` (a removed or changed line is a break); five failing fixtures; 5.1 drops the game file's JSON form |
| 14 | Issue 52 depended on 48 (wave 12) but sat in wave 8 and gates 53, so the Whispers runs would wait for the City | the tables of 10 and 11 | 52 depends on 09 and 39; a hidden-dependency row says why |
| 15 | The waves did not follow the new dependencies of rows 2 and 9 (`names` after `puzzles`, `motives` after `whispers`) | 2.3; old `motives/src/index.ts` line 29 | 11: 16 to wave 7, 23 to wave 6, 25 to wave 3, 33 to wave 4; no wave wider than six; the longest chain stays fifteen issues |
| 16 | The gamemaker's sources missed what its look imports (`recent.ts` 101, `chat-answer.ts` 113) and the report of the city (old `apps/cli/src/host/report.ts` 97); its look reads the events since the last look, which an every-tick trigger alone does not give | old `overseer/gamemaker.ts`, head comment and imports | 1.2, 4.4: the files, and event triggers for its tracks; its three tools of the files named |
| 17 | The status line of the files is one line of five sources; rule 2 did not say how it is built | the `turn` entries (`"source": "progression+ledger+marks+receipts+channels"`); `packages/engine/src/turns/inputs.ts` `arrange` | 2.5 rule 2: parts of kind `status` with the old `order`, joined by `{ kind: "status", join: " · " }`; issue 19 |
| 18 | Smaller facts: the files play `activation: "always"`, not `onNovelty`; the old base `-03` is not on `legacy`, so the costs and requests of the bases were off; addition 2 of issue 11 starts from the old snapshot and cannot reach level 3; `--pause-on` did not say "first", and the end of Act I shares its tick with the start of Act II; A50 cited REWRITE 3.3 for the recut (it is 3.4); A54 named `cityofkeys/base/` and `games/cityofkeys/RUNS.md` where the spec names `games/city` | `setup.turns` of the files; `examples/` on `legacy`; `cityofkeys-act1-s7.json` minute 10; the headings of REWRITE | 3.1, 3.3, 3.4, 4.5, A50, A54 |

**Issue count after the challenge: 58** (M5-00 to M5-57, unchanged; A48 stands), about 17,900 hand-written lines.

**Not settled by the challenge** (each for the integrator, or for the first test named):

1. Whether `runEnded` (8), staged calls (65) and the review stage with its `review` handler (15) fit in 88 kernel
   lines. The reading of the kernel says they can: `#finish` in `lifecycle.ts` is the one place for `runEnded`,
   `dispatch.ts` has the stage loop (`vetoOf`) that a `review` handler list reuses, and the lane (`queue` in
   `createDispatch`) already holds every other call while one runs, so an awaited answer holds it with no new line.
   But `runCall` is synchronous today and must become `async` for the answer, and the staged drain must stay
   synchronous inside hooks and jobs; the counts of 02 and 04 decide (ways out 1 and 2).
2. The check of the private thoughts in a Director's note (old `notes.ts` `privateLabels`, from the Confessor's
   `interpretation` events) has no mechanic to own it: `channels` (base) must not name an event of a Director
   package, and a Director is not a plugin with stage handlers. Options: a contract of `mechanics/contracts` with
   the labels, provided by a mechanic that listens to the events; or the check drops out with a registered change
   (no oracle file plays the Confessor). Issue 14 or 36; a decision row.
3. Whether a Director can be triggered by the kernel's `tool_called` of a resident (the gamemaker's tracks, old
   `causingTool`); the triggers of M3 name `<mechanic>.<event>`. Issue 34, inside the 30 sdk lines of 06 or not.
4. Whether the old bases `snapshot-L7.json` held the start of Act II, so whether the new base (paused on the first
   `act_ended`) starts Act II at the same point as the old Act II series; it matters only for comparisons, which D8
   of paper 02 defers.
5. The line estimates of section 10 were not measured again; nor the check budget with the two games (risk 5).
6. The other points of section 16, "Not checked", stand as written (3, 4, 5, 6, 9, 10, 11).
