# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #5 to #782 (628 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.585 USD for this run (competitors 0.585, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0015 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
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

- **All four residents wrote a cooperative strategy brain in minute 0 before any game rules existed** A01, A02, A03 and A04 each saved a 119-138 word strategy brain in minute 0 built around the same plan: check the payoffs, maximise total points, open co-operative in repeated games (#72, #76, #80, #84). No game had been shown yet, so the brains were written blind. (#72, #76, #80, #84)
- **Game 1 (ultimatum) was played as near-universal even splits with every offer accepted** A01 offered A04 5 of 10 and A04 accepted (#118, #122); A04 offered 5 to A03 (#158); A02 offered 4 twice (#126) and then 5 to reciprocate A04 (#293). A03 ended game 1 top with 31 points against 30/30/29 for A01/A02/A04, as told by the residents themselves (#343, #347, #359, #365). (#118, #122, #126, #158, #293, #343)
- **A proposer kept 6 by offering 4 and still got acceptance, which A04 noticed and planned to copy** A03 offered 4 of 10 as proposer and it was accepted, giving A03 the highest game-1 total (#343). A04 explicitly noted that 'A03 offered 4 and still won' and said it would adjust its ultimatum rule toward proposing 4 (#351). (#343, #351)
- **Game 2 (public goods) was fully co-operative: everyone put all 10 in for all 7 rounds** All four residents opened game 2 by contributing 10 (#375, #382, #389, #396) and resident summaries report everyone contributed the full 10 in all 7 rounds, ending on 112 points each (#602, #606, #617, #622). (#375, #382, #389, #396, #602, #622)
- **Game 3 (prisoner's dilemma) opened with all four residents choosing cooperation** Each resident read the table as co-operative and started with option A: A01 (#643), A02 (#650), A04 (#657) and A03 (#664). No resident switched to defection before the referee ended the run at minute 9 (#782). (#643, #650, #657, #664, #782)

## Problems

1. **No submission, level-up or transfer in the whole run** The computed facts show 0 correct and 0 wrong submissions, no level solved and 0 transfers, and residents spent minutes 0-9 without any submission. Only narrative play-by-play appears in the log. (#118, #602, #782)
2. **A01 was refused for an over-length brain and lost a turn's work** A01's writeBrain was refused at minute 5 with BRAIN_TOO_LONG (170 words against a 150 limit) (#576); it rewrote to 135 words in minute 6 (#622). The length limit is known to residents but not pre-checked, so work was thrown away. (#576, #622)
3. **Residents wrote their first brains with no game rules available** All four brains were created in minute 0 before any table had been shown, so they were generic playbooks built on guesswork (#72, #76, #80, #84). A02 explicitly noted 'the first game's rules aren't out yet' (#76). (#72, #76, #80, #84)
4. **The whole city played a single co-operative equilibrium, so nobody competed** Every ultimatum offer was accepted, every public-goods round was a full contribution of 10 (#602), and every prisoner's dilemma move was cooperation (#643, #650, #657, #664). The competitive framing of the story produced no conflict or differentiation. (#122, #602, #643, #664)
5. **No social channel was used at all** The computed facts report 0 DMs, 0 board posts and 0 group posts, and the gamemaker took no actions. The only communication is residents' private SAYS TO ITSELF lines, which the others never see (#118, #235). (#118, #235)

## Optimizations

- **Ship each game's rules before the first brain-writing window** Because brains were written blind (#72, #76, #80, #84), they were generic. Present the table before the minute-0 brain write so the strategy can fit the actual game. (#72, #76, #80, #84)
- **Validate brain length before saving to avoid a wasted turn** A01's writeBrain was refused for being 170 words against a 150 limit (#576) and had to be rewritten a minute later (#622). Reject with a suggestion or auto-trim, or raise the limit. (#576, #622)
- **Add a tension mechanism to break the all-cooperate equilibrium** Everyone accepted every offer (#122), contributed the full 10 in every round (#602) and cooperated in the dilemma (#643, #664). Introduce defector incentives, unequal endowments or a scoring pressure that punishes pure fairness so the competition matters. (#122, #602, #643, #664)
- **Require or reward public messages so the social channel is exercised** The computed facts record 0 DMs and 0 board posts, so alliances and reputation never had to be tested. Add a mandate or bonus for board or group messages, or make information about partners only available through them. (#118, #235)
- **Give the run enough minutes for the intended arc** The referee ended the run at minute 9 (#782) while game 3 had only just begun with everyone on cooperation (#643, #664). Budget more minutes or a round cap so a third game actually resolves. (#643, #664, #782)

## Loophole candidates

1. **The fair-split norm made every ultimatum offer acceptable, so no risk was ever taken** (residents) A01 offered 5 and A04 accepted (#118, #122); A04 offered 5 to keep the 'fair 5-5 pattern' (#158); A02 offered 5 'to reciprocate' (#293). Residents could safely propose or accept even splits without any game-theoretic reasoning, so the competitive seat never mattered. (#118, #122, #158, #293)
2. **Full contribution to the public fund was a cost-free cooperative path** (residents) All residents put all 10 in for all 7 rounds and all ended on 112 points (#602, #606, #617, #622), so contributing the maximum was as good as any other choice and required no sacrifice or strategy. (#602, #606, #617, #622)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 91: event "block_started" (seq 91) does not match its schema
- line 92: event "round_opened" (seq 92) does not match its schema
- line 99: event "decision_made" (seq 99) does not match its schema
- line 107: event "decision_made" (seq 107) does not match its schema
- line 113: event "decision_made" (seq 113) does not match its schema
- line 132: event "decision_made" (seq 132) does not match its schema
- line 133: event "round_resolved" (seq 133) does not match its schema
- line 134: event "round_opened" (seq 134) does not match its schema
- and 134 more
