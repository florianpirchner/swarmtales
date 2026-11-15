# Oracles: salt market (`stories/salt-market`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `salt-market-s45.json`, `salt-market-s46.json` | default: four traders, four games, a private brain | replay of run `salt-market-04a-006-v2-brain-vs-nobrain`, exact | games 1 and 2 of 4 (cut): offers, passes, trades with tax, private messages, a gift, a settled promise, spoilage, shipments, scores, a retro window |
| `salt-market-nobrain-s45.json` | no brain | same run, exact | games 1 and 2 of 4 (cut) |
| `salt-market-s13-silent.json` | default | scripted (`silent`): no resident ever calls a tool | four games with no trade: shipments, spoilage, `market_game_scored`, the end of the match |

Source of the calls: recorded live runs of Haiku seats; today's code reproduces each word for word up to the cut.
Refusals in the files: `OFFER_CLOSED`, `OWN_OFFER`, `NOT_FOR_YOU`, `TOO_MANY_OFFERS`, `PROPOSER_CANNOT_COVER`,
`BRAIN_TOO_LONG`.

The seeded profiles are visible: `market_game_started` carries every trader's values, contract and start goods
(audience `human`).

Not covered: games 3 and 4 of a played match, promises and escrow beyond the one gift and the one settled promise in
`salt-market-s45.json`, other game and round counts by name.

The game (M4-49, `games/salt-market/test/oracle.test.ts`) matches all four files at level 3, three up to their cut. No
mapping of `call.endsTurn` is needed: no tool of the old `salt-market` mechanic set the flag, so the files and today's
calls agree on its absence.
