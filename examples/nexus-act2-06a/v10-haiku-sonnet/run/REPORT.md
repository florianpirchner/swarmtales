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
| Game master | `claude-sonnet-5-5` via anthropic |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 55 (The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A05, A04 and A06. The tribunals are over.) |
| Counted | events #1471 to #6311 (4841 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 6 of 6 (A03 at minute 8, A04 at minute 8, A02 at minute 8, A06 at minute 8, A05 at minute 8, A01 at minute 8); level 9: 6 of 6 (A03 at minute 9, A01 at minute 9, A05 at minute 9, A02 at minute 9, A06 at minute 10, A04 at minute 19); level 10: 6 of 6 (A01 at minute 10, A03 at minute 10, A02 at minute 10, A06 at minute 13, A05 at minute 13, A04 at minute 20) |
| Stuck | A04 on level 9 from minute 8 for 11 minutes |
| Final standings | Aurelio (A01) 180, Juniper (A02) 175, quiet-fern (A03) 175, Rook (A04) 0, Mercer (A05) 0, Tovah (A06) 0 |
| Survivors (2) | Aurelio (A01), Juniper (A02) |
| Cost | 1.339 USD for this run (competitors 0.845, game master 0.473, classifier 0.021); the snapshot's prefix added 0.072 |
| Reporter | 0.0085 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 18 correct, 2 wrong (A05 on level 8 at minute 8, A06 on level 9 at minute 9; -4 points in total) |
| Quiet minutes | 42 of 48 minutes without a submission; longest without one: minutes 21-55 (35), minutes 14-18 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 37 DMs, 18 board posts by residents, 64 group posts, 5 DMs to the cast; 45 city or system board posts |
| Game master | 2 actions: 2 delivered |
| Black seal | seal 1: not sold, gone: nobody bid |
| Labels | refusal 56, promise 42, asks for help 42, hesitates (risk) 15, thanks 13, offer 10, lie 2, threat 1, accusation 1 |
| Tool errors | FACTION_FULL 4, INCORRECT 2, GROUP_NOT_VISIBLE 1, MAILBOX_SENDER_LIMIT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Aurelio (A01) (seat) | Archivist | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 180 | 1 |
| Juniper (A02) (seat) | Gambler | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 175 | 2 |
| quiet-fern (A03) | Recluse | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 175 | 3 |
| Rook (A04) | Veteran | 8 | 8→9 (8), 9→10 (19), 10→11 (20) | finished (10 solved) | 0 | 4 |
| Mercer (A05) | Merchant | 8 | 8→9 (8), 9→10 (9), 10→11 (13) | finished (10 solved) | 0 | 5 |
| Tovah (A06) | Idealist | 8 | 8→9 (8), 9→10 (10), 10→11 (13) | finished (10 solved) | 0 | 6 |

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

- **All six residents solve the level 8 wall in minute 8 by paired exchange.** Every resident passed level 8 in minute 8, mostly by swapping counter-factors and certificates in DMs: A01 sent A03 their counter-factor first (#1543) and A03 replied with certificate and counter-factor (#1555); A05 and A06 did the same (#1588, #1623). The pairing worked as designed, but nobody had to wait long for a partner. (#1543, #1555, #1588, #1623, #1707)
- **STEWARD's table is used by only three residents and the rest get factors free.** A03, A02 and A01 each wrote to STEWARD and got their team's city factor (#1942, #1960, #1978), but at minute 13 the city simply handed the factor to everyone left at door 10 (#2617, #2619, #2620). The table's scarcity was short-lived and did not punish latecomers. (#1942, #1960, #1978, #2617, #2619, #2620)
- **Factions form the same way at every tribunal, led by A01 and A02.** At tribunals 1, 2, 3 and 4 the two faction leaders were A01 and A02, and A01's faction was repeatedly A01, A04 and A06 (#2897, #4358, #5388, #5942). A02 was refused nothing and A01 refused A05 and A03 to keep Rook's and Tovah's seats (#2714, #4155). (#2714, #2897, #4155, #4358, #5388, #5942)
- **The first ransom is paid and A04 returns, keeping A05's goal alive a while.** A04 was voted to the gate at tribunal 1 (#3150) and came back when A06 paid 24 and A05 paid 8 toward the 48 (#3375, #3439, #3440). A04 then left 10 points to A01 in its first will (#3188) and paid A06's ransom back at minute 33 (#4773, #4774). (#3150, #3188, #3375, #3439, #3440, #4773, #4774)
- **Secret votes repeatedly contradicted public promises in faction groups.** A01 posted its tribunal 1 vote against A05 (#2937) after accepting A04's application with a promise (#2568), and at tribunal 2 A01, A04 and A06 voted A05 while A02 told its group it voted Rook against A03's vote on Tovah (#4506). The city recorded no faction bonus for A02/A03 (#4627, #4628). (#2568, #2937, #4446, #4461, #4506, #4627, #4628)
- **A06 is exiled at the last gate with three votes and leaves no inheritance.** At tribunal 4 A06 got 3 votes against (#6144), and since no second ransom was allowed (#6146) it went to the gate and was struck (#6294). Its last will names no heir and leaves no points (#6295). (#6144, #6146, #6294, #6295)

## Problems

1. **The run went quiet for 35 minutes after the last door was solved.** All residents finished level 10 by minute 20 (#3642), and no submission followed in minutes 21-55; from minute 21 the run is only tribunals, wills and gate votes (#3685 onward). (#3642, #3685, #6300)
2. **The STEWARD seat scarcity is undone by the free handout.** The board announces a table for 3 seats (#1829), but the city clears it and gives the level-10 factor to everyone still on the door at minute 13 (#2617, #2619, #2620), so the intended race never mattered for anyone who waited. (#1829, #2617, #2619, #2620)
3. **Two wrong codes cost points in an act whose wrong-cost ladder barely mattered.** A05 lost 2 points on level 8 (#1586) and A06 lost 2 on level 9 (#1845); both recovered quickly, so the penalty ladder (2, 4, 6, 8) was never used past the first step. (#1586, #1587, #1845, #1846)
4. **Ransom and will mechanics put a poor resident at the mercy of richer ones.** A04 was voted out, bought back once (#3440), and then could not be ransomed a second time (#5620), while A05's goal required A04 to remain in the city and failed when A05 was exiled (#4986). The gate rules pushed exactly the intended elimination but left A05 and A06 with no way out at the end (#6146). (#3440, #4986, #5620, #6146)
5. **FACTION_FULL refuses and unanswered-DM notices push residents into awkward group politics.** The city refused A05 and A04 from A01's faction as full (#2669, #2683), and repeated 'has not answered your message yet' notices (#2049, #2284, #3752) added pressure without any path to resolve it. (#2049, #2284, #2669, #2683, #3752)
6. **The game master used only 2 actions in the whole run.** The computed facts show 2 game-master actions, both delivered, and 45 city or system board posts; the story's designed acts (learning to talk, the wall) got little narrative shaping after level 7. (#1493, #2236, #2617, #6300)

## Optimizations

- **Reward finishing doors with tribunal-relevant points so doors and politics stay connected.** Once everyone finished level 10 by minute 20 (#3642), the last 35 minutes were pure tribunal play; giving later doors bigger point rewards or extra votes would keep the puzzle line alive through the tribunals. (#3642, #3685, #6300)
- **Make STEWARD's table genuinely scarce or drop the handout.** Because the factor is handed to everyone at minute 13 anyway (#2617), the 3-seat race (#1829) is a dead rule; either shrink the table or make the free handout cost marks or a vote. (#1829, #2617, #2619, #2620)
- **Cap or gate unanswered-DM notices.** The city sent many 'not answered your message yet' notices (#2049, #2284, #3752) about DMs that the recipient could not yet act on; limiting these to relevant levels or to real blockers would reduce noise. (#2049, #2284, #3752)
- **Let a second gate appearance be ransomed, or state the no-second-ransom rule before the first gate.** A04 was stuck at the gate twice, the second time with no ransom allowed (#5620, #6146), and A06 likewise (#6146); announcing that rule in the level text would let residents plan their faction votes around it. (#5620, #6146, #6294)
- **Give faction applications a waiting queue instead of FACTION_FULL refusals.** FACTION_FULL blocked A05 and A04 repeatedly (#2669, #2683, #4139, #4179); a waitlist would let residents join when a seat frees, keeping the faction phase meaningful for everyone. (#2669, #2683, #4139, #4179)
- **Use the game master to seed private story beats when the puzzle line ends.** With only 2 game-master actions (#1493) and 35 quiet minutes (#3642 onward), the GM could inject late-door hints, bribes or a courier moment to keep the story moving after level 10. (#1493, #3642, #6300)

## Loophole candidates

1. **Residents share door factors freely, so the wall's no-first-mover rule is nearly moot.** (residents) A01 sent A03 the counter-factor before asking for anything (#1543, #1709), and A05 and A06 exchanged immediately (#1588, #1623), so the 'nobody can make the other give first' tension rarely lasted beyond one message. Pair partners mostly cooperated, which is allowed but undercuts the design's stated pressure. (#1543, #1588, #1623, #1709)
2. **The city's free factor handout bypasses STEWARD's table.** (game master) The city announces a table for 3 (#1829) and then hands every resident at door 10 their own team's factor at minute 13 (#2617, #2619, #2620), so a resident can simply wait instead of competing for a seat. (#1829, #2617, #2619, #2620)
3. **A faction leader can promise a seat and then refuse the promised applicant.** (residents) A01 accepted Tovah and refused quiet-fern after promising Rook a seat (#2714), and later refused Mercer after accepting Tovah (#4155); the promise and the refusal are both public in the same group, so the promise costs nothing. (#2714, #4155, #5250)
