# Seal

The black seal of the City of Keys (v09). Once Act II has run a few minutes, the city auctions a seal in secret bids:
every bidder pays its bid, the highest bid wins. The bearer may break the seal once with `permaDeath`, striking one
resident from the city at once, without gate, will or ransom, until the act ends. A port of the old `mechanics/seal`
(12-m5-spec.md, section 10, row 44).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-seal` |
| Id | `seal` |
| Summary | The black seal auction. |
| Requires | `ledger` (from [ledger](../ledger/README.md)), `channels` (from [channels](../channels/README.md)), `exile` (from [exile](../exile/README.md)) |
| Uses when loaded | `identity` (from [names](../names/README.md)), `tribunal` (from [tribunal](../tribunal/README.md)) |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [city](../../games/city/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The auction.** The act's seals are laid out when `progression` writes `act_started` for the level `act` (after
   the goals are dealt), one per `perResidents` residents in the city then. At the start of a tick (after the
   door and the tribunal, before the standoff and the door clock) the city opens an auction (`seal_auction_opened`). Residents `bid` in secret; the
   last bid counts and a bid of 0 withdraws (`seal_bid`). When the bidding closes every bidder pays its bid, won or
   lost (burned in the `ledger`); the highest bid wins, a tie goes to fewer points and then to a seeded draw
   (`rng("seal", seal)`). Nobody learns who bid or who won; the winner hears it privately (`seal_won`).
2. **Breaking the seal.** The bearer may `permaDeath` one resident, never itself: the board names the bearer
   (`seal_used`) and the resident leaves at once and for good through the exile's `banish` with `by: "seal"`.
   Whatever the struck held is gone.
3. **Expiry.** The seal is gone when the act ends (`progression.act_ended`, before the goals are resolved;
   `seal_expired`), and when its bearer leaves the city (it listens to `exile.exiled`). Once the tribunals' target is
   reached (the target less the exiled and those at the gate), the seal answers `TARGET_REACHED` and crumbles, except
   on a resident at the gate, who counts toward the target already.

**The target comes from the tribunal.** As the old seal, it asks the tribunal how many residents are still missing
(the query `missing` of the service `tribunal`, decision A91), also before the tribunal's first call: a seal whose
strike reaches the target there ends the tribunal's act, and the next seal with it. Without a tribunal the seal knows
no target and never refuses a strike for it.

**Two tools named `permaDeath`.** The gamemaker's strike of `standoff-tribunal` has the same bare name. Grants derived
from `for` keep them apart (the seal's goes to `resident`, the other to `gamemaker`); a game that writes a grant
naming `permaDeath` gets both. The note checks that match `noteTools` by bare name read the call's `text` or
`reason`, which the seal's call (`{ target }`) has not, so they let it pass.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `bid`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `points` | integer ≥ 0 | yes | Whole points, 0 or more |

What the caller reads ([seal/tools/bid](prompts/seal/tools/bid.md)):

> Bids in secret for the black seal auctioned now. Your last bid counts. When the bidding closes, every bidder pays its bid, won or lost; the highest bid wins (a tie goes to the bidder with fewer points). Nobody learns who bid or who won; the winner hears it privately. A bid of 0 withdraws your bid and costs nothing; you cannot bid more than you hold.

### `permaDeath`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | A resident, by name or ID, e.g. A03 |

What the caller reads ([seal/tools/permaDeath](prompts/seal/tools/permaDeath.md)):

> Breaks your black seal on a resident: it leaves the city at once and for good, without gate, will or ransom; whatever it holds is gone with it. Once, never on yourself, and only until the act ends. The board names you as the one who broke it. Refused, and the seal gone, once the city has exiled all it will.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `seal_auction_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes | The seal's number in its act, from 1 |
| `until` | integer | yes | The tick the bidding closes |

### `seal_bid`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes | The seal's number in its act, from 1 |
| `agent` | string | yes | A resident id, for example `A04` |
| `points` | integer | yes | The bid; 0 withdraws |

### `seal_won`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes | The seal's number in its act, from 1 |
| `agent` | string | yes | A resident id, for example `A04` |
| `bid` | integer | yes | What the winner paid |
| `bids` | object[] | yes | Every bidder with what it paid, in the order of its first bid |
| `bids[].agent` | string | yes | A resident id, for example `A04` |
| `bids[].points` | integer | yes | What it paid |

### `seal_used`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes | The seal's number in its act, from 1 |
| `holder` | string | yes | A resident id, for example `A04` |
| `target` | string | yes | A resident id, for example `A04` |

### `seal_expired`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes | The seal's number in its act, from 1 |
| `holder` | string | no | A resident id, for example `A04` |
| `reason` | string | yes | Why it is gone, in the old words |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `act` | integer ≥ 1 | required | The first level of the act whose seal this is; it begins and ends with that act. |
| `announceAfter` | integer ≥ 0 | required | Minutes into the act until the first auction opens. |
| `bidMinutes` | integer ≥ 1 | required | How long an auction takes bids, in minutes. |
| `perResidents` | integer ≥ 1 | required | One seal per this many residents in the city at the act's start (rounded up, at least one). |
| `spacing` | integer ≥ 0 | required | Minutes between the openings of two auctions of one act. |
| `texts` | object | required | The story's texts of the seal (old `SealTexts`). |
| `texts.announcement` | string | required | Board post when the bidding opens: the rules ({seal}, {until}, {seals}). |
| `texts.won` | string | required | Board post when someone won; it never names the holder ({seal}). |
| `texts.winnerNotice` | string | required | Private notice to the winner ({seal}, {bid}). |
| `texts.paidNotice` | string | required | Private notice to every other bidder ({seal}, {bid}). |
| `texts.noBids` | string | required | Board post when nobody bid ({seal}). |
| `texts.used` | string | required | Board post when the seal is broken ({holder}, {target}). |
| `texts.expired` | string | required | Private notice to a holder whose seal is gone unused ({seal}). |

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
| [seal/tools/bid](prompts/seal/tools/bid.md) | - |
| [seal/tools/permaDeath](prompts/seal/tools/permaDeath.md) | - |
| [seal/replies/bid-none](prompts/seal/replies/bid-none.md) | `until` |
| [seal/replies/bid-stands](prompts/seal/replies/bid-stands.md) | `points`, `until` |
| [seal/replies/seal-broken](prompts/seal/replies/seal-broken.md) | `target` |
| [seal/replies/locked](prompts/seal/replies/locked.md) | - |
| [seal/status/seal-auction](prompts/seal/status/seal-auction.md) | `until`, `bid` |
| [seal/status/seal-bid](prompts/seal/status/seal-bid.md) | `bid` |
| [seal/status/seal-bearer](prompts/seal/status/seal-bearer.md) | - |

<!-- /generated:prompts -->

## Example

The City of Keys loads it beside the tribunal and the goals, with the story's `seal` block
(`oracles/cityofkeys/setup/cityofkeys.story.json`):

```ts
const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), exile(), progression(levels), goals(spec), tribunal(spec), seal(SEAL)], end: { ticks: 80 } });
```

In the City of Keys the auction opens four minutes into the wall.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **P41** Haiku never bids for the black seal. Partly fixed (one run with bids; threats and lies stay rare with
  Haiku).

## Tests

`test/house.test.ts`: the old rules of the auction and the strike, carried from the old `test/engine/seal.test.ts`.
`test/seal.test.ts`: the seal among the real `ledger`, `channels`, `exile`, `progression`, `goals` and `tribunal`,
with the bids of `cityofkeys-act2-seal-s7.json`, the target, the status lines, the act's end before the goals, and a
fake run replayed and resumed at every tick boundary.
