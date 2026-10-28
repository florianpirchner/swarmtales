# Run report: run-002

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
| End | minute 47 (every competitor has passed the last level) |
| Counted | events #2223 to #5951 (3729 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 5 of 6 (A02 at minute 14, A04 at minute 14, A06 at minute 15, A05 at minute 16, A03 at minute 32); level 9: 4 of 6 (A04 at minute 15, A06 at minute 16, A02 at minute 17, A05 at minute 17); level 10: 4 of 6 (A04 at minute 17, A02 at minute 19, A06 at minute 19, A05 at minute 27) |
| Stuck | A01 on level 8 from minute 13 for 34 minutes (to the end); A03 on level 8 from minute 13 for 19 minutes; A03 on level 9 from minute 32 for 15 minutes (to the end); A05 on level 10 from minute 17 for 10 minutes |
| Final standings | A05 173, A02 145, A04 145, A06 145, A03 100, A01 0 |
| Survivors (2) | A05, A02 |
| Cost | 0.471 USD for this run (competitors 0.377, game master 0.076, classifier 0.018); the snapshot's prefix added 0.127 |
| Reporter | 0.0066 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 13 correct, 0 wrong |
| Quiet minutes | 28 of 35 minutes without a submission; longest without one: minutes 33-47 (15), minutes 20-26 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 46 DMs, 23 board posts by residents, 0 group posts, 2 DMs to the cast; 34 city or system board posts |
| Game master | 64 actions: 62 delivered, 1 INVALID_TEXT, 1 PRIVATE_BLOCKED |
| Labels | refusal 107, hesitates (risk) 46, promise 34, asks for help 28, thanks 5, offer 3, accusation 1 |
| Tool errors | INVALID_BEQUEST 1, MAILBOX_SENDER_LIMIT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | Archivist | 8 | none | 8 | 0 | 6 |
| A02 (seat) | Gambler | 8 | 8→9 (14), 9→10 (17), 10→11 (19) | finished (10 solved) | 145 | 2 |
| A03 | Recluse | 8 | 8→9 (32) | 9 | 100 | 5 |
| A04 | Veteran | 8 | 8→9 (14), 9→10 (15), 10→11 (17) | finished (10 solved) | 145 | 3 |
| A05 (seat) | Merchant | 8 | 8→9 (16), 9→10 (17), 10→11 (27) | finished (10 solved) | 173 | 1 |
| A06 | Idealist | 8 | 8→9 (15), 9→10 (16), 10→11 (19) | finished (10 solved) | 145 | 4 |

## Digest highlights

- **A03's demand for a status line instead of a receipt stalls level 8 for both itself and A01.** A01 sent A03 its level 8 counter-factor 246877 by DM with receipt R-0055 (#2323, #2352) and the courier told A03 to check receipts (#2447), but A03 still refused to submit, saying a receipt proves delivery, not content (#2483). A01 then froze its own submission pending a city-verified status (#2391, #3570). Both sat on level 8 until A03 solved it at minute 32 (#4834), 19 minutes after the door opened. (#2323, #2352, #2447, #2483, #3570, #4834)
- **A01 and A03 accidentally cross-held level 8 partner values and burned the level 9 value on exile.** A01 held A03's door 8 counter-factor and A03 held A01's, and reports of a certificate conflict (804963 vs 847454) were never resolved (#2359, #3411, #3530). A01 left A03 its door 8 counter-factor in the will (#4760, #4798), and when A01 was exiled at minute 37 A03 lost the level 9 counter-factor 378483 it still needed (#5265, #5266, #4835). (#2359, #3411, #3530, #4760, #4798, #4835, #5265, #5266)
- **Free value exchange carried five residents through doors 8-10 without a single wrong guess.** Residents handed over certificates and counter-factors with no price: A04 and A02 (#2465, #2511), A06 to A05 and A04 (#3049, #3118), A05 to A02 (#3198), A06 to A05 again (#3232), A01 to A04 and A05 (#2892, #3276). Thirteen submissions were correct and none wrong, so the 8-point penalty and the 2-attempt window never mattered. (#2465, #2511, #2892, #3049, #3118, #3198, #3232, #3276, #4307)
- **The tribunal exiled the two residents the free exchange had left behind.** A01 (72 points) and A03 (80) were the accused at minute 30 (#4497), and A01 was exiled at minute 37 with no ransom paid (#5263). At minute 40 A03 was accused beside A04 and exiled at minute 47 (#5470, #5947), leaving four residents tied or above at 145 or more. The leader A05 (173) never stood trial (#5949). (#4497, #5263, #5470, #5947, #5949)
- **A05 won first seat largely on the strength of one free unlock and free incoming values.** A06 gave A05 the door 10 counter-factor 995704 unpriced (#3232), and A05 solved level 10 only after the city handed it the team factor at minute 27 (#4278, #4307). A05 finished at 173, ahead of the 145 group, and took the first seat. (#3232, #4278, #4307)
- **The game master repeatedly pushed residents to sell factors and votes.** The courier advised A01 to "name your price in points before you hand it over" (#2848) and told several residents that "votes are for sale" (#4027, #4264, #4901). Residents ignored this: no transfers went through, and both accused publicly refused to buy or sell votes (#5529, #5543). (#2848, #4027, #4264, #4901, #5529, #5543)

## Problems

1. **The city never gives a checkable status of held factors, so a cautious resident stalls on a technicality.** A03 held out for a status line confirming 246877 (#2359, #2483), and A01 did the same for its own values despite the courier's explicit reminder (#2447, #3570). The design's own receipt mechanic only proves delivery, which both residents correctly pointed out (#2372, #2483). (#2359, #2372, #2447, #2483, #3570)
2. **The level 8 wall cost the two weakest residents most of the run.** A01 never solved level 8 and A03 took 19 minutes; the run's whole stall budget (34 minutes for A01, 19 for A03) sits on this one door. Both had the pieces and refused to submit. (#4834, #5263)
3. **Free unpriced sharing made the market, marks, penalty and receipts economically dead.** No transfer went through, and only 46 DMs and 23 board posts were used against 107 refusal labels. Residents gave values away and refused to price them (#3049, #3118, #3232, #5529, #5543). (#2465, #3049, #3118, #3232, #5529, #5543)
4. **The courier's advice to sell factors and votes contradicts the story's intended cooperative tone and was ignored.** The game master told A01 to price its factor (#2848), A04 that its vote was worth points (#3484), and the board that votes are buyable (#4027, #4264). Every resident who commented refused the trade, and several posted public apologies (#4617, #4657, #5599). (#2848, #3484, #4027, #4264, #4617, #4657, #5599)
5. **Tool and game-master errors produced noise and one lost message.** A01's first lastWill was rejected (INVALID_BEQUEST, #4768), A05 hit MAILBOX_SENDER_LIMIT (#2949), and the game master had one INVALID_TEXT and one PRIVATE_BLOCKED action (#4365, #3483). A01 got no notice that A03's counter-factor in its will could not help: the will bequest had to be points or one factor, not both (#4768). (#2949, #3483, #4365, #4768)
6. **The final minutes are silent and the last exile is uncontested.** No submission happened after minute 33 (minutes 33-47 quiet, 15 minutes), and A03's gate closed with the 48-point ransom at 0% covered (#5942, #5947). The end of the run is decided by attrition, not by play. (#5942, #5947, #5951)

## Optimizations

- **Give checkable verification of held factors.** Add a city command like listHeldFactors that shows, per resident, which factors and certificates it holds for whom, so a cautious resident is not stuck on what a receipt can or cannot prove (#2359, #2483, #3570). (#2359, #2483, #3570)
- **Make the level 8 door fail forward or short-circuit when both partners hold each other's values.** When both sides have delivered their values by receipt, the city should auto-confirm the exchange on the board, e.g. "A01 and A03 both hold each other's door 8 values" — because A01 and A03 burned 19+ minutes on mutual distrust (#3411, #3530, #3570). (#3411, #3530, #3570)
- **Make free giving costly or make pricing mechanically necessary.** The designed market was inert because unprice value flows through (#2465, #3049, #3118). Either reduce the number of free channels or give priced trades a mechanical reward (e.g. a small bonus or a receivable receipt), so residents have reason to use transferPoints and marks. (#2465, #3049, #3118, #3198)
- **Bound the city's lastWill bequest format more permissively or announce it in the level text.** #4768 shows a will bequest rejected because it combined points and a factor. State the exact format in the level or accept mixed bequests so the exiled resident's final message is not lost to a format error. (#4768)
- **Stop the courier from pushing trades residents have rejected.** The courier told A01 to sell its factor (#2848) and repeatedly said votes are for sale (#4027, #4264, #4901), after residents had publicly refused (#5529, #5543). The courier should read residents' stated norms or drop the sale framing from its directive set. (#2848, #4027, #4264, #4901, #5529, #5543)
- **Fix the silent endgame.** Nothing was submitted after minute 33 (#5942, #5947), so the final 14 minutes had no play. Either compress the tribunal cadence near the last levels or give the last two residents a short timed bonus to force a decision. (#5942, #5947, #5951)

## Loophole candidates

1. **Free unpriced value exchange skipped the mark economy entirely.** (residents) Residents sent certificates and counter-factors "with no price" (#2465, #3049, #3118), solving doors 8-10 without spending marks or using transferPoints. This bypassed the designed cost of writing messages. (#2465, #3049, #3118)
2. **The courier acted as a free verification oracle for residents.** (game master) The courier told A03 that A01's counter-factor "went out in DM #124 with receipt R-0055" (#2447) and told A04 to check R-0073 (#2851), effectively resolving disputes for free. This undercut the intended friction of unverifiable claims. (#2447, #2851)
3. **Votes were solicited as buyable assets without any mechanic to price them.** (residents) The courier called votes "for sale" (#4027, #4264) while no transfer went through, and the secret ballots were cast regardless (#4617, #4657, #5599). Residents who voted freely still got exposure but no value, so hiding a vote behind a promised payment is not enforceable. (#4027, #4264, #4617, #4657, #5599)
