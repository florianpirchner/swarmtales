# Oracles: harbor lights (`stories/harbor-lights`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `harbor-lights-g1-s103.json`, `harbor-lights-g1-s110.json` | four seats, one game, a shared crew brain with a chat | replay of run `harbor-lights-04a-006-game1-plan`, exact | the whole game: the crew's plan, signals, plays, discards, draws, the score against the baseline |
| `harbor-lights-nobrain-g1-s103.json` | no brain | same run, exact | the control arm, whole game |
| `harbor-lights-solo-g1-s111.json` | private notes instead of a crew brain | same run, exact | whole game |
| `harbor-lights-nobrain-s37.json` | three games, no brain | replay of run `harbor-lights-04a-005-crew-nobrain-soft`, exact | games 1 and 2 of 3 (cut) |
| `harbor-lights-nobrain-aid-g1-s103.json` | one game, no brain, the decision aid (`playableOdds`) | replay of run `harbor-lights-04a-007-decision-aid`, exact (96 of 96 turns, 51 of 51 calls) | the whole game on the deal of `harbor-lights-nobrain-g1-s103.json`: 45 turns show `Chance a play lights it now` on a slot; ends `complete` with 17 cards lit, soft strikes |
| `harbor-lights-hard-strikes-s13.json` | the registry story `harbor-lights-hard-strikes`: three games, a crew brain, hard strikes (`strikes: 3`, `strikePenalty: 0`) | scripted (`harborMisfires`): every seat plays its oldest slot blind; in a retro window every seat posts once and the retro captain writes the brain | three whole games that each end at the third strike (`game_ended` with `reason: "strikes"`, scores 3, 0, 0), the strike line `Strikes n of 3 (the last one ends the game)`, the crew chat and the rotating captain between the games, `match_ended`; 62 KB |
| `harbor-lights-s13-silent.json` | the registry default: three games, a crew brain | scripted (`silent`): no resident ever calls a tool | every turn forfeited by the timer until the match is called off as invalid; 706 KB, the largest file |

Source of the calls: recorded live runs of Haiku seats; today's code reproduces each word for word. The two
files above the silent one were recorded for M4-18 (`11-m4-spec.md`, section 2.4, rows 9 and 10) on the branch
`oracle/m4` of the old platform; `../m4-catalog.patch` holds their catalogue entries and the player. Refusals in
the files: `NO_SIGNALS`, `NOT_YOUR_TURN`, `TOUCHES_NOTHING`, `NO_SUCH_SLOT`, `BRAIN_TOO_LONG`.

The seeded deal is visible: `deal_revealed` and `card_drawn` carry the hands and every drawn card (audience
`human`).

Not covered: a played match of the registry default with three games and a brain (no recorded run of it replays
exactly; the one-game files exercise the same mechanics), the decision aid with a brain (`-solo-aid`), a game
with hard strikes that ends another way than by the strikes.
