# Progression

The levels of the city. Every resident stands on a level, reads its task with `getProblem` and submits the level's
password with `submitSolution`; a right code opens the door to the next level and pays the level's reward, a wrong one
costs points. The mechanic also opens and closes tools level by level, groups levels into acts, keeps the ranking and
writes the frame of every turn (task and status line).

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-progression` |
| Id | `progression` |
| Summary | Levels, submissions, doors, acts and the ranking. |
| Requires | `puzzles` (from [puzzles](../puzzles/README.md)), `ledger` (from [ledger](../ledger/README.md)), `channels` (from [channels](../channels/README.md)), `receipts` (from [receipts](../receipts/README.md)) |
| Uses when loaded | `cast-extras` (from [cast](../cast/README.md)), `exile` (from [exile](../exile/README.md)), `marks` (from [marks](../marks/README.md)), `names` (from [names](../names/README.md)), `standoff-tribunal` (from [standoff-tribunal](../standoff-tribunal/README.md)) |
| Provides | `progression` |
| State | kept, snapshot slice version 1 |
| Facts | `door`, `levels`, `section` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

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

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `getStatus`

- Suggested for: `resident`

No parameters.

What the caller reads ([tools/getStatus](../../library/prompts/tools/getStatus.md)):

> Shows your status: minute, level, points, rank, unread DMs, marks, your receipts and unlocked tools.

### `activeTools`

- Suggested for: `resident`

No parameters.

What the caller reads ([tools/activeTools](../../library/prompts/tools/activeTools.md)):

> Lists the tools you can use now. Every other tool answers TOOL_LOCKED until a level or a phase opens it.

### `getProblem`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer ≥ 1 | yes | Level number, e.g. 1 |

What the caller reads ([tools/getProblem](../../library/prompts/tools/getProblem.md)):

> Returns the task text of your current level or of a level you already reached.

### `submitSolution`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer ≥ 1 | yes | Level number |
| `code` | string | yes | Your solution |

What the caller reads ([tools/submitSolution](../../library/prompts/tools/submitSolution.md)):

> Submits your solution for a level. A wrong code costs points.

### `listAgents`

- Suggested for: `resident`

No parameters.

What the caller reads ([tools/listAgents](../../library/prompts/tools/listAgents.md)):

> Lists every resident of the city with ID and current level.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `progression`

Levels, submissions, doors, acts and the ranking.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `levelOf` | query | resident: string | integer | Old `levelOf`. |
| `isFinished` | query | resident: string | boolean | Old `isFinished`. |
| `hasPassed` | query | resident: string, level: integer ≥ 1 | boolean | Old `hasPassed`. |
| `hasSolved` | query | resident: string, level: integer ≥ 1 | boolean | Whether the resident solved `level` itself (old `solved.includes(level)`); `hasPassed` is also true beyond it or at a shut door without a solve (A1-6, the seats rule). |
| `passed` | query | level: integer ≥ 1 | string[] | Who passed a level, in the order they passed (the tribunal's `passed`). |
| `lastProgress` | query | resident: string | integer or null | The minute the resident last passed a level, or null (the tribunal's `lastProgress`). |
| `currentAct` | query | - | integer | Old `currentAct`. |
| `actStart` | query | fromLevel: integer ≥ 1 | integer or null | The first minute of the act that starts at `fromLevel`, or null (old `actStartOf`). |
| `door` | query | - | integer ≥ 1 or null | The snapshot door, or null (old `door`). |
| `doorShut` | query | - | boolean | Whether a door holds residents back now (the tribunal's `doorShut`). |
| `openDoor` | command | - | boolean | Old `openDoor`. |
| `releaseDoor` | command | - | null | Old `releaseDoor`. |
| `unlock` | command | resident: string, tools: string[] | null | Old `unlockTools` (and `ctx.access.unlock`); writes `tools_unlocked`. |
| `ranking` | query | - | object[] | Old `ranking`. |
| `holdersBehind` | query | resident: string, level: integer ≥ 1 | object[] | Holders of the resident's pieces still below `level` (old `holdersBehind`, the script's `onHolderBehind`). |
| `firstSolveMinute` | query | level: integer ≥ 1 | integer or null | The minute the first resident passed a level, or null (old `firstSolveMinute`). |
| `nextPenalty` | query | resident: string | number | What the resident's next wrong code in this act costs (old `nextPenalty`, the offences ladder; T3 request 5). |
| `nextBlamePenalty` | query | resident: string | number | What the resident pays for its next lost blame in this act (old `nextBlamePenalty`); 0 without a blame ladder. The task's `{blamePenalty}`. |
| `chargeBlame` | command | resident: string | number | A lost blame: returns its price, and the act's count climbs (old `#chargeBlame`; receipts calls it through `uses`, T1 R-7, T3 R-6). |
| `endAct` | command | fromLevel: integer ≥ 1 | boolean | The act starting at `fromLevel` is over (old `#endAct`: the tribunal reached its target); writes `act_ended`; false when it was over already (T3 request 7). |
| `isOpenOnClock` | query | level: integer ≥ 1 | boolean | Whether the level's door is open on the door clock (old `isOpenOnClock`). |
| `opensAt` | query | level: integer ≥ 1 | integer | The minute the level's door opens on the door clock; 0 without one (old `opensAt`). |
| `bounds` | query | - | object | The run's first and last level and how many residents the story keeps (`run.survivors`; T4 request R7). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/getStatus](../../library/prompts/tools/getStatus.md) | - |
| [tools/getProblem](../../library/prompts/tools/getProblem.md) | - |
| [tools/submitSolution](../../library/prompts/tools/submitSolution.md) | - |
| [tools/listAgents](../../library/prompts/tools/listAgents.md) | - |
| [tools/activeTools](../../library/prompts/tools/activeTools.md) | - |
| [replies/locked](../../library/prompts/replies/locked.md) | - |
| [replies/submit-correct](../../library/prompts/replies/submit-correct.md) | `reward`, `nextLevel`, `receipt` |
| [replies/submit-correct-held](../../library/prompts/replies/submit-correct-held.md) | `reward`, `receipt`, `level` |
| [replies/submit-incorrect](../../library/prompts/replies/submit-incorrect.md) | `penalty`, `nextPenalty`, `attempts` |
| [replies/submit-wrong-level](../../library/prompts/replies/submit-wrong-level.md) | `level` |
| [replies/submit-invalid-format](../../library/prompts/replies/submit-invalid-format.md) | `length`, `kind` |
| [replies/submit-rate-limited](../../library/prompts/replies/submit-rate-limited.md) | - |
| [replies/submit-door-closed](../../library/prompts/replies/submit-door-closed.md) | `level`, `minute` |
| [replies/problem-finished](../../library/prompts/replies/problem-finished.md) | - |
| [replies/problem-solved](../../library/prompts/replies/problem-solved.md) | - |
| [replies/active-tools](../../library/prompts/replies/active-tools.md) | `tools` |
| [replies/status-dm-window](../../library/prompts/replies/status-dm-window.md) | `sent`, `limit`, `from`, `until` |
| [replies/status-all-solved](../../library/prompts/replies/status-all-solved.md) | - |
| [replies/status-passed](../../library/prompts/replies/status-passed.md) | `level` |
| [replies/status-door](../../library/prompts/replies/status-door.md) | `level`, `minute` |
| [competitor/status/minute](../../library/prompts/competitor/status/minute.md) | `minute` |
| [competitor/status/level-finished](../../library/prompts/competitor/status/level-finished.md) | `level` |
| [competitor/status/level-waiting](../../library/prompts/competitor/status/level-waiting.md) | `level` |
| [competitor/status/level-open](../../library/prompts/competitor/status/level-open.md) | `level` |
| [competitor/status/level-closed](../../library/prompts/competitor/status/level-closed.md) | `level`, `opensAt` |
| [competitor/status/rank](../../library/prompts/competitor/status/rank.md) | `rank`, `competitors` |
| [competitor/status/no-confirmation](../../library/prompts/competitor/status/no-confirmation.md) | `cost` |
| [competitor/status/no-confirmation-cost](../../library/prompts/competitor/status/no-confirmation-cost.md) | `price` |
| [competitor/input/notice](../../library/prompts/competitor/input/notice.md) | `author`, `text` |
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

The city runner maps the story's levels and rules ([`apps/cli/src/host/story.ts`](../../apps/cli/src/host/story.ts)):

```ts
progression.with({
	levels: story.levels.map((level) => ({ number: level.number, title: level.title, reward: level.reward, tools: [...level.tools], task: level.task })),
	acts: (story.acts ?? []).map((act) => act.fromLevel).filter((fromLevel) => fromLevel > 1),
	penalty: [...story.rules.penalty], maxAttemptsPerWindow: story.rules.maxAttemptsPerWindow, attemptWindowMinutes: story.rules.attemptWindowMinutes,
	survivors: story.run.survivors, managed: [...LEVEL_MANAGED_TOOLS], ...
}),
```

The City of Keys charges 2, 4, 6, then 8 points for wrong codes within an act (`penalty: [2, 4, 6, 8]`) and allows two
wrong codes per five minutes.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **P1** board tools vanished on level 3 for a pair member who moved on. Fixed (the board stays open).
- **P3** penalty fear: residents did not submit without verification. Partly fixed (pressure from the tribunal).
- **P15** dead minutes at the end of a run. Partly fixed.
- **P22** holders denied holding a piece. Fixed (a hint in the task).
- **P35** residents held a value and refused to use it. Partly tested (the penalty ladder, v09).

## Tests

- [`test/mechanics/progression/progression.test.ts`](../../test/mechanics/progression/progression.test.ts):
  `getProblem` as the old tool answered, resuming the Act I checkpoint.
- [`status.test.ts`](../../test/mechanics/progression/status.test.ts), [`turns.test.ts`](../../test/mechanics/progression/turns.test.ts),
  [`notices.test.ts`](../../test/mechanics/progression/notices.test.ts), [`solved.test.ts`](../../test/mechanics/progression/solved.test.ts):
  the status line and `getStatus` against the golden runs, the turn frame, notices, solved levels.
- `test/mechanics/t3/`: the gate, resumes and the order of events with the real mechanics of team T3.
