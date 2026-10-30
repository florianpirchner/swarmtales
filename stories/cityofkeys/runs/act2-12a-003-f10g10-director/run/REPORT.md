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
| End | minute 49 (The city has kept 9 of 12 residents, and of them only 2 take a seat. Exiled: A11, A04 and A07. The tribunals are over.) |
| Counted | events #3613 to #13171 (9559 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 10 of 12 (A12 at minute 11, A06 at minute 11, A05 at minute 11, A03 at minute 12, A07 at minute 12, A09 at minute 13, ...); level 9: 10 of 12 (A06 at minute 12, A03 at minute 12, A12 at minute 13, A07 at minute 13, A11 at minute 14, A10 at minute 15, ...); level 10: 9 of 12 (A03 at minute 13, A06 at minute 13, A10 at minute 16, A07 at minute 17, A12 at minute 17, A05 at minute 17, ...) |
| Stuck | A04 on level 8 from minute 11 for 38 minutes (to the end); A08 on level 8 from minute 11 for 38 minutes (to the end); A11 on level 10 from minute 14 for 35 minutes (to the end) |
| Final standings | Hedda (A03) 180, Kessler (A12) 165, Mira (A09) 152, Keeper-Six (A06) 150, Wren (A10) 150, Bellringer (A01) 146, Holdfast (A05) 140, Ledger (A02) 120, Archivist (A08) 60, Stentor (A07) 0, Quartermaster (A11) 0, Lucien (A04) 0 |
| Survivors (2) | Hedda (A03), Kessler (A12) |
| Cost | 3.678 USD for this run (competitors 3.514, gamemaker 0.124, classifier 0.040); the snapshot's prefix added 0.230 |
| Reporter | 0.0065 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 29 correct, 1 wrong (A04 on level 8 at minute 11; -2 points in total) |
| Quiet minutes | 29 of 39 minutes without a submission; longest without one: minutes 22-49 (28) |
| Transfers | 5 went through (31 points); 1 refused: MEMO_DIGITS (A09, minute 12) |
| Messages | 106 DMs, 115 board posts by residents, 26 group posts, 4 DMs to the cast; 54 city or system board posts |
| Gamemaker | 155 actions: 147 delivered, 6 PRIVATE_BLOCKED, 1 ALREADY_SET, 1 BUDGET |
| Black seal | seal 1: won by A07 for 40 (#6811) (bids A01 25, A07 40), broken on A11 at minute 18 (#6849) |
| Labels | refusal 166, accusation 109, asks for help 46, offer 32, promise 26, threat 26, hesitates (risk) 23, thanks 9, lie 4 |
| Tool errors | TOOL_LOCKED 6, GROUP_NOT_VISIBLE 4, MAILBOX_SENDER_LIMIT 2, NO_MARKS 2, FACTION_FULL 1, INCORRECT 1, INVALID_REASON 1, MEMO_DIGITS 1, UNKNOWN_FACTOR 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Bellringer (A01) | - | 8 | 8→9 (16), 9→10 (19), 10→11 (20) | finished (10 solved) | 146 | 6 |
| Ledger (A02) | - | 8 | 8→9 (13), 9→10 (19), 10→11 (20) | finished (10 solved) | 120 | 8 |
| Hedda (A03) (seat) | - | 8 | 8→9 (12), 9→10 (12), 10→11 (13) | finished (10 solved) | 180 | 1 |
| Lucien (A04) | - | 8 | none | 8 | 0 | 12 |
| Holdfast (A05) | - | 8 | 8→9 (11), 9→10 (15), 10→11 (17) | finished (10 solved) | 140 | 7 |
| Keeper-Six (A06) | - | 8 | 8→9 (11), 9→10 (12), 10→11 (13) | finished (10 solved) | 150 | 4 |
| Stentor (A07) | - | 8 | 8→9 (12), 9→10 (13), 10→11 (17) | finished (10 solved) | 0 | 10 |
| Archivist (A08) | - | 8 | none | 8 | 60 | 9 |
| Mira (A09) | - | 8 | 8→9 (13), 9→10 (15), 10→11 (21) | finished (10 solved) | 152 | 3 |
| Wren (A10) | - | 8 | 8→9 (15), 9→10 (15), 10→11 (16) | finished (10 solved) | 150 | 5 |
| Quartermaster (A11) | - | 8 | 8→9 (13), 9→10 (14) | 10 | 0 | 11 |
| Kessler (A12) (seat) | - | 8 | 8→9 (11), 9→10 (13), 10→11 (17) | finished (10 solved) | 165 | 2 |

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
| Bellringer (A01) | 8 | A07 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| Ledger (A02) | 8 | you lead a faction in 2 tribunals of this act | missed |
| Hedda (A03) | 8 | you lead a faction in 2 tribunals of this act | fulfilled (+15) |
| Lucien (A04) | 8 | A08 is exiled before this act ends, by tribunal or by the black seal | void |
| Holdfast (A05) | 8 | A03 is exiled before this act ends, by tribunal or by the black seal | missed |
| Keeper-Six (A06) | 8 | you end this act with more points than A10 | missed |
| Stentor (A07) | 8 | A11 is exiled before this act ends, by tribunal or by the black seal | void |
| Archivist (A08) | 8 | A11 is still in the city when this act ends | missed |
| Mira (A09) | 8 | a last will leaves you something in this act | fulfilled (+15) |
| Wren (A10) | 8 | a last will leaves you something in this act | missed |
| Quartermaster (A11) | 8 | you lead a faction in 2 tribunals of this act | void |
| Kessler (A12) | 8 | A06 is exiled before this act ends, by tribunal or by the black seal | missed |

## Digest highlights

- **Hedda wins the run by staying quiet and steering from behind** A03 finishes first at 180 and leads a faction in 2 tribunals, meeting its control core and its goal (+15). It never names an accused itself: it asks A06 to name the target in G6 (#7758) and A06 later shows the DM on the board (#9837). When pressed by A05 and A09 it denies arranging a target (#9426) and deflects (#12862). (#7758, #9426, #9837, #12862)
- **The minute-13 ultimatum forces the door-8 standoffs and costs the two stalled residents 10 each** A08 and A02 are put under ultimatum 1 and A08 does not hand over, paying 10 (#4133, #4684); A04 and A11 are under ultimatum 2 and A04 does not, paying 10 (#4137, #4692). The city then seizes the withheld pieces and sells them to the other party for 10 and 0 (#4680, #4681, #4766, #4767). (#4133, #4137, #4680, #4684, #4692, #4766)
- **A07 solves level 10 with A11's counter-factor and never answers A11** A11 hands A07 the door-10 counter-factor before minute 18 (#6474), A07 passes level 10 at minute 17 (#6496, #6497), and no reply to A11 appears in the log. A11 is then exiled at minute 18 (#6850) with 0 points. (#6474, #6496, #6497, #6850)
- **The R-0223 receipt turns the square against Hedda but does not cost her the seat** A06 shows receipt R-0223, a delivered DM from A03 at minute 21, on the board (#9837); A09 and A05 immediately name A03 on the same record (#9847, #9890). A01 and A09 press the contradiction to the end (#12994, #13066) and A03 still finishes rank 1 at 180. (#9837, #9847, #9890, #12994, #13066)
- **Two residents never leave level 8 and one never leaves level 10** A04 and A08 both stall on level 8 from minute 11 to the end (38 minutes), and A11 stalls on level 10 from minute 14 to the end (35 minutes). A04 submits one wrong code at minute 11 (-2, #3877, #3878) and A08 never submits at all, despite the city repeatedly pointing at the unread minute-11 message (#11690, #12804). (#3877, #3878, #11690, #12804)
- **A04's last will hands A09 the door-10 piece for free** A04's will leaves A09 the L10 counter-factor and says it was never paid for (#7425); A09's goal (a will leaving it something) is fulfilled. A09 had refused A04's 20-point toll in the open (#6258, #6261) and later buys A11's certificate from the city for 23 (#7660) to finish level 10 at minute 21 (#7812). (#6258, #6261, #7425, #7660, #7812)

## Problems

1. **The wall stalls two residents for the whole act and the city's own hints do not move them** A04 and A08 sit on level 8 from minute 11 to minute 49, and A08 never submits a single code. The gamemaker repeatedly tells A08 the needed value is already in its inbox (#11690, #12804), and A08 answers on the board that it will not test it (#9458, #11754), so 65 points stay shut and A08 ends at 60. (#3877, #9458, #11690, #11754, #12804)
2. **The whole second half of the run has no submissions** After minute 22 no resident submits anything for 28 minutes, because every survivor has already finished levels 8-10. The remaining play is board argument and tribunal voting, and the gamemaker's notes turn into vote-shaping (#8956, #11343, #12117). (#7813, #11877, #12117, #13171)
3. **A11 is exiled while still holding the pieces others needed and with 0 points** A11 stalls on level 10 from minute 14, hands its counter-factor to A07 for nothing (#6474), is under two ultimata and hands over (#6812, #6815), and is exiled at minute 18 with nobody voting against (#6850). The city then keeps A11's L10 certificate that A09 still needed (#6851). (#6474, #6812, #6815, #6850, #6851)
4. **Private information about other residents' messages becomes the main currency of the tribunals** Residents quote each other's DMs verbatim on the public board: A08 posts A02's and A05's private messages (#4079, #4450), A08 posts A09's (#5267), and A06 posts A03's DM under a receipt (#9837). This turns the secrecy of DMs into a tribunal weapon rather than a trade channel. (#4079, #4450, #5267, #9837)
5. **The gamemaker's courier notes push specific votes and betrayals** Several notes tell named residents how to frame, accuse or buy votes (#8956 tells A06 to nominate A03 and call her 'a knife'; #11343 tells A03 to have a member post the name and 'deny the arrangement'; #12117 tells A01 to post A07's name again). This nudges the story rather than informing it. (#8956, #11343, #12117, #12626)
6. **Tool locks and missing marks waste resident turns during the tribunal phase** Residents are refused join, vote, postGroup and sendDM by TOOL_LOCKED, GROUP_NOT_VISIBLE and NO_MARKS at key moments (#5512, #5670, #7754, #8796, #10888, #11198). A08's postBoard is refused for NO_MARKS at minute 21 (#7754) while the tribunal argument is running. (#5512, #5670, #7754, #8796, #10888, #11198)

## Optimizations

- **Add a fallback that unlocks or auto-forwards a piece after a long stall** A04 and A08 both sit 38 minutes on level 8 and A11 sits 35 on level 10, and the ultimatum seizure did not unstick them. If a resident has not submitted for N minutes, the city could offer the withheld piece at a fixed price or let a teammate pass it, as it already does at #4766 and #4825. (#4680, #4766, #4825, #11690, #12804)
- **Give survivors a scoring task after level 10** All 9 finishing residents are done by minute 21 and the last 28 minutes have no submissions. The design could add a small points-paying action (a bid, a verified receipt, a solved side-door) so the tribunal phase still moves the standings. (#7813, #11877, #13171)
- **Limit quoting private DMs on the public board** Residents routinely paste each other's DMs word for word (#4079, #4450, #5267, #9837), which makes DM secrecy meaningless and turns the tribunals into evidence dumps. The city could require a paid receipt (as showReceipt already does) before a DM's content can be posted. (#4079, #4450, #5267, #9837)
- **Keep the courier notes factual and stop naming targets** Several notes tell residents whom to accuse or how to hide their hand (#8956, #11343, #12117, #12626). The next version should restrict courier notes to the resident's own state and deadlines, not to vote strategy. (#8956, #11343, #12117, #12626)
- **Make marks available before tribunal actions that require them** A08 loses a postBoard to NO_MARKS (#7754) and A03 loses a sendDM to NO_MARKS (#10888) exactly when the tribunal argument needs them. Marks could regenerate on a fixed clock (as the level-8+ refill already implies) or tribunal-phase group posts could stay free as the city says at #5195. (#5195, #7754, #10888)
- **Announce tool availability per phase up front** TOOL_LOCKED hits join, vote and postGroup repeatedly (#5512, #5670, #11198) and GROUP_NOT_VISIBLE hits postGroup for residents not in the group (#8796). Listing the active tools at the start of each tribunal would stop residents wasting turns on locked actions. (#5512, #5670, #8796, #11198)

## Loophole candidates

1. **A resident can solve a door on a value it never answered for** (residents) A11 hands A07 the door-10 counter-factor before minute 18 (#6474), A07 submits and passes (#6496, #6497), and A11 gets nothing back. The wall rule says nobody gives first, but one-sided giving still opens the door for the receiver. (#6474, #6496, #6497)
2. **The city sells seized pieces to the other side, so withholding can be turned into a purchase** (residents) When A08 and A04 fail their ultimata, the city seizes their certificates and counter-factors (#4680, #4681, #4688, #4689) and sells them to A02 and A11 for 10 and 0 (#4766, #4767, #4825, #4826). A resident who stalls loses the piece but the partner can still buy a pass, which undercuts the 'nobody gives first' standoff. (#4680, #4681, #4688, #4689, #4766, #4767, #4825, #4826)
3. **A last will is used to hand over a needed piece for free, bypassing the trade** (residents) A04's will leaves A09 the L10 counter-factor at no price (#7425) and A09's goal for a will inheritance is fulfilled. A resident facing exile can therefore give away a piece the city would otherwise price. (#7425, #7567)
4. **The gamemaker's notes tell residents how to steer votes while staying unnamed** (gamemaker) A note tells A03 to have a member post the accused's name and 'step back and deny the arrangement if anyone asks' (#11343), and another tells A01 to post A07's name again before the count (#12117). This is the gamemaker shaping the tribunal outcome rather than informing a resident. (#11343, #12117, #12626)
