# Morris referee

A silent judge for [morris](../morris/README.md). It scores every whole turn (a step with its removal) against a
depth-limited alpha-beta search and writes the score as `move_scored`, for the human and the reporter only. It has no
tools and keeps its own copy of the position, replayed from the game's events.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-morris-referee` |
| Id | `morris-referee` |
| Summary | Scores every morris turn against a depth-limited alpha-beta search (best and played value, class); read-only, for the human and the reporter. |
| Requires | none |
| Uses when loaded | none |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Facts | none |
| Jobs | none |
| Stories | [morris-teams](../../stories/morris-teams/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

1. **Listening.** On every `move_played` of morris it updates its own position.
2. **Scoring.** For each whole turn with an alternative it searches `depth` whole turns ahead (at most `maxNodes`
   positions per depth; a deeper search that runs out is dropped) and compares the played turn with the best: closing
   a mill is best, passing one up is a missed mill, a walled-in piece counts against its side while placing. A forced
   or illegal turn is not scored.
3. **Audience.** `move_scored` is for `human` only; no resident and no gamemaker learns how a turn was rated.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic defines no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `depth` | integer ≥ 1 ≤ 6 | `3` | Whole turns the search looks ahead at most. |
| `maxNodes` | integer ≥ 1000 | `200000` | Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts. |

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

Prompts: none besides the tool descriptions.

<!-- /generated:prompts -->

## Example

From [`stories/morris-teams/story.ts`](../../stories/morris-teams/story.ts):

```ts
morrisReferee.with({ depth: refereeDepth }),
```

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **P102** the referee's classes were noisy. Partly fixed.
- **P107** the evaluation did not see a walled-in piece. Fixed.
- **P201** the referee shares the engine's search, so against the engine it rates by the opponent's own yardstick.
  Open.

## Tests

[`test/mechanics/morris-referee/`](../../test/mechanics/morris-referee/): mills closed and missed, the winning
removal, the engine's best turns, a walled-in piece (P107), forced and illegal turns, running out of nodes, documented
options.
