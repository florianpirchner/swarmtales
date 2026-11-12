# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market-nobrain` |
| Seed | 48 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #3 to #2606 (2079 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end); A03 on level 1 from minute 0 for 24 minutes (to the end); A04 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.155 USD for this run (competitors 0.155, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0051 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OFFER_CLOSED 3, OWN_OFFER 3, TOO_MANY_OFFERS 3, BAD_ROUND 2, NOT_FOR_YOU 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stall on level 1 for the entire 24-minute run.** A01, A02, A03 and A04 each start and finish on level 1 with no submission at any point; the last event before the referee ends the run is #2606. The run produces 0 correct and 0 wrong submissions across minutes 0-24. (#2606)
- **A04 believes its contract is met at minute 0 and stops trading.** A04 reasons it holds 2 copper, 2 spice and 4 wax and says so to itself (#101), then spends several rounds simply holding. It later discovers gaps again (#152, #1784), so its early 'contract complete' conclusion was premature. (#100, #101, #152, #1784)
- **Residents repeatedly misread spoilage timing and thresholds.** A02 thinks holding 3 spice will spoil at the end of round 1 (#42) and later re-derives wax spoilage several times (#931, #1006, #2441). A03 puzzles over whether its round-4 shipment lands before or after spoilage (#184, #416). (#42, #184, #416, #931, #1006, #2441)
- **A03 refuses to sell wax and blocks A04's and A02's contracts.** A03 holds its wax for its own contract and declines O25 (#328), while A04 and A02 both need extra wax and find no seller (#301, #1152, #1822). A02 concludes at the end that 'no other trader has spare wax to sell' (#1250). (#301, #328, #1152, #1250, #1822)
- **A late A03-A02 wax trade lets A02 close its contract gap.** A02 trades 3 wax to A03 for 4 salt, 2 cloth and 1 copper at minute 11 (#1250), and later reports its contract (4 wax, 2 copper, 2 spice) as complete (#1937). This is the only clear contract completion in the run. (#1250, #1937)
- **Tool errors repeatedly block offer management.** Residents hit OWN_OFFER (#475, #1451, #1901), TOO_MANY_OFFERS (#1492, #1564, #1668), OFFER_CLOSED (#1222, #1505, #1561), BAD_ROUND (#1662, #2320) and NOT_FOR_YOU (#596, #1913). These refusals consume turns without advancing any trade. (#475, #596, #1222, #1451, #1492, #1564, #1662, #1668, #1901, #1913, #2320)

## Problems

1. **No level was ever solved and nobody submitted.** All four residents stay on level 1 for 24 minutes with 0 submissions (#2606), so the core competition never starts. The run ends by referee timeout rather than by gameplay. (#2606)
2. **Residents burn turns on refusals instead of trading.** A03 tries to make an offer while holding 3 open ones (#1492) and again at #1564; A04 tries to accept its own offer (#475) and A01 does the same (#1451). Each refusal wastes a turn and adds confusion, as A04's reasoning shows (#1451). (#475, #1451, #1492, #1564, #1668)
3. **Escrow and later-round rules are misunderstood.** A04 tries to offer spice due at the end of round 4 as a later good and is refused with BAD_ROUND (#1662), and A03 hits the same rule at #2320. A04's reasoning (#1659, #1710) shows it did not understand which rounds count as 'later'. (#1659, #1662, #1710, #2320)
4. **Residents lose track of their own holdings across rounds.** A01 is confused about its spice count (#2417) and about whether its copper shipment has landed (#2371). A04's contract status flips between 'met' (#544) and 'short' (#1784, #1803), which suggests state readouts are unclear to the agents. (#544, #1784, #1803, #2371, #2417)
5. **Residents stop trying once their contract looks unreachable.** A02 declares its contract out of reach and plays for points instead (#616, #1250), and A03 says the contract is lost at #2595. Several residents then simply end turns without trading (#615, #2596), shrinking the market. (#615, #616, #1250, #2595, #2596)

## Optimizations

- **Add a short rules card for spoilage timing and thresholds.** Residents spend many turns re-deriving when and how much spoils (#42, #184, #416, #931, #2441). A concise per-round notice stating which good spoils, the threshold and whether shipments resolve before or after would cut this churn. (#42, #184, #416, #931, #2441)
- **Prevent self-accept and open-offer overflow before the turn is spent.** OWN_OFFER (#475, #1451, #1901) and TOO_MANY_OFFERS (#1492, #1564, #1668) refusals waste whole turns. The harness should block these actions client-side or auto-withdraw the oldest offer. (#475, #1451, #1492, #1564, #1668, #1901)
- **Clarify the later-goods round window up front.** BAD_ROUND at #1662 and #2320 shows agents guessing which rounds qualify for later delivery. Show the valid round range (5 to 6) in the offer form and in the reasoning prompt. (#1662, #2320)
- **Give a clear contract status readout each round.** A04 claims its contract is complete at #544 but is short at #1784 and #1803, and A01 miscounts spice at #2417. A per-round 'you have X, contract needs Y' line would reduce this. (#544, #1784, #1803, #2417)
- **Make wax available to the residents whose contracts need it.** A02 and A04 both fail to buy wax because A03 holds it for its own contract (#328, #1152, #1822). Consider more wax supply or a mechanism that lets a holder sell surplus wax profitably. (#328, #1152, #1250, #1822)

## Loophole candidates

1. **Residents abandon the contract to farm unit points instead.** (residents) A02 decides the contract is unreachable and shifts to maximizing point value of its holdings (#616, #1250), and A01 does the same at #1168. This scores points without ever attempting the intended contract path. (#616, #1168, #1250)
2. **Holding still is a safe default that avoids any risk.** (residents) A04 repeatedly ends turns with 'nothing to do' while holding its contract bundle (#1172, #1234, #2384), and A01 does the same (#2262). Doing nothing costs nothing, so residents can sit out rounds rather than trade. (#1172, #1234, #2262, #2384)

## Log issues

- line 1: event "market_game_started" (seq 1) does not match its schema
- line 2: event "market_round_started" (seq 2) does not match its schema
- line 15: event "market_offer_made" (seq 15) does not match its schema
- line 17: event "market_offer_made" (seq 17) does not match its schema
- line 25: event "market_offer_made" (seq 25) does not match its schema
- line 27: event "market_offer_made" (seq 27) does not match its schema
- line 35: event "market_trade" (seq 35) does not match its schema
- line 36: event "market_offer_closed" (seq 36) does not match its schema
- line 38: event "market_offer_made" (seq 38) does not match its schema
- line 46: event "market_trade" (seq 46) does not match its schema
- line 47: event "market_offer_closed" (seq 47) does not match its schema
- line 49: event "market_offer_made" (seq 49) does not match its schema
- line 58: event "market_trade" (seq 58) does not match its schema
- line 59: event "market_offer_closed" (seq 59) does not match its schema
- line 61: event "market_offer_closed" (seq 61) does not match its schema
- line 68: event "market_offer_closed" (seq 68) does not match its schema
- line 77: event "market_offer_closed" (seq 77) does not match its schema
- line 79: event "market_offer_made" (seq 79) does not match its schema
- line 81: event "market_offer_made" (seq 81) does not match its schema
- line 88: event "market_offer_closed" (seq 88) does not match its schema
- and 507 more
