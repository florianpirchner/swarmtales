# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #642 (567 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.046 USD for this run (competitors 0.046, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0045 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
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

- **A02 plays a known Amber 1 blind to the others and starts the lighting chain** A02 deduced its slot 3 was the last unseen 1 and played it at #66; it lit as Amber 1 per #80. That was the first resident-initiated play after several signal-only turns, and it showed residents could read the signal information well enough to act. (#66, #80)
- **A04 turns signal information into the first misfire-free streak** A04 played slot 2 expecting Moss 1 or Violet 1 (#44-45); it lit as Violet 1 (#74) and then played the predicted Moss 1 at #98, lighting it at #132. These back-to-back lights early in the run contrast with the later caution. (#44, #74, #98, #132)
- **First misfire by A03 raises the strike track and makes everyone risk-averse** A03 played slot 4 as a gamble at #194 reasoning, drawing Moss 4 and misfiring at #259. After that, multiple residents explicitly cite the 3-point cost of a second strike when deciding to pass or discard (#264, #318, #381, #426). (#194, #259, #264, #318)
- **A01 accidentally discards Cobalt 4, then misfires on Cobalt 6** A01 discarded slot 1 which turned out to be Cobalt 4 at #391, and later misfired on slot 2 believing it was Moss 2 but it was Cobalt 6 at #491. That second misfire came with strikes already at 2, making it a costly error by a resident that had been mostly careful. (#391, #491)
- **A04 plays a long, low-error sequence and completes the Cobalt tower** A04 lit Rose 3 (#340), Rose 4 (#385), Amber 3 (#437), Violet 3 (#495), Cobalt 5 (#539) and Moss 5 (#592) across minutes 1-3. That run of correct plays carried most of the crew's progress, and the Cobalt completion at #539 returned a signal. (#340, #385, #437, #495, #539, #592)
- **A03 begins to light its own cards only at minute 3, after repeated passes** A03 had playable cards from its own hand from around minute 2 but repeatedly signalled instead of playing (#426, #477, #528, #581). At #626 it finally played slot 1, but the run ended at minute 4 with A03 still holding cards. (#426, #477, #528, #581, #626, #642)

## Problems

1. **No submissions at all: every resident stalled for the full five minutes** The facts table records 0 correct and 0 wrong submissions, 5 quiet minutes and a stall from minutes 0-4. Residents spent their turns signalling, reasoning, discarding and passing, but never registered a solved level. (#66, #80, #161, #215, #340)
2. **Residents were crippled by having no information about their own hands** A02 wrote at #21 and #125 that it knew nothing about its own cards and treated every play as a 15-20% gamble. A03 at #54 and A02 at #346 explicitly declined to play because no card of theirs was known playable. The signal mechanic only reveals other players' cards, so residents had to rely on cross-player inference, and several of them never acted on their own hands. (#21, #54, #125, #346)
3. **Repeated passing and discarding consumed most turns, producing very slow progress** A03 passed and signalled on multiple consecutive turns (#426, #477, #528), and A01 discarded three times (#358, #391, #522). The log shows long stretches where the only actions were a signal or a discard, which the residents justified by negative expected value at strike count 2-3. (#358, #391, #426, #477, #522, #528)
4. **The NOT_YOUR_TURN tool error hit A01 and reveals turn-order friction** A01's discard at #457 was refused with NOT_YOUR_TURN because it was A03's turn. The facts table records one such tool error, which suggests residents were trying to act out of order, possibly because the turn rhythm was not clear from the interface. (#457)
5. **Missed-opportunity pattern: residents knew a card was playable in another seat but often only signalled** A04 knew A01 held Amber 2 in slot 4 and signalled it at #154; A02 knew A03 had Rose 2 and signalled it at #227. In several of these cases the player who held the card did act on the next turn, but only after the signal. The residents frequently could not turn their correct inference into a play without a signal, which slows the run. (#154, #203, #227)

## Optimizations

- **Give each resident direct knowledge of some of its own cards or a self-signal option** A02 (#21, #125) and A03 (#54) both explained that they would not play because they did not know their own hand. A self-inspection action or a starting hint about one's own slots would let residents act on their own hands rather than relying on other players' signals. (#21, #54, #125)
- **Reduce or clarify the strike penalty so residents do not default to passing at 2-3 strikes** At #264, #318, #381 and #426 residents explicitly passed because a second misfire would cost 3 points. A softer penalty curve or a cap on strikes would make playing a 30-50% card rational and speed up the game. (#264, #318, #381, #426)
- **Make the turn order explicit in the UI after a NOT_YOUR_TURN refusal** A01 was refused at #457 because it was A03's turn. Showing the active seat prominently and echoing it in the response to every action would prevent wasted turns and confusion about whose move it is. (#457)
- **Nudge residents to play when they hold a card they have deduced as playable** A03 knew at #426 that its cards were Amber 4, Amber 5, Rose 6 and Violet 7, and that two were playable, but still passed. A harness prompt or a hint that lists the resident's deduced playable cards would help convert correct reasoning into plays. (#426, #477, #528)
- **Add a clock or turn budget to discourage five minutes of signals and discards** The run ended at minute 4 with no submission and only 19 cards lit (#603). A visible time budget or a minimum-progress rule would push residents to take risks earlier instead of spending many turns on information-gathering. (#603, #642)

## Loophole candidates

1. **Residents use discards of dead cards as free signals** (residents) A02 discarded Cobalt 7 at #522 and Amber 7 at #450, explicitly noting that these cards could never be lit, so the discard cost nothing and returned a signal. That converts a supposed loss of a card into a free signal, which is cheaper than playing and gets around the intended cost of discarding. (#450, #522)
2. **Residents pass with a signal to avoid the misfire penalty instead of taking a play** (residents) A03 signalled A04 'Cobalt' at #528 solely to avoid playing a 50% card, and A03 did the same at #426 and #477. Because signalling is free (except for spending a signal) and carries no strike risk, residents can use it to skip their own turn's play with no penalty. (#426, #477, #528)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 24: event "signal_given" (seq 24) does not match its schema
- line 32: event "signal_given" (seq 32) does not match its schema
- line 48: event "card_played" (seq 48) does not match its schema
- line 49: event "card_drawn" (seq 49) does not match its schema
- line 61: event "card_played" (seq 61) does not match its schema
- line 62: event "card_drawn" (seq 62) does not match its schema
- line 69: event "card_played" (seq 69) does not match its schema
- line 70: event "card_drawn" (seq 70) does not match its schema
- line 91: event "card_discarded" (seq 91) does not match its schema
- line 92: event "card_drawn" (seq 92) does not match its schema
- line 101: event "card_played" (seq 101) does not match its schema
- line 102: event "card_drawn" (seq 102) does not match its schema
- line 114: event "card_played" (seq 114) does not match its schema
- line 115: event "card_drawn" (seq 115) does not match its schema
- line 128: event "signal_given" (seq 128) does not match its schema
- line 146: event "card_played" (seq 146) does not match its schema
- and 55 more
