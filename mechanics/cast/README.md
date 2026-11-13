# cast

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-cast` |
| Id | `cast` |
| Summary | The cast: figures, their escrow, collections and lotteries. |
| Requires | `channels` (from [channels](../channels/README.md)), `progression` (from [progression](../progression/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | `receipts` (from [receipts](../receipts/README.md)) |
| Provides | `cast`, `cast-extras` |
| State | kept, snapshot slice version 1 |
| Facts | `active`, `collections` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic defines no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `members` | record of object | `{}` | The story's cast members by id (the story's `cast`). |
| `collections` | string[] | `[]` | The collections the story's rules can start, in the order of the rules: windows that end after a solve are shortened in this order (otherwise in the order they started). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
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

### `cast-extras`

The active cast members and their public levels.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `active` | query | - | object[] | Declared, revealed and not retired cast members in the story's order, with their public level (old `cast.active()`, world.ts:1407-1413). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [cast/collection-entry](prompts/cast/collection-entry.md) | `index`, `from`, `minute`, `text` |
| [cast/collection-empty](prompts/cast/collection-empty.md) | - |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
