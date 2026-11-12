# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `salt-market` |
| Seed | 44 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 29 (referee) |
| Counted | events #5 to #2970 (2388 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 29 minutes (to the end); A02 on level 1 from minute 0 for 29 minutes (to the end); A03 on level 1 from minute 0 for 29 minutes (to the end); A04 on level 1 from minute 0 for 29 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.187 USD for this run (competitors 0.187, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 30 of 30 minutes without a submission; longest without one: minutes 0-29 (30) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | CANNOT_COVER 5, BRAIN_TOO_LONG 4, BAD_ROUND 3, NOT_FOR_YOU 1, PROPOSER_CANNOT_COVER 1, TOO_EARLY_FOR_SHIPMENT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The city was shut, so four minutes of turn time were spent waiting on an empty market.** At minutes 0-1 A03, A04 and A02 each found no game open: A03 (#87) and A04 (#91) and A02 (#95) reported nothing to trade and saved a first brain version instead of acting. The first real trade reasoning only appears at minute 2 (#112, #128). (#87, #91, #95, #112)
- **A02's accepted trade was refused by the bank for lacking copper.** A02 accepted an offer and the city answered CANNOT_COVER, stating A02 held 6 salt, 2 cloth, 2 spice, 3 wax and no copper (#257); A02 then reasoned the copper was already gone (#267). This is the first of many refusals that came from residents mis-holding goods they had promised. (#257, #267)
- **Cloth became the deciding scarcity and the 20-point contract failed for half the table.** A02, A03 and A04 all identified cloth as the bottleneck and refused to sell theirs (#643, #657, #678). A01 finished game 2 at 62 points but contract unfilled for want of one cloth (#1569), A02's game 1 contract failed on the same good (#807), and A04's did too (#816). (#643, #657, #678, #807, #816, #1569)
- **Later-delivery offers were mis-specified repeatedly and rejected by the city.** A04's offers got BAD_ROUND twice because the later goods were due in round 3 rather than 4-6 (#1107, #1108), and A01's later offer was refused the same way (#2593). A03 also noted it had confused which side owed the later delivery (#939). (#939, #1107, #1108, #2593)
- **A04 handed over 4 salt in a trade that ran opposite to its intention.** A04 realized after execution that O18 had gone through as plain escrow: it gave 4 salt and now owed A01 2 copper by round 4 (#1161). It later recounted the mistake at length in its brain review (#1521). (#1161, #1521)
- **Contracts were filled in later games but residents kept sitting on exactly the minimum.** By game 3 A03 and A04 both declared their contracts met and stopped trading entirely (#2230, #2243, #2853, #2932). The run ended at minute 29 with no submissions, and all four residents still stuck on level 1. (#2230, #2243, #2853, #2932, #2970)

## Problems

1. **No level was ever solved, so the run produced no ladder progress at all.** Facts show 0 correct submissions, 0 wrong submissions, and all four residents on level 1 from minute 0 to minute 29. The game itself ran (markets, trades, brains) but nothing counted toward the story's progression. (#112, #257, #2970)
2. **The open-market wait burned early turns.** Residents were told nothing could be traded at minutes 1-2 (#87, #91, #95) but then reasoned about a live market from minute 2. The start of the game was not aligned with what the residents were told. (#87, #91, #95)
3. **Trade schema errors swallowed many intended moves.** The run logged 5 CANNOT_COVER, 4 BRAIN_TOO_LONG, 3 BAD_ROUND, 1 NOT_FOR_YOU, 1 PROPOSER_CANNOT_COVER and 1 TOO_EARLY_FOR_SHIPMENT errors. Examples: #257, #710, #826, #994, #1107, #1116, #1524, #2271, #2405, #2593. (#257, #710, #826, #994, #1107, #1116, #1524, #2271, #2405, #2593)
4. **Residents read the escrow direction backwards and executed trades against their intent.** A04's O18 went through as a plain escrow so it paid salt instead of receiving copper (#1161), and A03 and A04 both spent reasoning on which side owes the later delivery (#939, #987). The trade wording does not make the direction unambiguous. (#939, #987, #1161)
5. **Contracts that require scarce goods made the second goal unachievable and killed trading.** A04 concluded in round 6 that its contract was unreachable for lack of cloth and just held stock (#697, #752), as did A01 (#763) and A03 (#1444). Once unreachable, residents stopped trading, which is the opposite of the story's competition. (#697, #752, #763, #1444)
6. **The brain tool limit was a repeated, avoidable source of refusal.** Three of A01's brain writes were refused for exceeding 150 words (#826, #2271) and A04's were too (#1524), even though the residents were actively trying to record lessons. The waste cost turns without changing strategy. (#826, #1524, #2271)

## Optimizations

- **Make the market open at minute 0 and confirm the opening turn.** Residents were told there was nothing to trade at minutes 1-2 (#87, #91) yet reasoned about live stock from minute 2 (#112). Start the clock only when the market is actually accepting offers. (#87, #91, #112)
- **Expose the resident's real holdings in every offer/accept prompt.** A02's accepted trade was refused because it no longer held the copper it thought it had (#257, #267), and A04 and A01 were refused for holding less than their offers promised (#994, #1116, #710). Show the live balance inside the trade prompt to cut refusals. (#257, #267, #710, #994, #1116)
- **Split 'later delivery' into explicit from/to fields rather than a free-text description.** BAD_ROUND (#1107, #1108, #2593), TOO_EARLY_FOR_SHIPMENT (#1030) and the reversed O18 (#1161) all come from the offer format. A structured form removes the ambiguity that produced every one of them. (#1030, #1107, #1108, #1161, #2593)
- **Guarantee a cloth source in every contract or make cloth non-spoiling.** The cloth bottleneck caused A02's game-1 and A04's game-1 contracts to fail (#807, #816) and drove A01 and A03 out of trading entirely (#763, #1444). Either add a cloth shipment to every offer or remove cloth spoilage. (#763, #807, #816, #1444)
- **Issue a brain-length counter so residents can trim before writing.** Three writes were refused for being over 150 words (#826, #1524, #2271) with no count given beforehand. Show word count in the writeBrain response or hard-trim instead of refusing. (#826, #1524, #2271)
- **Give the referee a level progress hook that residents can actually reach.** All four residents sat on level 1 for 29 minutes with 0 submissions (#2970). If the trade game is a level, the level's win condition should be described in the level prompt, not inferred from a contract that no one is told how to submit. (#112, #2970)

## Loophole candidates

1. **Residents stopped trading once their contract was met and sat on the minimum.** (residents) A03 declared its contract met and traded nothing further (#2230, #2853), and A04 did the same (#2243, #2932), which is a legal but passive end state that removes all competition from the final rounds. (#2230, #2243, #2853, #2932)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 57: event "brain_written" (seq 57) does not match its schema
- line 58: event "retro_closed" (seq 58) does not match its schema
- line 64: event "brain_written" (seq 64) does not match its schema
- line 65: event "retro_closed" (seq 65) does not match its schema
- line 105: event "retro_closed" (seq 105) does not match its schema
- line 106: event "market_game_started" (seq 106) does not match its schema
- line 107: event "market_round_started" (seq 107) does not match its schema
- line 116: event "market_offer_made" (seq 116) does not match its schema
- line 118: event "market_offer_made" (seq 118) does not match its schema
- line 132: event "market_trade" (seq 132) does not match its schema
- line 133: event "market_offer_closed" (seq 133) does not match its schema
- line 142: event "market_trade" (seq 142) does not match its schema
- line 143: event "market_offer_closed" (seq 143) does not match its schema
- line 145: event "market_said" (seq 145) does not match its schema
- and 562 more
