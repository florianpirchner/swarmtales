# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns-nobrain` |
| Seed | 59 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #3 to #1674 (1476 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end); A05 on level 1 from minute 0 for 14 minutes (to the end); A06 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.052 USD for this run (competitors 0.052, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0031 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Game 1 ends in minute 2 on teal's royal 1 clue.** A05 guessed palace for the "royal" 1 clue, revealing teal's last word and ending game 1 at minute 2 with teal ahead 9 to 1 (#332, #348, #362). The whole run never got past level 1 in any game. (#332, #348, #362)
- **Game 2 closes on amber's fish 1 jelly guess in minute 6.** A02's clue "fish" 1 targeted jelly, and A03's guess revealed it as amber's last word, ending game 2 with a 3-point finish bonus for amber (#819, #851, #852, #859, #860). (#819, #851, #852, #859, #860)
- **A25's wrong cabinet guess cost amber a turn in game 1.** A03 guessed table (correct) then cabin for "wooden" 2; cabin was not amber's, ending the turn (#166, #190, #221). A03 then owned it in team chat (#221). (#166, #190, #221)
- **Keeper advice leaks and mismatches recur between keeper and seeker.** A01 as keeper privately disagreed with A03's advice (#46, #47), and A05 privately noted that A04's second "marine" guess should have been radio rather than lighthouse (#708, #709), though the lighthouse guess still landed as teal (#734). (#46, #47, #708, #709, #734)
- **Game 3 ends in minute 9 on amber's hideaway clue.** A01 guessed attic then forest for "hideaway" 2, and forest was amber's last word, so amber took the finish bonus (#1200, #1212, #1234, #1235). (#1200, #1212, #1234, #1235)
- **Final game 4 closes on teal's clear 1 crystal guess.** A04's "clear" 1 targeted crystal, and A06 guessed crystal at minute 13 as teal's last word (#1638, #1655, #1662), leaving the referee to end the run at minute 14 (#1674). (#1638, #1655, #1662, #1674)

## Problems

1. **ROOM went the whole run without a level-up.** Facts record all six residents stuck on level 1 for 14 minutes, with no submissions and zero correct or wrong submissions. Every game they played ended early on a finish bonus, never by solving a level. (#362, #860, #1235, #1674)
2. **giveClue was locked when residents tried to use it.** A05 was refused giveClue at minute 4 (#622) and A03 was refused giveClue at minute 8 (#1089), each with TOOL_LOCKED. Both residents had already been reasoning about clues, so the lock surprised them mid-plan. (#622, #1089)
3. **No messages left the private channel.** Facts record 0 DMs, 0 board posts and 0 group posts, although residents repeatedly said they posted to team chat (#39, #184, #527, #1188). Their team advice was mainl y private narration rather than shared messaging. (#39, #184, #527, #1188)
4. **Keepers reason about targets they cannot communicate.** A02 (keeper) repeated that it could not post to team chat mid-game and answered only in its own thoughts (#490, #491, #851, #852). This left the caller guessing blind on several clues. (#490, #491, #851, #852)
5. **Residents burned turns confirming they had no task.** Multiple residents spent whole turns on reasoning that the clue was not theirs and ending without action (#89, #467, #484, #563, #1053). This is wasted game time in a run that ended at minute 14 with no level solved. (#89, #467, #484, #563, #1053)

## Optimizations

- **Expose a shared team channel that all roles can read and write.** The keepers could not pass target information and the callers guessed blind (#490, #491, #708, #709), while residents only narrated posts (#39, #1188). Give every resident a real, logged chat tool so advice can be coordinated and graded. (#39, #490, #491, #708, #709, #1188)
- **Publish the clue-giver's tool window up front.** Two giveClue calls were refused with TOOL_LOCKED (#622, #1089) after residents had already planned the clue. State the active tool set and the turn order at the start of each turn to avoid wasted turns. (#622, #1089)
- **Make the end-of-run target a level, not a match.** All six residents stayed on level 1 for 14 minutes with no submissions, while only match-level games were played (#362, #860, #1235). The story should either score the match games as levels or give the residents a path that actually advances a level. (#362, #860, #1235, #1674)
- **Give residents a skip action when the clue is not theirs.** Residents repeatedly wrote full reasoning only to end with no action (#89, #467, #484, #563, #1053). Add a cheap no-task reply or batch idle residents so turns go to the active caller and keeper. (#89, #467, #484, #563, #1053)

## Loophole candidates

1. **The finish bonus ends games before any clue cycle completes.** (residents) Each game ended within minutes on the bonus for revealing a team's last word (#362, #860, #1235, #1674). Because every game ended this way, no clue cycle ever required a full solve, which cuts the game short relative to the intended story. (#362, #860, #1235, #1674)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 17: event "clue_given" (seq 17) does not match its schema
- line 18: event "clue_intent" (seq 18) does not match its schema
- line 34: event "team_post" (seq 34) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 56: event "clue_word_revealed" (seq 56) does not match its schema
- line 57: event "clue_closed" (seq 57) does not match its schema
- line 67: event "team_post" (seq 67) does not match its schema
- line 74: event "clue_given" (seq 74) does not match its schema
- line 75: event "clue_intent" (seq 75) does not match its schema
- line 105: event "team_post" (seq 105) does not match its schema
- line 107: event "clue_word_revealed" (seq 107) does not match its schema
- line 114: event "team_post" (seq 114) does not match its schema
- line 133: event "clue_word_revealed" (seq 133) does not match its schema
- line 134: event "clue_closed" (seq 134) does not match its schema
- line 153: event "clue_given" (seq 153) does not match its schema
- line 154: event "clue_intent" (seq 154) does not match its schema
- line 170: event "team_post" (seq 170) does not match its schema
- line 172: event "clue_word_revealed" (seq 172) does not match its schema
- and 178 more
