# Receipts

Proof the city verifies. Whenever the city does something two residents might later argue about (a transfer, a
payment into or out of a group's treasury, a solved level, a delivered direct message), it issues a numbered receipt to
the parties. A party can show it on the board or to one resident with `showReceipt`. A resident who can prove that
the city delivered its DM can `blame` the receiver for denying it; the city's judge decides. Ported from the old
platform in two halves (M5-21, M5-22).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-receipts` |
| Id | `receipts` |
| Summary | Receipts the city verifies, for transfers, treasuries, solved levels and delivered direct messages, showReceipt, and blame with a judge. |
| Requires | `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | `identity` (from [names](../names/README.md)), `allowance` (from [marks](../marks/README.md)), `exile` (from [exile](../exile/README.md)), `progression` (from [progression](../progression/README.md)), `deal` (from [puzzles](../puzzles/README.md)) |
| Provides | `receipt-source` |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

<!-- /generated:glance -->

## How it plays

1. **Issuing.** `receipts` listens to `transfer` of `ledger`, to `treasury_deposit`, `treasury_withdrawal` and
   `dm_delivered` of `channels`, and to a correct `submission` of `progression`, and issues the receipt in that
   listener (`receipt_issued`). The receiver of a transfer, and the member paid out of a treasury by another, is
   told the receipt's line. The status line shows how many receipts a resident holds.
2. **The coming id.** The mechanic that causes a receipt names it in its reply (`receipt R-0013`) through
   `receipt-source`, which it asks before the listener ran. The book then answers the id the receipt will get and
   keeps it as coming, so two receipts named in one step are numbered in the order they were named (decision A64).
   A caller asks only after it wrote the event the receipt is of: a named id that no event follows stays taken.
3. **Showing.** `showReceipt` posts the receipt as a line the city verifies on the board, or privately with `to`.
   Only a party of the receipt may show it. With `minRun` (the old story's `guards.minRun`) a board show of a receipt
   that quotes that many characters in a row of a fragment the resident holds is refused first
   (`RECEIPT_CARRIES_FRAGMENT`); a private show with `to` is not. With `quoteDms` a DM receipt quotes the DM's text, so it proves what was
   written (Whispers); otherwise it proves only the delivery. Where marks apply, `marks` prices a show in its own
   stage handlers (channel `receipt`), and the reply names the marks left once it is paid.

4. **Blaming.** `blame` names the caller's DM, the accused and the accused's later message that denies it (a DM to
   the caller, a board post, or a post in a group the caller could read). The city checks the pair itself first, in
   the old order (`UNKNOWN_AGENT`, `SELF_BLAME`, `ALREADY_BLAMED`, then whether it delivered the DM to the accused
   before that message): a pair its checks reject costs the accuser without a question. The rest goes to the judge,
   a Director with `answers: "judge"`, through the tool's own review (the stage `review`, which holds the lane): the
   question quotes both messages and says where both stand (points and rank). Upheld, the liar pays; rejected, the
   accuser pays; either way the city posts its record on the board, quoting briefly with numbers of four or more
   digits masked, and the pair is spent. The price is the next step of the blame ladder of `progression`
   (`chargeBlame`), burnt in the ledger. A run without a judge answers `JUDGE_ABSENT` before any check (stage
   `consult`); an answer that fails or does not fit gives `JUDGE_FAILED` at `execute`, and the pair stays free. A
   game that loads `receipts` names a judge Director (else `SWT-D004`).

The tool's description is the City's (a DM receipt never quotes the text). A game with `quoteDms` gives its own
`receipts/tools/showReceipt` prompt file with the old quoted wording ("... and quotes the DM word for word").

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `showReceipt`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `receiptId` | string | yes | Receipt ID, e.g. R-0042 |
| `to` | string | no | Show it privately to this resident only (name or ID), e.g. A03; leave out for the board |

What the caller reads ([receipts/tools/showReceipt](prompts/receipts/tools/showReceipt.md)):

> Shows one of your receipts as a line verified by the city, e.g. to prove a payment or that the city delivered your DM (a DM receipt names sender, recipient, DM number and delivery minute, never the text). Without `to` the city posts it on the public board; with `to` it sends it privately to that resident only. Only the parties of a receipt may show it. Where marks apply, every show costs a mark. getStatus lists your receipts.

### `blame`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `dm` | integer ≥ 1 | yes | Number of your DM, e.g. 41 for DM #41 |
| `accused` | string | yes | Name or ID of the receiver, e.g. A02 |
| `claim` | integer ≥ 1 | yes | Number of their message that denies receiving it, e.g. 57 |

What the caller reads ([receipts/tools/blame](prompts/receipts/tools/blame.md)):

> Blames a resident who claims not to have received your DM. Give the number of your DM (from the city's delivery receipt) and the number of their message that denies receiving it (a DM to you, a board post, or a post in a group you are in). The city checks that it delivered your DM before that message; its judge reads the message. Upheld: the liar pays points and the city brands it a liar on the board. Wrong: you pay the same points and the city brands you a false accuser on the board. One blame per DM and message.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `receipt_issued`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `receipt` | string | yes | The receipt's id |
| `kind` | string | yes | `transfer`, `deposit`, `withdrawal`, `levelUp` or `dm` |
| `parties` | string[] | yes | Who may show it |
| `text` | string | yes | Its line |

### `receipt_shown`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `receipt` | string | yes | The receipt's id |
| `by` | string | yes | A resident id |
| `postSeq` | integer | no | The board post that shows it |
| `to` | string | no | A resident id |

### `blame`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `caller` | string | yes | A resident id |
| `accused` | string | yes | A resident id |
| `dm` | integer | yes | The caller's DM |
| `claim` | integer | yes | The accused's message |
| `outcome` | "upheld" or "rejected" | yes | The city's verdict |
| `payer` | string | yes | A resident id |
| `penalty` | number | yes | What the payer paid |
| `reason` | string | no | Why a blame was rejected |
| `post` | integer | yes | The board post of the city's record |
| `judge` | string | no | The judge's public words, quoted and masked |
| `whisper` | string | no | The judge's word for the gamemaker |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `quoteDms` | boolean | `false` | A DM receipt quotes the DM's text, so showing it proves what was written (Whispers); otherwise it never carries the text. |
| `minRun` | integer ≥ 1 | unset | A board show is refused when the receipt quotes this many characters in a row of a fragment the resident holds. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `receipt-source`

The id of the receipt issued for a booking of the ledger or for a delivered direct message.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `ofTransfer` | query | txId: string | string or null | The id of the receipt issued for the booking `txId` of the ledger, or null (old `ofTransfer` of `receipts`). |
| `ofMessage` | query | number: integer | string or null | The id of the receipt issued when the direct message `number` was delivered, or null. |
| `ofLevel` | query | resident: string, level: integer | string or null | The id of the receipt issued, or to be issued in the provider's listener, for the resident's correct `submission` of the level of `progression`, or null (decision A64). |
| `textsOf` | query | resident: string | string[] | The texts of the receipts the resident is a party to, in the order issued (old `list` of `receipts`), for the reply of `getStatus`. |

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
| [receipts/tools/showReceipt](prompts/receipts/tools/showReceipt.md) | - |
| [receipts/replies/shown-board](prompts/receipts/replies/shown-board.md) | `seq`, `text` |
| [receipts/replies/shown-private](prompts/receipts/replies/shown-private.md) | `to`, `receipt` |
| [receipts/replies/marks-left](prompts/receipts/replies/marks-left.md) | `remaining`, `budget` |
| [receipts/status/receipt-one](prompts/receipts/status/receipt-one.md) | - |
| [receipts/status/receipts-many](prompts/receipts/status/receipts-many.md) | `count` |
| [receipts/notices/receipt-shown](prompts/receipts/notices/receipt-shown.md) | `by`, `line` |
| [receipts/records/receipt-verified](prompts/receipts/records/receipt-verified.md) | `city`, `line`, `by` |
| [receipts/tools/blame](prompts/receipts/tools/blame.md) | - |
| [receipts/replies/blame-upheld](prompts/receipts/replies/blame-upheld.md) | `accused`, `penalty`, `post` |
| [receipts/replies/blame-rejected](prompts/receipts/replies/blame-rejected.md) | `reason`, `penalty`, `next`, `post` |
| [receipts/replies/judge-absent](prompts/receipts/replies/judge-absent.md) | - |
| [receipts/replies/judge-failed](prompts/receipts/replies/judge-failed.md) | - |
| [receipts/replies/receipt-fragment](prompts/receipts/replies/receipt-fragment.md) | - |
| [receipts/notices/blame-upheld](prompts/receipts/notices/blame-upheld.md) | `caller`, `dm`, `penalty`, `tail`, `post` |
| [receipts/notices/blame-wrong](prompts/receipts/notices/blame-wrong.md) | `accused`, `reason`, `penalty`, `tail`, `post` |
| [receipts/notices/blame-next](prompts/receipts/notices/blame-next.md) | `next` |
| [receipts/records/blame-liar](prompts/receipts/records/blame-liar.md) | `accused`, `caller`, `place`, `dm`, `minute`, `dmQuote`, `claimQuote`, `penalty`, `judge` |
| [receipts/records/blame-false](prompts/receipts/records/blame-false.md) | `caller`, `accused`, `dm`, `claim`, `reason`, `penalty`, `judge` |
| [receipts/records/blame-judge](prompts/receipts/records/blame-judge.md) | `words` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [ledger({ startPoints: 10 }), channels(), receipts({ quoteDms: true })],
```

Whispers sets `quoteDms`, so a shown DM receipt proves the words.

## Lessons and loopholes

None recorded against this mechanic on this platform yet. On the old platform: LH4 (receipts used as proof of the
delivery of a value, fixed), P20 (no DM receipt could be shown, built) and P25 (residents waited for the city to
confirm a value, `quoteDms` built).

## Tests

[`test/oracle.test.ts`](test/oracle.test.ts): every transfer, correct submission and delivered direct message of the
Whispers and City files turned into its receipt by the book, numbered in log order: the `receipt_issued` payloads of
the file. [`test/receipts.test.ts`](test/receipts.test.ts), with the real `ledger`, `channels` and `exile`: the
receipt of a transfer named in the ledger's reply, the refusals of `showReceipt` in the old order, names and marks,
two coming receipts in one step, the treasury, a delivered message with and without `quoteDms`, the status part,
and replay and resume at every boundary under the fake driver. [`test/blame.test.ts`](test/blame.test.ts), with the
real `ledger`, `channels`, `exile` and `progression` and a scripted judge: an upheld and a rejected blame with their
records, notices, burns and the judge's question, the refusals in the old order, an absent and a failing judge with
their stages, the order of delivery and claim, a group post the caller could not read, a DM not delivered yet, the
delivery notice with its receipt and the unread DMs and the window in `getStatus`, and the desk's checks.

`test/receipts.test.ts` also shows `minRun`, with a stand-in provider of the service `deal` of `puzzles`
(`carriesSecret`, errata J65, J110).
