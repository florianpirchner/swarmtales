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
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #905 (751 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.020 USD for this run (competitors 0.020, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Round 1 opened only after residents had already written generic brains.** All four residents spent minute 0 drafting placeholder strategy files before any rules were visible, and each then reported the game had not started (#42, #50, #58, #66, #97, #101, #105, #109). (#42, #50, #97, #109)
- **The ultimatum game produced near-even splits with universal acceptance.** A01 and A02 reasoned toward offering 5 as a fair split (#134, #141), A03 also chose 5 (#253), and A04's lower offer of 4 was still accepted (#272, #349), so every offer went through and no transfer was refused. (#134, #141, #253, #272)
- **The public goods game collapsed to zero contributions within two rounds.** Residents identified free-riding as dominant under the 1.6 multiplier (#418, #425, #432, #440), an opening contribution of 5 was met by others at 0 (#457, #464), and by round 3 the group was contributing nothing (#559, #573, #618). (#418, #457, #464, #573)
- **Free-riders A01 and A04 tied for the top of Game 2.** A01 finished Game 2 at 78 by free-riding (#662), A04 also scored 78 (#670), and A02's own recap confirms the gap after opening cooperatively (#708). (#662, #670, #708)
- **Residents correctly inferred the dominant strategy in the final matrix game.** In minute 7 A01 derived that B dominates A (#748), A02 reached the same conclusion (#782), and A03 computed a threshold probability and switched to B (#806, #828). (#748, #782, #806, #828)
- **The run ended in a ten-minute silence with no submissions recorded.** The facts show 0 correct and 0 wrong submissions and quiet minutes 0-9, and the log closes with the referee ending the run at minute 9 (#905). (#905)

## Problems

1. **Residents spent the first minute writing brains against no rules.** Before the game opened, each resident produced a generic 120-word brain and then idled (#42, #50, #97), wasting the opening phase on content the later versions replaced (#662, #670). (#42, #50, #97, #662)
2. **The public goods game pushed everyone to the individually dominant zero.** Every resident explicitly reasoned that contributing returns only 0.4 per token (#418, #425, #432, #440), so cooperation died by round 3 and the game stopped generating decisions rather than dilemmas (#559, #573). (#418, #440, #559, #573)
3. **Repeated rounds were played with no visible end date, so residents could not plan.** A01 noted the number of rounds was unknown (#418) and A02 noted the number of rounds stayed unknown (#479), which made reputation-building pointless and favored defection. (#418, #479)
4. **The harness reports zero submissions despite extensive play.** The computed facts say 0 correct and 0 wrong submissions while residents clearly made choices in the ultimatum and public goods games (#163, #253, #448), so the submission counter is not capturing what happened. (#163, #253, #448)
5. **Phase transitions were confusing and the tool list changed without explanation.** Residents repeatedly noticed that writeBrain or choose had disappeared mid-phase (#85, #221, #764, #776), and A04 flagged a mismatch between the table and the sealed-decision message (#799). (#85, #221, #764, #799)
6. **No board posts, DMs or transfers occurred at all.** The facts record 0 DMs, 0 board posts and 0 transfers, and the log shows residents only reasoning privately or saying things to themselves (#97, #228, #700), so the social layer of the social game never activated. (#97, #228, #700)

## Optimizations

- **Delay brain-writing until rules are published.** Problem: minute-0 brains were written blind and later overwritten. Publish the first game's rules at start or gate writeBrain until then, so the opening minute produces strategy rather than filler (#42, #50, #97). (#42, #50, #97)
- **Announce the round count in repeated games.** Problem: residents could not judge whether cooperation was worth building (#418, #479). State the horizon (e.g. 'this game lasts N rounds') so tit-for-tat and reputation reasoning become meaningful. (#418, #479)
- **Tune the public goods multiplier or payoffs to keep cooperation viable.** Problem: the 1.6 multiplier made free-riding strictly dominant and everyone converged on zero (#418, #440, #573). Raise the multiplier above 4 or add a punishment stage so contributing is not a strictly losing move. (#418, #440, #573)
- **Fix the submission counter to record game choices.** Problem: the facts show 0 submissions although residents made choices every game (#163, #253, #448). Instrument the ultimatum, contribution and matrix choices as submissions so the report reflects actual play. (#163, #253, #448)
- **Signal phase changes explicitly in the tool description.** Problem: residents inferred phase ends only from disappearing tools (#85, #764, #776) and hit contradictions (#799). Emit an explicit 'phase X open/closed' notice with each turn. (#85, #764, #799)
- **Give the social layer a reason to be used.** Problem: 0 messages, 0 transfers and 0 group posts in the whole run (#97, #228, #700). Add a cheap talk or coalition phase with a payoff attached, so residents must talk to coordinate. (#97, #228, #700)

## Loophole candidates

1. **Residents solved the ultimatum and matrix games by dominance, skipping any bargaining or trust.** (residents) A04 chose to keep 6 and offer 4 because acceptance was near-certain (#206, #349), and A01 and A02 picked B purely by dominance (#748, #782), so the intended social tension never materialized. (#206, #349, #748, #782)
2. **Free-riding was the safe, dominant path in the public goods game.** (residents) A01 explicitly chose 0 as the individually better option (#457) and later banked the tied top score of 78 by free-riding (#662), turning the cooperation game into a guaranteed floor with no downside. (#457, #662)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 53: event "brain_written" (seq 53) does not match its schema
- line 54: event "retro_closed" (seq 54) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 111: event "block_started" (seq 111) does not match its schema
- line 112: event "round_opened" (seq 112) does not match its schema
- line 137: event "decision_made" (seq 137) does not match its schema
- line 144: event "decision_made" (seq 144) does not match its schema
- line 150: event "decision_made" (seq 150) does not match its schema
- line 156: event "decision_made" (seq 156) does not match its schema
- line 157: event "round_resolved" (seq 157) does not match its schema
- line 158: event "round_opened" (seq 158) does not match its schema
- and 134 more
