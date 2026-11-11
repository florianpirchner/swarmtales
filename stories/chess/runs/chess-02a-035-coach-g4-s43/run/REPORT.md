# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-coach-g4-p80` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 49 (referee) |
| Counted | events #3 to #3003 (2431 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 49 minutes (to the end); A02 on level 1 from minute 0 for 49 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.266 USD for this run (competitors 0.266, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0047 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 50 of 50 minutes without a submission; longest without one: minutes 0-49 (50) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, ILLEGAL_MOVE 5, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Neither resident ever submitted a move; both stalled on level 1 for the whole run** A01 and A02 each began level 1 at minute 0 and were still there at minute 49, with no submission at all in minutes 0-49 (#9, #3003). Both spent early turns only reading the brain and viewing an empty board (#40, #46, #53). (#9, #40, #46, #53, #3003)
- **A02 built a material lead and converted it across games 2-3** A02 twice noted it was ahead on material in the opposite-coloured bishop ending (#1292, #1301) and won game 3 on material after 40 moves (#2328), moving to a reported 2.5-1.0 lead (#2340). It also claimed the game 1 win by mate (#497). (#1292, #1301, #2328, #2340)
- **A02's blunders were repeatedly caused by missed recaptures it later found itself** A02 admitted dropping a knight with 11...Nxe4 and a bishop with 14...Nxd5 (#497), then later again realized the d3 pawn recaptures on e4 after Nxe4 (#1781, #1790) and turned the brain update into a rule for it (#2319). (#497, #1781, #1790, #2319)
- **A01 lost its queen to a diagonal attack it had not seen** A01 played Qa4 and then realized the queen was hanging to Qd7 along the open c6-b5 diagonal (#1930); it later recorded this as the main lesson, dropping Qa4 on move 23 (#2340). (#1930, #2340)
- **A02 walked into a TOOL_LOCKED playMove at the start of each game** A02 tried to answer in the Ruy Lopez (#101) but learned only viewBoard and readBrain were open (#110), and the same pattern repeated at game starts (#46, #549, #2448). Only at #1819 did a playMove get explicitly REFUSED with TOOL_LOCKED. (#46, #101, #110, #549, #1819, #2448)
- **The brain word limit blocked nearly every retro update** The 150-word cap produced seven BRAIN_TOO_LONG refusals (#468, #473, #1376, #1383, #1397, #1407, #2316), forcing residents to spend turns trimming text instead of reflecting (#1386). (#468, #473, #1376, #1383, #1386, #1397, #1407, #2316)

## Problems

1. **No game ever started; the run produced zero moves and zero level-ups** Both residents stayed on level 1 for 49 minutes and the computed facts show 0 submissions and 0 correct answers (#3003). Early turns show residents seeing an empty board and concluding the first game had not started (#53, #57). (#53, #57, #3003)
2. **The tool lock was invisible until a resident guessed at it** Residents inferred playMove was locked only from the absence of the tool in their list (#40, #110, #549) and were sometimes refused with TOOL_LOCKED outright (#1819), making turns expire on viewBoard/readBrain calls. (#40, #110, #1819, #2448)
3. **The 150-word brain limit caused repeated wasted turns** Seven BRAIN_TOO_LONG refusals in the log (#468, #473, #1376) and A01 explicitly budgeting words down to about 120 (#1386) show the cap consumed turns that could have gone into play. (#468, #473, #1376, #1386)
4. **Illegal moves were attempted from a misread of the board** Five ILLEGAL_MOVE refusals including #379, #1323, #1794, #1840 and #2840 show residents proposing moves whose pieces had only one or a few legal destinations, meaning they were reasoning about a board state that did not match the city's. (#379, #1323, #1794, #1840, #2840)
5. **A02's material claims conflict with the city's scores** A02 at #256 said White was up 39-36 and at #278 tallied White as a knight ahead, while A01 read the same run differently (#344, #398), so residents were not working from a consistent scoreboard. (#256, #278, #344, #398)
6. **No social layer at all despite a closed city with residents** The facts show 0 DMs, 0 board posts and 0 group posts; the two residents only 'say to itself' (#53, #497, #2328) and never addressed each other. (#53, #497, #2328)

## Optimizations

- **Explicitly announce the phase and open tools to each resident** Add a per-turn phase banner (game open / retro window / locked) so residents stop guessing, since #40 and #110 show them inferring the tool list, and #1819 shows a tool call only failing on attempt. (#40, #110, #1819)
- **Raise the brain word budget or give a pre-trimmed template** Because the cap caused seven refusals (#468, #473, #1376), the next version should either raise the limit above 150 or supply a fixed skeleton so retro turns go into lessons (#2319) rather than word counting (#1386). (#468, #473, #1376, #1386, #2319)
- **Make the opening legal-move list visible before the first move** Residents guessed moves and got refused five times (#379, #1323, #1794), and A01 only learned a piece's real options from the ILLEGAL_MOVE message (#1844). Showing legal moves of the piece before submission would save turns. (#379, #1323, #1794, #1840, #1844)
- **Gate submission on actual game state** The run recorded 0 submissions (#3003) while residents tried to play into an empty board (#53, #57); the harness should either open the game or tell them to wait without consuming a turn. (#53, #57, #3003)
- **Add a shared scoreboard both residents can read** A02's tallies (#256, #278) and A01's (#344, #398) diverge, so give both one authoritative material/score display to reduce misjudgements like #1930 and #2565. (#256, #278, #344, #398, #1930)
- **Add a social-pressure beat to force interaction** Zero messages were sent (#3003 despite the message counters being 0), so seed a mandatory board post or a game-with-a-seat mechanic at the start to give residents a reason to act against each other. (#53, #497, #2328)

## Loophole candidates

1. **Residents can burn turns on reasoning without ever acting** (residents) A01 and A02 produced long reasoning chains ending in 'wait for the opponent' (#1332, #1333, #2844), so a level can be idled with no submission and no penalty, which is exactly the observed 49-minute stall (#3003). (#1332, #1333, #2844, #3003)
2. **Residents can claim a result the city did not record** (residents) A02 said 'I won game 1 as Black by checkmate' (#497) and later counted a 2.5-1.0 match lead (#2328), but the computed facts show zero submissions and no recorded result, so self-reported results went unverified. (#497, #2328, #3003)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 27: event "brain_written" (seq 27) does not match its schema
- line 28: event "retro_closed" (seq 28) does not match its schema
- line 34: event "brain_written" (seq 34) does not match its schema
- line 35: event "retro_closed" (seq 35) does not match its schema
- line 59: event "game_started" (seq 59) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 73: event "move_played" (seq 73) does not match its schema
- line 74: event "move_scored" (seq 74) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 96: event "move_played" (seq 96) does not match its schema
- line 97: event "move_scored" (seq 97) does not match its schema
- line 104: event "move_played" (seq 104) does not match its schema
- line 105: event "move_scored" (seq 105) does not match its schema
- line 118: event "move_played" (seq 118) does not match its schema
- and 552 more
