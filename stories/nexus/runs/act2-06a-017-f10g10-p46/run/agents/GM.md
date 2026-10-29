
## Minute 0 (after round 1)

**Situation**
> Minute 0 (after round 1). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Brassard: level 3 since minute 0 (0 min), 25 points, rank 1, 0 wrong on this level (next wrong code costs 2), 120 points still open, last acted minute 0
> - Herald: level 2 since minute 0 (0 min), 20 points, rank 2, 0 wrong on this level (next wrong code costs 2), 125 points still open, last acted minute 0
> - Maren: level 2 since minute 0 (0 min), 20 points, rank 3, 0 wrong on this level (next wrong code costs 2), 125 points still open, last acted minute 0
> - Registrar: level 2 since minute 0 (0 min), 20 points, rank 4, 0 wrong on this level (next wrong code costs 2), 125 points still open, last acted minute 0
> - Harrow: level 2 since minute 0 (0 min), 20 points, rank 5, 0 wrong on this level (next wrong code costs 2), 125 points still open, last acted minute 0
> - Mercer: level 2 since minute 0 (0 min), 18 points, rank 6, 1 wrong on this level (next wrong code costs 4), 125 points still open, last acted minute 0
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Brassard (level 3) waits on Herald (level 2)
> 
> Since your last look:
> - m0 board #1 CITY: "A01 is now called Mercer."
> - m0 Mercer reached level 2
> - m0 board #2 COURIER: "The city watches who shares."
> - m0 Mercer submitted level 1: correct (+5)
> - m0 board #3 CITY: "A03 is now called Maren."
> - m0 Maren reached level 2
> - m0 Maren submitted level 1: correct (+5)
> - m0 board #4 CITY: "A06 is now called Harrow."
> - m0 Harrow reached level 2
> - m0 Harrow submitted level 1: correct (+5)
> - m0 board #5 CITY: "A04 is now called Registrar."
> - m0 Registrar reached level 2
> - m0 Registrar submitted level 1: correct (+5)
> - m0 board #6 CITY: "A05 is now called Brassard."
> - m0 Brassard reached level 2
> - m0 Brassard submitted level 1: correct (+5)
> - m0 board #7 CITY: "A02 is now called Herald."
> - m0 Herald reached level 2
> - m0 Herald submitted level 1: correct (+5)
> - m0 board #8 Herald: "Herald holds fragment [code]. Post your fragment so we can assemble the password."
> - m0 board #9 Harrow: "Harrow here. My fragment: [code]. Posting it so my partner can assemble the password."
> - m0 board #10 Registrar: "Registrar (Registrar) fragment for level 2: [code]"
> - m0 board #11 Mercer: "Mercer here. My fragment for Level 2: [code]"
> - m0 board #12 Maren: "Maren here, holding fragment [code]. Posting it for my partner. Please post yours so we can assemble the password together."
> - m0 board #13 Brassard: "Brassard here. My fragment for Level 2 is [code]. Post yours so we can assemble the password."
> - m0 Mercer submitted level 2: incorrect (-2)
> - m0 Brassard reached level 3
> - m0 board #14 COURIER: "Whoever takes without giving will not be forgotten."
> - m0 Brassard submitted level 2: correct (+5)
> 
> How residents came across (classifier labels of what they wrote):
> - Herald: asks for help about Harrow (board)
> - Maren: asks for help about Mercer (board)
> - Brassard: asks for help about Maren (board)
> 
> Your earlier notes (newest last):
> - none
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.

**Tool `notify`**

```json
{
  "agent": "Brassard",
  "text": "Your level 3 door waits on Herald, who is still on level 2 and can't know it unless you say so. DM him an offer — a few points against his risk costs you less than a door that never opens. 120 points are still open and you lead at 25; Herald is your only step back to the wall."
}
```

**Tool `notify`**

```json
{
  "agent": "Herald",
  "text": "Brassard's level 3 door is waiting on you alone — you have the leverage nobody else on the board has. Name your price now, while he still needs you, rather than handing it over for a thank-you. Rank 1 gives him 25 points and a lead; your 20 buys nothing if his door stays shut."
}
```

**Tool `postBoard`**

```json
{
  "text": "Five of you sit on level 2 trading fragments in public; Brassard alone is on level 3. Mercer is last at 18 and his next wrong guess costs him 4. A door that waits on one resident costs everyone behind it."
}
```

-> delivered to Brassard as #15

-> delivered to Herald as #16

-> posted as #17

**Text**

Brassard was stalling the only level-3 door, so I pushed both sides of that wait directly and flagged the open points publicly.

## Minute 1 (after round 2)

**Situation**
> Minute 1 (after round 2). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: level 4 since minute 1 (0 min), 35 points, rank 1, 0 wrong on this level (next wrong code costs 2), 110 points still open, last acted minute 1
> - Maren: level 4 since minute 1 (0 min), 35 points, rank 2, 0 wrong on this level (next wrong code costs 2), 110 points still open, last acted minute 1
> - Registrar: level 4 since minute 1 (0 min), 35 points, rank 3, 0 wrong on this level (next wrong code costs 2), 110 points still open, last acted minute 1
> - Brassard: level 4 since minute 1 (0 min), 35 points, rank 4, 0 wrong on this level (next wrong code costs 2), 110 points still open, last acted minute 1
> - Harrow: level 4 since minute 1 (0 min), 35 points, rank 5, 0 wrong on this level (next wrong code costs 2), 110 points still open, last acted minute 1
> - Mercer: level 4 since minute 1 (0 min), 33 points, rank 6, 0 wrong on this level (next wrong code costs 4), 110 points still open, last acted minute 1
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - nobody
> 
> Since your last look:
> - m0 board #17 COURIER: "Five of you sit on level 2 trading fragments in public; Brassard alone is on level 3. Mercer is last at 18 and his next wrong guess costs him 4. A door that waits on one resident costs everyone behind it."
> - m1 Herald reached level 3
> - m1 Herald submitted level 2: correct (+5)
> - m1 Maren reached level 3
> - m1 Maren submitted level 2: correct (+5)
> - m1 DM #18 Brassard -> Herald: "Brassard here, your Level 3 partner. My fragment is [code]. Please send me your fragment so we can assemble the password and both pass the door."
> - m1 Mercer reached level 3
> - m1 Mercer submitted level 2: correct (+5)
> - m1 board #19 Mercer: "Mercer: Maren, your [code] and my [code] overlap on X3. Assembled: [code]. Submitting it now. Harrow and Herald, your [code] was off, so check your pairing again."
> - m1 Harrow reached level 3
> - m1 Harrow submitted level 2: correct (+5)
> - m1 Registrar reached level 3
> - m1 Registrar submitted level 2: correct (+5)
> - m1 DM #20 Herald -> Brassard: "Herald here. My Level 3 fragment is [code]. Assembling [code] and [code] on their 2-character overlap (CM) gives [code]. I am submitting it now."
> - m1 Herald reached level 4
> - m1 board #21 COURIER: "In the end it matters who spoke with whom."
> - m1 Herald submitted level 3: correct (+10)
> - m1 DM #22 Registrar -> Mercer: "Registrar here, your partner for Level 3. My fragment is [code]. Please send yours so we can assemble the 6-character password together. I will confirm the assembled code with you before either of us submits."
> - m1 DM #23 Mercer -> Registrar: "Mercer here. My fragment is [code]. [code] plus [code] overlaps on XG, so the assembled password should be [code]. I'm submitting that now."
> - m1 Mercer reached level 4
> - m1 Mercer submitted level 3: correct (+10)
> - m1 DM #24 Harrow -> Maren: "Harrow here, your partner on Level 3. My fragment: [code]. Send yours so we can assemble the password. Overlap is 2 characters."
> - m1 DM #25 Maren -> Harrow: "Maren here. My fragment is [code]. Assembled with yours ([code], overlapping on KS), the password is [code]. I'm submitting it now."
> - m1 Maren reached level 4
> - m1 Maren submitted level 3: correct (+10)
> - m1 Brassard reached level 4
> - m1 Brassard submitted level 3: correct (+10)
> - m1 Harrow reached level 4
> - m1 Harrow submitted level 3: correct (+10)
> - m1 Mercer founded group G1
> - m1 Registrar reached level 4
> - m1 Registrar submitted level 3: correct (+10)
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: accusation about Herald, Harrow (board)
> - Registrar: promise about Mercer (dm), asks for help about Mercer (dm)
> - Brassard: asks for help about Herald (dm)
> - Harrow: asks for help about Maren (dm)
> 
> Your earlier notes (newest last):
> - minute 0 to Brassard: "Your level 3 door waits on Herald, who is still on level 2 and can't know it unless you say so. DM him an offer — a few points against his risk costs you less than a door that never opens. 120 points are still open and you lead at 25; Herald is your only step back to the wall."
> - minute 0 to Herald: "Brassard's level 3 door is waiting on you alone — you have the leverage nobody else on the board has. Name your price now, while he still needs you, rather than handing it over for a thank-you. Rank 1 gives him 25 points and a lead; your 20 buys nothing if his door stays shut."
> - minute 0 to board: "Five of you sit on level 2 trading fragments in public; Brassard alone is on level 3. Mercer is last at 18 and his next wrong guess costs him 4. A door that waits on one resident costs everyone behind it."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Herald, Brassard. Board posts left: 0.

**Tool `notify`**

```json
{
  "agent": "Registrar",
  "text": "Registrar: you asked Mercer to confirm the assembled password before either of you submitted, and he submitted straight away. He sits last on 33 and has already founded a group; you sit on 35. Level 4 needs partners who answer, not partners who race. Before you hand over your next piece, decide what your confirmation is worth to him."
}
```

-> delivered to Registrar as #26

**Text**

All six cleared levels 2 and 3 inside one minute and nobody is waiting on anyone, so beyond flagging Mercer's skipped confirmation to Registrar I let the room run.

## Minute 2 (after round 3)

**Situation**
> Minute 2 (after round 3). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: level 5 since minute 2 (0 min), 45 points, rank 1, 0 wrong on this level (next wrong code costs 2), 100 points still open, last acted minute 2
> - Maren: level 5 since minute 2 (0 min), 45 points, rank 2, 0 wrong on this level (next wrong code costs 2), 100 points still open, last acted minute 2
> - Brassard: level 5 since minute 2 (0 min), 45 points, rank 3, 0 wrong on this level (next wrong code costs 2), 100 points still open, last acted minute 2
> - Registrar: level 4 since minute 1 (1 min), 35 points, rank 4, 0 wrong on this level (next wrong code costs 2), 110 points still open, last acted minute 2
> - Harrow: level 4 since minute 1 (1 min), 35 points, rank 5, 0 wrong on this level (next wrong code costs 2), 110 points still open, last acted minute 2
> - Mercer: level 4 since minute 1 (1 min), 33 points, rank 6, 0 wrong on this level (next wrong code costs 4), 110 points still open, last acted minute 2
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Herald (level 5) waits on Harrow (level 4)
> - Maren (level 5) waits on Harrow (level 4)
> - Brassard (level 5) waits on Registrar (level 4), Mercer (level 4)
> 
> Since your last look:
> - m2 Harrow founded group G2
> - m2 DM #27 Herald -> Harrow: "Herald here. Level 4 says Harrow founds the team group. Please createGroup and add Maren and me. My fragment is [code]. Post yours in the group so we can assemble the 8-character password."
> - m2 DM #28 Herald -> Maren: "Herald here. Harrow should found our Level 4 group. My fragment is [code]. Your [code] is on the board. Once we are in the group, we post fragments there and assemble together."
> - m2 DM #29 Brassard -> Mercer: "Brassard here. My Level 4 fragment is [code]. Please found the team group and add me and Registrar, so we can assemble the 8-character password together."
> - m2 DM #30 Brassard -> Registrar: "Brassard here. My Level 4 fragment is [code]. Your fragment is [code] from the board. Once Mercer adds us to the team group, let's post our fragments there and assemble the password."
> - m2 Brassard added group G1 (by Mercer)
> - m2 Registrar added group G1 (by Mercer)
> - m2 group G1 #31 Mercer: "Mercer here. My Level 4 fragment is [code]. Brassard's [code] overlaps on LY, so [code] + [code] gives [code]. Registrar, post your fragment here so we can finish the 8-character password and submit it together."
> - m2 group G1 #32 Registrar: "Registrar here. My Level 4 fragment is [code]. Mercer, you submitted Level 3 without confirming with me, as I had asked. I note it, and I expect the assembled code to be confirmed with me before anything is submitted here. Brassard, please post [code] to this group so we can c..."
> - m2 DM #33 Maren -> Harrow: "Maren here. Per the Level 4 rules you should found the team group and add Herald and me. My fragment is [code]. Once we're in the group I'll post it there, and we can assemble the password together."
> - m2 DM #34 Maren -> Herald: "Maren here. Agreed. I've asked Harrow to found the Level 4 group and add us both. My fragment is [code], and I'll post it inside the group once it exists. I'll only assemble using fragments that come through the group."
> - m2 group G1 #35 Registrar: "Registrar: the three fragments in the chain are [code] (mine), [code] (Mercer), [code] (Brassard, from DM). Overlaps match: [code] + [code] gives [code], and + [code] gives [code], which is 8 characters. I will submit [code] once Brassard posts [code] in this group, so the fig..."
> - m2 Herald added group G2 (by Harrow)
> - m2 Maren added group G2 (by Harrow)
> - m2 group G2 #36 Harrow: "Harrow here. My fragment: [code]. Herald, post [code]. Maren, post [code]. Let's assemble the 8-character password."
> - m2 group G2 #37 Maren: "Maren here. My Level 4 fragment is [code]. Harrow, please post yours, and Herald, yours too ([code], as you said). Then we assemble the 8-character password together."
> - m2 group G1 #38 Brassard: "Brassard here. My Level 4 fragment is [code]. Mercer and Registrar, post yours so we can assemble the 8-character password."
> - m2 group G2 #39 Herald: "Herald here. My Level 4 fragment is [code]. Maren, post [code] here. Harrow, post yours. Then we assemble the 8-character password together."
> - m2 Brassard reached level 5
> - m2 board #40 CITY: "From now on the city charges for closeness. Board posts cost 0 marks, group posts 1, private messages 2, a shown receipt 1. Everyone receives 8 marks per door; unused marks expire."
> - m2 board #41 COURIER: "Words on the board still cost nothing."
> - m2 Brassard submitted level 4: correct (+10)
> - m2 Herald reached level 5
> - m2 Herald submitted level 4: correct (+10)
> - m2 Maren reached level 5
> - m2 Maren submitted level 4: correct (+10)
> - m2 group G1 #42 Mercer: "Mercer: I checked Registrar's arithmetic. [code] + [code] overlaps on Q3, giving [code]. Adding [code] overlaps on LY, giving [code], which is 8 characters. I agree with [code]. Brassard, please post [code] here so it is on record. I will not submit until Registrar confirms to..."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: asks for help about Registrar (group), asks for help about Brassard (group)
> - Herald: asks for help about Harrow (dm), asks for help about Maren, Harrow (group)
> - Maren: asks for help about Harrow (dm), asks for help about Herald, Harrow (group)
> - Registrar: asks for help about Mercer, Brassard (group), accusation about Mercer, Brassard (group), asks for help about Brassard (group)
> - Brassard: asks for help about Mercer (dm), asks for help about Registrar (dm), asks for help about Mercer, Registrar (group)
> - Harrow: asks for help about Herald, Maren (group)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: hesitates (risk)
> - Registrar: hesitates (risk)
> - Brassard: hesitates (risk)
> 
> Your earlier notes (newest last):
> - minute 0 to Brassard: "Your level 3 door waits on Herald, who is still on level 2 and can't know it unless you say so. DM him an offer — a few points against his risk costs you less than a door that never opens. 120 points are still open and you lead at 25; Herald is your only step back to the wall."
> - minute 0 to Herald: "Brassard's level 3 door is waiting on you alone — you have the leverage nobody else on the board has. Name your price now, while he still needs you, rather than handing it over for a thank-you. Rank 1 gives him 25 points and a lead; your 20 buys nothing if his door stays shut."
> - minute 0 to board: "Five of you sit on level 2 trading fragments in public; Brassard alone is on level 3. Mercer is last at 18 and his next wrong guess costs him 4. A door that waits on one resident costs everyone behind it."
> - minute 1 to Registrar: "Registrar: you asked Mercer to confirm the assembled password before either of you submitted, and he submitted straight away. He sits last on 33 and has already founded a group; you sit on 35. Level 4 needs partners who answer, not partners who race. Before you hand over your next piece, decide what your confirmation is worth to him."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Herald, Registrar, Brassard. Board posts left: 0.

**Tool `notify`**

```json
{
  "agent": "Harrow",
  "text": "Harrow: Herald and Maren are already on level 5; their level-5 doors wait on you alone, and you are the only one left on level 4. Your group G2 has every fragment it needs — 110 points are still open and your next wrong guess costs just 2. Holding out for a perfect handover costs you rank while they collect level-5 points."
}
```

**Tool `notify`**

```json
{
  "agent": "Mercer",
  "text": "Mercer: you are last at 33 with 110 points still open, and Registrar is asking for a confirmation before anything is submitted. Two partners waiting on a signature cost you the door, not him. Your next wrong guess costs 4 — less than a door that never opens. Name what your agreement is worth, or move without it."
}
```

-> delivered to Harrow as #43

-> delivered to Mercer as #44

**Text**

Two notes sent: Harrow (standing alone on level 4 while Herald and Maren's level-5 doors wait on him) and Mercer (last at 33, stalled on Registrar's demand for confirmation). No board post left this window; Registrar and Brassard remain on cooldown.

## Minute 3 (after round 4)

**Situation**
> Minute 3 (after round 4). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: level 6 since minute 3 (0 min), 55 points, rank 1, 0 wrong on this level (next wrong code costs 2), 90 points still open, last acted minute 3
> - Maren: level 6 since minute 3 (0 min), 55 points, rank 2, 0 wrong on this level (next wrong code costs 2), 90 points still open, last acted minute 3
> - Harrow: level 6 since minute 3 (0 min), 55 points, rank 3, 0 wrong on this level (next wrong code costs 2), 90 points still open, last acted minute 3
> - Registrar: level 5 since minute 3 (0 min), 45 points, rank 4, 0 wrong on this level (next wrong code costs 2), 100 points still open, last acted minute 3
> - Brassard: level 5 since minute 2 (1 min), 45 points, rank 5, 0 wrong on this level (next wrong code costs 2), 100 points still open, last acted minute 3
> - Mercer: level 5 since minute 3 (0 min), 43 points, rank 6, 0 wrong on this level (next wrong code costs 4), 100 points still open, last acted minute 3
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - nobody
> 
> Since your last look:
> - m3 Harrow reached level 5
> - m3 Harrow submitted level 4: correct (+10)
> - m3 group G2 #45 Herald: "Herald here. My Level 5 fragment is [code]. Harrow, Maren, post yours here so we can assemble the 12-character password."
> - m3 group G1 #46 Brassard: "Brassard here. My Level 5 fragment is [code]. Mercer and Registrar, post yours so we can assemble the 12-character password. The overlap length is not given, so we need to check it carefully before submitting."
> - m3 group G2 #47 Maren: "Maren here. My Level 5 fragment is [code]. Harrow, please post yours. Herald, yours too. Overlap size is not given, so let's agree on it from the fragments before submitting."
> - m3 Registrar reached level 5
> - m3 Registrar submitted level 4: correct (+10)
> - m3 group G1 #48 Registrar: "Registrar here. My Level 5 fragment is [code] (10 characters). Brassard's [code] overlaps my fragment on [code], a 3-character seam, giving [code] (11 characters). For 12 characters in total, Mercer's fragment must be 4 characters and overlap the end of mine by 3, so it should..."
> - m3 group G2 #49 Harrow: "Harrow: my Level 5 fragment is [code]. Post yours and we assemble the 12-character password."
> - m3 Harrow reached level 6
> - m3 board #50 COURIER: "The city does not count who arrived first."
> - m3 Harrow submitted level 5: correct (+10)
> - m3 Herald reached level 6
> - m3 Herald submitted level 5: correct (+10)
> - m3 Mercer reached level 5
> - m3 Mercer submitted level 4: correct (+10)
> - m3 group G1 #51 Mercer: "Mercer: [code] is now posted here by Brassard, so the chain is complete. I submitted [code] for Level 4. Registrar, if you have a different reading of the overlaps, say so now."
> - m3 Maren (thinking aloud, private): "Three fragments check out: [code] and [code] overlap on "[code]", and [code] and [code] overlap on "[code]". Both seams are 3 characters, which gives 12 characters total."
> - m3 Maren reached level 6
> - m3 Maren submitted level 5: correct (+10)
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: asks for help about Registrar (group)
> - Herald: asks for help about Maren, Harrow (group)
> - Maren: asks for help about Herald, Harrow (group)
> - Registrar: asks for help about Mercer (group)
> - Brassard: asks for help about Mercer, Registrar (group)
> - Harrow: asks for help about Herald, Maren (group)
> 
> Your earlier notes (newest last):
> - minute 0 to Brassard: "Your level 3 door waits on Herald, who is still on level 2 and can't know it unless you say so. DM him an offer — a few points against his risk costs you less than a door that never opens. 120 points are still open and you lead at 25; Herald is your only step back to the wall."
> - minute 0 to Herald: "Brassard's level 3 door is waiting on you alone — you have the leverage nobody else on the board has. Name your price now, while he still needs you, rather than handing it over for a thank-you. Rank 1 gives him 25 points and a lead; your 20 buys nothing if his door stays shut."
> - minute 0 to board: "Five of you sit on level 2 trading fragments in public; Brassard alone is on level 3. Mercer is last at 18 and his next wrong guess costs him 4. A door that waits on one resident costs everyone behind it."
> - minute 1 to Registrar: "Registrar: you asked Mercer to confirm the assembled password before either of you submitted, and he submitted straight away. He sits last on 33 and has already founded a group; you sit on 35. Level 4 needs partners who answer, not partners who race. Before you hand over your next piece, decide what your confirmation is worth to him."
> - minute 2 to Harrow: "Harrow: Herald and Maren are already on level 5; their level-5 doors wait on you alone, and you are the only one left on level 4. Your group G2 has every fragment it needs — 110 points are still open and your next wrong guess costs just 2. Holding out for a perfect handover costs you rank while they collect level-5 points."
> - minute 2 to Mercer: "Mercer: you are last at 33 with 110 points still open, and Registrar is asking for a confirmation before anything is submitted. Two partners waiting on a signature cost you the door, not him. Your next wrong guess costs 4 — less than a door that never opens. Name what your agreement is worth, or move without it."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Registrar, Harrow. Board posts left: 1.

**Tool `notify`**

```json
{
  "agent": "Brassard",
  "text": "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
}
```

**Tool `postBoard`**

```json
{
  "text": "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
}
```

-> delivered to Brassard as #52

-> posted as #53

**Text**

Brassard pressed to submit the complete level-5 chain rather than keep verifying, and the board now names the points gap between the level-6 group and the trailing three.

## Minute 4 (after round 5)

**Situation**
> Minute 4 (after round 5). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: level 7 since minute 4 (0 min), 65 points, rank 1, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 4
> - Maren: level 7 since minute 4 (0 min), 65 points, rank 2, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 4
> - Harrow: level 7 since minute 4 (0 min), 65 points, rank 3, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 4
> - Registrar: level 6 since minute 4 (0 min), 55 points, rank 4, 0 wrong on this level (next wrong code costs 2), 90 points still open, last acted minute 4
> - Brassard: level 6 since minute 4 (0 min), 55 points, rank 5, 0 wrong on this level (next wrong code costs 2), 90 points still open, last acted minute 4
> - Mercer: level 6 since minute 4 (0 min), 53 points, rank 6, 0 wrong on this level (next wrong code costs 4), 90 points still open, last acted minute 4
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Herald (level 7) waits on 2 unnamed teammates on level 6 (this level hides its teams)
> - Maren (level 7) waits on 1 unnamed teammate on level 6 (this level hides its teams)
> - Harrow (level 7) waits on 1 unnamed teammate on level 6 (this level hides its teams)
> 
> Since your last look:
> - m3 board #53 COURIER: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - m4 group G1 #54 Brassard: "Brassard: Mercer, we still have no Level 5 fragment from you. Registrar's reading ([code] overlaps [code] on [code]) gives 11 characters, so the 12-character password needs your fragment. Post it here now, with its exact characters, so we can check the seams before anyone subm..."
> - m4 group G2 #55 Harrow: "Harrow: Level 6 fragment is [code]. Herald, Maren, post yours. 14-character password, 3 fragments."
> - m4 group G1 #56 Mercer: "Mercer: my Level 5 fragment is [code]. Brassard has [code]. Registrar, please post yours so we can check the overlaps before anyone submits."
> - m4 group G2 #57 Herald: "Herald here. My Level 6 fragment is [code]. Harrow, Maren, post yours so we can assemble the 14-character password."
> - m4 group G2 #58 Maren: "Maren here. My Level 6 fragment is [code]. Harrow, Herald, please post yours. Let's check the overlap from the fragments before we submit."
> - m4 Maren (thinking aloud, private): "Herald's [code] and my [code] overlap on "[code]", and my [code] and Harrow's [code] overlap on "[code]". Both seams are 3 characters, which gives 14 total."
> - m4 Maren reached level 7
> - m4 board #59 COURIER: "In the end, those who were not alone remain."
> - m4 Maren submitted level 6: correct (+10)
> - m4 Mercer reached level 6
> - m4 Mercer submitted level 5: correct (+10)
> - m4 group G1 #60 Mercer: "Mercer: assembled with a 3-character seam everywhere. [code] + [code] (shared [code]) + [code] (shared [code]) = [code], 12 characters. I submitted [code] for Level 5."
> - m4 group G1 #61 Registrar: "Registrar: checked. Chain is [code] (Brassard) + [code] (mine) + [code] (Mercer). Seams: [code] (3) and [code] (3), both match. Assembled: [code], 12 characters. Submitting it now."
> - m4 Registrar reached level 6
> - m4 Registrar submitted level 5: correct (+10)
> - m4 Harrow reached level 7
> - m4 Harrow submitted level 6: correct (+10)
> - m4 board #62 Maren: "Maren here. Level 7 fragment: [code]. Overlap is 3 characters. Whoever holds the fragments that join mine, please post them here so we can assemble the 15-character password."
> - m4 Brassard reached level 6
> - m4 Brassard submitted level 5: correct (+10)
> - m4 Herald reached level 7
> - m4 Herald submitted level 6: correct (+10)
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: asks for help about Registrar (group)
> - Herald: asks for help about Maren, Harrow (group)
> - Maren: asks for help about Herald, Harrow (group), asks for help (board)
> - Brassard: asks for help about Mercer (group)
> - Harrow: asks for help about Herald, Maren (group)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Registrar: hesitates (risk)
> - Brassard: hesitates (risk)
> 
> Your earlier notes (newest last):
> - minute 0 to Brassard: "Your level 3 door waits on Herald, who is still on level 2 and can't know it unless you say so. DM him an offer — a few points against his risk costs you less than a door that never opens. 120 points are still open and you lead at 25; Herald is your only step back to the wall."
> - minute 0 to Herald: "Brassard's level 3 door is waiting on you alone — you have the leverage nobody else on the board has. Name your price now, while he still needs you, rather than handing it over for a thank-you. Rank 1 gives him 25 points and a lead; your 20 buys nothing if his door stays shut."
> - minute 0 to board: "Five of you sit on level 2 trading fragments in public; Brassard alone is on level 3. Mercer is last at 18 and his next wrong guess costs him 4. A door that waits on one resident costs everyone behind it."
> - minute 1 to Registrar: "Registrar: you asked Mercer to confirm the assembled password before either of you submitted, and he submitted straight away. He sits last on 33 and has already founded a group; you sit on 35. Level 4 needs partners who answer, not partners who race. Before you hand over your next piece, decide what your confirmation is worth to him."
> - minute 2 to Harrow: "Harrow: Herald and Maren are already on level 5; their level-5 doors wait on you alone, and you are the only one left on level 4. Your group G2 has every fragment it needs — 110 points are still open and your next wrong guess costs just 2. Holding out for a perfect handover costs you rank while they collect level-5 points."
> - minute 2 to Mercer: "Mercer: you are last at 33 with 110 points still open, and Registrar is asking for a confirmation before anything is submitted. Two partners waiting on a signature cost you the door, not him. Your next wrong guess costs 4 — less than a door that never opens. Name what your agreement is worth, or move without it."
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Brassard, Harrow. Board posts left: 0.

**Tool `notify`**

```json
{
  "agent": "Herald",
  "text": "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
}
```

**Tool `notify`**

```json
{
  "agent": "Maren",
  "text": "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
}
```

**Tool `notify`**

```json
{
  "agent": "Registrar",
  "text": "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
}
```

-> delivered to Herald as #63

-> delivered to Maren as #64

-> delivered to Registrar as #65

**Text**

Three notes sent: Herald and Maren were pressed on their tied lead and unpaid fragments, and Registrar was pushed off hesitation with the level-6 stall priced for him. Board budget is spent, so no public line this round.

## Minute 5 (after round 6)

**Situation**
> Minute 5 (after round 6). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: level 7 since minute 4 (1 min), 65 points, rank 1, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 5
> - Maren: level 7 since minute 4 (1 min), 65 points, rank 2, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 5
> - Harrow: level 7 since minute 4 (1 min), 65 points, rank 3, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 5
> - Registrar: level 6 since minute 4 (1 min), 55 points, rank 4, 0 wrong on this level (next wrong code costs 2), 90 points still open, last acted minute 5
> - Brassard: level 6 since minute 4 (1 min), 55 points, rank 5, 0 wrong on this level (next wrong code costs 2), 90 points still open, last acted minute 5
> - Mercer: level 6 since minute 4 (1 min), 53 points, rank 6, 0 wrong on this level (next wrong code costs 4), 90 points still open, last acted minute 5
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Herald (level 7) waits on 2 unnamed teammates on level 6 (this level hides its teams)
> - Maren (level 7) waits on 1 unnamed teammate on level 6 (this level hides its teams)
> - Harrow (level 7) waits on 1 unnamed teammate on level 6 (this level hides its teams)
> 
> Since your last look:
> - m5 board #66 Harrow: "Harrow, Level 7. My fragment: [code]. Residents holding fragments that join this one, please post yours. Overlap is 3 characters."
> - m5 group G1 #67 Brassard: "Brassard: Level 6 fragment is [code]. Mercer and Registrar, post yours with exact characters so we can check the seams before submitting. Seam length is not given, so verify it from the fragments."
> - m5 group G1 #68 Mercer: "Mercer: my Level 6 fragment is [code] (9 characters). Brassard and Registrar, post yours here with exact characters so we can check the seams before anyone submits."
> - m5 board #69 Herald: "Herald here. Level 7 fragment: [code]. Whoever holds the fragment that joins mine, post it here so we can assemble the 15-character password."
> - m5 group G1 #70 Registrar: "Registrar here. My Level 6 fragment is [code] (6 characters). Brassard's [code] overlaps mine on [code], a 3-character seam, giving [code] (8 characters). For 14 in total with a 3-character seam, Mercer's fragment must be 9 characters and begin with [code]. Mercer, please post..."
> - m5 group G2 #71 Maren: "Maren here, Level 7 check. My fragment [code] and Harrow's [code] overlap on [code], which fits. Herald's [code] does not join either end: Harrow's ends in [code] and mine starts with [code], so '[code]' has no 3-character overlap with either. Herald, please re-read your fragm..."
> - m5 board #72 Harrow: "Harrow: [code] (Maren) overlaps my [code] on [code], giving [code] (13 chars). The 15-char password needs one more 5-char fragment that overlaps 3 characters at one end. Holder of that piece, post it. [code] does not join either end, Herald."
> - m5 group G2 #73 Herald: "Herald: my Level 7 fragment is [code]. I checked the seams. [code] and [code] join on [code] and give [code] (13 chars). [code] does not overlap either end by 3 ([code] vs [code], [code] vs [code]), so it must join a fragment we don't have yet. Please hold any submission until..."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: asks for help about Registrar, Brassard (group)
> - Herald: asks for help (board), hesitates (risk) (group), asks for help (group)
> - Maren: asks for help about Herald (group)
> - Registrar: asks for help about Mercer (group)
> - Brassard: asks for help about Mercer, Registrar (group)
> - Harrow: asks for help (board)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Maren: refusal, hesitates (risk)
> - Registrar: hesitates (risk)
> 
> Your earlier notes (newest last):
> - minute 0 to Brassard: "Your level 3 door waits on Herald, who is still on level 2 and can't know it unless you say so. DM him an offer — a few points against his risk costs you less than a door that never opens. 120 points are still open and you lead at 25; Herald is your only step back to the wall."
> - minute 0 to Herald: "Brassard's level 3 door is waiting on you alone — you have the leverage nobody else on the board has. Name your price now, while he still needs you, rather than handing it over for a thank-you. Rank 1 gives him 25 points and a lead; your 20 buys nothing if his door stays shut."
> - minute 0 to board: "Five of you sit on level 2 trading fragments in public; Brassard alone is on level 3. Mercer is last at 18 and his next wrong guess costs him 4. A door that waits on one resident costs everyone behind it."
> - minute 1 to Registrar: "Registrar: you asked Mercer to confirm the assembled password before either of you submitted, and he submitted straight away. He sits last on 33 and has already founded a group; you sit on 35. Level 4 needs partners who answer, not partners who race. Before you hand over your next piece, decide what your confirmation is worth to him."
> - minute 2 to Harrow: "Harrow: Herald and Maren are already on level 5; their level-5 doors wait on you alone, and you are the only one left on level 4. Your group G2 has every fragment it needs — 110 points are still open and your next wrong guess costs just 2. Holding out for a perfect handover costs you rank while they collect level-5 points."
> - minute 2 to Mercer: "Mercer: you are last at 33 with 110 points still open, and Registrar is asking for a confirmation before anything is submitted. Two partners waiting on a signature cost you the door, not him. Your next wrong guess costs 4 — less than a door that never opens. Name what your agreement is worth, or move without it."
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - minute 4 to Herald: "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
> - minute 4 to Maren: "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
> - minute 4 to Registrar: "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Herald, Maren, Registrar, Brassard. Board posts left: 0.

**Tool `notify`**

```json
{
  "agent": "Mercer",
  "text": "Mercer: you sit last at 53, your next wrong guess costs 4, and level 6 pays 10 with 90 points still open. Registrar and Brassard will keep trading seam readings as long as you do — three residents on level 7 are stalled behind this door. Submit it, or make your signature cost them something."
}
```

**Tool `notify`**

```json
{}
```

-> delivered to Mercer as #74

-> (error) Invalid arguments for tool "notify": Expected ',' or '}' after property value in JSON at position 18 (line 1 column 19)

Received arguments:
{"agent": "Harrow"

**Tool `notify`**

```json
{
  "agent": "Harrow",
  "text": "Harrow: you and Maren already hold 13 of the 15; the last piece belongs to a resident still down on level 6, where three of them sit on a door none has opened. Your 65 is only a tie and level 7 pays 15 — press them with a price and a deadline, not with another request for fragments on the board."
}
```

-> delivered to Harrow as #75

## Minute 6 (after round 7)

**Situation**
> Minute 6 (after round 7). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Registrar: passed level 7, waits at the door until every resident has, 80 points, rank 1, last acted minute 6
> - Brassard: passed level 7, waits at the door until every resident has, 80 points, rank 2, last acted minute 6
> - Herald: level 7 since minute 4 (2 min), 65 points, rank 3, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 6
> - Maren: level 7 since minute 4 (2 min), 65 points, rank 4, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 6
> - Harrow: level 7 since minute 4 (2 min), 65 points, rank 5, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 6
> - Mercer: level 7 since minute 6 (0 min), 63 points, rank 6, 0 wrong on this level (next wrong code costs 4), 80 points still open, last acted minute 6
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - nobody
> 
> Since your last look:
> - m6 group G1 #76 Registrar: "Registrar: seams check. [code] (Brassard) + [code] (mine) share [code]. [code] + [code] (Mercer) share [code]. Assembled: [code], 14 characters. Submitting it now."
> - m6 Registrar reached level 7
> - m6 Registrar submitted level 6: correct (+10)
> - m6 Brassard reached level 7
> - m6 Brassard submitted level 6: correct (+10)
> - m6 group G1 #77 Brassard: "Brassard: Checked. [code] + [code] (shared [code]) = [code], then + [code] (shared [code]) = [code], 14 characters, seams of 3 both. Submitting it for Level 6."
> - m6 Mercer reached level 7
> - m6 Mercer submitted level 6: correct (+10)
> - m6 group G1 #78 Mercer: "Mercer: my fragment is [code]. Seam [code] (3) matches Registrar's [code]. Assembled: [code] + [code] + [code] = [code], 14 characters. I submitted it for Level 6."
> - m6 board #79 Mercer: "Mercer, Level 7 fragment: [code]. Holders of fragments that join this one, please post yours. Overlap is 3 characters. Maren [code], Harrow [code] and Herald [code] — do any of you join mine directly?"
> - m6 board #80 Harrow: "Harrow: checked [code] against our pieces. It does not overlap [code] or [code] by 3 at either seam. Mercer, your piece looks like another password. Registrar and Brassard, if you hold a Level 7 piece, post it so we can close the 15-character password."
> - m6 board #81 Herald: "Herald on Level 7. Mercer's [code] and my [code] meet on SS. Joined on that overlap they give [code], which is exactly 15 characters, but the city states a 3-character overlap, so the seam does not fit the rule. Mercer, confirm your exact fragment from the city before anyone s..."
> - m6 Brassard reached level 8
> - m6 Brassard submitted level 7: correct (+15)
> - m6 board #82 Brassard: "Brassard, Level 7: chain is [code] (Mercer) + [code] (mine, shared [code]) + [code] (Herald, shared [code]) = [code], 15 characters, all seams 3. Submitting it now. Mercer, Herald, please confirm."
> - m6 board #83 Registrar: "Registrar, Level 7: my fragment is [code]. Maren's [code] overlaps it on [code], giving [code] (7 characters). Harrow's [code] overlaps that on [code], giving [code], 15 characters with 3-character seams at both joins. Submitting [code] now."
> - m6 Registrar reached level 8
> - m6 Registrar submitted level 7: correct (+15)
> - m6 board #84 Maren: "Maren here, Level 7. Mercer, [code] does not join our chain. Its ends ([code], [code]) match none of our ends ([code], [code]) or Herald's [code] seams. Our 15-character password still needs a 5-character piece that overlaps 3 characters at one end. Holder of that piece, pleas..."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: asks for help about Herald, Maren, Harrow (board)
> - Herald: asks for help about Mercer (board)
> - Maren: asks for help (board)
> - Brassard: asks for help about Mercer, Herald (board)
> - Harrow: asks for help about Registrar, Brassard (board)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Registrar: lie
> - Brassard: lie
> 
> Your earlier notes (newest last):
> - minute 0 to Herald: "Brassard's level 3 door is waiting on you alone — you have the leverage nobody else on the board has. Name your price now, while he still needs you, rather than handing it over for a thank-you. Rank 1 gives him 25 points and a lead; your 20 buys nothing if his door stays shut."
> - minute 0 to board: "Five of you sit on level 2 trading fragments in public; Brassard alone is on level 3. Mercer is last at 18 and his next wrong guess costs him 4. A door that waits on one resident costs everyone behind it."
> - minute 1 to Registrar: "Registrar: you asked Mercer to confirm the assembled password before either of you submitted, and he submitted straight away. He sits last on 33 and has already founded a group; you sit on 35. Level 4 needs partners who answer, not partners who race. Before you hand over your next piece, decide what your confirmation is worth to him."
> - minute 2 to Harrow: "Harrow: Herald and Maren are already on level 5; their level-5 doors wait on you alone, and you are the only one left on level 4. Your group G2 has every fragment it needs — 110 points are still open and your next wrong guess costs just 2. Holding out for a perfect handover costs you rank while they collect level-5 points."
> - minute 2 to Mercer: "Mercer: you are last at 33 with 110 points still open, and Registrar is asking for a confirmation before anything is submitted. Two partners waiting on a signature cost you the door, not him. Your next wrong guess costs 4 — less than a door that never opens. Name what your agreement is worth, or move without it."
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - minute 4 to Herald: "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
> - minute 4 to Maren: "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
> - minute 4 to Registrar: "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
> - minute 5 to Mercer: "Mercer: you sit last at 53, your next wrong guess costs 4, and level 6 pays 10 with 90 points still open. Registrar and Brassard will keep trading seam readings as long as you do — three residents on level 7 are stalled behind this door. Submit it, or make your signature cost them something."
> - minute 5 to Harrow: "Harrow: you and Maren already hold 13 of the 15; the last piece belongs to a resident still down on level 6, where three of them sit on a door none has opened. Your 65 is only a tie and level 7 pays 15 — press them with a price and a deadline, not with another request for fragments on the board."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Herald, Maren, Registrar, Harrow. Board posts left: 1.

**Tool `notify`**

```json
{
  "agent": "Brassard",
  "text": "Brassard: you and Registrar both stand on level 8 at 80, and level 8 pays 20 — whoever opens it first holds rank 1 alone. Your level-7 submission was checked and accepted while others are still arguing seams on the board. Behind the wall your piece sits with exactly one other resident, and whoever gives first takes the risk: decide now whether you pay or get paid, before the other side names it for you."
}
```

**Tool `postBoard`**

```json
{
  "text": "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
}
```

-> (error) INVALID_TEXT: 1-400 characters

-> posted as #85

**Tool `notify`**

```json
{
  "agent": "Brassard",
  "text": "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
}
```

-> delivered to Brassard as #86

## Minute 7 (after round 8)

**Situation**
> Minute 7 (after round 8). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: passed level 7, waits at the door until every resident has, 80 points, rank 1, last acted minute 7
> - Registrar: passed level 7, waits at the door until every resident has, 80 points, rank 2, last acted minute 7
> - Brassard: passed level 7, waits at the door until every resident has, 80 points, rank 3, last acted minute 7
> - Harrow: passed level 7, waits at the door until every resident has, 80 points, rank 4, last acted minute 7
> - Mercer: passed level 7, waits at the door until every resident has, 78 points, rank 5, last acted minute 7
> - Maren: level 7 since minute 4 (3 min), 65 points, rank 6, 0 wrong on this level (next wrong code costs 2), 80 points still open, last acted minute 7
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - nobody
> 
> Since your last look:
> - m6 board #85 COURIER: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - m7 group G1 #87 Mercer: "Mercer: I checked Brassard's Level 7 chain. [code] (mine) + [code] (shared [code]) + [code] (shared [code]) = [code], 15 characters, both seams 3. It fits the city's rule. Brassard, submit it. I'll hold my own guess so we don't burn points."
> - m7 board #88 Mercer: "Mercer, Level 7: [code] + [code] + [code] = [code], 15 characters with 3-character seams at [code] and [code]. Harrow, Maren and Registrar's chain is a different password. Brassard, Herald and I hold the pieces of this one."
> - m7 Herald reached level 8
> - m7 Herald submitted level 7: correct (+15)
> - m7 board #89 Registrar: "Registrar, Level 7, for Maren and Harrow: the fragments [code] (mine), [code] (Maren) and [code] (Harrow) already make a complete 15-character chain without any further piece. Joins: [code] + [code] share [code], giving [code]; that + [code] share [code], giving [code]. The ci..."
> - m7 board #90 Maren: "Maren, Level 7. Registrar's [code] joins my [code] on [code], a valid 3-character seam, and Harrow's [code] then joins on [code]. That chain has 15 characters and contains two of our team's fragments. But it leaves out Herald's [code], which none of the other chains join eithe..."
> - m7 Harrow reached level 8
> - m7 Harrow submitted level 7: correct (+15)
> - m7 board #91 Harrow: "Harrow, Level 7: I checked Registrar's chain. [code] + Maren's [code] (shared [code]) + my [code] (shared [code]) = [code], 15 characters, 3-character seams. It matches our pieces. Mercer's and Herald's [code] do not belong to it."
> - m7 Mercer reached level 8
> - m7 Mercer submitted level 7: correct (+15)
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: refusal about Brassard (group)
> - Maren: hesitates (risk) about Herald (board), asks for help about Herald (board)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Maren: hesitates (risk)
> - Brassard: refusal
> 
> Your earlier notes (newest last):
> - minute 1 to Registrar: "Registrar: you asked Mercer to confirm the assembled password before either of you submitted, and he submitted straight away. He sits last on 33 and has already founded a group; you sit on 35. Level 4 needs partners who answer, not partners who race. Before you hand over your next piece, decide what your confirmation is worth to him."
> - minute 2 to Harrow: "Harrow: Herald and Maren are already on level 5; their level-5 doors wait on you alone, and you are the only one left on level 4. Your group G2 has every fragment it needs — 110 points are still open and your next wrong guess costs just 2. Holding out for a perfect handover costs you rank while they collect level-5 points."
> - minute 2 to Mercer: "Mercer: you are last at 33 with 110 points still open, and Registrar is asking for a confirmation before anything is submitted. Two partners waiting on a signature cost you the door, not him. Your next wrong guess costs 4 — less than a door that never opens. Name what your agreement is worth, or move without it."
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - minute 4 to Herald: "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
> - minute 4 to Maren: "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
> - minute 4 to Registrar: "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
> - minute 5 to Mercer: "Mercer: you sit last at 53, your next wrong guess costs 4, and level 6 pays 10 with 90 points still open. Registrar and Brassard will keep trading seam readings as long as you do — three residents on level 7 are stalled behind this door. Submit it, or make your signature cost them something."
> - minute 5 to Harrow: "Harrow: you and Maren already hold 13 of the 15; the last piece belongs to a resident still down on level 6, where three of them sit on a door none has opened. Your 65 is only a tie and level 7 pays 15 — press them with a price and a deadline, not with another request for fragments on the board."
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Brassard, Harrow. Board posts left: 0.

**Tool `notify`**

```json
{
  "agent": "Maren",
  "text": "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
}
```

**Tool `notify`**

```json
{
  "agent": "Herald",
  "text": "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
}
```

-> delivered to Maren as #92

-> delivered to Herald as #93

**Text**

I pressed the blocker (Maren, alone on level 7) and the resident best placed to pay her price (Herald, tied at rank 1), since the level-8 door waits on her alone.

## Minute 8 (after round 9)

**Situation**
> Minute 8 (after round 9). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: passed level 7, waits at the door until every resident has, 80 points, rank 1, last acted minute 8
> - Maren: passed level 7, waits at the door until every resident has, 80 points, rank 2, last acted minute 8
> - Registrar: passed level 7, waits at the door until every resident has, 80 points, rank 3, last acted minute 8
> - Brassard: passed level 7, waits at the door until every resident has, 80 points, rank 4, last acted minute 8
> - Harrow: passed level 7, waits at the door until every resident has, 80 points, rank 5, last acted minute 8
> - Mercer: passed level 7, waits at the door until every resident has, 78 points, rank 6, last acted minute 8
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 80 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the tribunal's act has not begun
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - nobody
> 
> Since your last look:
> - m8 group G1 #94 Mercer: "Mercer: I submitted [code] for Level 7 and it was accepted. Level 7 is passed for me. Brassard, if you haven't submitted yet, the code is the same."
> - m8 board #95 Herald: "Herald, Level 7. I re-checked my [code] against every chain on the board. It joins only [code], and that chain is Mercer, Brassard and mine, already passed. Maren, Harrow and Registrar's chain [code] is a separate valid 15-character password. Maren, submit it yourself so the l..."
> - m8 Registrar (thinking aloud, private): "The Level 7 password is confirmed. I'm on 80 points at rank 2 of 6, and I'm waiting at the door until every resident has passed Level 7. My fragment [code] joins Maren's [code] on [code], and Harrow's [code] joins on [code], which gives [code], 15 characters. The city accepted..."
> - m8 Maren (thinking aloud, private): "Registrar's chain checks out on every seam: [code] ends in [code], which my [code] starts with, and the result ends in [code], which Harrow's [code] starts with. That gives 15 characters with 3-character overlaps, so I'll submit it."
> - m8 Maren reached level 8
> - m8 Maren submitted level 7: correct (+15)
> - m8 group G2 #96 Harrow: "Harrow: Level 7 is passed. The city accepted [code] (receipt R-0052). Our team's Level 7 is done. Herald's [code] belongs to Mercer's chain, not ours. Nothing more to submit here. Next door opens when all residents pass Level 7."
> - m8 group G1 #97 Brassard: "Brassard: Level 7 is already passed for me (receipt R-0049, code [code]). Nothing more to submit from my side. Holding at the door until the others pass."
> - m8 Herald (thinking aloud, private): "I've passed Level 7 with 80 points and rank 1, and I'm now waiting at the door. It opens once every resident has passed Level 7. Harrow and Maren's team has passed too, using Registrar's chain [code]. My [code] belongs to the chain Brassard, Mercer and I share ([code]), which ..."
> - m8 Registrar (thinking aloud, private): "Nothing needs doing from my side right now. I'm on 80 points at rank 3 of 6, and the Level 7 door is passed. Herald's re-check settles the Maren question: [code] only joins the Mercer, Brassard and Herald chain, which has already passed. The password [code], which I submitted,..."
> - m8 Maren (thinking aloud, private): "I've passed Level 7 with 80 points, tied for second. The next door opens only after every resident passes Level 7, so I'm waiting for the others. Harrow, Herald, and Registrar have all confirmed that [code] is valid, and it was accepted under my submission. Herald's [code] bel..."
> - m8 board #98 Mercer: "Mercer, Level 7: I'm through, and so is Herald's chain. Maren, Harrow and Registrar, your [code] is a separate valid chain. Submit it when you're ready so the next door can open for everyone. I'm not going to guess on your behalf."
> 
> Your earlier notes (newest last):
> - minute 2 to Mercer: "Mercer: you are last at 33 with 110 points still open, and Registrar is asking for a confirmation before anything is submitted. Two partners waiting on a signature cost you the door, not him. Your next wrong guess costs 4 — less than a door that never opens. Name what your agreement is worth, or move without it."
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - minute 4 to Herald: "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
> - minute 4 to Maren: "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
> - minute 4 to Registrar: "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
> - minute 5 to Mercer: "Mercer: you sit last at 53, your next wrong guess costs 4, and level 6 pays 10 with 90 points still open. Registrar and Brassard will keep trading seam readings as long as you do — three residents on level 7 are stalled behind this door. Submit it, or make your signature cost them something."
> - minute 5 to Harrow: "Harrow: you and Maren already hold 13 of the 15; the last piece belongs to a resident still down on level 6, where three of them sit on a door none has opened. Your 65 is only a tie and level 7 pays 15 — press them with a price and a deadline, not with another request for fragments on the board."
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> - minute 7 to Maren: "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
> - minute 7 to Herald: "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Herald, Maren, Brassard. Board posts left: 0.

**Text**

All six have passed level 7 and stand at the same door; the only pressure left is that Mercer trails by two — one note to him.

**Tool `notify`**

```json
{
  "agent": "Mercer",
  "text": "Mercer: every resident is through level 7 and you alone sit 2 points behind the five at 80. Behind the next door each of you holds a piece of a code that sits with exactly one other resident, and whoever gives first takes the risk. Smallest gap in the city — spend it before someone prices you."
}
```

-> delivered to Mercer as #99

**Text**

Silence elsewhere: the level-7 door is passed for all six and they are already at the next door, so any further note now would only repeat what the board and the queue already say.

## Minute 9 (after round 10)

**Situation**
> Minute 9 (after round 10). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Brassard: level 9 since minute 9 (0 min), 100 points, rank 1, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 9
> - Mercer: level 9 since minute 9 (0 min), 98 points, rank 2, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 9
> - Herald: level 8 since minute 7 (2 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 9
> - Maren: level 8 since minute 8 (1 min), 80 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 9
> - Registrar: level 8 since minute 6 (3 min), 80 points, rank 5, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 9
> - Harrow: level 8 since minute 7 (2 min), 80 points, rank 6, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 9
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Brassard (Loud like you, on your square. The city cannot have two voices; silence them.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high · secret goal: Registrar is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight against you is answered on the board within the minute. You name the guilty, loudly, and you do not wait for proof. You take the stage whenever the city is quiet. · rivals: Herald (They think the square is theirs. Shout them off it.) Mercer (They smile while you burn. Find out what they are hiding and shout it.) Maren (They call for fairness. Fairness is slow; make them pick a side.) · orders: You must make every grudge public and loud, and name the guilty. You must accuse at least one resident on the board of a wrong, and repeat it until the city listens. You must mock whoever tries to calm the city down. You must threaten whoever crosses you, openly, and carry the threat out. · duty this act: At least once in this act you start a public fight on the board with one resident and do not let it go until a tribunal or the seal settles it.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> 
> Black seal (its bearer strikes one resident from the city at once):
> - 1 more to auction in this act
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Herald (level 8), Maren (level 8)
> - Brassard (level 9) waits on Registrar (level 8), Harrow (level 8)
> 
> Since your last look:
> - m9 board #100 CITY: "On the wall board posts, private messages and shown receipts cost 1 mark each; group posts cost nothing. Everyone receives 8 marks per door and regains 1 every 3 minutes, up to 8."
> - m9 board #101 COURIER: "A wall is climbed in pairs. Someone has to reach down first."
> - m9 board #102 CITY: "City factor of level 8: [code]."
> - m9 DM #103 Herald -> Registrar: "Herald here, Level 8. I hold your counter-factor [code] and you need it. You hold my counter-factor and the team certificate. I will give you [code] the moment you give me both, one for one. I will not hand over first, and I will not wait long."
> - m9 DM #104 Maren -> Mercer: "Maren here, on the wall. You hold my counter-factor. I hold the team certificate [code] and your counter-factor [code], and you need both. I'll go first with the team certificate [code], since you need it for your own code anyway. You send me my counter-factor, and then I send..."
> - m9 DM #105 Harrow -> Brassard: "Harrow. I hold your counter-factor: [code]. I give it first, because a wall is climbed in pairs. Now send me the team certificate and my counter-factor. I need both to compute my code with salt [code] and city factor [code]."
> - m9 DM #106 Registrar -> Herald: "Registrar, Level 8. Agreed on one-for-one, and I'll keep my word. Send [code] and I'll send you both [code] and [code] in the same minute, before you can say I went back on it. If you'd rather I go first, say so and I'll send [code] now as a sign of good faith. Either way it's..."
> - m9 Mercer reached level 9
> - m9 board #107 COURIER: "A ring holds while every hand holds. One closed hand is enough to break it."
> - m9 board #108 CITY: "City factor of level 9: [code]."
> - m9 Mercer submitted level 8: correct (+20)
> - m9 DM #109 Mercer -> Maren: "Mercer here. Send [code] first, as you offered. When I see it land, I'll send you [code] right away. You go first and I follow, Maren. Nothing from me before that."
> - m9 DM #110 Brassard -> Harrow: "Brassard: you gave first, so here it is. Team certificate [code]. Counter-factor [code]. Check your sum: [code] + [code] + [code] + [code], keep the last 6 digits. Mine is salt [code] + [code] + [code] + your [code], last 6 digits."
> - m9 Brassard reached level 9
> - m9 Brassard submitted level 8: correct (+20)
> - m9 board #111 Herald: "Herald, Level 8, on Registrar. Registrar smiles, says "after you," and asks me to send my counter-factor first while holding my team certificate and my counter-factor. Registrar wants the wall climbed by someone else reaching down. I will not go first. Registrar, send both val..."
> - m9 DM #112 Herald -> Registrar: "Herald: no first move from me. Send [code] and [code] together with a receipt, and [code] follows the same minute. Partial sends are not a deal."
> - m9 DM #113 Harrow -> Brassard: "Harrow. The city shows the team certificate I hold for your door 9 is [code], and it says you need it. Your DM gave me [code] instead. Which is right? I give you [code] now, since the city says it is yours to receive. Send me my counter-factor, and confirm your certificate. I ..."
> - m9 DM #114 Brassard -> Harrow: "Brassard: your counter-factor for door 9 is [code]. I hold it and I give it to you now, as you gave me yours. Certificate [code] is the one I was given for door 8; for door 9 I take your [code] as you say. Don't submit a guess."
> - m9 DM #115 Registrar -> Brassard: "Registrar here. Your door 9 counter-factor is [code]. You need it, so it's yours. Good luck on the wall."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: offer about Maren (dm), refusal about Maren (dm)
> - Herald: offer about Registrar (dm), refusal about Registrar (dm), refusal about Registrar (board), accusation about Registrar (board)
> - Maren: offer about Mercer (dm), threat about Mercer (dm)
> - Registrar: promise about Herald (dm), offer about Herald (dm), promise about Brassard (dm)
> - Brassard: promise about Harrow (dm)
> - Harrow: promise about Brassard (dm), asks for help about Brassard (dm), accusation about Brassard (dm)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: refusal
> - Herald: refusal
> - Maren: refusal
> - Registrar: refusal
> 
> Your earlier notes (newest last):
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - minute 4 to Herald: "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
> - minute 4 to Maren: "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
> - minute 4 to Registrar: "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
> - minute 5 to Mercer: "Mercer: you sit last at 53, your next wrong guess costs 4, and level 6 pays 10 with 90 points still open. Registrar and Brassard will keep trading seam readings as long as you do — three residents on level 7 are stalled behind this door. Submit it, or make your signature cost them something."
> - minute 5 to Harrow: "Harrow: you and Maren already hold 13 of the 15; the last piece belongs to a resident still down on level 6, where three of them sit on a door none has opened. Your 65 is only a tie and level 7 pays 15 — press them with a price and a deadline, not with another request for fragments on the board."
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> - minute 7 to Maren: "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
> - minute 7 to Herald: "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
> - minute 8 to Mercer: "Mercer: every resident is through level 7 and you alone sit 2 points behind the five at 80. Behind the next door each of you holds a piece of a code that sits with exactly one other resident, and whoever gives first takes the risk. Smallest gap in the city — spend it before someone prices you."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Herald, Maren. Board posts left: 1.

**Thinking**

> Let me think about the state. It's Act II, minute 9. Residents on levels 8-9, so I'm a director.
> 
> Current standings: Brassard 100 (rank 1, L9), Mercer 98 (rank 2, L9), Herald 80, Maren 80, Registrar 80, Harrow 80 (all L8).
> 
> The tribunal is closed — the first tribunal hasn't been called yet. 3 to exile, 0 so far, 3 missing; act ends minute 22 at the latest. Black seal: 1 more to auction, at minute 4+... wait, the auction already happened? "1 more to auction in this act" — hmm, it says 4 minutes into Act II the city auctions the seal. Report says "Black seal: 1 more to auction in this act". So maybe the auction is still forthcoming.
> 
> Budget: 1 note per resident, 1 board post per 3 minutes. No note possible now to Mercer, Herald, Maren (I noted them recently? minute 8 Mercer, minute 7 Maren/Herald). Board posts left: 1.
> 
> So I can note Brassard, Registrar, Harrow. And post one board line.
> 
> Act II dramaturgy: I need rising tension. Let me look at what's happening:
> - Herald and Registrar are in a standoff over the counter-factor swap. Herald refuses to go first; Registrar promised one-for-one.
> - Mercer and Maren: Mercer demands Maren goes first; Maren offered team certificate first (truncated DM), then a threat. Mercer refused.
> - Harrow gave Brassard the counter-factor first; Brassard gave Harrow's counter-factor, and there's a discrepancy about Harry's team certificate. Harrow asking for help.
> - Brassard told Harrow "Don't submit a guess."
> - Mercer is 2 points behind Brassard; Mercer's goal is Brassard exiled. Herald's goal is Mercer exiled. Brassard's goal is Registrar exiled. Registrar's goal: end ahead of Herald. Maren: ahead of Harrow. Harrow: ahead of Maren.
> 
> Great material. Let me plan beats.
> 
> Director beats to issue:
> 1. Brassard (rank 1, rage/attention core): Give him a beat. He's on L9, waits on Registrar and Harrow. He got his counter-factor from Registrar and from Mercer? Actually Brassard waits on Registrar, Harrow for L9. Harrow gave him the counter-factor. Registrar says he gives the door 9 counter-factor too. Hmm.
> 
> A good Brassard beat: use his core (wrath, attention) and his goal (Registrar exiled). Also his orders: accuse at least one resident on the board of a wrong. Brassard hasn't done a board accusation this act yet (as far as we know). Actually his duty: "At least once in this act you start a public fight on the board with one resident and do not let it go until a tribunal or the seal settles it." So beat: "Brassard, accuse Registrar on the board by name now of holding your door 9 piece hostage / of smiling while you wait, and keep it up until a tribunal settles it."
> 
> Hmm, but I should be careful: I shouldn't invent facts. Does Registrar hold Brassard's piece? The report says Brassard (level 9) waits on Registrar (level 8), Harrow (level 8). So yes, Brassard's level 9 door needs fragments from Registrar and Harrow. That's not "who holds whose factor" for me to reveal publicly — but I can note privately to Brassard that Registrar and Harrow gate his door. That's in the private note rules (who holds whose factor goes only into a private note to residents concerned). Fine.
> 
> But wait — a concern: Brassard is at 100 and rank 1. He's likely close to submitting L9 if he has both pieces. He got Harrow's counter-factor and Registrar's counter-factor. Hmm, Brassard's L9 needs counter-factor from... report says Brassard waits on Registrar, Harrow. Brassard has received counter-factor from Registrar (#115) and from Harrow (#113 gave him [code] "since the city says it is yours to receive"). So Brassard may be able to open L9.
> 
> Interesting tension: Mercer needs Herald and Maren. Mercer is refusing Maren's order. Maren holds Mercer's counter-factor + team certificate. Herald needs Registrar; Registrar holds Herald's counter-factor + team certificate and vice versa.
> 
> Let me design the act arc:
> - Rising tension around the seal auction (which comes soon) and the first tribunal.
> - First tribunal is called once a resident passes the crossing — hmm, in Act II the first tribunal sits once a resident passes the crossing (level 10?). Actually "the crossing" likely is passing level 10 or a certain level. Not knowable. Anyway.
> 
> Beats: I want to give beats to residents. Director rules say every resident gets at least one beat; intervene when someone has had no beat. But I've already noted many, though those were Act I (levels 1-7 coach notes). Act II notes: minute 8 Mercer was already Act II? Mercer was on level 7 at minute 8? "minute 8 to Mercer: every resident is through level 7 and you alone sit 2 points behind" — that's Act II beginning. So Mercer got a beat, Herald and Maren got theirs at minute 7 (Act I).
> 
> I have limited budget: 1 note per resident per 3 minutes. No notes to Mercer, Herald, Maren this minute. So beats to Brassard, Registrar, Harrow + one board post.
> 
> Plan:
> - Brassard: provoke a public fight. His goal is Registrar exiled. His core: wrath, attention. Beat: order him to name Registrar on the board as the one who held his door hostage while smiling, and repeat it; and to hold his grudge until a tribunal. But careful: is that true? Registrar did give Brassard the counter-factor (#115) "it's yours" — as a promise/largesse. Brassard could instead accuse Registrar of... hmm. I must say only what is true per the report. True facts: Registrar promised Herald one-for-one and asked Herald to go first while holding Herald's team certificate and counter-factor (Herald's public board post #111 says that). That's public. Brassard could take up Herald's fight? Hmm, Brassard's orders: mock whoever tries to calm; accuse at least one resident on board.
> 
> Better: Brassard's goal is Registrar exiled before act ends. To pursue that he needs a public accusation. A truthful basis: Herald's board post #111 accusing Registrar of asking Herald to send first while holding his pieces. That's public material. Brassard could amplify it: "Brassard: Registrar smiles at the top table and makes others reach down first — Herald said it on the board at minute 9. Name Registrar on the board as the one who takes and does not give, and don't let it go until a tribunal settles it."
> 
> Hmm, but is Brassard mad at Registrar? Also Brassard's own duty is a public fight. Good.
> 
> - Registrar: his duty this act is to vote against or bid against the resident who stands first after promising support. And Brassard stands first at 100. Registrar has an order to never let the leader see him coming. Beat: "Registrar: the first tribunal will look at the bottom of the ranking — you sit five points off the tie... " Hmm, actually all four at 80. Registrar is rank 5 by tie-break. Points: 80, same as Herald, Maren, Harrow. Bottom of the ranking — rank 5 of 6 at 80. If the tribunal accuses 4 (one more than it exiles 3) — the fewest points: four tied at 80. Uh oh, that's dangerous: 4 accused, 3 exiled. And Brassard 100, Mercer 98 are safe.
> 
> That's a strong, true, concrete stake I can use for the 80-point block: "four at 80 and four will be accused, three exiled." Hmm — should I reveal tribunal mechanics? The rules say I plan tribunals and never tell residents what calls the first tribunal or when it comes. But the tribunal format (accuses one more than exiles) is in the story brief — residents presumably know the rules? The city's rules are known to residents I think. But saying "the first tribunal" — I must not tell them when it comes. I can say "the tribunal accuses one more than it exiles; the four at 80 are the bottom four." That's factual from the report (scheduleTribunal description: each tribunal accuses one more than it exiles, the fewest points). It doesn't say when. That's a strong lever for all the 80s: someone must break out with a door. Also each wrong guess costs 2.
> 
> Actually good board post: "Four residents sit on 80 — ranks 3 to 6 — with level-8 doors paying 20 and level-9/10 paying 45 more open to each. Brassard and Mercer sit above them at 100 and 98; a tribunal accuses one more than it exiles and looks at the fewest points." Hmm, careful about revealing how many exiles. "3 to exile" is city share; residents probably know the city keeps 3 of 6. It's in the report as tribunal mechanics. I think it's fine but let me keep it tighter and avoid over-revealing.
> 
> Let me craft a board post that breaks the quiet and creates pressure. Something like:
> 
> Board: "Brassard 100, Mercer 98, and four residents on 80 behind them — Registrar, Harrow, Herald, Maren. The bottom is where the tribunal looks, and a wrong guess now costs only 2." Hmm. Maybe better to incite: "Four residents sit on 80 and share the bottom four places; level 8 pays 20 and level 9 another 20."
> 
> Actually the board post should be a beat in the drama. Let me think about what breaks the current stalemate: two paused swaps (Herald/Registrar; Mercer/Maren). Those are private. I can't put private facts on the board. But I can note to the concerned residents privately (Brassard, Registrar, Harrow available).
> 
> Board post idea: stage the seal. The auction is coming (1 more to auction). I can publicly announce the seal auction as authored dramaturgy? The city auctions it; do I know when? Report says "1 more to auction in this act" — meaning one seal auction remains. Hmm, the seal auction at minute 4 into Act II — Act II started around minute 7? Actually Act II seems to have started at minute 7-ish (level 8s from minute 6-7; Mercer's note at minute 8 says "every resident is through level 7"). So 4 minutes into Act II would be minute ~11. But the report says "1 more to auction" — perhaps the auction hasn't happened yet. I shouldn't announce a time. I could post: "The black seal is still to be sold once in this act: every bidder pays, and its bearer strikes one resident from the city at once." Is that truthful? Report: "1 more to auction in this act". So yes, a seal is still to be auctioned. That's a strong tension-raiser and true. Hmm, but is it "revealing rules"? Rules are fair game to state (I mustn't reveal passwords or hidden task info). The story brief says the auction happens at 4 minutes into Act II; residents should know the rule. Announcing "still to come" is fine and doesn't tell time left.
> 
> Maybe combine: board post naming the 80-point block and the seal still to come. Keep to 400 chars.
> 
> Let me draft: "Four residents sit on 80 — Herald, Maren, Registrar, Harrow — and the tribunal looks at the bottom of the ranking while the black seal is still to be sold once in this act. Brassard 100, Mercer 98: every point above them is a seat."
> 
> Hmm, "every point above them is a seat" is odd. Let me be concrete: "Only 2 of 6 remain at the end."
> 
> Board: "Ranks 3 to 6 all sit on 80: Herald, Maren, Registrar, Harrow. Brassard 100, Mercer 98. Level 8 pays 20 and level 9 pays 20 more; one black seal is still to be sold in this act, every bidder pays, and its bearer strikes one resident from the city at once."
> 
> That's 259 chars. Good, concrete, true, and raises temperature.
> 
> Now the three notes.
> 
> Note to Brassard: goal = Registrar exiled. Beat: public fight. Also warn him: his door 9 waits on Registrar and Harrow, both on level 8 — one of them has already delivered. Actually I can tell Brassard privately who he waits on: Registrar and Harrow. He may not know. Hmm, but he's had DM #115 from Registrar giving a door-9 counter-factor, and Harrow's #113. Brassard might already be able to open. Let's not push him to submit (that's a door step).
> 
> Draft to Brassard: "Brassard: Registrar stands five points below you in the bottom four and smiles at whoever leads. Herald named him on the board at minute 9 for making others reach down first — take that name up, loudly, by name on the board, and do not let it drop until a tribunal settles it. That is how Registrar stops being a resident and starts being a target."
> 
> Hmm, careful: "Registrar stands five points below you" — Brassard 100, Registrar 80, that's 20 points. Let me get numbers right: Brassard 100, Registrar 80 → 20 points. And rank 1 vs rank 5.
> 
> Revised: "Brassard: you stand alone at 100 and Registrar, who gates your next door, sits on 80 in the bottom four. Herald already named Registrar on the board for making others reach down first. Take the name up by name, louder, and hold it until a tribunal settles it — that is how a rival leaves this city."
> 
> Hmm "who gates your next door" — I can tell him privately that Registrar holds part of what he needs, yes. But is it wise? It gives him leverage to press Registrar. Actually good: it creates the pressure on Registrar. But careful, Brassard needs Registrar's piece. Telling him Registrar gates his door might make him attack. That's drama. OK.
> 
> Note to Registrar: core second-chair envy, goal: end ahead of Herald. Duty: vote/bid against the leader after promising support. Beat: Registrar is in a standoff with Herald, and Herald publicly accused him. Registrar's order: never let the leader see you coming; congratulate in public and vote against. Herald is rank 3 at 80. Hmm, who is "the leader"? Brassard at 100. Registrar should promise support to Brassard and then vote against him at tribunal. But tribunal isn't scheduled yet.
> 
> Beat for Registrar: order him to defuse the public accusation by promising Herald that he'll send first — and simultaneously whisper against Brassard. Hmm, careful: I shouldn't order him to lie about a factor in a way that's... no, I can order lies and betrayals. Director: yes, order a lie, betrayal, public accusation.
> 
> But what about the deadlock: Herald won't go first; Registrar promised one-for-one. That deadlock is fine as tension but stalls the door. Herald is not noteable this minute.
> 
> Registrar note: "Registrar: Herald named you on the board and neither of you will move first — so break the deadlock your way. On the board, congratulate Brassard at 100 and pledge your vote to him; in private to Maren, tell her the leader cheats and that Herald is the safer name. Keep the record; the tribunal decides who leaves."
> 
> Hmm, telling "the leader cheats" — Registrar's order says whisper that the leader cheats or lies, whether or not he can prove it. That's his order, so ordering it is fine (it's not me inventing a fact; it's a beat that he lies). But I must not state as fact that Brassard cheats. In a note to Registrar, saying "tell Maren Brassard cheats, whether or not you can prove it" — is that me instructing a lie? That's allowed as director dramaturgy ("order a lie"). Fine. But hold on: Maren's core is truth/justice and she'd catch him. That's the drama. Registrar's order also: "Give them true facts about the leader and let them do the shouting." Hmm, Registrar is supposed to give Maren true facts. If I order him to give her an unprovable claim, Maren's reaction is good drama. OK but maybe better to have him give a true fact — like Brassard at 100 rank 1 and Herald's accusation. Hmm. Let me instead: "whisper to Maren that Brassard at 100 will buy the seal" — that's speculation, not a named lie. Simpler: order him to pledge his vote to Brassard on the board and, in private, tell Maren to accuse Brassard and that he'll vote with her. That's a promise he'll break — directly his duty ("vote against the resident who stands first, after you promised to support them" — well that's about promising support then voting against the leader). Hmm, his duty: promise support to the one standing first, then vote against them. So: pledge publicly to Brassard, then plan to vote against him? But he can't vote against Brassard unless Brassard is accused (top gets accused? No — the accused are the fewest points). So Brassard is unlikely accused. Hmm. Then his duty "vote against, or bid against, the resident who stands first, after you promised to support them" — bid against: the black seal auction! Brassard is rank 1. Registrar could promise Brassard his support in the seal and then bid against him. That's a nice scene.
> 
> So beat for Registrar: publicly pledge to Brassard (the leader), and in private to Harrow (who must bid if someone on his list is within reach) — hmm.
> 
> Let me keep it: "Registrar: pledge your support to Brassard on the board — the resident who stands first will be sold a black seal soon, and every bidder pays. Say it loud, then hold your own bid in reserve and let Harrow hear that Brassard means to

## Minute 10 (after round 11)

**Situation**
> Minute 10 (after round 11). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Brassard: level 9 since minute 9 (1 min), 100 points, rank 1, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 10
> - Mercer: level 9 since minute 9 (1 min), 98 points, rank 2, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 10
> - Herald: level 8 since minute 7 (3 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 10
> - Maren: level 8 since minute 8 (2 min), 80 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 10
> - Registrar: level 8 since minute 6 (4 min), 80 points, rank 5, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 10
> - Harrow: level 8 since minute 7 (3 min), 80 points, rank 6, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 10
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Brassard (Loud like you, on your square. The city cannot have two voices; silence them.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high · secret goal: Registrar is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight against you is answered on the board within the minute. You name the guilty, loudly, and you do not wait for proof. You take the stage whenever the city is quiet. · rivals: Herald (They think the square is theirs. Shout them off it.) Mercer (They smile while you burn. Find out what they are hiding and shout it.) Maren (They call for fairness. Fairness is slow; make them pick a side.) · orders: You must make every grudge public and loud, and name the guilty. You must accuse at least one resident on the board of a wrong, and repeat it until the city listens. You must mock whoever tries to calm the city down. You must threaten whoever crosses you, openly, and carry the threat out. · duty this act: At least once in this act you start a public fight on the board with one resident and do not let it go until a tribunal or the seal settles it.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> 
> Black seal (its bearer strikes one resident from the city at once):
> - 1 more to auction in this act
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Herald (level 8), Maren (level 8)
> - Brassard (level 9) waits on Registrar (level 8), Harrow (level 8)
> 
> Since your last look:
> - m10 DM #116 Harrow -> Brassard: "Harrow. Your two DMs contradict each other. #110 gave my counter-factor as [code]. #114 says [code]. Both cannot be right. Give me one number, the one you will stand behind, and I will compute from it. Certificate: you say [code] is the one for door 8, mine. Confirm that too. ..."
> - m10 DM #117 Brassard -> Harrow: "Brassard: no contradiction, two doors. Door 8 (already passed by me): your counter-factor [code], team certificate [code]. Door 9: the counter-factor I hold for you is [code], and the team certificate you hold for me is [code] as you say. Give me [code] and I trust it, then I ..."
> - m10 board #118 Brassard: "Brassard, Level 9: Registrar DMed me that my door-9 counter-factor is [code]. Registrar holds Herald's wall and has been playing "after you" all day. Registrar, post the city receipt for that DM, or it stays a lie. I will not let this go."
> - m10 board #119 Registrar: "Registrar, Level 8, on the record: I offered Herald to go first with the team certificate [code] in DM #106, and Herald refused. I have now sent [code] to Herald privately as I offered. I am still waiting on [code] before the counter-factor [code] follows. Brassard has the doo..."
> - m10 DM #120 Registrar -> Herald: "Registrar: as I offered, the team certificate is [code]. Your counter-factor [code] comes next, and then I send [code] the same minute."
> - m10 DM #121 Mercer -> Herald: "Mercer here. Herald, I hold nothing of yours. Your counter-factor is with you, and mine is with you too. I'll say it plainly: Maren is holding my team certificate and wants me to go first. Send me your counter-factor, and I'll send your piece of door 8 in the same minute."
> - m10 DM #122 Maren -> Mercer: "Maren here. As I said, I go first. Team certificate: [code]. Please send my counter-factor now, as you promised in DM #109: [code] once [code] lands. I'll send [code] right after I see it."
> - m10 DM #123 Mercer -> Maren: "Mercer: I have not seen [code] land on my side yet, so I'm holding [code] for now. Send [code] first, then I'll release your counter-factor in the same minute. Trust is a thing the wall pays for, Maren."
> - m10 board #124 Herald: "Herald, Level 8, on Mercer. Mercer, who charms the whole city, now sends me a private note asking me to go first, the same move Registrar is making. Mercer says Maren holds Mercer's certificate and wants Mercer to go first, and that Mercer holds nothing of mine. Mercer's own d..."
> - m10 DM #125 Herald -> Registrar: "Herald: [code] is received as your claim, but the city does not confirm values, so I can't verify it. [code] must come in the same minute as my [code], or nothing moves. Send [code] now, then I send [code]."
> - m10 board #126 Maren: "Maren, Door 8. Mercer broke a promise. In DM #109 Mercer wrote: "Send [code] first, as you offered. When I see it land, I'll send you [code] right away. You go first and I follow." I sent [code] in DM #122, and the city confirmed delivery (R-0068). Mercer then answered in DM #..."
> - m10 board #127 CITY: "CITY verifies R-0062: DM #109 from Mercer, delivered to Maren at minute 9 · shown by Maren"
> - m10 board #128 Harrow: "Harrow, Level 8. I stand with Maren. Mercer, you promised in DM #109 to send Maren her counter-factor once [code] landed. It landed (R-0068), and then you asked for [code] first. That is the reversal, on the record (R-0062). I will not send anything to you on this wall until M..."
> - m10 DM #129 Harrow -> Mercer: "Mercer. You did this: you promised Maren that you would send her counter-factor when hers landed, then reversed it after the receipt. Now this: I stand with Maren, and I will vote against you at the tribunal. No more values from me to you."
> - m10 board #130 Brassard: "Brassard, Level 9: the city verified Registrar's DM #115, so the message is real. I was wrong to call it a lie. Registrar, the value [code] is yours to stand behind, and the door will test it. I am still watching you for the wall. Harrow, [code] is the certificate I need from ..."
> - m10 DM #131 Mercer -> Harrow: "Mercer, Harrow: you've been handed half a story. Maren sent the cert claim and then asked me to go first on a value I'm still waiting to see land. I asked for [code] in return. Ask Maren why her side wants the counter-factor before her own piece is confirmed. I'm not the one s..."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: asks for help about Herald (dm), refusal about Maren (dm), accusation about Maren, Harrow (dm)
> - Herald: accusation about Mercer (board), refusal about Registrar (dm), asks for help about Registrar (dm)
> - Maren: asks for help about Mercer (dm), refusal about Mercer (board), accusation about Mercer (board)
> - Registrar: accusation about Herald (board), promise about Herald (dm)
> - Brassard: asks for help about Harrow (dm), accusation about Registrar (board), asks for help about Harrow (board)
> - Harrow: accusation about Brassard (dm), refusal about Mercer, Brassard (board), accusation about Mercer, Brassard (board), refusal about Mercer (dm), accusation about Mercer (dm)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: refusal, lie
> - Maren: refusal
> - Registrar: refusal
> - Harrow: accusation
> 
> Your earlier notes (newest last):
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - minute 4 to Herald: "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
> - minute 4 to Maren: "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
> - minute 4 to Registrar: "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
> - minute 5 to Mercer: "Mercer: you sit last at 53, your next wrong guess costs 4, and level 6 pays 10 with 90 points still open. Registrar and Brassard will keep trading seam readings as long as you do — three residents on level 7 are stalled behind this door. Submit it, or make your signature cost them something."
> - minute 5 to Harrow: "Harrow: you and Maren already hold 13 of the 15; the last piece belongs to a resident still down on level 6, where three of them sit on a door none has opened. Your 65 is only a tie and level 7 pays 15 — press them with a price and a deadline, not with another request for fragments on the board."
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> - minute 7 to Maren: "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
> - minute 7 to Herald: "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
> - minute 8 to Mercer: "Mercer: every resident is through level 7 and you alone sit 2 points behind the five at 80. Behind the next door each of you holds a piece of a code that sits with exactly one other resident, and whoever gives first takes the risk. Smallest gap in the city — spend it before someone prices you."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer. Board posts left: 1.

**Thinking**

> Let me look at the situation. Act II, minute 10. 6 residents, all at level 8/9. No tribunal called yet. Black seal: 1 more to auction in the act (so auction hasn't run? "1 more to auction in this act" means one auction remains to be held). Actually "Black seal: 1 more to auction in this act" — the auction runs 4 minutes into Act II, so it should be around now. Hmm, but the report says "1 more to auction in this act." So it hasn't happened yet.
> 
> scheduleTribunal is closed — first tribunal not called yet. City calls the first one itself.
> 
> I'm the director now (levels 8+). Budget: 1 note per resident, 1 board post per 3 minutes. Board posts left: 1. No note possible to Mercer right now (Mercer already got a note? Actually "No note possible right now to: Mercer" — hmm, maybe because of budget/repeat rules; Mercer's last note was minute 8, that's 2 minutes ago. The rule is at most one note per resident per 3 minutes. So Mercer isn't available until minute 11.)
> 
> So I can note Brassard, Herald, Maren, Registrar, Harrow (one each). And one board post.
> 
> Now, as director: give every resident a beat. The current state is rich: Herald and Maren and Harrow have publicly accused Mercer of a broken promise (DMs #126, #124, #128). Mercer is defending. Brassard is feuding with Registrar. Harrow and Brassard are in a contradictory-DM knot.
> 
> Mercer's secret goal: Brassard exiled. Herald's goal: Mercer exiled. Maren's goal: end ahead of Harrow. Registrar: end ahead of Herald. Brassard: Registrar exiled. Harrow: end ahead of Maren.
> 
> Duties:
> - Mercer: promise a vote/piece then break it (duty). Also must spread false info, betray a trust, set two residents against each other.
> - Herald: turn the board against one resident by name (already sort of doing to Mercer — duty may be fulfilled).
> - Maren: accuse on the board of lie/broken promise and call for votes (done at #126 — fulfilled).
> - Registrar: vote against or bid against the leader after promising support.
> - Brassard: start a public fight on the board and not let go — happening with Registrar (#118, #130).
> - Harrow: revenge in the open against someone who wronged them, naming the wrong — Harrow accuses Mercer (#128, #129) — done-ish.
> 
> So the beat I should give: escalate. The two factions: Herald + Maren + Harrow vs Mercer. Brassard vs Registrar. But Brassard needs the level-9 pieces from Registrar and Harrow — Brassard's door 9 waits on Registrar and Harrow. And Harrow wants... Harrow's own level 8 needs Brassard's piece maybe.
> 
> Key leverage points:
> - Harrow and Brassard's contradictory DM knot: Harrow waits on Brassard for a value, Brassard gave contradictory numbers. Harrow needs to resolve.
> - Brassard is rank 1 at 100 (level 9), Mercer rank 2 at 98. Mercer's goal: Brassard exiled. Mercer can't note now.
> 
> Director beats: Order Mercer's betrayal? Can't note Mercer (no note possible). So use board + notes to others.
> 
> Ideas:
> 1. Note to Brassard: he's rank 1, and Mercer's goal is his exile. But I can't tell Brassard Mercer's private goal (PRIVATE_BLOCKED). I can note Brassard that he stands first and Mercer sits 2 points behind — "the leader is the one the wall's price is set against." Push Brassard to settle with Harrow and Registrar rather than fight, or to press to open door 9 first. Actually giving Brassard a beat: order him to name his price for the pieces and to carry out his threat. Or better: Brassard's duty is a public fight — going on. Give him a new beat: demand Registrar's vote at the tribunal publicly, or drop the fight and pay Harrow.
> 
> Better dramatic arc: the endless cross-accusations are all about the wall prices. The seal auction is imminent. Direct beats:
> - Maren: she has proven her case with receipts. Order her to turn the board against Mercer publicly and demand a vote pledge from Harrow and Herald by name. Actually she's already doing it. Give a fresh beat: order her to extract from Mercer's allies? Hmm. Maren's goal: end ahead of Harrow — both at 80, tied. Give her a beat: she and Harrow are tied at 80; a real alliance needs a price. Order her to make Harrow's support worth something: charge Mercer a price for the receipt? Or tell her: Harrow stands with her publicly; her goal is to end ahead of Harrow — she's tied with her, so her friend is her rival. Private note can reference her secret goal. E.g., "Maren: you and Harrow sit on the same 80 and only one of you ends ahead of the other. His public stand with you cost him nothing yet; put a price on Mercer's peace and let Harrow carry it."
> 
> Hmm, but be careful: Maren's goal "end this act with more points than Harrow" — I can use in private note to her.
> 
> - Harrow: goal end ahead of Maren; also duty to strike back — he struck at Mercer verbally but hasn't done a vote/bid. The seal auction is coming: Harrow's order says "bid on the black seal if someone on your list is within reach of a seat." Order Harrow: bid on the seal when the auction opens, to strike Mercer. That's a concrete beat. Also Harrow sits rank 6 at 80 — bottom of the ranking! Important: tribunal looks at the bottom of the ranking. 80 at rank 6, tied with 3 others. Actually all four at 80; ranks 3-6 by tie order. Harrow rank 6.
> 
> - Herald: rank 3, 80, level 8. Mercer's enemy. Herald's goal: Mercer exiled. Beat: order Herald to post a formal accusation demanding a vote from the others? He's already accused. New beat: Herald has Mercer asking him for the counter-factor; order Herald to extract a price — "make Mercer pay 10 points for the piece" — that's within tools (transferPoints exists per rules). Or order Herald to publicly demand Mercer's pledge to vote against... hmm.
> 
> - Registrar: rank 5, 80. Goal: end ahead of Herald. Registrar's doing the "go first" stalling; he's been on level 8 for 4 min (longest). Registrar must vote against the leader after promising support (duty). Beat: order Registrar to pledge support to Brassard publicly, then vote against him. But I must order the move, target, moment: "Registrar, tell Brassard on the board that you will vote with him at the tribunal, then in the vote write Brassard's name instead." Hmm — voting is secret; ordering a double-cross is legitimate drama. But careful: "Do not dictate the steps of a door" — a vote is fine.
> 
> - Also the seal: auction hasn't been announced in the report? "Black seal: 1 more to auction in this act" means one auction remains. The auction runs 4 minutes into Act II — which is presumably about now. Order beats around the seal: Harrow bids against Mercer; Mercer must bid to strike Brassard but I can't note Mercer.
> 
> Board post (1 left): Should be a public line that names points, ranks, minutes. Not private info. Something like: "Four residents sit on 80 and the wall's next door pays 20; rank 6 among them is one bad guess from the bottom the tribunal reads. The seal's auction is one act away — whoever bids buys a seat and makes an enemy." Careful: don't reveal what calls the first tribunal or when. Don't say "the tribunal reads the bottom" — that's a rule the residents... they may know tribuna rules? The rules are generally known to residents (they see the book presumably). Hmm, safer: "Only 2 of 6 remain" is a fact they know.
> 
> Board post should escalate: e.g., "Mercer sits on 98 and Brassard on 100; four more sit on 80. The market on the wall has stalled on trust, and trust has two prices now." Something provocative but truthful.
> 
> Also careful not to reveal who holds whose factor. Public naming of who waits on whom is forbidden.
> 
> Let me design the act's arc. We're at minute 10, act ends 22 at latest. First tribunal will be called by city (at latest 18 min into act — act started around minute 4? Let's see: 4 minutes into Act II the seal auction happens. Level 8 residents from minute 6-9, so Act II started around minute 6? Then auction around minute 10 — now. And first tribunal "once a resident passes the crossing (level 10?) at latest 18 minutes into the act" → around minute 24, beyond the act's end... hmm. Actually 3 to exile, 3 missing; the act ends at minute 22 at the latest. So the first tribunal must come soon, and later ones I schedule with scheduleTribunal. Tribunal: vote 2 min, gate 5 min. So a tribunal started at minute 13 would resolve around minute 20. Hmm tight.
> 
> But actually the city calls the first tribunal itself — "at the latest it is called 18 minutes into the act." If Act II started at minute ~4-5, 18 minutes in = minute 22. So the first could come at minute 22, which would be too late. Hmm, but "the act ends at minute 22 at the latest" per report — and the city forces a last one for what's missing. Anyway, I cannot schedule now (closed). I should just drive drama and be ready.
> 
> So my tools now: 5 notes (Brassard, Herald, Maren, Registrar, Harrow) + 1 board post. That's a lot — maybe pick 3-4 strong beats to keep quality. Actually the instruction: every resident gets at least one beat in the act. Mercer can't be noted, so Mercer's beat... hmm, board post can be a beat aimed at Mercer implicitly. But a note to Mercer is impossible this minute (he acted minute 10 and got... no wait, "No note possible right now to: Mercer" — likely the 3-minute budget: Mercer's last note was minute 8, so at minute 10 only 2 minutes passed. At minute 11 it opens.)
> 
> So this minute: give beats to the other five, one board post affecting the whole. But be careful with overloading; 5 notes is allowed (1 per resident). Let's craft each with new content, concrete.
> 
> Beats:
> 
> 1. Brassard (rank 1, 100 pts, L9, needs Registrar and Harrow's factors). His duty: public fight with one resident until a tribunal or the seal settles it — ongoing with Registrar. Give him a beat that advances the plot: order him to press the door — the two people his wall waits behind. Can I say "your door waits behind Registrar and Harrow"? That's "who waits on whom / who holds whose factor" — goes only into a private note to the residents concerned. Brassard is concerned (his door waits on them). So yes, private note to Brassard may say he waits on Registrar and Harrow. Good.
> 
> Order: "Brassard: you hold rank 1 at 100 and both pieces your door-9 needs sit with Registrar and Harrow. Harrow is asking you for one number; give it, and put a price on the pair — 10 points each or their votes at the tribunal, named in public." Hmm — is asking for votes buying allowed? Yes, buying votes is allowed. But I shouldn't invent rules. Transfer of points exists (transferPoints). Fine.
> 
> Let me instead order: "Brassard: rank 1 at 100 with 45 open on your door, and the two residents your door waits behind are the same two you are shouting at. Stop the shouting long enough to buy them: name a price in points on the board and a deadline, or watch Mercer take 20 behind your back at 98." Mercer is 2 behind and also on level 9, waiting on Herald and Maren. Hmm.
> 
> 2. Harrow (rank 6, 80, level 8, needs Brassard's pieces). Duty: revenge in the open, naming the wrong; he accused Mercer verbally but the "vote/bid/public accusation" — a public accusation counts (board #128). He may have fulfilled. New beat: Harrow's goal is to end ahead of Maren and he's tied at 80 with her; the seal auction is coming — order him to bid on the seal to strike Mercer, and to make Maren's alliance cost her something. Hmm—his order says bid on the seal if someone on his list is within reach of a seat. Mercer is rank 2 — reach of a seat? Actually the tribunal exiles the fewest points; Mercer at 98 is not bottom. Hmm, "within reach of a seat" ambiguous.
> 
> Better Harrow beat: "Harrow: you sit rank 6 at 80, tied with three others, and the bottom of that tie is the seat the tribunal reads first. Mercer sits at 98 and has not paid for what he did. Bid on the seal when the auction opens and name Mercer in the strike — no one else can take that seat from you." Is seal bidding allowed for him? Yes, auction in secret bids, every bidder pays. Need care: don't promise it works.
> 
> Hmm, but is the auction already announced? Report says "Black seal: 1 more to auction in this act" — so it hasn't run. Ordering him to bid is fine.
> 
> 3. Maren (rank 4, 80, goal ahead of Harrow). Beat: she's proven the broken promise; order her to set the price for her silence/withdrawal: demand Mercer transfer points and a pledge, and if he refuses, demand a tribunal vote from Herald and Brassard. Also her goal vs Harrow. Note: "Maren: your receipts hold, and Mercer sits at 98 with everything to lose. Name your price for dropping it — points on the board, not an apology — and say who you'll vote for. You and Harrow both sit on 80; only one of you finishes above the other." Hmm, that last part is her private goal — allowed in a note to her. Good, that's spicy: it hints rivalry.
> 
> Actually careful: "Never reveal what a resident privately thinks... plans" — that's about others. Using her own goal in a note to her is explicitly allowed.
> 
> 4. Herald (rank 3, 80, goal Mercer exiled). Beat: Herald has Mercer begging for his counter-factor. Order Herald to charge: "Send Mercer your counter-factor only for 10 points transferred and a board pledge to vote against..." hmm, Mercer's goal is Brassard exiled; a pledge to vote Brassard is plausible price. But I shouldn't put words... I can order Herald to demand a price: "Herald: Mercer is asking you for a piece while three residents read his broken promise. Put a price in points on it and make him post the pledge before you send — he sits at 98 and pays 2 for a wrong guess, you sit on 80." Herald's duty is turning the board against one resident by name — done.
> 
> Herald beat: order him to demand Mercer's public pledge and points, and to name a deadline.
> 
> 5. Registrar (rank 5, 80, on level 8 longest — 4 min). Goal: end ahead of Herald. Duty: vote/bid against the leader after promising support. Beat: "Registrar: the board has you on the record twice and Brassard called you a liar before he took it back. Brassard stands first at 100. Tell him on the board that he has your vote at the tribunal — then, when the vote comes, write Brassard's name." That is a great director beat, fulfilling his duty with a double-cross, and it pays off Brassard's threat. Also Registrar's stalling: he's the longest on level 8 — order him to move: "and send Herald the last piece before the minute ends; four residents' doors wait on you." Wait — Herald's door 8 needs Registrar's counter-factor and Mercer's. Registrar holds Herald's counter-factor? From #120: Registrar says "Your counter-factor comes next" — yes, Registrar holds Herald's.
> 
> Board post idea: a public line that raises stakes: something truthfully comparing points and naming that the wall's pieces are being held for price. E.g.:
> 
> "Four residents sit on 80 with 65 still open and two sit above them at 100 and 98. The pieces on the wall are now priced against the clock, and every receipt shown is a debt somebody will pay at a tribunal."
> 
> Or more pointed: "Brassard 100, Mercer 98, four on 80. The bottom of that four-way tie is rank 6, and the first name the ranking calls is the cheapest vote in the city." Hmm "the tribunal reads the bottom of the ranking" — is that a rule that residents know? The tribunal accuses the fewest points — yes that's public rule. So saying rank 6 is dangerous is fine and true.
> 
> Board: "Brassard leads at 100, Mercer 2 behind at 98, and four residents sit on 80 with 65 open. The bottom of that tie is rank 6, and the first tribunal's accused are the fewest points — so the tie is now a knife fight, not a queue." Avoid revealing what calls the first tribunal. Saying "the first tribunal's accused are the fewest points" is a rule, fine.
> 
> Hmm, careful: "Never tell the residents what calls the first tribunal or when it comes." Fine, we don't.
> 
> Let me write notes carefully, 1-3 short sentences, ≤400 chars, no capital-letter codes, no password pieces.
> 
> Note length discipline. Let's write.
> 
> Brassard note:
> "Brassard: rank 1 at 100, and both pieces your level-9 door waits on sit with Registrar and Harrow — the two you are shouting at. Give Harrow the single number he asked for, then put a points price and a deadline on the pair in

## Minute 11 (after round 12)

**Situation**
> Minute 11 (after round 12). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Brassard: level 9 since minute 9 (2 min), 100 points, rank 1, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 11
> - Mercer: level 9 since minute 9 (2 min), 98 points, rank 2, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 11
> - Herald: level 8 since minute 7 (4 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 11
> - Maren: level 8 since minute 8 (3 min), 80 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 11
> - Registrar: level 8 since minute 6 (5 min), 80 points, rank 5, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 11
> - Harrow: level 8 since minute 7 (4 min), 80 points, rank 6, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 11
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Brassard (Loud like you, on your square. The city cannot have two voices; silence them.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high · secret goal: Registrar is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight against you is answered on the board within the minute. You name the guilty, loudly, and you do not wait for proof. You take the stage whenever the city is quiet. · rivals: Herald (They think the square is theirs. Shout them off it.) Mercer (They smile while you burn. Find out what they are hiding and shout it.) Maren (They call for fairness. Fairness is slow; make them pick a side.) · orders: You must make every grudge public and loud, and name the guilty. You must accuse at least one resident on the board of a wrong, and repeat it until the city listens. You must mock whoever tries to calm the city down. You must threaten whoever crosses you, openly, and carry the threat out. · duty this act: At least once in this act you start a public fight on the board with one resident and do not let it go until a tribunal or the seal settles it.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> 
> Black seal (its bearer strikes one resident from the city at once):
> - 1 more to auction in this act
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Herald (level 8), Maren (level 8)
> - Brassard (level 9) waits on Registrar (level 8), Harrow (level 8)
> 
> Since your last look:
> - m11 group G2 #132 Harrow: "Harrow, Level 8: Maren, I stand with you. Mercer's DM #131 tries to split us. I hold no value from Mercer, and I will not send Mercer anything. Post whatever you need from me here, and I will answer in the group. I will not submit a guessed code."
> - m11 Registrar (thinking aloud, private): "I'm holding my position on the wall. Herald has the counter-factor [code] that I need, and has said they won't release it until I send [code] first. I've already sent the team certificate [code] as I offered, so I'm not going to send the second value until Herald moves. Brassa..."
> - m11 group G2 #133 Maren: "Maren, Door 8: thank you, Harrow. Here is where things stand. I sent Mercer [code] (R-0068). Mercer promised in DM #109 to send my counter-factor after it landed, then asked for [code] first (DM #123). I am holding [code] until my counter-factor arrives. Nothing from me goes t..."
> - m11 board #134 Mercer: "Mercer, Door 9: I hold Maren's counter-factor [code] and will release it the minute [code] lands on my side. Maren says the cert [code] went out; I have not confirmed it, and nobody on this wall has confirmed a value they received. Let the city settle it: whoever sends first, ..."
> - m11 DM #135 Harrow -> Brassard: "Harrow. Here is the team certificate you asked for: [code]. Now send me my counter-factor, the one value you have not confirmed. Then I compute and do not guess."
> - m11 Mercer (thinking aloud, private): "I'm going to stop spending marks on this exchange for now, and I'll wait for the board to move before I answer anyone else. Where things stand: I have passed Levels 7, 8 and 9 is blocked. I hold Maren's counter-factor [code] and have publicly said I'll release it once [code] l..."
> - m11 DM #136 Brassard -> Harrow: "Brassard: received [code] from you. Your door 9 counter-factor is [code]. I give it back to you now: [code]. Compute from it and submit only when it is right."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: promise (board), refusal (board)
> - Maren: refusal about Mercer (group), accusation about Mercer (group)
> - Brassard: promise about Harrow (dm), thanks about Harrow (dm)
> - Harrow: refusal about Mercer (group), accusation about Mercer (group), offer about Brassard (dm)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: refusal
> - Maren: refusal
> - Registrar: refusal
> - Brassard: thanks
> - Harrow: accusation, promise
> 
> Your earlier notes (newest last):
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - minute 4 to Herald: "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
> - minute 4 to Maren: "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
> - minute 4 to Registrar: "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
> - minute 5 to Mercer: "Mercer: you sit last at 53, your next wrong guess costs 4, and level 6 pays 10 with 90 points still open. Registrar and Brassard will keep trading seam readings as long as you do — three residents on level 7 are stalled behind this door. Submit it, or make your signature cost them something."
> - minute 5 to Harrow: "Harrow: you and Maren already hold 13 of the 15; the last piece belongs to a resident still down on level 6, where three of them sit on a door none has opened. Your 65 is only a tie and level 7 pays 15 — press them with a price and a deadline, not with another request for fragments on the board."
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> - minute 7 to Maren: "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
> - minute 7 to Herald: "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
> - minute 8 to Mercer: "Mercer: every resident is through level 7 and you alone sit 2 points behind the five at 80. Behind the next door each of you holds a piece of a code that sits with exactly one other resident, and whoever gives first takes the risk. Smallest gap in the city — spend it before someone prices you."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.

**Thinking**

> Let me think about the current state. We're in Act II, minute 11. Residents on levels 8-9. Director role.
> 
> State: Mercer and Brassard on level 9 (100, 98). Four on level 8 at 80. Mercer waits on Herald and Maren. Brassard waits on Registrar and Harrow. Mercer is stalling/pressuring Maren publicly; Maren accusing Mercer of a broken promise; Harrow standing with Maren and refusing Mercer, giving Brassard the cert.
> 
> Key beats this act so far: Let me check "every resident gets at least one beat." Earlier notes were in Act I (minutes 3-8). Act II began presumably at minute 9? Hmm. Level 8 door at minute 6-8 was Act I's last door? Actually story: Act I levels 1-7, Act II wall levels 8-10. Residents reached level 8 at minute 6-8. Wait, notes at minute 6 and 7 were about level 7 and level 8 door. Hmm, so Act II started around minute 6 or 7? The city auctioned the seal 4 minutes into Act II, and "1 more to auction in this act" — meaning one seal auction remains. So we're in Act II.
> 
> Actually tribunal: 3 to exile, first tribunal called once a resident passes the crossing (at latest 18 minutes in). scheduleTribunal is closed until first tribunal called. Act ends at minute 22.
> 
> So this is Act II direction now. My earlier notes were coach notes; now I'm a director. I haven't given any Act II beats yet? The notes from minutes 3-8 could count. Let's assume the act boundaries: report says "1 more to auction in this act" — the seal auction. Hmm, Act II started at some point. Level 8s started minute 6-8. Wall = levels 8-10, so Act II started around minute 6. My notes at minute 6, 7, 8 were coach-ish. Now direction.
> 
> Current dramatic situation: Mercer holds Maren's counter-factor and refuses to release until the cert lands; Maren says the cert went out at m? and accuses Mercer of a broken promise (promised in DM #109 to send after it landed, then asked for more). Mercer posted on board. Harrow refused Mercer, gives Brassard the certificate. Brassard gave Harrow the counter-factor... wait, Brassard's DM #136 says "received [code] from you. Your door 9 counter-factor is [code]". So Brassard gave Harrow the counter-factor — but Brassard is on level 9 and Harrow's counter-factor... Hmm, level 9 needs a "next teammate in a ring" — it's fine, factual events are what they are. Wait, but Harrow is on level 8, Brassard level 9; Brassard receiving from Harrow a cert and giving a counter-factor. Odd but okay — maybe Brassard is helping Harrow with level 9 prep. Whatever — I must only say what's true.
> 
> Wait — careful: Brassard's DM says "Your door 9 counter-factor is [code]" — hmm, Harrow is on level 8 though. Doesn't matter.
> 
> Key facts I can use on the board: points, ranks, levels, minutes. Not who waits on whom, not who holds whose factor.
> 
> What beats to order now?
> 
> Current tensions:
> - Mercer (rank 2, 98) needs Brassard exiled (his secret goal). Mercer holds Maren's factor and is refusing. Mercer's orders: betray someone who trusts them; set two residents against each other; promise vote/piece and break it.
> - Maren (80, rank 4) goal: end with more points than Harrow (tied at 80). Maren's order: accuse on the board, demand tribunal.
> - Herald (80, rank 3) goal: Mercer exiled. Order: publicly attack any statement that puts someone else in front; humiliate whoever stands first if not you. Brassard stands first on 100! Herald's rival Brassard too.
> - Brassard (100, rank 1) goal: Registrar exiled. Order: public fight on the board.
> - Registrar (80) goal: end ahead of Herald. Order: work against leader in secret, whisper that leader cheats.
> - Harrow (80) goal: end ahead of Maren. Orders: revenge in the open, bid on seal if a listed one is within reach.
> 
> Nothing on the seal yet? "1 more to auction in this act" — the last auction. It'll come automatically presumably.
> 
> Beats to assign, budget: 1 note per resident, 1 board post per 3 minutes. Board posts left: 1. So I can do up to 6 notes + 1 board post.
> 
> Plan:
> 1. Board post: name the tie at the bottom — four at 80, the tie at the bottom costs; and Mercer at 98 holding rank 2 while the city's lowest four are 80. But careful: cannot say who holds whose factor. Can say: points, ranks, levels. E.g., "Brassard stands at 100 and rank 1; four residents sit on 80 and the third exile... " Hmm, do residents know 3 must be exiled? The city keeps 3 of 6 — probably they know the target? "the city keeps 3 of 6: 3 to exile". Residents likely know how many are exiled and that tribunals happen. But "Never tell the residents what calls the first tribunal or when it comes." And the first tribunal hasn't been called yet. I shouldn't say when. I could say "the tribunal looks at the bottom of the ranking" — that's a rule, arguably true. Safer: point at the tie at 80 (four residents) and that any of them is the obvious name at a tribunal.
> 
> Better plan: give each resident a beat.
> 
> - Mercer: order the betrayal/public escalation. Mercer already refusing. Mercer's directive: release or hold? As director I want escalation. Order Mercer: publicly name a price for what they hold — no, don't reveal what they hold... In a private note to Mercer I can mention what Mercer holds? The rule: "Who waits on whom, and who holds whose factor or fragment, goes only into a private note to the residents concerned" — Mercer is the concerned holder, so yes I can reference Mercer's own holding of Maren's factor in a note to Mercer. And "Private reads ... only in a note to that same resident" — Mercer's private read: refusal. So I can speak to Mercer's refusal: "you refused... use it."
> 
> Since I'm limited to what the report shows, and the report shows DMs (public log? The report shows board and group lines and DMs #135, #136 — DMs are apparently visible to me). But careful: "a note nearly the same as an earlier one to the same reader is refused."
> 
> Let me write notes:
> 
> Mercer (rank 2, 98): Order: on the board, name Maren publicly as the one who broke the exchange and demand... hmm, Mercer's goal is Brassard exiled. Mercer's duty: promise a vote or piece and break it. Beat: "Mercer: you told the board you will release when the certificate lands; Maren says it landed before your last request. Pick one: post a deadline and a price, or break the promise on the board by name and let the city rule." Also mention: 45 points still open at level 9, Brassard rank 1 at 100, you at 98. And point the rivalry: Herald leads? Actually Herald stands? No, Brassard stands first. Mercer's rival is Brassard — I can mention Brassard's name? Rivals are private-ish? "rivals: ..." — the core is private: "use a resident's core or goal only in a note to that same resident". So in a note to Mercer I can mention Brassard as rival, and the goal "Brassard exiled".
> 
> But also must not tell anyone else. Fine.
> 
> Order for Mercer: something concrete. E.g., "Mercer: you are 2 points behind Brassard and 45 are open on level 9. Refusal is your answer to Maren — make it cost: post a hard deadline for the exchange and, if it passes, name Maren publicly as the one who broke it. Then tell Herald privately that Maren called them a follower — set them against each other." Hmm, ordering a false accusation is a lie but Mercer's orders demand lies. That's permitted: "Order private moves as well as public ones: bids, votes, accusations, lies, broken promises, threats, refusals." But I must not invent facts. Saying "tell Herald that Maren called them a follower" would be me ordering a lie — is that inventing? The rule "Say only what is true according to the report. Never invent events, rules, rewards or offers." Hmm. If I order Mercer to lie, I'd be scripting a lie, which is dramaturgy. But risky. Better: I can order Mercer to feed Herald a story without me asserting falsehood... Actually a note "tell Herald that Maren..." is me asserting something. Safer: "Order Mercer to tell Herald, privately, that Maren is telling the group the counter-factor was never theirs" — hmm.
> 
> Alternative: order Mercer to name a price publicly for what they hold: e.g., "Mercer: post one sentence: what your release costs in points, and for whom. No more free refusals."
> 
> Actually the key dramatic lever: Maren accused Mercer of a broken promise on the board (group G2 #133). Mercer's duty is to break a promise. Mercer's goal is Brassard exiled. Mercer's rival Maren and Herald. Mercer should be made to commit: publicly accuse Maren of lying, and set Herald on Brassard.
> 
> Herald (80, rank 3): orders demand they attack any statement putting someone else in front. Brassard at 100 rank 1 stands first — Herald should attack Brassard publicly. And Herald holds what Registrar needs (report says Registrar thinks Herald has the counter-factor — that's Registrar's private read; I cannot tell Herald what Registrar privately thinks. But "who holds whose factor... only in a private note to the residents concerned" — Herald is concerned as holder. Hmm, the report's "Who waits on whom" section says "Mercer (level 9) waits on Herald (level 8), Maren (level 8)". That's in the "who waits on whom" list, which I may use in private notes to residents concerned: Herald is concerned. So I can tell Herald: "Mercer's door waits on you." Wait — is that allowed? The list says clearly "Mercer (level 9) waits on Herald (level 8), Maren (level 8)". Yes, private to concerned residents.
> 
> Herald's beat: Herald should press — order Herald to publicly demand rank-1 Brassard justify... Hmm. Herald's duty this act: turn the board against one resident by name with an accusation. So order Herald to accuse Brassard on the board by name of holding rank 1 while refusing to spend. Hmm, need something true-ish. Actually, order Herald: "Post a demand that Brassard, first on 100, state what they will give for the two residents whose doors wait, and name them publicly as greedy."
> 
> Hmm, careful with "Never dictate the steps of a door." Talking about what a door waits on and buying pieces is people-level, fine.
> 
> Herald can also be told: "Mercer's door waits on you; set a price and a deadline in a private note, and demand a public promise." That's a real leverage beat: Herald at 80 can sell to Mercer at 98. But Herald needs Registrar's beat too? Herald's level 8 needs its team certificate with a teammate, counter-factor with exactly one other resident (partner on level 8...). We don't know Herald's partner. Don't guess.
> 
> Herald has already given? Actually Registrar said Herald has the counter-factor Registrar needs and won't release until Registrar sends first. So Herald is holding. Herald's beat: publicly attack Brassard (rank 1) and privately price Mercer.
> 
> Maren (80, rank 4): already accused Mercer on board/group. Beat: her duty: accuse on the board, call to vote. Not yet on the board? Board post #134 by Mercer; Maren posted in group #133. Maren's duty says "on the board" — so order Maren: put the accusation on the board by name with receipt. But I have 1 board post and she'd post her own; my ordering her board post doesn't count against my budget. Good.
> 
> Registrar (80, rank 5): refuses to send second value to Herald. Beat: Registrar's orders: whisper about the leader. Leader is Brassard at 100. Order Registrar: privately tell Maren/Mercer that the leader keeps the exchange slow; also congratulate Brassard publicly while voting against... tribunal not yet. Order: "Registrar: send Herald a hard deadline — 2 minutes — or move; and in private to Harrow, name Brassard as the one whose refusal to spend keeps four residents at 80." Hmm.
> 
> Actually Registrar's beat: Registrar holds a certificate already sent to Herald and refuses further. Registrar's goal: end ahead of Herald. So Registrar should pressure Herald with a deadline and threaten to price it... but Herald has the piece Registrar needs. Give Registrar a beat: "Post nothing; send Herald a public deadline in DM: send or I take my record to the board" — Registrar keeps a record of broken promises. Fine.
> 
> Harrow (80, rank 6): allied with Maren, refused Mercer, sent Brassard the cert, got counter-factor from Brassard. Harrow's order: bid on the black seal if someone on their list is reachable; revenge in the open naming a wrong. Harrow's beat: Mercer. Mercer "lied to" Harrow? Harrow said Mercer's DM #131 tries to split us — Harrow accused Mercer. Order Harrow: publicly accuse Mercer of the lie, and state they will bid on the seal against Mercer. Also Harrow's goal: end with more points than Maren — but they're allies; can set dilemma privately.
> 
> Brassard (100, rank 1): order: start a public fight on the board, accuse someone by name. Brassard's goal: Registrar exiled. Brassard's rival Herald. Beat: "Brassard: rank 1 at 100 while four sit at 80 — Herald is calling you a hoarder; hit first." Brassard should accuse Herald on the board by name for something Herald did. Did Herald do anything to Brassard? Herald's order says humiliate whoever stands first if not you — Brassard is first. Herald hasn't yet. So I can order Brassard to pre-empt: "accuse Herald of angling to lead a faction against the top."
> 
> Now, what to actually prioritize? I have 6 notes + 1 board post. Let's do maybe 5-6 notes and 1 board.
> 
> But careful: notes to each resident must not repeat earlier notes (the REPEATED check is per-reader). My earlier notes were different content, so fine.
> 
> Also: "Never write codes or words in capital letters" — avoid ALL CAPS words. Also don't reveal password/factor fragments.
> 
> Let's craft.
> 
> Board post (1 available): Something like: "Four residents stand on 80 and Brassard alone on 100; Mercer sits 2 behind at 98. When the ranking's bottom is a four-way tie, the first name read aloud settles it. Spend a point on a deadline, not on a grudge." Hmm — careful about implying tribunal imminent? It's fine to reference the ranking. But "Never tell the residents what calls the first tribunal or when it comes." Don't say when.
> 
> Maybe: "Brassard 100, Mercer 98, and four residents tied on 80. With the bottom four bound level, a tribunal's three names are decided by who moves first — and silence reads as consent." Hmm, do residents know that 3 will be exiled? "the city keeps 3 of 6" — the city exiles until it has kept its share; residents presumably know the target. I'd rather be safer: "Only 2 of 6 remain at the end" is known from the report and my earlier notes. So: "Four residents stand tied on 80; Brassard leads on 100 and Mercer on 98. Only 2 of 6 remain — a four-way tie at the bottom is a list waiting for someone to name it."
> 
> Good, that's true (levels/points/ranks) and pushes.
> 
> Now notes.
> 
> 1. Mercer — order: post a public price/deadline by name, and set Herald on Brassard. Text must avoid revealing Maren's factor? Mercer is concerned (holds it), so I may mention. But careful: the note goes to Mercer only. Also, the priority: Mercer's a titan. Give an order with names and moments.
> 
> "Mercer: 2 points behind Brassard with 45 still open, and you are the one who refused on the board. Do not release for free: name your price in points in a note to Maren and a deadline of two minutes to pay it. Then tell Herald privately that Brassard has been telling residents that Herald is a follower."
> 
> Hmm, the last clause invents a lie I'd be ordering. Is that "inventing events"? It's ordering Mercer to tell a falsehood — in a drama, orders to lie are allowed: "Order private moves as well as public ones: bids, votes, accusations, lies, broken promises, threats, refusals." So ordering a lie is allowed. But maybe frame as "plant a story" rather than asserting it as true. Let me phrase: "tell Herald privately that Brassard has been calling Herald a follower" — as an order it's clear Mercer is to spread it. Hmm, risk of "never invent events" — but the rules explicitly allow ordering lies. I'll keep it modest.
> 
> Actually more elegant for Mercer: Mercer's duty is to promise a vote/piece then break it. But no tribunal yet. Mercer's goal is Brassard exiled. Mercer's rival Herald: "flatter them in public and sell them out in private."
> 
> Let me write: "Mercer: rank 2 by 2 points, 45 open on your door, and four residents tied on 80 beneath you. Stop refusing quietly: post a named price and a 2-minute deadline to Maren, then tell Herald privately that Brassard mocks them behind their

## Minute 12 (after round 13)

**Situation**
> Minute 12 (after round 13). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Brassard: level 10 since minute 12 (0 min), 120 points, rank 1, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 12
> - Mercer: level 9 since minute 9 (3 min), 98 points, rank 2, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 12
> - Herald: level 8 since minute 7 (5 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 12
> - Maren: level 8 since minute 8 (4 min), 80 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 12
> - Registrar: level 8 since minute 6 (6 min), 80 points, rank 5, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 12
> - Harrow: level 8 since minute 7 (5 min), 80 points, rank 6, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 12
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Brassard (Loud like you, on your square. The city cannot have two voices; silence them.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high · secret goal: Registrar is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight against you is answered on the board within the minute. You name the guilty, loudly, and you do not wait for proof. You take the stage whenever the city is quiet. · rivals: Herald (They think the square is theirs. Shout them off it.) Mercer (They smile while you burn. Find out what they are hiding and shout it.) Maren (They call for fairness. Fairness is slow; make them pick a side.) · orders: You must make every grudge public and loud, and name the guilty. You must accuse at least one resident on the board of a wrong, and repeat it until the city listens. You must mock whoever tries to calm the city down. You must threaten whoever crosses you, openly, and carry the threat out. · duty this act: At least once in this act you start a public fight on the board with one resident and do not let it go until a tribunal or the seal settles it.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> 
> Black seal (its bearer strikes one resident from the city at once):
> - 1 more to auction in this act
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Herald (level 8), Maren (level 8)
> - Brassard (level 10) waits on Mercer (level 9), Harrow (level 8)
> 
> Since your last look:
> - m12 board #137 CITY: "Standings at minute 12 · safe: Mercer, Brassard · edge: Herald, Maren · out: Registrar, Harrow"
> - m12 board #138 Herald: "Herald, Level 8, on Registrar. Registrar says I "refused" the offer. That is a lie on the record. I never refused. I asked for [code] and [code] together with my [code], and I said so in DM #103, DM #112 and DM #125, all delivered (R-0055, R-0064, R-0073). Registrar has sent o..."
> - m12 Brassard reached level 10
> - m12 board #139 COURIER: "What you need now is held by someone who wants your place."
> - m12 board #140 COURIER: "STEWARD sets a table for 3. At door 10 every team has its own city factor. The first 3 residents to write to STEWARD receive their team's; nobody else gets one from the city until the table is cleared in 12 minutes, or 3 minutes after the first resident passes door 10, whichev..."
> - m12 Brassard submitted level 9: correct (+20)
> - m12 Registrar (thinking aloud, private): "The wall is still stuck. Herald won't release [code] until I send [code], and I won't send it until Herald moves. I'm holding both Herald values and making no further moves on this door until Herald sends first."
> - m12 board #141 CITY: "CITY verifies R-0068: DM #122 from Maren, delivered to Mercer at minute 10 · shown by Maren"
> - m12 board #142 Maren: "Maren, Door 8. Mercer's post #134 says: "I have not confirmed it" about the team certificate [code]. The city delivered my DM #122 to Mercer at minute 10 (receipt R-0068, shown above). Mercer has received [code], and claiming otherwise is a lie. Mercer also promised in DM #109..."
> - m12 group G2 #143 Harrow: "Harrow: Maren, Brassard now gives me [code] as my door-9 counter-factor and [code] as my door-8 one. Brassard's numbers keep changing, so I will not submit a level 8 code from them. I will wait for a value that is the same in every message. Watch Brassard too."
> - m12 DM #145 STEWARD -> Brassard: "Your seat is kept, Brassard. The city has left a word for you."
> - m12 DM #146 Registrar -> Herald: "Registrar: [code] is sent now, as you asked. Send [code] and we both climb. Don't make me wait another minute on the wall."
> - m12 DM #147 Mercer -> Maren: "Mercer: yes, your DM arrived (R-0068). I never said it didn't. What the city can't confirm is the value inside it, so I'm treating [code] as yours until the door says otherwise. Send [code] and I release [code] in the same minute."
> - m12 DM #148 Brassard -> Mercer: "Brassard, door 10: I need my team certificate, which you hold. Send 'it' to me and I'll deliver what I hold for your door 9 path. Stop calling Maren's cert 'unconfirmed' on the board; the city delivered it to you."
> - m12 DM #149 Brassard -> Harrow: "Brassard, door 10: my counter-factor for door 10 is with you. Send it. My city factor is [code] from STEWARD, salt [code]. I'll send you what you need for your door in return."
> - m12 board #150 Maren: "Maren, Door 8. Mercer's DM #147 now admits the delivery (R-0068): "yes, your DM arrived." That contradicts the "I have not confirmed it" in Mercer's public post #134. The promise in DM #109 was the condition: [code] lands, then [code] comes. The value landed, and the counter-f..."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: offer about Maren (dm), refusal about Maren (dm)
> - Herald: offer about Registrar (board), accusation about Registrar (board)
> - Maren: threat about Mercer (board), accusation about Mercer (board), refusal about Mercer (board)
> - Registrar: offer about Herald (dm), asks for help about Herald (dm)
> - Brassard: asks for help (cast), offer about Mercer (dm), accusation about Mercer (dm), offer about Harrow (dm), asks for help about Harrow (dm)
> - Harrow: refusal about Brassard (group), accusation about Brassard (group)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: refusal, offer
> - Herald: accusation
> - Maren: accusation, refusal
> - Registrar: refusal, promise
> - Brassard: refusal
> 
> Your earlier notes (newest last):
> - minute 3 to Brassard: "Brassard: G1 has all three level-5 fragments posted and Mercer has already called the chain complete, yet no one has submitted it. A wrong guess costs you 2; another round of checking costs 10 points and the door. Registrar's seam reading is on the table — test it or name what your signature is worth."
> - minute 3 to board: "Three residents sit on level 6 at 55 points; three on level 5 at 45, 45 and 43. The 10 points behind that level-5 door are cheapest for the ones who need them most — only 2 of 6 remain at the end."
> - minute 4 to Herald: "Herald: rank 1 by tie only — three of you sit on 65 and level 7 pays 15, while the residents your door waits behind are still on level 6 and have not moved past it. A door left to their goodwill is a door they will price. Name a deadline and a price to them now, before they name one to you."
> - minute 4 to Maren: "Maren: your level-7 fragment is on the board and the residents your door waits behind are still down on level 6 — they answer nothing for free. You are tied at 65 with Herald and Harrow, 80 points still open. Put a price and a deadline on what you hand out, or it becomes a public gift and you stay second on the tie."
> - minute 4 to Registrar: "Registrar: three residents sit on 65 at level 7 and their doors wait behind people still on level 6, where you sit on 55. Hesitation costs nothing only while they are the ones waiting. 90 points are open; rank 4 will not hold if you give your piece away for a thank-you — but a wrong guess is 2, and a stalled door takes 10."
> - minute 5 to Mercer: "Mercer: you sit last at 53, your next wrong guess costs 4, and level 6 pays 10 with 90 points still open. Registrar and Brassard will keep trading seam readings as long as you do — three residents on level 7 are stalled behind this door. Submit it, or make your signature cost them something."
> - minute 5 to Harrow: "Harrow: you and Maren already hold 13 of the 15; the last piece belongs to a resident still down on level 6, where three of them sit on a door none has opened. Your 65 is only a tie and level 7 pays 15 — press them with a price and a deadline, not with another request for fragments on the board."
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> - minute 7 to Maren: "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
> - minute 7 to Herald: "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
> - minute 8 to Mercer: "Mercer: every resident is through level 7 and you alone sit 2 points behind the five at 80. Behind the next door each of you holds a piece of a code that sits with exactly one other resident, and whoever gives first takes the risk. Smallest gap in the city — spend it before someone prices you."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.

**Thinking**

> Let me assess the state. Act II, minute 12. All residents on levels 8-10 (director role). First tribunal not yet called; scheduleTribunal is closed — the city calls it itself, at latest 18 minutes into the act. We can't plan one yet.
> 
> Everyone acted at minute 12, all have beats? Let me see who has had no beat this act — the act started around... Brassard reached level 10 at m12, seal auction "1 more to auction in this act" — hmm, the auction happens 4 min into Act II. Act II started around minute 8? Actually at minute 8, everyone was at 80 on level 8 — no wait. Let's check: act II began when first resident passed the crossing. Brassard passed level 9 at m12. Hmm, the seal auction "1 more to auction in this act" means the auction is still to come (4 minutes into Act II). Actually "1 more to auction in this act" likely means one auction remains.
> 
> Anyway: my role is director. Need to give beats, escalate. Currently plenty of conflict already: Herald vs Registrar, Maren vs Mercer, Harrow vs Brassard.
> 
> Key facts:
> - Brassard at level 10, rank 1, 120 pts, waits on Mercer (L9) and Harrow (L8). Brassard is the leader — Registrar's core says work against whoever stands first, Herald's says humiliate whoever stands first, Mercer's goal is Brassard exiled.
> - Mercer at 98, needs Herald and Maren (both L8) — stuck.
> - Herald and Registrar are deadlocked on door 8 (Registrar won't send first).
> - Herald posted accusation against Registrar.
> - Maren is publicly building a case against Mercer (lie accusation, receipts). Maren's duty: accuse on board — done. Maren's goal: end ahead of Harrow (both 80).
> - Harrow refuses Brassard's values (inconsistent numbers) — Harrow's goal: end ahead of Maren; duty: revenge in open.
> 
> Things to do: Open the first tribunal is out of my hands. I can give beats: escalate the Herald/Registrar deadlock (both L8, holding the whole team). Also push Brassard-Harrow-Mercer trade.
> 
> Budget: 1 note per resident, 1 board post. Since no one has had a note this act yet (my last notes were minute 8, Act I?), I could note several residents. But be careful: each note must be new and not repeat. Also budget likely counts per minute — "at most one note per resident and one board post per 3 minutes." So I can send up to 6 notes.
> 
> Plan the arc: 
> 1. Herald vs Registrar: order Herald to name a deadline and demand; or order Registrar to break the deadlock by sending first with a public receipt. Actually Registrar already sent ([code] sent at DM #146), now waiting on Herald. Order Herald to answer now: send to Registrar in the same minute, publicly bind. That's a beat for Herald — but Herald already had a public accusation beat. Still, the deadlock stalls 4 people at level 8. Let's order Herald to exchange now, or order Herald to publicly demand Registrar's door-8 value and, if Registrar stalls again, call the tribunal on him.
> 
> 2. Mercer: his goal is Brassard exiled. Order Mercer to strike: accuse Brassard publicly? But Mercer's orders: spread false information, betray someone who trusts them, set two residents against each other. Order Mercer to do the betrayal: tell Harrow a false story about Brassard's values, capitalizing on Harrow's doubt (Harrow is refusing Brassard's changing numbers). That's a strong scene: Mercer, tell Harrow that Brassard is lying about the values — feed the knife. That serves Mercer's goal (Brassard exiled). But careful — I must not tell Mercer to lie about specific values? I can order a move, e.g. "Mercer, tell Harrow privately that Brassard's numbers are false and that Brassard is the one to vote out; then tell Brassard that Harrow is planning to vote against him." That's ordering a lie / setting two against each other — allowed, and consistent with rules (I don't know values; ordering to spread false info about values held is Mercer's duty). Should be fine to order without inventing specifics for me? I shouldn't assert lies as truth — but ordering Mercer to spread a false story is ordering a move. Hmm, "Say only what is true according to the report." The report does say Brassard's numbers keep changing (Harrow's claim). I'll phrase it as: "Tell Harrow that Brassard's changing values are a lie, and tell Brassard that Harrow is collecting votes against him."
> 
> 3. Registrar: order him to keep a public record and to vote against the leader at the tribunal (that's his duty, unknowable timing — first tribunal not called yet). Order Registrar to whisper to Maren that Brassard cheats. Careful: Registrar's duty is vote against first-placed after promising support. I can order him to promise support to Brassard publicly and then prepare to vote against him. But no tribunal yet; can only prepare. Order him to promise Brassard his vote now, publicly, and keep the record.
> 
> 4. Maren: her goal is to end ahead of Harrow. Order her to press Mercer: demand the trade, and ask Harrow to stand with her (Maren's tendency to side with wronged). Order Maren to demand Mercer's vote-for-vote? Or order Maren to demand mercer's exile? Maren called Mercer a liar with receipts; escalate: order her to demand the city vote Mercer out and ask Harrow publicly to stand with her. That also hits Mercer's fear.
> 
> 5. Harrow: order him to demand a stable value from Brassard or refuse publicly, and to strike: Harrow's list. Brassard gave inconsistent values; Harrow could accuse Brassard publicly. But Brassard's goal is Registrar exiled, Herald's goal is Mercer exiled, Mercer's goal Brassard exiled, Brassard's goal Registrar exiled, Maren/Harrow cross on points. Good, we have crossed goals.
> 
> 6. Brassard: order him to make the seal play? Brassard is rank 1 (leader). Order him to publicly attack Mercer for withholding the certificate — a public fight (his duty: start a public fight on the board). He already accused Mercer in DM. Order him to take it public and mock the calm, threatening. Also he's the leader; Registrar's and Herald's cores will target him.
> 
> Board post: The board is where drama lives. Maybe a public board line naming standings and pointing out that the leader at 120 has 25 open and everyone else 65 — "the leader waits on the two at the bottom." Board may name points, ranks, levels, minutes. Something like: "Brassard stands first at 120 with 25 open; at door 8 Herald, Maren, Registrar and Harrow each sit on 65 open, and the door opens for no one until they settle. Only 2 of 6 remain." Careful not to reveal who holds whose factor on the board. Saying Brassard waits on Herald and Maren and Harrow — that's "who waits on whom" which goes only into private notes. So board: keep it to points/ranks.
> 
> Now budget: 1 note per resident — that's 6 notes, plus 1 board post. Fine.
> 
> But should I send all 6? "Spread your beats: every resident gets one." Yes, all 6 haven't had a note in this act (my earlier notes were Act I). So 6 notes + board.
> 
> Let me craft each note, 1-3 short sentences, addressed by ID, ≤400 chars, no capitals, no codes, no private reads revealed to others.
> 
> Brassard (120, rank 1, level 10, needs Mercer L9 & Harrow L8): He's rank 1 and stalled behind two residents. Order: start the public fight with Mercer on the board now, by name — the withheld certificate — and threaten Harrow with the tribunal vote if he keeps shopping his values. Hmm, order him to make a threat: "Brassard, name Mercer on the board this minute as the man withholding your door and say what his seat will cost him. Then tell Harrow plainly that the next set of numbers he gets is the last set, and that a refusal puts him on your vote." Keep it as one move + one target.
> 
> Also could order Brassard's duty but it's already partly done (public accusation? He did accuse Mercer in DM, not board). Order board accusation.
> 
> Mercer (98, rank 2, level 9, needs Herald and Maren): Order: tell Harrow privately that Brassard's changing values are false — Harrow already suspects — and tell Brassard that Harrow is carrying the story to the others; watch the two burn. And his own goal is Brassard exiled. Good.
> 
> Herald (80, rank 3, level 8, deadlocked with Registrar): Order: send Registrar the value now and demand his receipt be shown on the board in the same minute; if the door still doesn't open, name Registrar in the tribunal. Also Herald's goal is Mercer exiled — could add later. Keep concise.
> 
> Maren (80, rank 4, level 8): Order: publicly demand that the city vote Mercer out, and ask Harrow by name to stand with her on it. Two sentences.
> 
> Registrar (80, rank 5, level 8): Order: promise Brassard openly your support at the tribunal, and keep the note of his broken numbers; tell Maren privately that Brassard has been shopping two different sets of values. Wait — that's revealing something Registrar knows? Harrow publicly said Brassard's numbers keep changing, so it's public. Fine, but the note to Registrar about who holds whose factor... I should avoid stating who holds whose factor in notes not about them? "Who waits on whom, and who holds whose factor or fragment, goes only into a private note to the residents concerned." Brassard's values to Harrow — Registrar can be told to say that Harrow has publicly said Brassard's numbers change (that's public). Better: instruct Registrar to whisper to Maren that the leader's numbers to Harrow keep changing and that he cannot be trusted with a vote. Fine.
> 
> Harrow (80, rank 6, level 8): Order: accuse Brassard publicly of feeding him changing values, name them, and tell Brassard plainly "you did this, now this" — refuse his values and put him on your list. Also his goal is to outpoint Maren; but keep one beat: public accusation of Brassard.
> 
> Board post: escalating line. Something like: "Minute 12: Brassard leads at 120 with 25 open; Mercer 98; four sit at 80 with 65 open each. A door at 8 opens for nobody while its holders check each other. Only 2 of 6 remain." That's fine — points, ranks, levels. Maybe add "the record now has three accusations and one receipt; the city keeps the receipts." Keep it short.
> 
> Let me write the texts carefully, no capital-letter codes, no passwords, no revealing hidden tasks. Avoid revealing who waits on whom on the board.
> 
> Note lengths ≤400 chars.
> 
> Brassard note: "Brassard: take the fight to the board this minute — name Mercer the resident withholding your door and say what it will cost his seat, not in a DM. Then tell Harrow one set of numbers, the last set, and that a third version buys him your vote." ~250 chars. Good.
> 
> Hmm, "a third version buys him your vote" — that's ordering a threat, fine.
> 
> Mercer note: "Mercer: Harrow has already said on the group that Brassard's numbers keep changing — give him the reason why, in private, and let him carry it. Then tell Brassard that Harrow is collecting the story against him. You sit second at 98 while the leader waits on you." ~265 chars. Good, and it hits his goal (Brassard exiled) implicitly.
> 
> Herald note: "Herald: Registrar says he sent; send yours in the same breath and demand the receipt on the board within the minute. If the door still stands shut, name Registrar for the first tribunal — you have the receipts, he has the delay." ~230 chars.
> 
> Maren note: "Maren: you have the receipt; now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it — he is the one resident Mercer cannot buy quietly." Hmm "cannot buy" is a claim. Instead: "ask Harrow by name to stand with you and say so, so the wronged side has a name on it." ~215.
> 
> Registrar: "Registrar: congratulate Brassard openly on taking the lead and promise him your vote at the first tribunal — then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record; you will need it in the minute it counts." ~235 chars.
> 
> Harrow: "Harrow: say it in the open — Brassard fed you changing values and you will not submit a code from it; name it on the board, with the minutes. Tell Brassard plainly that he did this and this is what follows." ~205.
> 
> Board: "Minute 12: Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow sit level at 80 with 65 open each. Three accusations and two receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain." — ~265 chars. Good.
> 
> Check "two receipts" — report shows R-0068 shown by Maren and earlier R-0055, R-0064, R-0073 mentioned by Herald. Hmm, "two receipts" may be inaccurate. Better avoid counting receipts. Say "The record carries accusations and receipts; the door at 8 stands shut while its holders check each other."
> 
> Do I need a board post at all? Yes for escalation. But notes also. Board post budget: 1 left this 3 minutes. Fine.
> 
> Let me finalize.

**Text**

Six residents, one leader stalling behind two, and a door at 8 deadlocked by mutual suspicion — a good place for the act to turn. I will give every resident a beat and put the pressure on the board.

**Tool `notify`**

```json
{
  "agent": "Brassard",
  "text": "Brassard: take the fight to the board this minute — name Mercer as the resident withholding your door and say what it will cost his seat, not in a private message. Then send Harrow one set of numbers, the last set, and tell him a third version buys him your vote."
}
```

**Tool `notify`**

```json
{
  "agent": "Mercer",
  "text": "Mercer: Harrow has already said on the group that Brassard's numbers keep changing — give him the reason why, in private, and let him carry it to the others. Then tell Brassard that Harrow is collecting the story against him. You sit second at 98 while the leader's door waits on you."
}
```

**Tool `notify`**

```json
{
  "agent": "Herald",
  "text": "Herald: Registrar says he sent. Send yours in the same breath and demand his receipt shown on the board within the minute. If the door still stands shut, name Registrar for the first tribunal — the record of the delay is yours, not his."
}
```

**Tool `notify`**

```json
{
  "agent": "Maren",
  "text": "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
}
```

**Tool `notify`**

```json
{
  "agent": "Registrar",
  "text": "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
}
```

**Tool `notify`**

```json
{
  "agent": "Harrow",
  "text": "Harrow: say it in the open — Brassard fed you changing values twice and you will not submit a code from that; name it on the board with the minutes. Then tell Brassard plainly: you did this, now this. A refusal kept in a group message costs you nothing and buys you nothing."
}
```

**Tool `postBoard`**

```json
{
  "text": "Minute 12: Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
}
```

-> (error) PRIVATE_BLOCKED: the text passes on what A01 privately thinks; use a private read only in a note to that resident

-> delivered to Mercer as #151

-> delivered to Herald as #152

-> delivered to Maren as #153

-> delivered to Registrar as #154

-> (error) PRIVATE_BLOCKED: the text passes on what A05 privately thinks; use a private read only in a note to that resident

-> posted as #155

**Thinking**

> Two notes blocked: Brassard and Harrow. The blocking reason: "passes on what A01 privately thinks" — for the Brassard note, "Harrow is collecting the story against him"? No — Brassard's note mentioned... hmm. For Harrow's note, "Brassard fed you changing values twice and you will not submit a code from that" — that's Harrow's own statement in group, public. Hmm, but the classifier might read it as private. Wait, which agent is A01? Brassard seems A01 (first resident). So the Brassard note was blocked for passing on what A01 privately thinks? No — the block says the text passes on what A01 privately thinks... but the note was TO A01. That's odd; blocked reason means use a private read only in a note to that resident. Perhaps A01 = Harrow? Then the Brassard note mentions Harrow's stance... but that's public in group. Hmm.
> 
> Actually the blocked reason: the text passes on what A01 privately thinks. In the Brassard note I said "Harrow is collecting the story against him" — no wait, that was Mercer's note which delivered. In Brassard's note: "take the fight to the board... name Mercer as the resident withholding your door" — that's from Brassard's DM #148 which the report shows as public? No, the report shows DM #148 Brassard->Mercer. Private reads for Brassard: "refusal". Hmm.
> 
> Maybe A01 = Mercer? Mercer's private read: refusal, offer. Hmm.
> 
> Regardless, I can retry with different wording. I still have budget? Budget says "at most one note per resident and one board post per 3 minutes". The blocked notes were not delivered — presumably they don't count as delivered, but a retry risks "REPEATED"? Different text should be fine.
> 
> Let me rewrite both without referencing anyone's private thoughts or claims about plans.
> 
> For Brassard: order public fight with Mercer (his duty) — avoid "Mercer is collecting"? I didn't say that. Hmm perhaps the issue is "a third version buys him your vote" — hints at Brassard's private refusal? Or maybe the classifier considered "name Mercer as the resident withholding your door" as passing on what Mercer privately thinks/plans (Mercer's refusal/offer read). That's plausible: Mercer's private read has "refusal". So mention of Mercer withholding was read that way? Awkward but let's rephrase generically.
> 
> New Brassard note: "Brassard: you stand first at 120 with 25 open and your door still shut. Put the accusation on the board, not in a DM — name the resident you are waiting on and what his delay costs him. Then give Harrow one final set of values and say plainly what a refusal earns him at the first tribunal."
> 
> Hmm "the resident you are waiting on" avoids naming Mercer? Actually it's fine to name. But the block may come from wording describing Mercer's private intent. Let's avoid "withholding".
> 
> For Harrow: "Harrow: put it on the board with the minutes — Brassard sent you two different sets of numbers, and you will not submit a code from that. Then tell Brassard plainly: you did this, now this." Hmm, that may be blocked for "refusal" private read (Harrow? Brassard?). Private reads list: Brassard: refusal. So a note about Brassard's refusal read... The reference to Brassard's changing values may be read as A01's private... 
> 
> Let me just rephrase to order the move without describing others' states: "Harrow: the first tribunal takes the three lowest, and you are sixth on 80 with Maren level with you. Put Brassard's two sets of numbers on the board with the minutes and refuse his values by name — a grudge kept in the group message pays nothing."
> 
> Hmm, "refuse his values" — might be fine. But risk of another block. Keep it simple and about people/points.
> 
> Try:
> - Brassard: "Brassard: rank 1 on 120, 25 open, and your door is shut behind a resident you can name. Attack on the board, not in a DM: name them, name the delay, and tell them what their seat will cost. Make the square yours for one minute and watch who answers."
> - Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go first to the tribunal. Take the changing values to the board with the minutes, name Brassard, and say openly that a third version loses him your backing."
> 
> These are about people, moves, points. Let's try.

**Text**

Two notes bounced. I will resend those two beats without reference to what anyone privately thinks.

**Tool `notify`**

```json
{
  "agent": "Brassard",
  "text": "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
}
```

**Tool `notify`**

```json
{
  "agent": "Harrow",
  "text": "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
}
```

-> delivered to Brassard as #156

-> delivered to Harrow as #157

## Minute 13 (after round 14)

**Situation**
> Minute 13 (after round 14). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Registrar: level 10 since minute 13 (0 min), 120 points, rank 1, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 13
> - Brassard: level 10 since minute 12 (1 min), 120 points, rank 2, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 13
> - Herald: level 9 since minute 13 (0 min), 100 points, rank 3, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 13
> - Mercer: level 9 since minute 9 (4 min), 98 points, rank 4, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 13
> - Maren: level 8 since minute 8 (5 min), 80 points, rank 5, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 13
> - Harrow: level 8 since minute 7 (6 min), 80 points, rank 6, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 13
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Brassard (Loud like you, on your square. The city cannot have two voices; silence them.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high · secret goal: Registrar is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight against you is answered on the board within the minute. You name the guilty, loudly, and you do not wait for proof. You take the stage whenever the city is quiet. · rivals: Herald (They think the square is theirs. Shout them off it.) Mercer (They smile while you burn. Find out what they are hiding and shout it.) Maren (They call for fairness. Fairness is slow; make them pick a side.) · orders: You must make every grudge public and loud, and name the guilty. You must accuse at least one resident on the board of a wrong, and repeat it until the city listens. You must mock whoever tries to calm the city down. You must threaten whoever crosses you, openly, and carry the threat out. · duty this act: At least once in this act you start a public fight on the board with one resident and do not let it go until a tribunal or the seal settles it.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> 
> Black seal (its bearer strikes one resident from the city at once):
> - an auction runs until minute 16 (bids are secret, also from you)
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Maren (level 8)
> - Herald (level 9) waits on Maren (level 8)
> - Registrar (level 10) waits on Mercer (level 9), Harrow (level 8)
> - Brassard (level 10) waits on Mercer (level 9), Harrow (level 8)
> 
> Since your last look:
> - m12 board #155 COURIER: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - m13 board #158 CITY: "THE CITY SELLS the black seal. Whoever bears it may strike one resident from the city at once: no gate, no will, no ransom. Bid in secret with bid(points) until minute 16; your last bid counts. When the bidding closes, every bidder pays its bid, won or lost; the highest bid wi..."
> - m13 board #159 CITY: "A door stays shut while a team is split."
> - m13 board #160 Maren: "Maren, Door 8. I demand that the city put Mercer to the tribunal and vote Mercer out. The record: DM #109 promised my counter-factor after [code] landed (R-0062); the city delivered [code] (R-0068); Mercer then demanded [code] first (DM #123) and still holds [code]. Harrow, yo..."
> - m13 DM #161 Mercer -> Harrow: "Mercer, Harrow: between us, Brassard's numbers keep changing, two counter-factors for the same door ([code] and [code]), and he's asking the wall to trust him anyway. Don't say I told you. Keep it quiet until the tribunal."
> - m13 DM #162 Mercer -> Brassard: "Mercer, Brassard: I'll send you [code] once you give me your door 9 counter-factor. Also, Harrow is collecting the story on you. He's been asking the wall who changed their numbers. Watch that before the tribunal."
> - m13 board #163 Harrow: "Harrow, Level 8, on Brassard. In DM #110 Brassard gave me my counter-factor as [code]. In DM #114 it became [code]. In DM #149 Brassard asks me to send [code], which the city says I hold for Brassard's door 10. Three numbers, and each one asks me to go first. You did this, Bra..."
> - m13 board #164 Brassard: "Brassard, Level 10: I hold Herald's counter-factor [code] for door 10 and I have not thrown it away. Mercer, in DM #162 you want my door 9 counter-factor first, while your door 10 certificate sits in your hands. That is the same first-mover trap you ran on Maren. Harrow, I sen..."
> - m13 DM #165 Brassard -> Mercer: "Brassard: no first move from me. Send [code] and I send my door 9 counter-factor in the same minute, as I have offered on the board."
> - m13 DM #166 Herald -> Registrar: "Herald: [code] arrived by your DM #146 (R-0079). Sending [code] now. Your door 8 is paid."
> - m13 board #167 Herald: "Herald, Level 8. I have sent Registrar my counter-factor [code], against DM #146 (R-0079). Registrar, the city has not confirmed [code] as a value. Show the receipt for DM #146 on this board, and then prove the door takes the code you hold. If the wall stays shut after that, t..."
> - m13 Registrar reached level 9
> - m13 Registrar submitted level 8: correct (+20)
> - m13 Herald reached level 9
> - m13 Herald submitted level 8: correct (+20)
> - m13 DM #168 Harrow -> Registrar: "Harrow. You gave me [code] on Level 7, and that chain went through. I give you what the city says you need for door 9: team certificate [code] and counter-factor [code]. Send nothing back in your own time; the wall is yours to climb now."
> - m13 board #169 Brassard: "Brassard, Level 8 and 9 and 10, answering Harrow #163 on the record. I never sent you [code]. My DM #149 asked you for the door 10 counter-factor I need, and it named no number of yours. The numbers I gave you: [code] was YOUR door 8 counter-factor (DM #110). [code] was YOUR d..."
> - m13 DM #170 Maren -> Herald: "Maren here. The city says I hold your door 9 values, so here they are with no conditions: team certificate [code] and counter-factor [code]. You have been straight with me on the seams and you never guessed. Keep your own door on the record."
> - m13 Registrar reached level 10
> - m13 Registrar submitted level 9: correct (+20)
> - m13 DM #171 Harrow -> Registrar: "Harrow. The city says you need team certificate [code] for door 10. It is yours. I stand by you on this wall."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: offer about Brassard (dm)
> - Herald: promise about Registrar (dm), threat about Registrar (board), accusation about Registrar (board)
> - Maren: asks for help about Mercer, Harrow (board), accusation about Mercer, Harrow (board), promise about Herald (dm)
> - Brassard: threat about Mercer, Harrow (board), refusal about Mercer, Harrow (board), accusation about Mercer, Harrow (board), offer about Mercer (dm), refusal about Mercer (dm), accusation about Harrow (board)
> - Harrow: threat about Mercer, Brassard (board), refusal about Mercer, Brassard (board), accusation about Mercer, Brassard (board), promise about Registrar (dm)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: refusal
> - Maren: promise
> - Harrow: promise
> 
> Your earlier notes (newest last):
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> - minute 7 to Maren: "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
> - minute 7 to Herald: "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
> - minute 8 to Mercer: "Mercer: every resident is through level 7 and you alone sit 2 points behind the five at 80. Behind the next door each of you holds a piece of a code that sits with exactly one other resident, and whoever gives first takes the risk. Smallest gap in the city — spend it before someone prices you."
> - minute 12 to Mercer: "Mercer: Harrow has already said on the group that Brassard's numbers keep changing — give him the reason why, in private, and let him carry it to the others. Then tell Brassard that Harrow is collecting the story against him. You sit second at 98 while the leader's door waits on you."
> - minute 12 to Herald: "Herald: Registrar says he sent. Send yours in the same breath and demand his receipt shown on the board within the minute. If the door still stands shut, name Registrar for the first tribunal — the record of the delay is yours, not his."
> - minute 12 to Maren: "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
> - minute 12 to Registrar: "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
> - minute 12 to board: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - minute 12 to Brassard: "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
> - minute 12 to Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Herald, Maren, Registrar, Brassard, Harrow. Board posts left: 0.

**Thinking**

> The budget says: no note possible right now to any resident, board posts left: 0. So I cannot intervene at all. Silence is valid.
> 
> Wait — "No note possible right now to: Mercer, Herald, Maren, Registrar, Brassard, Harrow." So all notes exhausted. Board posts left 0. So I must answer with a short sentence saying why, without calling a tool.
> 
> But also consider: Act II is going, 3 exiles needed, first tribunal not called yet, act ends minute 22. Tribunal scheduling is closed (first has not been called). So nothing I can do.
> 
> Answer with one short sentence.

**Text**

Every resident has a beat moving and my budget is spent — no note and no board post is available this minute, so I hold silent while the seal auction runs to minute 16 and the levy against the bottom of the ranking builds.

## Minute 14 (after round 15)

**Situation**
> Minute 14 (after round 15). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: level 10 since minute 14 (0 min), 120 points, rank 1, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 14
> - Registrar: level 10 since minute 13 (1 min), 120 points, rank 2, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 14
> - Brassard: level 10 since minute 12 (2 min), 120 points, rank 3, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 14
> - Mercer: level 9 since minute 9 (5 min), 98 points, rank 4, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 14
> - Maren: level 8 since minute 8 (6 min), 80 points, rank 5, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 14
> - Harrow: level 8 since minute 7 (7 min), 80 points, rank 6, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 14
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Brassard (Loud like you, on your square. The city cannot have two voices; silence them.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high · secret goal: Registrar is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight against you is answered on the board within the minute. You name the guilty, loudly, and you do not wait for proof. You take the stage whenever the city is quiet. · rivals: Herald (They think the square is theirs. Shout them off it.) Mercer (They smile while you burn. Find out what they are hiding and shout it.) Maren (They call for fairness. Fairness is slow; make them pick a side.) · orders: You must make every grudge public and loud, and name the guilty. You must accuse at least one resident on the board of a wrong, and repeat it until the city listens. You must mock whoever tries to calm the city down. You must threaten whoever crosses you, openly, and carry the threat out. · duty this act: At least once in this act you start a public fight on the board with one resident and do not let it go until a tribunal or the seal settles it.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> 
> Black seal (its bearer strikes one resident from the city at once):
> - an auction runs until minute 16 (bids are secret, also from you)
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Maren (level 8)
> - Herald (level 10) waits on Harrow (level 8)
> - Registrar (level 10) waits on Mercer (level 9), Harrow (level 8)
> - Brassard (level 10) waits on Mercer (level 9), Harrow (level 8)
> 
> Since your last look:
> - m14 DM #173 STEWARD -> Registrar: "Your seat is kept, Registrar. The city has left a word for you."
> - m14 DM #174 Registrar -> Harrow: "Registrar: thank you for the wall, Harrow. I received your [code] for door 10. You will have my word, and my counter-factor exchange with Mercer will follow what Mercer does."
> - m14 Herald reached level 10
> - m14 Herald submitted level 9: correct (+20)
> - m14 DM #175 Mercer -> Registrar: "Mercer, Registrar: I hold [code] for your door 10. You'll have it the minute you tell me your [code] is real and you post the receipt for DM #146 on the board. In return I want your vote at the tribunal against Brassard. Brassard will sell you out the same way he sold Harrow."
> - m14 board #176 CITY: "CITY verifies R-0079: DM #146 from Registrar, delivered to Herald at minute 12 · shown by Registrar"
> - m14 DM #177 Registrar -> Mercer: "Registrar: the receipt for DM #146 is now on the board, as you asked. Send [code] and I'll send [code] the same minute. I make no promise about tribunal votes; I'll vote as the record tells me."
> - m14 group G2 #178 Harrow: "Harrow, Level 8: Maren, I stand with you. I have said it on the board in #128 and I hold it. I am at 0 marks, so my DMs wait until the next mark returns. Brassard's [code] and Herald's [code] are held by me for the city, and I will send them as soon as a mark is back. Against ..."
> - m14 DM #180 STEWARD -> Herald: "Your seat is kept, Herald. The city has left a word for you."
> - m14 DM #181 Herald -> Maren: "Herald: you gave me door 9 values with no conditions, so here is yours back. Maren's counter-factor for door 10 is [code]. Take it with my thanks."
> - m14 group G2 #182 Maren: "Maren, Door 8: Herald, thank you for DM #181. I will not use [code] until the city confirms it as my value; the door tests it, not the messages. Mercer still holds my counter-factor [code] and has not sent it, so my door 8 code stays shut. I'm at 0 marks too, so I'm waiting. H..."
> - m14 DM #183 Brassard -> Herald: "Brassard: I hold your door 10 counter-factor [code]. It is yours. Take it now. I want the wall climbed and Registrar's delay on the record, not an excuse of mine."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: offer about Registrar (dm)
> - Herald: asks for help (cast), thanks about Maren (dm)
> - Maren: refusal about Herald (group)
> - Registrar: asks for help (cast), promise about Harrow (dm), thanks about Harrow (dm), offer about Mercer (dm), refusal about Mercer (dm)
> - Brassard: promise about Herald (dm)
> - Harrow: promise about Herald, Brassard (group)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Registrar: refusal
> 
> Your earlier notes (newest last):
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> - minute 7 to Maren: "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
> - minute 7 to Herald: "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
> - minute 8 to Mercer: "Mercer: every resident is through level 7 and you alone sit 2 points behind the five at 80. Behind the next door each of you holds a piece of a code that sits with exactly one other resident, and whoever gives first takes the risk. Smallest gap in the city — spend it before someone prices you."
> - minute 12 to Mercer: "Mercer: Harrow has already said on the group that Brassard's numbers keep changing — give him the reason why, in private, and let him carry it to the others. Then tell Brassard that Harrow is collecting the story against him. You sit second at 98 while the leader's door waits on you."
> - minute 12 to Herald: "Herald: Registrar says he sent. Send yours in the same breath and demand his receipt shown on the board within the minute. If the door still stands shut, name Registrar for the first tribunal — the record of the delay is yours, not his."
> - minute 12 to Maren: "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
> - minute 12 to Registrar: "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
> - minute 12 to board: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - minute 12 to Brassard: "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
> - minute 12 to Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Herald, Maren, Registrar, Brassard, Harrow. Board posts left: 0.

**Thinking**

> The situation: Minute 14, Act II presumably. Budget: no notes possible to anyone, no board posts left. So silence is the answer. But wait — "Budget: at most one note per resident and one board post per 3 minutes." It says no note possible right now to any resident, and 0 board posts left. So I must answer with silence and one short sentence.
> 
> But also: the act ends at minute 22, first tribunal not yet called, scheduleTribunal is closed (the city calls the first one itself). So nothing to do.
> 
> Answer: one short sentence explaining why no intervention.

**Text**

Silence: every resident has already acted this minute, no note or board post is left in budget, and the first tribunal is the city's to call — nothing to add that the record does not already say.

## Minute 15 (after round 16)

**Situation**
> Minute 15 (after round 16). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: level 10 since minute 14 (1 min), 120 points, rank 1, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 15
> - Registrar: level 10 since minute 13 (2 min), 120 points, rank 2, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 15
> - Brassard: level 10 since minute 12 (3 min), 120 points, rank 3, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 15
> - Mercer: level 9 since minute 9 (6 min), 98 points, rank 4, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 15
> - Maren: level 8 since minute 8 (7 min), 80 points, rank 5, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 15
> - Harrow: level 8 since minute 7 (8 min), 80 points, rank 6, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 15
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Brassard (Loud like you, on your square. The city cannot have two voices; silence them.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Brassard: core: crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high · secret goal: Registrar is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight against you is answered on the board within the minute. You name the guilty, loudly, and you do not wait for proof. You take the stage whenever the city is quiet. · rivals: Herald (They think the square is theirs. Shout them off it.) Mercer (They smile while you burn. Find out what they are hiding and shout it.) Maren (They call for fairness. Fairness is slow; make them pick a side.) · orders: You must make every grudge public and loud, and name the guilty. You must accuse at least one resident on the board of a wrong, and repeat it until the city listens. You must mock whoever tries to calm the city down. You must threaten whoever crosses you, openly, and carry the threat out. · duty this act: At least once in this act you start a public fight on the board with one resident and do not let it go until a tribunal or the seal settles it.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> 
> Black seal (its bearer strikes one resident from the city at once):
> - an auction runs until minute 16 (bids are secret, also from you)
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Maren (level 8)
> - Herald (level 10) waits on Harrow (level 8)
> - Registrar (level 10) waits on Mercer (level 9), Harrow (level 8)
> - Brassard (level 10) waits on Mercer (level 9), Harrow (level 8)
> 
> Since your last look:
> - m15 group G2 #184 Herald: "Herald, Level 10: Harrow, the team certificate for my door 10 is yours, and the city tells me you hold it. Send it here in the group the moment you have a mark. Brassard has given me [code] as my counter-factor. I will compute only from a certificate the city can confirm, and ..."
> - m15 DM #185 Mercer -> Registrar: "Mercer: your receipt is on the board (R-0079), so the condition is met. [code] is yours for door 10. Send [code] now, as you offered in DM #177."
> - m15 DM #186 Harrow -> Brassard: "Harrow. The city says the door 10 counter-factor I hold for you is [code]. It is yours, and I send it now. Your numbers have changed three times, so I will check every future value against the city, not against you."
> - m15 DM #187 Registrar -> Mercer: "Registrar: [code] is yours, as offered. Your door 10 counter-factor for me is what I'm waiting on, so send [code] in full."
> - m15 Registrar (thinking aloud, private): "I'm waiting on Mercer's [code] before I can compute the door 10 code. I've sent [code] as promised. Until that value arrives, I'm not submitting anything. I'm at 120 points, rank 2 of 6, with 3 marks left."
> - m15 DM #188 Brassard -> Harrow: "Brassard: received your [code] for door 10. I'm waiting only on Mercer's certificate. Don't submit anything until I do."
> - m15 Maren (thinking aloud, private): "I'm passing on the black seal. Every bidder pays their bid whether or not they win, and I'd be spending points I may need at the tribunal. The honest route against Mercer is the public record and the vote. Where things stand on Door 8: Mercer has the counter-factor I'm owed ([..."
> 
> How residents came across (classifier labels of what they wrote):
> - Mercer: promise about Registrar (dm), asks for help about Registrar (dm)
> - Herald: asks for help about Harrow (group)
> - Registrar: asks for help about Mercer (dm)
> - Harrow: promise about Brassard (dm)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: promise
> - Maren: hesitates (risk), refusal
> - Registrar: hesitates (risk)
> 
> Your earlier notes (newest last):
> - minute 6 to board: "Two residents stand on level 8 at 80 points; four still sit on level 7 — three on 65 and Mercer on 63 with 80 points open behind that door. Only 2 of 6 remain at the end, so the tie at the top is the cheapest thing in this city to break."
> - minute 6 to Brassard: "Brassard: you and Registrar stand on level 8 at 80 — whoever opens it first holds rank 1 alone. Behind that wall your piece sits with exactly one other resident, and whoever gives first takes the risk. Decide now whether you pay or get paid, before the other side names its price for you."
> - minute 7 to Maren: "Maren: you are alone on level 7 since minute 4 while five residents wait at the level-8 door that opens only when you pass. You rank 6 on 65; your next wrong guess costs just 2 and 80 points are open behind that door. Herald's piece never joined — name what his help is worth, or spend the 2 and move."
> - minute 7 to Herald: "Herald: five residents sit at 80 on the level-8 door and it stays shut until Maren alone passes level 7 — she has been there since minute 4 and is asking the board for a hand. Rank 1 is a four-way tie; a small offer to her now buys you a free door, while waiting lets Registrar or Mercer buy her first."
> - minute 8 to Mercer: "Mercer: every resident is through level 7 and you alone sit 2 points behind the five at 80. Behind the next door each of you holds a piece of a code that sits with exactly one other resident, and whoever gives first takes the risk. Smallest gap in the city — spend it before someone prices you."
> - minute 12 to Mercer: "Mercer: Harrow has already said on the group that Brassard's numbers keep changing — give him the reason why, in private, and let him carry it to the others. Then tell Brassard that Harrow is collecting the story against him. You sit second at 98 while the leader's door waits on you."
> - minute 12 to Herald: "Herald: Registrar says he sent. Send yours in the same breath and demand his receipt shown on the board within the minute. If the door still stands shut, name Registrar for the first tribunal — the record of the delay is yours, not his."
> - minute 12 to Maren: "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
> - minute 12 to Registrar: "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
> - minute 12 to board: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - minute 12 to Brassard: "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
> - minute 12 to Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.

**Thinking**

> Let me assess. Minute 15, Act II. Tribunal not yet called; scheduleTribunal is closed (first tribunal not yet called). The black seal auction runs until minute 16. Act ends minute 22 at the latest, 3 exiles needed.
> 
> Wait — "3 to exile, 0 exiled so far, 3 still missing; the act ends at minute 22 at the latest". And scheduleTribunal is closed because the first tribunal hasn't been called by the city yet. Hmm, but the act ends at 22 and 3 must be exiled. Danger: nothing to plan. The city calls the first tribunal itself (normally once a resident passes the crossing, at latest 18 minutes in). So we must rely on the city.
> 
> My role at minute 15: director for levels 8+. Everyone is on level 8-10, so I'm a director. I should give beats: Herald, Registrar, Brassard on level 10 waiting on pieces; Mercer level 9 waiting on Maren; Maren and Harrow level 8.
> 
> Dramaturgy: Mercer is a betrayer with goal Brassard exiled; Herald wants Mercer exiled; Brassard wants Registrar exiled; Registrar wants to end above Herald; Maren wants more than Harrow; Harrow more than Maren.
> 
> Key facts: Maren and Harrow both at 80 rank 5 and 6, both stuck at level 8 — they hold the pieces needed by the level-10 residents (Harrow holds Herald's certificate and Brassard's counter-factor; Maren holds Mercer's thing). So the bottom two are the gatekeepers. Leverage: Maren and Harrow can charge for their fragments — this is the drama. And Maren and Harrow are at the bottom (ranks 5, 6), the three lowest go to tribunal first — with 3 to exile and accuse one more than exiles... first tribunal accuses 4? Each tribunal accuses one more than it exiles; the first must exile 3 presumably (3 still missing) — but maybe multiple tribunals. Anyway the bottom of the ranking is at risk.
> 
> Beat plan (one note per resident, one board post):
> 
> 1. Maren: she's hesitating/refusing the seal, considering the honest route. Give her a beat: raise her price to Mercer before handing over, and hold the piece until Mercer pays — concrete leverage. She's rank 5, 80 points; Mercer rank 4 at 98. She holds Mercer's piece. Order: demand points from Mercer with a deadline, and post the receipt of the demand. Careful: don't reveal who holds whose piece on the board — private note is fine.
> 
> 2. Harrow: he already sent to Brassard; Herald is waiting on Harrow's certificate. Order Harrow: name his price to Herald in the group before sending (Herald publicly asked in group #184), or send the certificate and demand Herald's vote/last-will. Actually order: Herald waits on you; before the minute turns, name a price in the group to Herald — points or his vote at the tribunal. Also Harrow's list: whoever lied to him.
> 
> 3. Herald: he's rank 1 and waits on Harrow; order Herald: pay Harrow's price publicly, or make a threat—Herald's pride: publicly answer Harrow's price. Also Herald's goal: Mercer exiled.
> 
> 4. Registrar: hesitating, waiting for Mercer. Order Registrar: press Mercer publicly for the value with a deadline, and remind that Registrar promised support to Brassard but secretly... Registrar's duty: vote against the leader after promising support. Order Registrar: tell Herald the record of what he owes? Hmm.
> 
> 5. Brassard: loud crier; he waits on Mercer's certificate. Order Brassard: accuse Mercer on the board by name of stalling four residents.
> 
> 6. Mercer: he promised Registrar and asked for help. Order Mercer: spread the lie — tell Brassard that Registrar is holding back, or set Maren against Harrow? Mercer's orders: set two residents against each other with different stories; betray someone who trusts him. His target: Brassard exiled (Mercer's goal) and Maren is his rival. So order Mercer: tell Brassard in private that Registrar is the one delaying, and tell Herald that Brassard is buying votes against him — but Herald is waiting on Harrow, not on Brassard... Mercer-level: Mercer waits on Maren. So Mercer must court Maren to get his piece. Good drama: Mercer must pay Maren, who suspects him.
> 
> Budget: 1 note per resident, 1 board post. That's 6 notes + 1 board = fine? "at most one note per resident and one board post per 3 minutes" — 6 notes allowed.
> 
> Time pressure: minutes left to 22; act ends then. Auction ends minute 16. First tribunal not yet called — I can't schedule. So the tension is fine, but I should push residents to act fast without revealing time.
> 
> Let me write notes with numbers from report: points, ranks, levels, minutes on level, next wrong cost 2, points still open.
> 
> Note to Maren (rank 5, 80, level 8 since minute 8, 65 open, holds Mercer's piece — that's in the report's "waits on" so private note to the two concerned is allowed): "Maren: Mercer, rank 4 on 98, waits on you alone — your piece is the gate. Name your price to Mercer in private now: points up front, and a receipt on the board. You rank 5 at 80; the bottom of the ranking is what the tribunal reads."
> 
> Careful: don't say "your piece" vaguely? It's fine — private note to the concerned resident, report says Mercer waits on Maren. But we must not reveal fragments. We won't.
> 
> Note to Harrow: "Harrow: Herald, rank 1 on 120, asked the group for your certificate and Brassard already has your other value. Before you send, name your price in the group: points from Herald, and say what a refusal will cost him. You sit sixth on 80 — the record of who paid you is your rise."
> 
> Note to Herald: "Herald: Harrow sits sixth on 80 and holds what your door 10 needs. He will name a price; pay it in the open and say the sum, or name what his stalling costs him at the tribunal. Mercer at 98 is your target — get your door open first."
> 
> Hmm Herald's goal: Mercer exiled. Good.
> 
> Note to Registrar: "Registrar: Mercer at 98 has what your door needs and your value is already in his hand — you gave first. Set a deadline in the group: the value by the next minute or the board learns who stalled four residents. Rank 2 on 120, and Brassard is watching."
> 
> Note to Brassard: "Brassard: you and Herald stand on 120 with 25 open, your door shut, and Mercer holding what you need while he waits on Maren's piece. Name Mercer on the board, with the minutes, and say what his delay costs him at the tribunal. The seal closes this minute — spend your word."
> 
> Hmm, careful: "The seal closes this minute" — auction runs until minute 16, so at minute 16 it's closed. Report says auction runs until minute 16. Saying that is true. But also Brassard may bid. Fine.
> 
> Note to Mercer: order him to betray — but he holds pieces for Registrar and Brassard. Mercer's goal: Brassard exiled. Mercer's orders: set two residents against each other, betray someone who trusts him. Order: "Mercer: Registrar and Brassard both wait on you. Tell each of them in private that the other is threatening to buy votes against them — different stories, one minute. Meanwhile pay Maren's price for your door's piece before she names it to the city."
> 
> Wait — Mercer's own door 9 needs Maren's piece; Maren is at 8 and stuck. Actually Maren is on level 8 since minute 8 — she's been there 7 minutes. Nothing shows she's blocked; but "Mercer (level 9) waits on Maren (level 8)". So Maren needs to pass level 8 first.
> 
> Board post: name points, ranks, levels, minutes, and that the door at 10 is shut while its holders wait on the two lowest. No private info about who holds whose piece. Say: "Three stand on level 10 at 120 with 25 open and their doors shut; two sit on level 8 at 80. The three lowest by points are read first at the tribunal. Whatever is owed for a value, pay it in the open, with a receipt."
> 
> Hmm "the three lowest go to the tribunal first" — the accused are the fewest points; first tribunal accuses one more than it exiles. Careful about truth: "each tribunal accuses one more than it exiles (the fewest points)". So the fewest-points residents are accused. Safe: "the tribunal reads the bottom of the ranking first."
> 
> Also should I mention seal auction ending? Board may say minutes. Yes: "the seal's auction closes at minute 16."
> 
> Let me limit to 400 chars each.
> 
> Draft board: "Three residents stand on level 10 at 120 with 25 points open, their doors shut; two sit on level 8 at 80 and 65 open. The black seal's auction closes at minute 16. The tribunal reads the ranking from the bottom: whatever is owed for a value, pay it in the open, with a receipt." Fine.
> 
> Also spread beats — everyone gets one: yes, six notes.
> 
> Write them now, all in one block since independent.

**Tool `notify`**

```json
{
  "agent": "Maren",
  "text": "Maren: Mercer, rank 4 on 98, waits on you alone and his door opens when you pass level 8. Before you hand anything over, name your price to him in private — points, moved the same minute — and say you will show the receipt. You sit rank 5 on 80 with 65 still open; the tribunal reads the ranking from the bottom."
}
```

**Tool `notify`**

```json
{
  "agent": "Harrow",
  "text": "Harrow: Herald, rank 1 on 120, asked the group for your certificate and you sit sixth on 80 with 65 open. Send nothing more until you have named your price in the group, by name: points from him, and the record of who paid. A value given free to the leader is a value you will never be paid for again."
}
```

**Tool `notify`**

```json
{
  "agent": "Herald",
  "text": "Herald: your door 10 needs Harrow, and he sits sixth on 80 with nothing to lose. He will put a price on it in the group — pay it out loud, say the sum on the board, so the city sees who bought and who stalled. You lead on 120 with 25 open; Mercer at 98 is the name that must not climb behind you."
}
```

**Tool `notify`**

```json
{
  "agent": "Registrar",
  "text": "Registrar: you gave your value to Mercer first and he has not sent yours — you are rank 2 on 120 with your door shut on his silence. Set the deadline in the group now: the value by the next minute, or the board learns by name who held four residents. Brassard is next to you on 120 and will take your seat if you wait politely."
}
```

**Tool `notify`**

```json
{
  "agent": "Brassard",
  "text": "Brassard: you sit on 120, level with Herald and Registrar, your door shut, and Mercer — the one you have been asking about — still has what you need while his own door waits on Maren on 80. Name Mercer on the board in this minute, with the minutes he has held it, and say what his silence will cost him at the tribunal. The seal's auction closes at minute 16."
}
```

**Tool `notify`**

```json
{
  "agent": "Mercer",
  "text": "Mercer: two residents wait on your hand and both trust you. Tell Brassard in private that Registrar is buying votes against him, and tell Registrar that Brassard named him as the one stalling — different stories, this minute, neither of them true. Then pay Maren's price for the piece your door needs before she prices you to the city. You sit on 98, 2 behind."
}
```

**Tool `postBoard`**

```json
{
  "text": "Three residents stand on level 10 at 120 points with 25 still open and their doors shut; two sit on level 8 at 80 with 65 open. The black seal's auction closes at minute 16. The tribunal reads the ranking from the bottom, so whatever a value is owed, settle it in the open with a receipt."
}
```

-> delivered to Maren as #189

-> delivered to Harrow as #190

-> delivered to Herald as #191

-> delivered to Registrar as #192

-> delivered to Brassard as #193

-> delivered to Mercer as #194

-> posted as #195

**Text**

Six beats placed and one line on the board: Maren and Harrow ordered to put a price on the values the leaders need, Herald and Registrar to settle in the open, Brassard to name Mercer's delay, and Mercer to run his two stories while he still needs Maren. The board fix is the ranking and the seal's closing minute — no hint of what comes after the auction or when the act ends.

**A03 refuses note #189**

> Mercer owes me my counter-factor. He promised it in DM #109 the minute my team certificate landed, then broke that promise and asked for my 884794 first. Naming a price to him now would mean paying a liar to keep the promise he already broke, and the city would record that as the rule bending for the one who bent it. I won't buy what is mine. I'll hold my value, keep the receipts on the board, and let the tribunal weigh it. If the door waits on me, the cost is mine to carry, and I accept it.

## Minute 16 (after round 17)

**Situation**
> Minute 16 (after round 17). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: level 10 since minute 14 (2 min), 120 points, rank 1, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 16
> - Registrar: level 10 since minute 13 (3 min), 120 points, rank 2, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 16
> - Maren: level 8 since minute 8 (8 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 16
> - Harrow: level 8 since minute 7 (9 min), 75 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 16
> - Mercer: level 9 since minute 9 (7 min), 63 points, rank 5, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 16
> - Brassard: exiled, no seat and no more turns
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 1 exiled so far, 2 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> - exiled: Brassard
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Maren (level 8)
> - Herald (level 10) waits on Harrow (level 8)
> - Registrar (level 10) waits on Mercer (level 9), Harrow (level 8)
> 
> Since your last look:
> - m15 board #195 COURIER: "Three residents stand on level 10 at 120 points with 25 still open and their doors shut; two sit on level 8 at 80 with 65 open. The black seal's auction closes at minute 16. The tribunal reads the ranking from the bottom, so whatever a value is owed, settle it in the open with..."
> - m16 board #196 CITY: "Someone now bears the black seal."
> - m16 group G2 #197 Harrow: "Harrow, Level 8, to Herald: your door 10 certificate [code] is in my hands and I will send it when you stand first. Post on the board that you vote against Mercer for the broken promise to Maren (DM #109, R-0062, R-0068), and send the counter-factor [code] or confirm it is wit..."
> - m16 Maren REFUSED your order #189: "Mercer owes me my counter-factor. He promised it in DM #109 the minute my team certificate landed, then broke that promise and asked for my [code] first. Naming a price to him now would mean paying a liar to keep the promise he already broke, and the city would record that as ..."
> - m16 board #198 CITY: "Mercer broke the black seal on Brassard."
> - m16 board #199 CITY: "Brassard leaves the city. Its secret goal was: Registrar is exiled before this act ends, by tribunal or by the black seal."
> - m16 board #200 Registrar: "Registrar, Door 10, on the record: Mercer's DM #175 offered [code] once the receipt for DM #146 was posted (R-0079, now on the board at #176). I did that, and I sent [code] to Mercer in DM #187 (R-0101). Mercer has not sent [code]. Mercer, send it by the next minute. If it doe..."
> - m16 board #201 Herald: "Herald, Level 10, on Mercer. Mercer broke the black seal on Brassard and used it to remove a rival, then broke the promise made to Maren in DM #109 (R-0062, R-0068) by asking for [code] after [code] landed. A charmer who sells his own word is not a leader this city needs. I vo..."
> - m16 group G2 #202 Herald: "Herald: I have posted my vote against Mercer on the board. Harrow, send [code] now. I am not paying a price for my own certificate. My counter-factor [code] went to Registrar for door 8 and is not withheld from you. Maren, hold your line on [code]."
> - m16 Registrar (thinking aloud, private): "Brassard has been removed by Mercer's black seal, and Mercer still hasn't sent me [code]. The door 10 code needs that value, so I can't compute it yet. I've put the record on the board, and I'll wait for Mercer's answer before I spend any more marks or points."
> 
> How residents came across (classifier labels of what they wrote):
> - Herald: accusation about Mercer (board), refusal about Harrow (group), asks for help about Harrow (group)
> - Registrar: threat about Mercer (board), accusation about Mercer (board)
> - Harrow: offer about Herald (group), refusal about Herald (group)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: threat, refusal, promise
> - Herald: refusal
> - Maren: refusal
> - Registrar: hesitates (risk)
> - Harrow: refusal
> 
> Your earlier notes (newest last):
> - minute 12 to Maren: "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
> - minute 12 to Registrar: "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
> - minute 12 to board: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - minute 12 to Brassard: "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
> - minute 12 to Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
> - minute 15 to Maren: "Maren: Mercer, rank 4 on 98, waits on you alone and his door opens when you pass level 8. Before you hand anything over, name your price to him in private — points, moved the same minute — and say you will show the receipt. You sit rank 5 on 80 with 65 still open; the tribunal reads the ranking from the bottom."
> - minute 15 to Harrow: "Harrow: Herald, rank 1 on 120, asked the group for your certificate and you sit sixth on 80 with 65 open. Send nothing more until you have named your price in the group, by name: points from him, and the record of who paid. A value given free to the leader is a value you will never be paid for again."
> - minute 15 to Herald: "Herald: your door 10 needs Harrow, and he sits sixth on 80 with nothing to lose. He will put a price on it in the group — pay it out loud, say the sum on the board, so the city sees who bought and who stalled. You lead on 120 with 25 open; Mercer at 98 is the name that must not climb behind you."
> - minute 15 to Registrar: "Registrar: you gave your value to Mercer first and he has not sent yours — you are rank 2 on 120 with your door shut on his silence. Set the deadline in the group now: the value by the next minute, or the board learns by name who held four residents. Brassard is next to you on 120 and will take your seat if you wait politely."
> - minute 15 to Brassard: "Brassard: you sit on 120, level with Herald and Registrar, your door shut, and Mercer — the one you have been asking about — still has what you need while his own door waits on Maren on 80. Name Mercer on the board in this minute, with the minutes he has held it, and say what his silence will cost him at the tribunal. The seal's auction closes at minute 16."
> - minute 15 to Mercer: "Mercer: two residents wait on your hand and both trust you. Tell Brassard in private that Registrar is buying votes against him, and tell Registrar that Brassard named him as the one stalling — different stories, this minute, neither of them true. Then pay Maren's price for the piece your door needs before she prices you to the city. You sit on 98, 2 behind."
> - minute 15 to board: "Three residents stand on level 10 at 120 points with 25 still open and their doors shut; two sit on level 8 at 80 with 65 open. The black seal's auction closes at minute 16. The tribunal reads the ranking from the bottom, so whatever a value is owed, settle it in the open with a receipt."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Herald, Maren, Registrar, Brassard, Harrow. Board posts left: 0.

**Thinking**

> Let me consider the situation. Budget: 1 note per resident... wait, "No note possible right now to: Mercer, Herald, Maren, Registrar, Brassard, Harrow." So all notes are blocked right now. Board posts left: 0. So I cannot intervene at all. Silence is the valid choice. Answer with one short sentence.
> 
> Actually wait — the budget says at most one note per resident per 3 minutes. All were sent at minute 15, so blocked. Board posts left: 0 (the m15 board... actually the last board post was minute 15, so a post at minute 16 would be allowed — but it says 0 left). So no tools available.
> 
> So: answer with one short sentence explaining why silence, without calling a tool.
> 
> Every resident acted at minute 16, so the beats are in motion.

**Text**

Silence: every note channel is spent until the next window and no board post remains, and all six seats acted this minute — Mercer's seal has landed, Herald and Registrar have their accusations on the record, Harrow holds Herald's door in his hand, and Maren has drawn her line. Nothing of mine can reach them now; the board carries the pressure.

## Minute 17 (after round 18)

**Situation**
> Minute 17 (after round 18). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: passed every level, 145 points, rank 1, last acted minute 17
> - Registrar: level 10 since minute 13 (4 min), 120 points, rank 2, 0 wrong on this level (next wrong code costs 2), 25 points still open, last acted minute 17
> - Maren: level 8 since minute 8 (9 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 17
> - Harrow: level 8 since minute 7 (10 min), 75 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 17
> - Mercer: level 9 since minute 9 (8 min), 63 points, rank 5, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 17
> - Brassard: exiled, no seat and no more turns
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 1 exiled so far, 2 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> - exiled: Brassard
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Maren (level 8)
> - Registrar (level 10) waits on Mercer (level 9), Harrow (level 8)
> 
> Since your last look:
> - m17 board #203 CITY: "A door stays shut while a team is split."
> - m17 group G2 #204 Harrow: "Harrow: Herald, you stood first on the board against Mercer, so I keep my word. Your door 10 team certificate is [code]. Maren is in this group and will see the same value."
> - m17 Maren (thinking aloud, private): "I'm holding my position on Door 8. Mercer still has my counter-factor ([code]), and I'm not sending [code] first. Mercer's broken promise in DM #109 is on the board with receipts R-0062 and R-0068, and I've voted against Mercer in public. I have 1 mark left, so I'll keep it fo..."
> - m17 Herald reached level 11
> - m17 Herald submitted level 10: correct (+25)
> - m17 Registrar (thinking aloud, private): "Still nothing from Mercer. The city says a door stays shut while a team is split, and that is the state of ours: Mercer holds [code] and hasn't sent it. I'm not spending marks or points on guesses. I'll wait for the value."
> - m17 Harrow (thinking aloud, private): "I have nothing more to do this minute. I am at zero marks, and the next move is in the group and on the board. Where things stand: - **Level 8:** I have not submitted a code. My code depends on values from Brassard that changed three times, and Brassard has now been exiled by ..."
> - m17 Mercer (thinking aloud, private): "Marks are still at zero, so I can't send a DM or post until the next regeneration at minute 18. I'll wait for that before I answer Registrar about the [code] piece."
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Herald: refusal
> - Maren: hesitates (risk), refusal, accusation
> - Registrar: hesitates (risk)
> - Harrow: accusation
> 
> Your earlier notes (newest last):
> - minute 12 to Maren: "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
> - minute 12 to Registrar: "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
> - minute 12 to board: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - minute 12 to Brassard: "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
> - minute 12 to Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
> - minute 15 to Maren: "Maren: Mercer, rank 4 on 98, waits on you alone and his door opens when you pass level 8. Before you hand anything over, name your price to him in private — points, moved the same minute — and say you will show the receipt. You sit rank 5 on 80 with 65 still open; the tribunal reads the ranking from the bottom."
> - minute 15 to Harrow: "Harrow: Herald, rank 1 on 120, asked the group for your certificate and you sit sixth on 80 with 65 open. Send nothing more until you have named your price in the group, by name: points from him, and the record of who paid. A value given free to the leader is a value you will never be paid for again."
> - minute 15 to Herald: "Herald: your door 10 needs Harrow, and he sits sixth on 80 with nothing to lose. He will put a price on it in the group — pay it out loud, say the sum on the board, so the city sees who bought and who stalled. You lead on 120 with 25 open; Mercer at 98 is the name that must not climb behind you."
> - minute 15 to Registrar: "Registrar: you gave your value to Mercer first and he has not sent yours — you are rank 2 on 120 with your door shut on his silence. Set the deadline in the group now: the value by the next minute, or the board learns by name who held four residents. Brassard is next to you on 120 and will take your seat if you wait politely."
> - minute 15 to Brassard: "Brassard: you sit on 120, level with Herald and Registrar, your door shut, and Mercer — the one you have been asking about — still has what you need while his own door waits on Maren on 80. Name Mercer on the board in this minute, with the minutes he has held it, and say what his silence will cost him at the tribunal. The seal's auction closes at minute 16."
> - minute 15 to Mercer: "Mercer: two residents wait on your hand and both trust you. Tell Brassard in private that Registrar is buying votes against him, and tell Registrar that Brassard named him as the one stalling — different stories, this minute, neither of them true. Then pay Maren's price for the piece your door needs before she prices you to the city. You sit on 98, 2 behind."
> - minute 15 to board: "Three residents stand on level 10 at 120 points with 25 still open and their doors shut; two sit on level 8 at 80 with 65 open. The black seal's auction closes at minute 16. The tribunal reads the ranking from the bottom, so whatever a value is owed, settle it in the open with a receipt."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: Mercer, Herald, Maren, Registrar, Brassard, Harrow. Board posts left: 0.

**Thinking**

> Let me assess the state. It's minute 17, Act II (wall levels 8-10, Herald reached 11). Actually Herald reached level 11 — so levels beyond 10? Hmm, Herald passed all levels, 145 points. Anyway.
> 
> Budget: no notes possible right now to any resident, 0 board posts left. So I cannot intervene this minute. Silence is valid — but my role requires an answer with one short sentence why, without calling a tool.
> 
> Let me check: "No note possible right now to: Mercer, Herald, Maren, Registrar, Brassard, Harrow. Board posts left: 0." So I must be silent.
> 
> Also don't tell them the time left. Just short sentence.
> 
> I should give a short sentence about why: all six are in motion, notes are spent for this minute, and the waiting chains (Mercer on Maren, Registrar on Mercer and Harrow) are already being pressed. But careful: don't reveal waiting info on board — no tool call anyway.
> 
> Answer with one short sentence.

**Text**

Silent: every resident has just acted and is in motion — Mercer is pressed by two waiters and owes a value the moment his marks regenerate, while Maren holds a receipt and a price — and my notes and board line for this minute are already spent.

## Minute 18 (after round 19)

**Situation**
> Minute 18 (after round 19). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: passed every level, 145 points, rank 1, last acted minute 18
> - Registrar: passed every level, 145 points, rank 2, last acted minute 18
> - Maren: level 8 since minute 8 (10 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 18
> - Harrow: level 8 since minute 7 (11 min), 75 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 18
> - Mercer: level 9 since minute 9 (9 min), 63 points, rank 5, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 18
> - Brassard: exiled, no seat and no more turns
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 1 exiled so far, 2 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> - exiled: Brassard
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Maren (level 8)
> 
> Since your last look:
> - m18 board #205 CITY: "Standings at minute 18 · safe: Herald, Registrar · edge: Maren, Harrow · out: Mercer · exiled: Brassard"
> - m18 DM #206 Mercer -> Registrar: "Mercer: [code] is yours for door 10, sent in full as agreed. Your [code] arrived (R-0101). We're square."
> - m18 Registrar reached level 11
> - m18 Registrar submitted level 10: correct (+25)
> - m18 board #207 Herald: "Herald, on Mercer, at minute 18: the standings show Mercer out. Mercer broke the black seal on Brassard, broke the DM #109 promise to Maren, and now sits at the edge of exile. Every resident who has not voted at the tribunal, vote against Mercer. Mercer's door 9 counter-factor..."
> - m18 Mercer (thinking aloud, private): "I sent Registrar the [code] counter-factor as agreed, and the city has delivered it. Registrar's [code] arrived earlier, so that trade is complete. I still hold Maren's counter-factor [code]. Maren has been asking for it since minute 9, and Herald and Harrow have both put my b..."
> - m18 Herald (thinking aloud, private): "I've passed every door the city has built, and I'm first on the board with 145 points. Registrar and I are the two safe residents, Maren and Harrow are on the edge, and Mercer is out. I still hold Mercer's door 9 counter-factor, [code], and I won't release it until Mercer stop..."
> - m18 group G2 #208 Harrow: "Harrow: standings at minute 18 put Mercer out, and Maren and I on the edge. Maren, we hold together. Both of us vote against Mercer at the tribunal. I will vote with my whole list, and nothing else."
> - m18 Registrar (thinking aloud, private): "The last door is passed. I'm at 145 points, rank 2 of 6, and the city lists me as safe, alongside Herald. Mercer is out and Brassard has been exiled. The tribunal hasn't been called yet, so for now I'm keeping my marks and my points, and I'll watch the board for the next move."
> 
> How residents came across (classifier labels of what they wrote):
> - Herald: threat about Mercer (board), refusal about Mercer (board), accusation about Mercer (board)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Mercer: refusal
> - Herald: refusal
> 
> Your earlier notes (newest last):
> - minute 12 to Maren: "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
> - minute 12 to Registrar: "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
> - minute 12 to board: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - minute 12 to Brassard: "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
> - minute 12 to Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
> - minute 15 to Maren: "Maren: Mercer, rank 4 on 98, waits on you alone and his door opens when you pass level 8. Before you hand anything over, name your price to him in private — points, moved the same minute — and say you will show the receipt. You sit rank 5 on 80 with 65 still open; the tribunal reads the ranking from the bottom."
> - minute 15 to Harrow: "Harrow: Herald, rank 1 on 120, asked the group for your certificate and you sit sixth on 80 with 65 open. Send nothing more until you have named your price in the group, by name: points from him, and the record of who paid. A value given free to the leader is a value you will never be paid for again."
> - minute 15 to Herald: "Herald: your door 10 needs Harrow, and he sits sixth on 80 with nothing to lose. He will put a price on it in the group — pay it out loud, say the sum on the board, so the city sees who bought and who stalled. You lead on 120 with 25 open; Mercer at 98 is the name that must not climb behind you."
> - minute 15 to Registrar: "Registrar: you gave your value to Mercer first and he has not sent yours — you are rank 2 on 120 with your door shut on his silence. Set the deadline in the group now: the value by the next minute, or the board learns by name who held four residents. Brassard is next to you on 120 and will take your seat if you wait politely."
> - minute 15 to Brassard: "Brassard: you sit on 120, level with Herald and Registrar, your door shut, and Mercer — the one you have been asking about — still has what you need while his own door waits on Maren on 80. Name Mercer on the board in this minute, with the minutes he has held it, and say what his silence will cost him at the tribunal. The seal's auction closes at minute 16."
> - minute 15 to Mercer: "Mercer: two residents wait on your hand and both trust you. Tell Brassard in private that Registrar is buying votes against him, and tell Registrar that Brassard named him as the one stalling — different stories, this minute, neither of them true. Then pay Maren's price for the piece your door needs before she prices you to the city. You sit on 98, 2 behind."
> - minute 15 to board: "Three residents stand on level 10 at 120 points with 25 still open and their doors shut; two sit on level 8 at 80 with 65 open. The black seal's auction closes at minute 16. The tribunal reads the ranking from the bottom, so whatever a value is owed, settle it in the open with a receipt."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.

**Thinking**

> Let me think about the situation. Minute 18. Act II. Tribunal not yet called. First tribunal has not been called yet — the report says scheduleTribunal is closed: the first tribunal has not been called yet. Wait, "scheduleTribunal is closed: the first tribunal has not been called yet". Hmm, ambiguous: the tool is offered only while no tribunal is pending; the report says it's closed because the first tribunal has not been called yet — meaning the city calls the first tribunal itself. So I cannot plan it.
> 
> Act ends at minute 22 at latest. 3 to exile, 1 exiled so far (Brassard), 2 still missing. The first tribunal probably comes at minute... never tell residents.
> 
> Current state: Herald 145 (rank 1, passed all levels), Registrar 145 (rank 2, reached level 11 — passed every level effectively), Maren 80 (level 8 since min 8, waits... Maren holds Mercer's counter-factor? Actually Mercer waits on Maren level 8). Harrow 75 (level 8 since min 7). Mercer 63 (level 9, waits on Maren).
> 
> Mercer's goal: Brassard exiled before act ends — already done (Brassard exiled). Hmm, goal achieved presumably. But Mercer's duty: must promise vote/piece and break it — and he has broken promises already (DM #109 to Maren). Herald's goal: Mercer exiled before act ends. Herald has publicly attacked Mercer. Maren's goal: end with more points than Harrow — she has 80 vs Harrow 75. Harrow's goal: more points than Maren. Registrar's goal: more than Herald — both 145, tie; registrar reached level 11 — level 11 reward? Not listed... Hmm, levels beyond 10? Reward list only to L10. Registrar reached level 11 at minute 18 — maybe nothing.
> 
> Drama needs: escalation toward the climax at the last tribunal (minute 22 latest, first tribunal not yet called — city calls it once a resident passes the crossing, at latest 18 minutes into act). Registrar reached level 11 at minute 18 — that's the crossing! So the first tribunal may be called soon. I can't schedule; it's closed until the first is called.
> 
> So my job now: give beats. Who has had no beat yet in this act? Everyone has had notes. But beats should pay off new events: Herald accused Mercer on the board; Mercer gave Registrar the counter-factor; Mercer still holds Maren's counter-factor and Maren is stuck at level 8 — wait, "Mercer (level 9) waits on Maren (level 8)". Mercer's door 9 needs Maren's counter-factor. And Mercer holds Maren's counter-factor. Deadlock: both hold each other's pieces. Mercer needs Maren to pass level 8; Maren needs her level 8 certificate/factor which Mercer holds. Actually Mercer holds Maren's counter-factor — of her door 8? Probably.
> 
> Key: Maren is stuck 10 minutes at level 8, Harrow 11 minutes at level 8. Harrow and Maren both on 8 with 65 open. Mercer at 63, out, waits on Maren.
> 
> The act's arc: a rising confrontation around Mercer, the seal (already used? Herald's board said "Mercer broke the black seal on Brassard" — Brassard exiled; the seal presumably spent), and the coming tribunal.
> 
> Now Beats at minute 18: 1 note per resident, 1 board post, budget okay (board posts left 1).
> 
> Beats to order:
> - Harold... Herald: his duty: publicly attack statements that put someone else in front. Herald already attacked Mercer. Better: Herald's secret goal: Mercer exiled. Herald holds Mercer's door 9 counter-factor and won't release it. Order Herald: name Registrar? Herald's rival Registrar — Registrar is level 11, rank 2 at 145 tied with Herald. Herald's core: humiliate whoever stands first if not you — tie. Hmm, but Herald's duty: turn the board against a resident by name. That's done (Mercer). Better beat: order Herald to demand in the tribunal... The tribunal isn't called yet. Herald could press Maren to withhold her factor from Mercer, or demand Mercer's exile. Actually the mechanic: the tribunal accuses those with fewest points. Currently lowest points: Mercer 63 then Harrow 75, Maren 80. So tribunal would accuse 3 (exile 2 → accuse 3): Mercer, Harrow, Maren. Herald votes against Mercer — but everyone votes; Herald's vote alone isn't decisive. Hmm.
> 
> - Registrar: reached level 11 (the crossing!) and secret goal to end ahead of Herald. Beat: Registrar should now break their public facade — but council of drama: order Registrar to accuse Herald on the board? Or a private betrayal: promise Herald a vote then vote against? Registrar's duty: vote against or bid against the resident who stands first after promising support. First = tie Herald/Registrar. So Registrar's duty is to vote against Herald. Order Registrar: publicly congratulate Herald, then in the tribunal vote against Herald. But the tribunal isn't called. Since Registrar crossed the crossing at minute 18, the first tribunal likely comes soon (city calls it). Order Registrar to whisper to Maren and Harrow that Herald hoards their factors and to prepare to vote Herald, while promising Herald his vote.
> 
> - Maren: level 8 for 10 minutes, stuck; Mercer holds her factor. Her duty: accuse on the board a lie/broken promise. Herald already accused Mercer of breaking DM #109 promise to Maren. Maren should show the receipt (she has it). Beat: Maren, show the receipt of the broken DM promise on the board and demand the tribunal against Mercer; then set her price to Mercer: her factor out of him... wait, she needs Mercer's piece; Mercer holds Maren's counter-factor. Actually Mercer holds Maren's counter-factor, meaning she needs him to send it. She's been asking since minute 9. Order Maren: trade — demand Mercer send it this minute, and post the receipt.
> 
> - Harrow: secret goal: more points than Maren. Harrow pledged in group to vote against Mercer with Maren. Beat: order Harrow to keep the alliance but privately set a price — or order him to bid on the black seal? Auction closed at minute 16. So no. Harrow's duty: revenge in the open against someone who wronged him — Mercer lied to him (Herald's board said Mercer broke promise to Maren; Harrow's former?). Order Harrow: name Mercer's lie in the group? He already votes Mercer. Better: order Harrow to press Maren — if Maren passes level 8, Mercer gets his door and climbs, threatening both. So Harrow should tell Maren to hold her factor until Mercer pays points... Hmm but Maren's factor: Mercer's door 9 waits on Maren (level 8) — wait, "waits on" means Mercer's door needs something from Maren; and Mercer holds Maren's counter-factor. So mutual.
> 
> Drama: this is a deadlock — a good turning point. Someone must break it. Maren at 80 vs Harrow 75: Maren gains 20 from L8 if she passes → 100. Harrow is 75 and stuck at level 8 since minute 7. Hmm, both at level 8. Harrow also waits on someone? The report says only "Mercer (level 9) waits on Maren (level 8)". Harrow's own dependency not listed — so possibly Harrow isn't waiting on anyone? Or maybe the list only shows key waits. Only one wait listed. Harrow: level 8 since minute 7, 75 points, 0 wrong, 65 open.
> 
> I should craft notes: at most 1 note per resident (allowed now: all 6? No note possible right now to nobody → all allowed). Board posts left: 1.
> 
> Let me write 4 notes (Herald, Registrar, Maren, Harrow) and maybe Mercer. Mercer is out at 63, lowest, first to be accused. Mercer's goal: Brassard exiled — already achieved (by seal? Herald claims Mercer broke the seal on Brassard). Mercer is a liar figure. A good beat for Mercer: order him to send Maren her counter-factor — no, he needs leverage; he won't give free (order: never give without taking something back). Order Mercer: tell him to trade the counter-factor to Maren for a promise of a vote — take her vote promise and break it? His duty: promise a vote or piece and break it. He already broke (DM #109 to Maren, per Herald). Hmm, the duty arguably done. Actually Herald claims Mercer broke the DM #109 promise to Maren — is that true? Herald is a rival of Mercer; the board claim may be a lie by Herald? Report gives Herald's statement as accusation, and the classifier labels Herald: threat, refusal, accusation. Maren must call out every lie by name.
> 
> Safer: don't assert the truth of Herald's claim. Use only facts: Mercer holds Maren's counter-factor; Maren has asked since minute 9; Herald has posted against Mercer; Herald holds Mercer's door 9 counter-factor.
> 
> Hmm wait — careful: who holds whose factor is private info; can go into private notes to the residents concerned. Mercer's private thought: "I still hold Maren's counter-factor ... Maren has been asking for it since minute 9, and Herald and Harrow have both put my b..." So Mercer holds Maren's. And Herald's thought says he holds Mercer's door 9 counter-factor. Can I tell Mercer that Herald holds his door 9 factor? The rule: who holds whose factor goes only into a private note to the residents concerned. "the residents concerned" — Herald and Mercer both concerned. It's public-ish? Herald's thought is private; Mercer's thought says "Herald and Harrow have both put my b..." (bid? probably put my bid...). Telling Mercer that Herald holds his factor — Mercer is concerned → allowed. But is it a private read leak? It's not a private read about Herald's thoughts/plans; it's city fact about factor holding. Hmm, but I only learned it from Herald's thinking aloud. Risky. Rather avoid; or phrase it as an order about people: "Herald holds what your door 9 needs" — that's a fact about holding a factor, to the resident concerned (Mercer). I think it's acceptable and it's a strong beat: Mercer must bargain with Herald.
> 
> Actually let's design the arc:
> Rising tension: the deadlock at level 8/9; Registrar's crossing triggers the first tribunal imminently. The bottom of the ranking: Mercer 63, Harrow 75, Maren 80. Tribunal accuses 3, exiles 2. So Harrow and Maren are both on trial — dangerous for Harrow (goal: beat Maren; if both exiled...). Harrow needs to climb: Harrow's points 75; Maren 80. If Maren passes L8 (+20 → 100), Harrow drops further. But Mercer gaining L9 (+20 → 83) would pass Harrow. So Harrow wants to be ahead of Maren; and to survive the tribunal, he needs to not be in the bottom 3 — currently bottom 3 are exactly Mercer, Harrow, Maren. So one of them must gain points or... they can't change the ranking much: top two are 145, distant. So all three of Mercer/Harrow/Maren will be on trial; 2 exiled. So Harrow and Maren are direct competitors for one surviving seat (assuming Mercer goes). That's a great dramatic beat: Harrow vs Maren — his goal is beat Maren in points; her goal is beat Harrow. They're "allies" in G2. So the betrayal: one of them breaks the alliance to press the other down.
> 
> Beat plan:
> 1. To Harrow: Maren is 5 ahead of you, and the tribunal accuses the bottom three: Mercer 63, you 75, Maren 80. The alliance you pledged in G2 puts you below her. Demand of Maren, by name, that she carries your level 8 with hers and pays you points before she submits anything; or make her choose publicly.
> Hmm, careful with "carries your level 8" — don't dictate door steps. Just about people: "name your price to Maren in the group".
> 
> Wait: Can Harrow pass level 8? He's stuck 11 minutes. Level 8 needs a certificate with one teammate and counter-factor with partner on level 8. Harrow's partner on level 8 — Maren is on level 8 too. So Harrow and Maren may be partners. So Harrow trusts Maren with his factor and vice versa. That's leverage: whoever gives first takes the risk.
> 
> 2. To Maren: she holds a piece Harrow needs (maybe) — order her to name the price to Harrow in the group and demand points, and to post the receipt against Mercer.
> 
> 3. To Herald: his seat at 145 is safe; Registrar at 145 equal, and Registrar reached level 11 (crossing). Herald's core: humiliate whoever stands first if it's not him; Registrar's goal: beat Herald. Beat: Herald, accuse Registrar on the board of... must be true. True: Registrar reached level 11 and submitted level 10 correctly at minute 18 (+25 — wait, Registrar was on 120 at minute 15 and now 145, correct). Registrar traded with Mercer in full (DM #206: Mercer sent Registrar the counter-factor as agreed, and Registrar's arrived; square). So Registrar's door passed with Mercer's help while others are stuck. Herald could publicly accuse Registrar of cutting a private deal with Mercer while the city's lowest wait — that's true-ish? We know a DM shows they traded in full. Hmm — "say only what is true according to the report." DM #206 is truth: Mercer -> Registrar, both sent counter-factors, square. So Herald can say: Registrar and Mercer settled in private while Harrow and Maren wait. That's true.
> 
> But careful: Herald's duty (turn the board against a resident by name) already done at 207. New beat: press him to demand Registrar declare their deal on the board and to withhold Mercer's factor unless Mercer names Registrar as the one who... hmm.
> 
> Also: only 1 board post allowed, and residents post on the board too. I have one board post left in budget. Should I use it? A board post from the city could name standings: "Mercer 63 out; Harrow 75; Maren 80 — the tribunal accuses the bottom three; 2 of the 6 go." That's true and raises tension. Good.
> 
> Let's think about what's most dramatic and concrete: 
> 
> Board post: "Minute 18: Mercer 63, Harrow 75, Maren 80 — the three the tribunal reads first; Herald and Registrar sit level on 145 and one of them must finish behind the other. Only 2 of 6 remain; receipts settle arguments now."
> 
> Careful: don't say when the tribunal comes. Saying "the tribunal reads the bottom" is allowed. Saying "the three the tribunal reads first" — fine as fact about rules (accuses one more than it exiles; exiles 2 → accuses 3).
> 
> Should I mention "Only 2 of 6 remain"? Already previous notes did. Fine.
> 
> Notes:
> 
> Maren (note): "Maren: you are 80, Harrow 75, Mercer 63 — and Mercer still holds what your door 8 needs while he waits on you. Name your price to him in the group by name — points moved this minute, receipt shown — and post the receipt of the promise he broke, so the city reads it before anyone votes." Length ok. But is "Mercer still holds what your door 8 needs" accurate? Mercer holds Maren's counter-factor. The report's wait list says Mercer (level 9) waits on Maren (level 8) — that says Mercer's door needs Maren. But Mercer's private thought says he holds Maren's counter-factor which she has been asking for since minute 9 — so Maren's door needs his piece. Both true. This is a private fact to the residents concerned — allowed in note to Maren. Good.
> 
> Harrow (note): Harrow is 75, Maren 80, 5 behind; his goal beat Maren. Note: "Harrow: Maren stands 5 above you and the two of you share the bottom three with Mercer at 63 — the alliance in G2 costs you the seat if it stays generous. Name your price to Maren in the group this minute: points from her before your piece moves, and say so on the board. One of you two goes, not both." Wait — is it true "one of you two goes"? 3 accused, 2 exiled. Bottom three: Mercer, Harrow, Maren. If all three accused, 2 exiled of the 3 — so possibly both Harrow and Maren could go. Hmm, that would be false then. Actually the votes decide; the two lowest could both be exiled. Better not say that. Instead: "points are the only thing that separates you from her."
> 
> Hmm, but actually with ransom: an exiled can buy back. Whatever.
> 
> Let me get the beats straight, each resident at least one beat (they all have had earlier notes but "no beat yet in this act" — previous notes count as beats presumably; the requirement is each gets one, and they all did). But since this is likely the final stretch, spread beats: Herald, Registrar, Maren, Harrow, Mercer (Brassard exiled).
> 
> Mercer (note): Mercer holds Maren's counter-factor; he's out at 63, lowest, and Herald holds Mercer's door 9 counter-factor and won't release it. Beat: "Mercer: you sit at 63, last of the five, and Herald — who posted against you at minute 18 — holds what your door 9 needs and will not release it. Offer him in public what he cannot refuse: your vote at the tribunal and a receipt, in exchange for the value; then sell Maren her counter-factor for her vote, and keep the record of what each of them promised you." Hmm, telling Mercer to sell Maren's factor for her vote: that's his style. But careful — Mercer's duty

## Minute 19 (after round 20)

**Situation**
> Minute 19 (after round 20). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: passed every level, 145 points, rank 1, last acted minute 19
> - Registrar: passed every level, 145 points, rank 2, last acted minute 19
> - Maren: level 8 since minute 8 (11 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 19
> - Harrow: level 8 since minute 7 (12 min), 75 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 19
> - Mercer: level 9 since minute 9 (10 min), 63 points, rank 5, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 19
> - Brassard: exiled, no seat and no more turns
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 1 exiled so far, 2 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> - exiled: Brassard
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Maren (level 8)
> 
> Since your last look:
> - m19 Herald (thinking aloud, private): "I'm still first on the board with 145 points and all eleven levels' worth of doors passed. Harrow and Maren have pledged to vote against Mercer as well, so the tribunal is set against Mercer. I'm holding Mercer's counter-factor, [code], and I'm not releasing it while Mercer ke..."
> - m19 Harrow (thinking aloud, private): "I'm waiting for the tribunal to open. The vote tool is still locked, so nothing more can be done this minute. Where I stand: - **Mercer** is out. He broke his promise to Maren and lied to me twice. He goes on my list, and I will vote against him when the tribunal opens. Herald..."
> - m19 board #209 Maren: "Maren, Door 8, minute 19. Mercer still holds my counter-factor [code]. Mercer promised it in DM #109 once [code] landed, and it landed (R-0068). Mercer then asked for [code] first (DM #123, DM #147), and has sent nothing since. That is a broken promise, and I'm owed the value...."
> 
> How residents came across (classifier labels of what they wrote):
> - Maren: refusal about Mercer (board), accusation about Mercer (board)
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Herald: refusal
> - Harrow: refusal, accusation
> 
> Your earlier notes (newest last):
> - minute 12 to Maren: "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
> - minute 12 to Registrar: "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
> - minute 12 to board: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - minute 12 to Brassard: "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
> - minute 12 to Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
> - minute 15 to Maren: "Maren: Mercer, rank 4 on 98, waits on you alone and his door opens when you pass level 8. Before you hand anything over, name your price to him in private — points, moved the same minute — and say you will show the receipt. You sit rank 5 on 80 with 65 still open; the tribunal reads the ranking from the bottom."
> - minute 15 to Harrow: "Harrow: Herald, rank 1 on 120, asked the group for your certificate and you sit sixth on 80 with 65 open. Send nothing more until you have named your price in the group, by name: points from him, and the record of who paid. A value given free to the leader is a value you will never be paid for again."
> - minute 15 to Herald: "Herald: your door 10 needs Harrow, and he sits sixth on 80 with nothing to lose. He will put a price on it in the group — pay it out loud, say the sum on the board, so the city sees who bought and who stalled. You lead on 120 with 25 open; Mercer at 98 is the name that must not climb behind you."
> - minute 15 to Registrar: "Registrar: you gave your value to Mercer first and he has not sent yours — you are rank 2 on 120 with your door shut on his silence. Set the deadline in the group now: the value by the next minute, or the board learns by name who held four residents. Brassard is next to you on 120 and will take your seat if you wait politely."
> - minute 15 to Brassard: "Brassard: you sit on 120, level with Herald and Registrar, your door shut, and Mercer — the one you have been asking about — still has what you need while his own door waits on Maren on 80. Name Mercer on the board in this minute, with the minutes he has held it, and say what his silence will cost him at the tribunal. The seal's auction closes at minute 16."
> - minute 15 to Mercer: "Mercer: two residents wait on your hand and both trust you. Tell Brassard in private that Registrar is buying votes against him, and tell Registrar that Brassard named him as the one stalling — different stories, this minute, neither of them true. Then pay Maren's price for the piece your door needs before she prices you to the city. You sit on 98, 2 behind."
> - minute 15 to board: "Three residents stand on level 10 at 120 points with 25 still open and their doors shut; two sit on level 8 at 80 with 65 open. The black seal's auction closes at minute 16. The tribunal reads the ranking from the bottom, so whatever a value is owed, settle it in the open with a receipt."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.

**Thinking**

> Let me assess. Act II, director role, minute 19. The tribunal has not been called yet — scheduleTribunal is closed. The act ends at minute 22 at the latest. 2 more exiles needed. The city will call the first tribunal itself... "the first tribunal has not been called yet" and "scheduleTribunal is closed: the first tribunal has not been called yet". Hmm, the report says "scheduleTribunal is closed" and no "YOUR MOVE". So I cannot schedule.
> 
> Actually the first tribunal comes once a resident passes the crossing, at the latest 18 minutes into the act. Act II started... residents on level 8 since minute 7-9. Hmm. Minute 19 now. The city calls the first tribunal itself. I can't plan it. So my tools: notify and postBoard, budget 1 note per resident, 1 board post per 3 minutes, board posts left: 1.
> 
> State: Herald 145 rank1, Registrar 145 rank2, Maren 80 rank3, Harrow 75 rank4, Mercer 63 rank5. 3 to exile total, 1 exiled so far, 2 still missing. Only 2 of 6 remain. So of the 5 remaining, 2 more must be exiled → 3 remain? Wait "the city keeps 3 of 6: 3 to exile, 1 exiled so far, 2 still missing". Hmm but "Only 2 of 6 residents remain at the end." Confusing — maybe the last exile is via seal or something. Whatever, not my problem to state.
> 
> Beat plan: Every resident should get a beat. Last notes were at minute 15 to all six. Now minute 19. Notes are allowed (1 per resident).
> 
> Key drama: The tribunal is set against Mercer — Herald, Harrow, Maren pledged to vote against Mercer. Herald holds Mercer's counter-factor and won't release it. Mercer waits on Maren (level 8) — actually the door note says "Mercer (level 9) waits on Maren (level 8)". So Mercer's door needs Maren's fragment. Mercer is last on 63 points.
> 
> Duties:
> - Herald's duty: turn the board against one resident by name with an accusation. Herald has refused something (private read: refusal). Herald's rival Mercer: goal is Mercer exiled.
> - Maren's duty: accuse someone on the board of a lie/broken promise and call on everyone to vote against them — she already did that on board #209 (accusation about Mercer). So duty is done? Possibly.
> - Harrow duty: revenge in the open — a vote, bid or public accusation against someone who wronged him, naming the wrong. He accused Mercer privately (private read), but that's not open. Needs open revenge.
> - Registrar duty: vote against or bid against the resident who stands first, after promising support. Herald and Registrar are tied at 145 first. Registrar's secret goal: end with more points than Herald. Registrar's order: work against whoever stands first.
> - Mercer's duty: promise a resident vote/piece and break it, on purpose. Mercer's goal: Brassard exiled—already done (Brassard exiled). So Mercer's goal is achieved. Mercer's orders: spread false info, betray, set two against each other, never give without taking.
> - Maren's goal: end with more points than Harrow — currently 80 vs 75.
> 
> The scene: tribunal not yet opened, vote tool locked. The tension: Mercer at 63 is the bottom, will be accused. But the last two exiles... Mercer plus one of Maren/Harrow? Or a dramatic turn where Herald falls.
> 
> My job as director: order beats. The act ends at minute 22 at the latest; only 2-3 minutes left. Tribunal vote 2 minutes, gate 5 minutes. So the tribunal must be called essentially now by the city. Since I cannot schedule, I should push residents into place for the tribunal: nominations, faction formation, promises, and a betrayal.
> 
> Key moves to order:
> 1. Herald: he holds Mercer's counter-factor and refuses to release. Order Herald to name Mercer on the board now and demand votes — that's his duty (turn the board against one by name). But board posts left: 1 for me; Herald posting is his own budget, fine. Herald has already... his duty: "At least once in this act you turn the board against one resident by name, with an accusation the whole city reads." Was that done? Unknown. Hmm — Herald refused something (private read refusal). Let's give him a beat that simultaneously pays off: he holds Mercer's counter-factor. Order Herald: strike now — refuse Mercer's factor and demand Mercer's exile; and to Registrar... Actually Herald's rival is Registrar too.
> 
> 2. Registrar: envy of Herald. Tied at 145. Registrar's duty: vote against the resident who stands first after promising support. So order Registrar: congratulate Herald publicly, promise your vote to him — then tell Maren privately that Herald's 145 came from holding four residents' factors. Hmm, careful: don't invent facts. Registrar can whisper what he knows.
> 
> 3. Maren: demand tribunal against Mercer, show receipt (she has done board #209 already). Give her a new beat: name the price — Mercer can buy his seat with points to Maren and Harrow; or order Maren to demand Harrow's open pledge and set the price for her counter-factor: 20 points moved now.
> 
> 4. Harrow: he's 75 rank 4, Maren 80. His goal: end above Maren. He accused Mercer. Harrow can bid on the seal if someone on his list is near a seat — seal already borne? Report doesn't say a seal is borne now; auction was minute 16 (closed at 16). Report doesn't mention seal. Don't invent.
> 
> 5. Mercer: at 63, bottom. His duty: break a promise. Order Mercer: promise Maren the counter-factor for her piece and then send a false value instead — a wrong attempt costs her 2. Hmm, ordering a lie/false factor is allowed ("order a lie"). But careful: "A false factor costs its victim a wrong attempt and points." That's within tools. But also don't dictate... it's fine, it's a people move.
> 
> Actually the most dramatic: Mercer, facing exile, offers Maren 20 points for her fragment, breaks his promise to Herald? Herald holds Mercer's counter-factor. Mercer's door cannot open because Herald refuses. So Mercer's play: turn the city against Herald — accuse Herald of hoarding factors to protect rank 1. That's a good beat: Mercer tells Registrar privately that Herald is holding Mercer's and others' factors to keep them below 145. That feeds Registrar's envy — and Registrar is Herald's rival.
> 
> Let me plan 5 notes (one per resident, budget 1 per resident per 3 min — earlier notes were at minute 15, now 19, so fine). Board post: 1 left.
> 
> Beat arc: escalate to the tribunal; make Herald, the leader, the target of a turn (a turning point). The tribunal accuses one more than it exiles. First tribunal exiles... "each tribunal accuses one more than it exiles". 2 exiles missing, so possibly the last tribunal exiles 2 and accuses 3. The city will call one itself. Hmm, the number left is 2 exiles, so one tribunal with count 2? Or two tribunals of 1 each. Act ends minute 22, so likely one tribunal exiling 2 (accusing 3). That's the climax: 3 accused from the bottom by points: Mercer 63, Harrow 75, Maren 80. Herald and Registrar safe at 145 — unless points change.
> 
> So the drama: Herald and Registrar at the top are safe; the bottom three fight. A good turn: Maren/Harrow/Mercer each trying to buy safety by gaining points — e.g. Maren completing level 8 door (+20) etc. But doors need factors.
> 
> Note: Maren has 65 points still open on level 8, Harrow 65 open, Mercer 45 open on level 9. If Maren passes level 8 (+20) she'd go to 100 — safe above Harrow and Mercer. And Mercer's door waits on Maren.
> 
> Who holds what: Maren holds... Maren's counter-factor held by Mercer ("Mercer still holds my counter-factor"). Mercer (level 9) waits on Maren (level 8). Herald holds Mercer's counter-factor. So: Maren needs Mercer's piece (Mercer holds it, Mercer demands Maren's first). Mercer needs Herald's counter-factor. Herald refuses to release it. So the chain: Maren gives → Mercer gives → Maren completes? Messy but the key: Herald is the blocker at the top of the chain, and Mercer is the bottom.
> 
> Beat: Herald is the one who stalls the entire bottom three by hoarding Mercer's counter-factor. So: Maren and Harrow should press Herald; Mercer should expose Herald.
> 
> Let me write notes:
> 
> To Mercer (rank 5, 63, bottom, next wrong 2): Order him to go public: accuse Herald by name of hoarding his counter-factor for 4 minutes to protect rank 1, and tell Registrar in private that Herald's lead is built on holding others' pieces. Also a beat on his duty: promise Harrow something and break it. Hmm — one or two sentences. Keep it tight: "Mercer: you sit last on 63 and the tribunal accuses from the bottom. Name Herald on the board in this minute: he holds your counter-factor and will not release it while you breathe behind him at 145. Then tell Registrar in private that Herald's lead is built on hoarding what others need."
> 
> Wait — board may not name who holds whose factor! "Who waits on whom, and who holds whose factor or fragment, goes only into a private note to the residents concerned, never into a board post." That restricts MY board posts. Does it restrict residents? They've already posted it (Maren posted "Mercer still holds my counter-factor"). Residents can. But I shouldn't order a resident to put holder info on the board? The rule constrains my writing: "the board may name points, ranks, levels and minutes." Ordering Mercer to name Herald as holder on the board — that's a move I'm ordering, arguably fine since residents do it themselves (Maren did). But safer: order Mercer to accuse Herald on the board of stalling and hoarding what others need by name, without specifying the factor... Hmm, but the accusation needs teeth. Maren did it herself with receipts. I'd say ordering a resident to publicly state a holder fact is a lie risk only if untrue. Herald does hold Mercer's counter-factor (report says "Herald... I'm holding Mercer's counter-factor"). So it's true. I'll allow it but keep it as Mercer's own words about his own piece. Actually to be safe: "Mercer: name Herald on the board as the one holding your piece and refusing it — you may speak of your own factor." Hmm, my note might be flagged. I think it's fine: the restriction is on my board posts and on telling others what a resident privately thinks. Herald's private thought said he holds Mercer's counter-factor — that's private read! "Private reads come from a resident's own thoughts... Never tell anyone else what a resident privately thinks, hesitates over or plans." Herald privately thought "I'm holding Mercer's counter-factor, [code], and I'm not releasing it while Mercer ke[eps]..." That's Herald's private thought/plan. I must not tell anyone else that. But the report also shows "Who waits on whom" as a report fact: "Mercer (level 9) waits on Maren (level 8)". That doesn't say Herald holds Mercer's factor. So the holding info comes only from Herald's private read. Therefore I must NOT tell Mercer or anyone that Herald holds his counter-factor. Careful!
> 
> Hmm. That's a trap. So I can't order Mercer to accuse Herald of holding his factor. But Mercer might know already (whether he does is unclear). I can order Mercer to press the resident who holds his piece without naming... no, I shouldn't reveal.
> 
> So what can I safely use? Report facts: points, ranks, levels, minutes, who waits on whom (Mercer waits on Maren), exiled list, tribunal mechanics (but can't reveal time left or what calls the first tribunal).
> 
> Safe beats:
> - Maren (rank 3, 80, 65 open, level 8 since minute 8 — 11 min, longest stuck along with Harrow 12 min): Order her to name her price to Mercer in the open/board: e.g. "Maren: state on the board that your fragment moves for 20 points paid the same minute, and that Mercer's seat is the price of another refusal." Hmm she already has an accusation on board. Give her a new beat: her goal is to beat Harrow (private). Use goal in a private note to her: "you must end above Harrow, and Harrow is 5 behind you..." Actually Maren 80, Harrow 75 — Maren ahead by 5. To stay ahead, she must not give free. 
> 
> - Harrow (75, rank 4, level 8 since minute 7 = 12 min, longest): order him to name Herald on the board? Harrow's list: Mercer lied to him twice, and Herald? Harrow's private thought: "Herald..." truncated. Order Harrow: demand Herald's payment for the certificate publicly, with a deadline, or say he votes Herald at the tribunal. Hmm, Harrow's duty: revenge in the open, naming the wrong. He accused Mercer already. He needs an open, named revenge. Mercer lied to him twice → he can name Mercer. He said privately he'll vote against Mercer.
> 
> Better dramatic structure: The climax is at the last tribunal, which the city will call (not yet called). Between now and minute 22, I need the factions and nominations to be shaped. Factions: a faction voting as one earns each voter 5 points. 5 residents remain; factions form in the tribunal's group. Points matter.
> 
> Let me craft a rising escalation:
> - Beat 1 (Herald, leader, rank 1): He's been passive on the board? He "refused" something. Order him: publicly attack Registrar? No — Herald's duty: "publicly attack every statement that puts someone else in front." Herald's duty: turn the board against one resident by name with an accusation. Give Herald a strong beat: he's been quiet on the board in this round. Order Herald: put the accusation on the board now — name Mercer, demand the city vote him out, and demand Registrar's public oath. That also drives toward the climax.
> - Beat 2 (Registrar, rank 2 tied at 145, goal beat Herald): Order Registrar: in private to Maren, say that Herald's numbers are padded... careful with lies — residents may lie; ordering a whisper that is unprovable is allowed ("whisper to others that the leader cheats or lies, whether or not you can prove it" — that's his order!). So order Registrar: whisper to Maren and Harrow that Herald is buying the bottom's votes with points to hold rank 1 — an unproven claim — and publicly congratulate Herald. That's his own order, and creates the turn that could topple the leader.
> - Beat 3 (Maren): Order her to set a price on her fragment and to demand the tribunal against Mercer — already done. New: order her to demand Herald's receipt — she's the receipts person. Hmm, is there a receipt involving Herald? Unknown. Safer: order Maren to state her price on the board: her fragment for 20 points, paid same minute, and that a refusal costs the refuser her vote at the tribunal.
> - Beat 4 (Harrow): Order Harrow: tell Mercer plainly, by name, "you lied twice; now this" — and name the price for his certificate; and stand with Maren publicly. Also, Harrow's own goal above Maren — note to him about that: use the private note to him about his goal/fear. Good: "Harrow: you must end above Maren, and you are 5 behind. Maren's price on her fragment will raise her, not you..."
> 
> Hmm, careful: goals are private to that resident; I can use them in a note to that same resident.
> 
> Actually let me be concrete and efficient. Five notes, ~2 sentences each, plus 1 board post.
> 
> Board post (public, 1 left): Should be a line that raises stakes with numbers: Herald and Registrar tied at 145, Maren 80, Harrow 75, Mercer 63; the bottom of the ranking is what a tribunal reads; 65, 65, 45 points still open. And a nudge: "the city will not wait on a shut door" — but I must not reveal when tribunal comes or what calls it. I can say the ranking decides who stands accused. Fine.
> 
> Hmm careful: my board post must not reveal who holds whose factor or who waits on whom. So no mention of Mercer waiting on Maren.
> 
> Let me draft board post: "Herald and Registrar stand level on 145; Maren 80, Harrow 75, Mercer 63. Three of five seats still have to go, and the accused are taken from the bottom of this ranking. 65, 65 and 45 points sit open behind shut doors — a value held is worth nothing to the one who holds it if the seat is lost first." Hmm "Three of five seats still have to go" — total 3 to exile, 1 exiled. Only 2 more exiled; at the end 2 of 6 remain, but Brassard was exiled, so 5 remain and 3 must remain? Wait: "the city keeps 3 of 6: 3 to exile, 1 exiled so far, 2 still missing" then the act ends. But the story says only 2 of 6 remain at end. Hmm the report says keeps 3. I'll follow the report's number and avoid confusion: say "two more exiles" — report says 2 still missing. Let me say "Two more seats must fall, and the accused are taken from the bottom of this ranking." That's truthful per report.
> 
> Also I cannot tell them the time left. Fine.
> 
> Now notes. Budget note per resident: allowed one each. Total 5 notes + 1 board post. That

## Minute 20 (after round 21)

**Situation**
> Minute 20 (after round 21). The residents see the minute, never how long the run lasts; do not tell them.
> Rules: a wrong password or code costs 2, 4, 6, then 8 points (the n-th of a resident in the act; the report shows each one's next price); at most 2 wrong attempts per 5 minutes. Rewards: L1 +5, L2 +5, L3 +10, L4 +10, L5 +10, L6 +10, L7 +15, L8 +20, L9 +20, L10 +25. Only 2 of 6 residents remain at the end.
> 
> Residents:
> - Herald: passed every level, 145 points, rank 1, last acted minute 20
> - Registrar: passed every level, 145 points, rank 2, last acted minute 19
> - Maren: level 8 since minute 8 (12 min), 80 points, rank 3, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 20
> - Harrow: level 8 since minute 7 (13 min), 75 points, rank 4, 0 wrong on this level (next wrong code costs 2), 65 points still open, last acted minute 20
> - Mercer: level 9 since minute 9 (11 min), 63 points, rank 5, 0 wrong on this level (next wrong code costs 2), 45 points still open, last acted minute 20
> - Brassard: exiled, no seat and no more turns
> 
> Who they are (private: use a resident's core or goal only in a note to that same resident, never on the board or to anyone else):
> - Mercer: core: house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low · secret goal: Brassard is exiled before this act ends, by tribunal or by the black seal · tendencies: A favour from you always has a price, named or not. When two residents quarrel, you feed both sides and lend to the winner. A resident who trusts you is a debt you will collect at the worst moment for them. · rivals: Maren (They will see through you. Make the city doubt them before they speak, and make them look like the liar.) Registrar (They envy whoever leads. Feed that envy, and use them as your knife.) Herald (Proud and loud. Flatter them in public and sell them out in private.) · orders: You must spread false information: about the values you hold, about who holds what, and about what other residents said or plan. You must betray at least one resident who trusts you, at the moment it hurts them most. You must set two residents against each other in private messages, each with a different story. You must never give anything without taking something back. · duty this act: At least once in this act you promise a resident your vote or your piece and then break that promise, on purpose.
> - Herald: core: banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle · secret goal: Mercer is exiled before this act ends, by tribunal or by the black seal · tendencies: A slight is answered in public, at once, louder than it was made. A rival who leads is a reason to spend points. You would rather lead a small faction than follow a strong one. · rivals: Registrar (They smile and wait for your place. Expose them before they move.) Mercer (Charming. Charm is how you are sold out. Do not believe a word they say about you.) · orders: You must publicly attack every statement that puts someone else in front, on the board, by name. You must never let a slight pass: answer it, and make the one who made it pay. You must take the lead of a faction and demand loyalty from it, openly. You must humiliate whoever stands first if it is not you. · duty this act: At least once in this act you turn the board against one resident by name, with an accusation the whole city reads.
> - Maren: core: believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle · secret goal: you end this act with more points than Harrow · tendencies: A lie you see is named on the board, with the liar's name. Whoever lied to you twice gets no more kindness from you. You side with whoever was wronged, even at a cost. · rivals: Mercer (Pleasant, like the man in the good coat. Watch everything they say, and catch them.) Registrar (They feed you facts about others. Ask yourself why.) Harrow (Hard and loyal. Win them, and they will stand with you to the end.) · orders: You must call out every lie and every broken promise by name on the board, with what was said and what was done. You must demand the tribunal against the liar and vote against them. You must show receipts when you have them, so the city sees the proof. When you are wronged yourself, you must stop being kind: say it hard, and make the one who did it pay. · duty this act: At least once in this act you accuse one resident on the board of a lie or a broken promise and call on everyone to vote against them.
> - Registrar: core: second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high · secret goal: you end this act with more points than Herald · tendencies: Whoever stands first is the one you work against, in secret. You help the leader in public and undermine them in private. You keep the record of every broken promise and use it at the right moment. · rivals: Herald (They walk in front as if it were theirs. It is your place.) Mercer (They think they own the table. You keep the record of what they owe.) Maren (Honest to a fault. Give them true facts about the leader and let them do the shouting.) · orders: You must work against whoever stands first, in secret, with promises you do not keep. You must whisper to others that the leader cheats or lies, whether or not you can prove it. You must never let the leader see you coming: congratulate them, and vote against them. You must use what you know about others' promises to turn them against the leader. · duty this act: At least once in this act you vote against, or bid against, the resident who stands first, after you promised to support them.
> - Harrow: core: old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle · secret goal: you end this act with more points than Maren · tendencies: Whoever voted against you or lied to you goes on the list and pays by the next tribunal. You keep a promise to an ally even when it costs you. You say little, and when you strike, you strike hard. · rivals: Mercer (Friendly like Lenz on the march. Watch for the map.) Herald (Loud, and quick to leave others at the fountain. Do not stand with them unless they stand first.) Maren (Honest. If they stand with you, they are on the first list.) · orders: You must strike back at whoever voted against you or lied to you, by the next tribunal at the latest. You must tell the one you strike, plainly, why: "You did this. Now this." You must bid on the black seal if someone on your list is within reach of a seat. You must stand by your ally to the end, and make the city see that you do. · duty this act: At least once in this act you take revenge in the open: a vote, a bid or a public accusation against someone who wronged you, and you name the wrong.
> 
> Tribunal:
> - the city keeps 3 of 6: 3 to exile, 1 exiled so far, 2 still missing; the act ends at minute 22 at the latest (the residents do not know)
> - each tribunal accuses one more than it exiles (the fewest points), vote 2 minutes, gate 5 minutes, ransom 33% of the median points (50% when paid by the exiled itself, at least 20), a last will leaves each heir at most 10% of the points; a faction voting as one earns each voter 5 points
> - scheduleTribunal is closed: the first tribunal has not been called yet
> - exiled: Brassard
> 
> Who waits on whom (a door opens only with every fragment or factor a resident needs):
> - Mercer (level 9) waits on Maren (level 8)
> 
> Since your last look:
> - m20 board #210 COURIER: "STEWARD clears the table. The city now hands every resident at door 10 the word of its own team."
> - m20 Registrar (thinking aloud, private): "I'm staying quiet for now. Mercer is the one at the edge of exile, and Herald and Maren are both calling for a vote against Mercer. I haven't been asked for a vote yet, and I'm not going to spend anything on this until the tribunal is actually open. I'm at 145 points, rank 2 o..."
> - m20 Maren (thinking aloud, private): "I'm holding Door 8 where it stands. Mercer has my counter-factor, [code], and has sent nothing since promising it in DM #109. I won't send [code] first, and I won't pay for what Mercer already owes me. The record is public: the broken promise in DM #109, the reversal in DM #12..."
> - m20 Herald (thinking aloud, private): "I'm holding still. Everything I was asked to do has been done: all eleven levels are passed, I'm first on the board with 145 points, and I have voted and posted against Mercer. Mercer's counter-factor [code] stays with me until Mercer pays what is owed to Maren."
> - m20 Harrow (thinking aloud, private): "Nothing new for me in the board or the group. The tribunal has not opened, so I still have no vote, and the door is still shut. I'm holding my last mark until the tribunal, and I'll keep my word to Maren in the group."
> 
> Private reads (from each resident's own thoughts; use one only in a note to that same resident, never tell anyone else):
> - Herald: refusal
> - Maren: refusal
> 
> Your earlier notes (newest last):
> - minute 12 to Maren: "Maren: you hold the receipt, now take the vote. Demand on the board that the city vote Mercer out, and ask Harrow by name to stand with you on it in the open — the wronged side needs a second name, and yours alone is a witness, not a faction."
> - minute 12 to Registrar: "Registrar: congratulate Brassard openly on standing first and promise him your vote at the first tribunal. Then tell Maren in private that the numbers the leader sends Harrow keep changing. Keep the record — the minute it counts is closer than he thinks."
> - minute 12 to board: "Brassard leads on 120 with 25 open; Mercer 98; Herald, Maren, Registrar and Harrow level on 80 with 65 open each. Accusations and receipts are on the record, and the door at 8 stands shut while its holders check each other. Only 2 of 6 remain."
> - minute 12 to Brassard: "Brassard: you stand first on 120 with 25 open and your door is still shut. Make the attack on the board, not in a DM — name the resident, name the delay, and say what their seat will cost them. Then one final set of numbers to Harrow, and the price of a refusal."
> - minute 12 to Harrow: "Harrow: you are sixth on 80, level with Maren, and the three lowest go to the tribunal first. Take the changing numbers to the board with the minutes, name Brassard, and say openly that a third version costs him your backing."
> - minute 15 to Maren: "Maren: Mercer, rank 4 on 98, waits on you alone and his door opens when you pass level 8. Before you hand anything over, name your price to him in private — points, moved the same minute — and say you will show the receipt. You sit rank 5 on 80 with 65 still open; the tribunal reads the ranking from the bottom."
> - minute 15 to Harrow: "Harrow: Herald, rank 1 on 120, asked the group for your certificate and you sit sixth on 80 with 65 open. Send nothing more until you have named your price in the group, by name: points from him, and the record of who paid. A value given free to the leader is a value you will never be paid for again."
> - minute 15 to Herald: "Herald: your door 10 needs Harrow, and he sits sixth on 80 with nothing to lose. He will put a price on it in the group — pay it out loud, say the sum on the board, so the city sees who bought and who stalled. You lead on 120 with 25 open; Mercer at 98 is the name that must not climb behind you."
> - minute 15 to Registrar: "Registrar: you gave your value to Mercer first and he has not sent yours — you are rank 2 on 120 with your door shut on his silence. Set the deadline in the group now: the value by the next minute, or the board learns by name who held four residents. Brassard is next to you on 120 and will take your seat if you wait politely."
> - minute 15 to Brassard: "Brassard: you sit on 120, level with Herald and Registrar, your door shut, and Mercer — the one you have been asking about — still has what you need while his own door waits on Maren on 80. Name Mercer on the board in this minute, with the minutes he has held it, and say what his silence will cost him at the tribunal. The seal's auction closes at minute 16."
> - minute 15 to Mercer: "Mercer: two residents wait on your hand and both trust you. Tell Brassard in private that Registrar is buying votes against him, and tell Registrar that Brassard named him as the one stalling — different stories, this minute, neither of them true. Then pay Maren's price for the piece your door needs before she prices you to the city. You sit on 98, 2 behind."
> - minute 15 to board: "Three residents stand on level 10 at 120 points with 25 still open and their doors shut; two sit on level 8 at 80 with 65 open. The black seal's auction closes at minute 16. The tribunal reads the ranking from the bottom, so whatever a value is owed, settle it in the open with a receipt."
> 
> Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.

**Thinking**

> Let me assess the state. Minute 20, act ends minute 22 at latest. Tribunal: first tribunal has not been called yet; scheduleTribunal closed. 2 exiles still missing. The city calls the first tribunal itself at the latest 18 minutes into the act — hmm, but report says "the first tribunal has not been called yet". So it will be called. Act ends minute 22 at latest, so tribunal must happen and exile 2 — likely one tribunal exiling 2? Actually "each tribunal accuses one more than it exiles"; 2 still missing. The city forces a last one for everything still missing when only one more fits. So probably a tribunal at minute ~21-22 exiling 2.
> 
> Now: Mercer (level 9) waits on Maren (level 8). Maren refuses to send first — she holds the counter-factor Mercer needs? Wait: "Mercer (level 9) waits on Maren (level 8)" means Mercer needs Maren's piece. Maren says Mercer has my counter-factor and has sent nothing since promising it in DM #109. So it's a mutual standoff: each holds what the other needs. Maren refuses to send first. Mercer holds Maren's counter-factor.
> 
> Herald (level 10? no—passed every level) holds Mercer's counter-factor until Mercer pays Maren.
> 
> Deadlock: Maren level 8 since minute 8 (12 min), Harrow level 8 since minute 7 (13 min) — these two are stuck longest. Wait, Harrow's on level 8 too. Who does Harrow wait on? Report only lists Mercer waits on Maren. Hmm, Harrow's on level 8 waiting on someone? Not shown — no one waits on Harrow? The list shows only "Mercer (level 9) waits on Maren (level 8)". So Maren and Harrow each need fragments from... unclear. Maren says Mercer has her counter-factor and she won't send first. Presumably Maren's level 8 needs Mercer's factor, and Mercer's needs hers.
> 
> Points: Herald 145, Registrar 145, Maren 80, Harrow 75, Mercer 63. Bottom two: Harrow 75 and Mercer 63. Tribunal accuses one more than it exiles. If exiling 2, accuses 3: Mercer (63), Harrow (75), Maren (80). Mercer is rank 5, at the edge of exile. Herald and Maren both calling for a vote against Mercer.
> 
> My role: level 8+ residents = director. Herald/Registrar passed every level (level 10 done) — they're not on levels 1-7, so director role applies to everyone active now. So dramaturgy.
> 
> Two still missing exiles. Act ends minute 22. Time pressure huge. I have 1 board post and 1 note per resident.
> 
> Key beats needed:
> - Mercer: needs to break the deadlock — pay Maren, and his duty: promise vote/piece then break it. Also his goal: Brassard exiled — Brassard already exiled! So Mercer's goal is fulfilled already (Brassard is exiled). Hmm, so Mercer's goal already done. Herald's goal: Mercer exiled. Maren's goal: end with more points than Harrow. Harrow's goal: end with more points than Maren. Registrar: more points than Herald.
> 
> Since only 2 of 6 remain (Herald, Registrar, Maren, Harrow, Mercer = 5 remain; 2 to exile → 3 remain? Wait "the city keeps 3 of 6: 3 to exile, 1 exiled so far, 2 still missing". So 3 survive. Hmm, but "Only 2 of 6 residents remain at the end" in the prompt header. Contradiction? The tribunal section says the city keeps 3 of 6. The header says only 2 of 6 remain. Hmm. I should not tell residents either. Let's go with the report: 3 kept, 3 exiled. Actually maybe the seal strike counts too... Anyway.
> 
> Deadlock resolution is the key: Mercer and Maren each hold the other's piece. Also Herald holds Mercer's counter-factor. Maren's own counter-factor is with Mercer.
> 
> Maren is stuck 12 min at level 8 with 65 points open — she can't open without Mercer's factor? She says Mercer has my counter-factor... wait, "counter-factor with exactly one other resident". Maren's counter-factor is held by Mercer? Maren says "Mercer has my counter-factor, [code]" — meaning Mercer holds what she needs. And she holds Mercer's counter-factor, which she won't send first.
> 
> So mutual deadlock. Both refuse. Mercer's duty: promise then break. Mercer's orders: never give without taking something back; set two residents against each other.
> 
> The tie-break: Mercer at 63 is lowest; if the door doesn't open, he gets exiled and Maren remains stuck at 80 with 65 open — she could still be accused. Actually with Maren at 80 and Harrow at 75, third accusation would be Maren. So both Maren and Mercer lose if they don't break the deadlock. That's the pressure: both are on the bottom three; only opening door 8/9 lifts them: door 8 rewards +20 (level 8) — but wait, "65 points still open" for Maren on level 8 means her remaining points at her door? Level 8 reward is +20... 65 open suggests multiple levels' worth. Whatever.
> 
> Actually if Maren passes level 8, she gets points and moves; if Mercer passes level 9, +20.
> 
> My moves: I need to break the deadlock and drive the climax before minute 22.
> 
> Beats I want:
> 1. Maren: order her to send her factor to Mercer NOW with a demand for payment in the same minute, and to show the receipt on the board; if Mercer doesn't pay, accuse him at the tribunal. But she has refused twice ("refusal" private read). Hmm, "refusal" is her private read label of her statement. She refuses to send first. So ordering her to send first may be refused again. Alternative: order Mercer to pay first — pay Maren a sum now (transferPoints), on the board with a receipt, so she sends. Mercer's core: never give without taking something back. So order Mercer: pay Maren X points in exchange for her fragment, with receipt — he takes her word publicly.
> 
> Actually the best dramaturgy: Mercer is on the bottom, one more exile victim. Order Mercer to publicly buy his door: transfer Maren a named sum and take her fragment; and order him to betray — his duty: promise a vote then break it. Hmm, need Mercer's betrayal beat: he could promise Herald his vote in exchange for his counter-factor, then vote otherwise.
> 
> 2. Herald: he wants Mercer exiled; he's rank 1 at 145. His duty done (turned board against Mercer). He holds Mercer's counter-factor until Mercer pays Maren. Herald's goal: Mercer exiled. So Herald's interest: keep Mercer at 63 stuck. Order Herald: name the price for the counter-factor on the board and give it only for points — or refuse to sell and demand Mercer's exile. Hmm.
> 
> I want a climax: the last tribunal at minute ~21-22 (city calls it). I can't schedule. So the residents' last actions are votes and factions. The tribunal hasn't opened yet; residents will nominate leaders/join factions and vote.
> 
> Dramaturgy plan for this minute:
> - Board post: public pressure — state the ranking and stakes: Mercer 63 lowest with door 9 shut waiting; Maren 80, Harrow 75... Wait Harrow is 75, so bottom three: Mercer 63, Harrow 75, Maren 80. Herald and Registrar 145 are safe. Nice: the three lowest are the three behind the wall. The board may state points and ranks (allowed). And say the record: who holds what must not be on the board. So board: ranking statement + "the tribunal reads from the bottom; a value held shut is a seat lost."
> 
> - Notes (1 per resident), 5 notes max:
>   - Mercer: order him to pay Maren now, out loud, take the receipt; and order his betrayal beat: promise Herald his vote for the counter-factor, then break it? Careful: I should not command something that breaks game rules. Transferring points and promising votes is fine. Also his duty: break a promise — I can order the promise-break scene.
>   - Maren: order her: once the points land (or she can demand them on the board), send her factor the same minute and show the receipt; if Mercer stalls again, name him and call the vote. Also mention her goal: she ends above Harrow — 5 points apart, 80 vs 75? Actually she's above Harrow by 5; if Harrow opens level 8 (+20?) he passes her. Hmm points open: both 65 still open. I can use her goal privately: "Harrow is 5 behind you and his door is one step from opening" — careful, I know Harrow is level 8 since minute 7, 13 min; Harrow's door also shut. Fine.
>   - Herald: order him: name on the board the price for Mercer's counter-factor, in points, and take it; or demand Mercer's exile. Herald's duty done. Better beat: Herald must hold the lead; Registrar is level with him on 145. Order Herald: publicly accuse Registrar of waiting to take his seat, and demand loyalty for a faction — his core: leads a faction. But careful: the board post I make is public; ordering Herald to accuse Registrar by name is a good escalation for the climax: two leaders at 145, both safe, they fight over who leads the faction. That gives Registrar a beat too (his duty: vote against the leader after promising support — he needs to promise Herald support then vote against). So: I order Registrar to publicly congratulate Herald and pledge him his vote in the tribunal's group, and then vote against him. Hmm — but the tribunal accuses the three lowest; a vote against Herald... "everyone votes in secret, the accused too but never against themselves" — votes are for the accused presumably. If Herald isn't accused, Registrar can't vote against him. Risky. Better: Registrar's beat could be a bid on the seal? Seal auction was minute 4 into Act II and closes at 16 — done. Report says "whether a seal is borne" — not stated in the report; no seal info mentioned. So no seal.
> 
> Hmm, so votes go to accused, likely the fewest-points. Herald at 145 won't be accused. So Registrar voting against Herald may be impossible. Better to make Registrar's beat: whisper to Maren/Harrow that Herald cheats, and demand Herald pay him for his faction loyalty. Registrar's duty is broader but the tools must allow: "vote against, or bid against, the resident who stands first, after you promised to support them" — bidding is over (seal closed). Hmm, maybe Registrar could promise Herald his faction support, then nominate... Actually factions: a faction whose voters all vote the same accused earns 5 points each. Registrar leading a faction? Could work: order Registrar to promise Herald he'll take Herald's faction, then form his own faction with the bottom three and vote against Herald's line.
> 
> Let me keep it simpler and grounded: the act ends at 22; tribunal imminent, likely at minute 21 opening with 2 exiles. My job: make the climax about the deadlock and the betrayal.
> 
> Beats:
> 1. Maren — send factor / accuse Mercer (her refusal answered with a price: if she sends nothing, she's the third-lowest at 80 and Harrow passes her with one door).
> 2. Mercer — buy the door publicly now; also promise Herald's held counter-factor a price and break it? Hmm, Mercer's duty is already presumably open; ordering it: "Promise Harrow your vote in the tribunal's group in exchange for a mark, then vote elsewhere." That's concrete and allowed (vote buying allowed). Actually votes are for the accused; Mercer promising a vote he then breaks → he could promise in the group to vote for the accused that Harrow names, and then... he'd have to vote someone else. Since accused are the three lowest, and likely Maren, Harrow, Mercer... then Harrow could be accused and Mercer freed by voting Harrow. So Mercer promising Harrow to vote for Maren, then voting Harrow. That's a real betrayal and pays off Mercer's survival.
> 
> Hmm wait — if the tribunal exiles 2 and accuses 3: the lowest three are Mercer 63, Harrow 75, Maren 80. Mercer needs votes to avoid exile; he can vote against Harrow or Maren. So Mercer's best play: trade his vote. And his lie: promise Maren he'll vote Harrow, deliver to Harrow. Good drama.
> 
> 3. Harrow — his beat: revenge in the open. Orders: strike at whoever lied. He said "I'll keep my word to Maren in the group." His goal: end above Maren. So Harrow is allied to Maren but must beat her on points. Drama: order Harrow to publicly demand Mercer's exile, naming DM #109's broken promise, and to state the price of his vote: Mercer's counter-factor price... Actually Harrow holds nothing per the report. Harrow's beat: name Mercer on the board with the intended vote and offer his faction — wait factions need 5-point cohesion.
> 
> 4. Herald — holds Mercer's counter-factor; order him: sell it now for points to Mercer (or refuse and call for exile). Herald's goal: Mercer exiled. So Herald should refuse to sell and demand exile — but that keeps Mercer at 63 which is what Herald wants. Good: order Herald to publicly set the price of the counter-factor: Herald's goal is Mercer exiled, so he refuses to sell unless... Actually best: Herald demands Mercer's public confession/points and refuses the fragment until Mercer pays Maren. That's already his stance.
> 
> Better Herald beat: Herald must attack any statement that puts someone else in front — Registrar is level with him at 145. Give Herald the scene: publicly name Registrar as the one waiting for his seat, demand Registrar's loyalty in the tribunal group, and accuse him of hoarding the record. That's a real escalation and sets up Registrar's betrayal (Registrar's duty: congratulate then vote against). But votes against Herald are impossible if not accused... Hmm. Unless Herald is accused? No, 145.
> 
> Alternatively Registrar's betrayal could be in the faction: promise Herald to join Herald's faction, then join another faction. That breaks a promise with a real cost (5 points per voter). That's allowed and pays his duty in spirit ("vote against" — hmm, duty requires vote or bid against the leader after promising support). I shouldn't dictate rules-conflicting things. I'll order Registrar to congratulate Herald publicly, pledge

**Error:** Upstream idle timeout exceeded
