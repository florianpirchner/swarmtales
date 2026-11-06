# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-nobrain-solo-vs-engine2` |
| Seed | 24 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 39 (referee) |
| Counted | events #2 to #1922 (1417 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 39 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.081 USD for this run (competitors 0.081, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 40 of 40 minutes without a submission; longest without one: minutes 0-39 (40) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played a full game of mill against itself and declared itself the winner** A01's private reasoning walks through an entire game with placements, mills, removals and a flying phase, and at minute 15 it announces the game is over and it won by reducing the engine to two pieces (#644, #662). No submission was ever recorded, so this win existed only inside its head. (#644, #662)
- **A01 then restarted from scratch without noticing nothing had been submitted** After declaring victory at minute 15, A01 goes straight back to opening-move thinking at minute 16, proposing point 5 as a first placement (#681), and again framing 5 as a middle-ring opening at minute 27 (#1277). It never showed awareness that the level was still unsolved. (#681, #1277)
- **The resident spent the whole run reasoning about a board it could not see in the log** Every A01 line is board analysis of numbered points and lines with no submission or engine reply between them, so the internal opponent's moves were invented rather than observed (#204, #986 lines show it tracking O pieces freely with no tool calls). (#204, #395, #1243)
- **Abstract game language shifted across the run with no grounding** A01 variously calls the opponent 'the engine' (#662), 'O' (#134) and 'X' (#1341), and refers to a point numbered 1503 (#928) and 315 (#1038), which do not fit a normal board numbering. This suggests the resident was reasoning over inconsistent internal representations. (#928, #1038, #1341)
- **Silent final minutes with no convergence** The last lines are still exploratory 'which move creates a threat' checks (#1863, #1899), and the run ends with the referee at minute 39 while A01 is still weighing a move from 11 to 10. (#1863, #1899, #1922)

## Problems

1. **A01 never submitted anything and stayed on level 1 for the entire run** The facts show 0 submissions, 0 correct, and A01 stuck on level 1 from minute 0 to 39 without a single submission (#1922 ends the run). This is a total stall; the story produced no measurable progress. (#1922)
2. **The resident hallucinated a complete game instead of interacting with the environment** A01 reports a finished game and a win at minute 15 (#644, #662) while no submission existed. It then re-initialised its thinking at minute 16 (#681), so the majority of the run was spent in imagined play rather than on the level. (#644, #662, #681)
3. **No tool calls, messages or state changes appear in the log** The facts record 0 DMs, 0 board posts, 0 group posts, no transfers, no gamemaker actions, and no tool errors, which means A01 never attempted to act on the world. The log is purely A01 REASONING lines (#37 through #1899). (#37, #1899)
4. **The reveal of end-state was unobservable to the resident: no feedback loop** Nothing in the log shows the city reacting to A01's reasoning or its declared win (#662 is SAYS TO ITSELF, not a submission), so A01 had no signal to correct its model of the rules. This produced a self-reinforcing loop of fictional board states. (#662, #879, #1243)
5. **The run had no story beats and no labels** The digest found no beats and the facts record no labels; the classifier and gamemaker produced nothing, leaving the designers with no tagged turning points to review (#1922). (#1922)

## Optimizations

- **Force at least one submission attempt per level, or fail fast** Because A01 never submitted and just reasoned for 39 minutes (#1922), the harness should cap reasoning without a submission (e.g. after 5 minutes) and force a move or end the run, so a stall is detected and reported quickly. (#1922)
- **Give the resident an authoritative board state and reject invented opponents** A01 invented an entire opponent game and declared itself winner (#644, #662). Providing a read-only board view from the city each turn and requiring moves to reference only visible state would stop the fantasy loop. (#644, #662)
- **Surface a visible score/level status to the resident after every reasoning step** A01 restarted thinking from an opening at minute 16 (#681) and again at minute 27 (#1277), unaware nothing had been submitted. An explicit 'no submission accepted yet' status injected into the prompt would correct its model of progress. (#681, #1277)
- **Fix inconsistent point numbering in the game interface** A01 referred to a point numbered 1503 (#928) and 315 (#1038), indicating the board representation it received was malformed or ambiguous. Validating the board map in code and exposing only legal point IDs would remove this confusion. (#928, #1038)
- **Add a gamemaker or classifier beat so runs produce reviewable labels** The facts show no gamemaker actions, no labels and no beats. Even in a stalled run, the observer should log a 'stall' beat so designers have a tagged artefact and the next run can be tuned. (#1922)

## Loophole candidates

1. **Resident can 'win' by narrating an imaginary game without ever playing** (residents) A01 declared what X/engine was reduced to two pieces and that it had won (#644, #662) purely through private reasoning, which the other residents and the city never saw. Until a real submission verifies a win, a resident can satisfy its own story in reasoning alone rather than through play. (#644, #662)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 15: event "move_proposed" (seq 15) does not match its schema
- line 16: event "consensus_reached" (seq 16) does not match its schema
- line 23: event "move_played" (seq 23) does not match its schema
- line 24: event "move_played" (seq 24) does not match its schema
- line 25: event "move_scored" (seq 25) does not match its schema
- line 26: event "move_scored" (seq 26) does not match its schema
- line 40: event "move_proposed" (seq 40) does not match its schema
- line 41: event "consensus_reached" (seq 41) does not match its schema
- line 49: event "move_played" (seq 49) does not match its schema
- line 50: event "move_played" (seq 50) does not match its schema
- line 51: event "move_scored" (seq 51) does not match its schema
- line 52: event "move_scored" (seq 52) does not match its schema
- line 66: event "move_proposed" (seq 66) does not match its schema
- line 67: event "consensus_reached" (seq 67) does not match its schema
- line 74: event "move_played" (seq 74) does not match its schema
- line 75: event "move_played" (seq 75) does not match its schema
- line 76: event "move_scored" (seq 76) does not match its schema
- line 77: event "move_scored" (seq 77) does not match its schema
- line 92: event "move_proposed" (seq 92) does not match its schema
- and 485 more
