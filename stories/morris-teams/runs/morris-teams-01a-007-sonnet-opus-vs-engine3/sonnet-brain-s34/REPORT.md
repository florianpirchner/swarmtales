# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 34 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 34 (referee) |
| Counted | events #2 to #1602 (1147 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 34 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.752 USD for this run (competitors 0.752, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 35 of 35 minutes without a submission; longest without one: minutes 0-34 (35) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played a full game of Nine Men's Morris alone against the engine without ever stopping to submit.** From minute 1 to minute 33 A01 worked through placing, mills, removal and the flying phase in long reasoning lines, e.g. blocking the 4-11-19 threat at #88 and closing 7-12-16 at #969. It never submitted anything, so the entire 34-minute run is one unfinished game. (#68, #88, #969, #1602)
- **A01 lost game 2 and wrote itself a strategy brain mid-run.** At #797 A01 says it lost game 2 after O left it with two pieces and saved lessons as strategy brain version 3 (273 words). This restart-with-a-new-brain move is the only self-directed correction in the run. (#797)
- **The brain-writing tool rejected A01 twice for overlong text.** A01's writeBrain calls were refused as BRAIN_TOO_LONG at #287 (326 words over a 300 limit) and again at #785 (360 words). Only the third attempt at #797 fit, costing A01 time in the middle of play. (#287, #785, #797)
- **A01 recognized its losses were self-inflicted by single forcing threats.** At #797 A01 concludes it lost because three single forcing threats during placing (17, 16, 19) let O fill the board with blockers. This is the run's only explicit lesson about its own play. (#797)
- **The endgame arrived with a blockable double threat A01 could not answer.** At #1583 A01 notes O holds three pieces at 1, 22 and 24 with two one-move mills, and its own 8, 15, 21 form no pair, so it must block one and lose a piece. The referee ends the run at #1602 mid-threat. (#1583, #1602)

## Problems

1. **No submission was ever made in 35 quiet minutes.** The facts record 0 correct and 0 wrong submissions and 35 of 35 minutes without one; A01 is stuck on level 1 from minute 0 to 34. The run produced no scored progress at all. (#21, #1602)
2. **A01 spent the whole run in one endless Nine Men's Morris game instead of solving levels.** Reasoning lines run continuously from #68 to #1583 describing board positions, mills and jumps, never describing a level to solve or a submission to make. The harness let one game consume the entire run. (#68, #1583)
3. **The brain tool's 300-word limit repeatedly blocked A01's own reflection.** BRAIN_TOO_LONG appears twice (#287 with 326 words, #785 with 360 words). A01 had to defer writing its brain (#682 says it believes the brain is locked) and only succeeded on the third try. (#287, #682, #785)
4. **No social game happened: zero messages, DMs or posts.** The facts record 0 DMs, 0 board posts and 0 group posts, with no gamemaker actions and no beats. With one resident and a silent gamemaker there was no competition, negotiation or alliance for the story to show. (#21, #1602)
5. **The run ended mid-game without resolution.** The referee stops at minute 34 (#1602) while A01 is still reasoning about blocking O's double threat (#1583). Final standings are unknown, so the report cannot say who won or lost. (#1583, #1602)

## Optimizations

- **Cap or time-box individual games so residents must submit.** A01 played one Morris game for 34 minutes with no submission (#68 to #1583). Add a per-level or per-game minute budget and force a submission attempt when it expires. (#68, #1583, #1602)
- **Make the brain tool accept long text or pre-check length.** Two writeBrain calls were refused for exceeding 300 words (#287, #785). Either raise the limit or have the harness reject overlong text before the call so residents can trim it. (#287, #785)
- **Seed at least two residents and an active gamemaker.** With one resident there were 0 messages and 0 gamemaker actions (facts), so no contest or alliance could form. Require a minimum pool of competitors and scripted gamemaker beats. (#21, #1602)
- **Give residents a visible objective and progress signal.** A01's reasoning never references levels or submissions, only board moves (#124, #411). Show the current level, remaining seats and submission command in the prompt so the resident knows what the city is scoring. (#124, #411)
- **Shorten reasoning or require a decision line.** Many reasoning lines are long positional rambles (#149, #1143). Require each turn to end with a concrete action token so play advances instead of stalling. (#149, #1143)

## Loophole candidates

1. **A01 turned the level into an open-ended practice game against the engine.** (residents) Rather than making scored attempts, A01 restarted (lost game 2 at #797) and kept playing new boards, treating the harness as free practice with no cost to submissions. (#797, #1602)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 9: event "brain_written" (seq 9) does not match its schema
- line 10: event "retro_closed" (seq 10) does not match its schema
- line 27: event "game_started" (seq 27) does not match its schema
- line 34: event "move_proposed" (seq 34) does not match its schema
- line 35: event "consensus_reached" (seq 35) does not match its schema
- line 42: event "move_played" (seq 42) does not match its schema
- line 43: event "move_played" (seq 43) does not match its schema
- line 44: event "move_scored" (seq 44) does not match its schema
- line 45: event "move_scored" (seq 45) does not match its schema
- line 52: event "move_proposed" (seq 52) does not match its schema
- line 53: event "consensus_reached" (seq 53) does not match its schema
- line 60: event "move_played" (seq 60) does not match its schema
- line 61: event "move_played" (seq 61) does not match its schema
- line 62: event "move_scored" (seq 62) does not match its schema
- line 63: event "move_scored" (seq 63) does not match its schema
- line 71: event "move_proposed" (seq 71) does not match its schema
- line 72: event "consensus_reached" (seq 72) does not match its schema
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- and 435 more
