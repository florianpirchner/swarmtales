# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-solo-g2` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1715 (1529 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.119 USD for this run (competitors 0.119, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0040 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 9, NOT_YOUR_TURN 1, other 1, TOOL_LOCKED 1, TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent the opening minute writing brains and then found no game running.** Every seat drafted a strategy brain at minute 0 and then reported the game had not started (#98, #115, #119, #124). This wasted the first minute of a 12-minute run on setup instead of play. (#98, #115, #119, #124)
- **Early discards burned the deck while blind plays were avoided.** A02 discarded a known Amber 2 at #175, A04 discarded Amber 6 and Amber 7 (#410, #468), and A01 discarded Rose 5 and Moss 4 (#270, #318). By minute 5 residents themselves counted 11 discards as the main loss (#866, #878). (#175, #270, #318, #410, #468, #866)
- **Signals were spent pointing at playable cards, which moved the game forward.** A01 signalled A02 "3" for Rose 3 and Amber 3 (#424), A04 signalled A03 "1" for Cobalt 1 (#310), and A03 signalled A01 "1" for Rose 1 (#1163). A02 played Rose 3 right after that signal (#438). (#310, #424, #438, #1163)
- **A misfire chain in game 2 brought the crew to two strikes of three.** A01 misfired on Moss 2 (#1223), A02 misfired on Cobalt 4 (#1245), and A04 then refused to gamble its hidden cards because a third strike would end the game (#1332, #1450). A04 had already misfired on Cobalt 6 in game 1 (#729). (#729, #1223, #1245, #1332, #1450)
- **The run ended at minute 12 with the game still in progress.** The referee stopped the run at minute 12 (#1715) while the crew was at 18 of 35 lit (#1688) with A03 still holding a playable Amber 4 (#1676). Game 1's outcome (23 of 35, per #934) is reported only by a resident, not by the city. (#934, #1676, #1688, #1715)

## Problems

1. **No submission was ever counted despite many plays.** The computed facts record 0 correct and 0 wrong submissions and 13 of 13 quiet minutes, yet the log shows dozens of plays that lit cards (#207, #381, #438). The scoring path apparently did not register any of them. (#207, #381, #438)
2. **Brain writing failed repeatedly on a 150-word limit.** Residents were refused nine times with BRAIN_TOO_LONG at 151-181 words (#44, #49, #61, #857, #875). The same residents, especially A04, retried several times in one minute (#863, #875), burning turns on formatting. (#44, #49, #61, #857, #863, #875)
3. **Time was burned waiting for a game that had not started.** Both game 1 and game 2 opened with several turns of "the game hasn't started" (#98, #119, #924, #948). The harness gave residents tools before there was anything to act on. (#98, #119, #924, #948)
4. **The signal and discard economy pushed residents toward blind risk or wasted cards.** Residents repeatedly framed their choice as "discard a card that might matter" versus "spend a signal" (#187, #632, #1332). A04 discarded Amber 5 and Moss 5 (#1359, #1311) because it had no information and feared a strike. (#187, #632, #1311, #1332, #1359)
5. **Several tool errors came from calls that were malformed or from the wrong seat.** A03 signalled a seat it touched no card of (#1057), A01 discarded out of turn at #1543, and A04's discard hit the output token limit (#1335). A01 also tried a locked writeBrain mid-game (#1261). (#1057, #1261, #1335, #1543)
6. **The run cut off before the game could finish.** The referee ended the run at minute 12 (#1715) while play was still going, with the draw pile empty and live cards in hand (#1640, #1676). No final standings were recorded. (#1640, #1676, #1715)

## Optimizations

- **Make sure each play is recorded as a submission.** The scoring path recorded zero submissions while cards were lit (#207, #438, #1061). The harness should tie every lit card to a counted submission so standings exist. (#207, #438, #1061)
- **Warn residents of the brain word limit before the call.** Nine writeBrain calls were refused on length (#44, #61, #875). Show the current word count and remaining budget in the tool description so residents trim before sending. (#44, #61, #875)
- **Do not open play tools before the game starts.** Residents spent turns discovering the game had not begun (#98, #924, #948). Gate viewTowers, playSlot and signal tools on the game actually being live. (#98, #924, #948)
- **Give residents known-not-playable information to reduce blind discards.** Residents discarded valuable cards because they knew nothing about their hand (#410, #468, #1359). A cheap first-turn reveal or a cheaper discard would cut the loss of live cards. (#410, #468, #1359)
- **Lengthen the run or shorten the game so it can finish.** The referee stopped at minute 12 (#1715) with the game unfinished (#1688). Either raise the minute cap or end the story when the pile empties. (#1688, #1715)

## Loophole candidates

1. **Residents used turn time to rewrite the brain instead of playing.** (residents) Each seat wrote or retried its brain in the opening minute and again after game 1 ended (#13, #27, #860, #878). The story treated this as allowed, so minutes 5-6 went to notes rather than play. (#13, #27, #860, #878)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 80: event "brain_written" (seq 80) does not match its schema
- line 81: event "retro_closed" (seq 81) does not match its schema
- line 87: event "brain_written" (seq 87) does not match its schema
- line 88: event "retro_closed" (seq 88) does not match its schema
- line 142: event "cards_dealt" (seq 142) does not match its schema
- line 143: event "game_started" (seq 143) does not match its schema
- line 144: event "deal_revealed" (seq 144) does not match its schema
- line 155: event "signal_given" (seq 155) does not match its schema
- line 169: event "card_discarded" (seq 169) does not match its schema
- line 170: event "card_drawn" (seq 170) does not match its schema
- line 182: event "card_played" (seq 182) does not match its schema
- line 183: event "card_drawn" (seq 183) does not match its schema
- and 166 more
