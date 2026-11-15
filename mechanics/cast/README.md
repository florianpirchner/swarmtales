# Cast

Named characters the game plays. A cast member (such as STEWARD, the host of the City of Keys' feast) has a name, an
escrow account and a level; it can be hidden until the script reveals it, receive residents' direct messages, collect
them in a time window, publish them, draw a lottery among their senders and pay residents from its escrow. The script
decides what the cast does; this mechanic keeps its state. Ported from the old platform (M5-24).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-cast` |
| Id | `cast` |
| Summary | The cast: figures, their escrow, collections and lotteries. |
| Requires | `ledger` (from [ledger](../ledger/README.md)), `channels` (from [channels](../channels/README.md)) |
| Uses when loaded | none |
| Provides | `cast`, `cast-extras` |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

<!-- /generated:glance -->

## How it plays

1. **Members.** `members` lists the game's cast. At the run's start each member's escrow account is opened and funded
   from the system account. A hidden member is invisible until the script reveals it (`cast_revealed`); a retired
   member is gone for good (`cast_retired`). The active members, with their public level, are what `listAgents` of
   `progression` shows beside the residents (`cast-extras`).
2. **Direct messages to the cast.** A message to an active member is handed in with `receive`: it is recorded with
   the city's message number (`cast_dm`), and once its marks are spent `collected` writes `cast_collected` for a new
   sender, which the script's `onCollect` rules react to. No mechanic routes a resident's `sendDM` here yet: that is
   a change of `channels` (erratum J117).
3. **Collections.** The script starts a collection of direct messages in a window (`collection_started`): the first
   messages of distinct senders (or every message) until the window ends. A window can also end some ticks after the
   first solve of a level, which the cast reads from `progression`'s `submission`; it is then shortened at the start
   of the tick (`collection_shortened`), before the script's triggers. The script publishes a collection verbatim as
   the cast member (`collection_revealed`) and draws a seeded lottery among its senders (`lottery_drawn`).
4. **Payments.** The script pays residents from a member's escrow (`ledger.move`); `escrow_paid` follows the
   booking, and `receipts`, when loaded, issues the receipt and tells the paid resident.

There are no resident tools: residents reach the cast through ordinary direct messages.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `cast_level_set`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cast` | string | yes | The id of a cast member, for example `STEWARD` |
| `level` | integer | yes | The public level |
| `audit` | "NPC_LEVEL_SET" | yes | The audit mark |

### `cast_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cast` | string | yes | The id of a cast member, for example `STEWARD` |

### `cast_retired`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cast` | string | yes | The id of a cast member, for example `STEWARD` |

### `cast_dm`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | yes | A resident id or the id of a cast member |
| `cast` | string | yes | The id of a cast member, for example `STEWARD` |
| `text` | string | yes | The text, trimmed |
| `collections` | string[] | yes | Names of collections |
| `number` | integer | no | The city's message number |

### `cast_collected`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | yes | A resident id or the id of a cast member |
| `cast` | string | yes | The id of a cast member, for example `STEWARD` |
| `into` | string[] | yes | Names of collections |

### `collection_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `into` | string | yes | The name of a collection |
| `cast` | string | yes | The id of a cast member, for example `STEWARD` |
| `first` | integer | yes | How many entries it takes |
| `untilMinute` | integer | yes | The tick it ends |

### `collection_shortened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `into` | string | yes | The name of a collection |
| `untilMinute` | integer | yes | The new end |

### `collection_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `into` | string | yes | The name of a collection |
| `cast` | string | yes | The id of a cast member, for example `STEWARD` |
| `entries` | integer | yes | Its entries |
| `postSeq` | integer | yes | The board post |
| `audit` | "DIRECTOR_PRIVACY_BREACH" | yes | The audit mark |

### `lottery_drawn`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `into` | string | yes | The name of a collection |
| `candidates` | string[] | yes | The distinct senders, sorted |
| `winner` | string | yes | A resident id or the id of a cast member |

### `escrow_paid`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cast` | string | yes | The id of a cast member, for example `STEWARD` |
| `to` | string | yes | A resident id or the id of a cast member |
| `amount` | number | yes | The points |
| `txId` | string | yes | The ledger's booking |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `members` | record of object | `{}` | The story's cast members by id (the story's `cast`). |
| `collections` | string[] | `[]` | The collections the story's rules can start, in the order of the rules: windows that end after a solve are shortened in this order (otherwise in the order they started). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `cast`

The cast: figures, their escrow, collections and lotteries.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `isActive` | query | cast: string | boolean | Whether a resident may write to this cast member now (old `cast.isActive`). |
| `collection` | query | into: string | { first: integer, untilMinute: integer, entries: integer } or null | A collection by name as the old script read it: how many entries it takes, its end and its entries; null when none was started. |
| `receive` | command | from: string, cast: string, text: string, number: integer | { collections: string[], newSender: string[] } | A resident's direct message to a cast member (old `#dmToCast` after the checks): collected while a collection runs; writes `cast_dm` with the number the router took. |
| `collected` | command | from: string, cast: string, into: string[] | null | The message's marks were spent: writes `cast_collected` for the `newSender` of `receive`. |
| `setLevel` | command | cast: string, level: integer | null | Old `setCastLevel`; writes `cast_level_set`. |
| `reveal` | command | cast: string | boolean | Old `revealCast`; writes `cast_revealed`. |
| `retire` | command | cast: string | boolean | Old `retireCast`; writes `cast_retired`. |
| `escrow` | command | cast: string, to: string, amount: number > 0 | { ok: true } or { ok: false, code: string, detail?: string } | Pays a resident from the cast member's escrow (old `escrowTransfer`); writes `escrow_paid` after the booking. |
| `startCollection` | command | into: string, cast: string, first: integer, untilMinute: integer, distinctSenders: boolean, afterSolve?: object | boolean | Old `startCollection`; writes `collection_started`. |
| `shortenCollection` | command | into: string, untilMinute: integer | null | Old `shortenCollection`; writes `collection_shortened`. |
| `revealCollection` | command | into: string, header?: string | { ok: true } or { ok: false, code: string, detail?: string } | Old `revealCollection`; writes `collection_revealed`. |
| `drawLottery` | command | into: string, salt: string | string or null | Old `drawLottery` (stream `lottery`, into, salt, tick); writes `lottery_drawn`. |

### `cast-extras`

The active cast members and their public levels.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `active` | query | - | { id: string, level: integer }[] | Declared, revealed and not retired cast members in the game's order, with their public level. |

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
| [cast/collection-entry](prompts/cast/collection-entry.md) | `index`, `from`, `minute`, `text` |
| [cast/collection-empty](prompts/cast/collection-empty.md) | - |

<!-- /generated:prompts -->

## Example

The City of Keys has one hidden member, the host of the feast on level 10:

```ts
cast({ members: { STEWARD: { level: 10, hidden: true } }, collections: ["feast", "feast-start"] });
```

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH3** the feast's city factor became a public good once guests posted it. Fixed (one factor per team, a quarter of
  the city seated).
- **P9** the feast came too early and too vague. Fixed.

## Tests

- [`test/cast.test.ts`](test/cast.test.ts), carried from the old `test/mechanics/cast/cast.test.ts`: hidden and
  retired members, the active list, messages handed in, collection windows (distinct senders, shortening after a
  solve), publishing, the lottery, escrow funding and payments; replay and resume at every boundary.
- The receipt of an escrow payment: [`../receipts/test/receipts.test.ts`](../receipts/test/receipts.test.ts).
