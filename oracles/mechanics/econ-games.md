# Econ games

Classic experimental-economics games for solo seats, played one after another, each over several rounds: a public
goods game, an ultimatum game in rotating pairs and a prisoner's dilemma in rotating pairs. The framing is neutral (a
shared fund, a split offer, an A-or-B choice) and no game is named, so a model has to play the numbers rather than
recite a textbook answer.

Copied from `mechanics/econ-games/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Blocks.** `blocks` lists the games in order with their rounds (`block_started`, `round_opened`). Whether seats know
   the number of rounds is `showHorizon` (off by default, against end-game defection).
2. **Public goods.** Every seat gets `endowment` tokens and secretly puts some into a fund (`contribute`); the fund is
   multiplied by `multiplier` and split equally.
3. **Ultimatum.** In rotating pairs the proposer offers a part of `pie` (`offer`); the responder accepts or rejects
   (`respond`); a rejection gives both nothing.
4. **Dilemma.** Rotating pairs choose A or B at the same time (`choose`) from the `dilemma` payoff table (A is
   cooperation).
5. **Sealed decisions.** Decisions are sealed (`decision_made`, for the human only) until the round resolves
   (`round_resolved`). A decision not made within `deadline` minutes takes the default (nothing put in, no offer,
   reject, B) and is marked missed. `viewTable` shows the seat's own game and history.
6. **Scoring.** Each game ends with `block_scored`: the distance from Nash play and from the social optimum, for the
   human only. It provides `brain-source` for the strategy-brain.

## Tools

### `viewTable`

- Suggested for: `resident`

No parameters.

What the caller reads (econ-games/tools/viewTable):

> Look at the table: the current task and its rules, the round, what you are asked to do now, your points and the results of your past rounds in this block.

### `contribute`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | integer ≥ 0 | yes | Tokens to put into the shared fund. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (econ-games/tools/contribute):

> Decide how many of your tokens you put into the shared fund this round (the rest you keep). Sealed: nobody sees it until everyone has decided. One decision per round.

### `offer`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | integer ≥ 0 | yes | Points offered to the partner. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (econ-games/tools/offer):

> Offer your partner a part of the sum this round; you keep the rest if they accept. Sealed until the partner answers. Only the proposer of the pair, once per round.

### `respond`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `accept` | boolean | yes | true accepts the offer, false rejects it. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (econ-games/tools/respond):

> Accept or reject the offer your partner made you this round. Accept: both get the split as offered. Reject: both get nothing this round. Only the responder of the pair, once per round.

### `choose`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `option` | "A" or "B" | yes | A or B. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (econ-games/tools/choose):

> Choose option A or option B this round. Sealed: your partner decides at the same time without seeing your choice. One decision per round.

## Events

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

## Options

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


