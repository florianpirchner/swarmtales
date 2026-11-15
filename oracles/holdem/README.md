# Oracles: hold'em (`stories/holdem`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `holdem-s7.json`, `holdem-s11.json` | default: four seats, fixed limit, duplicate deals, a private brain | scripted (`holdemProbed`) | six hands of game 1 (cut): blinds, bets, raises, calls, folds, checks, boards, showdowns, pots; three refused calls (an action out of turn: `TOOL_LOCKED`; an unknown action and a missing one: `INVALID_ARGUMENTS`) |
| `holdem-nobrain-s7.json` | no brain | scripted (`holdem`) | six hands of game 1 (cut) |
| `holdem-hu-s7.json` | heads-up | scripted (`holdem`) | six hands of game 1 (cut) |
| `holdem-aid-mixed-s7.json` | the registry story `holdem-aid-mixed`: no brain, the decision aid for A01 and A03 (`aid: true`, `aidSeats`) | scripted (`holdem`) | six hands of game 1 (cut): the aid line `Referee's estimate: you win ... (pot odds)` in 33 of the 79 `viewTable` answers, all of A01 and A03 and none of A02 and A04, on the duplicate deals of `holdem-nobrain-s7.json`; recorded for M4-18 (`../m4-catalog.patch`) |
| `holdem-hu-s13-silent.json` | heads-up | scripted (`silent`): no resident ever calls a tool | the action timer: every action is the default of the clock; two whole games of 12 hands with `game_scored`, the retro windows and `match_ended` |

Source of the calls: the player of `test/stories/holdem.test.ts` (A01 bets and raises whenever it may, A02 calls
everything, A03 never puts a chip in voluntarily, A04 plays a pair or an ace and folds the rest), on the registry
stories with the seeded turn order.

Why not a recorded run: all 50 recorded runs were played at runtime revision 1. Since revision 2 an action ends
the caller's turn when another seat is to act, so the recorded turns do not line up with today's turns.

The seeded deal is visible: `cards_dealt` carries the hole cards and the whole runout (audience `human`).
`decision_scored` (audience `human`) holds the platform's equity estimate per decision; it comes from seeded
sampling and must match.

Not covered: the end of a game and of the match at a played table of four (cut before; the silent heads-up file
has both), the mixed tables of brain seats (`holdem-mixed`), decisions of real models.

Registered difference (M4-39): no file of `oracles/` carries `call.endsTurn`, although the format names it and the
old mechanic set it on every `act` that passed the turn on or ended the hand (old `mechanics/holdem/src/index.ts`,
lines 291 and 292). The flag is read from the reply, which level 2 compares ("end your turn now" ends the turn); the
oracle test of the game (`games/holdem/test/oracle.test.ts`) writes it back into the file's call entries before it
compares, as for liar's dice. All six files match at level 3 with that mapping (`holdem-aid-mixed-s7.json` since
M4-40).
