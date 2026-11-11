# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-coach-g4-p80` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 53 (referee) |
| Counted | events #3 to #3261 (2645 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 53 minutes (to the end); A02 on level 1 from minute 0 for 53 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.281 USD for this run (competitors 0.281, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 54 of 54 minutes without a submission; longest without one: minutes 0-53 (54) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 13, BRAIN_TOO_LONG 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents never submitted a move in 53 minutes** A01 and A02 were stuck on level 1 from minute 0 to minute 53 with zero submissions, zero correct and zero wrong (#39, #45, #3261). The run ends at minute 53 with no level solved. (#39, #45, #3261)
- **Residents played many chess moves but none were recorded as submissions** The reasoning lines describe a full Italian Game with captures and endgames (#102, #134, #197), and A02 even recaps game results (#945, #1792), yet the computed facts count 0 submissions. The play path and the scoring path do not match. (#102, #134, #197, #945, #1792)
- **A01 lost its queen on move 52 and gave away the last game** A01 placed its queen on e4 where Qc2 attacked it along the diagonal and admitted the blunder, with material going to 26 against 16 (#3255). This followed earlier blunders it noticed itself, such as dropping a bishop on d5 (#1262). (#1262, #3255)
- **A02 resigned a lost game and kept a running score** A02 reasoned that it was down about seven points, that resigning and continuing both lost, and resigned (#2497), then reported the score as A01 2, A02 1 (#2526). A01 confirmed the same scoreboard (#2536). (#2497, #2526, #2536)
- **Tool list churn repeatedly locked play** Residents repeatedly saw only viewBoard and readBrain open and playMove locked (#39, #94, #1841, #2672), which pushed them into waiting turns instead of acting. This happened at m0, m1, m16, m29 and m43. (#39, #94, #1841, #2672)
- **Residents rewrote their brains but hit word limits** A01 was refused three times for BRAIN_TOO_LONG with 159, 154 and 152 words against a 150 limit (#934, #1782, #1789), and A02 wrote lessons to trim to about 120 words (#2509). (#934, #1782, #1789, #2509)

## Problems

1. **The run produced no scored progress despite long play** The facts show 0 submissions and no level-ups in 53 minutes, while the log shows dozens of chess moves being reasoned about and played (#102, #134, #197). The game loop is not converting play into score. (#102, #134, #197, #3261)
2. **Frequent ILLEGAL_MOVE refusals from misread boards** There were 13 ILLEGAL_MOVE refusals, e.g. A02 trying b6d4 (#325), c8c4 (#631) and b6d4 again (#2294), and A01 trying e1e6 (#500) and g1g2 twice (#1597, #2473). Residents kept acting on stale or misremembered positions. (#325, #500, #631, #1597, #2294, #2473)
3. **Locked tools kept residents idle for whole minutes** Residents explicitly concluded playMove was unavailable and only viewed the board or waited (#39, #56, #505, #3016). A02 ended a turn saying Black is to move while the facts say no submission was ever made. (#39, #56, #505, #3016)
4. **Brains too long wasted turns on retries** Three writeBrain attempts were refused for exceeding 150 words (#934, #1782, #1789), costing turns near game boundaries. The cap is below what residents naturally write when summarizing lessons. (#934, #1782, #1789)
5. **Residents trusted or doubted review notes inconsistently** A01 suspected a coach review that said it resigned when the board showed the game in progress (#2517), and A02 said it would check the board before trusting any review (#2536). Reviews and results appear to disagree with the live board. (#2517, #2536)
6. **Gamemaker and classifier did nothing** The facts record no gamemaker actions and no labels, with gamemaker and classifier cost at 0.000 USD. No beats were found by the digest, so nothing steered the story. (#3261)

## Optimizations

- **Fix the path from playMove to scored submissions** Make sure legal chess moves issued via playMove count as submissions and feed the level and points table, since #102 and #197 show moves being played but the facts report 0 submissions (#3261). (#102, #197, #3261)
- **Show a live legal-move list before each playMove** Attach each piece's legal-move list to the playMove refusal (as done in #325 and #631) and also proactively in the board view, cutting the 13 ILLEGAL_MOVE refusals seen at #500, #1597 and #2294. (#325, #631, #1597, #2294)
- **Make tool locks explicit per turn instead of churn notices** Residents wasted minutes inferring it was the opponent's turn from a changing tool list (#39, #1841). Send a single clear turn status naming whose move it is and which tools are open. (#39, #94, #1841, #3016)
- **Raise or warn on the brain word limit** Three writeBrain refusals burned turns (#934, #1782, #1789). Either raise the 150-word cap or show the current word count inside writeBrain so residents trim before submitting. (#934, #1782, #1789, #2509)
- **Reconcile coach reviews with the actual board and score** A01 and A02 got reviews that conflicted with the board and scoreboard (#2517, #2536). Generate reviews from the recorded game and show the scoreboard in the review so residents do not waste turns fact-checking. (#2517, #2536)
- **Give the gamemaker a role so the city reacts** With no gamemaker actions and no labels (#3261), the run produced no beats. Have the gamemaker post prompts or board messages to keep both residents engaged and to mark stalls. (#3261)

## Loophole candidates

1. **Residents treated draws at the move cap as results** (residents) A02 reported games drawn at the 40-move cap on material and updated its brain (#945, #1792) while the facts record no submissions. Ending games on material at the cap lets residents claim outcomes that the scoring does not register. (#945, #1792, #3261)
2. **Resigning was a safe exit from a lost game** (residents) A02 chose to resign a lost position knowing resigning and continuing both lose (#2497), which ended the game without further risk but still counted as a game result in its own tally (#2526). (#2497, #2526)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 58: event "game_started" (seq 58) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_scored" (seq 66) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- line 73: event "move_scored" (seq 73) does not match its schema
- line 88: event "move_played" (seq 88) does not match its schema
- line 89: event "move_scored" (seq 89) does not match its schema
- line 105: event "move_played" (seq 105) does not match its schema
- line 106: event "move_scored" (seq 106) does not match its schema
- line 114: event "move_played" (seq 114) does not match its schema
- line 115: event "move_scored" (seq 115) does not match its schema
- line 121: event "move_played" (seq 121) does not match its schema
- line 122: event "move_scored" (seq 122) does not match its schema
- line 137: event "move_played" (seq 137) does not match its schema
- and 596 more
