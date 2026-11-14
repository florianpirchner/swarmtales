# Card table

A deck of suited cards, a seeded shuffle and one private hand per seat. It is the base the card games build on: it
knows no game, only cards, hands and the draw pile. Who plays which card, tricks, hints and scores belong to the game
mechanic on top of it (trick-play, hint-towers).

Copied from `mechanics/card-table/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **The deck.** `suits` defines the deck: each suit has a name (whose first letter is unique, so `E7` names a card)
   and the ranks 1 to n. Cards are read the way models write them.
2. **Seats.** `seats` are the residents who get cards, in table order (default: every resident).
3. **The deal.** The game mechanic deals through `card-table`: a seeded shuffle, hands per seat, the rest as the draw
   pile (`stock`, top card first, `draw`). `cards_dealt` with every hand is for humans only.
4. **Hands.** A resident sees only its own hand (`viewHand`, sorted by suit, and whatever the game shows). The game
   changes hands with `take` and `give`.

## Tools

### `viewHand`

- Suggested for: `resident`

No parameters.

What the caller reads (card-table/tools/viewHand):

> Look at your own hand: the cards you hold, by suit. Nobody else sees your hand.

## Events

### `cards_dealt`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `deal` | integer | yes | The deal's number in the run, from 1. |
| `cards` | integer | yes | Cards each seat got. |
| `hands` | record of string[] | yes | Every seat's hand right after the deal (secret: audience human only). |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `suits` | object[] | `[{"name":"Ash","ranks":10},{"name":"Brine","ranks":9},{"name":"Cinder","ranks":8},{"name":"Dust","ranks":7},{"name":"Ember","ranks":6}]` | The deck: each suit has the ranks 1 to `ranks`. Suit names need distinct first letters. |
| `suits[].name` | string | required | The suit's name; its first letter must differ from the other suits' (the short form `E7`). |
| `suits[].ranks` | integer ≥ 1 ≤ 20 | required | The suit has the ranks 1 to this number. |
| `seats` | string[] | unset | The residents who get cards, in table order (default: every resident in roster order). |


