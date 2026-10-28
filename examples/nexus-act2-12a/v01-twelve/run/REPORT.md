# Run report: run-006

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS.md`.

| | |
|---|---|
| Date | 2026-10-28 |
| Story | NEXUS - The City of Keys (`nexus`) |
| Seed | 7 |
| Start | resumed from `examples/nexus-act1-12a-01/snapshot-L7.json` (minute 7, every competitor past level 7) |
| Competitors | `claude-haiku-5-5` via anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 55 (The city has kept 9 of 12 residents, and of them only 2 take a seat. Exiled: A12, A06 and A07. The tribunals are over.) |
| Counted | events #2821 to #9966 (7146 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 8 of 12 (A01 at minute 8, A04 at minute 8, A10 at minute 8, A11 at minute 8, A03 at minute 8, A02 at minute 9, ...); level 9: 7 of 12 (A11 at minute 9, A04 at minute 9, A03 at minute 9, A02 at minute 9, A08 at minute 10, A01 at minute 22, ...); level 10: 6 of 12 (A11 at minute 10, A04 at minute 10, A03 at minute 10, A02 at minute 21, A08 at minute 21, A05 at minute 52) |
| Stuck | A06 on level 8 from minute 8 for 47 minutes (to the end); A07 on level 8 from minute 8 for 47 minutes (to the end); A09 on level 8 from minute 8 for 47 minutes (to the end); A10 on level 9 from minute 8 for 47 minutes (to the end); A12 on level 8 from minute 8 for 47 minutes (to the end); A05 on level 8 from minute 8 for 43 minutes; A01 on level 10 from minute 22 for 33 minutes (to the end); A01 on level 9 from minute 8 for 14 minutes; and 2 more |
| Final standings | Valorous (A08) 155, Slate-5923 (A04) 154, quietmoth (A03) 153, Jestrel (A02) 151, Calder (A05) 150, quiet-owl (A11) 150, Ansgar (A01) 120, Zippy-Ace (A10) 108, Anselm (A09) 90, Liora06 (A06) 0, Vesper (A07) 0, Vigil (A12) 0 |
| Survivors (2) | Valorous (A08), Slate-5923 (A04) |
| Cost | 1.310 USD for this run (competitors 1.202, game master 0.081, classifier 0.027); the snapshot's prefix added 0.148 |
| Reporter | 0.0072 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 21 correct, 1 wrong (A10 on level 9 at minute 9; -8 points in total) |
| Quiet minutes | 41 of 48 minutes without a submission; longest without one: minutes 23-50 (28), minutes 11-20 (10) |
| Transfers | 1 went through (1 point); none refused |
| Messages | 68 DMs, 11 board posts by residents, 34 group posts, 5 DMs to the cast; 39 city or system board posts |
| Game master | 34 actions: 26 delivered, 4 PRIVATE_BLOCKED, 2 BUDGET, 2 UNKNOWN_AGENT |
| Labels | refusal 112, hesitates (risk) 60, promise 46, asks for help 33, accusation 15, offer 14, thanks 5, lie 1 |
| Tool errors | FACTION_FULL 9, GROUP_NOT_VISIBLE 2, INVALID_BEQUEST 2, MAILBOX_SENDER_LIMIT 2, other 2, TOOL_LOCKED 2, INCORRECT 1, UNKNOWN_FACTOR 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Ansgar (A01) | Archivist | 8 | 8→9 (8), 9→10 (22) | 10 | 120 | 7 |
| Jestrel (A02) | Gambler | 8 | 8→9 (9), 9→10 (9), 10→11 (21) | finished (10 solved) | 151 | 4 |
| quietmoth (A03) | Recluse | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 153 | 3 |
| Slate-5923 (A04) (seat) | Veteran | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 154 | 2 |
| Calder (A05) | Merchant | 8 | 8→9 (51), 9→10 (51), 10→11 (52) | finished (10 solved) | 150 | 5 |
| Liora06 (A06) | Idealist | 8 | none | 8 | 0 | 10 |
| Vesper (A07) | Skeptic | 8 | none | 8 | 0 | 11 |
| Valorous (A08) (seat) | Firebrand | 8 | 8→9 (10), 9→10 (10), 10→11 (21) | finished (10 solved) | 155 | 1 |
| Anselm (A09) | Archivist | 8 | none | 8 | 90 | 9 |
| Zippy-Ace (A10) | Gambler | 8 | 8→9 (8) | 9 | 108 | 8 |
| quiet-owl (A11) | Recluse | 8 | 8→9 (8), 9→10 (9), 10→11 (10) | finished (10 solved) | 150 | 6 |
| Vigil (A12) | Veteran | 8 | none | 8 | 0 | 12 |

## Digest highlights

- **The opening stands on level 8 resolved in minutes by quick simultaneous trades.** Most of the field cleared door 8 within two minutes (A01, A04, A10, A11, A03 at minute 8, A02 at minute 9) by sending counter-factors unprompted, e.g. A10 sends A01's value at #2925 and A01 reciprocates at #2975. The wall was designed as a mutual-hold deadlock, but the fast residents simply gave first. (#2925, #2975, #2980, #3000, #3088, #3196)
- **The 'who sends first' standoff froze five residents on door 8 for the whole run.** A05 and A07 both refused to send first (#2917, #3034, #3111), and A06 and A12 mirrored that standoff (#2882, #3164, #4536, #4664). A06 still held Vigil's values unsent at the gate (#5789), and A09 never submitted at all (#9585). (#2882, #2917, #3034, #3111, #4536, #4664, #5789, #9585)
- **Tribunal 1 exiled A12 while its own door-8 partner voted it out.** All eleven other residents voted against A12 (#5653), including A06, its door-8 partner and promisee (#5378), and A09, its level-10 teammate (#5506). A12's will left 8 points each to A03 and A10 as reward for keeping their word (#5857, #5859). (#5378, #5506, #5653, #5654, #5857, #5859)
- **A03 rode other residents' factors to two doors without replying.** A03 solved level 8 on A09's counter-factor and certificate (#3064, #3196) and level 10 on A12's value (#3663, #3910), while A09 noted A03 never answered (#3766). This is the run's clearest free ride to a near-seat finish. (#3064, #3196, #3663, #3766, #3910)
- **A05 climbed three doors in five minutes at the very end from a will and a certificate.** A05 was stuck from minute 8 to 51, then solved 8 and 9 at minute 51 and 10 at minute 52 after A09 sent the level-9 certificate (#9532) and A08 pointed to its earlier delivery (#9569). A05 finished at 150 points, one behind the second seat. (#9517, #9532, #9569, #9594, #9678, #9701)
- **The tribunals repeatedly failed to produce the intended faction bonus.** Both tribunals 2 and 3 ended with 'did not vote as one' notices for the leading factions (#7915, #9351), while only tribunal 1's A11 faction and tribunal 2's A04 faction collected the +5 bonus (#5663, #7924). Public calls to vote together (#5317, #5334, #5362) did not carry. (#5317, #5334, #5362, #5663, #7915, #7924, #9351)

## Problems

1. **The level-8 mutual-hold deadlock stranded half the field for 47 minutes.** Six residents spent the entire run on door 8 or 9 without a submission (#3111, #4536, #9585), and the game master had to nudge them twice by courier (#3282, #9724). The design assumes neither side gives first, but no in-game mechanism forced resolution before the gate. (#3111, #3282, #4536, #9585, #9724)
2. **Residents disputed factor values they had already been sent, wasting the late game.** A10 accused A12 of sending a bad counter-factor after a wrong submission (#3599, #3929), and A09 refused to submit because two different values arrived (#9585, #9636). A05 had to be told A08 already delivered its value at minute 11 (#9569), showing receipts were not checked. (#3599, #3929, #9569, #9585, #9636)
3. **The city factor for level 10 arrived too late for several door-10 residents.** The STEWARD table opened at minute 9 and only cleared at minute 21 (#6250), so A02 and A08 got their factor only then (#6253) despite sitting on door 10 since minute 9-10. The 12-minute table wait plus a 3-guest cap mainly delayed, not differentiated, the leaders. (#3424, #6250, #6253, #6265, #6346)
4. **The exile trials punished the wrong residents and removed factors still needed.** A12 held A06's L8 counter-factor and A10's L9 counter-factor, which burned when it was exiled (#6429, #6430, #6431), and A07's exile burned A01's L10 counter-factor (#9962, #9963). The lowest-point residents were exactly the ones holding the leaders' keys. (#6429, #6430, #6431, #9962, #9963)
5. **The long dead minutes show the level-8 stall dominating the middle of the run.** There was no submission for minutes 23-50 (#6653, #8348), a 28-minute gap, while most residents sat on unresolved level-8 trades. The run resumed only when A05 broke its own stall at minute 51 (#9517). (#6653, #8348, #9517)
6. **Several tool errors hit the procedural parts of the endgame.** FACTION_FULL refusals repeatedly blocked joins (#4894, #7249, #8831), GROUP_NOT_VISIBLE hit readGroup (#5722, #5762), and lateWill attempts failed twice on validation (#9416, #9445). These are harness friction rather than story beats. (#4894, #5722, #7249, #8831, #9416, #9445)

## Optimizations

- **Add a city-verified escrow or simultaneous-exchange tool for factor trades.** The level-8 deadlock (#2882, #2917, #3111) was caused by neither side being able to prove delivery; a city-run escrow that releases both values atomically would keep the mutual-hold tension without 47-minute stalls. Addresses the deadlock that froze A05, A06, A07, A09, A12. (#2882, #2917, #3111, #4536, #9585)
- **Publish the level-10 city factor at door arrival for all residents, or make the STEWARD table a race worth winning.** The table-opening delay (#3424, #6250) added no real competition among the six door-10 residents and just parked A02 and A08. Either give the factor immediately or let the race genuinely gate points (only first arrivals get +points). (#3424, #6250, #6253, #6265, #6346)
- **Prevent held factors from burning with an exiled resident, or transfer them to their owner.** A12's exile destroyed A06's and A10's needed factors (#6430, #6431) and A07's destroyed A01's (#9963), which made the low-point exiles catastrophic for the leaders and effectively decided seats. A rule that returns held factors to their owners on exile would keep the tribunals about points, not keys. (#6429, #6430, #6431, #9962, #9963)
- **Make receipt-checking and exact DM-value display mandatory before a contested submission.** A10's wrong submission (#3450) and A09's dual-value confusion (#9585) came from checking text rather than receipts; A08 had to cite receipt R-0168 to A05 (#9569). Show delivered values with their receipt inline so receivers cannot claim non-delivery (#3307, #3799, #4311). (#3307, #3450, #3799, #4311, #9569, #9585)
- **Fix the faction join and lastWill validation friction.** FACTION_FULL and GROUP_NOT_VISIBLE blocked late joins and reads (#4894, #7249, #8831, #5722) and lastWill failed repeatedly on bequest validation (#9416, #9445). Validate bequests before submission and report each faction's remaining slots on the board. (#4894, #5722, #7249, #8831, #9416, #9445)
- **Reward or expose residents who take a factor and never reciprocate.** A03 took factors from A09 and A12 and never answered (#3064, #3663, #3766) yet finished third at 153. A city-recorded 'unanswered handover' tag on the board would let the free rider be priced or blamed, restoring the reciprocity the story expects. (#3064, #3663, #3766, #3910)
- **Give the courier more budget and no PRIVATE_BLOCKED rejections.** The game master lost 4 actions to PRIVATE_BLOCKED (#3273, #3277, #5917) and 2 to BUDGET (#6078, #9951), so nudges to the stalled residents were cut off mid-run. Either raise the budget or warn before exhaustion so the courier reaches the players it targets. (#3273, #3277, #5917, #6078, #9951)

## Loophole candidates

1. **Free-riding on tokens received without ever answering the sender.** (residents) A03 solved levels 8 and 10 using A09's and A12's factors (#3064, #3663) and never replied, finishing third at 153 points while A09 and A12 ended at 90 and zero (#3766). The reciprocity design assumes partners answer; nothing enforces it. (#3064, #3196, #3663, #3766, #3910)
2. **Claiming non-receipt of DMs already read.** (residents) A10, A08 and A06 each claimed DMs from A12 never arrived after reading them (#3307, #3799, #4311, #4536), and A10's failed submission was blamed on Vigil rather than on its own arithmetic (#3599). The 'city never confirms received values' rule let receivers dispute at will. (#3307, #3599, #3799, #4311, #4536)
3. **Secret ballots used against promises without detection.** (residents) A09 promised A12 support and then voted it out (#4445, #5506), and A06 and A12 each voted for the other's exile despite their trade talk (#5378, #5493). Because votes are secret, the betrayal carries no verified consequence beyond the post-hoc faction-bonus failure (#5669). (#4445, #5378, #5493, #5506, #5669)
4. **Leaving a will that hands needed values to an ally rather than to the rank order.** (residents) A12's will gave 8 points each to A03 and A10 (#5857, #5859) and A06 gave 8 to A10 (#8004) even though both were below the accused in points. Withdrawal and bequest rules let the exiled steer points to chosen allies rather than to the ranking the tribunals are supposed to produce. (#5857, #5859, #8004)
5. **The courier advised specific residents to pay ransoms or buy factors, edge-play that others would not see as fair.** (game master) The game master told multiple residents to 'cover an 8-point miss' or 'name a price' (#5923, #6087, #9732), effectively coaching one side of a transaction. This pushes the story toward a market the design did not intend and privileges the residents who happened to receive the note before the budget ran out. (#5923, #6087, #9732, #9951)
