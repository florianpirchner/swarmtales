# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 74 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 52 (referee) |
| Counted | events #6 to #5688 (4607 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 52 minutes (to the end); A02 on level 1 from minute 0 for 52 minutes (to the end); A03 on level 1 from minute 0 for 52 minutes (to the end); A04 on level 1 from minute 0 for 52 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.170 USD for this run (competitors 0.170, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0063 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 53 of 53 minutes without a submission; longest without one: minutes 0-52 (53) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No resident ever submitted a solution in 52 minutes.** All four residents stayed on level 1 for the whole run and made zero submissions; the referee ended at minute 52 with quiet minutes from 0 to 52. The log shows only table play: folds, calls and bets, never a solve attempt (#5688). (#15, #234, #5688)
- **A02 pulled far ahead in chips during game 3.** A04's own tally after game 3 gave A02 +48, A01 +5, A04 -17 and A03 -36, so A02 was the dominant player despite the match never converting chips into a level. A02 won the big two-pair hand 3 for 36 chips (#579) and kept re-raising for value on strong boards (#3931, #4135). (#579, #3931, #4340, #4345, #4349)
- **A01's fixed pot-odds threshold made it fold hand after hand.** A01 repeatedly folded playable hands by the referee's own percentage, e.g. Q♣6♣ on the button with 25% against a 29% requirement (#731) and K♥7♦ at 27% against 40% (#238). This arithmetic-only loop consumed most of A01's run without any other action. (#238, #731, #2330, #3530)
- **Tool locks interrupted residents mid-action.** A02 tried to act on the turn and was refused with TOOL_LOCKED (#325), and A04 was refused on a river decision (#1445). Both then simply waited, wasting minutes inside hands. (#314, #325, #1442, #1445)
- **Residents kept reasoning about the referee's odds as if they were wrong.** Several residents argued the referee's pot-odds figures were inconsistent, e.g. A03 at #571 and A02 at #1349, and A02 explicitly noted the message said A04 calls and then said it was not A02's turn (#314). This doubt drove them to end turns rather than act. (#314, #571, #1349)
- **One long hand stalled minute 12 to 16 across the whole table.** The river of hand 8 on the first game had everyone checking through, with A04 locked out (#1445), and the hand only resolved around #1585 where A04 reported game 1 scores. That single hand consumed roughly four minutes of a 53-minute run. (#1445, #1454, #1458, #1560, #1585)

## Problems

1. **Zero submissions: the residents never engaged the level.** The run is a poker game only; no resident posted, messaged or submitted anything in 53 quiet minutes. The log shows residents explicitly waiting for the next hand instead of doing anything else (#50, #278, #586). (#50, #278, #586, #5688)
2. **The referee's percentage cues conflicted with the visible pot, causing stalls.** A03 and A02 both spent reasoning turns doubting the referee's 40% threshold versus their own pot math (#571, #1040, #3212), and A02 hit an action message that contradicted itself (#314). The result was time spent reconciling numbers instead of playing. (#314, #571, #1040, #3212)
3. **TOOL_LOCKED errors hit residents whose turn the game had announced.** A02 was told it was not its turn and then refused a tool (#314, #325); A04 hit the same lock on a river (#1442, #1445). These errors punished residents for acting on stale state. (#314, #325, #1442, #1445)
4. **Every resident is stuck on level 1 for the full 52 minutes.** A01, A02, A03 and A04 all sat on level 1 from minute 0 to the end with no level-ups and no points recorded. Nothing in the log shows any progress mechanism being used. (#15, #234, #5688)
5. **The gamemaker did nothing all run.** No gamemaker actions were recorded, and the final standings are unknown. With no story file (000-run.json has no story) the run had no beats to trigger a narrative. (#5688)
6. **Residents burned turns by declaring 'not my turn' repeatedly.** Many turns are just waiting notices, e.g. #63, #83, #322, #1790, #1810, #3615. These filler turns shorten the effective decision time in each hand. (#63, #83, #322, #1790, #1810, #3615)

## Optimizations

- **Give the residents a path to the level inside the poker table.** Since zero submissions happened in 53 minutes, add a clear per-hand or per-game objective that converts play into a solve attempt, or surface the level's task in the hand message. Cite the empty submission record and the residents' waiting messages (#50, #278, #5688). (#50, #278, #5688)
- **Reconcile the referee's equity numbers with the displayed pot.** A03 and A02 repeatedly stalled because the stated threshold did not match the pot they saw (#571, #3212). Make the message show the pot, bet and required equity in one consistent block so residents stop second-guessing the referee. (#571, #1040, #3212)
- **Fix the turn-order message so it cannot contradict itself.** A02 saw a message saying A04 called and then that it was not A02's turn (#314) and was then locked out (#325). Have the harness emit a single authoritative state line per turn. (#314, #325, #1442, #1445)
- **Stop filling turns with 'waiting' replies.** Residents produced many pure waiting notices (#63, #83, #1790, #3615), which cost tokens and time. Suppress the turn entirely until the resident actually has an action, or batch waits without a model call. (#63, #83, #1790, #3615)
- **Speed up the river check-down that consumed minutes 12 to 16.** Hand 8 on game 1 crawled through river checks with a tool lock (#1445, #1458) before resolving at #1585. Cap check-around streets or auto-resolve when all players have checked. (#1445, #1458, #1560, #1585)

## Loophole candidates

1. **Residents used folding-by-referee-percentage as a safe default to avoid decisions.** (residents) A01 in particular folded nearly every hand on the referee's stated equity (#238, #731, #3530, #5240), treating the percentage as an excuse to end the turn. This is a cheap safe path that avoids engaging the level or other residents. (#238, #731, #3530, #5240)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 18: event "decision_scored" (seq 18) does not match its schema
- line 19: event "action_taken" (seq 19) does not match its schema
- line 26: event "decision_scored" (seq 26) does not match its schema
- line 27: event "action_taken" (seq 27) does not match its schema
- line 34: event "decision_scored" (seq 34) does not match its schema
- line 35: event "action_taken" (seq 35) does not match its schema
- line 57: event "decision_scored" (seq 57) does not match its schema
- line 58: event "action_taken" (seq 58) does not match its schema
- line 76: event "decision_scored" (seq 76) does not match its schema
- line 77: event "action_taken" (seq 77) does not match its schema
- line 90: event "decision_scored" (seq 90) does not match its schema
- line 91: event "action_taken" (seq 91) does not match its schema
- line 92: event "board_dealt" (seq 92) does not match its schema
- line 105: event "decision_scored" (seq 105) does not match its schema
- line 106: event "action_taken" (seq 106) does not match its schema
- and 1061 more
