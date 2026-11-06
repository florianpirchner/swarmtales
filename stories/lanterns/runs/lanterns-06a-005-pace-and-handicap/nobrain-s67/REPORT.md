# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns-nobrain` |
| Seed | 67 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #3 to #1558 (1368 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end); A05 on level 1 from minute 0 for 13 minutes (to the end); A06 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.046 USD for this run (competitors 0.046, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0029 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
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
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Teams played clean Codenames-like rounds across four games, but no level was solved.** Residents acted as keepers and seekers and gave each other clue advice all run, yet the standings show every resident stuck on level 1 from minute 0 to minute 13 and zero submissions. Play activity (e.g. #16, #314, #952) never turned into a level-up. (#16, #314, #952)
- **A03 tried to give a clue with a locked tool and was refused.** At minute 7 A03 called giveClue for its last amber word and got TOOL_LOCKED. It then concluded it was no longer its turn and waited rather than finding an allowed action, and its last word funnel was only revealed later (#731). (#1028, #1031, #1044, #1045)
- **Keepers repeatedly withheld correct information because they believed chat was closed mid-game.** A03 knew walnut was fog and olive was the right guess, but said it could not post to the team channel until the game ends (#795, #796). A04 likewise knew hourglass belonged to amber and that A06's advice would hand amber a point, but could not warn anyone (#1499, #1500). (#795, #796, #1499, #1500)
- **Clues and guesses were coordinated through visible team advice every turn.** Keepers and bystanders posted advice like squirrel-then-mushroom (#540) and funnel for the pour clue (#1086), and callers generally followed it (#524, #696). This is functional play, but it means most turns were resolved by one resident's chat note. (#524, #540, #696, #1086)
- **Residents narrated the game as won or lost and prepared for the next game, unaware nothing would advance.** After each round residents posted wrap-ups such as teal losing game 3 at 25-19 and being ready for game 4 (#1111, #1150, #1155). The run then ended at minute 13 with no level solved. (#1111, #1150, #1155)

## Problems

1. **No resident ever advanced: 13 minutes, six residents, zero submissions.** The computed facts show all six stuck on level 1 for the whole run and no correct or wrong submissions. Despite continuous plausible play, the loop never converted activity into progress. (#16, #272, #1558)
2. **The giveClue lock came at the moment a clue was needed and stopped play.** A03 planned "pour" for funnel, called giveClue at minute 7, and was refused with TOOL_LOCKED (#1028, #1031). Its subsequent reasoning treats the refusal as "not my turn" (#1044), so the lock read as a rules signal rather than a timing error. (#1028, #1031, #1044)
3. **Residents believed team chat was forbidden mid-game, so correct information was suppressed.** Both A03 and A04 cite a rule that posting is only allowed after the game ends (#795, #1499), even though other residents posted to the team channel constantly (#540, #1443). The inconsistent belief caused avoidable wrong guesses like walnut and hourglass. (#540, #795, #1443, #1499)
4. **Residents spent many turns on acknowledgements and turn-ending rather than action.** Numerous turns end with notes like "nothing for me to do, I'll end my turn" (#533, #848, #963, #1349). This consumed most of the 1368 events while nothing advanced. (#533, #848, #963, #1349)
5. **The run shows no gamemaker actions, so the harness gave no direction or escalation.** Facts record no gamemaker actions and no labels; the only recorded tool error is one TOOL_LOCKED. Nothing in the log shows the city guiding residents when progress stalled. (#1031, #1558)

## Optimizations

- **Add a progress check that escalates when no submission occurs in N minutes.** All six residents were stuck from minute 0 to 13 with zero submissions, and the gamemaker took no actions. A stall detector that surfaces the current level/tool state or nudges the player would break the deadlock earlier. (#16, #1558)
- **Make tool availability explicit and explain refused calls in the refusal text.** A03's giveClue was refused with TOOL_LOCKED and it read the refusal as "not my turn" (#1031, #1044). The error should say when the tool will be available and what to do instead. (#1031, #1044)
- **State the team-chat rule once, unambiguously, to all residents.** Some residents posted advice freely (#540, #1443) while others declared posting forbidden mid-game (#795, #1499). A single explicit rule in the prompt would stop keepers from withholding decisive knowledge. (#540, #795, #1499)
- **Give residents a cheap default action when they have no task instead of an end-of-turn note.** Many turns collapse into acknowledgements (#533, #848, #963, #1349). Converting those into viewGrid/readTeam or a required next-step decision would keep the loop productive. (#533, #848, #963, #1349)
- **Log the actual game-outcome link to level progression so designers can see where activity fails to convert.** Residents celebrated or mourned completed games (#1111, #1150) while no level was solved. The harness should connect game results to level-up events or report explicitly that they are disconnected. (#1111, #1150)

## Loophole candidates

1. **Residents treated team advice as a free coordination channel and most callers simply followed it.** (residents) Turn resolution was largely one resident posting a pick (#540, #1086) and the caller executing it (#524, #696). This is within the rules, but it lets a single chat note substitute for independent guessing. (#524, #540, #696, #1086)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 19: event "clue_given" (seq 19) does not match its schema
- line 20: event "clue_intent" (seq 20) does not match its schema
- line 27: event "team_post" (seq 27) does not match its schema
- line 51: event "team_post" (seq 51) does not match its schema
- line 62: event "clue_word_revealed" (seq 62) does not match its schema
- line 75: event "clue_word_revealed" (seq 75) does not match its schema
- line 76: event "clue_closed" (seq 76) does not match its schema
- line 86: event "clue_given" (seq 86) does not match its schema
- line 87: event "clue_intent" (seq 87) does not match its schema
- line 119: event "team_post" (seq 119) does not match its schema
- line 121: event "clue_word_revealed" (seq 121) does not match its schema
- line 138: event "clue_word_revealed" (seq 138) does not match its schema
- line 139: event "clue_closed" (seq 139) does not match its schema
- line 155: event "team_post" (seq 155) does not match its schema
- line 165: event "team_post" (seq 165) does not match its schema
- line 172: event "clue_given" (seq 172) does not match its schema
- line 173: event "clue_intent" (seq 173) does not match its schema
- line 193: event "team_post" (seq 193) does not match its schema
- and 170 more
