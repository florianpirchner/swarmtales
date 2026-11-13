# Team channel

A private chat per team. Teams are fixed by the story; a resident posts to and reads only its own team's channel, with
a cap on posts per round so talk cannot crowd out play. The game (or the story) opens the next round. The mechanic
knows no game word: a "round" is whatever the caller says it is.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-team-channel` |
| Id | `team-channel` |
| Summary | Private team channels, pre-seeded, with a post cap per round. |
| Requires | none |
| Uses when loaded | none |
| Provides | `team-channel` |
| State | kept, snapshot slice version 1 |
| Facts | `posts` |
| Jobs | none |
| Stories | [chess](../../stories/chess/README.md), [harbor-lights](../../stories/harbor-lights/README.md) (`harbor-lights`, `harbor-lights-hard-strikes`), [lanterns](../../stories/lanterns/README.md) (all 2 variants), [morris-teams](../../stories/morris-teams/README.md) (all 2 variants), [tictactoe-teams](../../stories/tictactoe-teams/README.md) (all 5 variants) |

<!-- /generated:glance -->

## How it plays

1. **Teams.** `teams` lists the teams and their members; a resident belongs to at most one team.
2. **Posting.** `postTeam` posts to the own team's channel (`team_post`), at most `maxPostsPerMove` times per round.
   Another mechanic opens the next round with `team-channel.resetCap` (the games do it when the side on move changes).
3. **Reading.** `readTeam` returns the posts of the current epoch. With `notify` new posts are shown to the other
   members at the start of their turn.
4. **Others.** The [strategy-brain](../strategy-brain/README.md) counts successful team posts in a retro window
   (`postTool`), and chess and the card games use the API to wake advisors.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `postTeam`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes |  |

What the caller reads ([team-channel/tools/postTeam](prompts/team-channel/tools/postTeam.md)):

> Post a message to your own team's private channel. Only your team members can read it.

### `readTeam`

- Suggested for: `resident`

No parameters.

What the caller reads ([team-channel/tools/readTeam](prompts/team-channel/tools/readTeam.md)):

> Read the messages of your own team's private channel.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `teams` | record of string[] | `{}` | The teams and their members; a resident belongs to at most one team. |
| `maxPostsPerMove` | integer ≥ 1 | `2` | Posts a resident may make per round, until resetCap(team) opens the next round. |
| `notify` | boolean | `true` | Whether new team posts are shown to the other members at the start of their turn. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `team-channel`

Private team channels with a post cap per round.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `newEpoch` | command | team: string | boolean | Starts a new epoch for a team: readTeam shows only the posts from now on, and posts not yet shown are not announced. False when the team is unknown. |
| `resetCap` | command | team: string | boolean | Opens a new round for a team: every member may post again. False when the team is unknown. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [team-channel/tools/postTeam](prompts/team-channel/tools/postTeam.md) | - |
| [team-channel/tools/readTeam](prompts/team-channel/tools/readTeam.md) | - |
| [team-channel/posted](prompts/team-channel/posted.md) | `left` |
| [team-channel/empty](prompts/team-channel/empty.md) | - |
| [team-channel/notice](prompts/team-channel/notice.md) | `from`, `text` |

<!-- /generated:prompts -->

## Example

From [`stories/tictactoe-teams/story.ts`](../../stories/tictactoe-teams/story.ts):

```ts
teamChannel.with({ teams, maxPostsPerMove: 3 }),
```

Chess loads it with no teams for solo seats, so nobody is granted its tools.

## Lessons and loopholes

No row is about the channel itself; the cost of team talk is in **P116** and **P332**
([docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md)).

## Tests

[`test/mechanics/team-channel/team-channel.test.ts`](../../test/mechanics/team-channel/team-channel.test.ts): private
channels, the cap per round and `resetCap`, epochs, determinism, snapshots, documented options and a resident in two
teams refused.
