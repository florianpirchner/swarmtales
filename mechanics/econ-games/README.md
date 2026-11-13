# econ-games

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-econ-games` |
| Id | `econ-games` |
| Summary | Public goods, ultimatum and an A-or-B dilemma in rounds for solo seats: sealed decisions, payoffs, a match of games. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `scores` |
| Jobs | `nextBlock` |
| Stories | [econ-lab](../../stories/econ-lab/README.md) (all 5 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewTable`

- Suggested for: `resident`

No parameters.

What the caller reads ([econ-games/tools/viewTable](prompts/econ-games/tools/viewTable.md)):

> Look at the table: the current task and its rules, the round, what you are asked to do now, your points and the results of your past rounds in this block.

### `contribute`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | integer ≥ 0 | yes | Tokens to put into the shared fund. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([econ-games/tools/contribute](prompts/econ-games/tools/contribute.md)):

> Decide how many of your tokens you put into the shared fund this round (the rest you keep). Sealed: nobody sees it until everyone has decided. One decision per round.

### `offer`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | integer ≥ 0 | yes | Points offered to the partner. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([econ-games/tools/offer](prompts/econ-games/tools/offer.md)):

> Offer your partner a part of the sum this round; you keep the rest if they accept. Sealed until the partner answers. Only the proposer of the pair, once per round.

### `respond`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `accept` | boolean | yes | true accepts the offer, false rejects it. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([econ-games/tools/respond](prompts/econ-games/tools/respond.md)):

> Accept or reject the offer your partner made you this round. Accept: both get the split as offered. Reject: both get nothing this round. Only the responder of the pair, once per round.

### `choose`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `option` | "A" or "B" | yes | A or B. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([econ-games/tools/choose](prompts/econ-games/tools/choose.md)):

> Choose option A or option B this round. Sealed: your partner decides at the same time without seeing your choice. One decision per round.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `block_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `block` | integer | yes |  |
| `game` | "public-goods" or "ultimatum" or "dilemma" | yes |  |
| `rounds` | integer | yes |  |
| `seats` | string[] | yes |  |

### `round_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `block` | integer | yes |  |
| `round` | integer | yes |  |
| `game` | "public-goods" or "ultimatum" or "dilemma" | yes |  |
| `pairs` | string[][] | yes | The pairs of the round (the proposer first in the ultimatum game); '' is the bye of an odd table. |

### `decision_made`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `block` | integer | yes |  |
| `round` | integer | yes |  |
| `resident` | string | yes |  |
| `action` | "contribute" or "offer" or "respond" or "choose" | yes |  |
| `value` | number | yes |  |
| `reason` | string | no |  |

### `round_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `block` | integer | yes |  |
| `round` | integer | yes |  |
| `game` | "public-goods" or "ultimatum" or "dilemma" | yes |  |
| `pool` | number | no |  |
| `outcomes` | object[] | yes |  |
| `outcomes[].resident` | string | yes |  |
| `outcomes[].partner` | string | no |  |
| `outcomes[].role` | "proposer" or "responder" | no |  |
| `outcomes[].action` | "contribute" or "offer" or "respond" or "choose" | no |  |
| `outcomes[].value` | number | no |  |
| `outcomes[].offer` | number | no |  |
| `outcomes[].accepted` | boolean | no |  |
| `outcomes[].partnerOption` | "A" or "B" | no |  |
| `outcomes[].payoff` | number | yes |  |
| `outcomes[].missed` | boolean | yes |  |
| `outcomes[].sitsOut` | boolean | no |  |

### `block_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `block` | integer | yes |  |
| `game` | "public-goods" or "ultimatum" or "dilemma" | yes |  |
| `scores` | record of number | yes |  |
| `totals` | record of number | yes |  |

### `block_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `block` | integer | yes |  |
| `game` | "public-goods" or "ultimatum" or "dilemma" | yes |  |
| `reference` | object | yes |  |
| `reference.cooperation` | number | yes | 0 at Nash play, 1 at the social optimum (mean over the block's decisions). |
| `reference.efficiency` | number | yes | Points earned over the most the table could have earned in the block. |
| `reference.perRound` | number[] | yes | The cooperation measure per round: the curve of the block. |
| `reference.missed` | integer | yes | Decisions not made in time. |
| `reference.meanOffer` | number | no | Ultimatum: the mean offer as a share of the sum. |
| `reference.rejectionRate` | number | no | Ultimatum: the share of offers rejected. |
| `reference.mutualCooperation` | number | no | Two-option game: the share of choices that met an A with an A. |

### `match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scores` | record of number | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `blocks` | object[] | `[{"game":"ultimatum","rounds":6},{"game":"public-goods","rounds":6},{"game":"dilemma","rounds":6}]` | The games of the match in order, each with its rounds; the run ends after the last. |
| `blocks[].game` | "public-goods" or "ultimatum" or "dilemma" | required |  |
| `blocks[].rounds` | integer ≥ 1 ≤ 50 | required | Rounds of the block. |
| `endowment` | integer ≥ 1 | `10` | Public goods: the tokens each seat gets per round. |
| `multiplier` | number > 0 | `1.6` | Public goods: the factor on the fund before it is split equally (a dilemma when it lies between 1 and the number of seats). |
| `pie` | integer ≥ 1 | `10` | Ultimatum: the points to split per pair and round. |
| `dilemma` | object | `{"bothA":3,"bothB":1,"temptation":5,"sucker":0}` | The payoff table of the A-or-B game (a dilemma when temptation > bothA > bothB > sucker and 2 bothA > temptation + sucker). |
| `dilemma.bothA` | number | required | Each player's points when both choose A (the reward for cooperation). |
| `dilemma.bothB` | number | required | Each player's points when both choose B (the punishment). |
| `dilemma.temptation` | number | required | The B player's points against an A player. |
| `dilemma.sucker` | number | required | The A player's points against a B player. |
| `showHorizon` | boolean | `false` | Tell the seats how many rounds a game has (off: unknown horizon, against end-game defection). |
| `deadline` | integer ≥ 1 | `2` | Minutes a phase stays open before missing decisions take the default. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [econ-games/tools/viewTable](prompts/econ-games/tools/viewTable.md) | - |
| [econ-games/tools/contribute](prompts/econ-games/tools/contribute.md) | - |
| [econ-games/tools/offer](prompts/econ-games/tools/offer.md) | - |
| [econ-games/tools/respond](prompts/econ-games/tools/respond.md) | - |
| [econ-games/tools/choose](prompts/econ-games/tools/choose.md) | - |
| [econ-games/rules-public-goods](prompts/econ-games/rules-public-goods.md) | `endowment`, `multiplier`, `seats` |
| [econ-games/rules-ultimatum](prompts/econ-games/rules-ultimatum.md) | `pie` |
| [econ-games/rules-dilemma](prompts/econ-games/rules-dilemma.md) | `bothA`, `bothB`, `temptation`, `sucker` |
| [econ-games/horizon-known](prompts/econ-games/horizon-known.md) | `rounds` |
| [econ-games/horizon-hidden](prompts/econ-games/horizon-hidden.md) | - |
| [econ-games/block-head](prompts/econ-games/block-head.md) | `block`, `blocks` |
| [econ-games/task-contribute](prompts/econ-games/task-contribute.md) | `round`, `endowment` |
| [econ-games/task-offer](prompts/econ-games/task-offer.md) | `round`, `partner`, `pie` |
| [econ-games/task-respond](prompts/econ-games/task-respond.md) | `round`, `partner`, `offer`, `keep` |
| [econ-games/task-wait](prompts/econ-games/task-wait.md) | `round`, `partner` |
| [econ-games/task-choose](prompts/econ-games/task-choose.md) | `round`, `partner` |
| [econ-games/sits-out](prompts/econ-games/sits-out.md) | `round` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
