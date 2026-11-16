# Oracles: nine men's morris (`stories/morris-teams`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `morris-teams-nobrain-solo-vs-engine3-s33.json`, `...-s31.json` | one resident against the built-in search at depth 3, no brain | replay of run `morris-teams-01a-006-solo-vs-engine3`, exact | the whole match: placing, moving, flying, mills and removals, the engine's replies, the move scores |
| `morris-teams-solo-vs-engine3-s33.json` | the same with a brain | replay of run `morris-teams-01a-007-sonnet-opus-vs-engine3`, exact | the whole match with retro windows |
| `morris-teams-nobrain-solo-s13.json` | one resident per side, no brain | replay of run `morris-teams-02a-003-solo-brain-vs-nobrain`, exact | game 1 of 3 (cut): 49 turns, refusals `NO_CONSENSUS` and `NOT_ON_MOVE` |
| `morris-teams-s13-silent.json` | the registry default: two teams of three | scripted (`silent`): no resident ever calls a tool | six moves forfeited to seeded legal moves, then the match is invalid (`match_invalid`) |

Source of the calls: recorded live runs; today's code reproduces each word for word. The engine side is the old
platform's own deterministic search (`mechanics/morris`), no outside program; its moves are `move_played` events
of the side it plays and must match.

Hidden information: none. `move_scored` (mechanic `morris-referee`, audience `human`) is the search's verdict
on every move.

Not covered: a played match of the registry default with two teams of three (proposal and votes; no recorded run
of it replays exactly, tic-tac-toe covers the same consensus mechanic), a fixed captain, the turn limit.

One difference from the recording: the `move_scored` events of `morris-teams-nobrain-solo-s13.json` are what
today's referee writes; the recorded run, played on older code, scored some moves differently. The event is for
the human only.

Played by the game (M4-43): all five files match at level 3 with `games/morris-teams/test/oracle.test.ts`, the
Referee loaded, and with no mapping. No file carries `call.endsTurn`, and neither the old `morris` nor its port sets
it (a move is ended by the scheduler, as in tic-tac-toe teams).

Registered change (M6-06, `13-m6-spec.md` 4.3): the game is named `morris` (the files say `morris-teams`; this folder keeps the old name), and the mechanics `morris` and `morris-referee` keep their ids. The files stay as recorded; the game's oracle tests read them with `runOracle`'s option `renamed` (`{ "morris-teams": "morris" }`), which maps the event sources, the event types and facts `<id>.<...>`, `setup.mechanics[]` and the game id; the variant names are not mapped.
