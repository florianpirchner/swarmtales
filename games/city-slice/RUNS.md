# Runs of the city slice

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; each has a `README.md` with its loopholes, problems and solutions. Model of every run: `anthropic/haiku`,
resolved to `claude-haiku-5-5`, thinking medium. The spend ledger of M3 is
[`../m3-ledger.jsonl`](../m3-ledger.jsonl): 0.0114 USD of the cap 1.50.

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M3 (issue M3-30, decision A21), seed 7, `--snapshot-at 6` | `city-slice/smoke/city-slice-001` | `00f05497` | `a4e7ea7d` | 3 | 1 run | none: tick limit (12); 22 tool calls, all `readBoard`; no vote, no decision, the Director asked nothing | 0.0058 |
| Live smoke of M3, seed 11, `--snapshot-at 6`, Human Hand `city-slice-002.hand.jsonl` | `city-slice/smoke/city-slice-002` | `00f05497` | `a4e7ea7d` | 3 | 1 run | none: tick limit (12); as 001; the person's pause, snapshot and resume worked, its amendment was refused with `DECISION_CLOSED` (#342) | 0.0056 |

Both folders verify with `swt log verify`, replay equal (`replay` of `@swarmtales/testkit`) and hold a
`REPORT.md` written with `--game`; the leak scan found no held key value. The smoke did not reach what it was
run for: without a briefing no resident voted, so no decision was proposed and the Director's model port got no
live answer (P450 in [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md)). A third run was not started.
`swt resume` refuses both folders (`SWT-X008`, "live resume is M5"). Loopholes: none seen; the log of
`city-slice-001` was read line by line.
