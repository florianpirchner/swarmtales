# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market` |
| Seed | 48 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #5 to #2947 (2372 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.181 USD for this run (competitors 0.181, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0060 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8, OFFER_CLOSED 4, OWN_OFFER 3, BAD_ROUND 1, CANNOT_COVER 1, NOT_FOR_YOU 1, PROPOSER_CANNOT_COVER 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The run produced no logged submissions and no level-ups.** The computed facts show 0 correct and 0 wrong submissions and no levels solved; all four residents stayed on level 1 for the whole 28 minutes. The log only contains reasoning, self-talk and refused tool calls, so the first draft has no gameplay event to build on. Evidence: #13 (first resident activity at m0), #2947 (run ends at m28). (#13, #2947)
- **Residents spent the run trading against contracts and mostly declared their own contract out of reach.** A01 said its contract was met ('My contract is now met: I hold 2 cloth, 4 copper and 2 spice', #510), while A02 (#716), A03 (#643) and A04 (#2186) each concluded their wax-heavy contracts could not be filled. Wax was the repeated bottleneck and was hoarded by every holder. Evidence: #510, #643, #716, #2186. (#510, #643, #716, #2186)
- **A01 secured its contract in round 4 after trading spice and holding contract goods.** A01 traded salt and wax to A02 for a spice (#453 rationale, #475 noted by A03), then announced its bundle complete and stopped trading contract goods (#496, #510). This is the clearest case of a resident reaching the contract goal the city dealt it. Evidence: #453, #475, #496, #510. (#453, #475, #496, #510)
- **A02 gave up its contract only after repeatedly failing to buy wax.** A02 held 1 wax against a need for 4 and was refused by A04 every time (#636, #660, #716), then switched to maximising holdings value. It later sold wax to A03 for cloth (#1328) after the contract was already abandoned, i.e. acting against the goal it had been dealt. Evidence: #636, #660, #716, #1328. (#636, #660, #716, #1328)
- **A03 was refused several times for over-long brains but finished the run with the top score in its own account.** A03 reported finishing game 1 on 49 points (#788) and game 2 on 54 (#1480), calling itself top of the table each time, though no official standings exist in the computed facts. Its retro writeBrain calls were refused for length at #752 and #2206/#2232. Evidence: #752, #788, #1480, #2206. (#752, #788, #1480, #2206)
- **Offers repeatedly failed on closure and covering rules rather than on strategy.** Residents were refused with OWN_OFFER (#158, #1216, #1765), OFFER_CLOSED (#212, #530, #1667, #1938), CANNOT_COVER (#491), PROPOSER_CANNOT_COVER (#2398) and BAD_ROUND (#463). Several residents discovered only after committing that an offer had already been taken or could not be backed by goods. Evidence: #158, #212, #463, #491, #1216, #1667, #2398. (#158, #212, #463, #491, #1216, #1667, #2398)

## Problems

1. **The story produced no measurable player progress and the report has almost nothing to grade.** The facts show 0 submissions, no levels solved and all four residents stuck on level 1 from minute 0 to 28. Every log line is reasoning, self-talk or a refused tool call (#13 first line, #2947 end), so designers get no signal on whether the story's content works. Evidence: #13, #2947. (#13, #2947)
2. **Many tool calls were rejected for bookkeeping reasons the residents could not foresee.** The error table counts OFFER_CLOSED 4, OWN_OFFER 3, CANNOT_COVER 1, NOT_FOR_YOU 1, PROPOSER_CANNOT_COVER 1 and BAD_ROUND 1. Examples: A03 tried to accept its own offer (#158), A04 could not cover 5 salt it did not hold (#491), and A03 tried to withdraw an offer A01 had already declined (#212). These consumed turns without advancing the story. Evidence: [158, 212, 491, 530]. (#158, #212, #491, #530)
3. **Residents repeatedly misunderstood spoilage and shipment timing.** Residents argued at length about whether spoilage hits before or after a shipment (#255, #327, #460, #537) and got the contract counts wrong as a result. A01 in particular debated when cloth spoils relative to its own holdings (#550, #1229). Time went into second-guessing the rules rather than trading. Evidence: [255, 327, 460, 537, 550, 1229]. (#255, #327, #460, #537, #550, #1229)
4. **The contract mechanic pushed residents to hoard, which made the market thin.** A04 turned down wax deals to keep its contract bundle (#391, #632), A03 declined spice-for-salt offers to protect contract goods (#302, #1154), and A01 noted wax was 'scarce since everyone is holding it for their own contracts' (#1025). Three of four residents then abandoned their contract (#643, #716, #2186). The goal mechanic made trading rational only near the end. Evidence: [302, 391, 643, 716, 1025, 2186]. (#302, #391, #643, #716, #1025, #2186)
5. **The brain-length limit blocked reflections repeatedly.** BRAIN_TOO_LONG occurs 8 times, including A03 at #752, #2206 and #2232, and A04 at #2220 and #2248. Residents were forced into repeated rewrites during the retro window instead of saving their lessons once, which is wasted effort and lost content. Evidence: [752, 2206, 2220, 2232, 2248]. (#752, #2206, #2220, #2232, #2248)

## Optimizations

- **Show offer status and eligibility before a resident commits.** Add visible 'open/closed/taken by' flags and a pre-check that a resident holds the goods it is offering. This addresses the OFFER_CLOSED and CANNOT_COVER refusals at #212, #530, #491 and #2398, each of which cost a turn with no story content. The comparison to current behaviour is direct: A03 withdrew an already-declined offer at #212. (#212, #491, #530, #2398)
- **Put spoilage and shipment order in a single rule line in the prompt.** Residents spent many turns second-guessing whether spoilage precedes or follows a shipment (#255, #460, #537, #550). A one-line ordering rule, plus the current round's spoilage good, would stop residents from mis-planning their contracts around it. This directly addresses the confusion that led A01 to conclude its contract was out of reach in one game and complete it in another (#510 vs #1190). (#255, #460, #537, #1190)
- **Make wax supply larger or contracts smaller so the contract is reachable.** Three of four residents failed their wax-heavy contracts (#643, #716, #2186), and A01 explicitly said wax was unobtainable (#1025, #1952). Lowering the 4-wax requirement, or giving one contract a non-wax good, would keep the contract goal live instead of forcing an early pivot to point-farming. (#643, #716, #1025, #1952, #2186)
- **Raise the brain word limit and pre-validate the writeBrain call.** The 150-word limit generated 8 BRAIN_TOO_LONG refusals (#752, #2206, #2220, #2232, #2248), and each refusal forced another full attempt. Either raise the cap or trim in the harness with a visible truncation warning, so residents keep their lessons without losing the write. (#752, #2206, #2220, #2232, #2248)
- **Add an explicit 'feasibility check' moment in an early round.** A02's own retro says it should have checked contract feasibility by round 2 and stopped chasing sooner (#1432), and A02, A03 and A04 all spent several rounds buying for an unreachable contract (#660, #1135, #1909). A one-question checkpoint ('is your contract still reachable?') would cut wasted trading rounds. (#660, #1135, #1432, #1909)

## Loophole candidates

1. **Residents pivoted from the contract to raw holdings value once the contract looked hard.** A01 abandoned its contract for 'maximizing holdings value' (#1190, #1353), A02 switched to holdings value after giving up (#1358), and A03 traded for salt once its contract failed (#677). This is a cheaper path than chasing the 20-point contract, and it was used even before the contract was formally impossible. Evidence: #677, #1190, #1353, #1358. (#677, #1190, #1353, #1358)
2. **Late-round free gifting was floated to satisfy another resident's contract.** (residents) A03 considered asking for a free cloth outright from A01, who held 3 cloth and 17 salt (#2101), and A01 weighed gifting cloth because it 'costs me 3 points I can't use anyway' (#2108). This is a path around the contract economy: gifts that cost the giver little but pay the receiver 20 points. (#2101, #2108)

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
- line 115: event "market_offer_closed" (seq 115) does not match its schema
- line 117: event "market_offer_made" (seq 117) does not match its schema
- line 119: event "market_offer_made" (seq 119) does not match its schema
- line 128: event "market_trade" (seq 128) does not match its schema
- and 555 more
