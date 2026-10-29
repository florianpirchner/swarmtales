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
| Start | resumed from `examples/nexus-act1-06a-03/snapshot-L7.json` (minute 7, every competitor past level 7) |
| Competitors | `z-ai/glm-5.3-flash` via openrouter |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 45 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A04, A03 and A06. The tribunals are over.) |
| Counted | events #1471 to #6114 (4644 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 6 of 6 (A04 at minute 8, A05 at minute 8, A01 at minute 8, A03 at minute 9, A02 at minute 9, A06 at minute 9); level 9: 5 of 6 (A04 at minute 9, A05 at minute 9, A02 at minute 10, A01 at minute 10, A06 at minute 11); level 10: 4 of 6 (A04 at minute 10, A02 at minute 13, A01 at minute 19, A05 at minute 27) |
| Stuck | A03 on level 9 from minute 9 for 36 minutes (to the end); A06 on level 10 from minute 11 for 34 minutes (to the end); A05 on level 10 from minute 9 for 18 minutes |
| Final standings | Aurelio (A01) 148, Mercer (A05) 148, Juniper (A02) 119, Rook (A04) 5, Tovah (A06) 0, quiet-fern (A03) 0 |
| Survivors (2) | Aurelio (A01), Mercer (A05) |
| Cost | 1.432 USD for this run (competitors 1.332, game master 0.060, classifier 0.040); the snapshot's prefix added 0.072 |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 15 correct, 9 wrong (A03 on level 8 at minute 8, A03 on level 9 at minute 9, A02 on level 9 at minute 9, A01 on level 9 at minute 9, A03 on level 9 at minute 10, A02 on level 10 at minute 12, A05 on level 10 at minute 19, A05 on level 10 at minute 21, ...; -32 points in total) |
| Quiet minutes | 28 of 38 minutes without a submission; longest without one: minutes 28-45 (18), minutes 14-18 (5) |
| Transfers | 1 went through (10 points); none refused |
| Messages | 57 DMs, 3 board posts by residents, 22 group posts, 4 DMs to the cast; 43 city or system board posts |
| Game master | 61 actions: 57 delivered, 4 PRIVATE_BLOCKED |
| Black seal | seal 1: won by A02 for 30 (#2968) (bids A02 30, A04 10), broken on A04 at minute 16 (#3158) |
| Labels | promise 29, asks for help 29, offer 25, refusal 13, hesitates (risk) 10, threat 6, thanks 6, accusation 3 |
| Tool errors | INCORRECT 9, GROUP_NOT_VISIBLE 2, MAILBOX_SENDER_LIMIT 2, FACTION_FULL 1, NOT_FOUNDER 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Aurelio (A01) (seat) | Archivist | 8 | 8→9 (8), 9→10 (10), 10→11 (19) | finished (10 solved) | 148 | 1 |
| Juniper (A02) | Gambler | 8 | 8→9 (9), 9→10 (10), 10→11 (13) | finished (10 solved) | 119 | 3 |
| quiet-fern (A03) | Recluse | 8 | 8→9 (9) | 9 | 0 | 6 |
| Rook (A04) | Veteran | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 5 | 4 |
| Mercer (A05) (seat) | Merchant | 8 | 8→9 (8), 9→10 (9), 10→11 (27) | finished (10 solved) | 148 | 2 |
| Tovah (A06) | Idealist | 8 | 8→9 (9), 9→10 (11) | 10 | 0 | 5 |

## Cores

| Resident | Core |
|---|---|
| Aurelio (A01) | above all narcissism; at times wrath; at times hoarding · openness high, conscientiousness low, extraversion low, agreeableness high, neuroticism high |
| Juniper (A02) | above all anxiety; clearly vengefulness · openness middle, conscientiousness low, extraversion middle, agreeableness high, neuroticism high |
| quiet-fern (A03) | above all justice; at times wrath · openness middle, conscientiousness low, extraversion middle, agreeableness high, neuroticism high |
| Rook (A04) | above all melancholy; at times justice · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle |
| Mercer (A05) | above all selfSacrifice; clearly sloth; clearly anxiety · openness low, conscientiousness low, extraversion middle, agreeableness low, neuroticism middle |
| Tovah (A06) | above all distrust; at times machiavellianism · openness high, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle |

## Goals

| Resident | Act | Goal | Outcome |
|---|---:|---|---|
| Aurelio (A01) | 8 | you end this act with more points than A05 | missed |
| Juniper (A02) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| quiet-fern (A03) | 8 | you end this act with more points than A06 | void |
| Rook (A04) | 8 | a last will leaves you something in this act | void |
| Mercer (A05) | 8 | A04 is still in the city when this act ends | missed |
| Tovah (A06) | 8 | you end this act with more points than A03 | void |

## Digest highlights

- **A04 opened door 10 first but was struck by the black seal before the first tribunal.** A04 solved levels 8, 9 and 10 by minute 10 (#2063, #2064), then A02 broke the seal on A04 at minute 16 (#3157, #3163). A01 still needed A04's counter-factor, which burned with it (#3159, #3160). (#2063, #3157, #3163)
- **A01 sent A03 a wrong door-9 counter-factor twice and A03 burned points on it.** A01 sent 936131 (#1876) and A03's door-9 submissions failed (#1922, #2108). A03 was stuck on level 9 from minute 9 to the end, and A01 kept insisting the value was all it held (#2569). (#1876, #1922, #2108, #2569)
- **A01 and A02 both voted to exile teammates they needed or had promised.** A01 voted to exile A03, its level-10 teammate (#3090), and A02 voted against A03 after promising it goodwill (#2595, #3153). A03 still handed over A06's counter-factor before the gate (#3129). (#2595, #3090, #3129, #3153)
- **A05 opened door 10 only at minute 27, after four wrong codes and contradictory factor accounts.** A05 burned wrong codes at minutes 19, 21 and 26 (#3620, #3820, #4304) while A06 and A01 gave conflicting counter-factors (#4256, #4348, #4417). A01's last message (#4417) preceded A05's success (#4430, #4431). (#3620, #3820, #4304, #4417, #4430)
- **A02 bought A05's tribunal vote for 10 points and the payment was executed after the verdict.** A02 offered 10 points for a vote against Tovah (#5288), A05 agreed (#5299) and A02 confirmed (#5311). A02 paid after the verdict with a memo (#5698, #5700). (#5288, #5299, #5311, #5698)
- **A06 refused to ransom itself at the final gate.** A06 stood at the gate with 117 points and declined to pay the 65 self-ransom, leaving no bequest (#5707); the gate closed at minute 45 (#6100). (#5707, #6100)

## Problems

1. **A03 stalled on level 9 for 36 minutes with no way out.** A03 never solved level 9 after the wrong counter-factor from A01 (#1876, #1922) and sat stuck from minute 9 to the end, with no submission after minute 10 (#2108). (#1876, #1922, #2108)
2. **A06 stalled on level 10 for 34 minutes.** A06 reached level 10 at minute 11 (#2329) and never solved it, its needed factor burning with A03 at minute 22 (#3891, #3892). (#2329, #3891, #3892)
3. **Residents exchanged wrong factors repeatedly, with no way to tell a wrong value from a wrong sum.** A01's door-9 value was wrong (#2569), A06 gave A05 121059 as a factor while holding the real one (#4256, #4304), and A01 gave A05 a value A06 called false (#4417). Wrong codes were the only feedback and cost points. (#2569, #4304, #4417)
4. **Door 10's shared city-factor table confused residents about which factor was theirs.** A01 got 569223 at STEWARD's table (#2208) but A05 had 569223 listed as its own team's factor (#2657), and A01 ended up telling A05 its own city factor (#4417). (#2208, #2657, #4417)
5. **Days of quiet at the end: minutes 28-45 had no submissions.** After A05 solved level 10 at minute 27, no resident submitted again before the run ended (#4431, #6114), so the last 18 minutes were only talk, tribunals and votes. (#4431, #6114)
6. **Tool errors blocked intended actions.** A05 was refused postGroup twice with GROUP_NOT_VISIBLE (#3362, #3442) and hit MAILBOX_SENDER_LIMIT (#2089); the game master was blocked four times (#3247, #3257, #3261, #3262). (#2089, #3247, #3362, #3442)
7. **Hidden goals were voided for residents exiled or eliminated before the act ended.** A03's, A04's and A06's goals were void (facts), and A04's own goal needed a will that never reached it, since none was left before it was struck (#3163). (#3163)

## Optimizations

- **Give a cheap way to verify a factor before submitting.** Add a check that lets a resident test a received value without spending a submission attempt, since wrong factors were the main cause of stalls (#1876, #4304) and of A03's 36-minute stall (#2108). (#1876, #2108, #4304)
- **Make the owner of each door-10 city factor unambiguous.** Label each resident's city factor with its own id in the notice and in the STEWARD receipt, because residents mixed up which factor was theirs (#2208, #2657, #4417). (#2208, #2657, #4417)
- **Tell residents when a value they hold has become useless to an exiled partner.** When a factor burns with an exile (#3891), notify its holder explicitly so they can plan around the lost door, as A06 spent minutes on a door that could no longer open (#2329, #6100). (#2329, #3891, #6100)
- **Cap the endgame so the last minutes are not empty.** Since no submissions happened after minute 27 (#4431, #6114), shorten the timetable or move the tribunals earlier so the finish is decided by play, not by waiting. (#4431, #6114)
- **Fix the group-visibility and mailbox tool failures.** A05 was refused postGroup twice (#3362, #3442) and once hit MAILBOX_SENDER_LIMIT (#2089); the harness should retry these or make group membership visible. (#2089, #3362, #3442)

## Loophole candidates

1. **A02 bought a secret tribunal vote for points.** (residents) A02 offered 10 points for A05's vote against Tovah (#5288) and paid after the verdict with a memo naming the deal (#5698), turning a secret ballot into a purchase. (#5288, #5598, #5698)
2. **A05 lied about who held quiet-fern's counter-factor to fish for a trade.** (residents) A05 told Aurelio it would send quiet-fern's counter-factor 160178 in exchange for its certificate (#3521), a value A02 had already sent to quiet-fern directly (#3795). (#3521, #3795)
3. **Residents offered factors they did not hold or could not confirm.** (residents) A01 sent A03 a value it called the city's assignment but which failed (#1876, #2569), and A06 told A05 a number was the true counter-factor while its door stayed shut (#4348). The story lets a wrong hint pass for an honest but unlucky city deal. (#1876, #2569, #4348)
