# Oracles: ember tricks (`stories/ember-tricks`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `ember-tricks-g1-s31.json` | four seats, one game of eight rounds, a private brain | replay of run `ember-tricks-04a-004-quiet-look`, exact | the whole match: deals, bids, trump, 146 cards, tricks, round scores, calls out of turn (`NOT_YOUR_TURN`) |
| `ember-tricks-calib-g4-s32.json` | four games, the calibration lever | replay of run `ember-tricks-04a-005-reference`, exact | game 1 of 4 (cut) |
| `ember-tricks-mcbid-g4-s32.json` | four games, the bid-aid lever | same run | game 1 of 4 (cut); every call gets the recorded answer, 4 of 336 turns show inputs worded differently today |
| `ember-tricks-s13-silent.json` | the registry default: three games | scripted (`silent`): no resident ever calls a tool | bids and cards forfeited by the timers (`forfeit: true`) until the match is called off; 427 KB, because every forfeited turn wakes four seats |

Source of the calls: recorded live runs of Haiku seats (`source.fidelity` per file).

The seeded deal is visible: `cards_dealt` (mechanic `card-table`, audience `human`) carries every hand.

Not covered: a played match of the registry default (no recorded run of it replays exactly), the no-brain arm,
the bid-sum lever.

The no-brain arm stays without a file on purpose (M4-18, `11-m4-spec.md` section 2.4, row 11, the way out): the
first test failed. `scripts/export-oracles.ts --survey stories/ember-tricks/runs` on the old platform finds no
recorded run of `ember-tricks-nobrain-*` that replays exactly: the three no-brain runs of
`ember-tricks-04a-002-long-matrix` are four-game matches (`ember-tricks-nobrain-g4`, not `-g1`) and today's code
gives the recorded answer to 59, 50 and 50 of about 1600 calls (the first difference is a `viewTable` answer in
minute 0). No other run of the arm was recorded. The arm is proven by the carried tests only.
