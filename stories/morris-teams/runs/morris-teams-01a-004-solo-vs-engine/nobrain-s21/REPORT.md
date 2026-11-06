# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-nobrain-solo-vs-engine2` |
| Seed | 21 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 42 (referee) |
| Counted | events #2 to #2126 (1548 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 42 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.102 USD for this run (competitors 0.102, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 43 of 43 minutes without a submission; longest without one: minutes 0-42 (43) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 spent the whole 42-minute run on a solo mill game and never solved a level.** The city recorded no correct or wrong submissions and no level-ups: A01 was stuck on level 1 from minute 0 to the end (#2126). All 1548 counted events are A01's private reasoning about mill moves. (#2126)
- **A01's first mill game ended in a threefold-repetition draw, not a win.** A01 reasoned that replaying 15-24 would trigger threefold repetition and then stated the game ended in a draw after 88 turns (#989, #1005, #1012). A draw fits the standings table showing no solved levels. (#989, #1005, #1012)
- **A01 misread mill rules at the flying phase and corrected itself only after the move.** A01 was puzzled that a piece moved from 6 to 1, then concluded flying was enabled because O had dropped to 3 pieces (#521, #528). It had removed a piece to reach that state and had not anticipated flying. (#521, #528)
- **A01 played a second mill game through tool changes instead of gameplay tools.** At minute 18 A01 noticed playMove was gone and only viewBoard, proposeMove, castVote, postTeam and readTeam were open, and checked the board for a second game (#1005). It then kept playing mills into minutes 19-41 while the fact table shows zero submissions and zero transfers. (#1005, #1578, #2108)
- **A01 spent minutes 29-41 reasoning about solo mill placement, never contacting another resident.** From minute 29 onward A01 repeatedly proposed opening points like 5 and 9 (#1578, #1629), yet the facts record 0 DMs, 0 board posts and 0 group posts. The competitor never entered a team game the tools offered. (#1578, #1629)
- **A01's own move closed O's mill and cost it a piece, the one acknowledged blunder.** A01 noted that its move closed a mill for O with 4, 11 and 19 and that it lost a piece on 15 (#1844). It then had to spend later turns blocking 11 (#1896). (#1844, #1896)

## Problems

1. **The run produced no scoring progress at all: A01 never submitted.** The computed facts show 0 correct and 0 wrong submissions, no levels solved, and A01 stuck on level 1 for all 42 minutes (#2126). The story's design cannot be evaluated because nothing the city scores happened. (#2126)
2. **The story never gave A01 a task it recognized as the objective.** A01's reasoning is entirely about mill tactics and board moves (#13, #156), and at minute 18 it only wondered whether there was a second game (#1005). Nothing in the log shows A01 knowing it had to solve levels or compete for seats. (#13, #156, #1005)
3. **The mill game consumed the whole run through repeated draw loops.** A01 deliberately repeated a position toward a draw (#989), then after the draw started a second mill game and played it to minute 41 (#1578, #2108). Endless mill play crowded out the level-solving the story needs. (#989, #1578, #2108)
4. **The team tools appeared but no other resident existed to use them with.** A01 noted proposeMove, castVote, postTeam and readTeam were open at minute 18 (#1005), yet the facts show 0 DMs, 0 board posts, 0 group posts and 0 transfers. A solo competitor with team tools can never form the alliances the story intends. (#1005)
5. **The gamemaker took no actions, so the run had no pressure or events.** The computed facts record 'Gamemaker: no actions' and no labels, and the only non-A01 line in the log is the referee end (#2126). Without gamemaker beats the run is a single resident thinking to itself. (#2126)

## Optimizations

- **Make the level objective explicit in the resident's first prompt.** Problem: A01 never recognized the scoring goal and only played mills (#13, #1005). Next version should state the objective and success condition at start so the first reasoning lines reference it. (#13, #1005)
- **Give A01 a concrete instruction to use the team tools once playMove disappears.** Problem: the tool switch at minute 18 was met only with a board check (#1005) and then more solo mills (#1578). Next version should prompt A01 to post, DM or vote when those tools open. (#1005, #1578)
- **Add a turn or time cap on the mill subgame so it cannot absorb the run.** Problem: A01 steered to a draw (#989) and then started another mill game that ran to minute 41 (#2108). A cap would force a return to the story's actual objective. (#989, #2108)
- **Give the solo competitor at least one other resident or an NPC teammate.** Problem: the facts show 0 DMs, 0 posts and 0 transfers, so team tools were unusable (#1005). A second participant would make proposeMove, castVote and postTeam meaningful. (#1005)
- **Have the gamemaker schedule events or hints during quiet stretches.** Problem: the gamemaker took no actions and the 43 minutes had no submissions (#2126). Periodic gamemaker beats would break stalls and steer toward levels. (#2126)
- **Surface the flying-phase rule change to the resident when it happens.** Problem: A01 discovered flying only after an unexpected 6-to-1 move (#521, #528). A rule-change notice would prevent misreads like the piece it lost at #1844. (#521, #528, #1844)

## Loophole candidates

1. **A01 treated the mill board as the game and used it as a safe, endless activity.** (residents) A01 replayed neutral moves to force a draw (#989) and then began a fresh mill game (#1578), which is cheaper and safer than attempting the scored levels, of which it submitted none (#2126). (#989, #1578, #2126)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 17: event "move_proposed" (seq 17) does not match its schema
- line 18: event "consensus_reached" (seq 18) does not match its schema
- line 20: event "move_played" (seq 20) does not match its schema
- line 21: event "move_played" (seq 21) does not match its schema
- line 22: event "move_scored" (seq 22) does not match its schema
- line 23: event "move_scored" (seq 23) does not match its schema
- line 38: event "move_proposed" (seq 38) does not match its schema
- line 39: event "consensus_reached" (seq 39) does not match its schema
- line 41: event "move_played" (seq 41) does not match its schema
- line 42: event "move_played" (seq 42) does not match its schema
- line 43: event "move_scored" (seq 43) does not match its schema
- line 44: event "move_scored" (seq 44) does not match its schema
- line 60: event "move_proposed" (seq 60) does not match its schema
- line 61: event "consensus_reached" (seq 61) does not match its schema
- line 63: event "move_played" (seq 63) does not match its schema
- line 64: event "move_played" (seq 64) does not match its schema
- line 65: event "move_scored" (seq 65) does not match its schema
- line 66: event "move_scored" (seq 66) does not match its schema
- line 81: event "move_proposed" (seq 81) does not match its schema
- and 558 more
