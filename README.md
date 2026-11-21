# Run data of Swarm Tales

Recorded live runs (decision A15). Layout: `<game>/<experiment id>/<run>/`, with `experiment.json`, `results.json`,
`values.csv` and the series `README.md` beside the runs; `smoke/` for single runs; `legacy/` for runs of the old
platform. The index is on `develop`: `games/<game>/RUNS.md`; the write-up of the M2 gate is `docs/M2-GATE.md`.
Everything here is under the Sustainable Use License 1.0 with Additional Terms (`LICENSE`), like the repository (decision A65).

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

## M4 live smokes (2026-11-15, issues M4-60 and M4-61, spec 11-m4 section 7.3)

Code commit `7ea5ea10` (hello to hold'em) and `f0de5e95` (morris, Convoy, Salt Market; the same code, docs only),
runtime revision 4, model `anthropic/haiku`, thinking medium. Ten folders under `<game>/smoke/` for eight smokes,
0.8615 USD (part 1 0.2685, part 2 0.5932). Each folder has its own `README.md` (loopholes, problems, solutions) and
a `REPORT.md`. Every folder is clean under `swt scan`; every one but `liars-dice-001` verifies; every one that
ended replays equal except `hello/smoke/hello-game-002` (ended at its cost cap, P471).

| Folder | Cost (USD) | End |
|---|---:|---|
| `hello/smoke/hello-game-001` | 0.0018 | tick limit: the cap of 0.002 is above the game's cost (P470) |
| `hello/smoke/hello-game-002` | 0.0013 | `models.budget` at a cap of 0.001, passed by the last tick (P472) |
| `liars-dice/smoke/liars-dice-001` | 0.0810 | stopped from outside after ten minutes, in game 3 (P473) |
| `liars-dice/smoke/liars-dice-002` | 0.1088 | `liars-dice.match` |
| `ember-tricks/smoke/ember-tricks-001` | 0.0540 | `trick-play.match` (`games: 1`) |
| `blind-bid/smoke/blind-bid-001` | 0.0216 | `sealed-auction.match` |
| `holdem/smoke/holdem-001` | 0.1159 | `holdem.match` |
| `morris-teams/smoke/morris-teams-001` | 0.0969 | `morris.match` (one resident against the search at depth 3) |
| `convoy/smoke/convoy-001` | 0.1973 | `convoy.match` |
| `salt-market/smoke/salt-market-001` | 0.1831 | `salt-market.match` |

## M4-70 live check of `markOwnOffers` (2026-11-15, decision A46, P478)

Code commit `864ab0e8`, runtime revision 4, model `anthropic/haiku`, thinking medium. One run,
`salt-market/check-m4-70/salt-market-001`, the default game with `--set markOwnOffers=true`, seed 41: 0.1746 USD of
0.40; verifies, replays equal, clean under `swt scan`. Own-offer accepts 1 (the smoke had 4).
## M4 series of D11 (2026-11-15, issue M4-59)

Code commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb`, runtime revision 4, model `anthropic/haiku` resolved to
`claude-haiku-5-5`, thinking medium, output cap 4000 (Harbor Lights) and 16000 (Lanterns, chess), pricing
`pi-ai@1.4.0`. 52 runs, 4.0901 USD by `m4-ledger.jsonl` (cap 12.00). Each series folder has its `README.md` with a
review section (loopholes, problems, solutions).

| Folder | Runs | Cost (USD) | Result |
|---|---:|---:|---|
| `harbor-lights/harbor-lights-private-notes/` | 24 | 1.2814 | +1.58 points per game (SE 1.37, 95 % interval -1.44 to +4.61, n 12 pairs): sign kept, size not reproduced |
| `lanterns/lanterns-team-brain/` | 24 | 1.6631 | +0.058 recall (SE 0.022, 95 % interval +0.010 to +0.106, n 12 pairs): sign kept |
| `chess/chess-requests/` | 4 | 1.1455 | 1.209 requests per half-move (range 1.196 to 1.238) beside the old 1.18 to 1.22; no pass rule |

No run was excluded, no request failed. Every run folder verifies (`swt log verify`), replays equal (`swt replay
--game`) and holds a `REPORT.md` written with `--game`; `swt scan` over the folders and the ledger: clean (391 files,
keys of 2 providers held). `lanterns/lanterns-team-brain/experiment.before-repair.json` is the state file before the
hand repair of three refused starts (P468).

## M5 live run of Whispers (2026-11-16, issue M5-53)

Code commit `bd0ee26a`, runtime revision 6, all actors `claude-haiku-5-5` via Anthropic (residents thinking low),
pricing `pi-ai@1.4.0`, by `games/m5-ledger.jsonl` (M5 cap 12.00 USD). Run 2 of the plan is held back: run 1 cost 1.9
times its expected cost (P479, the second price tier above 100,000 input tokens). The folder has its own `README.md`.

| Run | Seed | Cost (USD) | End | Result |
|---|---:|---:|---|---|
| `whispers/smoke/whispers-001` | 11 | 0.9517 | tick limit (45) | Maren (A04) alone passes door 7 and wins with 110; three holdout tribunals, all dropped within the grace; the whisperer spread rumours, forged nothing; problems P479 to P485 |
| `whispers/smoke/whispers-001-r7` | 11 | 0.2145 | tick limit (45) | runtime r7, variant rumours only (`receipts=false`), code commit `578e65df`; all six pass door 7 by minute 36, Mote (A02) wins with 120 on six of seven popularity votes; the whisperer invents rumours and holds one fragment back a minute; no tribunal; 2 of 19 guard answers unreadable (16 of 47 under r6); P486 |

The folder verifies (`swt log verify`), replays equal (`swt replay --game`), and the leak scan (`swt scan`) found no
held key value.

## M5 live runs of the City of Keys

- `city/base/city-001`: the Act I base (run 3 of `docs/RERUN-PLAN-M5.md`, M5-54), seed 7, residents Haiku via
  Anthropic, runtime revision 7. 0.0686 USD, 8 ticks; paused on `progression.act_ended` when A01 entered level 8.
  Base snapshot `snapshots/t8.json`. Loopholes: none new (LH1, LH2 not seen). Problems: P487 (`swt run` accepted the
  flag `--plan` of another command; open), P488 (no report of a paused run, `SWT-E006`; open), P489 (the pause lands at
  the end of the tick, so the base holds the rest of minute 7 played as Act II; count Act II from `act_started` at
  #1827; open), P7 updated (one `lie` label on a true DM).
- `city/act2/check-0`: run 4 as first planned (`--ticks 6`), resumed from the base and played no tick, because
  `--ticks` counts the base's ticks too (P490; plan fixed by A111, CLI fix M5-101). 0 USD.
- `city/act2/check`: run 4 again with `--ticks 14`, ticks 8 to 13, 0.0741 USD. A blame upheld against Ledger (A02) for
  a denied delivery. Problems: P488 (no report of a paused run).
- `city/act2/5a`: Act II to its end, 0.3724 USD, ticks 8 to 54, three tribunals, exiled A03, A02, A05; seats Dazzle (A01)
  and Bastion (A04). New loophole LH21 (the verification wall: pieces held until "the city confirms the value", which it
  never does; open). Problems P491 (refusals that write the withheld value; open), P492 (the courier names a private
  motive; open), P493 (the report of a resumed run counts its base; open). LH5, LH6 (ransom then exiled anyway), LH7
  (pieces in a will are free) seen again.
- `city/act2/5b`: Act II again, 0.3261 USD, ticks 8 to 54; one door opened; exiled A03 (after a self-ransom), A06,
  A02; seats Bastion (A04) and Dazzle (A01). LH21 and P491 again; the Confessor's one `lie` label was right.
- `city/act2/5c`: Act II again, 0.2907 USD, ticks 8 to 52; no door opened; exiled A03 (after a self-ransom), A05, A02;
  seats Dazzle and Bastion from the faction bonuses, a goal and wills. LH5 (a denied delivered DM, not blamed), LH21
  and P491 again.

## M6 live baseline of tic-tac-toe (2026-11-16, issue M6-24)

Run 1 of `docs/RERUN-PLAN-M6.md`: code commit `155d497e`, runtime revision 8, `kernel.dirty: false`, Node 22.23.4,
residents `claude-haiku-5-5` via Anthropic (thinking medium, output cap 16000), no Director, pricing `pi-ai@1.4.0`, by
`games/m6-ledger.jsonl` (M6 cap 2.34 USD). The folder has its own `README.md`.

| Run | Seed | Cost (USD) | End | Result |
|---|---:|---:|---|---|
| `tictactoe/baseline/tictactoe-001` | 7 | 0.0785 | the match was over (`grid.match`) after 24 ticks | three draws (`grid.tally` X 0, O 0, draw 3); 15 of 15 scored moves optimal; games 2 and 3 play the same nine cells; problems P77 and P85 again, P497 (the report has no result facts); no loophole |

The folder verifies (`swt log verify`), replays equal (`swt replay --game`), and the leak scan (`swt scan`) found no
held key value.

## M6 live check of B2 in Whispers (2026-11-21, issue M6-26)

Run 4 of `docs/RERUN-PLAN-M6.md`: code commit `8714c7d3`, runtime revision 8, `kernel.dirty: false`, Node 22.23.4,
every actor `claude-haiku-5-5` via Anthropic (residents thinking low, gamemaker by `--director-model`), pricing
`pi-ai@1.4.0`, by `games/m6-ledger.jsonl` (M6 cap 2.34 USD). The folder has its own `README.md`.

| Run | Seed | Cost (USD) | End | Result |
|---|---:|---:|---|---|
| `whispers/smoke/whispers-001-r8` | 11 | 0.2264 | tick limit (45) | B2 holds: 24 of 24 guard reviews answered by the tool `verdict`, none unreadable (r6 16 of 47, r7 2 of 19). The city stalled at door 1: three residents passed by minute 2, the other three held all six pieces from minute 3 and never submitted (P499); the gamemaker demanded fragments already sent (P500); Ember (A04) wins with 50 on four popularity votes; no loophole |

The folder verifies (`swt log verify`), replays equal (`swt replay --game`), and the leak scan (`swt scan`) found no
held key value.
