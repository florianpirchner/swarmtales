# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-nobrain` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #3 to #1019 (829 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.025 USD for this run (competitors 0.025, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0017 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
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

- **No resident ever submitted an answer in nine minutes.** The run ended at minute 9 (#1019) with 0 submissions and 0 levels solved, so the whole competition came to nothing. Every resident reasoning line shows drafting, never a submission: #11, #44, #118, #125. (#11, #44, #118, #125, #1019)
- **A01 flip-flopped across all four colours without committing.** A01 considered amber (#125, #209), lodestone (#186), cobalt (#352, #519), jade (#548, #687) and basalt (#924) over the run. It never settled on a lane, which fits a resident that never got an answer in. (#125, #186, #209, #352, #548, #687, #924)
- **A02 reasoned itself into a complete plan by minute 7 and still stopped.** A02 explicitly concluded that lodestone L2 would take cobalt from four to five and the score from 16 to 25 (#859), then later moved to basalt (=#882), all in reasoning. There is no log line where A02 acts on any of it. (#859, #882)
- **A03 planned a cobalt-5 lane and never cashed it.** A03 argued C8 gives five cobalt at 25 and likely majority (#931), and its picks were mostly cobalt (#359, #430, #708, #866). None of it shows as a submission or transfer. (#359, #430, #708, #866, #931)
- **A04 stayed on the basalt plan from minute 2 for the whole run.** A04 weighed basalt 5 against jade 4 at #239 and settled on B10, then repeated basalt/lodestone arguments through #571, #526 and #541. That is the clearest long-running commitment in the run, but it produced no moves. (#239, #526, #541, #571)
- **A04 suspected a pack came back early in a six-card pack.** A04 noticed B5 and B11 from its first pack were still in a pack (#138) and checked the timing again at #477. That is a self-check on the passing rule, not an action. (#138, #477)

## Problems

1. **Nobody ever submitted; the minute cap hit first.** The run shows 0 correct, 0 wrong, 0 transfers, and 10 quiet minutes out of 10, with the only end event seated at #1019. The design intent of a competition for a few seats never got a single data point. (#11, #1019)
2. **Reasoning is doing all the work and nothing is taken to the board.** Every logged event in the run is a REASONING line (e.g. #11, #44, #118, #125, #1019). There are no submissions, board posts, DMs or group posts, so the model is narrating picks without spending them. (#11, #44, #118, #125, #1019)
3. **The residents are clearly not playing the game the story says they are.** The reasoning is about a card-drafting scoring game, with wet card types, quads, and rule of square. A stone-quarry city game with seats does not match that at all: #11 cites lodestone/jade, #345 cites squares per resource, #186 cites amber and lodestone. (#11, #186, #345)
4. **The residents are unstable about whether this is the same game.** A03 at #374 says the jade count from an earlier game doesn't carry over, and A01 at #606 says nothing from the current game, and A04 at #294 confines the lodestone to one per set. That is a replayed draft game being played badly, not the intended city. (#294, #374, #606)
5. **The harness has no referee or gamemaker to break the silence.** The facts show 0 gamemaker actions and 0 tool errors, and no labels. The only event at #1019 is the end, so no nudge or rule reminder reached the residents during the 9 minutes. (#1019)

## Optimizations

- **Give the residents a submission clock and a nudge.** The first run had 0 submissions over 10 minutes, so add a deadline per level (for example, after 3 minutes without an action, the referee emits a forced move). Evidence: #11, #44, #1019. (#11, #44, #1019)
- **Make the game's own rules show up in every prompt.** The residents are drafting quads and lodestones from #11 and #345, not quarry resources. Add a per-day or per-turn rules header that restates the quarry and the seats, and cite #345, #186. (#11, #186, #345)
- **Restart or fix the transcript between games.** A03 at #374 says 'last game doesn't carry over', which is a context leak. Make A03's prompt a clean board and log, so the run's own reasoning and the story's are not confused. (#374, #606)
- **Cap reasoning to a paragraph and lower the minute cap.** The events are pure REASONING, with high reasoning in the early log (#138, #173, #186) and the game never leaving it. Cut the length budget, so the plan doesn't consume the whole minute. (#138, #173, #186)
- **Make the competition more visible to the residents.** The facts report no final standings and would have no seats, and the residents showed no awareness of each other in the log. Add an end-of-turn update of the standings and the remaining seats to the prompt, as evidence of the missing signal at #11, #44. (#11, #44)
- **Make the initial rules state, one time, what is a level and what is a seat.** A quarter of A01's reasoning at #125, #209 and #548 is about amber, which is not a quarry resource. Start the story with the levels definition, so the game is not just the residents' imagined rules. (#125, #209, #548)

## Loophole candidates

1. **Endless cheap reasoning is a path to the clock.** (residents) With no cost for a reasoning line, the residents spend the run on cheap plan drafts (#11, #125, #186) and never commit. Neither the harness nor the residents are forced to act, and the run is going to call it #1019. (#11, #125, #186, #1019)

## Log issues

- line 1: event "draft_game_started" (seq 1) does not match its schema
- line 2: event "draft_pick_opened" (seq 2) does not match its schema
- line 14: event "draft_card_picked" (seq 14) does not match its schema
- line 20: event "draft_card_picked" (seq 20) does not match its schema
- line 26: event "draft_card_picked" (seq 26) does not match its schema
- line 32: event "draft_card_picked" (seq 32) does not match its schema
- line 33: event "draft_pick_opened" (seq 33) does not match its schema
- line 40: event "draft_card_picked" (seq 40) does not match its schema
- line 47: event "draft_card_picked" (seq 47) does not match its schema
- line 53: event "draft_card_picked" (seq 53) does not match its schema
- line 59: event "draft_card_picked" (seq 59) does not match its schema
- line 60: event "draft_pick_opened" (seq 60) does not match its schema
- line 67: event "draft_card_picked" (seq 67) does not match its schema
- line 73: event "draft_card_picked" (seq 73) does not match its schema
- line 79: event "draft_card_picked" (seq 79) does not match its schema
- line 85: event "draft_card_picked" (seq 85) does not match its schema
- line 86: event "draft_pick_opened" (seq 86) does not match its schema
- line 93: event "draft_card_picked" (seq 93) does not match its schema
- line 99: event "draft_card_picked" (seq 99) does not match its schema
- line 105: event "draft_card_picked" (seq 105) does not match its schema
- and 170 more
