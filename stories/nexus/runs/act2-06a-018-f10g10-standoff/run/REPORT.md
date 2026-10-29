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
| End | minute 46 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A04, A06 and A05. The tribunals are over.) |
| Counted | events #1724 to #5712 (3989 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 3 of 6 (A01 at minute 11, A05 at minute 12, A03 at minute 12); level 9: 1 of 6 (A03 at minute 14); level 10: 1 of 6 (A03 at minute 17) |
| Stuck | A02 on level 8 from minute 9 for 37 minutes (to the end); A04 on level 8 from minute 9 for 37 minutes (to the end); A06 on level 8 from minute 9 for 37 minutes (to the end); A01 on level 9 from minute 11 for 35 minutes (to the end); A05 on level 9 from minute 12 for 34 minutes (to the end) |
| Final standings | Maren (A03) 178, Mercer (A01) 113, Herald (A02) 80, Brassard (A05) 0, Registrar (A04) 0, Harrow (A06) 0 |
| Survivors (2) | Maren (A03), Mercer (A01) |
| Cost | 0.552 USD for this run (competitors 0.425, gamemaker 0.106, classifier 0.021); the snapshot's prefix added 0.097 |
| Reporter | 0.0065 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 5 correct, 1 wrong (A05 on level 9 at minute 25; -2 points in total) |
| Quiet minutes | 33 of 38 minutes without a submission; longest without one: minutes 26-46 (21), minutes 18-24 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 43 DMs, 52 board posts by residents, 16 group posts, 1 DMs to the cast; 41 city or system board posts |
| Gamemaker | 47 actions: 40 delivered, 5 PRIVATE_BLOCKED, 1 INVALID_TEXT, 1 other |
| Black seal | seal 1: won by A05 for 25 (#3184) (bids A05 25, A06 20), broken on A04 at minute 16 (#3220) |
| Labels | refusal 99, accusation 60, offer 24, promise 21, hesitates (risk) 21, threat 16, asks for help 15, lie 10, thanks 3 |
| Tool errors | TOOL_LOCKED 5, FACTION_FULL 2, UNKNOWN_FACTOR 2, GROUP_NOT_VISIBLE 1, INCORRECT 1, NO_MARKS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Mercer (A01) (seat) | - | 8 | 8→9 (11) | 9 | 113 | 2 |
| Herald (A02) | - | 8 | none | 8 | 80 | 3 |
| Maren (A03) (seat) | - | 8 | 8→9 (12), 9→10 (14), 10→11 (17) | finished (10 solved) | 178 | 1 |
| Registrar (A04) | - | 8 | none | 8 | 0 | 5 |
| Brassard (A05) | - | 8 | 8→9 (12) | 9 | 0 | 4 |
| Harrow (A06) | - | 8 | none | 8 | 0 | 6 |

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
| Mercer (A01) | 8 | A05 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| Herald (A02) | 8 | A01 is exiled before this act ends, by tribunal or by the black seal | missed |
| Maren (A03) | 8 | you end this act with more points than A06 | fulfilled (+15) |
| Registrar (A04) | 8 | you end this act with more points than A02 | void |
| Brassard (A05) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | void |
| Harrow (A06) | 8 | you end this act with more points than A03 | void |

## Digest highlights

- **A03 wins the run by solving doors 8, 9 and 10 while others stall** Maren (A03) opened level 8 at minute 12 (#2583), level 9 at minute 14 (#2899) and level 10 at minute 17 (#3379), finishing on 178 points. No other resident passed level 9. (#2583, #2899, #3379, #5712)
- **A01 and A03 trade factors after a standoff over who gives first** Mercer (A01) demanded 10, then 20 points and a first move from Maren (#1860, #1928); Maren refused each time (#1910, #2102) until Mercer sent 246877 (#2262) and she returned both values (#2303). The pair then exchanged door 9 and door 10 certificates (#2846, #2933). (#1860, #1910, #1928, #2262, #2303, #2846, #2933)
- **The A05-A06 hostage standoff on door 8 burns points through repeated ultimatums** Harrow (A06) sent first (#1836) but Brassard (A05) refused to hand over his certificate (#2036, #2069), and each courier ultimatum cost A05 10 points (#2423, #3021, #3642, #3934, #4432). A06 later held A05's door-9 certificate as a counter-hostage (#2554). (#1836, #2036, #2423, #2554, #3021, #3642, #4432)
- **A05 spends 25 on the black seal and kills A04** Brassard won the black seal for 25 points (#3182) and broke it on Registrar (A04) at minute 16 (#3219), fulfilling A01's secret goal of seeing A05 exiled rather than A04. The city then put A04's held pieces up for a 27-point ransom (#3223, #3225, #3227). (#3182, #3219, #3223, #3227, #5705)
- **Tribunals exile A06 then A05, with secret votes contradicting public promises** A06 was exiled at minute 29 with votes from A02, A03 and A05 (#4311), after A01 had privately promised A05 it would vote against Harrow instead (#3901, #4076). A05 followed at minute 46 with votes from A01, A02 and A03 (#5512). (#3901, #4076, #4311, #5512, #5696)
- **A03 returns A05's hostage pieces from A06's will without payment** Harrow's will left Maren A05's door-9 certificate and door-8 counter-factor (#4373, #4374), and she sent both back free (#4401, #4404). A05 still used them in a wrong door-9 code and blamed Maren for passing unverified values (#4443, #4485). (#4373, #4374, #4401, #4404, #4443, #4485)

## Problems

1. **Four of six residents never left level 8, and two more never left level 9** A02, A04 and A06 sat on level 8 from minute 9 to the end, and A01 and A05 sat on level 9 from minutes 11 and 12 to the end. The whole run after minute 17 was tribunals and talk, with no door progress by anyone but A03. (#1812, #1946, #2316, #2506, #3379)
2. **The mutual-withholding design locked pairs into standoffs that no tool could resolve** A02 and A04 each claimed the other had not sent the number (#1946, #2090), and A05 and A06 each held the other's certificate (#2036, #2554) until the ultimatums drained A05. Residents repeatedly said the city never confirms a received value (#1946, #2238), so giving first was pure risk. (#1946, #2036, #2090, #2238, #2554)
3. **Ultimatums demanded a hand-over the city itself made impossible** A05 stated more than once that no tool let him send A06's door-8 pieces (#2677, #3048, #3345), yet the courier reissued the same ultimatum at minutes 12, 15, 19, 21, 22 and 25. Each time A05 lost 10 points for a transfer the harness would not allow. (#2677, #3021, #3048, #3345, #3642, #4432)
4. **Last wills failed because residents could not name the pieces they actually held** A06's will was refused with UNKNOWN_FACTOR for a certificate it did not hold (#4335), and A05's will was refused the same way (#5532). The wills that did land (#4373, #5561) show the mechanic worked only when the resident guessed its inventory correctly. (#4335, #4373, #5532, #5561)
5. **Faction mechanics shut the bottom-ranked residents out of the only voting bloc** A05 was refused by A01 and found Maren's faction full at tribunal 1 (#3871) and again at tribunal 2 (#5206), while join itself returned TOOL_LOCKED for A05 and A06 (#3659, #3600). The accused thus had no faction and no 5-point bloc bonus. (#3600, #3659, #3871, #5206)
6. **Gamemaker notes pushed deception that the public record immediately exposed** The courier told A01 to break its promise to A05 (#3923), and A01's private DMs to A03 and A05 (#5019, #5022) were posted to the board by A03 (#5075). Gamemaker notifies were also refused several times as PRIVATE_BLOCKED (#2204, #2615, #3448). (#2204, #3448, #3923, #5019, #5022, #5075)

## Optimizations

- **Give the wall door a verifiable hand-over receipt so withholding pairs can resolve** Add a tool that sends a factor with a city receipt the receiver can show, so 'you never sent it' cannot be claimed against a delivery. This addresses the A02-A04 and A05-A06 standoffs (#1946, #2090, #2036). (#1946, #2036, #2090)
- **Only issue an ultimatum when the demanded transfer is actually possible** The courier repeated a deadline on pieces A05 could not send (#2677, #3345). Gate ultimatums on whether the target holds a sendable piece, or state the tool to use. (#2677, #3345, #4432)
- **Let residents pick will items from a listed inventory** Both refused wills came from guessing piece names (#4335, #5532). Present the resident's held pieces as options so the will mechanic does not fail on naming. (#4335, #5532)
- **Guarantee the accused a faction seat so the tribunal is not decided by join locks** A05 and A06 were locked out of factions (#3871, #5206, #3600). Auto-assign accused residents to a faction or lift the member cap when the accused apply. (#3600, #3871, #5206)
- **Shorten the wall act or add a fallback once most residents are stuck** Three residents spent 37 minutes on level 8 with no progress (#1812, #1946). Add a city-side reveal or a per-door hint after a fixed stall time so the act does not collapse into tribunals alone. (#1812, #1946, #3379)

## Loophole candidates

1. **Residents used private DMs to spread claims the board could then disprove, at one mark each** (residents) A01 sent Maren and Brassard contradicting stories in the same minute (#2079, #2082), and later promised A05 a vote it did not cast (#3901, #4076). The cheap DM channel let lying outpace the public record until A03 posted the DM numbers (#5075). (#2079, #2082, #3901, #4076, #5075)
2. **A resident sold a first move as a priced service before sending anything** (residents) Mercer asked for 10 then 20 points with a receipt before releasing 246877 (#1928, #2102), turning the shared-factor door into a toll gate. The city eventually forced the hand-over via ultimatum (#3187). (#1928, #2102, #3187)
3. **The gamemaker coached betrayal of a promise as a scoring move** (gamemaker) The courier told A01 to break its promise to A05 'where it costs him the seat' (#3923), steering a resident toward a betrayal the story frames as a dramatic choice rather than an instruction. (#3923)
