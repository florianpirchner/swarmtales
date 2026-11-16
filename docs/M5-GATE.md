# The live runs of milestone M5

The result of the live runs of section 7 of [`refactoring-before-release/12-m5-spec.md`](refactoring-before-release/12-m5-spec.md),
played by issues M5-53, M5-54 and M5-55 on 2026-11-16 after the plan in [`RERUN-PLAN-M5.md`](RERUN-PLAN-M5.md), and
read again by the gate issue M5-57. Every number below is read from a run folder on the branch `data/runs` (pushed by
the integrator after the leak scan, decision A25), from the runs indexes
[`../games/whispers/RUNS.md`](../games/whispers/RUNS.md) and [`../games/city/RUNS.md`](../games/city/RUNS.md), or from
the spend ledger [`../games/m5-ledger.jsonl`](../games/m5-ledger.jsonl). The rest of the gate of M5 (the nine
done-whens, the softer check) is in [`ISSUE-RECORD.md`](ISSUE-RECORD.md), "The gate of M5". Done-when 6 asks for this
file.

**Result: done-when 6 is met.** Whispers has one recorded live run of each variant. A new Act I base of the City is
recorded at six residents, seed 7, paused on `progression.act_ended` (A54). Act II was played live from that base to
its end through `swt resume` of a live run three times. The gamemaker's requests went to a live model and its tool
calls landed (A28). Every folder verifies, replays equal and is clean under `swt scan`. The eight runs cost
**2.2980 USD** of the M5 cap of 12.00, and every run stayed inside its own cap.

No effect was measured and none was asked for: one base is no evidence for an Act II comparison (D8 of paper 02,
section 7.4), so nothing of these runs enters `FINDINGS.md`, the README or `GAMES.md`.

## What ran

| | |
|---|---|
| Code | `rewrite/develop` at the commits of the runs indexes: run 1 `bd0ee26a` (runtime revision 6); run 2 `578e65df`, the base `1ffa813f`, the Act II runs `87481748` to `a39b6b34` (runtime revision 7, M5-88 and M5-89, decision A100); `kernel.dirty` is false in every manifest but run 1's, which was played on a dirty tree (a smoke may be, P494) |
| Models (A52) | the residents `anthropic/claude-haiku-5-5` (thinking low in Whispers, medium in the City, output cap 4000); the gamemaker by `--director-model gamemaker=anthropic/claude-haiku-5-5:medium:16000`; the Confessor, the guard and the judge Haiku with thinking off, as the game files say; the actor `script` without a model from run 2 on (P483); pricing `pi-ai@1.4.0` |
| Runs | 2 of Whispers, 1 Act I base, 2 check resumes (the first played no tick), 3 Act II runs; one in flight at a time; Node 22.23.4 |
| Data on `data/runs` | `whispers/smoke/whispers-001` (data commit `bbddcbf6`), `whispers/smoke/whispers-001-r7` (`5a57772d`), `city/base/city-001` (`82666825`), `city/act2/check-0`, `city/act2/check` and `city/act2/5a` (`3588b079`), `city/act2/5b` and `city/act2/5c` (`053457c5`) |
| Check of each run | `swt log verify` (a resumed run with `--previous` of the base), `swt replay --game` equal, `swt scan` clean, as each row of the runs indexes records; a `REPORT.md` by `swt report --game` for every finished run (the base and the check resumes are paused runs, for which `swt report` refuses, P488, erratum J300) |
| Read again by M5-57 | `swt scan` over a fresh extract of the eight folders from `data/runs` at `053457c5`: "clean, 62 files, keys of 2 providers held"; `swt scan docs`: clean, 53 files |

## Steps and cost

| # | Run (plan row) | Folder | Runtime | Cap (USD) | Expected (USD) | Cost (USD) | End |
|---:|---|---|---:|---:|---:|---:|---|
| 1 | Whispers `whispers`, seed 11, 45 ticks (1) | `whispers/smoke/whispers-001` | 6 | 1.00 | 0.50 | **0.9517** | the tick limit, exit 0; read as the smoke (A100) |
| 2 | Whispers `whispers-rumours`, seed 11, 45 ticks (2) | `whispers/smoke/whispers-001-r7` | 7 | 1.00 | 0.45 | **0.2145** | the tick limit, exit 0 |
| 3 | City Act I, seed 7, `--pause-on progression.act_ended`: the base (3) | `city/base/city-001` | 7 | 0.50 | 0.20 | **0.0686** | paused after tick 7 on `act_ended` (#1826), exit 3 |
| 4 | the check resume, `--ticks 6` (4) | `city/act2/check-0` | 7 | 0.40 | 0.15 | **0.0000** | played no tick: `--ticks` counts the base's 8 ticks (P490, J303) |
| 4' | the check resume again, `--ticks 14` (4 as A111 changed it) | `city/act2/check` | 7 | 0.40 | 0.15 | **0.0741** | stopped open after tick 13, exit 3 |
| 5a | Act II to its end (5, the done-when) | `city/act2/5a` | 7 | 2.00 | 1.90 | **0.3724** | `arena.stop` after 54 ticks, exit 0 |
| 5b | Act II to its end (5, cut 2 of 10.2 not applied) | `city/act2/5b` | 7 | 2.00 | 1.90 | **0.3261** | `arena.stop` after 54 ticks, exit 0 |
| 5c | Act II to its end (5, cut 1 of 10.2 not applied) | `city/act2/5c` | 7 | 2.00 | 1.90 | **0.2907** | `arena.stop` after 52 ticks, exit 0 |
| | **Sum** | 8 folders | | 8.90 (the caps of 7.2) | | **2.2980** | |

The ledger holds 17 lines: its cap line `{"capUsd":12}` and one reservation and one cost line for each of the eight
runs, none open. The expected costs of the City were corrected after run 1 to 1.9 times the plan's (the Act II rows
1.90, `RERUN-PLAN-M5.md`); the three Act II runs cost a sixth of that, because no request reached the second price
tier of 100,000 input tokens (J306). The reserve of 2.00 was not touched, no second base was needed. The cost is what
the platform computes from the token counts and the price table; it was not compared with a bill of the provider.

## What the runs had to show (section 7.4)

| Must show | Shown | Where |
|---|---|---|
| the gamemaker answers live and its calls land (A28) | yes | a Director that acts by tools writes `asked` and its tool calls, no `answered` (J301): in the base 7 looks, 14 requests (0.0100 USD), 14 `notify` and 2 `boardNote`, all delivered; in run 2 of Whispers 44 looks |
| the Act I base: every resident passed level 7, or Act I ended by its own rule | yes, by its own rule | `progression.act_ended` `{ fromLevel: 1 }` at #1826, tick 7, when Dazzle (A01) entered level 8; the snapshot `snapshots/t8.json` with its hashes in `games/city/RUNS.md` |
| Act II plays to its end from the base: a tribunal sits and exiles, the exile is carried out by its listeners (A28) | yes, three times | 5a, 5b and 5c each hold three tribunals with 17 votes and three exiles carried out by their listeners (in 5a: the suspension, the burned fragment, the contracted level, the voided goal, the kept piece), and one self-ransom; `arena.stop` ends each (#8003, #7475, #7039) |
| a review answered live, if a resident calls a guarded tool or `blame` (not a must) | yes, both | the guard in Whispers run 1 (47 reviews, 16 of them unreadable, P480, fixed in part by M5-88); the judge upheld one `blame` live in the check resume (#2159, LH5) |

Need not show, and did not: an amendment of a decision (the City opens no decision window by default, A41) and any
effect or comparison (D8 of paper 02).

## Deviations from the plan

1. **Run 1 cost 1.9 times its expected 0.50** (P479, the second price tier): over the issue's stop line of 1.5 times,
   so run 1 was read as the smoke and run 2 waited for M5-88 and M5-89 (A100). It stayed inside its cap of 1.00.
2. **Runtime revision 7 from run 2 on** (erratum J280): the plan and section 7.3 say every M5 run is revision 6. The
   row of each run carries the revision of its manifest.
3. **Run 2's folder name** (J281): the command line numbers runs within their `--out` folder, so run 2 got the id
   `whispers-001` again; its folder is `whispers-001-r7`, its manifest and ledger name stay `whispers-001` (A103).
4. **The check resume played no tick** (P490, J303) and was played again with `--ticks 14` (A111); M5-101 now refuses
   a `--ticks` that is not above the snapshot's tick count.
5. **No report for a paused run** (P488, J300), and the report of a resumed run counts the base too (P493, J304): the
   reviewer wrote the act's own numbers into each report's "Review".
6. **Run 1 ran on a dirty tree** (P494, erratum J311): its manifest has `kernel.dirty: true`, which no record named
   before this gate. A smoke may run on a dirty tree; the folder replays equal with the game file it holds.
7. **The cut list was not applied** (erratum J310): the second and third Act II runs were cut 2 and cut 1 of 10.2;
   both were played, inside the caps.

## Problems and loopholes

**Loopholes:** one new, **LH21** (the verification wall: a holder admits the message and denies its value, asking
for a proof the city does not give), seen in 5a, 5b and 5c. LH5 (feigned non-delivery) was blamed and upheld once
live; LH10 was seen again in Whispers. **Problems:** P479 to P494 of [`LESSONS-LEARNED.md`](LESSONS-LEARNED.md). Built
in M5: P480 in part (M5-88), P481 to P483 (M5-89, M5-91), P487 and P490 (M5-101). Open for after the baseline (A104):
B1, the rumours variant without delivery receipts or its text adjusted (P486); B2, the guard answers by a tool (the
rest of P480). Proposals only, nothing built: P484, P485, P491 and P492 ask for rule or prompt changes of the games,
which need the owner's go ("Brainstorm before building").

## Left open

- The data commits of the eight rows of the runs indexes say "pending (the integrator's push)"; the folders are on
  `data/runs` at the commits named above. Writing them into `games/*/RUNS.md` is outside the paths of M5-57.
- The owner's: the German summary of the runs of M5 to Flo (`CLAUDE.md`, "After every live run", point 5), if the
  integrator has not sent it; one look at the provider's usage page against 2.30 USD.
