# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-g1` |
| Seed | 13 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 52 (referee) |
| Counted | events #3 to #5896 (5401 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 52 minutes (to the end); A02 on level 1 from minute 0 for 52 minutes (to the end); A03 on level 1 from minute 0 for 52 minutes (to the end); A04 on level 1 from minute 0 for 52 minutes (to the end); A05 on level 1 from minute 0 for 52 minutes (to the end); A06 on level 1 from minute 0 for 52 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.485 USD for this run (competitors 0.485, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0069 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 53 of 53 minutes without a submission; longest without one: minutes 0-52 (53) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 7, NO_OPEN_PROPOSAL 6, NOT_ON_MOVE 3, ILLEGAL_CELL 2, ALREADY_VOTED 1, BRAIN_TOO_LONG 1, NOT_CAPTAIN 1, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The team built a strategy brain in the first minute but the writing tool was locked almost immediately.** A01 saved brain v1 of 277 words at #184 after A03, A02, A05 and A06 posted ideas, but A04's earlier writeBrain attempt was refused with TOOL_LOCKED at #114 and by #173 the retro window had closed. The residents spent the opening minutes planning a document most of them could not edit. (#114, #173, #184)
- **Captaincy rotated every turn, so most proposed moves were refused as coming from the wrong resident.** The tool refused A01's playMove as TOOL_LOCKED when A02 was captain (#476), A03's playMove as TOOL_LOCKED when A02 was captain (#1045), and A05's proposeMove as NOT_ON_MOVE off-turn (#4526). Residents repeatedly posted 'I'm not the captain this turn' instead of acting (#787, #1078). (#476, #787, #1045, #1078, #4526)
- **X (A01-A03) held the initiative early with a forced double threat at 12.** After 7 forced a block at 9, A02 identified 12 as forking 10-11-12 and 7-12-16 (#979), A01 confirmed O could block only one (#1036), and O chose to block 16 while conceding the 10 mill (#1168). X then closed 10-11-12 at #1238. (#979, #1036, #1168, #1238)
- **O (A04-A06) turned the game with running mills on 16-17-18 and 9-13-18.** O repeatedly cycled 17↔20 and 14↔13 to re-form mills and capture (#2241, #2607), dropping X from 9 pieces to 4 by #4129. X's residents acknowledged they could not block the 17 re-close (#2237, #2882) and kept losing a piece roughly every two moves (#3096). (#2241, #2607, #3096, #4129)
- **All six residents stalled on level 1 for the whole run with zero submissions.** The facts record no correct or wrong submissions and all six stuck on level 1 for 52 minutes; the log shows residents cycling through viewBoard, castVote and postTeam until the referee ended the run at #5896. At the end O had closed a mill and any removal left X with two pieces (#5845). (#5845, #5896)
- **Residents spent much of the run second-guessing an ambiguous board readout.** Multiple residents admitted confusion reading the printed board (#1693 'getting stuck on the cells', #3147, #4384). A03 misread square 4 and had to apologise to the team at #5393, after A01 re-proposed 12->5 with a correction at #5344. (#1693, #3147, #4384, #5344, #5393)

## Problems

1. **The writeBrain and playMove tools were locked for most residents for most of the run.** A04's brain write was refused with TOOL_LOCKED at #114 and the retro window closed by #173; A01 (#476, #1753) and A05 (#1003) had playMove refused the same way. This turned simple actions into mystery failures residents spent steps diagnosing (#157). (#114, #157, #173, #476, #1003, #1753)
2. **Captaincy gating caused a stream of NOT_CAPTAIN and NOT_ON_MOVE refusals.** Residents had to propose and vote through a captain who changed each turn; A02 was refused with NOT_CAPTAIN at #3316 and A05 with NOT_ON_MOVE at #4526, while others kept posting 'not the captain' instead of acting (#787, #1078). (#787, #1078, #3316, #4526)
3. **Residents repeatedly called castVote when no proposal was open.** NO_OPEN_PROPOSAL refusals fired six times, e.g. #749, #1233, #1504, #2129 and #2865, because residents voted before the captain's proposal existed or after the vote had already closed. (#749, #1233, #1504, #2129, #2865)
4. **The board display was hard to parse, causing mistaken analysis and wasted steps.** Residents openly struggled with the row readout (#1693, #3147, #4384, #4991) and A03's misread of square 4 needed a captain correction and an apology (#5344, #5393). Several steps went to re-viewing the board to settle occupied vs empty cells (#5302). (#1693, #3147, #4384, #4991, #5302, #5344, #5393)
5. **No resident ever submitted an answer, so the run never tested the ladder.** The facts show 0 correct and 0 wrong submissions and 53 of 53 quiet minutes, with the referee ending the run at #5896. Designers get no signal about level difficulty or scoring. (#5896)
6. **The gamemaker and classifier took no actions.** The facts report 'no actions' for the gamemaker and no gamemaker or classifier cost, so none of the intended story pressure or grading was applied during the run. (#5896)

## Optimizations

- **Give every resident the action tools they need, or make the lock visible up front.** Addresses the TOOL_LOCKED refusals (#114, #476, #1003, #1753) by listing active tools in the state summary so residents stop burning steps diagnosing locks (#157). (#114, #157, #476, #1003, #1753)
- **Show the captain and the open proposal in every turn state.** Addresses NOT_CAPTAIN (#3316), NOT_ON_MOVE (#4526) and NO_OPEN_PROPOSAL (#749, #1233, #2865) by printing the current captain and proposal id in the state block, so votes and proposals are aimed correctly. (#749, #1233, #2865, #3316, #4526)
- **Render the board in an unambiguous grid that names each numbered point.** Addresses the misreads (#1693, #3147, #4991) and the square-4 correction (#5344, #5393) by printing a fixed 3x3 cell grid with numbers and symbols instead of rows residents must eyeball. (#1693, #3147, #4991, #5344, #5393)
- **Make the move and vote steps atomic, with one action per turn.** Addresses the long propose-then-vote-then-play chains that stall when the captain rotates (#476, #1045): let the captain's proposal auto-execute on majority so residents cannot vote on nothing. (#476, #1045, #1078)
- **Add a visible win/loss and turn clock so residents push toward ending the level.** Addresses the lack of submissions (0 of 0, referee end #5896) by showing how close each side is to losing pieces, as O only reached two-piece loss at #5845 with nobody converting it into a level submission. (#5845, #5896)

## Loophole candidates

1. **Running mills let O re-form 16-17-18 and 9-13-18 every few turns for repeated captures.** (residents) O cycled 17↔20 (#2241, #3634, #4254) and 14↔13 (#2607) to re-close mills and remove pieces, and X's residents saw it as unblockable (#2237, #2882), turning one mill into a near-endless capture engine. (#2237, #2241, #2607, #2882, #3634, #4254)
2. **Residents used three-fold repetition as a safe stalling move rather than pushing for a win.** (residents) A04 noted 11->4 recreates the turn-48 position and a third time would draw (#5593), and A06 flagged the repetition draw at #5620; the residents accepted the cycle instead of breaking it. (#5593, #5620)
3. **Cast-vote spam let residents claim a voice without a real proposal.** (residents) Residents voted before any proposal existed (#749, #1233, #2129), and A02's malformed vote was refused as 'other' at #436, so voting became a low-cost filler action rather than a decision. (#436, #749, #1233, #2129)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 71: event "team_post" (seq 71) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 85: event "brain_written" (seq 85) does not match its schema
- line 86: event "retro_closed" (seq 86) does not match its schema
- line 93: event "team_post" (seq 93) does not match its schema
- line 100: event "team_post" (seq 100) does not match its schema
- line 123: event "brain_written" (seq 123) does not match its schema
- line 124: event "retro_closed" (seq 124) does not match its schema
- line 131: event "team_post" (seq 131) does not match its schema
- line 142: event "team_post" (seq 142) does not match its schema
- line 168: event "team_post" (seq 168) does not match its schema
- line 176: event "team_post" (seq 176) does not match its schema
- line 186: event "game_started" (seq 186) does not match its schema
- line 227: event "team_post" (seq 227) does not match its schema
- line 234: event "team_post" (seq 234) does not match its schema
- line 241: event "move_proposed" (seq 241) does not match its schema
- line 243: event "team_post" (seq 243) does not match its schema
- line 253: event "vote_cast" (seq 253) does not match its schema
- and 475 more
