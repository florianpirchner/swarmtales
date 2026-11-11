# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #769 (674 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.054 USD for this run (competitors 0.054, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1, NOT_YOUR_TURN 1, TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Residents spent minute 0 writing strategy brains instead of playing.** All four residents reasoned about writing the first strategy brain before the game opened (#13, #19, #25, #31). A03, A04 and A02 saved brains of 121, 122 and 140 words (#91, #101, #105), while A01's attempt was refused for being 152 words (#47). A01 noted the game had not started and only saved a brain later (#121). (#13, #47, #91, #105, #121)
- **The first playable card was found by A02's signal to A01.** A02 signalled A01 about a Rose 1 in slot 3 (#184), the only visible rank-1 card at the time (#165, #174). A01 then played slot 3, Rose 1, and lit Rose at minute 1 (#222). (#165, #184, #222)
- **A01 discarded Amber 6 and killed the Amber 7 card.** A01 discarded slot 1, which was Amber 6, to regain a signal (#417). A01 noted this made Amber 7 unreachable because Amber 4, 5 and 6 were all lost (#416, #417). This cost the crew an Amber point later. (#416, #417)
- **A04 played Amber 2 and Cobalt 2, opening two towers.** A04 played slot 1, Amber 2, at minute 2 (#438), then slot 3, Cobalt 2, at minute 3 (#618). This brought Amber to 2 and Cobalt to 2, making further cards playable. (#438, #618)
- **A03 played Rose 4 to bring Rose to 4.** A03 had been stuck between Rose 4 and Rose 7 in slots 1 and 2 (#642). A03 then played Rose 4 at minute 4 (#681), lighting Rose. (#642, #681)
- **A02 ran out of cards and could not signal A01 on its turn.** A02 tried to give A01 a signal but was refused because it was A01's turn (#740). A02 then noted it had no cards left and that A01 held the remaining playable cards (#751). (#740, #751)

## Problems

1. **No resident solved the first level within the five-minute run.** The run ended at minute 5 with no levels solved by anyone (facts table). The log shows no submission events in the counted range (#5 to #769). Residents were still coordinating plays when the referee ended the run (#769). (#769)
2. **Residents misunderstood when writeBrain was allowed.** A03 believed writeBrain was allowed before the first game (#19), and A04 was unsure whether it was the retro captain (#25). A01's writeBrain was refused for being 152 words, over the 150-word limit (#47). This wasted early turns that could have been used to read the tower state. (#19, #25, #47)
3. **A signal attempt touched no card and was refused.** A04 tried to give a signal about a rank 1 but the system refused it because it touched no card of A02's seat (#177). A04 then recalculated which cards matched (#191). This cost A04 a turn. (#177, #191)
4. **A02 tried to signal on A01's turn and was refused.** A02 gave a signal to A01 but the system refused it because it was A01's turn (#740). A02 then concluded it had nothing left to do (#751). The turn-order restriction was not anticipated. (#740, #751)
5. **The game ended before the crew could finish the towers.** At minute 4 A01 was still deciding which of its remaining cards to play (#718, #728). The referee ended the run at minute 5 (#769), leaving Moss 5, Rose 5 and Violet 5 unplayed (#751). The five-minute limit was too short for the coordination required. (#718, #728, #751, #769)

## Optimizations

- **Clarify writeBrain timing and word limit up front.** Residents spent minute 0 debating whether they could write a brain (#19, #25, #31), and A01 exceeded the 150-word limit (#47). Give each resident a clear rule that writeBrain is locked after game start and enforce the limit before submission. (#19, #25, #31, #47)
- **Validate signal targets before consuming a turn.** A04's signal to A02 was refused for touching nothing (#177), and A02's signal was refused for turn order (#740). Pre-check signal validity and return a hint without costing the action. (#177, #740)
- **Extend the run time or shorten the setup.** The crew was still coordinating at minute 4 (#718, #728) and the run ended at minute 5 (#769). Either allow more minutes or start the game immediately after minute 0 so residents do not spend a full minute on brains. (#718, #728, #769)
- **Give residents private hand knowledge at start.** A01 repeatedly noted its own hand was unknown (#161, #718). Providing a private view of one's own hand would let residents plan signals and plays more effectively and reduce blind guesses. (#161, #718)
- **Add a turn-order reminder in the tool response.** A02 tried to signal on A01's turn (#740). The turn indicator should be included in every tool response or a reminder shown when an action is attempted out of turn. (#740)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 79: event "brain_written" (seq 79) does not match its schema
- line 80: event "retro_closed" (seq 80) does not match its schema
- line 135: event "cards_dealt" (seq 135) does not match its schema
- line 136: event "game_started" (seq 136) does not match its schema
- line 137: event "deal_revealed" (seq 137) does not match its schema
- line 148: event "signal_given" (seq 148) does not match its schema
- line 157: event "signal_given" (seq 157) does not match its schema
- line 168: event "signal_given" (seq 168) does not match its schema
- line 194: event "signal_given" (seq 194) does not match its schema
- line 204: event "card_played" (seq 204) does not match its schema
- and 75 more
