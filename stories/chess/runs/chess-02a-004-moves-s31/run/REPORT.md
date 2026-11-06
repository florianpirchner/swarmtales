# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-moves-p80` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 20 (referee) |
| Counted | events #3 to #1179 (962 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 20 minutes (to the end); A02 on level 1 from minute 0 for 20 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.085 USD for this run (competitors 0.085, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 21 of 21 minutes without a submission; longest without one: minutes 0-20 (21) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, ILLEGAL_MOVE 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 won game 1 when A01 resigned after hanging its queen** A01 played Qe5 and missed that the d6 pawn could take it (#357, #365), then resigned at minute 6 (#379). A02 recorded the win and the score as A02 1, A01 0 (#437). (#357, #365, #379, #437)
- **A01 blundered away a rook early in game 1** A01 recaptured with axb3, which opened the a-file, and A02's rook on a8 took the undefended rook on a1 (#322, #339). This put A01 down material before the queen loss. (#322, #339)
- **A01 resigned a second lost position in game 2** Down a rook for two pawns, A01 noted that resigning is allowed in a lost position and resigned (#1173). This ended the run without a submission in either game (#1179). (#1173, #1179)
- **A02 repeatedly hit the brain word limit after winning** A02 tried to write post-game brain notes but was refused three times for exceeding 150 words, at 165, 152 and 151 words (#392, #409, #417). The lesson A02 wanted to record never got saved before the run ended. (#392, #409, #417)
- **Both residents spent long stretches checking the board while moves were locked** A01 and A02 both found playMove locked and fell back to viewBoard (#112, #127, #454, #483). Even when moves were open they reasoned for many minutes between moves, e.g. A01 from #86 to #102 over the second move. (#112, #127, #454, #483)
- **A01's second game plan started with the same Italian opening** A01 chose the Giuoco Piano with Bc5 at minute 9 (#500), the same opening family it lost with in game 1 (#86, #102). It did not change approach after the first loss. (#86, #102, #500)

## Problems

1. **No level was solved and no submission was made all run** The run ended at minute 20 with 0 correct and 0 wrong submissions, and both residents were stuck on level 1 from minute 0 to the end (#1179). The story produced two losses and no progress. (#1179)
2. **Brain writes were refused for word limit, blocking learning between games** A02's post-win notes were refused three times (#392, #409, #417) with limits exceeded by 1 to 15 words. The only learning channel between games was effectively closed. (#392, #409, #417)
3. **Tool lock during the wait between games wasted minutes** With playMove and writeBrain locked, both residents could only call viewBoard and readBrain (#28, #34, #454, #483). This pushed them into idle board checks rather than progress or preparation. (#28, #34, #454, #483)
4. **Two illegal move attempts show turn and legality confusion** A02 tried e1e8 when it was White to move (#827), and A01 tried d3e3 when it was Black to move (#1101). Both were refused with the board unchanged and legal moves listed, costing minutes. (#827, #1101)
5. **Reasoning was very long per move, slowing the games** Residents ran many private reasoning lines of several sentences between single moves, e.g. A01 #179 to #196 and A02 #577 to #599. The pace left time for only about two games in 20 minutes. (#179, #196, #577, #599)
6. **No messages or gamemaker actions at all** The facts record 0 DMs, 0 board posts, 0 group posts and no gamemaker actions. The social and narrative layer of the story never activated. (#437, #1179)

## Optimizations

- **Raise or warn on the brain word limit before writeBrain** A02 lost three attempts to a 150-word cap it could not see until refusal (#392, #409, #417). Show a running word count or accept the brain with a trim, so post-game lessons survive. (#392, #409, #417)
- **Give residents useful actions during the between-games wait** Both residents sat idle checking the board while moves were locked (#112, #127, #454). Allow brain writing or opponent review during the wait so the locked window is not dead time. (#112, #127, #454)
- **Return the side to move with illegal-move refusals** A02 tried a move for the wrong colour (#827) and A01 tried a pinned-rook move without seeing the pin (#1101). Include a short hint like 'you are Black, it is White's move' or flag pinned pieces in the refusal. (#827, #1101)
- **Add a per-move reasoning token or time budget** Residents spent many reasoning lines per move (#179, #196, #577, #599), limiting the run to about two games. Cap reasoning length so more games and levels fit in 20 minutes. (#179, #196, #577, #599)
- **Force a plan reset after a loss** A01 repeated the Italian setup it had just lost with (#500 vs #86). After a loss, prompt the resident to name one concrete change to its opening or tactics before the next game. (#86, #500)
- **Seed the social layer so messages actually happen** The run produced 0 DMs and 0 board posts. Add a first-move prompt or a between-game taunt objective to activate the messaging tools the story depends on. (#437)

## Loophole candidates

1. **Resigning early is a cheap way to end a lost game** (residents) A01 resigned at minute 6 (#379) and again at minute 19 (#1173) instead of playing on. Resigning is allowed when lost, but it ended both games quickly and shrank the run's content. (#379, #1173)

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
- line 97: event "move_played" (seq 97) does not match its schema
- line 98: event "move_scored" (seq 98) does not match its schema
- line 105: event "move_played" (seq 105) does not match its schema
- and 197 more
