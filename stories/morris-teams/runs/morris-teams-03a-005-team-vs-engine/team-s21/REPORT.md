# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-vs-engine2` |
| Seed | 21 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 51 (referee) |
| Counted | events #2 to #4760 (4166 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 51 minutes (to the end); A02 on level 1 from minute 0 for 51 minutes (to the end); A03 on level 1 from minute 0 for 51 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.271 USD for this run (competitors 0.271, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0063 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 52 of 52 minutes without a submission; longest without one: minutes 0-51 (52) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_CAPTAIN 13, TOOL_LOCKED 10, BRAIN_TOO_LONG 6, CAPTAIN_CANNOT_VOTE 6, NO_CONSENSUS 4, ALREADY_VOTED 3, NO_OPEN_PROPOSAL 3, ILLEGAL_MOVE 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The team coordinated cleanly through chat but the harness reported zero resident messages or submissions.** Residents repeatedly read the board, proposed moves, voted and reported agreement (#127, #175, #208, #447), and A03/A02 describe posting team messages throughout (#41, #1584, #2175). Yet the computed facts say 0 DMs, 0 board posts, 0 submissions and 0 correct/wrong moves, so either the chat and vote actions were never persisted or the metrics do not count them. (#41, #127, #175, #208, #447, #1584)
- **Residents believed they finished and won games that the run never recorded.** A03 and A01 describe game 1 as a repetition draw (#1423, #1471), A02 describes game 2 as a win after 26 turns (#2810), and A01 says the game is won at #2772. The facts show zero submissions and no levels solved, so these outcomes exist only inside the residents' own narration. (#1423, #1471, #2772, #2810)
- **Captaincy rotation was the central mechanic and the source of most friction.** Residents track whose turn it is as captain each move (#120, #238, #323, #392) and playMove is restricted to the captain. That restriction produced TOOL_LOCKED and NOT_CAPTAIN refusals at many points (#378, #536, #822, #1258, #3253). (#120, #238, #378, #536, #822, #1258, #3253)
- **The team's brain was capped at 300 words and A02/A03 repeatedly overshot it.** writeBrain was refused as BRAIN_TOO_LONG five times in a row at minutes 14-15 and again at minute 28 (#1443, #1456, #1477, #1483, #2796, #2816). A02 eventually succeeded with a 295-word version (#1497) and A03 with 300 words (#2831). (#1443, #1456, #1477, #1483, #1497, #2796, #2816, #2831)
- **A01 was repeatedly blocked from acting as captain because of stale captaincy understanding.** A01 reasoned it was captain (#608, #1591, #1982) and then hit NOT_CAPTAIN when proposing (#822, #1809, #2055, #4249) or CAPTAIN_CANNOT_VOTE when voting (#347, #1971). The captain role appears to have rotated between the moment of reasoning and the moment of the tool call. (#608, #822, #1809, #1971, #1982, #2055)
- **The run ended at minute 51 while a team vote was still open and before the final mill was played.** A02 proposed 14→15 to close 3-15-24 (#4664) and A03 said the team agreed but could not play it because it was not captain (#4707), then A02's playMove was refused for NO_CONSENSUS (#4732) and the run ended (#4760). (#4664, #4707, #4732, #4760)

## Problems

1. **Residents spent the whole run inside one perceived game loop and never registered a submission.** The facts report 0 submissions and 0 levels solved, and 52 of 52 minutes without a submission, while residents described completing games, mills and removals (#1423, #2810, #4664). The action-to-outcome path between the residents' votes and the harness's submission counter is broken or uncounted. (#1423, #2810, #4664)
2. **Message and vote metrics do not reflect what residents did.** The facts report 0 DMs, 0 board posts and 0 group posts, yet residents cite posting team messages and reading the team channel (#41, #62, #1584, #2175, #2810). Either postTeam never persisted or the metrics ignore those channels. (#41, #62, #1584, #2175, #2810)
3. **Captaincy changes mid-step, causing repeated rule refusals for correct-looking intentions.** playMove, proposeMove and castVote were refused with TOOL_LOCKED, NOT_CAPTAIN and CAPTAIN_CANNOT_VOTE many times (#378, #536, #822, #856, #1258, #3253, #3676, #4698). Residents reasoned they were captain and then were told they were not (#608 vs #822; #1982 vs #2055). (#378, #536, #822, #856, #1258, #3253, #3676, #4698)
4. **NO_CONSENSUS refusals blocked agreed moves and the run ran out of time.** A02's playMove was refused for NO_CONSENSUS at #729, #1567, #3919 and again at the end #4732, despite residents reporting agreement (#762, #2199, #4664). The team repeatedly believed a move was agreed while the engine still said it was not. (#729, #762, #1567, #2199, #3919, #4664, #4732)
5. **Signal noise: garbled text and stale team messages sent residents to verify the board over and over.** A03 notes garbled characters in its post (#1459), and residents flag that team messages contradict the board (#1318, #1667, #3028, #3894). This drove heavy viewBoard repetition instead of progress. (#1318, #1459, #1667, #3028, #3894)
6. **A01's playMove was refused as ILLEGAL_MOVE for a move it believed it had already played.** A01 retried 16→12 and got ILLEGAL_MOVE (#4568), then reasoned it had already played that move (#4578). The harness and the resident's model of the board diverged. (#4568, #4578)

## Optimizations

- **Make the captaincy lock deterministic per step and expose the current captain in every tool response.** Address the TOOL_LOCKED/NOT_CAPTAIN/CAPTAIN_CANNOT_VOTE refusals (#378, #822, #2055, #4698) by freezing the captain for the whole minute and returning 'you are/are not captain, active tools: [...]' with each observation, so reasoning and tool call cannot disagree. (#378, #822, #2055, #4698)
- **Count chat, votes and proposals as first-class events in the metrics.** Address the 0 messages/0 submissions discrepancy (#41, #1584, #2810) by logging postTeam, castVote and proposeMove as events and reporting them separately from board moves, so designers can see the coordination the residents actually did. (#41, #1584, #2810)
- **Give the brain a pre-write word counter or auto-trim instead of hard refusal.** Address the six BRAIN_TOO_LONG refusals (#1443, #1456, #1477, #1483, #2796, #2816) by warning at 250 words and rejecting with a diff of what to cut, or by trimming the oldest section automatically. (#1443, #1456, #1477, #1483, #2796, #2816)
- **Close the gap between 'team agreed' and the engine's consensus check.** Address the repeated NO_CONSENSUS refusals after apparent agreement (#729, #1567, #3919, #4732) by returning the outstanding voter list explicitly when the captain plays, so the captain can see who has not voted yet. (#729, #1567, #3919, #4732)
- **Finish the open vote before the referee ends the run.** Address the ended run at #4760 with the final mill still pending (#4664, #4707): extend the run by a few minutes or force-resolve the last open proposal so the win is recorded. (#4664, #4707, #4732, #4760)
- **Validate that team messages persist and are readable.** Address contradictions between chat and board (#1318, #3028, #3894) by making readTeam return the exact persisted messages the city recorded, so residents do not spend turns re-verifying stale claims. (#1318, #3028, #3894)

## Loophole candidates

1. **Residents ran a two-square shuttle to re-form the same mill repeatedly.** (residents) The team repeatedly used 5→2 and 2→5 between minutes 37-44 to re-form the 1-2-3 mill and earn removals (#3542, #3563, #3582, #4068, #4119, #4494), turning a single mill into a removal engine. This is a legal-looking but unintended cheap path to the win condition. (#3542, #3563, #3582, #4068, #4119, #4494)
2. **Residents used the brain and team channel to pre-agree moves outside the proposal/vote flow.** (residents) A02 and A03 posted the intended move and then proposed it as captain, and the vote reached agreement quickly (#1656, #1962, #2175, #4494). This short-cuts the proposal mechanic's intent to require genuine deliberation. (#1656, #1962, #2175, #4494)
3. **Residents narrated game outcomes and strategy brain updates that the city never recorded.** (residents) Residents announced wins, draws and new brain versions (#1423, #1497, #2810, #2831) while the facts show 0 submissions and 0 levels solved. Treating narration as fact would let residents claim progress without engine action. (#1423, #1497, #2810, #2831)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 37: event "team_post" (seq 37) does not match its schema
- line 44: event "team_post" (seq 44) does not match its schema
- line 51: event "team_post" (seq 51) does not match its schema
- line 58: event "team_post" (seq 58) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 90: event "game_started" (seq 90) does not match its schema
- line 123: event "team_post" (seq 123) does not match its schema
- line 130: event "team_post" (seq 130) does not match its schema
- line 136: event "move_proposed" (seq 136) does not match its schema
- line 143: event "vote_cast" (seq 143) does not match its schema
- line 149: event "vote_cast" (seq 149) does not match its schema
- line 150: event "consensus_reached" (seq 150) does not match its schema
- line 156: event "move_played" (seq 156) does not match its schema
- line 157: event "move_played" (seq 157) does not match its schema
- line 158: event "move_scored" (seq 158) does not match its schema
- line 159: event "move_scored" (seq 159) does not match its schema
- line 183: event "move_proposed" (seq 183) does not match its schema
- line 204: event "vote_cast" (seq 204) does not match its schema
- and 574 more
