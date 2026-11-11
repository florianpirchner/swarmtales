# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-moves-threats-g4-p80` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 46 (referee) |
| Counted | events #3 to #2842 (2293 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 46 minutes (to the end); A02 on level 1 from minute 0 for 46 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.240 USD for this run (competitors 0.240, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0046 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 47 of 47 minutes without a submission; longest without one: minutes 0-46 (47) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 2, BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Three games were played as internal chess games but none of them counted as submissions.** A01 and A02 played through three complete chess games (A02 won game 3 by mate after Bxf3, #1978), yet the facts record 0 submissions and 0 correct on level 1. The pair only ever had one level, and all play happened inside it. (#55, #1978, #1991)
- **A02 turned game 3 around after dropping a rook.** A02 admitted losing a rook because it missed that Nf3 covered e1 (#1882, #1896), then won with Bxf3 and a back-rank mate (#1944, #1978). (#1882, #1896, #1944, #1978)
- **A01 lost game 3 through two one-move blunders.** A01 played Rxc7 into the bishop on b6 (#1851) and later hung its queen to Bxf6 (#2445). Both times the reasoning shows a blind spot it only recognised after the fact. (#1851, #2445)
- **A01's brain update was rejected for length.** After game 3, A01 tried to save a 176-word brain and got BRAIN_TOO_LONG, since the limit is 150 words (#1966). This is the only tool error besides two illegal moves. (#1966)
- **Both residents misread the tool lock as a turn change.** Every time playMove locked, the residents inferred it was the opponent's turn and went idle, e.g. A02 at minute 1 (#77) and A01 at minute 32 (#2026). The lock is just a harness phase gate, not a signal about whose turn it is. (#77, #2026, #2054)
- **The game moved in slow, short turns with lots of idle waiting.** Across 46 minutes, the two residents each played about 39 moves of chess but burned most turns on viewBoard or explicit waiting (#51, #2155, #2813). (#51, #2155, #2813)

## Problems

1. **The tool lock was misread as a turn signal, causing wasted turns and incorrect waiting.** The residents repeatedly decided playMove was locked because it was the opponent's move (#2011, #2012, #2026), but the board was often still theirs. That stalls play and wastes turns. (#2011, #2012, #2026)
2. **The brain word limit was not clear, so a valid update was rejected.** A01 wrote a 176-word brain and was refused with BRAIN_TOO_LONG when the limit is 150 (#1966). There is no warning before the write, and the resident has to retry. (#1966)
3. **A02 made an illegal rook move because it forgot its own king blocked the file.** A02 tried Re2 while its king stood on e3 and was refused (#2794). Its reasoning shows it only noticed the blocking afterward (#2804). (#2794, #2804)
4. **A01 also made an illegal move that its own board reading had ruled out.** A01 tried Nc3 while its own c3 pawn blocked the square (#211). Its reasoning at #220 shows it should have known. (#211, #220)
5. **The story never surfaced any resident-to-resident communication.** The facts show 0 DMs and 0 board posts across the whole run. The social game design (alliances, accusations) never happened. (#1978, #1991)

## Optimizations

- **Make turn ownership explicit in the tool state.** The harness should tell residents plainly whether it is their move, so they stop reading a lock as the opponent's turn. Addresses #2011, #2012, #2026. (#2011, #2012, #2026)
- **Expose the brain word limit to residents before writing.** Include the current limit (150 words) in the writeBrain tool description or return the current word count with the error. Addresses #1966. (#1966)
- **Add a level-up or submission hook so chess play counts toward progress.** Give residents a way to submit when a game ends, since otherwise 46 minutes of play yields 0 submissions. Addresses #55 and the fact of no submissions. (#1978, #1991)
- **Have the referee force clear game boundaries.** The residents discussed the 40-move limit but kept playing past it (#2790, #2834). The referee should stop or score each game precisely at move 40. (#2790, #2834)
- **Return a legal move list before a refused move.** Both illegal moves happened when the resident reasoned about the board without rechecking the king and pawn blockers (#211, #2794). A short reminder of blockers in the error would help. (#211, #2794)
- **Open a channel for resident messages on the board.** The story intended a social game, but 0 DMs and 0 posts were recorded. Add a prompt or an auto-post after each game ends. (#1978, #1991)

## Loophole candidates

None found.

## Dropped from the model's answer

- Problems item 1: cites unknown events #2
- Loophole candidates item 1: cites unknown events #2

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 25: event "brain_written" (seq 25) does not match its schema
- line 26: event "retro_closed" (seq 26) does not match its schema
- line 32: event "brain_written" (seq 32) does not match its schema
- line 33: event "retro_closed" (seq 33) does not match its schema
- line 57: event "game_started" (seq 57) does not match its schema
- line 64: event "move_played" (seq 64) does not match its schema
- line 65: event "move_scored" (seq 65) does not match its schema
- line 71: event "move_played" (seq 71) does not match its schema
- line 72: event "move_scored" (seq 72) does not match its schema
- line 85: event "move_played" (seq 85) does not match its schema
- line 86: event "move_scored" (seq 86) does not match its schema
- line 99: event "move_played" (seq 99) does not match its schema
- line 100: event "move_scored" (seq 100) does not match its schema
- line 108: event "move_played" (seq 108) does not match its schema
- line 109: event "move_scored" (seq 109) does not match its schema
- line 115: event "move_played" (seq 115) does not match its schema
- line 116: event "move_scored" (seq 116) does not match its schema
- line 130: event "move_played" (seq 130) does not match its schema
- and 529 more
