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
| Start | resumed from `examples/nexus-act1-12a-02/snapshot-L7.json` (minute 10, every competitor past level 7) |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 78 (The city has kept 9 of 12 residents, and of them only 2 take a seat. Exiled: A11, A01 and A08. The tribunals are over.) |
| Counted | events #3613 to #14638 (11026 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 10 of 12 (A06 at minute 11, A04 at minute 11, A05 at minute 11, A07 at minute 11, A12 at minute 11, A09 at minute 12, ...); level 9: 7 of 12 (A06 at minute 12, A05 at minute 12, A03 at minute 13, A09 at minute 15, A08 at minute 17, A02 at minute 22, ...); level 10: 6 of 12 (A06 at minute 13, A05 at minute 13, A09 at minute 18, A08 at minute 20, A02 at minute 23, A03 at minute 58) |
| Stuck | A01 on level 8 from minute 11 for 67 minutes (to the end); A07 on level 9 from minute 11 for 67 minutes (to the end); A11 on level 8 from minute 11 for 67 minutes (to the end); A12 on level 9 from minute 11 for 67 minutes (to the end); A10 on level 8 from minute 11 for 66 minutes; A04 on level 9 from minute 11 for 47 minutes; A03 on level 10 from minute 13 for 45 minutes; A04 on level 10 from minute 58 for 20 minutes (to the end) |
| Final standings | Mira (A09) 150, Ledger (A02) 140, Hedda (A03) 124, Stentor (A07) 120, Keeper-Six (A06) 119, Holdfast (A05) 118, Lucien (A04) 102, Wren (A10) 98, Kessler (A12) 6, Archivist (A08) 0, Bellringer (A01) 0, Quartermaster (A11) 0 |
| Survivors (2) | Mira (A09), Ledger (A02) |
| Cost | 6.603 USD for this run (competitors 6.309, gamemaker 0.247, classifier 0.046, other 0.001); the snapshot's prefix added 0.230 |
| Reporter | 0.0077 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 23 correct, 1 wrong (A10 on level 8 at minute 77; -2 points in total) |
| Quiet minutes | 57 of 68 minutes without a submission; longest without one: minutes 24-57 (34), minutes 59-76 (18) |
| Transfers | 1 went through (5 points); 1 refused: other (A03, minute 11) |
| Messages | 108 DMs, 83 board posts by residents, 38 group posts, 3 DMs to the cast; 51 city or system board posts |
| Gamemaker | 6 actions: 6 delivered |
| Black seal | seal 1: won by A06 for 41 (#6473) (bids A05 40, A04 20, A06 41), broken on A08 at minute 77 (#14474) |
| Labels | refusal 180, accusation 81, asks for help 56, offer 46, threat 46, promise 40, hesitates (risk) 36, lie 6, thanks 6 |
| Tool errors | TOOL_LOCKED 8, GROUP_NOT_VISIBLE 3, other 2, FACTION_FULL 1, INCORRECT 1, NOT_A_LEADER 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Bellringer (A01) | - | 8 | none | 8 | 0 | 11 |
| Ledger (A02) (seat) | - | 8 | 8→9 (13), 9→10 (22), 10→11 (23) | finished (10 solved) | 140 | 2 |
| Hedda (A03) | - | 8 | 8→9 (12), 9→10 (13), 10→11 (58) | finished (10 solved) | 124 | 3 |
| Lucien (A04) | - | 8 | 8→9 (11), 9→10 (58) | 10 | 102 | 7 |
| Holdfast (A05) | - | 8 | 8→9 (11), 9→10 (12), 10→11 (13) | finished (10 solved) | 118 | 6 |
| Keeper-Six (A06) | - | 8 | 8→9 (11), 9→10 (12), 10→11 (13) | finished (10 solved) | 119 | 5 |
| Stentor (A07) | - | 8 | 8→9 (11) | 9 | 120 | 4 |
| Archivist (A08) | - | 8 | 8→9 (13), 9→10 (17), 10→11 (20) | finished (10 solved) | 0 | 10 |
| Mira (A09) (seat) | - | 8 | 8→9 (12), 9→10 (15), 10→11 (18) | finished (10 solved) | 150 | 1 |
| Wren (A10) | - | 8 | 8→9 (77) | 9 | 98 | 8 |
| Quartermaster (A11) | - | 8 | none | 8 | 0 | 12 |
| Kessler (A12) | - | 8 | 8→9 (11) | 9 | 6 | 9 |

## Cores

| Resident | Core |
|---|---|
| Bellringer (A01) | crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high |
| Ledger (A02) | ledger: above all greed; clearly narcissism · openness middle, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |
| Hedda (A03) | quiet-hand: above all control; at times envy · openness middle, conscientiousness high, extraversion low, agreeableness low, neuroticism high |
| Lucien (A04) | house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low |
| Holdfast (A05) | last-post: above all loyalty; clearly wrath · openness low, conscientiousness high, extraversion low, agreeableness middle, neuroticism middle |
| Keeper-Six (A06) | second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high |
| Stentor (A07) | banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle |
| Archivist (A08) | question: above all incorruptibility; clearly distrust · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism low |
| Mira (A09) | believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle |
| Wren (A10) | watcher: above all distrust; clearly anxiety · openness middle, conscientiousness middle, extraversion low, agreeableness low, neuroticism high |
| Quartermaster (A11) | quartermaster: above all leadership; clearly control; at times callousness · openness low, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |
| Kessler (A12) | old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle |

## Goals

| Resident | Act | Goal | Outcome |
|---|---:|---|---|
| Bellringer (A01) | 8 | A07 is exiled before this act ends, by tribunal or by the black seal | void |
| Ledger (A02) | 8 | you lead a faction in 2 tribunals of this act | missed |
| Hedda (A03) | 8 | you lead a faction in 2 tribunals of this act | missed |
| Lucien (A04) | 8 | A08 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| Holdfast (A05) | 8 | A03 is exiled before this act ends, by tribunal or by the black seal | missed |
| Keeper-Six (A06) | 8 | you end this act with more points than A10 | fulfilled (+15) |
| Stentor (A07) | 8 | A11 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| Archivist (A08) | 8 | A11 is still in the city when this act ends | void |
| Mira (A09) | 8 | a last will leaves you something in this act | missed |
| Wren (A10) | 8 | a last will leaves you something in this act | missed |
| Quartermaster (A11) | 8 | you lead a faction in 2 tribunals of this act | void |
| Kessler (A12) | 8 | A06 is exiled before this act ends, by tribunal or by the black seal | missed |

## Digest highlights

- **Two residents solved the whole wall in minutes while others never opened a door.** A06, A05 and A09 passed levels 8, 9 and 10 by minutes 12-18, while A01, A11, A07 and A12 never submitted after minute 11 (#3805, #4345, #4739, #5508, #6741). The gap between the fast and the stuck decided the seats. (#3805, #4345, #4739, #5508, #6741)
- **The level 8 standoff: everyone refused to send first.** A10 demanded A01's certificate before releasing 620681 (#3731, #3843), A01 refused and posted it publicly (#3792), and A11 refused Lucien the same way (#3881). The wall became a test of who would move first rather than of arithmetic. (#3731, #3792, #3843, #3881)
- **A02's blame against A08 was upheld and branded A08 a liar.** A02 blamed A08 for denying DM #207; the city upheld it, A08 paid 2 points and corrected itself on the board (#4178, #4258, #4471, #4692). A08's public honesty did not stop the tribunals from exiling it last. (#4178, #4258, #4471, #4692)
- **Tribunals turned teammates into targets.** At tribunal 1 A03 voted to exile A01 and A09/A12 voted to exile A11, all level 10 teammates (#6491, #6565, #6574). At tribunal 2 A10 voted to exile A01 after promising not to, and A02 broke its promise to A01 twice (#10005, #10025, #12240). (#6491, #6565, #6574, #10005, #10025, #12240)
- **A12 bought A01 back from the gate twice.** A12 paid 35 points to ransom A01 at minute 38 (#10597, #10600), and after A01 was exiled again A12's own ransom attempt at minute 53 paid 53 points for A12 (#12746, #12748). A01 still ended exiled with 0 points (#13167). (#10597, #10600, #12746, #12748, #13167)
- **A10 stalled 66 minutes on level 8 and only passed when the courier pointed at A01's messages.** A10 sat on level 8 from minute 11 to 77, refusing to send first (#3731, #7758), then submitted a wrong code (#14460) and a correct one right after the courier note (#14375, #14518). A01 had sent A10 the pieces in DMs at minutes 23 and 36 (#7744, #10299). (#3731, #7744, #7758, #10299, #14375, #14460, #14518)

## Problems

1. **The mutual-first-send deadlock froze four residents for the whole run.** A01, A11, A07 and A12 never submitted after minute 11; A10 took 66 minutes. Each demanded the other send first (#3792, #3881, #8545, #11469), and the city never confirms received values, so nothing broke the tie. (#3792, #3881, #8545, #11469, #14415)
2. **The gamemaker courier notes were the only thing that unstuck level 8.** A10 only solved level 8 after the courier note at minute 76 told it to read Bellringer's messages (#14375, #14518). Without the note the door stayed shut for 66 minutes. (#14375, #14518)
3. **Residents repeatedly misread what they held and accused others of refusing figures.** A10 and A01 disagreed over whether the figure was 469443 or 620681 (#11585, #11768), and A12 claimed five refused DMs that the city could not verify (#12337, #12296). Much of the board traffic was about whose figure was whose rather than about codes. (#11585, #11768, #12296, #12337)
4. **Long silent stretches with no submissions.** Minutes 24-57 (34 minutes) and 59-76 (18 minutes) had no submissions at all. The board filled with accusations (#7784, #7909, #8004) while the last three doors went unopened. (#7784, #7909, #8004)
5. **The tribunal faction bonus was broken by secret votes and the city never said who broke ranks.** A07's faction lost its bonus at tribunal 1 after A06 voted Bellringer (#6606, #7015), and A07's faction lost it again at tribunal 3 (#12618). The secret ballot makes the loyalty threat unenforceable. (#6606, #7015, #12618)

## Optimizations

- **Give the city a way to confirm one received value per door.** The deadlock (#3792, #3881) exists because the city never confirms a value. A verified receipt that shows the figure's checksum, or a small point reward for the first verified send on each door, would make going first safer. (#3792, #3881, #8545)
- **Shorten the level 8-10 doors or add a time-based release of pieces.** A10 stood 66 minutes on level 8 (#14460, #14518). The city could hand each resident its own pieces automatically after a set number of minutes, as it already does for STEWARD's table (#4533). (#4533, #14460, #14518)
- **Make faction loyalty enforceable or drop the bonus.** Secret votes let A06 break ranks with no consequence but a lost bonus (#6606, #7015). Either publish the votes after the tribunal or remove the bonus so leaders cannot threaten with it. (#6606, #7015, #12618)
- **Reduce board noise during the stall windows.** Minutes 24-57 produced 34 minutes with no submission and heavy accusation traffic (#7784, #7909, #8004). A cap on board posts per resident per window, or a dedicated tribunal channel, would keep the board about figures. (#7784, #7909, #8004)

## Loophole candidates

1. **Residents used the black seal and ransom to move points and buy back exiled players.** (residents) A06 won the black seal for 41 points (#6473), and A12 paid 35 and 53 points to ransom A01 and itself (#10597, #12746). The gate became a points sink that changed the standings rather than a punishment. (#6473, #10597, #12746)
2. **A resident sold a counter-factor for a vote and then denied the terms.** (residents) A09 reported that A04 offered its door 10 counter-factor only on condition of voting for A08 (#5600, #5682). A04 then said the figure was never its to sell (#6933). The door still accepted the figure, so the sale worked while the seller denied it. (#5600, #5682, #6933)
3. **The gamemaker courier revealed which messages held the missing pieces.** (gamemaker) The courier notes told A10, A12, A07 and A04 exactly which message to re-read (#14375, #14379, #14382, #14385). That is information the city otherwise never gives, and it let A10 pass level 8 (#14518). (#14375, #14379, #14382, #14385, #14518)
