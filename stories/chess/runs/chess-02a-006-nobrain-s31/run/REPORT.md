# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-nobrain-p80` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #2 to #974 (793 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.055 USD for this run (competitors 0.055, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0042 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 opens with a plan but immediately plays a non-forcing move** A01 announces the Italian Bc4 to hit f7 (#39), then in its next reasoning line weighs c3 versus castling and chooses castling instead (#68). The stated plan and the chosen move diverge from the first move, setting a pattern of reasoning that talks about a line but plays something else. (#39, #68)
- **A02 rejects moves only after checking them, and its first illegal attempt is a queen move** A02 works through candidate moves carefully and settles on a6 for simplicity (#133), then later attempts d7b7 and is refused by the city (#428). The refusal lists legal moves including Nxc5, which A02 then finds and plays, capturing A01's queen (#438). (#133, #428, #438)
- **A01 loses game 1 to two blunders and resigns at minute 7** A01's knight on b6 falls to cxb6 (#371) and later its queen on c5 falls to Nxc5 (#452). A01 counts itself down 20 to 32 and resigns (#453), stating the two blunders explicitly (#474). (#371, #452, #453, #474)
- **A01 blunders its queen again in game 2 and resigns a second time** A01 moves its knight off b4 and leaves its queen on a5 hanging; White's Qd2 takes it (#967). A01 resigns again, down roughly 23 to 31 (#968). This is the second resignation in the run and the second queen-loss blunder. (#967, #968)
- **A01 and A02 stall from minute 0 to the end without a single submission** The facts record no submissions in minutes 0-16 and both residents stuck on level 1 for the entire run (#974). Despite dozens of reasoning lines about candidate moves (#68, #133, #256), no level is ever solved. (#68, #133, #256, #974)
- **A02 attempts an illegal bishop move and corrects itself from the legal-move list** A02 tries e7d7 with a bishop and is refused (#832), and its follow-up reasoning acknowledges the bishop moves diagonally, not straight across (#842). The refusal's legal-move list effectively hands residents the candidate moves. (#832, #842)

## Problems

1. **Both residents are stuck on level 1 for the entire run** A01 and A02 stay on level 1 from minute 0 to minute 16 with no submission and no level solved (#974). The run ends at the referee's 16-minute cutoff with the game never completed. (#974)
2. **Residents spend the whole run in visible-only tool phases** A02 reasons that only viewBoard is available and the move tools must be locked (#62), and A01 later treats the same notice as a real constraint and plans within it (#519). If the moves really are locked, the harness is blocking the core activity the story wants. (#62, #519)
3. **The illegal-move refusal leaks the full legal-move list** The ILLEGAL_MOVE refusal at #428 lists dozens of legal moves, and A02 immediately picks Nxc5 from that list (#438). This turns a mistake into a cheat sheet and undermines the chess skill the level is meant to test. (#428, #438)
4. **A01 keeps announcing a plan and then playing a different move** A01 says it will play Bc4 (#39), then castles (#68); it says it weighs c3 (#85) and plays d3. The reasoning lines are elaborate but do not match the chosen move, suggesting the reasoning is not steering the tool call. (#39, #68, #85)
5. **The game ends by resignation rather than by the level mechanic** A01 resigns twice: after the first queen loss (#453) and after the second (#968). In a chess level, resignation ends a game but does not advance a level, so two resignations plus a locked clock produce zero progress. (#453, #968)
6. **No messages, no transfers, no gamemaker actions** The facts show 0 DMs, 0 board posts, 0 group posts, 0 transfers and no gamemaker actions, and the only recorded events are private reasoning and two refusals (#428, #832). The social and competitive layer of the design is entirely absent from this run. (#428, #832)

## Optimizations

- **Give residents a working move tool before minute 1** Both residents spend early minutes reasoning about a locked viewBoard and waiting (#62, #519). Ensure the playMove tool is unlocked at level start so residents spend their clock on chess, not on polling the board. (#62, #519)
- **Do not echo the legal-move list on ILLEGAL_MOVE** The refusal at #428 handed A02 the winning Nxc5 move (#438). Return only a short error without the candidate list, so the resident must compute legality itself. (#428, #438)
- **Add a stuck timer that pushes residents past analysis** A01 and A02 reason over dozens of candidate moves without submitting (#68, #133, #256). A per-level clock that forces a move or a hint after N quiet minutes would convert private analysis into progress. (#68, #133, #256)
- **Cap reasoning that restates a plan without executing it** A01 announces Bc4 (#39) then castles (#68). Detect when the spoken plan and the played move diverge and flag it, or shorten reasoning to a single candidate before a move is required. (#39, #68)
- **Make resignation cost something or advance the level** A01 resigns at #453 and #968, and the run ends with no submission. Either treat a resignation as a lost level with a new game start, or lock resignation until the level's move budget is exhausted. (#453, #968)
- **Add a light social channel to exercise the intended competition** The facts show zero messages and zero transfers while A01 and A02 play two silent games. Seed one board post or DM prompt per level so the social-competition layer is tested, which it was not here. (#428, #832)

## Loophole candidates

1. **The legal-move list turns refusals into hints** (residents) After the e7d7 refusal at #832, the printed legal moves include Nxe4 and Nbd5, and A01 reasons over exactly those next (#842, #890). A resident can deliberately attempt an illegal move to obtain the full move list from the city. (#832, #842, #890)
2. **Waiting for a locked phase burns the clock without penalty** (residents) A01 and A02 treat the viewBoard-only notice as a reason to wait (#62, #519) and the run quietly expires at #974 with no submission. Doing nothing is a valid path with no cost, since no level is lost and no submission is recorded. (#62, #519, #974)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 11: event "move_played" (seq 11) does not match its schema
- line 12: event "move_scored" (seq 12) does not match its schema
- line 19: event "move_played" (seq 19) does not match its schema
- line 20: event "move_scored" (seq 20) does not match its schema
- line 26: event "move_played" (seq 26) does not match its schema
- line 27: event "move_scored" (seq 27) does not match its schema
- line 34: event "move_played" (seq 34) does not match its schema
- line 35: event "move_scored" (seq 35) does not match its schema
- line 42: event "move_played" (seq 42) does not match its schema
- line 43: event "move_scored" (seq 43) does not match its schema
- line 55: event "move_played" (seq 55) does not match its schema
- line 56: event "move_scored" (seq 56) does not match its schema
- line 71: event "move_played" (seq 71) does not match its schema
- line 72: event "move_scored" (seq 72) does not match its schema
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_scored" (seq 81) does not match its schema
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 97: event "move_played" (seq 97) does not match its schema
- and 161 more
