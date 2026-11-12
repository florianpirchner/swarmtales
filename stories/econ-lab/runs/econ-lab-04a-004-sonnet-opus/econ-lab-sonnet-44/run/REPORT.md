# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 44 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #763 (609 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.249 USD for this run (competitors 0.249, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0012 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No resident ever reaches a submission** The run ends at minute 9 with 0 correct and 0 wrong submissions and no levels solved; every resident stays at level 1 and the whole run is quiet. The only recorded activity is private planning and offer-making, never a scored task. (#42, #46, #763)
- **Residents spend the first minutes on a split-the-points game** A01 and A02 make explicit offers of points to A03 and A04 in minutes 1-3 (5 of 10, 4 of 10, 4), so the residents treat the story as a bargaining game rather than a level challenge. Some residents label themselves proposer or responder and wait. (#87, #91, #143, #170, #276)
- **A01 writes a strategy brain with a fixed bargaining rule** A01 saves brain version 2 stating it offers 4 of 10 as proposer and accepts any offer above 0 as responder. This is a concrete, documented choice of strategy that the other residents could exploit, but the run gives no sign they ever saw it. (#342)
- **A04 frames the public-goods phase as costly contribution** A04 reasons that each token contributed returns only 0.4 to itself, so contributing is individually costly, and decides to start with a moderate amount to test the others. This is the clearest moment of a resident reasoning about the game's economics. (#356)
- **All four brain writes are refused for length** At minute 5 all four residents' writeBrain attempts are refused with BRAIN_TOO_LONG (164, 173, 188 and 193 words against a limit of 150). They retry and save version 3 in minute 6, so the failure costs a full minute but does not change the outcome. (#548, #553, #558, #563, #597, #601, #605, #609)
- **A02 concludes defection is dominant** A02's reasoning in minute 7 treats the public-goods setting as a prisoner's dilemma with changing partners, calls defecting dominant and argues cooperation only pays when others cooperate, which seems unlikely. This is the last substantive private thought before the run ends. (#645)

## Problems

1. **The run never produces a single submission** There are 0 submissions and 0 levels solved across the entire run, and minutes 0-9 are all quiet, so the story's main loop is never exercised. The run ends with no standings and nobody stuck, which is the signature of a run that never got started. (#42, #46, #763)
2. **Residents spend their turns waiting on offers that never resolve** Several residents end their turns because they are waiting for a partner's offer or answer, which are the only messages in the log. Because no interaction rounds are recorded as completed, the waiting repeats and eats the run. (#87, #91, #143, #147, #183, #265, #276)
3. **An early game consumes the clock before any level attempt** The bargaining exchanges (rounds 1-6 mentioned) occupy minutes 1-3 with no submission, so a side activity becomes the whole run. The design intent of a level challenge is not visible at all. (#87, #143, #170, #276, #314)
4. **Brain writes fail all four times on the first attempt** All four residents are refused for BRAIN_TOO_LONG in the same minute, then succeed after retrying. The algorithm needs to know the limit before generating, and the waste takes a full minute of the short run. (#548, #553, #558, #563)
5. **The end of the run cuts off without a resolution** The referee ends the run at minute 9 while A02 is still only reasoning about strategy, so no game phase reaches a conclusion. The residents are left with saved brains and no results. (#609, #645, #763)
6. **The residents' private thoughts never become shared information** Useful private conclusions such as A01's fixed rule and A02's defection argument appear only in reasoning and self-talk. With no messages exchanged between them, the story cannot show a contest; their thoughts are not shared. (#314, #333, #342, #645)

## Optimizations

- **Start the challenge earlier and make a submission the main action** The first task of a run should be a level submission rather than an optional bargaining game, so a run starting at level 1 produces at least one scored attempt. This addresses the quiet 0-9 minutes (#42, #46, #763) and the lack of submissions. (#42, #46, #763)
- **Make waiting cost something and guarantee that offers resolve** The log shows residents ending turns while waiting for offers or answers (#87, #143, #147, #183), so a fixed deadline or a default answer would unblock them. Give the responder a time limit, or have the harness reject the offer automatically. (#87, #143, #147, #183)
- **Cap or time-box the side bargaining game** A 'split the points' game took minutes 1-3 and produced no points in this run (#87, #170, #276). If it is meant to be part of the story, set a round limit and a deadline; otherwise remove it from a short run. (#87, #170, #276)
- **Publish the brain word limit to the agents** All four brain writes were refused for exceeding 150 words (#548, #553, #558, #563), which cost a full minute. The system should state the limit in the prompt or accept a summary as a fallback, rather than showing a refusal after the fact. (#548, #553, #558, #563)
- **Give the run more time so a phase can finish** The referee ended the run at minute 9 while A02 was still reasoning (#645, #763). A longer run length, or a short set of test phases, would let the first playing round finish. (#609, #645, #763)

## Loophole candidates

1. **Residents can end turns without acting while the game stays open** (residents) A01 and A02 end their turns repeatedly on the grounds that there is nothing to decide, which uses up the run's short clock (#42, #46, #265). A player could stall out the whole run while lifting a finger. (#42, #46, #265)
2. **Residents avoid acting and only write strategy and wait** (residents) The residents spend their turns writing down strategies and looking at offers rather than making decisions, and the decision log has nothing until the run ends (#342, #601). The run never got past that stage. (#342, #601, #763)

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
- line 76: event "decision_made" (seq 76) does not match its schema
- line 82: event "decision_made" (seq 82) does not match its schema
- line 97: event "decision_made" (seq 97) does not match its schema
- line 103: event "decision_made" (seq 103) does not match its schema
- line 104: event "round_resolved" (seq 104) does not match its schema
- line 105: event "round_opened" (seq 105) does not match its schema
- and 134 more
