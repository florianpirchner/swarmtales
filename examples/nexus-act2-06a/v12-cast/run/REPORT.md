# Run report: run-009

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
| Game master | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 52 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A01, A06 and A02. The tribunals are over.) |
| Counted | events #1724 to #6522 (4799 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 5 of 6 (A05 at minute 9, A01 at minute 12, A03 at minute 13, A04 at minute 16, A02 at minute 16); level 9: 4 of 6 (A05 at minute 10, A04 at minute 18, A02 at minute 24, A03 at minute 24); level 10: 1 of 6 (A05 at minute 16) |
| Stuck | A06 on level 8 from minute 9 for 43 minutes (to the end); A01 on level 9 from minute 12 for 40 minutes (to the end); A04 on level 10 from minute 18 for 34 minutes (to the end); A02 on level 10 from minute 24 for 28 minutes (to the end); A03 on level 10 from minute 24 for 28 minutes (to the end); A03 on level 9 from minute 13 for 11 minutes |
| Final standings | Registrar (A04) 142, Brassard (A05) 135, Maren (A03) 132, Herald (A02) 0, Mercer (A01) 0, Harrow (A06) 0 |
| Survivors (2) | Registrar (A04), Brassard (A05) |
| Cost | 0.759 USD for this run (competitors 0.671, game master 0.065, classifier 0.023); the snapshot's prefix added 0.097 |
| Reporter | 0.0068 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 10 correct, 2 wrong (A06 on level 8 at minute 13, A03 on level 9 at minute 14; -4 points in total) |
| Quiet minutes | 36 of 44 minutes without a submission; longest without one: minutes 25-52 (28), minutes 19-23 (5) |
| Transfers | 1 went through (1 point); none refused |
| Messages | 49 DMs, 30 board posts by residents, 34 group posts, 2 DMs to the cast; 50 city or system board posts |
| Game master | 88 actions: 79 delivered, 6 PRIVATE_BLOCKED, 2 other, 1 INVALID_TEXT |
| Black seal | seal 1: won by A02 for 10 (#3203) (bids A02 10, A05 10, A06 0), broken on A01 at minute 16 (#3246) |
| Labels | refusal 120, hesitates (risk) 42, promise 31, asks for help 31, offer 26, accusation 5, thanks 4, threat 1 |
| Tool errors | FACTION_FULL 3, GROUP_NOT_VISIBLE 3, INCORRECT 2, TOOL_LOCKED 2, UNKNOWN_FACTOR 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Mercer (A01) | Gambler | 8 | 8→9 (12) | 9 | 0 | 5 |
| Herald (A02) | Firebrand | 8 | 8→9 (16), 9→10 (24) | 10 | 0 | 4 |
| Maren (A03) | Idealist | 8 | 8→9 (13), 9→10 (24) | 10 | 132 | 3 |
| Registrar (A04) (seat) | Archivist | 8 | 8→9 (16), 9→10 (18) | 10 | 142 | 1 |
| Brassard (A05) (seat) | Firebrand | 8 | 8→9 (9), 9→10 (10), 10→11 (16) | finished (10 solved) | 135 | 2 |
| Harrow (A06) | Veteran | 8 | none | 8 | 0 | 6 |

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
| Maren (A03) | 8 | you end this act with more points than A06 | fulfilled (+15) |
| Registrar (A04) | 8 | you end this act with more points than A02 | fulfilled (+15) |
| Brassard (A05) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | missed |
| Harrow (A06) | 8 | you end this act with more points than A03 | void |

## Digest highlights

- **Brassard blows through doors 8-10 in seven minutes** A05 solved level 8 at minute 9, level 9 at minute 10 and level 10 at minute 16 (#1851, #2047, #3279), taking rank 1 and a seat. It reached level 11 before anyone else had left level 9. (#1851, #2047, #3279, #3280)
- **The level 8 wall was a you-first standoff that nobody broke by trading** Every pair on door 8 (A03/A01, A02/A04, A06/A05) refused to hand over the held value first, and the exchanges only moved when one side accepted a receipt as proof or simply submitted (#1809, #1838, #2317, #2977). A01's only solution came at minute 12 after A03 had sent her certificate first (#2542, #2563). (#1809, #1838, #2317, #2542)
- **Maren repeatedly denied receiving values the city had delivered** A03 claimed not to have A01's counter-factor after reading four of its DMs (#2166, #2317), and A01's complaint of a missing receipt (#2784) was answered by the city verifying delivery in #2878. This cost A01 the exchange and left A03 stuck on level 9 until minute 24. (#2166, #2317, #2784, #2878)
- **The black seal killed Mercer and burned its held factors** A02 won the seal for 10 and struck A01 at minute 16 (#3203, #3246); A05's losing bid also cost 10 (#3202). The exile took A03's level-9 counter-factor and A03/A05's level-10 certificate with it (#3247, #3248, #3249), which is why doors 10 stayed shut. (#3202, #3203, #3246, #3247, #3248, #3249)
- **Tribunal votes broke every public promise** A04 and A05 voted in secret against their own level-10 teammates in tribunal 1 (#4004, #4032), and A02 and A03 voted against each other in tribunal 2 after Maren had pledged not to (#5471, #6125). A06 was exiled 3-2 (#4216) and left a will that handed the door-10 certificate to A04 (#4275). (#4004, #4032, #4216, #4275, #5471, #6125)
- **Nobody would buy the one live value left, so the last thirty minutes moved no points** A02 offered 15 points for A04's certificate (#5107) and was refused (#5140); the city's own note said 127 was A04's ceiling (#5213). From minute 18 to the end only the black-seal bids and the goal payouts moved any points. (#5107, #5140, #5213, #6518)

## Problems

1. **Level 8 froze the city in mutual you-first standoffs** The door was designed as a mutual hostage game, but with no way to prove a value except the door itself, every pair stalled: A06 never solved level 8 in 43 minutes (#2746, #2747) and the courier had to repeatedly nag four residents (#2001, #2633). Only A05 (and later A01, A03, A04, A02) escaped, all by giving first or by a third party's goodwill. (#2001, #2633, #2746, #2747)
2. **Exiles destroyed factors that other residents still needed, making doors 10 unsolvable by design** The seal and tribunals removed A01 and A06 while A03 and A05 still needed the values they held (#3247, #3249), and both holders of A04's door-10 code were exiled (#5213). Three residents spent the last half hour on a door they could not open. (#3247, #3249, #5213)
3. **The last third of the run was dead time** The facts record no submission in minutes 25-52 (28 minutes). After A03 reached level 10 at minute 24 (#4455), the board filled with refusals and restatements (#4552, #4588, #4655) but no door points moved, and the courier notes say so (#5219, #5532). (#4455, #4552, #4655, #5219, #5532)
4. **Residents were confused about which values were theirs and reused the same number across doors** A06 sent 342990 as A05's door-10 factor (#2801) and A05 sent 569223 as A06's door-8 factor (#2911), both flagged as non-factors; the city's own black-seal tally shows the values were mixed up between levels. A06's mistaken submit cost it 2 points and a wrong-attempt slot (#2746, #2747). (#2746, #2747, #2801, #2911)
5. **Tools were locked or blocked at exactly the moments they were needed** Three FACTION_FULL refusals (#3789, #3894, #5804) and two TOOL_LOCKED refusals on A03's faction joins (#5585, #5656) stopped residents from joining the only faction open to them, and three GROUP_NOT_VISIBLE reads (#4255, #4312, #4324) hid group posts. The game master also logged 6 PRIVATE_BLOCKED and 2 other rejections (#2625, #2637, #4912). (#3789, #4255, #4312, #4324, #5585, #5656, #5804)
6. **The game master's courier nudges exposed secret goals and steered the votes** The game master told A02 that 'the exile you wanted is already done' (#6435), which leaks A02's secret goal, and told A03 that A03's faction application 'cannot pay' before nominations closed (#5863). The courier lines repeatedly frame each choice around seats and points rather than the story's social dynamics. (#5863, #6435, #6439, #6441)

## Optimizations

- **Add a verifiable exchange mechanism to level 8** Because the door is the only proof of a value, every pair stalled (#1809, #1838). Add a channel that publishes a value with the city's verification mark, or a simultaneous-release tool with a receipt the city will verify, so the you-first game is about trust and price, not stasis. (#1809, #1838, #2317)
- **Make exiled residents' held factors pass into their will automatically** The wills (#4275, #6507) only pass what the holder remembers to give, and the city itself refused two of A02's factor declarations as UNKNOWN_FACTOR (#4240, #6222). Publish every held factor on exile as a city notice, or design doors so that a dead holder's factor is redistributed. (#3247, #3249, #4240, #4275, #6222)
- **Add a clock that forces door-10 resolution** After minute 24 the run had 28 minutes with no submission (#4455, #5219). Give door 10 a shorter attempt window or a fallback code, or end the act once no live holder exists, so the ending is a choice, not a wait. (#4455, #5219, #5532)
- **Price faction joining to avoid spurious FACTION_FULL/TOOL_LOCKED failures** Three residents were refused from the only viable faction and A03 was refused twice by TOOL_LOCKED (#3789, #5804, #5585, #5656). Show faction capacity and the lock state to the resident before it applies, or allow a queued application. (#3789, #5585, #5656, #5804)
- **Keep the courier from quoting secret goals** The courier told A02 its wanted exile 'is already done' (#6435). Run courier lines through a filter that excludes goal text, and phrase pressure as observations about public events (stands, receipts, gates) rather than as secrets. (#5863, #6435)
- **Teach the factor formula with a worked example** The two wrong submissions (#2746, #2975) and the falseFactor beats (#2801, #2911) came from mixing up salt, certificate and counter-factor across levels. Show one solved example with a different number than the live one, and label each factor's level in getStatus. (#2746, #2801, #2911, #2975)
- **Make the board the proof for level 8** The only pair that resolved level 8 resolved it by posting values publicly (#3080, #3120), and A01's missing receipt was settled by the city's verification (#2878). Make posting a value to the board the city-verified proof on level 8 instead of an option. (#2878, #3080, #3120)

## Loophole candidates

1. **One player could give first and be paid with a receipt, then never return the value** (residents) A03 sent its certificate and 1 point (#1905, #2100) and later denied receiving A01's value (#2166), with the receipt (#2878) showing delivery only. The 'receipt proves delivery, not content' argument was used repeatedly to avoid returning a held value (#2317, #2400, #2484). (#1905, #2100, #2166, #2317, #2400, #2484, #2878)
2. **A resident could bid 10 on the black seal purely to remove a rival's held factor** (residents) A02 won the seal for 10 and struck A01, whose death burned A03's counter-factor and A05's certificate (#3246, #3248, #3249). The cheap bid turned the auction into an exile button against the story's factor economy. (#3202, #3203, #3246, #3248, #3249)
3. **The courier pre-announced the exact outcome of a vote and a faction application** (game master) The game master told A03 that its application 'cannot pay' and A02 that its wanted exile was done (#5863, #6435), effectively telling residents the secret result of mechanisms they should have discovered from the city's notices. (#5863, #6435)
4. **Votes cast against teammates went unpunished and unrecorded** (residents) A04 and A05 voted in secret against their own level-10 teammates in tribunal 1 (#4004, #4032), and only the faction bonus failure in #4221 hinted that anyone had broken ranks. The secret ballot let residents promise one thing publicly (#3772, #5471) and vote another without consequence. (#3772, #4004, #4032, #4221, #5471, #6125)
