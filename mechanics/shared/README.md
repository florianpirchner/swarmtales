# Shared

_To be written._

## What is in it

_To be written._

## APIs

<!-- generated:apis -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `cast`

The cast: figures, their escrow, collections and lotteries.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `isActive` | query | cast: string | boolean | Whether a resident may write to this cast member now (old `cast.isActive`); channels routes such DMs here. |
| `receive` | command | from: string, cast: string, text: string, number: integer | object | A resident's DM to a cast member (old `#dmToCast` after the checks): collected while a collection runs; writes `cast_dm` with the number channels took. |
| `collected` | command | from: string, cast: string, into: string[] | null | Channels spent the DM's marks: `from` is a new sender in `into` (the `newSender` of `receive`); writes the silent `cast_collected` the script's `onCollect` rules react to. |
| `setLevel` | command | cast: string, level: integer | null | Old `setCastLevel`; writes `cast_level_set`. |
| `reveal` | command | cast: string | boolean | Old `revealCast`; writes `cast_revealed`. |
| `retire` | command | cast: string | boolean | Old `retireCast`; writes `cast_retired`. |
| `escrow` | command | cast: string, to: string, amount: number > 0 | object | Pays a resident from the cast member's escrow (old `escrowTransfer`). |
| `startCollection` | command | into: string, cast: string, first: integer, untilMinute: integer, distinctSenders: boolean, afterSolve?: object | boolean | Old `startCollection`; writes `collection_started`. |
| `shortenCollection` | command | into: string, untilMinute: integer | null | Old `shortenCollection`; writes `collection_shortened`. |
| `revealCollection` | command | into: string, header?: string | object | Old `revealCollection`; writes `collection_revealed`. |
| `drawLottery` | command | into: string, salt: string | string or null | Old `drawLottery` (stream `lottery`, into, salt, minute); writes `lottery_drawn`. |

Provided by: [cast](../cast/README.md). Used by: [channels](../channels/README.md), [script](../script/README.md).

### `cast-extras`

The active cast members and their public levels.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `active` | query | - | object[] | Declared, revealed and not retired cast members in the story's order, with their public level (old `cast.active()`, world.ts:1407-1413). |

Provided by: [cast](../cast/README.md). Used by: [progression](../progression/README.md).

### `channels`

The board, direct messages, notices and groups.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `post` | command | author: string, text: string | object | A post by the city, the courier or a cast member (old `postAsSystem`); writes `board_post` with kind `city`. |
| `notify` | command | to: string, author: string, text: string | null | A private city notice (old `notify`); writes `notice` without a number. |
| `note` | command | to: string, author: string, text: string | object | A numbered private notice, the gamemaker's (old `note`); writes `notice` with the next message number. |
| `deliver` | command | from: string, to: string, text: string | object | A DM from someone who is not a resident, a cast member say (old `castDm`): delivered always, no cap or marks; writes `dm_sent` with the next message number. |
| `takeNumber` | command | - | integer | The next message number, for a message another mechanic writes (old `#numbers.next`, the cast's `cast_dm`). |
| `dmWindow` | query | resident: string | object or null | The resident's DM cap window, or null without a cap (old `dmWindow`). |
| `dmRecords` | query | - | object[] | Every DM the city recorded (old `dmRecords`). |
| `dmRecord` | query | number: integer | object or null | The DM with this message number, or null (old `#dms.find`); a cast member's DM has none. |
| `boardPost` | query | number: integer | object or null | The board post with this message number, or null (old `board.get`). |
| `groupPost` | query | number: integer | object or null | The group post with this message number, or null (old `groups.postByNumber`). |
| `couldRead` | query | group: string, reader: string, number: integer | boolean | Whether `reader` could read post `number` of `group` (a member then; old `groups.couldRead`). |
| `lastNumber` | query | - | integer | The city's last message number, over DMs, notes, board and group posts (old `#numbers.last`). |
| `pendingDms` | query | resident: string | integer | DMs waiting in the resident's inbox (old `pendingDms`; `getStatus` shows them). |
| `createCityGroup` | command | name: string, members: string[] | object | A group the city founds (old `createCityGroup`); writes `group_created`. |
| `removeCityGroup` | command | group: string | null | Removes a city group (old `removeCityGroup`); writes `group_removed`. |
| `postGroupAsCity` | command | group: string, text: string | null | The city posts in a group (old `postGroupAsCity`); writes `group_post`. |

Provided by: [channels](../channels/README.md). Used by: [cast](../cast/README.md), [exile](../exile/README.md), [goals](../goals/README.md), [ledger](../ledger/README.md), [motives](../motives/README.md), [names](../names/README.md), [petitions](../petitions/README.md), [progression](../progression/README.md), [puzzles](../puzzles/README.md), [receipts](../receipts/README.md), [script](../script/README.md), [seal](../seal/README.md), [standoff](../standoff/README.md), [standoff-tribunal](../standoff-tribunal/README.md), [tribunal](../tribunal/README.md), [whispers](../whispers/README.md).

### `ending`

The ending a run reached when it stops: what the report and the novel tell.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `evaluate` | query | reason: string or null | object or null | The ending of the run that ends now, or null when the story names none. `reason` is the arena's stop reason (null at the natural end of the minutes, as `run_end` leaves it out); asked once, after every other mechanic's end of the run. |

Provided by: no mechanic of this repository. Used by: [arena](../arena/README.md).

### `exile`

Who stands at the gate or is gone, and what an exile does.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `isExiled` | query | resident: string | boolean | Old `isExiled`: exiled by the tribunal, struck by the seal or the holdout tribunal. |
| `standing` | query | resident: string | object | Old `standingOf`. |
| `alive` | query | - | string[] | Every resident still in the city, in the story's order (old `alive`). |
| `exiledBy` | query | resident: string | "tribunal" or "seal" or "holdout" or null | Who exiled the resident: the tribunal's gate, the seal or the holdout tribunal, or null while in the city or at the gate. The tribunal's ransom register leaves out all but `holdout` (old `Tribunal#exiled`). |
| `toGate` | command | resident: string, until: integer, ransomable: boolean, voters: string[], price: number, selfPrice: number | null | The tribunal sends a resident to the gate (old `Tribunal#exile` gates); writes `exile_gate` with these fields, notifies the resident; the gate closes at `until` (T4 request R4). |
| `strike` | command | resident: string, by: "seal" or "holdout" | object | Strikes a resident for good without gate, will or ransom (old seal `strike`, holdout `#onStruck`); writes `exiled` with `by`. |
| `gates` | query | - | object[] | Every gate in the order it opened (old `Tribunal.gates()`; round 3, R2-D18). |
| `exiled` | query | - | string[] | Who left through the gate or by the seal, in the order they left (old `Tribunal#exiled`); the holdout's struck are not in it (round 3, R2-D18). |
| `ransomed` | query | resident: string | boolean | Whether the resident was bought back from the gate once (old `Tribunal#ransomed`): a second gate takes no ransom (round 3, R2-D18). |

Provided by: [exile](../exile/README.md). Used by: [arena](../arena/README.md), [channels](../channels/README.md), [goals](../goals/README.md), [ledger](../ledger/README.md), [names](../names/README.md), [progression](../progression/README.md), [puzzles](../puzzles/README.md), [receipts](../receipts/README.md), [script](../script/README.md), [seal](../seal/README.md), [standoff](../standoff/README.md), [standoff-tribunal](../standoff-tribunal/README.md), [tribunal](../tribunal/README.md), [whispers](../whispers/README.md).

### `goals`

Secret goals per resident.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `onExiled` | command | resident: string | null | A resident left the city: its goal is void and read out (old `goals.onExiled`); writes `goal_resolved`. |
| `noteLeaders` | command | leaders: string[] | null | Faction leaders of a tribunal: one more leadership each in every running act (old `noteLeaders`; tribunal calls it on `faction_leaders`). |
| `noteHeir` | command | heir: string | null | A last will left the resident something (old `noteHeir`; exile calls it once per heir). |
| `goalOf` | query | resident: string | object or null | The goal the resident holds in an act still running, in the story's words, or null (old `goalOf`: status part, the gamemaker's privacy check). |

Provided by: [goals](../goals/README.md). Used by: [channels](../channels/README.md), [exile](../exile/README.md), [tribunal](../tribunal/README.md).

### `ledger`

Points per account and bookings between accounts.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `balance` | query | account: string | number | An account's points (old `ledger.balance`). |
| `balances` | query | - | record of number | Every resident's points, for rankings and standings. |
| `open` | command | account: string | null | Opens an account at 0; an open account is left as it is (old `ledger.open`); writes no event of its own. |
| `has` | query | account: string | boolean | Whether the account is open (old `ledger.has`). |
| `mint` | command | account: string, amount: number > 0, reason: string, idempotencyKey?: string | null | Creates points: start points, rewards, director grants (old `ledger.mint`, `adjustPoints` > 0); writes `ledger_entry`. |
| `burn` | command | account: string, amount: number > 0, reason: string, idempotencyKey?: string | null | Destroys points: fines, penalties, an exile (old `ledger.burn`, `adjustPoints` < 0); writes `ledger_entry`. |
| `move` | command | from: string, to: string, amount: number > 0, reason: string, idempotencyKey?: string | object | Books points between accounts without the resident checks: escrow, treasuries, ransom, bids (old `ledger.transfer`); writes `ledger_entry` only, never `transfer`. |

Provided by: [ledger](../ledger/README.md). Used by: [arena](../arena/README.md), [cast](../cast/README.md), [channels](../channels/README.md), [exile](../exile/README.md), [goals](../goals/README.md), [petitions](../petitions/README.md), [progression](../progression/README.md), [receipts](../receipts/README.md), [script](../script/README.md), [seal](../seal/README.md), [standoff](../standoff/README.md), [tribunal](../tribunal/README.md), [whispers](../whispers/README.md).

### `marks`

The marks a message costs and what is left of them.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `canAfford` | query | resident: string, channel: "board" or "group" or "dm" or "receipt" | boolean | Whether the resident may send on the channel now (old `#canAfford`); true without marks. |
| `left` | query | resident: string | object or null | The resident's marks, or null when the story has none. |
| `spend` | command | resident: string, channel: "board" or "group" or "dm" or "receipt" | object or null | Spends the channel's price once a message was sent (old `#spend`); writes `marks_spent`; null when marks do not apply. |
| `priceOf` | query | resident: string, channel: "board" or "group" or "dm" or "receipt" | number or null | What a message on the channel costs the resident at its level now, or null when marks do not apply (the holder notice's price). |
| `taskLine` | query | level: integer ≥ 1 | string or null | The marks terms under the task of `level` (old `#withMarks`), or null when marks are off there; progression appends it. |

Provided by: [marks](../marks/README.md). Used by: [channels](../channels/README.md), [progression](../progression/README.md), [receipts](../receipts/README.md), [whispers](../whispers/README.md).

### `motives`

The core motive of each resident.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `drivesOf` | query | resident: string | string[] or null | The drive ids of the resident's core motive, the strongest first, or null without a core motive (the goals deal follows them). |
| `cuesOf` | query | resident: string | string[] | The lower-case cue words of the resident's drives (the gamemaker's `characterLeaks` check). |

Provided by: [motives](../motives/README.md). Used by: [channels](../channels/README.md), [goals](../goals/README.md).

### `names`

Names residents chose, for texts and arguments.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `hasNames` | query | - | boolean | Whether the story names residents at all (old `hasNames`). |
| `nameOf` | query | resident: string | string or null | The chosen name, or null (old `nameOf`). |
| `labelOf` | query | resident: string | string | `Name (ID)` once the resident chose a name, the bare id before (old `labelOf`). |
| `resolve` | query | text: string | string | The id a name or id stands for; other text comes back unchanged (old `resolveResident`). |
| `taskLine` | query | resident: string | string or null | The choose-name line under a task (and the closed-door text) while the resident may still choose, else null (old `#withNameChoice`); progression appends it. |

Provided by: [names](../names/README.md). Used by: [channels](../channels/README.md), [progression](../progression/README.md), [standoff](../standoff/README.md), [standoff-tribunal](../standoff-tribunal/README.md), [whispers](../whispers/README.md).

### `notes`

The gamemaker's notes: text checks, budgets and the note log.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `check` | query | text: string, to: string or "board" or "tribunal", as?: string or "board" or "tribunal" | object | Old `#checked`: trims the text, strips a signature or `<author\|CITY\|city> minute N:` heading, and refuses an empty or long text, a dealt secret, a private thought, a core motive or goal, the whisperer's role, or a repeat to `as` (default `to`). |
| `budget` | query | to: string or "board" or "tribunal" | object | Notes to `to` within the current sliding window and the limit (old `#used`, `notesPerAgent` or `boardPosts`). |
| `record` | command | to: string or "board" or "tribunal", text: string, number: integer, shown?: string or "board" or "tribunal" | null | Records a note under `to` (its budget and repeats) and writes `gamemaker_note` as sent to `shown` (default `to`; the board for a tribunal's lines) (old `#deliver`). |

Provided by: [channels](../channels/README.md). Used by: [standoff-tribunal](../standoff-tribunal/README.md).

### `petitions`

Petitions residents sign.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `open` | command | id: string, text: string, threshold: object, deadlineMinute: integer, visibility: "public" or "secret", against?: string[] | object | Opens a petition (old `openPetition`); writes `petition_opened`. |

Provided by: [petitions](../petitions/README.md). Used by: [script](../script/README.md).

### `progression`

Levels, submissions, doors, acts and the ranking.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `levelOf` | query | resident: string | integer | Old `levelOf`. |
| `isFinished` | query | resident: string | boolean | Old `isFinished`. |
| `hasPassed` | query | resident: string, level: integer ≥ 1 | boolean | Old `hasPassed`. |
| `hasSolved` | query | resident: string, level: integer ≥ 1 | boolean | Whether the resident solved `level` itself (old `solved.includes(level)`); `hasPassed` is also true beyond it or at a shut door without a solve (A1-6, the seats rule). |
| `passed` | query | level: integer ≥ 1 | string[] | Who passed a level, in the order they passed (the tribunal's `passed`). |
| `lastProgress` | query | resident: string | integer or null | The minute the resident last passed a level, or null (the tribunal's `lastProgress`). |
| `currentAct` | query | - | integer | Old `currentAct`. |
| `actStart` | query | fromLevel: integer ≥ 1 | integer or null | The first minute of the act that starts at `fromLevel`, or null (old `actStartOf`). |
| `door` | query | - | integer ≥ 1 or null | The snapshot door, or null (old `door`). |
| `doorShut` | query | - | boolean | Whether a door holds residents back now (the tribunal's `doorShut`). |
| `openDoor` | command | - | boolean | Old `openDoor`. |
| `releaseDoor` | command | - | null | Old `releaseDoor`. |
| `unlock` | command | resident: string, tools: string[] | null | Old `unlockTools` (and `ctx.access.unlock`); writes `tools_unlocked`. |
| `ranking` | query | - | object[] | Old `ranking`. |
| `holdersBehind` | query | resident: string, level: integer ≥ 1 | object[] | Holders of the resident's pieces still below `level` (old `holdersBehind`, the script's `onHolderBehind`). |
| `firstSolveMinute` | query | level: integer ≥ 1 | integer or null | The minute the first resident passed a level, or null (old `firstSolveMinute`). |
| `nextPenalty` | query | resident: string | number | What the resident's next wrong code in this act costs (old `nextPenalty`, the offences ladder; T3 request 5). |
| `nextBlamePenalty` | query | resident: string | number | What the resident pays for its next lost blame in this act (old `nextBlamePenalty`); 0 without a blame ladder. The task's `{blamePenalty}`. |
| `chargeBlame` | command | resident: string | number | A lost blame: returns its price, and the act's count climbs (old `#chargeBlame`; receipts calls it through `uses`, T1 R-7, T3 R-6). |
| `endAct` | command | fromLevel: integer ≥ 1 | boolean | The act starting at `fromLevel` is over (old `#endAct`: the tribunal reached its target); writes `act_ended`; false when it was over already (T3 request 7). |
| `isOpenOnClock` | query | level: integer ≥ 1 | boolean | Whether the level's door is open on the door clock (old `isOpenOnClock`). |
| `opensAt` | query | level: integer ≥ 1 | integer | The minute the level's door opens on the door clock; 0 without one (old `opensAt`). |
| `bounds` | query | - | object | The run's first and last level and how many residents the story keeps (`run.survivors`; T4 request R7). |

Provided by: [progression](../progression/README.md). Used by: [arena](../arena/README.md), [cast](../cast/README.md), [channels](../channels/README.md), [exile](../exile/README.md), [goals](../goals/README.md), [marks](../marks/README.md), [puzzles](../puzzles/README.md), [receipts](../receipts/README.md), [script](../script/README.md), [seal](../seal/README.md), [standoff](../standoff/README.md), [standoff-tribunal](../standoff-tribunal/README.md), [tribunal](../tribunal/README.md).

### `puzzles`

The deal of each level: fragments, factors, teams and who is excluded.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `deal` | command | level: integer ≥ 1 | null | Deals a level once (old `#dealLevel`, stream `puzzle`, level); writes `fragments_dealt` or `factors_dealt`. |
| `isDealt` | query | level: integer ≥ 1 | boolean | Old `isDealt`. |
| `solutionOf` | query | resident: string, level: integer ≥ 1 | string or null | The code that passes the level for the resident, or null (old `#solutionOf`). |
| `teamOf` | query | resident: string, level: integer ≥ 1 | object | The resident's team on a level (old `teamOf`). |
| `passwordPiece` | query | token: string | boolean | Whether a token is part of a dealt password, so names leaves it as written (old `#isPasswordPiece`). |
| `lacking` | query | level: integer ≥ 1, holder: string | string[] | Who still lacks the holder's fragment of a level (old `lackingFragment`). |
| `carriesSecret` | query | resident: string, text: string, minRun: integer ≥ 1 | boolean | Whether a text carries a run of the resident's secrets (old `receiptCarriesFragment`, the leaked-run check). |
| `burn` | command | agent: string, level: integer ≥ 1, piece: string, needers: string[] | null | A piece burns with its exiled holder (old `#onExiled`); writes `factor_burned`. |
| `contract` | command | level: integer ≥ 1, excluded: string[] | null | After an exile, the roles of the excluded pass on for a level nobody left has reached (old `#onExiled`); writes `level_contracted`. |
| `kindOf` | query | level: integer ≥ 1 | "fragments" or "additive" or "none" | The puzzle kind of a level: `none` while it is not dealt (T3 request 1). |
| `taskValues` | query | resident: string, level: integer ≥ 1 | object | The task placeholders a puzzle fills for a resident (old `#puzzleValues`); empty strings on a level not dealt (T3 request 2). |
| `holders` | query | resident: string, level: integer ≥ 1 | object[] | Who holds what the resident needs on an additive level, besides itself (old `#holdersOf`; T3 request 3). |
| `revealFactor` | command | level: integer ≥ 1, target: "board" or string[] | object | Releases the city factor of an additive level (old `revealFactor`); writes `factor_revealed` (T3 request 4). |
| `heldPieces` | query | resident: string | object[] | Old `heldPieces`: every piece the resident holds for others, by level; needers in team-member order (fragments) or holding order (certificates, counters). Uses `ProgressionApi.levelOf` (T4 request R1). |
| `fragmentOf` | query | resident: string, level: integer ≥ 1 | string or null | The resident's own fragment of a fragments level, or null. |
| `inherited` | query | resident: string, level: integer ≥ 1 | object[] | Fragments of excluded or struck teammates the resident holds now (old `#inheritedFragments`): `[from, fragment]` in order. |
| `openFragmentDoors` | query | - | integer[] | Every fragments level whose door is open on the clock, ascending (old `#openFragmentDoors`, the holdout's doors). |
| `secrets` | query | - | object | Every secret of the dealt levels, ascending by level (old gamemaker `#secretGuard`): the passwords of fragment levels and the all-digit values of additive deals (old `dealValues`); the note desk's leak check (round 2, R2-D8). |
| `isHandover` | query | text: string | boolean | Whether a text hands over a dealt fragment (old `isHandover`: a run of `HANDOVER_RUN` of any fragment, in its code-like forms); the whisper tally leaves such DMs out (T1 request 13). |

Provided by: [puzzles](../puzzles/README.md). Used by: [channels](../channels/README.md), [exile](../exile/README.md), [names](../names/README.md), [progression](../progression/README.md), [receipts](../receipts/README.md), [script](../script/README.md), [standoff](../standoff/README.md), [standoff-tribunal](../standoff-tribunal/README.md), [whispers](../whispers/README.md).

### `receipts`

City-verified receipts.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `issue` | command | body: object | object | Issues a receipt (old `#issue`); writes `receipt_issued`. |
| `count` | query | resident: string | integer | How many receipts a resident holds (its status part). |
| `memoTransfers` | query | resident: string, since: integer | integer | Transfers with a memo the resident sent from minute `since` on; they count toward the DM cap (old `dmWindow`). |
| `describe` | query | body: object | string | The receipt line of a body (old `describeReceipt`), for texts other mechanics write. |
| `get` | query | id: string | object or null | A receipt by id, or null (old `receipts.get`). |
| `list` | query | resident: string | object[] | The receipts a resident is a party of, in issue order (old `receiptsOf`; `getStatus` lists their lines). |
| `ofTransfer` | query | txId: string | string or null | The id of the receipt issued for the transfer `txId`, or null (the `transferPoints` reply). |

Provided by: [receipts](../receipts/README.md). Used by: [cast](../cast/README.md), [channels](../channels/README.md), [ledger](../ledger/README.md), [progression](../progression/README.md), [whispers](../whispers/README.md).

### `seal`

The black seal auction.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `onExiled` | command | resident: string | null | A resident left: a seal it bore is gone (old `seal.onExiled`); writes `seal_expired` when it held one. |

Provided by: [seal](../seal/README.md). Used by: [exile](../exile/README.md).

### `standoff`

Pieces residents hold for others, the city's kept pieces and ultimatums.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `heldPieces` | query | resident: string | object[] | Old `heldPieces`. |
| `keep` | command | from: string, pieces: object[] | null | The city keeps an exiled holder's pieces and sells them to their needers (old `#standoff.keep`); writes `piece_kept`. |
| `noteText` | command | author: string, readers: string[], text: string | null | A text the author sent to `readers` (old `#standoff.noteText`): a piece handed over in it counts as given; writes `piece_given`. |
| `noteGiven` | command | from: string, to: string, piece: object | null | A last will handed `piece` to `to` (old `#standoff.noteGiven`): it counts as given; writes `piece_given` (T4 request R2). |
| `cityPiecePrice` | query | - | number | Old `cityPiecePrice`. |

Provided by: [standoff](../standoff/README.md). Used by: [channels](../channels/README.md), [exile](../exile/README.md).

### `standoff-tribunal`

The holdout tribunal over a resident who keeps a fragment back.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `exemptFromCap` | query | from: string, to: string | boolean | The accused may always write to those who lack its fragment (old `holdout.exemptFromCap`). |
| `taskLine` | query | resident: string | string or null | The holdout rule under every door's task (old `#withHoldoutRule`), or null; progression appends it between the names line and the marks line (D-3, round 2 R2-D10). |

Provided by: [standoff-tribunal](../standoff-tribunal/README.md). Used by: [channels](../channels/README.md), [progression](../progression/README.md).

### `tribunal`

Tribunal sessions, votes and faction drafts.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `missing` | query | - | integer | Residents the tribunal still has to exile; the seal is refused at 0 (old `SealPorts.missing`). |
| `inSession` | query | - | boolean | Whether a tribunal session is open now. |
| `ransomPrices` | query | - | object | The ransom an exiled resident's gate would cost now (old `ransomPrices`, the tribunal's spec): the city's median price and the resident's own; standoff reads `price` for the city's kept pieces (old `cityPiecePrice`). |
| `text` | query | key: "gateNotice" or "gateNoticeFinal" or "ransomed" or "exiled" or "will", values: record of string | string | One of the story's tribunal texts the exile writes, rendered with the rule values and `values` (old `Tribunal#text`; round 3, R2-D18). |
| `bequestPerHeir` | query | - | number | The share of its points a resident at the gate may leave each heir (`tribunal.bequestPerHeir`; round 3, R2-D18). |

Provided by: [tribunal](../tribunal/README.md). Used by: [exile](../exile/README.md), [seal](../seal/README.md), [standoff](../standoff/README.md).

### `tribunal-view`

The tribunal's guard rails and foresight for the gamemaker's view.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `schedulingWindow` | query | - | object | Whether `scheduleTribunal` is open now, and its bounds (old `schedulingWindow`). |
| `cityCall` | query | - | object or null | When the city calls a tribunal itself if nobody plans one, or null (old `cityCall`). |
| `stop` | query | - | object | What the run's stop rule reads (old arena `#stopReason`): the end reason once the target is reached and the last gate closed, whether a tribunal is under way, and whether the city still pursues its target. |
| `atRisk` | query | - | object or null | Who stands trial: the open session's accused, or those with the fewest points if the planned tribunal opened now, or null (old `atRisk`). |

Provided by: [tribunal](../tribunal/README.md). Used by: [arena](../arena/README.md), [standoff](../standoff/README.md).

### `whispers`

The story's whisperer.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `whisperer` | query | - | string or null | The resident the whispers mechanic chose as the whisperer, or null when none plays (a control run, a story without one). |

Provided by: [whispers](../whispers/README.md). Used by: [channels](../channels/README.md), [motives](../motives/README.md).

<!-- /generated:apis -->

## Tests

_To be written._
