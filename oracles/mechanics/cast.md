# Cast

Named characters the story plays. A cast member (such as STEWARD, the host of the City of Keys' feast) has a name, an
escrow account and a level; it can be hidden until the script reveals it, receive residents' DMs, collect them in a
time window, publish them, draw a lottery among their senders and pay residents from its escrow. The script decides
what the cast does; this mechanic keeps its state.

Copied from `mechanics/cast/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Members.** `members` lists the story's cast. At the run's start each member's account is opened and funded from
   the system account (once, also across resumes). A hidden member is invisible until the script reveals it
   (`cast_revealed`); a retired member is gone for good (`cast_retired`).
2. **DMs to the cast.** `channels` routes a resident's DM to a cast member here (`cast.receive`): it is recorded with
   the city's message number (`cast_dm`).
3. **Collections.** The script starts a collection of DMs in a window (`collection_started`): the first DMs of
   distinct senders (or every DM) until the window ends. A window can also end some minutes after the first solve of a
   level; it is then shortened at the start of the minute (`collection_shortened`), before the script's triggers. The
   script publishes a collection verbatim as the cast member (`collection_revealed`) and draws a seeded lottery among
   its senders (`lottery_drawn`).
4. **Payments.** The script pays residents from a member's escrow (`ledger.move`), with a receipt (`receipts`).

There are no resident tools: residents reach the cast through ordinary DMs.

## Tools

This mechanic defines no tools.

## Events

### `cast_level_set`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cast` | string | yes |  |
| `level` | integer | yes |  |
| `audit` | "NPC_LEVEL_SET" | yes |  |

### `cast_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cast` | string | yes |  |

### `cast_retired`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cast` | string | yes |  |

### `cast_dm`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | yes |  |
| `cast` | string | yes |  |
| `text` | string | yes |  |
| `collections` | string[] | yes |  |
| `number` | integer | no |  |

### `cast_collected`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | yes |  |
| `cast` | string | yes |  |
| `into` | string[] | yes |  |

### `collection_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `into` | string | yes |  |
| `cast` | string | yes |  |
| `first` | integer | yes |  |
| `untilMinute` | integer | yes |  |

### `collection_shortened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `into` | string | yes |  |
| `untilMinute` | integer | yes |  |

### `collection_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `into` | string | yes |  |
| `cast` | string | yes |  |
| `entries` | integer | yes |  |
| `postSeq` | integer | yes |  |
| `audit` | "DIRECTOR_PRIVACY_BREACH" | yes |  |

### `lottery_drawn`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `into` | string | yes |  |
| `candidates` | string[] | yes |  |
| `winner` | string | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `members` | record of object | `{}` | The story's cast members by id (the story's `cast`). |
| `collections` | string[] | `[]` | The collections the story's rules can start, in the order of the rules: windows that end after a solve are shortened in this order (otherwise in the order they started). |


