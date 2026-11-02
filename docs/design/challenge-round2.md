# Challenger reviews, round 2 (T1, T3, T4a, T4b)

Read-only Opus reviews after round 2. "Must fix" means before world.ts is removed.

---

## Review

**T1 round-2 challenge: not ready for world.ts to be removed.** Most of the line-by-line port matches the old engine, and the T1 tests pass (70 of 70). Three defects still break live or resumed runs, and the differential tests leave important paths with no proof. I left the repository unchanged; I ran mutations in a scratch copy and deleted it afterwards.

## Must fix before world.ts is removed

1. **The Whispers story cannot be loaded.** Both whispers (`mechanics/whispers/src/tools.ts:225`, `head.ts:107`) and channels (`mechanics/channels/src/defy.ts:21`, `head.ts:28`) define the `defy` tool and the `gamemaker_defied` event.
   - Scenario: a host with names, ledger, channels, marks, receipts and whispers throws `whispers: event "gamemaker_defied" is declared by "channels" too`. I ran this in scratch.
   - The two versions also behave differently. Channels unlocks `defy` from the `whisperer_chosen` listener, and that event is not written on a resume, so a resumed directed whisperer would lose `defy`. Whispers uses a lock instead.
   - The packages test hides the clash with a foreign-event exception (`test/mechanics/packages.test.ts:91`). One owner has to be chosen (R2-5).

2. **A blame in a run without a judge now costs points.** `mechanics/receipts/src/blame-tool.ts:141-143` runs the city's checks and `reject()` before it looks at `consulted.reason === "absent"`. The kernel runs `ask` and then `skip` whether or not the role exists (`packages/kernel/src/host/waits.ts:84-87`), so an absent judge looks like a skipped consult. The old tool answered `JUDGE_ABSENT` first (`packages/engine/src/tools/blame.ts:20`).
   - I checked it in scratch with `blame(77, A02, 2)` and no judge:
     - Old: `true|JUDGE_ABSENT: the city's judge is absent`.
     - New: `false|rejected · DM #77 is not a DM of yours to A02 · you paid 5 points …`, plus a burn and a board record.
   - This needs R2-3 (a query for whether the run has a judge), or a different way to tell "absent" from "skipped".

3. **Old snapshots without names cannot be resumed.** `examples/cityofkeys-act1-06a-01` and `06a-02` (the bases of v01–v07) have no `names` field. The converter writes no slice for names (`packages/chronicle/src/snapshot/legacy-snapshot.ts:99-113`), and the host throws `snapshot: no slice for mechanic "names"` (`packages/kernel/src/host/snapshots.ts:95`).
   - The names mechanic cannot simply be left out, because channels requires `NamesApi`.
   - The migration that turns an absent slice into "play without names" (`names/src/index.ts:166`) is never reached. The old engine played on without names. The same applies to whispers without a slice (R2-2 is still open).

4. **The blame and duty differentials still run on the T1 channels stand-in** (`test/mechanics/t1/channels.ts`), although real channels has landed. Nothing proves `dmRecord`, `deliveredAfter`, `lastNumber`, `boardPost`, `groupPost` or `couldRead` against the old `#numbers`, nor blame after a legacy resume (the stand-in's migration sets `dms: []`, `channels.ts:193`). Each mutant below passed every test in its mechanic's folder:

   | Mutant (path with no proof) | Scenario the old engine handles |
   |---|---|
   | `blame.ts:202` `claim <= deliveredAfter` changed to `<` | The previous review's scenario: DM #5, then board #6 "never got it" posted before reading |
   | `blame.ts:188` group `couldRead` check removed | A group-post claim |
   | `blame.ts:180` "claim DM has not reached you yet" removed | A claim that is an undelivered DM |
   | `blame-tool.ts:41-49` judge standing shifted (+7 points, rank +1) | The judge's question; the test's `toMatchObject` at `receipts-differential.test.ts:101` leaves standing out |
   | `issue.ts:36` `RECEIPT_CARRIES_FRAGMENT` removed | A board show of a receipt that quotes a fragment |
   | `whispers/view.ts:123` `inCity` changed to standing alive | Gate residents in the vote and the duty; only `exileStandIn([])` is ever used |
   | `duty-notice.ts:41` exiled-whisperer check removed | Duty notice to an exiled whisperer |
   | `duty.ts:85` `direction.defies` dropped | The differential runs with `defies:false`, `defiance:false` and never calls `defy` |
   | `whispers/index.ts:164` restore minute `-1` dropped; `vote.ts:106` single-vote branch | Resume of a saved popularity vote |
   | `names/index.ts:144` exiled "you are" line; `names/book.ts:248` password-piece `keep` | Exiled residents' status line; a fragment that looks like an ID |

   Killed as expected: ledger L2, L3, L5 (L4, the missing system account, was killed by the restore unit test; L1 is equivalent), marks K1–K4, names N1, N2, N5, receipts M5, M6, M8, M9, whispers W4.

## Later (rare paths or wiring)

5. **"Kept no delivery record" can never fire with real channels.** `dmRecordOf` turns a missing DM text into `""` (`mechanics/channels/src/api.ts:24`). So `blame.ts:198` is dead, and the `dm?.text !== undefined` fall-through at `blame.ts:177` misreads an old DM without text whose number clashes with a board post. The current example snapshots have no such DMs.
6. **`defies()` checks the wrong field.** It tests `spec.quota !== undefined` (`duty.ts:85`); the old code tested `story.whisperer.direction !== undefined` (`world.ts:706`), and `quota` is optional in contracts (`story.ts:545`). A directed whisperer without a quota loses `defy`. No current story has that shape.
7. **D-1 order rule.** The T1 `turnInputs` hooks are plain functions (order 0), not `HOOK_ORDER.turnInputs.status`: names `:143`, ledger `:126`, marks `:118`, receipts `:145`, whispers `:221`. Harmless today because the script cues only read.
8. **Ledger (R2-1 still open).** Accounts open lazily with `strictAccounts:false`, there is no `idempotencyKey`, and there is no `open`/`has`. Escrow accounts opened at 0 are missing from the snapshot, and the resume step "cast member added after the snapshot gets its escrow" (`world.ts:3089`) cannot be expressed.
9. **`quoteDms` is set twice.** Channels and receipts each have the option (`messages.ts:190`, `issue.ts:195`); the old engine had one story flag. If they disagree, DM receipts lose their text.
10. **Nothing maps story options yet.**
    - `names.reserved` must include the cast ids and `story.city` (old `world.ts:675`); the tests pass only the city.
    - `names.announcement` defaults to `""`, which silently drops the task line.
    - `receipts.minRun` is static, but the old `guard.boardMinRun()` was not.
11. **`dutyNow` can be stale.** It is refreshed only at minute start (order 600), at turn end and at minute end. A holdout strike at order 800 leaves it out of date until the next turn; the old `whisperDutyNow` was computed live.
12. **Locked-tool replies changed.** The old "Tool X not found" is now `TOOL_LOCKED: …`; the test hides it in a normaliser (`whispers-differential.test.ts:72-75`). This is a core matter.

## Earlier must-fix items (challenge-wave3)

| # | Status |
|---|---|
| 1 | Fixed (`ProgressionApi.levelOf`) |
| 2 | Fixed (order numbers 100/200/600) |
| 3 | Code fixed; not proven with real channels (item 4) |
| 4 | Fixed |
| 5 | Fixed (`PuzzlesApi.isHandover` uses `carriesRun`) |
| 6 | Code fixed; no test proves it |
| 7 | Fixed (`ctx.minutes`, `restoreVote` ported, forgeries kept as `{minute}`) |
| 8 | Fixed (`ctx.access.open`) |
| 9 | `dutyNow` added; `defy` added but clashes with channels (item 1) |
| 10, 11, 13 | Fixed (`kit.provide` everywhere) |
| 12 | Partly: ranks, cast DM and the `switch`/`never` check done; judge order not (item 2); "no delivery record" unreachable (item 5); ledger open (item 8); absent-slice migrations never reached because the host throws first (item 3) |

## Rules

No `any`, no double casts, no `Math.random` or `Date`. Every file is under 175 lines. Every API is provided with `kit.provide`. The random labels `names` and `whisperer` match the old ones. The one rule deviation is D-1 (item 7).

**Verdict: not ready.** Items 1–3 change live or resumed runs and must be fixed first. Item 4 needs differential tests against the real channels and exile mechanics for blame and the gate paths before world.ts goes.

---

## Review

**T4a challenge (exile, tribunal), round 2. Verdict: not ready for world.ts to be removed.**

The port reads as faithful. For every path I compared, the new code matches the old: check and refusal order, payload key order, emission order, random stream labels, the migrations and the rules. But two pieces of live behaviour are not wired, and several ordering paths have no test that would catch a change. The tests themselves are not vacuous where they compare something.

How I checked: a hard-linked scratch copy at `/tmp/claude-0/-home-user/7f9ccba9-1ee5-5fb7-bed8-8bd1bb371344/scratchpad/t4a`; the repository was not touched. All 34 T4a tests pass. I then changed one line at a time with `/tmp/claude-0/-home-user/7f9ccba9-1ee5-5fb7-bed8-8bd1bb371344/scratchpad/t4mut.sh` and reran them.
- **Changes the tests caught:** burn before keep, the `tribunal` random stream offset by one, goals dropped from the holdout strike, the will cap rounded instead of floored, non-voters not filtered.
- **Changes the tests did not catch (all 34 stayed green):** the list in must-fix 3 and later item 7.

## Must fix before world.ts is removed

1. **Nothing reads `TribunalViewApi`** (`mechanics/tribunal/src/view-api.ts`; requests 3 and 10, still open).
   - The old run's stop rule read the tribunal's end reason (old `arena.ts:335-338`).
   - The gamemaker's tribunal section (old `situation.ts:264-294`) and its offer of `scheduleTribunal` only while the window is open and a director is in the city (old `gamemaker.ts:281`) also read it.
   - Scenario: City of Keys Act II reaches its exile target. The old run stops with the "target reached" reason. The new run plays on to the minute cap, and the gamemaker is offered `scheduleTribunal` all the time and gets no report on the tribunal.

2. **`submitSolution` is not locked at the gate** (request 5).
   - Old `world.ts:1446-1448` removed the tool from a resident at the gate. `mechanics/progression/src` has no such check.
   - Scenario: A03 is at the gate until minute 41 and submits a correct code at minute 38. Old: `TOOL_LOCKED`. New: `level_up`. That can open a door and changes the tribunal's "last progress" order.

3. **Order and payload paths with no proof.** The code looks right on reading, but each of these changes passed all 34 tests:
   - **Change 1:** `exiled` emitted after the exile's effects instead of before (`gone.ts:66`). Request 6 says the world-level test checks this order; it does not. Events and effects are compared as two separate lists, so how they interleave is never checked.
   - **Change 2:** goals and seal `onExiled` swapped (`gone.ts:113-114`). `world.test.ts:24` removes goals and the seal from the story, and `newEffects` drops their stand-in records.
   - **Change 3:** the ransom notice moved before `ransom_paid` (`ransom.ts:43-44`).
   - **Change 4:** `last_will` key order changed (`will.ts:89`). The `last_will` event is never compared with the old code.
   - **Change 5:** `exiled` written without its `will` field (`gone.ts:63`). No differential scenario writes a will and then closes the gate.
   - Fix: in `world.test.ts`, compare one merged list (events and effects in log order), keep the goals and seal stand-in records, and add a twin scenario with a will.

4. **Differential scenarios the gate requires are missing.**
   - A gate that closes while an ultimatum is due (T4 #4) is deferred to integration (request 8).
   - The holdout strike is only unit-tested (`exile.test.ts:41`), never against the old `#onStruck`.

## Later

5. **Holdout-struck residents drop out of the tribunal's present list.** `present`, `canVote`, `draftPhase` and `vote` use `ExileApi.standing` (`tribunal/src/city.ts:61-68`), which counts a holdout-struck resident as exiled. The old `Tribunal#present` and `standing` (`tribunal.ts:332`, `:685`) did not know the holdout. Scenario: in a story with both, struck A04 is still accused and votes in the old code, but not in the new. No current story has both.

6. **A legacy gate without prices gets them later than before.** `fillLegacyPrices` (`gone.ts:124`) sets them at the first minute, after names (200) and the door (100), from the balances at that point. The old `restore` set them at load. Until then `gateViews` shows price 0 (`exile/src/index.ts:24`).

7. **Paths no test reaches** (the change passed all tests):
   - The fallback boundary in `cityCall` (`schedule.ts:89`, `>=` changed to `>`).
   - The `informed` filter in `settleDraft` (`factions.ts:209`).
   - A legacy draft without `cap` (`slice.ts:178`, default changed to 99). The test named for this case (`differential.test.ts:238`) never fills a faction, so the cap is never used.
   - The "draft refused" status line (`status.ts:29`).

8. **Resume equivalence is weak.**
   - The `snapshot-L7` tests (`exile.test.ts:156-182`) only show that nothing happens before the act starts. There is no comparison of an Act II continuation from `cityofkeys-act1-06a-04` between the old World and the new host.
   - The twin's `resumed` (`twin.ts:300`) builds the version-0 slices by hand instead of calling `convertLegacySnapshot`.
   - The 06a-01 file needs request 4 (converter writes empty slices).

9. **The twin's "old" side is partly a copy.** Its `enabled` and `oldParts` (`twin.ts:146`, `:249`) are hand copies of the old `enabledTools` and `tribunalParts`, not calls into the old World.

10. **The package pins check heads nobody loads.** `packages.test.ts:107` pins `exileHead`, which the mechanic does not use. The real `exileWorkHead` and `tribunalWorkHead` dependency graph is unchecked until requests 1-3 land in `mechanics/shared`.

11. **Two small differences.**
    - A second seal strike now returns `ALREADY_EXILED` where the old code silently did nothing. Harmless: the seal ignores the result.
    - The version-0 migration keeps duplicate votes that the old `Map` collapsed. Only a corrupt file would have them.

## Checked and matching the old code

- **Rules:** `rules.ts` has the same function bodies as `tribunal-rules.ts`, apart from comments.
- **Faction draft:** `factions.ts` matches step for step: nominations and applications update in place, the `factions` random stream, and `noteLeaders` comes before `faction_leaders`.
- **Old engine code and parameters:** the `scheduleTribunal` parameters and reply; the `payRansom` and `lastWill` checks and texts; `#closeGate`, `#close`, `strike`, `#onExiled` and `#onStruck`; the `Tribunal.restore` migration.
- **Hook order** against `order.ts`: exile and tribunal at 300 (ties keep load order), act end at 900, seal 400, standoff 500, standing 900 and tribunal 910 in the status line.
- **Previous must-fixes for T4a:**
  - **Fixed:**
    - Both mechanics are implemented.
    - Random streams are exact.
    - `toGate` now takes voters and prices.
    - The minute-start order is fixed.
    - `lastProgress` maps to -1.
    - `endAct`, `noteLeaders` and `noteHeir` are wired.
    - The second `openDoor` runs at 1000.
  - **Still open:** the T4 #4 scenario.
- **Rules of the repository:** every API uses `kit.provide`; no `any`, no double casts, no `Math.random` or `Date`; files at most 248 lines; prompts are in files.

---

## Review

**T3 challenger review, round 2: puzzles, progression, goals**

**Verdict: not ready for world.ts to be removed.** Puzzles and goals reproduce the old deal, random streams, payloads and texts. Most of the 12 earlier must-fix items are fixed in code. Four problems remain that would change the golden logs or live runs (A1-A4 below), and 9 of the 22 mutations I made in a scratch copy survived every test. I ran no live models and changed nothing in the repository (`git status` is clean). All 62 T3 tests pass as they stand. Scratch work is in `/tmp/claude-0/-home-user/7f9ccba9-1ee5-5fb7-bed8-8bd1bb371344/scratchpad/t3copy` and `/tmp/claude-0/-home-user/7f9ccba9-1ee5-5fb7-bed8-8bd1bb371344/scratchpad/t3b`.

### A. Must fix before world.ts is removed

1. **The goals resolve before the seal ends: golden order breaks.**
   - `mechanics/goals/src/index.ts:61` listens to `act_ended` with `immediate: true`. `mechanics/seal/src/index.ts:171-177` listens without it.
   - Immediate listeners run inside the emit (`packages/kernel/src/host/log.ts:108`), before any deferred listener, whatever their order numbers say. So `LISTENER_ORDER.act_ended` (seal 100, goals 200) has no effect here.
   - Failing scenario: golden cityofkeys-f10g10 #835 (`seal_expired`) comes before #836-837 (the goal ledger line and `goal_resolved`). The new host writes them the other way round. A scratch host test with these listener options prints `['goal_resolved','seal_expired']`.
   - `test/mechanics/order.test.ts` uses deferred stand-ins, so it cannot see this. The gate's `goldenOrder([... "goals","seal"])` test was never written.
   - Fix: make the seal's listeners immediate (or the goals' deferred), and add the real-mechanics order test.

2. **`getStatus` and `activeTools` list tools that only a pipeline lock closes** (earlier must-fix 4 and 5 not really fixed).
   - `mechanics/progression/src/tools.ts:180,203` use `ctx.access.open`. That only knows access locks (`packages/kernel/src/host/access.ts:74`).
   - names `chooseName`, seal `bid`/`permaDeath`, the tribunal tools, standoff `claimPiece`, whispers, standoff-tribunal `tribunalVote` and exile's gate `submitSolution` are all closed by pipeline `lock` handlers. They would show as open.
   - Failing scenario: the f4g4 `getStatus` replies at minute 5 list no `chooseName` (the naming window is closed). The integrated host would list it.
   - The same count feeds the arena's `request` tool lists and the standings' `"tools":22` in step 18.
   - `status.test.ts:104-109` filters both lines down to `GRANTED` tools, and the twin grants in `TOOL_NAMES` order (`twin.ts:110`). So neither test can catch this, nor a different grant order.
   - Needs a host query that applies the pipeline locks, or each mechanic locks through `ctx.access`.

3. **Resuming a new-format (version 1) snapshot drops this run's door.**
   - `mechanics/progression/src/model.ts:181` reads `data.door ?? (data.locksStale ? doorIn(options) : undefined)`. The old code always took `state.door ?? holdAfter` (world.ts:3100).
   - Failing scenario: an Act II checkpoint written by the new host, resumed for Act III with a new `holdAfter`. Old: the door holds. New: no door, and puzzles' resume repair then deals and announces the levels that should stay behind it.
   - Scratch unit test: `loadState({door absent, locksStale false}, holdAfter 7)` gives `undefined`, expected 7.

4. **The next door is not clamped to the last level.**
   - `mechanics/progression/src/submit.ts:221-222` uses the raw `ctx.options.holdAfter`. The old `#holdAfter` was clamped below the last level (world.ts:766).
   - Failing scenario: twin resume of `snapshot-L7` with `holdAfter: 10` (the last level). The new door becomes 10, the old one stays empty: `expectSameState` fails "expected 10 to deeply equal undefined".
   - Residents who pass level 10 are then held with the door-wait notice instead of finishing. Fix: use `doorIn(options)` there.

5. **The holdout rule is still missing under every task** (earlier must-fix 3, part).
   - T4 now provides it, but only as the local `StandoffTribunalTaskApi` (`mechanics/standoff-tribunal/src/head.ts:44`). `mechanics/progression/src/task.ts:43` never calls it.
   - Failing scenario: whispers `turn_input` tasks lose the rule line. `turns.test.ts:32-41` and `notices.test.ts:72` strip it from the golden.
   - Needs `StandoffTribunalApi.taskLine` in `mechanics/shared` (the integrator's job), then a `uses` entry and a call between the names line and the marks line.

6. **A resident who finished before the snapshot gets the finished notice again** (earlier must-fix 9, part).
   - `migrateV0` (`model.ts:205`) sets `finished: false` for everyone, and the converter does not copy `arena.delivered` (request R3 is still open).
   - The new `news` and `taskLines` checks (`index.ts:74`, `task.ts:91`) compare `finished`, so a finished resident is woken and shown the notice again. The old arena kept the saved entry because it matched (arena.ts:317-322).
   - Not covered: mutation M10 survives.

7. **Hook orders outside the table.**
   - `puzzles/src/index.ts:34` uses the literal `order: 10`, and `progression/src/index.ts:35` uses `progressionDoor - 10`. This breaks the D-1 rule (request R2 is open).
   - Resume event order also differs from the old `#restore`, which ran cores, then act starts, then the re-deal announcements. The new host writes `factors_dealt` (10), then `core_dealt` (50), then `goal_dealt` (90).
   - Those resume lines are also written one minute later than before (old: snapshot minute M; new: M+1). `actStarts` for acts first noted at a resume are therefore one minute late, which moves brake timing. This only bites pre-v08 snapshots or a resume that re-deals.

### B. Tests that prove less than they claim (scratch mutations, T3 tests plus `test/mechanics` and `test/host`)

| Survived (no test failed) | Caught |
|---|---|
| M5 released door kept even when the door changed; M6 resume act starts removed; M7 second door chance disabled; M8 guard counts undelivered DMs; M10 `migrateV0` delivered; M11 `checkReached` removed; M15 rate window `<` → `<=`; M16 act residents including the exiled; M17 acts ended on stop; M21 names and marks lines swapped; M23 acts left unsorted; M25 re-deal always announced; M26 `lastProgress` default 0; M27 goals' `act_ended` deferred | M4 door default; M9 act start default; M12 holder-held check; M14 unread DMs line; M19 door clock at minute 0; M20 task marked shown; M22 offences cleared; M24 next door |

- **Vacuous resume scenario:** "a saved deal that differs is dealt again and announced" (`twin-resume.test.ts:142-151`) saves level 8 behind door 7, which is simply dropped. The re-deal-and-compare path never runs (M25 survives).
- **No proof at all yet:** the director after the holder notices (`level_entered`), because the script mechanic is an 18-line stub; the door's second chance in a minute; guard secrets; the tribunal act end.
- **Gate items not done:**
  - `progression.test.ts:66-70` still compares only `competitors`.
  - `puzzles.test.ts:24` still keeps minute-0 lines only.
  - `listAgents` is in no golden comparison.
  - The status line of `turn_input` is not compared (turns.test checks only the task part).
  - The twin's `bare()` strips `minute`, so minute shifts are invisible.

### C. Later (should fix)

- `listAgents` still omits cast members (`tools.ts:253`; the `CastApi` query of request R4 does not exist yet).
- `runEnded` skips the acts on every stop (`index.ts:79`); kept on purpose until step 18 (D-14).

### D. Earlier must-fix items

| Fixed | Partly fixed | Not fixed |
|---|---|---|
| 1 `level_entered` after the notices (in code, unproven); 2 holder notice price; 6 act signals (seal order: A1); 7 wiring (tribunal `endAct`, exile `noteHeir`/`onExiled`, factions `noteLeaders`, receipts `chargeBlame`); 8 second door chance (in code, untested); 10 guard secrets; 12 `kit.provide` everywhere; lastProgress -1; the catch only for "no tool"; task marked shown in `turnOpened` | 3 holdout line (A5); 9 resume (A3, A6, A7, M25); 11 `listAgents` | 4 and 5 tool lists (A2) |

### E. Clean

- Checks and refusal codes, check order, reply texts, payload key order, `noteActStarts`/`endAct`, `openOnClock`, `revealFactor`, `lackingFragment`, `heldPieces` order, `taskValues`/`factorsBlock`, the goal book and the random stream labels all match the old code.
- Every other phase number matches `mechanics/shared/src/order.ts` (runStarted 400/600, minuteStarted 100/700/1000, turnInputs 200, runEnded 100, `LISTENER_ORDER` for goals).
- No `any`, no casts.

---

## Review

**T4b challenger review, round 2: seal, standoff-tribunal, standoff**

**Verdict: the code is a faithful port, but world.ts must not be removed yet.** `house.ts`, `court.ts` and `book.ts` match `seal.ts`, `holdout.ts` and `standoff.ts` line for line. That covers check order, refusal codes and texts, event payload key order, emission order, the random streams `("seal", n)` and `("holdout-lot", lots)`, and the snapshot slices (blockers and hand-overs sorted as the old snapshot did). Three open integration requests break golden or live behaviour. Several old paths also have no proof, and world.ts is the only oracle for them.

I ran the T4b tests (all green) and mutated lines in a scratch copy at `/tmp/claude-0/-home-user/7f9ccba9-1ee5-5fb7-bed8-8bd1bb371344/scratchpad/t4b/repo`. The repository was not touched.

## Must fix before world.ts is removed

1. **Resuming the real Act II base snapshot fails (R2-2 still open).**
   - `examples/cityofkeys-act1-06a-04/snapshot-L7.json` has no `seal` key and no `standoff` key.
   - The converter writes no slice for an absent key (`packages/chronicle/src/snapshot/legacy-snapshot.ts:140`), and the host throws `snapshot: no slice for mechanic "seal"` (`packages/kernel/src/host/snapshots.ts:95`).
   - Every T4b resume test adds the slice by hand (`test/mechanics/seal/seal-snapshot.test.ts:59`, `test/mechanics/standoff/standoff-snapshot.test.ts:91`), so the tests hide the failure.
   - Failing scenario: any Act II run resumed from that snapshot with seal and standoff loaded aborts at load. A Whispers snapshot without a holdout loaded with standoff-tribunal fails the same way.

2. **The holdout rule under every task is not wired (R2-3 still open).**
   - `StandoffTribunalTaskApi.taskLine` (`mechanics/standoff-tribunal/src/index.ts:185`) is a local API that nobody calls.
   - Progression appends only the names and marks lines (`mechanics/progression/src/task.ts:43`).
   - Failing scenario: 24 `turn_input` lines of `whispers-f10-grudge` carry the rule in their task (old `#withHoldoutRule`, world.ts:1592). Once integrated, all 24 lose it.

3. **The ultimatum is gated by the wrong dial (R2-7 still open).**
   - Standoff locks the tool by its own option `direction` (default 4) (`mechanics/standoff/src/index.ts:25-30`, `:195`), and the tool stays granted and listed.
   - The old gamemaker had no `ultimatum` tool below direction 10 and had it at 10 (gamemaker.ts:214, :375).
   - Failing scenario: an f10 live run whose story does not set `direction: 10` loses ultimatums. A direction-4 run now shows the gamemaker a locked `ultimatum` tool it never had, which changes its tool list and prompt.

4. **Old paths with no proof, though world.ts is the only oracle for them.** Each mutant below survived every T4b test:
   - **Seal tie draw:** renaming the random stream in `ctx.rng("seal", seal)` (`mechanics/seal/src/index.ts:92`) passes. No scenario has two equal bids from residents with equal points.
   - **Seal status at the gate:**
     - Dropping `standing === "alive"` (`index.ts:108`) passes, so a resident at the gate would see the auction.
     - Changing `if (standing === "exiled")` to `"gate"` (`index.ts:104`) passes, so a bearer at the gate would lose its bearer part.
     - The seal's differential (`test/mechanics/seal/differential.ts:42-49`) records no status parts at all. The bearer part is checked only by a hand-written unit test.
   - **Seal used on a resident at the gate:** dropping the `kind === "alive"` guard (`mechanics/seal/src/house.ts:166`) passes. With `missing() === 0` that call should succeed (old) but would return TARGET_REACHED. Tribunal and seal are both in Act II, so this can happen live.
   - **Holdout status at the gate:** changing `kind !== "alive"` to `kind === "exiled"` (`mechanics/standoff-tribunal/src/ports.ts:96`) passes.
   - **Holdout cooldown boundary:** changing `<` to `<=` (`court.ts:232`) passes.
   - **Holdout vote count:** dropping the alive filter on voters (`court.ts:159`) passes.
   - **Gamemaker text checks:** the notes stand-in always accepts (`test/mechanics/standoff-tribunal/stand-ins.ts:55`), and the old side of the differential never runs `#checked`. So the leak, repeat (`as: "tribunal"`, number-sensitive), signature-strip and length refusals of `callTribunal`, `announceTribunal` and `permaDeath`, and the reply wording of those refusals, are unproven.
   - **Fix:** add the old-versus-new scenarios now: a tie with a seeded draw, a resident or bearer at the gate during an auction, the seal used on a gate target at `missing = 0`, a call exactly at `cooldownUntil`, a voter who leaves mid-vote, and a note refusal for each gamemaker tool.

5. **The differential harnesses drive the old classes, not the old `World`.** `runOld` rebuilds the world's wiring by hand (seal `differential.ts:66-152`, holdout `differential.ts:75-209`). They check the classes, but not the wiring. One wiring difference I found that they cannot see:
   - The old seal's `standing` port was `court.standing`, the tribunal only (world.ts:645). The new one is `ExileApi.standing`, which also counts holdout strikes (`mechanics/exile/src/state.ts:61`).
   - Failing scenario, in a story with tribunal, seal and holdout: the holdout strikes the bearer. The old engine sends the struck bearer the "expired" notice (seal.ts:257); the new one sends none. A `permaDeath` on a resident the holdout struck: the old engine succeeds and writes a second `exiled` by seal; the new one refuses with ALREADY_EXILED.
   - No current story loads seal and holdout together, so neither divergence shows up in the goldens or live runs today. It needs a decision ("new behaviour is intended") or a fix.

## Later

6. **No golden check of the gamemaker's "Standoffs" section.** It appears in 4 `gamemaker_turn` inputs of f10g10 (seq 554, 633, 704, 766). Seal and holdout render their sections from facts and compare; the standoff does not. Facts taken at `minuteEnded` are fresh, because the gamemaker looks after it (host.ts:58).
7. **R2-6 is stale.** T3 now provides `heldPieces`, `openFragmentDoors` and `inherited` (`mechanics/puzzles/src/services.ts:99-106`), but the holdout golden gate still runs on the `GoldenCity` stand-in (`holdout-golden.test.ts:11-13`). Its `goldenOrder` covers only the holdout's own lines (`:233-238`), not the Whispers neighbours the gate asked for.
8. **The holdout slice no longer checks resident ids.** The old `restore` threw on an unknown resident (holdout.ts:637-645); the new load (`slice.ts:89`) silently keeps them.
9. **`taskLine` always returns the rule** (`index.ts:185`). The old world played the holdout only with a gamemaker (world.ts:736). The story must not load standoff-tribunal without one; this should be documented.
10. **The author name is set in two places** (R2-9), and an empty `minuteEnded` slot is still a request (R2-8).
11. **Test hygiene:** vitest also picks up `.claude/worktrees/*/test` (my run had 50 files, three copies of the T4b suites).

## Status of the earlier must-fix items

| # | Item | Status |
|---|---|---|
| 1 | Seal and standoff-tribunal implemented | Done (exile and tribunal are T4a) |
| 2 | Standoff golden gate | Fixed: the `held` part is now compared and a mutant is caught; resume tests exist but patch in the slice (see 1) |
| 3 | Needer order | Fixed: team-member order via `PuzzlesApi.heldPieces` (`mechanics/puzzles/src/held.ts:25`) |
| 4 | Minute-start order | Fixed: orders 500, 400 and 800 |
| 5 | Situation facts | Fixed: D-8 schemas |
| 6 | `noteGiven` | Fixed |
| 7 | Ransom price copy | Fixed: `TribunalApi.ransomPrices` with `ceil(price/2)`, 0 without a tribunal |
| 8 | Later items | Mostly done: prompts in files, sorted hand-overs, real-file fixture; the dial gating is open (item 3 above) |
| 9 | `kit.provide` everywhere | Fixed |
| R2-1 | Lint memory | Resolved by commit f6e64f9 |

**Order numbers** all match `mechanics/shared/src/order.ts`:
- **Seal:** minute start 400; listeners `act_started` 200 and `act_ended` 100; turn inputs 200 with status order 1000.
- **Holdout:** minute start 800, status order 1400.
- **Standoff:** minute start 500, status order 700, and a plain `minuteEnded` that runs before `round_end`.

Mutants caught: `act_ended` order, seal minute order, `holdout-lot` stream label, tie-break by points reversed, `taskLine` returning null, the dial's `>=`, and the `held` part. Two mutants (the `act_started` order and the filter of exiled bids at an auction's close) cannot change the output today.

**Rule checks:** no `any`, no double casts, no `Math.random` or `Date`, no imports from the engine or prompts packages in the three mechanics.
