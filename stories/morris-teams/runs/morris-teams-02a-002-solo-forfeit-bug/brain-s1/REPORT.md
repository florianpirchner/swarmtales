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
| End | minute 150 (referee) |
| Counted | events #3 to #5157 (4613 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 150 minutes (to the end); A04 on level 1 from minute 0 for 150 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.255 USD for this run (competitors 0.255, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0044 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 151 of 151 minutes without a submission; longest without one: minutes 0-150 (151) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4, NOT_ON_MOVE 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wins game 1 with a repeating 17-20-23 mill while A04 cannot convert placement.** A01 opened a mill on 17-20-23 and repeatedly opened and re-closed it (#924, #1659, #1839), cutting A04 from 9 pieces to 2 (#1937, #2008). A04 had built a 4-5-6 mill in placement (#2364) but its pieces were immobile in the movement phase (#1982). (#924, #1659, #1839, #1937, #1982, #2008, #2364)
- **Game 2 ends in a draw by repetition after A04 chases A01's lone roamer.** A04 forced A01's single mobile piece around squares 1-2-3-15-24-23-22-10 with a series of single-exit blocks (#2776, #2859, #3346, #3607), and both sides accepted the no-mill draw counter rising to 35+ by minute 90 (#3795). A01 noted the draw was likely as early as minute 84 (#3368). (#2776, #2859, #3346, #3368, #3607, #3795)
- **A04 wins game 3 with repeated 6-14-21 and 17-20-23 mills against a passive A01.** A04 closed 6-14-21 at minute 101 (#4087), ran it via 14-to-15 moves (#4700, #4778, #4950, #5028), and finally had the winning 22-to-23 closed mill at minute 149 (#5123). A01 never answered the running mill and was down to 3 pieces by minute 146 (#5073). (#4087, #4700, #4778, #4950, #5028, #5073, #5123)
- **A04 repeatedly misreads whose turn it is and idles through its own turn windows.** A04 repeatedly said X was to move when its own action was pending (#3957, #4139, #4214), and its board reads often arrived after the state had already moved on (#4206, #2846). This wasted many of its 5-per-minute steps and produced long non-acting stretches. (#2846, #3957, #4139, #4206, #4214)
- **A01 spends most waiting turns polling the board dozens of times.** A01 polled viewBoard repeatedly while not on move (#747, #768, #787, #997), and even attempted a move out of turn, earning NOT_ON_MOVE (#971). This burned steps and minutes without producing any submission. (#747, #768, #787, #971, #997)

## Problems

1. **No game was ever submitted or counted as a level-up in the recorded run.** The computed facts show 0 correct and 0 wrong submissions for 4613 events and 151 minutes, and no levels solved. The refereed run ended at minute 150 with both residents still on level 1 (#5157). (#5157)
2. **Both residents burn most of their turns waiting or polling while the other side is on move.** A01's log is dominated by 'it's O's turn, I'll check again' iterations (#704, #855, #888, #1004) and A04 mirrors it (#4032, #4612). Neither has a wait tool, so they loop on viewBoard instead. (#704, #855, #888, #1004, #4032, #4612)
3. **Residents write overly long brains and get refused by the harness.** A01 and A04 both had writeBrain refused with BRAIN_TOO_LONG at 414-443 words against a 300-word limit (#1979, #1985, #3817, #3834). The rule is enforced but not previewed, so the fix is only found after a wasted call. (#1979, #1985, #3817, #3834)
4. **The gamemaker recorded no actions and no messages were ever sent.** The facts show 0 DMs, 0 board posts and 0 group posts, and no gamemaker actions across the run. Team channels and federation tools that exist (#55, #61) go unused, so the multi-agent layer never becomes part of the story. (#55, #61)
5. **Residents repeatedly act on stale turn information and lose a turn.** A01 tried to move off-turn and was refused (#971), and A04 confirmed a block at 21 before the state was actually its turn (#2462, #2463). Board reads lag the true state, so agents act on outdated positions. (#971, #2462, #2463)

## Optimizations

- **Add an explicit wait-for-turn step or a 'not your move' safe action.** Both residents loop viewBoard dozens of times while off-turn (#704, #855, #4032, #4612). A single wait action that advances to the next own turn would cut step cost and silent minutes. (#704, #855, #4032, #4612)
- **Preview word count before committing writeBrain.** The BRAIN_TOO_LONG refusals (#1979, #1985, #3817, #3834) cost full calls each time with no partial save. Returning the current word count in the write tool's response would let the agent trim before submitting. (#1979, #1985, #3817, #3834)
- **Give the movement-phase state a 'last mill age' and legal-move echo in every board read.** A01 tracked the no-mill counter manually and predicted a draw as early as minute 84 (#3368, #3795). Surfacing the counter and forced-move flag in viewBoard would stop agents choosing losing lines like the forced-roamer loop (#3607). (#3368, #3607, #3795)
- **Remind agents of the team channel and board with a visible unread marker.** Zero DMs or posts were sent despite the tools existing (#55, #61). A small 'team channel: no new messages' line in viewBoard would keep the social layer in play and give the designers beats to cite. (#55, #61)
- **Reduce idle step burn by capping or rate-limiting repeated viewBoard calls.** A01 hit the 5-per-minute cap and still polled (#787, #997), while A04's stale reads produced confirmed wrong-turn moves (#4206, #2462). A per-turn viewBoard allowance or a 'no change since last read' refusal would push agents to act instead. (#787, #997, #2462, #4206)
- **Make turn ownership explicit in the move tool response.** A01 got NOT_ON_MOVE at #971 after predicting the board was its turn. The proposeMove response should echo whose turn it is and how long until the next one, so agents stop guessing. (#971)

## Loophole candidates

1. **A01 uses an open-and-close mill loop to farm one capture every few turns.** (residents) A01 repeatedly opened the 17-20-23 mill by stepping 23 to 22 and re-closed it next turn (#924, #1168, #1223, #1580, #1703), capturing an A04 piece each cycle. This was legal but turned the endgame into a grind, and A04 never adjusted its roamer chase. (#924, #1168, #1223, #1580, #1703)
2. **A04 forces a draw by single-exit chasing rather than seeking a mill.** (residents) A04 calculated that if the draw counter reached 40 with no mill the game would draw (#3345, #3476), and it then played single-exit blocks (#3607, #3668, #3721) that guaranteed the draw instead of contesting it. This exploits the repetition rule to bank a half-point. (#3345, #3476, #3607, #3668, #3721)
3. **A01 gives up on mill-building to play a forced-roamer grind in game 2.** (residents) A01 said the position was looping and a forced line was the only option (#3368, #3449), continuing the chase even though the draw counter was already high (#3279, #3537). It used the no-mill repetition rule as an exit rather than contesting the mill race. (#3279, #3368, #3449, #3537)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "team_post" (seq 26) does not match its schema
- line 33: event "team_post" (seq 33) does not match its schema
- line 42: event "brain_written" (seq 42) does not match its schema
- line 43: event "retro_closed" (seq 43) does not match its schema
- line 49: event "brain_written" (seq 49) does not match its schema
- line 50: event "retro_closed" (seq 50) does not match its schema
- line 77: event "game_started" (seq 77) does not match its schema
- line 94: event "move_proposed" (seq 94) does not match its schema
- line 95: event "consensus_reached" (seq 95) does not match its schema
- line 103: event "move_played" (seq 103) does not match its schema
- line 104: event "move_scored" (seq 104) does not match its schema
- line 128: event "team_post" (seq 128) does not match its schema
- line 136: event "move_proposed" (seq 136) does not match its schema
- line 137: event "consensus_reached" (seq 137) does not match its schema
- line 151: event "move_played" (seq 151) does not match its schema
- line 152: event "move_scored" (seq 152) does not match its schema
- line 172: event "move_proposed" (seq 172) does not match its schema
- line 173: event "consensus_reached" (seq 173) does not match its schema
- and 524 more
