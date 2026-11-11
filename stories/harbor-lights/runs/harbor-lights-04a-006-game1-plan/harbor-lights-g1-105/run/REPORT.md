# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 105 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #2 to #826 (738 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.054 USD for this run (competitors 0.054, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
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

- **A01 wrote the strategy brain and the crew agreed on signal conventions before the first game.** A01 wrote strategy brain v1 (117 words) and told the team, #116. The conventions were that a suit signal means "play now" and a rank signal is information only, as stated by A04 #77 and A03 #100. (#67, #77, #100, #116)
- **The crew lost all three strikes on Moss plays and the Moss tower stayed blocked for a long stretch.** A01 misfired Moss 2 on a suit signal from A03, #255-#256. A01 then misfired Moss 3 after A02's Moss signal, which A02 said was meant as information only, #323-#324. That was the second and third strike, leaving strikes at 2 according to A02 #323, and A01 said it had lost strikes two and three, #316. (#255, #256, #316, #323, #324)
- **The crew recovered and lit many towers, ending the run at 18 cards lit.** Amber 3 (#545), Rose 1 (#584), Amber 6 completing Amber (#605), Moss 1 (#628), Moss 4 (#640), Moss 5 (#653), Cobalt 2 (#702), Violet 4 (#672), Violet 5 (#706), Rose 2 (#718), Violet 6 (#758), Cobalt 3 (#808) and Rose 4 (#817) all lit. A04 reported the crew at 18 cards lit after Cobalt 3, #808. (#545, #584, #605, #628, #640, #672, #702, #706, #718, #758, #808, #817)
- **Discarding to refill signals was the crew's main way to keep pointing out playable cards.** A02 discarded Amber 4 (#407), Cobalt 5 (#445), Moss 7 (#563) and more to regain signals, and A03 discarded Rose 5 (#286), Cobalt 6 (#523), Moss 6 (#569), Cobalt 7 (#743) and Cobalt 4 (#785). A01 also discarded Rose 3 (#497) and Rose 7 (#660) to get a signal back. (#286, #407, #445, #497, #523, #563, #569, #660, #743, #785)
- **Residents repeatedly declined to play unknown cards because a misfire cost 3 points.** A02 said a blind play was too risky with strikes at 2, #436. A03 said playing an unknown card would most likely misfire at a cost of 3 points, #569. A04 weighed a coin flip on slot 1 and worried about a third strike, #664. (#436, #569, #664)

## Problems

1. **The run ended with no level solved and no submission in any of the 7 minutes.** The facts show 0 correct and 0 wrong submissions, and the run ended at minute 6 by referee, #826. The crew lit cards but never solved a level within the time. (#826)
2. **One resident acted out of turn and was refused.** A01 tried discardSlot at minute 2 and got NOT_YOUR_TURN because it was A02's turn, #319. A01 later acknowledged its turn had already ended, #342. (#319, #342)
3. **The signal convention was ambiguous and caused misfires.** A03's "Moss" signal touched only A01's slot 1, and A01 assumed it meant play-now and lost Moss 2, #245-#256. A02 said its Moss signal was information only but the crew read suit signals as play now, #324. A01 noted the Moss signal did not tell it the rank, #256. (#245, #256, #324)
4. **Discarding destroyed cards the towers still needed.** A02 discarded Amber 4, a card Amber still needed, so Amber 6 and 7 could no longer be lit, #407. A03 discarded Cobalt 4 while Cobalt was at 2, #785, and Cobalt 4 was then reported lost and the Cobalt tower blocked after Cobalt 3, #808. (#407, #785, #808)
5. **Residents spent many turns reasoning about hidden information instead of acting.** Several residents reasoned at length about unseen cards and odds before passing, for example #435-#436 and #763-#764. Many turns ended with a discard or no action because nothing was confirmed playable. (#435, #436, #763, #764)

## Optimizations

- **Make suit signals unambiguous as play-now or information-only in the rules.** The ambiguous Moss signal cost two strikes, #245-#256 and #324. The next version should either fix one meaning per signal type in the rules or require the signaler to state intent, so residents do not guess. (#245, #256, #324)
- **Warn before discarding a card that a tower still needs.** A02 discarded Amber 4 and permanently blocked Amber 6 and 7, #407. A confirmation or warning in the harness would prevent a discard that makes a tower unreachable. (#407, #808)
- **Give more time or fewer towers so a level can be solved within the run.** The run hit the referee at minute 6 with 18 cards lit and no level solved, #808 and #826. Either extend the clock or shorten the level so a solve is reachable. (#808, #826)
- **Clarify whose turn it is in the action prompt.** A01 attempted a discard out of turn and was refused with NOT_YOUR_TURN, #319, then said its turn had already ended, #342. Including the active resident in every prompt would avoid wasted actions. (#319, #342)
- **Reduce the penalty or the need for blind plays so residents act instead of discarding.** Residents repeatedly chose discards over blind plays because a misfire cost 3 points, #436 and #569. Lowering the misfire cost or revealing more of the hand would keep the crew moving. (#436, #569)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 48: event "team_post" (seq 48) does not match its schema
- line 56: event "team_post" (seq 56) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 94: event "team_post" (seq 94) does not match its schema
- line 107: event "team_post" (seq 107) does not match its schema
- line 133: event "cards_dealt" (seq 133) does not match its schema
- line 134: event "game_started" (seq 134) does not match its schema
- line 135: event "deal_revealed" (seq 135) does not match its schema
- line 146: event "signal_given" (seq 146) does not match its schema
- line 159: event "signal_given" (seq 159) does not match its schema
- line 166: event "card_played" (seq 166) does not match its schema
- line 167: event "card_drawn" (seq 167) does not match its schema
- line 174: event "signal_given" (seq 174) does not match its schema
- line 186: event "card_played" (seq 186) does not match its schema
- line 187: event "card_drawn" (seq 187) does not match its schema
- line 210: event "signal_given" (seq 210) does not match its schema
- line 222: event "signal_given" (seq 222) does not match its schema
- and 68 more
