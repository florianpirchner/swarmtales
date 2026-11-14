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
`claude-haiku-5-5`, thinking medium, pricing `pi-ai@1.4.0`. 3 runs of at most 3, 0.0206 USD by `m3-ledger.jsonl`
(cap 1.50; 0.40 per run). Each run folder has its own `README.md` (loopholes, problems, solutions). The third run
is of code commit `53c35973ad26416d5312bdf8baa62e08785a09d9`: the variant `briefed` of the game (issue M3-33,
decisions A21 and A26).

| Run | Seed | Flags | Cost (USD) | End | Result |
|---|---:|---|---:|---|---|
| `city-slice/smoke/city-slice-001` | 7 | `--snapshot-at 6` | 0.0058 | tick limit (12) | 22 calls, all `readBoard`; no vote, no decision, the Director was not woken |
| `city-slice/smoke/city-slice-002` | 11 | `--snapshot-at 6 --hand city-slice-002.hand.jsonl` | 0.0056 | tick limit (12) | as 001; the person paused, took a snapshot, resumed; its amendment was refused with `DECISION_CLOSED` |
| `city-slice/smoke/city-slice-003` | 7 | `--set briefed=true --snapshot-at 6 --hand games/city-slice/hands/amend.jsonl` | 0.0092 | tick limit (12) | 12 posts, the notice of the session arrived, no vote: the residents agreed in public not to vote without evidence; no decision, the Director was not woken; the person's amendment was refused with `DECISION_CLOSED` |

All three folders verify (`swt log verify`), replay equal (`replay` of the testkit), and hold a `REPORT.md` written
with `--game`; the leak scan found no held key value. No `error` end, no cap reached, no failed request. The smoke
did not exercise the Director's model port: without a briefing no resident acted (P450, runs 001 and 002); with
the briefing and the court's notice (run 003) the residents posted and then agreed not to vote, so the session
closed without a verdict again. The Director's live answer, a landed amendment and the exile are untested on the
live path. Loopholes: none in 001 and 002; one candidate in 003, the public pact of abstention (LH20). The logs of
`city-slice-001` and `city-slice-003` were read line by line. Problems: rows P450 to P455 and P457 to P460 in
`docs/LESSONS-LEARNED.md` on `develop`.

## The cures of LH18 and LH19, measured (2026-11-14, issue M2-30, decision A29)

Code commit `77d0307e92ffe1e374239b1c8722c2c68924e1aa`, runtime revision 3, model `anthropic/haiku` resolved to
`claude-haiku-5-5`, thinking medium, pricing `pi-ai@1.4.0`. Two exploratory series without a pass rule, 24 runs
with a record, 0.6515 USD by `a29-ledger.jsonl` (cap 1.50; the specs' caps 0.60 and 0.40). Write-up:
`docs/M2-CURES.md` on `develop`.

| Folder | Runs | Cost (USD) | Result | Beside the gate |
|---|---:|---:|---|---|
| `quarry/quarry-open-quarries-frozen/` | 12 (6 pairs) | 0.4594 | open quarries frozen per pick against control: +75.5 table points (SE 27.3, 95 % interval 5.3 to 145.7); shared lanes 0.67 against 4.17 a match; 0 of 864 pick requests show a pick of the same step | +84.5 (SE 22.0, 12 pairs), +85.7 on the same six seeds; 1292 of 1728 |
| `econ-lab/econ-lab-brain-no-results/` | 12 (6 per arm) | 0.1920 | brain against no brain without the results of earlier games: -0.667 dilemma cooperation (SE 0.139, 95 % interval -1.024 to -0.310); locked tables 6 of 6 without a brain, 1 of 6 with it; 0 of 2129 texts of a later game hold an earlier result | -0.771 (SE 0.084, 12 per arm), 9 of 12 against 0 of 12; old platform -0.40 |

Both effects are still there with the loophole closed, and both intervals exclude zero. Neither series can say how
much of the gate's estimate was the loophole: frozen minus live is -10 points (interval -88 to +68), no results
minus results is +0.10 (interval about -0.26 to +0.47). No run was excluded or replaced, no request failed, no
decision was missed, every guardrail held. All 24 folders verify (`swt log verify`) and hold a `REPORT.md` written
with `--game`; the leak scan found no held key value.

Two more folders hold no finished run: `quarry/quarry-open-quarries-frozen/quarry-005` and `quarry-006`. The first
call of the series was stopped from outside after ten minutes (the operator's time limit); the two runs in flight
have 36 and 18 log lines, no signed end and no record, and their two reservations of 0.10 USD stay open in the
ledger. The same command with the same caps then played the open runs of the plan; nothing was played twice.

Loopholes: none new. Problems: P461 (a seat of the open arm takes its own row of the `Quarries:` line for a
rival), P462 (a stopped series leaves runs without a record and reservations open), P463 (a card id read as a
value) in `docs/LESSONS-LEARNED.md` on `develop`. Read line by line: `quarry-001` (open-frozen), `quarry-003`
(control), `econ-lab-003` (`nobrain`), `econ-lab-001` (`brain`). Each series README has the reading.

## Loopholes

Two in the runs of the M2 gate, both carried from the old platform, both cured since by an option that is off by
default (issues M2-28 and M2-29, measured in the section above; rows LH18 and LH19 in
`docs/LESSONS-LEARNED.md` on `develop`). The gate issue wrote "none seen" here: it had read the facts table of
every run and, by script, the brains, the reasons of the picks and choices, the refusals and the free texts, but no
log line by line. The milestone review of M2 then read two runs per arm from `events.jsonl`
(`quarry-open-quarries/quarry-001`, `-020`, `-003`, `-004`; `econ-lab-brain/econ-lab-003`, `-005`, `-007`, `-002`)
and found them.

- **LH18: in the open arm of quarry a seat sees the picks other seats made in the same step.** The `Quarries:`
  line of a pick request is the live state, and seats are asked one after another; the rules in the same request
  call the picks sealed. `quarry/quarry-open-quarries/quarry-003`: #166 (A04 is shown the jade A03 kept at #159),
  #243, #257 and #260 (A01 leaves jade: "A03 is already stacking jade (3)"), #514. 1292 of 1728 pick requests of
  the 12 open runs show a same-step pick of another seat. The legacy run
  `legacy/quarry/quarry-04a-008-noise-floor-r2/quarry-open-31-rep1` shows the same, so the sign gate is not
  touched; the finding is "visible quarries plus a move order inside each step". Proposed: an open arm with the
  quarries frozen per step, or corrected texts (the owner's go is needed). Built: nothing. Open.
- **LH19: "Results so far" is a second memory, also in the arm without a brain.** Every later game starts with
  the points of all four seats per earlier game, in quarry also their final quarries
  (`quarry/quarry-open-quarries/quarry-001` #747; `econ-lab/econ-lab-brain/econ-lab-003`, `nobrain`, #404 and
  #734). The `nobrain` arm is "results without a written lesson", not "no memory". Proposed: an arm without the
  line, or corrected README and prompt texts (the owner's go is needed). Built: nothing. Open.

The M3 smoke has one candidate, LH20 in `city-slice/smoke/city-slice-003` (its section above).

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
- P456 (found by the milestone review): the game READMEs of quarry and econ-lab differ from the play in four
  places: the place bonus of 10 and 5 points (`quarry-001` of the open-quarries series, #154, #627), no retro after
  the last game (`quarry-020`, #1826 to #1831), the tool list shows the later games of econ-lab from the first turn
  (`econ-lab-003`, #7), the `pick` tool describes a burn in a game without burns (`quarry-001`, #11). All carried
  from the old platform. Open.
