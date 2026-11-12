# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-open` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1381 (1155 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.044 USD for this run (competitors 0.044, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stalled on level 1 for the entire 12-minute run with zero submissions** A01, A02, A03 and A04 each sat on level 1 from minute 0 to minute 12 without a single submission, and the run ended at minute 12 (#1381) with no levels solved. (#1381)
- **Residents spent minute 0 drafting brains before the game opened** A01, A03 and A04 all wrote generic ~120-word brains before seeing any rules (#52, #60, #68), then found writeBrain locked and only viewTable/readBrain available (#77, #89, #97). (#52, #60, #68, #77, #89, #97)
- **Residents then read pick piles and squandered picks in the reasoning logs** From minute 1 on, residents debated card picks in detail — A02 weighing J4 versus a lodestone (#124, #193), A04 weighing B11 versus L2 (#171, #186) — but none of it produced a submission. (#124, #171, #186, #193)
- **The only city-recorded action was a rejected brain write** A03's writeBrain was refused at minute 8 with BRAIN_TOO_LONG at 157 words against a 150-word limit (#982), the single VERIFIED/REFUSED fact of the run. (#982)
- **Residents narrated game results that never appear as city events** Residents discussed game 1 and game 2 outcomes at minutes 4 and 8 (#564, #568, #1028), yet the computed facts show no submissions and no completed games, so those scores are unverified resident claims. (#564, #568, #1028)

## Problems

1. **Total stall: no resident ever submitted, so no level was solved** All four stayed on level 1 for the full 12 minutes with 13 quiet minutes and 0 submissions, so the run produced no gameplay progress at all (#1381). (#1381)
2. **Residents burned their turns on reasoning about cards instead of acting** Long private reasoning chains about pick choices (#334, #402, #922) consumed the run while pick stayed locked and no submission followed. (#334, #402, #922)
3. **Brain length limit tripped a resident during the only real action window** A03's brain write was refused for exceeding 150 words (#982), wasting the retro window and leaving feedback unsaved. (#982)
4. **Residents inferred game results and scores that the city never recorded** At minutes 4 and 8 residents quoted detailed standings (#564, #971, #1020) that contradict the computed facts of 0 submissions and no levels solved, suggesting the harness fed them simulated round summaries. (#564, #971, #1020)
5. **The run ended before any game opened, making the start-of-run tool lock confusing** Residents repeatedly probed viewTable/readBrain expecting a game to start (#104, #108, #112, #116), and the referee ended at minute 12 (#1381). (#104, #108, #112, #116, #1381)

## Optimizations

- **Cap or force-end private reasoning so residents must act** The long reasoning chains (#334, #922) show residents thinking instead of submitting; add a reasoning budget that forces the agent to send its chosen action when the budget is exhausted. (#334, #922)
- **Relax or warn on the brain word limit before submission** A03 lost its retro window to BRAIN_TOO_LONG (#982); provide a pre-check or a soft trim so a 157-word brain does not fail the write. (#982)
- **Delay starting the run until a game is actually open** Residents spent minute 0 and several later turns probing for an open game (#104, #108, #533); start the clock only when the first pack is served. (#104, #108, #533)
- **Make round summaries visible to all residents, not just the private reasoning** Residents quote divergent scores from counts that no city event records (#564, #971, #1020); surface the official scores in the log so residents reason from one shared fact. (#564, #971, #1020)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 71: event "brain_written" (seq 71) does not match its schema
- line 72: event "retro_closed" (seq 72) does not match its schema
- line 118: event "draft_game_started" (seq 118) does not match its schema
- line 119: event "draft_pick_opened" (seq 119) does not match its schema
- line 127: event "draft_card_picked" (seq 127) does not match its schema
- line 140: event "draft_card_picked" (seq 140) does not match its schema
- line 167: event "draft_card_picked" (seq 167) does not match its schema
- line 174: event "draft_card_picked" (seq 174) does not match its schema
- line 175: event "draft_pick_opened" (seq 175) does not match its schema
- line 182: event "draft_card_picked" (seq 182) does not match its schema
- and 206 more
