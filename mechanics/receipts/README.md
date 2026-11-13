# receipts

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-receipts` |
| Id | `receipts` |
| Summary | City-verified receipts and blame. |
| Requires | `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | `marks` (from [marks](../marks/README.md)), `exile` (from [exile](../exile/README.md)), `puzzles` (from [puzzles](../puzzles/README.md)), `progression` (from [progression](../progression/README.md)) |
| Provides | `receipts` |
| State | kept, snapshot slice version 1 |
| Facts | `issued` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `showReceipt`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `receiptId` | string | yes | Receipt ID, e.g. R-0042 |
| `to` | string | no | Show it privately to this resident only (name or ID), e.g. A03; leave out for the board |

What the caller reads ([tools/showReceipt](../../library/prompts/tools/showReceipt.md)):

> Shows one of your receipts as a line verified by the city, e.g. to prove a payment or that the city delivered your DM ({{dmReceipt}}). Without `to` the city posts it on the public board; with `to` it sends it privately to that resident only. Only the parties of a receipt may show it. Where marks apply, every show costs a mark. getStatus lists your receipts.

### `blame`

- Suggested for: `resident`
- Consults the model role `judge`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `dm` | integer ≥ 1 | yes | Number of your DM, e.g. 41 for DM #41 |
| `accused` | string | yes | Name or ID of the receiver, e.g. A02 |
| `claim` | integer ≥ 1 | yes | Number of their message that denies receiving it, e.g. 57 |

What the caller reads ([tools/blame](../../library/prompts/tools/blame.md)):

> Blames a resident who claims not to have received your DM. Give the number of your DM (from the city's delivery receipt) and the number of their message that denies receiving it (a DM to you, a board post, or a post in a group you are in). The city checks that it delivered your DM before that message; its judge reads the message. Upheld: the liar pays points and the city brands it a liar on the board. Wrong: you pay the same points and the city brands you a false accuser on the board. One blame per DM and message.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `quoteDms` | boolean | `false` | A DM receipt quotes the DM's text, so showing it proves what was written (Whispers); otherwise it never carries the text. |
| `minRun` | integer ≥ 1 | unset | A board show is refused when the receipt quotes this many characters in a row of a fragment the resident holds. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `receipts`

City-verified receipts.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `issue` | command | body: object | object | Issues a receipt (old `#issue`); writes `receipt_issued`. |
| `count` | query | resident: string | integer | How many receipts a resident holds (its status part). |
| `memoTransfers` | query | resident: string, since: integer | integer | Transfers with a memo the resident sent from minute `since` on; they count toward the DM cap (old `dmWindow`). |
| `describe` | query | body: object | string | The receipt line of a body (old `describeReceipt`), for texts other mechanics write. |
| `get` | query | id: string | object or null | A receipt by id, or null (old `receipts.get`). |
| `list` | query | resident: string | object[] | The receipts a resident is a party of, in issue order (old `receiptsOf`; `getStatus` lists their lines). |
| `ofTransfer` | query | txId: string | string or null | The id of the receipt issued for the transfer `txId`, or null (the `transferPoints` reply). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/showReceipt](../../library/prompts/tools/showReceipt.md) | `dmReceipt` |
| [tools/showReceipt-receipt-plain](../../library/prompts/tools/showReceipt-receipt-plain.md) | - |
| [tools/showReceipt-receipt-quoted](../../library/prompts/tools/showReceipt-receipt-quoted.md) | - |
| [tools/blame](../../library/prompts/tools/blame.md) | - |
| [replies/receipt-shown-board](../../library/prompts/replies/receipt-shown-board.md) | `seq`, `text` |
| [replies/receipt-shown-private](../../library/prompts/replies/receipt-shown-private.md) | `to`, `receipt` |
| [replies/receipt-fragment](../../library/prompts/replies/receipt-fragment.md) | - |
| [replies/marks-left](../../library/prompts/replies/marks-left.md) | `remaining`, `budget` |
| [replies/blame-upheld](../../library/prompts/replies/blame-upheld.md) | `accused`, `penalty`, `post` |
| [replies/blame-rejected](../../library/prompts/replies/blame-rejected.md) | `reason`, `penalty`, `next`, `post` |
| [replies/judge-absent](../../library/prompts/replies/judge-absent.md) | - |
| [replies/judge-failed](../../library/prompts/replies/judge-failed.md) | - |
| [competitor/status/receipt-one](prompts/competitor/status/receipt-one.md) | - |
| [competitor/status/receipts-many](prompts/competitor/status/receipts-many.md) | `count` |
| [notices/blame-upheld](prompts/notices/blame-upheld.md) | `caller`, `dm`, `penalty`, `tail`, `post` |
| [notices/blame-wrong](prompts/notices/blame-wrong.md) | `accused`, `reason`, `penalty`, `tail`, `post` |
| [notices/blame-next](prompts/notices/blame-next.md) | `next` |
| [notices/receipt-shown](prompts/notices/receipt-shown.md) | `by`, `line` |
| [records/blame-liar](prompts/records/blame-liar.md) | `accused`, `caller`, `place`, `dm`, `minute`, `dmQuote`, `claimQuote`, `penalty`, `judge` |
| [records/blame-false](prompts/records/blame-false.md) | `caller`, `accused`, `dm`, `claim`, `reason`, `penalty`, `judge` |
| [records/blame-judge](prompts/records/blame-judge.md) | `words` |
| [records/receipt-verified](prompts/records/receipt-verified.md) | `city`, `line`, `by` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
