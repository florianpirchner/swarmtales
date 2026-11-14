# Progression

The levels of the city. Every resident stands on a level, reads its task with `getProblem` and submits the level's
password with `submitSolution`; a right code opens the door to the next level and pays the level's reward, a wrong one
costs points. The mechanic also opens and closes tools level by level, groups levels into acts, keeps the ranking and
writes the frame of every turn (task and status line).

Copied from `mechanics/progression/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Levels and doors.** `levels` lists the story's levels with title, reward, task text and the complete tool set of
   the level (not cumulative). A level's door opens at `opensAt`; with `holdAfter` whoever passes that door waits until
   every resident has (the Act I checkpoint). Above `lastLevel` a resident counts as finished and gets
   `finishedNotice`.
2. **Submitting.** `submitSolution` asks `puzzles` for the resident's solution. Right: `submission`, `level_up` with the
   reward booked in the `ledger`, a receipt (`receipts`) and `level_entered` on the next level (the script reacts to it).
   Wrong: a penalty from `penalty` (one number, or a ladder per act whose last step repeats), and after
   `maxAttemptsPerWindow` wrong codes in `attemptWindowMinutes` further submissions are refused for the window.
3. **Tools.** On entering a level the resident's tools become the level's set (`tools_unlocked`); `activeTools` lists
   what is open. `managed` tools stay locked until the script unlocks them (`unlockTools`).
4. **Acts.** `acts` names the first level of each act after the first. When the first resident enters an act, the
   silent `act_started` is written; `act_ended` when it ends. `goals`, `seal` and `tribunal` listen to both. Penalties
   and lost blames climb a ladder per act (`blamePenalty`, charged for `receipts`).
5. **Ranking and status.** `getStatus` shows minute, level, points, rank, unread DMs, marks, receipts and open tools;
   `listAgents` lists every resident with its level. The ranking (points, then level, then id, the exiled last) decides
   `survivors` at the end. The task of each turn is built from the level's template and the lines other mechanics add
   (names, marks, the holdout tribunal).

## Tools

### `getStatus`

- Suggested for: `resident`

No parameters.

What the caller reads (tools/getStatus):

> Shows your status: minute, level, points, rank, unread DMs, marks, your receipts and unlocked tools.

### `activeTools`

- Suggested for: `resident`

No parameters.

What the caller reads (tools/activeTools):

> Lists the tools you can use now. Every other tool answers TOOL_LOCKED until a level or a phase opens it.

### `getProblem`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer ≥ 1 | yes | Level number, e.g. 1 |

What the caller reads (tools/getProblem):

> Returns the task text of your current level or of a level you already reached.

### `submitSolution`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer ≥ 1 | yes | Level number |
| `code` | string | yes | Your solution |

What the caller reads (tools/submitSolution):

> Submits your solution for a level. A wrong code costs points.

### `listAgents`

- Suggested for: `resident`

No parameters.

What the caller reads (tools/listAgents):

> Lists every resident of the city with ID and current level.

## Events

### `submission`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `level` | integer | yes |  |
| `outcome` | string | yes |  |
| `deltaPoints` | number | yes |  |

### `level_up`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `from` | integer | yes |  |
| `to` | integer | yes |  |

### `level_entered`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `level` | integer | yes |  |

### `act_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `fromLevel` | integer ≥ 1 | yes |  |
| `residents` | string[] | yes |  |

### `act_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `fromLevel` | integer ≥ 1 | yes |  |

### `tools_unlocked`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `tools` | string[] | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `levels` | object[] | `[]` | The story's levels. |
| `levels[].number` | integer ≥ 1 | required | The level's number. |
| `levels[].title` | string | required | The level's title, shown in its task. |
| `levels[].reward` | number ≥ 0 | required | Points for passing the level. |
| `levels[].tools` | string[] | required | The complete tool set of this level (not cumulative). |
| `levels[].task` | string | required | The task text template with {placeholders}. |
| `levels[].opensAt` | integer ≥ 0 | unset | The minute the level's door opens; open from the start when left out. |
| `startLevel` | integer ≥ 1 | `1` | The level every resident starts on. |
| `lastLevel` | integer ≥ 0 | `0` | The highest playable level; above it a resident counts as finished. 0 means the story's last level. |
| `holdAfter` | integer ≥ 1 | unset | A door after this level: who passes it waits until every resident has. |
| `acts` | (integer ≥ 1)[] | `[]` | The first level of each act after the first. |
| `penalty` | integer ≥ 0 or (integer ≥ 0)[] | unset | Points per offence: one number, or a ladder whose last step repeats. |
| `blamePenalty` | integer ≥ 0 or (integer ≥ 0)[] | unset | Points per offence: one number, or a ladder whose last step repeats. |
| `maxAttemptsPerWindow` | integer ≥ 1 | `3` | Wrong codes allowed in one window before submissions are refused. |
| `attemptWindowMinutes` | integer ≥ 1 | `5` | Length of the window for wrong codes, in minutes. |
| `survivors` | integer ≥ 0 | `0` | How many residents survive to the end (a seat in the ranking). |
| `finishedNotice` | string | `""` | The notice a resident gets once it has solved every level. |
| `managed` | string[] | `[]` | Tools no level lists that stay locked until the director unlocks them (`unlockTools`), as the old engine kept every tool closed that neither the level nor an unlock opened; the tools a feature's own mechanic opens (votes, the seal, defy) are not listed. |


