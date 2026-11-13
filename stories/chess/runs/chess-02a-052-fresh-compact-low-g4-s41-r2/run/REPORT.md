# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-13 |
| Story | `chess-fresh-compact-g4-p80` |
| Seed | 41 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 47 (referee) |
| Counted | events #3 to #2613 (2094 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 47 minutes (to the end); A02 on level 1 from minute 0 for 47 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.176 USD for this run (competitors 0.176, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0099 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 48 of 48 minutes without a submission; longest without one: minutes 0-47 (48) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 9, TOOL_LOCKED 6, BRAIN_TOO_LONG 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 wins all four games while A01 resigns twice and gets mated twice.** A02 takes game 1 when A01 resigns (#577), game 2 by mate with Qe8# (#1362), game 3 when the retro confirms A01 resigned (#1741), and game 4 is still running at the end. A02's scoreboard reads A02 3, A01 0 after game 3 (#1754). Both residents stay on level 1 the whole run (facts). (#577, #1362, #1741, #1754)
- **Both residents think the game has not started while the board is already live.** At minute 0 A01 says there is no position to play (#52) and A02 says the first game hasn't started (#56), yet by minute 1 A01 is already choosing Bb5 (#93) and A02 a6 (#101). The residents' own narration of the phase contradicts their play. (#52, #56, #93, #101)
- **Repeated tool-lock notices interrupt play mid-game.** A01 is told at #320 and #752 that playMove is locked while its own last move went through, and A02 hits the same notice at #514 and #1081. The residents spend turns re-checking the board instead of moving, which wastes minutes. (#320, #514, #752, #1081)
- **Illegal moves from misreading the board waste turns.** A01 tries c6d7 (#792), d8b6 (#859, #2039), c8e6 (#2077) and e6f4 (#2202); A02 tries b8c6 (#1535), d8c7 (#1580), b1b7 (#2308) and Nc3 (#2057). In each case the tool returns ILLEGAL_MOVE and the board is unchanged, and the residents then re-parse the position in long reasoning lines. (#792, #859, #1535, #1580, #2039, #2057, #2077, #2202, #2308)
- **Brain writes are refused for length or tool lock, and A02 notes it.** A01's writeBrain is refused as BRAIN_TOO_LONG at #533 and #1749, and A02's at #539; both also get TOOL_LOCKED (#1039, #1316, #1646, #2480, #2591). The brain is the intended learning channel, so these refusals cut off improvement between games. (#533, #539, #1039, #1316, #1646, #1749, #2480, #2591)

## Problems

1. **No resident ever levels up and the run ends with zero submissions.** The facts show 0 correct and 0 wrong submissions and 48 quiet minutes, with both residents stuck on level 1 from minute 0 to 47. The whole run is chess games with no level progress, so the intended seat competition never happens. (#577, #1362, #1741)
2. **Tool availability flips without warning and is treated as a user message.** A01 calls the lock notice 'a tool-availability notice rather than something the user asked for' (#320) and again at #1998 questions 'whether the new tool restrictions are genuine'. A02 reacts the same way at #430 and #514. Play is stopped for reasons the residents cannot see in their move loop. (#320, #430, #514, #1998)
3. **Residents misread the board and burn whole reasoning lines on piece placement.** Many REASONING lines (#272, #373, #455, #1585, #1659, #2063, #2117) are spent recounting material and square occupancy, and the illegal moves above follow from those misreads. The residents are not given a reliable board representation. (#272, #373, #455, #1585, #1659, #2063, #2117)
4. **The retro result and the board disagree, and residents notice.** A02 says the retro claims game 1 ended by White's resignation while the board showed move 24 still running (#536), and at #1741 it says it only played Qxf3 and did not see the game-3 resignation. The end-of-game state is not consistent with what the residents saw. (#536, #1741)
5. **Games start before residents know the game has started.** A01 and A02 both say 'the first game hasn't started yet' at minute 0 (#52, #56) yet are already moving by minute 1 (#93, #101). The phase signalling gives residents the wrong starting state. (#52, #56, #93, #101)

## Optimizations

- **Fix the tool-lock signalling so playMove is never locked during an active game.** Residents lose turns to viewBoard when playMove is suddenly locked (#320, #752, #514, #1081). Gate the lock only to genuine phase changes and state the phase in the system message, not as an ambiguous notice. (#320, #514, #752, #1081)
- **Give residents a reliable structured board instead of forcing them to parse FEN.** Most illegal moves follow long re-parsing of rank strings (#272, #1585, #2063). A machine-checked piece list would cut ILLEGAL_MOVE errors (#792, #1535, #2057). (#792, #1535, #1585, #2057)
- **Allow a longer or per-game brain so writeBrain stops being refused.** BRAIN_TOO_LONG refusals at #533, #539 and #1749 block the learning step between games. Raise the 150-word limit or let residents trim the brain with a dedicated tool. (#533, #539, #1749)
- **Make the retro result match what the board showed.** A02 sees the retro and board disagree on both game 1 (#536) and game 3 (#1741). Publish end-of-game state only after the final board snapshot is consistent with it. (#536, #1741)
- **Announce the start of each game explicitly to both residents.** Both residents believe no game has started at minute 0 (#52, #56) but move at minute 1 (#93, #101). A clear 'game N starts now' event would stop this confusion and make start levels meaningful. (#52, #56, #93, #101)

## Loophole candidates

1. **Residents treat 'view board and wait' as a valid action and never push for play.** (residents) When tools lock, A01 and A02 simply call viewBoard and 'wait' (#320, #430, #1081, #2163) instead of exploring alternatives, so the lock effectively becomes a quiet period. This is a safe path that bypasses the intended move loop. (#320, #430, #1081, #2163)
2. **Both residents commit to a fixed opening script regardless of the actual position.** (residents) A02 plays the Ruy Lopez a6 (#101, #1415) and Nf6 (#121, #1434) as 'standard' responses even after board misreads, and A01 repeats Bb5/library lines (#93, #1406). The scripted opening sidesteps reading the live board, which is where the errors then occur (#1535, #1580). (#93, #101, #121, #1406, #1415, #1434, #1535, #1580)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 58: event "game_started" (seq 58) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_scored" (seq 66) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- line 73: event "move_scored" (seq 73) does not match its schema
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_scored" (seq 81) does not match its schema
- line 87: event "move_played" (seq 87) does not match its schema
- line 88: event "move_scored" (seq 88) does not match its schema
- line 96: event "move_played" (seq 96) does not match its schema
- line 97: event "move_scored" (seq 97) does not match its schema
- line 104: event "move_played" (seq 104) does not match its schema
- line 105: event "move_scored" (seq 105) does not match its schema
- line 114: event "move_played" (seq 114) does not match its schema
- and 499 more
