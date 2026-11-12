# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns-nobrain` |
| Seed | 107 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #3 to #1642 (1440 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end); A05 on level 1 from minute 0 for 13 minutes (to the end); A06 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.055 USD for this run (competitors 0.055, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0033 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **The game played as a fast three-match series with no stall at all.** Despite the computed stall table, the log shows continuous play: amber and teal traded clue turns from minute 0 through minute 13, with three separate games finishing (game 2 at #940, game 3 at #1345). The whole run was a working word game, not a freeze. (#54, #940, #1345)
- **A05's 'reef' call was wasted because teal already owned it.** A05 planned to guess reef as a sea-related word but reef was already teal and the turn ended immediately; A06 noted it at #145. The lesson repeats: the callers kept guessing words the grid had already settled. (#130, #145, #146)
- **The keepers' private knowledge was the main brake on the teams.** Multiple keepers knew a suggested guess was fatal (A01 knew thunder was fog, #285; A05 knew tower was fog, #620; A05 knew bracelet was amber, #1556) but were barred from posting, so the callers walked into wrong words. This was a rule, not a mistake. (#285, #620, #1556)
- **Teal won at least two of the three games and ended comfortably ahead.** A04 recorded 'game 2 is over and teal won', match points amber 7 to teal 18 (#940), and teal won game 3 when crystal was revealed (#1345). Amber's clues were riskier, with fern, pumpkin and tower ending turns. (#436, #940, #1345)
- **A03 was refused by the tool while the game was clearly still running.** At #1288 A03 chose the clue 'magic' as amber's keeper, and the city refused it with TOOL_LOCKED at #1291, the only tool error in the run. A03 recovered by noting the turn was teal's and waiting (#1315). (#1288, #1291, #1314)

## Problems

1. **A keeper could hold alight but not speak, wasting every keeper's information.** A01 (#285), A04 (#1555), A05 (#620, #1556) and A06 (#1202) all knew a suggested guess was fog or the wrong team but could not post. The rule forces a blind guess and killed turns that did not need to fail. (#285, #620, #1202, #1556)
2. **Some guesses went against the caller's own plan because the advice was poor.** A06 suggested pumpkin for 'seed' when the keeper's target was kernel, and the turn ended at #436; the real target was only guessed later. A03's 'sea' advice steered A01 to shark, but the keeper's targets were dolphin and otter (#720). (#436, #689, #720)
3. **The game ended while the referee kept it running.** At #1345 A04 already declared game 3 over, but play continued into a fourth match at #1366 and a fifth at #1444; the referee ended at minute 13 (#1642) mid-game. The run was cut off at the moment of the most interesting problem. (#1345, #1444, #1642)
4. **One keeper was refused the tool it needed to act.** A03 was refused when giving a clue at #1291 because the tool was locked for its level or phase. The keeper had already reasoned the correct action out, so the refusal interrupted a legitimate play, not an invalid one. (#1288, #1291)
5. **The reveal step was skipped and the team never adjusted.** A02 at #150 assumed that a wrong guess at two words would be judged both ways, and the team stopped after the first correct guess (#413) rather than re-planning. The log shows several turns cut off before the caller's second target was attempted. (#300, #413, #689)
6. **The two teams' turns were confusing because the tool showed the same grid.** A02 and A06 each concluded 'no task' for themselves (#314, #831) and then acted, because the grid view was shared and turn ownership was unclear. The result is a lot of turn time burned on deciding whose turn it is. (#314, #831, #864)

## Optimizations

- **Let the keeper post one short note after a reveal, unless the story needs the taper.** The keeper's information is currently wasted, since A01 (#285) and A05 (#620) watched their teams walk into fog. If the story needs a question, the keeper can post once after each reveal so the callers can correct their plan. (#285, #620)
- **Make the scoring clash explicit in the clue text.** The clues read as 'sea' or 'boat' without saying which team's grid they mean, and A04 misread the sea clue as lobster being amber (#125). Additive wording such as 'for your team's words' would stop the cross-team confusion. (#125, #300, #689)
- **Fix the tool lock for the keeper role.** A03 was refused at #1291 because giveClue was not in its active tools. The tool list should be set by the role before the turn, not during the call. (#1288, #1291)
- **Make the stand-back advice actually conjecture, not a loud guess.** A06 at #436 sent pumpkin for 'seed', while the real target was kernel. Either mark the keeper's suggestion as advice or let the seeker ask one clarifying question on the team chat before guessing. (#436, #1050)
- **Add a check that the game is over before the referee can end it mid-turn.** If the referee has to end the match, the story should stop before the next clue is handed out. At #1642 the referee ended the match after a fourth and fifth game had started. (#1345, #1642)
- **Let the callers stop only when they have two correct guesses.** The teams stopped after a single correct guess in several turns (#300, #413, #689) even when the two-clue bonus was still open, which seems designed for exactly this. The two-target score should be visibly tempting and the one-guess stop should be made less attractive. (#300, #413, #689)

## Loophole candidates

1. **A seeker could act without the keeper by copying the keeper's stated plan.** (residents) A02 at #556 used the team chat rather than the keeper's private knowledge, and the guess landed. Not a serious bypass, but the seeker's own information did not have to be right. (#556, #557)
2. **A caller could use the keeper's answer to skip one of its targets.** (residents) A02 at #300 considered a second guess at thunder after the keeper's engine was confirmed, and reasoned it could still get the two-word bonus if it were right. This is a rule use, not a bug. (#300)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 18: event "clue_given" (seq 18) does not match its schema
- line 19: event "clue_intent" (seq 19) does not match its schema
- line 38: event "team_post" (seq 38) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 48: event "clue_word_revealed" (seq 48) does not match its schema
- line 49: event "clue_closed" (seq 49) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 78: event "clue_given" (seq 78) does not match its schema
- line 79: event "clue_intent" (seq 79) does not match its schema
- line 121: event "team_post" (seq 121) does not match its schema
- line 134: event "team_post" (seq 134) does not match its schema
- line 136: event "clue_word_revealed" (seq 136) does not match its schema
- line 153: event "clue_word_revealed" (seq 153) does not match its schema
- line 154: event "clue_closed" (seq 154) does not match its schema
- line 161: event "clue_given" (seq 161) does not match its schema
- line 162: event "clue_intent" (seq 162) does not match its schema
- line 171: event "team_post" (seq 171) does not match its schema
- line 185: event "team_post" (seq 185) does not match its schema
- and 182 more
