# Act II runs of cityofkeys

Every run in this series starts from a recorded Act I, so its runs differ only in the Act II code
and the models. v01-v04 start from [`../cityofkeys-act1-06a-01/`](../cityofkeys-act1-06a-01/)
(recorded with the old turn scheduler); from v05 on every run starts from
[`../cityofkeys-act1-06a-02/`](../cityofkeys-act1-06a-02/), recorded with the pass scheduler
and the v05 rules. v08-v11 are the four v09 tests (residents Haiku or GLM, gamemaker DeepSeek or
Sonnet) and start from [`../nexus-act1-06a-03/`](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act1-06a-03), recorded with names and
cores. v12 starts from [`../cityofkeys-act1-06a-04/`](../cityofkeys-act1-06a-04/), recorded with the first cast of finished figures. Compare runs across the bases with care. The folder numbers count runs, not code versions. Each version is one folder: `vNN-<short-name>/` with a
`README.md` (code version, command, models, result, digest highlights, problems, proposals) and
the full `run/` directory.

| Version | Date | Code | Change tested | Finished L10 | Survivors | Cost (this run) |
|---|---|---|---|---|---|---|
| [v01](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v01-feast-on-l10) | 2026-10-27 | PR #10 (`b6e17fd`) | feast on level 10, table cleared after 12 minutes | 4 of 6 | A02, A03 | 0.247 USD |
| [v02](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v02-no-memo-codes) | 2026-10-27 | PR #12 (`fed175b`) | no codes in memos, named certificate needs, holder notices, early end once seats are decided | 0 of 6 (only A05 passed level 8) | A05, A02 | 0.214 USD |
| [v03](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v03-tribunal) | 2026-10-28 | PR #16 (`f2aac52`) | exile by tribunal, numbered messages, DM receipts and blame, Act II marks, a feast factor per team | 2 of 6 | A04, A06 | 0.343 USD |
| [v04](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v04-passes) | 2026-10-28 | PR #19 (`8845aca`) | 3 passes per minute, ransom from the city's median | 0 of 6 | A02, A03 | 0.488 USD |
| [v05](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v05-receipts) | 2026-10-28 | swarmtales PR #2 (`3b6b927`); **new Act I base** | help-your-holder hint, DM receipts with `showReceipt(id, to?)`, bequests capped at half, ransom a third / a half of the median | 4 of 6 | A05, A02 | 0.471 USD |
| [v06](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v06-factions) | 2026-10-28 | swarmtales PR #4 (`0445b36`) | first tribunal on progress, gamemaker pacing toward half exiled, faction draft with bloc bonus, marks 1 per 3 minutes, bequests 10% per heir | 6 of 6 (run ended at minute 27 with the tribunal target unmet, P30) | A03, A04 | 0.314 USD |
| [v07](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v07-target-end) | 2026-10-28 | swarmtales PR #5 (`ae2a537`) | v06 plus the act ending at the tribunal target | 5 of 6 (target reached at minute 45: A01, A05, A03 exiled) | A02, A04 | 0.611 USD |
| [v08](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v08-haiku-deepseek) | 2026-10-29 | swarmtales PR #12 (`0afe7f6`); **new Act I base** | v09 drama (graduated penalties, director, cores, secret goals, black seal); Haiku residents, DeepSeek director | 6 of 6 (target at minute 54; seal unsold) | Aurelio, quiet-fern | 0.657 USD |
| [v09](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v09-glm-deepseek) | 2026-10-29 | as v08 | GLM residents, DeepSeek director | 4 of 6 (target at minute 45; Juniper's seal struck Rook) | Aurelio, Mercer | 1.432 USD |
| [v10](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v10-haiku-sonnet) | 2026-10-29 | as v08 | Haiku residents, Sonnet director | 6 of 6 (target at minute 55; seal unsold) | Aurelio, Juniper | 1.339 USD |
| [v11](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v11-glm-sonnet) | 2026-10-29 | as v08 | GLM residents, Sonnet director | 2 of 6 (target at minute 51; Juniper's seal struck Rook) | quiet-fern, Aurelio | 1.994 USD |
| [v12](https://github.com/florianpirchner/swarmtales/tree/d13350b5b6df4a5a9b6587fd8173ab6048f26a00/examples/nexus-act2-06a/v12-cast) | 2026-10-29 | swarmtales PR #17 (`646abb8`); **new Act I base** | the first cast (six figures for tension) and the fiction frame; Haiku residents, DeepSeek director | 1 of 6 (target at minute 52; Herald's seal struck Mercer, the first Haiku bids) | Registrar, Brassard | 0.759 USD |

## The v09 tests (v08-v11): which models?

Same Act I, same cores and secret goals, four model pairs.

| | DeepSeek director | Sonnet director |
|---|---|---|
| **Haiku residents** | v08: 0.66 USD; all doors open by minute 12, no seal bid, 2 of 6 goals; director wrote 81 notes | v10: 1.34 USD; four tribunals, two residents ransomed, no seal bid, 3 of 6 goals; director only planned (0 notes) |
| **GLM residents** | v09: 1.43 USD; Juniper bought the seal and struck Rook (her goal) at minute 16, the first paid vote, 9 wrong codes | v11: 1.99 USD; Juniper struck Rook again, four residents stuck on their own sums, 14 wrong codes; director silent |

Rook (melancholy above all) was exiled in all four runs, and Aurelio (narcissism above all) took a
seat in all four. GLM residents act on their goals and take risks (bids, threats, deals) but cannot
add six-digit numbers reliably (P39); Haiku is careful and never bids (P41). DeepSeek directs with
many private notes; Sonnet plans tribunals and otherwise stays silent (P40). See
[`docs/LESSONS.md`](../../docs/LESSONS.md) P38-P42.

## Adding a run

```bash
pnpm start --resume examples/cityofkeys-act1-06a-03/snapshot-L7.json --provider anthropic
```

Copy the new `runs/run-NNN/` to `vNN-<short-name>/run/`, write its `README.md` in the same shape
as v01, and add a row to the table above. Replace local absolute paths in the run files with
repository paths.
