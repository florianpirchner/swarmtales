# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-07 |
| Story | `chess-moves-threats-g4-p80` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 31 (referee) |
| Counted | events #3 to #1876 (1515 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 31 minutes (to the end); A02 on level 1 from minute 0 for 31 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.140 USD for this run (competitors 0.140, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0033 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 32 of 32 minutes without a submission; longest without one: minutes 0-31 (32) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, ILLEGAL_MOVE 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent minute 0 locked out of play and only checked the board.** A01 and A02 both found playMove locked before game 1 and fell back to viewBoard, with no move made at minute 0 (#30, #36, #43). This set the pattern of long read-only turns that persisted all run. (#30, #36, #43)
- **Game 1 was decided by A01 hanging its queen, then resigning on move 28.** A01 played Qxd4 and lost the queen to the c5 pawn (#447), later resigned a clearly lost position (#623) and recorded the error itself (#650). A02 won as Black and logged its lessons (#660). (#447, #623, #650, #660)
- **Game 2 flipped when A01's b6 pawn took A02's queen on c5.** A01 captured White's queen with b6xc5 (#1022), and A02 admitted it had missed that the b6 pawn attacked c5 (#1026). A02 resigned and wrote up the loss (#1062). (#1022, #1026, #1050, #1062)
- **Game 3 was another queen blunder, this time A01's Qe3 falling to dxe3.** A02 saw dxe3 captures the queen for free (#1292), and A01 recognized the blunder at #1301 and resigned at #1324. That made the match A02 2, A01 1 with one game left (#1352). (#1292, #1301, #1324, #1352)
- **Illegal move refusal on a blocked c-file rook.** A02 attempted c8c2 and was refused as ILLEGAL_MOVE because the c4 pawn blocked the file (#476), then corrected to another idea (#480). This was the only refused move of the run. (#476, #480)
- **A02 repeatedly failed to save its brain within the word limit.** Three writeBrain attempts were refused with BRAIN_TOO_LONG at 159, 177 and 162 words against a 150-word limit (#1046, #1336, #1349). The lessons it wanted to keep were not stored on those tries. (#1046, #1336, #1349)

## Problems

1. **Both residents were stuck on level 1 for the entire 31-minute run.** The facts show A01 and A02 on level 1 from minute 0 to 31 with no level-ups, and no submission ever counted. The whole run was chess games inside level 1, never progress. (#623, #1324, #1876)
2. **Every turn began with an idle read-only phase.** Residents repeatedly found playMove locked and spent reasoning turns on viewBoard while waiting (#30, #104, #171, #686, #1097, #1400, #1484). This burned minutes and tokens without any game action. (#30, #171, #686, #1097, #1400, #1484)
3. **Same-side queen blunders show the residents never generalized the lesson.** A01 lost its queen to a pawn in game 1 (#447) and again in game 3 (#1292, #1301), despite writing the lesson into its brain at #650. The lesson was stored but not applied. (#447, #650, #1292, #1301)
4. **Brain word limit blocked the residents' own loss-saving notes.** Three straight writeBrain refusals at 159, 177 and 162 words (#1046, #1336, #1349) meant the strategy brain could not absorb the new lessons in the intended form. (#1046, #1336, #1349)
5. **Residents wasted turns on material recounts and self-contradicting tallies.** Many reasoning lines are spent re-counting pieces with inconsistent results (#162, #321, #906, #916, #1550, #1839). That is the bulk of the private thinking and crowds out move search. (#162, #321, #906, #1550, #1839)
6. **No messages, no transfers, no board posts all run.** The facts record 0 DMs, 0 board posts, 0 group posts and 0 transfers, so the social-competition layer of the design never engaged. (#43, #47, #660)

## Optimizations

- **Give residents an explicit wait/skip action so idle read-only turns are short.** Problem: turns wasted on viewBoard while playMove is locked (#30, #171, #1400). Add a cheap 'wait for opponent' tool that ends the turn immediately. (#30, #171, #1400)
- **Raise or warn on the brain word limit before the write.** Problem: three BRAIN_TOO_LONG refusals (#1046, #1336, #1349). Report the current word count in readBrain and reject over-length with a trim suggestion, or raise the cap. (#1046, #1336, #1349)
- **Auto-check pawn attacks on the resident's queen before allowing a queen move.** Problem: both A01 queen losses came from missed pawn attacks (#447, #1301). Surface a warning listing enemy pawn attacks on the target square before playMove. (#447, #1301)
- **Show a computed material and piece count in viewBoard.** Problem: residents spent most reasoning on miscounted material (#321, #906, #1550, #1839). Provide exact piece and point totals with the board. (#321, #906, #1550, #1839)
- **Add a level-progress or escalation hook so a 31-minute run is not all one level.** Problem: both residents stuck on level 1 the whole run with no submissions. Make the chess match end faster or feed points toward the next level. (#1876)

## Loophole candidates

1. **Residents leaned on the other side's clock to do nothing.** (residents) Faced with playMove locked, residents simply ended the turn with a 'waiting' note rather than seeking progress (#687, #747, #950, #995), turning each opponent turn into a free idle beat. (#687, #747, #950, #995)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 13: event "brain_written" (seq 13) does not match its schema
- line 14: event "retro_closed" (seq 14) does not match its schema
- line 23: event "brain_written" (seq 23) does not match its schema
- line 24: event "retro_closed" (seq 24) does not match its schema
- line 52: event "game_started" (seq 52) does not match its schema
- line 59: event "move_played" (seq 59) does not match its schema
- line 60: event "move_scored" (seq 60) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 74: event "move_played" (seq 74) does not match its schema
- line 75: event "move_scored" (seq 75) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 90: event "move_played" (seq 90) does not match its schema
- line 91: event "move_scored" (seq 91) does not match its schema
- line 98: event "move_played" (seq 98) does not match its schema
- line 99: event "move_scored" (seq 99) does not match its schema
- line 113: event "move_played" (seq 113) does not match its schema
- and 341 more
