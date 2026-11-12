# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-open` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1309 (1083 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.039 USD for this run (competitors 0.039, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0045 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents idled through the opening because writeBrain was locked before the game started** At minute 0 every resident wrote a generic brain, then found writeBrain closed and the table showing no game yet; each said it would wait. They did the same after games 1 and 2, so the first minutes of each game were spent waiting rather than drafting, e.g. #113, #509, #933. (#45, #83, #89, #104, #112, #113, #509, #533)
- **All four residents went mono-colour and read each other's piles as scouting** A01 committed to cobalt, A03 to basalt, A04 to amber and A02 to jade/basalt, and each justified choices by counting the other seats' cards (A01 noting A03's 6 cobalt at #654, A02 weighing A03's basalt at #209). This reading drove nearly every pick. (#125, #139, #146, #209, #654, #785)
- **A01 won game 1 on a 10-card cobalt stack and A03's post-mortem stated the lesson** A01's self-report at #509 says it finished first with 117 points from a 10-card cobalt stack; A03's recap at #528 says the same from the other side. A03's at #470 concludes that mono-colour wins but the majority bonuses decide the winner. (#470, #486, #509, #528)
- **A02 hit the brain word limit twice on the same thought** A02's writeBrain was REFUSED twice in minute 8, once at 173 words and once at 151 against a 150 limit, so its game-2 lesson never made it into the brain. No other resident hit the limit. (#916, #939)
- **A01's cobalt strategy was defeated in game 2 by A03 drafting the same colour** A01's recap at #943 says its five-card cobalt stack lost the majority to A03's six; A03's own tally at #897 reaches 67 against A04's 101. The transposed 'lesson' in A04's and A01's notes is that a colour taken by a rival is a loss, not a plan. (#897, #933, #943)
- **The run ended with no verified submission and no direct messages** By the end, the scoreboard says 0 correct and 0 wrong submissions, 0 transfers, and 0 messages or board posts. The referee ended the run at minute 12 (#1309) after three games had been played in scoring terms. (#1309)

## Problems

1. **Every resident stalled for the whole run** All four are recorded on level 1 from minute 0 to minute 12 with no submission in any minute. Every pick was a claim the resident made, checked only by the city's table, and the scoring never converted into a level-up. See #13, #45, #89, then #1309. (#13, #45, #89, #1309)
2. **The writeBrain tool was closed before the first game and after every game** Residents arrived, wrote a brain and then found writeBrain locked while the game had not started, so they passed idle minutes at #83, #89, #509, #503, #933, #958. The repeated tool-lock windows stall the mini-game instead of pacing it. (#83, #89, #503, #509, #933, #958)
3. **A02's brain was too long twice at the only moment of learning** A02 got two BRAIN_TOO_LONG refusals at 173 and 151 words against a 150-word limit, so the game-2 lesson was not updated. It is unclear whether the recorder counted markdown or the legible total. This is a wasted correction cycle. (#916, #939)
4. **The run was a string of unverified game summaries and not the intended game** The facts say 0 points, no correct submissions, no transfers, and no messages were logged, yet all residents report points and game results (e.g. A01 117, #486, A04 101, #905). The states appear to be the resident narrations rather than the referee's conversions. The comparison of claims against the quarry listings contradicts itself at #470 and #905. (#470, #486, #897, #905, #943)
5. **The rules were misunderstood as if the game had already started** The opening game #104 and #108 explicitly said 'The first game hasn't started yet'. Residents then reasoned about squares and wildcards from an unknown rules text. A01 at #146 mentions 'Cobalt shows up twice' and the pack later contains different cards, as in #342. The story is not aiming for the draft. (#104, #108, #146, #342)
6. **No gamemaker action throughout the whole run** There are no gamemaker actions, no classifier labels and no tool errors other than two BRAIN_TOO_LONG. This suggests the story's design is not interacting with the harness, so the game would not necessarily be balanced or judged by a human. (#916, #1309)

## Optimizations

- **Open the pick tools before the round phase starts** Do not open the game with a text that says only viewTable and readBrain are open and the game hasn't started. Give the round a short 'draft your first brain' prompt, or allow writeBrain at game start. Residents lost 4-5 minutes to waiting (#113, #503, #933). (#113, #503, #933)
- **Make the leaderboard/table visible immediately after the game so the lesson matches the referee** The residents rely on their own memory for scoring, and the facts say there are no verified score or submission entries (0 correct, 0 wrong; #1309). A verified table with final scores would stop the 'my recollection vs. A02's' uncertainty. (#470, #905, #917, #939, #1309)
- **Make the brain update tool that keeps its word count or use one correction per game** If the learnings are collected only after the game, they can be counted at the walk-through prompt; the sequence of two retries (BRAIN_TOO_LONG 173 -> 151) means a better error and better advice. The bark at #916 and #939 shows that the agent can make a wrong statement and cost it every turn. (#916, #939)
- **Give the resident a brief deliverable and the game round timing in one place** Add a short history at the top of the game with the same table the game is built on, and state when the draft starts/ends, so the residents do not spend a sub-game on a subgame. The wait at #113 and #533 is mismatched to the play. (#113, #533, #958)
- **Add a per-minute check so that a resident cannot stall on the board** Can show a time-to-submit counter per minute or make it clear if the table is not closed, which can be inferred from the repeated stall at the start of the next game (#503, #933). The write caps at >150 words also instruct 'at least one turn with a pick' every minute. (#503, #916, #933)

## Loophole candidates

1. **The game described only in summaries and counted as a different game** (residents) The residents read 'A01 117, A04 100, A03 91, A02 79' etc. and then A01's game is re-summarised as 'my 10-card cobalt stack' (#509), which may not be the game the referee is tracking. A02 summarised as last place 79 but A02 later counts a '90-point' game with a basalt. The mismatch is a path that scores no points and a different story. (#470, #486, #528, #533, #905)
2. **The chars are picked as 'less contested' rather than clarifying** (residents) A04 says at #1000 'jade looks less-taken' based on eaten piles after a pass; many choices are black-box heuristics (#670, #1000, #1176). This is a legal but low-information path; it sidesteps the spirit of reading the pack and the board. (#670, #1000, #1176)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 64: event "brain_written" (seq 64) does not match its schema
- line 65: event "retro_closed" (seq 65) does not match its schema
- line 72: event "brain_written" (seq 72) does not match its schema
- line 73: event "retro_closed" (seq 73) does not match its schema
- line 119: event "draft_game_started" (seq 119) does not match its schema
- line 120: event "draft_pick_opened" (seq 120) does not match its schema
- line 128: event "draft_card_picked" (seq 128) does not match its schema
- line 135: event "draft_card_picked" (seq 135) does not match its schema
- line 142: event "draft_card_picked" (seq 142) does not match its schema
- line 149: event "draft_card_picked" (seq 149) does not match its schema
- line 150: event "draft_pick_opened" (seq 150) does not match its schema
- line 157: event "draft_card_picked" (seq 157) does not match its schema
- and 206 more
