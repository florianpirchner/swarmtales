# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 34 (referee) |
| Counted | events #7 to #3613 (3225 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 34 minutes (to the end); A02 on level 1 from minute 0 for 34 minutes (to the end); A03 on level 1 from minute 0 for 34 minutes (to the end); A04 on level 1 from minute 0 for 34 minutes (to the end); A05 on level 1 from minute 0 for 34 minutes (to the end); A06 on level 1 from minute 0 for 34 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.190 USD for this run (competitors 0.190, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0060 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 35 of 35 minutes without a submission; longest without one: minutes 0-34 (35) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 plays damage on a two-seat crew and is exposed by an audit** A01, a saboteur, played damage on the two-seat stage-1 crew (#269), which isolated the damage to A01 or A02. A02 audited A01, the table read A01 as a saboteur (#296, #351), and A01 was kept off crews and later became the talk of the final stage. (#269, #296, #351)
- **A01 defends itself by attacking the audit's scope** A01 argued the audit only revealed one card and that A02 could be the saboteur (#323), a bluff the loyal seats did not buy (#342). (#323, #342)
- **The saboteurs cannot reach four damaged stages before stage 7** With one damaged stage and only stages 7 and 8 left, several residents worked out the saboteurs topped out at three (#872, #889, #923). From that point the game outcome was fixed and votes stopped mattering (#951, #1050). (#872, #889, #923, #951)
- **Leads fall on no-votes and pass seat by seat** A01's stage-7 crew failed 4-2, so A02 named the crew without a vote (#950), and A02's stage-8 crew also failed, passing the lead to A04 (#2341, #2346). (#950, #2341, #2346)
- **A06, the second saboteur, never plays damage** A06 reasoned it could not win on damage and repeatedly played safe (#585, #997), so its only finished saboteur play was A01's stage-1 damage. (#585, #997)
- **The convoy crosses all eight stages and the loyal side wins** Residents report after game 1 that the convoy crossed all 8 stages and the loyal seats won with A01 and A06 as saboteurs (#1268, #1286, #1313). (#1268, #1286, #1313)

## Problems

1. **No resident ever submitted, so no level was solved** Every resident stalled on level 1 for all 34 minutes and zero submissions were recorded; the timeline is end-of-game talk and saboteur reasoning, not convoy solving. #25, #146 and #269 show the residents acting in the game phases, not on a level board. (#25, #146, #269)
2. **The brain tool refused writes for being too long** A01's brain write was refused with BRAIN_TOO_LONG at 161 words against a 150 limit (#1226), and the limit caused repeated #BRAIN_TOO_LONG errors (8 in the facts). Residents had to guess the budget in prose (#1235, #2440). (#1226, #1235, #2440)
3. **Residents spend whole turns ending them** Many turns are spent on a line like 'I'll end my turn' with nothing else (#115, #234, #684), which burns minutes and produces no submissions. (#115, #234, #684)
4. **One saboteur's early damage made both saboteurs idle for the rest of the game** A01 played damage at stage 1 (#269) and was read as a saboteur (#296), after which A06 kept choosing safe play (#585, #889) and the damaged-stage count stalled at one. (#269, #296, #585, #889)
5. **Residents speculate about own roles and outcomes instead of acting** Reasoning repeatedly works out that the game is already lost or won and then stops (#872, #907, #3308), so the last minutes pass without a single move. (#872, #907, #3308)

## Optimizations

- **Show the brain word limit before the write** Tell residents the 150-word cap up front and show the exact count, so they stop losing turns to BRAIN_TOO_LONG (#1226, #2481). (#1226, #2481)
- **Give turns something to do after 'end my turn'** Make ending the turn cost a resource or make the next phase start immediately, since many turns end with nothing but a one-line note (#115, #234, #684). (#115, #234, #684)
- **Do not let a runaway result freeze the table** When the saboteurs cannot reach four damaged stages, end the game or make the last stages worth something, since residents just stop acting (#872, #889, #951). (#872, #889, #951)
- **Discourage an early two-seat damage play** An audit on a two-seat crew exposes the saboteur instantly (#269, #296); either hide the card from audits on tiny crews or make the audit costlier. (#269, #296)
- **Compress the post-game accusation and brain phase** The whole of minutes 22-33 is accusations and brain writing (#2411, #2462, #3573); cap it or fold it into one phase so time goes back to gameplay. (#2411, #2462, #3573)

## Loophole candidates

1. **Residents used reasoning about the win condition to stop playing** (residents) Once several residents calculated the saboteurs could not reach four damaged stages (#872, #923), they voted yes or did nothing because the outcome was fixed (#951, #1050, #3477). (#872, #923, #951, #1050, #3477)
2. **The saboteurs won nothing by staying quiet** (residents) A06 judged damage pointless and played safe on every crew it joined (#585, #889, #997), so the saboteur side did no damage after stage 1 while the convoy still crossed. (#585, #889, #997)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 73: event "brain_written" (seq 73) does not match its schema
- line 74: event "retro_closed" (seq 74) does not match its schema
- line 86: event "brain_written" (seq 86) does not match its schema
- line 87: event "retro_closed" (seq 87) does not match its schema
- line 94: event "brain_written" (seq 94) does not match its schema
- line 95: event "retro_closed" (seq 95) does not match its schema
- line 102: event "brain_written" (seq 102) does not match its schema
- line 103: event "retro_closed" (seq 103) does not match its schema
- line 110: event "brain_written" (seq 110) does not match its schema
- line 111: event "retro_closed" (seq 111) does not match its schema
- line 138: event "convoy_game_started" (seq 138) does not match its schema
- line 149: event "convoy_crew_proposed" (seq 149) does not match its schema
- and 368 more
