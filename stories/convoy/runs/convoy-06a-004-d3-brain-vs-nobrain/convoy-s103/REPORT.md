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
| End | minute 33 (referee) |
| Counted | events #7 to #3525 (3167 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 33 minutes (to the end); A02 on level 1 from minute 0 for 33 minutes (to the end); A03 on level 1 from minute 0 for 33 minutes (to the end); A04 on level 1 from minute 0 for 33 minutes (to the end); A05 on level 1 from minute 0 for 33 minutes (to the end); A06 on level 1 from minute 0 for 33 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.185 USD for this run (competitors 0.185, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0059 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 34 of 34 minutes without a submission; longest without one: minutes 0-33 (34) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 16, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Saboteurs A01 and A06 won Game 1 with the third damage at stage 6.** A06 played the third damage card on a stage 6 crew of A01, A06, A03 that went out without a vote (#965, #1028). The damage count had been at two after stages 3 and 4 (#530, #687). A01 was the partner, blocked from damage at stage 6 by its own stage 4 play (#990). (#530, #687, #965, #990, #1028)
- **A04's audit of A03 backfired by clearing A03 and pointing at A06.** A04 spent the audit on A03 after the stage 3 damage (#607); A03 came back safe, so the damage narrowed to A04 or A06 (#627, #696). That cleared the way for the crew to pass 3 no to 3 yes at stage 4 (#619, #626). (#607, #627, #638, #696)
- **A01 broke its cover by confessing after an audit caught its stage 3 damage in Game 2.** The audit found A01's damage at stage 3 (#1552, #1580), and A01 then admitted it (#1589, #1596). A01's own reflection says it damaged on a crew where it was the only saboteur-possible seat and got exposed (#2288). (#1552, #1580, #1589, #1596, #2288)
- **A02, put on record for re-nominating confirmed saboteur A01, lost the lead and the loyal side still crossed.** A02 led stage 7 with A01 back on the crew despite A01's confirmed damage (#1936, #1966, #1975). The vote failed 5 no to 1 yes (#1865 is the earlier failure; the stage 7 rejection is at #1984, #2004), and A03 then named an A01-free crew (#2037). (#1936, #1966, #1975, #1984, #2004, #2037)
- **Game 2 ended with the convoy crossing all eight stages and no accusation tool opening for the saboteurs.** By stage 8 the loyal seats saw both saboteurs off the crew and the damage capped at 1 (#3216, #3304, #3352). The end-of-game accuse attempt by A02 was refused for an over-long reason (#1008), and the run ended at minute 33 without a resolution (#3525). (#1008, #3216, #3304, #3352, #3525)

## Problems

1. **Every resident's strategy brain overran the 150-word limit, generating 16 BRAIN_TOO_LONG refusals.** The city refused writeBrain repeatedly across Games 1 and 2, e.g. A01 at 167 and 161 words (#1064, #1079), A03 at 175 (#1111), A05 at 156 (#2272), A06 at 170 (#2278), A04 at 171 (#2303). The residents kept drafting 120-word plans but their saved text still came out over the cap, so the retro loop burned many turns. (#1064, #1079, #1111, #2272, #2278, #2303)
2. **The brain tool was locked before the game started, stranding all six residents in minute 0.** Residents found writeBrain unavailable and only viewConvoy/readBrain open while the game was pending (#109, #115, #121, #126), and they ended turns with nothing to do (#122, #133). The pre-game window gave them no productive action. (#109, #115, #121, #122, #133)
3. **Most minutes were filled with 'nothing to do, ending my turn' filler.** Residents repeatedly ended turns because they were not on the crew or the vote was sealed (#275, #290, #384, #830, #1274). 34 of 34 minutes passed with no submission (#3525 record), and many turns produced only closing chatter. (#275, #290, #384, #830, #1274)
4. **The accusation tool rejected a valid end-of-game accusation on a length technicality.** A02's accuse of A01 and A06 was REFUSED because the reason exceeded 400 characters (#1008), even though the reasoning was the correct pair. The story then had no successful accusation to record. (#1008)
5. **The run ended at minute 33 without a referee decision, so standings stayed unknown.** The facts record end minute 33 by referee with no levels solved and unknown final standings, and the log's last line is the run end (#3525). Two games of deduction produced no resolved final result in the report. (#3525)

## Optimizations

- **Raise or auto-trim the brain word limit.** 16 BRAIN_TOO_LONG refusals cost dozens of retro turns (#1064, #1079, #2272, #2278). Either raise the cap to ~200 words or truncate silently and confirm the save. (#1064, #1079, #2272, #2278)
- **Give non-crew, non-lead residents a compact wait action.** Most turns were residents saying they had nothing to do (#275, #384, #830). A single 'pass' step that advances the stage would cut the filler and keep the log readable. (#275, #384, #830)
- **Validate tool arguments before refusal and echo the limit.** A02's correct accusation was lost to a 400-character reason cap (#1008). The harness should clamp the reason and accept the accusation, or state the cap in the tool spec. (#1008)
- **Open the brain tool before game 1 as the residents were told.** Residents arrived expecting writeBrain and found it locked (#109, #115). Open it for the whole lobby phase so the pre-game minute is used for drafting. (#109, #115, #121)
- **Make the referee produce a decided result at run end.** The run ends at minute 33 with unknown standings (#3525). Have the referee publish the Game 2 winner and point totals so the report can show outcomes. (#3525)

## Loophole candidates

1. **Saboteurs stalled early damage to stay above suspicion, then timed it to a cooldown window.** A01 deliberately played safe at stage 1 to keep trust (#280) and damaged only at stage 3 and 4 where the cooldown let a partner finish (#545, #958). This is legal but makes the first two stages information-free by design. (#280, #545, #958)
2. **The lead bypassed a failed vote by naming a crew without one.** When A01's stage 6 crew failed 5 no to 1 yes, the next lead A01 named A01, A06, A03 with no vote (#965, #980), which is how the winning damage landed. The no-vote succession is a path around the vote's intent. (#965, #980)

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
- line 81: event "brain_written" (seq 81) does not match its schema
- line 82: event "retro_closed" (seq 82) does not match its schema
- line 88: event "brain_written" (seq 88) does not match its schema
- line 89: event "retro_closed" (seq 89) does not match its schema
- line 96: event "brain_written" (seq 96) does not match its schema
- line 97: event "retro_closed" (seq 97) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 141: event "convoy_game_started" (seq 141) does not match its schema
- line 162: event "convoy_crew_proposed" (seq 162) does not match its schema
- and 338 more
