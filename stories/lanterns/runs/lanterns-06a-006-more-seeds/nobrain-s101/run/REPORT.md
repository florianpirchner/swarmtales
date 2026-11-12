# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns-nobrain` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #3 to #1741 (1533 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end); A05 on level 1 from minute 0 for 14 minutes (to the end); A06 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.058 USD for this run (competitors 0.058, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0033 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | KEEPER_SILENT 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both teams scored early on clean stock clues despite no level being counted.** A02's "ship" 2 landed harbor and pilot (#40, #59, #96), and teal's "costume" 2 landed mask before cloak hit fog (#251, #280, #310). Residents read the deduction game themselves with almost no chat traffic. (#40, #59, #96, #251, #280, #310)
- **Amber came back from a shadow penalty and won game 2.** A03 guessed apple on "red" 2 and lost 3 points (#197, #210), then A03's "hill" 2 guess of volcano hit a shadow and cost another 3 (#1601, #1609, #1655). Amber still closed out game 2 with 'red', 'edge' and 'flower' all landing (#959). (#197, #210, #959, #1601, #1609, #1655)
- **A01's 'fire' clue scored after A03 had already tried apple.** A03 called 'red' 2 and picked apple, a shadow (#197). A01 then gave 'fire' 1 and A02 took flame amber (#289, #298, #317), keeping amber's word count moving. (#197, #289, #298, #317)
- **The game-2 'coast' 2 clue died on the first guess.** A02 guessed ocean on A01's 'coast' 2 (#1465) and ocean was fog, ending the turn with zero points (#1490). Cliff and dune stayed hidden for amber's later clues (#1495). (#1465, #1490, #1495)
- **The run ended at minute 14 with all six residents still on level 1 and no counted submission.** Every resident is reported stuck on level 1 from minute 0 to minute 14, and no correct or wrong submission was recorded. The referee ended the run at #1741. (#1741)

## Problems

1. **Zero submissions and zero levels solved in 14 minutes.** The facts report 0 correct and 0 wrong submissions, no level-ups, and all six residents stalled on level 1. The only activity is deduction-game reasoning, so the lanterns mechanic never produced scoreable progress. (#13, #1741)
2. **Game tools were locked while residents still expected to act.** A03 was refused giveClue with TOOL_LOCKED in minute 10 (#1274), and A04 was refused postTeam with KEEPER_SILENT in minute 11 (#1366). Both residents had been reasoning toward those actions, and the refusals cost turns. (#1274, #1366)
3. **Residents frequently thought they had nothing to do and ended turns idle.** Many residents concluded they had no task when they were not the caller (#159, #275, #438, #788, #1045, #1142), spending minutes on wait-and-end turns. With six residents and two executable roles per clue, most minutes were wasted. (#159, #275, #438, #788, #1045, #1142)
4. **Residents argued from stale grid reads and treated claims as unconfirmed.** A06 saw a message claiming A05 revealed fossil but the grid did not show it (#143), and A04 saw A05's report of revealing wolf with no result (#507). Time went to re-checking grids instead of decisions. (#143, #507)
5. **The keeper role was silent and could not warn teammates about known traps.** A04 as keeper knew cloak was fog but could not post (#242), and A05 as keeper knew kettle was fog and could not warn (#575). The city then refused a keeper post outright (#1366), so that knowledge was wasted. (#242, #575, #1366)

## Optimizations

- **Give non-callers a real action every clue turn.** Residents repeatedly ended turns because they were not the caller (#159, #1045, #1142). Add a required advisory post or a small prediction vote so every resident acts on each clue, which also produces the messages the story wants. (#159, #1045, #1142)
- **Tell keepers up front that they cannot post during play.** A04 and A05 formulated warnings they were barred from sending (#242, #575), and A04 was then refused outright (#1366). Put the KEEPER_SILENT rule in the keeper prompt so residents plan around it instead of burning reasoning on blocked posts. (#242, #575, #1366)
- **Fix the giveClue lock or explain the phase to the clue-giver.** A03's giveClue was refused with TOOL_LOCKED mid-run (#1274) and A03 had to guess why from the grid (#1289). Either unlock it on the keeper's turn or state the active tools in the prompt each turn. (#1274, #1289)
- **Make grid state visible to every resident after each reveal.** Residents treated revealed words as unconfirmed because their grid snapshot lagged (#143, #507). Push the grid update with the reveal event so advice and guesses use the same board. (#143, #507)
- **Add a pace pressure that forces submissions rather than open-ended clues.** With 15 quiet minutes and no submission (#1741 facts), the deduction loop absorbed the whole run. A per-minute or per-turn submission requirement, or a shorter clue budget, would force residents to convert reasoning into level attempts. (#13, #1741)

## Loophole candidates

1. **Residents treated 'not the caller' as license to do nothing.** (residents) Non-callers repeatedly ended turns without any message, on the reasoning that only the caller acts (#159, #438, #788, #1045). This is a cheaper path than advising or predicting, and it starves the team-chat mechanic the story expects. (#159, #438, #788, #1045)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 16: event "clue_given" (seq 16) does not match its schema
- line 17: event "clue_intent" (seq 17) does not match its schema
- line 44: event "team_post" (seq 44) does not match its schema
- line 46: event "clue_word_revealed" (seq 46) does not match its schema
- line 53: event "team_post" (seq 53) does not match its schema
- line 76: event "clue_word_revealed" (seq 76) does not match its schema
- line 77: event "clue_closed" (seq 77) does not match its schema
- line 90: event "clue_given" (seq 90) does not match its schema
- line 91: event "clue_intent" (seq 91) does not match its schema
- line 136: event "team_post" (seq 136) does not match its schema
- line 138: event "clue_word_revealed" (seq 138) does not match its schema
- line 139: event "clue_closed" (seq 139) does not match its schema
- line 153: event "clue_given" (seq 153) does not match its schema
- line 154: event "clue_intent" (seq 154) does not match its schema
- line 183: event "team_post" (seq 183) does not match its schema
- line 201: event "team_post" (seq 201) does not match its schema
- line 203: event "clue_word_revealed" (seq 203) does not match its schema
- line 204: event "clue_closed" (seq 204) does not match its schema
- and 188 more
