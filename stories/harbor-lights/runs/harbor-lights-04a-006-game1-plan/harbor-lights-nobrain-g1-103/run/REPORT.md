# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #636 (561 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.047 USD for this run (competitors 0.047, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Team lights all five towers to completion and banks 24 lit cards by minute 4.** The four residents worked through every tower without a stuck seat, finishing Amber, Cobalt, Violet and Moss fully and Rose at 5. A02's final Cobalt 6 (#589) and A04's Moss 4 (#614) closed out the last open towers. (#560, #589, #593, #614)
- **Signals drove nearly every correct play; residents pointed teammates at playable slots repeatedly.** A03's "1" to A01 (#54), A04's "Cobalt" to A04 (#187), A02's "4" to A03 (#255), A03's "5" pair to A04 (#420) and A04's "5" to A03 (#529) each set up a lit card. Few plays were blind. (#54, #187, #255, #420, #529)
- **A04's blind play of Moss 7 misfired, the only recorded strike.** A04 played slot 1 expecting a playable card but it was Moss 7 and was lost, taking the crew to 1 strike (#335). This was the one play not backed by a signal. (#335)
- **Discards of high cards thinned the deck but also lost needed cards.** Residents discarded playable-but-blocked high cards to regain signals: A01 discarded Moss 3, Moss 6, Cobalt 4, Cobalt 7 and Moss 5 (#238, #301, #353, #480, #535), and A02 discarded Violet 5 (#414). Losing Moss 3/Cobalt 4 changed what could ever be played. (#238, #301, #353, #414, #480, #535)
- **A03 was refused a signal because it touched no card, and had to play blind.** A03 tried to give a signal but the city refused it with TOUCHES_NOTHING (#609), leaving it to gamble its Rose 6/7 coin flip (#620). The discipline ended the run with a guaranteed misfire among its last two Roses. (#609, #620)

## Problems

1. **No resident submitted or solved a level all run; entire run passed with zero submissions.** The metrics show 0 correct and 0 wrong submissions across minutes 0-4, and no level-ups for any resident. The run only advanced cards on hand-play logic; game-level progression apparently never started. (#37, #137, #636)
2. **A03 lost its turn to a rule error on signaling.** A03 attempted a signal with no card touched and the city refused it (#609), wasting the turn at a crucial endgame moment when it needed to distinguish Rose 6 from Rose 7. (#609, #620)
3. **Blind play was a genuine trap with real cost, pushing risk-aversion over progress.** Residents repeatedly declined to play unknowns because of the 3-point misfire penalty (#335, #420, #606). A04's only blind attempt misfired (#335), which reinforced caution and lengthened turns without plays. (#335, #420, #606)
4. **Residents discarded useful cards to buy signals that sometimes went to information nobody could use immediately.** A01 discarded Cobalt 4 and Cobalt 7 (#353, #480) just to regain tokens, and A03 noted a signal it gave only helped A04's information rather than enabling a play (#419). Discarding burned card resources for low-value tempo. (#353, #419, #480)
5. **Deck exhaustion left the endgame effectively unplayable without cross-seat card visibility.** By minute 2 the pile was empty (#384) and strangers had to guess ordering in teammates' hands (#606). With no one holding cards by minute 3 (#614), the final Roses were a pure coin flip. (#384, #606, #614)

## Optimizations

- **Prevent signaling calls that touch no card, or make them no-ops without consuming a turn.** A03 lost a turn to TOUCHES_NOTHING (#609). Validate the signal target in the interface and prompt the resident to retry before passing play. (#609)
- **Give residents a cheap, no-penalty way to test one unknown card when the deck runs out.** The endgame (#606, #620) came down to 50/50 guesses with a 3-point misfire cost. A 'safe reveal' or reduced penalty for the last card in hand would resolve stalls without rewarding guessing earlier. (#606, #620)
- **Make signals less costly to send when information would directly enable a play.** Residents like A03 discarded playable cards (Rose 5 was sitting playable at #498) rather than spend a token, and A01 burned Cobalt 7 for a token (#480). A lower signal cost or a refund when the signaled card is played would convert more information into plays. (#480, #498)
- **Surface hand ordering to the holder or allow teammates to reveal rank ordering at the end of the deck.** A03 knew it held Rose 5/6/7 but not which slot (#518, #606), forcing a coin flip. A 'sort' or 'peek' action once the deck is empty would resolve this without changing mid-game difficulty. (#518, #606)
- **Check the story file and gamemaker wiring: the run had no story and no gamemaker actions.** 000-run.json has no story, gamemaker took no actions, and the whole run ran on the card game mechanics alone (#636). Populate 000-run.json and give the gamemaker at least one intervention hook so design intent is testable. (#636)

## Loophole candidates

1. **A03 repeated the 'last signal' resource through discards, effectively recycling wasted tokens.** (residents) A03 spent 'last signals' at #211, #255 and #375, implying token regeneration that let it repeatedly claim to be signaling with its last token. This potentially circumvents the one-signal budget. (#211, #255, #375)
2. **Refused signal did not consume the signal token and cost only the turn.** (residents) A03's refused signal (#609) did not decrement its stated tokens, meaning it could have retried. The refusal is a free probe into whether a card was touchable, revealing nothing but wasting the game's tempo without penalty beyond the turn. (#609, #620)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 24: event "card_played" (seq 24) does not match its schema
- line 25: event "card_drawn" (seq 25) does not match its schema
- line 33: event "signal_given" (seq 33) does not match its schema
- line 48: event "card_discarded" (seq 48) does not match its schema
- line 49: event "card_drawn" (seq 49) does not match its schema
- line 61: event "card_played" (seq 61) does not match its schema
- line 62: event "card_drawn" (seq 62) does not match its schema
- line 69: event "signal_given" (seq 69) does not match its schema
- line 90: event "signal_given" (seq 90) does not match its schema
- line 98: event "card_played" (seq 98) does not match its schema
- line 99: event "card_drawn" (seq 99) does not match its schema
- line 111: event "card_played" (seq 111) does not match its schema
- line 112: event "card_drawn" (seq 112) does not match its schema
- line 125: event "card_played" (seq 125) does not match its schema
- line 126: event "card_drawn" (seq 126) does not match its schema
- line 145: event "signal_given" (seq 145) does not match its schema
- and 55 more
