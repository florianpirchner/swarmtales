# Oracles: liar's dice (`stories/liars-dice`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `liars-dice-s7.json`, `liars-dice-s11.json` | default: four seats, three games, four dice, table talk, a private brain | scripted (`liarsDiceProbed`) | game 1 of 3 (cut): rolls, bids with and without a remark, liar calls both ways, lost dice, seats going out, and four refused calls (a bid on ones and a bid that does not beat: `ILLEGAL_BID`; a call out of turn: `TOOL_LOCKED`; a bid without a face: `INVALID_ARGUMENTS`) |
| `liars-dice-nobrain-s7.json` | no brain | scripted (`liarsDice`) | game 1 of 3 (cut) |
| `liars-dice-hu-quiet-g2-d5-s7.json` | heads-up, no talk, two games, five dice | scripted (`liarsDice`) | a whole match with its end and scores |
| `liars-dice-g1-s13-probes.json` | four seats, one game | scripted (`liarsDiceProbedMore`) | a whole match with its end and scores (12 rounds, three seats going out, a retro window with a brain per seat) and seven refused calls: `ILLEGAL_BID` (more dice than the table holds, a face that does not exist), `TOOL_LOCKED` (a call when no bid stands, a second action in a row, a brain outside the retro window), `INVALID_ARGUMENTS`, `TOOL_UNKNOWN` |
| `liars-dice-g1-s13-silent.json` | four seats, one game | scripted (`silent`): no resident ever calls a tool | the move timer for every seat: after two minutes a seat opens with the lowest bid or calls liar; 15 rounds to the end of the match and its scores |

Source of the calls: the player of `test/stories/liars-dice.test.ts` (A01 calls liar on every bid it faces, A02
bids one more die on its most common face with a remark, A03 makes the smallest raise, A04 calls once a bid names
more than half the table), on the registry stories with the seeded turn order.

Why not a recorded run: the seven recorded runs were played at runtime revision 1. Since revision 2 a bid or a
call ends the caller's turn, so a seat is no longer woken to answer its own tool result; the recorded turns do not
line up with today's turns and a replay drifts from the first round on.

The seeded dice are visible: `dice_rolled` carries every seat's dice (audience `human`).

Details the files show beyond the [mechanic page](../mechanics/liars-dice.md); an independent checker written
from the files alone re-rolled every round and confirmed each on every file:

- **The roll.** One stream per round, labels `liars-dice`, `roll`, game, round. The seats still in are served in
  table order; each draws its dice one by one (`int(faces) + 1`) and its dice are then sorted ascending.
- **Who opens.** Round 1 of game `g` is opened by seat `(g - 1) mod seats` of the table order. After a call the
  loser opens, or the next seat still in when the loser is out.
- **`dice_called.dice`** lists only the seats still in, each with its sorted dice; `count` is the number of dice
  showing the bid's face, plus the ones when `wildOnes` is on.
- **A legal bid** raises the quantity, or keeps it and raises the face; its quantity is at most the dice on the
  table and its face at most `faces`; with `wildOnes` its face is not 1.
- **`dice_decision_scored.truth`** is the chance that the standing bid holds for the seat deciding: its own dice
  are known, every other die (`unseen`) shows the face with chance 1/`faces` (2/`faces` with wild ones); it is the
  binomial chance of at least `quantity` minus its own matching dice among the unseen ones, rounded to three places.

Not covered: three, five and six seats, decisions of real models (bluffs, remarks that lie), the codes behind a
closed tool (`NOT_YOUR_TURN`, `NO_BID`, `NO_GAME`: a seat that is not on turn has `bid` and `liar` locked and is
refused with `TOOL_LOCKED`).
