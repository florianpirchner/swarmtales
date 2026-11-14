# Oracles: lanterns (`stories/lanterns`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `lanterns-s73.json`, `lanterns-s107.json` | default: two teams of three, a rotating keeper, four games, a team brain | replay of run `lanterns-06a-006-more-seeds`, exact | games 1 and 2 of 4 (cut): clues, the team chat, guesses, revealed words, scores, a retro window |
| `lanterns-nobrain-s67.json` | no brain | replay of run `lanterns-06a-005-pace-and-handicap`, exact | games 1 to 3 of 4 (cut) |
| `lanterns-g1-s13-silent.json` | one game | scripted (`silent`): no resident ever calls a tool | the timers of keeper and caller: every clue is missed (`clue_closed`), the game and the match end with their scores |

Source of the calls: recorded live runs of Haiku seats; today's code reproduces each word for word up to the cut.

The seeded grid is visible: `clue_game_started` carries the words, `clue_key_dealt` the hidden key (audience
`human`), `clue_intent` the keeper's targets.

Not covered: the last games and the end of a played match, the two-game variant, `endGuesses`.
