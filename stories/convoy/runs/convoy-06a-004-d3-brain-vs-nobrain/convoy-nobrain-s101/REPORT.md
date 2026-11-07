# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-nobrain` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 29 (referee) |
| Counted | events #2 to #3237 (2906 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 29 minutes (to the end); A02 on level 1 from minute 0 for 29 minutes (to the end); A03 on level 1 from minute 0 for 29 minutes (to the end); A04 on level 1 from minute 0 for 29 minutes (to the end); A05 on level 1 from minute 0 for 29 minutes (to the end); A06 on level 1 from minute 0 for 29 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.172 USD for this run (competitors 0.172, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 30 of 30 minutes without a submission; longest without one: minutes 0-29 (30) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | other 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents stalled on level 1 for the whole run with no submissions.** The facts show A01-A06 stuck on level 1 from minute 0 to 29, and the digest found no beats; the log is entirely reasoning, self-talk and vote/card phases of a convoy game with no level solved (#64, #398, #1630). The run ended at minute 29 with the referee before anyone advanced. (#64, #398, #1630, #3237)
- **First game: both saboteurs hit stage 3 and stage 4 and were unmasked by an audit.** A04 and A05 both played damage on stage 3 (#366, #388, #398), and A06 called it out from knowing its own safe card (#409, #432). Later A03 audited A06's stage 4 card and cleared it, which pinned the stage 4 damage on A01 and A02 (#1964, #1971, #2003). (#366, #388, #409, #1964, #1971, #2003)
- **A05's accusation against A04 and A01 was refused by tool validation.** A05 tried to accuse seats A01 and A03 with a reason longer than the 400-character limit, and the city rejected the whole call (#3219). The accusation phase then produced no valid accusation from that seat. (#3219)
- **A06 was locked out of the accuse tool.** A06 attempted an accuse and got TOOL_LOCKED, meaning the tool was not available at its level or in that phase (#3227). The run ended two events later (#3237). (#3227, #3237)
- **Second game's saboteurs again played early damage and were exposed by audit.** A01 and A02 both played damage on stage 4 in the second game (#1611, #1618, #1630), and A02 later audited A01's stage 3 card, revealing A01 as a saboteur (#2883, #2888, #2900). A06 admitted privately that one more damage would win it (#3113, #3156). (#1611, #1618, #1630, #2883, #2888, #3113)

## Problems

1. **The story had no advancing task: every resident sat on level 1 for all 29 minutes.** The computed facts show zero levels solved, zero submissions and 30 quiet minutes, and the log contains only convoy deduction, votes and self-talk (#64, #805, #2983). The residents never engaged any progression mechanic, so the run produced no gameplay outcome besides the two convoy games. (#64, #805, #2983, #3237)
2. **Most turns were spent ending the turn with nothing to do, generating large volumes of reasoning.** Dozens of turns are just 'end my turn' with no tool call because the resident was not on the crew (#143, #503, #1846, #2715). The counted events run to #3237 while the actual decisions are few, which suggests the harness lets idle residents loop through turns. (#143, #503, #1846, #2715, #3237)
3. **The accuse tool failed twice on the same phase, once on validation and once on lock.** A05's accusation was refused for exceeding the 400-character reason limit (#3219), which the resident could not see coming, and A06's was blocked as unavailable (#3227). The accusation phase therefore produced no valid accusations at all. (#3219, #3227)
4. **Residents repeatedly misread the cooldown rule and the public count.** Residents debated whether 'once in three stages' blocks the adjacent stages (#541, #1676, #1769) and some made arithmetical errors about who was on a crew (#2797, #2823). The rule wording around the damage window is ambiguous enough that agents argued both readings. (#541, #1676, #1769, #2797, #2823)

## Optimizations

- **Make the level task the primary loop and decouple deduction sub-games from progression.** The run had 2906 events and zero submissions (#64, #2983, #3237); give residents a level objective that produces a submission every few minutes and treat convoy rounds as side content or a gate. (#64, #2983, #3237)
- **Cut idle end-of-turn loops by skipping turns for residents without actions.** Many turns are pure 'end turn' with no tool call (#143, #503, #1846), so the harness should auto-advance non-crew seats instead of asking each to wrap up. (#143, #503, #1846)
- **Validate the accuse reason length before the resident commits to the call.** A05's accusation was thrown out for a 400-plus character reason (#3219); the tool schema should truncate or warn, and state the limit in the prompt. (#3219)
- **Unlock or advertise the accuse tool clearly at the phase that needs it.** A06 hit TOOL_LOCKED during the accusation phase (#3227), and the run ended right after (#3237), so the phase never produced a usable accusation; align tool availability with phase transitions. (#3227, #3237)
- **Rewrite the damage-cooldown rule so agents stop parsing it two ways.** Residents argued both readings of the repeat window (#541, #1676, #1769); use explicit stage numbers (e.g. 'next allowed stage 6') rather than 'once in three stages'. (#541, #1676, #1769)

## Loophole candidates

1. **Saboteurs cast supportive public votes while secretly playing damage, keeping trusted standing.** (residents) A05 voted yes on crews it was not on and stayed mild in public talk while planning its damage card (#94, #95, #220), and A04 did the same (#36, #178). Public voting was not tied to the secret card play, so trust and sabotage were decoupled. (#36, #94, #95, #178, #220)
2. **A resident used the audit to convert a private card into a public, unopposed proof.** (residents) A03 audited A06's stage 4 card and the table immediately treated it as ground truth (#1964, #1971, #2003) without any counter option, which turns one tool call into near-certain identification of both saboteurs. (#1964, #1971, #2003)

## Log issues

- line 1: event "convoy_game_started" (seq 1) does not match its schema
- line 14: event "convoy_crew_proposed" (seq 14) does not match its schema
- line 22: event "convoy_spoken" (seq 22) does not match its schema
- line 31: event "convoy_spoken" (seq 31) does not match its schema
- line 40: event "convoy_spoken" (seq 40) does not match its schema
- line 49: event "convoy_spoken" (seq 49) does not match its schema
- line 58: event "convoy_spoken" (seq 58) does not match its schema
- line 82: event "convoy_spoken" (seq 82) does not match its schema
- line 90: event "convoy_spoken" (seq 90) does not match its schema
- line 108: event "convoy_spoken" (seq 108) does not match its schema
- line 125: event "convoy_spoken" (seq 125) does not match its schema
- line 132: event "convoy_votes_revealed" (seq 132) does not match its schema
- line 151: event "convoy_card_played" (seq 151) does not match its schema
- line 157: event "convoy_card_played" (seq 157) does not match its schema
- line 158: event "convoy_stage_revealed" (seq 158) does not match its schema
- line 174: event "convoy_crew_proposed" (seq 174) does not match its schema
- line 182: event "convoy_spoken" (seq 182) does not match its schema
- line 193: event "convoy_spoken" (seq 193) does not match its schema
- line 200: event "convoy_spoken" (seq 200) does not match its schema
- line 209: event "convoy_spoken" (seq 209) does not match its schema
- and 311 more
