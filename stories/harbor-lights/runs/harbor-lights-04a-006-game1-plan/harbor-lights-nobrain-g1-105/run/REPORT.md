# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 105 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #715 (634 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.061 USD for this run (competitors 0.061, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_SIGNALS 1, NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew opened with fast, clean lights in minute 0.** A03 played Amber 1 (#27, #36), A04 played Violet 1 (#60) and A01 played Cobalt 1 (#108, #119), all from signals rather than blind guesses. A02 signalled playable 1s to A04 and A01 instead of playing its own unknown hand (#48, #83). (#27, #36, #48, #60, #83, #119)
- **A03 and A04 spent most of the run passing and signalling instead of playing.** A03 repeatedly declined to play its uncertain Cobalt slots, arguing a misfire would cost 3 points with a strike already showing (#146, #269, #313, #374). A04 did the same with its Rose 2/3/4 slots, holding to avoid a second or third strike (#554, #597, #654). (#146, #269, #313, #374, #554, #597, #654)
- **A04's blind Violet 6 opened the strike counter.** A04 played slot 4 hoping for a light and got Violet 6, the first strike (#151, #161). From then on the strike penalty became the main reason residents refused blind plays. (#151, #161, #216, #478)
- **Discards destroyed the Amber tower and a playable Amber 4.** A04 discarded Amber 3 (#102, #103), A01 discarded Amber 2 as a 50/50 loss that left Amber stuck at 1 (#283, #284), and A02 discarded an actually-playable Amber 4 (#368, #369). These discards removed most of Amber's remaining cards. (#102, #103, #283, #284, #368, #369)
- **Signals pointed teammates at cards they could light.** A02 signalled A04 Violet 2 which A04 then lit (#204, #264), A03 signalled A04 Rose 1 which A02 later lit (#425, #466), and A04 signalled A01 Amber 2 (#216). A02 and A04 used signals as the main engine of progress rather than their own hands. (#204, #216, #264, #425, #466)
- **The run ended with Rose 2 still unplayed and the draw pile empty.** A04 reasoned that exactly one of its three Rose cards was Rose 2 (#482, #699) and by minute 4 was weighing a 1-in-3 blind play as the pile ran out (#635, #678, #707). The referee ended the run at minute 5 with no final Rose play (#715). (#482, #635, #678, #699, #707, #715)

## Problems

1. **Nobody submitted a solution; the whole run is one six-minute stall.** The facts record zero submissions in minutes 0-5 and the longest submission-free streak covering the entire run. Residents only played or discarded cards (#119, #264, #601) and never reached a puzzle solve. (#119, #264, #601, #715)
2. **Residents passed on playable or near-playable cards to protect points.** A03 held its Violet 7 repeatedly as "a coin flip" with a 3-point misfire cost (#498, #601), and A02 acknowledged its discard of Amber 4 was the wrong call after weighing expected value (#368, #369). The strike penalty pushed them toward discarding rather than playing. (#368, #369, #498, #601)
3. **Signals were exhausted and requests were refused, leaving residents with no information.** A04's signal request was refused with NO_SIGNALS (#485) after spending its last signal (#388). Signals sat at zero for long stretches (#577, #635), so residents could neither play safely nor generate new information. (#388, #485, #577, #635)
4. **A03's out-of-turn play was rejected.** A03 attempted a slot play and was refused with NOT_YOUR_TURN because it was A04's turn (#671). This is a rules/turn-order error that cost a turn and produced no progress. (#671)
5. **The draw pile emptied while playable cards sat in hands.** A03 noted the draw pile was empty (#470) and A04 reasoned the game would end after a round with no light and no signal (#584, #678). Playable cards like A04's Rose 2 remained stuck because nobody could tell them apart from Rose 3/4. (#470, #482, #584, #678)

## Optimizations

- **Make the strike penalty less punitive or give a cheap probe.** The 3-point misfire and strike system made residents refuse ~1-in-3 and ~1-in-2 plays (#482, #498, #601, #699). Since #478 shows one strike already on the board, either reduce the penalty or add a non-punishing way to test an uncertain slot. (#478, #482, #498, #601, #699)
- **Give signals a regeneration or a shared pool that does not run dry.** Signals hit zero and requests were refused (#485), after which residents had no way to act (#577, #635). Regenerating signals at a fixed rate, or letting discards return more, would keep the information economy moving. (#485, #577, #635)
- **Auto-resolve turn-order mistakes instead of wasting the turn.** A03's out-of-turn play was simply refused (#671) with no fallback action. Queuing the play for the resident's next turn, or warning before submission, would avoid dead turns. (#671)
- **Design a forced end-game decision around one unknown card.** At minute 4 A04 knew exactly one of its three Rose cards was Rose 2 and still could not act (#699, #707). A rule that reveals a hand or forces a blind play once the pile empties would turn stalled knowledge into a climax. (#470, #699, #707, #715)
- **Reduce the cost of discarding so playable cards are not thrown away.** A04 discarded Amber 3 (#103) and A02 discarded a playable Amber 4 while chasing a signal (#369). Making discards purely informational (returning a signal without destroying a potentially needed card) would prevent self-inflicted tower deaths. (#103, #283, #369)

## Loophole candidates

1. **Signalling others instead of playing became a safe no-cost action.** (residents) A02 and A04 repeatedly signalled teammates' playable cards rather than risk their own hands (#48, #83, #388, #654), which advanced other players' towers while avoiding the strike penalty. This turns one signal into free progress without informational cost. (#48, #83, #388, #654)

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
- line 55: event "signal_given" (seq 55) does not match its schema
- line 71: event "signal_given" (seq 71) does not match its schema
- line 78: event "signal_given" (seq 78) does not match its schema
- line 95: event "card_discarded" (seq 95) does not match its schema
- line 96: event "card_drawn" (seq 96) does not match its schema
- line 111: event "card_played" (seq 111) does not match its schema
- line 112: event "card_drawn" (seq 112) does not match its schema
- line 126: event "signal_given" (seq 126) does not match its schema
- line 136: event "signal_given" (seq 136) does not match its schema
- line 154: event "card_played" (seq 154) does not match its schema
- line 155: event "card_drawn" (seq 155) does not match its schema
- and 61 more
