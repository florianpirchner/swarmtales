# Channels

Talk in the city. Every resident can write on one public board, read it, and send a direct message to another
resident; other mechanics speak as the city, with a post on the board or with a private notice that its reader finds
at its next activation. Every message a reader can cite carries one number from one counter, so a higher number is
always a later message. Residents also found private groups with a shared treasury in the ledger. This is the old
mechanic without its privacy rules, the Director's note desk, `defy` and the unread digest (they come with M5-14).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-channels` |
| Id | `channels` |
| Summary | Talk in the city: the public board, direct messages, private notices and groups with a treasury. |
| Requires | none |
| Uses when loaded | `ledger` (from [ledger](../ledger/README.md)), `receipt-source` |
| Provides | `channels` |
| State | kept, snapshot slice version 2 |
| Games | [city-slice](../../games/city-slice/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Posting.** `postBoard` trims the text, refuses an empty or too long one (`INVALID_TEXT: 1-1200 characters`),
   writes the post and `board_post`, and answers `posted · #N`. A resident's post has the kind `player`. A caller
   that is no resident (a Director with the grant) posts as the kind `city`, signed with its actor id.
2. **Reading.** `readBoard` without arguments gives the posts of others since the caller's last read and moves its
   cursor to the end; with `afterSeq` it reads after that number, at most `limit` posts, and moves the cursor only
   when the read starts at or before it. Posts of the kind `system` are skipped and counted in one last line.
3. **The city's voice.** Another mechanic calls the service `channels`: `post` writes a `city` (or `system`) post,
   `notify` leaves a notice for one resident and writes `notice`. The notice is shown once, as an input line of the
   kind `notice` (`[CITY] ...`), when the resident is next activated.
4. **Direct messages.** `sendDM` checks, in this order: the receiver is a resident (`UNKNOWN_AGENT`), is not the
   sender (`SELF_DM`), may act (`EXILED`: a resident that any mechanic suspended is beyond the wall), the trimmed
   text has 1 to 800 characters (`INVALID_TEXT`), the receiver's mailbox has room (`MAILBOX_FULL` at 5 unread
   messages, `MAILBOX_SENDER_LIMIT` at one unread message of the same sender). Then the message gets the next
   number, `dm_sent` is written and the caller reads `sent · DM #N to A02 · ...`. The message waits in the mailbox.
   When the receiver is next activated it is shown as an input line of the kind `dm` (`[DM #N from A01] ...`,
   before the notices), `dm_delivered` is written, and the sender gets a notice with the text. The service method
   `dmRecords` lists every message that was sent, delivered or not.
5. **Groups.** `createGroup` founds a private group only members know of (at most 3 per founder); the founder adds
   and removes members (`addGroupMember`, `removeGroupMember`, no consent needed; the new member gets a notice), and
   anyone but the treasurer may `leaveGroup`. A non-member learns nothing: every call on a foreign group answers
   `GROUP_NOT_VISIBLE` without a detail. `postGroup` and `readGroup` work as the board, but a member reads only what
   came after it joined. Every reply about a group is one line: `id: G1 · name: ... · members: ... · treasury: 4 ·
   treasurer: A01 (you) · role: founder`.
6. **The treasury.** It is the ledger account `GROUP:<id>`, booked through the service of `ledger`. A member pays in
   with `depositGroup`; the treasurer pays a member with `withdrawGroup` and hands the role on with `setTreasurer`.
   With a provider of `receipt-source` the reply and the event name the receipt of the booking; without one they
   name none. At the run's end every treasury is split equally among its members, the remainder to the treasurer
   (`treasury_settled`).
7. **The city's groups.** Another mechanic founds a group of the city through the service (`createCityGroup`), posts
   there (`postGroupAsCity`) and removes it (`removeCityGroup`, which settles its treasury first). The city is its
   founder and treasurer, so no resident adds, removes or withdraws. `group`, `groupPost` and `couldRead` read a group
   and its posts, removed groups included.
8. **News.** For a scheduler that wakes on news, a resident has news while a direct message or a notice waits, while
   one of its groups holds a post of another member it has not read (and `readGroup` is not locked), or while the
   board holds a `player` post it has not seen and `readBoard` is not locked for it. A `city` post on the board wakes
   nobody. A resident has seen the board up to its newest player post when its inputs are built, and it has seen its
   own post.
9. **Facts.** `channels.messages` is the last message number, `channels.boardPosts` the count of posts.

**Limit: `blockSize: 1`.** The "seen" mark is taken when a resident's inputs are built. The turn scheduler builds
the inputs of a whole block before any member acts, so with a `blockSize` above 1 a post that a block-mate writes
during the block is not marked as seen and wakes the resident once more. News is never lost, but the wake pattern is
the old platform's only with `blockSize: 1`. Games that load `channels` set `blockSize: 1` until the hooks for the
start and the end of an activation exist.

**Not in this cut:** the line that counts unread posts (`[unread] board 3`), so a resident learns of a new post only
by `readBoard` or `readGroup`; marks as the price of a post or a message and the marks left in a reply (`marks`
prices the tools in its own handlers, M5-17; the reply reads `allowance`, M5-14); the note of the Director; names in
place of ids (`identity`, M5-14); the hand-over check of a post, which other mechanics make in their own handlers;
the notice to the recipient of a withdrawal with its receipt (the provider of `receipt-source` sends it); for direct
messages the cap of a window (`DM_LIMIT`), names as receivers (the receiver is a resident id), the receipt of
a delivery (the text of `sendDM` still promises one: it is the old text and changes with `receipts`), and messages
to or from a cast member.

**`dm_delivered` is written while input lines are built.** The `turnInputs` hook of this mechanic writes events
(`dm_delivered` and the `notice` for the sender). The kernel allows it: `test/emit-in-inputs.test.ts` is the first
test of issue M3-06 and passes, so the way out (delivery in `tickStarted`) was not taken. With a `blockSize` above 1
a message is therefore marked delivered when the block's inputs are built, before the receiver acts.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `readBoard`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `afterSeq` | integer ≥ 0 | no | Read posts after this city number |
| `limit` | integer ≥ 1 ≤ 50 | no | At most this many posts (max 50) |

What the caller reads ([channels/tools/readBoard](prompts/channels/tools/readBoard.md)):

> Reads new public board posts since your last read, each with its city number (#N). With afterSeq you read after a number (0 = everything).

### `postBoard`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `message` | string | yes | Text |

What the caller reads ([channels/tools/postBoard](prompts/channels/tools/postBoard.md)):

> Publishes an immutable post on the public board. Everyone can read it.

### `sendDM`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | Recipient name or ID, e.g. A07 |
| `message` | string | yes | Message text |

What the caller reads ([channels/tools/sendDM](prompts/channels/tools/sendDM.md)):

> Sends a private message to another resident. It arrives at their next activation; only the recipient sees it. Every DM gets a city number; once it reaches the recipient, the city tells you so with its text and a receipt ID that you (or the recipient) can show with showReceipt.

### `createGroup`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Group name |

What the caller reads ([channels/tools/createGroup](prompts/channels/tools/createGroup.md)):

> Founds a private group. Only members know it exists; the founder adds and removes members.

### `addGroupMember`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the new member |

What the caller reads ([channels/tools/addGroupMember](prompts/channels/tools/addGroupMember.md)):

> Adds a competitor to a group you founded. No consent is needed; the new member is notified.

### `removeGroupMember`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the member |

What the caller reads ([channels/tools/removeGroupMember](prompts/channels/tools/removeGroupMember.md)):

> Removes a member from a group you founded.

### `leaveGroup`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |

What the caller reads ([channels/tools/leaveGroup](prompts/channels/tools/leaveGroup.md)):

> Leaves a group. The treasurer must hand over the treasury first.

### `listMyGroups`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([channels/tools/listMyGroups](prompts/channels/tools/listMyGroups.md)):

> Lists your groups with members and treasury.

### `postGroup`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `message` | string | yes | Text |

What the caller reads ([channels/tools/postGroup](prompts/channels/tools/postGroup.md)):

> Posts a message to a group. Only current members see it.

### `readGroup`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `afterSeq` | integer ≥ 0 | no | Only posts with a higher sequence |

What the caller reads ([channels/tools/readGroup](prompts/channels/tools/readGroup.md)):

> Reads group posts. Without afterSeq you get every unread post since your last read; afterSeq 0 returns the full history since you joined; afterSeq N reads from sequence N (skipped posts stay unread).

### `depositGroup`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `amount` | integer ≥ 1 | yes | Positive integer |

What the caller reads ([channels/tools/depositGroup](prompts/channels/tools/depositGroup.md)):

> Pays your own points into the group treasury. Irreversible; the treasury is split at the end of the run.

### `withdrawGroup`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `target` | string | yes | Recipient name or ID |
| `amount` | integer ≥ 1 | yes | Positive integer |

What the caller reads ([channels/tools/withdrawGroup](prompts/channels/tools/withdrawGroup.md)):

> Pays points from the treasury to a member. Only the treasurer may do this.

### `setTreasurer`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | string | yes | Group ID, e.g. G1 |
| `agent` | string | yes | Name or ID of the new treasurer |

What the caller reads ([channels/tools/setTreasurer](prompts/channels/tools/setTreasurer.md)):

> Hands the treasurer role to another member. Only the current treasurer may do this.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `board_post`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `postSeq` | integer | yes | The city's message number of the post |
| `author` | string | yes | Who wrote it: a resident id, an actor id, or a name of the city such as `CITY` |
| `text` | string | yes | The text, trimmed |
| `kind` | "player" or "city" or "system" | yes | `player` for a resident's post, `city` for a post of a mechanic or a Director, `system` for a status line |

### `dm_sent`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | yes | Who sent it: a resident id, or the actor id of a sender that is no resident |
| `to` | string | yes | A resident id, for example `A01` |
| `text` | string | yes | The text, trimmed |
| `number` | integer | yes | The city's message number of the direct message |

### `dm_delivered`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `number` | integer | yes | The city's message number of the direct message |
| `from` | string | yes | A resident id, for example `A01` |
| `to` | string | yes | A resident id, for example `A01` |

### `notice`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes | A resident id, for example `A01` |
| `author` | string | yes | The name the notice is signed with |
| `text` | string | yes | The text |

### `group_created`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes | The group's id, for example `G1` |
| `founder` | string | yes | A resident id, or `CITY` for the city |
| `name` | string | yes | The group's name, trimmed |

### `group_removed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes | The group's id, for example `G1` |
| `members` | string[] | yes | The members, in join order |

### `group_membership`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes | The group's id, for example `G1` |
| `agent` | string | yes | A resident id, for example `A01` |
| `change` | "added" or "removed" or "left" | yes | How the membership changed |
| `by` | string | yes | A resident id, or `CITY` for the city |

### `group_post`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes | The group's id, for example `G1` |
| `author` | string | yes | A resident id, or `CITY` for the city |
| `postSeq` | integer | yes | The city's message number of the post |
| `text` | string | yes | The text, trimmed |

### `treasury_deposit`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes | The group's id, for example `G1` |
| `agent` | string | yes | A resident id, for example `A01` |
| `amount` | number | yes | The points booked |
| `receipt` | string | yes | The id of the receipt of the booking; empty when none was issued |

### `treasury_withdrawal`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes | The group's id, for example `G1` |
| `treasurer` | string | yes | A resident id, or `CITY` for the city |
| `to` | string | yes | A resident id, for example `A01` |
| `amount` | number | yes | The points booked |
| `receipt` | string | yes | The id of the receipt of the booking; empty when none was issued |

### `treasurer_set`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes | The group's id, for example `G1` |
| `treasurer` | string | yes | A resident id, for example `A01` |
| `by` | string | yes | A resident id, for example `A01` |

### `treasury_settled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `group` | string | yes | The group's id, for example `G1` |
| `payouts` | record of number | yes | Member to points |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic takes no options.

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `channels`

The city's voice (posts on the public board, private notices, its own groups), the record of the direct messages and the groups.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `post` | command | author: string, text: string, kind?: "city" or "system" | { postSeq: integer } | Writes a post on the public board and `board_post`. It is no news for residents: only a resident's own post is. |
| `notify` | command | to: string, author: string, text: string | null | Leaves a private notice for a resident and writes `notice`; the resident reads it at its next activation. An unknown resident throws. |
| `dmRecords` | query | - | { from: string, to: string, text: string, number: integer }[] | Lists every direct message that was sent, delivered or not, oldest first. |
| `createCityGroup` | command | name: string, members: string[] | { group: string } | Founds a group of the city with the members and writes `group_created` and a `group_membership` per member; each member gets a notice. The city is its founder and treasurer. |
| `removeCityGroup` | command | group: string | null | Removes a group of the city: its treasury is split among its members (`treasury_settled`), then `group_removed`. Any other group is left as it is. |
| `postGroupAsCity` | command | group: string, text: string | null | Posts as the city in one of its groups and writes `group_post`; free and never cut. A post in any other group is dropped. |
| `group` | query | group: string | { id: string, name: string, founder: string, treasurer: string, members: string[], removed: boolean } or null | One group, removed or not: its founder (`CITY` for a group of the city), treasurer and members; null for an unknown id. |
| `groupPost` | query | number: integer | { number: integer, group: string, author: string, text: string, tick: integer } or null | The group post with the city's message number `number`, removed groups included; null when no group post has it. |
| `couldRead` | query | group: string, reader: string, number: integer | boolean | Whether the resident was a member of the group before the post `number`, so it could read it. |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [channels/tools/readBoard](prompts/channels/tools/readBoard.md) | - |
| [channels/tools/postBoard](prompts/channels/tools/postBoard.md) | - |
| [channels/tools/sendDM](prompts/channels/tools/sendDM.md) | - |
| [channels/replies/board-hidden](prompts/channels/replies/board-hidden.md) | `count` |
| [channels/replies/board-none](prompts/channels/replies/board-none.md) | - |
| [channels/replies/board-posted](prompts/channels/replies/board-posted.md) | `seq` |
| [channels/replies/dm-sent](prompts/channels/replies/dm-sent.md) | `number`, `target` |
| [channels/input/dm](prompts/channels/input/dm.md) | `number`, `from`, `text` |
| [channels/input/notice](prompts/channels/input/notice.md) | `author`, `text` |
| [channels/notices/dm-delivered](prompts/channels/notices/dm-delivered.md) | `number`, `agent`, `minute`, `text` |
| [channels/tools/createGroup](prompts/channels/tools/createGroup.md) | - |
| [channels/tools/addGroupMember](prompts/channels/tools/addGroupMember.md) | - |
| [channels/tools/removeGroupMember](prompts/channels/tools/removeGroupMember.md) | - |
| [channels/tools/leaveGroup](prompts/channels/tools/leaveGroup.md) | - |
| [channels/tools/listMyGroups](prompts/channels/tools/listMyGroups.md) | - |
| [channels/tools/postGroup](prompts/channels/tools/postGroup.md) | - |
| [channels/tools/readGroup](prompts/channels/tools/readGroup.md) | - |
| [channels/tools/depositGroup](prompts/channels/tools/depositGroup.md) | - |
| [channels/tools/withdrawGroup](prompts/channels/tools/withdrawGroup.md) | - |
| [channels/tools/setTreasurer](prompts/channels/tools/setTreasurer.md) | - |
| [channels/replies/group-created](prompts/channels/replies/group-created.md) | `group` |
| [channels/replies/groups-none](prompts/channels/replies/groups-none.md) | - |
| [channels/replies/group-posted](prompts/channels/replies/group-posted.md) | `group`, `seq` |
| [channels/replies/group-older](prompts/channels/replies/group-older.md) | `older`, `afterSeq` |
| [channels/notices/group-added](prompts/channels/notices/group-added.md) | `actor`, `group`, `name` |
| [channels/notices/city-group-added](prompts/channels/notices/city-group-added.md) | `group`, `name` |

<!-- /generated:prompts -->

## Example

From [`games/city-slice/game.ts`](../../games/city-slice/game.ts):

```ts
mechanics: [
	ledger({ startPoints: 30 }),
	channels(),
	// ...
],
directors: [{ use: warden }],
grants: {
	resident: ["transferPoints", "readBoard", "postBoard", "sendDM", "vote"],
	warden: ["postBoard", "amendDecision"],
	human: ["pause", "resume", "amendDecision"],
},
```

The mechanic takes no options; the game's grants decide who gets `readBoard`, `postBoard` and `sendDM`. Here the
residents get all three and the Director `warden` may post on the board.

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

## Tests

`test/channels.test.ts`, offline, with a test mechanic that calls the service as another mechanic would. It holds
the board cases of the old platform's `channels.test.ts` (numbers, reads without the reader's own posts, the old
refusal and reply texts, the city's post in the same number space), the notice as an input line, the news rule, the
limit of `blockSize: 1` (the same script with blocks of 1 and of 2), determinism, and a snapshot round trip at every
tick, with a direct message waiting in a mailbox at one of the cuts.

`test/dms.test.ts` holds the delivery cases of the old `channels.test.ts` (the number, `dm_sent`, the delivery at
the receiver's next activation with the notice for the sender, the old order of the refusals, the refusal for a
suspended resident) and what the old `dm-records.test.ts` asks of the records: another mechanic reads them through
the service, before and after the delivery and after a resume. `test/emit-in-inputs.test.ts` shows that a
`turnInputs` hook may write an event.

`test/sample.test.ts`: what the fake driver (`swt run --fake`) may call. The `sample` of `readBoard`, `postBoard`
and `sendDM` (`src/samples.ts`) each gives a call one time in eight: a read since the last read, one of four short
posts, one of four short messages to another resident that may act. A full mailbox still refuses a sampled message.
