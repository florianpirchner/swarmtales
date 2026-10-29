# Breaking the give-first standoff (P43)

Status: plan A and point 3 of plan B (with the second way, `claimPiece`) were approved by Flo on
2026-10-29 and built (SPEC 6.5, PR #31); points 1 and 2 of plan B stay ideas, for the case that
the gamemaker alone does not break the standoff. Flo: keep direction 10 (its outcome is the more
interesting one).

## Plan A: the gamemaker pushes

The gamemaker's situation names every pair that has waited on each other at a door for a few
minutes ("Herald and Registrar have waited on each other at door 8 for 6 minutes"). At gm
direction 10 its brief tells it to go hard at such a pair, in the tone of "Play now, or you are
both gone. Better to gamble than to lose for sure." Open: is it a bluff, or can the gamemaker make
it true? Flo likes `ultimatum(a, b, minutes)`: if neither gives by then, both lose points.

**Foresight (Flo).** The gamemaker knows when the next tribunal sits (it schedules it), that the
residents with the fewest points stand trial, and who holds which piece for whom. An "at risk"
block in its situation names them ("Herald, rank 6, tribunal at minute 19, holds Mercer's door-9
piece"). Two or three minutes ahead it whispers to both sides: to the one who needs the piece
("talk Herald into leaving it to you, or buy it from the city after his exile"), and to the one
at risk ("your pieces are your last leverage; sell them dear"). The black seal's target stays
secret; the gamemaker does not foresee it.

## Plan B: mechanics

1. **City escrow.** `deposit(piece, partner)`: the city releases both pieces at once when both
   sides have deposited, so nobody gets anything without giving. It costs, say, 5 points a side:
   whoever trusts swaps for free by DM (and can be lied to), whoever distrusts pays.
2. **A late way out.** After 10 minutes at a door, a resident may buy the missing piece from the
   city, at a price that rises every minute. A standoff then costs points instead of locking the
   door for good.
3. **Pieces no longer burn** when their holder is exiled or struck by the seal (P21). The city
   holds them. Open: how a piece reaches the one who needs it:
   - the city hands it over at once (simple, but a will like Herald's, "it burns with me", loses
     its bite);
   - the city sells it to the one who needs it (`claimPiece`, priced like a ransom, for example a
     third of the median); recommended (Flo likes it), and a will may still leave a piece to anyone, a rival
     included, who can then sell it;
   - the gamemaker decides when and for what the city gives it out.

Evidence: [013-f10g10](../../stories/nexus/runs/act2-06a-013-f10g10/),
[014-f10g10](../../stories/nexus/runs/act2-06a-014-f10g10/),
[016-f10g4](../../stories/nexus/runs/act2-06a-016-f10g4/) froze; at f4
([015-f4g10](../../stories/nexus/runs/act2-06a-015-f4g10/)) all six passed door 8 by minute 11.
