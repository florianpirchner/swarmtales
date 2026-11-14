# Ledger

Points, booked double-entry. Every resident has an account, every change of points is a booking between two accounts
(`ledger_entry`), and residents pay each other with `transferPoints`. Other mechanics mint, burn and move points only
through the service `ledger`, so the log explains every balance.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-ledger` |
| Id | `ledger` |
| Summary | Points per account and bookings between accounts. |
| Requires | `roster` |
| Uses when loaded | none |
| Provides | `ledger` |
| State | kept, snapshot slice version 1 |
| Games | [city-slice](../../games/city-slice/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Start.** Every resident's account opens at 0 and, when the run starts, gets `startPoints` minted from the system
   account `SYSTEM_MINT_BURN` (reason `start points`). Other accounts (escrow, a treasury) are opened by the mechanics
   that need them (`open`); with `strictAccounts` a booking on an account nobody opened is a bug of the caller.
2. **Bookings by mechanics.** `mint` creates points (rewards, start points, grants), `burn` destroys them (penalties,
   fines, an exile), `move` books between any two accounts without the resident checks. Each writes `ledger_entry`. An
   `idempotencyKey` books once per key, so a repeated call cannot pay twice.
3. **A transfer by a resident.** `transferPoints` checks, in this order: the target is a resident (`UNKNOWN_AGENT`),
   not oneself (`SELF_TRANSFER`), may act (`EXILED`; the ledger asks `present` of the service `roster`, and at this
   stage only the exile suspends a resident), the amount is a positive integer (`INVALID_AMOUNT`), the memo carries no
   number of four or more digits (`MEMO_DIGITS`, also split by spaces or dashes), and the payer has the points
   (`INSUFFICIENT_FUNDS`). The transfer writes `ledger_entry` and then `transfer`; a transfer without a memo is booked
   with the reason `transfer`.
4. **Status.** Every resident reads its points in the status line of its turn input (`ledger/status/points`).
5. **An exile.** The ledger listens to the event `exiled` of the mechanic `exile`: the whole balance of the banished
   resident is burned into `SYSTEM_MINT_BURN` with the reason `exiled <id>` (one `ledger_entry`). A balance of 0 or
   less writes nothing. Without `exile` in the game the listener never runs. A mechanic that must clear away after
   the ledger declares its own listener with `after: ["ledger"]`.
6. **Facts and the limit.** The facts `ledger.balances` and `ledger.entries` are the reports' view of the book. The
   run limit `ledger.zero-sum` ends the run if the balances of all accounts ever stop adding up to 0.

**Balances.** The sum of all balances is always 0: the system account holds the minus of every minted point. A
resident's transfer and a `move` refuse to overdraw; a `burn` may push an account below 0, so a penalty always lands.

**Not done here.** No interest and no prices: what points buy is up to other mechanics. Not ported yet: the receipt of
a transfer (the reply says `receipt none`, although the tool text still promises one), the refusal `DM_LIMIT` for a
memo over the cap on direct messages.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `transferPoints`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | Recipient name or ID |
| `amount` | integer ≥ 1 | yes | Positive integer |
| `memo` | string | no | Purpose, without numbers of 4+ digits |

What the caller reads ([ledger/tools/transferPoints](prompts/ledger/tools/transferPoints.md)):

> Transfers points to another resident. Immediate, atomic and irreversible. Both sides get a receipt. The memo may not contain numbers of 4 or more digits (also not split by spaces or dashes); send codes by message.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `ledger_entry`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `txId` | string | yes | The id of the booking: `TX1`, `TX2`, in the order booked. |
| `debit` | string | yes | A resident id or another account (escrow, a treasury, `SYSTEM_MINT_BURN`). |
| `credit` | string | yes | A resident id or another account (escrow, a treasury, `SYSTEM_MINT_BURN`). |
| `amount` | number | yes | The points booked. |
| `reason` | string | yes | Why the booking is made. |

### `transfer`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | yes | A resident id. |
| `to` | string | yes | A resident id. |
| `amount` | number | yes | The points transferred. |
| `memo` | string | yes | The memo; empty when none was given. |
| `txId` | string | yes | The id of the booking: `TX1`, `TX2`, in the order booked. |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `startPoints` | integer ≥ 0 | `0` | Points every resident starts with, minted from the system account when the run starts (reason `start points`). |
| `strictAccounts` | boolean | `true` | Refuse a booking on an account nobody opened (`UNKNOWN_ACCOUNT`); accounts open with the service method `open`. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `ledger`

Points per account and bookings between accounts.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `balance` | query | account: string | number | An account's points; 0 for an account nobody opened. |
| `balances` | query | - | record of number | Every resident's points, for rankings and standings. |
| `open` | command | account: string | null | Opens an account at 0; an open account is left as it is; writes no event. |
| `has` | query | account: string | boolean | Whether the account is open. |
| `mint` | command | account: string, amount: number > 0, reason: string, idempotencyKey?: string | null | Creates points: start points, rewards, grants; writes `ledger_entry`. |
| `burn` | command | account: string, amount: number > 0, reason: string, idempotencyKey?: string | null | Destroys points: fines, penalties, an exile; the account may go negative; writes `ledger_entry`. |
| `move` | command | from: string, to: string, amount: number > 0, reason: string, idempotencyKey?: string | { ok: true, txId: string } or { ok: false, code: "INSUFFICIENT_FUNDS" } | Books points between accounts without the resident checks: escrow, treasuries, bids; writes `ledger_entry` only, never `transfer`. |

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
| [ledger/tools/transferPoints](prompts/ledger/tools/transferPoints.md) | - |
| [ledger/replies/transfer-ok](prompts/ledger/replies/transfer-ok.md) | `amount`, `target`, `balance`, `receipt` |
| [ledger/status/points](prompts/ledger/status/points.md) | `points` |

<!-- /generated:prompts -->

## Example

From [`games/city-slice/game.ts`](../../games/city-slice/game.ts):

```ts
mechanics: [
	ledger({ startPoints: 30 }),
	channels(),
	exile(),
	// ...
],
// ...
grants: {
	resident: ["transferPoints", "readBoard", "postBoard", "sendDM", "vote"],
	// ...
},
```

Every resident starts with 30 points and may pay another resident with `transferPoints`; `strictAccounts` keeps its
default, so other accounts must be opened first. With `exile` in the game, the ledger burns the balance of a
banished resident.

## Lessons and loopholes

**LH1** (a transfer memo as a verified message; the reason for `MEMO_DIGITS`) and **LH4** (receipts as proof of
delivery) in [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md), both recorded on the old platform.

## Tests

[`test/ledger.test.ts`](test/ledger.test.ts): the replies and refusals of `transferPoints` in the old order, the
events, the status line, the service (accounts, mint, burn, move, idempotency keys, `strictAccounts`), the sum of all
balances after every call, determinism, snapshot round trips, documented options, and the three prompt files held to
the old platform's texts. [`test/ledger-differential.test.ts`](test/ledger-differential.test.ts) books 300 random
bookings per seed through the book and through the old platform's `PointsLedger`
([`test/old-points-ledger.ts`](test/old-points-ledger.ts), carried) and compares entries, errors and snapshots.
[`test/exile.test.ts`](test/exile.test.ts): the burn after `exile.exiled` in the old shape, nothing for a balance of 0,
and the order against a second listener that declares `after: ["ledger"]`, listed before and after the ledger.
[`test/sample.test.ts`](test/sample.test.ts): what the fake driver (`swt run --fake`) may call. The `sample` of
`transferPoints` gives a transfer one time in eight: 1 to 5 points that the balance covers, without a memo, to
another resident that may act.
