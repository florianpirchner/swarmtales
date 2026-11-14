# Oracles: convoy (`stories/convoy`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `convoy-s101.json`, `convoy-s104.json` | default: six seats, two hidden saboteurs, three games, a private brain | replay of run `convoy-06a-004-d3-brain-vs-nobrain`, exact | game 1 of 3 (cut): crew proposals, table talk, votes, hidden cards, audits, accusations, the game's score |
| `convoy-nobrain-s104.json` | no brain | same run, exact | game 1 of 3 (cut) |

Source of the calls: recorded live runs of Haiku seats; today's code reproduces each word for word up to the cut.
The two default files are a little above 300 KB: one game is the smallest natural boundary.

The seeded roles are visible: `convoy_game_started` carries them (audience `human`), `convoy_card_played` every
hidden card.

Not covered: games 2 and 3 with their retro windows, the damage and cooldown variants (`-d<n>`, `-c<n>`), a seat
that misses a vote or a card (the timers).
