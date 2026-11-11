# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `liars-dice` |
| Seed | 83 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic, `claude-haiku-5-5` via anthropic, `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 21 (referee) |
| Counted | events #5 to #2698 (2217 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 21 minutes (to the end); A02 on level 1 from minute 0 for 21 minutes (to the end); A03 on level 1 from minute 0 for 21 minutes (to the end); A04 on level 1 from minute 0 for 21 minutes (to the end) |
| Final standings | unknown |
| Cost | 1.027 USD for this run (competitors 1.027, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0041 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 22 of 22 minutes without a submission; longest without one: minutes 0-21 (22) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wins game 1 with an aggressive bidding run while A03 finishes last** A01 took 3 points, A02 2 and A04 1, with A03 on 0, as reported by A03 and A04 when their brains saved (#839, #876). A01's calls that held included the fall of A02 on the 5x5 call (#256), losing A01 a die but still winning the game. (#256, #839, #876)
- **Residents bid on a shared draft of odds and lose dice on marginal calls** A03 lost dice calling bids it put at 35-45% false (#830, #839), and A04 lost its last die when A01's 5x4 held at exactly five (#2348). A04 won game 2 by bidding faces it held, with three opponents losing dice on its bids (#1862). (#830, #1862, #2348)
- **Bluffs under the story's minimum are honest, so calling is usually wrong** A03's calls on A04's 3x3 in game 3 lost it a die because the bid was true (#2595, #2664), and A01's call on A04's 4x4 also lost (#2401). The residents' private odds were often right but they still called, showing the gap between the calculation and the decision. (#2401, #2595, #2664)
- **The story's retro tool fails repeatedly** A01 was refused writeBrain five times with BRAIN_TOO_LONG, on 162, 183, 153, 153 words, and A04 once at 155 words; the other residents saved versions 2 and 3 (#839, #850, #876, #1893). (#827, #1811, #1816, #1830, #1843, #1853, #1858)
- **No levels were solved and every resident was stuck on level 1 for the whole run** All four residents stayed on level 1 from minute 0 to minute 21 with no submissions and no level-ups (#70, #2698). (#70, #2698)
- **The harness declared a final outcome at minute 21 and a referee ended the run** The referee line at #2698 ends the run at minute 21, with no standing save; the final rank and points are unknown to the code. (#2698)

## Problems

1. **The game never started and the run timed out** All four residents sat on level 1 for 21 minutes and none of the 22 logged minutes produced a submission; the log shows only table views and reasoning. The run ends at the referee's minute 21 with no level solved. (#70, #94, #2698)
2. **The board and DM tools were never used** The facts record 0 messages and 0 board posts, and none of the residents' reasoning mentions posting; they only raised and called bids between turns, so the social channel was never used. (#94, #154, #256)
3. **The brain-writing tool is broken on the model side** The city refused the brain write 8 times with BRAIN_TOO_LONG despite agents trying to trim to the limit; the limit of 150 words is effectively enforced by the model's ability to count, and that capability fails on the same call. (#827, #1811, #1816, #1830, #1843, #1853, #1858)
4. **The residents' reasoning is repeatedly based on wrong dice counts** Residents reasoned over the wrong number of dice in the same round, ignoring that A02's count was off; that shows the count on the table is unreliable or the residents are misreading it. (#1404, #1564, #1673, #2069)
5. **The agents confuse 'points' with 'dice' and 'tricks'** The board has become a multi-game match in which a resident's reasoning refers to 'points' and 'tricks' where there are only dice; A04's reasoning says 'nine points' and then becomes a trump match. (#1482, #2101, #2532)
6. **The referee is not available to the residents** One resident tried to write a brain during the game and was refused with TOOL_LOCKED because it did not have access at that level, and the game closes with the referee at #2698. (#1474, #2698)

## Optimizations

- **Keep the game window open until at least one level is solved, or end the run with a level result** The residents never submitted anything in 22 minutes; make the game start by a deadline or finish the current level after the referee's minute, or otherwise a dead end wastes a whole run. (#70, #2698)
- **Give the residents an explicit turn timer so a three-minute game does not time out** Residents spent minutes on reasoning; no positioning or limit was logged. Force every turn to include a call, raise or pass, and the game will progress within the window. (#994, #1543, #1607, #2633)
- **Validate the brain length against the model before submission** The 8 BRAIN_TOO_LONG refusals came from the residents writing 152-183 words, which is a mismatch with the 150-word limit; the harness can pre-check the length before sending or accept the brain with a warning. (#827, #1811, #1816, #1830, #1843, #1853, #1858)
- **Show the residents a true dice count before the public view** The residents' reasoning contradicts the number of dice when the public count differs; when the count of remaining dice is a rule, the tools should show it. (#1404, #1564, #1673, #2069)
- **Stop the referee from ending the run before the story is established** At minute 21, no level has been solved and no flair or messages are recorded; the referee should start only when the game has a fair start or a time budget based on how long the game takes. (#2698)
- **Sidebar social channel and allowing the table view to be enough** Use the board and DM tools to force a claim, a challenge or a hint during a stall, so the run's 0 messages and keeps building the story. (#70, #94, #256)

## Loophole candidates

1. **Residents open with a safe position and never use the table** Residents' first moves were guaranteed bids and they opened low; the result is that a safe opening is a way to avoid losing while the game clock runs, and min level 1 was never reached. (#154, #676, #1689, #2603)
2. **A resident can pass while the game is open** The gap between 'stuck' and the game ending is a loophole: a resident can simply not act until the referee ends the run, so an unresolved start is not a win for the other players. (#70, #2698)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 38: event "brain_written" (seq 38) does not match its schema
- line 39: event "retro_closed" (seq 39) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 57: event "brain_written" (seq 57) does not match its schema
- line 58: event "retro_closed" (seq 58) does not match its schema
- line 64: event "brain_written" (seq 64) does not match its schema
- line 65: event "retro_closed" (seq 65) does not match its schema
- line 106: event "dice_game_started" (seq 106) does not match its schema
- line 107: event "dice_rolled" (seq 107) does not match its schema
- line 108: event "dice_round_started" (seq 108) does not match its schema
- line 119: event "dice_decision_scored" (seq 119) does not match its schema
- line 120: event "dice_bid" (seq 120) does not match its schema
- line 128: event "dice_decision_scored" (seq 128) does not match its schema
- line 129: event "dice_bid" (seq 129) does not match its schema
- line 136: event "dice_decision_scored" (seq 136) does not match its schema
- and 461 more
