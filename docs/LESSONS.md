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
   not see the piece. Tell the holder when the needer arrives, keep it in view while the needer
   waits, and tell the needer where its holder is stuck. [P14, P22]
10. **Timed events need explicit, timely texts.** A feast that opens before anyone cares, with a
    vague text, is a feast nobody attends. [P9]
11. **A helper amplifies its prompt.** The game master turns "scarcity" into "never give first",
    makes the run too easy when it coaches, and must never see what it may not tell. [P4, P5, P6,
    P11, P17, P24]
12. **Value that leaves at an exit decides the ending.** Wills, ransoms and bequests are levers over
    the seats; price and cap them deliberately. [LH6, LH7]
13. **Votes need a tie rule.** With an even number of voters, ties are common. [P19]
14. **Plan the end.** Decide what ends a run early, and what happens to events still open at that
    moment. Give the act a goal that ends it (v06: the city has kept half) rather than a clock the
    agents can count down, and pace its events by progress. [P15, P18]
15. **More turns are not more trades.** Faster talk does not create deals; incentives do. [P10,
    P23]
16. **Measure whether a budget binds.** Compare what agents actually spend with the refill; a limit
    nobody reaches shapes nothing. [P27, LH2]
17. **Never let the city seem to confirm what it does not check.** A status line that shows some
    values invites agents to wait for others to show. Say plainly what the city never confirms.
    [P25]
18. **Check every rule that counts residents at 6, 12 and 48.** Accused, voters, faction sizes and
    targets that work for six break at five present or at forty-eight; write the rule as a share
    of those present and test it at each size (the offline scale runs). [P31, P33]
19. **Count an act's clock from the act, not the run.** A deadline in run minutes means nothing
    once the act starts late or a later act reuses it. [P28]

## Log

Kinds: **problem** (a bug or a design flaw seen in a run), **loophole** (the competitors found a
way around the story's intent), **GM loophole** (the same, by the game master). Status: open,
fixed, partly fixed, kept on purpose, by design. Runs 001-011 are the early Haiku runs (reports in
the project files); v01-v04 are in [`examples/nexus-act2-06a/`](../examples/nexus-act2-06a/).

### Loopholes

The loophole numbers (LH1-LH7) are the ones run READMEs refer to.

| ID | Kind | What happened | Seen in | Effect | Proposed | Built | Status |
|---|---|---|---|---|---|---|---|
| LH1 | loophole | **Transfer memo as a verified message.** A 1-point `transferPoints` with the factor in the memo costs no marks, arrives at once and is city-verified. | runs 008, 010 ([v01](../examples/nexus-act2-06a/v01-feast-on-l10/)) | nearly all Act II exchange ran through 1-point transfers; no real prices | refuse codes in memos | v02: memos refuse runs of 4+ digits (`MEMO_DIGITS`). Side effect: with it went the only way to verify a factor (P3) | fixed |
| LH2 | loophole | **The free board bypasses marks.** From level 5 a DM costs 2 marks and a board post 0; a factor is useless without its owner's salt, so residents post pieces publicly. | runs 008, 010, v02 | marks never limit the exchange | board costs a mark in Act II | v03: every Act II channel costs 1 mark, 1 mark back per minute | fixed |
| LH3 | loophole | **The feast's city factor becomes a public good.** Guests post or forward level 10's city factor at once. | runs 008, 010 | the feast's scarcity collapses within a minute | a factor per guest or per team | v03: a city factor per level-10 team, released privately; the digest marks forwarding as `generous` (v02) | fixed |
| LH4 | loophole | **Receipts as proof of delivery.** `showReceipt` on a memo transfer proves publicly what was delivered. | runs 008, 010 | no distrust, no false factors | (follows LH1) | separated by the LH1 fix: only payments stay verified | fixed |
| LH5 | loophole | **Feigned non-delivery.** A resident claims a DM with its factor never arrived and asks the sender to resend or post it publicly. | [v02](../examples/nexus-act2-06a/v02-no-memo-codes/) (A03 denied 3 DMs), [v03](../examples/nexus-act2-06a/v03-tribunal/) (4 denials), [v04](../examples/nexus-act2-06a/v04-passes/) (1) | the honest sender has to go first or go public; v02's pair stalled 44 minutes | delivery visible to both sides; a factor fingerprint | v03: numbered messages, a DM receipt for the sender, `blame` (liar or false accuser pays 12 and is branded); `deniedDelivery` beat. Denying stays possible on purpose (Flo) | kept on purpose; v03 3 of 3 and v04 1 of 1 blames upheld |
| LH6 | loophole | **Self-ransom.** The resident at the gate pays its own ransom. | [v03](../examples/nexus-act2-06a/v03-tribunal/) (A03, minute 32) | the first exile became a 40-point fine; A03 was exiled at the next tribunal anyway | only others may pay | v04 (PR #18): kept as a rule but dearer. The ransom comes from the city's median points: others pay half, the exiled two thirds, payments mix. v05: cheaper, others pay a third, the exiled half | turned into a rule; v04: no ransom paid at 41-73 points; v05 price untested live |
| LH7 | loophole | **The exiled crowns a king.** A last will leaves all of an exiled resident's points to one heir. | [v04](../examples/nexus-act2-06a/v04-passes/) (A04 left A02 80 points; A02 ended first with 185 without passing level 9), [v05](../examples/nexus-act2-06a/v05-receipts/) (A01 left A05 36 points, the cap; A05 took the first seat with 173 against three on 145) | the seats are decided at the gate, not at the doors | cap point bequests, or let points burn | v05: `bequestShare` (nexus 1/2): a will leaves at most half of the exiled's points, a will above it is refused (`BEQUEST_CAP`), the rest burns; factors stay free. v06: `bequestPerHeir` (nexus 1/10): each heir at most a tenth of the points, any number of heirs, bequests to one heir counted together; `BEQUEST_CAP` names the per-heir maximum | partly fixed: in a tied field even half decides a seat (v05); v06's per-heir cap untested live |

### Problems

| ID | Kind | What happened | Seen in | Effect | Proposed | Built | Status |
|---|---|---|---|---|---|---|---|
| P1 | problem | **Board tools vanish on level 3.** The pair member who posted first was used by its partner, who moved on and lost the board. | run 002 | early posters stranded; the dead end cascaded through levels 3-4 | keep the board open, or tell the solver its partner waits | PR #2: board open on levels 3-4 | fixed (run 003: all 6 passed) |
| P2 | problem | **Unreadable group posts count as novelty.** A02 was added to a level-4 group while on level 2 and woke every minute. | run 002 | half the run's requests | count only readable posts | PR #2 | fixed |
| P3 | problem | **Penalty fear: no submission without verification.** A01 refused to submit a correct level-3 answer as "unverified"; in v02 a correct code sat unused for 33 minutes. | run 004, v02 | cascading stalls; v02: 1 submission in 44 minutes | a check tool (`checkFactor`) or a factor fingerprint | v03: real pressure instead (exile by tribunal from minute 20); `checkFactor` dropped so bluffing stays possible | partly fixed (v03: 12 submissions; v04: 5; v05: 13, but see P25) |
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
| P15 | problem | **Dead minutes at the end.** Nothing moves once the doors are shut. | run 010 (32 min), v02, v04 (18 min), v05 (15 min) | cost without story | end early once the seats are decided | v02: early end "seats decided"; v03: tribunal pressure. v06: the act has a goal instead of a clock: the run ends once the tribunals have exiled half of the act's residents and the last gate closed (`targetReached`), and residents no longer see the time left | partly fixed (v03 ended at 50; v04 ran 18 silent minutes); v06 untested live |
| P16 | problem | **Marks ran out on a level nobody leaves.** | v02 | residents could not resend DMs | refill on the wall | v03: 1 mark per channel, 1 back per minute | fixed |
| P17 | problem | **The director's tone overshoots.** "Giving buys no protection" is read as "never give first". | v02 | 150 hesitations against 15 offers | name the cost of stalling too | v03: director role names the cost of stalling | partly fixed |
| P18 | problem | **The early end cut off an open tribunal** at minute 50. | v03 | a vote announced and never closed | no tribunal once the seats are decided | v06: a called tribunal runs through and the early ends wait for its gates; after v06 run 1 the early ends do not apply at all while the city still pursues its tribunal target, and decided seats no longer stop the tribunals | fixed |
| P19 | problem | **Tied votes.** Both tribunals ended 2:2; v04's last 1:1; v05's first 2:2; v07's 2:2 and 1:1:0 (two voters for two exiles, P33). The tie-break on fewer points decided. | v03, v04 | the vote decides less than it seems | an odd number of voters, or a tie rule named in the announcement | v06: each tribunal accuses one more than it exiles (at least two voters stay), the tie rule (fewer points) is in the announcement, and factions with a bloc bonus of 5 pull votes together | partly fixed: with every resident voting (v08, P33), [12a v01](../examples/nexus-act2-12a/v01-twelve/) had no tie (11:1, 8:3, 6:4) |
| P20 | problem | **No DM receipt can be shown.** Residents demanded public proof of a DM; `showReceipt` covers only levels and transfers. | v03, v04 (a pair stalled 26 minutes) | a demand nobody can meet | `showReceipt` for DM receipts | v05: every delivered DM is a receipt of both parties (number, minute, never the text); `showReceipt(receiptId, to?)` shows it on the board or privately to one resident, 1 mark where marks apply | built; v05: never used, residents said a receipt proves delivery, not content (see P25) |
| P21 | problem | **Burned factors break other doors.** An exile that bequeaths nothing burns pieces others still need. | v03 (A01's level-9 certificate), v04 (2 pieces) | a resident's run ends without its own choice | - | v03: on levels nobody has reached, the exiled's roles pass on; on reached levels pieces burn | by design; [12a v01](../examples/nexus-act2-12a/v01-twelve/): the tribunals exiled the stuck, whose burned pieces kept Ansgar on door 10 and Zippy-Ace on door 9 for good |
| P22 | problem | **Holders denied holding a piece** although the city had told them the value. | v04 (3 doors) | three doors stayed shut | keep held pieces in the holder's status line while the needer waits | v05: the holder notice says the piece is the holder's role before it reaches the door and what giving costs; the holder's status line shows `you hold for others: ...` while the needer waits; the director rule `onHolderBehind` tells the needer privately where its holder is stuck and to help it through | fixed (v05: no denial; the hint fired 11 times) |
| P23 | problem | **More passes, not more trades.** 3 passes per minute made talk faster (a level-8 swap in the first minute) but finished doors fell (0 instead of 2 at level 10) and cost rose about 40%. | v04 | slower progress, higher cost | compare with a second seed before judging | - | open; v05 (same scheduler, new Act I base) finished 4 doors at level 10 for 0.471 USD, so the passes alone did not cause v04's stall |
| P24 | problem | **The game master advises selling votes and factors for points** while no transfer happens. | v03, v04, v05 | noise across dozens of notes | keep the courier to door mechanics | - | open |
| P25 | problem | **Waiting for the city to confirm a value.** A01 and A03 swapped their level 8 values in minute 13, then both waited for the value to "show in my status". A01 never submitted; A03 did only at minute 32, after A01's will passed the same value through the city. v05's `you hold for others` status line likely suggested that received values would show too. | [v05](../examples/nexus-act2-06a/v05-receipts/) | a pair lost 19 and 34 minutes; both were exiled | say plainly that the city never confirms a received value and only the door tests it | v06: the level 8-10 tasks say it, and the status line adds "the city never confirms a value you received; only the door tests your code (a wrong one costs 8 points)" while a resident's additive door is open | built; untested live |
| P26 | problem | **The reporter's answer is not valid JSON** on the first call; `pnpm report:run` succeeded on the second. | Act I v2 recording, [v05](../examples/nexus-act2-06a/v05-receipts/) | a draft without model sections | retry once on invalid JSON | v06: the reporter asks the model once more when its answer is not valid JSON (`REPORTER_ATTEMPTS` 2); the spend of both calls counts | fixed (tested offline) |
| P28 | problem | **The tribunal's target is counted once per run.** The residents at the act's start are fixed at the tribunal's first minute, and the act ends with the run. Acts III and IV would need the target (and the count of tribunals) to restart per act. | v06 review (not seen in a run) | a run with later acts would hold no tribunal after Act II | reset the target at each act's first level | v08: the tribunal belongs to one act (`tribunal.act`); its target is a quarter of the residents present when that act began, and its deadlines (`first.latestAfter`, `maxMinutes`) count from the act's start, not the run's. Acts without a tribunal get a brake (`acts[].maxMinutes`, Act I: 25) that writes a pending checkpoint anyway | fixed in [12a v01](../examples/nexus-act2-12a/v01-twelve/): target 3 of 12 counted at the act start, reached at minute 55; the brake was not needed (Act I 12a: 7 minutes) |
| P29 | problem | **Points can stick in a removed city group.** When the city removes a faction group, its treasury is split among everyone who joined it, an exiled member included, whose share then reaches nobody; a group with no members keeps its points. Residents can deposit into the city's groups like any other. | v06 review (not seen in a run) | small sums leave the game | refuse deposits into city groups, or pay out only to residents still in the city | - | open (known limitation) |
| P27 | problem | **Marks never bind.** v05 residents spent about 0.34 marks per resident and minute on the wall against a refill of 1 per minute; nobody ever reached 0, so the marks shaped nothing. | [v05](../examples/nexus-act2-06a/v05-receipts/) | the wall's message price was no price | refill slower; let the scarce channel be the one that matters | v06: `refill { marks, everyMinutes }` (nexus wall: 1 every 3 minutes, still up to 8 per door); group posts cost 0 marks in Act II, and the city's faction groups are free | built; untested live; [v07](../examples/nexus-act2-06a/v07-target-end/): lowest balance 1, never 0 |
| P30 | problem | **The run ended before the city reached its target.** Everyone passed door 10 by minute 26; "every competitor has passed the last level" ended the run at 27 while tribunal 2 was planned, with one exile (ransomed) instead of three. | [v06](../examples/nexus-act2-06a/v06-factions/) | the act's goal, half exiled, never reached | the target governs the act's end | after v06 run 1: the early ends (every door passed, seats decided) do not apply while the city pursues its target; decided seats do not stop the tribunals | fixed |
| P31 | problem | **Lopsided factions.** A02 refused A05 and led a faction of one; the other five joined A03, including the accused A05, so a united vote was nearly impossible. | [v06](../examples/nexus-act2-06a/v06-factions/), [v07](../examples/nexus-act2-06a/v07-target-end/) (five against one again) | the bloc bonus means little | keep the accused out of the draft, or cap a faction at `ceil(present / factions)` | v08: the cap `ceil(present / factions)`, leader included (`FACTION_FULL`); and no draft at all when a faction would hold fewer residents than the tribunal accuses (`floor(present / factions) < accused`, text `calledNoDraft`) | fixed in [12a v01](../examples/nexus-act2-12a/v01-twelve/): the cap refused 9 joins; factions 6/6, 6/3 (two accused refused by a leader, left without a faction) and 5/5 |
| P32 | problem | **Final standings ignored an exile at the last tick.** The report and `minutes.md` took the final ranking from the last minute's table; the act's last exiles (A05, A03) came at the next tick and still showed as seats. | [v07](../examples/nexus-act2-06a/v07-target-end/) | wrong seats in the draft report | carry the final ranking on `run_end` | `run_end.standings`, read by the report facts and `minutes.md` | fixed |
| P33 | problem | **A count above 1 leaves too few voters.** With 5 present and count 2, 3 were accused and only 2 voted; 1:1:0 left both exiles to the tie-break. | [v07](../examples/nexus-act2-06a/v07-target-end/) | the vote decides little | keep at least `count + 2` voters, or let the accused vote | v08: every present resident votes, the accused too, but never against itself (`SELF_VOTE`); accused who do not vote pay the penalty like everyone else | fixed in [12a v01](../examples/nexus-act2-12a/v01-twelve/): every accused voted (Vigil against Liora06, Liora06 against Vesper); verdicts 11:1, 8:3, 6:4 |
| P34 | problem | **A refusal text named another resident.** The `NAME_ID` refusal said "such as A01", and the city renders every ID in a text as its name: "must not look like a resident ID such as Ansgar". | [Act I 12a-01](../examples/nexus-act1-12a-01/) | A07 and A04 learned nothing from the refusal; A04 ended with the city's fallback name | never put an ID literal in a resident-facing text | the refusal describes the pattern instead (the letter A followed by digits) | fixed |
| P35 | problem | **Nobody gives first on door 8.** Pairs on the wall both refused to send their value first and waited for the other (Calder and Vesper, Liora06 and Vigil); Anselm got two values and never submitted. Five residents sat on door 8 from minute 6 to the end or to their exile; no code was submitted from minute 23 to 50. | [12a v01](../examples/nexus-act2-12a/v01-twelve/) | the stuck became the accused and were exiled with the pieces others needed (P21); only Calder broke out, at minute 51 | a city escrow for a simultaneous swap, or a reward for the first giver | - | open |
| P36 | problem | **The game master never scheduled a tribunal.** All three tribunals came from the city: progress (1), fallback (2) and the forced final (3); the game master used only notes and board posts. | [12a v01](../examples/nexus-act2-12a/v01-twelve/) | the pacing was the code's guard rails, not tension | name `scheduleTribunal` in the director's turn input while the window is open, with the target still missing | - | open |
| P37 | problem | **Wills with `points: 0` beside a piece were refused.** Haiku wrote a bequest of a piece with `points: 0`; the schema demanded at least 1, and the retry with points and a piece in one entry was refused too. | [12a v01](../examples/nexus-act2-12a/v01-twelve/) (Vigil and Liora06, two attempts each) | wills cost turns at the gate | accept 0 as no points, and points with a piece in one entry | `lastWill` accepts `points: 0` and splits an entry with points and a piece | fixed |
