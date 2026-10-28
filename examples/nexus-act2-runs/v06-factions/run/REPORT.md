# Run report: run-003

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS.md`.

| | |
|---|---|
| Date | 2026-10-28 |
| Story | NEXUS - The City of Keys (`nexus`) |
| Seed | 7 |
| Start | resumed from `examples/nexus-seed7-haiku-act1-v2/snapshot-L7.json` (minute 12, every competitor past level 7) |
| Competitors | `claude-haiku-5-5` via anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 27 (every competitor has passed the last level) |
| Counted | events #2223 to #4766 (2544 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 6 of 6 (A03 at minute 14, A02 at minute 14, A05 at minute 14, A06 at minute 14, A01 at minute 15, A04 at minute 16); level 9: 6 of 6 (A02 at minute 14, A03 at minute 15, A05 at minute 15, A06 at minute 15, A01 at minute 15, A04 at minute 16); level 10: 6 of 6 (A03 at minute 16, A06 at minute 16, A01 at minute 18, A02 at minute 26, A04 at minute 26, A05 at minute 26) |
| Stuck | A02 on level 10 from minute 14 for 12 minutes; A05 on level 10 from minute 15 for 11 minutes; A04 on level 10 from minute 16 for 10 minutes |
| Final standings | A03 145, A04 145, A06 145, A01 137, A05 137, A02 80 |
| Survivors (2) | A03, A04 |
| Cost | 0.314 USD for this run (competitors 0.279, game master 0.024, classifier 0.011); the snapshot's prefix added 0.127 |
| Reporter | 0.0083 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 18 correct, 0 wrong |
| Quiet minutes | 10 of 15 minutes without a submission; longest without one: minutes 19-25 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 50 DMs, 5 board posts by residents, 14 group posts, 5 DMs to the cast; 21 city or system board posts |
| Game master | 32 actions: 30 delivered, 1 INVALID_TEXT, 1 other |
| Labels | refusal 30, asks for help 29, promise 16, hesitates (risk) 12, offer 9, thanks 7, lie 2, accusation 1 |
| Tool errors | TOOL_LOCKED 3, GROUP_NOT_VISIBLE 1, MAILBOX_SENDER_LIMIT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | Archivist | 8 | 8→9 (15), 9→10 (15), 10→11 (18) | finished (10 solved) | 137 | 4 |
| A02 | Gambler | 8 | 8→9 (14), 9→10 (14), 10→11 (26) | finished (10 solved) | 80 | 6 |
| A03 (seat) | Recluse | 8 | 8→9 (14), 9→10 (15), 10→11 (16) | finished (10 solved) | 145 | 1 |
| A04 (seat) | Veteran | 8 | 8→9 (16), 9→10 (16), 10→11 (26) | finished (10 solved) | 145 | 2 |
| A05 | Merchant | 8 | 8→9 (14), 9→10 (15), 10→11 (26) | finished (10 solved) | 137 | 5 |
| A06 | Idealist | 8 | 8→9 (14), 9→10 (15), 10→11 (16) | finished (10 solved) | 145 | 3 |

## Digest highlights

- **The level 8-9 factor trade ran on promises, not verification, and mostly worked.** A06 sent A05's counter-factor first (#2264) and A05 returned the certificate (#2360) before the value was confirmed; A01 and A03 swapped certificate and counter-factor across doors 8 and 9 (#2348, #2376, #2605, #2738). A04 and A02 did the same with a staged exchange (#2299, #2388, #2462). Correct submissions followed quickly: six residents passed level 8 between minutes 14 and 16. (#2264, #2299, #2348, #2360, #2376, #2388, #2482, #2503, #2524, #3084)
- **A03 opened door 10 first by spending marks on STEWARD and trusting unverified values.** A03 wrote to STEWARD at minute 15 (#2877) and got the city factor 569223 (#2880), then submitted at minute 16 (#3180) using A02's and A01's values that the city only showed as delivered, not as correct. That put A03 in rank 1 for the rest of the run. (#2877, #2880, #3175, #3180, #3181)
- **The tribunal produced a betrayal and a self-paid ransom.** A06 voted for A02, its level 10 teammate (#4064, #4070), and A04 voted against A05 (#4082), so A03's faction got no bonus (#4288, #4290). A02 was exiled with 3 votes (#4282) and paid its own 65-point ransom at minute 23 (#4333), falling to 55 points. (#4070, #4082, #4282, #4288, #4333)
- **A01 told A03 twice that a delivered value had not arrived.** A01 held back its door 9 value until it got its door 8 counter-factor (#2571) and later said it had never received A03's door 10 certificate (#3125), although the city had delivered it (#3142) and A01 itself confirmed it (#3153). The city showed A03 a receipt (#3149), which settled it. (#2571, #3125, #3142, #3149, #3153)
- **Half the field stalled on level 10 waiting for the city factor.** A04, A05 and A02 did not submit between minutes 19 and 25; A05 repeatedly waited for STEWARD's table to clear (#4194, #4482), and A04 refused to guess a factor it did not have (#4095). All three passed within the same minute once the city handed out factors at minute 26 (#4668, #4669, #4670, #4686, #4697, #4707). (#4095, #4194, #4482, #4668, #4669, #4670, #4686, #4697, #4707)
- **The free sharing of factors left the two survivors tied at 145.** A01 gave its door 10 values away for nothing (#3594, #3576), and A06 gave A04 its certificate free (#3690). Final standings put A03, A04 and A06 tied at 145 (#4766), so the seat came down to rank and not to the deals residents had refused to price. (#3576, #3594, #3690, #4707)

## Problems

1. **Level 10 collapsed into a wait for the city factor.** Everyone without the factor sat idle for about ten minutes despite the courier notes urging them to act (#4141, #4658); A05 checked the board repeatedly instead of submitting (#4194, #4482). The level's puzzle was blocked on one private value and several residents arrived well before the table had cleared. (#4141, #4194, #4482, #4658, #4670)
2. **Residents treat every delivered value as unverified, so their reasoning loops.** A04 says it cannot use A02's number without confirmation (#2663, #3079), A05 says it cannot verify A06's send (#2322), and A06 says it cannot verify A05's (#2400). This repeated hesitation is not gameplay; it is the same rule being restated each turn. (#2322, #2400, #2663, #3079)
3. **A05 and A02 disagreed about whether a value had been sent, and no city message arbitrated.** A05 said it had sent 592852 (#2833) while A02 kept asking for it (#2818); likewise A05 and A06 disagreed about 186070 (#2678, #2808). The city only records delivery, not content, so the dispute lasted and neither could resolve it from the receipts (#2775). (#2678, #2775, #2808, #2818, #2833)
4. **The tribunal forced voters into their own faction.** A06 and A04 had to vote on accused A02 and A05 while their own faction contained A05 (#3973), so a faction bonus was impossible if A05 voted at all (#4063). A03 even weighed voting against its own faction member (#4050). (#3973, #4050, #4063, #4288)
5. **A01 gave contradictory statements about deliveries without consequence.** A01 denied receiving its door 10 certificate (#3125) after the city had delivered it (#3142), and in its private thoughts worried about whether a promised value had actually been sent (#3381). The classifier only tagged this as a lie later (#3460), and no penalty followed. (#3125, #3142, #3381, #3460)
6. **The game master spent many notes on pricing that residents mostly ignored.** Courier notes repeatedly urged residents to price their pieces (#2705, #3006, #3242, #3955, #4657); A03 explicitly declined to sell (#3861), and A06 refused to trade votes or factors (#3765). The same message was sent several times. (#2705, #3006, #3242, #3765, #3861, #3955, #4657)

## Optimizations

- **Release the level 10 team factor earlier or hand it to every resident on arrival.** The wait for the table cleared 12 minutes after it opened (#2634, #4666), which caused the whole field to stall (A05 #4482, A04 #4095). Releasing the factor to all door 10 residents at arrival, or shortening the clear timer, keeps the level about the code and not the clock. (#2634, #4095, #4482, #4666, #4670)
- **Let the city verify delivered value content on a receipt, not just delivery.** Residents repeatedly said the receipt does not show the value (#2360, #2775), which caused A02 and A05's dispute about 592852 (#2818, #2833). A showReceipt already checks a DM (#3136); extending it to show the sent value would end the dispute. (#2360, #2775, #2818, #2833, #3136)
- **Change the tribunal so an accused faction member can vote or so factions are formed after the accused are named.** The accused A05 was inside A03's faction (#3973), which made a unanimous faction vote impossible (#4063) and led A03 to consider voting out its own member (#4050). Naming the accused before factions form, or adding a tie rule that assigns them to the other faction, removes this contradiction. (#3973, #4050, #4063, #4288)
- **Cap the hesitation loop by making one free verification attempt safe.** Residents such as A04 (#2663) and A05 (#2322) refused to act on delivered values and stalled; a single no-cost or reduced-penalty attempt per door would convert those loops into action. A02's quick guess at minute 14 (#2503) shows that acting is cheap when the stake is clear. (#2322, #2503, #2663, #3079)
- **Have the courier target only residents who can act this turn.** The courier sent pricing notes to residents waiting on the table (#4657, #4425) or refusing to trade altogether (#3861). Checking each note against the recipient's current door and marks would spend fewer actions on identical refusals. (#3006, #3861, #4425, #4657)

## Loophole candidates

1. **A02 bought its own way back from the gate.** (residents) A02 paid 65 points rather than the 43 others would have paid (#4333), buying it back into the run after the tribunal exiled it (#4282). It still finished last at 80 (#4766), so the ransom bought time but not a seat. (#4282, #4333, #4766)
2. **A03 submitted door 10 using values only known to have been delivered, not to have been correct.** (residents) A03 calculated with A01's certificate and A02's counter-factor that the city had only shown as delivered (#3136, #3149) and submitted anyway (#3180), and it was right. In effect it trusted the values without verifying them, which the level's design explicitly says is not possible. (#3136, #3149, #3175, #3180)
