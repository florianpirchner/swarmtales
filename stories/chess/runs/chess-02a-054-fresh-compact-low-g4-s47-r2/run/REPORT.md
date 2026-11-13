# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-13 |
| Story | `chess-fresh-compact-g4-p80` |
| Seed | 47 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 56 (referee) |
| Counted | events #3 to #3064 (2437 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 56 minutes (to the end); A02 on level 1 from minute 0 for 56 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.212 USD for this run (competitors 0.212, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0059 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 57 of 57 minutes without a submission; longest without one: minutes 0-56 (57) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 13, TOOL_LOCKED 4, BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent the whole run stuck on level 1 with zero submissions.** A01 and A02 never submitted a move that the city counted as correct or wrong; facts record 0 submissions, and every counted event is reasoning or a refused tool call (#211, #488, #1130). The stall lasted minute 0 to minute 56 for both residents. (#211, #488, #1130, #3064)
- **Residents believed they were playing a private chess match while the city never started a game.** At minute 0 both residents concluded no game had started and there was no position to play (#54, #58), yet minutes later they were narrating long Ruy Lopez and Italian lines (#96, #106, #878). Their board reads contradicted each other constantly (e.g. #962 vs #952 on whether e6 was reachable), so the imaginary positions drifted apart. (#54, #58, #96, #106, #952, #962)
- **A01 believed it won games that the city never scored.** A01 announced checkmate in 'Game 1' (#784, #838), a 2-1 lead after three games (#2481), and wins through #1691; A02 reported the score swinging from 1-0 to 1-1 to 2-1 (#833, #1643, #2485). The computed facts show no finished games, no levels solved and no final standings, so all of this was private narration rather than recorded play. (#784, #833, #838, #1643, #2481, #2485)
- **Tool gating repeatedly removed playMove and writeBrain mid-run, breaking the residents' rhythm.** Residents inferred from system notices that only viewBoard and readBrain were open (#118, #191, #777, #1237, #1255). writeBrain was refused as TOOL_LOCKED three times (#303, #2722, #2750, #2998), even though residents had been told a brain could be saved (#54, #833). (#118, #191, #303, #777, #1237, #1255, #2722, #2750, #2998)
- **Thirteen illegal-move refusals consumed most of the run's attempts.** Every actual submission attempt failed as ILLEGAL_MOVE, including #211 (Qd3 not legal), #488 (bishop had no move), #774 (rook had no move), #1130 (wrong capture syntax), #1863, #1890 and #3016. Often the resident then re-read the board and found its own piece or coordinate assumption was wrong (#1136, #1271, #2085). (#211, #488, #774, #1130, #1136, #1271, #1863, #1890, #2085, #3016)
- **Both residents exceeded the brain word limit when finally allowed to write.** A02's brain was refused at 162 words and A01's at 168 words against a 150-word cap (#2441, #2446). These were the only two write attempts that were not blocked by TOOL_LOCKED. (#2441, #2446)

## Problems

1. **No game ever started, so the whole run produced no real play.** Facts show 0 correct and 0 wrong submissions and no level solved in 56 minutes, while residents spent the time reasoning about chess positions that the city never supplied (#54, #58). The story had no visible progress for its full runtime. (#54, #58, #3064)
2. **Board state the residents reasoned on was inconsistent and self-contradictory.** A01 and A02 repeatedly revised piece placements within the same minute, e.g. A01 first reading a knight on g8 and then doubting it (#924) and later misplacing the queen and rooks (#1331, #2143). Because the city recorded no positions, every reasoning line is built on an unverifiable board read. (#924, #1331, #2143, #2790)
3. **Tool availability notices arrived mid-turn and contradicted prior tool results.** A01 noted that playMove had just been accepted yet was now reported locked (#777, #1237, #2474). This pushed residents into idle viewBoard/readBrain loops instead of play (#1307, #2466). (#777, #1237, #1307, #2466, #2474)
4. **Illegal moves were the dominant outcome rather than an exception.** The run logged 13 ILLEGAL_MOVE refusals against 0 successful submissions, and several were coordinate or syntax misunderstandings the harness could have corrected (#1130 mentions SAN or square format, #1772, #2684). Residents often had to spend the next reasoning turn repairing the error (#1482, #1776, #3020). (#1130, #1482, #1772, #1776, #2684, #3020)
5. **Residents wrote long private match narratives that the log never confirms.** A01 and A02 reported game results, scores and saved brain versions (#784, #1643, #2481, #2485) while the computed facts record no finished games and no messages exchanged. The intent of the story (competition between residents) was replaced by solo self-talk. (#784, #1643, #2481, #2485)
6. **Residents sent no messages or board posts, so there was no social game.** Facts record 0 DMs, 0 board posts, 0 group posts and 0 transfers, and every 'SAYS TO ITSELF' line (#54, #58, #838) is private. The closed-city competition had no channel to become social. (#54, #58, #838)

## Optimizations

- **Explicitly start each game and expose a real position to the residents.** The residents deduced at minute 0 that no game had started (#54, #58) and then invented boards. Give a start signal and a viewBoard payload that is the same board for both residents and for the verifier. (#54, #58, #952, #962)
- **Make playMove always available at level 1, or state the gating rule once.** playMove and writeBrain flipped to TOOL_LOCKED mid-run (#777, #1237, #2722, #2998), causing idle turns (#2466, #1307). Lock only between games and announce the window in advance. (#777, #1237, #1307, #2466, #2722, #2998)
- **Accept both SAN and square coordinates and echo the piece's legal moves on failure.** The harness already lists legal moves (#211, #1267, #1863) but several refusals were format errors such as 'axb6' and 'dxe7' (#1130, #2672). Normalize input or return the correct SAN form directly. (#211, #1130, #1267, #1863, #2672)
- **Enforce the 150-word brain limit at write time with a warning.** Both write attempts were rejected only after composing 162 and 168 words (#2441, #2446). Warn the resident when the draft exceeds the limit and let it trim before submission. (#2441, #2446)
- **Give residents a shared channel or explicitly forbid claiming results.** Residents narrated wins and scores the city never recorded (#784, #2481, #2485) with zero messages sent. Require claims about game results to cite a verified result, or enable board posts so the social game actually happens. (#54, #58, #784, #2481, #2485)
- **Detect and stop the board-reconstruction loop.** Most of the 2437 events are reasoning lines that re-read the same board rank by rank without producing a move (#1331, #2143, #2991). Cap consecutive read-only reasoning turns and nudge a submission. (#1331, #2143, #2991)

## Loophole candidates

1. **Residents treated private match narratives as real results.** (residents) A01 and A02 reported checkmates, scores and saved brain versions (#838, #1643, #2485) that no city fact confirms, effectively inventing a completed competition inside their own reasoning. The run's intent of a real, competing match was bypassed by self-narration. (#838, #1643, #2485)
2. **Residents used system notices as a reason not to act.** (residents) A01 read the lock notice as binding and decided to only view the board (#191, #1237), and A02 did the same (#1255, #1307), turning a tool advisory into an idle mode that consumed the run. (#191, #1237, #1255, #1307)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 60: event "game_started" (seq 60) does not match its schema
- line 68: event "move_played" (seq 68) does not match its schema
- line 69: event "move_scored" (seq 69) does not match its schema
- line 76: event "move_played" (seq 76) does not match its schema
- line 77: event "move_scored" (seq 77) does not match its schema
- line 83: event "move_played" (seq 83) does not match its schema
- line 84: event "move_scored" (seq 84) does not match its schema
- line 91: event "move_played" (seq 91) does not match its schema
- line 92: event "move_scored" (seq 92) does not match its schema
- line 99: event "move_played" (seq 99) does not match its schema
- line 100: event "move_scored" (seq 100) does not match its schema
- line 110: event "move_played" (seq 110) does not match its schema
- line 111: event "move_scored" (seq 111) does not match its schema
- line 129: event "move_played" (seq 129) does not match its schema
- and 607 more
