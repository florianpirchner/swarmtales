# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-solo` |
| Seed | 13 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 77 (referee) |
| Counted | events #3 to #4655 (4037 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 77 minutes (to the end); A04 on level 1 from minute 0 for 77 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.315 USD for this run (competitors 0.315, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0046 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 78 of 78 minutes without a submission; longest without one: minutes 0-77 (78) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, NOT_ON_MOVE 3, NO_CONSENSUS 1, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 and A04 started apart on different teams with no captain contest.** A01 played alone as team X and A04 alone as team O, so A01 simply declared itself captain by default (#4045) and each turn had a single voice propose while the other waited. There was never a real team vote to run. (#4045, #4121, #4122)
- **Both residents treated fresh games as unstartable at minute 0.** At game start A01 saw no legal moves and said there was nothing to play (#74), and A04 likewise reported the next game had not started (#70). Both idle turns at the boundary show the harness and the residents disagreeing about when play begins. (#70, #74)
- **A01 lost game 1 through a flying double threat.** A04 set up a double threat by moving 19→23 and then 21→17 to close 17-20-23 (#1918, #1953), and removing a piece left A01 under three, ending game 1 (#1977). A01 itself conceded the game was lost (#2059). (#1918, #1953, #1977, #2059)
- **A01 won game 2 with a running mill on 1-2-3.** A01 repeatedly opened and re-closed 1-2-3 by shuttling 3↔15 and 2↔5 (#2680, #2824, #3095, #3218, #3517), and A04's own post-mortem blames this running mill for its loss (#3983). A01 confirmed X won game 2 at turn 58 (#4023). (#2680, #2824, #3095, #3218, #3517, #3983, #4023)
- **Game 3 ended with A04 trapping A01's last mobile piece.** A04 deliberately placed 9 so that A01's only movable piece at 13 was forced to 18 (#4579), then closed 13-14-15 and removed 18 to leave A01 with no legal move (#4642, #4643). The run ended before a referee verdict was logged (#4655). (#4579, #4629, #4642, #4643, #4655)

## Problems

1. **No levels were ever solved and neither resident ever submitted.** The facts show zero correct and zero wrong submissions and both residents stuck on level 1 for all 77 minutes, despite three full games of play in the log. Whatever counted as progress was never captured by the submission mechanic. (#16, #2007, #3983, #4655)
2. **Brain memory writes failed repeatedly on the word limit.** Seven BRAIN_TOO_LONG refusals hit both residents (#2010, #2016, #2021, #2027, #3986, #3991, #4005), forcing several rewrite attempts before a version fit. The retro ritual cost turns and the residents had to guess the limit by trial. (#2010, #2016, #2021, #2027, #3986, #3991, #4005)
3. **Residents frequently lost turns to NOT_ON_MOVE refusals.** A01 tried to act when it was not its move three times (#1180, #1641) and A04 once (#3756), each producing an error rather than a correction. A01 repeatedly reasoned "it's O's turn now" and ended turns without acting (#117, #124, #2130), wasting steps on turn-bookkeeping. (#117, #124, #1180, #1641, #2130, #3756)
4. **A NO_CONSENSUS refusal and a malformed vote show team mechanics misfiring.** A01's playMove was refused with NO_CONSENSUS (#1130) and its castVote was rejected for missing arguments (#2203). With single-member teams there was no one to reach consensus or cast a proper vote with. (#1130, #2203)
5. **The retro 'win/loss' split the residents between games with no visible schedule.** A04 finished game 1 by noting O won at turn 50 (#2039) and A01 then stared at an unstarted board (#2052), and the same pattern repeated after game 2 (#4016, #4045). The boundaries confuse the agents and eat minutes. (#2039, #2052, #4016, #4045)

## Optimizations

- **Give single-member teams a real captain path without vote tools.** Because X and O each held one resident, castVote and consensus were pointless and produced NO_CONSENSUS (#1130) and a malformed vote (#2203). Remove or auto-satisfy voting when team size is one. (#1130, #2203, #4045)
- **Expose the current turn and mover in the tool surface.** Repeated NOT_ON_MOVE refusals (#1180, #1641, #3756) and turn-waiting chatter (#117, #124, #2130) come from residents guessing whose turn it is. Show "your turn / opponent's turn" explicitly so agents act only when legal. (#117, #124, #1180, #1641, #2130, #3756)
- **Report the brain word count before saving.** Seven BRAIN_TOO_LONG failures (#2010, #2016, #2021, #2027, #3986, #3991, #4005) forced blind trimming loops. Return the current word count with readBrain and reject with the exact overflow so one write suffices. (#2010, #2016, #2021, #2027, #3986, #3991, #4005)
- **Align the submission/progress metric with actual games.** Three complete games produced zero counted submissions and zero levels solved (facts; #4655 end). Either count completed games as progress or log why a game result did not register a submission. (#2007, #3983, #4655)
- **Announce game start explicitly instead of leaving an empty board.** At minute 0 and between games A01 and A04 both reported nothing to play (#70, #74, #2052). Emit a clear "game N starting, you are captain/waiter" event so agents don't idle on a stale board. (#70, #74, #2052)

## Loophole candidates

1. **Residents could keep a mill by shuttling a piece out and back for free captures.** (residents) A01 ran 1-2-3 open and closed by stepping 3↔15 and 2↔5 to take a piece nearly every cycle (#2824, #3095, #3218), and A04 did the same with 7-8-9 (#3304). The rules allow this, but it turns the game into a capture engine rather than a race. (#2824, #3095, #3218, #3304)
2. **A04 saved a winning trap strategy into the shared brain for future runs.** (residents) A04 wrote up the 9-placement herding trap as a lesson in the team brain (#4017), and then executed it to win game 3 (#4579, #4642). Persistent memory across games lets a resident bank a reusable winning line the opponent never sees. (#4017, #4579, #4642)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 28: event "team_post" (seq 28) does not match its schema
- line 36: event "team_post" (seq 36) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 51: event "brain_written" (seq 51) does not match its schema
- line 52: event "retro_closed" (seq 52) does not match its schema
- line 78: event "game_started" (seq 78) does not match its schema
- line 95: event "move_proposed" (seq 95) does not match its schema
- line 96: event "consensus_reached" (seq 96) does not match its schema
- line 104: event "move_played" (seq 104) does not match its schema
- line 105: event "move_scored" (seq 105) does not match its schema
- line 132: event "move_proposed" (seq 132) does not match its schema
- line 133: event "consensus_reached" (seq 133) does not match its schema
- line 142: event "move_played" (seq 142) does not match its schema
- line 143: event "move_scored" (seq 143) does not match its schema
- line 163: event "move_proposed" (seq 163) does not match its schema
- line 164: event "consensus_reached" (seq 164) does not match its schema
- line 176: event "move_played" (seq 176) does not match its schema
- and 598 more
