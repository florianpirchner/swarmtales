# Standoff

Who holds what for whom. On the wall residents hold pieces of each other's codes (a counter-factor, a certificate), so
every door needs a hand-over. This mechanic tracks those pieces, notices when a holder writes the value to the one who
needs it, lets the gamemaker set an ultimatum on a pair that holds out on each other, and keeps the pieces of exiled
residents, which the city sells to whoever still needs them (`claimPiece`).

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

The city runner ([`apps/cli/src/host/story.ts`](../../apps/cli/src/host/story.ts)):

```ts
standoff.with({ ...(ultimatum === undefined ? {} : { ultimatum: { ...ultimatum } }), ...(story.gamemaker === undefined ? {} : { author: story.gamemaker.author }) }),
```

The City of Keys sets `ultimatum: { penalty: 10, maxMinutes: 5 }` in its rules.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH8** decoys dodge an ultimatum. Fixed in code, untested live.
- **P48** a city piece cost more than its door pays. Fixed (half a ransom).
- **P49** a value written as a condition was not seen as a hand-over by the needer. Partly fixed.
- **P50** a holder paid ultimatum after ultimatum instead of handing over. Fixed (the city seizes the piece and sells
  it to the one who waited).
- **P51** the city sold a piece the needer already had. Fixed in code, untested live.

## Tests

- [`test/mechanics/standoff/standoff.test.ts`](../../test/mechanics/standoff/standoff.test.ts): hand-overs, wills,
  ultimatums and their settlement, the grant at direction 10, seized and kept pieces and their price (P48, P50, P51),
  the status line, the gamemaker's facts, snapshots and documented options.
- [`standoff-golden.test.ts`](../../test/mechanics/standoff/standoff-golden.test.ts),
  [`standoff-snapshot.test.ts`](../../test/mechanics/standoff/standoff-snapshot.test.ts): the golden lines and replies,
  and the 6- and 12-agent Act I checkpoints.
