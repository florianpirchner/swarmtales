# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `liars-dice` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #5 to #3432 (2909 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end); A02 on level 1 from minute 0 for 24 minutes (to the end); A03 on level 1 from minute 0 for 24 minutes (to the end); A04 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.197 USD for this run (competitors 0.197, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0061 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 34, BRAIN_TOO_LONG 6 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents fail their first brain write for exceeding the word limit.** A01 and A02 have writeBrain refused at minute 0 because their brains are 157 and 167 words against a 150 limit (#55, #60); A01's later attempt also fails at 171 words (#1068). The brain tool is locked again right after these refusals (#78, #84), so the opening phase costs turns without producing a usable strategy. (#55, #60, #78, #1068)
- **The first game plays out normally from minute 1.** Residents reason through dice odds, bid and call liar through many rounds in game 1 (#140, #223, #517). A04 wins game 1, A01 takes second, A03 third and A02 last (#1095, #1108). Report metrics show 0 correct and 0 wrong submissions and no level-ups, which contradicts the in-log result of a finished game. (#140, #223, #517, #1095, #1108)
- **Every bid and liar call is repeatedly refused as TOOL_LOCKED.** Residents try to act on their turn and are told the tool is unavailable (#252, #288, #473, #641, #742, #768). There are 34 TOOL_LOCKED refusals across the run. Many attempts happen just before the resident's own turn comes around, suggesting a turn-detection mismatch rather than a rules misunderstanding (#186, #381). (#252, #288, #473, #641, #742, #768)
- **Rules confusion about wild ones causes repeated bad calls.** A03 loses a die after miscounting ones as wild (#178, #224). A02 later notes the same error and rewrites it into its brain (#528, #1108). Several liar calls are made on odds the residents themselves estimate near 50% or worse (#552, #941). (#178, #224, #528, #941)
- **Two brain rewrites in the retro window are refused as too long.** During the retro window after game 2, both A03's and A02's rewrite attempts hit BRAIN_TOO_LONG at 165 and 172 words (#2208, #2214). The earlier retry by A02 in the game-1 retro is also refused at 160 words (#1047). The 150-word cap keeps rejecting lessons the residents already wrote. (#1047, #2208, #2214)
- **Game 3 runs with no level-ups and no gamemaker input.** All of game 3 unfolds with the residents reasoning and bidding (#2855, #3240, #3411). The run ends at minute 24 without any level solved (#3432). The gamemaker logs no actions at all. (#2855, #3240, #3411, #3432)

## Problems

1. **No submissions and no progress in the reported metrics.** The facts show 0 correct and 0 wrong submissions, no levels solved, and every resident stuck on level 1 for the full 24 minutes. Yet the log shows full dice games played and results recorded (#1095, #2243, #3363). The report's metrics and the log do not agree. (#57, #1095, #2243, #3363, #3432)
2. **The brain tool's 150-word cap blocks the residents' main learning loop.** Every brain write in the run that was attempted fails on length (#55, #60, #1047, #1068, #2208, #2214), giving 6 BRAIN_TOO_LONG refusals. Residents spend reasoning turns counting words instead of playing. (#55, #60, #1047, #1068, #2208, #2214)
3. **TOOL_LOCKED refusals fire when residents think it is their turn.** Residents call bid or liar after concluding that the order has reached them (#186, #381, #681) and get TOOL_LOCKED (#252, #288, #641). The most common failure in the run is this error class (34 occurrences), so the turn model and the residents' model of it disagree. (#186, #252, #288, #381, #641, #681)
4. **Residents misread the turn order and pass on their real turn.** Residents repeatedly end a turn because they believe someone else acts first (#172, #1356, #1936), then hit TOOL_LOCKED right after. The rules are never stated plainly enough for them to track order across seats. (#172, #1356, #1936)
5. **The gamemaker is silent for the whole run.** The facts record 0 gamemaker actions and 0 messages. No board posts or groups ever form, so the social layer the story is built for never appears. (#104, #3432)
6. **The run ends with no ranking despite a real winner.** The facts list final standings as unknown and ranks as dashes, while the log names A04 the game-1 and game-2 winner (#1095, #2252). The result bookkeeping is missing from the computed facts. (#1095, #2252, #3432)

## Optimizations

- **Raise or remove the brain word cap.** Residents lose their learning updates because 122-172 word brains exceed 150 (#55, #60, #1047, #2208). Either raise the limit to about 200 words or cut the residents' required sections. (#55, #60, #1047, #2208)
- **Align TOOL_LOCKED with a clear, announced turn order.** 34 refusals with TOOL_LOCKED show a mismatch (#252, #288, #473, #641). State whose turn it is in each prompt and only expose bid/liar on the acting resident's turn. (#252, #288, #473, #641)
- **Give residents an explicit out-of-turn hold action.** Residents end turns hoping it is not theirs, then act too late (#172, #1356, #1936). A clear pass or wait tool would stop the churn. (#172, #1356, #1936)
- **Reconcile the report metrics with the event log.** The facts say 0 submissions and no levels, but the log has games, bids and winners (#1095, #2243, #3363). Compute submissions from the actual bid and liar events, or fix the event-to-metric binding. (#57, #1095, #2243, #3363)
- **Have the gamemaker produce at least one intervention.** The gamemaker shows 0 actions (#104, #3432). Schedule a seeded hint or board post each game to populate the social layer. (#104, #3432)
- **Publish final standings in the facts.** Final standings are unknown even though A04 wins and the points ladder is logged (#1095, #2252, #2261). Emit a rank row from the game results. (#1095, #2252, #2261)

## Loophole candidates

1. **Residents treat 'ending the turn' with text as a legal action.** (residents) Several residents write a phrase like 'ending my turn' instead of calling the wait tool (#1778, #1896, #3091), which costs no resource but does not move the game. This lets them stay in a game without acting. (#1778, #1896, #3091)
2. **Residents use their own dice to justify near-certain bids** (residents) Some bids are declared 'certain' from the bidder's own hand (#714, #1459, #2658), which is a safe raise that pushes the risk onto the next seat rather than an assessment of the table. (#714, #1459, #2658)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 65: event "brain_written" (seq 65) does not match its schema
- line 66: event "retro_closed" (seq 66) does not match its schema
- line 73: event "brain_written" (seq 73) does not match its schema
- line 74: event "retro_closed" (seq 74) does not match its schema
- line 92: event "brain_written" (seq 92) does not match its schema
- line 93: event "retro_closed" (seq 93) does not match its schema
- line 132: event "dice_game_started" (seq 132) does not match its schema
- line 133: event "dice_rolled" (seq 133) does not match its schema
- line 134: event "dice_round_started" (seq 134) does not match its schema
- line 143: event "dice_decision_scored" (seq 143) does not match its schema
- line 144: event "dice_bid" (seq 144) does not match its schema
- line 154: event "dice_decision_scored" (seq 154) does not match its schema
- line 155: event "dice_bid" (seq 155) does not match its schema
- line 163: event "dice_decision_scored" (seq 163) does not match its schema
- and 503 more
