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

## Round 2, second pass (proof)

Status of the numbered requests above: 1 still open (`LedgerApi` has no `open`), 2 still open (the converter copies neither `seenBoard` nor the gamemaker `notes`; the resume tests do not need them because the activation is `always` and the gamemaker is off), 3 to 8 unchanged.

9. **`defy` and `gamemaker_defied` are declared twice.** Carve decision D-7 (T2 R-1, built) gives both the event and the tool to channels (`mechanics/channels/src/defy.ts`, with `defiance` and `whispererDefies`, proved against the old engine in `test/mechanics/channels/differential.test.ts`). The whispers mechanic (T1) still declares its own `defy` tool and `gamemaker_defied`, so a story that loads both has two tools of one name for the resident role. Whispers should drop its copy and keep only the `defy` guard line (`index.ts:55`); its `whisperer_chosen` event already unlocks the tool in channels. This is T1's file; nothing was changed on the channels side.
10. **Core: the `TOOL_LOCKED` reply.** The host answers `TOOL_LOCKED: this tool is closed to you for now`; the old engine answered `not available to you at this level or in this phase; activeTools lists the tools you can use now`. The golden gates play with a story prompt override (`test/mechanics/t2/prompts/replies/core/locked.md`). The default text of `replies/core/locked` should be the old one, or the golden accepts the new text.
11. **Core: schema failures.** The old runner answered `Validation failed for tool "x": ...` with the received arguments; the host answers `INVALID_ARGUMENTS: the arguments do not match the tool's parameters`. The differential tests count both as one refusal.
12. **Gamemaker between-slot.** There is no hook between the residents' turns and the minute's end for the gamemaker's look before step 17. The golden replay and the differential tests make the gamemaker's calls at the end of the last resident's turn of the minute (still in the same minute).
13. **Core: a snapshot without a mechanic's slice.** `restoreHost` throws `snapshot: no slice for mechanic "names"` when the story loads a mechanic whose slice the snapshot lacks. The old engine resumes `examples/cityofkeys-act1-06a-01` and `-02` (they predate the names) without complaint; the new host cannot, so those two checkpoints are not in the resume tests. A mechanic's default state for a missing slice, or a converter that writes one, would fix it.
14. **Old petition records store `signatures`**, which is the number of signers; the new slice derives it. No change needed; the differential test compares the rest of the record.

What the tests prove now, and what not: see the T2 report in `docs/design/rewrite-status.md` (round 2, proof).
