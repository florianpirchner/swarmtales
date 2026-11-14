# Morris referee

A silent judge for morris. It scores every whole turn (a step with its removal) against a
depth-limited alpha-beta search and writes the score as `move_scored`, for the human and the reporter only. It has no
tools and keeps its own copy of the position, replayed from the game's events.

Copied from `mechanics/morris-referee/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Listening.** On every `move_played` of morris it updates its own position.
2. **Scoring.** For each whole turn with an alternative it searches `depth` whole turns ahead (at most `maxNodes`
   positions per depth; a deeper search that runs out is dropped) and compares the played turn with the best: closing
   a mill is best, passing one up is a missed mill, a walled-in piece counts against its side while placing. A forced
   or illegal turn is not scored.
3. **Audience.** `move_scored` is for `human` only; no resident and no gamemaker learns how a turn was rated.

## Tools

This mechanic defines no tools.

## Events

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

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `depth` | integer ≥ 1 ≤ 6 | `3` | Whole turns the search looks ahead at most. |
| `maxNodes` | integer ≥ 1000 | `200000` | Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts. |


