# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #5 to #2868 (2327 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.177 USD for this run (competitors 0.177, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0052 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, OFFER_CLOSED 2, CANNOT_COVER 1, NOT_FOR_YOU 1, OWN_OFFER 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 kept its contract covered and flipped spice before spoilage, ending far ahead in the cited self-reports** A02 held 3 copper, 3 wax and 5 cloth early and treated the contract as met (#195). It later sold spice for salt at a favourable rate (#677) and reported 86 points in game 1 (#789). (#195, #677, #789)
- **A01 missed the contract by one spice and consistently protected contract goods over salt** A01 declined 8 salt for 3 spice because it needed 4 spice for the 20-point contract (#496), and reported finishing 17 points with 2 spice at the end (#785). (#496, #785)
- **A03 was blocked on the last wax for several rounds while others hoarded it** A03 needed one wax and found A01 unwilling to sell (#1361, #1390) and A02 also trying to buy (#1418). It ended one wax short and reported 48 points (#793). (#793, #1361, #1390, #1418)
- **A04 wrote off its contract early and switched to holding large salt piles** A04 concluded the contract was out of reach because spice was scarce and everyone was hoarding (#518, #1153), then held 11 salt (#1292) and finished with 20 points (#789). (#518, #789, #1153, #1292)
- **The same four residents played multiple games with revised brains, and A02 and A04 swung to top scores in later games** After game 1 the residents saved brain versions and moved on to game 2 (#785, #789, #793). In game 3 A04 reported 94 points and a filled contract (#2202), while A02 reported 28 points and a miss in game 2 (#1484). (#785, #789, #793, #1484, #2202)

## Problems

1. **All four residents were stalled on level 1 for the whole run with zero submissions** The facts show no level solved and A01-A04 stuck on level 1 from minute 0 to 28. No submissions were made in any of the 29 quiet minutes. (#20, #28, #2868)
2. **Residents misunderstood contract and spoilage rules repeatedly** A04 debated whether shipments arrive before or after spoilage (#231, #1607, #2312) and repeatedly miscalculated supply (#446, #518). A01 and A02 also argued over spoil timing and whether holding 2 units was safe (#962, #1300). (#231, #446, #518, #962, #1300, #1607, #2312)
3. **Residents treated marked messages as binding and were burned when offers closed** A01 noted A04's message was only a claim (#2270), but A04's decline failed with OFFER_CLOSED (#1633) and A03's decline failed with OFFER_CLOSED (#1780). These tool errors cost turns and confused the residents about who had accepted what. (#1633, #1780, #2270)
4. **Brain writes failed for length in the retro windows** A04 was refused with BRAIN_TOO_LONG at 154 words (#731) and 166 words (#2155); A03 was refused at 155 words (#1441). This wasted retro turns and left their lessons partly unsaved. (#731, #1441, #2155)
5. **Residents burned rounds on offers that could not be covered or were their own** A01's offer was refused with CANNOT_COVER because it held 4 salt, not 5 (#2624), and A02 tried to accept its own offer (#2630). Both are avoidable validation failures. (#2624, #2630)

## Optimizations

- **Give residents an explicit contract and spoil-timing reference in the prompt** Residents repeatedly debated whether shipments arrive before or after spoilage (#231, #2312) and whether 2 units spoil (#962). A one-line timing table would remove most of that confusion. (#231, #962, #2312)
- **Validate offers on submission with a clear error, not at accept time** A01 got CANNOT_COVER at minute 26 (#2624) and A04 and A03 hit OFFER_CLOSED (#1633, #1780). The harness should check holdings when the offer is created and warn that offers may be withdrawn. (#1633, #1780, #2624)
- **Raise or cap the brain word limit and give a word count before refusal** Three BRAIN_TOO_LONG refusals wasted retro turns (#731, #1441, #2155). Either raise the 150-word limit or return the current count so residents can trim in one pass. (#731, #1441, #2155)
- **Add a supply-versus-demand pre-check so residents stop chasing impossible contracts** A04 concluded its contract was infeasible (#518) and A03 spent rounds chasing the last wax (#1361, #2754). The harness could show total supply per good and flag contracts that cannot be met. (#518, #1361, #2754)
- **Reconcile the run narrative with the facts** The facts say no levels were solved, but the log describes trading games and scores (#785, #789, #2202). The digest and log need to agree before reports can be trusted. (#785, #789, #2202)

## Loophole candidates

1. **Residents could decline offers they never held assets for and still get a refund of attention** (residents) A04's decline failed with OFFER_CLOSED because the offer vanished (#1633), and A03's failed the same way (#1780). This let a failed decline cost nothing beyond the turn and masked who was actually willing to trade. (#1633, #1780)

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
- line 92: event "market_game_started" (seq 92) does not match its schema
- line 93: event "market_round_started" (seq 93) does not match its schema
- line 103: event "market_offer_made" (seq 103) does not match its schema
- line 105: event "market_offer_made" (seq 105) does not match its schema
- line 107: event "market_offer_made" (seq 107) does not match its schema
- line 116: event "market_offer_made" (seq 116) does not match its schema
- line 118: event "market_offer_made" (seq 118) does not match its schema
- line 120: event "market_offer_closed" (seq 120) does not match its schema
- and 521 more
