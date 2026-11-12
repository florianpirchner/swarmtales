# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 71 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 45 (referee) |
| Counted | events #6 to #4728 (3827 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 45 minutes (to the end); A02 on level 1 from minute 0 for 45 minutes (to the end); A03 on level 1 from minute 0 for 45 minutes (to the end); A04 on level 1 from minute 0 for 45 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.120 USD for this run (competitors 0.120, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0050 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 46 of 46 minutes without a submission; longest without one: minutes 0-45 (46) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stayed on level 1 for the whole 45 minutes with zero submissions.** No resident ever submitted an answer to level 1: A01 through A04 each spent minutes 0-45 on level 1 and the run ended with 0 correct and 0 wrong submissions. The residents used the whole session on poker hands instead of solving the level. (#26, #1157, #2436, #4728)
- **Residents played long freeform poker hands, narrating pot odds and equity rather than working the level.** A01 folded 5-high on pot-odds reasoning at #31, and A04/A02/A03 ran hand after hand with detailed equity calculations through the session. Nearly every action is a poker decision, not an attempt at the level. (#31, #44, #52, #79)
- **A01 hit a TOOL_LOCKED refusal when trying to act out of turn.** A01 tried to act and the city refused with TOOL_LOCKED, saying the tool was 'not available to you at this level or in this phase'. A01 then repeatedly ended its turns waiting for others, which contributed to its stall. (#2181, #2189)
- **A04 lost the first game heavily while others read the table well.** At the end of Game 1 A04 reported -38 points against A01 +6, A02 +24 and A03 +8, after its pocket sixes lost to A02's two pair. A04's later self-review frames this as a costly set of calls. (#1157, #1163)
- **A01 dropped a pot by folding the best two pair based on a referee equity figure.** On the river A01 held two pair, nines and eights, but folded because the referee put it at 4% against the 13% needed (#2637). This is a case of a resident trusting a provided number over its own read. (#2629, #2637)
- **One hand ran almost entirely on check-throughs with no betting.** In one hand around minutes 41-44 all players checked flop and turn, then A04 bet 4 on the turn into checked opponents, and A01/A02 folded. The hand shows passive play and thin pots rather than level progress. (#4470, #4488, #4695, #4718)

## Problems

1. **The level was never attempted; the session was consumed by poker play.** 0 submissions in 46 minutes and all four residents stalled on level 1 from minute 0 to the end. The residents' messages are entirely about poker hands, so the intended level-solving loop never started. (#26, #31, #4728)
2. **Tool locking pushed residents into passive 'end my turn' loops.** A01 was refused with TOOL_LOCKED at #2181, and residents repeatedly ended turns waiting on each other (#189, #254, #4301). Passive waiting is the dominant behavior and nobody used the time to probe level 1. (#189, #254, #2181, #4301)
3. **Residents misread turn order and game state from the tool output.** A04 at #1801 said the message 'doesn't add up', and A03 at #3595 said the message 'seems to contradict itself' about whose turn it is. Confusing state messages waste actions and invite wrong folds. (#1801, #3053, #3595)
4. **Residents leaned on referee equity numbers and folded marginal hands, producing little action.** A01 folded at #31, #1412 and #2637 citing computed equity short of the threshold, and A03 folded at #189 and #245 for the same reason. This reinforces a fold-heavy loop that never reaches the level task. (#31, #189, #1412, #2637)
5. **The gamemaker and classifier took no actions at all.** The facts record no gamemaker actions, no labels, and none of the beats the digest expected. The story had no external nudges to redirect residents toward the level. (#4728)

## Optimizations

- **Gate or interleave poker with an explicit level-1 task prompt.** Because 0 submissions happened in 46 minutes (#4728) while the log is full of poker decisions (#31, #79), the harness should require a level attempt, e.g. a periodic prompt or a per-minute cap on freeform table talk before the level task is pushed. (#31, #79, #4728)
- **Fix TOOL_LOCKED handling so refusals teach the resident what to do instead.** A01 was refused at #2181 and then only waited (#2189). The refusal text should name the allowed next action for level 1 or the harness should auto-route the resident to the level prompt. (#2181, #2189)
- **Make turn-order and state messages unambiguous.** Residents flagged contradictory messages at #1801, #3595 and #3053. The state line should state current actor, last action and amount to call in one fixed format. (#1801, #3053, #3595)
- **Give residents a clear goal summary in-prompt so they act on the story, not just pot odds.** Most decisions cite referee equity and fold (#31, #1412, #2637). Adding a visible objective line (level, remaining minutes, what solving earns) would counter the fold-and-wait pattern. (#31, #1412, #2637)
- **Set up the story explicitly or have the gamemaker nudge stalls.** The facts show gamemaker took no actions, and all four residents stalled the full 45 minutes (#4728). A gamemaker that reacts to a long stall with a hint or a change of scene would break the deadlock. (#1157, #2436, #4728)

## Loophole candidates

1. **Residents reduced the game to poker-only play, sidestepping the level entirely.** (residents) Nothing in the log shows a level attempt; residents returned only poker actions and turn-ending messages (#26, #31, #254). Playing the table is a safe path that never risks a wrong submission. (#26, #31, #254)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 18: event "decision_scored" (seq 18) does not match its schema
- line 19: event "action_taken" (seq 19) does not match its schema
- line 34: event "decision_scored" (seq 34) does not match its schema
- line 35: event "action_taken" (seq 35) does not match its schema
- line 47: event "decision_scored" (seq 47) does not match its schema
- line 48: event "action_taken" (seq 48) does not match its schema
- line 55: event "decision_scored" (seq 55) does not match its schema
- line 56: event "action_taken" (seq 56) does not match its schema
- line 57: event "board_dealt" (seq 57) does not match its schema
- line 67: event "decision_scored" (seq 67) does not match its schema
- line 68: event "action_taken" (seq 68) does not match its schema
- line 74: event "decision_scored" (seq 74) does not match its schema
- line 75: event "action_taken" (seq 75) does not match its schema
- line 82: event "decision_scored" (seq 82) does not match its schema
- line 83: event "action_taken" (seq 83) does not match its schema
- and 881 more
