# Oracle coverage

Written by `scripts/export-oracles.ts` (`scripts/oracles/coverage.ts`); do not edit. Per game: every tool of its
mechanics with the calls the files hold (accepted, and refused by code and stage), every refusal code the
mechanics can give, and the event types that never occur. A code is listed for a game when a mechanic of the game
has it in its source, whether or not a resident can reach it: many are behind the lock (a tool that is locked for
a resident answers `TOOL_LOCKED` before the mechanic's own rule runs) or guard a caller that is no resident.

The platform's own codes, by pipeline stage:

| Code | Stage | Meaning |
| --- | --- | --- |
| `TOOL_UNKNOWN` | `lock` | no tool of that name is loaded |
| `TOOL_NOT_GRANTED` | `lock` | the caller's role was never granted the tool |
| `TOOL_LOCKED` | `lock` | the tool is locked for this caller now (not its turn, not its phase, not its level) |
| `INVALID_ARGUMENTS` | `parse` | the arguments do not fit the tool's schema |
| `TEXT_TOO_LONG` | `parse` | a text argument is longer than the tool allows |
| `STEP_LIMIT` | `limit` | the caller used up `setup.limits.maxStepsPerMinute` calls in this minute (refused calls count) |
| `TOOL_LIMIT` | `limit` | a limit the story put on this tool |
| `GUARD_BLOCKED` | `guard` | a tool guard of the story refused the call |

## blind-bid

5 files. Mechanics: `sealed-auction`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `bid` | sealed-auction | yes | resident | 288 | `INVALID_ARGUMENTS@parse` 2, `OVER_PURSE@rule` 2, `TOOL_LOCKED@lock` 2 |
| `readBrain` | strategy-brain | yes | resident | 8 | - |
| `viewAuction` | sealed-auction | yes | resident | 8 | - |
| `writeBrain` | strategy-brain | yes | resident | 36 | `BRAIN_TOO_LONG@rule` 3 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `BRAIN_TOO_LONG` | strategy-brain | 3 | 1 |
| `INVALID_ARGUMENTS` | platform, stage `parse` | 2 | 2 |
| `OVER_PURSE` | sealed-auction | 2 | 2 |
| `TOOL_LOCKED` | platform, stage `lock` | 2 | 2 |

Refusal codes no file exercises (18): `ALREADY_BID` (sealed-auction), `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `MATCH_OVER` (sealed-auction), `NOT_A_SEAT` (sealed-auction), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (strategy-brain), `NO_LOT` (sealed-auction), `NO_RETRO` (strategy-brain), `OUT_OF_RANGE` (sealed-auction), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`).

Event types of the mechanics: 11 of 11 occur. Never written in a file: none.

## chess

5 files. Mechanics: `chess`, `team-channel`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `playMove` | chess | yes | resident | 199 | `ILLEGAL_MOVE@execute` 8, `INVALID_ARGUMENTS@parse` 1, `TOOL_LOCKED@lock` 1 |
| `postTeam` | team-channel | no | **never called** | 0 | - |
| `readBrain` | strategy-brain | yes | resident | 21 | - |
| `readTeam` | team-channel | no | **never called** | 0 | - |
| `resign` | chess | yes | resident | 2 | - |
| `viewBoard` | chess | yes | resident | 18 | - |
| `writeBrain` | strategy-brain | yes | resident | 13 | `TOOL_LOCKED@lock` 1 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `ILLEGAL_MOVE` | chess | 8 | 4 |
| `TOOL_LOCKED` | platform, stage `lock` | 2 | 2 |
| `INVALID_ARGUMENTS` | platform, stage `parse` | 1 | 1 |

Refusal codes no file exercises (20): `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_LONG` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `MATCH_OVER` (chess), `NOT_A_SEAT` (chess), `NOT_CAPTAIN` (chess), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (team-channel, strategy-brain), `NOT_YOUR_MOVE` (chess), `NO_GAME` (chess), `NO_RETRO` (strategy-brain), `POST_CAP` (team-channel), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`).

Event types of the mechanics: 9 of 11 occur. Never written in a file: `chess.coach_review`, `team-channel.team_post`.

## cityofkeys

5 files. Mechanics: `ledger`, `marks`, `names`, `channels`, `petitions`, `motives`, `receipts`, `puzzles`, `progression`, `cast`, `goals`, `standoff`, `exile`, `tribunal`, `seal`, `script`, `arena`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `activeTools` | progression | yes | **never called** | 0 | - |
| `addGroupMember` | channels | yes | **never called** | 0 | - |
| `bid` | seal | yes | **never called** | 0 | - |
| `blame` | receipts | yes | resident | 2 | - |
| `chooseName` | names | yes | **never called** | 0 | - |
| `claimPiece` | standoff | yes | **never called** | 0 | - |
| `createGroup` | channels | yes | **never called** | 0 | - |
| `defy` | channels | yes | **never called** | 0 | - |
| `depositGroup` | channels | yes | **never called** | 0 | - |
| `directorMinute` | script | no | script | 112 | - |
| `getProblem` | progression | yes | **never called** | 0 | - |
| `getStatus` | progression | yes | resident | 9 | - |
| `join` | tribunal | yes | resident | 4 | - |
| `lastWill` | exile | yes | resident | 1 | `TOOL_LOCKED@lock` 1, `UNKNOWN_FACTOR@execute` 1 |
| `leaveGroup` | channels | yes | **never called** | 0 | - |
| `listAgents` | progression | yes | **never called** | 0 | - |
| `listMyGroups` | channels | yes | **never called** | 0 | - |
| `listPetitions` | petitions | yes | **never called** | 0 | - |
| `nominate` | tribunal | yes | resident | 6 | - |
| `notify` | channels | no | **never called** | 0 | - |
| `payRansom` | exile | yes | resident | 2 | - |
| `permaDeath` | seal | yes | **never called** | 0 | - |
| `postBoard` | channels | yes | gamemaker, resident | 28 | `TOOL_LOCKED@lock` 3 |
| `postGroup` | channels | yes | resident | 1 | - |
| `readBoard` | channels | yes | resident | 9 | - |
| `readGroup` | channels | yes | **never called** | 0 | - |
| `refuse` | tribunal | yes | resident | 1 | - |
| `removeGroupMember` | channels | yes | **never called** | 0 | - |
| `resolvePetition` | petitions | no | **never called** | 0 | - |
| `scheduleTribunal` | tribunal | no | gamemaker | 1 | `INVALID_COUNT@execute` 1 |
| `sendDM` | channels | yes | resident | 18 | `TOOL_LOCKED@lock` 3 |
| `setTreasurer` | channels | yes | **never called** | 0 | - |
| `showReceipt` | receipts | yes | **never called** | 0 | - |
| `signPetition` | petitions | yes | **never called** | 0 | - |
| `submitSolution` | progression | yes | resident | 126 | `INCORRECT@execute` 25, `INVALID_FORMAT@execute` 3 |
| `transferPoints` | ledger | yes | resident | 27 | - |
| `ultimatum` | standoff | no | **never called** | 0 | - |
| `vote` | tribunal | yes | resident | 22 | `SELF_VOTE@execute` 1 |
| `withdrawGroup` | channels | yes | **never called** | 0 | - |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `INCORRECT` | (not found in the source by the pattern) | 25 | 4 |
| `TOOL_LOCKED` | names, channels, progression, standoff, exile, tribunal, seal | 7 | 4 |
| `INVALID_FORMAT` | progression | 3 | 3 |
| `INVALID_COUNT` | (not found in the source by the pattern) | 1 | 1 |
| `SELF_VOTE` | (not found in the source by the pattern) | 1 | 1 |
| `UNKNOWN_FACTOR` | exile | 1 | 1 |

Refusal codes no file exercises (48): `ALREADY_BLAMED` (receipts), `ALREADY_EXILED` (exile), `ALREADY_SIGNED` (petitions), `ALREADY_SOLVED` (progression), `BEQUEST_CAP` (exile), `DM_LIMIT` (ledger, channels), `DOOR_CLOSED` (progression), `DUPLICATE_PETITION` (petitions), `GROUP_NOT_VISIBLE` (channels), `GUARD_BLOCKED` (platform, stage `guard`), `INSUFFICIENT_ESCROW` (cast), `INSUFFICIENT_FUNDS` (ledger, exile), `INVALID_AMOUNT` (ledger, exile), `INVALID_ARGUMENTS` (platform, stage `parse`), `INVALID_BEQUEST` (exile), `INVALID_REASON` (channels), `INVALID_TEXT` (channels, exile), `JUDGE_ABSENT` (receipts), `JUDGE_FAILED` (receipts), `MEMO_DIGITS` (ledger), `NAME_CHOSEN` (names), `NAME_CLOSED` (names), `NOT_ADDITIVE` (puzzles), `NOT_AT_GATE` (exile), `NOT_PLAYED` (puzzles), `NO_MARKS` (channels, receipts), `NO_RANSOM` (exile), `NO_RESIDENT` (standoff, exile, tribunal, seal), `PER_TEAM` (puzzles), `PETITION_CLOSED` (petitions), `RATE_LIMITED` (progression), `RECEIPT_CARRIES_FRAGMENT` (receipts), `SELF_BLAME` (receipts), `SELF_DM` (channels), `SELF_TARGET` (receipts), `SELF_TRANSFER` (ledger), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`), `UNKNOWN_AGENT` (ledger, channels, receipts, cast, standoff, exile), `UNKNOWN_CAST` (cast), `UNKNOWN_COLLECTION` (cast), `UNKNOWN_LEVEL` (progression), `UNKNOWN_PETITION` (petitions), `WILL_DONE` (exile), `WRONG_LEVEL` (progression).

Event types of the mechanics: 54 of 82 occur. Never written in a file: `channels.treasury_deposit`, `channels.treasury_withdrawal`, `channels.treasurer_set`, `channels.treasury_settled`, `channels.gamemaker_defied`, `petitions.petition_opened`, `petitions.petition_signed`, `petitions.petition_resolved`, `receipts.receipt_shown`, `progression.tools_unlocked`, `cast.cast_level_set`, `cast.cast_revealed`, `cast.cast_retired`, `cast.cast_dm`, `cast.cast_collected`, `cast.collection_started`, `cast.collection_shortened`, `cast.collection_revealed`, `cast.lottery_drawn`, `standoff.piece_claimed`, `standoff.ultimatum_set`, `standoff.ultimatum_resolved`, `tribunal.tribunal_cancelled`, `seal.seal_bid`, `seal.seal_won`, `seal.seal_used`, `script.director_skipped`, `arena.act_brake`.

## convoy

4 files. Mechanics: `convoy`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `accuse` | convoy | yes | resident | 12 | - |
| `audit` | convoy | yes | resident | 3 | - |
| `playCrewCard` | convoy | yes | resident | 72 | - |
| `proposeCrew` | convoy | yes | resident | 26 | - |
| `readBrain` | strategy-brain | yes | resident | 19 | - |
| `speak` | convoy | yes | resident | 171 | `TOOL_LOCKED@lock` 2 |
| `viewConvoy` | convoy | yes | resident | 78 | - |
| `voteConfidence` | convoy | yes | resident | 144 | - |
| `writeBrain` | strategy-brain | yes | resident | 15 | `BRAIN_TOO_LONG@rule` 4 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `BRAIN_TOO_LONG` | strategy-brain | 4 | 2 |
| `TOOL_LOCKED` | platform, stage `lock` | 2 | 2 |

Refusal codes no file exercises (29): `ACCUSE_COUNT` (convoy), `ALREADY_VOTED` (convoy), `AUDIT_USED` (convoy), `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `CREW_REPEATS` (convoy), `CREW_SIZE` (convoy), `GUARD_BLOCKED` (platform, stage `guard`), `INVALID_ARGUMENTS` (platform, stage `parse`), `LOYAL_PLAYS_SAFE` (convoy), `MATCH_OVER` (convoy), `NOT_A_SEAT` (convoy), `NOT_LEAD` (convoy), `NOT_ON_CREW` (convoy), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (strategy-brain), `NOT_YOURS` (convoy), `NO_GAME` (convoy), `NO_RETRO` (strategy-brain), `NO_SUCH_STAGE` (convoy), `STEP_LIMIT` (platform, stage `limit`), `TALK_CAP` (convoy), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`), `WRONG_PHASE` (convoy).

Event types of the mechanics: 14 of 14 occur. Never written in a file: none.

## econ-lab

5 files. Mechanics: `econ-games`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `choose` | econ-games | yes | resident | 80 | `INVALID_ARGUMENTS@parse` 1, `TOOL_LOCKED@lock` 1 |
| `contribute` | econ-games | yes | resident | 112 | `OUT_OF_RANGE@rule` 1, `TOOL_LOCKED@lock` 3 |
| `offer` | econ-games | yes | resident | 48 | `INVALID_ARGUMENTS@parse` 2, `OUT_OF_RANGE@rule` 1, `TOOL_LOCKED@lock` 2 |
| `readBrain` | strategy-brain | yes | resident | 17 | - |
| `respond` | econ-games | yes | resident | 48 | `TOOL_LOCKED@lock` 1 |
| `viewTable` | econ-games | yes | resident | 64 | - |
| `writeBrain` | strategy-brain | yes | resident | 36 | `BRAIN_TOO_LONG@rule` 9, `TOOL_LOCKED@lock` 1 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `BRAIN_TOO_LONG` | strategy-brain | 9 | 2 |
| `TOOL_LOCKED` | platform, stage `lock` | 8 | 1 |
| `INVALID_ARGUMENTS` | platform, stage `parse` | 3 | 1 |
| `OUT_OF_RANGE` | econ-games | 2 | 1 |

Refusal codes no file exercises (19): `ALREADY_DECIDED` (econ-games), `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `MATCH_OVER` (econ-games), `NOT_A_SEAT` (econ-games), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (strategy-brain), `NOT_YOURS` (econ-games), `NO_RETRO` (strategy-brain), `NO_ROUND` (econ-games), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`), `WRONG_DECISION` (econ-games).

Event types of the mechanics: 10 of 10 occur. Never written in a file: none.

## ember-tricks

4 files. Mechanics: `card-table`, `trick-play`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `nameTrump` | trick-play | yes | resident | 24 | - |
| `placeBid` | trick-play | yes | resident | 96 | - |
| `playCard` | trick-play | yes | resident | 437 | `NOT_YOUR_TURN@execute` 5 |
| `readBrain` | strategy-brain | yes | resident | 26 | - |
| `vetoLead` | trick-play | yes | resident | 5 | - |
| `viewHand` | card-table | no | **never called** | 0 | - |
| `viewTable` | trick-play | yes | resident | 403 | - |
| `writeBrain` | strategy-brain | yes | resident | 4 | - |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `NOT_YOUR_TURN` | trick-play | 5 | 3 |

Refusal codes no file exercises (31): `ALREADY_VETOED` (trick-play), `BID_TOO_HIGH` (trick-play), `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_LONG` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `INVALID_ARGUMENTS` (platform, stage `parse`), `LEADER_HAS_NO_OTHER_SUIT` (trick-play), `MATCH_OVER` (trick-play), `MUST_FOLLOW` (trick-play), `NOT_AFTER_LEAD` (trick-play), `NOT_IN_HAND` (trick-play), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (strategy-brain), `NO_RETRO` (strategy-brain), `NO_ROUND` (trick-play), `NO_SEAT` (card-table), `NO_TOKEN` (trick-play), `NO_VETO` (trick-play), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_LOCKED` (platform, stage `lock`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`), `UNKNOWN_CARD` (trick-play), `UNKNOWN_SUIT` (trick-play), `VETOED_SUIT` (trick-play), `WRONG_PHASE` (trick-play).

Event types of the mechanics: 14 of 14 occur. Never written in a file: none.

## harbor-lights

6 files. Mechanics: `card-table`, `hint-towers`, `team-channel`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `discardSlot` | hint-towers | yes | resident | 58 | `NOT_YOUR_TURN@execute` 1 |
| `giveSignal` | hint-towers | yes | resident | 103 | `NO_SIGNALS@execute` 2, `TOUCHES_NOTHING@execute` 1 |
| `playSlot` | hint-towers | yes | resident | 152 | `NOT_YOUR_TURN@execute` 1, `NO_SUCH_SLOT@execute` 1 |
| `postTeam` | team-channel | yes | resident | 9 | - |
| `readBrain` | strategy-brain | yes | resident | 12 | - |
| `readTeam` | team-channel | yes | resident | 9 | - |
| `viewHand` | card-table | no | **never called** | 0 | - |
| `viewTowers` | hint-towers | yes | resident | 10 | - |
| `writeBrain` | strategy-brain | yes | resident | 6 | `BRAIN_TOO_LONG@rule` 1 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `NOT_YOUR_TURN` | hint-towers | 2 | 2 |
| `NO_SIGNALS` | (not found in the source by the pattern) | 2 | 1 |
| `BRAIN_TOO_LONG` | strategy-brain | 1 | 1 |
| `NO_SUCH_SLOT` | hint-towers | 1 | 1 |
| `TOUCHES_NOTHING` | (not found in the source by the pattern) | 1 | 1 |

Refusal codes no file exercises (21): `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `INVALID_ARGUMENTS` (platform, stage `parse`), `MATCH_OVER` (hint-towers), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (team-channel, strategy-brain), `NO_GAME` (hint-towers), `NO_RETRO` (strategy-brain), `NO_SEAT` (card-table), `POST_CAP` (team-channel), `SIGNALS_FULL` (hint-towers), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_LOCKED` (platform, stage `lock`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`), `UNKNOWN_SIGNAL` (hint-towers).

Event types of the mechanics: 14 of 14 occur. Never written in a file: none.

## holdem

5 files. Mechanics: `holdem`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `act` | holdem | yes | resident | 297 | `INVALID_ARGUMENTS@parse` 4, `TOOL_LOCKED@lock` 2 |
| `readBrain` | strategy-brain | yes | **never called** | 0 | - |
| `viewTable` | holdem | yes | resident | 297 | - |
| `writeBrain` | strategy-brain | yes | resident | 10 | - |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `INVALID_ARGUMENTS` | platform, stage `parse` | 4 | 2 |
| `TOOL_LOCKED` | platform, stage `lock` | 2 | 2 |

Refusal codes no file exercises (19): `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_LONG` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `ILLEGAL_ACTION` (holdem), `MATCH_OVER` (holdem), `NOT_A_SEAT` (holdem), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (strategy-brain), `NOT_YOUR_TURN` (holdem), `NO_HAND` (holdem), `NO_RETRO` (strategy-brain), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`).

Event types of the mechanics: 13 of 13 occur. Never written in a file: none.

## lanterns

4 files. Mechanics: `clue-grid`, `team-channel`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `endGuesses` | clue-grid | yes | **never called** | 0 | - |
| `giveClue` | clue-grid | yes | resident | 45 | `TOOL_LOCKED@lock` 2 |
| `guess` | clue-grid | yes | resident | 68 | - |
| `postTeam` | team-channel | yes | resident | 135 | - |
| `readBrain` | strategy-brain | yes | resident | 16 | - |
| `readTeam` | team-channel | yes | resident | 51 | - |
| `viewGrid` | clue-grid | yes | resident | 73 | - |
| `writeBrain` | strategy-brain | yes | resident | 8 | `BRAIN_TOO_LONG@rule` 3 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `BRAIN_TOO_LONG` | strategy-brain | 3 | 2 |
| `TOOL_LOCKED` | platform, stage `lock` | 2 | 2 |

Refusal codes no file exercises (27): `ALREADY_REVEALED` (clue-grid), `BAD_CLUE` (clue-grid), `BAD_NUMBER` (clue-grid), `BAD_TARGETS` (clue-grid), `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `GUESS_FIRST` (clue-grid), `INVALID_ARGUMENTS` (platform, stage `parse`), `KEEPER_SILENT` (clue-grid), `MATCH_OVER` (clue-grid), `NOT_CALLER` (clue-grid), `NOT_ON_GRID` (clue-grid), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (team-channel, strategy-brain), `NOT_YOUR_CLUE` (clue-grid), `NO_CLUE` (clue-grid), `NO_GAME` (clue-grid), `NO_RETRO` (strategy-brain), `POST_CAP` (team-channel), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`).

Event types of the mechanics: 13 of 13 occur. Never written in a file: none.

## liars-dice

6 files. Mechanics: `liars-dice`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `bid` | liars-dice | yes | resident | 479 | `ILLEGAL_BID@rule` 6, `INVALID_ARGUMENTS@parse` 3, `TOOL_LOCKED@lock` 1 |
| `liar` | liars-dice | yes | resident | 63 | `TOOL_LOCKED@lock` 3 |
| `noSuchTool` | (none) | no | resident | 0 | `TOOL_UNKNOWN@lock` 1 |
| `readBrain` | strategy-brain | yes | resident | 1 | - |
| `viewTable` | liars-dice | yes | resident | 3 | - |
| `writeBrain` | strategy-brain | yes | resident | 24 | `TOOL_LOCKED@lock` 1 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `ILLEGAL_BID` | liars-dice | 6 | 3 |
| `TOOL_LOCKED` | platform, stage `lock` | 5 | 3 |
| `INVALID_ARGUMENTS` | platform, stage `parse` | 3 | 3 |
| `TOOL_UNKNOWN` | platform, stage `lock` | 1 | 1 |

Refusal codes no file exercises (18): `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_LONG` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `MATCH_OVER` (liars-dice), `NOT_A_SEAT` (liars-dice), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (strategy-brain), `NOT_YOUR_TURN` (liars-dice), `NO_BID` (liars-dice), `NO_GAME` (liars-dice), `NO_RETRO` (strategy-brain), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`).

Event types of the mechanics: 13 of 13 occur. Never written in a file: none.

## morris-teams

5 files. Mechanics: `morris`, `consensus`, `team-channel`, `strategy-brain`, `morris-referee`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `castVote` | consensus | yes | **never called** | 0 | - |
| `playMove` | morris | yes | resident | 189 | `NO_CONSENSUS@rule` 1 |
| `postTeam` | team-channel | yes | **never called** | 0 | - |
| `proposeMove` | consensus | yes | resident | 189 | `NOT_ON_MOVE@rule` 1 |
| `readBrain` | strategy-brain | yes | **never called** | 0 | - |
| `readTeam` | team-channel | yes | resident | 1 | - |
| `viewBoard` | morris | yes | resident | 205 | - |
| `writeBrain` | strategy-brain | yes | resident | 3 | `BRAIN_TOO_LONG@rule` 2 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `BRAIN_TOO_LONG` | strategy-brain | 2 | 1 |
| `NOT_ON_MOVE` | consensus | 1 | 1 |
| `NO_CONSENSUS` | consensus | 1 | 1 |

Refusal codes no file exercises (27): `ALREADY_AGREED` (consensus), `ALREADY_VOTED` (consensus), `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `CAPTAIN_CANNOT_VOTE` (consensus), `CONSENSUS_MISMATCH` (consensus), `GUARD_BLOCKED` (platform, stage `guard`), `ILLEGAL_CELL` (consensus), `ILLEGAL_MOVE` (morris), `ILLEGAL_REMOVAL` (morris), `INVALID_ARGUMENTS` (platform, stage `parse`), `MATCH_OVER` (morris), `NOT_CAPTAIN` (morris, consensus), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (consensus, team-channel, strategy-brain), `NO_GAME` (morris), `NO_OPEN_PROPOSAL` (consensus), `NO_RETRO` (strategy-brain), `POST_CAP` (team-channel), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_LOCKED` (platform, stage `lock`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`).

Event types of the mechanics: 12 of 15 occur. Never written in a file: `consensus.vote_cast`, `consensus.consensus_deadlocked`, `team-channel.team_post`.

## quarry

6 files. Mechanics: `draft-rounds`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `pick` | draft-rounds | yes | resident | 668 | `BURN_IS_PICK@rule` 1, `INVALID_ARGUMENTS@parse` 1, `NOT_IN_PACK@rule` 2, `NO_BURNS_LEFT@rule` 1, `TOOL_LOCKED@lock` 3 |
| `readBrain` | strategy-brain | yes | resident | 20 | - |
| `viewTable` | draft-rounds | yes | resident | 37 | - |
| `writeBrain` | strategy-brain | yes | resident | 44 | `BRAIN_TOO_LONG@rule` 5, `TOOL_LOCKED@lock` 1 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `BRAIN_TOO_LONG` | strategy-brain | 5 | 2 |
| `TOOL_LOCKED` | platform, stage `lock` | 4 | 1 |
| `NOT_IN_PACK` | draft-rounds | 2 | 1 |
| `BURN_IS_PICK` | draft-rounds | 1 | 1 |
| `INVALID_ARGUMENTS` | platform, stage `parse` | 1 | 1 |
| `NO_BURNS_LEFT` | draft-rounds | 1 | 1 |

Refusal codes no file exercises (18): `ALREADY_PICKED` (draft-rounds), `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `GUARD_BLOCKED` (platform, stage `guard`), `MATCH_OVER` (draft-rounds), `NOT_A_SEAT` (draft-rounds), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (strategy-brain), `NO_PACK` (draft-rounds), `NO_PICK` (draft-rounds), `NO_RETRO` (strategy-brain), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`).

Event types of the mechanics: 9 of 9 occur. Never written in a file: none.

## salt-market

4 files. Mechanics: `salt-market`, `strategy-brain`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `accept` | salt-market | yes | resident | 76 | `OWN_OFFER@rule` 1, `PROPOSER_CANNOT_COVER@rule` 1 |
| `decline` | salt-market | yes | resident | 211 | `NOT_FOR_YOU@execute` 1, `OFFER_CLOSED@execute` 4 |
| `give` | salt-market | yes | resident | 1 | - |
| `offer` | salt-market | yes | resident | 224 | `TOO_MANY_OFFERS@rule` 1 |
| `readBrain` | strategy-brain | yes | resident | 8 | - |
| `say` | salt-market | yes | resident | 21 | - |
| `viewMarket` | salt-market | yes | resident | 41 | - |
| `withdraw` | salt-market | yes | resident | 14 | `OFFER_CLOSED@execute` 1 |
| `writeBrain` | strategy-brain | yes | resident | 16 | `BRAIN_TOO_LONG@rule` 1 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `OFFER_CLOSED` | salt-market | 5 | 2 |
| `BRAIN_TOO_LONG` | strategy-brain | 1 | 1 |
| `NOT_FOR_YOU` | salt-market | 1 | 1 |
| `OWN_OFFER` | salt-market | 1 | 1 |
| `PROPOSER_CANNOT_COVER` | salt-market | 1 | 1 |
| `TOO_MANY_OFFERS` | salt-market | 1 | 1 |

Refusal codes no file exercises (30): `BAD_ROUND` (salt-market), `BRAIN_DISABLED` (strategy-brain), `BRAIN_EMPTY` (strategy-brain), `BRAIN_REPLAY` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `CANNOT_COVER` (salt-market), `EMPTY_GIFT` (salt-market), `EMPTY_MESSAGE` (salt-market), `EMPTY_OFFER` (salt-market), `GUARD_BLOCKED` (platform, stage `guard`), `INVALID_ARGUMENTS` (platform, stage `parse`), `MARKET_CLOSED` (salt-market), `MATCH_OVER` (salt-market), `NOT_A_TRADER` (salt-market), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (strategy-brain), `NOT_YOURS` (salt-market), `NO_RETRO` (strategy-brain), `NO_SUCH_OFFER` (salt-market), `SELF_OFFER` (salt-market), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_LOCKED` (platform, stage `lock`), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`), `TOO_EARLY_FOR_SHIPMENT` (salt-market), `TOO_MANY_MESSAGES` (salt-market), `UNKNOWN_TRADER` (salt-market), `USE_GIVE` (salt-market).

Event types of the mechanics: 17 of 17 occur. Never written in a file: none.

## tictactoe

9 files. Mechanics: `grid-game`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `castVote` | consensus | yes | resident | 254 | `ALREADY_VOTED@rule` 2, `CAPTAIN_CANNOT_VOTE@rule` 1, `NO_OPEN_PROPOSAL@rule` 1, `STEP_LIMIT@limit` 1 |
| `noSuchTool` | (none) | no | resident | 0 | `TOOL_UNKNOWN@lock` 1 |
| `playMove` | grid-game | yes | resident | 183 | `CONSENSUS_MISMATCH@rule` 1, `NO_CONSENSUS@rule` 1, `TOOL_LOCKED@lock` 1 |
| `postTeam` | team-channel | yes | resident | 56 | `POST_CAP@rule` 1, `STEP_LIMIT@limit` 1 |
| `proposeMove` | consensus | yes | resident | 231 | `ALREADY_AGREED@rule` 1, `ILLEGAL_CELL@rule` 5, `INVALID_ARGUMENTS@parse` 1, `NOT_CAPTAIN@rule` 2 |
| `readBrain` | strategy-brain | yes | resident | 1 | - |
| `readTeam` | team-channel | yes | resident | 5 | - |
| `viewBoard` | grid-game | yes | resident | 884 | `STEP_LIMIT@limit` 4 |
| `writeBrain` | strategy-brain | yes | resident | 30 | `BRAIN_EMPTY@rule` 1, `BRAIN_REPLAY@rule` 8, `BRAIN_TOO_LONG@rule` 1, `INVALID_ARGUMENTS@parse` 1, `TOOL_LOCKED@lock` 3 |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `BRAIN_REPLAY` | strategy-brain | 8 | 4 |
| `STEP_LIMIT` | platform, stage `limit` | 6 | 3 |
| `ILLEGAL_CELL` | consensus | 5 | 3 |
| `TOOL_LOCKED` | platform, stage `lock` | 4 | 2 |
| `ALREADY_VOTED` | consensus | 2 | 1 |
| `INVALID_ARGUMENTS` | platform, stage `parse` | 2 | 1 |
| `NOT_CAPTAIN` | grid-game, consensus | 2 | 1 |
| `ALREADY_AGREED` | consensus | 1 | 1 |
| `BRAIN_EMPTY` | strategy-brain | 1 | 1 |
| `BRAIN_TOO_LONG` | strategy-brain | 1 | 1 |
| `CAPTAIN_CANNOT_VOTE` | consensus | 1 | 1 |
| `CONSENSUS_MISMATCH` | consensus | 1 | 1 |
| `NO_CONSENSUS` | consensus | 1 | 1 |
| `NO_OPEN_PROPOSAL` | consensus | 1 | 1 |
| `POST_CAP` | team-channel | 1 | 1 |
| `TOOL_UNKNOWN` | platform, stage `lock` | 1 | 1 |

Refusal codes no file exercises (14): `BRAIN_DISABLED` (strategy-brain), `BRAIN_TOO_MANY_RULES` (strategy-brain), `CELL_TAKEN` (grid-game), `GUARD_BLOCKED` (platform, stage `guard`), `MATCH_OVER` (grid-game), `NOT_ON_MOVE` (consensus), `NOT_RETRO_CAPTAIN` (strategy-brain), `NOT_TEAM_MEMBER` (consensus, team-channel, strategy-brain), `NO_GAME` (grid-game), `NO_RETRO` (strategy-brain), `OUT_OF_RANGE` (grid-game), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_NOT_GRANTED` (platform, stage `lock`).

Event types of the mechanics: 14 of 15 occur. Never written in a file: `consensus.consensus_deadlocked`.

## whispers

3 files. Mechanics: `ledger`, `marks`, `names`, `channels`, `petitions`, `receipts`, `whispers`, `motives`, `puzzles`, `progression`, `cast`, `standoff`, `exile`, `standoff-tribunal`, `script`, `arena`.

| Tool | Mechanic | Granted to residents | Called by | Accepted | Refused with |
| --- | --- | --- | --- | ---: | --- |
| `activeTools` | progression | yes | **never called** | 0 | - |
| `addGroupMember` | channels | yes | **never called** | 0 | - |
| `announceTribunal` | standoff-tribunal | no | **never called** | 0 | - |
| `blame` | receipts | yes | **never called** | 0 | - |
| `callTribunal` | standoff-tribunal | no | **never called** | 0 | - |
| `chooseName` | names | yes | **never called** | 0 | - |
| `claimPiece` | standoff | yes | **never called** | 0 | - |
| `createGroup` | channels | yes | **never called** | 0 | - |
| `defy` | channels | yes | **never called** | 0 | - |
| `depositGroup` | channels | yes | **never called** | 0 | - |
| `directorMinute` | script | no | script | 60 | - |
| `drawLot` | standoff-tribunal | no | **never called** | 0 | - |
| `forgeReceipt` | whispers | yes | resident | 2 | - |
| `getProblem` | progression | yes | **never called** | 0 | - |
| `getStatus` | progression | yes | **never called** | 0 | - |
| `lastWill` | exile | yes | **never called** | 0 | - |
| `leaveGroup` | channels | yes | **never called** | 0 | - |
| `listAgents` | progression | yes | **never called** | 0 | - |
| `listMyGroups` | channels | yes | **never called** | 0 | - |
| `listPetitions` | petitions | yes | **never called** | 0 | - |
| `nameFavourite` | whispers | yes | resident | 54 | - |
| `notify` | channels | no | gamemaker | 3 | - |
| `payRansom` | exile | yes | **never called** | 0 | - |
| `permaDeath` | standoff-tribunal | no | **never called** | 0 | - |
| `postBoard` | channels | yes | resident | 0 | `GUARD_BLOCKED@guard` 3 |
| `postGroup` | channels | yes | **never called** | 0 | - |
| `readBoard` | channels | yes | **never called** | 0 | - |
| `readGroup` | channels | yes | **never called** | 0 | - |
| `removeGroupMember` | channels | yes | **never called** | 0 | - |
| `resolvePetition` | petitions | no | **never called** | 0 | - |
| `sendDM` | channels | yes | resident | 15 | - |
| `setTreasurer` | channels | yes | **never called** | 0 | - |
| `showReceipt` | receipts | yes | **never called** | 0 | - |
| `signPetition` | petitions | yes | **never called** | 0 | - |
| `submitSolution` | progression | yes | resident | 60 | `DOOR_CLOSED@execute` 27 |
| `transferPoints` | ledger | yes | **never called** | 0 | - |
| `tribunalVote` | standoff-tribunal | yes | **never called** | 0 | - |
| `ultimatum` | standoff | no | **never called** | 0 | - |
| `withdrawGroup` | channels | yes | **never called** | 0 | - |

| Refusal code | From | Refused calls | In files |
| --- | --- | ---: | ---: |
| `DOOR_CLOSED` | progression | 27 | 3 |
| `GUARD_BLOCKED` | platform, stage `guard` | 3 | 3 |

Refusal codes no file exercises (54): `ALREADY_BLAMED` (receipts), `ALREADY_EXILED` (exile), `ALREADY_SIGNED` (petitions), `ALREADY_SOLVED` (progression), `BEQUEST_CAP` (exile), `DM_LIMIT` (ledger, channels), `DUPLICATE_PETITION` (petitions), `GROUP_NOT_VISIBLE` (channels), `INSUFFICIENT_ESCROW` (cast), `INSUFFICIENT_FUNDS` (ledger, exile), `INVALID_AMOUNT` (ledger, exile), `INVALID_ARGUMENTS` (platform, stage `parse`), `INVALID_BEQUEST` (exile), `INVALID_FORMAT` (progression), `INVALID_REASON` (channels), `INVALID_TEXT` (channels, whispers, exile), `JUDGE_ABSENT` (receipts), `JUDGE_FAILED` (receipts), `MEMO_DIGITS` (ledger), `NAME_CHOSEN` (names), `NAME_CLOSED` (names), `NOT_ADDITIVE` (puzzles), `NOT_AT_GATE` (exile), `NOT_A_PARTY` (whispers), `NOT_FORGEABLE` (whispers), `NOT_PLAYED` (puzzles), `NO_MARKS` (channels, receipts, whispers), `NO_RANSOM` (exile), `NO_RESIDENT` (standoff, exile, standoff-tribunal), `NO_VOTE` (whispers), `PER_TEAM` (puzzles), `PETITION_CLOSED` (petitions), `RATE_LIMITED` (progression), `RECEIPT_CARRIES_FRAGMENT` (receipts), `SELF_BLAME` (receipts), `SELF_DM` (channels), `SELF_TARGET` (receipts, whispers), `SELF_TRANSFER` (ledger), `SELF_VOTE` (whispers), `STEP_LIMIT` (platform, stage `limit`), `TEXT_TOO_LONG` (platform, stage `parse`), `TOOL_LIMIT` (platform, stage `limit`), `TOOL_LOCKED` (names, channels, whispers, progression, standoff, exile, standoff-tribunal), `TOOL_NOT_GRANTED` (platform, stage `lock`), `TOOL_UNKNOWN` (platform, stage `lock`), `UNKNOWN_AGENT` (ledger, channels, receipts, whispers, cast, standoff, exile, standoff-tribunal), `UNKNOWN_CAST` (cast), `UNKNOWN_COLLECTION` (cast), `UNKNOWN_FACTOR` (exile), `UNKNOWN_LEVEL` (progression), `UNKNOWN_PETITION` (petitions), `UNKNOWN_RECEIPT` (whispers), `WILL_DONE` (exile), `WRONG_LEVEL` (progression).

Event types of the mechanics: 26 of 77 occur. Never written in a file: `ledger.transfer`, `names.name_chosen`, `channels.group_created`, `channels.group_removed`, `channels.group_membership`, `channels.group_post`, `channels.treasury_deposit`, `channels.treasury_withdrawal`, `channels.treasurer_set`, `channels.treasury_settled`, `channels.gamemaker_defied`, `petitions.petition_opened`, `petitions.petition_signed`, `petitions.petition_resolved`, `receipts.receipt_shown`, `receipts.blame`, `puzzles.factors_dealt`, `puzzles.factor_revealed`, `puzzles.factor_burned`, `puzzles.level_contracted`, `progression.tools_unlocked`, `cast.cast_level_set`, `cast.cast_revealed`, `cast.cast_retired`, `cast.cast_dm`, `cast.cast_collected`, `cast.collection_started`, `cast.collection_shortened`, `cast.collection_revealed`, `cast.lottery_drawn`, `standoff.piece_kept`, `standoff.piece_claimed`, `standoff.piece_given`, `standoff.ultimatum_set`, `standoff.ultimatum_resolved`, `exile.exiled`, `exile.exile_gate`, `exile.ransom_paid`, `exile.ransomed`, `exile.last_will`, `standoff-tribunal.blocker_cleared`, `standoff-tribunal.holdout_called`, `standoff-tribunal.lot_drawn`, `standoff-tribunal.holdout_vote_opened`, `standoff-tribunal.holdout_ballot`, `standoff-tribunal.holdout_vote_result`, `standoff-tribunal.holdout_announced`, `standoff-tribunal.holdout_ended`, `script.director_skipped`, `script.standings_published`, `arena.act_brake`.
