# The release smoke of M6 (M6-25, runs 2 and 3 of the rerun plan of M6)

Both runs played from an outside project `$PROJ`, installed from the packed release candidate at code commit
`5e49fb937856fb6b71098aa52db5fe2d40388dd0` (`rewrite/develop`, M6-08) as the packed-install gate does it; how, and
the deviations from `docs/RERUN-PLAN-M6.md`, are in `hello-game-001/README.md`. Node v22.23.4, runtime revision 8,
every call to `claude-haiku-5-5` via Anthropic, by `games/m6-ledger.jsonl` (M6 cap 2.34 USD).

| Run | File or folder | Cost (USD) | Cap | Result |
|---:|---|---:|---:|---|
| 2 | `doctor-online.json` | 0.0000021 | 0.01 | `swt doctor --online --provider anthropic`: nine `ok`, no `warn`, no `fail`; the estimate (0.0000069) printed before the request; Haiku answered in 529 ms with 16 input and 1 output tokens |
| 3 | `hello-game-001/` | 0.0019 | 0.03 | the Hello Game, seed 1: tick limit (12), 8 of 9 moves, tally 0, 0, 0 (P445); verifies, replays equal |

## Run 2: `swt doctor --online`

Command, in `$PROJ`: `swt doctor --online --provider anthropic --budget 0.01 --ledger "$REPO/games/m6-ledger.jsonl"
--json > $RUNS/hello/release/doctor-online.json`, exit code 0, nothing on the error output. Run 2 leaves no run
folder: its `--json` line (this folder's `doctor-online.json`) and its ledger lines `doctor/online` (a reservation of
0.01 and the cost 0.0000021) are its record.

What run 2 must show: one minimal request answered, its estimate printed before it, its cost in the ledger. It does,
in order: the seven offline checks (`node` v22.23.4 against the `engines` `>=22.19` of the installed `swarmtales`;
this `swt` is `@swarmtales/cli` 1.0.0; the platform line 4 packages at 1.0.0 and the plugins line 1 package at 0.1.0,
both in step; a key for Anthropic and one for OpenRouter, each named by its variable only; no `SWT_PROVIDER` or
`SWT_MODEL`), then `online anthropic` with the estimate, then `online anthropic` with the answer. The model is
`anthropic/claude-haiku-5-5`, the alias the plan names. The estimate (0.0000069 USD) is three times the cost
(0.0000021): the request had 16 input tokens, the estimate counts 64 (`docs/reference/cli.md`), which is the safe side.

Loopholes: none (no game). Problems: none new. The offline `swt doctor` before it gave the same seven `ok` lines.
