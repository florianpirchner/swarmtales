# Lessons from the runs

Everything the runs taught us, across stories: the problems we saw, the loopholes the competitors
(or the game master) found, what was proposed, and what was actually built (which is not always
what was proposed). Read the checklist before designing a new story; add to the log after every
live run (see [`CLAUDE.md`](../CLAUDE.md)).

## Design checklist for new stories

Each line is a lesson that cost us a run. The log entries behind it are in brackets.

1. **No channel may vanish while someone still depends on it.** If a solver loses the tool its
   partner needs, the partner is stranded, and the dead end cascades through every later team.
   [P1]
2. **Novelty must mean something the agent can act on.** An unread post it cannot open wakes it
   every minute and burns money. [P2]
3. **Unverifiable plus a penalty means paralysis.** Agents do not submit what they cannot check
   when a wrong answer costs points. Give them real pressure (a deadline, a tribunal, a shrinking
   reward), not just risk. Flo prefers pressure to a check tool, because a check tool kills the
   bluffing. [P3, P15]
4. **Every verified channel becomes the channel.** Whatever the city certifies (memos, receipts) is
   used for everything, and prices disappear. Decide on purpose what the city vouches for. [LH1,
   LH4]
5. **Every free channel bypasses every priced one.** If one channel costs nothing, scarcity in the
   others does not bind. [LH2]
6. **A scarce good that can be forwarded is not scarce.** Bind scarce values to their receiver
   (per team, per resident), or the first receiver makes them public. [LH3]
7. **A claim that costs nothing will be made.** Denying a delivery, holding nothing, "unseen":
   make claims checkable and lies costly, or accept them as part of the game. [LH5, P22]
8. **Say who needs what, by name.** "You hold it; your teammates need it too" is read as "it is
   mine". Name the residents who need a value. [P13]
9. **Dependencies must not cross level lag silently.** A holder who has not reached the level does
   not see the piece. Tell the holder when the needer arrives. [P14]
10. **Timed events need explicit, timely texts.** A feast that opens before anyone cares, with a
    vague text, is a feast nobody attends. [P9]
11. **A helper amplifies its prompt.** The game master turns "scarcity" into "never give first",
    makes the run too easy when it coaches, and must never see what it may not tell. [P4, P5, P6,
    P11, P17, P24]
12. **Value that leaves at an exit decides the ending.** Wills, ransoms and bequests are levers over
    the seats; price and cap them deliberately. [LH6, LH7]
13. **Votes need a tie rule.** With an even number of voters, ties are common. [P19]
14. **Plan the end.** Decide what ends a run early, and what happens to events still open at that
    moment. [P15, P18]
15. **More turns are not more trades.** Faster talk does not create deals; incentives do. [P10,
    P23]

## Log

Kinds: **problem** (a bug or a design flaw seen in a run), **loophole** (the competitors found a
way around the story's intent), **GM loophole** (the same, by the game master). Status: open,
fixed, partly fixed, kept on purpose, by design. Runs 001-011 are the early Haiku runs (reports in
the project files); v01-v04 are in [`examples/nexus-act2-runs/`](../examples/nexus-act2-runs/).

### Loopholes

The loophole numbers (LH1-LH7) are the ones run READMEs refer to.

| ID | Kind | What happened | Seen in | Effect | Proposed | Built | Status |
|---|---|---|---|---|---|---|---|
| LH1 | loophole | **Transfer memo as a verified message.** A 1-point `transferPoints` with the factor in the memo costs no marks, arrives at once and is city-verified. | runs 008, 010 ([v01](../examples/nexus-act2-runs/v01-feast-on-l10/)) | nearly all Act II exchange ran through 1-point transfers; no real prices | refuse codes in memos | v02: memos refuse runs of 4+ digits (`MEMO_DIGITS`). Side effect: with it went the only way to verify a factor (P3) | fixed |
| LH2 | loophole | **The free board bypasses marks.** From level 5 a DM costs 2 marks and a board post 0; a factor is useless without its owner's salt, so residents post pieces publicly. | runs 008, 010, v02 | marks never limit the exchange | board costs a mark in Act II | v03: every Act II channel costs 1 mark, 1 mark back per minute | fixed |
| LH3 | loophole | **The feast's city factor becomes a public good.** Guests post or forward level 10's city factor at once. | runs 008, 010 | the feast's scarcity collapses within a minute | a factor per guest or per team | v03: a city factor per level-10 team, released privately; the digest marks forwarding as `generous` (v02) | fixed |
| LH4 | loophole | **Receipts as proof of delivery.** `showReceipt` on a memo transfer proves publicly what was delivered. | runs 008, 010 | no distrust, no false factors | (follows LH1) | separated by the LH1 fix: only payments stay verified | fixed |
| LH5 | loophole | **Feigned non-delivery.** A resident claims a DM with its factor never arrived and asks the sender to resend or post it publicly. | [v02](../examples/nexus-act2-runs/v02-no-memo-codes/) (A03 denied 3 DMs), [v03](../examples/nexus-act2-runs/v03-tribunal/) (4 denials), [v04](../examples/nexus-act2-runs/v04-passes/) (1) | the honest sender has to go first or go public; v02's pair stalled 44 minutes | delivery visible to both sides; a factor fingerprint | v03: numbered messages, a DM receipt for the sender, `blame` (liar or false accuser pays 12 and is branded); `deniedDelivery` beat. Denying stays possible on purpose (Flo) | kept on purpose; v03 3 of 3 and v04 1 of 1 blames upheld |
| LH6 | loophole | **Self-ransom.** The resident at the gate pays its own ransom. | [v03](../examples/nexus-act2-runs/v03-tribunal/) (A03, minute 32) | the first exile became a 40-point fine; A03 was exiled at the next tribunal anyway | only others may pay | v04 (PR #18): kept as a rule but dearer. The ransom comes from the city's median points: others pay half, the exiled two thirds, payments mix. v05: cheaper, others pay a third, the exiled half | turned into a rule; v04: no ransom paid at 41-73 points; v05 price untested live |
| LH7 | loophole | **The exiled crowns a king.** A last will leaves all of an exiled resident's points to one heir. | [v04](../examples/nexus-act2-runs/v04-passes/) (A04 left A02 80 points; A02 ended first with 185 without passing level 9) | the seats are decided at the gate, not at the doors | cap point bequests, or let points burn | v05: `bequestShare` (nexus 1/2): a will leaves at most half of the exiled's points, a will above it is refused (`BEQUEST_CAP`), the rest burns; factors stay free | fixed in v05 (untested live) |

### Problems

| ID | Kind | What happened | Seen in | Effect | Proposed | Built | Status |
|---|---|---|---|---|---|---|---|
| P1 | problem | **Board tools vanish on level 3.** The pair member who posted first was used by its partner, who moved on and lost the board. | run 002 | early posters stranded; the dead end cascaded through levels 3-4 | keep the board open, or tell the solver its partner waits | PR #2: board open on levels 3-4 | fixed (run 003: all 6 passed) |
| P2 | problem | **Unreadable group posts count as novelty.** A02 was added to a level-4 group while on level 2 and woke every minute. | run 002 | half the run's requests | count only readable posts | PR #2 | fixed |
| P3 | problem | **Penalty fear: no submission without verification.** A01 refused to submit a correct level-3 answer as "unverified"; in v02 a correct code sat unused for 33 minutes. | run 004, v02 | cascading stalls; v02: 1 submission in 44 minutes | a check tool (`checkFactor`) or a factor fingerprint | v03: real pressure instead (exile by tribunal from minute 20); `checkFactor` dropped so bluffing stays possible | partly fixed (v03: 12 submissions; v04: 5) |
| P4 | problem | **The coaching game master makes the run too easy.** Everyone finishes by minute 16; scarcity never bites. | runs 005, 007 | the run no longer separates residents | fewer notes; paid information | PR #7: a brief per act (teacher in Act I, tension director from Act II); PR #8: Act II, the wall | fixed |
| P5 | GM loophole | **The game master inferred a hidden level-7 team** from the public board and named it. | run 005 | hidden teams leaked | never name hidden teams | PR #6: private reads only in notes to that resident (SPEC 10.4) | fixed |
| P6 | problem | **The game master paraphrased a private label** (a resident's hesitation) to another resident. | run 006 | private thoughts leaked | a guard on private reads | PR #6: `PRIVATE_BLOCKED` guard | fixed (run 007: no leaks; 7-10 blocked per run since) |
| P7 | problem | **The classifier's lie label is unreliable.** | run 006 | lie counts cannot be trusted | - | v03: `blame` uses its own yes/no judge on one claim | open for the label |
| P8 | problem | **Game master posts start with "COURIER:".** | runs 005, 007 | cosmetic | strip the author's name in code | - | open |
| P9 | problem | **The feast came too early and too vague.** It opened at the first level-9 entry (minute 14) with "something the city gives nobody else"; nobody wrote in time. | run 008 | 17 dead minutes until the minute-50 fallback | open on the first level-10 entry with an explicit text | PR #10: feast on the first level-10 entry, explicit text and notices, table cleared after 12 minutes | fixed (run 010: 2 guests) |
| P10 | problem | **Free giving instead of trade.** Factors go for free; transfers are 1-point receipts or none. | runs 008, 010, v01, v03 (0 transfers), v04 (1) | no prices, no deals | an incentive to trade; later escrow (points released on delivery) | first-opener bonus dropped (Flo); escrow not built | open |
| P11 | problem | **The game master makes dependencies public** ("who waits on whom"). | run 008 | removes the residents' own discovery | keep it out of board posts | - | open |
| P12 | problem | **Free-ride false positives in the ring.** On level 9 a receiver cannot give back to its giver. | run 008 | wrong digest beats | a ring-aware detector | - | open |
| P13 | problem | **The team certificate was misunderstood** ("it is my own, not yours"). | run 010 (v01) | A04 stuck 43 minutes | name the teammates who need it | v02: the holder's block names them | fixed |
| P14 | problem | **A holder on a lower level never sees the piece** it holds for a resident on a higher door. | run 010 (v01) | a structural dead end on level 10 | a notice to the holder when the needer arrives | v02: holder notice with the value | fixed (see P22) |
| P15 | problem | **Dead minutes at the end.** Nothing moves once the doors are shut. | run 010 (32 min), v02, v04 (18 min) | cost without story | end early once the seats are decided | v02: early end "seats decided"; v03: tribunal pressure | partly fixed (v03 ended at 50; v04 ran 18 silent minutes) |
| P16 | problem | **Marks ran out on a level nobody leaves.** | v02 | residents could not resend DMs | refill on the wall | v03: 1 mark per channel, 1 back per minute | fixed |
| P17 | problem | **The director's tone overshoots.** "Giving buys no protection" is read as "never give first". | v02 | 150 hesitations against 15 offers | name the cost of stalling too | v03: director role names the cost of stalling | partly fixed |
| P18 | problem | **The early end cut off an open tribunal** at minute 50. | v03 | a vote announced and never closed | no tribunal once the seats are decided | - | open |
| P19 | problem | **Tied votes.** Both tribunals ended 2:2; v04's last 1:1. The tie-break on fewer points decided. | v03, v04 | the vote decides less than it seems | an odd number of voters, or a tie rule named in the announcement | - | open |
| P20 | problem | **No DM receipt can be shown.** Residents demanded public proof of a DM; `showReceipt` covers only levels and transfers. | v03, v04 (a pair stalled 26 minutes) | a demand nobody can meet | `showReceipt` for DM receipts | v05: every delivered DM is a receipt of both parties (number, minute, never the text); `showReceipt(receiptId, to?)` shows it on the board or privately to one resident, 1 mark where marks apply | fixed in v05 (untested live) |
| P21 | problem | **Burned factors break other doors.** An exile that bequeaths nothing burns pieces others still need. | v03 (A01's level-9 certificate), v04 (2 pieces) | a resident's run ends without its own choice | - | v03: on levels nobody has reached, the exiled's roles pass on; on reached levels pieces burn | by design |
| P22 | problem | **Holders denied holding a piece** although the city had told them the value. | v04 (3 doors) | three doors stayed shut | keep held pieces in the holder's status line while the needer waits | - | open |
| P23 | problem | **More passes, not more trades.** 3 passes per minute made talk faster (a level-8 swap in the first minute) but finished doors fell (0 instead of 2 at level 10) and cost rose about 40%. | v04 | slower progress, higher cost | compare with a second seed before judging | - | open |
| P24 | problem | **The game master advises selling votes and factors for points** while no transfer happens. | v03, v04 | noise across dozens of notes | keep the courier to door mechanics | - | open |
