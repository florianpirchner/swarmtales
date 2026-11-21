# hello-game-001: the release smoke, the Hello Game from the packed install (M6-25, run 3 of the rerun plan of M6)

| Item | Value |
|---|---|
| Game | `game.ts`, a copy of `games/hello/game.ts` at the code commit (two residents `ada` and `bob`, `grid` with one game, 12 ticks), seed 1, purpose `smoke` |
| Where it ran | an outside project `$PROJ` (a temporary folder outside the work tree), installed from the packed release candidate, not from the clone; every command through `node_modules/.bin/swt` of the installed `swarmtales`, without `--conditions development`, so the built `dist` ran |
| The install | the form of the packed-install gate of M6-08 (`scripts/gates/packed-install.test.ts`, errata K48): `pnpm build`, then `pnpm -r --filter <each package> pack` of the closure of `swarmtales` and `@swarmtales/mechanic-grid` (16 tarballs: the umbrella, `cli`, `contracts`, `kernel`, `sdk`, `engine`, `chain`, `prompts`, `runlog`, `testkit`, `models`, `lab`, `mechanic-contracts`, `mechanic-consensus`, `mechanic-team-channel` at 1.0.0, `mechanic-grid` at 0.1.0); a `package.json` of `"type": "module"` with the two dependencies of the README's install line (`pnpm add swarmtales @swarmtales/mechanic-grid`, M6-22) and `pnpm.overrides` that map every packed package to its tarball; its `pnpm-lock.yaml` written from the workspace's by `scripts/gates/fixtures/outside/lockfile.ts`; `pnpm install --frozen-lockfile --offline --ignore-scripts` with the workspace's store and an empty cache |
| Command | `swt run game.ts --seed 1 --provider anthropic --model claude-haiku-5-5 --budget 0.03 --ledger "$REPO/games/m6-ledger.jsonl" --out $RUNS/hello/release` (`$REPO` the work tree at the code commit, `$RUNS` a folder outside it) |
| Models | `ada` and `bob` `anthropic/claude-haiku-5-5` (requested and resolved), thinking medium, output cap 4000; no Director; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `5e49fb937856fb6b71098aa52db5fe2d40388dd0` (`rewrite/develop`, M6-08), clean tree; runtime revision 8, `kernel.version` 1.0.0, Node v22.23.4. The manifest has no `kernel.commit` and no `kernel.dirty`: the installed CLI is in no git checkout, so neither is known (`apps/cli/src/tree.ts`); see P502 |
| Before the run | `swt doctor` (offline) in `$PROJ`: seven `ok`, no `fail` (`node`: v22.23.4 against the `engines` `>=22.19` of the installed `swarmtales`; the platform line 4 packages at 1.0.0, the plugins line 1 package at 0.1.0); run 2 (`doctor-online.json` beside this folder); then the fake run of the plan: `swt run game.ts --fake --seed 1 --out $PROJ/fake` ended after 6 ticks with `grid.tally` X 1, O 0, draw 0 (the README's outcome), `swt log verify` ok (90 lines), `swt replay --game game.ts` equal (90 lines) |
| Game and texts | game hash `6fd90368...` (the M4 runs have `135ac2a9...`: the rename of M6-06 changed the mechanic's id `grid-game` to `grid`, 4.3) |
| Cost | 0.0019 USD of the cap 0.03, expected 0.002 (17 requests; 66 input, 2210 output, 20203 cache-read, 4704 cache-written tokens); the ledger lines `smoke/hello-game-001` in `games/m6-ledger.jsonl` |
| End | tick limit after 12 ticks (`run_ended` `ticks`, #184), exit code 0; 184 lines; 20 s of wall time |
| Result | `grid.tally` X 0, O 0, draw 0: 8 of the 9 moves were played when the tick limit came (P445) |
| Checks | `swt log verify`: ok, 184 lines; `swt replay --game game.ts`: equal, 184 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `swt report --game game.ts`, all from `$PROJ` with the installed `swt` |
| Deviations | from `docs/RERUN-PLAN-M6.md`: the project depends on `swarmtales` and `@swarmtales/mechanic-grid` only, as the README of M6-22 writes it, not also on `@swarmtales/sdk` as the plan writes it (the Hello Game imports `swarmtales` and the mechanic, nothing else); it was installed with the outside lockfile of the gate and `--frozen-lockfile`, not by `pnpm install --offline --ignore-scripts` alone (which fails, `ERR_PNPM_NO_OFFLINE_META`, K48), as the plan allows. The pack was of 16 tarballs, not the 28 of the plan's rehearsal, which packed the closure with the City's frame |

## What happened

The game played exactly as its live smokes of M2 and M4: the same eight moves in the same order, cells 4, 0, 8, 2, 1,
7, 3, 5 (`move_played` #23 to #172; `hello/smoke/hello-game-001` of M4 has the same list). Each resident spent one
activation on `viewBoard` and the next on `playMove`, so the 12 ticks held 8 moves; the ninth, X at cell 6, would have
ended the game in a draw. All 17 requests ended with a tool call (no activation without a call, no refusal, no failed
request). The residents' thinking reads the board right every time, for example bob at tick 8: "X has 1 and 4 with 7
empty, so 7 completes a line and I need to block it" (#126), and at tick 11 he blocks 3-4-5 (#169).

What run 3 must show: the built `dist` plays against the real provider (6.1). It does: the run was played, verified,
replayed and reported by the installed `swt` alone, and its cost reached the ledger. No winner was needed (P445).

Read for this review: the whole log (184 lines), every `thinking`, `response`, `tool_called` and `tool_result`.

## Loopholes

None. The Hello Game gives each resident two tools on one board; nothing was refused and nothing was tried around the
rules.

## Problems

| Row | What | Solution |
|---|---|---|
| P445 | the tick limit (12) holds 8 of the 9 moves live; the first live run a reader makes shows the tally 0, 0, 0. Seen a third time, with the same moves | open; the owner's go (11.2, row 4): 20 ticks, or the board in the turn input |
| P502 | the installed CLI asks git about the folder it is installed in (`readSourceTree`, `apps/cli/src/tree.ts`, the CLI's package folder). Here `$PROJ` is in no git checkout, so the manifest names no commit. In a project that is a git repository (the common case) git answers for the project: shown offline with the installed `@swarmtales/cli` of this run in a copy of `$PROJ` made a git repository, `readSourceTree()` returned the project's commit and `dirty: true`. A live run there would record the user's commit as `kernel.commit`, and a confirmatory run would be refused or let through by the user's tree | open; proposal: ask git only when the CLI's folder is inside a clone of the platform (a `package.json` named `swarmtales-workspace` above it, as `swt doctor` does, K15), else leave both fields absent |
| P503 | every plugin of the manifest has `version` `0.0.0` (`grid` of `@swarmtales/mechanic-grid` 0.1.0, `roster` of `@swarmtales/sdk` 1.0.0), in the clone too (the M6 runs 1 and 4): the CLI passes no versions to `resolveGame` (`packages/sdk/src/game/resolve.ts`, `NO_VERSION`) | open; proposal: the CLI passes the version of each installed mechanic package |
