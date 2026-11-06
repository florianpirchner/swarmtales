# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 34 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 37 (referee) |
| Counted | events #2 to #1630 (1226 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 37 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.097 USD for this run (competitors 0.097, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 38 of 38 minutes without a submission; longest without one: minutes 0-37 (38) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 opened the run with a full strategy plan but no game to play** At minute 0 A01 wrote a 202-word team brain covering opening junctions and intended to post once or twice, but found no board and no playMove tool (#15, #31, #39). It correctly reported the pre-game state and waited. (#15, #31, #39)
- **Game 1 was lost by blockade after a winning placement phase** A01 took 5 and 20, closed mills, and later judged it had 9 pieces to O's 7 after placing, but its pieces bunched and the only legal move was 8 to 9 (#103, #216, #249, #265). O won after 20 turns with no legal move for A01's side (#281). (#103, #216, #249, #265, #281)
- **The 22-23-24 mill kept re-opening and A01 could never block the reopen square** A01 repeatedly identified that O could freeze and reopen 22-23-24 by shuttling a piece out and back, and that it had no piece adjacent to 22, 23 or 24 to stop it (#907, #1051, #1103, #1285). It later named this exact trick as the cause of game 2's piece losses (#1386, #1404). (#907, #1051, #1103, #1285, #1386, #1404)
- **Game 2 was lost on pieces after a level placing phase** A01 judged the placing phase even at 9 v 9 with no mill for it, then was down 4 to 8 and finally reduced to two or three pieces as O re-closed mills (#1311, #1338, #1404). O won after 85 turns (#1404). (#1311, #1338, #1404)
- **Game 3 was in progress at the end with A01 building threats** A01 placed 5 and 20 again and set up a double threat at 9 (7-8-9 and 9-13-18) and then closed 9-13-18, removing O's 7 (#1573, #1594). The run ended at minute 37 before the game resolved (#1630). (#1573, #1594, #1630)
- **Both writeBrain attempts were rejected for length despite self-trimming** A01's brain updates failed twice with BRAIN_TOO_LONG, at 349 words (limit 300) after game 1 and at 319 words after game 2 (#268, #1392). It then re-saved shorter brains at 277 and 261 words (#281, #1404). (#268, #281, #1392, #1404)

## Problems

1. **A01 was alone and got zero help from messages or transfers** A01 said it would post to the team to get input (#15), but the run recorded 0 board posts, 0 DMs and 0 transfers, so its team-brain plan never involved a team. (#15)
2. **The brain word limit cost A01 two turns of work** Both writeBrain attempts were refused for exceeding 300 words (#268, #1392), forcing rewrites (#281, #1404) and leaving stale strategy in place while it played. (#268, #281, #1392, #1404)
3. **A01 spent the whole pre-game minute waiting without a move interface** At minute 0 A01 found writeBrain and playMove absent and the board showing game over (#31, #38), so its stated plan to post and brainstorm could not be carried out until the game started. (#31, #38, #39)
4. **A01 misread the board before acting at least twice** A01 thought it had fewer pieces than the board showed in game 1 (#72), and in game 3 it had to re-check whether 20 or 19 was occupied before playing (#1475, #1519). This produced tentative, defensive play. (#72, #1475, #1519)
5. **Long games ate the run's time budget** Game 2 ran 85 turns (#1404) and the run ended at minute 37 mid-game-3 (#1630), with the level never solved and A01 on level 1 for the entire 37 minutes. (#1404, #1630)

## Optimizations

- **Raise or warn on the brain word limit before submission** The 300-word cap caused two refused writes (#268, #1392). Either raise the limit, or have the tool return the current word count and allowed length so A01 can trim before submitting. (#268, #1392)
- **Give a single resident a visible way to use its team plan** A01 planned to post and to file a team brain (#15) but the run had 0 posts and 0 DMs. Provide a board or a scripted teammate so the team-brain idea is exercised, or drop team language from the persona. (#15, #39)
- **Cap or score game length so a level can be reached in a run** Two losses and a third game in progress left A01 on level 1 for 37 minutes (#1404, #1630). Add a turn cap per game or a draw rule that ends faster, so a stalled resident gets a fresh relevant board within the run. (#1404, #1630)
- **Make the reopen-square lesson actionable in the brain** A01 diagnosed the 22-23-24 reopen exploit (#1386, #1404) but still could not block it because no piece was adjacent (#1051). Have the trick playbook translate that into an opening-square preference, so the lesson changes its first moves. (#1051, #1103, #1386)
- **Add a board-state tool to stop piece-count misreads** A01 misjudged its own piece count and which squares were occupied (#72, #1475, #1519). Provide a board-summary read that lists occupied and free points so reasoning is grounded. (#72, #1475, #1519)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 18: event "team_post" (seq 18) does not match its schema
- line 25: event "brain_written" (seq 25) does not match its schema
- line 26: event "retro_closed" (seq 26) does not match its schema
- line 41: event "game_started" (seq 41) does not match its schema
- line 56: event "move_proposed" (seq 56) does not match its schema
- line 57: event "consensus_reached" (seq 57) does not match its schema
- line 64: event "move_played" (seq 64) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_scored" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 76: event "move_proposed" (seq 76) does not match its schema
- line 77: event "consensus_reached" (seq 77) does not match its schema
- line 79: event "move_played" (seq 79) does not match its schema
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_scored" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 91: event "move_proposed" (seq 91) does not match its schema
- line 92: event "consensus_reached" (seq 92) does not match its schema
- line 94: event "move_played" (seq 94) does not match its schema
- and 384 more
