# team-channel

_To be written._

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

_To be written._

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

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
