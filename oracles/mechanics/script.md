# Script

The story's director: rules that fire on time or on events and act through the other mechanics. A rule has a trigger
(a minute, every few minutes, the first entry of a level, everyone past a level, an unanswered DM, a split team, a
collection's end, a petition's outcome), conditions, and actions (post on the board, notify, DM as a cast member,
reveal a city factor, open a petition, collect DMs, draw a lottery, grant or fine points, publish standings, unlock
tools). It is how a story writes courier lines, the feast and other beats without a model.

Copied from `mechanics/script/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Rules.** `rules` holds the story's `director` block in order. Each rule has an `id` (logged with every action it
   causes), a `trigger`, `when` conditions (`minLevelReached`, `competitorsAtLevel`, `castActive`, `collectionOpen`,
   `collectionEnded`, `petitionStatus`, `cooldown`, `onceOnly`) and `actions`.
2. **Event triggers.** On `level_entered` (from `progression`) the `onEnter`, `onFirstEnter`, `onAllPast` and
   `onHolderBehind` rules run at once, so their lines land before the submission's reply. `cast_collected` runs
   `onCollect`; `petition_resolved` runs the opening rule's `onPass` or `onFail` and the `onPetitionResolved` rules.
3. **Time triggers.** `at`, `every`, `onAllPast`, `onUnansweredDm`, `onTeamSplit` and `onCollectionEnd` run in one staged
   call per minute, `directorMinute`, after the petitions whose deadline came. The story must grant `directorMinute`
   (and `resolvePetition`) to `script`; a refused call ends the run.
4. **Actions.** Each action is a command of the mechanic that owns it: `post`, `notify`, `dm` (`channels`, as a cast
   member), `revealFactor` (`puzzles`), `openPetition` (`petitions`), `collectDms`, `revealCollection`, `lottery`,
   `revealCast`, `retireCast`, `setCastLevel`, `escrowTransfer` (`cast`), `grant`, `fine` (`ledger`),
   `publishStandings`, `unlockTools` (`progression`). Every action writes `director_action`; one that cannot run (a post
   by an inactive cast member, a condition that no longer holds) writes `director_skipped`.

## Tools

### `directorMinute`

- Suggested for: `script`
- Serves only: `script`

No parameters.

What the caller reads (tools/directorMinute):

> Runs the director's rules of the minute that start with time: after the petitions whose deadline came, before anything else of the minute. Called by the host for the script, never by a resident.

## Events

### `director_action`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `rule` | string | yes |  |
| `action` | string | yes |  |
| `actor` | string | no |  |
| `via` | string | no |  |
| `audit` | "NPC_LEVEL_SET" or "DIRECTOR_PRIVACY_BREACH" | no |  |

### `director_skipped`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `rule` | string | yes |  |
| `action` | string | yes |  |
| `reason` | string | yes |  |

### `standings_published`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | "bands" or "snapshot" | yes |  |
| `postSeq` | integer | yes |  |
| `safe` | string[] | no |  |
| `edge` | string[] | no |  |
| `out` | string[] | no |  |
| `exiled` | string[] | no |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | object[] | `[]` | The story's director rules (`story.director`), in the story's order. |
| `rules[].id` | string | required |  |
| `rules[].trigger` | object | required |  |
| `rules[].when` | object[] | required |  |
| `rules[].actions` | any[] | required |  |
| `cast` | string[] | `[]` | The ids of the story's cast members (`Object.keys(story.cast)`): a post by an inactive one is skipped. |


