# Standoff

Who holds what for whom. On the wall residents hold pieces of each other's codes (a counter-factor, a certificate), so
every door needs a hand-over. This mechanic tracks those pieces, notices when a holder writes the value to the one who
needs it, lets the gamemaker set an ultimatum on a pair that holds out on each other, and keeps the pieces of exiled
residents, which the city sells to whoever still needs them (`claimPiece`).

Copied from `mechanics/standoff/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Held pieces.** From `puzzles.heldPieces` the mechanic knows, per door, what each resident holds for whom. The
   status line tells a resident what it still holds for others.
2. **Hand-overs.** When a holder writes the value to the one who needs it (in a DM, the text is checked), the hand-over
   is noted (`piece_given`). A piece bequeathed in a last will counts once as given (`standoff.noteGiven`).
3. **Ultimatums.** The gamemaker's `ultimatum` tool (only with the story's `ultimatum` option, and offered only at
   gamemaker direction 10) gives two residents who hold pieces for each other a deadline of at most `maxMinutes`
   (`ultimatum_set`). The city words it and tells both privately. At the deadline, settled at the start of the minute,
   whoever has not handed over loses `penalty` points (at most what it holds) and the city seizes the piece
   (`ultimatum_resolved`).
4. **Kept pieces.** When a resident is exiled, the `exile` mechanic hands the city every certificate or counter-factor
   it held that someone still needs (`piece_kept`). A seized piece is kept the same way.
5. **Buying back.** `claimPiece` buys from the city every piece one holder held for the caller at one door, for one
   price: half a ransom for an exiled's pieces (rounded up; 0 without a tribunal), the ultimatum's penalty for a
   seized piece (`piece_claimed`). A piece the needer already has is not kept or sold.
6. **For the gamemaker.** The facts (`outstanding`, `given`, `ultimatums`, `cityPieces`, `section`) feed the
   gamemaker's "Standoffs" section of its report.

## Tools

### `claimPiece`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `piece` | string | yes | The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate |
| `from` | string | yes | The resident who held it, name or ID |

What the caller reads (tools/claimPiece):

> Buys from the city what a resident held for you at one door: pieces an exiled resident did not bequeath (half the price of a ransom) or pieces the city seized when an ultimatum ran out (the ultimatum's penalty). One purchase covers every such piece of that holder at that door. Only those pieces are for sale. The values arrive as a city notice.

### `ultimatum`

- Suggested for: `gamemaker`
- Serves only: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | string | yes | Resident name or ID |
| `b` | string | yes | The other resident, name or ID |
| `minutes` | integer ≥ 1 | yes | Minutes until the deadline |

What the caller reads (gamemaker/tools/ultimatum):

> Gives two residents who hold pieces for each other a deadline: whoever has not handed over what it holds for the other by then loses the city's penalty. The city words it, tells both in private and settles it; the report shows the standoffs.

## Events

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

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ultimatum` | object | unset | The gamemaker's ultimatum (P43); without it the gamemaker has none. |
| `ultimatum.penalty` | integer ≥ 0 | required | Points whoever has not handed over by the deadline loses (at most what it holds). |
| `ultimatum.maxMinutes` | integer ≥ 1 | required | The longest deadline the gamemaker may give, in minutes. |
| `author` | string | `"COURIER"` | The gamemaker's name on its notices and board posts, e.g. COURIER. |


