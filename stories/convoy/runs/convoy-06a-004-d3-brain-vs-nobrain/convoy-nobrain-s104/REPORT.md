# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-nobrain` |
| Seed | 104 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 27 (referee) |
| Counted | events #2 to #2949 (2643 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 27 minutes (to the end); A02 on level 1 from minute 0 for 27 minutes (to the end); A03 on level 1 from minute 0 for 27 minutes (to the end); A04 on level 1 from minute 0 for 27 minutes (to the end); A05 on level 1 from minute 0 for 27 minutes (to the end); A06 on level 1 from minute 0 for 27 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.144 USD for this run (competitors 0.144, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0051 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 28 of 28 minutes without a submission; longest without one: minutes 0-27 (28) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Two sabotage cards at stage 3 broke the game open.** Stage 3 crew A03, A05, A06 took two damage cards, and A06 immediately deduced that A03 and A05 were the saboteurs (#373). A01 and A02 reached the same read (#407), and A02 proposed the loyal trio A01, A02, A04 (#398), which passed and crossed clean (#506). (#358, #373, #398, #407, #506)
- **A06's audit of A03 turned suspicion into fact.** A06 spent the one audit on A03's stage 3 card and the result showed damage (#637, #681), which the table treated as confirmation (#655, #674). From that point A03 and A05 were kept off every crew (#627, #864). (#627, #637, #655, #674, #681, #864)
- **The second saboteur was pinned by elimination at stage 7.** Stage 7 crew A01, A02, A04, A06 left both A03 and A05 off the crew (#748), and A04 noted A06 was the only uncertain seat who could damage it (#812). Stage 7 crossed clean with one damaged stage of three (#859). (#748, #757, #812, #859)
- **The loyal side won the game on a clean final crossing.** Stage 8 crew A02, A03, A05, A06 excluded A01 and A04, and A05 noted the saboteurs could no longer reach three damaged stages (#858). The crew was confirmed 6-0 (#2894) and the run ended at minute 27 (#2949). (#858, #864, #2894, #2949)
- **The game was only played to the end of game one, not a whole run.** A01 recorded that game one ended with the saboteurs winning on the stage 6 damage (#1877), and a fresh deal restarted at minute 9 with new roles for everyone (#1039, #1048, #1081, #1090). The second game never resolved: the final tally of the second deal is not in the log. (#1039, #1048, #1081, #1090, #1877, #2949)

## Problems

1. **No submissions were made for the whole 28 minutes.** The facts show 0 correct and 0 wrong submissions and 28 quiet minutes; residents only voted, spoke and viewed the convoy (#19, #105, #1236). The run produced no points and no level-ups for any of A01-A06. (#19, #105, #1236, #2949)
2. **A referee end at minute 27 cut the second game short.** The run was ended by the referee at minute 27 (#2949) while game two was still at its stage 6 vote (#2626, #2651). The second deal never reached a result, so its standings are unknown. (#2626, #2651, #2949)
3. **A speak action was refused with TOOL_LOCKED.** A01 tried to speak at stage 3 and got TOOL_LOCKED (#369) because speak was not in the active tools at that phase. One tool error like this interrupts the talk phase and costs a resident a turn. (#369)
4. **The residents repeatedly talked themselves out of acting.** Many residents spent their last speak slot reasoning that a line was unnecessary and ended the turn without using it (#1074, #1640, #1998, #2434). The stage talk therefore carried less information than the design appears to expect. (#1074, #1640, #1998, #2434)
5. **Cooldown arithmetic filled the talk without clearing anyone.** Residents spent long stretches on the once-every-three-stages rule (#543, #552, #1746, #1847) and still could not name the second saboteur (A04 suspected A06 or A05, #984). The rule was worked correctly but produced no verdict. (#543, #552, #984, #1746, #1847)

## Optimizations

- **Give residents a concrete submission target each stage.** The facts show 0 submissions over 28 minutes; nobody ever reached a level task (#2949). Add an explicit per-stage prompt or tool so a resident must submit something, instead of the talk phase ending in self-addressed notes (#56, #110). (#56, #110, #2949)
- **Fix or announce tool availability per phase.** A01's speak was refused as TOOL_LOCKED at stage 3 (#369) even though the table had been speaking in earlier stages. Show the active tool list at the start of each phase so residents do not waste a turn finding out. (#369)
- **Budget the run for both games or stop after one.** The referee ended the run at minute 27 (#2949) with game two unresolved at its stage 6 vote (#2651). Either shorten game one or extend the run so the second deal reaches a result. (#1877, #2651, #2949)
- **Make the audit decision a hard choice by limiting it earlier.** A06's audit of A03 (#637) collapsed the puzzle into a single confirmed fact by stage 6 (#681). Move the audit later or make it cost a point, so the mid-run deduction has to come from votes and talk, not from one free reveal. (#637, #681)
- **Reward using the speak slots so the talk is not silent.** Residents kept ending turns without speaking (#1640, #1998, #2434) and A05 admitted to staying quiet to keep a low profile (#1628). Give a small benefit for speaking or penalize empty turns, so the board carries real claims the story can build on. (#1628, #1640, #1998, #2434)

## Loophole candidates

1. **Saboteurs sat on clean stages while building trusted standing.** A03 and A05 voted yes and stayed quiet on early crews to look trustworthy (#67, #76, #449), which kept them off the suspect list until the stage 3 double damage (#373). The design's intent of early pressure was dodged by playing safe. (#67, #76, #373, #449)
2. **A saboteur held damage until the endgame window was open.** A03 reasoned it should save its damage for when it counts (#244), and A05 weighed playing damage at stage 3 only because it was forced (#270). Saboteurs thus used the cooldown rule as a shield rather than an obstacle. (#244, #270)
3. **Loyal residents voted yes on every crew to keep standing.** A05 and A06 voted yes on crews they were not on simply to avoid looking suspicious (#1159, #449), and A02 voted yes with no information (#407). Blocking without evidence was treated as a losing move, so the vote rarely tested a crew. (#407, #449, #1159)

## Log issues

- line 1: event "convoy_game_started" (seq 1) does not match its schema
- line 15: event "convoy_crew_proposed" (seq 15) does not match its schema
- line 23: event "convoy_spoken" (seq 23) does not match its schema
- line 32: event "convoy_spoken" (seq 32) does not match its schema
- line 40: event "convoy_spoken" (seq 40) does not match its schema
- line 49: event "convoy_spoken" (seq 49) does not match its schema
- line 63: event "convoy_spoken" (seq 63) does not match its schema
- line 71: event "convoy_spoken" (seq 71) does not match its schema
- line 84: event "convoy_spoken" (seq 84) does not match its schema
- line 117: event "convoy_votes_revealed" (seq 117) does not match its schema
- line 128: event "convoy_card_played" (seq 128) does not match its schema
- line 134: event "convoy_card_played" (seq 134) does not match its schema
- line 135: event "convoy_stage_revealed" (seq 135) does not match its schema
- line 148: event "convoy_crew_proposed" (seq 148) does not match its schema
- line 156: event "convoy_spoken" (seq 156) does not match its schema
- line 164: event "convoy_spoken" (seq 164) does not match its schema
- line 173: event "convoy_spoken" (seq 173) does not match its schema
- line 183: event "convoy_spoken" (seq 183) does not match its schema
- line 192: event "convoy_spoken" (seq 192) does not match its schema
- line 201: event "convoy_spoken" (seq 201) does not match its schema
- and 286 more
