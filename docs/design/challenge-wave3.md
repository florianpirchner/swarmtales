# Challenger review of the carved mechanics (wave 3, teams T1-T4)

Read-only reviews by four Opus challengers. "Must fix" means before world.ts is removed.


---

## T2 messages (channels, petitions, cast, cores)

The T2 mechanics are not ready for `world.ts` to be removed. Most of the per-tool code (error codes, check order, texts, payload key order, rng labels) matches the old engine. What breaks is ordering across mechanics, migration, and missing behaviour, and the gates do not catch most of it.

I worked in a scratch copy only (`/tmp/claude-0/-home-user/7f9ccba9-1ee5-5fb7-bed8-8bd1bb371344/scratchpad/copy`); nothing in the repo was edited. All T2 tests pass on the branch (130 tests).

## Must-fix before world.ts is removed

1. **The status line counts the receipt of a DM delivered in the same turn.** `mechanics/channels/src/hooks.ts:28-38` empties the mailbox inside `turnInputs`, which issues the DM receipt and writes notices. Receipts loads after channels (it requires `ChannelsApi`), so its status part (`mechanics/receipts/src/index.ts:304-306`) counts that new receipt. The old engine built the status line before emptying the mailbox (`arena.ts:363-379`).
   - Golden `cityofkeys-f10g10` seq 251: A05's turn shows "2 receipts". The new host would show "3 receipts".
   - I reproduced it in a scratch test with the real channels and receipts mechanics: A02's first turn shows "1 receipt" where the old engine would show none.
   - Notices that progression or puzzles write during their own `turnInputs` also slip to the next turn.
   - No request covers this; it needs a core change (a late phase for emptying inboxes).

2. **The old minute-start order is lost.** In the old engine, `world.startMinute` (tribunal, seal, standoff, whispers, popularity, door clock) ran first, and only then `director.startMinute`: petitions expire first, then collections are shortened (`director.ts:147-150`).
   - Now petitions and cast do this in their own `minuteStarted` hooks, in load order (`petitions/src/index.ts:108-110`, `cast/src/index.ts:111-119`). Petitions loads early, and cast can load before seal.
   - Golden f10g10 seq 769-771 reads `board_post`, `seal_auction_opened`, `collection_shortened`. With cast loaded before seal, the last two swap.
   - Request R-6 ("cast before script") is too narrow. It needs: cast and petitions after every mechanic that ticks at minute start, and before the script, written as a load-order constraint.

3. **The end of the run is in the wrong order, and petition actions at run end are lost.**
   - The old engine ran close acts (goals), then close petitions, then settle treasuries (`arena.ts:223-225`). The new `runEnded` hooks run in load order: channels settles treasuries (`channels/src/index.ts:56`) before petitions (`petitions/src/index.ts:111`) and before goals.
   - Calls staged in `runEnded` are dropped, so a petition's `onFail` actions at run end never happen. The old director ran them synchronously.
   - Scenario: an open petition plus a group with points in its treasury. Old order: `petition_resolved`, `board_post`, onFail effects, `treasury_settled`. New order: `treasury_settled`, `petition_resolved`, `board_post`, no effects.

4. **The feast seat is lost (R-7).** The cast mechanic's `receive` returns which collections got a new sender, but channels throws that away (`channels/src/messages.ts:129`). The old engine called `onCollect` listeners after charging the marks (`world.ts:2154-2156`).
   - `stories/cityofkeys/story.ts:666,672` uses `onCollect("feast", FEAST_SEAT)`: the factor reveal and the STEWARD DM.
   - On the new host, a resident who writes to STEWARD during the feast gets nothing.
   - The goldens contain no `cast_dm`, so no gate notices.

5. **Migration from version 0 throws away state that changes behaviour.**
   - `state.ts:130-134` sets `exiled: []`. Residents exiled in an old snapshot can receive DMs again and count as readers in `alive()`, unless exile suspends them on load. Exile is still a stub, and nothing suspends anyone today.
   - `seen: []` ignores the old arena's `seenBoard`. `snapshot-L7` has it (A01 at 98, A02 at 95, and so on). After resume, `news()` (`hooks.ts:47-53`) reports the board as new for every resident, so an `onNews` story activates residents the old arena would skip.
   - Neither has a request.

6. **The whisperer's core (R-3).** The cores gate skips the whisperer's `core_dealt` line in `whispers-f10-grudge` (`cores.test.ts:67-76`). The real line differs until whispers tells cores who the whisperer is.

7. **Delivery fields are not shared (R-2).** `DmRecord` carries neither `deliveredMinute` nor `deliveredAfter`, and `dmRecords` (`channels/src/index.ts:33`) leaves them out. Blame and the whisper duty in T1 cannot reproduce the old timing.

8. **Gamemaker tools (step 17) are incomplete** (`channels/src/gamemaker.ts`):
   - `defy` and `gamemaker_defied` are missing entirely.
   - The leak, private-thought, core, role and repeat checks of the old `#checked` are gone. The comment cites "request 4", which is the `core_dealt` request; no request covers these checks.
   - The old note budgets cannot be a host limit. They are a sliding window per recipient (`gamemaker.ts:452-456`: `minute - note.minute < window`), while host limits are aligned blocks keyed by caller. With a 10-minute window and 1 note per agent, a note to A01 at minute 9 and again at 10 is refused by the old engine and allowed by the new. A note to A01 and then to A02 is allowed by the old engine and refused by a caller-keyed limit.
   - The heading-strip regex (`gamemaker.ts:25`) drops the story's city name. The old one also stripped "`<city> minute 30:`", so such a note now keeps its heading.

9. **Two lines move before `run_start`.** In the old engine, `core_dealt` (R-4) and the cast escrow mint (`ledger_entry`, `cast/src/index.ts:29,110`) were written before `run_start`, from the constructor. Now they come after `run_started`. R-4 names only the cores; the escrow mint needs the same fix.

## Gates: several pass whatever the mechanic does

- **Channels** (`test/mechanics/channels/replay.ts`) does not use `ownedBy(..., ["channels"])` as the brief asks; it compares five separate streams.
  - The delivery streams are sorted and have their minute and receipt id stripped (`:74-77`, `:88-94`).
  - City board posts and non-delivery notices are injected from the golden itself (`:130-137`), so those lines only check numbering.
  - The marks stand-in repeats what the old reply said. Locked and guard-blocked calls are skipped, so the guard path is never run.
- **What I broke in the scratch copy:**
  - Delivery notice minute +7: the gate still passes.
  - Delivery notice receipt replaced by a fixed id (R-9999): still passes.
  - Mailbox emptied in reverse order: still passes.
  - Text appended to `dm_sent`: fails, as it should.
  - An extra message number taken: fails, as it should.
- **Cast** (`cast.test.ts:170-174`) injects `cast_revealed` and `collection_started` from the golden, and hardcodes `afterSolve {level 10, minutes 3}` and `distinctSenders: true`. Only one real line per log is checked, and the whispers log has none.
- **Petitions** have no golden gate; no golden contains petitions. The legacy resume test runs on an empty petitions list.
- **No golden covers** groups, treasuries, `cast_dm`, lotteries, the guard or the turn inputs.
- **Missing version-0 fixtures:** a non-empty mailbox with an unnumbered entry, open petitions, collections with entries, a removed city group, exiled residents, a DM record without text.

## Later

- `isGone` (`messages.ts:29-31`) also treats suspended residents as exiled. The old `isExiled` counted those "at the gate" as alive. This becomes a bug once exile suspends at the gate.
- The `exiled` listener (`index.ts:47`) is not immediate. Code that runs right after an exile in the same call still sees the resident as alive.
- With two petitions expiring in the same minute, neither an immediate nor a deferred script listener can reproduce the old interleaving (resolved, post, actions, then the next petition).
- `createGroup` no longer opens the ledger account; it appears at the first booking, which changes the ledger's snapshot order.
- DM records without text are restored as `""` instead of absent. Without receipts loaded, a withdrawal sends an empty notice.
- Two afterSolve collections shortened in the same minute come out in start order, not the order of the story's rules.
- Some text is still built in code rather than prompt files (petition visibility and signers, the group description lines).
- Vitest also runs the stale copies under `.claude/worktrees`.

## Requests

- R-1, R-2, R-3, R-4 and R-9 are sound.
- R-5 is fine.
- R-6 is incomplete (see 2).
- R-7 is needed now, not optional (see 4).
- R-8 misses the inbox-emptying order and the `seenBoard` migration.
- **Missing requests:** items 1, 3, 5, the gamemaker checks and budgets (8), and the escrow mint before `run_start` (9).

## Clean

- No `any`, no double casts, no time functions or `Math.random`.
- The rng labels match the old streams (`cores` / `figures` / `cast` counts, and `lottery` into/salt/minute).
- Event payload key order matches.
- File sizes are fine; the largest is `groups.ts` at 398 lines.

---

## T1 economy (names, ledger, marks, receipts, whispers)

Verdict: **not ready for world.ts to be removed.** Each per-mechanic gate passes, but it only covers what the three golden logs exercise, and those logs never call `transferPoints`, `showReceipt`, `blame` or `chooseName`. Reading old against new line by line turns up the divergences below. Four of them already break golden lines that step 18 compares (items 1, 2, 10, 11). The rest change live behaviour or resumed runs.

## Must fix before world.ts is removed

1. **Marks loses the level at a door.** In `mechanics/marks/src/index.ts:83-90` marks learns the level only from `level_up`. The old code reads `levelOf` (`world.ts:1151-1159`). At a shut door the old code writes `level_up to=L+1` but keeps the resident on L (`world.ts:1719-1724`). `openDoor` then enters the next level with no event (`world.ts:1859`).
   - Fresh run: a resident held at door 7 gets level 8 marks before the door opens.
   - Act II resume from `snapshot-L7` (all six residents held at 7): the migration (`marks/index.ts:117`) sets them to level 7, and they stay there after the door opens. On level 8 they get the level-7 terms instead of `WALL_MARKS` (fromLevel 8, with refill), so the wrong `canAfford`, `marks_spent` and status line follow.
   - R-10 is unsound: `ProgressionApi.levelOf` already exists. Use it through `uses`.

2. **Order of events across mechanics at run start.** The golden starts with `whisperer_chosen` (seq 1), then the start points (seq 2-7), because of the order in the old constructor (`world.ts:708` before `776`). Whispers requires the ledger, so the ledger's `runStarted` (`ledger/index.ts:120`) runs first. The whispers gate filters to its own lines and cannot see this. The `minuteStarted` order has the same problem: the old order is names, then tribunal, seal and standoff, then the whisper duty and the vote (`world.ts:1310-1322`). Load order does not guarantee that.

3. **Blame's message number at delivery is wrong.** `receipts/index.ts:106` (`lastNumber`) takes the highest `dm_sent` number. The old code uses `#numbers.last` (`world.ts:2183`), which also counts board posts, notices and group posts.
   - Fresh-run case: A01 sends DM #5 to A02, then A02 posts board #6 saying "never got it" before reading. The old code rejects claim 6 ("came before DM #5 reached A02"). The new code sends it to the judge, and A02 can be fined.
   - On resume, the migration sets `delivered: []` (`receipts/index.ts:331`). Every DM delivered before the cut then answers "has not reached … yet", and the caller is fined. Example: DM #18 in L7 has `deliveredAfter` 19.
   - Group claims always answer "no DM, board post or group post" (gap noted in R-6).
   - Fix: R-6, plus a `deliveredAfter` that channels already keeps (`channels/messages.ts:176-179`).

4. **Blame counts are kept twice.** Receipts counts lost blames itself (`receipts/index.ts:151`, R-7). Progression already keeps `offences.blames` and offers `chargeBlame`/`nextBlamePenalty` (`progression/src/head.ts:37-46`). Progression's count therefore never climbs, so the task's `{blamePenalty}` (`progression/task.ts:42`) shows the first step forever. The legacy `offences.blames` is lost on resume. R-7 is unsound. That API sits in T3's package, so it has to move to `mechanics/shared`.

5. **Hand-over test broadened.** `whispers/duty.ts:110` upper-cases the whole DM and also strips every non-alphanumeric character. The old `carriesRun` (`secrets.ts:10-28`) never upper-cases plain words. I checked this in scratch:
   - "I hear Mira cheats" with fragment `HEAR7`: old false, new true.
   - "the cat sat" with fragment `ECA9X`: old false, new true.
   - Effect: whispers are undercounted, so `whisper_duty.whispers`/`met` and the met/missed report flip. The golden passes only by luck.

6. **The gate counts as out of the city in whispers.** `inCity` (`whispers/index.ts:96`) means standing `alive`. In the old vote and duty it means `!isExiled`, and residents at the gate count (`world.ts:701,716,1070`).
   - A ballot for a resident at the gate is refused with `EXILED`.
   - Ballots of or for residents at the gate are dropped from the count.
   - A whisperer at the gate gets no duty.

7. **Resume breaks the whispers duty and the vote.**
   - `playedMinutes` (`whispers/index.ts:100`) reads `run_started`, which a legacy-resumed log does not have (it has the arena's `run_start`). `next` becomes `min(x, 0) = 0`, so the duty notice says "until minute 0".
   - The popularity migration (`whispers/index.ts:335`) drops the old `restore(saved, minute)` logic (`popularity.ts:restore`). It does not skip rounds already counted, so a resume can open and count past rounds in a burst. A closed single-surprise-vote snapshot becomes round 1 instead of the last round.
   - The forgeries migration (`:332`) drops forgeries without `forgedTo`, which also removes them from the counts. The old code kept `{minute}`. The comment says the opposite of what the code does.

8. **`forgeReceipt` is not tied to `showReceipt`.** The old code opens forging only where `showReceipt` is open (`world.ts:1466`). The new lock (`whispers/index.ts:285`) ignores that. Example: the whispers story with receipts off (`stories/whispers/story.ts:435`) still lets the whisperer forge.

9. **Missing whisperer pieces.**
   - `#whispererDefies`, the whisperer's `defy` tool (`world.ts:1463`), is listed in the carve plan for whispers but is in no mechanic. The golden's `[tools]` line for A06 contains `defy`.
   - `whisperDutyNow` and `busiestPair` (`world.ts:1044-1065`) have no API or fact. The gamemaker situation needs them for its "His orders" lines (`roles/gamemaker/situation.ts:170`), which appear 13 times in the whispers golden. No request names this.

10. **R-2 lines missing from the task text.** The golden's `turn_input` holds the choose-name line (f4g4) and the "Marks on this level …" line (28 to 36 per log). Both are missing until R-2 lands.
    - The names option `announcement` (`names/index.ts:32`) is declared and never used.
    - The old choose-name line is also added to the closed-door task text (`world.ts:1563`).

11. **Whispers prompt override does not exist.** R-11 says the Whispers story overrides `tools/showReceipt` with the quoted variant. `stories/whispers/` has no prompts folder, so Whispers residents read "never the text", which is false.

## Later (live runs or rare paths, not the goldens)

- **Blame judge asked too early (R-8):** the judge is asked before UNKNOWN_AGENT, SELF_BLAME and ALREADY_BLAMED. That adds `role_asked`/`role_answered` events and cost the old code never had.
- **Judge sees different ranks:** `standingOf` (`receipts/index.ts:157`) gives tied residents the same rank and does not rank exiled residents last. The old `ranking()` breaks ties by level, then id, and puts the exiled last.
- **Cast DMs in blame:** blame reads `dm_sent` from cast members (old `castDm`, `world.ts:2164`), which the old `#dms` never held. A claim number that belongs to a cast DM gets the reason "not by X" instead of "no DM, board post …".
- **Blame reason dropped:** "kept no delivery record" is gone.
- **Ledger:**
  - Accounts open on their first booking. The old code threw `UNKNOWN_ACCOUNT`, so a bug now passes silently.
  - `idempotencyKey` is dropped.
  - The snapshot moves `SYSTEM_MINT_BURN` to the front and loses escrow accounts opened at 0, so a written-back legacy snapshot can differ.
  - Zero-sum is only checked after a turn, not at restore.
- **Names, legacy snapshot without `names`:** the old code plays without names. With the mechanic loaded, the migration's `Parse` throws, or a fresh state names everyone at the next minute.
- **Whispers with `whispers: null` in the snapshot** (as in L7): the `Parse` in the migration throws. The old code picked a fresh whisperer.
- **Whispers reads other mechanics' output:** it parses the `receipt_issued` text with regexes (R-5). That couples it to the line format of `describeReceipt`.
- **Rules:**
  - `switch` without a `never` check: `receipts/book.ts` `partiesOf`/`describeReceipt` (the coding rules ask for it).
  - Text inline instead of in prompt files: blame notices, the name notices, `DM_LIMIT`, "N points", "N receipts".
  - No `any`, no double casts, no `Math.random` or `Date`.
  - The rng labels `names` and `whisperer` equal the old ones.

## Gate quality

- **The whispers gate does catch a broken line.** I re-ran it in a scratch copy: changing one golden `whisper_duty` line fails it at index 9.
- **The duty notice text is never compared.** Changing "until minute 12" to "until minute 99" in the golden duty `notice` still passes, because notices belong to channels and the stand-in's notices are never checked against the golden.
- **Ledger gate is mostly an echo.** `ledgerReplay` feeds the golden bookings back through `LedgerApi`, so it only checks txIds and key order. The transfer path is never compared against golden data.
- **Receipts gate rebuilds bodies from the golden text.** `receiptReplay` parses the golden receipt texts back into bodies, so ordering and the real issuers are untested.
- **Replies are not compared in any T1 gate.** The brief asks for "replies equal to old `tool_result`". I added the comparison in scratch for `nameFavourite`/`forgeReceipt`, and those replies do match.
- **R-14** sorts ballots, so order within a minute is not checked until step 18.
- **Fixtures missing** for: blames with pairs or counts, receipts of kinds escrow/deposit/withdrawal, marks with `since`, a names snapshot without names, and whispers with `null`.

The scratch copy I tested in has been deleted; the repository is unchanged.

---

## T4 conflict (standoff, exile, tribunal, seal, standoff-tribunal)

**T4 challenger review (wave 3, branch claude/project-thread-b71bdz)**

## Verdict: NOT READY. world.ts must not be removed on the basis of T4's work.

Only `standoff` was carved. `exile`, `tribunal`, `seal` and `standoff-tribunal` are still the empty wave-3.0 heads (`mechanics/{exile,tribunal,seal,standoff-tribunal}/src/index.ts`, about 19 lines each: `state: () => undefined`, no body, no tools). Exile is the only one that even lists its events (`ExileEvents`), and only re-exported. There are no tests under `test/mechanics/` for them. Standoff's `book.ts` is a faithful line-for-line copy of `packages/engine/src/standoff.ts`, but its wiring has the gaps below.

## Must-fix before world.ts is removed

**1. Four of five mechanics are not implemented.**
- The goldens hold their output, and nothing reproduces it:
  - `seal_auction_opened` at f4g4 and f10g10 #770.
  - `seal_expired` at #835, emitted before `goal_resolved`.
  - Five `blocker_found` lines at whispers #152 to #156.
  - The seal-auction and holdout status parts in `turn_input`.
  - The tools `payRansom`, `lastWill`, `vote`, `nominate`, `join`, `refuse`, `bid`, both `permaDeath`, `tribunalVote`, `scheduleTribunal`, `callTribunal`, `drawLot` and `announceTribunal`.
- Old sources still to port: `tribunal.ts`, `factions.ts`, `tribunal-rules.ts`, `seal.ts`, `holdout.ts` (2348 lines), plus world.ts `lastWill`/`#onExiled` (world.ts:2735-2820).
- They also need these random streams, exactly: `rngFor(seed,"tribunal",minute)` (tribunal.ts:845), `("factions",tribunal)` (factions.ts:211), `("seal",seal)` (seal.ts:228), `("holdout-lot",lots)` (holdout.ts:586).

**2. The standoff golden gate tests nothing.**
- At `test/mechanics/standoff/standoff.test.ts:213` it starts a host, plays no minute, replays no `goldenCalls`, and compares `[]` with `[]`.
- I proved it in a scratch copy (`/tmp/claude-0/-home-user/7f9ccba9-1ee5-5fb7-bed8-8bd1bb371344/scratchpad/repo`). I changed `piece_given` to `{needer, holder, level: level+1, …}` in book.ts:134. All 3 golden-gate tests stayed green; only the hand-written unit test failed.
- Meanwhile the goldens do carry standoff output that is never compared:
  - The `held` status part, e.g. f10g10 `turn_input`: "you hold for others: Moss-4196 door 9 team certificate 026488".
  - The gamemaker's "Standoffs (pieces not handed over…)" section in the `gamemaker_turn` input.
- The required resume of `snapshot-L7` (with `standInsFor`) is also missing.

**3. Fragment needers come out in a different order.**
- holdings.ts:61 takes needers in `fragments_dealt` holdings order. Old world.ts:2689-2693 used `team.members` order.
- Checked against `snapshot-L7`, level 7: old A03→[A06,A04], new [A04,A06]; old A04→[A06,A03], new [A03,A06]; old A06→[A04,A03], new [A03,A04]. Levels 4 and 5 differ too.
- Effect: in an Act II resume, if A06 is exiled while A03/A04 stand at door 7, the `factor_burned` payload's `needers` differ (old world.ts:2806). The same goes for every user of `StandoffApi.heldPieces` (will, holdout).
- R1 must name the order: team-member order.

**4. Minute-start order is inverted, and it is forced by the dependency rules.**
- Load order follows `requires`: tribunal and seal require exile, and exile requires standoff. So `standoff.minuteStarted` (index.ts:194) runs before the tribunal's and seal's ticks. Old order (world.ts:1314) was tribunal, seal, standoff.
- Scenario: A's gate closes at minute 20 and the A↔B ultimatum is also due at 20.
  - Old: the tribunal exiles A, then `keep` writes `piece_kept` with cause "exile", then the settle finds A's debt lapsed and A is "released".
  - New: the settle runs first, so A pays the penalty and `piece_kept` cause "ultimatum" is seized. Then the exile adds a second `piece_kept` with cause "exile".
- The team only wrote a note about this. A concrete hook-order fix needs to be requested.

**5. The gamemaker's situation data is not reachable.**
- Old `standoffLines` (packages/roles/src/gamemaker/situation.ts:353-382) needs `outstanding()`, `cityPieces`, `ultimatums`, `unused()` and `cityPiecePrice`.
- `StandoffApi` exposes none of these. The facts (index.ts:202) are three integer counts.
- This is golden-visible text (the `gamemaker_turn` input) and there is no request for it. Tribunal (`atRisk`, sessions) and seal will hit the same gap.

**6. Several requests are unsound and the frozen APIs must change.**
- **R4:** voters, prices and deadline cannot be derived from events; the gate's prices are taken from live balances. `ExileApi.toGate` has to change.
- **R5 (end on `runEnded`):** `seal_expired` must come before goals' `goal_resolved` (golden #835 before #836-#850). The `runEnded` order follows load order, so this is not guaranteed, and it breaks entirely for an act that ends mid-run.
- **R8 (trim only):** the old leak, privacy and repeat refusals and the `gamemaker_note` event in `#checked` are lost, so standoff-tribunal's gamemaker tools would answer differently.
- **R2 (adapter through `noteText`):** acceptable, but it would wrongly mark a second piece for the same heir if two pieces share a value. A real `noteGiven` is better.

**7. The ransom price is a copy that can drift.**
- index.ts:26 and :73 duplicate the tribunal's ransom spec as a standoff option. Old code returned 0 when there was no tribunal (world.ts:2639). Any story that sets one without the other diverges.
- The register differs too. Old excluded only the tribunal's `#exiled` (tribunal.ts:717); new excludes `ExileApi.standing === "exiled"`, which also covers residents the holdout struck (world.ts:822).
- Scenario: a story with both a tribunal and a holdout, where one resident was struck: the median, and so the city's price, changes. R6 would make this worse.

## Later (does not break the current goldens)

- **Ultimatum gating:** the old gamemaker offered `ultimatum` only at gm direction ≥ 10 with an ultimatum rule (gamemaker.ts:214, :375). The new tool (index.ts:158) is granted by the story regardless of the dial. Its `author` option (index.ts:33, default COURIER) duplicates the gamemaker spec.
- **Status text is no longer in prompt files:** index.ts:115-122 builds "you hold for others: …" and the piece nouns in code. The old code rendered the prompts `competitor/status/held` and `held-piece`, which a story can override. This breaks the "prompts in files" rule.
- **Snapshot order:** `save` (slice.ts:37) keeps the hand-overs in insertion order, while the old snapshot sorted them. That changes how `unused()` breaks ties after a resume. The 0→1 migration itself is correct. There is no fixture for a real old file with `city`, `ultimatums` or a missing `givenAt`; the test uses a hand-made literal.
- **Cost:** `heldAll` scans the log three times per call and is called for every resident, post and holder (`outstanding`). Acceptable now; R1 removes it.

## Checked and matching the old code

- Tools: check order and error codes of `claim`, `issue`, `settle`, `seize`, `keep` and `noteText`.
- Reply texts; `resolveResident` against `NamesApi.resolve`; `UltimatumParams`.
- The lock condition: alive and `claimable`.
- Payload key order of all five standoff events.
- Channels' `noteText` call sites, which run before marks are spent, as before.
- `carriesValue`; the deal contraction; no `any`, no double casts, no `Math.random` or `Date`; files under 340 lines.

---

## T3 progress (puzzles, progression, goals)

**T3 challenge: puzzles, progression and goals**

**Verdict: not ready for world.ts to be removed.** Each per-mechanic gate does catch a broken line in the event types it owns. But the gates skip whole golden-exercised paths: `getStatus` replies, notice texts, turn inputs, and order across mechanics. Several of those paths already diverge, and the team's own requests R-8, R-9 and R-10 admit the text differs. Puzzles and goals reproduce the deal, the random streams and the events faithfully. Most of the problems are in progression and in its resume path.

How I checked (in a scratch copy at `/tmp/claude-0/-home-user/7f9ccba9-1ee5-5fb7-bed8-8bd1bb371344/scratchpad/repo`; the repository was not touched):
- All 26 T3 tests pass as they stand.
- **Broken golden lines:** I edited one owned line each in `cityofkeys-f4g4.events.jsonl` (`level_up` `to` 8→9, an extra key on a `fragments_dealt`, a `goal_dealt` target). The matching gates failed (puzzles, progression and goals on f4g4), so they are not vacuous for owned lines.
- **`getStatus` added to the replayed tools** (`test/mechanics/progression/harness.ts:68`): both cityofkeys gates fail.

**Must fix before world.ts is removed**

1. **Director actions land before the holder notices.**
   - New `mechanics/progression/src/submit.ts:97-98` emits `level_up`, then runs `notifyHolders`. An immediate listener runs inside the emit (`packages/kernel/src/host/log.ts:100`), so the script's reaction to `level_up` lands before the notices.
   - Old `world.ts:1784-1789` writes `level_up`, then the holder notices, then calls the director (`#enterListeners`).
   - Golden f4g4 seq 483-486: `level_up`, two notices, then `director_action`. Staged calls run only after the whole tool call (`gateway.ts:119`), so they would come after `submission`, while the golden puts the director before `submission`.
   - No request covers this. Progression needs a "resident entered" hook or event fired after `notifyHolders`, or the immediate semantics need a decision.
2. **Holder notice text (R-8).** `submit.ts:110-111` writes "a DM to them costs nothing". The golden has "giving it costs only 2 marks" in 23 notices per cityofkeys log (old `world.ts:1803-1804`). `MarksApi.priceOf` is needed.
3. **Task addenda missing (R-9).**
   - `task.ts:146-165` drops the names, holdout and marks lines (old `world.ts:1571-1590`).
   - The closed-door text (`task.ts:172-175` vs old `world.ts:1555-1559`) and the door-open notice also lose the names line.
   - The golden `turn_input` lines carry the marks addendum 28 times per cityofkeys log and 36 times in whispers.
4. **`getStatus` and `activeTools` replies (R-10), with a gate that hides it.**
   - `tools.ts:30-53` (old `engine/src/tools/status.ts:7-34`) drops the `unread DMs` line and prints `receipts: N` instead of each receipt's line.
   - It lists only the managed tools: no `activeTools` and no dynamic tools such as `vote`, `bid` or `claimPiece`, where the old code used `enabledTools` (`world.ts:1437-1471`).
   - The cityofkeys goldens call `getStatus` 3 times. The gate filters it out (`harness.ts:68`, `TOOLS = getProblem, submitSolution`).
5. **No API for the enabled-tool count.** Every golden `round_end` and `run_end` standing carries `"tools":22` (the old `enabledTools` count). This is step 18, T3's own step, and no request covers it.
6. **Act start and end signals.**
   - `levels.ts:113-133` calls only `goals-extras`. Old `world.ts:852-873` ran seal `begin` after the goal deal, and at the act's end seal `end` before goal resolution.
   - Golden seq 835 has `seal_expired` before the goal ledger entry and `goal_resolved` (836-837). The seal mechanic requires progression, so it loads later and its `runEnded` runs after the goals resolve: wrong order.
   - T4's R5 (act-start/act-end signal) is unanswered. Progression should emit act started/ended, or call one hook in the old order.
7. **Wiring nobody provides.**
   - No mechanic provides `cores-extras` (`mechanics/cores` has no reference to it). Once integrated, goals fall back to random kinds, and the 6 `goal_dealt` golden lines change.
   - Nobody calls `progression-extras` (`endAct`, `chargeBlame`) or `goals-extras` (`noteLeaders`, `noteHeir`). Tribunal-driven act ends (old `world.ts:1321`) and `lead`/`heir` goals are unwired.
8. **The door does not get a second chance to open in a minute.** `index.ts:29-31` runs `openDoor` once, in progression's `minuteStarted`. Old `arena.ts:240-244` runs it again after the tribunal ticks.
   - Case: door 7, A06 the only laggard, the tribunal exiles A06 at the start of minute M. Old: the door opens in M. New: in M+1, because the tribunal loads after progression.
9. **Resume differences (none covered by a fixture).**
   - **Door lost:** `model.ts:180` sets `door = data.door`. Old `world.ts:3101` used `state.door ?? holdAfter`, and kept `doorReleased` only when the door was unchanged. Case: a snapshot whose door was already open, resumed with a new `holdAfter`: old holds there, new never does.
   - **Levels never dealt:** `runStarted` does not run on resume (`host.ts:396`), so puzzles never deals a level that is not in the snapshot and not behind a door. Old `world.ts:3104-3116` dealt it. Submitting on such a level then throws at `submit.ts:53` ("has no code"): the run fails.
   - **No re-deal or validation:** levels no one has reached yet keep their stale saved deal (old re-dealt them from the current story and announced changes, `world.ts:3108-3115`). Reached levels are not checked against the story (old `world.ts:3120-3135`).
   - **Act starts:** a legacy snapshot without `actStarts` gets no `startLevel → 0` entry (old `world.ts:3103`), so `actStart` is null and brake timing differs. The old `#noteActStarts(max reached)` on restore is missing.
   - **Tasks shown:** `migrateV0` (`model.ts:195-197`) ignores the arena's `delivered` and sets `finished:false`.
     - A snapshot taken at a minute loses the task of anyone who levelled up in the last round.
     - A finished resident gets the finished notice again.
10. **Guard secrets count undelivered DMs.** `guard.ts:136-137` includes every DM addressed to the resident. Old `world.ts:1898-1900` counted only delivered ones. This needs `deliveredMinute` on the frozen `DmRecord` (`shared/src/schemas.ts:53`), another missing request.
    - Case: a DM with a password run is queued but not delivered. The recipient's later post quoting that run is now blocked; before it was not.

**Should fix (behaviour, not exercised by the goldens)**

11. **`listAgents` omits cast members.** `tools.ts:117` lists `ctx.residents.ids` only. Old `world.residents()` (`world.ts:1408-1413`) included active cast members. Case: after `cast_revealed`, the cast member's line is missing.
12. **`runEnded` skips acts on every stop.** `index.ts:43` skips `endAct` whenever the reason is `"stopped"`. Old `arena.ts:223` skipped only at a snapshot or brake pause. A stop for "seats decided", if done through `host.stop`, would lose `goal_resolved`.
13. **`lastProgress` differs from the old port.** `services.ts:37-40` returns null and reads `submission` events. Old `world.ts:572-575` returned -1 and read level receipts. The tribunal's sort needs the -1 mapping.
14. **A catch that hides errors.** `levels.ts:151` swallows every error in `setLock`, not only "tool not defined".
15. **Task marked shown when the inputs are built.** `taskLines` mutates `delivered` inside `turnInputs` (`task.ts:197-199`). The API says to mark things as seen in `turnOpened`, so anything that only previews inputs uses up the task.

**Gate quality**
- The progression gate compares neither the `notice` texts (they are recorded by the channels stand-in but never checked) nor `turn_input`. Its snapshot test compares only `competitors` (`progression.test.ts:66-70`).
- The puzzles gate keeps only minute-0 lines (`puzzles.test.ts:21`). That is fine for today's goldens, which have only deals at minute 0 plus 2 `factor_revealed`, but it would silently drop door deals later in a run.
- `factor_burned`, `level_contracted`, door deals, `tools_unlocked` and rate limits have no golden data and no comparison against the old code.

**Clean**
- Random streams are the same: `puzzle`, `teams`, `split`, `leader` and `goals` labels equal the old `rngFor` calls.
- No `Math.random` or `Date`, no `any`, no casts. The largest file is 271 lines.
- `additive.ts`, `fragments.ts`, `secrets.ts` and the goals deal and resolution logic match the old code line for line, apart from imports.
- Event payload key order matches the schemas.
- The extras copies kept in two packages are identical.
