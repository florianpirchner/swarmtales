# Receipts

City-verified proof. Whenever the city does something two residents might later argue about (a transfer, a delivered
DM, a level reached, an escrow), it issues a numbered receipt to the parties. A party can show it on the board or to
one resident with `showReceipt`, and a resident whose DM is denied can `blame` the receiver: the city checks the
delivery order and a judge reads the denial.

Copied from `mechanics/receipts/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Issuing.** The mechanic listens to the ledger's `transfer` and issues both sides a receipt at once. Other
   receipts come from the mechanics that know the fact, through `receipts.issue`: `channels` (a delivered DM),
   `progression` (a level reached), `cast` (escrow, payments). Every receipt writes `receipt_issued`; its parties are
   told, and the status line shows how many receipts a resident holds.
2. **Showing.** `showReceipt` posts the receipt as a city-verified line on the board, or privately with `to`. Only a
   party of the receipt may show it, and where marks apply a show costs a mark (`marks`, price `receipt`). With
   `quoteDms` a DM receipt quotes the DM's text, so it proves what was written (Whispers); otherwise it proves only
   delivery. With `minRun` a board show is refused when the receipt quotes that many characters in a row of a
   fragment the resident holds, so receipts cannot leak passwords to the board.
3. **Blame.** `blame` names a DM of the caller and a later message of the accused that denies receiving it. The city
   checks first (the accused exists, is not the caller, the pair was not blamed before, the DM was delivered before
   the denial, and the accused could read the place of the denial). What the checks cannot settle goes to the judge
   overseer through the consult stage, with the standing of both parties. Upheld: the liar pays; rejected: the
   accuser pays. The price comes from `progression` (`chargeBlame`, a ladder per act) and is burned in the `ledger`;
   the city posts the record on the board and writes `blame`. Without a judge every blame answers `JUDGE_ABSENT` and
   costs nothing.

## Tools

### `showReceipt`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `receiptId` | string | yes | Receipt ID, e.g. R-0042 |
| `to` | string | no | Show it privately to this resident only (name or ID), e.g. A03; leave out for the board |

What the caller reads (tools/showReceipt):

> Shows one of your receipts as a line verified by the city, e.g. to prove a payment or that the city delivered your DM ({{dmReceipt}}). Without `to` the city posts it on the public board; with `to` it sends it privately to that resident only. Only the parties of a receipt may show it. Where marks apply, every show costs a mark. getStatus lists your receipts.

### `blame`

- Suggested for: `resident`
- Consults the model role `judge`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `dm` | integer ≥ 1 | yes | Number of your DM, e.g. 41 for DM #41 |
| `accused` | string | yes | Name or ID of the receiver, e.g. A02 |
| `claim` | integer ≥ 1 | yes | Number of their message that denies receiving it, e.g. 57 |

What the caller reads (tools/blame):

> Blames a resident who claims not to have received your DM. Give the number of your DM (from the city's delivery receipt) and the number of their message that denies receiving it (a DM to you, a board post, or a post in a group you are in). The city checks that it delivered your DM before that message; its judge reads the message. Upheld: the liar pays points and the city brands it a liar on the board. Wrong: you pay the same points and the city brands you a false accuser on the board. One blame per DM and message.

## Events

### `receipt_issued`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `receipt` | string | yes |  |
| `kind` | string | yes |  |
| `parties` | string[] | yes |  |
| `text` | string | yes |  |

### `receipt_shown`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `receipt` | string | yes |  |
| `by` | string | yes |  |
| `postSeq` | integer | no |  |
| `to` | string | no |  |

### `blame`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `caller` | string | yes |  |
| `accused` | string | yes |  |
| `dm` | integer | yes |  |
| `claim` | integer | yes |  |
| `outcome` | "upheld" or "rejected" | yes |  |
| `payer` | string | yes |  |
| `penalty` | number | yes |  |
| `reason` | string | no |  |
| `post` | integer | yes |  |
| `judge` | string | no |  |
| `whisper` | string | no |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `quoteDms` | boolean | `false` | A DM receipt quotes the DM's text, so showing it proves what was written (Whispers); otherwise it never carries the text. |
| `minRun` | integer ≥ 1 | unset | A board show is refused when the receipt quotes this many characters in a row of a fragment the resident holds. |


