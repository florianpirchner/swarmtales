# Morris referee

A silent judge for [morris](../morris/README.md). It scores every whole turn (a step with its removal) against a
depth-limited alpha-beta search and writes the score as `move_scored`, for the human and the report only. No resident
and no Director ever learns how a turn was rated. It has no tools and keeps its own copy of the position, replayed
from the game's events.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-morris-referee` |
| Id | `morris-referee` |
| Summary | Scores every morris turn against a depth-limited alpha-beta search (best and played value, class); read-only, for the human and the reporter. |
| Requires | none |
| Uses when loaded | none |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [morris-teams](../../games/morris-teams/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Listening.** On `game_started` of morris it sets up its own position; on every `move_played` it replays the step
   there. It calls no service of the game.
2. **Scoring.** For each whole turn with an alternative it searches `depth` whole turns ahead (at most `maxNodes`
   positions per depth; a deeper search that runs out is dropped) and compares the played turn with the best: closing
   a mill is best, passing one up is a missed mill, a walled-in piece counts against its side while placing. A step
   that closes a mill waits in the state and is scored together with its removal, under the turn's one number. A
   forced or illegal turn is not scored.
3. **Audience.** `move_scored` is for `human` only. A turn that the move timer or the game's built-in search played
   is scored like any other.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `move_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `turnNo` | integer | yes | The scored turn's number in its game, as in move_played. |
| `side` | "X" or "O" | yes |  |
| `class` | "best" or "inaccuracy" or "blunder" or "missed_win" | yes |  |
| `best` | integer | yes | The search value of the best turn, for the side that moved (100 = one piece). |
| `played` | integer | yes | The search value of the played turn. |
| `depth` | integer | yes | Whole turns searched. |
| `alternatives` | integer | yes | Legal turns in the position. |
| `missedMill` | boolean | yes | A turn that closes a mill was legal and the played turn closed none. |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `depth` | integer ≥ 1 ≤ 6 | `3` | Whole turns the search looks ahead at most. |
| `maxNodes` | integer ≥ 1000 | `200000` | Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts. |

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

This mechanic has no prompt files.

<!-- /generated:prompts -->

## Example

No game of this repository loads it yet: nine men's morris comes with its own issue. It will load it last, as the old
platform did (the test game of [`test/support.ts`](test/support.ts) does so already):

```ts
morrisReferee({ depth: 3 }),
```

The old game gave `depth` only, so `maxNodes` is the default.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **P102** the referee's classes were noisy. Partly fixed.
- **P107** the evaluation did not see a walled-in piece. Fixed.
- **P201** the referee shares the engine's search, so against the engine it rates by the opponent's own yardstick.
  Open.

## Tests

[`test/oracle.test.ts`](test/oracle.test.ts): the five oracle files of `oracles/morris-teams/` at level 3 inside the
test game, whole: the referee's setup entry and every `move_scored` (6, 49, 73, 64 and 105 of them) in its place.
[`test/morris-referee.test.ts`](test/morris-referee.test.ts): mills closed and missed, the winning removal, forced
and illegal turns, running out of nodes, documented options (carried, as far as the contract of morris reaches); the
audience of `move_scored`, no tools, determinism and a snapshot in a match; a mill scored with its removal as one
turn, also across a snapshot taken between the two. [`test/carried.test.ts`](test/carried.test.ts) holds the options,
the event and its audience to those of the old platform.
