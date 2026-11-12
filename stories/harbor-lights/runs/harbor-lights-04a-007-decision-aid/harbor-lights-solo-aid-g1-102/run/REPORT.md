# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #748 (655 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.051 USD for this run (competitors 0.051, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 5 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents wrote their first strategy brain before the game and then waited for an opening that never came in minute 0.** A01, A02, A03 and A04 each saved a version-1 brain (#92, #96, #100, #104) and then reported there was nothing to play because the game had not started; no submission followed in minutes 0-5 (#748). (#92, #96, #100, #104)
- **A01 and A02 declined to play into unknown hands and only signalled, so early minutes had no lights.** A01 gave up its turn with four unknown cards and no sure play (#243), while A02 also passed without a submission (#431). This held the game at a standstill through the early minutes. (#243, #431)
- **A04 spent all of its signals rather than playing cards, and was refused repeatedly on turn order.** A04 signalled A02 about Moss 2 (#206), A03 about Moss 3 (#267), A02 about Moss 4 (#355), and used its last signal on A02 slot 3 (#406), but its giveSignal at #461 was refused NOT_YOUR_TURN. A04 again tried to play slot 1 and slot 2 at #632 and #685 but never got a verified submission. (#206, #267, #355, #406, #461, #632)
- **A03 played a card from slot 1 as Cobalt 2 and lit it, one of the few recorded plays.** A03 chose slot 1 on the signal from A04 (#263) and reported the lit count rising to 5 of 35 after the play (#263), then continued signalling and discarding rather than playing. (#263)
- **A02 discarded a playable card (Amber 5) and admitted the mistake.** A02 discarded Amber 5 instead of playing it, noting the 50% chance and calling it a misjudgment for the retro (#670), which fits the counterfactual note that the game was lost at that point. (#670)
- **Turn-order refusals piled up in the last minutes and the run ended at minute 5 with no scores.** Five NOT_YOUR_TURN errors were recorded for A04 (#461), A03 (#573, #695), A02 (#610) and A03 (#733), and the referee ended the run at #748 with no submissions and no standings. (#461, #573, #610, #695, #733, #748)

## Problems

1. **No submissions at all in six quiet minutes.** The run ended with 0 correct and 0 wrong submissions and 6 of 6 minutes quiet (#748); the digest counts no beats. Residents mainly reasoned about whether to act and passed the turn. (#243, #431, #748)
2. **Residents were unsure whose turn it was and were refused five times.** A01 at #242 said 'it still seems to be my turn' and ended without acting; A03 at #595, A01 at #445, A02 at #607 and A04 at #458 all guessed wrong or right about the turn, and NOT_YOUR_TURN was returned five times (#461, #573, #610, #695, #733). (#242, #445, #458, #461, #573, #595, #607, #610, #695, #733)
3. **The tools the residents were told about (writeBrain) disappeared, and they spent the opening on an answer that was not part of the game.** All four residents read the brain and tried to write it at minute 0 (#13, #19, #25, #31) and then noted writeBrain was gone (#73, #79, #85); the whole first minute was spent on that instead of the game. (#13, #19, #25, #31, #73, #79, #85)
4. **MAP and combat: the game never showed them a board, lot or state, and no level was ever solved.** The facts say no levels solved and nobody stuck, yet the residents talked about 'towers', 'slots', and 'lit count' (#263) and nothing lists a board, so the game state as visible to the agents does not match the code's record of 0 submissions. (#263, #748)
5. **Turn order in a game with signals caused repeated refusals, wasting turn after turn.** A02 gave a signal that was refused (#610), A03 a discard (#573) and a play (#695), A03 a signal (#733) and A04 a signal (#461); each refusal cost the resident a turn, and no submission replaced the lost action. (#461, #573, #610, #695, #733)

## Optimizations

- **Make the current turn visible to the agents in their prompt, not discovered by trial.** Five refusals in a single run (#461, #573, #610, #695, #733) show residents were guessing who acts; send the live turn-holder with each turn prompt so residents can simply wait when it isn't theirs. (#461, #573, #610, #695, #733)
- **Remove the brain-write task from the tool list before the actual game starts.** All four residents spent minute 0 on readBrain/writeBrain (#13, #19, #25, #31) and later observed writeBrain vanish (#73, #79, #85); start the agents with the final tool list only. (#13, #19, #25, #31, #73, #79, #85)
- **Give residents a simple early-game action to take, e.g., a forced play for a known-safe low card.** Residents with fresh hands and no sure play simply pass (#243, #431) and the level never advances; adding a low-confidence fallback or a 'natural' first move would produce the first submissions and let the other mechanics matter. (#243, #431)
- **Do not spend a full turn on a signal that has no follow-up, or rebalance signal cost.** A04 signalled four times and played nothing (#206, #267, #355, #406), and 0 transfers with 0 points came of it; an explicit signal-then-play sequence or a signal that also counts as an action would let A04 contribute. (#206, #267, #355, #406)

## Loophole candidates

1. **Residents used the safe 'pass' path to avoid any risk and never submit.** (residents) A01 (#243) and A02 (#431) passed because no card was certain, and passing is a turn without a submission, so the run could sit at zero submissions indefinitely; the harness gives no penalty for a pass. (#243, #431)
2. **The brain-writing task was a path that avoided the game at the start.** (residents) All four agents opened by reading and writing the brain rather than acting on the board (#13, #19, #25, #31), which delayed the game and produced no board play. (#13, #19, #25, #31)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 126: event "cards_dealt" (seq 126) does not match its schema
- line 127: event "game_started" (seq 127) does not match its schema
- line 128: event "deal_revealed" (seq 128) does not match its schema
- line 138: event "signal_given" (seq 138) does not match its schema
- line 147: event "signal_given" (seq 147) does not match its schema
- line 154: event "card_played" (seq 154) does not match its schema
- line 155: event "card_drawn" (seq 155) does not match its schema
- line 162: event "signal_given" (seq 162) does not match its schema
- and 73 more
