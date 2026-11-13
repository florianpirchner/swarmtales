# consensus

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-consensus` |
| Id | `consensus` |
| Summary | A team must agree before a gated tool call is released. |
| Requires | `consensus-source` (from [grid-game](../grid-game/README.md), [morris](../morris/README.md)) |
| Uses when loaded | none |
| Provides | `consensus` |
| State | kept, snapshot slice version 1 |
| Facts | `agreed`, `forfeits` |
| Jobs | none |
| Stories | [morris-teams](../../stories/morris-teams/README.md) (all 2 variants), [tictactoe-teams](../../stories/tictactoe-teams/README.md) (all 5 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `proposeMove`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `cell` | integer | yes |  |
| `reason` | string | yes |  |

What the caller reads ([consensus/tools/proposeMove](prompts/consensus/tools/proposeMove.md)):

> Captain only: propose the move your team plays next, with a short reason. The other members vote on it.

### `castVote`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agree` | boolean | yes |  |
| `reason` | string | yes |  |

What the caller reads ([consensus/tools/castVote](prompts/consensus/tools/castVote.md)):

> Vote on your captain's proposed move: agree true or false, with a short reason. The captain does not vote.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `move_proposed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `captain` | string | yes |  |
| `cell` | integer | yes |  |
| `reason` | string | yes |  |

### `vote_cast`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `voter` | string | yes |  |
| `cell` | integer | yes |  |
| `agree` | boolean | yes |  |
| `reason` | string | yes |  |
| `outcome` | "pending" or "reached" or "rejected" | yes |  |

### `consensus_reached`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `cell` | integer | yes |  |
| `agree` | integer | yes |  |
| `disagree` | integer | yes |  |

### `consensus_forfeited`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `cell` | integer | yes |  |
| `rounds` | integer | yes |  |

### `consensus_deadlocked`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `rounds` | integer | yes |  |

### `match_invalid`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | yes |  |
| `forfeits` | integer | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `tool` | string | `"playMove"` | The gated tool: it is refused unless the team agreed on the value of `param`. |
| `param` | string | `"cell"` | The parameter of the gated tool that the vote is about. |
| `rule` | "majority" | `"majority"` | When a proposal wins: more than half of the voters (the team without its captain) agree; a tie is no consensus. |
| `maxRounds` | integer ≥ 1 | `3` | Rounds (whole minutes with the team on move) without a played move before the deadlock rule applies. |
| `onDeadlock` | "forfeitRandomLegalMove" or "refuse" | `"forfeitRandomLegalMove"` | At the deadlock: play a random legal value for the team and count a forfeit, or only keep refusing the gated tool. |
| `maxConsecutiveForfeits` | integer ≥ 0 | `0` | Forfeits in a row with no agreed move between them after which the match is invalid (match_invalid) and the run ends; 0 = off. |
| `teams` | record of string[] | `{}` | The teams that must agree, by the names the ConsensusSourceApi provider uses. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `consensus`

Resets the gate between games.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `reset` | command | - | null | Forgets every proposal, vote, agreement and timer (a new game begins); the forfeit counters stay. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [consensus/tools/proposeMove](prompts/consensus/tools/proposeMove.md) | - |
| [consensus/tools/castVote](prompts/consensus/tools/castVote.md) | - |
| [consensus/proposed](prompts/consensus/proposed.md) | `cell` |
| [consensus/vote-recorded](prompts/consensus/vote-recorded.md) | - |
| [consensus/reached](prompts/consensus/reached.md) | `cell` |
| [consensus/rejected](prompts/consensus/rejected.md) | `cell` |
| [consensus/vote-request](prompts/consensus/vote-request.md) | `captain`, `cell`, `reason` |
| [consensus/go-ahead](prompts/consensus/go-ahead.md) | `cell` |
| [consensus/rejected-notice](prompts/consensus/rejected-notice.md) | `cell` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
