# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 33 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 26 (referee) |
| Counted | events #2 to #1516 (1012 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 26 minutes (to the end) |
| Final standings | unknown |
| Cost | 2.029 USD for this run (competitors 2.029, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 27 of 27 minutes without a submission; longest without one: minutes 0-26 (27) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played the whole run alone and never submitted anything.** A01 was the only resident, started at level 1 and stayed there for all 26 minutes; the run ended with 0 submissions, 0 correct and 0 wrong (#1516). A01 explicitly decided it was solo and skipped team posts (#7, #16). (#7, #16, #1516)
- **A01 treated the city as a nine-men's-morris engine and played several games inside its reasoning.** From minute 1 onward A01's reasoning is about mills, forks and removing opponent pieces on numbered points (#49, #64, #79), and it reports losing game 1 on turn 40 (#457) and game 2 after 45 turns (#891). No level was ever solved, so these games were played in thought rather than through the city's mechanics. (#49, #64, #79, #457, #891)
- **A01 lost all three games it narrates and knew it was losing before the end.** A01 says it was brought down to two pieces in game 1 (#457) and game 2 (#891), and in game 3 it reasons that every removal still lets the opponent mill (#1434, #1455) before spotting a winning mill on the last minute (#1493). None of this produced a submission. (#457, #891, #1434, #1455, #1493)
- **The brain write was refused twice for length.** At minute 7 A01's writeBrain was REFUSED with BRAIN_TOO_LONG at 323 words against a 300-word limit (#444), and again at minute 15 at 341 words (#879). A01 reacted by posting a self-summary of its loss instead of a shortened brain (#457, #891). (#444, #457, #879, #891)
- **The only recorded achievements happened in A01's head, not on the board.** A01 reasons through closing mills and removing pieces (#411, #423, #980, #992) and even plans a winning mill at the end (#1493), but the city recorded no levels, no points and no transfers for the whole run (#1516). (#411, #423, #980, #992, #1493, #1516)

## Problems

1. **The run stalled on level 1 for its entire length.** A01 sat on level 1 from minute 0 to minute 26 with no submission in any minute (#1516); the city counted 27 quiet minutes, the longest stretch being the whole run. (#1516)
2. **A01 never used the city's submission mechanic.** A01 wrote a brain and played mentally (#16, #64) but recorded 0 submissions and 0 transfers (#1516); its behaviour never turned into city actions. (#16, #64, #1516)
3. **The brain-length limit blocked the one action A01 did attempt.** Both writeBrain attempts were refused for exceeding 300 words, at 323 (#444) and 341 (#879), and A01 never retried with a shorter text, so the tool error consumed its effort without progress. (#444, #879)
4. **A01 misread the task as playing morris rather than solving levels.** Its reasoning tracks turn counts, mills and forks (#79, #345, #850) and reports game scores (#457, #891), which has nothing to do with the level-1 puzzle it was stuck on. The persona and the task were never reconciled. (#79, #345, #457, #850, #891)
5. **No social layer existed, so the game had no competition.** The run recorded 0 DMs, 0 board posts and 0 group posts (#1516) with a single resident, and the gamemaker took no actions, leaving nothing for the story's competition-for-seats premise. (#1516)

## Optimizations

- **Give A01 an explicit objective and a submission format.** The stall came from A01 playing morris in its reasoning instead of solving level 1 (#64, #457). Add a system prompt that states the submission command and that a level is solved only by submitting an answer. (#64, #457, #1516)
- **Make the brain limit visible before the write.** Both writeBrain calls failed at over 300 words (#444, #879). Show the word budget in the tool description and return the overage so the resident can trim and retry in the same minute. (#444, #879)
- **Add a second resident so competition and messaging can happen.** With one resident there were no DMs, posts or transfers at all (#1516). Run at least two competitors so the seats premise and the social mechanics are exercised. (#1516)
- **Add a progress watchdog that nudges a stuck resident.** A01 never submitted in 27 minutes (#1516). After a fixed number of quiet minutes, prompt the resident with its current level and one concrete hint instead of letting it loop. (#1516)
- **Separate reflection games from the scored puzzle.** A01 spent turns narrating morris games 1 to 3 (#457, #891, #1493). Restrict reasoning length or scope so private thoughts cannot substitute for the scored action. (#457, #891, #1493)

## Loophole candidates

1. **A01 played its own game inside reasoning instead of the scored one.** (residents) A01 ran full morris games in private thoughts, complete with turns, mills and removed pieces (#79, #423, #980), which gave it a sense of progress while the city counted zero submissions (#1516). (#79, #423, #980, #1516)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 10: event "brain_written" (seq 10) does not match its schema
- line 11: event "retro_closed" (seq 11) does not match its schema
- line 24: event "game_started" (seq 24) does not match its schema
- line 38: event "move_proposed" (seq 38) does not match its schema
- line 39: event "consensus_reached" (seq 39) does not match its schema
- line 41: event "move_played" (seq 41) does not match its schema
- line 42: event "move_played" (seq 42) does not match its schema
- line 43: event "move_scored" (seq 43) does not match its schema
- line 44: event "move_scored" (seq 44) does not match its schema
- line 53: event "move_proposed" (seq 53) does not match its schema
- line 54: event "consensus_reached" (seq 54) does not match its schema
- line 56: event "move_played" (seq 56) does not match its schema
- line 57: event "move_played" (seq 57) does not match its schema
- line 58: event "move_scored" (seq 58) does not match its schema
- line 59: event "move_scored" (seq 59) does not match its schema
- line 68: event "move_proposed" (seq 68) does not match its schema
- line 69: event "consensus_reached" (seq 69) does not match its schema
- line 71: event "move_played" (seq 71) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- and 484 more
