# Run data of Swarm Tales

Recorded live runs (decision A15). Layout: `<game>/<experiment id>/<run>/`, with `experiment.json`, `results.json`,
`values.csv` and the series `README.md` beside the runs; `smoke/` for single runs; `legacy/` for runs of the old
platform. The index is on `develop`: `games/<game>/RUNS.md`; the write-up of the M2 gate is `docs/M2-GATE.md`.
Everything here is under Apache 2.0, like the repository.

## M2 gate (2026-11-14)

Code commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06`, runtime revision 3, model `anthropic/haiku` resolved to
`claude-haiku-5-5`, thinking medium, pricing `pi-ai@1.4.0`. 61 runs, 1.6022 USD by `m2-ledger.jsonl` (cap 4.00).

| Step | Folder | Runs | Cost (USD) | Result |
|---|---|---:|---:|---|
| 1 | `smoke/` | 3 | 0.0478 | no leak, no `error` end, no cap reached |
| 2 | `quarry/quarry-noise-floor/` | 5 | 0.1715 | mean 1088 against 1081 on the old platform: within |
| 2 | `econ-lab/econ-lab-noise-floor/` | 5 | 0.0628 | 3 of 5 tables locked against 4 of 5: within |
| 3 | `quarry/quarry-open-quarries/` | 24 | 0.9099 | +84.5 points (SE 22.0, 95 % interval 36 to 133, n 12 pairs): sign kept |
| 3 | `econ-lab/econ-lab-brain/` | 24 | 0.4101 | -0.771 (SE 0.084, 95 % interval -0.954 to -0.588, 12 runs per arm): sign kept |

No run was excluded or replaced, no request failed, no decision was missed. Every run folder verifies
(`swt log verify`) and holds a `REPORT.md` written by `swt report --game`; the leak scan of the repository found
no held key value in any file.

## M3 live smoke of the city slice (2026-11-14, issue M3-30, decision A21)

Code commit `a4e7ea7dd26766bffa4f35d0b8e79cf61263f2b5`, runtime revision 3, model `anthropic/haiku` resolved to
`claude-haiku-5-5`, thinking medium, pricing `pi-ai@1.4.0`. 2 runs of at most 3, 0.0114 USD by `m3-ledger.jsonl`
(cap 1.50; 0.40 per run). Each run folder has its own `README.md` (loopholes, problems, solutions).

| Run | Seed | Flags | Cost (USD) | End | Result |
|---|---:|---|---:|---|---|
| `city-slice/smoke/city-slice-001` | 7 | `--snapshot-at 6` | 0.0058 | tick limit (12) | 22 calls, all `readBoard`; no vote, no decision, the Director was not woken |
| `city-slice/smoke/city-slice-002` | 11 | `--snapshot-at 6 --hand city-slice-002.hand.jsonl` | 0.0056 | tick limit (12) | as 001; the person paused, took a snapshot, resumed; its amendment was refused with `DECISION_CLOSED` |

Both folders verify (`swt log verify`), replay equal (`replay` of the testkit), and hold a `REPORT.md` written
with `--game`; the leak scan found no held key value. No `error` end, no cap reached, no failed request. The smoke
did not exercise the Director's model port: without a briefing no resident voted (P450). A third run was not
started, because it would have shown the same. Loopholes: none seen (`city-slice-001` was read line by line).
Problems: rows P450 to P455 in `docs/LESSONS-LEARNED.md` on `develop`.

## Loopholes

None seen (M2 gate). The reviewer read the facts table of every run, and by script the brains, the reasons of the picks and
choices, the refusals and the free texts of the runs; no log was read line by line.

## Problems of the M2 gate

Recorded as rows P444 to P449 in `docs/LESSONS-LEARNED.md` on `develop`, with what was proposed and built:

- P444: `swt report` without `--game` leaves the game's metrics out of the facts table (all reports here used `--game`). Open.
- P445: the Hello Game ends at its tick limit with no finished game under a live model (`smoke/hello-game-001`). Open.
- P446: a brain rewrite is lost to the word limit: in `quarry/quarry-open-quarries/quarry-003` (#753) and
  `quarry-004` (#1358) one seat was refused with `BRAIN_TOO_LONG` until the retro window timed out. Open.
- P447: the ledger and the series lines name a run by a path relative to the directory the command started in
  (`../runs-data/...`). Open.
- P448: the result line of a live run counts input tokens without the cache (686 of about 840 000 in a quarry run). Open.
- P449: the series README gives `n` 24 for an unpaired estimate where the pass rule counts 12 per arm. Open.
