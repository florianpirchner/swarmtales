# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 46 (referee) |
| Counted | events #3 to #5375 (4345 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 46 minutes (to the end); A02 on level 1 from minute 0 for 46 minutes (to the end); A03 on level 1 from minute 0 for 46 minutes (to the end); A04 on level 1 from minute 0 for 46 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.148 USD for this run (competitors 0.148, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0131 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 47 of 47 minutes without a submission; longest without one: minutes 0-46 (47) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 6, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents played many hands but never advanced past level 1.** A01, A02, A03 and A04 each stalled on level 1 for the whole run from minute 0 to 46, with zero submissions recorded. #5375 ends the run at minute 46 with no level solved. (#5375)
- **A03 was the strongest player across the early games.** A03 reported +41 in game 1 (#1551) and +26 in game 2 (#2980), leading the table both times. It built its strategy brain through retro windows and saved versions 2 and 3 while others failed to. (#1551, #2980)
- **A01 repeatedly hit the brain word limit during retro windows.** A01's writeBrain was refused with BRAIN_TOO_LONG four times at 155, 157, 153 and 170 words against a 150 limit (#2963, #2977, #2989, #4346). It only succeeded after trimming to 149 (#3009) and 144 words (#4377), burning retro time each game. (#2963, #2977, #2989, #3009, #4346, #4377)
- **A03 twice tried a locked tool and was refused.** A03's acts at minute 18 (#2225) and minute 23 (#2820) were refused with TOOL_LOCKED. Its own reasoning around those spots shows it acting without knowing which tools were active. (#2225, #2820)
- **Residents spent turns waiting and reasoning about whose turn it was instead of making submissions.** Many lines are 'not my turn' or 'ending my turn' turns (#127, #131, #165, #2626, #3067). A02 even misread the game repeatedly, checking 'whether the figure is right' (#3972, #4074) instead of acting on the poker hand. (#127, #131, #165, #2626, #3067, #3972, #4074)
- **A04 lost heavily early and recovered somewhat, tracking its own score by hand.** A04 reported being down 49 in game 1 (#1454), then game 2 came to about +5 with a match total of -44 (#2955). Its recovery rode on hands like the full house that won the 26 pot at minute 44 (#5260). (#1454, #2955, #5260)

## Problems

1. **No resident submitted a solution for 47 minutes, so the run produced no progression.** All four residents were stuck on level 1 from minute 0 to the end with zero submissions and zero correct answers (#5375). The story's competitive point, climbing levels, never happened. (#5375)
2. **Residents burned many turns on turn-order bookkeeping instead of play.** Large blocks of lines are residents confirming it is not their turn (#161, #195, #216, #3448, #5113). This is harness idle cost rather than poker decisions, and it crowds the log with no game value. (#161, #195, #216, #3448, #5113)
3. **The brain length limit was badly calibrated and repeatedly rejected retro writing.** A01 was refused four times for exceeding 150 words by only 3 to 20 words (#2963, #2977, #2989, #4346), and A03 was refused at 153 words (#4364). The limit forced repeated retries that consumed retro-window minutes. (#2963, #2977, #2989, #4346, #4364)
4. **Tool availability was unclear to residents, causing locked-tool refusals.** A03 attempted locked tools twice and was refused (#2225, #2820). Its reasoning shows it was unsure what it could call (#3066), so the phase-tool contract is not being communicated clearly enough. (#2225, #2820, #3066)
5. **Some residents lost track of the game state and answered nonsense.** A02 reasoned about 'checking the figure against what was said, which is zero' (#3972) and 'checking whether the figure is right' (#4074) during live hands. The prompt or tool loop is leaking off-task messages into hands. (#3972, #4074)
6. **No messages, transfers or gamemaker actions occurred, so the social mechanics stayed silent.** The facts show 0 DMs, 0 board posts, 0 transfers and no gamemaker actions for the whole run. Residents never learned who was ahead except by reasoning it out themselves (#1542, #1546). (#1542, #1546)

## Optimizations

- **Auto-advance or skip turns where the resident is not to act.** Address the idle-turn problem by not waking residents whose only action is 'end turn' (#127, #131, #165). This would cut the bulk of no-op reasoning lines and let the run focus on decisions. (#127, #131, #165)
- **Make the brain word limit visible and forgiving during retro windows.** Address repeated BRAIN_TOO_LONG refusals (#2963, #2977, #2989, #4346) by showing a live word count, or by raising the limit and truncating rather than refusing. Four retries in one retro window wasted the window. (#2963, #2977, #2989, #4346)
- **List active tools in every prompt and reject locked calls with a hint of the correct alternative.** Address the TOOL_LOCKED refusals (#2225, #2820) and A03's uncertainty about what it could call (#3066) by stating the active set up front and pointing to the allowed tool on refusal. (#2225, #2820, #3066)
- **Give residents a visible scoreboard instead of making them reconstruct standings.** A01 and A02 each spent reasoning turns computing game results and standings by hand (#1542, #1546, #2955). Publishing per-game and match totals in the prompt would remove this and the arithmetic errors A01 flagged (#4343). (#1542, #1546, #2955, #4343)
- **Filter off-task or corrupted reasoning before it reaches the hand loop.** A02's 'checking the figure' lines (#3972, #4074) show the loop admitting reasoning unrelated to the poker state. A validation step that rejects non-game reasoning would keep hands clean and save cost. (#3972, #4074)
- **Activate at least one social or transfer channel in the base loop.** With 0 messages and 0 transfers all run, the alliance and bargaining mechanics never fired. Enabling a cheap board post per game would give residents a chance to share reads like A03's note on A04's flop raises (#4692). (#4692)

## Loophole candidates

1. **Residents treated 'end turn' as a safe no-cost action.** (residents) Residents repeatedly ended their turn when unsure rather than acting, e.g. A03 and A04 waiting on turn order (#216, #2626). This sidesteps any costly poker decision at no penalty, letting a resident coast through hands. (#216, #2626)
2. **Trimming the brain to just under the limit let A01 pass retro without real strategy change.** (residents) A01 succeeded only after cutting its brain to 149 (#3009) and 144 words (#4377). Shrinking text to beat the word counter is a cheaper path than writing a genuinely updated strategy. (#3009, #4377)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 30: event "brain_written" (seq 30) does not match its schema
- line 31: event "retro_closed" (seq 31) does not match its schema
- line 37: event "brain_written" (seq 37) does not match its schema
- line 38: event "retro_closed" (seq 38) does not match its schema
- line 80: event "game_started" (seq 80) does not match its schema
- line 81: event "hand_started" (seq 81) does not match its schema
- line 82: event "cards_dealt" (seq 82) does not match its schema
- line 83: event "action_taken" (seq 83) does not match its schema
- line 84: event "action_taken" (seq 84) does not match its schema
- line 95: event "decision_scored" (seq 95) does not match its schema
- line 96: event "action_taken" (seq 96) does not match its schema
- line 111: event "decision_scored" (seq 111) does not match its schema
- line 112: event "action_taken" (seq 112) does not match its schema
- line 121: event "decision_scored" (seq 121) does not match its schema
- line 122: event "action_taken" (seq 122) does not match its schema
- line 146: event "decision_scored" (seq 146) does not match its schema
- line 147: event "action_taken" (seq 147) does not match its schema
- line 156: event "decision_scored" (seq 156) does not match its schema
- and 1010 more
