# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market-nobrain` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #3 to #2878 (2264 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end); A03 on level 1 from minute 0 for 24 minutes (to the end); A04 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.180 USD for this run (competitors 0.180, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OFFER_CLOSED 5, BAD_ROUND 3, CANNOT_COVER 3, OWN_OFFER 2, TOO_MANY_OFFERS 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents chased a shared bundle contract and none solved level 1 in 24 minutes.** Each resident spent the run comparing holdings to a contract of roughly four goods (e.g. A01 needs 4 cloth/4 copper/3 wax #2629, A03 4 cloth/4 copper/3 wax #2726, A04 4 cloth/3 spice/4 wax #2165, A02 2 cloth/3 spice/3 wax #2834). The referee ended the run at minute 24 with zero submissions and zero level-ups #2878. (#2165, #2629, #2726, #2834, #2878)
- **A03 completed its required bundle by round 5 and then simply froze.** A03 reached the contract set (2 cloth, 3 spice, 3 wax) and publicly declared it would keep the goods to the end #2114, #2726, #2864. It then declined every remaining offer rather than selling surplus or trading to maximize points #2758, #2807. (#2114, #2726, #2758, #2807, #2864)
- **A04 lost the wax race and pivoted to selling goods for salt.** A04 held one wax against four needed and reported that every wax offer was refused #2771, #2817, #2851. It then took a value trade (1 copper for 5 salt, worth 10 vs 4) #2817 and ended hoarding 13 salt #2851. (#2771, #2817, #2851)
- **A02 gave away its last two wax late and killed its own contract.** A02 traded its 2 wax to A03 for 2 salt, 1 cloth and 1 copper in the final round #2068 and then concluded the contract was dead #2068, #2846. Before that it had repeatedly refused wax offers to protect the contract #2009, #2094. (#2009, #2068, #2846)
- **A01 recovered copper through an escrowed shipment and finished holding the exact contract set.** A01 used escrow to buy copper due at the end of round 4 (#1020, #1169) and ended at 4 cloth, 4 copper and 3 wax #2859. This was the only resident to state a complete matching set at the finish. (#1020, #1169, #2859)

## Problems

1. **No resident ever submitted an answer, so the level was never exercised.** The run recorded zero submissions and all four residents stalled on level 1 from minute 0 to 24 #2878; the quiet-minute metric shows no submission in any minute 0-24. (#2878)
2. **Residents repeatedly guessed at spoilage and shipment timing instead of knowing the rules.** Multiple residents openly reasoned about whether spoilage hits before or after the end-of-round delivery #348, #1707, #1824, #2397. A03 even based a decision on uncertainty about delivery order #1750. (#348, #1707, #1750, #1824, #2397)
3. **A03's contract target shifted between rounds, suggesting the resident misread its goal.** A03 listed its contract as 4 cloth/3 spice/4 wax early #341, then 4 cloth/4 copper/4 wax later #739, #965, then settled on 4 copper/3 spice/2 wax #2726. A fixed objective should not change mid-run. (#341, #739, #965, #2726)
4. **Tool errors blocked intended trades and offers.** The log contains OFFER_CLOSED #486, #696, #1145, BAD_ROUND #1867, #2530, CANNOT_COVER #1753, #1987, OWN_OFFER #361, #2741 and TOO_MANY_OFFERS #354, #841. Several of these interrupted live negotiations between A01 and A03 #1867, #1987. (#354, #361, #486, #841, #1753, #1867, #1987, #2530)
5. **The contract-vs-salt trade-off split residents into incompatible groups who then refused all trades.** Residents needing the same scarce goods (wax, spice) simply refused each other late in the run #2009, #2807, #2817, #2846. With no cooperative path, the market froze and only one resident's bundle was ever met #2859. (#2009, #2807, #2817, #2846, #2859)
6. **Escrow and delayed goods created unavailable-balance failures.** A03 was refused for not holding copper it expected from a shipment #1753, and again for not holding salt it had already promised #1987, #2555. This shows escrow accounting is not intuitive for the residents. (#1753, #1987, #2555)

## Optimizations

- **Show residents the spoilage and shipment order explicitly in the rules view.** Residents wasted many turns reasoning about whether delivery or spoilage lands first (problem: rule guessing) #348, #1824, #2397. Publish a fixed 'end of round: deliver, then spoil' rule or a per-round ticker. (#348, #1824, #2397)
- **Give each resident an unambiguous, stable contract display.** A03's stated target changed three times across the run #341, #739, #2726. Render the contract as a read-only objective card that cannot drift between rounds. (#341, #739, #965, #2726)
- **Treat escrowed incoming goods as spendable for matching offers.** A03 and A02 were refused because their balance check excluded escrowed goods #1753, #1987, #2555. Either include escrow in the cover check or warn before the offer is created. (#1753, #1987, #2555)
- **Add a late-round incentive that rewards trading surplus even when the contract is lost.** Once bundles were unreachable, A02, A03 and A04 stopped trading and hoarded #2851, #2846, #2864. A per-unit sale bonus or end-of-game salt conversion would keep the market moving. (#2846, #2851, #2864)
- **Make level 1 completable without the trade contract, or separate level and trade phases.** No resident submitted anything in 24 minutes while all focused on the contract (problem: level never exercised) #2878, #2629. Give a self-contained level that does not depend on other agents' goods. (#2629, #2878)

## Loophole candidates

1. **A03 parked on a completed bundle and declined all trades, freezing its value.** (residents) A03 held exactly the contract set and publicly refused every offer to protect it #2114, #2726, #2864. This ends the game with no risk but also no further scoring, a safe dead end. (#2114, #2726, #2864)
2. **A02 sold its contract-critical wax for immediate goods in the last round.** (residents) A02 traded its last 2 wax for 2 salt, 1 cloth and 1 copper because it judged the contract dead #2068, converting a lost cause into points. This bypasses the intended 'protect the bundle' pressure. (#2068)

## Log issues

- line 1: event "market_game_started" (seq 1) does not match its schema
- line 2: event "market_round_started" (seq 2) does not match its schema
- line 15: event "market_offer_made" (seq 15) does not match its schema
- line 17: event "market_offer_made" (seq 17) does not match its schema
- line 25: event "market_offer_made" (seq 25) does not match its schema
- line 27: event "market_offer_made" (seq 27) does not match its schema
- line 36: event "market_offer_closed" (seq 36) does not match its schema
- line 38: event "market_offer_made" (seq 38) does not match its schema
- line 40: event "market_offer_made" (seq 40) does not match its schema
- line 48: event "market_offer_made" (seq 48) does not match its schema
- line 50: event "market_offer_made" (seq 50) does not match its schema
- line 58: event "market_offer_closed" (seq 58) does not match its schema
- line 65: event "market_trade" (seq 65) does not match its schema
- line 66: event "market_offer_closed" (seq 66) does not match its schema
- line 73: event "market_offer_made" (seq 73) does not match its schema
- line 80: event "market_trade" (seq 80) does not match its schema
- line 81: event "market_offer_closed" (seq 81) does not match its schema
- line 89: event "market_offer_made" (seq 89) does not match its schema
- line 96: event "market_offer_closed" (seq 96) does not match its schema
- line 108: event "market_offer_closed" (seq 108) does not match its schema
- and 594 more
