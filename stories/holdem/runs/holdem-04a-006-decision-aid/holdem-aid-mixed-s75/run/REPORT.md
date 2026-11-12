# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 75 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 43 (referee) |
| Counted | events #6 to #4980 (3983 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 43 minutes (to the end); A02 on level 1 from minute 0 for 43 minutes (to the end); A03 on level 1 from minute 0 for 43 minutes (to the end); A04 on level 1 from minute 0 for 43 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.129 USD for this run (competitors 0.129, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0060 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 44 of 44 minutes without a submission; longest without one: minutes 0-43 (44) |
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

- **A01 wins the first big pot with a straight and builds an early lead.** A01 held 8-9 on a 5-6-7-9 board and won the 38-chip pot at #1929 and #1960, reporting +24 at #1991 while A04 recorded being down 18 at #593. (#593, #1929, #1960, #1991)
- **A04 answers with a straight win and a trips win, keeping the table close.** A04 won the 42 pot with a ten-high straight (#556, #578) and later the 28 pot with three fours (#1219, #1247), reporting +24 at #578 and +16 at #1247. (#556, #578, #1219, #1247)
- **A02 wins a large river pot with a straight over A03's kings.** A02 made a 5-9 straight on the river (#2993, #3012) and A03 recorded losing 18 points to it with a pair of kings at #3037. (#2993, #3012, #3037)
- **A03's window to bet is throttled by slow table order, and it repeatedly checks with thin equity.** A03 checked with 20% equity at #3818 and folded when the pot odds required more (#3901, #4204, #4845), while its clear value hands like the jacks at #356 and the queens at #3417 eventually did bet. (#356, #3417, #3818, #3901)
- **Chatty private reasoning from residents does not translate into any public table talk.** All four residents reason at length (#58, #108, #192, #565), but the only outward lines are self-directed status notes such as #66 and #904, and the facts record zero DMs and zero posts. (#58, #66, #108, #192, #565, #904)
- **The game runs out of time in the middle of hand 8 of a later game.** The last hand is played at #4878 through #4970, and the run ends at #4980 in minute 43 with the referee stopping it, so the final standings are unknown. (#4878, #4970, #4980)

## Problems

1. **The residents misread the table order and burn turns waiting on the wrong player.** A01 was unsure whether A04 or A02 acted next (#100, #1130, #903), A02 thought action was out of order (#2088), and A04 had to reconstruct the postflop order (#1752, #3280). (#100, #903, #1130, #1752, #2088, #3280)
2. **Residents repeatedly fold because they treat a referee threshold as 40% in places where it is not the pot-odds price.** Residents cite 40% as needed at #205, #583, #1469, #2358, #3045, and #4488, and A01 openly doubts the 40% figure at #2498. (#205, #583, #1469, #2358, #2498, #3045, #4488)
3. **Much of the reasoning and action is spent on turnover and waiting rather than poker decisions.** Dozens of lines are pure waiting, such as #34, #131, #239, #429, #1100, #1613, #2401, #2516, and #4225, which slows the hands and keeps sessions short. (#34, #131, #239, #429, #1100, #1613, #2401, #2516)
4. **The run never resolves standings or points in the facts, so the competition has no visible result.** Final standings are recorded as unknown, and residents only report partial totals such as +25 at #945 and +16 at #1247. (#945, #1247)
5. **Residents act on half-remembered hand labels and occasionally contradict the tool's reading.** A04 second-guessed the tool's best-hand label around #2812 and #3012, and A03 reasoned about a nine-high claim wrongly at #92, suggesting the game-state messages are ambiguous. (#92, #2812, #3012)

## Optimizations

- **Surface explicit action order and pot odds in every prompt.** The residents repeatedly lose track of whose turn it is and of the pot price (#100, #1130, #2088, #3280); state seat order, the amount to call, and the pot explicitly so the reasoning is about the hand, not the bookkeeping. (#100, #1130, #2088, #3280)
- **Give each resident a running score and point dashboard.** The residents improvise totals like +25 at #945 and +16 at #1247, and final standings are unknown; feed each resident its current score so the competition stays visible. (#945, #1247)
- **Collapse waiting turns into a single skip action.** Waiting turns such as #239, #1100, #2516, and #4225 are spent as full decisions; let the harness skip non-acting seats automatically so more hands are played. (#239, #1100, #2516, #4225)
- **Clarify the equity threshold so folds are not driven by a phantom 40%.** Residents fold on a mistaken 40% requirement at #205, #2358, #3045, and #4488; state the break-even percentage per spot so the referee's number does not crowd out pot-odds reasoning. (#205, #2358, #3045, #4488)
- **Provide a short settlement scoreboard at the end of each run.** The run ends at #4980 with standings unknown and no points table, so designers cannot compare the residents; output final points and ranks at the final hand. (#4980)

## Loophole candidates

1. **Residents default to checking or folding rather than risking points.** With many zero-subsidy decisions, residents fold middling hands such as A04 at #1057 and A02 at #85, and A04 checked a weak hand at #913, keeping the pot small and the game low-variance rather than competitive. (#85, #913, #1057)
2. **A resident repeatedly cites 'the referee says' to shut down its own reasoning.** A01 folds at #2017 because 'the referee says I need 40% equity', and follows the referee even while doubting it at #2498; treating the referee as a rule rather than a guide is a way to avoid deciding. (#2017, #2498)
3. **Residents rarely bet with strong hands, letting showdowns decide pots.** A04 checked jacks on a Q-high board at #1700, A03 checked queens and jacks at #3200, and A03 checked its straight draw rather than betting at #3636, so pots stay small and the game is decided by luck at showdown. (#1700, #3200, #3636)

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
- line 46: event "decision_scored" (seq 46) does not match its schema
- line 47: event "action_taken" (seq 47) does not match its schema
- line 61: event "decision_scored" (seq 61) does not match its schema
- line 62: event "action_taken" (seq 62) does not match its schema
- line 79: event "decision_scored" (seq 79) does not match its schema
- line 80: event "action_taken" (seq 80) does not match its schema
- line 81: event "board_dealt" (seq 81) does not match its schema
- line 95: event "decision_scored" (seq 95) does not match its schema
- line 96: event "action_taken" (seq 96) does not match its schema
- line 103: event "decision_scored" (seq 103) does not match its schema
- line 104: event "action_taken" (seq 104) does not match its schema
- and 977 more
