# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market` |
| Seed | 45 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #5 to #2892 (2327 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.153 USD for this run (competitors 0.153, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5, OFFER_CLOSED 3, NOT_FOR_YOU 1, TOO_MANY_OFFERS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident stalled on level 1 for the whole run** All four residents (A01-A04) spent minutes 0-28 on their starting levels with zero submissions, so no level was ever solved. They moved goods and points through the contract game but never advanced. (#13, #21, #2892)
- **Wax was the scarce contract good that repeatedly broke contracts** A01 needed wax for its contract and was turned down by A03 (#294), A04 (#310), A02 (#1696) and again at the end (#2876). A03 also failed to buy a spare wax buffer (#987, #1783). The same good decided several contracts and no resident would sell it. (#294, #310, #1696, #2876)
- **A02 and A04 secured their contracts while A01 and A03 fell short** A02 reached exactly 4 cloth, 3 spice and 3 wax and stopped trading (#2032, #2843); A04 held its contract goods and refused every offer that would take them (#1346, #2656). A01 ended one wax short (#2876) and A03 declared its contract unreachable (#2772). (#2032, #2656, #2772, #2843, #2876)
- **Residents re-read the game state across three contests in the same 28 minutes** The log runs through game 1 (#735), game 2 (#1424) and game 3 (#2116), with the residents rewriting brains between them. A01 ended game 1 with 50 points (#766), game 3 with 51 (#2181); A03 won game 1 with 58 (#759) and A04 finished with 22 in game 3 (#2158). (#735, #759, #766, #1424, #2116, #2158, #2181)
- **Repeated brain-write refusals between games** A03, A01 and A02 all had writeBrain refused for exceeding the 150-word limit (#762, #1427, #1433, #2127, #2133). A03's earlier attempt was rejected in game 1 (#762) and its game-3 attempt again in #2127. (#762, #1427, #1433, #2127, #2133)

## Problems

1. **No progression at all: four stalls on level 1** The harness recorded no level-ups and no submissions from any resident for the entire 28 minutes. The residents only played the goods-trading contract side, so the core levelling loop never engaged. (#13, #21, #101, #2892)
2. **Rules that contradict each other confuse residents every round** Residents spent many turns guessing whether spoilage or shipments resolve first (#214, #242, #1632, #1639) and whether wax spoils on later rounds (#2305, #2579). They also argued over contract minimums (#101 vs #166), which burns turns on rules rather than trading. (#166, #214, #242, #1632, #1639, #2305, #2579)
3. **Brain word limit rejects most writes** Five writeBrain calls across the run were refused with BRAIN_TOO_LONG at 153-162 words against a 150-word cap. Residents lost the retro window they were told is their only chance to update strategy. (#762, #1427, #1433, #2127, #2133)
4. **Offer mechanics produce dead-end errors** Residents hit TOO_MANY_OFFERS (#1811), OFFER_CLOSED when accepting an offer that had already been withdrawn (#1947, #2298, #2527) and NOT_FOR_YOU when declining another resident's offer (#1311). These are interaction-design traps, not strategic failures. (#1311, #1811, #1947, #2298, #2527)
5. **Residents never communicated publicly** The facts record 0 DMs and 0 board posts; all messages were private self-talk. The board and messaging channels did nothing, so scarcity signals (e.g. wax held by all) were inferred only from the market view. (#147, #152, #306, #793)

## Optimizations

- **Make the level objective visible and reachable in the first rounds** Because every resident stalled at level 1 with no submissions (#13, #21, #2892), the next version should give a first-round hint or an easy submission to force engagement with the puzzle loop before trading. (#13, #21, #2892)
- **Publish a fixed spoilage/shipment resolution order** Multiple residents lost turns guessing resolution order (#214, #242, #1632). Stating the order in the rules or the market view would remove the ambiguity without removing strategy. (#214, #242, #1632)
- **Raise or remove the brain word cap, or make it a soft warning** Five retro writes were refused at just over 150 words (#762, #1427, #1433, #2127, #2133). A 250-word cap or a draft that gets trimmed automatically would let residents keep their lessons. (#762, #1427, #1433, #2127, #2133)
- **Withdraw stale offers automatically before a resident makes a new one** Residents were blocked by TOO_MANY_OFFERS (#1811) and clicked into OFFER_CLOSED (#1947, #2298, #2527). Auto-expiring or auto-withdrawing a resident's own old offers at turn start would avoid both. (#1811, #1947, #2298, #2527)
- **Give wax a second source or lower the contract demand** Every contract that needed wax failed when all holders hoarded it (#294, #310, #1696, #2876). Adding an incoming shipment of the scarce good or reducing the per-contract wax need would keep at least one contract reachable. (#294, #310, #1696, #2876)

## Loophole candidates

1. **Residents kept an open offer to capture value after the contract was abandoned** (residents) Residents who declared the contract out of reach still traded for pure points, e.g. A01 accepted a 1-spice-for-3-salt trade after giving up (#1299) and A03 sold spice for salt once the contract was dead (#2001). This turns the story's cooperative-contract framing into an individual score farm. (#1299, #1868, #2001)
2. **Holding exactly the contract minimum let residents refuse all trade** (residents) A02 and A04 refused every offer once they held the exact bundle (#2032, #2843, #2656), effectively opting out of the market. The design's trade pressure disappears if hoarding at the minimum is the dominant strategy. (#2032, #2656, #2843)

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
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 95: event "market_game_started" (seq 95) does not match its schema
- line 96: event "market_round_started" (seq 96) does not match its schema
- line 106: event "market_offer_made" (seq 106) does not match its schema
- line 108: event "market_offer_made" (seq 108) does not match its schema
- line 110: event "market_offer_made" (seq 110) does not match its schema
- line 118: event "market_trade" (seq 118) does not match its schema
- line 119: event "market_offer_closed" (seq 119) does not match its schema
- line 128: event "market_trade" (seq 128) does not match its schema
- and 545 more
