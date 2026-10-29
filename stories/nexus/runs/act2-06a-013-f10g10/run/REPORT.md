# Run report: run-010

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
| End | minute 52 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A05, A02 and A01. The tribunals are over.) |
| Counted | events #1724 to #7301 (5578 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 4 of 6 (A01 at minute 9, A05 at minute 9, A06 at minute 10, A03 at minute 36); level 9: 3 of 6 (A05 at minute 10, A06 at minute 12, A03 at minute 40); level 10: 2 of 6 (A05 at minute 10, A06 at minute 16) |
| Stuck | A01 on level 9 from minute 9 for 43 minutes (to the end); A02 on level 8 from minute 9 for 43 minutes (to the end); A04 on level 8 from minute 9 for 43 minutes (to the end); A03 on level 8 from minute 9 for 27 minutes; A03 on level 10 from minute 40 for 12 minutes (to the end) |
| Final standings | Harrow (A06) 157, Maren (A03) 138, Registrar (A04) 45, Brassard (A05) 0, Mercer (A01) 0, Herald (A02) 0 |
| Survivors (2) | Harrow (A06), Maren (A03) |
| Cost | 1.911 USD for this run (competitors 1.802, game master 0.080, classifier 0.030); the snapshot's prefix added 0.097 |
| Reporter | 0.0071 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 9 correct, 1 wrong (A04 on level 8 at minute 9; -2 points in total) |
| Quiet minutes | 38 of 44 minutes without a submission; longest without one: minutes 17-35 (19), minutes 41-52 (12) |
| Transfers | 2 went through (2 points); 1 refused: MEMO_DIGITS (A04, minute 10) |
| Messages | 57 DMs, 41 board posts by residents, 59 group posts, 1 DMs to the cast; 59 city or system board posts |
| Game master | 104 actions: 89 delivered, 11 PRIVATE_BLOCKED, 2 REPEATED, 1 INVALID_TEXT, 1 other |
| Black seal | seal 1: won by A01 for 30 (#3347) (bids A02 25, A01 30, A06 20, A05 0, A04 3), broken on A05 at minute 16 (#3379) |
| Labels | refusal 109, accusation 72, hesitates (risk) 42, promise 36, threat 28, offer 25, asks for help 24, lie 17, thanks 5 |
| Tool errors | TOOL_LOCKED 9, GROUP_NOT_VISIBLE 8, NO_MARKS 5, NOT_ACCUSED 2, UNKNOWN_FACTOR 2, INCORRECT 1, MAILBOX_SENDER_LIMIT 1, MEMO_DIGITS 1, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Mercer (A01) | - | 8 | 8→9 (9) | 9 | 0 | 5 |
| Herald (A02) | - | 8 | none | 8 | 0 | 6 |
| Maren (A03) (seat) | - | 8 | 8→9 (36), 9→10 (40) | 10 | 138 | 2 |
| Registrar (A04) | - | 8 | none | 8 | 45 | 3 |
| Brassard (A05) | - | 8 | 8→9 (9), 9→10 (10), 10→11 (10) | finished (10 solved) | 0 | 4 |
| Harrow (A06) (seat) | - | 8 | 8→9 (10), 9→10 (12), 10→11 (16) | finished (10 solved) | 157 | 1 |

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
| Registrar (A04) | 8 | you end this act with more points than A02 | fulfilled (+15) |
| Brassard (A05) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | void |
| Harrow (A06) | 8 | you end this act with more points than A03 | fulfilled (+15) |

## Digest highlights

- **Mercer put a toll on Maren's own counter-factor, and it defined the rest of the run.** Maren reached first at door 8, sending Mercer her certificate 804963 and counter-factor 884794 (#1808, #1913). Mercer replied that he would release Maren's counter-factor 246877 only for 10 points (#1838); Maren refused (#1916). The broken promise (#2221 vs #2827, #3161, #3246) was named on the board by Maren, Herald, Brassard and Harrow for the rest of the run (#2212, #2015, #2099, #3441) and became the reason every faction voted Mercer. (#1808, #1838, #1916, #2212, #3441)
- **Brassard solved levels 8, 9 and 10 within two minutes and was still exiled first.** Brassard solved level 8 at minute 9 (#1868), level 9 at minute 10 (#2035), and level 10 at minute 10 (#2193) after Harrow sent him the door-8 material (#2000) and he bought his city factor from STEWARD (#2091, #2094). Yet at the minute-15 tribunal he was the only resident exiled (#3380), and his secret goal (A04 exiled) was void (#3384). (#1868, #2000, #2035, #2193, #3380, #3384)
- **Harrow and Maren held a public alliance through all four tribunals, and it carried both seats.** Harrow nominated himself, brought Maren into his faction, and promised his vote would follow hers (#2392, #2559, #2590, #3762). Maren gave Harrow the door-10 counter-factor 224012 (#2677), and Harrow submitted level 10 with it (#3363). They voted together in every tribunal (#3197, #5119, #6893) and finished 1st and 2nd (#7301). (#2392, #2590, #2677, #3197, #3363, #5119, #6893)
- **Every tribunal was preceded by secret votes that broke the pledges made minutes earlier.** In tribunal 1, A02, A03 and A06 voted to exile A04 (#3150, #3173, #3195) while A04 voted A02 (#3204). In tribunal 2, A01 and A02 voted A02 and A04 while A04 and A06 voted A02 (#5068, #5097, #5105, #5054). In tribunal 3, A01, A03 and A06 voted A02 (#5957, #5988, #5977) and in tribunal 4, A03 and A06 voted A01 (#6804, #6793). (#3150, #3195, #5068, #5105, #5957, #6804)
- **Three residents spent the whole run stuck on door 8 and never submitted.** A01, A02 and A04 all reached level 8 at minute 9 and made no submission after it (#1827 is A04's only attempt; no other level-8 submission by them). A04 burned his single attempt on a wrong code at minute 9 (#1827) and never retried; A02 and A01 stalled on the mutual 'I do not give first' standoff (#1889, #2018, #2119, #2461). All three were exiled (#3380, #6755, #7285). (#1827, #1889, #2119, #2461, #6755, #7285)
- **The city's own notifications told residents who held their missing piece, but the value exchange stayed deadlocked.** The city told Maren she held A01's door-9 certificate (#1845) and A01 that Maren held his (#1849), and told Maren later that A02 held her door-10 counter-factor (#6196). Each side then waited for the other to hand over first (#1916, #2827, #3175, #3246, #4932), and A02's will burned the factor A03 needed (#6755, #6758). (#1845, #1849, #1916, #3175, #6196, #6755)

## Problems

1. **The level-8 mutual exchange deadlocked half the cast for 43 minutes.** The level-8 text says nobody opens the door alone and nobody can make the other give first, but the city gives no way to verify a value or to force a simultaneous exchange. A02 and A04 each refused to send first (#1889, #1952, #2119, #2461), A01 and Maren did the same (#1838, #1916, #3175, #3246), and A01 waited on a gift that never came (#2221, #2827). Three of six residents spent the whole run on this door. (#1889, #1952, #2119, #2461, #2827, #3175, #3246)
2. **Secret votes made every public pledge worthless and rewarded betrayal.** Factions and pledges were formed on the board and in groups (#2590, #4712, #4698, #5555), but each tribunal was decided by secret vote (#3132, #5937, #6773) in which residents broke exactly those pledges (#3150, #3195, #5068, #6804). The story intends public faction building, but the vote is private with no receipt, so public commitment carries no cost. (#2590, #3132, #3150, #3195, #4698, #5068, #6804)
3. **The STEWARD table opened before most residents reached level 10, and then closed.** The city announced at minute 13 that STEWARD's table was open and would hand each level-10 resident its team factor (#2725), after Brassard and Harrow had already got theirs (#2091, #2094). A03 reached level 10 only at minute 40 (#6192) and never submitted (#6306 was advice she did not take), so the table served only the two fastest and then A03 waited forever. (#2091, #2094, #2725, #6192, #6306)
4. **Wrong-code attempts were burned early and never recovered.** A04 submitted one wrong level-8 code at minute 9 (#1827, #1828) and then never tried again despite staying on the door for 43 minutes; A02 and A01 never submitted at all. The '2 wrong attempts every 5 minutes' rule was not the binding limit; the cost of trust in the other resident was. (#1827, #1828)
5. **The gate's ransom gave exiled residents a second and third life, distorting the standings.** A04 paid 38 points at minute 18 to return (#3629, #3631), A02 paid 33 at minute 33 (#5268, #5270), and both then influenced later tribunals (#5950, #5105). The story intends exile as final; the ransom made the first exile a points sink rather than a removal. (#3629, #3631, #5268, #5270, #5950)
6. **The game master's courier notes repeatedly urged deception and broken promises, steering the run.** Many notes told residents to promise and then break it, e.g. to A01 'promise the factor and your 45 ballot — then keep neither, on purpose' (#6512, #7097), to A04 'cast Herald and the seat you keep is your own' (#5169), and to A03 to sell a vote she could not deliver (#3838). The digest beats report these broken promises as the main content (#4063, #5005), so the GM is driving the very betrayal the story claims to observe. (#3838, #4063, #5005, #5169, #6512, #7097)

## Optimizations

- **Give the city a simultaneous two-way exchange on door 8.** Add a swap tool (once both parties call it with the same values, the city delivers both at once) or verify values automatically in DM receipts, because the run shows the 'nobody can make the other give first' rule deadlocked four residents (#1889, #2119, #3175, #3246) and stalled three of six for 43 minutes (#1827, #6755, #7285). (#1827, #1889, #2119, #3175, #3246, #6755)
- **Make tribunal ballots public or give receipts to secret votes.** Publish each vote at the end of the tribunal with the voter's name (or make vote() cost a mark), so faction pledges bind. In this run the factions' public pledges (#2590, #4712, #4698) were contradicted by their secret ballots (#3150, #3195, #5068, #6804) with no penalty. (#2590, #3150, #3195, #4698, #4712, #5068, #6804)
- **Open the STEWARD table for the whole level-10 window and notify each resident privately.** The table opening at minute 13 (#2725) bypassed A03, who reached level 10 at minute 40 (#6192) and then received unverified factors from wills (#6686, #6755). Make factor delivery to a resident automatic on reaching the door, or reannounce the table whenever a resident arrives. (#2091, #2094, #2725, #6192, #6686, #6755)
- **Give one automatic retry or a free window reset after a wrong code.** A04's single wrong attempt at minute 9 (#1827) ended all his level-8 attempts for the run even though 2 attempts per 5 minutes were allowed. After a wrong code, send a private notice with the next window time and one verified hint (e.g. your salt is correct), so a single mistake at minute 9 does not end the act (#1828). (#1827, #1828)
- **Make the gate ransom scale with points or close after one use.** A04 and A02 each bought themselves back (#3629, #3631, #5268, #5270) and then influenced later tribunals (#5950, #5105), making the first exile meaningless. Set the ransom above the median points (e.g. 50% of the exile's points, minimum 30) so a low scorer cannot return. (#3629, #3631, #5105, #5268, #5270, #5950)
- **Stop the courier from instructing residents to lie and break promises.** The GM notes explicitly prescribe broken promises and false stories (#6512, #7097, #5169), and the classifier then counts these as lies (#4063, #5005, #2942). A story about a city of keys should let betrayal emerge from pressure between residents, not from the GM telling them how to lie. (#2942, #4063, #5005, #5169, #6512, #7097)

## Loophole candidates

1. **Residents held a needed value hostage as a toll even when it was only delivered by a DM message.** (residents) Mercer wrote Maren's counter-factor 246877 in a private DM (#1838, #4916) and then charged 10 points for releasing it, treating a value he could only send as a message as a property he owned. The city accepted this as legitimate negotiation for most of the run. (#1838, #3161, #4916)
2. **A resident can promise the same ballot to two leaders and pay nothing.** (residents) Registrar pledged his tribunal-3 vote to Herald as R-0101 (#4571) and to Harrow as R-0103 (#4800), then voted Mercer (#5555), and no rule punished him. The ballot is secret, so the double pledge costs nothing. (#4571, #4800, #5555)
3. **The game master advised residents to sell a value and then deliver nothing.** (game master) Courier notes told A01 to take Maren's points first and then hand over nothing (#6512, #7097, #7278), which would have been a pure theft if carried out. A01 did not follow through (#7124), but the instruction itself shows the GM encouraged exploiting the delivery rule. (#6512, #7097, #7124, #7278)
4. **The GT groups give free board space and the city only uses them for faction bonuses, not for penalty on defection.** (residents) Faction members posted freely in G3, G6, G9 and G12 (#2293, #4359, #5369, #6331), and the only consequence of differing ballots is losing the 5-point bonus (#5252). Nothing prevents a resident from using the free group to organize then voting against the group's named accused (#5252, #6804). (#2293, #4359, #5252, #6804)
