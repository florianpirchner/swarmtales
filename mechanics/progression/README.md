# Progression

Levels and their doors. Every resident climbs the same levels; a level opens with a code, which the resident submits
with `submitSolution`. A wrong code costs points on a ladder, and only a few wrong codes are taken in a window. The
progression writes the task of a level and its parts of the status line into a resident's turn, and answers the
looks `getStatus`, `getProblem`, `listAgents` and `activeTools`. Ported from the old platform in two halves: this is
the first (M5-19); the acts, the tool unlocks per level, the ranking service, the survivors and the end of the run
come with the second (M5-20).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-progression` |
| Id | `progression` |
| Summary | Levels, submissions, doors, the penalty ladder and the task and status lines of a turn. |
| Requires | `ledger` (from [ledger](../ledger/README.md)), `channels` (from [channels](../channels/README.md)), `level-pieces` |
| Uses when loaded | `identity`, `receipt-source`, `allowance`, `exile` (from [exile](../exile/README.md)) |
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

**Not done here (M5-20).** The acts (`act_started`, `act_ended`, the ladders restart per act), the tool locks per
level and the unlocks (`managed`, `tools_unlocked`), the ranking service and the survivors, the end of the run, the
lock of `submitSolution` at the gate of the exile, and the listener to `exile.exiled`. The lines the old task carried
under it (the names line, the holdout rule, the marks terms) are the lines of those mechanics (erratum J31); the
unread direct messages of `getStatus` are the channels' (`unread DMs: 0` until then, erratum J32).

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
| `penalty` | integer ≥ 0 or (integer ≥ 0)[] | unset | Points per offence: one number, or a ladder whose last step repeats. |
| `blamePenalty` | integer ≥ 0 or (integer ≥ 0)[] | unset | Points per offence: one number, or a ladder whose last step repeats. |
| `maxAttemptsPerWindow` | integer ≥ 1 | `3` | Wrong codes allowed in one window before submissions are refused. |
| `attemptWindowMinutes` | integer ≥ 1 | `5` | Length of the window for wrong codes, in minutes. |
| `survivors` | integer ≥ 0 | `0` | How many residents survive to the end (a seat in the ranking). |
| `finishedNotice` | string | `""` | The notice a resident gets once it has solved every level. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `progression`

The level each resident stands on, and what it has passed.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `levelOf` | query | resident: string | integer | The level the resident stands on (old `levelOf`); above the last level once it has finished. |
| `isFinished` | query | resident: string | boolean | Whether the resident has passed the last level (old `isFinished`). |
| `hasPassed` | query | resident: string, level: integer ≥ 1 | boolean | Whether the resident is beyond the level or waits at its door (old `hasPassed`). |

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
