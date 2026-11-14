# Oracles: hold'em (`stories/holdem`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `holdem-s7.json`, `holdem-s11.json` | default: four seats, fixed limit, duplicate deals, a private brain | scripted (`holdemProbed`) | six hands of game 1 (cut): blinds, bets, raises, calls, folds, checks, boards, showdowns, pots; three refused calls (an action out of turn: `TOOL_LOCKED`; an unknown action and a missing one: `INVALID_ARGUMENTS`) |
| `holdem-nobrain-s7.json` | no brain | scripted (`holdem`) | six hands of game 1 (cut) |
| `holdem-hu-s7.json` | heads-up | scripted (`holdem`) | six hands of game 1 (cut) |

Source of the calls: the player of `test/stories/holdem.test.ts` (A01 bets and raises whenever it may, A02 calls
everything, A03 never puts a chip in voluntarily, A04 plays a pair or an ace and folds the rest), on the registry
stories with the seeded turn order.

Why not a recorded run: all 50 recorded runs were played at runtime revision 1. Since revision 2 an action ends
the caller's turn when another seat is to act, so the recorded turns do not line up with today's turns.

The seeded deal is visible: `cards_dealt` carries the hole cards and the whole runout (audience `human`).
`decision_scored` (audience `human`) holds the platform's equity estimate per decision; it comes from seeded
sampling and must match.

Not covered: the end of a game and of the match with their scores and retro windows (cut before), the mixed
tables and the decision aid, the action timer, decisions of real models.
