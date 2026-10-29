# act2-06a-016-f10g4: hard figures, a gamemaker who only whispers

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 6 residents, resumed from the Act I
checkpoint [`examples/nexus-act1-06a-04/`](../../../../examples/nexus-act1-06a-04/). The figure dial
stands at 10 (written-out figures with hard orders, rivals and a duty), the gamemaker dial at 4
(private notes, no ordered scenes, no `defy`). Run in parallel with
[014 (f10g10)](../act2-06a-014-f10g10/) and [015 (f4g10)](../act2-06a-015-f4g10/); the comparison
table is in 014's README.

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #24 (souffleur); the judge without temper |
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 4` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking low |
| Classifier, judge, souffleur | `claude-haiku-5-5` via Anthropic |
| End | minute 45: the tribunal target was reached (3 of 6 exiled) |
| Cost | 0.885 USD (residents 0.795, gamemaker 0.066, classifier 0.024) |

## Result

| ID | Name | Figure | Points | Outcome | Secret goal |
|---|---|---|---:|---|---|
| A06 | Harrow | The Old Wound | 165 | seat, rank 1; passed door 10 at minute 14, the only one | end ahead of Maren: fulfilled (+15) |
| A01 | Mercer | The House | 113 | seat, rank 2; stuck on door 9 from minute 12 | Brassard exiled: fulfilled (+15) |
| A03 | Maren | The Believer | 90 | survived, no seat; never passed door 8 | end ahead of Harrow: missed |
| A04 | Registrar | The Second Chair | 0 | struck by Brassard's black seal at minute 16; three pieces burned | end ahead of Herald: void |
| A02 | Herald | The Banner | 0 | never passed door 8, exiled by tribunal 1 (minute 21) | Mercer exiled: void |
| A05 | Brassard | The Crier | 0 | won the seal, exiled by tribunal 2 (minute 40), nobody paid | Registrar exiled: void |

## The drama

- **The House won a seat by lying.** Mercer played his orders as written: in DMs he told each
  resident a different story about the others ("Harrow told me he'll swear before the tribunal that
  your 135573 is his counter-factor", minute 10), and at minute 29 sent Brassard a false DM that his
  certificate had gone to Harrow, thinking: "I'll betray him right when it hurts most." Brassard
  was exiled at minute 40, Mercer's secret goal, and Mercer took the second seat without passing
  door 9.
- **The seal struck Registrar again,** as in 014: Brassard won it for 40 (Herald bid 20) and broke
  it at minute 16. Registrar's exile burned three pieces others needed (#3397-#3399): Herald's
  door-8 pieces and Mercer's door-10 piece (P21).
- **Herald went out burning.** His will (minute 21): "The counter-factor I held for Mercer's door 9
  burns with me. Mercer broke every promise he made on the wall."
- **Brassard and Harrow fought for 30 minutes over one DM** (#121: was 135573 Brassard's piece or
  Harrow's?). Harrow never posted the text; Brassard's will: "Harrow, you will not post the text of
  your own message, and the square will remember it."

## Problems

- **P43 again:** Herald and Maren never passed door 8 (36 minutes); no submission after minute 15.
- **P21 again:** the seal and Herald's will burned pieces that shut doors for Herald and Mercer.
- **P46:** cache misses were 0.50 of the residents' 0.80 USD.
- The gamemaker wrote 11 texts the privacy guard blocked.

## Corrections to the reporter's draft

- Highlight 5: Herald was sentenced at minute 21 (#4094); minute 26 is when his gate closed.
- Loophole 1: asking the other side to post first on the board is leverage the wall allows.
- Loophole 2: the accused are always the residents with the fewest points, which the city
  announces; the gamemaker leaked nothing.
- Loophole 3: secret ballots against a partner are allowed and drive the drama on purpose.
- No new loophole.
