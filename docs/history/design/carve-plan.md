# Carve plan: from `world.ts` to mechanics

> **Carried from the old platform.** This paper was written for the old platform, before the rewrite, and is kept as
> it was, except for its links. Links to the other papers of [`docs/history/`](../README.md) stay relative; paths into
> code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do not exist on this
> branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Status: written in wave 2b (2026-10-31) for the wave 3 teams; corrected in wave 3.0 after the core
review ([`core-review-2c.md`](core-review-2c.md), "Carve plan corrections"). The team briefs are
[`carve-team-T1.md`](carve-team-T1.md) (economy), [`carve-team-T2.md`](carve-team-T2.md)
(messages), [`carve-team-T3.md`](carve-team-T3.md) (progress) and
[`carve-team-T4.md`](carve-team-T4.md) (conflict). The line numbers are those of
`packages/engine/src/world.ts` (3202 lines) at commit `f154c13`. They move as soon as anything
is carved, so a team looks a function up by its name and uses the range only to find its
neighbours. The API is [`mechanic-api.md`](mechanic-api.md); the split comes from
[`docs/ideas/monorepo.md`](../ideas/monorepo.md) §3d.

## How to carve one mechanic

1. Write the mechanic in its package `mechanics/<id>/` (`@swarmtales/mechanic-<id>`) against the
   new core (`defineHead`, `defineMechanic`). The package exists since wave 3.0 with the head
   (`<id>Head`) that names the APIs it provides, requires and uses; the APIs, the events other
   mechanics listen to and the shared schemas are in `mechanics/shared`
   (`@swarmtales/mechanic-shared`) and frozen. A mechanic package depends on
   `@swarmtales/contracts`, `@swarmtales/kernel` and `@swarmtales/mechanic-shared` only, never on
   another mechanic (`scripts/check-packages.ts`). Copy the helper class from
   `packages/engine/src/` (`MarksBook`, `PetitionBook`, ...) in; nobody deletes engine code before
   step 18.
2. Its events keep their old names and fields (the owners are in
   `packages/chronicle/src/log/legacy-owners.ts`), so the legacy adapter writes the golden lines
   unchanged. A payload field may not be called `type`, `seq` or `minute`.
3. Its snapshot slice starts at version 1 with a migration from the version-0 slice that
   `convertLegacySnapshot` cuts out of the old world snapshot (`LEGACY_WORLD_OWNERS` in
   `packages/chronicle/src/snapshot/legacy-snapshot.ts`). The test resumes
   `examples/cityofkeys-act1-06a-04/snapshot-L7.json`.
4. Old tools move as tools of the mechanic; `withResidents` (names for ids) becomes the `names`
   mechanic's `presentation.resolve`, never code in the tool.
5. The golden runs stay byte-identical. Until the turn loop moves (step 18) the old engine keeps
   running the goldens, so each mechanic has its own gate: the golden lines of its event types
   (`ownedBy(readLegacyLog(golden), ["<id>"])` from `@swarmtales/testkit`) must equal the lines its
   mechanic writes on the new host through the legacy adapter (`compareGolden`), for the calls of
   the golden run (`goldenCalls`). The providers it needs from other teams are stand-ins in its
   tests (a small `defineMechanic` that provides the frozen API with fixed answers). A mechanic is
   done when its gate is green; the whole golden comparison runs at step 18.

## Order

The order follows the `requires` graph: a mechanic comes after the ones it calls (hard), and
after a loaded provider of an API it `uses` where that is possible (soft; the old engine's
callbacks, a cycle there is allowed). Since the APIs are frozen in `mechanics/shared`, the four
teams work at the same time; the order says in which order a team merges its steps and which
real providers a step can test against. `test/mechanics/packages.test.ts` checks that the heads
have no `requires` cycle and that this order respects `requires`.

| Step | Mechanic | Team | Requires | Uses (optional) | Why here |
|---|---|---|---|---|---|
| 1 | names | T1 | none | puzzles (password pieces) | everything shows names; resolver and formatter |
| 2 | ledger | T1 | none | | every price and reward |
| 3 | marks | T1 | ledger | | the price of a message |
| 4 | channels | T2 | ledger, marks, names | receipts, cast, standoff, standoff-tribunal | board, DMs, notices, groups |
| 5 | receipts | T1 | channels, ledger | | receipts of transfers and DMs, blame |
| 6 | whispers | T1 | receipts, channels, ledger, marks | exile | the whisperer and popularity |
| 7 | puzzles | T3 | none | | deals and secrets; the guard's secrets; exclusions |
| 8 | progression | T3 | puzzles, ledger, channels, receipts | | levels, submissions, doors, tools, the status line |
| 9 | cast, motives, goals | T2, T2, T3 | cast: channels, progression, ledger; motives: channels; goals: progression, channels | | figures, motives, goals (parallel) |
| 10 | petitions | T2 | channels, ledger | | signatures |
| 11 | standoff | T4 | puzzles, progression, ledger, channels | | pieces and ultimatums |
| 12 | exile | T4 | progression, channels, ledger, standoff, puzzles | seal, goals | ransom, will, gates |
| 13 | tribunal | T4 | exile, channels, ledger, progression | | votes and factions |
| 14 | seal | T4 | ledger, progression, channels, exile, tribunal | | the auction |
| 15 | standoff-tribunal | T4 | standoff, puzzles, exile, channels | | the holdout tribunal |
| 16 | script | T3 | none | channels, progression, cast, petitions, ledger, puzzles | the director as staged calls |
| 17 | gamemaker tools | each team | the mechanic each tool acts on | | tools with `serves: ["gamemaker"]` |
| 18 | arena → turn loop | T3 | none | progression, ledger | the old `Arena` becomes a turn policy plus the runner |

Corrections against wave 2b: progression requires receipts (its reply names the receipt, and
`receipt_issued` precedes `level_up`); tribunal requires progression (`lastProgress`, `passed`,
`doorShut`, `actStart`, `tribunal.ts:82-90`); seal comes after exile and tribunal (it needs
`ExileApi.standing`, `strike` and `TribunalApi.missing`, `seal.ts:31-39`) and exile calls it back
through `uses`; exile requires standoff (`heldPieces`, `keep`) and puzzles (`burn`, `contract`,
`world.ts:2795-2819`); `level_contracted` belongs to puzzles (the exclusions are its state);
whispers needs ledger and marks, not the tribunal (the duty follows the popularity count,
`world.ts:988-998`), so it moves up to step 6; channels calls standoff (`noteText`),
standoff-tribunal (`exemptFromCap`), receipts (`memoTransfers`) and cast (`isActive`, `receive`)
through `uses`; puzzles needs no names (the display is the names mechanic's presentation).

## The mechanics

Each entry lists what it takes from `world.ts` (fields 441-505, constructor 507-797, methods),
from other engine files, its events, tools, story specs, its slice and what it provides and
requires. The APIs and their method names are those of `mechanics/shared` (frozen in wave 3.0);
the method summaries there name the old code each one replaces. Where an entry below and the
shared module disagree, the shared module wins.

### 1. names

- **world.ts:** field `#names`; `hasNames` 1331, `nameOf` 1336, `labelOf` 1341, `canChooseName`
  1346, `namesUntil` 1351, `chooseName` 1355-1359, `resolveResident` 1365-1367, `display`
  1370-1374, `#isPasswordPiece` 1377-1382, `#announceName` 1384-1389.
- **Other files:** `names.ts` (`NameBook`), `labels.ts`, `withResidents` in `tools/tool.ts`.
- **Events:** `name_chosen`. **Tools:** `chooseName`. **Spec:** `names` (`NamesSpec`).
- **Slice:** `names`.
- **Provides:** `NamesApi` (`nameOf`, `labelOf`, `resolve`); `presentation.resolve` (a name where
  an id goes) and `presentation.display` (ids to names in every text). **Requires:** none.
  **Uses:** `PuzzlesApi.passwordPiece` for `#isPasswordPiece` (a cycle with puzzles through `uses`
  is allowed; names loads first).

### 2. ledger

- **world.ts:** field `ledger`; `checkTransfer` 1975-1988, `transfer` 1990-2003, `escrowTransfer`
  2006-2017, `adjustPoints` 2068-2071, `#canAfford` 3151, `#spend` 3155.
- **Other files:** `packages/kernel/src/ledger.ts` (the old `Ledger`).
- **Events:** `ledger_entry`, `transfer`. **Tools:** `transferPoints` (the receipt part moves to
  receipts, step 5). **Spec:** `run.startPoints`.
- **Slice:** `ledger`.
- **Provides:** `LedgerApi` (`balance`, `balances`, `mint`, `burn`, `move`); events `ledger_entry`,
  `transfer` (`LedgerEvents`, frozen). **Requires:** none.
  `test/host/proof/ledger.ts` is the shape to follow.

### 3. marks

- **world.ts:** field `marks`; `#withMarks` 1604-1620 (its task part), the marks part of
  `status` 1484-1501.
- **Other files:** `marks.ts` (`MarksBook`).
- **Events:** `marks_spent`. **Tools:** none. **Spec:** `rules.marks`, `levels[].marks`.
- **Slice:** `marks`.
- **Provides:** `MarksApi` (`canAfford`, `left`, `spend`), a `status` part (`STATUS_ORDER.marks`),
  the refill job.
  **Requires:** `LedgerApi`.

### 4. channels

- **world.ts:** fields `board`, `groups`, `#mailboxes`, `#notices`, `#dms`, `#numbers`;
  `postBoard` 2077-2087, `postAsSystem` 2090, `readBoard` 2094, `sendDm` 2098-2122, `dmWindow`
  2130-2138, `drainMailbox` 2173-2190, `pendingDms` 2192, `notify` 2197, `note` 2203-2208,
  `lastMessageNumber` 2211, `drainNotices` 2215, `pendingNotices` 2219, `dmRecords` 2244,
  groups 2431-2544 (`createGroup` to `groupUnread`), `#noteReply` 3145, `#mailbox` 3168,
  `#noticesOf` 3174.
- **Other files:** `board.ts`, `groups.ts`, `mailbox.ts`, `numbers.ts`; `dmLine`, `noticeLine` in
  `turn-input.ts`.
- **Events:** `board_post`, `dm_sent`, `dm_delivered`, `notice`, `group_created`, `group_removed`,
  `group_membership`, `group_post`, `treasury_deposit`, `treasury_withdrawal`, `treasurer_set`,
  `treasury_settled`.
- **Tools:** `readBoard`, `postBoard`, `sendDM`, `createGroup`, `addGroupMember`,
  `removeGroupMember`, `leaveGroup`, `listMyGroups`, `postGroup`, `readGroup`, `depositGroup`,
  `withdrawGroup`, `setTreasurer`. **Spec:** `rules.dmLimit`, `guards` (the guard policy on
  `sendDM` and `postBoard`).
- **Slice:** `channels` (board, groups, dms, messages) and `inboxes` (per resident mailbox and
  notices, cut from the old competitor records).
- **Provides:** `ChannelsApi` (`post`, `notify`, `note`, `deliver`, `takeNumber`, `dmWindow`,
  `dmRecords`, `createCityGroup`, `removeCityGroup`, `postGroupAsCity`); events `board_post`,
  `dm_sent` (`ChannelsEvents`, frozen); turn inputs of kinds `dm`, `notice`; the `dmWindow` status
  part; the `news` hook (unread mail). **Requires:** `LedgerApi`, `MarksApi`, `NamesApi`.
  **Uses:** `ReceiptsApi.memoTransfers` (the DM cap), `CastApi` (DMs to a cast member),
  `StandoffApi.noteText` (every post and DM), `StandoffTribunalApi.exemptFromCap`. It listens to
  `exiled` (`ExileEvents`).

### 5. receipts

- **world.ts:** fields `receipts`, `#blames`; `receiptsOf` 2023, `showReceipt` 2033-2053,
  `#issue` 2055-2065, `openBlame` 2229, `settleBlame` 2234, `cancelBlame` 2239, the blame part of
  `#offencesOf` 1283-1289, `nextBlamePenalty` 1297-1300, `#chargeBlame` 1303-1307.
- **Other files:** `receipts.ts` (`ReceiptBook`), `blame.ts` (`BlameDesk`).
- **Events:** `receipt_issued`, `receipt_shown`, `blame`. **Tools:** `showReceipt`, `blame`.
- **Spec:** `rules.receipts`, `rules.blame`, the classifier/judge role.
- **Slice:** `receipts` (receipts and blames).
- **Provides:** `ReceiptsApi` (`issue`, `count`, `memoTransfers`, `describe`); the `receipts`
  status part. **Requires:** `ChannelsApi`, `LedgerApi`; it listens to `transfer` and `dm_sent`. `blame` uses the `consult` stage with role `judge`
  (`JUDGE_ABSENT` / `JUDGE_FAILED` come from `consulted.reason`).

### 6. whispers

- **world.ts:** fields `#whisperer`, `#forgeries`, `#quota`, `#whispererDefies`, `#popularity`;
  `whisperer` 944-946, `popularity` 949-951, `whisperQuota` 954-956, `mayForge` 959-961,
  `#chooseWhisperer` 968-979, `#whisperDuty` 982-986, `#whisperDutyAfterVote` 989-998,
  `#dutyReport` 1006-1030, `#tally` 1033-1036, `whisperDutyNow` 1044-1065, `#sendDuty`
  1068-1092, `forgeReceipt` 1103-1124, `nameFavourite` 1127-1130.
- **Files:** `whisperer.ts`, `popularity.ts` (`PopularityVote`). **Events:** `whisperer_chosen`,
  `whisper_duty`, `popularity_opened`, `popularity_ballot`, `popularity_result`,
  `receipt_forged`. **Tools:** `forgeReceipt`, `nameFavourite`. **Spec:** `whisperer`,
  `popularity`. **Slice:** `whispers`.
- **Requires:** `ReceiptsApi`, `ChannelsApi`, `LedgerApi`, `MarksApi`. **Uses:** `ExileApi` (who
  is still in the city). Not the tribunal: the duty follows the popularity count.

### 7. puzzles

- **world.ts:** fields `#levelStates`, `#cityFactorHolders`, `#exclusions`; `inspect`
  2850-2870, `#dealView` 2822, `#inheritedFragments` 2831-2847, `#solutionOf` 2872,
  `#fragmentPuzzleOf` 2880, `#levelState` 2889, `#dealLevel` 2901-2937, `#announceDeal`
  2940-2956, `#puzzleValues` 1623-1644, `#factorsBlock` 1651-1677, `revealFactor` 2566-2587,
  `teamsOf` 2551, `teamOf` 2555, `secretsOf` 1896-1916, `#guardedLevels` 1919-1927,
  `receiptCarriesFragment` 1936-1944, `isDealt` 1879.
- **Other files:** `puzzles/`, `teams.ts` (`TeamPlanner`), `secrets.ts`.
- **Events:** `fragments_dealt`, `factors_dealt`, `factor_revealed`, `factor_burned`.
- **Tools:** none of its own (the `getProblem` text comes from its turn input part).
- **Spec:** `levels[].puzzle`, `levels[].team`.
- **Slice:** `puzzles` (levels, cityFactors, exclusions).
- **Events:** also `level_contracted` (moved from progression: the exclusions are this
  mechanic's state; exile asks for it with `contract`).
- **Provides:** `PuzzlesApi` (`deal`, `isDealt`, `solutionOf`, `teamOf`, `passwordPiece`,
  `lacking`, `carriesSecret`, `burn`, `contract`); `guard.secrets` and `guard.leaks` (the old
  `secretsOf` and the leaked-run check). **Requires:** none. The deal draws from
  `ctx.rng("puzzle", level)`, the old stream.

### 8. progression

- **world.ts:** fields `startLevel`, `lastLevel`, `#states` (agent, level, held, solved,
  wrongAttempts, extraTools), `#planner`, `#finalTools`, `#holdAfter`, `#door`, `#doorReleased`,
  `#actStarts`, `#endedActs`, `#offences`, `#enterListeners`; acts 832-880 (`actStartOf`,
  `currentAct`, `isActOver`, `#noteActStarts`, `#endAct`, `closeActs`), `nextPenalty`
  1292-1294, `startMinute` 1310-1324, `onLevelEnter` 1395, `levelDefinition` 1419, `levelOf`
  1423, `isPlayable` 1428, `isFinished` 1432, `enabledTools` 1437-1471, `isToolEnabled` 1473,
  `unlockTools` 1477-1482, `status` 1484-1501, `#standingField` 1503-1506, `seatsDecided`
  1516-1523, `#reachablePoints` 1526-1533, `ranking` 1535-1541, tasks 1544-1598
  (`currentProblem`, `problemFor`, `#renderTask`, `#withHoldoutRule`, `#withNameChoice`),
  submitting 1683-1832 (`submit`, `#submit`, `#enterLevel`, `#notifyHolders`, `#holdersOf`,
  `holdersBehind`, `piecesAwaited`, `awaitsCode`, `hasPassed`, `waitingAfter`), doors 1838-1883
  (`door`, `openDoor`, `releaseDoor`, `doorReleased`, `#isBehindDoor`), clock 1947-1972
  (`opensAt`, `isOpenOnClock`, `#openOnClock`), `levelSnapshot` 3181, `counted` 3200.
- **Other files:** `penalties.ts`, `statusLine` in `turn-input.ts` (the status line becomes a
  `status` kind with `join`, each mechanic adding its part).
- **Events:** `submission`, `level_up` (`ProgressionEvents`, frozen), `tools_unlocked`.
- **Tools:** `getStatus`, `getProblem`, `submitSolution`, `listAgents`, `activeTools`.
- **Spec:** `levels`, `acts`, `rules.penalty`, `rules.maxAttemptsPerWindow`,
  `rules.attemptWindowMinutes`, `finishedNotice`, `run.survivors`, `toolScope`.
- **Slice:** `progression` (door, doorReleased, actStarts, offences, endedActs and the per
  resident part of the competitor records).
- **Provides:** `ProgressionApi` (see `mechanics/shared/src/progress.ts`); locks with
  `ctx.access` instead of `enabledTools`; the status line's frame (`minute`, `level`, `rank`,
  `awaitsCode` parts) and the `task` input kind. **Requires:** `PuzzlesApi`, `LedgerApi`,
  `ChannelsApi`, `ReceiptsApi` (the level-up receipt).

### 9. cast, motives, goals

- **cast. world.ts:** fields `cast`, `#cast`, `#collectListeners`; `setCastLevel` 2252,
  `revealCast` 2256, `retireCast` 2262, `castDm` 2161-2165, `#dmToCast` 2145-2158,
  `startCollection` 2268, `shortenCollection` 2275, `firstSolveMinute` 2282, `collection` 2289,
  `revealCollection` 2298-2315, `drawLottery` 2318-2326, `onCollect` 1403, `isCompetitor` 1391,
  `residents` 1408-1413. **Files:** `cast.ts`. **Events:** `cast_level_set`, `cast_revealed`,
  `cast_retired`, `cast_dm`, `collection_started`, `collection_shortened`, `collection_revealed`,
  `lottery_drawn`. **Spec:** `cast`, `personas`, `personaAssignment`. **Slice:** `cast`.
  **Provides:** `CastApi`, event `cast_dm` (`CastEvents`, frozen); turn input `character` (the
  figure cues go to script). **Requires:** `ChannelsApi`, `ProgressionApi`, `LedgerApi` (escrow).
- **motives (was cores). world.ts:** fields `#coreMotives`, `#playsCoreMotives`; `#dealCoreMotives` 887-897, `coreMotiveOf` 900-902.
  **Files:** `motives.ts`. **Events:** `core_dealt` (legacy name, see rename-core-motive.md). **Spec:** `coreMotives`. **Slice:** `motives`.
  **Requires:** `ChannelsApi`.
- **goals. world.ts:** field `#goals`; `goalOf` 905-907, the goal parts of `status` and of the
  act end. **Files:** `goals.ts` (`GoalBook`). **Events:** `goal_dealt`, `goal_resolved`.
  **Spec:** `goals`. **Slice:** `goals`. **Provides:** `GoalsApi.onExiled` (exile calls it in the
  old order). **Requires:** `ProgressionApi`, `ChannelsApi`.

### 10. petitions

- **world.ts:** fields `petitions`, `#petitionListeners`; `openPetition` 2332-2361,
  `signPetition` 2363-2370, `expirePetitions` 2373, `closePetitions` 2381, `#resolvePetition`
  2385-2403, `onPetitionResolved` 1399.
- **Files:** `petitions.ts` (`PetitionBook`). **Events:** `petition_opened`, `petition_signed`,
  `petition_resolved`. **Tools:** `signPetition`, `listPetitions`. **Spec:** the `openPetition`
  director action. **Slice:** `petitions`.
- **Provides:** `PetitionsApi` (`open`), event `petition_resolved` (`PetitionsEvents`, frozen;
  the script runs `onPass`/`onFail`). **Requires:** `ChannelsApi`, `LedgerApi`.

### 11. standoff

- **world.ts:** field `#standoff`; `cityPiecePrice` 2639, `claimPiece` 2644-2651,
  `unusedHandOvers` 2654, `issueUltimatum` 2659-2664, `hasUltimatums` 2667,
  `outstandingPieces` 2672, `cityPieces` 2677, `ultimatums` 2682, `heldPieces` 2686-2720,
  `heldPart` in `turn-input.ts`.
- **Files:** `standoff.ts` (`StandoffBook`). **Events:** `piece_kept`, `piece_claimed`,
  `piece_given`, `ultimatum_set`, `ultimatum_resolved`. **Tools:** `claimPiece`; gamemaker
  `ultimatum` (step 17). **Spec:** `rules.ultimatum`. **Slice:** `standoff`.
- **Provides:** `StandoffApi` (`heldPieces`, `keep`, `noteText`, `cityPiecePrice`).
  **Requires:** `PuzzlesApi`, `ProgressionApi`, `LedgerApi`, `ChannelsApi`.

### 12. exile

- **world.ts:** field `#tribunal`'s gates, exiled and ransomed parts; `isExiled` 816-818,
  `standingOf` 821-824, `payRansom` 2616-2626, `lastWill` 2730-2787, `#onExiled` 2795-2819,
  `#onStruck` 1263-1277.
- **Files:** the exile part of `tribunal.ts`, `tribunal-rules.ts`. **Events:** `exile_gate`,
  `ransom_paid`, `ransomed`, `exiled`, `last_will`. **Tools:** `payRansom`, `lastWill`.
  **Spec:** `tribunal` (ransom and gate numbers). **Slice:** `exile` (gates, exiled, ransomed).
- **Provides:** `ExileApi` (`isExiled`, `standing`, `alive`, `toGate`, `strike`), event `exiled`
  (`ExileEvents`, frozen); a suspension per exiled resident (the converter writes it).
  **Requires:** `ProgressionApi`, `ChannelsApi`, `LedgerApi`, `StandoffApi` (`heldPieces`,
  `keep`), `PuzzlesApi` (`burn`, `contract`). **Uses:** `GoalsApi.onExiled`, `SealApi.onExiled`
  (the old `#onExiled` order: pieces, burn, goal, seal, contraction).

### 13. tribunal

- **world.ts:** the rest of `#tribunal`; `vote` 2593, `nominate` 2599, `joinFaction` 2605,
  `refuseApplicant` 2611, `tribunalParts` and `draftParts` in `turn-input.ts`.
- **Files:** `tribunal.ts` (`Tribunal`), `factions.ts` (`FactionDraft`). **Events:**
  `tribunal_announced`, `tribunal_scheduled`, `tribunal_cancelled`, `tribunal_called`,
  `tribunal_opened`, `faction_nominated`, `faction_leaders`, `faction_applied`,
  `faction_refused`, `factions_formed`, `bloc_result`, `tribunal_vote`, `tribunal_result`.
  **Tools:** `vote`, `nominate`, `join`, `refuse`; gamemaker `scheduleTribunal`. **Spec:**
  `tribunal`. **Slice:** `tribunal`.
- **Provides:** `TribunalApi` (`missing`, `inSession`). **Requires:** `ExileApi`, `ChannelsApi`,
  `LedgerApi`, `ProgressionApi` (`lastProgress`, `passed`, `doorShut`, `actStart`).

### 14. seal

- **world.ts:** field `#seal`; `bidForSeal` 928-931, `breakSeal` 934-937; the seal part of
  `status` (`sealParts` in `turn-input.ts`).
- **Files:** `seal.ts` (`SealHouse`). **Events:** `seal_auction_opened`, `seal_bid`, `seal_won`,
  `seal_used`, `seal_expired`. **Tools:** `bid`, `permaDeath` (resident variant).
  **Spec:** `seal`. **Slice:** `seal`.
- **Provides:** `SealApi.onExiled`. **Requires:** `LedgerApi`, `ProgressionApi`, `ChannelsApi`,
  `ExileApi` (`standing`, `strike`), `TribunalApi` (`missing`): it comes after exile and tribunal.

### 15. standoff-tribunal

- **world.ts:** field `#holdout`; `holdout` 1137-1139, `lackingFragment` 1148-1158,
  `#holdsFragment` 1171-1178, `#lackingFacts` 1181-1190, `#presentAtDoors` 1193-1195,
  `#openFragmentDoors` 1197-1203, `callHoldoutTribunal` 1206-1218, `drawHoldoutLot` 1221-1226,
  `holdoutPermaDeath` 1229-1234, `announceHoldout` 1237-1240, `tribunalVote` 1243-1246,
  `#residentIds` 1249-1253, `#withHoldoutRule` 1592, `holdoutParts` in `turn-input.ts`.
- **Files:** `holdout.ts` (`HoldoutTribunal`). **Events:** `blocker_found`, `blocker_cleared`,
  `holdout_called`, `lot_drawn`, `holdout_vote_opened`, `holdout_ballot`,
  `holdout_vote_result`, `holdout_announced`, `holdout_ended`. **Tools:** `tribunalVote`;
  gamemaker `callTribunal`, `drawLot`, `announceTribunal`, `permaDeath` (step 17).
  **Spec:** `holdout`. **Slice:** `standoff-tribunal`.
- **Provides:** `StandoffTribunalApi.exemptFromCap`. **Requires:** `StandoffApi`, `PuzzlesApi`,
  `ExileApi`, `ChannelsApi` (it keeps its own ballot, so no `TribunalApi`).

### 16. script

- **world.ts:** `publishBands` 2409-2420, `publishSnapshot` 2422-2425.
- **Files:** `director.ts` (`Director`: `startMinute` 147-186, `#onEnter` 239-253,
  `#onPetitionResolved` 255-272, `#onCollect` 275-279, the checks 281-323, `#fire` 329-336,
  `#holds` 338-369, cooldowns 371-388, `#run` 394-410, `#execute` 413-526, `#forEachTarget`
  533-550, `#render` 557-570), `direction.ts` (`FigureCues`), `standings.ts`, `scheduler.ts`.
- **Events:** `director_action`, `director_skipped`, `standings_published`. **Spec:** `director`
  (`DirectorRule`), the `when` triggers. **Slice:** `script` (the old `director` field).
- Each action of `#execute` becomes a staged call (`ctx.stage`) of the mechanic that owns the
  tool, or a command of its API; triggers become listeners (`kit.listen`) and jobs.
- **Uses:** the APIs of the mechanics its rules direct (channels, progression, cast, petitions,
  ledger, puzzles); a story without a rule for a mechanic does not need that mechanic loaded. It
  reacts to `level_up` with an immediate listener (`ProgressionEvents`), so its actions land before
  the `submission` that caused them, as in the goldens; its staged calls chain with `then`.

### 17. gamemaker tools

- **Files:** `packages/roles/src/gamemaker/gamemaker.ts`: `notify` (from line 240),
  `postBoard` (261), `scheduleTribunal` (291), `callTribunal` (310), `drawLot` (329),
  `announceTribunal` (342), `permaDeath` (359), `ultimatum` (381), `#checked` (394).
  `defy` (`tools/defy.ts`) and `defyGamemaker` 921-926 in world.ts.
- **Events:** `gamemaker_note`, `gamemaker_defied`; the role's own events (`gamemaker_turn`,
  `gamemaker_call`, ...) are app events (`host.record`).
- Each tool goes to the mechanic it acts on, with `serves: ["gamemaker"]` where a resident tool
  has the same name (`postBoard`, `permaDeath`). `#checked` becomes a `rule` of those tools.
  The gamemaker's turn runs in the host's `between` slot. **Spec:** `gamemaker` (`GamemakerSpec`):
  grants go to `grants.gamemaker`.

### 18. arena → turn loop

- **Files:** `arena.ts` (`Arena`): `run` 147-228, `#nextMinute` 236-248, `#takeSnapshot`
  251-261, `#applyBrakes` 270-294, `snapshot` 296-313, `#restore` 315-327, `#stopReason`
  335-349, `#budgetReason` 351-356, `#inputsFor` 362-383, `#hasNovelty` 391-400, `#playBlock`
  408-437, `#markSeen` 451-454, `#standings` 456-466; `turn-input.ts` (`digestLine` 138).
- **Events:** `run_start`, `round_start`, `pass_start`, `round_end`, `turn_skipped`,
  `act_brake`, `run_end`. The host writes `pass_started` and `turn_skipped`; the adapter turns
  them into `round_start`, `pass_start` and `turn_skipped`. `run_start`, `round_end`,
  `act_brake` and `run_end` are an `arena` mechanic's events; it must emit `run_start` after the
  other mechanics' `runStarted` hooks (load it last) to keep the golden order.
- **Spec:** `run` (`passesPerMinute` → `turns.passes`, `blockSize` → `turns.blockSize`,
  `activation: "onNovelty"` → `turns.activation: "onNews"`, `stopWhenDone`,
  `stopWhenSeatsDecided`, `budgetUsd` → referee cost cap). The old order is
  `rngFor(seed, "order", round, pass)`: give it as `turns.order` so the goldens keep their order.
- **Turn input kinds:** `#inputsFor` 362-383 orders: `character` (the cues of `FigureCues`,
  `direction.ts`, which go to script), `status`, then once per level either `task` or the
  finished notice (kind `notice`, but placed before the DMs), `dm`, `notice`, `digest`; then
  `display` over all. With kinds, give the finished notice its own kind (say `task`, as
  progression writes it) so it stays before `dm`: `turns.inputs: [character, status, task, dm,
  notice, digest]`. The "task once per level" memory (`#deliveredLevel`, `#deliveredFinished`)
  moves into progression. Novelty (`#hasNovelty`) becomes each mechanic's `news` hook;
  `#markSeen` its `turnOpened`.
- **Slice:** `arena` (the old arena snapshot).

## Teams, gates and shared files

Four teams carve at the same time (core-review-2c.md, "Recommended partition"); each has a brief:

| Team | Mechanics | Brief |
|---|---|---|
| T1 economy | names, ledger, marks, receipts (with blame), whispers | [`carve-team-T1.md`](carve-team-T1.md) |
| T2 messages | channels (13 tools), petitions, cast, motives | [`carve-team-T2.md`](carve-team-T2.md) |
| T3 progress | puzzles, progression (status line, `task` kind), goals; later script and the turn loop | [`carve-team-T3.md`](carve-team-T3.md) |
| T4 conflict | standoff, exile, tribunal, seal, standoff-tribunal | [`carve-team-T4.md`](carve-team-T4.md) |

Each gamemaker tool goes to the team that owns its mechanic (step 17).

**Gate per team.** A step is green when `pnpm check` is green and the mechanic's golden gate holds:
for every golden log in `test/golden/`, `ownedBy(lines, [id])` equals what the mechanic writes for
the replayed `goldenCalls` on the new host (stand-ins for other teams' providers, `standInsFor` for
the slices of mechanics not carved yet). From round 2 the gate also compares the replies
(`compareReplies`), notices (`goldenNotices`), turn inputs (`goldenTurnInputs`) and the order
across mechanics (`goldenOrder`), and leaves lines out only through `dropJustified`. The goldens themselves and `packages/engine` stay
unchanged (no `GOLDEN_UPDATE`).

**Shared files, one owner each** (the integration owner of wave 3, the lead): nobody else edits
`packages/engine/src/world.ts` (teams copy from it; it is cut at step 18), `turn-input.ts`,
`packages/contracts/src/story.ts`, `tool-names.ts`, `library/prompts/competitor/status/*`,
`packages/chronicle/src/log/legacy-owners.ts`, `LEGACY_WORLD_OWNERS`, this plan, `mechanics/shared`,
`pnpm-workspace.yaml`, the root `tsconfig.json` and `package.json`, `knip.json`,
`scripts/check-packages.ts` and the core (`packages/contracts/src/core`, `packages/kernel/src/host`).
A team that needs a change there asks for it; the change lands in its own PR first.

**Wave 3.5** (`carve-decisions.md`) answered every request and challenger finding: the order
table `HOOK_ORDER`/`LISTENER_ORDER` (proved on the goldens by `test/mechanics/order.test.ts`), the
silent events, the new shared methods, `CoresApi` and `NotesApi`, and the strict gate helpers of
the testkit. Round 2 of each team follows `carve-round2-T1.md` to `-T4.md`; T4 splits into T4a
(exile, tribunal) and T4b (seal, standoff-tribunal, standoff).

**Frozen in wave 3.0** (`mechanics/shared`, fingerprinted in `test/mechanics/shared-frozen.test.ts`):
every API (`NamesApi` to `StandoffTribunalApi`), the events other mechanics listen to (`exiled`;
`level_up`, `submission`; `dm_sent`, `board_post`; `ledger_entry`, `transfer`; `petition_resolved`;
`cast_dm`), the shared schemas (`ResidentId`, `Done`, `Standing`, `ReceiptBody`, `HeldPiece`, ...),
the turn input kinds (`INPUT_KINDS`) and the status order (`STATUS_ORDER`). The emitter spreads the
shared declaration into its head (`events: { ...ExileEvents.events, ... }`); a listener uses
`kit.listen(ExileEvents, "exiled", fn)`. The core's API (`mechanic-api.md`) is frozen as well.

## Risks

- **Status line order.** The old status line is one function (`statusLine`, `turn-input.ts`
  10-54); split into `status` parts, each part carries `order: STATUS_ORDER.<part>`, so the load
  order does not matter. Check the order against the goldens when the parts arrive.
- **The finished notice** is a `notice` placed before the DMs; grouped by kind it would move
  behind them and change every golden prompt. Give it the `task` kind.
- **The guard covers residents only** and takes one policy per tool, as the old engine did.
- **Locks.** The converter does not derive locks from the old state; without `locks` the story's
  start locks hold on resume. Progression must rebuild them on load (migration 0 → 1) or the
  story passes `locks`.
- **Staged calls in `runEnded` are dropped.** The director's last actions must run earlier
  (calls staged in `minuteEnded` run before `minute_ended`).
- **Frozen APIs may be wrong.** They are written from `world.ts`, not from carved code. A team
  that finds a method missing or wrong asks the integration owner; it does not work around the API
  with an event or a second channel.
- **Uncovered slices.** No example snapshot holds standoff, holdout, seal or whispers state; T1 and
  T4 write their own fixtures for the migration from version 0.
- **Blocks.** A test asserts the order of calls in a block, not the order of `turnOpened`.
