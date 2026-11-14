# Card table

A deck of suited cards, a seeded shuffle and one private hand per seat. It is the base the card games build on: it
knows no game, only cards, hands and the draw pile. Who plays which card, tricks, hints and scores belong to the game
mechanic on top of it ([trick-play](../trick-play/README.md), [hint-towers](../hint-towers/README.md)).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-card-table` |
| Id | `card-table` |
| Summary | A deck of suited cards, a seeded deal and a private hand per seat. |
| Requires | none |
| Uses when loaded | none |
| Provides | `card-table` |
| State | kept, snapshot slice version 1 |
| Games | [ember-tricks](../../games/ember-tricks/README.md), [harbor-lights](../../games/harbor-lights/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The deck.** `suits` defines the deck: each suit has a name (whose first letter is unique, so `E7` names a card)
   and the ranks 1 to n. A card is its id `<Suit> <rank>` (`Ember 7`). Cards are read the way models write them
   (`parseCard`: `ember7`, `E7`, `7 of Ember`). A deck with clashing suit names stops the game at its start.
2. **Seats.** `seats` are the residents who get cards, in table order (default: every resident). A seat that is no
   resident, or a resident named twice, stops the game at its start.
3. **The deal.** The game mechanic deals through the service `card-table`: `deal` collects every card, shuffles the
   whole deck with the stream `("card-table", "deal", n)` of the run's seed (n is the deal's number, from 1), gives
   each seat `cards` cards one at a time in seat order and leaves the rest as the draw pile (`stock`, top card first,
   `draw`). `cards_dealt` with every hand is for humans only. A deal that needs more cards than the deck holds, and
   `draw` or `give` for a resident without a seat, throw: they are mistakes of the calling mechanic.
4. **Hands.** A resident sees only its own hand (`viewHand`, sorted by suit, and whatever the game shows); a resident
   without a seat is refused with `NO_SEAT`. The game changes hands with `take` and `give`. The fact
   `card-table.handSizes` gives the number of cards per seat.
5. **For other mechanics.** `@swarmtales/mechanic-card-table/contract` holds the service, the event and the card
   rules as pure functions (`deckOf`, `parseCard`, `suitOf`, `rankOf`, `sortHand`, `renderHand`, `SuitSpec`).

It does not know whose turn it is, has no hook and never wakes a resident.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewHand`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([card-table/tools/viewHand](prompts/card-table/tools/viewHand.md)):

> Look at your own hand: the cards you hold, by suit. Nobody else sees your hand.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `cards_dealt`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `deal` | integer | yes | The deal's number in the run, from 1. |
| `cards` | integer | yes | Cards each seat got. |
| `hands` | record of string[] | yes | Every seat's hand right after the deal (secret: audience human only). |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `suits` | object[] | `[{"name":"Ash","ranks":10},{"name":"Brine","ranks":9},{"name":"Cinder","ranks":8},{"name":"Dust","ranks":7},{"name":"Ember","ranks":6}]` | The deck: each suit has the ranks 1 to `ranks`. Suit names need distinct first letters. |
| `suits[].name` | string | required | The suit's name; its first letter must differ from the other suits' (the short form `E7`). |
| `suits[].ranks` | integer ≥ 1 ≤ 20 | required | The suit has the ranks 1 to this number. |
| `seats` | string[] | unset | The residents who get cards, in table order (default: every resident in roster order). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `card-table`

The deck, the seats and their private hands: a seeded deal, and taking a card from or giving one back to a hand.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `seats` | query | - | string[] | The seats in table order (the residents who get cards). |
| `suits` | query | - | { name: string, ranks: integer ≥ 1 ≤ 20 }[] | The deck's suits in order, with their rank counts. |
| `hand` | query | resident: string | string[] | A seat's hand, sorted by suit and rank; empty for a resident without a seat. |
| `holds` | query | resident: string, card: string | boolean | Whether the seat holds the card. |
| `deal` | command | cards: integer ≥ 0 | integer | Collects every card, shuffles the whole deck with the run's seeded stream (label: the deal's number) and deals `cards` to each seat, one at a time in seat order. Returns the deal's number, from 1; writes `cards_dealt` (audience human). |
| `stock` | query | - | string[] | The draw pile: the cards not in any hand, top card first (never shown to a resident; a reference listener may read it). |
| `draw` | command | resident: string | string or null | Moves the top card of the draw pile into the seat's hand and returns it; null (nothing changes) when the pile is empty. |
| `take` | command | resident: string, card: string | boolean | Removes the card from the seat's hand; false (nothing changes) when the seat does not hold it. |
| `give` | command | resident: string, card: string | null | Puts a card (back) into the seat's hand. |

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
| [card-table/tools/viewHand](prompts/card-table/tools/viewHand.md) | - |

<!-- /generated:prompts -->

## Example

No game of this repository loads it yet: Harbor Lights and Ember Tricks come with their own issues. They will load
it as the old platform did:

```ts
cardTable({ suits: SUITS, seats: SEATS }),
```

The default deck has five suits of 6 to 10 ranks (Ash, Brine, Cinder, Dust, Ember).

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The row was recorded on the old platform; its status says what was true there.

- **P130** the deck model (suits with ranks 1 to n) does not fit the French deck, so hold'em carries its own deck.
  Open.

## Tests

[`test/card-table.test.ts`](test/card-table.test.ts): ranks per suit, reading card names, showing a hand, clashing
suit names and bad seats refused, seeded and private deals, `seats`, `take` and `give`, the draw pile, the snapshot,
documented options, the fake driver's call of `viewHand`. [`test/carried.test.ts`](test/carried.test.ts) holds the
prompt file, the tool, the options, the event, the audience and the service to those of the old platform.
