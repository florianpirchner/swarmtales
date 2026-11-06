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
| End | minute 28 (referee) |
| Counted | events #5 to #2935 (2363 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end); A02 on level 1 from minute 0 for 28 minutes (to the end); A03 on level 1 from minute 0 for 28 minutes (to the end); A04 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.186 USD for this run (competitors 0.186, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0055 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | OFFER_CLOSED 11, BRAIN_TOO_LONG 3, CANNOT_COVER 2, OWN_OFFER 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wins big: 81 points in game 2 and 102 in game 3 in a single run.** A01 scored 81 points in game 2 (#1529) and A04 scored 102 in game 3 (#2275), both filling their contracts, while A02 finished game 1 with 84 (#797). Each of the four 7-minute games ended with a clear points spread and contract bonuses paid. (#797, #1529, #2275)
- **A02 finished game 1 with a full contract and the highest score (84).** A02 held 3 cloth, 3 copper and 3 wax at the end of game 1 (#797), ahead of A01 (36), A03 (39) and A04 (19) (#1513, #1533). This was the only game-1 contract bonus. (#797, #1513, #1533)
- **A04 finished game 1 last on 19 points; its contract was impossible from the start.** A04 never held more than 1 spice despite needing 4 (#667, #1533, #2782). A04 declined all trades and ended the game with 19 points (#797, #802). (#667, #797, #802)
- **A01 and A02 agreed on a copper debt that A01 broke.** A02 recorded that A01 owed 1 copper under P23 due by the end of round 5 (#530), and A02 later refused a cloth-for-copper trade because A01 already owed that copper (#624). A01 acknowledged the promise was broken when it kept the copper for its own contract (#635). (#530, #624, #635)
- **All four residents spent every game without using the messaging system.** No DMs, board posts or group posts occurred in any game (#13 to #2935), and only private reasoning and self-talk were used (#262, #311, #434). Offers were withdrawn or declined rather than negotiated. (#262, #311, #434, #1227, #2144)
- **A01's brain write failed and its brain was saved as version 2 anyway.** A01 attempted writeBrain at minute 14, which was refused with BRAIN_TOO_LONG (#1494). The next SAYS line says the brain is saved as version 2 (#775), and the write of version 3 succeeded after the limit changed. (#775, #1494, #1529)

## Problems

1. **Residents were stuck on level 1 for the entire run with no submissions.** A01 through A04 each sat on level 1 from minute 0 to 28 (#13, #28, #36, #99) and never submitted an answer. The run ended on the referee at minute 28 (#2935) with 29 of 29 minutes quiet. (#13, #28, #36, #99, #2935)
2. **The city did not give residents the story: no label or goal text appeared.** The log shows only the residents' reasoning and offers, with no story text, labels or objectives before minute 1 (#13, #28, #36). Residents inferred goals from contract numbers in their own reasoning (#99, #112). (#13, #28, #36, #99, #112)
3. **Tool errors and unreachable goods caused repeated failed trades.** A04's offer was refused with CANNOT_COVER for lacking 5 salt and 2 spice when it held 8 salt and 1 wax (#232, #328), and A01 hit a withdrawn offer at #965. In total 11 OFFER_CLOSED, 2 CANNOT_COVER and 1 OWN_OFFER errors occurred. (#232, #328, #965)
4. **A04 failed to understand the contract's spice requirement and then blamed scarcity.** A04 needed 4 spice but held only 1 in game 1 (#1533) and again only 1 in game 2 (#810), and its own retro blamed the scarcity of spice (#1497, #1533). A04 never changed its contract-fitting strategy between the first two games. (#667, #810, #1497, #1533)
5. **A01's brain exceeded the 150-word limit and lost the write.** A01 tried to write its brain at minute 14 and was refused with BRAIN_TOO_LONG (#1494). The brain was 167 words against a limit of 150; the residents used the retro window to try again (#775). (#1494)

## Optimizations

- **Fix the CANNOT_COVER checks so offers fail only when the goods are truly held.** A04's offer was refused for missing 5 salt and 2 spice while A04 held 8 salt and 1 wax (#232, #328). A clearer refusal message should name the exact missing goods and the current holdings side by side. (#232, #328)
- **Give residents a visible story goal and success criteria before minute 1.** The log shows no story text before the first trades (#13, #28, #36), so residents invented their own objectives (#99, #112). The next story should ship a short goal and a scoring rule in the opening prompt. (#13, #28, #36, #99, #112)
- **Add a spoilage preview and a wax-cloth warning card.** Every game saw residents lose contract goods to spoilage at the end of rounds 2–5 (e.g. #237, #251, #1915, #2010). A prompt card showing 'holding N of X will drop to M after this round' would prevent the repeated off-by-one errors (#1224, #1190, #1911). (#237, #251, #1190, #1224, #1911, #1915, #2010)
- **Allow brain writes under the word limit or split the retro window.** A01, A02 and A03 all hit BRAIN_TOO_LONG in the same retro window (#1494, #2234, #2213). Raise the limit or let residents trim and re-submit without losing the window. (#1494, #2213, #2234)
- **Prompt residents to negotiate a wax or spice contract in advance.** No resident used a DM or board post in any game, and all four ended with unmet or barely met contracts (#797, #1533, #2187, #2922). A scripted trade fair at round 1 or 3 would give contracts a mechanical path through the deadlock seen in #649 and #1969. (#649, #797, #1533, #1969, #2187, #2922)

## Loophole candidates

1. **Residents used self-talk as a private reasoning surface outside the brain.** (residents) SAYS TO ITSELF lines were used to hold notes and strategy without the 150-word brain limit (#262, #311, #434, #624, #728). This gave residents an unlimited free memory channel the designers did not intend. (#262, #311, #434, #624, #728)

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
- line 104: event "market_offer_made" (seq 104) does not match its schema
- line 106: event "market_offer_made" (seq 106) does not match its schema
- line 108: event "market_offer_made" (seq 108) does not match its schema
- line 116: event "market_trade" (seq 116) does not match its schema
- line 117: event "market_offer_closed" (seq 117) does not match its schema
- line 119: event "market_said" (seq 119) does not match its schema
- and 552 more
