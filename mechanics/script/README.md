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
| Uses when loaded | `channels` (from [channels](../channels/README.md)), `progression` (from [progression](../progression/README.md)), `cast` (from [cast](../cast/README.md)), `petitions` (from [petitions](../petitions/README.md)), `ledger` (from [ledger](../ledger/README.md)), `level-pieces` (from [puzzles](../puzzles/README.md)), `exile` (from [exile](../exile/README.md)), `deal` (from [puzzles](../puzzles/README.md)) |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [whispers](../../games/whispers/README.md) |

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
   `onFail` and the `onPetitionResolved` rules; on `cast_collected` of `cast` (a new sender in collections) the
   `onCollect` rules of each collection. A listener runs after the step that wrote its event, so these lines land
   after the other lines of the call that caused them (after `submission`), in its frame.
4. **Actions.** Every action writes `director_action` first, then runs as a command of the mechanic that owns it, at
   once and in the frame of the firing, and writes `director_skipped` with the old reason when it (or part of it) was
   skipped:

   | Action | Through | Skipped when |
   | --- | --- | --- |
   | `post` | `channels.post` | its author is a cast member that is not active |
   | `notify` | `channels.notify`, signed `CITY`, per target | the target reaches nobody, or lists unknown ids |
   | `dm` | `cast.isActive`, then `channels.deliver` from the member, per target | the member is not active; else as `notify` |
   | `grant`, `fine` | `ledger.mint`, `ledger.burn`, per target | as `notify` |
   | `escrowTransfer` | `cast.escrow`, per target | as `notify`; a refused payment adds `<resident>: <code>` |
   | `unlockTools` | `progression.unlock`, per target | as `notify` |
   | `setCastLevel`, `revealCast`, `retireCast` | `cast.setLevel`, `cast.reveal`, `cast.retire` | the member is not hidden, or already retired |
   | `openPetition` | `petitions.open`; its `onPass` and `onFail` run on `petition_resolved` with `via` | the id was opened before |
   | `publishStandings` | `progression.ranking` and `bounds`, `exile`, then `channels.post`, then `standings_published` | never |
   | `collectDms`, `revealCollection`, `lottery` | `cast.startCollection`, `cast.revealCollection`, `cast.drawLottery`; a lottery's `then` runs for the winner with `via` | the collection exists already, does not exist, or has no senders |
   | `revealFactor` | `deal.revealFactor` of `puzzles`: on the `board`, or privately to the residents the target reaches | the refusal's detail (not played, no factors, a city factor per team); as `notify`; `<ids> already hold(s) it` when it reached nobody new |

   A target is `actor` (unless banished), `all` (everyone in the city), a list of ids or `{ onLevel }`. A text takes
   `{actor}` (in a private text the recipient when the firing has none), `{other}`, `{minute}` (the tick), `{level}`,
   `{survivors}`, `{agents}`, `{otherLevel}`, `{piece}` and `{seats}`; an unknown placeholder ends the run.

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
| [script/standings-bands](prompts/script/standings-bands.md) | `minute`, `safe`, `edge`, `out` |
| [script/standings-bands-exiled](prompts/script/standings-bands-exiled.md) | `minute`, `safe`, `edge`, `out`, `exiled` |
| [script/standings-snapshot](prompts/script/standings-snapshot.md) | `minute`, `rows` |
| [script/standings-row](prompts/script/standings-row.md) | `rank`, `agent`, `points`, `level` |

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

**What it reads.** Through queries of the services it uses: `exile` (who is in the city), `progression` (levels,
bounds, the holders behind, the ranking), `level-pieces` (a level's teams, provided by `puzzles`), `channels` (the
direct messages with their numbers and the `answered` mark), `cast` (a collection by name, whether a member is
active) and `deal` (the city factors, provided by `puzzles`). A rule that needs one of them when no loaded mechanic provides it ends the run; a collection reads as not
started when `cast` is not loaded. The old script read three things from the log: the teams (now `level-pieces`,
whose teams come in the order of their first member in the roster, not by the deal's team index), a petition's status
(now the script's own record of `petition_opened` and `petition_resolved`, in its slice as `statuses`) and the cast's
collections (now the query `collection` of `cast`).

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md): **LH3, P9** the feast (a script beat with STEWARD) came
too early and too vague, and its factor became a public good (fixed on `legacy`); **P17** the Director's tone
overshoots (partly fixed).

What the port of M5-31 changed against the old platform: the services and events come from the providers' contracts,
not from `mechanics/shared`; the event triggers are listeners that run after the step (the old ones ran at once,
inside the call); the migration of the old file's version-0 slice is not carried (A56); the slice holds `statuses`.
M5-32: the actions are commands of the services the script uses, as on `legacy`, not staged tool calls (erratum of
M5-32: no oracle file holds a call of `script` but `directorMinute`); `onCollect` runs after the step that collected,
where the old listener ran at once. M5-69: `dm` goes through `channels.deliver` (M5-65) and `revealFactor` through the
command `revealFactor` of `deal` (M5-64, erratum J155), with the old recipients and reasons; the tick start of the
script names `standoff` in its `after`, as the old order did (decisions A77, A78).

## Tests

Offline. `test/script.test.ts`: the staged call of every tick (after the staged resolution of an expired petition,
before the first activation), the load refusal without the grant and the run's end on a refused call, the carried
description of `directorMinute` by its sha256 on `legacy`; every trigger kind but those of the cast with the
conditions and cooldowns, through the real `progression`, `exile`, `channels` and `petitions` and a stand-in of the
pieces; the run's end when a rule needs a mechanic the game did not load; replay and resume from every boundary.
`test/actions.test.ts` (M5-32, the scenarios of the old `test/mechanics/script/differential.test.ts`, whose old
engine is gone): every action kind through the real `channels`, `ledger`, `progression`, `petitions`, `exile` and
`cast`, line for line with the old skip reasons; nested petitions and the lottery with `via`; a collection with
`onCollect`, `collectionOpen`, `collectionEnded` and `onCollectionEnd`, fed by a resident's `sendDM` to a member
through the real routing of `channels` and `figures` of the cast; a member's `dm` through `channels.deliver`; the
texts of a holder behind and the bands with the banished; the run's end on `revealFactor` without `deal`; the expiry
of the petitions and the time triggers after a `standoff` loaded after both; the four standings prompts by their sha256 on `legacy`; replay and resume from every boundary.
`test/factors.test.ts` (M5-69): `revealFactor` against the real `puzzles`, on the board and privately, with every old
skip reason; replay and resume.
