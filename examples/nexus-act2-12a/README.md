# Act II runs of nexus, 12 residents

Every run in this series starts from [`../nexus-act1-12a-01/`](../nexus-act1-12a-01/), a recorded
Act I with 12 residents and the v08 rules (resident names). The 6-resident series is
[`../nexus-act2-06a/`](../nexus-act2-06a/). Each version is one folder: `vNN-<short-name>/` with a
`README.md` (code version, command, models, result, digest highlights, problems, proposals) and the
full `run/` directory.

| Version | Date | Code | Change tested | Finished L10 | Seats | Cost (this run) |
|---|---|---|---|---|---|---|
| [v01](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-12a/v01-twelve) | 2026-10-28 | swarmtales PR #7 (`7090305`) | v08: accused vote, faction cap, per-act target (a quarter), names, 12 residents | 6 of 12 (target 3 reached at minute 55) | Valorous (A08), Slate-5923 (A04) | 1.310 USD |

## Adding a run

```bash
pnpm start --resume examples/nexus-act1-12a-01/snapshot-L7.json --provider anthropic
```

Copy the new `runs/run-NNN/` to `vNN-<short-name>/run/`, write its `README.md` in the same shape
as v01, and add a row to the table above. Replace local absolute paths in the run files with
repository paths.
