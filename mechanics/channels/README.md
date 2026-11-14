# Channels

Talk in the city. Every resident can write on one public board, read it, and send a direct message to another
resident; other mechanics speak as the city, with a post on the board or with a private notice that its reader finds
at its next activation. Every message a reader can cite carries one number from one counter, so a higher number is
always a later message. This is the M3 cut of the old mechanic: the board, direct messages and the notices; groups
and the treasury come back with the City.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-channels` |
| Id | `channels` |
| Summary | Talk in the city: the public board, direct messages and private notices. |
| Requires | none |
| Uses when loaded | none |
| Provides | `channels` |
| State | kept, snapshot slice version 1 |
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
5. **News.** For a scheduler that wakes on news, a resident has news while a direct message or a notice waits, or while the board holds
   a `player` post it has not seen and `readBoard` is not locked for it. A `city` post wakes nobody. A resident has
   seen the board up to its newest player post when its inputs are built, and it has seen its own post.
6. **Facts.** `channels.messages` is the last message number, `channels.boardPosts` the count of posts.

**Limit: `blockSize: 1`.** The "seen" mark is taken when a resident's inputs are built. The turn scheduler builds
the inputs of a whole block before any member acts, so with a `blockSize` above 1 a post that a block-mate writes
during the block is not marked as seen and wakes the resident once more. News is never lost, but the wake pattern is
the old platform's only with `blockSize: 1`. Games that load `channels` set `blockSize: 1` until the hooks for the
start and the end of an activation exist.

**Not in this cut:** the line that counts unread posts (`[unread] board 3`), so a resident learns of a new post only
by `readBoard`; marks as the price of a post or a message; the note of the Director; groups and the treasury; for
direct messages the cap of a window (`DM_LIMIT`), names as receivers (the receiver is a resident id), the receipt of
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

The city's voice (posts on the public board, private notices) and the record of the direct messages.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `post` | command | author: string, text: string, kind?: "city" or "system" | object | Writes a post on the public board and `board_post`. It is no news for residents: only a resident's own post is. |
| `notify` | command | to: string, author: string, text: string | null | Leaves a private notice for a resident and writes `notice`; the resident reads it at its next activation. An unknown resident throws. |
| `dmRecords` | query | - | object[] | Lists every direct message that was sent, delivered or not, oldest first. |

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

<!-- /generated:prompts -->

## Example

No game of the repository lists `channels` yet; `games/city-slice/game.ts` will, in this form:

```ts
defineGame({
	id: "city-slice",
	residents: 6,
	mechanics: [channels()],
	scheduler: { id: "turns", options: { blockSize: 1 } },
	end: { ticks: 12 },
});
```

The mechanic takes no options; the game's grants decide who gets `readBoard`, `postBoard` and `sendDM`.

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
