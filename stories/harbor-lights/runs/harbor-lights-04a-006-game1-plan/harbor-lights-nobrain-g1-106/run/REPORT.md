# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 106 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #671 (592 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 opens with a signal instead of a blind play, setting the cautious tone.** A01 spent its first turn signalling A02's slot 2 as a rank 1 rather than playing blind (#37). A02 then used that signal to play its Cobalt 1 and light it (#21, #49). The first light of the run came from cooperation, not guessing. (#21, #37, #49)
- **A04 discards a playable Moss 3 rather than risk a misfire.** A04 discarded slot 1 (Moss 3) to regain a signal, explicitly citing the 3-point cost of a misfire (#119). This discard-for-signal pattern recurs from A04 (#119, #216, #281, #641) and drives the run's slow pace. (#119, #216, #281, #641)
- **A02 misreads its own marker and discards Amber 4.** A02 believed Amber 4 was playable but discarded it by mistake, losing a card and giving back a signal (#344, #345). It then noted the gap at Amber 4 is skipped, so Amber 5 became playable (#345). (#344, #345)
- **The pile empties at minute 2 with most towers unfinished.** A01 reports the pile is empty and the paws' next cards are Amber 5, Cobalt 3, Moss 5, Rose 1, Violet 4 (#429). The remaining game becomes a pure hand-management squeeze, and A04 draws the last card at #449. (#429, #438, #449)
- **Amber and Moss both complete near minute 3.** A04 lit Amber 6 to finish Amber (#581) and A02 lit Moss 7 to finish Moss (#600). These are the only two towers the log shows completed, and neither gave points in the standings, which stay unknown. (#581, #600)
- **The run ends at minute 5 with no submissions recorded.** The referee ends the run at minute 5 (#671) with zero correct and zero wrong submissions. Residents spent their turns on signals and discards rather than plays, and the final standings are unknown. (#671)

## Problems

1. **Residents never submit a play they consider safe, stalling the run.** All four residents repeatedly discard or signal because no card is known playable (#188, #216, #281, #298, #425, #567, #641). The run enters a quiet stretch from minute 0 to 5 with no submission at all, and the pile empties (#429) before progress resumes. (#188, #216, #425, #641)
2. **Two NOT_YOUR_TURN refusals waste turns.** A03 tried to play on A01's turn (#107) and A02 tried to play on A03's turn (#458), both refused. These refusals suggest residents' internal turn tracking is unreliable, or the harness surfaces the wrong active player. (#107, #458)
3. **Residents state the game ends after four no-light turns but never act on it.** A03 notes the game ends after four consecutive turns with no light or signal (#462), yet several residents still discard playable-adjacent cards (#479, #567). The end condition is understood but does not change their discard-heavy behaviour. (#462, #479, #567)
4. **A02's playable-card reasoning is contradictory.** A02's private reasoning says Amber 4 is playable (#344), then says it discarded it without knowing (#345). The public record never states which card was discarded, so the design cannot tell whether A02 was confused or the log lost detail. (#344, #345)
5. **No story beats, messages, or scores from the harness.** Zero DMs, board posts, group posts, transfers, and gamemaker actions were recorded, and no story beats were found by the digest. The run produced almost no social or narrative texture despite four residents acting for five minutes. (#37, #100, #143)
6. **Residents never mention core motives or secret goals in the log.** The facts give every resident a persona of '-', and no log line references a motive, goal, or betrayal. The design intent of competitive seats never surfaces, so the run reads as pure puzzle play. (#37, #244, #547)

## Optimizations

- **Add a minimum play requirement to break discard-only loops.** Several residents discard repeatedly for signals when a known playable card exists in another hand (#119, #216, #425, #567). The harness could nudge the current resident to play a known-safe card before discarding a second time in a row, since playable cards (Moss 3, Violet 2, Moss 5) were thrown away (#119, #216, #479). (#119, #216, #479)
- **Fix the active-player signal to stop NOT_YOUR_TURN refusals.** A03 (#107) and A02 (#458) tried to play on another resident's turn. The harness should either expose the current turn clearly to the resident before its action or re-prompt on refusal so the turn is not wasted. (#107, #458)
- **Give residents personas and a reason to care about seats.** No resident has a persona or shows a motive anywhere in the log (#37, #244, #547). The next version should deal explicit secret goals into the prompt and show them firing, or the competitive framing is wasted. (#37, #244, #547)
- **Surface the no-light end condition to residents each turn.** A03 identified the four-turn end condition (#462) but the rest of the table kept discarding. The harness should print the current no-light counter to every resident so they can weigh a safe play against a discard that risks ending the run. (#462, #479, #567)
- **Emit a clear discard record for each discard.** A02's discard of Amber 4 is described unclearly (#344, #345), making it hard to audit. The log should record the discarded card name and slot as a fact, not as reasoning. (#344, #345)
- **Make the reference end reproducible before the pile empties.** The run ended at minute 5 (#671) before any tower scoring or submission summary appeared. The referee should end only after a stall resolution or at a fixed minute with a play summary attached. (#429, #671)

## Loophole candidates

1. **Residents use discards as a free hint engine instead of playing.** (residents) Discarding for a signal repeatedly converted unplayable cards into safe hints without scoring risk (#298, #425, #567), letting the table burn the deck while avoiding misfires. This trades the point economy for information with no downside until the pile empties at #429. (#298, #425, #567)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 24: event "card_played" (seq 24) does not match its schema
- line 25: event "card_drawn" (seq 25) does not match its schema
- line 33: event "signal_given" (seq 33) does not match its schema
- line 44: event "card_played" (seq 44) does not match its schema
- line 45: event "card_drawn" (seq 45) does not match its schema
- line 66: event "signal_given" (seq 66) does not match its schema
- line 79: event "signal_given" (seq 79) does not match its schema
- line 86: event "card_played" (seq 86) does not match its schema
- line 87: event "card_drawn" (seq 87) does not match its schema
- line 95: event "card_discarded" (seq 95) does not match its schema
- line 96: event "card_drawn" (seq 96) does not match its schema
- line 113: event "card_played" (seq 113) does not match its schema
- line 114: event "card_drawn" (seq 114) does not match its schema
- line 130: event "signal_given" (seq 130) does not match its schema
- line 137: event "card_played" (seq 137) does not match its schema
- line 138: event "card_drawn" (seq 138) does not match its schema
- and 59 more
