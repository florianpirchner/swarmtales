# Carve team T1: economy

> **Carried from the old platform.** This paper was written for the old platform, before the rewrite, and is kept as
> it was, except for its links. Links to the other papers of [`docs/history/`](../README.md) stay relative; paths into
> code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do not exist on this
> branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Wave 3 brief for the team that carves names, ledger, marks, receipts (with blame) and whispers out
of `packages/engine/src/world.ts`. Read [`carve-plan.md`](carve-plan.md) ("How to carve one
mechanic", the entries of steps 1, 2, 3, 5 and 6, "Teams, gates and shared files") and
[`mechanic-api.md`](mechanic-api.md) first; this brief says what is yours and what is not.

## Scope

| Step | Package | Provides | Requires | Uses | Old events (golden filter) |
|---|---|---|---|---|---|
| 1 | `mechanics/names` | `NamesApi`, `presentation.resolve` and `display`, `youAre` status part | none | `PuzzlesApi.passwordPiece` | `name_chosen` |
| 2 | `mechanics/ledger` | `LedgerApi`, `LedgerEvents`, `points` status part | none | | `ledger_entry`, `transfer` |
| 3 | `mechanics/marks` | `MarksApi`, `marks` status part, the refill job | `LedgerApi` | | `marks_spent` |
| 5 | `mechanics/receipts` | `ReceiptsApi`, `receipts` status part, tools `showReceipt`, `blame` (consult role `judge`) | `ChannelsApi`, `LedgerApi` | | `receipt_issued`, `receipt_shown`, `blame` |
| 6 | `mechanics/whispers` | tools `forgeReceipt`, `nameFavourite`, `popularity` status part | `ReceiptsApi`, `ChannelsApi`, `LedgerApi`, `MarksApi` | `ExileApi` | `whisperer_chosen`, `whisper_duty`, `popularity_opened`, `popularity_ballot`, `popularity_result`, `receipt_forged` |

The old code of each step is listed in its carve-plan entry. The tool `transferPoints` is
ledger's; its receipt is issued by receipts, which listens to `transfer`. No gamemaker tool
belongs to T1.

## Order inside the team

names and ledger first (in parallel), then marks, then receipts, then whispers. receipts and
whispers need `ChannelsApi` (T2): test them against a stand-in provider until channels lands.

## Gate

For each golden log in `test/golden/` and each of your mechanics:
`compareGolden(ownedBy(readLegacyLog(path), ["<id>"]), linesYourMechanicWrote)` is `undefined`,
with the calls of `goldenCalls(...)` replayed on the new host and the replies equal to the old
`tool_result` texts. Snapshot: `convertLegacySnapshot` of `examples/cityofkeys-act1-06a-04/
snapshot-L7.json` resumes with your mechanic loaded and `standInsFor(snapshot, [yourIds])` for the
rest, and your migration 0 → 1 reads the version-0 slice. No example snapshot holds whispers
state: write a fixture for its migration.

## Frozen for you

- **You emit, others listen:** `ledger_entry`, `transfer` (`LedgerEvents`: T2 channels, your
  receipts). Spread `LedgerEvents.events` into the ledger head; build each payload in the order of
  the schema (the golden key order).
- **You listen:** `transfer` (receipts), `dm_sent` (receipts, whispers; `ChannelsEvents`), `exiled`
  (whispers; `ExileEvents`).
- **APIs:** `NamesApi`, `LedgerApi`, `MarksApi`, `ReceiptsApi` as declared in
  `mechanics/shared/src/economy.ts`. You implement them; you do not change them.
- **Status order:** your parts carry `order: STATUS_ORDER.points`, `.marks`, `.receipts`,
  `.popularity`, `.youAre`.

## Do not edit

`mechanics/shared`, `packages/engine` (copy from it), `packages/contracts/src/story.ts`,
`tool-names.ts`, `turn-input.ts`, `library/prompts/competitor/status/*`, `legacy-owners.ts`,
`LEGACY_WORLD_OWNERS`, the core (`packages/contracts/src/core`, `packages/kernel/src/host`),
`carve-plan.md`, the workspace files (`pnpm-workspace.yaml`, root `tsconfig.json`, root
`package.json`, `knip.json`, `scripts/check-packages.ts`), `test/golden/`. Your own files are
`mechanics/<your ids>/**` and tests under `test/mechanics/<your id>/`. A package dependency on
`@swarmtales/contracts` may be added to your own `package.json` (it changes only your importer in
`pnpm-lock.yaml`).

## Watch out

- The old `Ledger` (`packages/kernel/src/ledger.ts`) stays where it is until step 18; copy it.
- `move` writes `ledger_entry` only; a resident's transfer writes `ledger_entry` then `transfer`.
- Blame's judge answers through the `consult` stage; `JUDGE_ABSENT` / `JUDGE_FAILED` come from the
  consult outcome, not from a refusal.
- `NamesApi.resolve` returns other text unchanged; the presentation does the replacing.
