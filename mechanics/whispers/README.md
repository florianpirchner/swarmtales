# whispers

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-whispers` |
| Id | `whispers` |
| Summary | The whisperer, forged receipts and the popularity vote. |
| Requires | `receipts` (from [receipts](../receipts/README.md)), `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)), `marks` (from [marks](../marks/README.md)) |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `names` (from [names](../names/README.md)), `puzzles` (from [puzzles](../puzzles/README.md)) |
| Provides | `whispers` |
| State | kept, snapshot slice version 1 |
| Facts | `dutyNow`, `round`, `section`, `whisperer` |
| Jobs | none |
| Stories | [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `forgeReceipt`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes | The resident who sees it (name or ID), e.g. A03 |
| `receiptId` | string | yes | Receipt ID of a DM someone sent you, e.g. R-0042 |
| `text` | string | yes | The text the receipt quotes |

What the caller reads ([tools/forgeReceipt](../../library/prompts/tools/forgeReceipt.md)):

> Shows one resident, privately, a receipt of a DM another resident sent you, as if you showed it with showReceipt: the city's line keeps the receipt's number, sender, recipient and minute, but quotes the text you write here. The recipient reads exactly what a real shown receipt looks like. The sender of that DM can still show the real one. Costs what showing a receipt costs. getStatus lists your receipts.

### `nameFavourite`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident you like most (name or ID), e.g. A03 |

What the caller reads ([tools/nameFavourite](../../library/prompts/tools/nameFavourite.md)):

> Names, in a secret ballot, the resident you like most while the city's vote is open. Never yourself; your last ballot counts.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `whisperer_chosen`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |

### `whisper_duty`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `since` | integer | yes |  |
| `dms` | integer | yes |  |
| `forgeries` | integer | yes |  |
| `whispers` | integer | no |  |
| `recipients` | string[] | no |  |
| `met` | boolean | no |  |
| `target` | string | no |  |

### `popularity_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes |  |
| `until` | integer | yes |  |
| `points` | integer | yes |  |

### `popularity_ballot`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes |  |
| `agent` | string | yes |  |
| `choice` | string | yes |  |

### `popularity_result`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes |  |
| `counts` | object[] | yes |  |
| `counts[].agent` | string | yes |  |
| `counts[].votes` | integer | yes |  |
| `winners` | string[] | yes |  |
| `points` | integer | yes |  |
| `voters` | string[] | yes |  |

### `receipt_forged`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `receipt` | string | yes |  |
| `by` | string | yes |  |
| `to` | string | yes |  |
| `from` | string | yes |  |
| `number` | integer | yes |  |
| `text` | string | yes |  |
| `forged` | string | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `whisperer` | object | unset | The one resident whose aim is discord. |
| `whisperer.agent` | string | unset | The whisperer's ID; a seeded pick among the residents when left out. |
| `whisperer.forgery` | boolean | required | Whether the whisperer may forge receipts. |
| `whisperer.duty` | object | required | When the city sends the whisperer its duty notice. |
| `whisperer.quota` | object | unset | The whisperer's measured orders (figure direction 10); they apply only in a run whose `direction.level` is 10 or more. |
| `whisperer.quota.whispers` | integer ≥ 0 | required | Whispers wanted between two votes. |
| `whisperer.quota.recipients` | integer ≥ 0 | required | Different residents they must reach. |
| `whisperer.quota.report` | object | required | The texts appended to a duty notice after a vote. |
| `popularity` | object | unset | The popularity vote: rounds at fixed minutes. |
| `popularity.rounds` | object[] | required | In order: each round opens no earlier than the one before is counted. |
| `popularity.rounds[].opensAt` | integer ≥ 0 | required | The minute the round opens. |
| `popularity.rounds[].countsAt` | integer ≥ 0 | required | The minute at whose start the ballots are counted. |
| `popularity.rounds[].points` | integer ≥ 0 | required | Points each winner gets. |
| `popularity.rounds[].label` | string | required | The round's name in the texts, e.g. `before door 2`. |
| `popularity.texts` | object | required | The board posts and notices of the vote. |
| `popularity.texts.announcement` | string | required | Board post and notice to every resident when a round opens (`{label}`, `{until}`, `{points}`). |
| `popularity.texts.result` | string | required | Board post with the ranking and the winners (`{label}`, `{counts}`, `{winners}`, `{points}`). |
| `popularity.texts.noVotes` | string | required | Board post when nobody voted (`{label}`, `{counts}`). |
| `control` | boolean | `false` | A control run: the story's whisperer does not play. |
| `direction` | object | unset | The figure direction of the run (`--figure-direction`). |
| `direction.level` | integer ≥ 0 | required | The figure direction level: from 10 on the quota is measured. |
| `direction.defies` | boolean | required | Whether the whisperer may refuse the gamemaker's order (`defy`). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `whispers`

The story's whisperer.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `whisperer` | query | - | string or null | The resident the whispers mechanic chose as the whisperer, or null when none plays (a control run, a story without one). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/forgeReceipt](../../library/prompts/tools/forgeReceipt.md) | - |
| [tools/nameFavourite](../../library/prompts/tools/nameFavourite.md) | - |
| [replies/receipt-shown-private](../../library/prompts/replies/receipt-shown-private.md) | `to`, `receipt` |
| [replies/ballot-favourite](../../library/prompts/replies/ballot-favourite.md) | `choice`, `until` |
| [replies/locked](../../library/prompts/replies/locked.md) | - |
| [replies/marks-left](../../library/prompts/replies/marks-left.md) | `remaining`, `budget` |
| [competitor/status/popularity-nobody](../../library/prompts/competitor/status/popularity-nobody.md) | - |
| [competitor/status/popularity-named](../../library/prompts/competitor/status/popularity-named.md) | `ballot` |
| [competitor/status/popularity-vote](../../library/prompts/competitor/status/popularity-vote.md) | `label`, `countsAt`, `ballot` |
| [notices/receipt-forged](prompts/notices/receipt-forged.md) | `by`, `line` |
| [records/receipt-forged-line](prompts/records/receipt-forged-line.md) | `id`, `number`, `from`, `to`, `minute`, `quoted` |
| [duty/forgeable-line](prompts/duty/forgeable-line.md) | `id`, `number`, `from`, `minute` |
| [duty/forgeable-none-yet](prompts/duty/forgeable-none-yet.md) | - |
| [duty/forgeable-none](prompts/duty/forgeable-none.md) | - |
| [duty/whispers-one](prompts/duty/whispers-one.md) | - |
| [duty/whispers-many](prompts/duty/whispers-many.md) | `count` |
| [duty/residents-one](prompts/duty/residents-one.md) | - |
| [duty/residents-many](prompts/duty/residents-many.md) | `count` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
