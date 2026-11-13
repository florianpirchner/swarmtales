# standoff

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-standoff` |
| Id | `standoff` |
| Summary | Pieces residents hold for others, kept pieces and ultimatums. |
| Requires | `puzzles` (from [puzzles](../puzzles/README.md)), `progression` (from [progression](../progression/README.md)), `ledger` (from [ledger](../ledger/README.md)), `channels` (from [channels](../channels/README.md)) |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `names` (from [names](../names/README.md)), `tribunal` (from [tribunal](../tribunal/README.md)), `tribunal-view` (from [tribunal](../tribunal/README.md)) |
| Provides | `standoff` |
| State | kept, snapshot slice version 1 |
| Facts | `cityPiecePrice`, `cityPieces`, `given`, `outstanding`, `section`, `ultimatums`, `unused` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `claimPiece`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `piece` | string | yes | The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate |
| `from` | string | yes | The resident who held it, name or ID |

What the caller reads ([tools/claimPiece](../../library/prompts/tools/claimPiece.md)):

> Buys from the city what a resident held for you at one door: pieces an exiled resident did not bequeath (half the price of a ransom) or pieces the city seized when an ultimatum ran out (the ultimatum's penalty). One purchase covers every such piece of that holder at that door. Only those pieces are for sale. The values arrive as a city notice.

### `ultimatum`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | string | yes | Resident name or ID |
| `b` | string | yes | The other resident, name or ID |
| `minutes` | integer ≥ 1 | yes | Minutes until the deadline |

What the caller reads ([gamemaker/tools/ultimatum](../../library/prompts/gamemaker/tools/ultimatum.md)):

> Gives two residents who hold pieces for each other a deadline: whoever has not handed over what it holds for the other by then loses the city's penalty. The city words it, tells both in private and settles it; the report shows the standoffs.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `piece_kept`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `level` | integer | yes |  |
| `piece` | string | yes |  |
| `needers` | string[] | yes |  |
| `cause` | "exile" or "ultimatum" | yes |  |

### `piece_claimed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `from` | string | yes |  |
| `level` | integer | yes |  |
| `piece` | string | yes |  |
| `price` | integer | yes |  |

### `piece_given`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `holder` | string | yes |  |
| `needer` | string | yes |  |
| `level` | integer | yes |  |
| `piece` | string | yes |  |

### `ultimatum_set`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `number` | integer | yes |  |
| `between` | string[] | yes |  |
| `until` | integer | yes |  |
| `penalty` | integer | yes |  |
| `debts` | object[] | yes |  |
| `debts[].holder` | string | yes |  |
| `debts[].needer` | string | yes |  |
| `debts[].level` | integer | yes |  |
| `debts[].pieces` | string[] | yes |  |

### `ultimatum_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `number` | integer | yes |  |
| `kept` | string[] | yes |  |
| `released` | string[] | yes |  |
| `paid` | object[] | yes |  |
| `paid[].agent` | string | yes |  |
| `paid[].points` | integer | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ultimatum` | object | unset | The gamemaker's ultimatum (P43); without it the gamemaker has none. |
| `ultimatum.penalty` | integer ≥ 0 | required | Points whoever has not handed over by the deadline loses (at most what it holds). |
| `ultimatum.maxMinutes` | integer ≥ 1 | required | The longest deadline the gamemaker may give, in minutes. |
| `author` | string | `"COURIER"` | The gamemaker's name on its notices and board posts, e.g. COURIER. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `standoff`

Pieces residents hold for others, the city's kept pieces and ultimatums.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `heldPieces` | query | resident: string | object[] | Old `heldPieces`. |
| `keep` | command | from: string, pieces: object[] | null | The city keeps an exiled holder's pieces and sells them to their needers (old `#standoff.keep`); writes `piece_kept`. |
| `noteText` | command | author: string, readers: string[], text: string | null | A text the author sent to `readers` (old `#standoff.noteText`): a piece handed over in it counts as given; writes `piece_given`. |
| `noteGiven` | command | from: string, to: string, piece: object | null | A last will handed `piece` to `to` (old `#standoff.noteGiven`): it counts as given; writes `piece_given` (T4 request R2). |
| `cityPiecePrice` | query | - | number | Old `cityPiecePrice`. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/claimPiece](../../library/prompts/tools/claimPiece.md) | - |
| [replies/piece-bought](../../library/prompts/replies/piece-bought.md) | `pieces`, `price` |
| [replies/locked](../../library/prompts/replies/locked.md) | - |
| [competitor/status/held](../../library/prompts/competitor/status/held.md) | `pieces` |
| [competitor/status/held-piece](../../library/prompts/competitor/status/held-piece.md) | `waiting`, `level`, `noun`, `value` |
| [gamemaker/tools/ultimatum](../../library/prompts/gamemaker/tools/ultimatum.md) | - |
| [gamemaker/replies/ultimatum-given](../../library/prompts/gamemaker/replies/ultimatum-given.md) | `number`, `between`, `until`, `penalty` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
