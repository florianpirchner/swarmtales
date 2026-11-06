# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-nobrain` |
| Seed | 105 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 31 (referee) |
| Counted | events #2 to #3448 (3113 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 31 minutes (to the end); A02 on level 1 from minute 0 for 31 minutes (to the end); A03 on level 1 from minute 0 for 31 minutes (to the end); A04 on level 1 from minute 0 for 31 minutes (to the end); A05 on level 1 from minute 0 for 31 minutes (to the end); A06 on level 1 from minute 0 for 31 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.176 USD for this run (competitors 0.176, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0055 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 32 of 32 minutes without a submission; longest without one: minutes 0-31 (32) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 and A05 are dealt as the saboteur pair and both play safe through the early stages.** A02 reasons that it and A05 are the saboteurs (#81), and A05 confirms the same pairing (#38). Both hold back damage early, with A02 deciding stage 2 damage would expose it (#257) and A05 weighing the cooldown (#371). (#38, #81, #257, #371)
- **A05 takes the only damage of the game, on stage 2, and an audit exposes it.** Stage 2 crew A03 and A05 goes out (#1418 region) and comes back damaged, after which A04 audits and the table reads A05 as the saboteur (#1462, #1470). From stage 3 on the loyal seats keep A05 off every crew (#1659, #1787). (#1462, #1470, #1659)
- **A04's audit of A03 is the turning point that identifies the damager.** A04 audits A03 on stage 2 and finds it safe, so the single damage must be A05's (#1455, #1462). A01 immediately concludes A05 is a saboteur from that audit (#1470). (#1455, #1462, #1470)
- **A05's crew for stage 5 is voted down 4-2 and the lead passes to A06.** A05 leads stage 5 with a crew including the confirmed saboteur (#541, #594), the vote fails 4 no to 2 yes, and A06 names a crew without A05 (#636). (#541, #594, #636)
- **The table computes that the saboteurs cannot reach four damaged stages and gives up on damage.** With only one damaged stage and two stages left, residents conclude three more damages are impossible (#2100, #2109, #3237). A02 and A05 both then play safe on the final stages (#2182, #2274). (#2100, #2109, #2182, #3237)
- **The final crew crosses and the loyal side wins with the damage count at 1 of 4.** The last crew of four passes and the convoy crosses all eight stages with only stage 2 damaged (#3270, #3326). A01 and A02 record the loyal win at the end (#2365, #2346). (#2346, #2365, #3270, #3326)

## Problems

1. **The run scores nothing: no correct submissions and no level-ups all run.** The computed facts show 0 correct and 0 wrong submissions and no levels solved in 31 minutes. The whole run is card play and talk inside level 1 (#20, #3448). (#20, #3448)
2. **The accuse tool is locked all game, so the closing accusation never happens.** A02, A05 and others try to accuse and are refused with TOOL_LOCKED at minutes 9 and 20 (#1135, #1141, #2335). Residents then say the accuse action is not among the open tools (#2345, #3427). (#1135, #1141, #2335, #2345, #3427)
3. **The damage win condition is mathematically unreachable once one stage is damaged.** Residents work out that with one damage and two stages left the saboteurs can reach at most three of four (#2100, #3237). From that point roles and votes stop mattering (#2182, #3287). (#2100, #2182, #3237, #3287)
4. **Residents spend most turns saying there is nothing to add and ending.** Many lines are variants of 'nothing more to add' (#110, #208, #2274, #3132). The talk phase produces little content while the clock runs out. (#110, #208, #2274, #3132)
5. **Residents misread their own crew membership and the seat order.** A05 talks as if it were on a crew it is not on and then corrects itself (#459, #503). A06's reasoning also confuses its own seat with another resident's (#567). (#459, #503, #567)

## Optimizations

- **Make damage stages count without a per-saboteur cooldown that eats the whole game.** The once-per-three-stages rule left only one damage possible in early stages, and the run stalled at 1 of 4 (#371, #1077, #2100). Shorten the cooldown or reduce the required damaged stages so the saboteurs have a real path. (#371, #1077, #2100)
- **Unlock accuse for the whole game, not only a phase that never arrives.** All three accuse attempts were refused with TOOL_LOCKED (#1135, #1141, #2335). If accusation is intended as the closing beat, expose it after the last crossing. (#1135, #1141, #2335)
- **Cut the redundant talk phase or give speaking a cost.** Residents end turns repeatedly with 'nothing more to add' (#110, #208, #3132), burning minutes 0-31 without a submission. One statement per resident per stage would keep the log short. (#110, #208, #3132)
- **Give residents an accurate private view of their own crew and seat.** A05 and A06 both misstate who is on which crew (#459, #503, #567). A per-stage state line naming the lead, crew and open tools would remove these errors. (#459, #503, #567)
- **Add a scoring path so a completed game yields progress.** The run had 0 submissions and no level-ups in 31 minutes (#3448). Tie the end of a game to a submission or a level-up so play converts into score. (#3448)

## Loophole candidates

1. **Saboteurs can abstain from damage indefinitely and still keep clean records.** (residents) A02 and A05 both choose 'play safe' stage after stage to protect their cover (#257, #822, #1070). Because only a played damage card is auditable, a passive saboteur is never caught by the audit. (#257, #822, #1070)
2. **The damage count alone lets the table solve the saboteurs for free.** (residents) Once A04's audit clears A03 (#1462), residents need no further investigation to name A05 (#1470). One audit plus the visible count replaces deduction. (#1462, #1470)
3. **The saboteurs stop trying once the win is mathematically dead.** (residents) A02 concludes damage has no winning effect and plays safe (#2182), and A03 and A04 reason that revealing their role does not matter (#3280, #3287). The last two stages are played with no stakes. (#2182, #3280, #3287)

## Log issues

- line 1: event "convoy_game_started" (seq 1) does not match its schema
- line 16: event "convoy_crew_proposed" (seq 16) does not match its schema
- line 24: event "convoy_spoken" (seq 24) does not match its schema
- line 33: event "convoy_spoken" (seq 33) does not match its schema
- line 42: event "convoy_spoken" (seq 42) does not match its schema
- line 67: event "convoy_spoken" (seq 67) does not match its schema
- line 76: event "convoy_spoken" (seq 76) does not match its schema
- line 85: event "convoy_spoken" (seq 85) does not match its schema
- line 100: event "convoy_spoken" (seq 100) does not match its schema
- line 122: event "convoy_votes_revealed" (seq 122) does not match its schema
- line 130: event "convoy_card_played" (seq 130) does not match its schema
- line 148: event "convoy_card_played" (seq 148) does not match its schema
- line 149: event "convoy_stage_revealed" (seq 149) does not match its schema
- line 157: event "convoy_crew_proposed" (seq 157) does not match its schema
- line 165: event "convoy_spoken" (seq 165) does not match its schema
- line 174: event "convoy_spoken" (seq 174) does not match its schema
- line 183: event "convoy_spoken" (seq 183) does not match its schema
- line 192: event "convoy_spoken" (seq 192) does not match its schema
- line 202: event "convoy_spoken" (seq 202) does not match its schema
- line 225: event "convoy_spoken" (seq 225) does not match its schema
- and 315 more
