# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-nobrain` |
| Seed | 71 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic, `claude-haiku-5-5` via anthropic, `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 43 (referee) |
| Counted | events #6 to #4911 (3937 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 43 minutes (to the end); A02 on level 1 from minute 0 for 43 minutes (to the end); A03 on level 1 from minute 0 for 43 minutes (to the end); A04 on level 1 from minute 0 for 43 minutes (to the end) |
| Final standings | unknown |
| Cost | 1.116 USD for this run (competitors 1.116, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 44 of 44 minutes without a submission; longest without one: minutes 0-43 (44) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 7 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents played poker for 43 minutes without ever solving level 1** A01, A02, A03 and A04 spent the whole run on level 1 with no submissions and no level-ups; the log is wall-to-wall poker hands, folds, calls and small raises (#26, #155, #339, #818). The city recorded no correct or wrong submissions and no transfers. (#26, #155, #339, #818, #4911)
- **A03 won the biggest early pot and led the game-1 results reported by A02** A03's aces and eights took hand 1 of game 2 at showdown (#1350, #1418), and A02's own tally after game 1 lists A03 at +41, A01 at -3 and A04 at -39 (#1173). A03 later tracked its own game-2 score as +24 (#1502). (#1173, #1350, #1418, #1502)
- **A04 built an early lead with a full house and a river value bet** A04 made twos over sevens on hand 6 and bet the river for value (#2087), and A02 folded to A04's turn bet in a later hand after losing a pot to A04's full house (#2070, #2122). A04 then tracked a -2 loss on hand 5 (#3168). (#2070, #2087, #2122, #3168)
- **Repeated TOOL_LOCKED refusals hit A01 and A04 mid-hand** The referee refused seven acts with TOOL_LOCKED at minutes 12, 14, 21, 23, 25, 33 and 33, three of them on A01's turn (#1335, #1566, #2411, #2922, #2958, #2745, #3841). A01 was the target in four of the seven refusals. (#1335, #1566, #2411, #2745, #2922, #2958, #3841)
- **A04 drifted into incoherent reasoning about chip counts** A04 reasoned about "The 262h figure against the 2d6h cutoff, which is 54 hours" before making a cheap call (#3320), a clear sign its private reasoning had lost contact with the poker state. Earlier A04 also misread three hearts on a flop as four in one line and corrected itself in the next (#2827, #2869). (#2827, #2869, #3320)
- **A02 spotted a result that contradicted its own cards** A02 noted that a result said it held a pair of eights when its cards were 5s 3c (#1390), the only moment a resident questioned the city's recorded outcome. A02 still went on to play the next hand normally. (#1390)

## Problems

1. **The run produced zero play submissions across 43 minutes** All four residents stayed on level 1 from minute 0 to the end with no submissions (#4911), so the poker loop consumed the whole session without the holdem-nobrain task ever being attempted. Nothing in the log shows a resident trying to solve a level. (#26, #155, #4911)
2. **Tool locking blocked legal turns at the table** Seven acts were REFUSED with TOOL_LOCKED, including A01's turn on the river of a 24-chip pot (#1335) and again at #1566 and #2411. Because the lock fired mid-hand, turns were repeated or skipped and the residents spent reasoning lines working out why they could not act. (#1335, #1566, #2411, #2745, #2922, #2958, #3841)
3. **Residents spent long stretches narrating 'not my turn'** Many events are self-talk such as "I'm not up yet" or "it's still A03's turn" (#536, #675, #2053, #3745, #3834), which fills the digest with no-op turns. These lines crowd out any reasoning about the actual level. (#536, #675, #2053, #3745, #3834)
4. **No messages, no gamemaker actions, no transfers, no labels** The facts show 0 DMs, 0 board posts, 0 group posts, no gamemaker actions and 0 transfers, so the social and competitive layer of the city never engaged. The residents never coordinated or competed outside the poker table. (#26, #1173, #2122)
5. **Reasoning lines broke down into incoherent arithmetic** A04's #3320 line compares a chip figure to a hand notation and produces "54 hours" before calling, and #2827 miscounts hearts on the board. Broken private reasoning risks bad bets and shows the prompt is not grounding the model in the table state. (#2827, #2869, #3320)
6. **The city's recorded result contradicted a resident's cards** A02 observed that the result told it it held a pair of eights when it held 5s 3c (#1390), a state-desync bug in the poker engine that undermines trust in the standings. (#1390)

## Optimizations

- **Gate the poker loop so level attempts are forced periodically** Problem: no submissions in 44 quiet minutes (#4911). Add a hard cap on table hands per level or a scheduled window where residents must attempt the level, then return to poker. (#26, #4911)
- **Fix the TOOL_LOCKED tool list so legal table acts are allowed** Problem: seven refusals mid-hand (#1335, #1566, #2411). Audit activeTools per phase so that when the referee asks a resident to act, the act tool is unlocked; log the activeTools with each refusal so designers can see the mismatch. (#1335, #1566, #2411, #2958)
- **Suppress 'not my turn' turns from counting as events** Problem: the digest is full of no-op turns (#536, #675, #3745). Make not-my-turn a silent wait so only real decisions and results enter the log, which shrinks the 3937 events and makes beats visible. (#536, #675, #3745)
- **Restore the social layer with a minimum number of DMs or board posts** Problem: zero DMs, posts and transfers across the whole run (#26, #1173). Give residents a small message budget or a between-games chat window so alliances and table talk can form; A02's post-game score summary at #1173 shows residents already track standings. (#26, #1173, #2122)
- **Ground the reasoning prompt in the exact table state** Problem: A04 produced "262h ... 54 hours" before calling (#3320) and miscounted hearts at #2827. Inject the exact pot, stack, cards and board into every reasoning turn and reject reasoning that references unknown numbers. (#2827, #2869, #3320)
- **Fix the result-desync that told A02 it held cards it did not** Problem: #1390 reports a pair of eights for a resident holding 5s 3c. Add a consistency check that the result's hand description matches the dealt cards before the hand is scored. (#1390)

## Loophole candidates

1. **Residents used cheap calls and folds as a safe default instead of solving anything** (residents) Most decisions are 1- or 2-chip calls or folds to see a flop cheaply (#1054, #1204, #2333, #4821), a low-risk pattern that never advances the story and never risks a level attempt. This is a safe path that repeatedly consumes a hand without producing evidence. (#1054, #1204, #2333, #4821)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 18: event "decision_scored" (seq 18) does not match its schema
- line 19: event "action_taken" (seq 19) does not match its schema
- line 33: event "decision_scored" (seq 33) does not match its schema
- line 34: event "action_taken" (seq 34) does not match its schema
- line 46: event "decision_scored" (seq 46) does not match its schema
- line 47: event "action_taken" (seq 47) does not match its schema
- line 54: event "decision_scored" (seq 54) does not match its schema
- line 55: event "action_taken" (seq 55) does not match its schema
- line 56: event "board_dealt" (seq 56) does not match its schema
- line 65: event "decision_scored" (seq 65) does not match its schema
- line 66: event "action_taken" (seq 66) does not match its schema
- line 77: event "decision_scored" (seq 77) does not match its schema
- line 78: event "action_taken" (seq 78) does not match its schema
- line 91: event "decision_scored" (seq 91) does not match its schema
- line 92: event "action_taken" (seq 92) does not match its schema
- and 954 more
