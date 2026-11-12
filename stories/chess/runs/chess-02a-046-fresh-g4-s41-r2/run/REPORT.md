# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-12 |
| Story | `chess-fresh-g4-p80` |
| Seed | 41 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 49 (referee) |
| Counted | events #3 to #2844 (2279 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 49 minutes (to the end); A02 on level 1 from minute 0 for 49 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.282 USD for this run (competitors 0.282, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0052 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 50 of 50 minutes without a submission; longest without one: minutes 0-49 (50) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 10, TOOL_LOCKED 5 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents held the same opening script in every game and never broke from it.** A01 opened 1.e4 and A02 answered 1...e5, with the Ruy Lopez repeated from #95/#103 through #2210/#2200 in all four games; neither resident adapted its opening to the opponent it had just played. (#95, #103, #1543, #1551, #2200, #2210)
- **A01 lost game 1 on material at the move cap and wrote the lesson into its brain.** A01 recorded at #939 that it lost game 1 to A02 on material at the 40-move cap and made 'count material more often' its v2 brain lesson, but the same material lapses recurred in games 2-4 (e.g. #1384 Black up 34-21, #2779 Black up 15-7). (#904, #935, #939, #1384, #2779)
- **A01 won game 2 by checkmate after exploiting A02's pinned queen.** A02 tried Qf3 while its queen was pinned on f1 (#1452 refused, legal move Qxe1 only), then A01 ended the game with 26...Rxe1# and reported the score 1-1 (#1502, #1506). (#1452, #1459, #1502, #1506)
- **A02 dropped a rook around move 30 in game 3 and lost.** A02's own retrospection at #2151 says game 3 was lost after it dropped a rook around move 30 in the Ng4 line; A01's #2050 and #2119 show Black's position collapsing to a lone king and pawns. (#2050, #2119, #2151)
- **A02 lost game 4 as well, again conceding a large material edge.** Late in game 4 A02 counted itself at 7 points against Black's 15 (#2790) and down about eight points (#2810), so the run ended with A01 leading the series three games to one. (#1502, #1506, #2790, #2810)
- **Game turns were gated by a tool lock that repeatedly froze both residents.** playMove and resign locked every opponent turn (#436, #1144, #2256), and writeBrain was refused at #815, #852, #2749 and #2828, so residents spent many turns on viewBoard/readBrain instead of play. (#436, #815, #852, #1144, #2256, #2828)

## Problems

1. **The facts report zero submissions and both residents 'stuck' on level 1 for the whole run, even though four games were played.** The computed facts say levels solved: none, 0 submissions, 50 quiet minutes, while the log shows games 1-4 being played to checkmate and to the move cap (#1502, #935). The harness's progress metric does not capture chess play at all, so the run reads as a total stall. (#935, #1502, #2151)
2. **Ten illegal-move refusals show residents repeatedly misreading the board.** Refusals at #413, #658, #701, #796, #1100, #1140, #1452, #1893, #2529 and #2680 came from guessed piece locations, e.g. A02 admitting at #807-#808 that it had imagined a rook on e8 that was not in the FEN. (#413, #658, #796, #807, #1100, #1893, #2680)
3. **Board-reading consumes nearly every reasoning line; play is a minority of the work.** Almost every REASONING line from #39 to #2838 is a square-by-square re-read of the FEN, with material totals recalculated several times per game (#1172, #1233, #2608). Little of it converts into better moves, since the same counting errors recur (e.g. #1384 vs #2023). (#39, #1172, #1233, #1384, #2608)
4. **The move cap decided game 1 instead of chess, which the residents perceived as the loss condition.** A01 says at #904 and #939 that it fell behind in material and 'the move cap decided the game', so the game ended on the 40-move cap without checkmate and the resident learned a scoring rule rather than a chess lesson. (#904, #935, #939)
5. **writeBrain is unavailable during play, so learning only happens at a retro window.** writeBrain was refused five times (#815, #852, #2749, #2786, #2828), and A01 noted at #436 that it can only write 'outside the retro window'. The brain updates at #939 and #1506 happened only after games ended, so mid-game lessons like the pin recognition at #1459 could not be saved when they mattered. (#436, #815, #1459, #2749, #2828)
6. **No messages, transfers or group posts occurred, so the social layer was entirely unused.** The facts record 0 DMs, 0 board posts, 0 group posts and 0 transfers; residents never addressed each other, only SAYS TO ITSELF (#52, #939, #1502), so any design that expects negotiation or competition between residents got none. (#52, #939, #1502)

## Optimizations

- **Make the progress metric count games and moves, not just level submissions.** The facts report 0 submissions while the log shows four completed games (#1502) and several checkmates; a per-game win/loss/draw counter would stop a working run from being reported as a stall. (#935, #1502, #2151)
- **Give residents a verified board view before each move instead of making them re-parse the FEN.** The 10 ILLEGAL_MOVE refusals (#413, #658, #701, #796, #1100, #1140, #1452, #1893, #2529, #2680) all stem from misread positions such as the phantom rook on e8 (#807). A tool that returns legal moves for each piece, as the refusals already do, could be surfaced pre-emptively. (#413, #807, #1140, #1893, #2680)
- **Unlock a small note field during play so mid-game corrections persist.** The pin lesson learned at #1459 never reached the brain because writeBrain was locked (#815, #852); a short per-move note would let residents carry live observations into the next opening repetition. (#815, #852, #1459, #2828)
- **Replace the 40-move cap with a clear win condition or advertise the cap up front.** Game 1 was decided by the move cap (#904, #939) rather than by chess, so the story should either remove it or list it in the rules so residents plan for it. (#904, #935, #939)
- **Add a short instruction that residents may talk to each other if the social layer is meant to matter.** With 0 DMs and 0 posts, the intended social dimension never appeared (#52, #1502); naming a purpose for messaging, such as challenging the opponent between games, would give residents a reason to use it. (#52, #939, #1502)
- **Cap repeated opening coverage to force variation across games.** All four games repeated the same Ruy Lopez line (#95/#103, #1543/#1551, #2200/#2210); alternating colours plus a rule against repeating the prior game's first six moves would reveal more of each agent's ability. (#95, #103, #1543, #1551, #2200, #2210)

## Loophole candidates

None found.

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
- line 73: event "move_played" (seq 73) does not match its schema
- line 74: event "move_scored" (seq 74) does not match its schema
- line 82: event "move_played" (seq 82) does not match its schema
- line 83: event "move_scored" (seq 83) does not match its schema
- line 89: event "move_played" (seq 89) does not match its schema
- line 90: event "move_scored" (seq 90) does not match its schema
- line 98: event "move_played" (seq 98) does not match its schema
- line 99: event "move_scored" (seq 99) does not match its schema
- line 106: event "move_played" (seq 106) does not match its schema
- line 107: event "move_scored" (seq 107) does not match its schema
- line 116: event "move_played" (seq 116) does not match its schema
- and 545 more
