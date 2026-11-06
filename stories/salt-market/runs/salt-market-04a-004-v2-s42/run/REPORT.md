# Run report: run-003

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `salt-market` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #5 to #3321 (2623 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.208 USD for this run (competitors 0.208, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0059 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 12, CANNOT_COVER 8, BAD_ROUND 4, OFFER_CLOSED 2, NOT_FOR_YOU 1, NOT_YOURS 1, OWN_OFFER 1, TOO_MANY_OFFERS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Nobody solved a level; all four residents sat on level 1 for the whole 28 minutes.** A01, A02, A03 and A04 each stayed on level 1 from minute 0 to 28 with no level-ups and no submissions. The run ended at minute 28 with zero submissions (#3321, #890). (#890, #894, #1686, #3321)
- **The market was played as a zero-sum trading game where everyone hoarded scarce contract goods.** A01 named wax the bottleneck and refused to sell it because its contract needed four (#2168, #2201), and A03, A04 and A02 all declined wax and spice offers for the same reason (#1594, #1548, #3246). The result was repeated refusals across rounds 1-5 while all four contracts went unfilled (#890, #894, #1686, #2489). (#1548, #1594, #2168, #2201, #3246)
- **A04 broke a recorded promise to A02, the only clear breach of trust in the run.** At minute 3 A04 recorded that promise P16 to deliver 2 spice to A02 had failed because the bank reported nothing delivered (#445). A02 later reported having no spice at the promised time (#736). (#445, #736)
- **The promise, escrow and round-checking machinery was hard to use: five residents' offers were refused for being uncovered and three deliveries were refused for the wrong round.** A03 was refused for failing to hold goods it offered (#293), A04 twice (#1276, #2208), A01 twice (#526, #1809), A02 once (#3251), and A02, A01 and A03 each had a later-goods offer refused because the round stated was wrong (#1276, #1302, #2034, #2129). (#293, #526, #1276, #1302, #1809, #2034, #2129, #2208, #3251)
- **The brain update window was unusable: every writeBrain attempt failed for exceeding 150 words.** All 12 BRAIN_TOO_LONG errors came from residents trying to save lessons from the previous game (#825, #1634, #2433, #2444). A01 reported its brain was 'saved as version 4' (#2473), but the refusals show the write never went through. (#825, #1634, #2433, #2444, #2473)
- **Salt ended up as a near worthless currency that couldn't buy the scarce goods.** A01 tried to sell 8 salt for cloth and failed (#526), A04 raised its offer to 6 salt per wax and still got no wax (#2201), and A01 concluded that its extra salt 'wasn't convertible into what I needed' (#836). (#526, #836, #2201)

## Problems

1. **No resident solved any level and the run stalled at level 1 from start to end.** All four residents were on level 1 for all 28 minutes with 29 of 29 quiet minutes and no submissions. There is no record of any progress on the puzzle itself. (#890, #3321)
2. **The round rules for later-goods deliveries were misunderstood.** The city refused later-goods offers from A04 (#1276), A01 (#1302) and A03 (#2129) because the delivery round fell outside the allowed range, and A01 admitted it had the 'later' field backwards (#530). The lesson was learned only by trial and error. (#530, #1276, #1302, #2129)
3. **Residents offered goods they did not hold, so their offers were refused.** Five CANNOT_COVER refusals (#293, #526, #1809, #2208, #3251) show residents misread their own stock, and A02 was also refused for having three open offers at once (#580). Body checks should have caught these before posting. (#293, #526, #580, #1809, #2208, #3251)
4. **The brain word limit was set too tight, so the weight of learning across games never got saved.** All 12 writeBrain attempts got BRAIN_TOO_LONG (#825, #1634, #1640, #1646, #2433, #2438, #2444, #2465, #2470, #2480, #2485) even though the residents had clear lessons to record. The only brain updates that took effect were the ones reported by the residents, not the banker. (#825, #1634, #1640, #1646, #2433, #2438, #2444, #2465, #2470, #2480, #2485)
5. **Spoilage timing was never understood, and residents gambled on the order of shipments and spoilage all run.** A04 worried it 'didn't know which comes first' (#1272), A03 kept checking whether wax spoiled before or after the shipment (#2123, #2979), and A01 weighed the same question (#3003). Leaving the count unresolved for 28 minutes caused bad trades. (#1272, #2123, #2979, #3003)
6. **No group or board messaging was used, so hoarding was never negotiated openly.** There were zero DMs, board posts and group posts for the whole run, and every trade was made by private offer or declined silently (#890, #894). Residents often guessed who held what instead of asking. (#890, #894, #1299, #1440)

## Optimizations

- **Show spoilage timing explicitly in the market view.** The residents lost time to the question of whether shipments land before or after spoilage (#1272, #2123, #2979). State the order (for example, 'shipments resolve, then spoilage') in the market data so offers can be planned. (#1272, #2123, #2979)
- **Give residents a planning check on their holdings before they can post an offer.** Five CANNOT_COVER refusals (#293, #526, #1809, #2208, #3251) were caused by offers for goods the poster did not hold. Show a live 'free to offer' count per good next to the offer form. (#293, #526, #1809, #2208, #3251)
- **Allow later-goods deliveries from the round they land in, not only later rounds.** Four BAD_ROUND refusals (#1276, #1302, #2034, #2129) came from a rule that was not explained, and A01 misread it (#530). Spell out the allowed range in plain terms or roll the boundary forward one round. (#530, #1276, #1302, #2034, #2129)
- **Raise the brain word limit or add a hard trim prompt.** Every writeBrain attempt failed at over 150 words (#825, #2433, #2438). Raise the limit to about 300 words or return the failing draft with a 'cut this much' target, so the learning from game to game is not lost. (#825, #2433, #2438, #2485)
- **Provide a public board or a grouped market so that hoarding of scarce goods can be negotiated.** There were zero board or group posts, and all four residents refused to sell wax and spice because they all needed them (#2168, #2201, #3246). A shared market that sets prices, or a free public posting channel, could break the deadlock. (#890, #2168, #2201, #3246)
- **Check that the puzzle can be solved at level 1 before the run.** All four residents were stuck on level 1 from minute 0 to minute 28 with no submissions. The starting level should be verified solvable and the coaching should put the story's first goal in front of the residents (#3321). (#890, #3321)

## Loophole candidates

1. **Residents broke promises and lost nothing.** (residents) A04 made promise P16 to A02 and never delivered, but the city recorded no penalty and A04 went on trading normally (#445, #2391). A promise carries no cost beyond its value to the residents' reputation. (#445, #2391)
2. **Residents could decline every trade and still protect their score.** (residents) A01, A02 and A04 each ended games holding their own goods, refusing all offers that would break their contract (#2168, #2251, #2409). Staying flat, without trading, was as safe as trading, so little trading happened. (#2168, #2251, #2409)

## Dropped from the model's answer

- Loophole candidates item 3: cites unknown events #3113

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 53: event "brain_written" (seq 53) does not match its schema
- line 54: event "retro_closed" (seq 54) does not match its schema
- line 60: event "brain_written" (seq 60) does not match its schema
- line 61: event "retro_closed" (seq 61) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 94: event "market_game_started" (seq 94) does not match its schema
- line 95: event "market_round_started" (seq 95) does not match its schema
- line 104: event "market_offer_made" (seq 104) does not match its schema
- line 106: event "market_offer_made" (seq 106) does not match its schema
- line 114: event "market_trade" (seq 114) does not match its schema
- line 115: event "market_offer_closed" (seq 115) does not match its schema
- line 124: event "market_offer_closed" (seq 124) does not match its schema
- line 126: event "market_offer_made" (seq 126) does not match its schema
- and 678 more
