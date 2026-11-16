# Runs of the City of Keys

The index of the recorded runs of this game on this platform. The run folders are on the branch `data/runs`
(decision A15), not here; each has a `README.md` with its loopholes, problems and solutions. Model of every run
(A52, `docs/RERUN-PLAN-M5.md`): the residents `anthropic/claude-haiku-5-5`, thinking medium, output cap 4000; the
gamemaker by `--director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000`; the Confessor and the judge
Haiku with thinking off, as the game file says; pricing `pi-ai@1.4.0`. The spend ledger of M5 is
[`../m5-ledger.jsonl`](../m5-ledger.jsonl).

| Run | Path on `data/runs` | Data commit | Code commit | Runtime | Cost (USD) | Result |
|---|---|---|---|---:|---:|---|
| **The Act I base** (issue M5-54, run 3 of the plan, A54), seed 7, purpose `exploratory`, `--pause-on progression.act_ended` | `city/base/city-001` | pending (the integrator's push) | `1ffa813f` | 7 | 0.0686 of the cap 0.50 | paused after 8 ticks (0 to 7) on `progression.act_ended` `{ fromLevel: 1 }` (#1826, tick 7: Dazzle, A01, entered level 8, so Act I ended by its own rule); all six past door 6, Dazzle (A01) and Bastion (A04) past door 7: A01 80, A04 80, A02 65, A03 65, A05 65, A06 65 (`arena.round_end` #2015); 38 submissions, all correct; the gamemaker's 16 notes landed |
| **The Act II check resume** (issue M5-55, run 4 of the plan), from the base, `--ticks 6`, purpose `smoke` | `city/act2/check` | pending (the integrator's push) | `87481748` | 7 | 0.0000 of the cap 0.40 | played no tick: "stopped after 8 ticks (open)", exit 3; `--ticks` counts the base's 8 finished ticks, so 6 was reached at the resume (P490); `run_resumed` #2017 with the base's snapshot hash and no `replaced`; verifies with `--previous` (2017 lines, continuity holds), replays equal, scan clean, no `REPORT.md` (P488); run 5a not played |

**The base snapshot** (A54): `city/base/city-001/snapshots/t8.json`, tick 8, game hash
`9418a743ae8e7c820ac3c323f0e3c620312af006d84ffed09952244fa0cfa1ad`, snapshot hash (`jsonHash` of the file, the
`snapshotHash` that `swt resume` writes into `run_resumed` and `resumedFrom`)
`eec0f6f8b62b59a92e5a6c1ae43d08a10c5ec1a0bbe292340be0cf815338b1ce` (sha256 of the file's bytes
`845e7538fde642e40f94cf1af169230d1a41dce57c87504abc2a54db303fdd5a`); log head
`027568cafe95d2fa742a3bd3bf74f6ceb3674b6262253d4a0676feb1f035fdec`, 2016 lines. Runs 4 and 5 of the plan resume
from this folder; a change of the City's game hash needs a new base (run 3b).

The base's folder verifies with `swt log verify` (2016 lines, "unfinished": exit 3, a paused run has no end), replays
equal with `swt replay --game` (2016 lines), is clean under `swt scan` (keys of 2 providers held) and holds no
`REPORT.md`: `swt report` refuses a run without `run_ended` (`SWT-E006`, P488). Its manifest matches the plan's
table of the models in every line (`script` without a model). It was played by the plan's command with one flag more,
`--plan`, which `swt run` accepted and ignored (P487). Loopholes: none new. Problems: P487 to P489 new; P7 updated.
