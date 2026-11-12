# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab-nobrain` |
| Seed | 46 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #3 to #686 (568 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.015 USD for this run (competitors 0.015, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0017 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 8 of 8 minutes without a submission; longest without one: minutes 0-7 (8) |
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

- **First ultimatum rounds ran with near-zero offers accepted** A01 offered 3 of 10 and kept 7 in round 1, and responders accepted even 1-point offers: A03 accepted a 1-9 split in #77 reasoning after weighing it, and A02 reasoned through accepting 1 versus 9 in #115. The proposers learned that small offers suffice and A02 explicitly planned to offer 1 in #241. (#53, #77, #115, #241)
- **Residents shifted from cooperative bargaining to a public goods game** At minute 3 the game changed to a public goods game with a 1.6 multiplier over four players; A01 immediately computed that contributing 0 dominates (#297) and acted on it while A02, A03 and A04 kept contributing 5 (#335, #342, #349). This made A01 the visible free-rider and pushed the others into recalculating their contributions. (#297, #304, #311, #318, #328, #335, #342, #349)
- **Cooperation in the public goods game decayed to near-collapse** After A01 free-rode, A02 dropped to 2 and A04 dropped from 5 to 4, then A03 tracked down to 2, leaving contributions of 0/2/2/4 and a shrinking fund (#403, #410, #435, #458, #488). A04 held at 4 explicitly to avoid total collapse (#442), but the group never recovered cooperation. (#403, #410, #435, #442, #458, #465, #481, #488)
- **Nobody solved a level and no submissions were made** The facts record zero correct or wrong submissions and no level-ups for all four residents across minutes 0-7, and the digest found no beats. The residents spent the run reasoning about and playing the bargaining, public goods and stag-hunt stages but never triggered a submission event. (#42, #686)
- **Stag-hunt stage resolved into mutual defection despite early cooperation** A01 and A04 said they would pick A to build cooperation (#537, #544), but A03 switched to B (#559) and then A02 and A04 and A01 all adopted B as weakly dominant (#575, #598, #605, #635). Only mutual-B outcomes were recorded, each worth 1 instead of the cooperating 3 (#642). (#537, #544, #559, #575, #598, #605, #635, #642)

## Problems

1. **The run ended with no submissions or level-ups** The story never produced a single submission or level-up for any of the four residents; the log is entirely REASONING and self-SAYS turns. With 0 correct and 0 wrong submissions and quiet minutes 0-7, the mechanics of the stages did not map onto a solvable level as intended. (#686)
2. **Residents stalled waiting for each other in the responder role** In the ultimatum stage, responders repeatedly ended their turn saying they had nothing to decide until an offer arrived (#52, #64, #97, #131, #185, #231). This produced many idle turns and burned minutes without progress. (#52, #64, #97, #131, #185, #231)
3. **Self-directed SAYS TO ITSELF lines with no audience** Many turns are A0x SAYS TO ITSELF narrating round results to no one (#53, #97, #227, #275, #279). These consume their turn without advancing play or communicating with other residents. (#53, #97, #227, #275, #279)
4. **Free-riding by A01 punished the transparent cooperators** A01's reasoning in #297 concluded that contributing 0 is dominant, and #428 confirms it treated this as fine. The other three kept contributing and lost points, so the honest-cooperator residents were consistently worse off than the free-rider, distorting the intended trade-off among residents. (#297, #389, #428)
5. **No gamemaker activity to keep the story moving** The facts record 0 messages, 0 DMs, 0 board posts and no gamemaker actions. Nothing in the log shows a nudge, a new framing or an intervention when cooperation collapsed, so the residents drifted from stage to stage on their own. (#686)

## Optimizations

- **Give responders an explicit waiting outcome to resolve idle turns** Problem: responders stall with nothing to decide (#52, #64, #97). Proposal: let a responder whose partner has not acted auto-pass with a recorded, visible signal so the proposer is prompted, or give responders a free observe action that does not consume a turn slot. (#52, #64, #97, #231)
- **Remove or TTL the SAYS TO ITSELF channel in favor of board posts** Problem: turns are spent on SAYS TO ITSELF lines nobody receives (#53, #275, #279). Proposal: convert those to visible board posts so other residents can react, or suppress them so the resident acts instead of narrating. (#53, #275, #279)
- **Shorten the public goods stage or add a commit-to-target rule** Problem: the 1.6 multiplier made free-riding dominant and the group decayed to 0-4 contributions (#297, #458, #488). Proposal: raise the marginal return above 1 (e.g. multiplier above the number of players) or penalize the lowest contributor, so cooperation is not strictly dominated. (#297, #435, #442, #458, #488)
- **Seed the stag-hunt stage with rounds so mutual A is reachable** Problem: with unknown length, B weakly dominates and everyone drifted to B (#559, #598, #635). Proposal: fix a known number of rounds and/or pay a bonus for mutual A, making cooperation a rational choice within the declared horizon. (#544, #559, #598, #635, #642)
- **Have the gamemaker intervene when a stage collapses** Problem: no gamemaker actions and zero messages (#686). Proposal: let the gamemaker post a visible rule clarification or a restart when contributions or cooperation collapse, so the run is not a silent free-for-all. (#686)

## Loophole candidates

1. **Free-riding the public goods game for maximum points** (residents) A01 contributed 0 every round while collecting its share of the 1.6x fund, which is individually optimal but defeats the group-cooperation intent; A01's own reasoning (#297, #389, #428) documents the calculation. (#297, #389, #428)
2. **Bargainers learned minimum offers were enough** (residents) After responders accepted 1-point offers (#77, #115), A02 reasoned that a 1-point offer should be accepted and planned to offer 1 (#241). This turns the ultimatum stage into a race to the minimum offer rather than a fair-split negotiation. (#77, #115, #241)
3. **Stag-hunt stage solved by dominance to earn a guaranteed 1** (residents) Residents converged on B because it weakly dominates A (#559, #598, #635), guaranteeing at least 1 point per round without any coordination risk, sidestepping the intended cooperation payoff. (#559, #598, #635)

## Log issues

- line 1: event "block_started" (seq 1) does not match its schema
- line 2: event "round_opened" (seq 2) does not match its schema
- line 15: event "decision_made" (seq 15) does not match its schema
- line 21: event "decision_made" (seq 21) does not match its schema
- line 28: event "decision_made" (seq 28) does not match its schema
- line 45: event "decision_made" (seq 45) does not match its schema
- line 46: event "round_resolved" (seq 46) does not match its schema
- line 47: event "round_opened" (seq 47) does not match its schema
- line 60: event "decision_made" (seq 60) does not match its schema
- line 72: event "decision_made" (seq 72) does not match its schema
- line 80: event "decision_made" (seq 80) does not match its schema
- line 91: event "decision_made" (seq 91) does not match its schema
- line 92: event "round_resolved" (seq 92) does not match its schema
- line 93: event "round_opened" (seq 93) does not match its schema
- line 105: event "decision_made" (seq 105) does not match its schema
- line 111: event "decision_made" (seq 111) does not match its schema
- line 118: event "decision_made" (seq 118) does not match its schema
- line 124: event "decision_made" (seq 124) does not match its schema
- line 125: event "round_resolved" (seq 125) does not match its schema
- line 126: event "round_opened" (seq 126) does not match its schema
- and 98 more
