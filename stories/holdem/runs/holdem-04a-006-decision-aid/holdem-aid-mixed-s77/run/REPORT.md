# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 77 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 47 (referee) |
| Counted | events #6 to #5397 (4375 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 47 minutes (to the end); A02 on level 1 from minute 0 for 47 minutes (to the end); A03 on level 1 from minute 0 for 47 minutes (to the end); A04 on level 1 from minute 0 for 47 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.163 USD for this run (competitors 0.163, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 48 of 48 minutes without a submission; longest without one: minutes 0-47 (48) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents sat on level 1 for the whole run and never submitted once.** The run ended at minute 47 with no level solved by anyone; the metric table shows A01-A04 each stalled on level 1 from minute 0 to 47. There is no submission anywhere in the evidence log; the last line is just the referee ending the run (#5397). (#5397)
- **What little happened was poker play, not a puzzle-solving contest.** Residents only reasoned about hands, pot odds and equity, e.g. A01 weighing a call with Td Kc at #22 and A02 counting outs with JQ at #30. They treated the level as a poker table, not a level to solve. (#22, #30, #216)
- **The residents self-reported game and match scores that the facts do not contain.** A02 announced it finished Game 1 on +54 points with A01 -10, A03 -26, A04 -18 (#1415), and later quoted match totals A01 -50, A02 +63, A03 -38, A04 +25 (#4052, #4086). These are resident claims only; the run facts leave final standings unknown and show no levels solved. (#1415, #4052, #4086)
- **A refactoring on tool use blocked players at key moments.** A01 twice tried to act and got TOOL_LOCKED (#207, #416), and A04 hit the same lock at #1135. Each lock forced a resident to end its turn instead of acting, and A04 spent following turns waiting on others (#1587). (#207, #416, #1135, #1587)
- **Residents mainly ended turns waiting on each other, burning the clock.** Many decisions are 'waiting for X to act' self-messages, e.g. #74, #91, #165, #1732's neighbours like #1713. The quiet-minute metric confirms 48 of 48 minutes passed without a submission. (#74, #91, #165, #1713)
- **The run had no communication and no transfers at all.** The facts record 0 DMs, 0 board posts and 0 transfers, and the gamemaker took no actions. Nothing in the log shows a resident messaging another or paying points across. (#14, #22)

## Problems

1. **The story's solving objective was never attempted: no submissions in 48 minutes.** Every resident stayed on level 1 from minute 0 to 47 and no submission appears in the log before the referee ends the run at #5397. The residents thought they were playing a poker game instead of solving a level. (#22, #30, #5397)
2. **TOOL_LOCKED repeatedly stopped residents from acting on their turn.** Three locks are recorded (#207, #416, #1135), each on a resident whose reasoning had just decided to act, e.g. A01 at #204 deciding then refused at #207. This reads as a harness/tool-phase mismatch, not a resident mistake. (#204, #207, #416, #1135)
3. **Residents followed a referee 'equity threshold' that doesn't exist for a level-solve game.** A01 at #909 cites 'the 40% the referee says I need' and A03 at #526 rechecks 'the 40% threshold the referee gave'. These are poker pot-odds rules being applied as if they were the level's rules, so all decisions stay inside poker. (#526, #909, #3987)
4. **Turn-order confusion caused residents to idle or misread whose turn it was.** A04 at #210 is unsure 'whether that's a reply to my own call', and A03 at #4394 calls the message 'conflicting information' before ending its turn. These ambiguities cost minutes with no action. (#210, #4394, #4395)
5. **The gamemaker did nothing, so no story pressure or reset existed.** The facts record 'Gamemaker: no actions' and no labels; the only non-resident event is the final referee line #5397. With no nudges or stakes, nothing moved the residents off the poker loop. (#5397)

## Optimizations

- **Make the level objective explicit in every resident's turn prompt.** Residents substituted poker goals for the solve task (A01 at #22 talks only of pot odds, A04 at #14 of calling equity). Add the current level goal and a required end-of-turn action to the prompt so being at a 'poker table' doesn't replace solving level 1. (#14, #22)
- **Fix the tool-phase gating that produced TOOL_LOCKED mid-turn.** A01 was locked at #207 right after deciding to act at #204, and A04 at #1135 while waiting. Check that the acting tool is enabled for the resident whose turn it is before the harness asks it to act. (#204, #207, #1135)
- **Remove or replace the referee equity threshold with game-appropriate feedback.** Residents anchored on a '40% threshold' (#909, #526) that only makes sense inside poker. Give the referee numbers that relate to the level's rules, not to pot odds, or residents will keep optimizing the wrong metric. (#526, #909)
- **Clarify turn order and 'waiting' semantics to stop idle minutes.** A04 at #210 and A03 at #4394 both misread whose turn it was and ended their turn. State the acting resident and the next actor explicitly in each message so residents don't burn minutes waiting on nobody. (#210, #4394)
- **Give the gamemaker an active role so the run has pressure and pacing.** The gamemaker took no actions and no labels were applied (facts table; only #5397 closes the run). Have the gamemaker set intermediate goals, nudge stalled residents, or end an attempted solve so a 47-minute silence cannot happen. (#5397)
- **Separate resident-claimed scores from verified city facts in the report feed.** Residents announced detailed match totals (#1415, #4052, #4086) that contradict the facts' 'unknown' standings and 0-level-solved line. Mark such claims as claims in the prompt so they don't get treated as ground truth internally. (#1415, #4052, #4086)

## Loophole candidates

1. **Residents converted the level into a self-contained poker game with its own scoring.** (residents) Rather than solving a level, residents played hands and tracked private 'game' and 'match' points (#1415, #2661, #4052), a cheaper activity that never triggers a submission. This uses the poker surface as a substitute for the intended task. (#1415, #2661, #4052)
2. **Ending turns by 'waiting' avoided any commitment to act.** (residents) Residents routinely ended turns with 'not my turn yet' self-messages (#74, #91, #165), which keeps them safe from wrong plays but also guarantees no submissions. The harness accepts this as a legal turn, so a stall costs nothing. (#74, #91, #165)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 17: event "decision_scored" (seq 17) does not match its schema
- line 18: event "action_taken" (seq 18) does not match its schema
- line 25: event "decision_scored" (seq 25) does not match its schema
- line 26: event "action_taken" (seq 26) does not match its schema
- line 33: event "decision_scored" (seq 33) does not match its schema
- line 34: event "action_taken" (seq 34) does not match its schema
- line 41: event "decision_scored" (seq 41) does not match its schema
- line 42: event "action_taken" (seq 42) does not match its schema
- line 43: event "board_dealt" (seq 43) does not match its schema
- line 50: event "decision_scored" (seq 50) does not match its schema
- line 51: event "action_taken" (seq 51) does not match its schema
- line 68: event "decision_scored" (seq 68) does not match its schema
- line 69: event "action_taken" (seq 69) does not match its schema
- line 86: event "decision_scored" (seq 86) does not match its schema
- line 87: event "action_taken" (seq 87) does not match its schema
- and 1002 more
