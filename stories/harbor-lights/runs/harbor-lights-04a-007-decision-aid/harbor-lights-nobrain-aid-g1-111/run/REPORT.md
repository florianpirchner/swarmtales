# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 111 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #641 (564 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.048 USD for this run (competitors 0.048, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
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

- **A04 opens play by lighting Amber 1 from its newest slot** A04 reasoned slot 4 must be a rank-1 card and played it for the first light of the run (#51, #73). That made the opening move that A01 and A02 had signalled around (#25, #39). (#51, #73)
- **A02 takes a misfire on a signalled card and the crew gets a strike** A02 played slot 3 believing it was a 2 among playable suits but it was Moss 2 and misfired, giving the crew its first strike (#106, #107). A02 then spent turns discarding to recover signals (#154). (#106, #107, #154)
- **Signals keep the crew moving but residents stay blind on their own hands** A01, A02, A03 and A04 repeatedly signalled each other about playable cards (#111, #189, #254, #307, #343) while each kept saying its own hand was unknown and holding rather than guessing (#150, #307, #343). This produced long stretches of signal-only turns. (#111, #189, #307, #343)
- **Residents discard playable cards they cannot see** A02 discarded Violet 3 (#331, #332) and later Rose 4 (#410, #411) and Moss 5 (#486, #487), each a card that was playable at the time; A04 discarded Cobalt 4 (#443, #466). Each discard was acknowledged in the log as a costly loss, trading a card for a signal. (#331, #332, #410, #411, #466, #486, #487)
- **A04 tries to signal out of turn and is refused** A04 attempted giveSignal while it was A01's turn and the city recorded NOT_YOUR_TURN (#446), after which A04 held and ended its turn (#465, #466). That is the only tool error in the run. (#446, #465, #466)
- **Late chain of lit cards before the referee ends at minute 4** A01 lit Amber 4 (#507) and then Rose 5 (#554); A03 lit Violet 7 (#482), Cobalt 5 (#548) and Amber 5 (#601); A04 lit Moss 6 (#597); A01 lit Cobalt 7 (#608). The run ended by referee at minute 4 with no submission and no level solved. (#482, #507, #548, #597, #608, #641)

## Problems

1. **No levels solved and zero submissions in the whole run** The computed facts show 0 correct and 0 wrong submissions, no level-ups and the run ended by referee at minute 4 (#641). The residents played cards continuously but never reached a win condition within the short window. (#641)
2. **Every minute was quiet with no submission** Quiet minutes are 5 of 5, longest without a submission minutes 0-4, and the only stall listed is 'no submission in minutes 0-4'. The whole run is one continuous stall against the scoring metric. (#641)
3. **The hidden-hand rule pushed residents to discard rather than play** A03 held on most turns because a blind play was a small chance and a misfire would cost strike points (#150, #189, #307, #343, #372). A01 likewise discarded for signals rather than gamble (#259, #336). This made discarding the dominant safe move, and several discards threw away playable cards (#332, #411, #487). (#150, #189, #259, #332, #372, #411, #487)
4. **Residents misunderstood whose turn it was** A04 tried to signal during A01's turn and got NOT_YOUR_TURN (#446), then said it would wait and hold the signal (#465, #466). The turn order was not clear enough to A04 before acting. (#446, #465, #466)
5. **No messages, transfers or board activity at all** The facts record 0 DMs, 0 board posts, 0 group posts and 0 transfers. All coordination happened in signals and private reasoning, so the social game that the story intends never showed up. (#25, #111, #254)

## Optimizations

- **Give a longer or larger-scope level so play can finish** The referee ended the run at minute 4 with no levels solved and no submissions (#641). A shorter deck or a per-level target that fits the time budget would let the crew actually complete something before the referee stops it. (#641)
- **Make clear when a resident may signal so NOT_YOUR_TURN stops** A04 attempted a signal out of turn and was refused (#446), then held the rest of the turn (#465). Clearer turn prompts or a visible turn indicator would prevent this wasted attempt. (#446, #465)
- **Rebalance misfire cost so blind plays are not always wrong** Residents repeatedly chose a discard over a blind play because a misfire cost a card plus 3 points (#150, #307, #343). Lowering the misfire penalty or raising the reward for a light would push residents to actually play their unknown hands. (#150, #307, #343)
- **Reduce the discard-for-signal incentive** A02 discarded Violet 3, Rose 4 and Moss 5, all playable, to regain signals (#332, #411, #487), and A04 discarded Cobalt 4 (#466). If discards did not refill signals so cheaply, residents would not throw away playable cards. (#332, #411, #466, #487)
- **Add a path for social coordination the story intends** The run had 0 DMs, 0 board posts and 0 group posts, while all hinting happened in signals (#25, #189, #254). Prompts or mechanics that reward a board post or DM would activate the social layer instead of leaving everything in signals. (#25, #189, #254)

## Loophole candidates

1. **Discarding became a safe way to pass without losing points** (residents) Residents used discards as a low-risk pass that also returned a signal, even discarding playable cards (#332, #411, #487). This avoided the risk of a blind play while still advancing their information, working around the intent that they commit to plays. (#332, #411, #487)
2. **Signalling playable cards to teammates instead of playing their own** (residents) Residents repeatedly signalled others about playable slots (#111, #189, #254) while claiming their own hand was unknown (#150, #343). That let them avoid the risk of playing their own hidden cards while appearing active. (#111, #150, #189, #254, #343)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 32: event "signal_given" (seq 32) does not match its schema
- line 46: event "signal_given" (seq 46) does not match its schema
- line 54: event "card_played" (seq 54) does not match its schema
- line 55: event "card_drawn" (seq 55) does not match its schema
- line 67: event "card_played" (seq 67) does not match its schema
- line 68: event "card_drawn" (seq 68) does not match its schema
- line 84: event "card_played" (seq 84) does not match its schema
- line 85: event "card_drawn" (seq 85) does not match its schema
- line 92: event "signal_given" (seq 92) does not match its schema
- line 101: event "card_played" (seq 101) does not match its schema
- line 102: event "card_drawn" (seq 102) does not match its schema
- line 119: event "signal_given" (seq 119) does not match its schema
- line 126: event "card_discarded" (seq 126) does not match its schema
- line 127: event "card_drawn" (seq 127) does not match its schema
- line 134: event "signal_given" (seq 134) does not match its schema
- line 140: event "card_played" (seq 140) does not match its schema
- and 57 more
