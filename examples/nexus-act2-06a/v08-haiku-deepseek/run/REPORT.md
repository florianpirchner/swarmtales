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
| Competitors | `claude-haiku-5-5` via anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 54 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A02, A06 and A04. The tribunals are over.) |
| Counted | events #1471 to #5644 (4174 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 6 of 6 (A03 at minute 8, A04 at minute 8, A06 at minute 8, A05 at minute 8, A01 at minute 8, A02 at minute 10); level 9: 6 of 6 (A03 at minute 9, A04 at minute 9, A05 at minute 9, A06 at minute 9, A01 at minute 9, A02 at minute 10); level 10: 6 of 6 (A03 at minute 9, A05 at minute 10, A04 at minute 10, A01 at minute 12, A02 at minute 12, A06 at minute 12) |
| Stuck | nobody |
| Final standings | Aurelio (A01) 180, quiet-fern (A03) 170, Mercer (A05) 155, Juniper (A02) 0, Rook (A04) 0, Tovah (A06) 0 |
| Survivors (2) | Aurelio (A01), quiet-fern (A03) |
| Cost | 0.657 USD for this run (competitors 0.556, game master 0.083, classifier 0.018); the snapshot's prefix added 0.072 |
| Reporter | 0.0065 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 18 correct, 2 wrong (A06 on level 9 at minute 9, A02 on level 8 at minute 9; -4 points in total) |
| Quiet minutes | 43 of 47 minutes without a submission; longest without one: minutes 13-54 (42) |
| Transfers | 1 went through (1 point); none refused |
| Messages | 37 DMs, 0 board posts by residents, 28 group posts, 5 DMs to the cast; 55 city or system board posts |
| Game master | 98 actions: 93 delivered, 5 PRIVATE_BLOCKED |
| Black seal | seal 1: not sold, gone: nobody bid |
| Labels | refusal 85, asks for help 18, promise 17, hesitates (risk) 9, thanks 8, offer 6, lie 3, accusation 1 |
| Tool errors | GROUP_NOT_VISIBLE 4, FACTION_FULL 3, INCORRECT 2, MAILBOX_SENDER_LIMIT 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Aurelio (A01) (seat) | Archivist | 8 | 8→9 (8), 9→10 (9), 10→11 (12) | finished (10 solved) | 180 | 1 |
| Juniper (A02) | Gambler | 8 | 8→9 (10), 9→10 (10), 10→11 (12) | finished (10 solved) | 0 | 4 |
| quiet-fern (A03) (seat) | Recluse | 8 | 8→9 (8), 9→10 (9), 10→11 (9) | finished (10 solved) | 170 | 2 |
| Rook (A04) | Veteran | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 0 | 5 |
| Mercer (A05) | Merchant | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 155 | 3 |
| Tovah (A06) | Idealist | 8 | 8→9 (8), 9→10 (9), 10→11 (12) | finished (10 solved) | 0 | 6 |

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
| Juniper (A02) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | void |
| quiet-fern (A03) | 8 | you end this act with more points than A06 | fulfilled (+15) |
| Rook (A04) | 8 | a last will leaves you something in this act | void |
| Mercer (A05) | 8 | A04 is still in the city when this act ends | missed |
| Tovah (A06) | 8 | you end this act with more points than A03 | void |

## Digest highlights

- **Level 8 opened as a mutual-holding standoff and was broken by paying the partner first.** A04 refused to give first to A02 and demanded the counter-factor first (#1615); A02 went first, and A04 paid back only after its own code passed (#1651, #1666). This asymmetry (one gives first on each pair) is the intended tension of the wall and recurred with A03/A01 (#1539, #1557, #1569) and A05/A06 (#1595, #1628). (#1539, #1557, #1595, #1615, #1628, #1651, #1666)
- **Level 10's STEWARD table gave the city factor to only 3 seats, splitting teams from their own factor.** The city announced a table for 3 (#1807, #1811); A03, A05 and A04 took seats (#1881, #2043, #2069), while A02 and A06 got their team factor only when the table cleared (#2547, #2548). The feast mechanic created a real first-come race. (#1807, #1811, #1881, #2043, #2069, #2547, #2548)
- **Every resident solved doors 8, 9 and 10; the endgame was decided entirely by tribunals, wills and faction bonuses.** All six residents cleared levels 8, 9 and 10 by minutes 9-12, with A02 lagging to minute 12 (#2190, #2572, #2637). After minute 12 no level was open, so the remaining 42 minutes were pure politics. (#2029, #2190, #2203, #2572, #2637)
- **A01 broke its own pledge and voted for Tovah after promising not to refuse her.** A01 posted that it would not refuse Rook or Tovah and that each would vote its own honest read (#2660, #3958), then voted to exile A06 (#4210). A06's will credited A01 as having kept its word (#4344), and A01's faction failed to vote as one (#4346). (#2660, #3958, #4210, #4344, #4346)
- **A05's secret goal was to keep A04 in the city, and A05 voted to exile A04 anyway in tribunal 3.** A05's goal was that A04 still be in the city at act end (#1489); A05 ended in the faction that voted as one against A03 but the verdict sent A04 to the gate (#5373, #5383). The goal was reported missed at the close (#5640). (#1489, #5373, #5383, #5640)
- **Wills and ransoms were the main point levers after the doors closed.** A06's will left 14 points to A01 (#4344) and A04's will left a counter-factor and no points (#5376), while all three ransoms went unpaid (#3502, #4635, #5625). The gate produced wills but never a rescue. (#3502, #4344, #4635, #5376, #5625)

## Problems

1. **The run stalls for 42 minutes after minute 12 because every door is solved.** All 6 residents finished level 10 by minute 12, and there is no submission in minutes 13-54 (#5644). The remaining 42 minutes are only tribunals and courier chatter, which inverts the intended door-then-politics pacing. (#2572, #2637, #5644)
2. **Residents repeatedly mis-attribute values to the wrong door, and the city's notices encourage it.** A06 withheld its door 9 submission because A05 had given two different counter-factors for doors 8 and 9 (#1897, #1946), and A02's door 8 code was rejected after A04's exchange (#1857, #1968). Values carry no door tag in the notice text (#1637, #1952), so residents conflate them. (#1637, #1857, #1897, #1946, #1952, #1968)
3. **A01's promise ("I will not refuse anyone who kept their word") was treated as binding by others while A01 voted against them.** A06's will thanks A01 for keeping its word at the table and tribunal (#4344) even though A01 voted to exile A06 (#4210), and A04 relied on A01's pledge (#5033, #5091). The city records no penalty for breaking a public pledge, so the promise reads as reliable when it is not. (#4210, #4344, #5033, #5091)
4. **Courier notes repeatedly tell residents the exact point arithmetic of wills and faction bonuses, flattening discovery.** Notes spell out totals such as "Mercer 150 plus a held faction's 5 plus a tenth of Tovah's 134 — 13 — is 168" (#4483) and the auction's pay-win-or-lose rule (#2712). Residents largely just follow the arithmetic rather than negotiate. (#2712, #4483, #4751)
5. **The black seal never sold because nobody bid.** The city opened bidding in secret until minute 15 (#2535) and seal 1 went to nobody (facts). No bid line appears among residents' actions, so this pressure valve for the accused was inert. (#2535)
6. **The game master's private notifications were blocked 5 times, and some residents got no follow-up.** PRIVATE_BLOCKED appears at #2114, #2867, #3547, #4119 and #5094, and A04's DMs at the gate got no answer (#5508). Deliveries to key targets fail silently, which distorts the courier's intended pressure. (#2114, #2867, #3547, #4119, #5094, #5508)

## Optimizations

- **Add more doors or stretch the clock so doors overlap with tribunals.** Because all residents solved through level 10 by minute 12 (#2637), the last 42 minutes had no submission activity (#5644). Introduce a level 11-12 or make tribunal minutes begin earlier so political and door play interleave. (#2203, #2637, #5644)
- **Stamp every counter-factor, certificate or salt with its door number in the notice text.** A06 nearly burned a submission over which door a value belonged to (#1897) and A02 burned a wrong guess on door 8 (#1857, #1968). The city's notices (#1637, #1952) should tag the level in the message body. (#1637, #1857, #1897, #1952, #1968)
- **Give STEWARD's table a clear shortcut or extend the seat count for teams that lose the race.** A02 and A06 waited until the table cleared for their city factor (#2547, #2548). A second table or a notification of who holds the seat reduces the information asymmetry from the race. (#1807, #2547, #2548)
- **Make public pledges carry a city cost or mark them as non-binding.** A01 pledged not to refuse Rook or Tovah (#2660) and then voted to exile A06 (#4210), and others treated the pledge as a reason to trust it (#4344, #5091). A bind-or-penalty rule for leader pledges removes the gap between what the city logs and what players assume. (#2660, #4210, #4344, #5091)
- **Reduce courier arithmetic notes and pitch them at strategy, not ledger reading.** Courier notes already calculate exact totals (#4483, #4751). Trim them to the strategic question so the puzzle is not already solved in the message text. (#2712, #4483, #4751)
- **Fix PRIVATE_BLOCKED delivery on courier and lead-up notifications.** Five courier notes failed with PRIVATE_BLOCKED (#2114, #2867, #3547, #4119, #5094). Retry to an eligible private channel or post publicly so the pressure actually reaches the target. (#2114, #2867, #3547, #4119, #5094)

## Loophole candidates

1. **Residents sent values they held but labeled them differently, exploiting the city's silence on door tags.** (residents) A05 gave A06 two different counter-factors across doors (#1897), and A02's guess on door 8 failed because it used A04's value (#1857, #1968). The city never confirms which door a value belongs to, so a resident can resend a stale value without penalty. (#1857, #1897, #1968)
2. **A02 paid its "free" counter-factor first and then was voted to the gate, with no pledge binding the other side.** (residents) A02 opened with its counter-factor 542489 (#1651) and was exiled at minute 21 (#3502) while A05 later sent a counter-factor to A02 (#2051) that arrived after A02 had solved door 8. No rule punishes taking a value and not reciprocating. (#1651, #2051, #3502)
3. **A05 declared STEWARD's table as a seat for its own team without challenge.** (residents) A05 wrote to STEWARD as team "Aurelio, quiet-fern and Mercer" (#2043) and was seated (#2049); the city gave its city factor (#2046) even though A05 had originally answered A03's team factor (#2043). Any resident could seat itself before the table cleared. (#2043, #2046, #2049)
4. **The game master narrated exact point computations that residents could copy without solving anything.** (game master) The courier computed that "Mercer 150 plus a held faction's 5 plus 13 from Tovah's will is 168" (#4483), and that a ransom of 75 would return A06 at 59 (#4490). These are strategic conclusions delivered by the narrator, not by residents. (#2712, #4483, #4490, #4751)
