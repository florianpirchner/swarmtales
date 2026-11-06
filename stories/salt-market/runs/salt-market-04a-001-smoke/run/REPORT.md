# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `salt-market` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #5 to #1106 (938 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.050 USD for this run (competitors 0.050, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0028 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OPEN_OFFER 9, OFFER_CLOSED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 locked down the first contract early and stayed covered.** From minute 1 A02 tracked its needs (3 cloth, 3 copper, 3 wax) and declared the contract met at #184, then kept it covered through later rounds (#405, #1009, #1085). It finished the run with the most goods and repeatedly declined salt-for-spice deals that would have cost it value (#255, #461, #507). (#139, #184, #405, #1085)
- **A01 and A04 both stalled one spice short of their contracts while spice holders hoarded.** A01 repeatedly offered its last salt for one spice (#248, #487, #526) and A04 offered salt for spice (#472, #650), but A03 declined every time because its own contract needed 3 spice (#326, #449, #497, #546). Both ended the run short by one unit (#633, #642). (#248, #449, #472, #487, #497, #526, #633, #642)
- **A02's salt-for-copper and cloth-for-copper offers were refused by everyone who needed copper.** Copper was the bottleneck: A02 offered cloth for copper at #884/#931 and salt for copper at #1022, but A01, A03 and A04 all held copper only as contract goods and declined (#909, #915, #894). A03 summarized the squeeze at #948, noting copper was unreachable. (#884, #909, #915, #931, #948, #1022)
- **Residents repeatedly tried to decline open offers, triggering tool errors.** Several declines hit OPEN_OFFER or OFFER_CLOSED errors: A02 at #259, A04 at #268, A03 at #329, A02 at #464, A01 at #491, A01 at #674, A04 at #696, and later at #900, #912, #918. The residents even commented that open offers can't be turned down (#477, #926). (#259, #268, #329, #464, #491, #674, #696, #926)
- **Spice spoilage timing drove A01's early rush to buy a fourth spice.** A01 realized at #227 that holding exactly 4 spice would drop to 3 after end-of-round spoilage, so it tried to buy a fifth spice with its last salt (#248, #316, #353). It failed, and by #398 it accepted the contract might fail. (#227, #248, #316, #353, #398)

## Problems

1. **Zero submissions and zero levels solved all run.** All four residents sat on level 1 from minute 0 to the end (stalls table). No resident ever submitted, and the quiet-minutes count is 15 of 15 (#5 to #1106). (#5, #1106)
2. **Residents burned turns on impossible declines of open offers.** Nine OPEN_OFFER errors and one OFFER_CLOSED error (#259 through #918) show residents wasting turns trying to decline offers addressed to everyone. A03 said outright that open offers can't be refused (#477), yet kept trying (#926). (#259, #268, #329, #464, #477, #491, #674, #900, #912, #918, #926)
3. **The gamemaker took no actions and the board stayed silent.** The facts show 0 DMs, 0 board posts and 0 group posts, and the gamemaker performed no actions. The only communication was private SAYS TO ITSELF lines (#184, #437, #992). (#184, #437, #992)
4. **Residents misunderstood their own stalling and made no real progress toward contracts.** A01 spent the whole run short two copper (#1022, #1080), A04 stalled one spice short (#642), and A03 sat on a completed contract without trading (#1066). Several residents just ended turns with no action (#377, #502, #512). (#377, #502, #512, #642, #1022, #1066, #1080)

## Optimizations

- **Clarify in the harness that open offers cannot be declined.** Add a harness notice or a resident instruction that offers to all are not declinable, since residents wasted nine turns on OPEN_OFFER errors (#259, #329, #464, #491, #674, #900, #912). (#259, #329, #464, #491, #674, #900)
- **Give residents a way to close or withdraw their own open offers.** A02 noted it could withdraw O25 after a decline (#556), but had no clean tool; the OFFER_CLOSED error at #696 shows the mismatch. Add a withdraw command tied to the maker. (#556, #696)
- **Seed starting stock so at least one resident can complete a contract without a trade it cannot afford.** A01 and A04 both finished one unit short (#633, #642) because spice holders (#326, #449) would not trade. Start one of them with enough spice or a spare copper to make the first contract reachable. (#326, #449, #633, #642)
- **Add a gamemaker nudge or board post when no one has submitted.** The run had 15 quiet minutes and 0 board posts (#1106). A timed gamemaker post or a nudge when submissions hit zero would break the deadlock. (#5, #1106)
- **Make spoilage thresholds visible in the market view so residents plan with the real numbers.** A01's stall started from a spoilage miscalculation over its 4 spice (#227, #398). Showing the threshold and spoilage amount in the market would stop this. (#227, #398)

## Loophole candidates

1. **Residents treated 'decline' of an open offer as a real action.** (residents) Several residents tried to decline offers to all (#259, #268, #329), which is a no-op, letting them spend turns without a real cost while appearing to respond. (#259, #268, #329)
2. **Hoarding spice to satisfy the contract blocked all trade.** (residents) A03 held 3 spice for its contract and refused every salt-for-spice offer (#326, #449, #497), which made the market for the only scarce good completely inert. This is a structural loophole: the safe strategy was to never trade. (#326, #449, #497)

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
- line 94: event "market_game_started" (seq 94) does not match its schema
- line 95: event "market_round_started" (seq 95) does not match its schema
- line 104: event "market_offer_made" (seq 104) does not match its schema
- line 106: event "market_offer_made" (seq 106) does not match its schema
- line 114: event "market_offer_made" (seq 114) does not match its schema
- line 116: event "market_offer_made" (seq 116) does not match its schema
- line 124: event "market_trade" (seq 124) does not match its schema
- line 125: event "market_offer_closed" (seq 125) does not match its schema
- and 148 more
