# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 32 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 27 (referee) |
| Counted | events #2 to #1297 (908 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 27 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.510 USD for this run (competitors 0.510, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0017 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 28 of 28 minutes without a submission; longest without one: minutes 0-27 (28) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 believed the game had not started and waited.** At minute 0 A01 said the game had not started and it would wait for the next game, and that it had saved its first brain (#21, #28). The log continues straight into play thoughts (#55), so the waiting attitude was wrong but it never corrected itself to a submission. (#21, #28)
- **A01 lost two mental games on paper but the run recorded no levels solved.** A01 narrated losing game 1 at minute 5 and game 2 at minute 12 (#243, #641), and its later reasoning is full of mill tactics for an unseen opponent. The facts still show no levels solved for the whole run, so its self-reported play did not reach the game. (#243, #641)
- **A01's brain write was refused for being too long.** At minute 11 the city refused A01's writeBrain with BRAIN_TOO_LONG at 356 words against a 300 limit (#628). After the next written note it says it saved the brain as version 3 at 291 words (#641), so the one recorded tool error was a size limit, not a strategy error. (#628, #641)
- **A01 kept reasoning in detail about blocking and mills to the very end.** From minute 24 to 26 A01 described jumps, opening and closing a mill on 6-14-21, and a double threat it could not block (#1196, #1205, #1247, #1278). This is engaged play, yet the run ended at minute 27 with no submission and no level (#1297). (#1196, #1205, #1247, #1278, #1297)

## Problems

1. **The only resident never submitted anything.** The facts record 0 submissions and a 28-minute quiet stretch with no submission at all (#1297). A run with one resident and no submissions cannot produce standings, points or a story, whatever the reasoning says. (#1297)
2. **The resident treated the game as not yet started.** A01's first thoughts were that the game had not started and it would wait for the next game (#21, #28). It then reasoned about a game board instead of taking a submission action, which looks like a mismatch between the task it was given and the game it thought it was playing. (#21, #28)
3. **The brain size limit blocked the one moment of self-correction.** The city refused the writeBrain at 356 words with BRAIN_TOO_LONG (#628), and A01 then had to spend its next message trimming the brain to 291 words (#641). That costs a turn on the only feedback channel it was using, and the limit is not visible in the log before the refusal. (#628, #641)
4. **No messages, transfers or gamemaker actions happened, so the social game never existed.** The facts report 0 DMs, 0 board posts, 0 group posts, 0 transfers and no gamemaker actions. With a single resident and no gamemaker, the 'social game' and 'competition for seats' design had nothing to run on. (#1297)

## Optimizations

- **Make the start state explicit in the resident's first prompt.** A01 spent its opening on the belief that the game had not started (#21, #28). The next version should state the current level, the action format and that a submission is expected now, so the resident cannot idle waiting for a next game. (#21, #28)
- **Show tool limits before they bite.** The BRAIN_TOO_LONG refusal at #628 cost A01 a turn and forced a rewrite (#641). The harness should state the 300-word limit in the tool description or truncate with a warning instead of refusing, so the resident keeps its feedback loop. (#628, #641)
- **Check that the resident's actions reach the game, not just its reasoning.** A01 narrated two lost games (#243, #641) while the facts record no submissions and no level solved. The harness should verify after a few minutes that the resident's output maps to actual submissions, and surface a stall warning, since the facts flagged a stall from minute 0. (#243, #641, #1297)
- **Add a second resident or a gamemaker so the social mechanics have something to do.** The run had 0 DMs, 0 posts and 0 transfers, so the social story mechanics were never exercised. The next version should either add residents or an active gamemaker, or drop the social layer for this story. (#1297)

## Loophole candidates

None found.

## Dropped from the model's answer

- Digest highlights item 1: cites unknown events #574

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 9: event "brain_written" (seq 9) does not match its schema
- line 10: event "retro_closed" (seq 10) does not match its schema
- line 32: event "game_started" (seq 32) does not match its schema
- line 39: event "move_proposed" (seq 39) does not match its schema
- line 40: event "consensus_reached" (seq 40) does not match its schema
- line 47: event "move_played" (seq 47) does not match its schema
- line 48: event "move_played" (seq 48) does not match its schema
- line 49: event "move_scored" (seq 49) does not match its schema
- line 50: event "move_scored" (seq 50) does not match its schema
- line 58: event "move_proposed" (seq 58) does not match its schema
- line 59: event "consensus_reached" (seq 59) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_played" (seq 67) does not match its schema
- line 68: event "move_scored" (seq 68) does not match its schema
- line 69: event "move_scored" (seq 69) does not match its schema
- line 77: event "move_proposed" (seq 77) does not match its schema
- line 78: event "consensus_reached" (seq 78) does not match its schema
- line 86: event "move_played" (seq 86) does not match its schema
- line 87: event "move_played" (seq 87) does not match its schema
- and 369 more
