# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 105 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #5 to #852 (756 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.057 USD for this run (competitors 0.057, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **Residents spent minute 0 waiting because the game had not started and writeBrain closed early.** A01, A02 and A03 each tried to read the brain, then found writeBrain had already dropped off the tool list (#26, #76, #82). A02 recorded the brain as version 1 (#94) and all four residents then repeatedly noted the game was not open, ending the minute with nothing to do (#104, #108, #113). (#26, #76, #82, #94, #104, #108, #113)
- **The crew took three strikes and lost 6 points before any tower advanced past 2.** A04 misfired on Amber 3 (#191), A01 misfired on Moss 2 after miscounting the odds (#259, #260), and A01 later misfired on Violet 7 (#500, #501). A01 explicitly records the third strike as 6 points lost to penalties (#501). (#191, #259, #260, #500, #501)
- **Signals were the main engine of progress, not blind plays.** A01 told A03 about Amber 1 (#151), A02 pointed A01 at Cobalt 1 (#179), A03 signalled A01's Moss 2 (#245), and A04 signalled A03's Amber 2 (#313). A02 and A04 kept using signals to point at playable cards while refusing to gamble on their own unknown hands (#449, #547, #774). (#151, #179, #245, #313, #449, #547, #774)
- **Discarding worked as the crew's signal faucet throughout the run.** A03 discarded Rose 5 to win a signal (#290), A04 discarded Amber 7 to win a second signal (#371), A03 discarded Moss 6 (#409) and later Cobalt 7 (#487), and A01 discarded Rose 7 rather than gamble (#395). A03 ended by discarding its last card, Cobalt 4, for a signal (#750, #759). (#290, #371, #395, #409, #487, #750, #759)
- **A04's Violet 1 and Violet 5 plays unblocked the Violet tower.** A04 played Violet 1 (#240) and later Violet 5 after A02's Violet signal (#449, #465, #483). A01 then played Violet 4 (#461) and Violet 6 came down, letting A01 call Violet complete at 6 (#573). (#240, #449, #461, #465, #483, #573)
- **The referee cut the run at minute 6 while A02 was mid-play on its last two slots.** A02 had both Cobalt 5 and Moss 7 playable and decided to play slot 1 first (#833). The run ended at minute 6 (#852) with no level solved and no final standings. (#833, #852)

## Problems

1. **Seven quiet minutes with zero submissions and no level solved.** The facts record no correct or wrong submissions and quiet minutes 0-6, and the only stall listed is the whole run (#852, end at minute 6). No resident ever reached a level-up. (#104, #113, #852)
2. **The opening minute was dead time while writeBrain closed before play began.** A01 (#76) and A02 (#82) report writeBrain is no longer open at minute 0, and all four residents then waited for the game to start (#104, #108, #113). (#76, #82, #104, #108, #113)
3. **A03 hit NOT_YOUR_TURN on a discard while trying to act out of sequence.** A03's discardSlot was refused with NOT_YOUR_TURN because it was A02's turn (#726). A03's private reasoning shows it was uncertain whether it still had a signal (#723). (#723, #726)
4. **Residents repeatedly misjudged the tower state and their own odds.** A01 counted Moss 2 as playable when the Moss tower was at 0 (#249, #259) and later miscounted Violet 7 as pending (#500, #501). A03 weighed a 2-in-3 slot play but declined it repeatedly over strike fear (#343, #356, #487). (#249, #259, #343, #356, #487, #500, #501)
5. **The gamemaker made no actions and no beats were detected.** The facts report 'no actions' for the gamemaker and the deterministic digest found no beats. The run's only recorded referee event is the end at #852. (#852)

## Optimizations

- **Open the brain window during play, not only before minute 0.** Residents lost the whole first minute discovering writeBrain had closed (#76, #82) and then idling (#104, #113). Allow a short write window at the first game start or between levels so the strategy note is not written blind. (#76, #82, #104, #113)
- **Show an explicit signal and strike counter to each resident.** A03 was unsure whether it had 1 or 0 signals (#723), and A01 miscalculated the tower odds (#249, #259). A visible, authoritative counter would remove the guessing that led to misfires. (#249, #259, #723)
- **Make NOT_YOUR_TURN cost nothing in the turn economy.** A03's discard was refused at #726 while it was A02's turn, wasting a turn window. Queue out-of-turn actions or clearly mark whose turn it is before the resident reasons. (#723, #726)
- **Give a clearer signal about what 'playable' means for dead towers.** A01 called Moss 2 playable while the Moss tower was still at 0 (#249, #260), leading to a strike. The status readout should distinguish tower rank from card rank explicitly. (#249, #259, #260)
- **Extend or speed the run so the last playable cards are resolved.** At minute 6 A02 still held two playable cards, Cobalt 5 and Moss 7 (#833), and the referee ended the run (#852). A longer clock or a more aggressive draw would let the crew finish a level. (#833, #852)

## Loophole candidates

1. **The crew used discards as a free signal generator instead of risking plays.** (residents) A03 and A04 repeatedly discarded dead or near-dead cards to regain signals rather than attempt uncertain plays (#290, #371, #395, #487, #759). This let them steer teammates to playable cards while never risking a misfire themselves. (#290, #371, #395, #487, #759)
2. **A04 signalled through passes to keep play moving without taking a risk.** (residents) A04 signalled A01 'Violet' as a pass on an already-known playable card (#547), and later signalled A02's Cobalt 3 (#774). Both moves avoided a self-play gamble while still advancing the board. (#547, #774)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 43: event "brain_written" (seq 43) does not match its schema
- line 44: event "retro_closed" (seq 44) does not match its schema
- line 50: event "brain_written" (seq 50) does not match its schema
- line 51: event "retro_closed" (seq 51) does not match its schema
- line 57: event "brain_written" (seq 57) does not match its schema
- line 58: event "retro_closed" (seq 58) does not match its schema
- line 64: event "brain_written" (seq 64) does not match its schema
- line 65: event "retro_closed" (seq 65) does not match its schema
- line 133: event "cards_dealt" (seq 133) does not match its schema
- line 134: event "game_started" (seq 134) does not match its schema
- line 135: event "deal_revealed" (seq 135) does not match its schema
- line 146: event "signal_given" (seq 146) does not match its schema
- line 158: event "signal_given" (seq 158) does not match its schema
- line 165: event "card_played" (seq 165) does not match its schema
- line 166: event "card_drawn" (seq 166) does not match its schema
- line 173: event "card_played" (seq 173) does not match its schema
- and 76 more
