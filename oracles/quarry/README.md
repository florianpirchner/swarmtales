# Oracles: quarry (`stories/quarry`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `quarry-s41.json`, `quarry-s61.json` | default: four seats, three games, a private brain per seat | replay of run `quarry-04a-007-paired-seeds`, exact | the whole match: packs, 144 picks, scores, retro windows, brains refused as too long (`BRAIN_TOO_LONG`) |
| `quarry-nobrain-s41.json` | no brain | same run, exact | the control arm, whole match |
| `quarry-open-s59.json` | open hands | same run, exact up to the cut | two of three games (cut to keep the file small) |
| `quarry-burn-s13-probes.json` | free burns, two a game | scripted (`quarryProbed`) | the whole match of the burn variant (140 picks, four burns) and nine refused calls: `NOT_IN_PACK` (an unknown card as pick and as burn), `BURN_IS_PICK`, `NO_BURNS_LEFT`, `INVALID_ARGUMENTS`, `TOOL_LOCKED` (a pick before game 1, a second pick, a brain outside the retro window) |
| `quarry-s13-silent.json` | default | scripted (`silent`): no resident ever calls a tool | the pick timer for every seat and pick: 144 picks made by the clock, the scores, retro windows closed by timeout |

Source of the calls: recorded live runs of Haiku seats. Today's code reproduces each recording word for word
(`source.fidelity`: all turns show the recorded inputs, all calls get the recorded answers).

The seeded deal is visible: `draft_game_started` and `draft_pick_opened` carry the packs and hands with audience
`human`; `draft_game_scored` carries the scoring of every seat.

Not covered: a recorded run of the burn variant (its runs predate a rule change and do not replay exactly), the
codes behind a closed tool (`ALREADY_PICKED`, `NO_PACK`, `NO_PICK`: `pick` is locked for a seat that has picked or
has no pack).
