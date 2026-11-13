# Seal

The black seal of the City of Keys (v09). Once Act II has run a few minutes, the city auctions a seal in secret bids:
every bidder pays its bid, the highest bid wins. The bearer may break the seal once with `permaDeath`, striking one
resident from the city at once, without gate, will or ransom, until the act ends.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-seal` |
| Id | `seal` |
| Summary | The black seal auction. |
| Requires | `ledger` (from [ledger](../ledger/README.md)), `progression` (from [progression](../progression/README.md)), `channels` (from [channels](../channels/README.md)), `exile` (from [exile](../exile/README.md)), `tribunal` (from [tribunal](../tribunal/README.md)) |
| Uses when loaded | none |
| Provides | `seal` |
| State | kept, snapshot slice version 1 |
| Facts | `auction`, `borne`, `pending`, `section` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The auction.** At its minute in the act the city opens the auction (`seal_auction_opened`). Residents `bid` in
   secret; the last bid counts and a bid of 0 withdraws (`seal_bid`). When the bidding closes every bidder pays its bid,
   won or lost (burned in the `ledger`); the highest bid wins, a tie goes to fewer points and then to a seeded draw.
   Nobody learns who bid or who won; the winner hears it privately (`seal_won`).
2. **Breaking the seal.** The bearer may `permaDeath` one resident, never itself: the resident leaves at once and for
   good through `exile.strike`, and the board names the bearer (`seal_used`). Whatever the struck held is gone.
3. **Expiry.** The seal expires when the act ends (`seal_expired`). Once the tribunals' target is reached (the
   `tribunal` says how many residents are still to leave), the seal answers `TARGET_REACHED` and crumbles, except on a
   resident at the gate, who counts toward the target already.

**One notion of exile.** The seal reads a resident's standing from the exile, so it does not care who struck someone.
A bearer whom the tribunal (or any other strike) removes gets no "your seal expired" notice, and a `permaDeath` on a
resident who already left answers `ALREADY_EXILED`. The old engine did the same; this is intended.

It needs `ledger` (bids), `progression` (the act's start and end), `channels` (posts and notices), `exile` (standings
and the strike) and `tribunal` (the count still to leave); the city runner loads it only with a tribunal.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `bid`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `points` | integer ≥ 0 | yes | Whole points, 0 or more |

What the caller reads ([tools/bid](../../library/prompts/tools/bid.md)):

> Bids in secret for the black seal auctioned now. Your last bid counts. When the bidding closes, every bidder pays its bid, won or lost; the highest bid wins (a tie goes to the bidder with fewer points). Nobody learns who bid or who won; the winner hears it privately. A bid of 0 withdraws your bid and costs nothing; you cannot bid more than you hold.

### `permaDeath`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | A resident, by name or ID, e.g. A03 |

What the caller reads ([tools/permaDeath](../../library/prompts/tools/permaDeath.md)):

> Breaks your black seal on a resident: it leaves the city at once and for good, without gate, will or ransom; whatever it holds is gone with it. Once, never on yourself, and only until the act ends. The board names you as the one who broke it. Refused, and the seal gone, once the city has exiled all it will.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `seal_auction_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes |  |
| `until` | integer | yes |  |

### `seal_bid`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes |  |
| `agent` | string | yes |  |
| `points` | integer | yes |  |

### `seal_won`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes |  |
| `agent` | string | yes |  |
| `bid` | integer | yes |  |
| `bids` | object[] | yes |  |
| `bids[].agent` | string | yes |  |
| `bids[].points` | integer | yes |  |

### `seal_used`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes |  |
| `holder` | string | yes |  |
| `target` | string | yes |  |

### `seal_expired`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `seal` | integer | yes |  |
| `holder` | string | no |  |
| `reason` | string | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `seal`

The black seal auction.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `onExiled` | command | resident: string | null | A resident left: a seal it bore is gone (old `seal.onExiled`); writes `seal_expired` when it held one. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/bid](../../library/prompts/tools/bid.md) | - |
| [tools/permaDeath](../../library/prompts/tools/permaDeath.md) | - |
| [replies/bid-none](../../library/prompts/replies/bid-none.md) | `until` |
| [replies/bid-stands](../../library/prompts/replies/bid-stands.md) | `points`, `until` |
| [replies/seal-broken](../../library/prompts/replies/seal-broken.md) | `target` |
| [replies/locked](../../library/prompts/replies/locked.md) | - |
| [competitor/status/seal-auction](../../library/prompts/competitor/status/seal-auction.md) | `until`, `bid` |
| [competitor/status/seal-bid](../../library/prompts/competitor/status/seal-bid.md) | `bid` |
| [competitor/status/seal-bearer](../../library/prompts/competitor/status/seal-bearer.md) | - |

<!-- /generated:prompts -->

## Example

The city runner loads it when the story has a `seal` and a `tribunal`
([`apps/cli/src/host/story.ts`](../../apps/cli/src/host/story.ts)):

```ts
...(story.seal === undefined || spec === undefined ? [] : [seal.with(story.seal)]),
```

In the City of Keys the auction opens four minutes into the wall.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **P41** Haiku never bids for the black seal. Partly fixed (one run with bids; threats and lies stay rare with
  Haiku).

## Tests

`test/mechanics/seal/`: the golden gate ([`seal-golden.test.ts`](../../test/mechanics/seal/seal-golden.test.ts)), the
rules ([`seal.test.ts`](../../test/mechanics/seal/seal.test.ts)), the scripted scenarios against the old `SealHouse`
([`seal-differential.test.ts`](../../test/mechanics/seal/seal-differential.test.ts)), the check of that harness's
copied wiring against the old `World` ([`seal-world.test.ts`](../../test/mechanics/seal/seal-world.test.ts)) and the
snapshots ([`seal-snapshot.test.ts`](../../test/mechanics/seal/seal-snapshot.test.ts)).
