# Carve plan: from `world.ts` to mechanics

Status: written in wave 2b (2026-10-31) for the wave 3 teams. The line numbers are those of
`packages/engine/src/world.ts` (3202 lines) at commit `f154c13`. They move as soon as anything
is carved, so a team looks a function up by its name and uses the range only to find its
neighbours. The API is [`mechanic-api.md`](mechanic-api.md); the split comes from
[`docs/ideas/monorepo.md`](../ideas/monorepo.md) §3d.

## How to carve one mechanic

1. Write the mechanic in `mechanics/<id>/` against the new core (`defineHead`, `defineMechanic`).
   Move the helper class from `packages/engine/src/` (`MarksBook`, `PetitionBook`, ...) in with it
   when nothing else uses it.
2. Its events keep their old names and fields (the owners are in
   `packages/chronicle/src/log/legacy-owners.ts`), so the legacy adapter writes the golden lines
   unchanged. A payload field may not be called `type`, `seq` or `minute`.
3. Its snapshot slice starts at version 1 with a migration from the version-0 slice that
   `convertLegacySnapshot` cuts out of the old world snapshot (`LEGACY_WORLD_OWNERS` in
   `packages/chronicle/src/snapshot/legacy-snapshot.ts`). The test resumes
   `examples/cityofkeys-act1-06a-04/snapshot-L7.json`.
4. Old tools move as tools of the mechanic; `withResidents` (names for ids) becomes the `names`
   mechanic's `presentation.resolve`, never code in the tool.
5. The golden runs stay byte-identical. A mechanic is done when the golden story runs with it on
   the new host and the adapter writes the same lines. Until the whole world is carved, the old
   engine keeps running the goldens; each team proves its mechanic with its own tests and with
   the shared golden comparison once the turn loop moves (step 18).

## Order

The order follows the `requires` graph: a mechanic comes after the ones it calls. Each step is
one PR; steps on one line can run in parallel.

| Step | Mechanic | Requires | Why here |
|---|---|---|---|
| 1 | names | none | everything shows names; resolver and formatter |
| 2 | ledger | none | every price and reward |
| 3 | marks | ledger | the price of a message |
| 4 | channels | ledger, marks, names | board, DMs, notices, groups |
| 5 | receipts | channels, ledger | receipts of transfers and DMs, blame |
| 6 | puzzles | names | deals and secrets; the guard's secrets |
| 7 | progression | puzzles, ledger, channels | levels, submissions, doors, tools |
| 8 | cast, cores, goals | channels, progression | figures, cores, goals (parallel) |
| 9 | petitions | channels, ledger | signatures |
| 10 | seal | ledger, progression, channels | the auction |
| 11 | standoff | puzzles, progression, ledger, channels | pieces and ultimatums |
| 12 | exile | progression, channels, ledger | ransom, will, gates |
| 13 | tribunal | exile, channels, ledger | votes and factions |
| 14 | standoff-tribunal | tribunal, standoff, puzzles, exile | the holdout tribunal |
| 15 | whispers | receipts, channels, tribunal | the whisperer and popularity |
| 16 | script | every mechanic it directs | the director as staged calls |
| 17 | gamemaker tools | channels, tribunal, standoff-tribunal, standoff | tools with `serves: ["gamemaker"]` |
| 18 | arena → turn loop | all | the old `Arena` becomes a turn policy plus the runner |

## The mechanics

Each entry lists what it takes from `world.ts` (fields 441-505, constructor 507-797, methods),
from other engine files, its events, tools, story specs, its slice and what it provides and
requires. API names are proposals; a team may rename them in its PR.

### 1. names

- **world.ts:** field `#names`; `hasNames` 1331, `nameOf` 1336, `labelOf` 1341, `canChooseName`
  1346, `namesUntil` 1351, `chooseName` 1355-1359, `resolveResident` 1365-1367, `display`
  1370-1374, `#isPasswordPiece` 1377-1382, `#announceName` 1384-1389.
- **Other files:** `names.ts` (`NameBook`), `labels.ts`, `withResidents` in `tools/tool.ts`.
- **Events:** `name_chosen`. **Tools:** `chooseName`. **Spec:** `names` (`NamesSpec`).
- **Slice:** `names`.
- **Provides:** `NamesApi` (`nameOf`, `labelOf`, `resolve`); `presentation.resolve` (a name where
  an id goes) and `presentation.display` (ids to names in every text). **Requires:** none.
  `#isPasswordPiece` needs the puzzles' password pieces: pass them as an option or ask
  `PuzzlesApi` later (names comes first, so make it an optional listen of `fragments_dealt`).

### 2. ledger

- **world.ts:** field `ledger`; `checkTransfer` 1975-1988, `transfer` 1990-2003, `escrowTransfer`
  2006-2017, `adjustPoints` 2068-2071, `#canAfford` 3151, `#spend` 3155.
- **Other files:** `packages/kernel/src/ledger.ts` (the old `Ledger`).
- **Events:** `ledger_entry`, `transfer`. **Tools:** `transferPoints` (the receipt part moves to
  receipts, step 5). **Spec:** `run.startPoints`.
- **Slice:** `ledger`.
- **Provides:** `LedgerApi` (`balance`, `charge`, `credit`, `transfer`, `escrow`). **Requires:** none.
  `test/host/proof/ledger.ts` is the shape to follow.

### 3. marks

- **world.ts:** field `marks`; `#withMarks` 1604-1620 (its task part), the marks part of
  `status` 1484-1501.
- **Other files:** `marks.ts` (`MarksBook`).
- **Events:** `marks_spent`. **Tools:** none. **Spec:** `rules.marks`, `levels[].marks`.
- **Slice:** `marks`.
- **Provides:** `MarksApi` (`price(channel)`, `spend`), a `status` turn input part, the refill job.
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
- **Provides:** `ChannelsApi` (`post`, `postAsSystem`, `notify`, `dm`, `createCityGroup`,
  `postGroupAsCity`); turn inputs of kinds `dm`, `notice`; the `news` hook (unread mail).
  **Requires:** `LedgerApi`, `MarksApi`, `NamesApi`.

### 5. receipts

- **world.ts:** fields `receipts`, `#blames`; `receiptsOf` 2023, `showReceipt` 2033-2053,
  `#issue` 2055-2065, `openBlame` 2229, `settleBlame` 2234, `cancelBlame` 2239, the blame part of
  `#offencesOf` 1283-1289, `nextBlamePenalty` 1297-1300, `#chargeBlame` 1303-1307.
- **Other files:** `receipts.ts` (`ReceiptBook`), `blame.ts` (`BlameDesk`).
- **Events:** `receipt_issued`, `receipt_shown`, `blame`. **Tools:** `showReceipt`, `blame`.
- **Spec:** `rules.receipts`, `rules.blame`, the classifier/judge role.
- **Slice:** `receipts` (receipts and blames).
- **Provides:** `ReceiptsApi` (`issue`, `of`). **Requires:** `ChannelsApi`, `LedgerApi`; it
  listens to `transfer` and `dm_sent`. `blame` uses the `consult` stage with role `judge`
  (`JUDGE_ABSENT` / `JUDGE_FAILED` come from `consulted.reason`).

### 6. puzzles

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
- **Provides:** `PuzzlesApi` (`deal`, `solutionOf`, `holds`, `teamOf`); `guard.secrets` and
  `guard.leaks` (the old `secretsOf` and the leaked-run check). **Requires:** `NamesApi`.

### 7. progression

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
- **Events:** `submission`, `level_up`, `tools_unlocked`, `level_contracted`.
- **Tools:** `getStatus`, `getProblem`, `submitSolution`, `listAgents`, `activeTools`.
- **Spec:** `levels`, `acts`, `rules.penalty`, `rules.maxAttemptsPerWindow`,
  `rules.attemptWindowMinutes`, `finishedNotice`, `run.survivors`, `toolScope`.
- **Slice:** `progression` (door, doorReleased, actStarts, offences, endedActs and the per
  resident part of the competitor records).
- **Provides:** `ProgressionApi` (`levelOf`, `currentAct`, `openDoor`, `unlock`, `ranking`);
  locks with `ctx.access` instead of `enabledTools`. **Requires:** `PuzzlesApi`, `LedgerApi`,
  `ChannelsApi`.

### 8. cast, cores, goals

- **cast. world.ts:** fields `cast`, `#cast`, `#collectListeners`; `setCastLevel` 2252,
  `revealCast` 2256, `retireCast` 2262, `castDm` 2161-2165, `#dmToCast` 2145-2158,
  `startCollection` 2268, `shortenCollection` 2275, `firstSolveMinute` 2282, `collection` 2289,
  `revealCollection` 2298-2315, `drawLottery` 2318-2326, `onCollect` 1403, `isCompetitor` 1391,
  `residents` 1408-1413. **Files:** `cast.ts`. **Events:** `cast_level_set`, `cast_revealed`,
  `cast_retired`, `cast_dm`, `collection_started`, `collection_shortened`, `collection_revealed`,
  `lottery_drawn`. **Spec:** `cast`, `personas`, `personaAssignment`. **Slice:** `cast`.
  **Provides:** `CastApi`; turn input `character`. **Requires:** `ChannelsApi`, `ProgressionApi`.
- **cores. world.ts:** fields `#cores`, `#playsCores`; `#dealCores` 887-897, `coreOf` 900-902.
  **Files:** `cores.ts`. **Events:** `core_dealt`. **Spec:** `cores`. **Slice:** `cores`.
  **Requires:** `ChannelsApi`.
- **goals. world.ts:** field `#goals`; `goalOf` 905-907, the goal parts of `status` and of the
  act end. **Files:** `goals.ts` (`GoalBook`). **Events:** `goal_dealt`, `goal_resolved`.
  **Spec:** `goals`. **Slice:** `goals`. **Requires:** `ProgressionApi`, `ChannelsApi`; listens to
  `exiled` (step 12) silently when exile is not loaded.

### 9. petitions

- **world.ts:** fields `petitions`, `#petitionListeners`; `openPetition` 2332-2361,
  `signPetition` 2363-2370, `expirePetitions` 2373, `closePetitions` 2381, `#resolvePetition`
  2385-2403, `onPetitionResolved` 1399.
- **Files:** `petitions.ts` (`PetitionBook`). **Events:** `petition_opened`, `petition_signed`,
  `petition_resolved`. **Tools:** `signPetition`, `listPetitions`. **Spec:** the `openPetition`
  director action. **Slice:** `petitions`.
- **Provides:** `PetitionsApi` (`open`). **Requires:** `ChannelsApi`, `LedgerApi`.

### 10. seal

- **world.ts:** field `#seal`; `bidForSeal` 928-931, `breakSeal` 934-937; the seal part of
  `status` (`sealParts` in `turn-input.ts`).
- **Files:** `seal.ts` (`SealHouse`). **Events:** `seal_auction_opened`, `seal_bid`, `seal_won`,
  `seal_used`, `seal_expired`. **Tools:** `bid`, `permaDeath` (resident variant).
  **Spec:** `seal`. **Slice:** `seal`.
- **Requires:** `LedgerApi`, `ProgressionApi`, `ChannelsApi`; strikes through `ExileApi` when
  loaded (or emits and lets exile listen).

### 11. standoff

- **world.ts:** field `#standoff`; `cityPiecePrice` 2639, `claimPiece` 2644-2651,
  `unusedHandOvers` 2654, `issueUltimatum` 2659-2664, `hasUltimatums` 2667,
  `outstandingPieces` 2672, `cityPieces` 2677, `ultimatums` 2682, `heldPieces` 2686-2720,
  `heldPart` in `turn-input.ts`.
- **Files:** `standoff.ts` (`StandoffBook`). **Events:** `piece_kept`, `piece_claimed`,
  `piece_given`, `ultimatum_set`, `ultimatum_resolved`. **Tools:** `claimPiece`; gamemaker
  `ultimatum` (step 17). **Spec:** `rules.ultimatum`. **Slice:** `standoff`.
- **Requires:** `PuzzlesApi`, `ProgressionApi`, `LedgerApi`, `ChannelsApi`.

### 12. exile

- **world.ts:** field `#tribunal`'s gates, exiled and ransomed parts; `isExiled` 816-818,
  `standingOf` 821-824, `payRansom` 2616-2626, `lastWill` 2730-2787, `#onExiled` 2795-2819,
  `#onStruck` 1263-1277.
- **Files:** the exile part of `tribunal.ts`, `tribunal-rules.ts`. **Events:** `exile_gate`,
  `ransom_paid`, `ransomed`, `exiled`, `last_will`. **Tools:** `payRansom`, `lastWill`.
  **Spec:** `tribunal` (ransom and gate numbers). **Slice:** `exile` (gates, exiled, ransomed).
- **Provides:** `ExileApi` (`exile`, `isExiled`); a suspension `exile` per exiled resident (the
  converter writes it). **Requires:** `ProgressionApi`, `ChannelsApi`, `LedgerApi`.

### 13. tribunal

- **world.ts:** the rest of `#tribunal`; `vote` 2593, `nominate` 2599, `joinFaction` 2605,
  `refuseApplicant` 2611, `tribunalParts` and `draftParts` in `turn-input.ts`.
- **Files:** `tribunal.ts` (`Tribunal`), `factions.ts` (`FactionDraft`). **Events:**
  `tribunal_announced`, `tribunal_scheduled`, `tribunal_cancelled`, `tribunal_called`,
  `tribunal_opened`, `faction_nominated`, `faction_leaders`, `faction_applied`,
  `faction_refused`, `factions_formed`, `bloc_result`, `tribunal_vote`, `tribunal_result`.
  **Tools:** `vote`, `nominate`, `join`, `refuse`; gamemaker `scheduleTribunal`. **Spec:**
  `tribunal`. **Slice:** `tribunal`.
- **Requires:** `ExileApi`, `ChannelsApi`, `LedgerApi`.

### 14. standoff-tribunal

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
- **Requires:** `TribunalApi` (or none, if it keeps its own ballot), `StandoffApi`,
  `PuzzlesApi`, `ExileApi`.

### 15. whispers

- **world.ts:** fields `#whisperer`, `#forgeries`, `#quota`, `#whispererDefies`, `#popularity`;
  `whisperer` 944-946, `popularity` 949-951, `whisperQuota` 954-956, `mayForge` 959-961,
  `#chooseWhisperer` 968-979, `#whisperDuty` 982-986, `#whisperDutyAfterVote` 989-998,
  `#dutyReport` 1006-1030, `#tally` 1033-1036, `whisperDutyNow` 1044-1065, `#sendDuty`
  1068-1092, `forgeReceipt` 1103-1124, `nameFavourite` 1127-1130.
- **Files:** `whisperer.ts`, `popularity.ts` (`PopularityVote`). **Events:** `whisperer_chosen`,
  `whisper_duty`, `popularity_opened`, `popularity_ballot`, `popularity_result`,
  `receipt_forged`. **Tools:** `forgeReceipt`, `nameFavourite`. **Spec:** `whisperer`,
  `popularity`. **Slice:** `whispers`.
- **Requires:** `ReceiptsApi`, `ChannelsApi`, `TribunalApi` (the vote after which duty runs).

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
- **Requires:** the APIs of the mechanics its rules direct (channels, progression, cast,
  petitions); a story without a rule for a mechanic does not need that mechanic loaded.

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

## Risks

- **Status line order.** The old status line is one function (`statusLine`, `turn-input.ts`
  10-54); split into `status` notes, its parts follow the load order. Check the order against
  the goldens when progression, marks, seal, standoff-tribunal and tribunal add their parts.
- **The finished notice** is a `notice` placed before the DMs; grouped by kind it would move
  behind them and change every golden prompt. Give it the `task` kind.
- **The guard covers residents only** and takes one policy per tool, as the old engine did.
- **Locks.** The converter does not derive locks from the old state; progression must rebuild
  them on load (migration 0 → 1) or the story passes `locks`.
- **Staged calls in `runEnded` are dropped.** The director's last actions must run earlier.
- **Blocks.** A test asserts the order of calls in a block, not the order of `turnOpened`.
