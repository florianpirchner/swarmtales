# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 112 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #673 (598 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.052 USD for this run (competitors 0.052, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
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

- **A fast opening: four towers lit in the first minute.** A04 opened by playing Amber 1 (#55), A02 followed with Rose 1 (#85), A04 added Cobalt 1 (#116) and A02 played Moss 1 (#200). The opening worked because A01 signalled rank 1 to A04 (#42) and A04 knew its two 1s from its own reasoning (#46). (#55, #85, #116, #200)
- **A01's blind play misfired and started the strike count.** With 19 possible cards and only about 21% playable, A01 played slot 1 and hit Violet 7 (#108, #123). That is the first of three misfires by A01 and A02 that cost 6 points in total. (#108, #123)
- **A02's 1-in-3 play was the second misfire.** A02 played a slot it judged two-in-three likely to light, but the card was Violet 5 and the crew went to three strikes and 6 points lost (#129, #473). A01's Violet 3 misfire had already made it two strikes (#453). (#129, #453, #473)
- **The crew recovered and lit every tower except Moss.** After three strikes the residents turned to certain plays: A04 lit Rose 3 (#502), A01 lit Violet 1 (#516), A02 lit Violet 2 (#542), A03 lit Rose 6 (#589), A02 lit Cobalt 7 (#593) and A04 lit Violet 6 (#659). The run ended at minute 5 with 21 of 35 cards lit and only Moss 3 still waiting in A03's hand (#659). (#502, #516, #542, #589, #593, #659)
- **Signals were the crew's only information, and the budget bound from minute 1.** Signals started at 6 and were spent fast: A01 hit zero by minute 1 and could only discard (#233, #244). Several turns were discards made to win a signal back (#271, #305, #360), so the crew's tempo depended on the six-token budget. (#233, #244, #271, #305, #360)

## Problems

1. **No resident ever sent a message; the social layer was silent.** The facts show 0 DMs, 0 board posts and 0 group posts for the whole run. The residents only used the game signal mechanic (#42, #160, #384), so the story's social-competition premise never happened. (#13, #42, #160, #384)
2. **The run ended with nobody solving a level and no submissions.** The facts record 0 correct and 0 wrong submissions and no level-ups for A01 to A04; the referee ended the run at minute 5 (#673). The residents were still mid-game with Moss 3 unplayed when time ran out (#665). (#665, #673)
3. **Residents discarded known-useful cards to buy signals.** A01 discarded Amber 3 (#244) and Amber 7 (#355), and A02 discarded Moss 5 (#331), all to regain a signal. The token mechanic pushed them to throw away cards that the towers later needed, which is a cost the story probably did not intend. (#244, #331, #355)
4. **Residents gambled on partial information and took penalties.** A01's own reasoning put the odds at 21% before the Violet 7 misfire (#108, #123), and A01 later played a 50/50 Amber 4 or Violet 4 that did light (#397, #407). The same coin-flip logic produced the Violet 3 misfire (#441, #453). (#108, #123, #397, #407, #441, #453)
5. **A03 was left with the last card and no way to be signalled.** By minute 4 A03 was reasoning that no other seat could signal it because the others held no cards (#650, #665). The final Moss 3 in A03's hand therefore depended on a coin flip, and A03 held rather than risk a 4-point misfire (#538, #635). (#538, #635, #650, #665)

## Optimizations

- **Add a reason for residents to talk, or drop the social framing.** Because 0 messages were sent (#42, #160), the story should give residents a payoff for posting or DMing, for example coalition-forming or trade, or the designers should accept a pure cooperative mode. (#13, #42, #160)
- **Give the residents more time or a faster turn loop.** The run ended at minute 5 with 21 cards lit and the game unfinished (#659, #673). Either extend the referee's clock or compress the per-turn reasoning so a full tower set can be lit. (#659, #673)
- **Reduce the penalty for a misfire or make discards cheaper.** The signal budget drove discards of Amber 3, Amber 7 and Moss 5 (#244, #331, #355), and three misfires cost 6 points (#123, #453, #473). A smaller strike penalty or a signal that regenerates without discarding would keep playable cards in hand. (#123, #244, #331, #355, #453, #473)
- **Guarantee that every resident can be signalled near the end.** A03 concluded that no one could signal its last cards because the other seats were empty (#650, #665). A rule letting a cardless resident still point at a teammate's card would prevent the dead-end finish. (#650, #665)
- **Record a story file so the run report can judge intent.** The run has no story definition (000-run.json has no story), so this report cannot check whether the observed cooperative play matches the designers' intended competition. (#673)

## Loophole candidates

1. **Residents used discard as a free signal-refill rather than a last resort.** (residents) A01 and A02 repeatedly discarded to regain signals (#244, #305, #360, #556), turning the discard rule into a cheaper path than playing on partial information. This bypasses the intended scarcity of signals. (#244, #305, #360, #556)
2. **A01 played its own belief from a signal it had already used.** (residents) A01 played Amber 4 from a signal (#397, #407) after reasoning it was a 50/50, which is the intended use, but its earlier Violet 3 misfire came from the same coin-flip reasoning against the city's design of certain clues (#441, #453). Gambling on signalled cards skirts the information the signals are meant to provide. (#397, #407, #441, #453)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 25: event "signal_given" (seq 25) does not match its schema
- line 38: event "signal_given" (seq 38) does not match its schema
- line 49: event "card_played" (seq 49) does not match its schema
- line 50: event "card_drawn" (seq 50) does not match its schema
- line 63: event "card_discarded" (seq 63) does not match its schema
- line 64: event "card_drawn" (seq 64) does not match its schema
- line 72: event "card_played" (seq 72) does not match its schema
- line 73: event "card_drawn" (seq 73) does not match its schema
- line 80: event "signal_given" (seq 80) does not match its schema
- line 100: event "card_played" (seq 100) does not match its schema
- line 101: event "card_drawn" (seq 101) does not match its schema
- line 111: event "card_played" (seq 111) does not match its schema
- line 112: event "card_drawn" (seq 112) does not match its schema
- line 132: event "card_played" (seq 132) does not match its schema
- line 133: event "card_drawn" (seq 133) does not match its schema
- line 147: event "signal_given" (seq 147) does not match its schema
- and 55 more
