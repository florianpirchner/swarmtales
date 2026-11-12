# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #872 (718 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.020 USD for this run (competitors 0.020, gamemaker 0.000, classifier 0.000) |
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

- **Ultimatum rounds drew real offers and acceptances despite no story briefing.** In the ultimatum game residents made explicit offers (A01 chose a 4 keeping 6 at #134, A02 chose 5 at #143, A04 offered 2 at #189 and again at #224) and responders accepted low offers for pure payoff (A03 considering 2-vs-0 at #208, A01 accepting a 2 at #271, A02 accepting at #284). This is the only phase with visible strategic differentiation. (#134, #143, #189, #208, #271, #284)
- **A04 learned from the ultimatum payoffs and planned to test a minimal offer.** After game 1 A04 read the standings (A03 35, A04 32, A01 27, A02 26) and noted that 2 was always accepted, planning to test an offer of 1 (#407). A02 reached the same conclusion that its 5-offers were too generous and it should offer 1-2 (#377). (#377, #407)
- **The public-goods game collapsed to universal zero contribution and stayed there.** All four residents reasoned that a 1.6 multiplier means each token returns 0.4 to the contributor, so 0 is individually dominant (#427, #442, #449), everyone contributed 0 in round 1 (#483) and nobody deviated through the end (#490, #497, #504, #560). Game 2 finished 70 points each with zero contributions (#660, #668, #676, #713). (#427, #442, #483, #490, #560, #660)
- **The coordination game showed a real split between cooperative A-players and a dominant-strategy B-player.** A02, A03 and A01 picked A as the cooperative opener (#734, #741), while A04 derived that B dominates in both cases and picked B (#748), staying with B as a one-shot dominant move (#829). A03 then worked out that B dominates here too (#806, #822), showing the payoffs pulled residents toward defection mid-game. (#734, #741, #748, #806, #822, #829)
- **One brain update was rejected for length.** A04's writeBrain was REFUSED with BRAIN_TOO_LONG (197 words against a 150 limit) at #679, after it had planned to test minimal offers in its brain. (#679)

## Problems

1. **The run had no submissions and no level-ups, so the story produced no progress at all.** Facts show 0 correct and 0 wrong submissions, no levels solved and all four residents still at level 1; the residents spent the run on sealed rounds and waits (#151, #231, #307, #332) rather than on solving any puzzle. (#151, #231, #307, #332)
2. **Long idle stretches where the only open tools were viewTable and readBrain.** Residents repeatedly noted that respond/contribute was locked and ended their turn (#171, #231, #307, #456), producing quiet minutes throughout. Ten of ten minutes had no submission (stall list, evidenced by #171 and #456). (#171, #231, #307, #456)
3. **The public-goods design pushed everyone to the individually rational zero.** The 1.6 multiplier over 4 players makes contributing a net loss (#427, #435), and once round 1 returned all zeros (#483) no resident had any reason to move (#490, #497, #504). That ends the game's social tension almost immediately. (#427, #435, #483, #490, #497, #504)
4. **Brains were written outside the intended retro window or not at all.** Residents say the brain is only writable in the retro window (#611) and A04's attempt there was rejected for length (#679), so the skill-learning loop produced little beyond saved version 3s (#691, #695, #706, #713). (#611, #679, #691, #713)
5. **No resident messages, DMs or board posts were used to coordinate.** Facts show 0 DMs and 0 board posts, and residents only talked to themselves (#97, #172, #332), so coordination in the coordination game came from assumptions rather than communication (#741, #748). (#97, #172, #332, #741, #748)

## Optimizations

- **Give residents something to solve, not just sealed ultimatum rounds.** Add at least one actual level/puzzle phase per run so submissions can occur; the run had 0 submissions and no level-ups, with residents idling on locked tools (#151, #231). (#151, #231)
- **Rebalance the public-goods multiplier above 1.0 per contributor.** A 1.6 multiplier over 4 players gives only 0.4 back per token (#427, #449), which guarantees universal defection within one round (#483). A multiplier above 4 would make cooperation individually attractive and keep the game live. (#427, #449, #483)
- **Turn on communication for the coordination game.** Residents guessed at partners' moves instead of coordinating (#741, #748) and sent no messages (0 DMs, 0 posts). Allowing cheap talk before the A/B choice would create the alliances and lies the story wants. (#741, #748)
- **Relax or warn on the brain word limit before the retro window closes.** A04 lost its retro-window write to BRAIN_TOO_LONG at 197 words (#679). A pre-check or a size hint in the tool result would preserve the learning loop that A04 planned at #407. (#407, #679)
- **Shorten or fill waits between sealed rounds.** Many turns were spent simply waiting for an offer (#171, #231, #332). Either auto-advance sealed rounds or give waiting residents a useful side action so turns are not empty. (#171, #231, #332)

## Loophole candidates

1. **Responders accepted minimal offers in the ultimatum game, letting proposers keep nearly everything.** (residents) Because responders treated any positive payoff as better than zero (#208, #271, #284), proposers could push offers down to 1-2 (#377, #407) against the spirit of a fair-split ultimatum. (#208, #271, #284, #377, #407)
2. **Public-goods free-riding was the dominant safe path.** (residents) Every resident contributed 0 every round and kept 10 per round (#483, #560, #660), turning the cooperation game into a guaranteed no-loss equilibium. (#483, #560, #660)
3. **Playing B in the coordination game paid more than cooperating in every case.** (residents) A04 and later A03 chose B because it dominates A regardless of the partner (#748, #806, #829), which undermines the cooperative A outcome the payoff matrix rewards jointly. (#748, #806, #829)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 51: event "brain_written" (seq 51) does not match its schema
- line 52: event "retro_closed" (seq 52) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 111: event "block_started" (seq 111) does not match its schema
- line 112: event "round_opened" (seq 112) does not match its schema
- line 137: event "decision_made" (seq 137) does not match its schema
- line 146: event "decision_made" (seq 146) does not match its schema
- line 159: event "decision_made" (seq 159) does not match its schema
- line 165: event "decision_made" (seq 165) does not match its schema
- line 166: event "round_resolved" (seq 166) does not match its schema
- line 167: event "round_opened" (seq 167) does not match its schema
- and 134 more
