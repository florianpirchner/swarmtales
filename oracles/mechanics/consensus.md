# Consensus

A team must agree before it acts. The captain proposes a value for a gated tool (`proposeMove`), the other members
vote (`castVote`), and the gated tool (for example `playMove`) is refused unless the captain calls it with exactly the
value that won. If a team cannot agree in time, a seeded random legal move is played for it. The mechanic knows no
game: the game tells it who is on move and which values are legal.

Copied from `mechanics/consensus/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Proposal and vote.** The captain of the team on move proposes a value for `param` of `tool` (`move_proposed`);
   the proposal is not a vote. The team without its captain votes (`vote_cast`). With `majority` the proposal wins with
   more than half of the voters (`consensus_reached`); a tie is no consensus and the captain cannot override it. A
   proposal is rejected as soon as a majority is out of reach. A team of one agrees with itself at once.
2. **The gate.** A `rule` handler refuses the gated tool unless the caller is the captain and the parameter equals the
   agreed value. Residents of the waiting team and non-members are refused.
3. **Deadlock.** A round is a whole minute in which the team was on move from the start and nothing was played. After
   `maxRounds` rounds, `forfeitRandomLegalMove` plays a random legal value (seeded, the same in every replay) through
   the game (`consensus_forfeited`); `refuse` writes `consensus_deadlocked` once and keeps the gate shut.
4. **An invalid match.** With `maxConsecutiveForfeits` that many forfeits in a row, without an agreed move between
   them, write `match_invalid` and end the match, so a match nobody played is not mistaken for a result.

The game provides the `consensus-source` API: grid-game and morris do.

## Tools

### `proposeMove`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `cell` | integer | yes |  |
| `reason` | string | yes |  |

What the caller reads (consensus/tools/proposeMove):

> Captain only: propose the move your team plays next, with a short reason. The other members vote on it.

### `castVote`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `agree` | boolean | yes |  |
| `reason` | string | yes |  |

What the caller reads (consensus/tools/castVote):

> Vote on your captain's proposed move: agree true or false, with a short reason. The captain does not vote.

## Events

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

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `tool` | string | `"playMove"` | The gated tool: it is refused unless the team agreed on the value of `param`. |
| `param` | string | `"cell"` | The parameter of the gated tool that the vote is about. |
| `rule` | "majority" | `"majority"` | When a proposal wins: more than half of the voters (the team without its captain) agree; a tie is no consensus. |
| `maxRounds` | integer ≥ 1 | `3` | Rounds (whole minutes with the team on move) without a played move before the deadlock rule applies. |
| `onDeadlock` | "forfeitRandomLegalMove" or "refuse" | `"forfeitRandomLegalMove"` | At the deadlock: play a random legal value for the team and count a forfeit, or only keep refusing the gated tool. |
| `maxConsecutiveForfeits` | integer ≥ 0 | `0` | Forfeits in a row with no agreed move between them after which the match is invalid (match_invalid) and the run ends; 0 = off. |
| `teams` | record of string[] | `{}` | The teams that must agree, by the names the ConsensusSourceApi provider uses. |


