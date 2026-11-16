# check-0: the first City Act II check resume (M5-55, run 4 of the rerun plan, `--ticks 6`)

| Item | Value |
|---|---|
| Game | `games/city/game.ts`, the base's params and seed 7 (taken from the base), purpose `smoke` (the default) |
| Base | `city/base/city-001` (`data/runs`), snapshot `snapshots/t8.json`, `snapshotHash` `eec0f6f8b62b59a92e5a6c1ae43d08a10c5ec1a0bbe292340be0cf815338b1ce` |
| Command | `swt resume $RUNS/city/base/city-001 --game games/city/game.ts --ticks 6 --provider anthropic --model claude-haiku-5-5 --thinking medium --director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000 --budget 0.40 --ledger games/m5-ledger.jsonl --out $RUNS/city/act2/check`, the plan's row 4 with no flag more |
| Models | residents `anthropic/claude-haiku-5-5`, thinking medium, output cap 4000; gamemaker Haiku, medium, 16000; Confessor and judge Haiku, off, 4000; `script` no model; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `87481748c35ca8e8ce1a0bb71a97da3fdfc557c0`, runtime revision 7, not dirty |
| Game hash | `9418a743ae8e7c820ac3c323f0e3c620312af006d84ffed09952244fa0cfa1ad`, the base's |
| Cost | 0.0000 USD of the cap 0.40: no request was sent |
| End | "stopped after 8 ticks (open)", exit 3; no tick was played; 2017 lines (the base's 2016 and `run_resumed`, #2017) |
| Checks | `swt log verify --previous <base>`: "unfinished", 2017 lines, head `31a1d795a8ee8ec1ff9331491d5242abc6618d025d6e0ed1d2980cb4c0a24be3`, continuity holds (exit 3); `swt replay --game --previous <base>`: equal, 2017 lines; `swt scan`: clean, 6 files, keys of 2 providers held; a grep for key patterns and absolute local paths: none. No `REPORT.md`: `swt report` refuses an unfinished run (`SWT-E006`, P488) |

## What happened

Nothing was played. `--ticks <n>` of `swt resume` counts the finished ticks of the whole run, the base's ticks
included ("stop after this many finished ticks", `docs/reference/cli.md`), not the ticks from the resume. The base
has 8 finished ticks, so `--ticks 6` was already reached when the run resumed: the CLI wrote `run_resumed`
(`{ from: "city-001", snapshotHash: "eec0f6f8...", tick: 8 }`, with no field `replaced`, as the plan asks) and
stopped open at once. The ledger reserved 0.40 and closed the line at 0 (`smoke/city-001`, `base: "city-001"`).

What the check shows: the base resumes under the current code (the game hash holds, the snapshot loads, the manifest
names the base with `resumedFrom`, the models of the command line replace none of the base's), and the folder
verifies, replays and scans clean. What it does not show: a live tick from the resumed sessions, the purpose of the
check. Run 5a was therefore not played; the integrator decides whether run 4 is played again with `--ticks 14`
(the base's 8 and 6 more), which is a change of the plan's command.

## Loopholes

None (no play).

## Problems

| Row | What | Solution |
|---|---|---|
| P490 | `swt resume --ticks n` counts the base's ticks; with `n` at or below them it plays nothing and exits 3 without a warning; the plan's row 4 (`--ticks 6`, "6 ticks from the base") played no tick | proposal: the plan's row 4 with `--ticks 14`; and a warning or refusal of the CLI when `--ticks` is not above the snapshot's tick; open |
| P488 | the check resume has no report either (`SWT-E006`) | open |
