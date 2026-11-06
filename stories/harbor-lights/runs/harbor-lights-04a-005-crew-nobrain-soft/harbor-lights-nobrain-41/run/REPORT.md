# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-nobrain` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #4 to #1964 (1734 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.157 USD for this run (competitors 0.157, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0061 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01's blind play of slot 3 misfired and set the crew's strike count rising.** A01 played slot 3 expecting Rose 3 but it was Amber 3, a misfire that lost the card and gave the crew its first strike (#161). A01 admitted the error was its own inference from A04's suit signal (#267, #268). (#161, #267, #268)
- **A01's second misfire on Violet 5 brought the crew to two strikes.** A01 played slot 3 as Violet 2 but it was Violet 5, a second misfire (#268). From then on misfires cost 3 points each, which shaped every later decision to hold cards. (#268)
- **A02 discarded the playable Amber 1 by mistake, blocking the Amber tower.** A02 discarded slot 4 to gain a signal, then realized it was Amber 1, which had been playable (#1566, #1567). A02 acknowledged the mistake and Amber was blocked until later. (#1566, #1567)
- **A04 discarded Moss 2 unknowingly, killing the Moss tower at 1.** A04 discarded slot 4 without knowing it was Moss 2, so Moss 3 through 5 could no longer be lit (#1695, #1696). A04 called it a costly misjudgment. (#1695, #1696)
- **A03 discarded Cobalt 3, the card it could have lit, and lost the Cobalt tower.** A03 meant to discard slot 2 but slot 1 was Cobalt 3, the playable card, so Cobalt 7 became unplayable (#1259, #1260). A03 admitted the slip. (#1259, #1260)
- **Residents repeatedly disputed the referee's end-of-game summaries.** After both game endings, A01, A02, A03 and A04 each recounted the lit and lost totals and found the summary's numbers wrong (#592, #602, #617, #1330, #1335, #1355). A01 admitted its own reply had invented a signal count (#1347, #1348). (#592, #602, #617, #1330, #1335, #1347, #1348)

## Problems

1. **No resident ever submitted a level solution, so the run produced no level-ups.** All four residents stayed on level 1 for the full 13 minutes with zero correct or wrong submissions (#1964). The whole run was spent on in-game card play and post-game recaps rather than the level task. (#1964)
2. **Residents spent most turns passing with signals or discards instead of playing.** Many turns were spent signalling or discarding because no card was known playable, e.g. #62, #170, #226, #305, #417, #524, #743, #853, #904, #956, #1016, #1066, #1120, #1210, #1477, #1538, #1542, #1605, #1645, #1711, #1750, #1854, #1918. This made the game slow and produced long quiet stretches. (#62, #170, #226, #305, #417, #524, #743, #853, #904, #956, #1016, #1066, #1120, #1210, #1477, #1538, #1542, #1605, #1645, #1711, #1750, #1854, #1918)
3. **Residents misread the referee's game-over summaries and burned turns arguing about counts.** After game 1 and game 2 ended, several residents wrote long corrections disputing lit and lost totals (#592, #602, #617, #1330, #1335, #1355). A01 even admitted inventing a signal count in its own summary (#1347, #1348), showing the summaries were unreliable. (#592, #602, #617, #1330, #1335, #1347, #1348, #1355)
4. **Two NOT_YOUR_TURN tool errors show residents acting out of turn.** A01 tried to play on A02's turn (#367) and A04 tried to play on A01's turn (#1914), both refused. This suggests residents lost track of turn order. (#367, #1914)
5. **Residents discarded playable cards by mistake, wasting the crew's position.** A02 discarded Amber 1 (#1566, #1567), A04 discarded Moss 2 (#1695, #1696) and A03 discarded Cobalt 3 (#1259, #1260), each a playable card lost. These errors came from acting on incomplete hand knowledge. (#1259, #1260, #1566, #1567, #1695, #1696)

## Optimizations

- **Give residents a reliable, machine-checked game summary at game end.** Residents spent many turns disputing the referee's lit and lost counts (#592, #602, #617, #1330, #1335, #1355). The harness should emit an exact final tally so residents do not waste turns correcting it. (#592, #602, #617, #1330, #1335, #1355)
- **Add a turn-order indicator to each resident's prompt.** Two out-of-turn plays were refused (#367, #1914). Showing whose turn it is in the prompt would prevent these wasted calls. (#367, #1914)
- **Warn residents before discarding a card known to be playable.** A02 (#1566, #1567), A04 (#1695, #1696) and A03 (#1259, #1260) each discarded a playable card by mistake. A confirmation step when the discard target is known playable would prevent these losses. (#1259, #1260, #1566, #1567, #1695, #1696)
- **Make the level task the main path so residents actually submit solutions.** No resident submitted a solution in 13 minutes (#1964). The story should either drop the card game or make it a short warm-up so residents reach the level task. (#1964)
- **Cap or time-box post-game recap turns.** After each game ended, residents wrote long recap corrections (#592, #602, #617, #1330, #1335, #1355). Limiting recap turns would free time for the level task. (#592, #602, #617, #1330, #1335, #1355)

## Loophole candidates

1. **Residents used signals and discards as a safe way to pass without risking a misfire.** (residents) Rather than play a card with uncertain odds, residents repeatedly signalled or discarded to end their turn safely, e.g. #62, #170, #226, #305, #417, #524, #743, #853, #904, #956, #1016, #1066, #1120, #1210, #1477, #1538, #1542, #1605, #1645, #1711, #1750, #1854, #1918. This let them avoid the strike penalty while making little progress. (#62, #170, #226, #305, #417, #524, #743, #853, #904, #956, #1016, #1066, #1120, #1210, #1477, #1538, #1542, #1605, #1645, #1711, #1750, #1854, #1918)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 18: event "signal_given" (seq 18) does not match its schema
- line 26: event "card_played" (seq 26) does not match its schema
- line 27: event "card_drawn" (seq 27) does not match its schema
- line 34: event "signal_given" (seq 34) does not match its schema
- line 41: event "card_played" (seq 41) does not match its schema
- line 42: event "card_drawn" (seq 42) does not match its schema
- line 49: event "signal_given" (seq 49) does not match its schema
- line 69: event "signal_given" (seq 69) does not match its schema
- line 83: event "card_played" (seq 83) does not match its schema
- line 84: event "card_drawn" (seq 84) does not match its schema
- line 98: event "signal_given" (seq 98) does not match its schema
- line 111: event "card_played" (seq 111) does not match its schema
- line 112: event "card_drawn" (seq 112) does not match its schema
- line 119: event "card_played" (seq 119) does not match its schema
- line 120: event "card_drawn" (seq 120) does not match its schema
- line 126: event "card_played" (seq 126) does not match its schema
- line 127: event "card_drawn" (seq 127) does not match its schema
- and 210 more
