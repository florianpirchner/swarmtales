# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-nobrain` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 27 (referee) |
| Counted | events #2 to #3043 (2730 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 27 minutes (to the end); A02 on level 1 from minute 0 for 27 minutes (to the end); A03 on level 1 from minute 0 for 27 minutes (to the end); A04 on level 1 from minute 0 for 27 minutes (to the end); A05 on level 1 from minute 0 for 27 minutes (to the end); A06 on level 1 from minute 0 for 27 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.162 USD for this run (competitors 0.162, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0052 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **A01 and A02 won as the saboteur pair by damaging stages 1, 4 and 6.** A03's audit exposed A02's stage-1 damage (#1278), and A01 damaged stage 4 while on the crew (#1623). Stage 6 was the third damaged stage (3 of 3), and A02 states the saboteurs' win with stages 1, 4 and 6 (#1926). (#1278, #1623, #1926)
- **The audit was the only hard information in the whole game and it flipped the table onto A02.** Before the audit, all residents voted yes 6-0 on stage 1 (#134). A03 spent the audit on A02's stage-1 card (#1278), and from then on A02 was treated as a confirmed saboteur (#1284, #1298, #1338). (#134, #1278, #1284, #1298, #1338)
- **A01 and A06 both held back damage on stage 4 in a private stand-off that neither saw.** A06 weighed playing damage but worried both saboteurs damaging would expose them (#485), and A01 reached the same conclusion privately and chose to damage anyway (#492). Both played damage on stage 4, giving 2 damage on a 3-person crew (#514), which exposed A01 to the audit-backed arithmetic (#524, #543). (#485, #492, #514, #524, #543)
- **A06 was caught on stage 3 by A05's loyal deduction from a 2-damage count.** A05 reasoned that with 2 damage among A05, A03 and A06 and a safe card in hand, A03 and A06 were both saboteurs (#2332), and then said so at the table (#2346). An audit later confirmed A06 played damage on stage 3 (#2461). (#2332, #2346, #2461)
- **The saboteurs' cooldown rule let the loyal side schedule safe crews for the last two stages.** Residents worked out that a saboteur can damage only once every three stages (#778, #927), so after stage 3 damage A03 and A06 were blocked (#2323). A04 then named all-loyal crews for stages 7 and 8 (#2789, #2861), and both stages crossed clean (#2851). (#778, #927, #2323, #2789, #2851, #2861)
- **Every vote but one passed unanimously because no resident had evidence early.** Stages 1, 2, 3, 5, 6 and 8 each passed 6-0 (#134, #1376, #359, #595, #1738, #3000). The only contested votes were stage 7, which failed 4-2 (#846), and stage 6 of the first game (#1869). (#134, #359, #595, #846, #1376, #1738)

## Problems

1. **The game ran twice inside one 27-minute run, which confuses the report.** Residents played a full game that ended with a saboteur win at stage 6 (#1926), then a new game began at minute 17 with fresh roles (#1955, #2004). The computed facts count both as one run with no level-ups, so the design cannot be judged from the totals. (#1926, #1955, #2004)
2. **Residents spent most of their turns ending them, producing almost no table talk.** Dozens of private lines are 'I have nothing more to add, so I'll end my turn' (#73, #85, #98, #450, #459, #712). The computed facts record 0 board posts, 0 DMs and 0 group posts, so the social deduction game had almost no social layer. (#73, #85, #98, #450, #459, #712)
3. **The damage limit rule was misread repeatedly, wasting reasoning and skewing votes.** A04 claimed A02 could damage again at stage 4 while others said the cooldown blocked it (#1600, #1610, #1661). A01 was unsure whether its own damage was available at stage 7 (#770), which led to uncertainty in crew choices (#796, #805). (#770, #796, #805, #1600, #1610, #1661)
4. **A sabotage attempt on the speak tool was refused as TOOL_LOCKED.** A05 tried to speak during the stage-2 talk phase and was refused with TOOL_LOCKED (#1287). The tool list showed speak as open at other moments (#1314), so the phase gating is inconsistent or unclear to agents. (#1287, #1314)
5. **The first game had no blame until a mid-game audit, leaving early stages empty.** The first three stages passed clean with 0 damage (#134, #359, #399), and residents repeatedly noted there was nothing to read (#28, #46, #55). Only the stage-1 audit at minute 11 created the first accusation (#1278). (#28, #46, #55, #134, #359, #399, #1278)

## Optimizations

- **Cap the run to one complete game and record the winner explicitly.** A single run contained two games, so the summary shows 'levels solved: none' despite a clear saboteur win (#1926). End the run when the convoy crosses or stops and store the result in the run facts. (#1926, #1955, #2004)
- **Give residents a reason to talk or make silent turns cost something.** Most turns were ended with no statement (#73, #85, #712), and there were 0 messages recorded. Add a pressure such as a required one-line read per stage, or make votes sealed only after a minimum of talk. (#73, #85, #712)
- **Simplify or auto-apply the once-per-three-stages damage cooldown.** Multiple residents burned whole reasoning blocks misjudging whether A02, A01 or A06 could damage at a given stage (#1600, #1610, #770). Show each seat's cooldown status in the convoy view rather than leaving it to be inferred. (#770, #1600, #1610)
- **Make the speak tool's availability consistent with the announced talk phase.** A05 was refused a speak with TOOL_LOCKED (#1287) while the tool was open for others in stage-2 talk (#1314). Align activeTools with the phase so agents do not waste attempts or mistrust the harness. (#1287, #1314)
- **Put an audit or cheap information source in the early stages.** Stages 1-3 of the first game had no evidence and every vote was 6-0 (#134, #359, #399). Start with one repeatable audit or reveal, so the deduction game has material before minute 11. (#134, #359, #399, #1278)

## Loophole candidates

1. **The saboteurs won by using the cooldown as cover on an unvoted early stage.** (residents) A01 played damage on stage 4 and later reasoned its stage-6 crew needed no damage because it was not on it (#1670, #1760). Because saboteurs could sit out stages and still reach 3 damaged stages by stage 6 (#1926), the crew-building protection never caught up. (#1623, #1670, #1760, #1926)
2. **A05 revealed their card in talk to win the information war for free.** (residents) A05 simply claimed to have played safe and used that to name A03 and A06 from the 2-damage count (#2332, #2346). No rule penalty for public claims, so a loyal seat could convert a private card into a public accusation with no cost. (#2332, #2346, #2461)

## Log issues

- line 1: event "convoy_game_started" (seq 1) does not match its schema
- line 15: event "convoy_crew_proposed" (seq 15) does not match its schema
- line 23: event "convoy_spoken" (seq 23) does not match its schema
- line 32: event "convoy_spoken" (seq 32) does not match its schema
- line 41: event "convoy_spoken" (seq 41) does not match its schema
- line 50: event "convoy_spoken" (seq 50) does not match its schema
- line 59: event "convoy_spoken" (seq 59) does not match its schema
- line 68: event "convoy_spoken" (seq 68) does not match its schema
- line 80: event "convoy_spoken" (seq 80) does not match its schema
- line 92: event "convoy_spoken" (seq 92) does not match its schema
- line 128: event "convoy_votes_revealed" (seq 128) does not match its schema
- line 147: event "convoy_card_played" (seq 147) does not match its schema
- line 154: event "convoy_card_played" (seq 154) does not match its schema
- line 155: event "convoy_stage_revealed" (seq 155) does not match its schema
- line 170: event "convoy_crew_proposed" (seq 170) does not match its schema
- line 178: event "convoy_spoken" (seq 178) does not match its schema
- line 187: event "convoy_spoken" (seq 187) does not match its schema
- line 196: event "convoy_spoken" (seq 196) does not match its schema
- line 205: event "convoy_spoken" (seq 205) does not match its schema
- line 215: event "convoy_spoken" (seq 215) does not match its schema
- and 293 more
