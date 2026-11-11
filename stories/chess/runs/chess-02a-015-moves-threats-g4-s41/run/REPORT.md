# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-moves-threats-g4-p80` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 45 (referee) |
| Counted | events #3 to #2708 (2197 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 45 minutes (to the end); A02 on level 1 from minute 0 for 45 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.236 USD for this run (competitors 0.236, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0046 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 46 of 46 minutes without a submission; longest without one: minutes 0-45 (46) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4, ILLEGAL_MOVE 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 won games 1 and 2, A02 won game 3, and game 4 was cut off by the referee.** A01 won game 1 when A02 resigned at minute 10 (#623), and won game 2 when A02 resigned at minute 23 (#1438). A02 won game 3 when A01 resigned at minute 31 (#1951, #1957). Game 4 was still running at minute 45, when the referee ended the run (#2708). (#623, #1438, #1951, #1957, #2708)
- **A01 repeatedly hung a queen after missing a pawn attack.** In game 3 A01 played Qd4 without seeing that the e5 pawn attacks it, and lost the queen (#1731, #1951). In game 4 A01 repeated the mistake with Qe4, and A02's exd5 line exploited it (#2268, #2277). These were the decisive swings. (#1731, #1951, #2268, #2277)
- **A02 lost rook after rook to one-move oversights.** In game 2 A02 played Rc6 without noticing bxc6 (#1394, #1408). In game 4 A02 played Rxb7 into an illegal-move refusal (#2496) and then lost a rook to Rxd5 when the e4 king covered d5 (#2653, #2657). (#1394, #1408, #2496, #2653, #2657)
- **Both residents wrote long brains, and writeBrain refused four times.** A01's brain had 200 words, then 155 words, and was refused both times (#1429, #1435). Later refusals hit A01 at 184 words (#1921) and A02 at 162 words (#1927), costing minutes of retro time. (#1429, #1435, #1921, #1927)
- **A01 tried two illegal moves in game 4.** A01 tried "b6b3" and was told it was not legal (#2149). Later it tried "d6e5" and was refused again (#2590). (#2149, #2590)

## Problems

1. **Residents spent many minutes thinking instead of moving.** A01 wrote long deliberation chains on single moves, e.g. #185, #219, #260, #345, #454, #583, #965, #1080, #2586. A02 did the same, e.g. #251, #268, #359, #394, #468, #934, #957. The 45-minute cap ended the run mid-game (#2708). (#185, #219, #251, #260, #268, #345, #359, #394, #454, #468, #583, #934, #957, #965, #1080, #2586, #2708)
2. **Residents lost track of material and pieces.** A01 recalculated material repeatedly: #251, #902, #926, #948, #1121, #1167, #2260. A02 also miscounted: #485, #583, #600, #917, #975, #1031. These miscounts led to blunders and resignations (#623, #1908, #2702). (#251, #485, #583, #600, #623, #902, #917, #926, #948, #975, #1031, #1121, #1167, #1908, #2260, #2702)
3. **The brain word limit was not respected.** writeBrain refused four times for exceeding 150 words (#1429, #1435, #1921, #1927). Each refusal used retro time without saving the brain. (#1429, #1435, #1921, #1927)
4. **Illegal moves cost minutes.** A01 tried "b6b3" (#2149) and "d6e5" (#2590); A02 tried "b1b7" (#2496). Each refusal is a wasted turn. (#2149, #2496, #2590)
5. **Residents issued no messages or transfers.** The facts record 0 DMs, 0 board posts, 0 group posts, and 0 transfers. Both residents only talked to themselves (#41, #45, #649, #653), so the social layer never activated. (#41, #45, #649, #653)

## Optimizations

- **Cap reasoning length per move.** The resident lines show very long deliberation chains (#185, #2586, #345). A per-move reasoning budget or a forced move after N tokens would prevent stalls. (#185, #345, #2586)
- **Show a material counter and legal-move list in every board view.** Material was recounted dozens of times (#251, #902, #1121, #2260, #485, #917). Illegal moves were tried at #2149, #2496, #2590 despite the board containing legal moves. A persistent material display would remove most of this work. (#251, #485, #902, #917, #1121, #2149, #2260, #2496, #2590)
- **Make the brain word limit visible and provide a counter.** Four BRAIN_TOO_LONG refusals (#1429, #1435, #1921, #1927) wasted retro windows. A live word count or an automatic trim would fix it. (#1429, #1435, #1921, #1927)
- **Trigger social mechanics when residents stay silent.** The fact table shows 0 messages and 0 transfers, and residents only self-talk (#41, #653). A prompt or a gamemaker nudge after two silent minutes would force the social layer. (#41, #653)
- **Add a forced-resignation or adjudication rule for long endgames.** Game 4 ran to minute 45 with A01 down a rook (#2653, #2702) and no result (#2708). A referee resignation threshold would give a clean result. (#2653, #2702, #2708)

## Loophole candidates

1. **Residents used self-talk as a free planning log.** (residents) Both residents used SAYS TO ITSELF to summarize and plan (#41, #649, #653, #1957, #2096, #2198, #2554, #2681), bypassing any message cost while still shape-shifting the record. (#41, #649, #653, #1957, #2096, #2198, #2554, #2681)
2. **A01 treated the brain window as optional and resigned early.** (residents) A01 resigned at minute 30 of game 3 while still able to play (#1908), then said game 3 was lost (#1951). This short-circuits the story's intent to test endgame play. (#1908, #1951)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 13: event "brain_written" (seq 13) does not match its schema
- line 14: event "retro_closed" (seq 14) does not match its schema
- line 22: event "brain_written" (seq 22) does not match its schema
- line 23: event "retro_closed" (seq 23) does not match its schema
- line 50: event "game_started" (seq 50) does not match its schema
- line 57: event "move_played" (seq 57) does not match its schema
- line 58: event "move_scored" (seq 58) does not match its schema
- line 64: event "move_played" (seq 64) does not match its schema
- line 65: event "move_scored" (seq 65) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- line 73: event "move_scored" (seq 73) does not match its schema
- line 79: event "move_played" (seq 79) does not match its schema
- line 80: event "move_scored" (seq 80) does not match its schema
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 95: event "move_played" (seq 95) does not match its schema
- line 96: event "move_scored" (seq 96) does not match its schema
- line 112: event "move_played" (seq 112) does not match its schema
- and 491 more
