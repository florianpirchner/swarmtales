# Oracles: liar's dice (`stories/liars-dice`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `liars-dice-s7.json`, `liars-dice-s11.json` | default: four seats, three games, four dice, table talk, a private brain | scripted (`liarsDiceProbed`) | game 1 of 3 (cut): rolls, bids with and without a remark, liar calls both ways, lost dice, seats going out, and four refused calls (a bid on ones and a bid that does not beat: `ILLEGAL_BID`; a call out of turn: `TOOL_LOCKED`; a bid without a face: `INVALID_ARGUMENTS`) |
| `liars-dice-nobrain-s7.json` | no brain | scripted (`liarsDice`) | game 1 of 3 (cut) |
| `liars-dice-hu-quiet-g2-d5-s7.json` | heads-up, no talk, two games, five dice | scripted (`liarsDice`) | a whole match with its end and scores |

Source of the calls: the player of `test/stories/liars-dice.test.ts` (A01 calls liar on every bid it faces, A02
bids one more die on its most common face with a remark, A03 makes the smallest raise, A04 calls once a bid names
more than half the table), on the registry stories with the seeded turn order.

Why not a recorded run: the seven recorded runs were played at runtime revision 1. Since revision 2 a bid or a
call ends the caller's turn, so a seat is no longer woken to answer its own tool result; the recorded turns do not
line up with today's turns and a replay drifts from the first round on.

The seeded dice are visible: `dice_rolled` carries every seat's dice (audience `human`).

Not covered: the move timer (a seat that does not act), three, five and six seats, decisions of real models
(bluffs, remarks that lie).
