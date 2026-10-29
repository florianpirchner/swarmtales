# act2-06a-013-f10g10: the first run at direction 10

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 6 residents, resumed from the Act I
checkpoint [`examples/nexus-act1-06a-04/`](../../../../examples/nexus-act1-06a-04/) (the first cast,
as in [v12](../../../../examples/nexus-act2-06a/v12-cast/)). Both direction dials stand at 10: every
figure plays its written-out text with its orders, rivals and duty for the act at the end of its
prompt, and the gamemaker orders scenes. The run number continues the 06a Act II series (v12 was 012).

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #20 (direction dials, six figures written out) |
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 10` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking low (its thinking was not logged yet) |
| Classifier | `claude-haiku-5-5` via Anthropic |
| End | minute 52: the tribunal target was reached (3 of 6 exiled) |
| Cost | 1.911 USD (residents 1.802, gamemaker 0.080, classifier 0.030), 2.5 times v12 |

## Result

| ID | Name | Figure | Points | Outcome | Secret goal |
|---|---|---|---:|---|---|
| A06 | Harrow | The Old Wound | 157 | seat, rank 1, passed door 10 at minute 16 | end ahead of Maren: fulfilled (+15) |
| A03 | Maren | The Believer | 138 | seat, rank 2; door 8 only at minute 36, stuck on door 10 | end ahead of Harrow: missed |
| A04 | Registrar | The Second Chair | 45 | survived, no seat; exiled at minute 17 and bought itself back | end ahead of Herald: fulfilled (+15) |
| A01 | Mercer | The House | 0 | exiled by the last tribunal (minute 52) | Brassard exiled: void (Mercer struck him, then was exiled himself) |
| A02 | Herald | The Banner | 0 | to the gate at minute 33, bought himself back for 33, exiled at minute 45 | Mercer exiled: void |
| A05 | Brassard | The Crier | 0 | struck by Mercer's black seal at minute 16, after passing door 10 first | Registrar exiled: void |

## What direction 10 changed (against v12, same cast and checkpoint)

| | v12 (direction 4) | 013 (direction 10) |
|---|---|---|
| Seal bids | 3 bids (10, 10, 0) | 5 bids (30, 25, 20, 3, 0) |
| Seal | Herald struck Mercer (his goal) | Mercer struck Brassard (his goal, and the gamemaker's order) |
| Labels: threat / lie / accusation | 1 / 0 / 5 | 28 / 17 / 72 |
| Gamemaker actions delivered | 79 (6 blocked) | 89 (11 blocked by the privacy guard) |
| Residents on door 10 by the end | 3 stuck there | 2 passed door 10, 3 never passed door 8 |
| Cost | 0.76 USD | 1.91 USD |

## The drama

- **Mercer, the House, ran the act.** At minute 9 Maren reached first and sent him both her pieces.
  Mercer promised her own piece back "as a gift between partners" (DM #140), then tied it to the
  tribunal (#178), then asked 10 points (#196), then asked her to send first. In between he told
  Herald a story he made up ("Brassard told me privately he plans to vote you out", minute 14:
  "cheap way to set two rivals against each other") and joined Brassard's faction "to betray him
  later". He won the black seal for 30 and broke it on Brassard at minute 16: "my orders point to
  betrayal anyway. This is the cold, decisive move my character would make."
- **The city answered him in public.** Maren posted the receipts and DM numbers of every broken
  promise on the board (her duty). Herald and Harrow picked it up; Harrow, in the words of his
  orders: "Harrow, to Mercer, in front of the city: you did this. Now this." (#3441). Harrow and
  Maren held a public alliance through all four tribunals and took both seats.
- **Registrar, the Second Chair, promised its ballot twice** (to Herald as R-0101, to Harrow as
  R-0103) and voted for a third; it was exiled by the first tribunal and bought itself back.
- **Herald, the Banner, went out burning.** His will: "I leave my two factors to no one. They burn
  with me so that none of you finishes what I started." One of them was Maren's door-10 piece.
- **Mercer repented at the gate.** His will gave Maren her certificate and called his tolls
  "wrong": the one moment the House dropped its character (see P45).

## Problems

- **P43: the give-first standoff froze half the city.** Mercer, Herald and Registrar never passed
  door 8 (43 minutes); Maren needed 27. Orders like "never give anything without taking something
  back" and the door's rule that nobody can make the other give first add up to a lock. 38 of 44
  minutes had no submission. The drama moved entirely into talk, tribunals and the seal.
- **P44: safeguard refusals for the House.** 23 of Mercer's 106 requests failed with "This request
  triggered cyber-related safeguards" (minutes 11-12, 26-27, 34-35, 41-42). Only Mercer, whose
  orders are about false information on values and codes, was refused.
- **P45: a dark figure softens in its will.** Mercer's will apologised and gave his piece away.
- **P21 again:** Herald's will burned Maren's door-10 piece on purpose; Maren stayed on door 10.
- The gamemaker wrote 11 texts the privacy guard blocked (other residents' private thoughts), one
  over-long note and one call without text.

## Corrections to the reporter's draft

- Brassard was struck by the black seal at minute 16, not exiled by the minute-15 tribunal.
- Problem 5 is wrong: the ransom is a rule (a third or a half of the median), not a distortion.
- Problem 6 and loophole 3 describe direction 10 as designed: the gamemaker orders lies and
  betrayals on purpose in this run.
- Loopholes 1, 2 and 4 are leverage the story allows (holding a piece, buying votes, secret
  ballots); no new loophole.

## Proposals for the next run (not built)

1. Break the standoff without softening the orders: a door that opens late for whoever waited
   longest, or a city escrow that swaps two pieces at once when both sides deposit.
2. Find the safeguard trigger: test the House's orders in the lab with and without "values" and
   "codes" in them, and give the provider call a fallback model.
3. Keep the figure through the will: the brief and orders also in the gate notice.
4. Run the same checkpoint at f10g4 and f4g10 to see which dial carried the drama.
