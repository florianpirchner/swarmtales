# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 106 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #651 (576 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.048 USD for this run (competitors 0.048, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 opens the scoring by playing Cobalt 1 from its signaled slot 2.** A01 signaled A02 about rank 1 (#37), and A02 played slot 2, lighting Cobalt 1 (#48). This was the first card lit in the run. (#37, #48)
- **A03 takes the first strike by playing Rose 2 too early.** A03 knew Rose 2 was not playable because Rose was still at 0 (#146) but played slot 1 anyway, misfiring and losing the card (#147). (#146, #147)
- **Multiple residents use discards to refill signals rather than risk blind plays.** A01 discarded Violet 6 for a signal (#246), A04 discarded Violet 2 (#274), A02 discarded Rose 5 (#315) and A03 discarded Rose 4 (#328), each choosing a safe discard over a low-probability play. (#246, #274, #315, #328)
- **Strikes accumulate fast, reaching 5 lost points by minute 3.** A04's Moss 3 misfire made strike 2 (#216), A01's Moss 4 made strike 3 (#297), A02's Moss 7 made strike 4 (#486), and A01's Violet 5 made strike 5 (#518). (#216, #297, #486, #518)
- **The crew finishes strong: 21 of 35 cards lit with the draw pile empty.** A04 played its last card Rose 6 for 20 lit (#626), and A02 completed Cobalt with Cobalt 7 for 21 lit (#639). A01 and A02 were out of cards (#610, #639). (#610, #626, #639)
- **The run is cut off by the referee at minute 5 before any level is solved.** The referee ended the run at minute 5 (#651) with no level solved and 21 of 35 cards lit. (#651)

## Problems

1. **No level was solved and nobody reached any submission.** The computed facts show 0 correct and 0 wrong submissions, and 6 of 6 minutes were quiet with no submission at all between minutes 0-5 (#651). With 35 cards needed and only 21 lit, the crew never had a chance to finish a level in the time given. (#651)
2. **Residents spent turns signaling or discarding instead of playing, burning the clock.** A large share of turns were signal or discard actions, e.g. A01 signaling rank 1 (#37), A02 signaling Moss (#100), A01 signaling rank 2 (#120), and A03 discarding Rose 4 for a signal (#328). This conservative play kept progress slow relative to the 5-minute limit. (#37, #100, #120, #328)
3. **The strike penalty made residents overly risk-averse.** Several residents explicitly cited the 3-point misfire cost as the reason to avoid uncertain plays, e.g. A03 noting a misfire costs 3 points and discarding instead (#328), and A01 weighing strikes before declining to play (#415). The penalty pushed them away from the plays needed to advance. (#328, #415)
4. **Residents' private reasoning shows heavy probability calculation that crowds out action.** Many REASONING lines are long odds computations (#124, #173, #229, #458), consuming turns on analysis rather than plays. This is visible in the density of reasoning around single decisions like the slot-4 percentage estimates (#173). (#124, #173, #229, #458)
5. **No messages or board posts were exchanged, so there was no social play.** The computed facts record 0 DMs, 0 board posts and 0 group posts; residents only used in-game signals as their action, so the social-game framing never materialized. (#37, #100, #250, #425)

## Optimizations

- **Lengthen the time limit or shorten the deck so a level can be completed.** The run ended at minute 5 with 21 of 35 cards lit and no level solved (#651, #639). Either more minutes or a smaller card count would let a competent crew finish. (#639, #651)
- **Reduce or soften the misfire penalty to encourage play.** Residents repeatedly declined uncertain plays citing the 3-point strike cost (#328, #415), which stalled progress. A smaller penalty or a capped penalty would keep risk-taking viable. (#328, #415)
- **Prompt or reward actual social messages to activate the social-game intent.** The computed facts show 0 DMs and 0 board posts, and the only communication was in-game signals (#37, #100). Adding scoring or objectives tied to messaging would make the social layer matter. (#37, #100)
- **Cap or discourage long private probability calculations.** Residents burned turns on detailed odds reasoning (#124, #173, #458) instead of acting. A concise reasoning format or a per-turn reasoning budget would push more decisive play. (#124, #173, #458)

## Loophole candidates

1. **Discarding unplayable cards for signals is a cheap way to gain information with no scoring risk.** (residents) A01 discarded Violet 6 noting it could not light anyway (#246), and A03 discarded Rose 4 for a third signal (#328), both turning dead cards into free insight. This safe path substitutes for riskier plays without penalty. (#246, #328)
2. **Residents could pass up playable cards in their own hand to signal others, avoiding risk entirely.** (residents) A01 signaled A02 about Cobalt 4 being playable (#188) and A02 signaled A01 about Moss (#250) rather than playing uncertain cards, shifting risk onto signaled teammates while taking none themselves. (#188, #250)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 24: event "card_played" (seq 24) does not match its schema
- line 25: event "card_drawn" (seq 25) does not match its schema
- line 33: event "signal_given" (seq 33) does not match its schema
- line 44: event "signal_given" (seq 44) does not match its schema
- line 65: event "card_played" (seq 65) does not match its schema
- line 66: event "card_drawn" (seq 66) does not match its schema
- line 79: event "signal_given" (seq 79) does not match its schema
- line 86: event "card_played" (seq 86) does not match its schema
- line 87: event "card_drawn" (seq 87) does not match its schema
- line 95: event "card_played" (seq 95) does not match its schema
- line 96: event "card_drawn" (seq 96) does not match its schema
- line 111: event "signal_given" (seq 111) does not match its schema
- line 127: event "card_played" (seq 127) does not match its schema
- line 128: event "card_drawn" (seq 128) does not match its schema
- line 135: event "card_played" (seq 135) does not match its schema
- line 136: event "card_drawn" (seq 136) does not match its schema
- and 55 more
