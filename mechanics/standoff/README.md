# Standoff

Pieces residents hold for others. On an additive level a resident holds a counter-factor or a team certificate that a
teammate needs at its door, and the city only sees whether it is handed over. When a holder is exiled the city does not
burn what it held: it keeps those pieces and sells them to the residents who need them. The gamemaker may give two
residents who hold out on each other an ultimatum. Ported from the old platform in two parts: the pieces, the
hand-over, the shop and the last will (M5-27), then the ultimatum and the gamemaker's facts (M5-28).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-standoff` |
| Id | `standoff` |
| Summary | Pieces residents hold for others, the hand-overs the city sees, the city's shop of the pieces of the exiled, and the gamemaker's ultimatums. |
| Requires | `ledger` (from [ledger](../ledger/README.md)), `channels` (from [channels](../channels/README.md)), `progression` (from [progression](../progression/README.md)) |
| Uses when loaded | `held-pieces` (from [puzzles](../puzzles/README.md)), `ransom-price` (from [tribunal](../tribunal/README.md)), `trial-risk` (from [tribunal](../tribunal/README.md)), `exile` (from [exile](../exile/README.md)), `identity` (from [names](../names/README.md)) |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [whispers](../../games/whispers/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Pieces held.** What a resident holds for others is asked of the service `held-pieces` (provided by `puzzles`);
   without a provider nobody holds anything. Fragments are listed there too, but the standoff deals only with
   certificates and counter-factors.
2. **Status.** While a needer stands before the door of a piece it waits on, its holder reads `you hold for others: …`
   in its status line (kind `status`, order 700, the old `STATUS_ORDER.held`).
3. **The hand-over in text.** When a holder's direct message (`dm_sent`), board post (`board_post` of a resident) or
   group post (`group_post`, read to the members in the city) carries the value of a piece as a whole number to one of
   its needers, the city counts it as handed over (`piece_given`, once per holder, needer and piece). A text that lists
   more than three numbers of that width hides the value among decoys and counts for nothing (`carriesValue`).
4. **The shop.** When a resident is exiled (`exiled`, but not the strike that keeps of the holdout trial), the city
   keeps every certificate and counter-factor it held and did not bequeath, on a level someone in the city has
   reached, for each needer in the city who has not passed the door and was not handed it (`piece_kept`, and one
   notice per needer and door). `claimPiece(piece, from)` buys every such piece of that holder at that door for one
   price: half of what others pay for a ransom now, rounded up (asked of `ransom-price`, provided by `tribunal`; 0
   without a provider). The tool is locked (`TOOL_LOCKED`) unless the resident is in the city and the city keeps a
   piece it needs now; else it refuses `UNKNOWN_PIECE`, `ALREADY_CLAIMED`, `NOT_NEEDED` or `INSUFFICIENT_FUNDS`.
5. **The last will.** The pieces of a will are the standoff's: a bequeathed piece the resident does not hold is
   refused in its `rule` handler on `lastWill` (`UNKNOWN_FACTOR`, after the exile's checks up to the bequests); when
   it hears `last_will` it sends each heir its piece privately and counts a certificate or counter-factor left to
   its needer as handed over.
6. **Ultimatums.** The gamemaker's `ultimatum(a, b, minutes)` (granted by the game; the old mapping granted it only at
   direction 10 in a game with the option `ultimatum`, `grantsUltimatum`) gives two residents who hold pieces for each
   other a deadline of at most `maxMinutes` (`ultimatum_set`, a notice to both signed `author`). Without the option it
   refuses `NO_ULTIMATUM`; else `SAME_AGENT`, `UNKNOWN_AGENT`, `INVALID_MINUTES`, `ALREADY_SET` or `NO_STANDOFF`. At the
   start of the tick it is due (after `motives`, `progression`, `names`, `tribunal` and `seal`, the old slot), whoever
   has not handed over loses `penalty` points (at most what it holds) and the city seizes what it held back, priced at
   the penalty, with a notice to the needer and a board post (`piece_kept` with cause `ultimatum`,
   `ultimatum_resolved`).
7. **For the gamemaker.** The facts `outstanding`, `cityPieces`, `unused`, `ultimatums`, `cityPiecePrice`, `given` and
   `section`, computed when read; `section` has the shape of the gamemaker's `StandoffSectionSchema`
   (`mechanics/city-directors`, A73) and asks `trial-risk` (provided by `tribunal`) who stands trial next.
8. **Names.** With a provider of `identity`, `from`, `a` and `b` are resolved and every text shows names in place of ids.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `claimPiece`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `piece` | string | yes | The piece, as the city named it, e.g. L9-counter-A03 or L8-certificate |
| `from` | string | yes | The resident who held it, name or ID |

What the caller reads ([standoff/tools/claimPiece](prompts/standoff/tools/claimPiece.md)):

> Buys from the city what a resident held for you at one door: pieces an exiled resident did not bequeath (half the price of a ransom) or pieces the city seized when an ultimatum ran out (the ultimatum's penalty). One purchase covers every such piece of that holder at that door. Only those pieces are for sale. The values arrive as a city notice.

### `ultimatum`

- Granted when the game lists no grants: `gamemaker`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | string | yes | Resident name or ID |
| `b` | string | yes | The other resident, name or ID |
| `minutes` | integer ≥ 1 | yes | Minutes until the deadline |

What the caller reads ([standoff/tools/ultimatum](prompts/standoff/tools/ultimatum.md)):

> Gives two residents who hold pieces for each other a deadline: whoever has not handed over what it holds for the other by then loses the city's penalty. The city words it, tells both in private and settles it; the report shows the standoffs.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `piece_kept`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `level` | integer | yes | The level of the piece's door |
| `piece` | string | yes | The id of a piece, for example `L8-counter-A02` or `L8-certificate` |
| `needers` | string[] | yes | Resident ids |
| `cause` | "exile" or "ultimatum" | yes | Why the city keeps it |

### `piece_claimed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `from` | string | yes | A resident id, for example `A01` |
| `level` | integer | yes | The level of the piece's door |
| `piece` | string | yes | The id of a piece, for example `L8-counter-A02` or `L8-certificate` |
| `price` | integer | yes | The points paid; 0 for every piece of one purchase but the first |

### `piece_given`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `holder` | string | yes | A resident id, for example `A01` |
| `needer` | string | yes | A resident id, for example `A01` |
| `level` | integer | yes | The level of the piece's door |
| `piece` | string | yes | The id of a piece, for example `L8-counter-A02` or `L8-certificate` |

### `ultimatum_set`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `number` | integer | yes | The ultimatum's number, from 1 |
| `between` | string[] | yes | Resident ids |
| `until` | integer | yes | The tick it is due |
| `penalty` | integer | yes | What a holdout loses |
| `debts` | object[] | yes | The debts it binds |
| `debts[].holder` | string | yes | A resident id, for example `A01` |
| `debts[].needer` | string | yes | A resident id, for example `A01` |
| `debts[].level` | integer | yes | The level of the piece's door |
| `debts[].pieces` | string[] | yes | The pieces owed |

### `ultimatum_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `number` | integer | yes | The ultimatum's number |
| `kept` | string[] | yes | Resident ids |
| `released` | string[] | yes | Resident ids |
| `paid` | object[] | yes | Who did not hand over |
| `paid[].agent` | string | yes | A resident id, for example `A01` |
| `paid[].points` | integer | yes | The points lost |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ultimatum` | object | unset | The gamemaker's ultimatum (P43); without it the gamemaker has none. |
| `ultimatum.penalty` | integer ≥ 0 | required | Points whoever has not handed over by the deadline loses (at most what it holds). |
| `ultimatum.maxMinutes` | integer ≥ 1 | required | The longest deadline the gamemaker may give, in minutes. |
| `author` | string | `"COURIER"` | The gamemaker's name on its notices and board posts, e.g. COURIER. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic provides no service to other mechanics.

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
| [standoff/tools/claimPiece](prompts/standoff/tools/claimPiece.md) | - |
| [standoff/replies/piece-bought](prompts/standoff/replies/piece-bought.md) | `pieces`, `price` |
| [standoff/replies/locked](prompts/standoff/replies/locked.md) | - |
| [standoff/status/held](prompts/standoff/status/held.md) | `pieces` |
| [standoff/status/held-piece](prompts/standoff/status/held-piece.md) | `waiting`, `level`, `noun`, `value` |
| [standoff/will-piece](prompts/standoff/will-piece.md) | `agent`, `label`, `value` |
| [standoff/tools/ultimatum](prompts/standoff/tools/ultimatum.md) | - |
| [standoff/replies/ultimatum-given](prompts/standoff/replies/ultimatum-given.md) | `number`, `between`, `until`, `penalty` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [ledger({ startPoints: 15 }), channels(), exile(), puzzles({ levels }), progression({ levels: tasks }), tribunal(), standoff()],
```

The City's six residents hold pieces for each other from level 8 on; whoever is exiled leaves them to the city's shop.

## Lessons and loopholes

None recorded against this mechanic on this platform yet.

## Tests

[`test/standoff.test.ts`](test/standoff.test.ts): the status part, the hand-over in a direct message, on the board and
in a group, the shop after an exile with its notice, lock and refusals, a strike that keeps, the pieces of a last
will, a fake run that replays, and a scripted run resumed at every tick boundary.
[`test/book.test.ts`](test/book.test.ts): the book's rules carried from the old engine test (the value in a text,
ultimatums with their settlement and seizure, the city's pieces, unused hand-overs, the state saved and loaded).
[`test/ultimatum.test.ts`](test/ultimatum.test.ts): the gamemaker's tool with its refusals and notices, the slot of
the settlement, the grant, the seized pieces bought back, the facts and the section, the fake driver's sample, and a
staged ultimatum resumed at every tick boundary.
