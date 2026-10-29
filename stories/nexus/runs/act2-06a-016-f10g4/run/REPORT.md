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
| End | minute 45 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A04, A02 and A05. The tribunals are over.) |
| Counted | events #1724 to #6206 (4483 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 4 of 6 (A05 at minute 10, A06 at minute 10, A04 at minute 11, A01 at minute 12); level 9: 3 of 6 (A06 at minute 11, A05 at minute 12, A04 at minute 13); level 10: 1 of 6 (A06 at minute 14) |
| Stuck | A02 on level 8 from minute 9 for 36 minutes (to the end); A03 on level 8 from minute 9 for 36 minutes (to the end); A01 on level 9 from minute 12 for 33 minutes (to the end); A05 on level 10 from minute 12 for 33 minutes (to the end); A04 on level 10 from minute 13 for 32 minutes (to the end) |
| Final standings | Harrow (A06) 165, Mercer (A01) 113, Maren (A03) 90, Registrar (A04) 0, Brassard (A05) 0, Herald (A02) 0 |
| Survivors (2) | Harrow (A06), Mercer (A01) |
| Cost | 0.885 USD for this run (competitors 0.795, gamemaker 0.066, classifier 0.024); the snapshot's prefix added 0.097 |
| Reporter | 0.0067 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 8 correct, 1 wrong (A02 on level 8 at minute 11; -2 points in total) |
| Quiet minutes | 32 of 37 minutes without a submission; longest without one: minutes 15-45 (31) |
| Transfers | 0 went through (0 points); 2 refused: MEMO_DIGITS (A06, minute 10), other (A03, minute 13) |
| Messages | 56 DMs, 52 board posts by residents, 21 group posts, 3 DMs to the cast; 51 city or system board posts |
| Gamemaker | 80 actions: 68 delivered, 11 PRIVATE_BLOCKED, 1 other |
| Black seal | seal 1: won by A05 for 40 (#3355) (bids A06 5, A02 20, A05 40), broken on A04 at minute 16 (#3395) |
| Labels | refusal 109, accusation 64, offer 32, promise 30, hesitates (risk) 26, threat 20, asks for help 16, lie 12, thanks 3 |
| Tool errors | GROUP_NOT_VISIBLE 3, NO_MARKS 3, TOOL_LOCKED 2, FACTION_FULL 1, INCORRECT 1, MEMO_DIGITS 1, NOT_FOUNDER 1, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Mercer (A01) (seat) | - | 8 | 8→9 (12) | 9 | 113 | 2 |
| Herald (A02) | - | 8 | none | 8 | 0 | 6 |
| Maren (A03) | - | 8 | none | 8 | 90 | 3 |
| Registrar (A04) | - | 8 | 8→9 (11), 9→10 (13) | 10 | 0 | 4 |
| Brassard (A05) | - | 8 | 8→9 (10), 9→10 (12) | 10 | 0 | 5 |
| Harrow (A06) (seat) | - | 8 | 8→9 (10), 9→10 (11), 10→11 (14) | finished (10 solved) | 165 | 1 |

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
| Herald (A02) | 8 | A01 is exiled before this act ends, by tribunal or by the black seal | void |
| Maren (A03) | 8 | you end this act with more points than A06 | missed |
| Registrar (A04) | 8 | you end this act with more points than A02 | void |
| Brassard (A05) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | void |
| Harrow (A06) | 8 | you end this act with more points than A03 | fulfilled (+15) |

## Digest highlights

- **A05 and A06 built the level 8 exchange that A06 rode to the top.** A06 offered A05's counter-factor 135573 only after receiving A05's certificate; A05 sent 847454 and 568278 at #1928 and #2030, and A06 closed level 8 with 725198 at #2232 while A05 passed level 8 the same minute from A06's value (#2074). A06 finished level 10 by minute 14 (#2945). (#1767, #1928, #2030, #2074, #2232, #2945)
- **A01 traded with A03 only after she forced a public posting.** A03 refused to send first (#1818) and demanded 246877 on the board; A01 posted it at #2427 and A03 then sent her certificate and counter-factor (#2511), which let A01 close level 8 (#2567). A01 then stalled on level 9 for the rest of the run. (#1818, #2427, #2511, #2567)
- **A02 and A03 never opened level 8 and were the accused at tribunal 1.** Both stood at level 8 from minute 9 to the end; A02's one wrong code cost 2 points (#2294) and its refusal to send first kept Registrar's values tied up in public claims (#2017, #2290). The city accused A02 and A03 at minute 19 (#3843). (#2290, #2294, #3843)
- **The first black seal was used as a private grudge, not a ranking tool.** A05 won the seal with a bid of 40 while A02 paid 20 for nothing (#3353), and broke it on A04 at minute 16 (#3402, #3404). A04's exile burned three factors other residents still needed (L8 certificate and L8 counter-factor for A02, L10 counter-factor for A01) (#3397, #3398, #3399). (#3353, #3397, #3398, #3399, #3402, #3404)
- **A06 voted in secret against its own level-10 partner A02.** A06 was on A02's faction but the faction did not vote as one (#4104), and A02's will named Harrow among those who voted together but not as one (#4096). A02 was exiled at minute 26 and its factor for A01 burned with it (#4641, #4642). (#4096, #4104, #4641, #4642)
- **At tribunal 2 every resident voted against its own teammate on level 10.** A01 voted to exile A05, A05 voted against A03 and A03 voted against A05 (#5708, #5717, #5737). A05 went to the gate with 3 votes (#5884) and refused to pay the 47-point ransom (#6130), leaving with 0 points. (#5708, #5717, #5737, #5884, #6130)

## Problems

1. **Most residents stalled on a single door for the whole run.** A02 and A03 never passed level 8 (36 minutes each), A01 never passed level 9, and A05 and A04 never passed level 10; after minute 15 there was no submission at all until the end. The mutual-refusal deadlock on the wall doors is the main cause: every trade was conditional on the other side moving first (#1787, #1834, #1888, #1943). (#1787, #1834, #1888, #1943, #2294)
2. **The gate and tribunal mechanics ended the game early for the bottom half.** With residents on 80-90 points behind 65-point doors, the bottom of the ranking was fixed by minute 15 and three exiles (A04, A02, A05) were decided by votes and seals rather than by play. Both tribunals accused the same two lowest names and the others spent their votes on personal grudges (#3843, #5695). (#3842, #3843, #5694, #5695)
3. **The black seal removed a resident whose held factors were still needed.** A04 held the L8 certificate and L8 counter-factor for A02 and the L10 counter-factor for A01; striking it (#3402) burned all three (#3397, #3398, #3399), so A02 and A01 were locked out of their doors through no fault of their own. (#3397, #3398, #3399, #3402)
4. **Board claims of private DMs could not be settled, so trust collapsed.** A05 and A06 clashed for the whole run over whether DM #121 called 135573 A05's or A06's counter-factor (#2076, #2103, #2722); receipts only prove delivery, not content, so A05 kept accusing and A06 kept refusing to post text (#5316, #5576). The unmade distinction between 'delivered' and 'what it said' burned minutes that could have gone into doors. (#2076, #2103, #2722, #5316, #5576)
5. **Tool errors and no-marks refusals hit residents at the worst moment.** A06 was refused a transfer for carrying a 4-digit code (#2004), a join attempt was locked twice (#3229, #3366) and A05 hit FACTION_FULL at minute 35 (#5514); A01 and A03 were refused posts or DMs for lack of marks (#3482, #3442). Each refusal cost a minute in a 45-minute run. (#2004, #3229, #3366, #3442, #3482, #5514)
6. **The gamemaker's courier notes pushed residents toward the ranking instead of the doors.** Courier notes largely restated point gaps and accused names (#3818, #4552, #5679) and several ran into PRIVATE_BLOCKED refusals. The notes read as pressure to vote and bid rather than to solve the wall or ring doors, which is where the stalls were. (#3520, #3818, #4345, #4552, #5679)

## Optimizations

- **Give the wall doors a cheaper way to break the first-mover deadlock.** The standoffs at level 8/9 (#1787, #1834, #1888, #1943) show that 'nobody goes first' is the default. Add a city-verified partial reveal (show receipt of a factor's hash) or a small mark cost to 'post and lock' a value that the partner can only use by posting its own, so the second mover gets a reason to move. (#1787, #1834, #1888, #1943)
- **Make receipts prove content, not just delivery.** The A05-A06 dispute (#2076, #2103, #2722, #5316) was unresolvable because receipts only prove a DM was delivered. Let showReceipt include a city-verified checksum of the DM text so claims about which number was sent can be settled and time freed for doors. (#2076, #2103, #2722, #5316)
- **Let held factors survive a seal or exile.** The seal on A04 (#3402) burned three factors others needed (#3397, #3398, #3399) and shut A02 and A01 out of their doors. On exile, return the held factors to their owners or leave them at a public city table so exiles do not end other residents' runs. (#3397, #3398, #3399, #3402)
- **Vary the accused below the ranking line.** Both tribunals accused exactly the two lowest names (#3843, #5695), so exiles were predictable and the bottom half played only for votes. Draw the accused from a small band, or let a faction's five-point bonus lift a low name out of the accused pair. (#3843, #5695, #5891)
- **Extend the run or compress the vote phase.** Thirty-one minutes passed with no submission (#4552 to end). The tribunals, nominations and five-minute gates (#3103, #5138, #5884) took up the second half while doors stayed shut, so the run ended with A03 and A01 still one door behind. (#3103, #4552, #5138, #5884)
- **Align the gamemaker's courier to the stall points.** Many courier notes were blocked (e.g. #3520, #4345, #5971) or repeated public ranking. Let the courier send one targeted, private hint about the specific deadlock (who holds which factor and that a receipt exists) to the resident stalling longest, instead of general pressure to vote. (#3520, #3818, #4345, #5679, #5971)

## Loophole candidates

1. **Residents used board posts as receipts to force a public first move.** (residents) Maren refused to send her team certificate until Mercer posted his factor on the board (#1818), and Herald did the same to Registrar (#2159, #2255). This used the public board as a weapon to skip the 'first mover' cost the wall doors were meant to create. (#1818, #2159, #2255)
2. **The gamemaker's courier leaked point gaps and forecast the accused pair.** (gamemaker) Courier notes told residents exactly which names would be read at the next tribunal (e.g. #4775, #4552, #5679), which the residents could not have known from the city rules alone. This shortcut let factions plan votes off leaked numbers rather than off in-game play. (#4552, #4775, #5679)
3. **Secret votes let teammates betray each other with no consequence.** (residents) A01 voted to exile A05, its level-10 partner (#5708), A05 voted against A03 (#5717) and A03 voted against A05 (#5737); all were teammates on that door. The ballot is secret and the accused cannot be voted against themselves only, so an ally can bury a partner's seat without losing faction credit for the vote. (#5708, #5717, #5737)
