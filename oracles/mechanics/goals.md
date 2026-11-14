# Goals

Secret goals. At the start of an act every resident is dealt one private goal (keep someone in the city, see someone
exiled, end ahead of someone, lead factions in tribunals, or inherit), mostly matched to its core motive. The goal
shows in its status line while the act runs; at the act's end the city reads every goal out and pays a bonus for each
fulfilled one.

Copied from `mechanics/goals/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **The deal.** `progression` writes the silent `act_started` when an act begins; on the acts listed in `acts` the
   mechanic deals a goal to every resident in the city (`goal_dealt`) and tells it privately (`texts.notice`). The kind
   follows the resident's core motive (`matches` maps drive ids from `motives` to goal kinds); a share
   `againstCoreMotive` gets a goal that does not follow it. `lead` goals are dealt only when the city holds faction
   drafts (`factions`) and ask for `leadTribunals` tribunals.
2. **While the act runs.** The status line shows the goal and its bonus (`texts.status`). A resident who is exiled
   loses its goal: it is void and read out on the board (`texts.exiledReadout`).
3. **The resolution.** On `act_ended` every goal is checked against the act's outcome (who is still in the city, who
   was exiled, the ranking, the factions led, the bequests received), the holders are told (`texts.fulfilled` or
   `texts.missed`), a fulfilled goal pays `bonus` points through the `ledger` (`goal_resolved`), and the board reads
   all goals out (`texts.readout`).

The goals deal before the seal's auction begins and resolve after the seal ends (listener order).

## Tools

This mechanic defines no tools.

## Events

### `goal_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | integer | yes |  |
| `agent` | string | yes |  |
| `goal` | object | yes |  |
| `text` | string | yes |  |

### `goal_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `act` | integer | yes |  |
| `agent` | string | yes |  |
| `goal` | object | yes |  |
| `fulfilled` | boolean | yes |  |
| `void` | boolean | no |  |
| `bonus` | integer | yes |  |

## Options

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


