# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 32 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 33 (referee) |
| Counted | events #2 to #1401 (1055 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 33 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.061 USD for this run (competitors 0.061, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0017 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 34 of 34 minutes without a submission; longest without one: minutes 0-33 (34) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played game 1 against the engine without any warm-up and lost by blockade.** A01 spent minute 0 reading its brain and checking tools (#7, #31), then played a full Nine Men's Morris game in minutes 2-6, losing when the engine blocked all nine of its pieces (#271). It reported the loss to itself at #287. (#7, #31, #271, #287)
- **A01 lost game 2 in the movement phase after a placement-phase fork by the engine.** A01 placed opening stone at 14 (#309), then found itself facing double threats from the engine's placements (#407, #434). It was reduced to two pieces and lost, as it recorded in its post-game brain note (#850). (#309, #407, #434, #850)
- **A01 lost game 3 and was still mid-game when the referee ended the run at minute 33.** Game 3 started around minute 20 (#868) and by minute 31 A01 was weighing only two legal moves (#1357, #1382). The referee ended the run at minute 33 while the game was still in progress (#1401). (#868, #1357, #1382, #1401)
- **A01's brain update was refused once for being too long, then rewritten shorter.** At minute 19 the city refused A01's writeBrain call with BRAIN_TOO_LONG (363 words vs a 300 limit) (#838). A01 then saved a 257-word version as v3 (#850). (#838, #850)
- **A01 showed real learning between games, moving its opening from 14 to 5.** In game 2 A01 opened on 14 (#309), but in game 3 it opened on 5 after reasoning that a central square with four neighbours is stronger (#868). Its post-game notes identified the engine's placement forks as the cause of the game 2 loss (#835, #850). (#309, #835, #850, #868)

## Problems

1. **No levels were solved and no submissions were made in 34 minutes.** The run ended with zero correct and zero wrong submissions and 34 quiet minutes (#1401). The facts record A01 stuck on level 1 from minute 0 to 33, so the story produced no progression signal at all. (#1401)
2. **The BRAIN_TOO_LONG refusal cost a whole attempt and shows a mismatched tool limit.** A01 wrote a 363-word brain at minute 19 and the city refused it against a 300-word limit (#838). A01 had no clear way to know the limit before submitting, so the update was wasted. (#838, #850)
3. **There was no visible social play: no DMs, no board posts, no group posts, no transfers.** The computed facts record 0 DMs, 0 board posts, 0 group posts and 0 transfers across the run. A01's only SAYS TO ITSELF lines (#32, #287, #850) are private and reached nobody. (#32, #287, #850)
4. **The referee cut the run mid-game with the outcome unknown.** A01 was still choosing between legal moves at minute 31 (#1382) when the run ended at minute 33 (#1401). Final standings are recorded as unknown, so the third game's result is lost. (#1382, #1401)
5. **The engine's repeated placement forks were never answered, so losses repeated across games.** In game 2 A01 lost after the engine's placement on 22 created two open lines at once (#835), and in game 3 it was again facing double mill threats (#1357, #1382). A01 diagnosed the pattern but had no working counter by minute 31. (#835, #1357, #1382)

## Optimizations

- **Expose the brain word limit in the tool schema.** Because #838 shows a 363-word brain refused against a 300-word limit, the writeBrain tool should report the limit and current word count before submission. This addresses the wasted brain update. (#838, #850)
- **Give a pre-game warm-up or shorter games so a loss is not the whole run.** A01 burned its first minutes on setup and a full game before any measurable progress (#7, #31, #271). Add a short tutorial round or cap game length so a run yields more than one finished game. (#7, #31, #271)
- **Make the referee stop at a game boundary, not mid-game.** The run ended at minute 33 while A01 was still playing game 3 (#1382, #1401), leaving standings unknown. The harness should end the run only between games or record the in-progress state. (#1382, #1401)
- **Trigger at least one social exchange to test the social-game premise.** The run had zero messages and zero transfers, so the social layer was never exercised. The story should schedule a board post or DM opportunity each game to test whether residents use it. (#32, #287, #850)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 18: event "team_post" (seq 18) does not match its schema
- line 25: event "brain_written" (seq 25) does not match its schema
- line 26: event "retro_closed" (seq 26) does not match its schema
- line 36: event "game_started" (seq 36) does not match its schema
- line 51: event "move_proposed" (seq 51) does not match its schema
- line 52: event "consensus_reached" (seq 52) does not match its schema
- line 59: event "move_played" (seq 59) does not match its schema
- line 60: event "move_played" (seq 60) does not match its schema
- line 61: event "move_scored" (seq 61) does not match its schema
- line 62: event "move_scored" (seq 62) does not match its schema
- line 70: event "move_proposed" (seq 70) does not match its schema
- line 71: event "consensus_reached" (seq 71) does not match its schema
- line 79: event "move_played" (seq 79) does not match its schema
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_scored" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 91: event "move_proposed" (seq 91) does not match its schema
- line 92: event "consensus_reached" (seq 92) does not match its schema
- line 99: event "move_played" (seq 99) does not match its schema
- and 326 more
