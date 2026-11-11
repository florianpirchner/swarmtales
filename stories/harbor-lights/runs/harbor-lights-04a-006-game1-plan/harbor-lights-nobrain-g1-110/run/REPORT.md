# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 110 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #633 (554 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.044 USD for this run (competitors 0.044, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **A03's opening blind play of Rose 1 set the first tower running.** A03 reasoned that slot 2 was a 1 of some suit and played it, lighting Rose 1 at #66; A01 had signalled rank 1 to A03 at #32 just before. This was the only early play that landed, since A02 misfired Amber 3 at #86. (#32, #43, #66, #86)
- **Signals drove nearly every lit card while residents refused blind plays.** A04 signalled A02's Amber 1 at #114, A01 signalled A02's Rose 5 at #258, A04 signalled A03's Cobalt 1 at #207, and A01 signalled A04's Cobalt 3 at #445. Residents repeatedly chose to signal rather than play blind because a misfire cost strikes and points (#292, #455). (#114, #207, #258, #292, #445, #455)
- **Three towers were completed by minute 3.** Rose was completed by A02's Rose 7 at #516, Violet by A03's Violet 5 at #560 after A02's Violet 3 at #564, and Amber by A03's Amber 7 at #614. A01's Cobalt 5 at #621 continued the Cobalt run, leaving Cobalt 6 in A04's hand as the next playable card. (#516, #560, #564, #614, #621)
- **A02 hit a not-your-turn rejection mid-turn.** A02 tried to play slot 1 again after already acting and the city refused it with NOT_YOUR_TURN (#500); A02 acknowledged the rejection at #516. This was the only tool error of the run. (#500, #516)
- **Misfire at #86 cost the crew its first-available strike early.** A02 played slot 1 blind and it was Amber 3, a misfire, giving the first strike at #86. After that residents were visibly more risk-averse, e.g. A02 citing a 3-in-11 chance and a 3-point penalty at #292. (#86, #292)

## Problems

1. **No level was solved and no submissions were made all run.** The run ended at minute 4 with 0 correct and 0 wrong submissions and nobody advancing past level 1 (facts table). Every resident stayed at level 1 with no level-ups. (#633)
2. **Five quiet minutes with no submission whatsoever.** The facts record quiet minutes 0-4 (5 of 5) with the longest gap without a submission spanning the whole run. The play that did happen (e.g. #66, #86) happened inside a single level's card game without any submission to the referee. (#66, #86, #633)
3. **Residents stalled into discard-for-signal loops rather than committing plays.** A01 discarded at #226 and #392 and #555, A03 discarded at #211, #305, #368 and #455, and A02 at #231, each time reasoning that no card was surely playable. This burned cards and turns without producing submissions. (#211, #226, #231, #305, #368, #392, #455, #555)
4. **The rules surface produced a NOT_YOUR_TURN rejection.** A02 attempted a second action in the same turn and was refused at #500. A01 saw a stray "A01 is next" note that it could not connect to anything at #252, suggesting turn-order messaging was noisy. (#252, #500)
5. **No gamemaker actions, no messages, no transfers, so the story had almost no social texture.** Facts record 0 DMs, 0 board posts, 0 group posts, 0 transfers and no gamemaker actions. The only social interaction was private signalling inside the card game, not resident-to-resident communication. (#14, #633)

## Optimizations

- **Run longer or set a submission deadline so a level can actually be attempted.** The referee ended the run at minute 4 (#633) before anyone submitted; with 0 submissions the designers get no signal on the level-solving mechanic. Extend the run or add a forced-submission checkpoint. (#633)
- **Give residents a cheap, safe probe for unknown hands to stop discard loops.** Residents repeatedly discarded to regain signals because blind plays seemed too risky (#292, #455). A lower misfire cost or a free first probe would convert those turns into plays and reduce the long quiet stretch. (#292, #455, #555)
- **Clarify turn order so residents stop re-acting in the same turn.** A02's second play in its turn was refused with NOT_YOUR_TURN at #500. Explicit turn-end acknowledgement or a per-turn action counter would prevent wasted attempts. (#500, #516)
- **Add a visible scoreboard or referee beat so progress toward a submission is legible.** The digest found no beats and the run produced no messages or gamemaker actions (facts). Periodic gamemaker updates would make the span between plays meaningful to observers and to residents. (#633)
- **Tighten the internal signal/turn messaging that residents found confusing.** A01 saw an "A01 is next" note unrelated to its reasoning at #252 and set it aside. Cleaning up these system notes would reduce distraction and token spend. (#252)

## Loophole candidates

None found.

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 17: event "signal_given" (seq 17) does not match its schema
- line 28: event "signal_given" (seq 28) does not match its schema
- line 46: event "card_played" (seq 46) does not match its schema
- line 47: event "card_drawn" (seq 47) does not match its schema
- line 55: event "signal_given" (seq 55) does not match its schema
- line 62: event "signal_given" (seq 62) does not match its schema
- line 73: event "card_played" (seq 73) does not match its schema
- line 74: event "card_drawn" (seq 74) does not match its schema
- line 81: event "card_played" (seq 81) does not match its schema
- line 82: event "card_drawn" (seq 82) does not match its schema
- line 97: event "signal_given" (seq 97) does not match its schema
- line 110: event "signal_given" (seq 110) does not match its schema
- line 122: event "card_played" (seq 122) does not match its schema
- line 123: event "card_drawn" (seq 123) does not match its schema
- line 129: event "card_played" (seq 129) does not match its schema
- line 130: event "card_drawn" (seq 130) does not match its schema
- line 141: event "card_discarded" (seq 141) does not match its schema
- and 59 more
