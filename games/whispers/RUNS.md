# Runs of Whispers

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run
(A52, `docs/RERUN-PLAN-M5.md`, `docs/RERUN-PLAN-M6.md`): the residents `anthropic/claude-haiku-5-5`, thinking low, output cap 4000; the
gamemaker by `--director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000`; the Confessor, the guard and the
judge Haiku with thinking off, as the game file says; pricing `pi-ai@1.4.0`. The spend ledger of M5 is
[`../m5-ledger.jsonl`](../m5-ledger.jsonl), that of M6 [`../m6-ledger.jsonl`](../m6-ledger.jsonl).

| Run | Path on `data/runs` | Data commit | Code commit | Runtime | Cost (USD) | Result |
|---|---|---|---|---:|---:|---|
| Live smoke of M5 (issue M5-53, run 1 of the plan), the default game `whispers`, seed 11, 45 ticks | `whispers/smoke/whispers-001` | `bbddcbf6` on `data/runs` | `bd0ee26a`, dirty tree (`kernel.dirty: true`, P494) | 6 | 0.9517 of the cap 1.00 | ended at the tick limit (45), exit 0; all six through door 6, Maren (A04) alone through door 7: A04 110, A03 105, A01 80, A02 80, A06 80, A05 70 (`arena.run_end`); 3 holdout tribunals called and dropped; the whisperer Sable (A06) spread rumours, no forgery |
| Live smoke of M5 (issue M5-53, run 2 of the plan), the variant `whispers-rumours` (`--set receipts=false`), seed 11, 45 ticks | `whispers/smoke/whispers-001-r7` | `5a57772d` on `data/runs` | `578e65df` | 7 | 0.2145 of the cap 1.00 | ended at the tick limit (45), exit 0; all six through door 7 at minute 36: A02 120, A05 100, A01 95, A03 90, A04 90, A06 80 (`arena.run_end`); no holdout tribunal; the whisperer Hesper (A06) spread rumours and held one fragment back from Wren for a minute |
| Live check of B2 (issue M6-26, run 4 of the M6 plan), the default game `whispers`, seed 11, 45 ticks | `whispers/smoke/whispers-001-r8` | `36c6b886` on `data/runs` | `8714c7d3`, clean tree (`kernel.dirty: false`) | 8 | 0.2264 of the cap 1.00 | ended at the tick limit (45), exit 0; the guard answered 24 of 24 reviews by its tool `verdict`, none unreadable; the city stalled at door 1: A01, A03, A04 through by minute 2, A02, A05, A06 held all six pieces from minute 3 and never submitted; A04 50, A01 25, A03 25 (level 2), A02 20, A05 10, A06 10 (level 1) (`arena.run_end`); no holdout tribunal |

Run 1 cost 1.9 times its expected
0.50, over the issue's stop line of 1.5 times (P479), and its manifest names a model for `script` where the plan says
none (P483). Both went to the integrator (A100); run 2 was played after M5-88 and M5-89 (runtime r7).

Run 1 was played on a dirty tree: its manifest has `kernel.dirty: true`, so the code commit of its row is not the whole
code of the run, and what was uncommitted is not known (P494). Run 1's folder verifies with `swt log verify` (9211 lines), replays equal with `swt replay --game` (9211 lines), is clean
under `swt scan` (keys of 2 providers held) and holds a `REPORT.md` written with `--game`. Loopholes: none new.
Problems: P479 to P485 in `docs/LESSONS-LEARNED.md`; LH10, P66 and P69 updated.

Run 2's folder verifies with `swt log verify` (6171 lines), replays equal with `swt replay --game` (6171 lines), is clean under `swt scan` (keys of 2 providers held) and holds a `REPORT.md` written with `--game`; its manifest matches the plan's table of the models. The CLI numbered it `whispers-001` like run 1 (the run id in its manifest and the ledger name `smoke/whispers-001`); the folder was renamed `whispers-001-r7` before it goes to `data/runs`. Loopholes: none new. Problems: P486 new; P480, P481, P482 and LH10 updated.

Run 3 (M6-26) is B2's live check under runtime revision 8: all 24 `request` records of the guard carry
`tools: ["verdict"]`, every answer is a call of the tool and is read (`ok: true`); 0 unreadable, against 16 of 47 in run
1 (r6) and 2 of 19 in run 2 (r7). It plays the game hash and the texts of run 1, but the city stalled at door 1: three
residents held every door-1 piece and never submitted, treating received pieces as claims (P499), while the
gamemaker demanded fragments that had been sent (P500). Its folder verifies with `swt log verify` (5744 lines),
replays equal with `swt replay --game` (5744 lines), is clean under `swt scan` (keys of 2 providers held) and holds a
`REPORT.md` written with `--game`; its manifest matches the plan's table of the models. The CLI numbered it
`whispers-001`; the folder was renamed `whispers-001-r8` before it goes to `data/runs`. Loopholes: none new (LH21 seen
in a related form). Problems: P499 and P500 new; P480 closed; P7 and P495 seen again.
