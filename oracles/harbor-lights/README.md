# Oracles: harbor lights (`stories/harbor-lights`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `harbor-lights-g1-s103.json`, `harbor-lights-g1-s110.json` | four seats, one game, a shared crew brain with a chat | replay of run `harbor-lights-04a-006-game1-plan`, exact | the whole game: the crew's plan, signals, plays, discards, draws, the score against the baseline |
| `harbor-lights-nobrain-g1-s103.json` | no brain | same run, exact | the control arm, whole game |
| `harbor-lights-solo-g1-s111.json` | private notes instead of a crew brain | same run, exact | whole game |
| `harbor-lights-nobrain-s37.json` | three games, no brain | replay of run `harbor-lights-04a-005-crew-nobrain-soft`, exact | games 1 and 2 of 3 (cut) |

Source of the calls: recorded live runs of Haiku seats; today's code reproduces each word for word. Refusals in
the files: `NO_SIGNALS`, `NOT_YOUR_TURN`, `TOUCHES_NOTHING`, `NO_SUCH_SLOT`, `BRAIN_TOO_LONG`.

The seeded deal is visible: `deal_revealed` and `card_drawn` carry the hands and every drawn card (audience
`human`).

Not covered: the registry default `harbor-lights` with three games and a brain (no recorded run of it replays
exactly; the one-game files exercise the same mechanics), hard strikes, the decision aid, a seat that misses its
turn.
