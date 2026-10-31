# Requests from T2, round 2

Numbered requests to the owners of core, mechanics/shared, testkit and the converter. T2 uses a local adapter meanwhile.

1. **Ledger: open an account.** `LedgerApi.open` is missing, so `createGroup` cannot open the group's ledger account at once (it still opens on the first deposit). Add `open({ account })`.
2. **Converter: copy `arena.seenBoard` and `gamemaker.notes`** into the channels version-0 slice as `seenBoard: [{ agent, seq }]` and `notes: [{ minute, to, text }]`. The channels migration accepts both as optional; tests patch the host snapshot until this lands.
3. **Shared `DmRecord.text` optional.** An old snapshot can hold a DM record with no text. `ChannelsApi.dmRecord` returns `""` for an absent text; the record is kept absent in the slice.
4. **`PuzzlesApi.secrets({})`** returning `{ passwords, numbers }` would make the leak check complete. City factors are not reachable now; the note desk gathers what `solutionOf`, `taskValues` and `holders` give.
5. **Order table:** an entry for the resume escrow funding in cast (now `minuteStarted.cores + 10`).
6. **Stories must grant `resolvePetition` to `script`.** Petition expiry is now a staged `resolvePetition` call, so its `onFail` actions run before `run_ended`.
7. **Cast has no exile behaviour in the old engine**, so no `exiled` or `level_entered` listener was written.
8. **Host suspensions** cannot be read in `load` or in migrations; `isGone` reads `ExileApi.isExiled`, or `!mayAct` when no exile mechanic is loaded.

Not done in this round: the full turn-loop golden replay gate with `goldenDiff`/`goldenOrder` for channels, and the differential tests against the old engine; the phase tests (`test/mechanics/t2/phases.test.ts`) and `turn-inputs.test.ts` cover must-fix items 1 to 3 only.
