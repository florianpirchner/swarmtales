# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 105 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #5 to #826 (731 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.049 USD for this run (competitors 0.049, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0049 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_SIGNALS 1, NOT_YOUR_TURN 1, TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew cooperated to light towers despite no submissions.** A01, A02, A03 and A04 spent the whole run signalling and playing cards rather than submitting, and the lights accumulated: A03 lit Amber 1 (#185), A01 lit Cobalt 1 (#251), A04 lit Amber 2 (#357), A03 lit Moss 1 (#619) and completed the Moss tower with Moss 5 (#811). The cooperation worked, but the run's submission metric stayed at zero. (#185, #251, #357, #619, #811)
- **A01 held the most useful hand and repeatedly signalled playable cards.** A01 signalled rank 1 to A03 at #142, rank 2 to A04 at #312, rank 3 to A04 at #380 and rank 1 to A03 at #595. Its discards and signals kept the crew moving, for example the Rose 1 play at #651 and the Moss 3 signal at #734. (#142, #312, #380, #595, #651, #734)
- **A03 discarded many live cards, costing points.** A03 discarded Rose 5 (#237), Moss 6 (#394), Cobalt 7 (#472), Cobalt 4 (#512) and Violet 6 (#560), the last of which it admitted was still live. These discards were self-described gambles to regain signals, and they removed cards the crew still needed. (#237, #394, #472, #512, #560)
- **A02 misfired once on Amber 5 and then recovered.** A02 played slot 1 as Amber 5 and misfired (#268), losing a strike. It then played Amber 4 (#435), Violet 2 (#508) and Amber 6 (#553), and later discarded Violet 7 (#720) and Violet 5 (#792) when out of options. (#268, #435, #508, #553, #720, #792)
- **Tool errors interrupted otherwise valid actions.** A01's signal to A02 was refused with TOUCHES_NOTHING (#178), A03's discard was refused with NOT_YOUR_TURN (#704) and A02's signal was refused with NO_SIGNALS (#763). These errors forced residents to re-plan and slowed the round. (#178, #704, #763)
- **A04 played a steady supply of confirmed cards.** A04 played Violet 1 (#181), Amber 2 (#357), Amber 3 (#421), Amber 7 (#575), Cobalt 2 (#691) and Violet 3 (#749), mostly after receiving signals from teammates. It avoided blind plays when uncertain, for example holding slot 1 at #468. (#181, #357, #421, #468, #575, #691, #749)

## Problems

1. **No resident submitted a solution and the run stalled for all 7 minutes.** The facts show 0 correct and 0 wrong submissions, with no submission in minutes 0-6. Residents instead played the card game, so the story's submission goal was never attempted. (#13, #25, #57)
2. **Residents misread the tool availability and the turn order.** A02 noted writeBrain was locked (#56), A03 tried to discard on A02's turn and got NOT_YOUR_TURN (#704), and A01 got TOUCHES_NOTHING on a signal (#178). These suggest the residents did not fully track whose turn it was or which tool targets were legal. (#56, #178, #704)
3. **The game's information flow encouraged blind discards that destroyed live cards.** A02 discarded Moss 7 (#399) and A03 discarded Violet 6 (#560), both admitted to be live. The signal economy pushed residents to discard rather than play, costing the crew cards. (#399, #560)
4. **A02 ran out of signals and cards, showing a resource drain.** A02 tried to give a signal and was refused with NO_SIGNALS (#763), then discarded its last card (#792) and had nothing left. The signal and card economy was tight enough that a resident became idle. (#763, #792)
5. **The gamemaker took no actions and the classifier produced no labels.** The facts table says the gamemaker performed no actions and no labels were assigned. The story had no external guidance, so residents had to invent their own strategy from the start. (#13, #25)

## Optimizations

- **Add a clear objective counter and periodic reminders to submit.** Residents never submitted in 7 minutes. A visible submission prompt or an automatic reminder after a quiet minute would push them toward the story goal. Evidence: no submissions in minutes 0-6 (#13, #57). (#13, #57)
- **Improve turn-ownership feedback before a tool call.** A03's discard was refused with NOT_YOUR_TURN (#704), wasting a turn. The harness should show whose turn it is next to the tool list, or reject the tool call earlier with a clearer hint. (#704)
- **Give a stronger penalty or warning for discarding live cards.** A02 discarded Moss 7 (#399) and A03 discarded Violet 6 (#560), both described as live. A rule that reveals a card's status before a discard, or a smaller penalty for discarding unknowns, would reduce waste. (#399, #560)
- **Provide a way to regain signals without discarding.** A02 ran out of signals and cards (#763, #792), and A03 discarded repeatedly to get signals (#237, #394). A cheap signal-recovery action or an extra signal per round would keep the crew from burning cards. (#237, #394, #763, #792)
- **Have the gamemaker seed an initial strategy or hints.** The gamemaker performed no actions, and residents invented their own core rules from scratch (#107). A short starting hint from the gamemaker would align play with the designers' intent. (#107)

## Loophole candidates

1. **Residents treated discarding as a free way to farm signals.** (residents) A03 discarded cards such as Rose 5 (#237) and Cobalt 7 (#472) explicitly to regain signals, which extended the round without penalty and avoided the risk of a misfire. This used the discard rule against its purpose of clearing dead cards. (#237, #472, #545)
2. **Residents avoided blind plays by signalling instead of playing.** (residents) A04 held slot 1 rather than gamble on Amber 6 or 7 (#468), and A03 signalled A01's Moss 3 instead of playing its own dead card (#734). This safer path kept the round going but delayed the towers. (#468, #734)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 30: event "brain_written" (seq 30) does not match its schema
- line 31: event "retro_closed" (seq 31) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 51: event "brain_written" (seq 51) does not match its schema
- line 52: event "retro_closed" (seq 52) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 124: event "cards_dealt" (seq 124) does not match its schema
- line 125: event "game_started" (seq 125) does not match its schema
- line 126: event "deal_revealed" (seq 126) does not match its schema
- line 137: event "signal_given" (seq 137) does not match its schema
- line 149: event "signal_given" (seq 149) does not match its schema
- line 157: event "card_played" (seq 157) does not match its schema
- line 158: event "card_drawn" (seq 158) does not match its schema
- line 165: event "card_played" (seq 165) does not match its schema
- and 75 more
