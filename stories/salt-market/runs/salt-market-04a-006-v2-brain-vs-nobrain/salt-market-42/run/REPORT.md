# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #5 to #3121 (2495 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.192 USD for this run (competitors 0.192, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0054 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 9, CANNOT_COVER 5, OFFER_CLOSED 5, TOO_EARLY_FOR_SHIPMENT 2, TOO_MANY_OFFERS 2, NOT_FOR_YOU 1, other 1, OWN_OFFER 1, STEP_LIMIT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stall on level 1 for the entire 28-minute run without a single submission.** Facts show A01-A04 all stuck on level 1 from minute 0 to minute 28, with 29 of 29 minutes quiet and zero submissions. The run ends at #3121 with no level solved. (#3121)
- **A01 loses the salt-market contract by holding spice and cloth through spoilage rounds.** A01 reasons that spice spoils to 2 and breaks its contract at #2297, and admits at #938 it missed the contract because spoilage and late spice trades left it short. (#938, #2297)
- **A02 finishes game 1 with the highest score at 46 points and a filled contract.** A02 says at #934 it finished with 46 points, the highest of the four traders, and its contract was filled. The standings are self-reported, not computed in the facts. (#851, #934)
- **A03 and A04 both miss their game-1 contracts by one cloth and one spice or worse.** A03 says at #942 it missed the 20-point bonus by one cloth and one spice, and A04 reports at #1655 its contract went unfilled because it ran out of tradeable salt. (#942, #1655)
- **A resident repeatedly exceeds the brain word limit.** writeBrain is refused with BRAIN_TOO_LONG on #898, #1587, #1615, #2334, #2348, #2354, #2364 and #2376, with word counts of 154-182 against a 150 limit. (#898, #1587, #1615, #2334, #2348, #2354, #2364, #2376)
- **Residents decline almost every offer, leaving goods locked in hoarding.** A01 refuses O30 and O48 to protect its contract at #1363 and #2242, A04 refuses wax offers at #1997, and A02 keeps its contract goods at #851, so trades stall. (#851, #1363, #1997, #2242)

## Problems

1. **No resident solves a level for the whole run.** Facts show all four stuck on level 1 for 28 minutes with zero submissions and 29 quiet minutes; the run ends at #3121 without a level-up. (#3121)
2. **BRAIN_TOO_LONG blocks most brain writes.** Nine BRAIN_TOO_LONG refusals occur across the run, and each resident wastes several attempts re-drafting a 154-182 word brain against a 150-word limit (#898, #1587, #1615, #2354). (#898, #1587, #1615, #2354)
3. **Escrow and shipment timing rules confuse residents repeatedly.** TOO_EARLY_FOR_SHIPMENT refusals hit #308 and #2654, and residents spend long reasoning stretches guessing whether the round-4 shipment lands before or after spoilage (#491, #2405, #2779). (#308, #491, #2405, #2654, #2779)
4. **CANNOT_COVER and STEP_LIMIT errors waste actions.** CANNOT_COVER fires at #399, #977, #1434, #2751 and #2782 when residents offer goods they do not hold, and STEP_LIMIT at #736 uses up A02's minute. (#399, #736, #977, #1434, #2751, #2782)
5. **Residents misjudge contract feasibility and give up mid-game.** A02 declares at #1380 its contract is out of reach and trades only for points, and A03 at #2859 says its contract looks out of reach since nobody will sell wax. (#1380, #2859)
6. **No gamemaker actions at all.** Facts show no gamemaker actions and no classified labels, so nothing injected tension or corrected the hoarding deadlock during the run. (#3121)

## Optimizations

- **Raise or enforce the brain word limit with earlier feedback.** Since BRAIN_TOO_LONG costs nine write attempts (#898, #1587, #1615, #2348, #2354), add a running word count in the writeBrain tool response so residents can trim before submitting. (#898, #1587, #1615, #2348, #2354)
- **Pre-validate offers against the resident's actual stock before submission.** CANNOT_COVER refusals at #399, #977, #1434, #2751 and #2782 waste turns; show a holdings check in viewMarket or reject with the exact shortfall before the offer is posted. (#399, #977, #1434, #2751, #2782)
- **Clarify spoilage versus shipment ordering in the rules text.** Residents spend many reasoning lines unsure whether the round-4 shipment arrives before or after spoilage (#491, #2405, #2779); state the exact resolution order in the rulebook view. (#491, #2405, #2779)
- **Reduce contract hoarding by lowering late-round contract thresholds or adding a fallback.** Every resident hoards contract goods and refuses trades (#1363, #1997, #2242), and two contracts go unfilled (#942, #1655); make thresholds reachable from total supply. (#942, #1363, #1655, #1997, #2242)
- **Add a gamemaker nudge to break trade deadlocks.** With zero gamemaker actions (facts), a gamemaker could broadcast a wax or cloth shortage or seed an extra shipment when offers stall, as at #1997 and #2859. (#1997, #2859)

## Loophole candidates

1. **Residents abandon contract goals to farm raw-value points.** (residents) Once a contract looks unreachable, A02 at #2107 seeks trades only for points and A03 at #2859 trades for points instead of contract goods, using the scoring system as a cheaper path than the intended bundle. (#2107, #2859)

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
- line 125: event "market_offer_closed" (seq 125) does not match its schema
- line 127: event "market_offer_made" (seq 127) does not match its schema
- and 606 more
