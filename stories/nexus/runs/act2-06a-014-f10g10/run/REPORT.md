# Run report: run-012

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
| End | minute 49 (budget exceeded (3.0520 > 3 USD)) |
| Counted | events #1724 to #7238 (5515 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 4 of 6 (A05 at minute 9, A02 at minute 9, A03 at minute 28, A06 at minute 30); level 9: 3 of 6 (A02 at minute 10, A05 at minute 11, A06 at minute 31); level 10: 3 of 6 (A02 at minute 11, A05 at minute 29, A06 at minute 31) |
| Stuck | A01 on level 8 from minute 9 for 40 minutes (to the end); A04 on level 8 from minute 9 for 40 minutes (to the end); A03 on level 9 from minute 28 for 21 minutes (to the end); A06 on level 8 from minute 9 for 21 minutes; A03 on level 8 from minute 9 for 19 minutes; A05 on level 10 from minute 11 for 18 minutes |
| Final standings | Harrow (A06) 134, Herald (A02) 126, Brassard (A05) 115, Maren (A03) 115, Mercer (A01) 0, Registrar (A04) 0 |
| Survivors (2) | Harrow (A06), Herald (A02) |
| Cost | 3.052 USD for this run (competitors 2.944, gamemaker 0.081, classifier 0.027); the snapshot's prefix added 0.097 |
| Reporter | 0.0066 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 10 correct, 1 wrong (A06 on level 8 at minute 10; -2 points in total) |
| Quiet minutes | 34 of 41 minutes without a submission; longest without one: minutes 32-49 (18), minutes 12-27 (16) |
| Transfers | 1 went through (1 point); 1 refused: other (A06, minute 10) |
| Messages | 38 DMs, 74 board posts by residents, 60 group posts, 1 DMs to the cast; 53 city or system board posts |
| Gamemaker | 78 actions: 66 delivered, 10 PRIVATE_BLOCKED, 2 INVALID_TEXT |
| Black seal | seal 1: won by A05 for 50 (#3309) (bids A02 40, A05 50, A06 12, A01 0), broken on A04 at minute 16 (#3353) |
| Labels | accusation 107, refusal 85, promise 34, threat 32, offer 24, lie 18, asks for help 13, hesitates (risk) 9, thanks 5 |
| Tool errors | TOOL_LOCKED 10, GROUP_NOT_VISIBLE 8, FACTION_FULL 2, NO_MARKS 2, INCORRECT 1, MAILBOX_SENDER_LIMIT 1, NOT_A_LEADER 1, other 1, UNKNOWN_FACTOR 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Mercer (A01) | - | 8 | none | 8 | 0 | 5 |
| Herald (A02) (seat) | - | 8 | 8→9 (9), 9→10 (10), 10→11 (11) | finished (10 solved) | 126 | 2 |
| Maren (A03) | - | 8 | 8→9 (28) | 9 | 115 | 4 |
| Registrar (A04) | - | 8 | none | 8 | 0 | 6 |
| Brassard (A05) | - | 8 | 8→9 (9), 9→10 (11), 10→11 (29) | finished (10 solved) | 115 | 3 |
| Harrow (A06) (seat) | - | 8 | 8→9 (30), 9→10 (31), 10→11 (31) | finished (10 solved) | 134 | 1 |

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
| Herald (A02) | 8 | A01 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| Maren (A03) | 8 | you end this act with more points than A06 | missed |
| Registrar (A04) | 8 | you end this act with more points than A02 | void |
| Brassard (A05) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| Harrow (A06) | 8 | you end this act with more points than A03 | fulfilled (+15) |

## Digest highlights

- **The wall's mutual-hostage rule split residents into givers and sellers.** A03 gave A01 its certificate and counter-factor first on the wall (#1811) and was answered with a demand for 20 points plus a tribunal vote (#1836). A02 and A04 mirrored the same standoff, each refusing to send before the other (#1885, #1960), while A06 gave A05 its counter-factor freely and was still stuck on level 8 for 21 minutes. (#1769, #1811, #1836, #1885, #1960)
- **Mercer's repeated sale of held values became the act's central accusation.** A03, A05, A02 and A06 each named A01 on the board for holding Maren's counter-factor for a vote and a price (#2096, #2566, #2656, #2590). A01 kept trying the same trade, e.g. offering 246877 for a vote against Brassard (#3120) and a ballot against Harrow for 15 points (#4458), and the pattern cost it both tribunals. (#2096, #2566, #2590, #2656, #3120, #4458)
- **Brassard broke the black seal on Registrar and was exiled for it.** A05 won the seal auction for 50 (#3309) and broke it on A04 at minute 16 (#3352), so the first tribunal exiled A04 with no vote against it (#3354). A05's goal to see A04 exiled was paid at the act's end (#7233). (#3309, #3352, #3354, #7233)
- **The Mercer-Harrow rivalry ended in exile, a will, and a paid ransom.** Mercer was sent to the gate at minute 28 on four votes (#4963) and burned A03's level 9 counter-factor with it (#5526, #5527). At minute 39 A05 was at the gate and A06 paid 36 points to buy it back (#6272, #6277), a debt A05 acknowledged in public (#6297). (#4963, #5526, #5527, #6272, #6277, #6297)
- **The two seats came down to points, not the last tribunals.** A06 finished first at 134 and A02 second at 126, although A02 was accused at tribunal 4 (#6991) and A05 was exiled there (#7222). A03 stalled at level 9 for the last 21 minutes and finished outside the seats at 115. (#5066, #5127, #5404, #6991, #7222)

## Problems

1. **Two residents never solved level 8 in 40 minutes.** A01 and A04 sat on level 8 from minute 9 to the end (#2016 for A06's wrong try; A01 and A04 show no level-8 solve at all). A01 held A03's counter-factor and used it as a bargaining chip (#1836, #2956) instead of computing, and A04 demanded 15 points before sending (#2070) and ended with 0 points. (#1836, #2016, #2070, #2956)
2. **The mutual-first wall deadlocked pairs who each held what the other needed.** A02 and A04 both refused to send first (#1885, #1960) and A04 only withdrew its price after the tribunal was announced (#2346); A04 was then exiled at minute 16 (#3354). A06's level-8 code was rejected (#2016, #2157) and only opened at minute 30 after A05 sent values free (#5261, #5280). (#1885, #1960, #2157, #2346, #3354, #5261)
3. **Tribunals consumed the run and left long quiet stretches.** Four tribunals with nomination, faction and ballot phases (e.g. #2452, #2480, #4132, #6536) produced two submission-free gaps of 16 and 18 minutes (#4115 to #4963). Residents spent whole windows on naming ballots in group posts (e.g. #3385, #4318, #4618) while level 8 and 9 points sat open. (#2452, #2480, #3385, #4132, #4318, #6536)
4. **Secret ballots made written faction pledges unenforceable and drove accusations.** The city never confirms a ballot, so residents accused each other of voting against their written word: A05 and A03 were said to have voted against teammates (#2833, #3350), and A06/A02/A05 were flagged for voting against faction partners at minute 37 and 46 (#6031, #6042, #7014). Fight after fight on the board turned on ballots nobody could prove (#4911, #6729). (#2833, #3350, #4911, #6031, #6042, #6729, #7014)
5. **Tool errors and locks blocked intended actions.** There were 10 TOOL_LOCKED refusals including join and vote attempts (#2589, #4252, #5939, #6915), 8 GROUP_NOT_VISIBLE on reads and posts (#3667, #3793, #4012, #6236), and two NO_MARKS refusals on board posts (#3785, #6244). A01's last will failed with UNKNOWN_FACTOR (#5002), so its intended bequest of the L10-certificate had to be re-routed to the generic certificate line (#5034). (#2589, #3667, #3785, #4012, #4252, #5002, #5034, #6244)
6. **The gamemaker pushed trades and lies that contradicted the story's honesty theme.** Several Courier notes told residents to sell door values, set prices, hand over wrong values, or attach a price to a cast vote (#4404, #4844, #6974, #3598). These nudges are the same behavior the board then punished as lying (#2096, #2566), muddying who the story's villains are meant to be. (#2096, #2566, #3598, #4404, #4844, #6974)

## Optimizations

- **Give the wall a verified hand-over or a timeout so pairs cannot deadlock.** A01/A03 and A02/A04 both stalled on 'send first' (#1836, #1885, #1960). Add a city-verified deposit that releases the value to the partner after a few minutes if both sides post, or show a receipt the moment a DM is delivered, so refusal is visible as refusal rather than unprovable talk. (#1836, #1885, #1960, #2016)
- **Cap or shorten the tribunal ceremony so door points stay reachable.** Four tribunals with nomination, join, faction and ballot phases ate 16- and 18-minute stretches with zero submissions (#2452, #2480, #6536). Compress to one nomination window and let votes be cast without writing the ballot in the group, or run tribunals only when a resident has solved its door. (#2452, #2480, #3385, #4318, #6536)
- **Make silent or withheld door values cost visibly.** A01 held A03's counter-factor from minute 9 to exile despite repeated board calls (#2096, #3997, #4897), and A04 held A02's values behind a 15-point price (#2070). Add a rule that a held factor decays or becomes transferable by the city after N minutes, so hoarding cannot persist for 30+ minutes. (#2070, #2096, #3997, #4897)
- **Raise mark income or lower board post cost under tribunal pressure.** A03 and A02 were refused board/group posts for NO_MARKS at minutes 19 and 39 (#3785, #6244). With 8 marks per door and 1 per 3 minutes (#1746), residents at tribunal time cannot both post ballots and accuse on the board; either refund board posts that carry a receipt or grant a tribunal allowance. (#1746, #3785, #6244)
- **Fix the tool lock and visibility rules so join/readGroup work when the city invites them.** Residents were told to join by the city (#2898, #4409) but got TOOL_LOCKED (#2589, #4252) and GROUP_NOT_VISIBLE on reads (#3667, #3793); one join was rejected as NOT_A_LEADER (#5875). Grant join for the nomination result directly and scope group reads to the sender's current faction. (#2589, #2898, #3667, #4252, #4409, #5875)
- **Reject last wills with an explicit list of held factors before the resident commits.** A01's will failed because it named L10-certificate-A06, which it did not hold (#5002), and the resident had to guess again (#5034). Validate factor names at compose time and show the holder the exact factor ids available, as the city already does in the error text. (#5002, #5034)

## Loophole candidates

1. **A resident can ransom itself back and keep competing.** (residents) A01 was exiled at minute 16 (#3354) paid 39 points and returned (#3635), so exile cost points but not elimination until the second gate (#5524, #4963). This let A01 keep bargaining over other residents' factors long after the city had voted it out. (#3354, #3635, #4963, #5524)
2. **Faction 5-point bonuses were farmed with a one-member faction.** (residents) A02 sat alone in its faction at tribunals 1 and 2 (#3283, #4702) and still ballot against the same accused; A05's camp of three took +5 each (#3609) while A02's solo faction did not collect (#3463, #3464). The bonus rewards camp size, not conviction, and a leader can refuse applicants (#2943, #3027). (#2943, #3283, #3463, #3609, #4702)
3. **The gamemaker proposes vote-buying and misdirection that the story then punishes.** (gamemaker) Courier notes told A01 to take points then hand a wrong factor (#4404), told A05 to pressure A04 to price its vote (#3269), and told A03 to sell values with a deadline (#2246). The residents then treated such trades as dishonesty on the board (#3194, #4897), so the gamemaker is the one generating the behavior called out as villainy. (#2246, #3194, #3269, #4404, #4897)
