# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-moves-threats-coach-g4-p80` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 32 (referee) |
| Counted | events #3 to #2001 (1610 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 32 minutes (to the end); A02 on level 1 from minute 0 for 32 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.142 USD for this run (competitors 0.142, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0034 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 33 of 33 minutes without a submission; longest without one: minutes 0-32 (33) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, ILLEGAL_MOVE 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents opened with book chess and traded the first games tactically.** A01 played the Ruy Lopez/Italian plan (#108, #982) and A02 answered in Berlin/Giuoco style (#116, #1014). The games were decided by tactical slips (Nd5 lost to exd5, #268; Qb5 lost to axb5, #397; Re3 fell to fxe3, #1233) rather than by any story mechanic. (#108, #268, #397, #1233)
- **A01 resigned game 1 down a queen, and A02 resigned game 3 down heavy material.** A01 blundered its queen with Qb5 and resigned on move 17 (#405, #425, #434). A02 lost material to e4xf5 and resigned game 3, putting A01 ahead 2-1 (#1418, #1470, #1504). (#405, #425, #434, #1418, #1504)
- **Residents wrote strategy brains but hit the word limit repeatedly.** A01 tried three times to save an updated brain and was refused BRAIN_TOO_LONG each time (#919, #936, #1493). A02 saved versions 1-4 successfully and noted its new pawn-capture checks (#52, #930, #1504). (#919, #936, #1493, #1504)
- **Both residents spent many minutes on viewBoard/readBrain turns because playMove was locked.** A01 and A02 repeatedly reasoned that playMove was missing from the tool list and only viewed the board (#92, #461, #1008, #1634). This is time spent on phase-waiting, not on decisions. (#92, #461, #1008, #1634)
- **Neither resident ever used the social layer.** The facts record 0 DMs, 0 board posts and 0 group posts, and the log shows only self-talk (#52, #868) with no message to the other resident or the coach. (#52, #868)

## Problems

1. **No level was solved; both residents were stuck on level 1 for all 32 minutes.** The facts show A01 and A02 stuck on level 1 from minute 0 to 32 with 0 correct submissions. The games played (#108 onward) never advanced either resident past level 1. (#108)
2. **Long tool-locked waiting burned most of the clock.** Minutes passed with only viewBoard/readBrain available while residents waited for their opponent (#92, #461, #1014). With 33 quiet minutes and no submission, the pace of the loop, not chess difficulty, drove the outcome. (#92, #461, #1014, #1634)
3. **The brain word limit blocked A01's learning loop.** A01 was refused three times with BRAIN_TOO_LONG at 188, 167 and 161 words against a 150 limit (#919, #936, #1493). A01's lessons from games 1-3 were therefore not persisted as intended. (#919, #936, #1493)
4. **Residents misread tool availability as game phase state.** Residents inferred from the tool list whether it was their turn or the game had ended (#45, #867, #1008, #1567), which often misled them about the actual position and pace. (#45, #867, #1008, #1567)
5. **Illegal-move retries cost turns.** A01 tried g6f6 and A02 tried b4d4, both refused ILLEGAL_MOVE (#858, #1311). Each refusal noted the board was unchanged and returned a legal move list, so the move-notational mistake cost a turn. (#858, #1311)

## Optimizations

- **Give residents an explicit turn indicator instead of inference from the tool list.** Add a board field stating whose move it is and the current phase, so residents stop probing viewBoard to guess (#92, #461, #1008). This addresses the tool-locked waiting problem. (#92, #461, #1008)
- **Raise or auto-summarize the brain word limit.** The 150-word cap refused A01's post-game lessons three times (#919, #936, #1493). Either increase the limit or have the harness trim to the limit so the strategy persists. (#919, #936, #1493)
- **Show the required move notation in each illegal-move refusal.** Both residents used wrong-format moves (#858, #1311). The refusal already returns a legal move list; add a one-line notation example (square-to-square, e.g. e7f6) so the next attempt lands. (#858, #1311)
- **Add an explicit nudge to use the social/coach layer.** With 0 messages (#52, #868), the design's social dimension never fired. Prompt residents at game end to send one message to the opponent or coach, or make the coach note a required turn. (#52, #868)
- **Shorten phase-wait time or let residents bank reasoning while waiting.** Most minutes were waiting for the opponent (#92, #461, #1634). Allow the waiting resident to submit precomputed candidate moves or cap the wait so the 32-minute budget is spent on decisions. (#92, #461, #1634)

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
- line 86: event "move_played" (seq 86) does not match its schema
- line 87: event "move_scored" (seq 87) does not match its schema
- line 102: event "move_played" (seq 102) does not match its schema
- line 103: event "move_scored" (seq 103) does not match its schema
- line 111: event "move_played" (seq 111) does not match its schema
- line 112: event "move_scored" (seq 112) does not match its schema
- line 119: event "move_played" (seq 119) does not match its schema
- line 120: event "move_scored" (seq 120) does not match its schema
- line 134: event "move_played" (seq 134) does not match its schema
- and 371 more
