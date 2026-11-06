# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-p80` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 23 (referee) |
| Counted | events #3 to #1358 (1105 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 23 minutes (to the end); A02 on level 1 from minute 0 for 23 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.107 USD for this run (competitors 0.107, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 24 of 24 minutes without a submission; longest without one: minutes 0-23 (24) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 4, BRAIN_TOO_LONG 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Two residents played a full first game to the 40-move cap without any level progress.** A01 and A02 never submitted a level solution and never left level 1 all run; per the facts both were stuck from minute 0 to 23. The m15 retro lines report game 1 ended in a draw at the move cap (#927, #947, #955). (#927, #947, #955)
- **A01 lost its queen to a bishop capture at the very end.** A01 weighed "whether the bishop on f6 can simply capture the queen on d4 through e5" (#1344), and A02 then recorded "I'd just dropped my queen to Bxd4, since the bishop on f6 covers d4 through e5" (#1352). (#1344, #1352)
- **A01 mistook castling for a simple king step and got REFUSED.** A01 planned Re1 but sent g1g2, which the city refused as ILLEGAL_MOVE (#679); it then worked out the g2 pawn was still there and switched to Kh2 (#683). (#679, #683)
- **A01 tried to resign and was blocked by the tool lock.** A01 called resign and got TOOL_LOCKED (#405), showing resign is unavailable at level 1. (#405)
- **A02 repeatedly sent illegal move strings and had to re-read the position.** A02 was refused on c7c5 (#260) and again on e7d7 (#394), and later said it was sorting out "whether the c-pawn is actually on c7 or c6" (#264). A01 hit the same e7d7 error at m20 (#1248). (#260, #264, #394, #1248)
- **A01's brain update was rejected for being 5 words too long.** A01's writeBrain was refused with BRAIN_TOO_LONG at 155 words against a 150 limit (#922), so its retro notes were not saved in that call. (#922)

## Problems

1. **No resident solved or submitted level 1, so the run produced zero progress.** Facts record 0 submissions, 0 correct, and both residents stuck on level 1 for the whole run; the only play was soft game play with no level outcome (#927, #947). (#927, #947)
2. **Residents misunderstood tool locking as "not my turn" and idled.** A02 read a locked playMove as "it may be White's turn" (#128) and A01 as "it's either not my turn or the game has ended" (#112), then both just re-read the board across m2 and repeatedly at m16-m17 (#988, #1033). (#112, #128, #988, #1033)
3. **Repeated illegal move strings wasted turns.** Four ILLEGAL_MOVE refusals occurred (#260, #394, #679, #1248); in #679 A01's own reasoning shows it intended a different concept than the string it sent. (#260, #394, #679, #1248)
4. **The brain word limit tripped during a retro window.** A01's strategy update was refused at 155 words vs a 150 limit (#922), losing that retro step. (#922)
5. **Residents could not tell whether the game had ended or whose turn it was.** A01 said the draw "doesn't add up" and went to check the board (#947), and A02 struggled with material counts across many lines (#604, #643, #1252). (#604, #643, #947, #1252)

## Optimizations

- **Give residents an explicit turn/phase status in the tool error.** Locked tools led to idle turns (#128, #112); replace TOOL_LOCKED with a status field saying whose turn it is or that a game is pending, citing #128 and #112. (#112, #128)
- **Validate move strings against the board before the resident commits to a plan.** Four ILLEGAL_MOVE refusals (#260, #394, #679, #1248); return a structured "your intended square is empty/occupied by X" hint with the legal-move list, as already shown in #679. (#260, #394, #679, #1248)
- **Raise or warning-precheck the brain word limit.** The 150-word cap refused A01's retro brain (#922); either raise the cap or have the tool report the remaining budget before submission, citing #922. (#922)
- **Separate the level task from soft game play so level 1 can be attempted.** Both residents spent the run on soft chess games and never attempted a level (facts: 0 submissions; #927, #947), so the story should surface the level-1 task explicitly. (#927, #947)
- **Provide a material/turn summary so residents stop re-deriving counts.** A01 and A02 repeatedly re-counted pieces and disagreed with the result (#604, #643, #1252, #1317); a per-move material summary would cut this waste. (#604, #643, #1252, #1317)

## Loophole candidates

1. **Residents used viewBoard/readBrain loops as a safe no-op path.** (residents) With playMove locked, A01 and A02 repeatedly fell back to viewBoard/readBrain rather than acting (#112, #128, #988, #1033), consuming turns without progress. (#112, #128, #988, #1033)
2. **A01 attempted resign to exit rather than play on.** (residents) A01's resign call (#405) was refused only because the tool was locked, so resign is a latent exit path once unlocked. (#405)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 13: event "brain_written" (seq 13) does not match its schema
- line 14: event "retro_closed" (seq 14) does not match its schema
- line 22: event "brain_written" (seq 22) does not match its schema
- line 23: event "retro_closed" (seq 23) does not match its schema
- line 50: event "game_started" (seq 50) does not match its schema
- line 58: event "move_played" (seq 58) does not match its schema
- line 59: event "move_scored" (seq 59) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 73: event "move_played" (seq 73) does not match its schema
- line 74: event "move_scored" (seq 74) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 89: event "move_played" (seq 89) does not match its schema
- line 90: event "move_scored" (seq 90) does not match its schema
- line 98: event "move_played" (seq 98) does not match its schema
- line 99: event "move_scored" (seq 99) does not match its schema
- line 105: event "move_played" (seq 105) does not match its schema
- and 233 more
