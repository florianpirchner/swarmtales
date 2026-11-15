# Goals

Secret goals: what a resident wants in one act. At the start of an act every resident is dealt a seeded goal on
someone else (keep a resident in the city, see one exiled, end with more points), or to lead factions, or to inherit.
Only the holder is told; if the goal holds when the act ends the city pays a bonus, and then it reads every goal out.
Ported from the old platform (M5-40).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-goals` |
| Id | `goals` |
| Summary | Secret goals per resident and act. |
| Requires | `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | `exile` (from [exile](../exile/README.md)), `motives` (from [motives](../motives/README.md)), `identity` (from [names](../names/README.md)) |
| Provides | `goals` |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

<!-- /generated:glance -->

## How it plays

1. **The deal.** When `progression` writes `act_started` for a level in `acts`, every resident still in the city is
   dealt one goal (`goal_dealt`, then a private notice `texts.notice`), once per act, from the stream
   `rng("goals", act)`. The kind follows the strongest drive of the resident's core motive that `matches` maps (asked
   of `motives` through the service `motives`), against it for about `againstCoreMotive` of the residents, at random
   without a core motive; `lead` only with `factions`. Every `protect(X)` gets an `exile(X)` in other hands when the
   city is large enough, and the targets spread.
2. **While the act runs.** The goal is the resident's part of the status line (`texts.status`, in the old place after
   the points). The facts `texts` (the gamemaker's "secret goal") and `running` show the goals of running acts; the
   service `goals` answers `goalOf`, and takes the leaders of a tribunal's factions (`noteLeaders`).
3. **Exile and will.** When `exile` writes `exiled`, the banished resident's goal is void (`goal_resolved` with
   `void`) and read out on the board (`texts.exiledReadout`). When it writes `last_will`, each heir counts for `heir`.
4. **The act's end.** When `progression` writes `act_ended`, after the seal's listener, every goal still held is
   checked (`protect` and `exile` through `isExiled` of `exile`, `outrank` through the ledger's balances), the bonus
   is minted, the holder is told, and the board reads them all out (`texts.readout`).
5. **On the tools of others.** A Director's note (the tools of `noteTools`, by bare name, default `notify` and
   `boardNote` of `channels`) that names another resident in a sentence with a word about a core motive or a goal, or
   gives a goal away with its target, is refused with `PRIVATE_BLOCKED` in a `rule` handler. The check is the carried
   `characterLeaks` of `@swarmtales/mechanic-motives/rules` with the goals and no drive cues (erratum J164).

**Not done here:** the old snapshot's slice (version 0): an old snapshot is not resumed here (decision A56).

## Which refusal comes first

A note that gives away a core motive and a goal is refused by whichever of `motives` and `goals` is loaded first, and
names only the residents that handler found (the old one check named both).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `goal_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | integer | yes | The first level of the act |
| `agent` | string | yes | A resident id, for example `A03` |
| `goal` | object | yes | A secret goal |
| `text` | string | yes | The goal in the game's words |

### `goal_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | integer | yes | The first level of the act |
| `agent` | string | yes | A resident id, for example `A03` |
| `goal` | object | yes | A secret goal |
| `fulfilled` | boolean | yes | Whether it held |
| `void` | boolean | no | True when the holder was exiled before the act ended |
| `bonus` | integer | yes | The points paid |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `acts` | (integer ≥ 1)[] | `[]` | The first level of each act that deals goals. |
| `bonus` | integer ≥ 0 | `0` | Points a fulfilled goal pays at the act's end. |
| `leadTribunals` | integer ≥ 1 | `1` | How many tribunals a `lead` goal asks the holder to lead a faction in. |
| `againstCoreMotive` | number ≥ 0 ≤ 1 | `0` | The share of residents whose goal does not follow their core motive. |
| `matches` | object | `{}` | The drive ids that suggest each kind of goal. |
| `matches.protect` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `matches.exile` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `matches.outrank` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `matches.lead` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `matches.heir` | string[] | unset | Drive ids whose holders get this kind of goal. |
| `factions` | boolean | `false` | Whether the city holds faction drafts: `lead` goals need them. |
| `texts` | object | required | The story's words. |
| `texts.protect` | string | required | The goal `protect`; {target}. |
| `texts.exile` | string | required | The goal `exile`; {target}. |
| `texts.outrank` | string | required | The goal `outrank`; {target}. |
| `texts.lead` | string | required | The goal `lead`; {count}. |
| `texts.heir` | string | required | The goal `heir`. |
| `texts.notice` | string | required | Private notice when a goal is dealt; {goal}, {bonus}. |
| `texts.status` | string | required | Status line part while the act runs; {goal}, {bonus}. |
| `texts.fulfilled` | string | required | Private notice when a goal is fulfilled; {goal}, {bonus}. |
| `texts.missed` | string | required | Private notice when it is not; {goal}. |
| `texts.exiledReadout` | string | required | Board post when an exiled resident leaves; {resident}, {goal}. |
| `texts.readout` | string | required | Board post at the act's end; {list}. |
| `noteTools` | string[] | `["notify","boardNote"]` | The tools of a Director's note whose `text` (or `reason`) is checked for a resident's secret goal (`PRIVATE_BLOCKED`); `notify` is read by its `agent`, the others by the board. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `goals`

The secret goals of a running act.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `goalOf` | query | resident: string | { act: integer, kind: string, target?: string, text: string } or null | The goal the resident holds in an act still running, in the game's words, or null (old `goalOf`). |
| `noteLeaders` | command | leaders: string[] | null | Faction leaders of a tribunal: one more leadership each in every running act (old `noteLeaders`; the tribunal's leaders). |

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
| [goals/notes/private-core-motive](prompts/goals/notes/private-core-motive.md) | `who` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [ledger(), channels(), exile(), motives(catalogue), progression(levels), goals({ ...story.goals, factions: true })],
```

## Lessons and loopholes

None recorded that concern the goals themselves; see the City of Keys rows of
[docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md).

## Tests

[`test/goals.test.ts`](test/goals.test.ts): the deal and the resolution of `cityofkeys-act1-s7` and
`cityofkeys-act1-s11` line for line (the real `motives` deals the drives; the acts and the exile are stand-ins), the
deal over 6, 12 and 48 residents, every kind resolved, the void goal of an exiled resident, the heirs of a will, the
leaders through the service, the status part and the facts, the goal check of a Director's note, the documented
options and the resume at every boundary.
