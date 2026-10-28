# Act II runs of nexus

Every run in this series starts from a recorded Act I, so its runs differ only in the Act II code
and the models. v01-v04 start from [`../nexus-act1-06a-01/`](../nexus-act1-06a-01/)
(recorded with the old turn scheduler); from v05 on every run starts from
[`../nexus-act1-06a-02/`](../nexus-act1-06a-02/), recorded with the pass scheduler
and the v05 rules. Compare runs across the two bases with care. Each version is one folder: `vNN-<short-name>/` with a
`README.md` (code version, command, models, result, digest highlights, problems, proposals) and
the full `run/` directory.

| Version | Date | Code | Change tested | Finished L10 | Survivors | Cost (this run) |
|---|---|---|---|---|---|---|
| [v01](v01-feast-on-l10/) | 2026-10-27 | PR #10 (`b6e17fd`) | feast on level 10, table cleared after 12 minutes | 4 of 6 | A02, A03 | 0.247 USD |
| [v02](v02-no-memo-codes/) | 2026-10-27 | PR #12 (`fed175b`) | no codes in memos, named certificate needs, holder notices, early end once seats are decided | 0 of 6 (only A05 passed level 8) | A05, A02 | 0.214 USD |
| [v03](v03-tribunal/) | 2026-10-28 | PR #16 (`f2aac52`) | exile by tribunal, numbered messages, DM receipts and blame, Act II marks, a feast factor per team | 2 of 6 | A04, A06 | 0.343 USD |
| [v04](v04-passes/) | 2026-10-28 | PR #19 (`8845aca`) | 3 passes per minute, ransom from the city's median | 0 of 6 | A02, A03 | 0.488 USD |
| [v05](v05-receipts/) | 2026-10-28 | swarmtales PR #2 (`3b6b927`); **new Act I base** | help-your-holder hint, DM receipts with `showReceipt(id, to?)`, bequests capped at half, ransom a third / a half of the median | 4 of 6 | A05, A02 | 0.471 USD |
| [v06](v06-factions/) | 2026-10-28 | swarmtales PR #4 (`0445b36`) | first tribunal on progress, game-master pacing toward half exiled, faction draft with bloc bonus, marks 1 per 3 minutes, bequests 10% per heir | 6 of 6 (run ended at minute 27 with the tribunal target unmet, P30) | A03, A04 | 0.314 USD |
| [v07](v07-target-end/) | 2026-10-28 | swarmtales PR #5 (`ae2a537`) | v06 plus the act ending at the tribunal target | 5 of 6 (target reached at minute 45: A01, A05, A03 exiled) | A02, A04 | 0.611 USD |

## Adding a run

```bash
pnpm start --resume examples/nexus-act1-06a-02/snapshot-L7.json --provider anthropic
```

Copy the new `runs/run-NNN/` to `vNN-<short-name>/run/`, write its `README.md` in the same shape
as v01, and add a row to the table above. Replace local absolute paths in the run files with
repository paths.
