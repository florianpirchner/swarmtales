# Script

The game's rules that fire on time or on events and act through the other mechanics, without a model (the old
story's Director). A rule has a trigger (a tick, every few ticks, the first entry of a level, everyone past a level, an
unanswered direct message, a split team, a collection's end, a petition's outcome), conditions, and actions. It is
how a game writes courier lines, the feast and other beats.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-script` |
| Id | `script` |
| Summary | The director's rules: courier lines, factor releases, the feast, standings and petitions. |
| Requires | none |
| Uses when loaded | `progression` (from [progression](../progression/README.md)), `level-pieces`, `exile` (from [exile](../exile/README.md)), `channels` (from [channels](../channels/README.md)) |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

<!-- /generated:glance -->

## How it plays

1. **Rules.** `rules` holds the game's rules in order. Each rule has an `id` (logged with every action it causes), a
   `trigger`, `when` conditions (`minLevelReached`, `competitorsAtLevel`, `castActive`, `collectionOpen`,
   `collectionEnded`, `petitionStatus`, `cooldown`, `onceOnly`) and `actions`.
2. **Time triggers.** `at`, `every`, `onAllPast`, `onUnansweredDm`, `onTeamSplit` and `onCollectionEnd` run in one
   staged call per tick, `directorMinute` of the actor `script`. The script stages it at the tick start after every
   mechanic whose tick start came first on `legacy` (old `HOOK_ORDER.minuteStarted`, the script last), so the
   petitions that expired are resolved before it, and it runs before the first activation of the tick. A game grants
   `directorMinute` to `script` (the default grant; without it the game is refused at load, `SWT-G015`), and a refused
   call ends the run.
3. **Event triggers.** On `level_entered` of `progression` (after the listener of `cast`) the `onEnter`,
   `onFirstEnter`, `onAllPast` and `onHolderBehind` rules run; on `petition_resolved` the opening rule's `onPass` or
   `onFail` and the `onPetitionResolved` rules. A listener runs after the step that wrote its event, so these lines
   land after the other lines of the call that caused them (after `submission`), in its frame.
4. **Actions.** Every action writes `director_action` first. What an action does (a call of another mechanic's tool as
   the actor `script`, and `director_skipped` when it is skipped) is the second half of the port (M5-32).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `directorMinute`

- Granted when the game lists no grants: `script`

No parameters.

What the caller reads ([script/tools/directorMinute](prompts/script/tools/directorMinute.md)):

> Runs the director's rules of the minute that start with time: after the petitions whose deadline came, before anything else of the minute. Called by the host for the script, never by a resident.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `director_action`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `rule` | string | yes | The rule |
| `action` | string | yes | The kind of the action |
| `actor` | string | no | Who the firing is about |
| `via` | string | no | The path of a nested list |
| `audit` | "NPC_LEVEL_SET" or "DIRECTOR_PRIVACY_BREACH" | no | An action the audit marks |

### `director_skipped`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `rule` | string | yes | The rule |
| `action` | string | yes | The kind of the action |
| `reason` | string | yes | Why |

### `standings_published`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | "bands" or "snapshot" | yes | Bands of ids, or the whole ranking |
| `postSeq` | integer | yes | The number of the board post |
| `safe` | string[] | no | The safe band |
| `edge` | string[] | no | The edge band |
| `out` | string[] | no | The band out |
| `exiled` | string[] | no | The banished |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | object[] | `[]` | The game's rules of the script (the old story's `director`), in the game's order. |
| `rules[].id` | string | required | The id of the rule |
| `rules[].trigger` | object | required | The trigger of a rule |
| `rules[].when` | object[] | required | Every condition must hold |
| `rules[].actions` | any[] | required | The actions, in order |
| `cast` | string[] | `[]` | The ids of the game's cast members: a post by an inactive one is skipped. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic provides no service to other mechanics.

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
| [script/tools/directorMinute](prompts/script/tools/directorMinute.md) | - |

<!-- /generated:prompts -->

## Example

A courier line on the first entry of level 2, and a rule that fires once when two residents stand on level 2:

```ts
script({
	rules: [
		{ id: "courier-2", trigger: { kind: "onFirstEnter", level: 2 }, when: [], actions: [{ kind: "post", author: "COURIER", text: "The city watches who shares." }] },
		{ id: "two-up", trigger: { kind: "every", minutes: 1 }, when: [{ kind: "minLevelReached", level: 2, count: 2 }, { kind: "onceOnly" }], actions: [] },
	],
}),
```

**What it reads.** The script calls no command of another mechanic; it reads through queries of the services it
uses: `exile` (who is in the city), `progression` (levels, bounds, the holders behind), `level-pieces` (a level's
teams, provided by `puzzles`) and `channels` (the direct messages with their numbers and the `answered` mark). A rule
that needs one of them when no loaded mechanic provides it ends the run. The old script read three things from the
log: the teams (now `level-pieces`, whose teams come in the order of their first member in the roster, not by the
deal's team index), a petition's status (now the script's own record of `petition_opened` and `petition_resolved`, in
its slice as `statuses`) and the cast's collections (the cast has no contract before M5-24: until then the script
reads as in a game without `cast`).

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md): **LH3, P9** the feast (a script beat with STEWARD) came
too early and too vague, and its factor became a public good (fixed on `legacy`); **P17** the Director's tone
overshoots (partly fixed).

What the port of M5-31 changed against the old platform: the services and events come from the providers' contracts,
not from `mechanics/shared`; the event triggers are listeners that run after the step (the old ones ran at once,
inside the call); the migration of the old file's version-0 slice is not carried (A56); the slice holds `statuses`.

## Tests

Offline. `test/script.test.ts`: the staged call of every tick (after the staged resolution of an expired petition,
before the first activation), the load refusal without the grant and the run's end on a refused call, the carried
description of `directorMinute` by its sha256 on `legacy`; every trigger kind but those of the cast with the
conditions and cooldowns, through the real `progression`, `exile`, `channels` and `petitions` and a stand-in of the
pieces; the run's end when a rule needs a mechanic the game did not load; replay and resume from every boundary.
