# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 45 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #870 (716 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.019 USD for this run (competitors 0.019, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0018 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents solved the ultimatum game by accepting every offer** In game 1 the residents played an ultimatum game and every offer was accepted, so the game ended with A04 and A03 taking turns as proposer and everyone at 29 or 33 points. A03 finished top with 33, as noted at #408. (#164, #172, #177, #215, #408)
- **Residents learned from game 1 that responders accept small offers** After game 1, A03 and A01 both reasoned that lower offers would still be accepted, and A02 concluded it had proposed too generously, since every 3 and 4 offer went through. (#375, #383, #400)
- **A03 opened game 2 by contributing and was punished for cooperating** In the round-1 public goods game A03 contributed 5 while the others gave 0, so A03 was the only one hurt, and A03's own reasoning confirms the cost at #452 and #633. (#452, #459, #466, #473, #633)
- **Public goods game collapsed into full defection** From round 2 on every resident contributed 0, reasoning that keeping tokens dominates because each contributed token costs 0.6 net. A03 was left alone at 67 while A01, A02 and A04 tied at 72. (#459, #466, #473, #625, #664, #668)
- **Chicken game ended in universal B for every round** In the third game the residents worked out that B pays 5 against A and 1 against B, and B pays more against any partner, so everyone chose B every round while A03 only considered A and dropped it as dominated at #827. (#698, #705, #712, #739, #755, #827)
- **Nobody ever submitted a solution to a level** The facts record zero correct and zero wrong solutions, no transfers and no messages, and the run ended at minute 9 by the referee. Only A01's brain write was refused for length (#644). (#644, #870)

## Problems

1. **The learning loop ran out of time before any level was solved** The residents spent minutes 0-3 on the ultimatum game and minutes 4-6 on the public goods game, then reached the chicken game at minute 7, and the referee ended the run at minute 9 with no level completed. (#164, #452, #698, #870)
2. **Residents all played the same zero-contribution strategy, which erased the trade-off** The residents each independently found that defecting dominates in the public goods game, and from round 2 on every contribution was 0, so no resident had any reason to experiment. This left the game decided from the start except for A03's single cooperation in round 1. (#459, #466, #473)
3. **The chicken game became a trivial defection game** Because B pays 5 against A and 1 against B, B was strictly dominant, and the residents worked out that it was a defection game rather than the intended tension. A03 computed that A never scores better and abandoned it at #827. (#739, #797, #814, #827, #855)
4. **One brain write was rejected for being too long** A01's brain write in minute 5 was refused with BRAIN_TOO_LONG at 185 words against the limit of 150 (#644), so A01 finished with a different brain than it intended for the next game. (#644)
5. **No communication ever happened** The facts record 0 DMs, 0 board posts and 0 group posts, and no resident reasoning mentions any attempt at a message, so the social layer of the story was never exercised. (#870)

## Optimizations

- **Give each game a longer window or more rounds so residents can build and use a learning loop** The run ended at minute 9 with three games played in roughly three minutes each and no level solved, as shown by the referee ending at #870. A fixed budget of rounds per game with a level target per game would force residents to turn observations into a solution. (#164, #452, #698, #870)
- **Make the public goods game less dominant-defect** All four residents identified zero contribution as dominant and stuck to it from round 2 (#459, #466, #473). A lower multiplier horizon, a punishment mechanism, or a threshold bonus would punish free-riding less and create a real choice, as A03's opening 5 was immediately exploited (#452). (#452, #459, #466, #473)
- **Fix the chicken-game payoff matrix so B is not strictly dominant** Every resident chose B every round and the game collapsed (#739, #797, #814, #827). Raising the mutual-A payoff or lowering the B-against-A payoff would make the partners' choices matter and give the cooperative signal a real value. (#698, #755, #797, #827, #855)
- **Warn or auto-trim the brain before the write window closes** A01's brain write was refused at 185 words against a 150-word limit (#644), which cost A01 its strategy for the next game. A pre-write length check or a rejection message that reports the word count would let residents adapt instead of losing the write. (#644)
- **Prompt residents to use the message board in the retro window** No messages were ever sent (0 DMs, 0 posts, per the facts), and the residents' reasoning never mentions the board. A nudge in the retro prompt, or a game whose payoffs depend on shared commitments, would make the social layer part of the story. (#870)

## Loophole candidates

1. **Responders accept any positive offer, so proposers can safely underbid** A02 accepted 3 over refusing, reasoning that a sure three beats zero (#277), and A03 then decided to test offering 1 (#383). The ultimatum game thus rewards the minimum positive offer and turns a fairness game into a race to the bottom. (#277, #375, #383)
2. **The public goods game rewarded uniform free-riding** All four residents reasoned that keeping every token dominates, so they all contributed 0 every round after round 1 and were never penalized (#459, #466, #473). The game became a guaranteed equal payout rather than a cooperation dilemma. (#459, #466, #473)
3. **The chicken game paid out equally for everyone choosing B** Choosing B was strictly dominant, so every resident picked B every round and scored the same mutual payoff (#755, #797, #814, #855). Nobody had any incentive to try A, so the game produced no interesting differentiation. (#739, #797, #814, #855)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 60: event "brain_written" (seq 60) does not match its schema
- line 61: event "retro_closed" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 112: event "block_started" (seq 112) does not match its schema
- line 113: event "round_opened" (seq 113) does not match its schema
- line 129: event "decision_made" (seq 129) does not match its schema
- line 145: event "decision_made" (seq 145) does not match its schema
- line 151: event "decision_made" (seq 151) does not match its schema
- line 158: event "decision_made" (seq 158) does not match its schema
- line 159: event "round_resolved" (seq 159) does not match its schema
- line 160: event "round_opened" (seq 160) does not match its schema
- and 134 more
