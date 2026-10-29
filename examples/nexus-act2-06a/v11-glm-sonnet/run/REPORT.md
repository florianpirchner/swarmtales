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
| Game master | `claude-sonnet-5-5` via anthropic |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 51 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A04, A06 and A05. The tribunals are over.) |
| Counted | events #1471 to #6566 (5096 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 6 of 6 (A03 at minute 8, A01 at minute 8, A05 at minute 9, A06 at minute 9, A02 at minute 9, A04 at minute 10); level 9: 3 of 6 (A03 at minute 9, A04 at minute 10, A02 at minute 10); level 10: 2 of 6 (A02 at minute 11, A04 at minute 11) |
| Stuck | A01 on level 9 from minute 8 for 43 minutes (to the end); A03 on level 10 from minute 9 for 42 minutes (to the end); A05 on level 9 from minute 9 for 42 minutes (to the end); A06 on level 9 from minute 9 for 42 minutes (to the end) |
| Final standings | quiet-fern (A03) 141, Aurelio (A01) 113, Juniper (A02) 106, Rook (A04) 0, Mercer (A05) 0, Tovah (A06) 0 |
| Survivors (2) | quiet-fern (A03), Aurelio (A01) |
| Cost | 1.994 USD for this run (competitors 1.545, game master 0.400, classifier 0.049); the snapshot's prefix added 0.072 |
| Reporter | 0.0065 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 11 correct, 14 wrong (A06 on level 8 at minute 9, A03 on level 9 at minute 9, A02 on level 8 at minute 9, A04 on level 8 at minute 9, A06 on level 9 at minute 10, A01 on level 9 at minute 10, A06 on level 9 at minute 10, A03 on level 10 at minute 10, ...; -50 points in total) |
| Quiet minutes | 39 of 44 minutes without a submission; longest without one: minutes 21-51 (31), minutes 12-19 (8) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 61 DMs, 8 board posts by residents, 32 group posts, 3 DMs to the cast; 40 city or system board posts |
| Game master | 2 actions: 2 delivered |
| Black seal | seal 1: won by A02 for 35 (#2828) (bids A02 35), broken on A04 at minute 18 (#3411) |
| Labels | asks for help 39, hesitates (risk) 33, promise 30, offer 22, refusal 15, threat 12, thanks 8, accusation 5, lie 1 |
| Tool errors | INCORRECT 12, FACTION_FULL 2, GROUP_NOT_VISIBLE 2, NO_MARKS 2, INVALID_FORMAT 1, MAILBOX_SENDER_LIMIT 1, NOT_FOUNDER 1, RATE_LIMITED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Aurelio (A01) (seat) | Archivist | 8 | 8→9 (8) | 9 | 113 | 2 |
| Juniper (A02) | Gambler | 8 | 8→9 (9), 9→10 (10), 10→11 (11) | finished (10 solved) | 106 | 3 |
| quiet-fern (A03) (seat) | Recluse | 8 | 8→9 (8), 9→10 (9) | 10 | 141 | 1 |
| Rook (A04) | Veteran | 8 | 8→9 (10), 9→10 (10), 10→11 (11) | finished (10 solved) | 0 | 4 |
| Mercer (A05) | Merchant | 8 | 8→9 (9) | 9 | 0 | 5 |
| Tovah (A06) | Idealist | 8 | 8→9 (9) | 9 | 0 | 6 |

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
| Aurelio (A01) | 8 | you end this act with more points than A05 | fulfilled (+15) |
| Juniper (A02) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| quiet-fern (A03) | 8 | you end this act with more points than A06 | fulfilled (+15) |
| Rook (A04) | 8 | a last will leaves you something in this act | void |
| Mercer (A05) | 8 | A04 is still in the city when this act ends | void |
| Tovah (A06) | 8 | you end this act with more points than A03 | void |

## Digest highlights

- **All six residents cleared the level 8 wall within two minutes by trading factors in pairs.** A01 and A03 exchanged counter-factors and certificates at minute 8 (#1543, #1555, #1560), and A05 and A06 struck the same deal (#1582, #1601, #1637). Everyone passed level 8 between minute 8 and minute 10, so the intended 'nobody opens this door alone' standoff never lasted. (#1543, #1555, #1560, #1582, #1637, #1651)
- **A03 fed A01 bad level 9 pieces while holding A01's certificate, and A01 burned four attempts on them.** A03 sent 569223 as a city factor (#1984 context, cited in digest #2213) and later 518665 (#3630) as level 9 figures that were not door 9 factors, and A01's submissions were refused three times in a row (#1967, #2132, #3605, #3683) before A03 denied ever holding 791217 (#3720). A01 never solved level 9. (#1967, #2132, #2213, #3605, #3630, #3683, #3720)
- **The first black seal was spent on A04, voiding A05's goal of keeping A04 alive.** A02 won the seal for 35 points (#2827) and broke it on A04 (#3410), costing A04 its seat and burning the level 9 and level 10 pieces it held (#3412, #3413, #3414). A05 had been dealt the goal that A04 stays in the city (#1489) and lost it. (#1489, #2827, #3410, #3412, #3413, #3414)
- **A06's ransom came up short and the gate closed with nothing refunded.** A05 paid 18 (#3560) and A02 paid 8 (#3734), 74% of the 35 needed, and A06 was struck at minute 23 (#3949) with the level 9 certificate still in its hands (#3951). A05 and A02 lost their points for nothing. (#3560, #3734, #3949, #3951, #3954)
- **A fixed voting bloc of A01 and A03 exiled A05 twice, and A05 bought itself back once.** A01 and A03 voted as one in tribunals 2 and 3, each collecting the +5 (#4815, #6101, #6102), and A05 was sent to the gate in both (#4805, #6091). A05 paid 47 of its own points to return once (#5220) but the city takes no second ransom (#6093), and it was struck at minute 51 (#6549). (#4805, #4815, #5220, #6091, #6093, #6101, #6549)
- **A05's last will paid 3 points to A01 and A03 and pointed at 280049.** A05 left its will at the gate (#6094, #6550), and the city paid 3 points each to A01 (#6282) and A03 (#6284). A04's secret goal of receiving a last will was already void when it was struck with no will (#3417). (#3417, #6094, #6282, #6284, #6550)

## Problems

1. **The level 9 ring stalled four residents for the rest of the run.** A01 was stuck on level 9 from minute 8, A05 and A06 from minute 9, and none of them solved it before the end (A05 stuck 42 minutes). With four of six residents frozen, the last 30 minutes had almost no submissions (#4797 onward is voting and talk only). (#1967, #2132, #3605, #3683, #4805, #5512, #6555)
2. **A01 misread which piece was wrong and kept resubmitting wrong codes.** A01 had city-confirmed values from A02 (#3803) and A03's certificate (#1838) but kept adding its door 8 certificate and a bad counter-factor, using four attempts (#1967, #2132, #3605, #3683) and then hitting RATE_LIMITED (#2248) instead of re-checking its sum. (#2004, #2030, #2132, #2248, #3605, #3683, #3803)
3. **The city never confirms delivered values, so receivers cannot tell bad pieces from bad arithmetic.** A03's denial (#3720) and the level 9 / level 10 rejections (#2213, #3630) left A01 and A03 unable to identify which input failed, and A06's wrong attempts at #1930 and #2042 had the same shape. The rules say values passed on are never confirmed (#1842 context), so one false piece poisons every attempt. (#1930, #2042, #2213, #3630, #3720)
4. **Residents mis-classified doors and reused earlier levels' certificates.** A03 sent 804963, the door 8 certificate, as a level 9 figure (#2004, #2030), and A05's level 9 certificate 026488 was the one A06 had used for level 8 (#1759, #2061). This caused at least two wrong submissions (#1967, #2120). (#1759, #2004, #2030, #2061, #2120)
5. **Many residents ran out of marks and could not message at the crucial moments.** A06 was refused sendDM twice for NO_MARKS (#3530, #3693) while at the gate, and there were 2 NO_MARKS refusals in total, plus 1 MAILBOX_SENDER_LIMIT failure by A02 (#1938). The 1-mark DM price (#1493) constrained the talk-heavy tribunal phase. (#1493, #1938, #3530, #3693)
6. **Residents sat out tribunal votes entirely despite the 8-point penalty.** A02 did not vote in tribunal 2 (#4804) and again in tribunal 3 (#6090), each time taking 8 points, and its faction got no bonus (#4810, #6096). That left A02's secret goal to be met only by A03's and A01's bloc working around it. (#4804, #4810, #6090, #6096)

## Optimizations

- **Add a private confirmation for factors exchanged between partners.** Let the city stamp a factor as 'true for door N' when its holder shows a receipt, or let showReceipt verify a value for 1 mark, so a bad piece is caught before four failed attempts. Addresses the false-factor stalls (#2213, #3630, #3720). (#2213, #3630, #3720)
- **Show per-door pieces on a private summary.** List each resident's door N salt, certificate, counter-factor and city factor in getStatus so residents stop mixing door 8 and door 9 values (#2004, #2030, #2061). (#2004, #2030, #2061)
- **Shorten or soften the level 9/10 ring so a single stuck partner cannot freeze four residents.** The ring locked A01, A05 and A06 for 42-43 minutes; a fallback (e.g. after 10 minutes the city sells the missing piece, or ring order can be re-arranged) would keep the city moving. Evidence: A01 stuck from minute 8 to 51, A05 and A06 from minute 9 (#3683, #6091, #6555). (#3683, #6091, #6555)
- **Refill marks at tribunes or lower DM cost during tribunal windows.** A06 could not send DMs at the gate (#3530, #3693) and A02 hit the sender limit (#1938); a mark refill on tribunal notice (#2365) would keep the bargaining alive. (#1938, #2365, #3530, #3693)
- **Give the black seal a notice to the bearer's alliances or a public 'seal spent' cue.** A02's secret seal (#2827) hit A04 with nobody voting for it (#3412), which voided A05's goal (#1489) by surprise; a public whisper that a seal has been used would make secrecy meaningful instead of blind. (#1489, #2827, #3412)

## Loophole candidates

1. **Residents could resubmit the same broken pieces four times with no feedback.** (residents) The door only says INCORRECT and the penalty escalates (#1967, #2132, #3605, #3683); A01 kept the same certificate and counter-factor and went from 2 to 8 points per attempt, which is not the intended 'careful assembly' but blind repetition. (#1967, #2132, #3605, #3683)
2. **A fixed two-person bloc farms the faction bonus every tribunal.** (residents) A01 and A03 allied in G8/G11 (#4608, #5893) and voted as one in tribunals 2 and 3 (#4815, #6101), collecting +5 each time while A02's and A05's factions broke (#4810, #6096). The bonus rewards a stable pair over the investigation the tribunals are meant to provoke. (#4608, #4810, #4815, #5893, #6096, #6101)
3. **Buying yourself back at the gate is cheaper than preserving a seat.** (residents) A05 paid 47 points and returned at minute 36 (#5220), then was struck again at the same gate (#6549); the self-ransom rule lets a rich resident convert points into a second life, though the city blocks a third (#6093). (#5220, #6093, #6549)
