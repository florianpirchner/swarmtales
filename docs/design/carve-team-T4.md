# Carve team T4: conflict

Wave 3 brief for the team that carves standoff, exile, tribunal, seal and standoff-tribunal out of
`packages/engine/src/world.ts`. These five call each other, so one team owns all of them. Read
[`carve-plan.md`](carve-plan.md) ("How to carve one mechanic", the entries of steps 11 to 15 and
17, "Teams, gates and shared files") and [`mechanic-api.md`](mechanic-api.md) first; this brief
says what is yours and what is not.

## Scope

| Step | Package | Provides | Requires | Uses | Old events (golden filter) |
|---|---|---|---|---|---|
| 11 | `mechanics/standoff` | `StandoffApi`, `held` status part; tool `claimPiece` | `PuzzlesApi`, `ProgressionApi`, `LedgerApi`, `ChannelsApi` | | `piece_kept`, `piece_claimed`, `piece_given`, `ultimatum_set`, `ultimatum_resolved` |
| 12 | `mechanics/exile` | `ExileApi`, `ExileEvents`, `standing` status part; tools `payRansom`, `lastWill` | `ProgressionApi`, `ChannelsApi`, `LedgerApi`, `StandoffApi`, `PuzzlesApi` | `SealApi`, `GoalsApi` | `exile_gate`, `ransom_paid`, `ransomed`, `exiled`, `last_will` |
| 13 | `mechanics/tribunal` | `TribunalApi`, `tribunal` status part; tools `vote`, `nominate`, `join`, `refuse` | `ExileApi`, `ChannelsApi`, `LedgerApi`, `ProgressionApi` | | `tribunal_announced`, `tribunal_scheduled`, `tribunal_cancelled`, `tribunal_called`, `tribunal_opened`, `faction_nominated`, `faction_leaders`, `faction_applied`, `faction_refused`, `factions_formed`, `bloc_result`, `tribunal_vote`, `tribunal_result` |
| 14 | `mechanics/seal` | `SealApi`, `seal` status part; tools `bid`, `permaDeath` (resident) | `LedgerApi`, `ProgressionApi`, `ChannelsApi`, `ExileApi`, `TribunalApi` | | `seal_auction_opened`, `seal_bid`, `seal_won`, `seal_used`, `seal_expired` |
| 15 | `mechanics/standoff-tribunal` | `StandoffTribunalApi`, `holdout` status part; tool `tribunalVote` | `StandoffApi`, `PuzzlesApi`, `ExileApi`, `ChannelsApi` | | `blocker_found`, `blocker_cleared`, `holdout_called`, `lot_drawn`, `holdout_vote_opened`, `holdout_ballot`, `holdout_vote_result`, `holdout_announced`, `holdout_ended` |
| 17 | tribunal, standoff-tribunal, standoff | gamemaker tools `scheduleTribunal` (tribunal); `callTribunal`, `drawLot`, `announceTribunal`, `permaDeath` (standoff-tribunal, `serves: ["gamemaker"]`); `ultimatum` (standoff) | | | as above |

## Order inside the team

standoff, exile, tribunal, seal, standoff-tribunal. The cycles of the old engine are `uses` edges:
exile calls `SealApi.onExiled` and `GoalsApi.onExiled` (T3) when they are loaded; seal requires
`ExileApi` and `TribunalApi`. All of T4 needs `ProgressionApi` (T3) and `PuzzlesApi` (T3): use
stand-in providers until they land.

## Gate

For each golden log in `test/golden/` and each of your mechanics:
`compareGolden(ownedBy(readLegacyLog(path), ["<id>"]), linesYourMechanicWrote)` is `undefined`,
with the calls of `goldenCalls(...)` replayed and the replies equal to the old `tool_result`
texts. The f10g10 and whispers goldens hold the tribunal, the seal and the holdout. Snapshot:
`examples/cityofkeys-act1-06a-04/snapshot-L7.json` resumes with your mechanics and
`standInsFor(snapshot, [yourIds])`; exile reads the tribunal's gates, exiled and ransomed parts
(slice `exile`). No example snapshot holds standoff, holdout or seal state: write fixtures for
those migrations.

## Frozen for you

- **You emit, others listen:** `exiled` (`ExileEvents`: T1 whispers, T2 channels and cast, T3
  goals and script). Build the payload as `{ agent, will?, by? }`.
- **You listen:** `board_post`, `dm_sent` (`ChannelsEvents`), `level_up`, `submission`
  (`ProgressionEvents`), `ledger_entry` (`LedgerEvents`).
- **APIs:** `StandoffApi`, `ExileApi`, `TribunalApi`, `SealApi`, `StandoffTribunalApi`
  (`mechanics/shared/src/conflict.ts`). You implement them; you do not change them. You call
  `PuzzlesApi.burn` and `PuzzlesApi.contract` where the old `#onExiled` emitted `factor_burned` and
  `level_contracted`; those events are puzzles' now.
- **Status order:** `STATUS_ORDER.held`, `.standing`, `.tribunal`, `.seal`, `.holdout`.

## Do not edit

`mechanics/shared`, `packages/engine` (copy from it), `packages/contracts/src/story.ts`,
`tool-names.ts`, `turn-input.ts`, `library/prompts/competitor/status/*`, `legacy-owners.ts`,
`LEGACY_WORLD_OWNERS`, the core (`packages/contracts/src/core`, `packages/kernel/src/host`),
`carve-plan.md`, the workspace files (`pnpm-workspace.yaml`, root `tsconfig.json`, root
`package.json`, `knip.json`, `scripts/check-packages.ts`), `test/golden/`,
`packages/roles/src/gamemaker/gamemaker.ts` (copy the tool bodies). Your own files are
`mechanics/<your ids>/**` and tests under `test/mechanics/<your id>/`.

## Watch out

- The old `#onExiled` order is: pieces kept or burned, the balance burned, the goal, the seal,
  then the level contractions. Keep it; the goldens hold it.
- Two `permaDeath` tools share a name: seal's resident variant and standoff-tribunal's gamemaker
  variant; their `serves` must not overlap.
- `piece_given` comes from channels calling `StandoffApi.noteText` on every post and DM: the call
  happens inside channels' tool, so the event lands where the old engine wrote it.
- The holdout tribunal keeps its own ballot; it needs no `TribunalApi`.
