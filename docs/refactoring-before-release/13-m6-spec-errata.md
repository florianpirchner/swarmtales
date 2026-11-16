# Errata of the M6 specification (kept by the integrator)

Corrections to [`13-m6-spec.md`](13-m6-spec.md) found while building: every difference between the specification
and the code that a builder or the integrator of M6 reports. The code on `rewrite/develop` follows this file where
the two differ. Decisions of principle are in `DECISIONS.md` section 9. Started by issue M6-00, as the specification
asks of the first builder who finds a difference. The letter K follows J of M5. A builder writes a row as `K?`; the
integrator numbers the rows without a gap when it merges them.

## Differences

| No | Where | The specification says | What holds | Found in |
|---|---|---|---|---|
| K1 | 13, row 00 ("their layer rows"); 3.1 ("class `L6` in the layer table") | the three sample packages get layer rows | A sample has no row of its own: the layer table (`scripts/layers/table.ts`) holds rows for `packages/*` only (`CLAUDE.md`, "Packages"), and every package under `samples/` takes the folder rule `samples` (`FOLDER_RULES`, layer `L6`, may import anything). The stubs declare `"swarmtales": { "layer": "L6" }` in their `package.json`, as `samples/own-*` do; `docs/LAYERS.md` already names `samples/*` in layer 6. Neither file changes | M6-00 |
| K2 | 13, row 00 (`pnpm-workspace.yaml` in the allowed paths) | the stubs get their workspace entries | `pnpm-workspace.yaml` already holds the glob `samples/*` (and the workspace gate checks that it equals the folders of the layer table), so it does not change; the lockfile gets one importer entry per stub | M6-00 |
| K3 | 13, row 00 ("`games/m6-ledger.jsonl` with its cap line"); 10.2 ("**M6 cap** 3.00") | the cap of A125, 3.00 USD | A137 corrects the cap to 2.34 USD (the four runs' caps, 1.34, and the reserve, 1.00); the ledger's first line is `{"capUsd":2.34}`, and 10.2's cap row reads 2.34 where it says 3.00 | M6-00 |
| K4 | 13.1, first row; 13 ("31 issues"); 14 (waves) | "M6: specified in `13-m6-spec.md` (31 issues, A118)."; 31 issues in nine waves | A136 adds issue M6-31 (the Node line) in wave 1: 32 issues. Issue 00 wrote the row 31 into the table of 13, the issue 31 into wave 1 of 14, the sequence "31, then 07" for the `package.json` files and `tsdown.base.ts`, and the sentence of `REWRITE.md` as "(31 issues, A118; 32 with M6-31, the Node line, added by A136)". The cut line of 40 and the stop line of 62 (A118) are unchanged | M6-00 |
| K5 | A136 (the paths of M6-31) | `package.json` files, `.node-version`, `tsdown.base.ts`, `docs/`, the errata | The README states the Node line too: `README.md` line 96, "Node 26.13 or newer (the one source is `.node-version`)", and `README.md` is not under `docs/`. Row 31 adds `README.md` (its Node line only) to the paths, so the README does not promise a line that `engines` no longer names until M6-22 rewrites it | M6-00 |
