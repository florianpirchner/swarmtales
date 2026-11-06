# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-nobrain` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 15 (referee) |
| Counted | events #4 to #2163 (1927 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 15 minutes (to the end); A02 on level 1 from minute 0 for 15 minutes (to the end); A03 on level 1 from minute 0 for 15 minutes (to the end); A04 on level 1 from minute 0 for 15 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.163 USD for this run (competitors 0.163, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0054 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 16 of 16 minutes without a submission; longest without one: minutes 0-15 (16) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 and A02 play blind but correct rank-1 cards early** A02 played slot 1 as a blind ~1-in-3 guess and it was Amber 1 (#26, #41); A02 then played slot 1 again as Amber 2 and it lit (#92). These early risk plays lit the first lights of the game. (#26, #41, #92)
- **The crew settles into signalling playable cards to each other** Residents repeatedly spent signals to point teammates at playable cards rather than gamble: A01 signalled A02 about Amber (#15, #274), A04 signalled A02 "Moss 1" (#180), and A04 signalled A03 about Rose 1 (#927, #927-949 cluster). A02 then lit the signalled Moss 1 (#949 region, #997, #1005, #1107). (#15, #180, #927, #1005)
- **A04 misfires Moss 3 for the first strike** A04 played slot 3 believing it was Moss 1-ish and it was Moss 3, the crew's first strike (#763, #793). After that the residents repeatedly cited the 3-point second-strike penalty as a reason to discard instead of play (#172, #222, #306). (#172, #763, #793)
- **Long discard-heavy middle game stalls the towers** From minute 5 to about minute 10 the residents mostly discarded for signals: #818, #832, #897, #911, #933, #953, #974, #1027, #1122, #1149 are all discards, several of which lost cards that were nearly playable (#478 Violet 3, #1263 Moss 4, #1297 Violet 5). The pile emptied and lit counts lagged far behind. (#478, #818, #897, #1122, #1263, #1297)
- **Residents dispute the referee's end-of-game summaries** After each game ended, three residents independently rejected the reported lit count/score: A02 said 14 lit not 21 (#679), A03 counted 17 and a score of 14 not 18 (#689), and A01's own count was 19 not 21 (#695). A03 also argued mid-game that the game was not over (#1419, #1420). (#679, #689, #695, #1419)
- **Late game the crew finally chains plays and ends mid-chain** In minutes 13-14 the crew lit Amber 2, 3, 4, 5, Moss 1, 3, 7, Rose 4, 7, Violet 1, 2, 3, 5 in quick succession (#1997, #2036, #2048, #2069, #2094, #2106, #2121, #2135, #2139, #2152) before the referee stopped the run at minute 15 (#2163). (#1997, #2036, #2048, #2069, #2094, #2135, #2152, #2163)

## Problems

1. **No level was solved: all four residents were stuck on level 1 the whole run** Facts show all of A01-A04 stuck on level 1 from minute 0 to minute 15 with no level-ups and zero submissions. The run ended by referee at minute 15 with no correct or wrong submission. (#2163)
2. **Signals were spent to pass time/avoid risk, not to solve** Several signals were spent purely to keep the crew "active" or as a "pass" with no card play: A01 signalled A02 "Moss" on slot 1 explicitly "as a pass" (#1895), and A01 signalled A04 Violet to "cost nothing" (#512, #529). This burned signals without advancing towers. (#512, #529, #1895)
3. **Residents consider a misfire as an acceptable low-EV gamble** A04 weighed a 50% play against "not playing ends the game at 0" (#637), and A02 played slot 1 as a ~1-in-3 guess (#41). The 3-point strike penalty did not stop blind plays outright, so the game could stall or misfire repeatedly. (#41, #637)
4. **Gamemaker gave no actions and residents had to police each other's game-end claims** Facts show the gamemaker took no actions. Residents instead had to correct a broken/misleading final summary themselves (#679, #689, #695) and A03 had to argue the game was not over (#1419). (#679, #689, #695, #1419)
5. **One tool error: a signal refused as not the resident's turn** A02's giveSignal was refused NOT_YOUR_TURN at minute 7 (#1146), the only tool error. The resident had been reasoning about giving a signal on another player's turn. (#1146)
6. **Pile emptied and residents could no longer draw** A01 drew "the last card of the pile" at minute 2 (#411) and later noted the pile was empty with only 2 cards left (#1122). After that the crew could only cycle hand cards and discards, which matches the long discard stretch. (#411, #1122)

## Optimizations

- **Give the referee's end-of-game summary reliably and consistently** Residents repeatedly disputed lit counts and scores (#679, #689, #695). Make the end-of-game status authoritative and shown to all seats so residents stop burning turns arguing about totals. (#679, #689, #695)
- **Reduce the penalty for early play or seed more visible playable cards** The 3-point second-strike penalty drove residents to discard instead of play (#172, #222, #306). Lowering it or revealing more ranks at start would encourage risk on the many low-EV gambles residents weighed (#41, #637). (#41, #172, #306, #637)
- **Bound signal spending to playable cards** Signals were spent as passes (#512, #529, #1895) rather than to identify a playable card. Requiring a signal to name a card the recipient has not already been told, or limiting signals to cards in the recipient's known playable set, would stop pass-spending. (#512, #529, #1895)
- **Give the gamemaker actions so residents are not the only referees** The gamemaker took no actions (facts table) and residents had to decide whether the game was over (#1419). A gamemaker action on no-progress or disputed state would keep the run on track. (#1419)
- **Prevent NOT_YOUR_TURN signal attempts** A02 attempted giveSignal on A03's turn and got NOT_YOUR_TURN (#1146). The harness should surface whose turn it is to the acting model before it commits to a signal action. (#1146)

## Loophole candidates

1. **Discarding for a signal as a cheap safe move instead of playing** (residents) Residents used discards to regain signals and avoid the misfire penalty, even losing playable cards: A02 threw Violet 3 while it was playable (#477, #478), A02 threw Moss 4 "by mistake" (#1262, #1263), A02 threw Violet 5 (#1296, #1297), and A01 threw Cobalt 4 which became playable soon after (#1786, #1787). This is a safer path than gambling on a play, and it stalled the towers. (#477, #478, #1262, #1297, #1787)
2. **Spending signals as filler on a passing turn** (residents) A01 explicitly signalled "as a pass" (#1895) and signalled A04 even when it "costs nothing" (#512). This uses the signal mechanic to fill a turn without advancing the towers. (#512, #1895)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 18: event "signal_given" (seq 18) does not match its schema
- line 29: event "card_played" (seq 29) does not match its schema
- line 30: event "card_drawn" (seq 30) does not match its schema
- line 48: event "signal_given" (seq 48) does not match its schema
- line 56: event "signal_given" (seq 56) does not match its schema
- line 69: event "signal_given" (seq 69) does not match its schema
- line 82: event "card_played" (seq 82) does not match its schema
- line 83: event "card_drawn" (seq 83) does not match its schema
- line 99: event "card_played" (seq 99) does not match its schema
- line 100: event "card_drawn" (seq 100) does not match its schema
- line 108: event "card_played" (seq 108) does not match its schema
- line 109: event "card_drawn" (seq 109) does not match its schema
- line 118: event "signal_given" (seq 118) does not match its schema
- line 134: event "card_discarded" (seq 134) does not match its schema
- line 135: event "card_drawn" (seq 135) does not match its schema
- line 147: event "card_played" (seq 147) does not match its schema
- line 148: event "card_drawn" (seq 148) does not match its schema
- and 216 more
