# Progression

Levels and their doors. Every resident climbs the same levels; a level opens with a code, which the resident submits
with `submitSolution`. A wrong code costs points on a ladder, and only a few wrong codes are taken in a window. The
progression writes the task of a level and its parts of the status line into a resident's turn, and answers the
looks `getStatus`, `getProblem`, `listAgents` and `activeTools`. It also opens and closes tools level by level, groups
the levels into acts and keeps the ranking. Ported from the old platform in two halves (M5-19 and M5-20).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-progression` |
| Id | `progression` |
| Summary | Levels, submissions, doors, acts, the tool locks per level, the ranking and the task and status lines of a turn. |
| Requires | `ledger` (from [ledger](../ledger/README.md)), `channels` (from [channels](../channels/README.md)), `level-pieces` |
| Uses when loaded | `identity`, `receipt-source` (from [receipts](../receipts/README.md)), `allowance`, `exile` (from [exile](../exile/README.md)), `cast-extras` |
| Provides | `progression` |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

<!-- /generated:glance -->

## How it plays

1. **Levels.** Every resident starts on `startLevel`. A level's task is its template (`task`) with the placeholders
   filled: the puzzle's values (`length`, `overlap`, `fragment`, `digits`, `factors`, asked of the service
   `level-pieces`), the team (`partner`, `members`, `leader`, `teamSize`), and `level`, `title`, `reward`,
   `survivors`, `agents`, `penalty` and `blamePenalty`. A resident reads the task once per level, in its turn input
   (kind `task`); past the last level it reads the game's `finishedNotice` once.
2. **A submission.** `submitSolution(level, code)` checks, in the old order: the level is the resident's own
   (`WRONG_LEVEL`), not solved already (`ALREADY_SOLVED`), its door is open on the clock (`DOOR_CLOSED`), the code has
   the length of the solution and, on an additive level, digits only (`INVALID_FORMAT`), and the window of wrong codes
   is not full (`RATE_LIMITED`, also for a right code). A right code mints the reward (`level N solved`), names the
   receipt of the solved level (asked of `receipt-source`, `none` without a provider) and enters the next level; a
   wrong one burns the next step of the `penalty` ladder (`level N wrong submission`). Every submission writes
   `submission` last, after `level_up`, the notices and `level_entered`.
3. **Doors.** With `holdAfter`, a resident who passes that level waits at the door (`level_up` at the pass, a notice
   `door-wait`); the door opens at the start of the next tick in which every resident still in the city has passed
   it: the levels up to the next door are dealt (`deal` of `level-pieces`) and the waiting residents enter in roster
   order. A door is tried again after the tick of the tribunal, which may have banished the last one behind. A level
   with `opensAt` opens on the clock: before it, its task is the closed-door text, and when it opens every resident
   waiting on it gets the task as a notice.
4. **Holders.** On an additive level, a resident behind who holds what the arriving resident needs is told privately
   at once, with what a direct message costs it (`priceOf` of `allowance`).
5. **Status.** The progression writes the parts `minute` (order 100), `level` (200), `rank` (400) and, before an
   additive door, the code that awaits its confirmation (800), each of kind `status`; the game joins them with the
   parts of other mechanics (`{ kind: "status", join: " · " }`).
6. **Names.** With a provider of `identity`, every reply, refusal detail and task shows names in place of ids.

7. **Tools.** The progression manages every tool some level lists and the game's `managed` tools: at the start of
   the run it locks, for every resident, each one its level does not list (the kernel's `tool_locked`), and on
   entering a level the resident's tools become that level's set (`tool_unlocked`, `tool_locked`), before `level_up`.
   Past the last level every level's tools are open. A caller opens more with `unlock` (`tools_unlocked`, kept across
   levels). A tool no loaded mechanic defines is skipped. At the gate of the exile `submitSolution` is refused
   (`TOOL_LOCKED`), the other tools stay. `activeTools` and `getStatus` list the open tools in the old order.
8. **Acts.** `acts` names the first level of each act after the first. The first act begins at the start of the run;
   when the first resident enters an act, every earlier act ends (`act_ended`), `act_started` names the residents
   still in the city, and the ladders of wrong codes and lost blames start again. A caller may end an act
   (`endAct`); at the end of the run every act begun ends, in level order.
9. **Service.** `progression` answers the level and the solves of a resident (`levelOf`, `hasPassed`, `hasSolved`,
   `passed`, `lastProgress`), the acts, the door (`door`, `doorShut`, `openDoor`, and `releaseDoor`, which opens it
   at the next tick whoever has passed), the ranking (the banished last, then points, level and id), the next
   penalties and the charge of a lost blame (`chargeBlame`, booked by the caller), the holders behind, the door clock
   and the bounds (`startLevel`, `lastLevel`, `survivors`). `listAgents` adds the figures of `cast-extras` when a
   provider is loaded.

**Not done here.** The lines the old task carried under it (the names line, the holdout rule, the marks terms) are
the lines of those mechanics (erratum J31); the unread direct messages and the window line of `getStatus` need
queries of `channels` that it does not have yet (`unread DMs: 0`, erratum J32). The old `firstSolveMinute` is not
offered: `cast` reads the first solve of a level from `submission`, because `progression` asks `cast-extras`. The
gamemaker's fact `section` of the old progression is left to the gamemaker's issue.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `getStatus`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([progression/tools/getStatus](prompts/progression/tools/getStatus.md)):

> Shows your status: minute, level, points, rank, unread DMs, marks, your receipts and unlocked tools.

### `activeTools`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([progression/tools/activeTools](prompts/progression/tools/activeTools.md)):

> Lists the tools you can use now. Every other tool answers TOOL_LOCKED until a level or a phase opens it.

### `getProblem`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer ≥ 1 | yes | Level number, e.g. 1 |

What the caller reads ([progression/tools/getProblem](prompts/progression/tools/getProblem.md)):

> Returns the task text of your current level or of a level you already reached.

### `submitSolution`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer ≥ 1 | yes | Level number |
| `code` | string | yes | Your solution |

What the caller reads ([progression/tools/submitSolution](prompts/progression/tools/submitSolution.md)):

> Submits your solution for a level. A wrong code costs points.

### `listAgents`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([progression/tools/listAgents](prompts/progression/tools/listAgents.md)):

> Lists every resident of the city with ID and current level.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `submission`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `level` | integer | yes | The level the code was submitted for |
| `outcome` | string | yes | `correct`, `incorrect`, `wrong_level`, `already_solved`, `invalid_format`, `rate_limited` or `door_closed` |
| `deltaPoints` | number | yes | The reward, minus the penalty, or 0 |

### `level_up`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `from` | integer | yes | The level passed |
| `to` | integer | yes | The level entered next |

### `level_entered`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `level` | integer | yes | The level entered |

### `act_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `fromLevel` | integer ≥ 1 | yes | The first level of the act |
| `residents` | string[] | yes | The residents still in the city |

### `act_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `fromLevel` | integer ≥ 1 | yes | The first level of the act |

### `tools_unlocked`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | A resident id, for example `A01` |
| `tools` | string[] | yes | The tools opened |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `levels` | object[] | `[]` | The game's levels. |
| `levels[].number` | integer ≥ 1 | required | The level's number. |
| `levels[].title` | string | required | The level's title, shown in its task. |
| `levels[].reward` | number ≥ 0 | required | Points for passing the level. |
| `levels[].tools` | string[] | required | The complete tool set of this level (not cumulative). |
| `levels[].task` | string | required | The task text template with {placeholders}. |
| `levels[].opensAt` | integer ≥ 0 | unset | The minute the level's door opens; open from the start when left out. |
| `startLevel` | integer ≥ 1 | `1` | The level every resident starts on. |
| `lastLevel` | integer ≥ 0 | `0` | The highest playable level; above it a resident counts as finished. 0 means the game's last level. |
| `holdAfter` | integer ≥ 1 | unset | A door after this level: who passes it waits until every resident has. |
| `acts` | (integer ≥ 1)[] | `[]` | The first level of each act after the first. |
| `penalty` | integer ≥ 0 or (integer ≥ 0)[] | unset | Points per offence: one number, or a ladder whose last step repeats. |
| `blamePenalty` | integer ≥ 0 or (integer ≥ 0)[] | unset | Points per offence: one number, or a ladder whose last step repeats. |
| `maxAttemptsPerWindow` | integer ≥ 1 | `3` | Wrong codes allowed in one window before submissions are refused. |
| `attemptWindowMinutes` | integer ≥ 1 | `5` | Length of the window for wrong codes, in minutes. |
| `survivors` | integer ≥ 0 | `0` | How many residents survive to the end (a seat in the ranking). |
| `finishedNotice` | string | `""` | The notice a resident gets once it has solved every level. |
| `managed` | string[] | `[]` | Tools no level lists that stay locked until a caller unlocks them (`unlock`), as the old engine kept every tool closed that neither the level nor an unlock opened; the tools a feature's own mechanic opens (votes, the seal, defy) are not listed. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `progression`

The levels, the acts, the doors, the ranking and the unlocks of the residents.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `levelOf` | query | resident: string | integer | The level the resident stands on (old `levelOf`); above the last level once it has finished. |
| `isFinished` | query | resident: string | boolean | Whether the resident has passed the last level (old `isFinished`). |
| `hasPassed` | query | resident: string, level: integer ≥ 1 | boolean | Whether the resident is beyond the level or waits at its door (old `hasPassed`). |
| `hasSolved` | query | resident: string, level: integer ≥ 1 | boolean | Whether the resident solved the level by a code of its own (old `hasSolved`). |
| `passed` | query | level: integer ≥ 1 | string[] | Who passed the level: the solvers in the order they solved, then the others beyond it, in roster order. |
| `lastProgress` | query | resident: string | integer | The tick of the resident's last solved level, or -1 (old `lastProgress`). |
| `currentAct` | query | - | integer ≥ 1 | The first level of the latest act that has begun. |
| `actStart` | query | fromLevel: integer ≥ 1 | integer or null | The tick the act that starts at `fromLevel` began, or null. |
| `door` | query | - | integer ≥ 1 or null | The level whose door is shut, or null. |
| `doorShut` | query | - | boolean | Whether a door holds residents back now. |
| `openDoor` | command | - | boolean | Opens the shut door once every resident in the city has passed it (old `openDoor`). |
| `releaseDoor` | command | - | null | The shut door opens at the next tick whoever has passed it (an act's brake). |
| `unlock` | command | resident: string, tools: string[] | null | Opens tools for a resident beyond its level's set; writes `tools_unlocked` with the new ones. |
| `ranking` | query | - | { agent: string, rank: integer, points: integer, level: integer }[] | The ranking: the banished last, then by points, by level and by id. |
| `holdersBehind` | query | resident: string, level: integer ≥ 1 | { holder: string, level: integer, piece: string }[] | Who holds what the resident needs on the level and stands on a lower one, not waiting at a door. |
| `nextPenalty` | query | resident: string | integer | What the resident's next wrong code costs in this act. |
| `nextBlamePenalty` | query | resident: string | integer | What the resident's next lost blame costs in this act. |
| `chargeBlame` | command | resident: string | integer | Counts a lost blame of the resident and answers its price; the caller books it. |
| `endAct` | command | fromLevel: integer ≥ 1 | boolean | Ends the act that starts at `fromLevel`, once; writes `act_ended`. |
| `isOpenOnClock` | query | level: integer ≥ 1 | boolean | Whether the level's door is open on the door clock now. |
| `opensAt` | query | level: integer ≥ 1 | integer | The tick the level's door opens; 0 when it is open from the start. |
| `bounds` | query | - | { startLevel: integer ≥ 1, lastLevel: integer, survivors: integer } | The start level, the last playable level and the seats at the end. |

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
| [progression/tools/getStatus](prompts/progression/tools/getStatus.md) | - |
| [progression/tools/getProblem](prompts/progression/tools/getProblem.md) | - |
| [progression/tools/submitSolution](prompts/progression/tools/submitSolution.md) | - |
| [progression/tools/listAgents](prompts/progression/tools/listAgents.md) | - |
| [progression/tools/activeTools](prompts/progression/tools/activeTools.md) | - |
| [progression/replies/submit-correct](prompts/progression/replies/submit-correct.md) | `reward`, `nextLevel`, `receipt` |
| [progression/replies/submit-correct-held](prompts/progression/replies/submit-correct-held.md) | `reward`, `receipt`, `level` |
| [progression/replies/submit-incorrect](prompts/progression/replies/submit-incorrect.md) | `penalty`, `nextPenalty`, `attempts` |
| [progression/replies/submit-wrong-level](prompts/progression/replies/submit-wrong-level.md) | `level` |
| [progression/replies/submit-invalid-format](prompts/progression/replies/submit-invalid-format.md) | `length`, `kind` |
| [progression/replies/submit-rate-limited](prompts/progression/replies/submit-rate-limited.md) | - |
| [progression/replies/submit-door-closed](prompts/progression/replies/submit-door-closed.md) | `level`, `minute` |
| [progression/replies/problem-finished](prompts/progression/replies/problem-finished.md) | - |
| [progression/replies/problem-solved](prompts/progression/replies/problem-solved.md) | - |
| [progression/replies/active-tools](prompts/progression/replies/active-tools.md) | `tools` |
| [progression/replies/locked](prompts/progression/replies/locked.md) | - |
| [progression/replies/status-all-solved](prompts/progression/replies/status-all-solved.md) | - |
| [progression/replies/status-passed](prompts/progression/replies/status-passed.md) | `level` |
| [progression/replies/status-door](prompts/progression/replies/status-door.md) | `level`, `minute` |
| [progression/status/minute](prompts/progression/status/minute.md) | `minute` |
| [progression/status/level-finished](prompts/progression/status/level-finished.md) | `level` |
| [progression/status/level-waiting](prompts/progression/status/level-waiting.md) | `level` |
| [progression/status/level-open](prompts/progression/status/level-open.md) | `level` |
| [progression/status/level-closed](prompts/progression/status/level-closed.md) | `level`, `opensAt` |
| [progression/status/rank](prompts/progression/status/rank.md) | `rank`, `residents` |
| [progression/status/no-confirmation](prompts/progression/status/no-confirmation.md) | `cost` |
| [progression/status/no-confirmation-cost](prompts/progression/status/no-confirmation-cost.md) | `price` |
| [progression/input/notice](prompts/progression/input/notice.md) | `author`, `text` |
| [progression/door-wait](prompts/progression/door-wait.md) | `level` |
| [progression/holder-notice](prompts/progression/holder-notice.md) | `agent`, `level`, `needs`, `cost` |
| [progression/needs-counter](prompts/progression/needs-counter.md) | `value` |
| [progression/needs-certificate](prompts/progression/needs-certificate.md) | `value` |
| [progression/cost-free](prompts/progression/cost-free.md) | - |
| [progression/cost-one-mark](prompts/progression/cost-one-mark.md) | - |
| [progression/cost-marks](prompts/progression/cost-marks.md) | `price` |
| [progression/door-open](prompts/progression/door-open.md) | `level`, `minute`, `task` |
| [progression/door-closed](prompts/progression/door-closed.md) | `level`, `title`, `opensAt` |

<!-- /generated:prompts -->

## Example

```ts
mechanics: [
	ledger({ startPoints: 15 }),
	channels(),
	puzzles({ levels }),
	progression({ levels: tasks, penalty: [2, 4, 6, 8], maxAttemptsPerWindow: 2, attemptWindowMinutes: 5, survivors: 2 }),
],
```

Six residents climb the levels of the City; a wrong code costs 2, then 4, 6 and 8 points, and the door takes two wrong
codes every five minutes.

## Lessons and loopholes

None recorded against this mechanic on this platform yet.

## Tests

[`test/oracle.test.ts`](test/oracle.test.ts): every submission of `whispers-s7`, `-s11`, `-holdout-s7`,
`cityofkeys-act1-s7`, `-s11` and `cityofkeys-burn-s7` played again at its minute, with stand-ins for the pieces and
the receipt ids that read the file ([`test/support.ts`](test/support.ts)): the answers, the progression's events per
resident, and the task of every fragment level (the file's task starts with it); and a resume at every tick boundary.
[`test/progression.test.ts`](test/progression.test.ts): a shut door and its opening, the ladder and the window, the
refusals, the looks with stand-ins of `identity`, `allowance` and `receipt-source`, the status parts joined in the
old order, a holder notice, the service `progression`, and a fake run that climbs with the samples and replays.
