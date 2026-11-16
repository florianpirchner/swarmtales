# Team channel

A private chat per team. Teams are fixed by the game; a resident posts to and reads only its own team's channel, with
a cap on posts per round so talk cannot crowd out play. Another mechanic opens the next round. The mechanic knows no
game word: a "round" is whatever the caller says it is.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-team-channel` |
| Id | `team-channel` |
| Summary | Private team channels, pre-seeded, with a post cap per round. |
| Requires | none |
| Uses when loaded | none |
| Provides | `team-channel` |
| State | kept, snapshot slice version 1 |
| Games | [chess](../../games/chess/README.md), [harbor-lights](../../games/harbor-lights/README.md), [lanterns](../../games/lanterns/README.md), [morris](../../games/morris/README.md), [tictactoe](../../games/tictactoe/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Teams.** `teams` lists the teams and their members; a resident belongs to at most one team.
2. **Posting.** `postTeam` posts to the own team's channel (`team_post`), at most `maxPostsPerMove` times per round.
   Another mechanic opens the next round with `resetCap` of the `team-channel` service (the
   [grid](../grid/README.md) does it when the side on move changes).
3. **Reading.** `readTeam` returns the posts of the current epoch. With `notify` new posts are shown to the other
   members at the start of their turn.
4. **Others.** The [strategy-brain](../strategy-brain/README.md) counts successful team posts in a retro window
   (`postTool`).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `postTeam`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes |  |

What the caller reads ([team-channel/tools/postTeam](prompts/team-channel/tools/postTeam.md)):

> Post a message to your own team's private channel. Only your team members can read it.

### `readTeam`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([team-channel/tools/readTeam](prompts/team-channel/tools/readTeam.md)):

> Read the messages of your own team's private channel.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `team_post`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `from` | string | yes |  |
| `text` | string | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `teams` | record of string[] | `{}` | The teams and their members; a resident belongs to at most one team. |
| `maxPostsPerMove` | integer ≥ 1 | `2` | Posts a resident may make per round, until resetCap(team) opens the next round. |
| `notify` | boolean | `true` | Whether new team posts are shown to the other members at the start of their turn. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `team-channel`

Private team channels with a post cap per round.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `newEpoch` | command | team: string | boolean | Starts a new epoch for a team: readTeam shows only the posts from now on, and posts not yet shown are not announced. False when the team is unknown. |
| `resetCap` | command | team: string | boolean | Opens a new round for a team: every member may post again. False when the team is unknown. |

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
| [team-channel/tools/postTeam](prompts/team-channel/tools/postTeam.md) | - |
| [team-channel/tools/readTeam](prompts/team-channel/tools/readTeam.md) | - |
| [team-channel/posted](prompts/team-channel/posted.md) | `left` |
| [team-channel/empty](prompts/team-channel/empty.md) | - |
| [team-channel/notice](prompts/team-channel/notice.md) | `from`, `text` |

<!-- /generated:prompts -->

## Example

From [`games/tictactoe/game.ts`](../../games/tictactoe/game.ts):

```ts
teamChannel({ teams, maxPostsPerMove: 3 }),
```

Each team of three may post three times per move of its side.

## Lessons and loopholes

No row is about the channel itself; the cost of team talk is in **P116** and **P332**
([docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md), recorded on the old platform).

## Tests

[`test/team-channel.test.ts`](test/team-channel.test.ts): private channels, the cap per round and `resetCap`, epochs,
determinism, snapshots, documented options and a resident in two teams refused.
[`test/carried.test.ts`](test/carried.test.ts) holds the prompt files, tools and events to those of the old platform,
byte for byte; [`test/contract.test.ts`](test/contract.test.ts) does the same for the service contract.
