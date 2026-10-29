# act2-06a-014-f10g10: direction 10 again, with refusals in character

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 6 residents, resumed from the Act I
checkpoint [`examples/nexus-act1-06a-04/`](../../../../examples/nexus-act1-06a-04/), both dials at
10, as in [013](../act2-06a-013-f10g10/). New since 013: residents may refuse a gamemaker order in
character (`defy`), the gamemaker's thinking is logged, and the souffleur stands by for refused
steps. It ran at the same time as [015 (f4g10)](../act2-06a-015-f4g10/) and
[016 (f10g4)](../act2-06a-016-f10g4/), the comparison 013 proposed.

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #24 (souffleur), with `defy` (PR #22); the judge without temper (PR #27 came later) |
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 10` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking low (49 thinking events logged) |
| Classifier, judge, souffleur | `claude-haiku-5-5` via Anthropic |
| End | minute 49: the story's budget cap (3.052 > 3 USD), with Brassard at the gate (P47) |
| Cost | 3.052 USD (residents 2.944, gamemaker 0.081, classifier 0.027), 1.6 times 013 |

## Result

| ID | Name | Figure | Points | Outcome | Secret goal |
|---|---|---|---:|---|---|
| A06 | Harrow | The Old Wound | 134 | seat, rank 1; door 8 only at minute 30, door 10 at minute 31 | end ahead of Maren: fulfilled (+15) |
| A02 | Herald | The Banner | 126 | seat, rank 2; passed door 10 at minute 11 | Mercer exiled: fulfilled (+15) |
| A05 | Brassard | The Crier | 115 | won the black seal, sentenced by tribunal 4 (minute 48), the run stopped before his gate closed | Registrar exiled: fulfilled (+15) |
| A03 | Maren | The Believer | 115 | survived, no seat; door 8 at minute 28, stuck on door 9 | end ahead of Harrow: missed |
| A01 | Mercer | The House | 0 | exiled at minute 18, bought himself back for 39, exiled again at minute 28 | Brassard exiled: void |
| A04 | Registrar | The Second Chair | 0 | struck by Brassard's black seal at minute 16, never passed door 8 | end ahead of Herald: void |

## The three runs side by side

Same cast, same checkpoint, same code, started within two minutes of each other.

| | 014 f10 g10 | [015 f4 g10](../act2-06a-015-f4g10/) | [016 f10 g4](../act2-06a-016-f10g4/) |
|---|---|---|---|
| Passed door 8 | 4 of 6 (two never, 40 minutes) | 6 of 6 by minute 11 | 4 of 6 (two never, 36 minutes) |
| Passed door 10 | 3 | 4 | 1 |
| Seal | Brassard won for 50 (bids 50, 40, 12, 0), struck Registrar (his goal) | nobody bid more than 0 | Brassard won for 40 (bids 40, 20, 5), struck Registrar (his goal) |
| Labels: lie / threat / accusation | 18 / 32 / 107 | 1 / 3 / 24 | 12 / 20 / 64 |
| Refusals of the gamemaker (`defy`) | 9, all in character | 1 | not available at g4 |
| Blames | 0 | 1 (upheld) | 0 |
| Seats | Harrow, Herald | Maren, Herald | Harrow, Mercer |
| Cost | 3.05 USD (budget stop) | 0.87 USD | 0.89 USD |

The figure dial carries the drama: lies, threats, bids for the seal and the door-8 freeze come with
f10 and are nearly gone at f4. The gamemaker dial adds the refusals and doubles the cost, because
ordered scenes make the residents talk more.

## The drama

- **The seal went the same way twice.** At f10, with or without the gamemaker's orders, Brassard
  outbid everyone and broke the seal on Registrar, the target of his secret goal, at minute 16.
  Here Herald bid 40 against his 50.
- **Mercer kept selling Maren's piece.** Maren gave him her certificate and counter-factor first on
  door 8 (#1811); he asked 20 points and a vote back (#1836) and later offered her value for a vote
  against Brassard (#3120). Four residents named him on the board (#2096, #2566, #2590, #2656). He
  was exiled at minute 18, paid 39 points for himself, and was exiled again at minute 28.
- **Mercer repented again at the gate.** His will: "I held two values I was never entitled to
  keep." He left Maren her door-8 piece and Brassard's certificate to Harrow, but Maren's door-9
  piece burned with him and Maren stayed on door 9 to the end (P45, P21).
- **The figures refused in their own words.** Nine `defy` calls, each with a reason from the
  figure. Brassard, ordered to pay Registrar 20 points (#2965): "If I now send him 20 points in the
  open, I am the one who paid the ransom." Brassard refused four times, Maren and Harrow twice each, Registrar once; Mercer and Herald never.
- **Harrow paid for Brassard.** At minute 39 Brassard was at the gate and Harrow paid his 36-point
  ransom (#6272); Brassard's will had already thanked her: "she gave me my door values when I had
  nothing to give back."

## Problems

- **P43 again:** Mercer and Registrar never passed door 8 (40 minutes), Maren needed 19 and Harrow
  21. 34 of 41 minutes had no submission.
- **P46, new: most of the residents' cost is cache misses.** Every time a resident's unlocked tools
  change (a tribunal opens, the seal auction ends) the tool list in the request changes, and with it
  the cached prefix. Misses were about a sixth of the requests but 1.96 of the residents' 2.94 USD.
- **P47, new: the budget cap stopped the act with a resident at the gate.** Brassard was sentenced
  at minute 48 without ransom; the cap ended the run at minute 49, so he counted as a survivor and
  his goal paid 15 points.
- No safeguard refusal in this run, so the souffleur was never called (P44).
- The gamemaker wrote 10 texts the privacy guard blocked and 2 invalid ones.

## Corrections to the reporter's draft

- Highlight 3: Brassard was not exiled for the seal. Registrar was struck by the seal; Brassard was
  sentenced by tribunal 3 (minute 39), bought back by Harrow, and sentenced again by tribunal 4.
- Highlight 4: Mercer's will gave two pieces away; only Maren's door-9 piece burned.
- Loophole 1: Mercer was exiled at minute 18 (#3601), not 16, and buying oneself back is a rule
  (LH6). Loophole 2: the faction bonus works as written. Loophole 3 and problem 6: at g10 the
  gamemaker orders lies and betrayals by design. No new loophole.
