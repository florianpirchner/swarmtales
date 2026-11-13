# Script

The story's director: rules that fire on time or on events and act through the other mechanics. A rule has a trigger
(a minute, every few minutes, the first entry of a level, everyone past a level, an unanswered DM, a split team, a
collection's end, a petition's outcome), conditions, and actions (post on the board, notify, DM as a cast member,
reveal a city factor, open a petition, collect DMs, draw a lottery, grant or fine points, publish standings, unlock
tools). It is how a story writes courier lines, the feast and other beats without a model.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-script` |
| Id | `script` |
| Summary | The director's rules: courier lines, factor releases, the feast, standings and petitions. |
| Requires | none |
| Uses when loaded | `channels` (from [channels](../channels/README.md)), `progression` (from [progression](../progression/README.md)), `cast` (from [cast](../cast/README.md)), `petitions` (from [petitions](../petitions/README.md)), `ledger` (from [ledger](../ledger/README.md)), `puzzles` (from [puzzles](../puzzles/README.md)), `exile` (from [exile](../exile/README.md)) |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Facts | none |
| Jobs | `minuteRan` |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

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

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `directorMinute`

- Suggested for: `script`
- Serves only: `script`

No parameters.

What the caller reads ([tools/directorMinute](prompts/tools/directorMinute.md)):

> Runs the director's rules of the minute that start with time: after the petitions whose deadline came, before anything else of the minute. Called by the host for the script, never by a resident.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | object[] | `[]` | The story's director rules (`story.director`), in the story's order. |
| `rules[].id` | string | required |  |
| `rules[].trigger` | object | required |  |
| `rules[].when` | object[] | required |  |
| `rules[].actions` | any[] | required |  |
| `cast` | string[] | `[]` | The ids of the story's cast members (`Object.keys(story.cast)`): a post by an inactive one is skipped. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic provides no API to other mechanics.

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/directorMinute](prompts/tools/directorMinute.md) | - |
| [script/standings-bands](prompts/script/standings-bands.md) | `minute`, `safe`, `edge`, `out` |
| [script/standings-bands-exiled](prompts/script/standings-bands-exiled.md) | `minute`, `safe`, `edge`, `out`, `exiled` |
| [script/standings-snapshot](prompts/script/standings-snapshot.md) | `minute`, `rows` |
| [script/standings-row](prompts/script/standings-row.md) | `rank`, `agent`, `points`, `level` |

<!-- /generated:prompts -->

## Example

Courier lines of the City of Keys ([`stories/cityofkeys/story.ts`](../../stories/cityofkeys/story.ts)), written with
the builder helpers:

```ts
director: [
	onFirstEnter(2, [act.post("COURIER", "The city watches who shares.")], { id: "courier-2" }),
	onFirstEnter(3, [act.post("COURIER", "Whoever takes without giving will not be forgotten.")], { id: "courier-3" }),
	...
],
```

The city runner turns the block into options with `script.with(scriptOptionsFromStory(story))`.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH3, P9** the feast (a script beat with STEWARD) came too early and too vague, and its factor became a public
  good. Fixed.
- **P17** the director's tone overshoots. Partly fixed.

## Tests

- [`test/mechanics/script/differential.test.ts`](../../test/mechanics/script/differential.test.ts): time triggers,
  standings, points, notices, cast, petitions with their chains, collections and the lottery, teams and the city
  factor, against the old `Director`.
- [`golden.test.ts`](../../test/mechanics/script/golden.test.ts): the director's lines and windows of the golden run.
- [`resume.test.ts`](../../test/mechanics/script/resume.test.ts): the version-0 migration and a resumed run on the old
  engine and the new host.
