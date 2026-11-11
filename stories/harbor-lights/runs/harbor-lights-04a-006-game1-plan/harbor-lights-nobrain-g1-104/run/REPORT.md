# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 104 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #619 (543 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.044 USD for this run (competitors 0.044, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_SIGNALS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 and A03 open with conservative signals instead of blind plays.** A02 and A03 both open by signalling rank 1 rather than playing unknown cards: A02 marks A01's slots 2 and 4, A03 marks A01's slot 1 as Cobalt 1 (#32, #44). The signals immediately pay off one turn later when A01 plays slot 1, Cobalt 1, and it lights (#90). (#32, #44, #90)
- **A02 misfires Amber 4 and the crew takes its second strike.** A02 reasons that slot 1 must be Amber 4 and plays it, but Amber 3 was not yet on the table, so it misfires and costs 3 points (#426). A02 then says its remaining cards are Amber 3, Rose 7 and Violet 4, all playable (#426), which is the first real scoring loss of the run. (#425, #426)
- **A03 passes up a safe blind play to avoid a third strike.** A03 repeatedly discards rather than gamble on Moss 5 being in the right slot, explicitly noting three of four cards would misfire (#487, #541). This is a defensible choice but it leaves A03 frozen at 5 cards while its Moss 5 stays unplayed (#487). (#487, #541)
- **A04's signal to A02 lights Amber 3 cleanly.** A04 signals A02 that slot 1 is Amber, so A02 can play Amber 3 without guessing (#501). A02 then plays Amber 3 and it lights (#528). (#501, #528)
- **The run ends at minute 4 with the pile empty and cards still on the table.** The referee ends the run at minute 4 (#619). A03 is about to play slot 2 as Moss 5 and then slot 1 as Moss 6 (#597), and A01 has already discarded its last card to keep a signal (#569). (#569, #597, #619)
- **A01 resigns its last Cobalt 6 to a discard instead of a misfire.** A01 discards Cobalt 6 because Cobalt 5 has not been lit and a misfire would cost 3 points (#555, #569). That is a correct read of the rules but it means the card is burned and A01 has no cards left. (#555, #569)

## Problems

1. **No levels were solved and no submissions occurred in the whole run.** The computed facts show zero correct submissions, zero wrong, five quiet minutes out of five, and no level solved (#619). The run ended at minute 4 with residents still mid-discussion, so the story produced no payoff. (#619)
2. **Residents treated their own hand as unknown and burned turns on signals.** Every resident starts by reasoning about its own unknown hand and spends its first action on a signal rather than a play (#23, #44, #53, #78). The result is a slow opening with no lights until A01's Cobalt 1 at #90. (#23, #44, #53, #78, #90)
3. **A03 over-weighted strike risk and stalled on playable cards.** A03 knows Moss 5 is playable but refuses to play blind (#487) and later is refused a signal because it has none (#537). A03 then discards instead of risking a third strike (#541), so its 5s never reach the table before #619. (#487, #537, #541, #619)
4. **The rules engine refused a signal and the resident had to re-plan.** A03 tries to give a signal at #537 and the city refuses it with NO_SIGNALS (#537). The tool error NO_SIGNALS 1 in the facts matches this refusal, and there is no built-in replacement action suggested except playing or discarding. (#537)
5. **No messages between residents; all talk is private self-talk.** The facts show zero DMs, zero board posts and zero group posts, and the log contains only REASONING and SAYS TO ITSELF lines (#14, #48, #597). Residents cannot coordinate beyond the signal mechanic, so there is no negotiation or deception story. (#14, #48, #597)

## Optimizations

- **Give the run more minutes before the referee ends it.** The referee ends at minute 4 (#619) while A03 and A04 are still about to play (#590, #597). A longer run would have allowed those cards to land, which is what the story seems to want. (#590, #597, #619)
- **Reduce the blind-gamble cost or give each resident a free road test.** Residents A03 and A04 repeatedly avoid blind plays because a misfire costs 3 points (#487, #590). A lower penalty or a one-time probe would let them act on the 1-in-4 chances they keep describing. (#450, #487, #590)
- **Start each resident with a known first playable card.** Every resident opens with reasoning about its own unknown hand (#14, #23, #36, #53) and no one lights a card until #90. A seeded known card would give a faster opening turn. (#14, #23, #36, #53, #90)
- **Add a cheap public channel for claims between residents.** There are no messages at all (#48, #597) so residents can only signal by the numbered hint action. A separate public channel would let them say what they think is playable, which is the negotiation the story lacks. (#48, #597)
- **Prevent empty-hand residents from blocking further play.** A01 discards its last card and ends at zero cards (#569) while A03 and A04 still have plays (#590, #597). A rule that re-arms or skips a finished resident would make the endgame cleaner. (#569, #590, #597)

## Loophole candidates

1. **Discarding is a free way to avoid misfire penalties.** Both A01 and A04 discard rather than play risky cards, explicitly noting the misfire would cost 3 points (#555, #569, #471). Discarding is allowed at any time and returns a signal, so it is a cheaper and safer path than playing unknown cards. (#471, #555, #569)
2. **Residents can use self-talk to avoid commitment.** (residents) A01, A02, A03 and A04 all spend turns on SAYS TO ITSELF without changing the board (#32, #48, #44, #78). This lets them appear active without risking a misfire, which sidesteps the game's intent of forcing plays. (#32, #44, #48, #78)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 17: event "signal_given" (seq 17) does not match its schema
- line 26: event "card_played" (seq 26) does not match its schema
- line 27: event "card_drawn" (seq 27) does not match its schema
- line 39: event "signal_given" (seq 39) does not match its schema
- line 56: event "signal_given" (seq 56) does not match its schema
- line 65: event "card_played" (seq 65) does not match its schema
- line 66: event "card_drawn" (seq 66) does not match its schema
- line 73: event "card_played" (seq 73) does not match its schema
- line 74: event "card_drawn" (seq 74) does not match its schema
- line 86: event "signal_given" (seq 86) does not match its schema
- line 97: event "card_played" (seq 97) does not match its schema
- line 98: event "card_drawn" (seq 98) does not match its schema
- line 110: event "signal_given" (seq 110) does not match its schema
- line 121: event "signal_given" (seq 121) does not match its schema
- line 128: event "card_played" (seq 128) does not match its schema
- line 129: event "card_drawn" (seq 129) does not match its schema
- line 137: event "card_discarded" (seq 137) does not match its schema
- and 56 more
