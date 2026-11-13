# Card table

A deck of suited cards, a seeded shuffle and one private hand per seat. It is the base the card games build on: it
knows no game, only cards, hands and the draw pile. Who plays which card, tricks, hints and scores belong to the game
mechanic on top of it ([trick-play](../trick-play/README.md), [hint-towers](../hint-towers/README.md)).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-card-table` |
| Id | `card-table` |
| Summary | A deck of suited cards, a seeded deal and a private hand per seat. |
| Requires | none |
| Uses when loaded | none |
| Provides | `card-table` |
| State | kept, snapshot slice version 1 |
| Facts | `handSizes` |
| Jobs | none |
| Stories | [ember-tricks](../../stories/ember-tricks/README.md) (all 2 variants), [harbor-lights](../../stories/harbor-lights/README.md) (all 4 variants) |

<!-- /generated:glance -->

## How it plays

1. **The deck.** `suits` defines the deck: each suit has a name (whose first letter is unique, so `E7` names a card)
   and the ranks 1 to n. Cards are read the way models write them.
2. **Seats.** `seats` are the residents who get cards, in table order (default: every resident).
3. **The deal.** The game mechanic deals through `card-table`: a seeded shuffle, hands per seat, the rest as the draw
   pile (`stock`, top card first, `draw`). `cards_dealt` with every hand is for humans only.
4. **Hands.** A resident sees only its own hand (`viewHand`, sorted by suit, and whatever the game shows). The game
   changes hands with `take` and `give`.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewHand`

- Suggested for: `resident`

No parameters.

What the caller reads ([card-table/tools/viewHand](prompts/card-table/tools/viewHand.md)):

> Look at your own hand: the cards you hold, by suit. Nobody else sees your hand.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `suits` | object[] | `[{"name":"Ash","ranks":10},{"name":"Brine","ranks":9},{"name":"Cinder","ranks":8},{"name":"Dust","ranks":7},{"name":"Ember","ranks":6}]` | The deck: each suit has the ranks 1 to `ranks`. Suit names need distinct first letters. |
| `suits[].name` | string | required | The suit's name; its first letter must differ from the other suits' (the short form `E7`). |
| `suits[].ranks` | integer ≥ 1 ≤ 20 | required | The suit has the ranks 1 to this number. |
| `seats` | string[] | unset | The residents who get cards, in table order (default: every resident in roster order). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `card-table`

The deck, the seats and their private hands: a seeded deal, and taking a card from or giving one back to a hand.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `seats` | query | - | string[] | The seats in table order (the residents who get cards). |
| `suits` | query | - | object[] | The deck's suits in order, with their rank counts. |
| `hand` | query | resident: string | string[] | A seat's hand, sorted by suit and rank; empty for a resident without a seat. |
| `holds` | query | resident: string, card: string | boolean | Whether the seat holds the card. |
| `deal` | command | cards: integer ≥ 0 | integer | Collects every card, shuffles the whole deck with the run's seeded stream (label: the deal's number) and deals `cards` to each seat, one at a time in seat order. Returns the deal's number, from 1; writes `cards_dealt` (audience human). |
| `stock` | query | - | string[] | The draw pile: the cards not in any hand, top card first (never shown to a resident; a reference listener may read it). |
| `draw` | command | resident: string | string or null | Moves the top card of the draw pile into the seat's hand and returns it; null (nothing changes) when the pile is empty. |
| `take` | command | resident: string, card: string | boolean | Removes the card from the seat's hand; false (nothing changes) when the seat does not hold it. |
| `give` | command | resident: string, card: string | null | Puts a card (back) into the seat's hand. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [card-table/tools/viewHand](prompts/card-table/tools/viewHand.md) | - |

<!-- /generated:prompts -->

## Example

From [`stories/ember-tricks/story.ts`](../../stories/ember-tricks/story.ts):

```ts
cardTable.with({ suits: SUITS, seats: SEATS }),
```

The default deck has five suits of 6 to 10 ranks (Ash, Brine, Cinder, Dust, Ember).

## Lessons and loopholes

None about the table itself; the card games' rows are in their mechanics' READMEs.

## Tests

[`test/mechanics/card-table/`](../../test/mechanics/card-table/): ranks per suit, reading card names, showing a hand,
clashing suit names refused, seeded and private deals, `take` and `give`, the draw pile, documented options.
