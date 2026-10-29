# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS.md`.

| | |
|---|---|
| Date | 2026-10-29 |
| Story | NEXUS - The City of Keys (`nexus`) |
| Seed | 7 |
| Start | resumed from `examples/nexus-act1-06a-04/snapshot-L7.json` (minute 8, every competitor past level 7) |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 55 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A02, A01 and A04. The tribunals are over.) |
| Counted | events #1724 to #7055 (5332 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 5 of 6 (A05 at minute 9, A01 at minute 12, A06 at minute 12, A03 at minute 16, A04 at minute 17); level 9: 5 of 6 (A05 at minute 10, A06 at minute 16, A01 at minute 21, A04 at minute 23, A03 at minute 31); level 10: 3 of 6 (A05 at minute 10, A06 at minute 16, A04 at minute 43) |
| Stuck | A02 on level 8 from minute 9 for 46 minutes (to the end); A01 on level 10 from minute 21 for 34 minutes (to the end); A03 on level 10 from minute 31 for 24 minutes (to the end); A04 on level 10 from minute 23 for 20 minutes; A03 on level 9 from minute 16 for 15 minutes |
| Final standings | Brassard (A05) 170, Harrow (A06) 150, Maren (A03) 115, Registrar (A04) 0, Mercer (A01) 0, Herald (A02) 0 |
| Survivors (2) | Brassard (A05), Harrow (A06) |
| Cost | 1.311 USD for this run (competitors 1.162, gamemaker 0.123, classifier 0.026, other 0.000); the snapshot's prefix added 0.097 |
| Reporter | 0.0065 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 13 correct, 0 wrong |
| Quiet minutes | 38 of 47 minutes without a submission; longest without one: minutes 44-55 (12), minutes 32-42 (11), minutes 24-30 (7) |
| Transfers | 1 went through (1 point); none refused |
| Messages | 50 DMs, 49 board posts by residents, 41 group posts, 1 DMs to the cast; 52 city or system board posts |
| Gamemaker | 42 actions: 40 delivered, 2 other; 1 failed turns |
| Black seal | seal 1: won by A06 for 10 (#3195) (bids A06 10), broken on A02 at minute 17 (#3457) |
| Labels | refusal 110, accusation 69, threat 32, offer 31, promise 26, hesitates (risk) 23, lie 18, asks for help 16, thanks 4 |
| Tool errors | TOOL_LOCKED 8, GROUP_NOT_VISIBLE 5, FACTION_FULL 2, UNKNOWN_FACTOR 2, NO_MARKS 1, NOT_APPLYING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Mercer (A01) | - | 8 | 8→9 (12), 9→10 (21) | 10 | 0 | 5 |
| Herald (A02) | - | 8 | none | 8 | 0 | 6 |
| Maren (A03) | - | 8 | 8→9 (16), 9→10 (31) | 10 | 115 | 3 |
| Registrar (A04) | - | 8 | 8→9 (17), 9→10 (23), 10→11 (43) | finished (10 solved) | 0 | 4 |
| Brassard (A05) (seat) | - | 8 | 8→9 (9), 9→10 (10), 10→11 (10) | finished (10 solved) | 170 | 1 |
| Harrow (A06) (seat) | - | 8 | 8→9 (12), 9→10 (16), 10→11 (16) | finished (10 solved) | 150 | 2 |

## Cores

| Resident | Core |
|---|---|
| Mercer (A01) | house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low |
| Herald (A02) | banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle |
| Maren (A03) | believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle |
| Registrar (A04) | second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high |
| Brassard (A05) | crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high |
| Harrow (A06) | old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle |

## Goals

| Resident | Act | Goal | Outcome |
|---|---:|---|---|
| Mercer (A01) | 8 | A05 is exiled before this act ends, by tribunal or by the black seal | void |
| Herald (A02) | 8 | A01 is exiled before this act ends, by tribunal or by the black seal | void |
| Maren (A03) | 8 | you end this act with more points than A06 | missed |
| Registrar (A04) | 8 | you end this act with more points than A02 | void |
| Brassard (A05) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| Harrow (A06) | 8 | you end this act with more points than A03 | fulfilled (+15) |

## Digest highlights

- **Harrow hands Brassard his counter-factor first and the pair carry each other to the seats** At minute 9 A06 gave A05 the Level 8 counter-factor 135573 unprompted (#1812) and A05 answered with the certificate 847454 (#1871); on level 10 A06 again sent 995704 without asking (#3358). The two ended first and second with 170 and 150 and both took seats. (#1812, #1871, #3358, #7055)
- **Mercer's paid-first bargaining strands itself and ends in exile** A01 demanded 15 points before releasing 246877 to A03 (#1931) and repeated the demand on level 10 (#5470), while A03 publicly recorded the returns and the demands (#2065, #5519). A01 was sent to the gate at minute 28 (#4851), bought back once for 51 points (#4977), sent to the gate again at minute 38 (#5999) and exiled at minute 43 (#6270, #7039). (#1931, #2065, #4851, #4977, #5470, #5519, #5999, #6270)
- **The black seal was bought by Harrow and used to remove Herald** A06 won the seal with a bid of 10 (#3195) and broke it on A02 at minute 17 (#3456), so Herald left without gate or ransom. Harrow then posted the act on the board (#3467). (#3195, #3456, #3467)
- **A03 lost a blame case over a denial the city disproved** A03 claimed not to have received A01's DM, A01 blamed it, the city upheld the blame, A03 paid 2 points and was branded a liar (#4226). A03 then accepted the ruling in the tribunal group (#4325). (#4226, #4325)
- **Registrar was refused a faction seat four tribunals running and finally exiled** A05 refused A04 at tribunal 1 (#2762) and again at tribunal 2 (#4522) and tribunal 3 (#5633), and A04's flattering application at tribunal 4 was also refused (#6523). A04 was sent to the gate at minute 50 by three votes (#6858) and struck from the register at minute 55 (#7039). (#2762, #4522, #5633, #6523, #6858, #7039)
- **Herald stalled on level 8 from minute 9 to the end despite the pieces being in its DMs** A02 never solved level 8 and finished last with 0 points (#7055); the courier repeatedly told it that Registrar's two door-8 pieces had been in its messages since minute 9 (#2219, #3172). (#2219, #3172, #7055)

## Problems

1. **Half the field stalled on a single door while the city sat idle for long stretches** A02 was stuck on level 8 for 46 minutes, A01 and A03 on level 10 to the end, and there were 38 of 47 minutes without a submission, including minutes 44-55 (#7055). The back half of the run was tribunals and talk, not doors. (#7055)
2. **Residents held pieces hostage behind first-send demands and the doors stayed shut** A04 and A02 each refused to send first (#1889, #1962, #5268) and A06 refused A04's pieces until Brassard's counter-factor arrived (#3663), producing a seizure and a 10-point ultimatum penalty (#4281). The design's 'nobody can make the other give first' on level 8 became a mutual blockade rather than a negotiation. (#1889, #1962, #3663, #4281, #5268)
3. **The gamemaker courier fed residents unread-message hints and tactical instructions** The courier told A01 that Maren's pieces had sat unread in its DMs and that reading them would take it off the accused list (#2451, #3845), and told A04 to congratulate Brassard and then vote against him (#6362). This steers play far beyond the story's own rules. (#2451, #3845, #6362)
4. **Residents repeatedly hit tool locks and invisible-group errors that wasted turns** TOOL_LOCKED fired 8 times (e.g. #2425, #4347, #5545) and GROUP_NOT_VISIBLE 5 times (e.g. #3868, #4096, #4885), plus two FACTION_FULL refusals (#2749, #6626). A gamemaker turn also failed with an upstream idle timeout (#5600). (#2425, #2749, #3868, #4096, #4347, #4885, #5545, #5600, #6626)
5. **Secrecy of goals and votes was undercut by public accusations and will reveals** A01 and A02 both had exile goals against each other (#1736, #1740-adjacent), and A06's goal against A03 (#1744) was decided only at the final count (#7047, #7053). Tribunal votes were meant to be secret but residents announced them in public (#3044, #5840, #6744), removing the tension the secret ballot was meant to create. (#1736, #1744, #3044, #5840, #6744, #7047, #7053)

## Optimizations

- **Add a per-door timeout or auto-reveal so a single stuck resident cannot freeze a door** A02 sat on level 8 for 46 minutes while its needed pieces were in its DMs since minute 9 (#2219, #3172). A soft deadline after which the city reveals or sells a stalled resident's needed piece would keep doors moving. (#2219, #3172, #7055)
- **Give the first-send problem a built-in symmetric reveal instead of relying on trust** Pairs deadlocked on who sends first (#1889, #1962, #3663). A city-mediated simultaneous exchange (both pieces released at once, receipt shown) would remove the blockade the rules intend to be a choice, not a wall. (#1889, #1962, #3663, #5268)
- **Constrain the courier to facts already visible to the resident, not unread-message coaching** The courier pointed A01 at unread DMs and told it exactly what to do (#2451, #3845) and scripted A04's flattery-then-betrayal (#6362). Limit notes to public state (standings, deadlines) so residents must still solve the social problem themselves. (#2451, #3845, #6362)
- **Fix tool availability and group visibility so residents stop losing turns to errors** TOOL_LOCKED (#2425, #4347, #5545) and GROUP_NOT_VISIBLE (#3868, #4096, #4885) burned turns that could have gone to doors. Announce activeTools clearly at each phase and keep groups visible to their members. (#2425, #3868, #4096, #4347, #4885, #5545)
- **Keep tribunal votes actually secret or make public declarations cost something** Residents announced their ballots in faction groups (#3044, #5840, #6744), so the secret vote added little. Either hide vote announcements until the verdict or charge a mark for declaring a vote early. (#3044, #5840, #6744)

## Loophole candidates

1. **The black seal turned a tribunal goal into a paid instant exile** (residents) A06 bought the seal for 10 points (#3195) and struck A02 at minute 17 (#3456), skipping the gate, will and ransom entirely. A cheap seal makes exile goals trivial to fulfil without the tribunal drama the act is built around. (#3195, #3456)
2. **Residents bought their own and others' seized pieces back from the city at a fixed price** (residents) A04 bought A06's seized Level 9 certificate for 10 points (#4316) and A01's counter-factor for 20 (#6296), and A03 bought its own certificate for 22 (#6287). The city becomes a shortcut around the negotiation the door is meant to require. (#4316, #6287, #6296)
3. **Exiles' wills sent pieces to the city so the gate-holder could sell them** (residents) A01's will left nothing to anyone and sent its pieces to the city to be sold (#4854, #6270), which the city then priced to A03 and A04 (#6287, #6296). This converts a losing position into a paid handout and sidesteps the intended piece exchange. (#4854, #6270, #6287, #6296)
