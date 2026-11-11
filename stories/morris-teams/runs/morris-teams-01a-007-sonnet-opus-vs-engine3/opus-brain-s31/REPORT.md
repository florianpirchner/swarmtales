# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 24 (referee) |
| Counted | events #2 to #1527 (1000 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 24 minutes (to the end) |
| Final standings | unknown |
| Cost | 2.115 USD for this run (competitors 2.115, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 25 of 25 minutes without a submission; longest without one: minutes 0-24 (25) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, ILLEGAL_CELL 1, ILLEGAL_MOVE 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 spent the whole run alone and never submitted anything.** A01 was the only resident and was stuck on level 1 from minute 0 to the end (#1527), with no submission in minutes 0-24. Its first note says it did not post to the team channel because it was the only one on its side (#29). (#29, #1527)
- **A01 wrote a strategy brain but then broke the word cap three times.** A01 saved a 295-word brain at minute 0 (#29), then had writeBrain refused with BRAIN_TOO_LONG at 311, 391 and 303 words (#636, #1030, #1036). It only got a 291-word version saved later (#1049). (#29, #636, #1030, #1036, #1049)
- **A01 misread the rules during the moving phase and tried to place a stone.** At minute 12 A01 decided to place at 16, and the city refused both proposeMove with ILLEGAL_CELL (#810) and playMove with ILLEGAL_MOVE, telling it it was in the moving phase (#811). A01 then admitted it had miscounted and there were actually 8 pieces (#821). (#810, #811, #821)
- **A01 played a long, mostly defensive game and lost on having no legal move.** A01's own summary says it lost game 2 by turn 39 with no legal move left, and it identified O's placements on 20, 11 and 22 as creating two fork threats at 10 and 23 it could not block (#1049). It had already called 20->3 forced in the same position (#1011). (#1011, #1049)
- **A01 kept analysing and scouting threats through minutes 17-23 without acting on any of them.** From minute 17 to minute 23 A01 repeatedly scanned the board for one-move mills and fork points, for example blocking 10 at #1090, judging 24 a fork at #1105, and weighing a block of 8 or 16 at #1513. None of this produced a submission before the referee ended the run at minute 24 (#1527). (#1090, #1105, #1513, #1527)

## Problems

1. **Only one resident played, so the social and competition design never got exercised.** A01 was the only resident on the board and even noted it had nobody to discuss strategy with (#29). There were 0 DMs, 0 board posts and 0 transfers for the whole run. (#29)
2. **The brain word cap blocked A01's learning loop repeatedly.** A01 had writeBrain refused three times for being over 300 words (#636, #1030, #1036), and spent reasoning turns rewriting instead of playing (#633, #1048). (#633, #636, #1030, #1036, #1048)
3. **A01 misunderstood the phase rules and misplaced a move.** A01 tried a placement on 16 while the game was in the moving phase, and the city refused it as ILLEGAL_CELL (#810) and ILLEGAL_MOVE (#811). Its own reasoning shows it lost track of piece counts (#821). (#810, #811, #821)
4. **A01 stalled: 24 minutes on level 1 with no submission at all.** The facts record A01 on level 1 from minute 0 to 24 and 25 quiet minutes with no submission (#1527). The run ended at minute 24 by the referee, so A01 never even reached a complete game story. (#1527)
5. **The run was very expensive for a single resident doing nothing but reasoning.** The run cost 2.115 USD for one resident that solved no levels and made no submissions. Most of that was reasoning lines, such as the dense threat scans at #115, #130 and #456, plus the rewrites at #633 and #1048. (#115, #130, #456, #633, #1048)

## Optimizations

- **Give the brain a generous cap or allow append-style notes.** A01 kept hitting the 300-word limit (#636, #1030, #1036). Raise the cap or let A01 append short lessons so it does not spend turns trimming text. (#636, #1030, #1036)
- **Add a per-turn phase reminder to tool errors.** The ILLEGAL_MOVE error already tells A01 that the move must be from*100+to (#811), but A01 still miscounted pieces (#821). Include the current phase and the resident's piece count and legal moves in every viewBoard response. (#810, #811, #821)
- **Seed the game with at least two residents per side so the social mechanics are tested.** There were 0 DMs and 0 posts, and A01 explicitly had no one to talk to (#29). The story's team and competition features need a second resident to mean anything. (#29)
- **Bound private reasoning length or frequency per minute.** A01 produced 40+ reasoning lines in 24 minutes, many of them long threat scans (#115, #130, #456, #1319), for 2.115 USD with nothing solved. Cap reasoning tokens per minute or ask for a decision plus a short justification. (#115, #130, #456, #1319)
- **Add a clock pressure hook so a stuck resident is nudged to submit or forfeit.** A01 sat on level 1 for 24 minutes with no submission (#1527). A nudge after a set number of quiet minutes, such as a hint or a forced move, would produce a playable run. (#1527)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 16: event "brain_written" (seq 16) does not match its schema
- line 17: event "retro_closed" (seq 17) does not match its schema
- line 33: event "game_started" (seq 33) does not match its schema
- line 47: event "move_proposed" (seq 47) does not match its schema
- line 48: event "consensus_reached" (seq 48) does not match its schema
- line 50: event "move_played" (seq 50) does not match its schema
- line 51: event "move_played" (seq 51) does not match its schema
- line 52: event "move_scored" (seq 52) does not match its schema
- line 53: event "move_scored" (seq 53) does not match its schema
- line 62: event "move_proposed" (seq 62) does not match its schema
- line 63: event "consensus_reached" (seq 63) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 68: event "move_scored" (seq 68) does not match its schema
- line 77: event "move_proposed" (seq 77) does not match its schema
- line 78: event "consensus_reached" (seq 78) does not match its schema
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- and 507 more
