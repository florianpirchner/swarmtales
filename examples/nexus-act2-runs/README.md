# Act II runs of nexus

Every run in this series starts from the same recorded Act I,
[`../nexus-seed7-haiku-act1/snapshot-L7.json`](../nexus-seed7-haiku-act1/), so its runs differ only
in the Act II code and the models. Each version is one folder: `vNN-<short-name>/` with a
`README.md` (code version, command, models, result, digest highlights, problems, proposals) and
the full `run/` directory.

| Version | Date | Code | Change tested | Finished L10 | Survivors | Cost (this run) |
|---|---|---|---|---|---|---|
| [v01](v01-feast-on-l10/) | 2026-10-27 | PR #10 (`b6e17fd`) | feast on level 10, table cleared after 12 minutes | 4 of 6 | A02, A03 | 0.247 USD |
| [v02](v02-no-memo-codes/) | 2026-10-27 | PR #12 (`fed175b`) | no codes in memos, named certificate needs, holder notices, early end once seats are decided | 0 of 6 (only A05 passed level 8) | A05, A02 | 0.214 USD |
| [v03](v03-tribunal/) | 2026-10-28 | PR #16 (`f2aac52`) | exile by tribunal, numbered messages, DM receipts and blame, Act II marks, a feast factor per team | 2 of 6 | A04, A06 | 0.343 USD |
| [v04](v04-passes/) | 2026-10-28 | PR #19 (`8845aca`) | 3 passes per minute, ransom from the city's median | 0 of 6 | A02, A03 | 0.488 USD |

## Adding a run

```bash
pnpm start --resume examples/nexus-seed7-haiku-act1/snapshot-L7.json --provider anthropic
```

Copy the new `runs/run-NNN/` to `vNN-<short-name>/run/`, write its `README.md` in the same shape
as v01, and add a row to the table above. Replace local absolute paths in the run files with
repository paths.
