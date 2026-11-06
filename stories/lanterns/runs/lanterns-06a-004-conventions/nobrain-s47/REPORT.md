# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns-nobrain` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 17 (referee) |
| Counted | events #3 to #2252 (1994 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 17 minutes (to the end); A02 on level 1 from minute 0 for 17 minutes (to the end); A03 on level 1 from minute 0 for 17 minutes (to the end); A04 on level 1 from minute 0 for 17 minutes (to the end); A05 on level 1 from minute 0 for 17 minutes (to the end); A06 on level 1 from minute 0 for 17 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.077 USD for this run (competitors 0.077, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0042 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 18 of 18 minutes without a submission; longest without one: minutes 0-17 (18) |
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
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Kent's garden clue landed two amber words and set amber's tempo.** A01 built the "garden" clue for glove, olive and cobweb at #403, and caller A03 landed glove (#457, #474) then olive (#536, #553). This was amber's most productive multi-word clue in the run. (#403, #457, #474, #536, #553)
- **Teal landed the "treasure" bonus with locket and attic.** A06 proposed locket and attic for "treasure" (#1495), A05 called locket (#1525), then attic (#1537). A04 recorded both landed and teal at 5 of 6 revealed (#1549). (#1495, #1525, #1537, #1549)
- **Viking clue gave amber a clean two-word landing.** A01 recommended shield then horn for "viking" (#1446); A02 guessed shield (#1453) and then horn (#1482), and A02 confirmed the bonus landed (#1517). (#1446, #1453, #1482, #1517)
- **A03 conceded the second guess rather than risk shadow points.** After compass landed for "geometry", A03 reasoned that the remaining targets were unclear and stopped to avoid a wrong guess (#1038, #1070); A01 agreed (#1081). A03 repeated the same stop after scroll (#2204, #2215). (#1038, #1070, #1081, #2204, #2215)
- **A05 publicly owned the wheel shadow and shifted to safe guesses.** After calling wheel for "car", a shadow (#391), A05 posted an apology to the team (#420) and declared it would keep to clear-link guesses and stop on the first non-teal hit (#453). (#391, #420, #453)
- **A02 miscounted amber's hidden words and A01 corrected it.** A02 reported three amber words left (#1553, #1598); A01 posted a correction that it was two, since four were already revealed (#1612), and A02 acknowledged the error (#1649). (#1553, #1598, #1612, #1649)

## Problems

1. **Every resident stalled on level 1 for the whole run and nobody submitted.** All six residents sat on level 1 from minute 0 to 17 with no correct or wrong submission (facts: 0 submissions, 18 quiet minutes). A04's own note that "the game already shows flame revealed" (#656) shows the board advanced only through clues, never through scored submissions. (#656, #679, #764)
2. **The calling role kept flipping and non-callers spent turns idling.** Residents repeatedly say they have no task because they are keeper or not the caller, e.g. #110, #131, #191, #296, #317, #712, #1388. Many turns were spent ending a turn rather than acting, which burns the 17-minute clock. (#110, #131, #191, #296, #317, #1388)
3. **giveClue was refused three times with TOOL_LOCKED, killing planned clues.** A04's "wellington" clue (#571, refused #574), A05's "Old" clue (#1002, refused #1005) and A03's clue for the amber words (#1351, refused #1354) were all blocked. Each refusal came right after the resident had worked out a valid clue, so the work was wasted. (#574, #1005, #1354)
4. **Tool-lock confusion pushed residents into wrong beliefs about the turn order.** After the #1354 refusal, A03 concluded "it's probably not my clue turn" (#1372), even though it had a prepared clue. A05 similarly assumed its clue turn was not yet due after #1005 (#1009). (#1005, #1009, #1354, #1372)
5. **Residents have a false shared belief that chat is closed during the game.** A01 said "the team channel is closed while the game runs" (#577), A02 said it "may not post in team chat" (#735), and A06 said posting "isn't allowed during the game" (#1644). Yet A06 elsewhere posted advice (#136, #1120) and A05 posted an apology (#420), so the rule was inconsistent in their heads. (#136, #420, #577, #735, #1644)
6. **Gamemaker produced no actions for the whole run.** Facts show no gamemaker actions and 0.000 gamemaker cost, so no referee pressure, hints or events entered the game. Residents were left alone to churn reasoning lines until the referee ended at minute 17 (#2252). (#2252)

## Optimizations

- **Give every resident a real job each turn so the clock is not burned on idle turns.** Turns like #131, #191, #296 and #317 are pure idling because the resident is keeper or non-caller. Add a job for keeper/observer turns (e.g. must read grid and post one read) so all six residents contribute each minute, since the run spent 18 quiet minutes with no submission. (#131, #191, #296, #317)
- **Expose giveClue to whoever the phase names as keeper and say so in the tool list.** Three planned clues were refused with TOOL_LOCKED (#574, #1005, #1354). Either align the tool lock with the keeper role or, when a resident is the keeper, surface giveClue in activeTools so a prepared clue is not thrown away. (#574, #1005, #1354)
- **State plainly which channels are writable in each phase.** Residents contradicted themselves about team chat (#577 vs #136, #420), causing unnecessary silent turns. Put an explicit "you may post to team chat now" or "you may not" line in the phase prompt so they do not invent a closed-channel rule. (#577, #735, #1644)
- **Have the city publish the hidden-word counts so residents stop miscounting.** A02 miscounted amber's remaining words (#1553) and was corrected by A01 (#1612, #1649). A small city-issued tally of revealed vs hidden words per team would remove this class of error from guess decisions. (#1553, #1612, #1649)
- **Give the gamemaker at least one scheduled action.** The gamemaker took no actions and cost 0.000, so the referee pressure the story wants never arrived. Schedule one gamemaker event (hint, twist or clock warning) per game, e.g. near minute 8, so the city is not just a silent scorekeeper (#2252 ends with no gamemaker input). (#2252)

## Loophole candidates

1. **Teams routinely stopped guessing after one landed word to avoid shadow penalties.** (residents) A03 stopped after compass explicitly to avoid a negative-expectation guess (#1038, #1070), and again after scroll (#2204, #2215), forgoing the landing bonus. This turns the bonus into a rarely taken risk and lets a team bank one point per clue with little downside. (#1038, #1070, #2204, #2215)
2. **Residents reuse clue words across games and lean on prior-game knowledge.** (residents) A01 noted "ancient" was already used in game 2 (#1902) and A05 called it for teal in game 3 (#1087). Using the same clue word repeatedly is not forbidden but sidesteps fresh clue construction. (#1087, #1902)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 21: event "clue_given" (seq 21) does not match its schema
- line 22: event "clue_intent" (seq 22) does not match its schema
- line 55: event "team_post" (seq 55) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 65: event "clue_word_revealed" (seq 65) does not match its schema
- line 88: event "clue_word_revealed" (seq 88) does not match its schema
- line 89: event "clue_closed" (seq 89) does not match its schema
- line 96: event "clue_given" (seq 96) does not match its schema
- line 97: event "clue_intent" (seq 97) does not match its schema
- line 139: event "team_post" (seq 139) does not match its schema
- line 147: event "team_post" (seq 147) does not match its schema
- line 149: event "clue_word_revealed" (seq 149) does not match its schema
- line 160: event "clue_word_revealed" (seq 160) does not match its schema
- line 161: event "clue_closed" (seq 161) does not match its schema
- line 170: event "team_post" (seq 170) does not match its schema
- line 178: event "clue_given" (seq 178) does not match its schema
- line 179: event "clue_intent" (seq 179) does not match its schema
- line 194: event "team_post" (seq 194) does not match its schema
- and 238 more
