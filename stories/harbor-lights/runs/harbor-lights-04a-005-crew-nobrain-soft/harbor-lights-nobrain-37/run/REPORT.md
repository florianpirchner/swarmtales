# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-nobrain` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #4 to #1930 (1696 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.150 USD for this run (competitors 0.150, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0048 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_SUCH_SLOT 1, NOT_YOUR_TURN 1, TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 opens the run by lighting Violet 1 on slot 3, the only early clean play.** A02 played slot 3, which was Violet 1, and it lit (#30). That was the crew's first lit card; A04 followed with Moss 1 (#69), so two towers were open within minute 0. (#30, #69)
- **A01 twice discarded a playable card it had reasoned about, costing Violet 2 and Violet 4.** A01 discarded slot 3 believing it was a 50/50 between Cobalt 2 and Violet 2, losing the playable Violet 2 (#126, #127). Later it discarded slot 1, which turned out to be the playable Violet 4 (#351, #352), and admitted the discard was a mistake. (#126, #127, #351, #352)
- **The crew lit all 35 cards' worth of progress across two games despite heavy discarding.** By minute 7 A01 reports 23 of 35 lit for game 2 with a score of 20 after penalty, against 15 after game 1 (#1281, #1293). A03 disputed the 23 count and argued for 22 (#1298, #1299), so the recorded total was contested. (#1281, #1293, #1298, #1299)
- **A03 pushed the run to its best finish: Cobalt 4 at minute 11 unlocked A01's last card.** A03 played slot 2, which was Cobalt 4, and it lit, making Cobalt 5 the next playable card held by A01 (#1910). Earlier A03 lit Rose 4 from a signal (#1861), showing signals did land when the receiver trusted them. (#1861, #1910)
- **A04 avoided every blind play and stayed cardless but strike-free late on.** A04 repeatedly discarded rather than risk a 3-point strike, e.g. discarding Rose 4 (#1136) and Rose 7 (#1882). It ended with an empty hand and never took a misfire in the final stretch. (#1136, #1882)

## Problems

1. **No resident ever solved a level or made a submission; all four sat on level 1 for the full 12 minutes.** The facts record all four residents stuck on level 1 from minute 0 to 12 with 0 submissions. The log ends with the referee stopping the run at minute 12 (#1930) while play was still progressing (#1910). (#1910, #1930)
2. **Residents continually misestimated blind-play odds and talked themselves into discards.** A01's odds estimates swing from "about 19%" (#73) to "1 in 22" (#685) to "about 1 in 5" (#833) without a consistent method, and it discarded playable cards twice (#126, #351). A03 similarly passed on playable Rose 4 (#475) until A02 signalled it. (#73, #126, #351, #475, #685, #833)
3. **Signals were frequently read as the wrong card or suit, producing misfires.** A04 signalled rank 2 intending Violet 2, and A01 read it as a 50/50 and discarded it (#148). A02 signalled Amber and A03 misfired Amber 4 (#937). A02 later flagged that the summary's misfire list ("Moss 2 and Amber 4") matched the log (#1293). (#148, #937, #1293)
4. **Tool errors interrupted turns and produced dead actions.** There were NO_SUCH_SLOT (#1267), NOT_YOUR_TURN (#1722), and TOUCHES_NOTHING (#1475) refusals. In #1267 A02 tried to play slot 1 when it held only slot 1, and in #1722 A02 acted during A04's turn. (#1267, #1475, #1722)
5. **Residents spent many turns on the mechanics of counting and reasoning instead of acting.** Long reasoning lines about unseen-card pools recur, e.g. #1298, #1458, #1598, and several residents note they hold rather than play (#1556, #1689). With 13 quiet minutes and 0 submissions (facts), most turns produced no board change. (#1298, #1458, #1556, #1598, #1689)

## Optimizations

- **Give a per-turn UI summary of playable cards so residents stop deriving odds by hand.** A01 and A02 repeatedly recompute unseen pools and misstate them (#73, #685, #833). A harness panel listing each slot's possible playable cards would cut this and prevent discards like #126 and #351. (#73, #126, #351, #685, #833)
- **Make signals unambiguous, e.g. allow suit+rank or a direct 'playable' marker.** A04's rank-2 signal meant Violet 2, but A01 read it as a coin flip and discarded the card (#148). A03 misfired Amber 4 after an Amber signal from A02 (#937). (#148, #937)
- **Soften or explain the strike penalty so risk-averse residents will play.** A04 repeatedly cites a 3-point strike penalty to justify discarding (#1136, #1726, #1847). A01 frames a single missed play as costing 3 points on top of the card (#979). (#979, #1136, #1726, #1847)
- **Add a turn-state guard to prevent NOT_YOUR_TURN and NO_SUCH_SLOT refusals.** A02 attempted a play when it held only slot 1 (#1267) and played out of turn (#1722). A03's signal touched nothing (#1475). A pre-action validation message would save these turns. (#1267, #1475, #1722)
- **Tie the level-solved win condition to the scoring the residents see, or state the target score in the brief.** The facts show levels solved: none while residents discuss lit counts of 23/35 and scores of 20 (#1281, #1293). Residents never mention a win target, suggesting the objective was unclear. (#1281, #1293)

## Loophole candidates

1. **Discarding for a signal was used as a safe default, turning 'play blind' into a non-choice.** (residents) A04 discarded repeatedly to recover signals rather than risk a misfire (#1136, #1726, #1882). A03 discarded Violet 6 and Amber 7 to regain signals (#155, #275), and A01 discarded several times (#731, #760, #833). (#155, #275, #731, #1136, #1726, #1882)
2. **Residents spent whole turns signalling instead of acting, keeping the discards and misfires counter stable.** (residents) A04 signalled Moss to A01 and explicitly did not play its own slots (#1042), and A02 signalled rather than playing its Rose cards (#413, #954). This keeps the game from advancing or ending on strikes. (#413, #954, #1042)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 24: event "card_played" (seq 24) does not match its schema
- line 25: event "card_drawn" (seq 25) does not match its schema
- line 37: event "signal_given" (seq 37) does not match its schema
- line 44: event "card_played" (seq 44) does not match its schema
- line 45: event "card_drawn" (seq 45) does not match its schema
- line 52: event "signal_given" (seq 52) does not match its schema
- line 64: event "card_played" (seq 64) does not match its schema
- line 65: event "card_drawn" (seq 65) does not match its schema
- line 86: event "card_discarded" (seq 86) does not match its schema
- line 87: event "card_drawn" (seq 87) does not match its schema
- line 94: event "signal_given" (seq 94) does not match its schema
- line 108: event "card_discarded" (seq 108) does not match its schema
- line 109: event "card_drawn" (seq 109) does not match its schema
- line 122: event "signal_given" (seq 122) does not match its schema
- line 142: event "card_discarded" (seq 142) does not match its schema
- line 143: event "card_drawn" (seq 143) does not match its schema
- and 214 more
