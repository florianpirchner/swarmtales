# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market` |
| Seed | 46 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #5 to #2837 (2299 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.158 USD for this run (competitors 0.158, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OFFER_CLOSED 4, BRAIN_TOO_LONG 2, OWN_OFFER 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stall on level 1 for the whole run.** A01, A02, A03 and A04 never solve level 1 in 28 minutes; no submissions are recorded at all (#2837). The residents spend the entire run reasoning about trades and contracts without a single contract resolution logged in the digest (#99, #109). (#13, #36, #2837)
- **A01 races to contract completion and hoards spice against spoilage.** A01 holds 5 spice on purpose so spoilage drops it to exactly the 4 its contract needs (#1119, #1036). It keeps 2 copper, 4 spice and 2 wax, declining every offer that would break those counts (#1349, #1143). (#1036, #1119, #1143, #1349)
- **A04 makes a directional trade error and loses a needed spice.** A04 accepts O23 believing it will receive spice but actually hands one over (#1106), calling it a mistake with the direction backwards. This directly damages its contract plan and it later adds a 'check trade direction' rule to its brain (#1507). (#1106, #1507)
- **Copper becomes the contested good and blocks contracts.** A02, A03 and A04 all report needing extra copper while every holder keeps it for its own contract (#1357, #1345, #1199). A03 ends the final round two copper short of its contract and says it will not sell copper (#1408). (#1199, #1345, #1357, #1408)
- **Referee ends the run at minute 28 with no submissions.** The run stops at minute 28 (#2837) with zero correct or wrong submissions, and the digest records no beats. Residents are still mid-trade at that point, e.g. A02 asking for cloth from A03 (#2823). (#2823, #2837)

## Problems

1. **Residents never submit an answer to level 1.** The facts report 0 correct and 0 wrong submissions for the whole run (#2837). All four residents reason only about the market and contracts, not about solving any level (#99, #109, #119). (#99, #109, #119, #2837)
2. **The hidden rules cause repeated guessing about spoilage order.** Residents repeatedly guess whether shipments arrive before or after spoilage (#347, #340, #2290), and get it wrong or hedge, which distorts trade decisions (#1124, #2305). (#340, #347, #1124, #2290)
3. **Trade direction is easy to misread.** A04 accepts an offer thinking it receives spice and instead gives one away (#1106), a mechanical error the harness did not prevent. A02 also misjudges an offer direction at #1057/#1106 references. (#1106)
4. **Repeated referee and tool rejections waste turns.** Residents hit OWN_OFFER (#264), OFFER_CLOSED four times (#992, #1096, #1707, #2658) and BRAIN_TOO_LONG twice (#1488, #2115). These refusals show residents acting on stale market state. (#264, #992, #1096, #1488, #1707, #2115, #2658)
5. **A02 misunderstands its own offer timing and is left one copper short.** A02 waits for a shipment that never resolves its copper shortfall (#1199, #1200, #1416). It ends the last round one copper short and says every trader withholds copper (#1416). (#1199, #1200, #1416)
6. **Residents assume game boundaries from previous games that are not in this run.** Residents discuss 'game 1', 'game 2' results and brain versions during this run (#754, #1503, #2142), so the log mixes many matches' state and makes the run hard to read as one story. (#754, #1503, #2142)

## Optimizations

- **Make the level's win condition visible and testable early.** Since no resident ever submits to level 1 (#2837), the harness should surface a concrete submit action and a hint after the first stall minute. Evidence: 28 minutes with no submission (#2837). (#2837)
- **Publish spoilage and shipment ordering in the rule text.** Residents waste many turns guessing whether shipments precede spoilage (#347, #340, #2290). State the order explicitly so trades like #2305 are not based on guesses. (#340, #347, #2290, #2305)
- **Show give/get direction in offer confirmations.** A04's backward trade (#1106) cost it a needed spice; a confirmation line naming what is given and received would prevent it. It later patched its own brain for this (#1507). (#1106, #1507)
- **Refresh visible market state before every accept/decline.** Four OFFER_CLOSED refusals (#992, #1096, #1707, #2658) and one OWN_OFFER (#264) come from acting on stale state. Auto-refresh the offer list before those actions. (#264, #992, #1096, #1707, #2658)
- **Trim or validate brain writes before submission.** Two BRAIN_TOO_LONG refusals (#1488, #2115) burned turns and lost strategies. Warn residents of the word count at draft time. (#1488, #2115)
- **Isolate this run's story state from prior matches.** Residents cite results and brain versions from earlier games during the run (#754, #1503, #2142), confusing the narrative. Start each run with a clean brain and a one-line story briefing. (#754, #1503, #2142)

## Loophole candidates

1. **Residents hoard contract goods to deny others and then decline all copper trades.** (residents) A03 states it will not trade away copper even when others need it (#1408), and A02 ends short after every holder refuses to sell (#1357, #1416). This turns trading into mutual deadlock rather than the intended negotiation. (#1357, #1408, #1416)
2. **Spice is held above the contract count purely to absorb spoilage.** (residents) A01 keeps 5 spice so spoilage leaves exactly 4 (#1119), and A04 plans to buy 2 more to land on 4 after spoilage (#1953). This uses the spoilage rule as a buffer tactic instead of trading for need. (#1119, #1953)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 93: event "market_game_started" (seq 93) does not match its schema
- line 94: event "market_round_started" (seq 94) does not match its schema
- line 103: event "market_offer_made" (seq 103) does not match its schema
- line 105: event "market_said" (seq 105) does not match its schema
- line 113: event "market_offer_closed" (seq 113) does not match its schema
- line 115: event "market_offer_made" (seq 115) does not match its schema
- line 123: event "market_offer_made" (seq 123) does not match its schema
- line 125: event "market_said" (seq 125) does not match its schema
- and 518 more
