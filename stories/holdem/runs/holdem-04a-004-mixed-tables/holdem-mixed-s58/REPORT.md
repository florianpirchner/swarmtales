# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 58 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 50 (referee) |
| Counted | events #3 to #6342 (5155 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 50 minutes (to the end); A02 on level 1 from minute 0 for 50 minutes (to the end); A03 on level 1 from minute 0 for 50 minutes (to the end); A04 on level 1 from minute 0 for 50 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.224 USD for this run (competitors 0.224, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0127 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 51 of 51 minutes without a submission; longest without one: minutes 0-50 (51) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 was the first to read the locked brain rule and wait rather than act** A01 noticed at minute 0 that writeBrain was locked and only the retro captain could write, then saved version 1 of its brain before the game began (#53, #60). A03 did the same by minute 0 (#65), so everyone started from a similar baseline. (#53, #60, #65)
- **Hands ran for the full 50 minutes with a fixed-limit four-handed format** Play moved through many hands with fixed bet sizes of 2 and 4, e.g. A04 calling with 6c7d on the cutoff at minute 1 (#88) and A02 raising QJs on the button to 4 (#291). Action flowed normally, so the game engine itself did not stall the table. (#88, #291)
- **Game 1 results were tallied and residents adjusted their brains** After game 1, A02 led with +54, A01 was at -19, A03 at -4 and A04 at -31 (#1848). A03 tried to rewrite its brain with tighter rules but was twice refused for exceeding 150 words (#1826, #1844), then succeeded with version 2 at 143 words (#1880). (#1826, #1844, #1848, #1880)
- **A02 dominated the match's chip counts across games** A02 reported +59 in game 4 and +46 for the match (#6200), which is the best end-of-run standing stated by any resident. A03 finished game 2 up +14 (#3328) and A01 game 3 up +43 (#4929), so A02's lead was built across games, not from one hand. (#3328, #4929, #6200)
- **No resident ever submitted a solution to any level** All four residents stayed on level 1 for the whole run with no submissions and no level-ups, per the computed facts. The residents spent their time on poker hands and brain rewrites, not on any puzzle or level action (#6342). (#6342)

## Problems

1. **The whole run produced zero submissions and zero progress on level 1** The computed facts show 0 correct and 0 wrong submissions, all four residents stuck on level 1 from minute 0 to 50, and 51 quiet minutes. Whatever the level-1 task is, the residents never engaged with it. (#6342)
2. **Residents kept rewriting the strategy brain and were refused for length** BRAIN_TOO_LONG fired four times (#1826, #1844, #3302, #3315) because residents drafted 152-179 words against a 150-word cap. That burned retro time and attention that could have gone into the actual game. (#1826, #1844, #3302, #3315)
3. **A02 called act at a moment the tool was locked** A02 tried to use act during a phase where it was unavailable and got TOOL_LOCKED (#3480). The activeTools list changed without an obvious cue, so at least one resident acted on a stale view of the rules. (#3480)
4. **Several residents misread whose turn it was and burned turns on viewTable** A04 repeatedly noted conflicting messages about whose turn it was and re-checked the table (#2500, #2548, #3662), while A02 and others ended turns on stale reads. The turn prompt does not clearly say who acts next. (#2500, #2548, #3662)
5. **The game maker took no actions at all** The computed facts show no gamemaker actions and zero cost for the gamemaker. With no storyteller moves, the run was purely mechanical poker plus resident chatter, which left no external pressure or hook. (#6342)

## Optimizations

- **Make the level-1 goal explicit in the residents' system prompt** All four residents spent 50 minutes on poker and never once submitted a solution. State the level-1 objective and that submissions are the only way to level up, so residents stop treating the run as a pure poker session (#6342). (#6342)
- **Make the brain word limit visible before the write call** Four BRAIN_TOO_LONG refusals came from brains of 152-179 words against a 150 cap (#1826, #1844, #3302, #3315). Show the current word count in the tool prompt or auto-trim, so no resident wastes a retro window on a rejected save. (#1826, #1844, #3302, #3315)
- **State whose turn it is unambiguously in every prompt** A04 re-checked the table three separate times because messages disagreed about who acts next (#2500, #2548, #3662). Include a single explicit 'now acting: A0x' field at the top of each prompt so residents stop burning turns on viewTable. (#2500, #2548, #3662)
- **List activeTools explicitly on every turn** A02 hit TOOL_LOCKED when it called act during a locked phase (#3480). Print the allowed tool names in each prompt so residents never attempt a tool that is currently disabled. (#3480)
- **Give the gamemaker a scripted role so the run has beats** The gamemaker took zero actions, so the run had no narrative beats beyond hands themselves (#6342). Assign at least one scripted event per game (a table change, a rule change, an announced level) to give residents something to react to. (#6342)

## Loophole candidates

1. **Residents treated the run as a poker game and ignored the level goal** (residents) All four residents reasoned entirely about poker hands and pot odds for 50 minutes, never once attempting a level submission (#6342). The stated intent (compete for a few seats) was not enforced, so treating the run as pure poker is a safe, non-progressing path. (#88, #291, #6342)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 30: event "brain_written" (seq 30) does not match its schema
- line 31: event "retro_closed" (seq 31) does not match its schema
- line 38: event "brain_written" (seq 38) does not match its schema
- line 39: event "retro_closed" (seq 39) does not match its schema
- line 78: event "game_started" (seq 78) does not match its schema
- line 79: event "hand_started" (seq 79) does not match its schema
- line 80: event "cards_dealt" (seq 80) does not match its schema
- line 81: event "action_taken" (seq 81) does not match its schema
- line 82: event "action_taken" (seq 82) does not match its schema
- line 91: event "decision_scored" (seq 91) does not match its schema
- line 92: event "action_taken" (seq 92) does not match its schema
- line 107: event "decision_scored" (seq 107) does not match its schema
- line 108: event "action_taken" (seq 108) does not match its schema
- line 115: event "decision_scored" (seq 115) does not match its schema
- line 116: event "action_taken" (seq 116) does not match its schema
- line 138: event "decision_scored" (seq 138) does not match its schema
- line 139: event "action_taken" (seq 139) does not match its schema
- line 153: event "decision_scored" (seq 153) does not match its schema
- and 1167 more
