# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 105 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #707 (628 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.052 USD for this run (competitors 0.052, gamemaker 0.000, classifier 0.000) |
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

- **A01 opens by misfiring on Moss 2 and starts the crew at one strike.** A01 guessed a playable card and lost Moss 2 (#95), giving the crew its first strike early in minute 0. This set the risk tone for the whole run. (#94, #95)
- **A04's Rose 3 misfire in minute 2 puts the crew on strike 2 with a 3-point penalty.** A04 played slot 1 hoping for a light and instead misfired Rose 3 (#330). A01's own discard of the playable Violet 4 (#345, #346) compounded the errors. (#329, #330, #345, #346)
- **Strike 3 arrives in minute 2, raising the misfire penalty to 6 points.** A04 misfired Violet 7 (#414) for the crew's third strike. From then on, A01 explicitly cited the 6-point penalty as a reason to hold (#418). (#413, #414, #418)
- **The crew chains a long run of safe, signalled plays through minutes 3-4.** Signals from A01, A03 and A02 let them light Cobalt 3, Rose 4, Cobalt 6, Rose 5, Rose 6 and Moss 5 in sequence (#588, #594, #616, #633, #664, #694). This shows the signal mechanic working as designed once information was shared. (#571, #588, #594, #616, #633, #664, #694)
- **The run ends at minute 5 with about 20 lit cards and no complete tower set.** A01 lit Moss 5 at #694, bringing the crew to 20 lit cards, and the referee ended the run at #707 with levels unsolved. (#694, #707)

## Problems

1. **The entire run stalls with no submissions and no end-to-end progress.** The facts report 0 submissions, 0 level-ups, and a 6-minute stall across minutes 0-5, with the referee ending at minute 5 (#707). No level was solved and standings are unknown, so the residents never reached the story's intended success state. (#95, #707)
2. **Residents repeatedly refused to play at modest odds and discarded instead.** A01, A04 and A02 all justified holding or discarding because a misfire would cost 3 (or later 6) points (#182, #221, #300, #418). This passive play dominated the early game and slowed the board. (#182, #221, #300, #418)
3. **The 3-point and 6-point misfire penalties are calibrated too harshly relative to the residents' play odds.** Residents repeatedly cited 20-33% odds against a 3-point or 6-point penalty as a reason not to play (#109, #300, #418, #608). The economy made cautious discarding the dominant strategy over playing. (#109, #300, #418, #608)
4. **A01 burned a playable card through a known-discard mistake.** A01 discarded slot 1 and learned it was the playable Violet 4 (#345), admitting it had not checked which cards were playable first (#345). The mechanic lets residents discard blind, and the cost was a lost card. (#345, #346)
5. **The harness recorded a not-your-turn error during signalling.** A01 attempted a signal and was refused with NOT_YOUR_TURN at #67, costing a tool call. This suggests the turn-order enforcement tripped A01 early in the run. (#67)
6. **Gamemaker and classifier did nothing, so no story beats or guidance were injected.** The facts report no gamemaker actions and no labels, and the digest found no beats. The run had no narrative steering despite the story having no defined instructions. (#12, #707)

## Optimizations

- **Lower misfire penalties or add a guaranteed light chance for early plays.** Residents overwhelmingly held at 20-33% odds because a misfire cost 3 then 6 points (#109, #300, #418, #608). Reducing the penalty or adding a scripted safe play would encourage the intended risk-taking. (#109, #300, #418, #608)
- **Give residents explicit story instructions and success criteria at the start.** The run had no story file and the gamemaker took no actions, so residents only had the implicit tower goal. Adding an opening instruction would reduce the blind guessing that led to early strikes (#95, #330). (#12, #67, #95, #330)
- **Add a confirmation or playability preview before discards.** A01 discarded the playable Violet 4 without noticing (#345). A preview of which cards are playable before discarding, or a warning, would prevent this class of mistake. (#345, #346)
- **Fix or clarify turn-order enforcement around signals.** A01's signal attempt was refused with NOT_YOUR_TURN at #67. A clearer turn indicator or a preview of whose turn it is would avoid wasted tool calls. (#67)
- **Introduce a coach or classifier that prompts the current resident when a stall is detected.** The facts show 6 quiet minutes and no submissions, with the referee ending at minute 5 (#707). An automated nudge when no lit cards change for a minute would keep the run moving. (#12, #707)
- **Track and surface which cards are known to each resident to reduce redundant signals.** A02 signalled A01 that slot 3 was Amber 2 (#209), yet A01 had already reasoned about this hold. Better knowledge surfacing would prevent wasted signals. (#186, #209)

## Loophole candidates

1. **Residents exploit discards as a safe way to recycle signals without risking strikes.** (residents) A01, A02 and A04 repeatedly discarded cards to regain signals (#90, #109, #182, #221, #245, #370, #418). Discarding to gain signals is a cheaper, safer path than playing at low odds, which the story presumably intends to discourage. (#90, #182, #221, #245, #370, #418)
2. **Residents use signals to hand off plays to teammates instead of risking their own turns.** (residents) A01 signalled A02 about Cobalt 2 and Cobalt 3 (#511, #571) rather than playing, and A03 signalled A02 about Rose 1 (#375). Offloading risky plays to teammates is a safe path that bypasses the misfire penalty. (#375, #511, #571)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 23: event "signal_given" (seq 23) does not match its schema
- line 30: event "card_played" (seq 30) does not match its schema
- line 31: event "card_drawn" (seq 31) does not match its schema
- line 43: event "card_played" (seq 43) does not match its schema
- line 44: event "card_drawn" (seq 44) does not match its schema
- line 55: event "card_played" (seq 55) does not match its schema
- line 56: event "card_drawn" (seq 56) does not match its schema
- line 73: event "signal_given" (seq 73) does not match its schema
- line 80: event "card_discarded" (seq 80) does not match its schema
- line 81: event "card_drawn" (seq 81) does not match its schema
- line 102: event "card_discarded" (seq 102) does not match its schema
- line 103: event "card_drawn" (seq 103) does not match its schema
- line 117: event "card_played" (seq 117) does not match its schema
- line 118: event "card_drawn" (seq 118) does not match its schema
- line 132: event "signal_given" (seq 132) does not match its schema
- line 142: event "signal_given" (seq 142) does not match its schema
- and 59 more
