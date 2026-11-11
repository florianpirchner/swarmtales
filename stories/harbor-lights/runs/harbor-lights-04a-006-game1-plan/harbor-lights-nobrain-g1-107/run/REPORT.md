# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 107 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #690 (611 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.054 USD for this run (competitors 0.054, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew lit one tower after another only after spending nearly every early turn on signals.** From minute 0 the residents were blind to their own hands and built the game around hints and discards for signals (#59, #67, #98). The first real light-up came with A02's Rose 1 at #188, and by minute 3 the crew was lighting cards almost every turn (#539, #564, #595, #616, #627). (#59, #67, #98, #188, #627)
- **A02's blind play in minute 0 struck out and set the risk tone for the whole run.** A02 played slot 1 blind and hit Cobalt 4 as a misfire (#105), the first of two strikes that made everyone else cost a misfire at 3 points (#198, #207). After that the residents refused blind plays repeatedly. (#105, #198, #207)
- **A01's Moss misfire put the crew at two strikes and shifted everyone to cautious signaling.** A01 played slot 3 expecting Moss 1 but it was Moss 6, a misfire (#194), bringing the penalty to 3 points with two strikes (#194). Residents then cited the 3-point cost to justify holding rather than gambling (#198, #291, #299). (#194, #198, #291, #299)
- **A03's discard of playable Amber 4 was the one self-acknowledged error.** A03 discarded slot 1, which turned out to be Amber 4, a card that could have been lit (#418, #419), and called it a mistake worth owning (#419). (#418, #419)
- **A04 stalled for minutes holding three indistinguishable Violet cards, passing her turn repeatedly.** A04 held Violet 4, 6 and 7 with only Violet 4 playable, could not tell which slot held it, and chose to pass with signals rather than risk a 3-point misfire (#452, #510, #557, #608, #631). She only resolved it by discarding and ended the run playing the last card, Violet 6 (#669, #682). (#452, #510, #557, #608, #669, #682)
- **The run ended in minute 5 with none of the four residents having solved a level.** The referee stopped at minute 5 with every resident still at level 1 and no submissions recorded (#690). The quiet-minute count shows no submission in minutes 0 through 5. (#690)

## Problems

1. **No resident ever submitted or advanced a level in the whole run.** All four residents stayed at level 1 with no level-ups and no submissions, and the run was cut off at minute 5 (#690). The core competitive loop (solve levels, compete for seats) never started. (#690)
2. **The cooperative signaling dynamic crowded out the competitive game the design needs.** Residents spent most turns giving hints to each other and tracked 'the crew's' lit cards and signal tokens as a shared pool (#59, #299, #358). The participants acted as a cooperative team rather than competitors for a few seats, which the story design did not intend. (#59, #299, #358)
3. **Residents were blind to their own hands, which made almost every turn a pass.** A04 repeatedly stated 'my own cards are still unknown' and passed rather than play (#84, #122, #174); A03 likewise held a Cobalt 2/3/7 slot it could not identify (#109, #223). The hidden-hand setup produced long stretches with no plays. (#84, #109, #122, #174, #223)
4. **The whole run was one quiet minute-stretch with no submissions.** The metrics show 6 of 6 quiet minutes and no submission in minutes 0-5. This is a stall caused by the residents' risk-avoidance and blind hands, not by any tool error. (#690)

## Optimizations

- **Give residents partial knowledge of their own cards at the start.** The blind-hand mechanic caused most turns to be signals or discards instead of plays (#52, #98, #452). Granting each resident one revealed card at start would let the first plays happen without gambling. (#52, #98, #452)
- **Reduce or remove the 3-point misfire penalty to encourage play attempts.** Residents cited a 3-point misfire cost to justify holding their hands (#207, #510, #608). A lighter penalty would convert their hesitation into actual plays and advance the game. (#207, #510, #608)
- **Make the cooperative-versus-seat tension explicit in the story design.** The residents consistently treated the game as one crew lighting a shared tower (#67, #358, #627) rather than rivals for a few seats. The next story should state the competitive frame so signals do not trivially help opponents. (#67, #358, #627)
- **Add a fallback resolution when a resident holds only indistinguishable cards.** A04 stalled for minutes with Violet 4, 6 and 7, unable to identify her only playable card (#452, #608, #669). A rules-based nudge (e.g., a free reveal after two passed turns) would prevent such dead-ends. (#452, #608, #669)

## Loophole candidates

1. **Residents used free signals to stall indefinitely instead of playing.** Giving a signal costs no points (#510), so A04 repeatedly passed with signals while holding an unidentifiable playable card (#525, #557, #581, #608, #631). This let her avoid the risk of a misfire without penalty, tying up turns. (#510, #525, #557, #581, #608, #631)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 26: event "card_played" (seq 26) does not match its schema
- line 27: event "card_drawn" (seq 27) does not match its schema
- line 36: event "signal_given" (seq 36) does not match its schema
- line 55: event "signal_given" (seq 55) does not match its schema
- line 62: event "card_played" (seq 62) does not match its schema
- line 63: event "card_drawn" (seq 63) does not match its schema
- line 75: event "card_played" (seq 75) does not match its schema
- line 76: event "card_drawn" (seq 76) does not match its schema
- line 91: event "card_discarded" (seq 91) does not match its schema
- line 92: event "card_drawn" (seq 92) does not match its schema
- line 101: event "signal_given" (seq 101) does not match its schema
- line 116: event "card_discarded" (seq 116) does not match its schema
- line 117: event "card_drawn" (seq 117) does not match its schema
- line 134: event "card_discarded" (seq 134) does not match its schema
- line 135: event "card_drawn" (seq 135) does not match its schema
- line 142: event "signal_given" (seq 142) does not match its schema
- and 59 more
