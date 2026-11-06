# lanterns-06a-003-stopped

The first attempt of the eight runs in [lanterns-06a-004-conventions](../lanterns-06a-004-conventions/)
(same story code, seeds 41, 43, 47 and 53, brain and no-brain arm, 6 Haiku residents via Anthropic,
2026-11-06). A container restart stopped all eight after 2 of 4 games; the runs were started again from
scratch as 004. Cost about 0.33 USD. Folders: `brain-s41/` ... `nobrain-s53/` with the event logs as they
stood; no `usage.json` and no reporter draft (the runs never ended).

**What the 16 games show.** 145 clues, mean number 1.16-1.95 per run, the brain runs lower (1.16-1.75) than
the no-brain runs (1.84-1.95), as in 004.

| Run | Clues | Mean number | Game 1 (amber:teal) | Game 2 (amber:teal) |
|---|---:|---:|---|---|
| brain-s41 | 15 | 1.53 | 4:11 | 5:11 |
| brain-s43 | 17 | 1.35 | 11:2 | 5:6 |
| brain-s47 | 19 | 1.16 | 10:3 | 5:5 |
| brain-s53 | 16 | 1.75 | 8:12 | 4:9 |
| nobrain-s41 | 19 | 1.95 | 3:11 | 0:6 |
| nobrain-s43 | 19 | 1.84 | 8:5 | 11:5 |
| nobrain-s47 | 20 | 1.85 | 8:3 | 7:7 |
| nobrain-s53 | 20 | 1.90 | 11:7 | 7:5 |

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| (none new) | A container restart stops a running match; there is no resume for core stories mid-match. | open: runs are short, so a restart from scratch is cheap |
