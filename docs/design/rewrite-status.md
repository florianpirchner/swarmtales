# Rewrite status (2026-10-31) and how to continue

Branch `claude/project-thread-b71bdz`, nothing is on `main` yet (Flo: everything lands in one pass).
`pnpm check` is green on this branch (1367 tests; lint needs a 12 GB heap, the whole check takes about 7 minutes).
The old engine (`packages/engine`, `world.ts`) still runs the product; the new core and the 19 mechanics run
next to it and are proven by tests. Golden files in `test/golden` were never regenerated.

## Done

| Wave | What | Where |
|---|---|---|
| 1 | Golden-run tests (cityofkeys f4g4, f10g10, whispers f10 + grudge), prompts in `library/prompts` (404 files, typed loader), import cycles broken (contracts layer), pnpm workspace with tsdown, `swt` | `test/golden`, `packages/prompts`, `apps/cli` |
| 2 | New core: `packages/contracts/src/core`, `packages/kernel/src/host`, `packages/testkit`, legacy event adapter and legacy snapshot converter (all 5 example snapshots and 12 real run logs round-trip byte-equal) | `docs/design/mechanic-api.md` |
| 3.0 | 12 core fixes from the challenger review, 19 empty `mechanics/*` packages, frozen `mechanics/shared` | `docs/design/core-review-2c.md` |
| 3 | Four teams carved the mechanics; challengers found many divergences | `docs/design/challenge-wave3.md` |
| 3.5 | Integrator decided every request, explicit hook/listener order table, strict golden gates with self-test | `docs/design/carve-decisions.md`, `mechanics/shared/src/order.ts` |
| 3.6 | Round 2: T1 (names, ledger, marks, receipts, whispers) complete with differential tests; T3 (puzzles, progression, goals) mostly; T4a (exile, tribunal) and T4b (seal, standoff-tribunal, standoff) carved; T2 (channels, petitions, cast, motives) production code and, in the proof pass, strict golden gates, differential tests and legacy resume tests | `docs/design/carve-round2-T*.md`, `docs/design/carve-requests-round2-*.md` |
| 3.7 | Round-2 challengers (T1, T3, T4a, T4b); integrator's second pass: absent slices, `ctx.roles`, fact queries, old argument handling and `TOOL_LOCKED` text, lock-aware `access.open`/`isOpen`, `runResumed`, listener-mode check, ledger `open`/`has`/`idempotencyKey`, `PuzzlesApi.secrets`, shared `StandoffTribunalApi.taskLine`, `defy` owned by channels, converter copies, mutation helper | `docs/design/carve-decisions.md` (round 2), `docs/design/carve-round3-*.md`, `docs/design/challenge-round2.md` |

## Open, in this order

1. **Fix round 3** for T1, T3, T4a and T4b, from the round-2 challengers (`docs/design/challenge-round2.md`) and the
   integrator's round-2 decisions (`docs/design/carve-decisions.md`, R2-D1 to R2-D24). The briefs are
   `docs/design/carve-round3-{T1,T3,T4a,T4b}.md`. Each gate is a mutant list run with `pnpm mutants` (testkit
   `runMutants`): every mutant listed by the review must be killed. T2 picks up its R2 items (resume `defy` lock,
   `quoteDms` and DM text, `CastApi.active`, resume escrow and motives in `runResumed`, `NotesApi` on
   `PuzzlesApi.secrets`, `channels:runStarted` order slot, grant `resolvePetition` to the script). T2's proof pass
   (strict gates, differential and resume tests) is done; its open requests are in `docs/design/carve-requests-round2-T2.md`.
2. **Round 3 challengers** for the same teams, re-running the mutant lists first.
3. **Story option mapping** (R2-D17) when step 18 composes the stories.
4. **Step 18: replace `world.ts`** with the turn loop (`legacyTurns`), the script mechanic and the arena; delete
   `packages/engine` game code; golden comparison over all runs; story prompt overrides become possible there
   (`pnpm validate` refuses them until then); wire `defiance` and `direction` in the CLI.
   **Decision point (core motive rename, `docs/design/rename-core-motive.md`):** until here the new core writes the legacy
   names through the adapter (event `core_dealt`, snapshot key `cores`, the pinned gamemaker strings that still say "core").
   At step 18 the event becomes `motive_dealt`, the snapshot key gets a migration, the pinned strings are reworded, and the golden
   files are updated once, deliberately, with the documented reason "core becomes core motive".
5. **Wave 4:** `swt` commands (noun-verb, Ink TUI, `watch`), story schema and YAML loader, expression language,
   sandbox spike, VS Code extension; first npm publish needs Flo's go; `library/` copy at publish; curated public API
   instead of `export *` barrels; `max-lines` ratchet; reduce lint memory (typed linting over 30+ packages).
6. **Docs:** README and `docs/` for the new structure; change CLAUDE.md "never YAML" only in the PR that ships YAML.

## Notes for whoever continues

- Models by role (Flo): Opus for core design, hard mechanics and every challenger; Sonnet for mechanical carving.
- Open naming question for Flo: `defineMechanic` is a working name ("Mechanic" for game rules, "plugin" for the
  npm package).
- Do not run `pnpm lab:*` scripts to test `--help`: they ignore it and spend money.
- One PR at the end: say in its body that CI did not run (Actions disabled), squash-merge after `pnpm check`.
- Whispers runs 005-007 as further golden runs are planned but not built.
