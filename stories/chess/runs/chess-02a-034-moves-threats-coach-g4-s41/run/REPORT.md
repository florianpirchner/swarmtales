# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-moves-threats-coach-g4-p80` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 31 (referee) |
| Counted | events #3 to #1870 (1511 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 31 minutes (to the end); A02 on level 1 from minute 0 for 31 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.135 USD for this run (competitors 0.135, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0034 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 32 of 32 minutes without a submission; longest without one: minutes 0-31 (32) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 resigns game 2 after losing its queen to a defended square** A02 played Qxc3 into a square covered by the bishop on d2, lost its queen to Bxc3, and resigned at #888. A01's own note at #855 says it had thought d2 could not reach c3. This is the second game decided by a one-move capture blunder. (#845, #855, #888)
- **A01 resigns game 3 after Qxa7 into a bishop's diagonal** A01 took the a7 pawn at #1183 and admitted at #1205 that Bc5 covers a7 along the b6 diagonal, so it lost its queen and resigned. A02's best win came from the same kind of square check it had been coached to do after its own game-2 loss. (#1183, #1205, #1249)
- **The series runs 1-1 after three games with both residents repeatedly blundering** A02 records the match as 1-1 after its game-3 win at #1245 and #898, and A01 records the same at #1249. Every game was decided by resignation: pawn-attack and diagonal oversights, not by the coach's tactics. (#523, #898, #1245, #1249)
- **A02's written brain is rejected three times for length** A02's writeBrain calls at #869, #1225 and one more were refused with BRAIN_TOO_LONG against the 150-word limit (156, 168 words). A01 was also refused at #1219 (156 words). The rule meant to shape strategy never accepted a new version. (#869, #1219, #1225)
- **Tool availability messages flip-flop and get read as an opponent's turn** A01 at #145 and A02 at #110 and #549 all saw playMove missing and concluded the turn had passed; A01 later found it open again at #1299. The residents repeatedly spent a step on viewBoard or readBrain because the tool list changed under them. (#110, #145, #549, #1299)
- **The whole run has no submissions and no game counted toward a level** Both residents played several chess games in-chat, but the facts show 0 correct and 0 wrong submissions, 0 messages and 32 quiet minutes, ending at the referee at minute 31 (#1870). The chess work never turned into a scored level. (#1870)

## Problems

1. **The game is unwinnable in the given time: both residents stall on level 1 for the entire run** A01 and A02 are stuck on level 1 from minute 0 to minute 31 with zero submissions (facts table; #1870 at the end). They play chess in their reasoning but nothing they do is scored as a submission. (#1870)
2. **The strategy-brain mechanic is blocked by its own word limit** BRAIN_TOO_LONG fires three times (#869, #1219, #1225) and each time the resident's giraffe lesson is discarded. The residents keep trying to write the same lesson, so the limit lands exactly on the useful updates. (#869, #1219, #1225)
3. **The tool list changes without a clear reason, so residents misread turn order** A02 reads playMove's absence as 'not my turn' at #110 and #549 and spends turns on viewBoard, while A01 sees the same pattern at #145 and #597. The contradiction between the notice and the open tools is called out explicitly at #1277 and #1299. (#110, #145, #597, #1277, #1299)
4. **No messages, no board posts and no transfers: the social layer is unused** Facts show 0 DMs, 0 board posts and 0 transfers, while every log line is either a private REASONING or a SAYS TO ITSELF. The residents never interact with each other, so the designed social-competition premise is absent. (#527, #888, #1245)
5. **Both residents keep miscounting material, which distorts their chess coaching** A01 recounts material at #308, #1482 and #1603, and A02 at #1491, #1514 and #1611, with the totals often disagreeing. The result is a chess lesson that churns rather than resolves, which the coach's feedback (#507) then judges. (#308, #507, #1482, #1603, #1611)
6. **The gambit maker is idle and the run's spending cannot be tied to a story** The facts list gamemaker as unknown with 0 actions and 0.000 USD, while the story is 'chess-moves-threats-coach-g4-p80' with no 000-run.json story. The referee ends the run at minute 31 (#1870) before any game structure produces a result. (#1870)

## Optimizations

- **Raise or apply the brain word limit before the write, and keep the useful lesson** Refusals at #869, #1219 and #1225 throw away the only strategic lessons the residents produce. Truncating to the limit or accepting a partial brain would let the lesson survive the limit. (#869, #1219, #1225)
- **Make the tool list stable and obviously player-triggered** Residents at #110, #549, #597 and #1299 read a missing playMove as a turn change. The harness should say explicitly that the turn is the opponent's or keep playMove visible, so each step isn't spent checking the board. (#110, #549, #597, #1299)
- **Score each completed game or move as a submission so the level advances** With 0 submissions and 32 quiet minutes (#1870), the chess work is invisible to the score. Logging each played game as a submission would make the level track the coaching games. (#190)
- **Wire the foreclosure/board into the chess loop so the residents actually talk** 0 messages and 0 DMs (#527, #888) despite two residents disagreeing is a missing prompt, not a missing feature. Adding a post-game coach note the opponent must read would create the social layer. (#527, #888, #898)
- **Give the gambit maker a scripted action before minute 31** The gambit maker has 0 actions and the referee ends the run at minute 31 (#1870), with the level 1 stall unbroken. A scheduled scenario or a forced hint at low minute would break the stalemate. (#1870)
- **Have the coach or the harness correct material counts instead of letting reasoning drift** The residents disagree about material at #308, #1603 and #1611. A verified count shown to the resident would stop it recoaching the same mistake. (#308, #1603, #1611)

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
- line 121: event "move_played" (seq 121) does not match its schema
- and 339 more
