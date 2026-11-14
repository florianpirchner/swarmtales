# Oracles: ember tricks (`stories/ember-tricks`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `ember-tricks-g1-s31.json` | four seats, one game of eight rounds, a private brain | replay of run `ember-tricks-04a-004-quiet-look`, exact | the whole match: deals, bids, trump, 146 cards, tricks, round scores, calls out of turn (`NOT_YOUR_TURN`) |
| `ember-tricks-calib-g4-s32.json` | four games, the calibration lever | replay of run `ember-tricks-04a-005-reference`, exact | game 1 of 4 (cut) |
| `ember-tricks-mcbid-g4-s32.json` | four games, the bid-aid lever | same run | game 1 of 4 (cut); every call gets the recorded answer, 4 of 336 turns show inputs worded differently today |

Source of the calls: recorded live runs of Haiku seats (`source.fidelity` per file).

The seeded deal is visible: `cards_dealt` (mechanic `card-table`, audience `human`) carries every hand.

Not covered: the registry default `ember-tricks` (three games; no recorded run of it replays exactly), the
no-brain arm, the bid-sum lever, a seat that misses a bid or a card (the timers play for it: `forfeit: true`).
