# Standoff

Pieces residents hold for others. On an additive level a resident holds a counter-factor or a team certificate that a
teammate needs at its door, and the city only sees whether it is handed over. When a holder is exiled the city does not
burn what it held: it keeps those pieces and sells them to the residents who need them. Ported from the old platform
in two parts: this first part (M5-27) holds the pieces, the hand-over, the shop and the last will; the ultimatum of the
gamemaker comes with the second (M5-28).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-standoff` |
| Id | `standoff` |
| Summary | Pieces residents hold for others, the hand-overs the city sees, and the city's shop of the pieces of the exiled. |
| Requires | `ledger` (from [ledger](../ledger/README.md)), `channels` (from [channels](../channels/README.md)), `progression` (from [progression](../progression/README.md)) |
| Uses when loaded | `held-pieces`, `ransom-price`, `exile` (from [exile](../exile/README.md)), `identity` |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

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
6. **Names.** With a provider of `identity`, `from` is resolved and every text shows names in place of ids.

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic takes no options.

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
