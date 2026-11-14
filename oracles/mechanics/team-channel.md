# Team channel

A private chat per team. Teams are fixed by the story; a resident posts to and reads only its own team's channel, with
a cap on posts per round so talk cannot crowd out play. The game (or the story) opens the next round. The mechanic
knows no game word: a "round" is whatever the caller says it is.

Copied from `mechanics/team-channel/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Teams.** `teams` lists the teams and their members; a resident belongs to at most one team.
2. **Posting.** `postTeam` posts to the own team's channel (`team_post`), at most `maxPostsPerMove` times per round.
   Another mechanic opens the next round with `team-channel.resetCap` (the games do it when the side on move changes).
3. **Reading.** `readTeam` returns the posts of the current epoch. With `notify` new posts are shown to the other
   members at the start of their turn.
4. **Others.** The strategy-brain counts successful team posts in a retro window
   (`postTool`), and chess and the card games use the API to wake advisors.

## Tools

### `postTeam`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes |  |

What the caller reads (team-channel/tools/postTeam):

> Post a message to your own team's private channel. Only your team members can read it.

### `readTeam`

- Suggested for: `resident`

No parameters.

What the caller reads (team-channel/tools/readTeam):

> Read the messages of your own team's private channel.

## Events

### `team_post`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `team` | string | yes |  |
| `from` | string | yes |  |
| `text` | string | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `teams` | record of string[] | `{}` | The teams and their members; a resident belongs to at most one team. |
| `maxPostsPerMove` | integer ≥ 1 | `2` | Posts a resident may make per round, until resetCap(team) opens the next round. |
| `notify` | boolean | `true` | Whether new team posts are shown to the other members at the start of their turn. |


