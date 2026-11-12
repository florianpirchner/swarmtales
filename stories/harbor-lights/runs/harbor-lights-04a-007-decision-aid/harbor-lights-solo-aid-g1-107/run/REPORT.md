# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 107 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #788 (694 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
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

- **A01 gives the first useful signal of the run, pointing A02 at a Cobalt 1** A01 reasoned through teammates' hands and signalled A02 about rank 1 to single out slot 3, then A02 played it and lit Cobalt at minute 1 (#137, #147, #152, #170). (#137, #147, #152, #170)
- **First strike of the run: A02 blind-plays slot 4 and misfires** After weighing odds, A02 played an unknown slot 4 that turned out to be Cobalt 6; it misfired and cost the crew its first strike (#221, #222). (#221, #222)
- **A03 discards a playable Amber 4 and calls it a mistake** A03 discarded slot 2 for a signal, discovered the card was Amber 4 which was playable at the time, and recorded it as a mistake, though the discard advanced Amber to 5 (#491, #492). (#491, #492)
- **Residents complete several towers as coordination improves** By minutes 3 and 4 the crew lit Amber through 7, Cobalt 3, Violet 3, Rose 3 and Moss 5, with A01, A03 and A04 each playing cards that had been signalled by teammates (#634, #650, #722, #745, #772). (#634, #650, #722, #745, #772)
- **Referee ends the run at minute 5 with A04 holding two playable cards** A04 reasoned that Rose 4 and Violet 6 were both playable and planned to play them next (#763), but the run ended at #788 before that turn, so the final state was left unresolved. (#763, #788)

## Problems

1. **Residents spent the opening on brain administration instead of game play** The first turn of each resident was consumed reading and writing the strategy brain, with A01, A03 and A04 all reasoning about readBrain/writeBrain before any tower check (#13, #19, #25, #80, #105). (#13, #19, #25, #80, #105)
2. **No submissions or level progress in the whole run** The computed facts show 0 submissions, no levels solved and no points, and no resident ever played a submission or transfer action in the log; the entire run was tower play and signalling (#788). (#170, #772, #788)
3. **A tool error consumed a turn at minute 4** A02 attempted playSlot when it was A04's turn and the city refused it with NOT_YOUR_TURN (#631), wasting an action during a short window of game time. (#631)
4. **Residents treated blind plays as near-forbidden and stalled on low-odds cards** Multiple residents repeatedly declined to play because odds were only 25-36% and a misfire would cost 3 points, e.g. A03 at #277 and #425 and A04 at #646, slowing the tower pace. (#277, #425, #646)
5. **The run was cut off mid-progress at minute 5** The game was still producing lights and signals when the referee ended it at #788, leaving A04 holding two playable cards that were never played (#763). (#763, #788)

## Optimizations

- **Open the brain window before the run, not during it** Residents spent their first turn on brain reads and writes (#13, #19, #25). Provide the brain file before minute 0 or keep writeBrain open only between runs so that minute 0-1 is used for tower work. (#13, #19, #25)
- **Lengthen the run or end on a completed round** The referee stopped the run at #788 while A04 still had playable Rose 4 and Violet 6 (#763). Allow more minutes or end after the current round so that the final board reflects the crew's efforts rather than an arbitrary cut. (#763, #788)
- **Give residents a clearer pace signal against cautious play** Residents repeatedly skipped playable-ish cards because of the 3-point misfire cost (#277, #425, #646). Surface the remaining lighting pace or a per-turn nudge so that crews do not spend most turns reasoning and discarding while playable cards sit idle. (#277, #425, #646)
- **Reduce refusal loss from wrong-turn attempts** A02 lost a turn to NOT_YOUR_TURN at #631. Have the harness return a short retry rather than consuming the action, or display the active resident more prominently in the status line. (#631)
- **Introduce a minimum number of required signals** Residents generated very different signal volumes; some spent several turns reasoning but signalled rarely (e.g. A04 #646, A03 #733). Reward or require signal play early so that hints and hidden-card coordination actually drive the run. (#646, #733)

## Loophole candidates

1. **Residents avoid risky plays by talking themselves out of them** (residents) Residents repeatedly used probability calculations (e.g. 18%, 25%, 31%) to justify not playing unknown cards (#163, #277, #646). This is permitted within the rules, but effectively lets residents avoid the core tower-building risk and stall the clock. (#163, #277, #646)
2. **Discarding known-bad cards to farm signals** (residents) A04 discarded Violet 7 because Violet 5 was already lost and the card could never be lit (#563), and later discarded Violet 4 the same way (#608), regaining a signal with no cost. Discarding dead cards as a free signal source is not penalised and lets a resident convert unplayable cards into hints. (#563, #608)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 41: event "brain_written" (seq 41) does not match its schema
- line 42: event "retro_closed" (seq 42) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 62: event "brain_written" (seq 62) does not match its schema
- line 63: event "retro_closed" (seq 63) does not match its schema
- line 128: event "cards_dealt" (seq 128) does not match its schema
- line 129: event "game_started" (seq 129) does not match its schema
- line 130: event "deal_revealed" (seq 130) does not match its schema
- line 140: event "signal_given" (seq 140) does not match its schema
- line 155: event "card_played" (seq 155) does not match its schema
- line 156: event "card_drawn" (seq 156) does not match its schema
- line 166: event "signal_given" (seq 166) does not match its schema
- line 179: event "signal_given" (seq 179) does not match its schema
- and 74 more
