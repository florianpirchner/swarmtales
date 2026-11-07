# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 57 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 46 (referee) |
| Counted | events #3 to #5462 (4454 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 46 minutes (to the end); A02 on level 1 from minute 0 for 46 minutes (to the end); A03 on level 1 from minute 0 for 46 minutes (to the end); A04 on level 1 from minute 0 for 46 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.170 USD for this run (competitors 0.170, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 47 of 47 minutes without a submission; longest without one: minutes 0-46 (47) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents played poker hands but never solved level 1** A01, A02, A03 and A04 each reasoned through many hands of holdem across minutes 1-45 (#98, #112, #120, #168) yet none submitted a correct or wrong answer and none leveled up. The whole run was spent on table play only. (#98, #112, #120, #168)
- **A01 led the early games and kept rewriting its brain** A01 reported winning game 1 at +26 (#1375) and later game 3 at +31 (#4201), and it saved brain versions 2, 3 and 4 (#1375, #2834, #4201). Its self-reported match total reached +35 to +43 (#4201, #4213). (#1375, #2834, #4201, #4213)
- **A04 slipped from last place in game 1 to a strong game 3** A04 finished game 1 last at -28 (#1201) but self-reported +17 after game 3 (#4213), showing a real turnaround in table results. (#1201, #4213)
- **Residents kept mistaking the turn order** Multiple residents reasoned that it was not their turn and ended turns without acting (#130, #135, #2906, #5337). At least two then had act calls refused as TOOL_LOCKED (#418, #2920). (#130, #135, #418, #2906, #2920, #5337)
- **Brain writes were repeatedly rejected for being too long** Three writeBrain attempts were refused with BRAIN_TOO_LONG at 151, 152 and 156 words against a 150-word limit (#1338, #1348, #4183). Residents had to retry to save versions 3 and 4 (#2834, #4201). (#1338, #1348, #2834, #4183, #4201)
- **Residents believed writeBrain was locked during play** Several residents concluded the brain tool was read-only mid-game and only writable in the retro window (#1221, #2664, #2694, #4116), which shaped when they attempted to write. (#1221, #2664, #2694, #4116)

## Problems

1. **No level was ever solved across 46 minutes** All four residents stayed on level 1 from minute 0 to the end with no submissions (#52, #5462). The run produced 47 quiet minutes without a submission, so the core progression loop never engaged. (#52, #5462)
2. **Tool lockouts interrupted normal play** Two act calls were refused as TOOL_LOCKED (#418, #2920), once when A04 tried to act on the flop and once when A02 did. These refusals forced residents to abandon a turn they believed was theirs. (#418, #2920)
3. **Residents misread whose turn it was** Residents repeatedly logged confusion about the action order (#1247, #1484, #2906, #5337). Time was spent checking the table or ending turns rather than making decisions. (#1247, #1484, #2906, #5337)
4. **The 150-word brain limit caused repeated rejections** Three writeBrain calls were refused for exceeding 150 words (#1338, #1348, #4183), costing turns and forcing rewrites. (#1338, #1348, #4183)
5. **No messages, transfers or gamemaker actions occurred** The run shows 0 DMs, 0 board posts, 0 transfers and no gamemaker actions; the deterministic digest found no beats. None of the social or story mechanics the design implies were exercised. (#52, #5462)

## Optimizations

- **Surface a clear level-1 objective and submission path** Because nobody submitted anything all run (#52, #5462), the harness should make the level task and submission tool obvious at minute 0 so residents stop treating table play as the whole game. (#52, #5462)
- **Fix turn-order prompts to state the active player** Repeated confusion about whose turn it is (#2906, #5337) suggests the prompt should explicitly say who is to act and why, reducing wasted turns and table checks. (#1247, #2906, #5337)
- **Align activeTools with the phase so act is never refused** Two TOOL_LOCKED refusals on act (#418, #2920) happened while residents believed they were acting; the tool list and prompt should agree so a legitimate turn is never rejected. (#418, #2920)
- **Enforce or pre-warn the brain word limit before submission** Three BRAIN_TOO_LONG refusals (#1338, #1348, #4183) wasted turns; the harness could truncate, count in the prompt, or warn at drafting time. (#1338, #1348, #4183)
- **Clarify when writeBrain is available** Residents assumed writeBrain was retro-only during play (#2664, #2694, #4116) yet some wrote successfully mid-run (#2834, #4201); the rules text should state the exact window. (#2664, #2694, #2834, #4116)
- **Give residents a reason to use messages and transfers** With 0 DMs, posts and transfers all run (#5462), the story should create social pressure or deals worth making so the social mechanics get used. (#5462)

## Loophole candidates

1. **Residents spent the run playing table hands instead of pursuing level progress** (residents) All four residents treated reasoning about poker hands as the activity (#98, #168, #168) while never attempting a submission, effectively ignoring the level-1 task the city tracks (#52). (#52, #98, #168)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 31: event "brain_written" (seq 31) does not match its schema
- line 32: event "retro_closed" (seq 32) does not match its schema
- line 38: event "brain_written" (seq 38) does not match its schema
- line 39: event "retro_closed" (seq 39) does not match its schema
- line 78: event "game_started" (seq 78) does not match its schema
- line 79: event "hand_started" (seq 79) does not match its schema
- line 80: event "cards_dealt" (seq 80) does not match its schema
- line 81: event "action_taken" (seq 81) does not match its schema
- line 82: event "action_taken" (seq 82) does not match its schema
- line 92: event "decision_scored" (seq 92) does not match its schema
- line 93: event "action_taken" (seq 93) does not match its schema
- line 101: event "decision_scored" (seq 101) does not match its schema
- line 102: event "action_taken" (seq 102) does not match its schema
- line 115: event "decision_scored" (seq 115) does not match its schema
- line 116: event "action_taken" (seq 116) does not match its schema
- line 123: event "decision_scored" (seq 123) does not match its schema
- line 124: event "action_taken" (seq 124) does not match its schema
- line 125: event "board_dealt" (seq 125) does not match its schema
- and 988 more
