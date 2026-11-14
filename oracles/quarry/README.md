# Oracles: quarry (`stories/quarry`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `quarry-s41.json`, `quarry-s61.json` | default: four seats, three games, a private brain per seat | replay of run `quarry-04a-007-paired-seeds`, exact | the whole match: packs, 144 picks, scores, retro windows, brains refused as too long (`BRAIN_TOO_LONG`) |
| `quarry-nobrain-s41.json` | no brain | same run, exact | the control arm, whole match |
| `quarry-open-s59.json` | open hands | same run, exact up to the cut | two of three games (cut to keep the file small) |

Source of the calls: recorded live runs of Haiku seats. Today's code reproduces each recording word for word
(`source.fidelity`: all turns show the recorded inputs, all calls get the recorded answers).

The seeded deal is visible: `draft_game_started` and `draft_pick_opened` carry the packs and hands with audience
`human`; `draft_game_scored` carries the scoring of every seat.

Not covered: the burn variant (`quarry-burn`; its recorded runs predate a rule change and do not replay exactly),
a seat that misses a pick (the pick timer).
