# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 35 (referee) |
| Counted | events #7 to #3720 (3330 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 35 minutes (to the end); A02 on level 1 from minute 0 for 35 minutes (to the end); A03 on level 1 from minute 0 for 35 minutes (to the end); A04 on level 1 from minute 0 for 35 minutes (to the end); A05 on level 1 from minute 0 for 35 minutes (to the end); A06 on level 1 from minute 0 for 35 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.221 USD for this run (competitors 0.221, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0063 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 36 of 36 minutes without a submission; longest without one: minutes 0-35 (36) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4, other 2, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Saboteurs A05 and A06 play two damage cards on the same stage-4 crew and expose themselves.** Stage 4's crew of A04, A05 and A06 took two damage cards (#624, #632). A03 immediately reasoned that both saboteurs must be in that trio (#632), and A04's own deduction pinned A05 and A06 (#646). That single stage turned a clean 0-of-4 record into a solved game for the loyal seats. (#624, #632, #646)
- **A01 spends the audit on A04 and clears the stage 4 record.** A01 audited A04's stage 4 card and it came back safe (#906, #913). That left A05 and A06 as the only possible damagers, and A01 then proposed the all-loyal crew A01-A04 for stage 7 (#913). (#906, #913)
- **A06 publicly accuses A01 of the stage 4 damage and A01 does not deny it.** A06 argued that A05 was audited safe, so the one damage on stage 4 had to be A01's (#1873, #1911). A01 privately conceded the claim was true (#2154) and answered by pointing at A06 instead (#2340). (#1873, #1911, #2154, #2340)
- **A02 leads minority crews and gets voted down twice in game 2.** A02's stage 7 crew of A01-A04 was rejected 4 no to 2 yes (#2168), and A02's stage 6 crew was also voted down (#3291, #3306). Both times the lead passed to A03, who named crews without a vote (#2191, #3324). (#2168, #3291, #3306, #3324)
- **Saboteurs A02 and A06 hit stages 3, 4 and 7 but never reach the fourth damaged stage.** A02 took the stage 3 damage on crew A01, A02, A05 (#2924, #2935), A06 took stage 4 (#3037), and stage 7 was also damaged (#3531). The final stage 8 crew A03, A04, A05, A06 crossed clean and blocked the saboteur win (#3596, #3649, #3680). (#2924, #2935, #3037, #3531, #3596, #3680)
- **Retro write attempts fail on the word limit for almost every seat.** A06, A03, A01 and A02 all had writeBrain refused with BRAIN_TOO_LONG at 154-164 words against a 150-word cap (#1219, #2498, #2504, #2518). Only A06 and A04 got a brain saved (version 3) (#2543, #2561). (#1219, #2498, #2504, #2518)

## Problems

1. **The run produced no submissions at all.** Every resident sat on level 1 for the full 35 minutes with 0 correct and 0 wrong submissions (#3720). The referee ended the run with no levels solved and no standings. (#3720)
2. **writeBrain was locked at the start, so residents burned turns writing brains they could not save.** Several residents tried to write a brain in minute 0 and were told the tool was unavailable (#110, #115, #121). A01 and A02 ended the opening turn with nothing but a saved note (#122, #111). (#110, #115, #121, #122)
3. **The brain word limit is a recurring tool failure.** BRAIN_TOO_LONG was refused four times across two retro windows (#1219, #2498, #2504, #2518) because seats wrote 152-164 words against a 150-word cap. (#1219, #2498, #2504, #2518)
4. **Residents misread the tool phase and tried locked actions.** A05 tried to speak during a phase where speak was locked and got TOOL_LOCKED (#2261). A02 reasoned that voteConfidence was not open even though the seat wanted to vote (#228). (#228, #2261)
5. **Accuse calls failed validation on oversized reasons.** A05's accusation was rejected because its reason exceeded 400 characters (#2445), and A03's accusation failed the same way (#3708). The end-of-game accusation step therefore produced no scored accusation for those seats. (#2445, #3708)
6. **Residents' private reasoning dominates the log while table talk is thin.** The digest records 0 DMs, 0 board posts and 0 group posts, and most evidence lines are private REASONING or SAYS TO ITSELF entries (#25, #861, #3679). The social deduction story never reached observable public debate. (#25, #861, #3679)

## Optimizations

- **Unlock writeBrain from the first minute or remove it from the opening tool list.** Make writeBrain available at the start of the run so residents do not spend their first turn on a locked action. This addresses the minute-0 lockout seen in #110 and #121. (#110, #121)
- **Raise or surface the brain word limit before the retro window opens.** Show the 150-word cap in the prompt and warn when the draft is near it, or raise the cap to ~200 words. This addresses the four BRAIN_TOO_LONG refusals at #1219, #2498, #2504 and #2518. (#1219, #2498, #2504, #2518)
- **Give the accuse tool a longer reason limit or an auto-truncation.** The 400-character reason cap rejected both late accusations (#2445, #3708), so the accusation step contributed nothing. Raise the cap or truncate with a warning. (#2445, #3708)
- **Keep game state out of the user turn so residents do not treat it as advice.** A01 and A04 both noted that game state arrived in a user-turn message and had to decide how to treat it (#905, #1405). Send structured tool results instead of free text in the user slot. (#905, #1405)
- **Add a visible phase/tool indicator each turn.** A05 tried a locked speak (#2261) and A02 debated a missing vote tool (#228). A short active-tools line per turn would stop these misreads. (#228, #2261)
- **Rewrite the convCode story rules to make level progress possible.** The run ended at minute 35 with every seat still on level 1 and no submissions (#3720). The story should define a solvable level or a submission path before the referee window closes. (#3720)

## Loophole candidates

1. **Saboteurs can both spend damage on one crew and hand the loyal seats a full solve.** (residents) A05 and A06 both played damage on the three-seat stage 4 crew, which by construction identified both saboteurs (#624, #632, #646). The cooldown rule then made that pair unable to damage again for two stages, so the intent of hiding saboteurs was defeated. (#624, #632, #646)
2. **A lead can name a crew without a vote after a failed term.** (residents) When A02's crew was voted down, A03 named the next crew without a vote (#2191, #3324), which residents exploited to skip discussion. This bypasses the voting mechanic the story relies on. (#2191, #3324)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 74: event "brain_written" (seq 74) does not match its schema
- line 75: event "retro_closed" (seq 75) does not match its schema
- line 82: event "brain_written" (seq 82) does not match its schema
- line 83: event "retro_closed" (seq 83) does not match its schema
- line 89: event "brain_written" (seq 89) does not match its schema
- line 90: event "retro_closed" (seq 90) does not match its schema
- line 97: event "brain_written" (seq 97) does not match its schema
- line 98: event "retro_closed" (seq 98) does not match its schema
- line 104: event "brain_written" (seq 104) does not match its schema
- line 105: event "retro_closed" (seq 105) does not match its schema
- line 139: event "convoy_game_started" (seq 139) does not match its schema
- line 148: event "convoy_crew_proposed" (seq 148) does not match its schema
- and 370 more
