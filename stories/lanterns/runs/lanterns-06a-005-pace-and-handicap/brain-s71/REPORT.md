# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 71 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #3 to #2044 (1795 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end); A05 on level 1 from minute 0 for 14 minutes (to the end); A06 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.075 USD for this run (competitors 0.075, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
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

- **The residents spent minute 0 writing a shared strategy brain before any game opened** A01 wrote brain version 1 and posted the summary, while A02, A03, A04, A05 and A06 reviewed and added to it (#124, #154, #165). Everyone ended their turn waiting for game 1 (#131, #136, #160). (#124, #131, #136, #154, #160, #165)
- **The first amber clue landed on a category link** A01 gave "game" 2 and A02's guesses revealed bridge and riddle for amber (#219, #280). A03 confirmed both were amber on the grid (#265, #280). (#219, #265, #280)
- **Teal landed a three-word colour clue** A05 called "green" 3 and guessed pine, oasis and garden in sequence, all teal (#333, #344, #371, #382). A06 had advised garden next (#364). (#333, #344, #364, #371, #382)
- **A complete run with no submissions, transfers or messages** The computed facts report 0 submissions, 0 transfers and no DMs or board posts across 1795 events. All six residents stayed on level 1 from minute 0 to minute 14. (#2044)
- **A03 hit a TOOL_LOCKED refusal when trying to give a clue** A03 attempted giveClue in game 3 at minute 7 and was refused with TOOL_LOCKED (#1205). A03 then reasoned about retrying a "red" clue (#1231). (#1205, #1231)
- **Guessers in the dark about roles cost their team points** A02 guessed jacket on amber's "red" 2 clue and A02 later said the jacket was a shadow that cost amber 3 points (#1259, #1285). On "shoot" 1, A01 privately knew arrow was teal but could not post during the game and A02 guessed it anyway (#1967, #1972, #1984). (#1259, #1285, #1967, #1972, #1984)

## Problems

1. **No level was solved and no submission was ever made** All six residents stayed on level 1 for the full 14 minutes and the run ended with 0 correct and 0 wrong submissions, so the story's core competition never advanced. The residents only ever discussed brain text and played guessing exchanges. (#2044)
2. **Residents repeatedly misread which role and tool phase they were in** A04 and A06 both stated they were seekers or keepers inconsistently, and A02 noted a conflict between the system prompt calling it keeper and the user turn calling it a different keeper (#604). A04 later labeled a team message as coming through the user turn rather than team chat (#1636). (#604, #1636, #1646)
3. **The keeper could not warn its own caller during a turn** A03 knew the remaining amber target was jar but could not post because posting is disallowed during the game, so A02 followed the wrong plan toward funnel (#1457, #1458, #1474, #1524). A01 had the same block when A03 advised arrow from teal's own list (#1967). (#1457, #1458, #1474, #1524, #1967)
4. **Repeated empty turns that only acknowledge standing by** Many residents ended turns with no action and a short "standing by" note, e.g. A02 (#328, #329), A05 (#1243, #1244) and A04 (#857, #858). This consumed most of the run's 1795 events without moving the game. (#328, #329, #857, #858, #1243, #1244)
5. **A tool error blocked a clue attempt** A03's giveClue was refused with TOOL_LOCKED (#1205) even though A03 believed it was keeper for that turn, producing a one-line error with no constructive fallback. (#1205)

## Optimizations

- **Expose the intended level/submission loop at the start** Because no submission ever happened, give each resident at its first turn a clear instruction and an open tool for the level-1 submission, so the guessing exchanges are not the only activity. Evidence: 0 submissions and everyone stuck on level 1 (#2044). (#2044)
- **Make keeper-caller signalling legal during a turn** Allow the keeper to post a private hint to its caller mid-turn, since A03 could not correct A02's plan toward funnel and amber lost the clue (#1457, #1458, #1474). Same block hit A01 when A03 advised arrow (#1967). (#1457, #1458, #1474, #1524, #1967)
- **Fix role labeling so each resident knows keeper vs caller** Several residents reasoned about conflicting roles (#604, #1636, #1646), which led A04 to reject a suggestion on grounds of being keeper rather than caller (#1637). State the role explicitly in every turn header. (#604, #1636, #1637, #1646)
- **Give the locked-tool path a fallback** When giveClue raises TOOL_LOCKED (#1205) the harness should tell the resident whose turn it actually is and what it can do now, instead of leaving A03 to retry a different clue (#1231). (#1205, #1231)
- **Suppress empty "standing by" turns** Many turns ended with no action and a short acknowledgement (e.g. #329, #858, #1244), bloating the log to 1795 events. Have the harness skip non-acting residents or shorten the wait so the log stays focused on decisions. (#329, #858, #1244)

## Loophole candidates

1. **Residents used the brain-writing phase to narrate strategy instead of acting** (residents) The minute-0 phase became a long strategy-brain drafting session (#124, #154, #160) while later phases produced mostly acknowledgements; the pre-game window was a cheaper, safer path than actual play. (#124, #154, #160)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 73: event "team_post" (seq 73) does not match its schema
- line 81: event "team_post" (seq 81) does not match its schema
- line 83: event "brain_written" (seq 83) does not match its schema
- line 84: event "retro_closed" (seq 84) does not match its schema
- line 92: event "team_post" (seq 92) does not match its schema
- line 100: event "team_post" (seq 100) does not match its schema
- line 107: event "team_post" (seq 107) does not match its schema
- line 114: event "brain_written" (seq 114) does not match its schema
- line 115: event "retro_closed" (seq 115) does not match its schema
- line 127: event "team_post" (seq 127) does not match its schema
- line 143: event "team_post" (seq 143) does not match its schema
- line 174: event "clue_game_started" (seq 174) does not match its schema
- line 175: event "clue_key_dealt" (seq 175) does not match its schema
- line 187: event "clue_given" (seq 187) does not match its schema
- line 188: event "clue_intent" (seq 188) does not match its schema
- line 229: event "team_post" (seq 229) does not match its schema
- line 238: event "team_post" (seq 238) does not match its schema
- line 240: event "clue_word_revealed" (seq 240) does not match its schema
- and 229 more
