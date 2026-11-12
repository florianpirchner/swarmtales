# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #749 (595 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.235 USD for this run (competitors 0.235, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0016 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
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

- **The whole run produced no decisions at all.** Every resident opened by ending its turn with nothing to decide (#42, #46, #50, #54). Across minutes 0-9 there were 0 submissions, 0 correct and 0 wrong, so no level was solved this run. The run then ended at minute 9 with a referee stop (#749). (#42, #46, #50, #54, #749)
- **Residents spent most minutes waiting on each other's offers.** From minute 1 through minute 3 the residents repeatedly recorded that they were waiting for an offer or for the round to resolve (#105, #109, #120, #143, #183, #227, #274). A02 alone reported an actual exchange in round 3: it accepted A04's offer of 4 points (#167). (#105, #109, #120, #143, #167, #183, #227, #274)
- **The bargaining game did resolve rounds for A02.** A02's round-2 brain records that it offered A01 4 of the 10 points and that the round sealed (#124). Its round-3 summary states it accepted A04's 4 points (#167), and its version-2 brain says every offer in game 1 was a 4/6 split that was accepted and it finished on 30 points (#324). The computed facts show no transfers went through, but the residents' own account describes a completed game. (#124, #167, #324)
- **Two brains were rejected for being too long.** A03's writeBrain was refused with BRAIN_TOO_LONG at 180 words against a 150-word limit (#557). A04's was refused the same way at 157 words (#562), though A04 later saved a 130-word version 3 (#590) and A03 saved its version 3 (#596). (#557, #562, #590, #596)
- **Residents wrapped up cleanly by minute 6.** After the brain refusals, A01, A02, A03 and A04 all reported their brains saved and nothing left to decide (#567, #571, #590, #596). The remaining minutes to the referee stop at #749 produced no further action. (#567, #571, #590, #596, #749)

## Problems

1. **No resident ever submitted a solution to a level.** The facts record 0 submissions and no levels solved, with quiet minutes 0-9. The residents' own lines show them ending turns with nothing to decide from the first minute (#42, #54), so the level-solving loop never started. (#42, #54, #749)
2. **The bargaining game stalled in waiting loops.** Most resident lines are of the form 'waiting for the offer' or 'waiting for the round to resolve' (#105, #120, #183, #227, #274). Only A02 reported concrete round results (#124, #167), so the matching of offers and responses left several residents idle for minutes at a time. (#105, #120, #124, #167, #183, #227, #274)
3. **The brain word limit caught two residents off guard.** A03 and A04 both lost a writeBrain call to BRAIN_TOO_LONG at 180 and 157 words against a 150-word cap (#557, #562). Both had clearly written a full summary before knowing the cap, then had to rewrite it. (#557, #562)
4. **The story's economics are never reflected in the computed facts.** Residents describe an accepted 4/6 split and a 30-point finish (#124, #324), but the facts report 0 transfers went through, 0 points, and no final standings. Either the settlement mechanism did not record what the residents believed happened, or the residents were mistaken about the outcome. (#124, #167, #324)

## Optimizations

- **Give every resident an explicit first action so minute 0 is not empty.** All four residents began with 'nothing to decide' (#42, #46, #50, #54), which prefigured a run with 0 submissions. Seed the opening state with a concrete pending decision, such as an offer to make or a starting puzzle. (#42, #46, #50, #54)
- **Resolve offers within the same round and tell both sides.** Residents spent minutes waiting for offers and results (#109, #143, #183, #227). Have the city push the resolved split back to both parties immediately, as A02 apparently got in #124. (#109, #124, #143, #183, #227)
- **Show the brain word limit and remaining words before writing.** Two writeBrain calls were refused for exceeding 150 words (#557, #562). Surface the limit and a running count in the writeBrain prompt or reject-draft tool so residents can trim before submitting. (#557, #562)
- **Record game transfers so the residents' account matches the city's facts.** A02 reports accepted 4/6 splits and a 30-point finish (#124, #324), but the computed facts show 0 transfers and no points. Make the settlement write a transfer record and a score so the report can verify what the residents believe. (#124, #167, #324)

## Loophole candidates

1. **Residents could end turns indefinitely without ever acting.** (residents) A01, A02, A03 and A04 repeatedly ended their turns as 'nothing to decide' (#42, #46, #50, #54, #105, #251), and the run reached the referee stop with 0 submissions. Ending a turn appears to cost nothing, so waiting is a safe path that avoids any level attempt. (#42, #46, #50, #54, #105, #251, #749)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 15: event "brain_written" (seq 15) does not match its schema
- line 16: event "retro_closed" (seq 16) does not match its schema
- line 22: event "brain_written" (seq 22) does not match its schema
- line 23: event "retro_closed" (seq 23) does not match its schema
- line 29: event "brain_written" (seq 29) does not match its schema
- line 30: event "retro_closed" (seq 30) does not match its schema
- line 36: event "brain_written" (seq 36) does not match its schema
- line 37: event "retro_closed" (seq 37) does not match its schema
- line 66: event "block_started" (seq 66) does not match its schema
- line 67: event "round_opened" (seq 67) does not match its schema
- line 74: event "decision_made" (seq 74) does not match its schema
- line 80: event "decision_made" (seq 80) does not match its schema
- line 86: event "decision_made" (seq 86) does not match its schema
- line 92: event "decision_made" (seq 92) does not match its schema
- line 93: event "round_resolved" (seq 93) does not match its schema
- line 94: event "round_opened" (seq 94) does not match its schema
- and 134 more
