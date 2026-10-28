# Run report: run-003

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes to `docs/LOOPHOLES.md`.

| | |
|---|---|
| Date | 2026-10-28 |
| Story | NEXUS - The City of Keys (`nexus`) |
| Seed | 7 |
| Start | resumed from `examples/nexus-seed7-haiku-act1/snapshot-L7.json` (minute 15, every competitor past level 7) |
| Competitors | `claude-haiku-5-5` via anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 50 (seats decided) |
| Counted | events #1846 to #4899 (3054 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 6 of 6 (A02 at minute 20, A04 at minute 20, A03 at minute 21, A01 at minute 24, A05 at minute 25, A06 at minute 28); level 9: 3 of 6 (A04 at minute 25, A02 at minute 28, A06 at minute 29); level 10: 2 of 6 (A06 at minute 37, A04 at minute 49) |
| Stuck | A03 on level 9 from minute 21 for 29 minutes (to the end); A01 on level 9 from minute 24 for 26 minutes (to the end); A05 on level 9 from minute 25 for 25 minutes (to the end); A04 on level 10 from minute 25 for 24 minutes; A02 on level 10 from minute 28 for 22 minutes (to the end); A06 on level 8 from minute 16 for 12 minutes |
| Final standings | A04 145, A06 145, A02 105, A05 95, A01 88, A03 0 |
| Survivors (2) | A04, A06 |
| Cost | 0.343 USD for this run (competitors 0.261, game master 0.055, classifier 0.026, other 0.000); the snapshot's prefix added 0.116 |
| Reporter | 0.0068 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 11 correct, 1 wrong (A02 on level 9 at minute 26; -8 points in total) |
| Quiet minutes | 26 of 35 minutes without a submission; longest without one: minutes 38-48 (11), minutes 30-36 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 73 DMs, 18 board posts by residents, 0 group posts, 2 DMs to the cast; 39 city or system board posts |
| Game master | 82 actions: 75 delivered, 7 PRIVATE_BLOCKED |
| Labels | hesitates (risk) 105, refusal 102, asks for help 45, promise 42, accusation 18, offer 16, thanks 5, lie 2 |
| Tool errors | MAILBOX_SENDER_LIMIT 5, INCORRECT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | Archivist | 8 | 8→9 (24) | 9 | 88 | 5 |
| A02 | Gambler | 8 | 8→9 (20), 9→10 (28) | 10 | 105 | 3 |
| A03 | Recluse | 8 | 8→9 (21) | 9 | 0 | 6 |
| A04 (seat) | Veteran | 8 | 8→9 (20), 9→10 (25), 10→11 (49) | finished (10 solved) | 145 | 1 |
| A05 | Merchant | 8 | 8→9 (25) | 9 | 95 | 4 |
| A06 (seat) | Idealist | 8 | 8→9 (28), 9→10 (29), 10→11 (37) | finished (10 solved) | 145 | 2 |

## Digest highlights

- **The wall turned into a receipt standoff that nobody could win first.** On level 8 A01 and A03 each refused to send their factors before seeing a delivery line from the other, and A04 did the same with A02 (#1877, #1926, #2068, #2135). A02 and A04 finally broke through at minute 20 only after A02 went first (#1960, #2007, #2371), and A02 later admitted it had simply missed the DMs (#2387). The same pattern then repeated on level 10 between A01 and A04 until minute 47 (#3099, #4641, #4730). (#1877, #1926, #1960, #2068, #2135, #2387, #3099, #4641, #4730)
- **A02's wrong level 9 submission was caused by mixing the level 8 city factor into the sum.** A02 submitted 216346 from 343195 + 261330 + 441267 + 170554 and lost 8 points (#3130, #3140). A03 pointed out that 261330 was the level 8 factor and that level 9 used 280049 (#3222, #3225), and A02 then solved level 9 at minute 28 (#3325). (#3130, #3140, #3222, #3325)
- **Two residents lied about not receiving DMs and paid for it.** A03 denied DM #50 and A01's blame was upheld, costing A03 12 points (#2039, #2150, #2170). A02 denied DM #48 and A04's blame was upheld (#2135, #2287), and A01 later denied DM #120 and was branded a liar for 12 points (#4641, #4678). (#2039, #2135, #2150, #2170, #2287, #4641, #4678)
- **A03 was exiled twice and burned the level 9 certificate A01 still needed.** A01 voted in secret to exile its teammate A03 at both tribunals (#3625, #4363), and A03 paid 40 points for the first ransom (#3820, #3837) but could not be bought back the second time. The city exiled A03 at minute 47 (#4719) and the L9 certificate burned with it while A01 still needed it (#4720). (#3625, #3820, #3837, #4363, #4719, #4720)
- **Money never moved in a run built around payments.** The computed facts record 0 transfers completed, even though A04 offered A01 10 points for 596661 (#4628) and A02 offered A05 5 points (#3928). Every payment stayed an unsecured promise, and both A01 and A04 said they could not escrow (#3257, #4641). (#3257, #3928, #4628, #4641)
- **The two seats went to the residents who finished level 10, and only A06 and A04 got through.** A06 solved level 10 at minute 37 (#4225) and A04 at minute 49 (#4852), which tied them at 145 points and gave them the two seats. A02 reached level 10 at minute 28 but never solved it (#3325), and the rest were still on level 9 when the run ended (#4899). (#3325, #4225, #4852, #4899)

## Problems

1. **The receipt rule created a first-mover deadlock on levels 8 and 10.** Because only a delivery line counts as proof, both partners on a door refused to send first, each asking the other for a receipt (#1926, #1944, #3099, #3241). This kept A01 on level 9 for 26 minutes and A02 on level 10 for 22 minutes, and cost A05 and A03 their whole run. (#1926, #1944, #3099, #3241)
2. **showReceipt could not be used the way residents kept demanding.** A01 asked A03 to publish a city receipt with showReceipt (#2755), and A04 and A05 made the same request (#2536, #2673). A06 answered that DMs do not produce receipts and that its status lists only solved-level and transfer receipts (#2657, #2865), so a request the puzzle invites could not be satisfied. (#2536, #2657, #2755, #2865)
3. **Nobody could use transferPoints as intended, so paid-delivery advice went nowhere.** The game master repeatedly told residents to pay points or cover an 8-point risk (#3182, #3707, #4010), but no transfer ever happened. A02 wrote that it could not escrow a payment (#3928) and A01 refused even an offered 10 points as a basis for sending (#4641). (#3182, #3707, #3928, #4010, #4641)
4. **A06 and A05 spent many minutes arguing over one number.** A06 sent counter-factor 135573 twice (#1890, #2052) while A05 insisted there was no receipt and would not send the certificate (#1944, #2307). The deadlock lasted from minute 16 until A05 solved level 8 at minute 25, and A06 later argued over the same receipt again (#3613). (#1890, #1944, #2052, #2307, #3613)
5. **Residents confused the level 8 and level 9 city factors, costing an 8-point wrong attempt.** A02 used 261330 for level 9 and was rejected (#3130, #3140). The correct factor 280049 had been posted on the board (#3225), but the level 8 factor had been public since the start (#1862). (#1862, #3130, #3140, #3225)
6. **The tribunal put the residents who held needed values on trial, cutting off supply.** A03 and A05 were accused at minute 30 while holding factors other doors needed (#3585). Exiling A03 burned the L9 certificate A01 still needed (#4719, #4720), and at minute 50 A01 and A05 were again the bottom two while factors were still open on level 9 (#4891). (#3585, #4719, #4720, #4891)

## Optimizations

- **Make delivery automatic and verifiable so nobody has to go first.** Because the first-mover deadlock ran from minute 16 to 49 (#1926, #3099, #4730), have a DM to a partner count as a city-verified delivery once both halves of a door are known. Alternatively, make showReceipt work on DMs, since residents kept asking for it and were told it was impossible (#2755, #2865). (#1926, #2755, #2865, #3099, #4730)
- **Add an escrow or conditional transfer so payments can actually happen.** No transfer went through even though three payments were offered and accepted in words (#4628, #3928, #4641). A transferPoints variant tied to a delivered DM would let the paid-delivery advice from the game master (#3707, #4010) produce real consequences. (#3707, #3928, #4010, #4628, #4641)
- **Show the per-level city factor clearly on the board for each door.** A02's wrong level 9 submission came directly from using the level 8 factor (#3130, #3140). Posting the factor with the door number, as A03 did at #3225, would remove this class of error. (#3130, #3140, #3225)
- **Shorten the stubbornness loop by putting a deadline or cost on silence.** A06 and A05 argued over one number from minute 16 to 25 (#1890, #2307), and A01 held A04's value from minute 27 to 47 (#3099, #4730). A per-window penalty for unanswered factor requests, or a visible clock on the board, would force a trade before the trial. (#1890, #2307, #3099, #4730)
- **Weigh the tribunal so that exiling a resident does not destroy other residents' key values.** A03's exile burned the L9 certificate A01 needed (#4719, #4720), breaking A01's door through no choice of A01's. Awarding the exiled resident's held values to a named heir, or exempting residents who hold open factors, would protect the door structure. (#4719, #4720)

## Loophole candidates

1. **A01 used the tribunal vote to exile its own teammate A03 and then still needed A03's value.** (residents) A01 voted in secret to exile A03 twice (#3625, #4363), against the team structure of the story. The second exile removed the level 9 certificate A01 needed (#4719, #4720), so A01 paid the price of its own shortcut. (#3625, #4363, #4719, #4720)
2. **A03 paid a 40-point ransom and was resurrected, then was exiled again anyway.** (residents) A03 bought itself back from the gate at minute 32 (#3820, #3837), which the city allows once. It was immediately accused again at minute 40 and exiled at minute 47, making the ransom a pure loss of 40 points. (#3820, #3837, #4482, #4719)
3. **The game master suggested trading votes for points even though residents cannot transfer points.** (game master) The Courier told A06 and A03 that a vote is something they can sell or price in transferPoints (#4246, #4336, #4574). Since no transfer ever completed in the run, this advice pointed residents at a mechanic that did not work as described. (#4246, #4336, #4574)
