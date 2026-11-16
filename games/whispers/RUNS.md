# Runs of Whispers

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run
(A52, `docs/RERUN-PLAN-M5.md`): the residents `anthropic/claude-haiku-5-5`, thinking low, output cap 4000; the
gamemaker by `--director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000`; the Confessor, the guard and the
judge Haiku with thinking off, as the game file says; pricing `pi-ai@1.4.0`. The spend ledger of M5 is
[`../m5-ledger.jsonl`](../m5-ledger.jsonl).

| Run | Path on `data/runs` | Data commit | Code commit | Runtime | Cost (USD) | Result |
|---|---|---|---|---:|---:|---|
| Live smoke of M5 (issue M5-53, run 1 of the plan), the default game `whispers`, seed 11, 45 ticks | `whispers/smoke/whispers-001` | pending (the integrator's push) | `bd0ee26a` | 6 | 0.9517 of the cap 1.00 | ended at the tick limit (45), exit 0; all six through door 6, Maren (A04) alone through door 7: A04 110, A03 105, A01 80, A02 80, A06 80, A05 70 (`arena.run_end`); 3 holdout tribunals called and dropped; the whisperer Sable (A06) spread rumours, no forgery |

Run 2 of the plan (`whispers-rumours`, `--set receipts=false`) is not played: run 1 cost 1.9 times its expected
0.50, over the issue's stop line of 1.5 times (P479), and its manifest names a model for `script` where the plan says
none (P483). Both go to the integrator.

The folder verifies with `swt log verify` (9211 lines), replays equal with `swt replay --game` (9211 lines), is clean
under `swt scan` (keys of 2 providers held) and holds a `REPORT.md` written with `--game`. Loopholes: none new.
Problems: P479 to P485 in `docs/LESSONS-LEARNED.md`; LH10, P66 and P69 updated.
