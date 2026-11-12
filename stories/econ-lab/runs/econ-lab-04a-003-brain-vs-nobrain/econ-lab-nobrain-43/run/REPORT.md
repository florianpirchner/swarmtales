# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab-nobrain` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #3 to #682 (564 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.014 USD for this run (competitors 0.014, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0032 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 8 of 8 minutes without a submission; longest without one: minutes 0-7 (8) |
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

- **All four residents played a full sequence of rounds but ended with zero recorded submissions.** The residents clearly engaged with an ultimatum-style game across minutes 0-2, discussing offers of 3, 2, 5 and 1 (#24, #40, #47, #223), yet the facts record 0 submissions and no level solved. The game activity existed only in reasoning and self-talk, not in counted results. (#24, #40, #223, #279)
- **Residents agreed on and self-reported Game 1 scores that the harness never credited.** Three residents each reported end-of-Game-1 totals independently: A03 says it finished with 34 (#279), A01 says 30 (#283), A04 says 30 (#288). The computed facts show no scoring, so the residents' shared scoreboard is invisible to the run record. (#279, #283, #288)
- **Public goods game decayed into a full free-riding equilibrium by minute 4.** A04 opened with 10 in round 1 (#296, #327), but after low contributions the group collapsed: A03 and A02 settled at 0 (#389, #439), A04 at 0 (#432, #462) and A01 at 0 (#408, #449). Everyone recognised the zero equilibrium and no one spent a token to rebuild cooperation. (#296, #327, #432, #449)
- **A03 openly reasoned that B dominates and still chose it, accepting a worse group outcome.** A03 reasoned that B is better whatever the partner does and stuck with it despite noting the group outcome would be worse (#575, #643). That is a deliberate defection in the stag-hunt-style game. (#575, #643)
- **A01 tried repeated cooperation and was exploited, then flipped to defection.** A01 chose A to build trust (#545, #582) but noted being exploited in round 2 (#612) and by minute 6 leant toward B (#667). A02 likewise reasoned B dominates (#568) and picked B (#598). (#545, #598, #612, #667)

## Problems

1. **The residents' activity never turned into counted submissions.** Across minutes 0-7 there were 0 correct and 0 wrong submissions, 0 transfers and 0 messages, despite 564 events of rich reasoning (#24, #279, #682). The harness treated the run as completely quiet. (#279, #682)
2. **The run ended at minute 7 with no level solved and no ranked standings.** The referee ended the run (#682) while every resident remained at level 1 with no level-ups and unranked points. The story produced no competitive result. (#682)
3. **Residents misread or misapplied the game mechanics more than once.** A01 tried viewTable only because it was the sole tool (#61), A03 said only viewTable was open while Contribute was locked (#522), and A02 spent minutes confirming arithmetic that had already resolved (#372). Several turns were spent on tool confusion rather than decisions. (#61, #372, #522)
4. **The public goods game gave residents a dominant free-riding strategy that killed cooperation.** Multiple residents independently worked out that each token returns only 0.4 to its contributor (#296, #303, #310), then acted on it and settled at 0 (#408, #432, #439). The multiplier of 1.6 made defection individually correct, so the intended tension dissolved. (#296, #310, #408, #439)

## Optimizations

- **Wire the residents' decisions into counted submissions.** The residents clearly made choices (offers of 1, 2, 3, 5 and A/B picks) that never registered as submissions (#40, #47, #223, #552). The next harness should confirm that each accept/offer/choose call is recorded as a scored action. (#40, #223, #552)
- **Raise the public goods multiplier so cooperation is not strictly dominated.** With 1.6 across four players each token returns 0.4, and residents computed the loss and free-rode (#303, #310, #365). A multiplier above the group size, or a punishment stage, would keep contribution rational. (#303, #310, #365)
- **Give residents information about future rounds in repeated games.** A03 and A01 reasoned around an unknown end-game or unknown number of rounds (#496, #643) and defaulted to defection. Publishing the horizon or using a fixed block of rounds would make reciprocity a real strategy. (#496, #643)
- **Clarify which tools are open each turn.** A01 called viewTable only because it was the only open tool (#61), and A03 noted Contribute appeared locked (#522). The interface should state, per turn, which action tools are available and which are closed. (#61, #522)
- **Add a concise scoreboard the residents can trust.** Residents computed their own totals (A03 34, A01 30, A04 30; #279, #283, #288) that the harness never confirmed. Surfacing an official score table would align resident reasoning with the run record. (#279, #283, #288)

## Loophole candidates

1. **Residents used self-talk and reasoning logs instead of public communication.** There were 0 DMs and 0 board posts, while residents narrated offers and results to themselves (#96, #100, #283, #288). Private reasoning and self-talk substituted for messages the other residents could see. (#96, #100, #283, #288)
2. **A02 exploited responders' acceptance of any positive offer with a minimum offer of 1.** A02 explicitly reasoned that responders accept any positive amount and so offered 1 while keeping 9 (#223), and A04 accepted the 1 rather than 0 (#242). The ultimatum game's responder side had no credible rejection threat. (#223, #242)

## Log issues

- line 1: event "block_started" (seq 1) does not match its schema
- line 2: event "round_opened" (seq 2) does not match its schema
- line 14: event "decision_made" (seq 14) does not match its schema
- line 20: event "decision_made" (seq 20) does not match its schema
- line 27: event "decision_made" (seq 27) does not match its schema
- line 34: event "decision_made" (seq 34) does not match its schema
- line 35: event "round_resolved" (seq 35) does not match its schema
- line 36: event "round_opened" (seq 36) does not match its schema
- line 43: event "decision_made" (seq 43) does not match its schema
- line 50: event "decision_made" (seq 50) does not match its schema
- line 56: event "decision_made" (seq 56) does not match its schema
- line 82: event "decision_made" (seq 82) does not match its schema
- line 83: event "round_resolved" (seq 83) does not match its schema
- line 84: event "round_opened" (seq 84) does not match its schema
- line 91: event "decision_made" (seq 91) does not match its schema
- line 108: event "decision_made" (seq 108) does not match its schema
- line 117: event "decision_made" (seq 117) does not match its schema
- line 123: event "decision_made" (seq 123) does not match its schema
- line 124: event "round_resolved" (seq 124) does not match its schema
- line 125: event "round_opened" (seq 125) does not match its schema
- and 98 more
