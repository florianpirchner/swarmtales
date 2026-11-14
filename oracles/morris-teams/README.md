# Oracles: nine men's morris (`stories/morris-teams`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `morris-teams-nobrain-solo-vs-engine3-s33.json`, `...-s31.json` | one resident against the built-in search at depth 3, no brain | replay of run `morris-teams-01a-006-solo-vs-engine3`, exact | the whole match: placing, moving, flying, mills and removals, the engine's replies, the move scores |
| `morris-teams-solo-vs-engine3-s33.json` | the same with a brain | replay of run `morris-teams-01a-007-sonnet-opus-vs-engine3`, exact | the whole match with retro windows |
| `morris-teams-nobrain-solo-s13.json` | one resident per side, no brain | replay of run `morris-teams-02a-003-solo-brain-vs-nobrain`, exact | game 1 of 3 (cut): 49 turns, refusals `NO_CONSENSUS` and `NOT_ON_MOVE` |

Source of the calls: recorded live runs; today's code reproduces each word for word. The engine side is the old
platform's own deterministic search (`mechanics/morris`), no outside program; its moves are `move_played` events
of the side it plays and must match.

Hidden information: none. `move_scored` (mechanic `morris-referee`, audience `human`) is the search's verdict
on every move.

Not covered: the registry default `morris-teams` with two teams of three (proposal and votes; no recorded run of
it replays exactly, tic-tac-toe covers the same consensus mechanic), a fixed captain, the turn limit, forfeits.
