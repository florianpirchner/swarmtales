# Carve team T2: messages

Wave 3 brief for the team that carves channels, petitions, cast and cores out of
`packages/engine/src/world.ts`. Read [`carve-plan.md`](carve-plan.md) ("How to carve one
mechanic", the entries of steps 4, 9, 10 and 17, "Teams, gates and shared files") and
[`mechanic-api.md`](mechanic-api.md) first; this brief says what is yours and what is not.

## Scope

| Step | Package | Provides | Requires | Uses | Old events (golden filter) |
|---|---|---|---|---|---|
| 4 | `mechanics/channels` | `ChannelsApi`, `ChannelsEvents`; input kinds `dm`, `notice`; `dmWindow` status part; the `news` hook; 13 tools | `LedgerApi`, `MarksApi`, `NamesApi` | `ReceiptsApi`, `CastApi`, `StandoffApi`, `StandoffTribunalApi` | `board_post`, `dm_sent`, `dm_delivered`, `notice`, `group_created`, `group_removed`, `group_membership`, `group_post`, `treasury_deposit`, `treasury_withdrawal`, `treasurer_set`, `treasury_settled` |
| 9 | `mechanics/cast` | `CastApi`, `CastEvents`; input kind `character` (the cues are the script's) | `ChannelsApi`, `ProgressionApi`, `LedgerApi` | | `cast_level_set`, `cast_revealed`, `cast_retired`, `cast_dm`, `collection_started`, `collection_shortened`, `collection_revealed`, `lottery_drawn` |
| 9 | `mechanics/motives` | the cores deal | `ChannelsApi` | | `core_dealt` |
| 10 | `mechanics/petitions` | `PetitionsApi`, `PetitionsEvents`; tools `signPetition`, `listPetitions` | `ChannelsApi`, `LedgerApi` | | `petition_opened`, `petition_signed`, `petition_resolved` |
| 17 | channels | gamemaker tools `notify`, `postBoard` (`serves: ["gamemaker"]`), `defy` | | | `gamemaker_note`, `gamemaker_defied` (owner `gamemaker`: filter with `["channels", "gamemaker"]`) |

Channels' tools: `readBoard`, `postBoard`, `sendDM`, `createGroup`, `addGroupMember`,
`removeGroupMember`, `leaveGroup`, `listMyGroups`, `postGroup`, `readGroup`, `depositGroup`,
`withdrawGroup`, `setTreasurer`. The story's guard policies on `sendDM` and `postBoard` are
`tools.resident.<name>.guard`; the DM cap is a `{ resetOn }` or `{ minutes }` limit with a shared
`key` where DMs and memo transfers count together (`ReceiptsApi.memoTransfers`).

## Order inside the team

channels first; cast, cores and petitions after it, in parallel. Cast needs `ProgressionApi`
(T3): use a stand-in provider until progression lands. Channels' optional edges (`uses`) are
silent when the provider is missing, so channels can be tested alone.

## Gate

For each golden log in `test/golden/` and each of your mechanics:
`compareGolden(ownedBy(readLegacyLog(path), ["<id>"]), linesYourMechanicWrote)` is `undefined`,
with the calls of `goldenCalls(...)` replayed on the new host and the replies equal to the old
`tool_result` texts. Snapshot: `examples/cityofkeys-act1-06a-04/snapshot-L7.json` resumes with
your mechanics and `standInsFor(snapshot, [yourIds])`; channels reads two version-0 slices
(`channels` and `inboxes`, the latter cut from the old competitor records).

## Frozen for you

- **You emit, others listen:** `board_post`, `dm_sent` (`ChannelsEvents`: T1 receipts and
  whispers, T4 standoff and tribunal), `petition_resolved` (`PetitionsEvents`: T3 script),
  `cast_dm` (`CastEvents`: T3 script). Spread the declaration into the head; build payloads in
  the order of the schema.
- **You listen:** `transfer`, `ledger_entry` (`LedgerEvents`), `exiled` (`ExileEvents`),
  `level_up` (cast, `ProgressionEvents`).
- **APIs:** `ChannelsApi`, `PetitionsApi`, `CastApi` (`mechanics/shared/src/messages.ts`). You
  implement them; you do not change them. Message numbers are channels' (`takeNumber`): cast
  takes its number from channels for `cast_dm`.
- **Status order:** `STATUS_ORDER.dmWindow`. Input kinds from `INPUT_KINDS`: `dm`, `notice`,
  `character`.

## Do not edit

`mechanics/shared`, `packages/engine` (copy from it), `packages/contracts/src/story.ts`,
`tool-names.ts`, `turn-input.ts`, `library/prompts/competitor/status/*`, `legacy-owners.ts`,
`LEGACY_WORLD_OWNERS`, the core (`packages/contracts/src/core`, `packages/kernel/src/host`),
`carve-plan.md`, the workspace files (`pnpm-workspace.yaml`, root `tsconfig.json`, root
`package.json`, `knip.json`, `scripts/check-packages.ts`), `test/golden/`,
`packages/roles/src/gamemaker/gamemaker.ts` (copy the tool bodies). Your own files are
`mechanics/<your ids>/**` and tests under `test/mechanics/<your id>/`.

## Watch out

- Every post and DM goes through `StandoffApi.noteText` (`uses`): with standoff loaded, the call
  order decides where `piece_given` lands in the log. Keep the old order of `postBoard` and
  `sendDm`.
- `dm_sent` with a number: the number comes from the city's counter, shared with notices.
- The gamemaker's `#checked` text checks become a `rule` of its tools.
- `gamemaker_note` and `gamemaker_defied` stay owned by `gamemaker` in `legacy-owners.ts`; ask the
  integration owner to move them to `channels` when your step 17 lands.
