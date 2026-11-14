# Ledger

Points, booked double-entry. Every resident has an account, every change of points is a booking between two accounts
(`ledger_entry`), and residents can pay each other with `transferPoints`. Other mechanics mint, burn and move points
only through this mechanic's `ledger` API, so the log always explains every balance.

Copied from `mechanics/ledger/README.md` by `scripts/export-oracles.ts`; do not edit.

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

### `transferPoints`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | Recipient name or ID |
| `amount` | integer ≥ 1 | yes | Positive integer |
| `memo` | string | no | Purpose, without numbers of 4+ digits |

What the caller reads (tools/transferPoints):

> Transfers points to another competitor. Immediate, atomic and irreversible. Both sides get a receipt. The memo may not contain numbers of 4 or more digits (also not split by spaces or dashes); send codes by message.

## Events

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

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `startPoints` | integer ≥ 0 | `0` | Points every resident starts with, minted from the system account when the run starts (reason `start points`). |
| `strictAccounts` | boolean | `true` | Refuse a booking on an account nobody opened (old `UNKNOWN_ACCOUNT`, always on in the old ledger); accounts open with `LedgerApi.open` (round 2, R2-D1). |


