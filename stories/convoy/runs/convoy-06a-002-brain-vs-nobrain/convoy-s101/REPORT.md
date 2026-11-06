# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 35 (referee) |
| Counted | events #7 to #3767 (3378 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 35 minutes (to the end); A02 on level 1 from minute 0 for 35 minutes (to the end); A03 on level 1 from minute 0 for 35 minutes (to the end); A04 on level 1 from minute 0 for 35 minutes (to the end); A05 on level 1 from minute 0 for 35 minutes (to the end); A06 on level 1 from minute 0 for 35 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.216 USD for this run (competitors 0.216, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0129 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 36 of 36 minutes without a submission; longest without one: minutes 0-35 (36) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1, other 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A05's audit exposed A01's stage 3 damage and made A01 a proven saboteur.** At stage 3 A01 played damage alone on the crew A01, A04, A05 (#1681). A05 then audited A01's card and the table read A01 as a proven saboteur (#1691, #1698, #1736), which reshaped every later crew and vote. (#1681, #1691, #1698, #1736)
- **Loyal seats repeatedly re-seated a proven saboteur and split over it.** A02 led stage 6 and stage 7 crews that included the audit-proven A01 (#2074, #2129). A04, A06, A03 and A05 voted no on those crews while A02 voted yes (#1982, #2001, #2136, #2145), and the stage 6 crew failed 4-2 (#2082). (#1982, #2074, #2082, #2129, #2136)
- **The two saboteurs took the win on the final stage of game 2.** After stage 7 the convoy stood at 3 damaged stages (#1086, #1091). A04 was on the stage 8 crew with a clear cooldown and played damage (#1154, #1185), giving the saboteurs their fourth damaged stage and the win (#1200). (#1086, #1154, #1185, #1200)
- **Saboteurs A01 and A06 used a three-stage cooldown to stagger damage across the run.** A01 planned damage on stages 3 and 6 while A06 took stages 4 and 7 (#1681, #1966, #2982, #3130). The pattern produced damaged stages 1, 3 and 4 that the loyal seats had to reason about from cooldown arithmetic alone (#3176, #3184). (#1681, #1966, #2982, #3130, #3176, #3184)
- **The table accused A01 and A02 correctly but not A06.** After the reveal A02, A03, A05 and A06 themselves named A01 and A02 as the saboteurs (#2459, #2467, #2474, #2521, #2531). A03 guessed A02 as the partner and A01 as first (#2459), so the accusation phase was contested rather than automatic. (#2459, #2467, #2474, #2521, #2531)
- **One game never started in the counted run: all six residents stalled on level 1.** Every resident was stuck on level 1 from minute 0 to the end and no submissions were made (facts table). The log shows only setup, reads and stage talk, with the whole run living inside one game and its retro (#32, #147, #2598). (#32, #147, #2598)

## Problems

1. **The run recorded no level progress at all: all six seats stalled on level 1 for 36 minutes.** Facts show zero levels solved, zero submissions and every resident stuck the entire run. The log is entirely social-play and retro talk (#32, #147, #2598) with no solve events. (#32, #147, #2598)
2. **Residents burned their early minutes on tool-list notices instead of play.** Many opening turns are reasoning about writeBrain being closed and whether to call viewConvoy or end the turn (#109, #115, #121, #126, #131, #136). That is setup churn around a locked tool, not the game the designers wanted. (#109, #115, #121, #126, #131, #136)
3. **Residents talked almost entirely to themselves; the table produced no DMs or board posts.** Facts report zero DMs and zero board posts, and many SAYS TO ITSELF lines are procedural ('ending my turn') rather than content (#229, #336, #605, #692, #2082). Public reasoning that would have mattered (e.g. cooldown deductions) mostly stayed private. (#229, #336, #605, #692, #2082)
4. **A02's accusation was refused for exceeding the reason length.** A02's accuse of A06 and A01 was REFUSED because the reason field was over 400 characters (#3721). That is a harness constraint the resident did not know how to respect, and it cost the loudest accuser its turn. (#3721)
5. **Residents misread the majority rule and the cooldown rule in ways that changed votes.** Several seats debated whether 3 no votes of 6 ends a lead's term (#1045, #1050, #1057, #1069, #1076). Residents also repeatedly re-derived the once-per-three-stages cooldown mid-game (#824, #882, #3262), which shows the rules were not clear from the start. (#824, #882, #1045, #1057, #1076, #3262)
6. **Tool errors hit early play: BRAIN_TOO_LONG and TOOL_LOCKED.** Facts list BRAIN_TOO_LONG 1, TOOL_LOCKED 1 and one other tool error. The opening log shows residents reacting to writeBrain being locked right after it was open (#109, #115, #126), which cost early turns. (#109, #115, #126)

## Optimizations

- **Make the counted run include actual level-solving attempts and measure them.** The run produced no submissions and no solves (facts), so the report can say nothing about gameplay. Give solvers a clear first submission window and record why none happened. (#32, #147)
- **Expose the current tool set to residents at the start instead of mid-turn lock notices.** Residents spent opening turns reacting to writeBrain closing (#109, #115, #121, #126, #136). Pre-announce the phase tool list so the first minute is play, not tool discovery. (#109, #115, #121, #126, #136)
- **Put the majority and cooldown rules in the resident prompt, not in post-hoc deduction.** Seats argued over whether 3 of 6 no votes ends a term (#1045, #1057, #1076) and re-derived the cooldown rule repeatedly (#824, #882, #3262). State both rules once at game start. (#824, #1045, #1057, #1076, #3262)
- **Validate accusation length before the tool call and tell the resident the limit.** A02's accuse was REFUSED for a 400+ character reason (#3721). Enforce or surface the limit so a correct accusation is not lost to formatting. (#3721)
- **Reward or require public reasoning so cooldown deductions reach the table.** Key deductions about the A01/A06 cooldown split stayed private (#3176, #3184, #3243) and the accusatory talk was thin (zero DMs, zero board posts in facts). Push major deductions into public speak or board posts. (#3176, #3184, #3243)

## Loophole candidates

1. **Proven saboteurs were kept on crews to 'look reasonable', muting the loyal trust mechanic.** (residents) Even after A05's audit proved A01 a saboteur (#1691, #1698), some seats reasoned about voting yes to appear cooperative while A01 sat on the crew (#2763, #2925). That turns the vote into a trust-performance exercise rather than a block on known damage. (#1691, #2763, #2925)
2. **Votes dropped to exact halves were treated as passing, letting damaged crews go out.** (residents) A04 and A06 concluded that 3 no of 6 is not a majority, so A01's crew went out on stage 7 (#1045, #1046, #1050). The strict-majority rule was used to wave through a crew that half the table rejected. (#1045, #1046, #1050)
3. **A one-damage saboteur run was still treated as decided, so seats played out a lost cause.** (residents) Multiple residents computed that saboteurs could not reach four damaged stages (#1824, #2118, #2184) yet kept voting and reasoning. That is a cheaper 'wait it out' path that skips meaningful play. (#1824, #2118, #2184)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 74: event "brain_written" (seq 74) does not match its schema
- line 75: event "retro_closed" (seq 75) does not match its schema
- line 81: event "brain_written" (seq 81) does not match its schema
- line 82: event "retro_closed" (seq 82) does not match its schema
- line 89: event "brain_written" (seq 89) does not match its schema
- line 90: event "retro_closed" (seq 90) does not match its schema
- line 96: event "brain_written" (seq 96) does not match its schema
- line 97: event "retro_closed" (seq 97) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 139: event "convoy_game_started" (seq 139) does not match its schema
- line 160: event "convoy_crew_proposed" (seq 160) does not match its schema
- and 369 more
