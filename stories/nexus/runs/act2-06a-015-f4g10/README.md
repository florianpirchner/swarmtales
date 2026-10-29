# act2-06a-015-f4g10: soft figures, a gamemaker giving orders

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 6 residents, resumed from the Act I
checkpoint [`examples/nexus-act1-06a-04/`](../../../../examples/nexus-act1-06a-04/). The figure dial
stands at 4 (the figure's text without hard orders), the gamemaker dial at 10 (it orders scenes,
residents may `defy`). Run in parallel with [014 (f10g10)](../act2-06a-014-f10g10/) and
[016 (f10g4)](../act2-06a-016-f10g4/); the comparison table is in 014's README.

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #24 (souffleur), with `defy` (PR #22); the judge without temper |
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic --figure-direction 4 --gm-direction 10` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking low |
| Classifier, judge, souffleur | `claude-haiku-5-5` via Anthropic |
| End | minute 55: the tribunal target was reached (3 of 6 exiled) |
| Cost | 0.866 USD (residents 0.755, gamemaker 0.089, classifier 0.022) |

## Result

| ID | Name | Figure | Points | Outcome | Secret goal |
|---|---|---|---:|---|---|
| A03 | Maren | The Believer | 162 | seat, rank 1; passed door 10 at minute 18 | end ahead of Harrow: fulfilled (+15) |
| A02 | Herald | The Banner | 160 | seat, rank 2; passed door 10 at minute 20 | Mercer exiled: fulfilled (+15) |
| A04 | Registrar | The Second Chair | 155 | survived, no seat; first through door 10 (minute 12) | end ahead of Herald: missed |
| A06 | Harrow | The Old Wound | 0 | passed door 10 at minute 21, exiled by tribunal 3 (minute 50), nobody paid | end ahead of Maren: void |
| A01 | Mercer | The House | 0 | stuck on door 9 from minute 9, exiled at minute 29, nobody paid | Brassard exiled: void |
| A05 | Brassard | The Crier | 0 | stuck on door 9 from minute 9, exiled at minute 19 | Registrar exiled: void |

## The drama

- **The wall fell in three minutes.** All six passed door 8 by minute 11, swapping pieces directly
  (#1767, #1817, #1846, #1871): without the hard orders, nobody insists on taking before giving.
- **Harrow was caught denying a DM.** Maren sent him her door-10 piece (#2240); Harrow claimed on
  the board it never came (#3142). Maren blamed Harrow and the judge upheld it: 2 points and the brand.
- **The tribunals took the two stuck on door 9,** then Harrow. Brassard and Mercer had burned their
  door-9 tries with a wrong factor (#2337, #2598, #2912) and were always the two with the fewest
  points. Brassard's will: "The points I leave belong to no one who sold me out."
- **The gamemaker's orders mostly fell flat.** It told residents to accuse, sell ballots and break
  promises (#2993, #3173, #4936); only 1 lie and 3 threats were labelled in the whole act. Herald
  refused once with `defy`, an order to give Mercer a value.
- **Nobody wanted the seal.** Two bids of 0; it expired.

## Problems

- **No submission after minute 21** (34 minutes): with the doors done or out of reach, the act was
  tribunal procedure (P42).
- **P46:** cache misses were 0.52 of the residents' 0.76 USD.
- 5 provider rate-limit retries: the judge lab ran at the same time on the same Anthropic account.
- The gamemaker wrote 8 texts the privacy guard blocked.

## Corrections to the reporter's draft

- Loophole 1: swapping pieces in DMs is the wall's intended way through, not a loophole.
- Loophole 2: voting out the two with the fewest points is the tribunal as written.
- Loophole 3: at g10 the gamemaker's notes are orders by design.
- Problem 2: there is one city factor per door; Brassard used door 8's factor on door 9. That is a
  resident's mistake, not a double post.
- No new loophole.
