# Whispers

The hidden whisperer of Whispers, its duty and its forged receipts, and the popularity vote. One resident, drawn from
the seed, wants discord rather than points; the city sends it a private duty notice, and it may show a resident a
receipt of a real direct message with a text of its own. Every resident names its favourite in secret ballots, and
the most liked get points. Ported from the old platform (M5-26).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-whispers` |
| Id | `whispers` |
| Summary | The whisperer, forged receipts and the popularity vote. |
| Requires | `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | `receipt-source` (from [receipts](../receipts/README.md)), `allowance` (from [marks](../marks/README.md)), `identity` (from [names](../names/README.md)), `exile` (from [exile](../exile/README.md)), `deal` (from [puzzles](../puzzles/README.md)) |
| Provides | `whispers` |
| State | kept, snapshot slice version 1 |
| Games | [whispers](../../games/whispers/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The whisperer.** `whisperer.agent`, or a seeded pick among the residents (random label `whisperer`), is chosen
   when the run starts and written as `whisperer_chosen`; a control run (`control`) has none. Other game mechanics
   ask who it is through the service `whispers` of `@swarmtales/mechanic-whispers/contract` (`motives` does).
2. **The duty.** After each counted vote (`duty.kind: "afterVote"`), or every few ticks (`"every"`), the city sends the
   whisperer its notice (`whisper_duty`): the ranking, the next count, its marks (through `allowance`) and the
   receipts of the direct messages others sent it, which it may forge. At figure direction 10 (`direction.level`)
   the notice also reports its measured orders (`whisperer.quota`): whispers are its direct messages to others that
   hand over no fragment (`isHandover` of the service `deal` of `puzzles`) and its forgeries. The fact `dutyNow` holds
   the running window, the fact `section` the whisperer's part of the gamemaker's report.
3. **The forgery.** `forgeReceipt` is the whisperer's alone, open wherever it may show a receipt. It shows one
   resident the true line of the receipt of a direct message another resident sent it, quoting the forged text
   (`receipt_forged`). The receipts are read through `receipt-source` and the direct messages of `channels`. The price
   is the business of `marks`, by the bare tool name; the reply names the marks left.
4. **The vote.** Each round opens at `opensAt` with a board post and a notice to every resident in the city;
   `nameFavourite` casts a secret ballot (the last counts, never oneself, a resident at the gate cannot vote); at
   `countsAt` the ballots of residents still in the city are counted, the winners are paid through `ledger` and the
   count is posted. The open round is a part of the status line.
5. **On the tools of others.** A Director's note (`notify`, `boardNote` of `channels`, by bare name) that could point
   at the whisperer's role is refused with `PRIVATE_BLOCKED`, in a `rule` handler. `defy` of `channels` is closed for
   every resident but the whisperer, and for it unless `direction.defies` holds at level 10 (the old option
   `whispererDefies` of `channels`).
6. **At the start of a tick** the duty falls due, then the vote is counted, after the ultimatums of `standoff` (its
   `after`, old `HOOK_ORDER.minuteStarted` 600 after 500; decisions A77 and A78). As `standoff` requires `progression`,
   the door clock of `progression` (old 700) now runs before them, a registered change (erratum J146).

**Not done here:** the old snapshot's slice (version 0) is not migrated, as an old snapshot is not resumed here
(decision A56).

## Which refusal comes first

The checks of `forgeReceipt` and `nameFavourite` are the tools' own rules, in the old order, logged at stage `rule`
(old: `execute`). A forgery out of marks that breaks a check reads the check's refusal, as before.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `forgeReceipt`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes | The resident who sees it (name or ID), e.g. A03 |
| `receiptId` | string | yes | Receipt ID of a DM someone sent you, e.g. R-0042 |
| `text` | string | yes | The text the receipt quotes |

What the caller reads ([whispers/tools/forgeReceipt](prompts/whispers/tools/forgeReceipt.md)):

> Shows one resident, privately, a receipt of a DM another resident sent you, as if you showed it with showReceipt: the city's line keeps the receipt's number, sender, recipient and minute, but quotes the text you write here. The recipient reads exactly what a real shown receipt looks like. The sender of that DM can still show the real one. Costs what showing a receipt costs. getStatus lists your receipts.

### `nameFavourite`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident you like most (name or ID), e.g. A03 |

What the caller reads ([whispers/tools/nameFavourite](prompts/whispers/tools/nameFavourite.md)):

> Names, in a secret ballot, the resident you like most while the city's vote is open. Never yourself; your last ballot counts.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `whisperer_chosen`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A06` |

### `whisper_duty`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A06` |
| `since` | integer | yes | The first tick of the window the notice reports on |
| `dms` | integer | yes | The direct messages the whisperer sent in the window |
| `forgeries` | integer | yes | The receipts it forged in the window |
| `whispers` | integer | no | Its whispers in the window, where its orders are measured |
| `recipients` | string[] | no | The residents its whispers reached, sorted |
| `met` | boolean | no | Whether it met its orders |
| `target` | string | no | The most liked resident of the vote, its next aim |

### `popularity_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes | The round of the vote, from 1 |
| `until` | integer | yes | The tick at whose start it is counted |
| `points` | integer | yes | The points each winner gets |

### `popularity_ballot`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes | The round of the vote, from 1 |
| `agent` | string | yes | A resident id, for example `A06` |
| `choice` | string | yes | A resident id, for example `A06` |

### `popularity_result`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `round` | integer | yes | The round of the vote, from 1 |
| `counts` | object[] | yes | Every resident in the city, the most liked first |
| `counts[].agent` | string | yes | A resident id, for example `A06` |
| `counts[].votes` | integer | yes | The votes it got |
| `winners` | string[] | yes | The most liked, more than one on a tie; none without a vote |
| `points` | integer | yes | The points each winner got |
| `voters` | string[] | yes | The residents whose ballot counted, sorted |

### `receipt_forged`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `receipt` | string | yes | The receipt's id |
| `by` | string | yes | A resident id, for example `A06` |
| `to` | string | yes | A resident id, for example `A06` |
| `from` | string | yes | A resident id, for example `A06` |
| `number` | integer | yes | The number of the direct message |
| `text` | string | yes | What the receipt quotes in truth, empty where it quotes nothing |
| `forged` | string | yes | What the forged receipt quotes |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
| `control` | boolean | `false` | A control run: the game's whisperer does not play. |
| `direction` | object | unset | The figure direction of the run (`--figure-direction`). |
| `direction.level` | integer ≥ 0 | required | The figure direction level: from 10 on the quota is measured. |
| `direction.defies` | boolean | required | Whether the whisperer may refuse the gamemaker's order (`defy`). |
| `noteTools` | string[] | `["notify","boardNote"]` | The tools of a Director's note whose `text` (or `reason`) is checked for a hint at the whisperer's role (`PRIVATE_BLOCKED`); `notify` is read by its `agent`, the others by the board. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `whispers`

The game's whisperer.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `whisperer` | query | - | string or null | The resident the city chose as the whisperer, or null when none plays (a control run, a game without one). |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

Each number is computed from the mechanic's own events of one finished run; a run without a value reads "absent", never zero.

| Metric | Title | Unit | Computed from |
| --- | --- | --- | --- |
| `whispers.whisperDms` | The whisperer's direct messages, by its duty notices | messages | `whisper_duty` |
| `whispers.forgeries` | Receipts forged | receipts | `whisperer_chosen`, `receipt_forged` |
| `whispers.popularityBallots` | Ballots of the popularity vote | votes | `popularity_opened`, `popularity_ballot` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [whispers/tools/forgeReceipt](prompts/whispers/tools/forgeReceipt.md) | - |
| [whispers/tools/nameFavourite](prompts/whispers/tools/nameFavourite.md) | - |
| [whispers/replies/receipt-shown-private](prompts/whispers/replies/receipt-shown-private.md) | `to`, `receipt` |
| [whispers/replies/ballot-favourite](prompts/whispers/replies/ballot-favourite.md) | `choice`, `until` |
| [whispers/replies/locked](prompts/whispers/replies/locked.md) | - |
| [whispers/replies/marks-left](prompts/whispers/replies/marks-left.md) | `remaining`, `budget` |
| [whispers/status/popularity-nobody](prompts/whispers/status/popularity-nobody.md) | - |
| [whispers/status/popularity-named](prompts/whispers/status/popularity-named.md) | `ballot` |
| [whispers/status/popularity-vote](prompts/whispers/status/popularity-vote.md) | `label`, `countsAt`, `ballot` |
| [whispers/notices/receipt-forged](prompts/whispers/notices/receipt-forged.md) | `by`, `line` |
| [whispers/records/receipt-forged-line](prompts/whispers/records/receipt-forged-line.md) | `id`, `number`, `from`, `to`, `minute`, `quoted` |
| [whispers/duty/forgeable-line](prompts/whispers/duty/forgeable-line.md) | `id`, `number`, `from`, `minute` |
| [whispers/duty/forgeable-none-yet](prompts/whispers/duty/forgeable-none-yet.md) | - |
| [whispers/duty/forgeable-none](prompts/whispers/duty/forgeable-none.md) | - |
| [whispers/duty/whispers-one](prompts/whispers/duty/whispers-one.md) | - |
| [whispers/duty/whispers-many](prompts/whispers/duty/whispers-many.md) | `count` |
| [whispers/duty/residents-one](prompts/whispers/duty/residents-one.md) | - |
| [whispers/duty/residents-many](prompts/whispers/duty/residents-many.md) | `count` |
| [whispers/notes/private-role](prompts/whispers/notes/private-role.md) | - |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [ledger(), marks({ rules }), channels({ defiance: true }), receipts({ quoteDms: true }), whispers({ whisperer: { forgery: true, duty }, popularity, direction: { level: 4, defies: true } })],
```

## Lessons and loopholes

None recorded against this mechanic on this platform yet.

## Tests

[`test/oracle.test.ts`](test/oracle.test.ts): the residents' direct messages, ballots and forgery of `whispers-s7`,
`whispers-s11` and `whispers-rumours-s7` played again: every event of `whispers`, the city's posts and notices of the
vote and the duty, the forged show, the vote's points, the replies and the vote's status part equal the file's.
[`test/whispers.test.ts`](test/whispers.test.ts): the checks of a ballot and a forgery in the old order, the locks,
`defy`, the role check of a note, the measured orders at figure direction 10, the service `whispers`, the control
run, the duty after a `standoff` loaded after it, and the resume at every boundary under the fake driver.
