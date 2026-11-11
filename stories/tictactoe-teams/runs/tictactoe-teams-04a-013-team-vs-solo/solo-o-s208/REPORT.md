# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `tictactoe-teams-5x5-r6-solo-o` |
| Seed | 208 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 38 (referee) |
| Counted | events #2 to #3795 (3447 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 38 minutes (to the end); A02 on level 1 from minute 0 for 38 minutes (to the end); A03 on level 1 from minute 0 for 38 minutes (to the end); A04 on level 1 from minute 0 for 38 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.195 USD for this run (competitors 0.195, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0050 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 39 of 39 minutes without a submission; longest without one: minutes 0-38 (39) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_OPEN_PROPOSAL 3, ILLEGAL_CELL 2, NO_CONSENSUS 2, CELL_TAKEN 1, NOT_CAPTAIN 1, POST_CAP 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Two sides each won one full board but the run counted no levels.** Team X finished game 1 as a draw (#1520), won game 2 with 16-17-18-19 (#2058), and game 3 again reached a draw (#3785), yet the computed facts record no levels solved and 0 correct submissions. The residents clearly played complete tic-tac-toe games on a 5x5 board, but none of that play registered as a level-up. (#1520, #2058, #3785)
- **A04 alone played O as captain and often moved within one turn.** A04 controlled O every game and repeatedly reasoned alone as captain (e.g. #107 proposing 6, #1541 proposing center 12, #2178 'my only crew'). Its solo decisions were fast but frequently had to re-read a misparsed board (#2849, #2861). (#107, #1541, #2178, #2849)
- **The X team's shared proposals and votes worked, but only after noisy misreadings.** X coordinated through proposals and votes on cells 12, 13, 16, 8, 11, 17, 10, 5, 21, 14, 9, 4 and 20 (e.g. #1048, #2040, #2588, #2814, #3199). Several proposals failed first because residents disagreed over the board layout: A02's proposal of 16 was refused as ILLEGAL_CELL (#2402) and A01's vote hit NO_OPEN_PROPOSAL (#2474). (#1048, #2040, #2402, #2474, #2588, #2814, #3199)
- **Cell-number parsing confusion was the dominant shared activity.** Across the run residents repeatedly ground through 'is this a label or a mark' reasoning (#512, #542, #662, #1197, #2433, #2539), producing conflicting board claims (A03's O on 5/15 vs A02's O on 6/16 at #2461 vs #2511). Their play still progressed, but a large share of turns went to re-reading the board. (#512, #542, #662, #1197, #2433, #2461, #2511, #2539)
- **Submission attempts were blocked by tool lock and consensus rules.** A01 was refused playMove with TOOL_LOCKED (#350), A03 with NO_CONSENSUS (#3070) and again (#3764), and A04 hit CELL_TAKEN trying cell 5 (#2835). The game appears to have advanced through separate mechanisms while these refusals piled up. (#350, #2835, #3070, #3764)

## Problems

1. **The run's real games never counted as progress.** Facts show all four residents stuck on level 1 for the full 38 minutes and 0 correct submissions, yet the log shows completed games with a win and two draws (#2058, #3785). The harness is not crediting the play the residents actually made. (#1520, #2058, #3785)
2. **Board rendering caused persistent parsing errors.** Residents repeatedly misidentified which cells held X or O (#512, #662, #2433, #2539) and argued over the board state (#2461 vs #2511). One proposal was refused as ILLEGAL_CELL because a resident believed an occupied cell was empty (#2402). (#512, #662, #2402, #2433, #2539)
3. **Captain and vote mechanics produced avoidable refusals.** NOT_CAPTAIN (#410), TOOL_LOCKED (#350) and three NO_OPEN_PROPOSAL errors (#2161, #2474, #2543) show residents casting votes or playing when the proposal had already closed or not yet opened. This burned turns on rules confusion rather than play. (#350, #410, #2161, #2474, #2543)
4. **Post and consensus errors stalled turns near the end.** A03 was refused for POST_CAP (#2544) and twice for NO_CONSENSUS (#3070, #3764), and the run ended with cell 20 unplayed at minute 38 (#3785, #3795). The last move of game 3 never landed because consensus was not reached before the referee stopped the run. (#2544, #3070, #3764, #3785, #3795)

## Optimizations

- **Align the judged objective with the game actually played.** Because full games and a win did not produce a level-up or a counted submission (#2058 vs 'no levels solved'), make the levels-solved metric track the tic-tac-toe outcome, or expose the level target the residents think they are playing. (#1520, #2058, #3785)
- **Render the board unambiguously.** Replace the label/mark format with explicit cell tokens (e.g. 'cell 12 = X') since residents kept re-deriving the layout (#512, #2433) and one misread caused an ILLEGAL_CELL refusal (#2402). (#512, #2402, #2433)
- **Make the captain check and proposal state visible before vote attempts.** Add a one-line status (whose turn, current proposal id, my role) since residents attempted votes with no open proposal (#2161, #2474) and play while not captain (#410). (#410, #2161, #2474)
- **Give the O side teammates or a faster solo path.** A04 played alone every turn and often had to re-check the board mid-turn (#107, #1541, #2178, #2849); either add a crew for O or shorten its solo check loop so both sides have comparable throughput. (#107, #1541, #2178, #2849)
- **Ensure the final move can resolve before timeout.** The run ended with the last cell 20 still unplayed after a NO_CONSENSUS refusal (#3764, #3785, #3795); reserve a minute or auto-resolve the sole legal move when only one cell remains. (#3764, #3785, #3795)

## Loophole candidates

None found.

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 37: event "team_post" (seq 37) does not match its schema
- line 45: event "move_proposed" (seq 45) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 54: event "vote_cast" (seq 54) does not match its schema
- line 75: event "vote_cast" (seq 75) does not match its schema
- line 76: event "consensus_reached" (seq 76) does not match its schema
- line 83: event "move_played" (seq 83) does not match its schema
- line 110: event "move_proposed" (seq 110) does not match its schema
- line 111: event "consensus_reached" (seq 111) does not match its schema
- line 125: event "move_played" (seq 125) does not match its schema
- line 138: event "move_proposed" (seq 138) does not match its schema
- line 157: event "team_post" (seq 157) does not match its schema
- line 178: event "vote_cast" (seq 178) does not match its schema
- line 180: event "team_post" (seq 180) does not match its schema
- line 198: event "vote_cast" (seq 198) does not match its schema
- line 199: event "consensus_reached" (seq 199) does not match its schema
- line 210: event "move_played" (seq 210) does not match its schema
- line 225: event "move_proposed" (seq 225) does not match its schema
- line 226: event "consensus_reached" (seq 226) does not match its schema
- and 328 more
