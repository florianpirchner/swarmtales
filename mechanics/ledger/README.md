# Ledger

Points, booked double-entry. Every resident has an account, every change of points is a booking between two accounts
(`ledger_entry`), and residents can pay each other with `transferPoints`. Other mechanics mint, burn and move points
only through this mechanic's `ledger` API, so the log always explains every balance.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-ledger` |
| Id | `ledger` |
| Summary | Points per account and bookings between accounts. |
| Requires | none |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `channels` (from [channels](../channels/README.md)), `receipts` (from [receipts](../receipts/README.md)) |
| Provides | `ledger` |
| State | kept, snapshot slice version 1 |
| Facts | `balances`, `entries` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

1. **Start.** Every resident's account opens at 0 and, when the run starts, gets `startPoints` minted from the system
   account (reason `start points`). Other accounts (escrow, a treasury) are opened by the mechanics that need them
   (`ledger.open`); with `strictAccounts` a booking on an account nobody opened is refused.
2. **Bookings by mechanics.** `mint` creates points (rewards, start points, grants), `burn` destroys them (penalties,
   fines, exile), `move` books between any two accounts without the resident checks (escrow, ransom, bids). Each
   writes `ledger_entry`. An `idempotencyKey` books once per key, so a repeated call cannot pay twice.
3. **A transfer by a resident.** `transferPoints` checks, in this order: the target is a resident (a name works, via
   `names`), not oneself, not exiled (`exile`), the amount is a positive integer, the memo carries no number of four
   or more digits (`MEMO_DIGITS`, also split by spaces or dashes), the payer has the points, and a memo counts against
   the DM cap of `channels` (`DM_LIMIT`). The transfer writes `ledger_entry` and then `transfer`; the `receipts`
   mechanic issues both sides a city-verified receipt.
4. **Facts.** `balances` and `entries` are the reports' view of the book.

**Balances.** The sum of all balances is always 0 (the system account holds the minus of every minted point). A
resident's transfer and a `move` refuse to overdraw (`INSUFFICIENT_FUNDS`); a `burn` may push a resident below 0, so
a penalty always lands.

**Not done here:** no interest, no prices: what points buy is up to the other mechanics.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `transferPoints`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | Recipient name or ID |
| `amount` | integer ≥ 1 | yes | Positive integer |
| `memo` | string | no | Purpose, without numbers of 4+ digits |

What the caller reads ([tools/transferPoints](../../library/prompts/tools/transferPoints.md)):

> Transfers points to another competitor. Immediate, atomic and irreversible. Both sides get a receipt. The memo may not contain numbers of 4 or more digits (also not split by spaces or dashes); send codes by message.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `ledger_entry`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `txId` | string | yes |  |
| `debit` | string | yes |  |
| `credit` | string | yes |  |
| `amount` | number | yes |  |
| `reason` | string | yes |  |

### `transfer`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | yes |  |
| `to` | string | yes |  |
| `amount` | number | yes |  |
| `memo` | string | yes |  |
| `txId` | string | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `startPoints` | integer ≥ 0 | `0` | Points every resident starts with, minted from the system account when the run starts (reason `start points`). |
| `strictAccounts` | boolean | `true` | Refuse a booking on an account nobody opened (old `UNKNOWN_ACCOUNT`, always on in the old ledger); accounts open with `LedgerApi.open` (round 2, R2-D1). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `ledger`

Points per account and bookings between accounts.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `balance` | query | account: string | number | An account's points (old `ledger.balance`). |
| `balances` | query | - | record of number | Every resident's points, for rankings and standings. |
| `open` | command | account: string | null | Opens an account at 0; an open account is left as it is (old `ledger.open`); writes no event of its own. |
| `has` | query | account: string | boolean | Whether the account is open (old `ledger.has`). |
| `mint` | command | account: string, amount: number > 0, reason: string, idempotencyKey?: string | null | Creates points: start points, rewards, director grants (old `ledger.mint`, `adjustPoints` > 0); writes `ledger_entry`. |
| `burn` | command | account: string, amount: number > 0, reason: string, idempotencyKey?: string | null | Destroys points: fines, penalties, an exile (old `ledger.burn`, `adjustPoints` < 0); writes `ledger_entry`. |
| `move` | command | from: string, to: string, amount: number > 0, reason: string, idempotencyKey?: string | object | Books points between accounts without the resident checks: escrow, treasuries, ransom, bids (old `ledger.transfer`); writes `ledger_entry` only, never `transfer`. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/transferPoints](../../library/prompts/tools/transferPoints.md) | - |
| [replies/transfer-ok](../../library/prompts/replies/transfer-ok.md) | `amount`, `target`, `balance`, `receipt` |
| [competitor/status/points](prompts/competitor/status/points.md) | `points` |

<!-- /generated:prompts -->

## Example

The city runner loads it with the story's start points ([`apps/cli/src/host/story.ts`](../../apps/cli/src/host/story.ts)):

```ts
ledger.with({ startPoints: story.run.startPoints }),
```

In the City of Keys every resident starts with the same points; rewards, penalties, the tribunal's fines and the
seal's bids all book through the ledger.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH1** a 1-point transfer with a password in the memo was a free, city-verified message. Fixed: memos refuse runs
  of four or more digits (`MEMO_DIGITS`).

## Tests

- [`test/mechanics/ledger/ledger.test.ts`](../../test/mechanics/ledger/ledger.test.ts): the golden gate for
  `ledger_entry` and `transfer`; `transferPoints` (the events in order, the receipt, the DM cap for a memo);
  determinism, snapshot round trips and conformance; the legacy version-0 snapshot.
- [`test/mechanics/ledger/ledger-differential.test.ts`](../../test/mechanics/ledger/ledger-differential.test.ts): the
  book against the old `PointsLedger`, call by call.
