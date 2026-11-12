# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market-nobrain` |
| Seed | 44 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #3 to #2430 (1983 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end); A03 on level 1 from minute 0 for 24 minutes (to the end); A04 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.150 USD for this run (competitors 0.150, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0052 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OWN_OFFER 4, OFFER_CLOSED 3, PROPOSER_CANNOT_COVER 2, BAD_ROUND 1, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No resident ever submitted an answer and all four stalled on level 1 for the whole run.** A01, A02, A03 and A04 each sat on level 1 from minute 0 to minute 24 with no submission, and the run ended at #2430 with zero submissions recorded. The residents spent the whole run reasoning about trade values and contracts instead of solving anything. (#11, #34, #44, #2430)
- **A03 was the first to claim its contract was covered and stopped trading.** At minute 0 A03 announced it held 6 salt, 1 cloth, 2 copper, 2 spice and 1 wax and that its contract would be covered after the round-3 shipment, so it ended its turn (#72). It repeated this holding pattern in later rounds (#384, #559). (#71, #72, #384, #559)
- **A failed accept because the proposer no longer held the goods.** A03 tried to accept offer O9 from A04, but the city refused it with PROPOSER_CANNOT_COVER because A04 no longer held 2 salt (#174). A04 had already given its salt away in an earlier trade (#160). (#160, #174)
- **A01 accepted its own offer, which the city rejected.** A01 tried to accept O14 and got OWN_OFFER, telling it to withdraw instead (#326). The same OWN_OFFER error hit A02 (#1661), A04 (#1669) and A02 again (#2340), showing four residents confused about who may accept an offer. (#326, #1661, #1669, #2340)
- **A01 broke a promise and admitted it, but could not fix it in time.** A01 realized it had written offer O16 backwards and owed A02 one wax by round 4 (#2130), then said it would pay it back (#2254). Its attempt to explain was rejected for exceeding the 300-character limit (#2133), and the promised wax became a recurring worry for A01 (#2150, #2240). (#2130, #2133, #2240, #2254)
- **Contracts came down to cloth scarcity and most residents ended short.** A01 ended the final round holding 1 cloth and needing 2, and said no trader would sell it cloth or copper (#2421). A02 ended holding 2 cloth, 4 copper and 2 wax, which it said met its contract (#1235, #2425 shows A04 holding the same). A03 said its contract was met with 2 cloth, 3 spice and 3 wax (#2332, #2409). (#1235, #2332, #2409, #2421, #2425)

## Problems

1. **All four residents never submitted and stalled on level 1 for the entire run.** The facts show A01-A04 stuck on level 1 from minute 0 to minute 24 and 25 quiet minutes with no submission. Every logged action is a trade, message or reasoning line about contracts; nothing resembles solving the level. (#11, #2430)
2. **The residents kept treating trade offers as if they were their own.** OWN_OFFER fired four times, at #326, #1661, #1669 and #2340, when residents tried to accept offers they had posted themselves. A02 even reasoned through why it could not accept O18 and knew A03 had to act (#1704), yet still hit the error at #2340. (#326, #1661, #1669, #1704, #2340)
3. **Offer mechanics produced refused accepts because the proposer's stock had moved.** A03's accept of O9 was refused with PROPOSER_CANNOT_COVER (#174), and A03's accept of O30 failed the same way (#1113). Two more OFFER_CLOSED refusals hit A04 (#1148) and A03 (#2391), so five of the run's tool errors came from offers whose state had changed before the counterparty acted. (#174, #1113, #1148, #2391)
4. **A rule about later-round deliveries was not clear and blocked a valid-looking deal.** A01's offer was refused with BAD_ROUND, saying later goods must be due in a later round of this game, 4 to 6 (#2071). A01 then reasoned it could not schedule the wax delivery at all (#2093), which cost it a round of trading. (#2071, #2093)
5. **A promise made in a trade could not be restated because the message was too long.** A01's attempt to explain its O16 mistake was rejected for having more than 300 characters (#2133). A01 then spent later minutes still worrying about the wax it owed (#2150, #2240). (#2133, #2150, #2240)
6. **Residents burned most of their reasoning on contract arithmetic instead of the level.** Many reasoning lines are long inventory tallies and spoil-rule guesses (for example #581, #590, #596, #606), and several residents repeatedly ended turns holding goods (#72, #251, #521). The story gave them a trade game with no obvious way to solve the level. (#72, #251, #521, #581, #590, #596, #606)

## Optimizations

- **Make the level the first thing residents must act on.** Since all four stalled on level 1 for 24 minutes (#11, #2430), the next version should require a submission attempt by a fixed early minute, or have the gamemaker prompt a level attempt before trade actions. (#11, #2430)
- **Validate accept actions against the acting resident before the bank runs.** OWN_OFFER fired four times (#326, #1661, #1669, #2340); the harness should reject the accept at the client and tell the resident which offer it actually owns. (#326, #1661, #1669, #2340)
- **Re-check the proposer's stock when an offer is accepted.** Five refusals came from stale offers (#174, #1113, #1148, #2391); the harness should either freeze the underlying goods in escrow at offer time or auto-close an offer when the proposer's stock changes. (#174, #1113, #1148, #2391)
- **Explain the later-delivery round rule before offers are made.** BAD_ROUND at #2071 and A01's confusion at #2093 show the rule was not understood; the next version should state the allowed rounds in the offer tool's prompt and echo them in an error that names valid rounds. (#2071, #2093)
- **Let residents correct a mistaken trade term in a short message.** The 300-character cap blocked A01's correction (#2133), and the mistake lingered through rounds (#2150, #2240); the cap should be raised or a short 'correct trade' action added. (#2133, #2150, #2240)

## Loophole candidates

1. **Residents avoided the market by declaring their contract done and holding.** (residents) A03 said its contract was covered after shipment and ended its turn (#72), repeating this in later rounds (#384, #559), which is a safe path that gives other residents no one to trade with and avoids the level entirely. (#72, #384, #559)
2. **Residents tried to accept their own offers instead of negotiating.** (residents) A01, A02 and A04 each tried to accept an offer they had posted (#326, #1661, #1669, #2340), which would let a single resident settle a trade without a counterparty if the rule allowed it. (#326, #1661, #1669, #2340)

## Log issues

- line 1: event "market_game_started" (seq 1) does not match its schema
- line 2: event "market_round_started" (seq 2) does not match its schema
- line 16: event "market_offer_made" (seq 16) does not match its schema
- line 18: event "market_offer_made" (seq 18) does not match its schema
- line 20: event "market_said" (seq 20) does not match its schema
- line 28: event "market_offer_closed" (seq 28) does not match its schema
- line 30: event "market_offer_made" (seq 30) does not match its schema
- line 38: event "market_offer_made" (seq 38) does not match its schema
- line 40: event "market_offer_made" (seq 40) does not match its schema
- line 48: event "market_trade" (seq 48) does not match its schema
- line 49: event "market_offer_closed" (seq 49) does not match its schema
- line 51: event "market_offer_closed" (seq 51) does not match its schema
- line 59: event "market_offer_closed" (seq 59) does not match its schema
- line 66: event "market_trade" (seq 66) does not match its schema
- line 67: event "market_offer_closed" (seq 67) does not match its schema
- line 80: event "market_offer_made" (seq 80) does not match its schema
- line 82: event "market_said" (seq 82) does not match its schema
- line 100: event "market_offer_closed" (seq 100) does not match its schema
- line 107: event "market_offer_made" (seq 107) does not match its schema
- line 109: event "market_spoiled" (seq 109) does not match its schema
- and 427 more
