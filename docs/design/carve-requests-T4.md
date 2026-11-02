# Requests from team T4 (conflict) to the integration owner

Numbered, in the order they were found. Each says what, why and the exact signature wanted. Until
they land, standoff uses the local adapters named below.

## R1. PuzzlesApi: read the deals

- Why: standoff needs what a resident holds for others (`heldPieces`); standoff-tribunal needs the open
  fragment doors, who is at them and the inherited fragments.
- Signature: `PuzzlesApi.held(input: { agent: string; reached: number }): Array<{ level: number; piece: string; needers: string[] }>`
  and `PuzzlesApi.openFragmentDoors(): Array<{ level: number; door: number; lacking: string[] }>`.
- Adapter now: `mechanics/standoff/src/holdings.ts` reads `fragments_dealt`, `factors_dealt` and
  `level_contracted` from the log.

## R2. StandoffApi: noteGiven

- Why: the last will hands pieces to heirs and the old `lastWill` notice is recorded on the heir.
- Signature: `StandoffApi.noteGiven(input: { agent: string; to: string }): null`.
- Adapter now: `noteText({ author: agent, readers: [to], text: piece.value })`.

## R3. GoalsApi: noteHeir and noteLeaders

- Why: the old `goals.noteHeir` and `goals.noteLeaders` have no shared API or event.
- Signature: `GoalsApi.noteHeir(input: { heir: string; from: string }): null` and
  `GoalsApi.noteLeaders(input: { leaders: string[] }): null`.

## R4. ExileApi.toGate takes only a resident

- Why: tribunal passes voters, prices and the deadline; exile cannot know them.
- Signature: `ExileApi.toGate(input: { resident: string; voters: string[]; price: number; selfPrice: number; until: number; ransomable: boolean }): null`.
- Adapter planned: exile derives voters from `tribunal_vote` events since the last `tribunal_opened`.

## R5. No act-start or act-end signal

- Why: seal opens at the start of its act and ends with it; the tribunal `ended` state ends acts
  (`goals.resolve`, `seal.end`).
- Signature: a hook `actStarted(ctx, { act })` and `actEnded(ctx, { act, reason })` in the core, or
  `ProgressionApi.actEnded(act): boolean`.
- Adapter planned: poll `ProgressionApi.actStart` in `minuteStarted`; end on `runEnded`.

## R6. Holdout strikes are not in the exile slice

- Why: the converter puts `holdout.struck` only into the holdout slice; `ExileApi.standing` must see them.
- Signature: the converter writes struck residents into the exile slice too (`exiled` with `by: "holdout"`).

## R7. Run length and survivors as options

- Why: tribunal needs `minutes` and `survivors`; exile needs `startLevel` and `lastLevel`.
- Signature: story options of tribunal and exile, or `ProgressionApi.lastLevel(): number` and
  `ProgressionApi.minutes(): number`.

## R8. Gamemaker note checks

- Why: the old `#checked` text checks (leak, privacy, repeat) and the `gamemaker_note` event need
  the gamemaker role's state, which a mechanic may not import.
- Signature: a shared `GamemakerNotesApi.check(text): { ok: true; text: string } | { ok: false; code: string }`.
  Until then only trim, prefix strip and the length limit (400) are done.

## Note: minute-start order

Old `startMinute` order is names, tribunal, seal, standoff, ..., holdout. With the load order
standoff, exile, tribunal, seal it differs; the integration owner must decide the load order or the
order of `minuteStarted` hooks.
