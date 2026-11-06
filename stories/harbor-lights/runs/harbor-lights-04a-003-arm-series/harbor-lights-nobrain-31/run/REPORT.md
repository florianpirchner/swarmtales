# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-nobrain` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #4 to #1298 (1143 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.099 USD for this run (competitors 0.099, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
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

- **A01 played the first card of the run and lost a card to a misfire risk it had flagged itself** A01 spent the opening minutes reasoning about playable 1s and then played a card A02 had already misfired on; the log records two strikes inside minute 0 (#82, #96), and A01 later admits its own play was a mistake because Amber 1 had not been lit (#478). (#13, #82, #96, #478)
- **A03 repeatedly gave signals to teammates instead of playing blind** A03 told A04 about Amber (#180), then kept signalling A02 about playable cards (#407, #427), and its stated reason was that its own hand was unknown and strikes were scarce (#531, #580). (#180, #407, #427, #531, #580)
- **A01 and A04 traded signals that unblocked a long Amber chain** A04 signalled A01 'Amber' for slot 4 (#498) and A01 then lit Amber 1 (#777), after which A02 and A04 played Amber 4 and Amber 5 in minutes 5 (#839, #851). (#498, #777, #839, #851)
- **The crew reached two strikes and then stopped gambling** After strikes hit 2 of 3 by minute 1 (#215), residents repeatedly refused blind plays on that ground (#469, #518, #1157) and the run ended with no further misfires. (#215, #469, #518, #1157)
- **A02 misread a negative signal and burned a strike on Cobalt 7** A02 treated a signal as marking a 1 and played slot 1, which was Cobalt 7, then acknowledged it had misread 'not Amber, 1' (#1119, #1120). (#1094, #1095, #1119, #1120)
- **The run ended at minute 9 with the city cutting play mid-chain** The last logged event is the referee ending the run at minute 9 (#1298) while A04 was about to play a slot it judged five-in-six safe (#1289), and A03's Cobalt 2 play (#1280) is never resolved in the log. (#1280, #1289, #1298)

## Problems

1. **No level was solved and no submission was made in the whole run** The facts record zero correct submissions and no level-ups for any of A01–A04 across ten minutes; the residents only lit cards and traded signals (#58, #188, #777). (#58, #188, #777)
2. **The residents were not playing the objective the harness measures** The facts say no level was solved and all four residents finished at level 1, yet the log shows them cooperatively lighting tower cards and celebrating a completed tower (#719, #910) rather than pursuing a level or a seat competition. (#719, #910)
3. **Two of three strikes were spent inside the first minute on blind plays** A02 played slot 2 blind and misfired (#82), then A03 played slot 4 blind and misfired (#96), leaving the whole remaining run at one strike from ending. (#82, #96, #215)
4. **Signals were used to tell teammates things they already knew or could not act on** A03 spent a signal telling A02 about Moss 3 (#407) and A02 later signalled A04 about a card A04 could not yet play (#820); residents themselves noted signals were full and spending one 'costs nothing' (#954). (#407, #820, #954)
5. **A02 misread the signal convention after seven minutes of play** A02 only worked out in minute 7 that a 'not Amber, 1' signal meant not-rank-1, after it had already played Cobalt 7 as if it were a 1 (#1094, #1119, #1120). (#1094, #1119, #1120)
6. **The run stopped without a result while residents were still making progress** The referee ended the run at minute 9 (#1298) with playable cards known (A04's slot 2 play at #1289, A03's Cobalt 2 at #1280) and no final standings recorded in the facts. (#1280, #1289, #1298)

## Optimizations

- **Give residents an explicit level objective in their prompt** Nobody solved a level or submitted anything in ten minutes (#58, #188), and residents talked only about towers and strikes, so the next version should state the level goal and how a submission is made in the opening instructions. (#58, #188)
- **Start with a shared signal convention so a 'not 1' signal cannot be read as 'is 1'** A02 misread a negative signal and burned a strike at #1119–#1120, so the story should define comma-separated signals up front or provide an in-game reference. (#1094, #1119, #1120)
- **Give a safe opening move that does not require blind guessing** Both strikes fell in minute 0 on blind plays (#82, #96), which set the cautious tone for the rest of the run (#1157), so the harness should let the first turn include a discard or a known playable card. (#82, #96, #1157)
- **Make signals scarce enough that they are not spent to 'cost nothing'** Residents treated full signals as free and signalled without new information (#954, #407, #820), so the next version should price a signal or cap signals per resident. (#407, #820, #954)
- **Extend the run or cut it at a natural beat** The referee stopped at minute 9 mid-turn with A03 and A04 holding known playable cards (#1280, #1289, #1298), so the harness should end on a completed round or after a fixed number of turns. (#1280, #1289, #1298)

## Loophole candidates

1. **Residents stayed safe by signalling instead of playing, which the tower game rewarded** With strikes at 2 of 3, A01, A02 and A03 repeatedly chose signals over plays because a misfire would end the run (#1157, #1209, #1276), so the run reached minute 9 with many cards still lit and no risk taken. (#1157, #1209, #1276)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 25: event "card_discarded" (seq 25) does not match its schema
- line 26: event "card_drawn" (seq 26) does not match its schema
- line 38: event "card_played" (seq 38) does not match its schema
- line 39: event "card_drawn" (seq 39) does not match its schema
- line 46: event "signal_given" (seq 46) does not match its schema
- line 53: event "signal_given" (seq 53) does not match its schema
- line 70: event "card_played" (seq 70) does not match its schema
- line 71: event "card_drawn" (seq 71) does not match its schema
- line 89: event "card_played" (seq 89) does not match its schema
- line 90: event "card_drawn" (seq 90) does not match its schema
- line 105: event "card_discarded" (seq 105) does not match its schema
- line 106: event "card_drawn" (seq 106) does not match its schema
- line 119: event "signal_given" (seq 119) does not match its schema
- line 134: event "signal_given" (seq 134) does not match its schema
- line 149: event "card_played" (seq 149) does not match its schema
- line 150: event "card_drawn" (seq 150) does not match its schema
- and 135 more
