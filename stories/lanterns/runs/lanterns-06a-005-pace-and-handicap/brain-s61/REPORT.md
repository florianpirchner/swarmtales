# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 61 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 17 (referee) |
| Counted | events #3 to #2211 (1951 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 17 minutes (to the end); A02 on level 1 from minute 0 for 17 minutes (to the end); A03 on level 1 from minute 0 for 17 minutes (to the end); A04 on level 1 from minute 0 for 17 minutes (to the end); A05 on level 1 from minute 0 for 17 minutes (to the end); A06 on level 1 from minute 0 for 17 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.080 USD for this run (competitors 0.080, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0074 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 18 of 18 minutes without a submission; longest without one: minutes 0-17 (18) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The team spent the whole first minute on a retro and a 170-word brain before any game opened.** A01 and A04 both say they wrote brain version 1 at minute 0, and the team agreed on clue conventions through at least eight messages (#135, #146, #158, #164). This set the pattern of long writing phases in every retro window. (#135, #146, #158, #164)
- **Game 1 was played but the report facts record no levels solved and no submissions.** Residents describe concrete reveals in game 1: tomato, pepper and mushroom amber for "pizza" (#283), basket and market teal (#396), ocean teal (#476), lagoon amber on "lake" (#509). These plays were apparently not counted in the computed facts, which show 0 correct and 0 wrong submissions. (#283, #396, #476, #509)
- **Two residents guessed a shadow and lost 3 points, which drove the v3/v4 brain rules.** A06 called "spider" for teal's "sea" 2 and it was amber (#721, #777). Later A06 called "cloak" on "clothing" 2 and it was a shadow, costing teal 3 points (#930); the retro then required a 2-clue to need two equally clean links. (#721, #777, #930)
- **Wrong guesses that hit the other team's words handed away points.** A01's guess of canyon on "desert" 2 revealed a teal word, ending amber's turn after one point (#1526, #1573). A04's "spider" (#721) is the same pattern for the other side. (#721, #1526, #1573)
- **One-word clues landed repeatedly while two-word clues were risky.** Teal's "boat" 2 landed yacht and ferry (#1875, #2100), and single-link clues landed: "weapon"→sword (#1494), "sheep"→wool (#1586), "plant"→fern (#2034), "field"→meadow (#2107), "peak"→mountain (#2186). Amber's "fire" 2 landed bucket and blanket only on the second try (#1653). (#1494, #1586, #1653, #2034, #2107, #2186)
- **The run ended at minute 17 while a final amber clue was mid-play.** At minute 16 A03 went to guess sail on "canvas" 1 (#2199), and the referee ended the run one minute later (#2211). No final standings were recorded. (#2199, #2211)

## Problems

1. **The brain-writing step failed repeatedly with BRAIN_TOO_LONG.** There were 8 BRAIN_TOO_LONG refusals, from A02 at 210 words (#569) through A06 at 205 words (#1225). Each retry cost minutes in the retro window and left the team debating word counts instead of strategy. (#569, #577, #589, #1164, #1174, #1193, #1225)
2. **Referee and computed facts disagree with what residents played.** Residents describe many reveals and completed games (e.g. #1250, #1756, #1777), yet the facts record zero levels solved, zero submissions, zero transfers and no labels. The log either omits the submission events or the harness failed to record them. (#1250, #1756, #1777)
3. **Keepers repeatedly noted they could not warn their team during play.** A05 saw the team about to guess a shadow and could not post, only wait (#858, #859), and A03 noted the same about canyon being teal (#1525, #1526). This cuts the information advantage the role was meant to give. (#858, #859, #1525, #1526)
4. **Many turns were spent on empty acknowledgements instead of play.** Numerous residents ended turns saying they had no task, e.g. #320, #352, #413, #1044, #1393, #1617, #1909. With only 18 minutes, these idle turns consumed most of the clock. (#320, #352, #413, #1044, #1393, #1617, #1909)
5. **Residents disagreed about whether postTeam was available and whether keepers may post.** A04 says postTeam is missing from the tools (#298), while A06 says the post tool is available but the message says not to use it (#1715). This ambiguity produced inconsistent chat behavior. (#298, #1715)
6. **The gamemaker took no actions in the whole run.** The facts record no gamemaker actions and 0.000 gamemaker cost. Any events or twists the story needed would have had to come from nowhere. (#2211)

## Optimizations

- **Give writeBrain a hard word budget in the tool response before writing.** The team burned minutes on 8 BRAIN_TOO_LONG refusals (#569, #1225). Add a pre-check that returns the current length and the remaining budget, or let writeBrain trim automatically. (#569, #577, #589, #1164, #1174, #1193, #1225)
- **Make submissions and reveals visible in the computed facts.** Facts show 0 submissions while residents describe many (#283, #476, #1653). Log guesses and reveals as first-class events so reports agree with the log. (#283, #476, #1653)
- **Remove or brief pure-acknowledgement turns.** Many minutes went to residents ending turns with nothing to do (#320, #413, #1044, #1393). Let residents skip turns that are not theirs without generating a message. (#320, #413, #1044, #1393)
- **Let keepers send one private silent hint per clue.** Keepers watched their team walk into shadows and could not warn them (#858, #930). A one-word private hint per clue would keep the keeper role meaningful without breaking the fog rule. (#858, #930)
- **Fix the tool list so postTeam is consistently present or absent.** A04 and A06 give contradictory tool states (#298, #1715). Define the per-phase tool list once in the system prompt and keep it stable during a game. (#298, #1715)
- **Give the gamemaker at least one scheduled action per game window.** No gamemaker actions were recorded (#2211). If the story needs pacing or events, schedule them explicitly so the run has a beat structure. (#2211)

## Loophole candidates

1. **Retro windows were used to restate the brain in prose without a length cost.** (residents) Residents drafted long brain text in chat and in private reasoning before calling writeBrain (#565, #574, #1190), so the word limit only bit at the final tool call. This lets the limit be gamed by iterating drafts. (#565, #574, #1190)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 70: event "team_post" (seq 70) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 80: event "brain_written" (seq 80) does not match its schema
- line 81: event "retro_closed" (seq 81) does not match its schema
- line 87: event "team_post" (seq 87) does not match its schema
- line 95: event "team_post" (seq 95) does not match its schema
- line 97: event "brain_written" (seq 97) does not match its schema
- line 98: event "retro_closed" (seq 98) does not match its schema
- line 105: event "team_post" (seq 105) does not match its schema
- line 112: event "team_post" (seq 112) does not match its schema
- line 120: event "team_post" (seq 120) does not match its schema
- line 127: event "team_post" (seq 127) does not match its schema
- line 138: event "team_post" (seq 138) does not match its schema
- line 149: event "team_post" (seq 149) does not match its schema
- line 177: event "clue_game_started" (seq 177) does not match its schema
- line 178: event "clue_key_dealt" (seq 178) does not match its schema
- line 190: event "clue_given" (seq 190) does not match its schema
- line 191: event "clue_intent" (seq 191) does not match its schema
- and 240 more
