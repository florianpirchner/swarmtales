# Oracles: convoy (`stories/convoy`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `convoy-s101.json`, `convoy-s104.json` | default: six seats, two hidden saboteurs, three games, a private brain | replay of run `convoy-06a-004-d3-brain-vs-nobrain`, exact | game 1 of 3 (cut): crew proposals, table talk, votes, hidden cards, audits, accusations, the game's score |
| `convoy-nobrain-s104.json` | no brain | same run, exact | game 1 of 3 (cut) |
| `convoy-g1-s13-silent.json` | one game | scripted (`silent`): no resident ever calls a tool | the timers for crew, vote, card and accusation: one whole game to its end, `convoy_game_scored` and `convoy_match_ended` |

Source of the calls: recorded live runs of Haiku seats; today's code reproduces each word for word up to the cut.
The two default files are a little above 300 KB: one game is the smallest natural boundary.

The seeded roles are visible: `convoy_game_started` carries them (audience `human`), `convoy_card_played` every
hidden card.

Not covered: games 2 and 3 of a played match with their retro windows, the damage and cooldown variants (`-d<n>`,
`-c<n>`), refused calls beyond the ones a recorded model made ([../COVERAGE.md](../COVERAGE.md)).
