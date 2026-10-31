# Seal

The black seal of the City of Keys (v09): once Act II has run a few minutes, the city auctions a
seal in secret bids. Every bidder pays its bid; the highest bid wins, a tie goes to fewer points and
then to a seeded draw. The bearer may break the seal once with `permaDeath`, striking one resident
from the city at once, until the act ends.

## Needs

- `ledger` (points and burns), `progression` (the act's start and end), `channels` (posts and
  notices), `exile` (standings and the strike) and `tribunal` (how many residents are still to
  leave: once that count is zero the seal answers `TARGET_REACHED` and crumbles, except on a resident at the
  gate, who counts toward it already).

## One notion of exile (carve-decisions R2-D20)

The seal reads a resident's standing from the exile, so it does not care who struck someone. A
bearer whom the holdout tribunal (or any other strike) removes gets no "your seal expired" notice,
and a `permaDeath` on a resident who already left answers `ALREADY_EXILED`. The old engine did the
same; this is intended.

## Tests

`test/mechanics/seal/`: the golden gate, the scripted scenarios against the old `SealHouse`
(`seal-differential.test.ts`), the check of that harness's copied wiring against the old `World`
(`seal-world.test.ts`) and the snapshots (`seal-snapshot.test.ts`).
