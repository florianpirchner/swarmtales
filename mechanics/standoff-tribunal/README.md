# Standoff tribunal

The holdout tribunal of Whispers: a resident who has reached a fragment door and still holds back
its fragment from those before it may be put on trial. It gets a grace to send the fragment; then
the others vote in secret whether to banish it (unanimity needed, up to three votes), and if every
vote fails the city strikes one resident drawn by lot.

## Needs a gamemaker (carve-decisions R2-D17)

Only the gamemaker calls a tribunal (`callTribunal`), and only it announces (`announceTribunal`),
draws the lot (`drawLot`) and strikes (`permaDeath`). The city's fallback announces and strikes
only once a tribunal is running. A story without a gamemaker must not load this mechanic: the old
engine played the holdout only in runs with the gamemaker (`World` option `holdout`).

## Needs

- `puzzles` (open fragment doors, who lacks whose fragment), `progression` (levels and passes),
  `exile` (who is in the city and the strike), `channels` (posts, notices) and its note desk
  `NotesApi` (the gamemaker's texts are checked for leaks, repeats and length there).

## Tests

`test/mechanics/standoff-tribunal/`: the golden gate, the scripted scenarios against the old
`HoldoutTribunal` (`holdout-differential.test.ts`), the old Whispers `World` with the real channels
and note desk (`holdout-world.test.ts`) and the snapshots (`holdout-snapshot.test.ts`).
