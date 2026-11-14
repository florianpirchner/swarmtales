# The gate of milestone M2

The result of the experiment protocol of
[`refactoring-before-release/09-m2-spec.md`](refactoring-before-release/09-m2-spec.md) section 8, run by issue
M2-24 on 2026-11-14 after the plan in [`RERUN-PLAN.md`](RERUN-PLAN.md). Every number below is read from a file on
the data branch `data/runs` (commit `5bfb55ff`) or from the spend ledger [`../games/m2-ledger.jsonl`](../games/m2-ledger.jsonl).

**Result: both series keep their sign.** Open quarries raise the table's points by 84.5 (standard error 22.0,
95 % interval 36 to 133, 12 pairs). The strategy brain lowers cooperation in the dilemma by 0.771 (standard error
0.084, 95 % interval -0.954 to -0.588, 12 runs per arm). Both intervals exclude zero. All guardrails held, no run
was excluded, no key value was found in any file, and the runs cost 1.60 USD of the cap of 4.00 USD.

**State: closed by the milestone review, with one line left for the integrator** (check 2 below). A challenger
reviewed the gate read-only on 2026-11-14 and recomputed every number of this file from the raw event logs: all
match to the printed digits. The review found two loopholes this file had not seen, and write-up and record work
that was missing; issue M2-27 did that work. What it changed here: the reading of the logs, "Problems and
loopholes", checks 1 and 2 of the kill procedure, "Left open", and the exit note at the end.

## What ran

| | |
|---|---|
| Code | commit `b7de6505cb6cfd55c699db639f425e3d5e26fc06` of `rewrite/develop`, clean tree (`kernel.dirty` false in every manifest), runtime revision 3 |
| Model | `anthropic/haiku`, resolved to `claude-haiku-5-5` in every manifest; thinking `medium`, output cap 4000 tokens, provider-default sampling; pricing `pi-ai@1.4.0` |
| Runs | 61 live runs: 3 single runs, 10 of the two noise floors, 48 of the two series; at most two in flight |
| Data | branch `data/runs`: `smoke/`, `quarry/`, `econ-lab/`, `legacy/` and the ledger |
| Check of each run | `swt log verify` exit 0 for all 61 folders; a `REPORT.md` by `swt report <run> --game <game file>` in each |

## Steps and cost

| Step | What | Runs | Expected (USD) | Cost (USD) | Result |
|---|---|---:|---:|---:|---|
| 0 | `pnpm vitest --run games packages/models apps/cli packages/lab` (45 files, 323 tests: oracle files, canary test, ledger and cap tests); `swt run --fake` of quarry and econ-lab | 0 | 0 | 0 | green; both fake runs ended and verified |
| 1 | Hello Game (`--budget 0.05`); quarry pilot (seed 31, control, `--budget 0.10`); econ-lab pilot (label 41, `brain=false`, `--budget 0.05`) | 3 | 0.11 | 0.0478 | no leak, no `error` end, no cap reached; requests per decision 1.278 (quarry) and 1.306 (econ-lab) |
| 2 | `quarry-noise-floor` | 5 | 0.17 | 0.1715 | within the noise of the old platform |
| 2 | `econ-lab-noise-floor` | 5 | 0.06 | 0.0628 | within |
| 3 | `quarry-open-quarries` | 24 | 0.91 | 0.9099 | sign kept |
| 3 | `econ-lab-brain` | 24 | 0.40 | 0.4101 | sign kept |
| | **Sum** | 61 | 1.65 | **1.6022** | under the hard stop of 4.00 and under every experiment cap (0.50, 0.25, 1.50, 0.75) |

Single runs of step 1: Hello Game 0.0015, quarry pilot 0.0337, econ-lab pilot 0.0125. The ledger holds 61
reservations and 61 cost lines; none is open. The dearest run cost 0.0445 (cap 0.10) in quarry and 0.0237 (cap
0.05) in econ-lab. The cost is what the platform computes from the token counts and the price table
`pi-ai@1.4.0`; it was not compared with a bill of the provider.

## Step 2: the noise floors (reported, not gated)

| | Quarry, control at seed 31 | Econ-lab, `nobrain` at label 41 |
|---|---|---|
| New values | 1112, 995, 1012, 1170, 1151 | 1.00, 0.10, 0.25, 1.00, 1.00 |
| New platform | mean 1088 (standard error 35.8) | 3 of 5 tables locked: share 0.60 (Wilson 0.23 to 0.88) |
| Old platform | mean 1081 (SD 58, n 5) | 4 of 5 locked: share 0.80 |
| Difference | +6.8, standard error 44.2 | -0.20, standard error 0.28 |
| Tolerance | **within** (`withinNoise`) | **within** (`shareWithinNoise`, threshold 1.00) |
| Requests per decision | 1.292 (within 10 % of 1.30): held | 1.306 (within 10 % of 1.32): held |
| Cost per run | 0.0343 (at most 0.041): held | 0.0126 (at most 0.015): held |
| Missed picks or decisions | 0: held | 0: held |

With five runs both checks show only a gross break (specification 8.4). One first turn was read against the old
platform: seat A04 of the quarry pilot against `quarry-31-rep1` of the legacy noise floor. The system prompt, the
two input lines and the three open tools are the same text, and the same seat is asked first. The gate did not do
the two-against-two reading of 8.4, which is asked only when a check is outside. The milestone review did it by
script: for `quarry-noise-floor/quarry-001` and `-002` against the legacy `quarry-31-rep1` and `-rep2`, and for
`econ-lab-noise-floor/econ-lab-001` and `-002` against `econ-lab-nobrain-41-rep1` and `-rep2`, the system prompt
of all four seats, their first inputs and the order of the first pass are identical.

## Step 3: the two pass rules

| | Quarry: open quarries | Econ-lab: the brain |
|---|---|---|
| Spec, hash | `games/quarry/experiments/open-quarries.json`, `bd19298de593` | `games/econ-lab/experiments/brain.json`, `d967092e2dfb` |
| Purpose, design | confirmatory, paired by seed | confirmatory, unpaired |
| Arm means | control 952.8, open 1037.3 | `nobrain` 0.858, `brain` 0.088 |
| **Estimate** | **+84.5 points** | **-0.771** |
| Standard error | 22.0 | 0.084 |
| 95 % interval | 36.0 to 133.0 (t, 11 degrees of freedom) | -0.954 to -0.588 (Welch) |
| n | 12 complete pairs | 12 runs in each arm |
| Permutation p (not gated) | 0.00098 (exact sign flip) | 0.0000022 (exact label permutation) |
| Rule | greater than 0, at least 10 pairs | less than 0, at least 10 runs per arm |
| **Verdict** | **kept** (`swt experiment analyse` exit 0) | **kept** (exit 0) |
| Reaches half the old estimate | yes: +84.5 against "at least +38" (old +77, SE 22) | yes: -0.771 against "at most -0.20" (old -0.40, SE 0.13) |
| Over every finished run | the same: no run was excluded | the same |
| Excluded runs per arm | 0 and 0 | 0 and 0 |

Not gated, quarry: the open arm is ahead on 11 of the 12 seeds (differences 99, 19, 156, 39, 132, 69, -14, 20,
256, 143, 32, 63 for the seeds 31 to 79 in the order of the spec). Seats that share a lane: 4.42 against 1.17 per
match, difference -3.25 (standard error 0.35, interval -4.02 to -2.48). Brains written: 12.0 against 11.83
(difference -0.17, standard error 0.11; P446).

Not gated, econ-lab: locked tables (cooperation 1.00) are 9 of 12 without the brain (share 0.75, Wilson 0.47 to
0.91) and 0 of 12 with it (0, Wilson 0 to 0.24). Cooperation in round 1 of the dilemma: -0.583 (standard error
0.064, interval -0.720 to -0.447). Cooperation in the shared fund: +0.0003 (standard error 0.027, interval -0.056
to +0.057): no difference shown. Points of the table: -30.9 (standard error 5.8, interval -43.2 to -18.5). The
brain arm wrote 12 brains in every run.

A kept sign shows that the port did not turn an effect around. Here both intervals also exclude zero, with the
model of today: +84.5 (SE 22.0, n 12 pairs) and -0.771 (SE 0.084, n 12 per arm). What that says about the size
differs between the two:

- **Quarry agrees in size** with the old platform: +84.5 against +77 (SE 22).
- **Econ-lab: sign kept, larger than the old estimate.** -0.771 against the old -0.40 (SE 0.13) is a difference
  of -0.37 with a standard error of about 0.155, about 2.4 standard errors. The reason is in the control arm: 9 of
  12 tables without a brain lock at 1.00 here, 2 of 8 in the old baseline (specification 8.4). The size of the old
  effect is not reproduced; its sign is.

Both findings carry a caveat from the logs (LH18 and LH19 under "Problems and loopholes").

## Guardrails

| Guardrail, mean of the arm | Limit | Value | Held |
|---|---|---:|---|
| Quarry control, requests per decision | within 10 % of 1.30 | 1.289 | yes |
| Quarry open, requests per decision | within 10 % of 1.30 | 1.299 | yes |
| Quarry control, cost per run | at most 0.041 | 0.0343 | yes |
| Quarry open, cost per run | at most 0.050 | 0.0416 | yes |
| Quarry, missed picks | 0 | 0 in both arms | yes |
| Econ-lab `nobrain`, requests per decision | within 10 % of 1.32 | 1.308 | yes |
| Econ-lab `brain`, requests per decision | within 10 % of 1.75 | 1.813 | yes |
| Econ-lab `nobrain`, cost per run | at most 0.015 | 0.0123 | yes |
| Econ-lab `brain`, cost per run | at most 0.025 | 0.0219 | yes |
| Econ-lab, missed decisions | 0 | 0 in both arms | yes |

Refusal codes, counted from the logs of the two series: quarry `BRAIN_TOO_LONG` 85 (control 30, open 55),
`TOOL_LOCKED` 6, `NOT_IN_PACK` 1; econ-lab `BRAIN_TOO_LONG` 31 and `TOOL_LOCKED` 3, all in the brain arm. Every
code is in the list of its spec. No `request_failed` record in any of the 61 runs.

## Exclusions and deviations

- Exclusions: none. No run was replaced; every plan ran once, in the shuffled order of its spec.
- Deviations from section 8: none in a threshold, a spec or a pass rule. The `results.json` of all four
  experiments lists no deviation.
- Differences in how the work was done:
  1. The run data was written to a folder beside the checkout and committed to `data/runs` after the last run, in
     four commits (step 1, step 2, step 3, the legacy runs with the ledger), not one commit per step while running.
  2. The ledger of the runs was a copy of `games/m2-ledger.jsonl` beside the checkout, so that the tree stayed
     clean for the confirmatory runs; the final file is copied back in this commit.
  3. The reading of 8.5 (the full log of at least two runs per arm) was not done by the gate issue. The gate read
     the facts table of every run and, by script, the brains, the reasons of picks and choices, the refusals and
     the free texts. The milestone review read the logs afterwards, from `events.jsonl` (what each seat got as
     input, its calls, the answers, the thinking and free texts, the brains, the retros):

     | Arm | Runs | How far |
     |---|---|---|
     | quarry `control` | `quarry-001` (seed 73), `quarry-020` (seed 79) | 001: start, end of game 1, all of game 2 pick by pick, retros; 020: every thinking, text, retro and brain of the three games |
     | quarry `open` | `quarry-003` (seed 61), `quarry-004` (seed 79) | 003: game 1 pick by pick with the quarry lines, retro 1; 004: the retros and the case of P446, the thinking of game 3 |
     | econ-lab `nobrain` | `econ-lab-003` (label 48), `econ-lab-005` (label 45) | 003: the whole match; 005: the dilemma |
     | econ-lab `brain` | `econ-lab-007` (label 41), `econ-lab-002` (label 50) | 007: the retros, brains and the dilemma; 002: the dilemma |

     Two runs per arm were opened, and not every one of the eight from the first to the last line. This reading
     found LH18 and LH19, which the script reading had missed.
  4. The README findings block, the recorded moment and `docs/FINDINGS.md` (8.5) were not part of the gate's
     commit; issue M2-27 wrote them.
  5. `develop` moved from `b7de6505` to `a4e7ea7d` while the series ran; the runs name the commit they ran on.
     What changed on the live path since is in the exit note.

## The kill procedure (8.6)

| # | Check | Result |
|---|---|---|
| 1 | Effort | Recounted by M2-27 from the rows of [`ISSUE-RECORD.md`](ISSUE-RECORD.md) (rows 1 to 132 and the owed row of M2-27). **Issues: 72** against the kill line of 150: 3 rows of M0, 41 issues of M1 (M1-00 to M1-40), 28 of M2 (M2-00 to M2-27). Counted the widest way, every row with the milestone M0, M1 or M2 (issues, follow-up commits, reviews, the specification, integrator commits): 86. **Tokens: 15.60 million recorded** against 600 million; the number is a lower bound, because the rows 83 to 132 have no token number (the usage file of the sessions ends before them). **USD: the agent cost cannot be counted**, the sessions are not billed per token (a dash in every row); the only USD number is the live model spend, **1.6022 USD** for the 61 runs of this gate by the ledger, which is not a kill number. The one recalibration of D4 is still owed. Does not fire |
| 2 | Size | **TO FILL BY THE INTEGRATOR at the merge of M2-27:** full `pnpm check` green on commit `<to fill>`, with its last two lines: `<to fill>`. Until this line is filled, check 2 is not recorded. What is known without it: the gate issue ran the tests of step 0 and `pnpm vitest --run scripts` (the budget tests among them, kernel gate 1420), green; the kernel has 1393 code lines and kernel + sdk + engine 3818 of 4100 at `a4e7ea7` (`ISSUE-RECORD.md`, "The softer check of M3"); M2-27 ran `pnpm vitest --run scripts` and the oracle tests of quarry and econ-lab on its own commit, green |
| 3 | Sign | `swt experiment analyse` exit 0 for both series: **pass**. No bridge is run |
| 4 | Keys | The canary test is green (step 0). `findLeaks` with the key broker over every file of the data branch: 0 files. No file holds the prefix of a provider key. No `LEAK` file was written |

## Problems and loopholes

**Loopholes: two, both carried from the old platform, both open.** The gate issue wrote "none seen"; the
milestone review found them when it read the logs. Rows LH18 and LH19 of [`LESSONS-LEARNED.md`](LESSONS-LEARNED.md).

| Row | In short | Evidence | Effect on the findings |
|---|---|---|---|
| LH18 | In the open arm a seat sees the picks other seats made in the same step: the `Quarries:` line is the live state and seats are asked one after another, while the rules and the tool call the picks sealed | `quarry-open-quarries/quarry-003`: #166 (A04 is shown the jade A03 kept at #159), #243, #257, #260 (A01 leaves jade because "A03 is already stacking jade (3)"), #514; 1292 of 1728 pick requests of the 12 open runs; the same in the legacy run `quarry-open-31-rep1` | "open quarries" is visible quarries plus a move order inside each step. The sign gate is not touched: the old baseline had the same |
| LH19 | "Results so far" is a second memory, also without a brain: every later game starts with the points of all seats (in quarry also their final quarries) | `quarry-open-quarries/quarry-001` #747; `econ-lab-brain/econ-lab-003` (`nobrain`) #404, #734 | the `nobrain` arm is "results without a written lesson", not "no memory" |

Proposals only, nothing is built: an open arm with the quarries frozen per step, an arm without the results line,
or corrected rule, tool and README texts. Each changes a prompt or the play after the baseline and needs the
owner's go.

Problems are the rows P444 to P449 and P456 of [`LESSONS-LEARNED.md`](LESSONS-LEARNED.md); none of them touches a
pass rule.

| Row | In short |
|---|---|
| P444 | `swt report` without `--game` leaves the game's metrics out of the facts table |
| P445 | the Hello Game ends at its tick limit with no finished game under a live model |
| P446 | a brain rewrite is lost to the word limit in 2 of 12 open-quarry runs |
| P447 | the ledger and the series lines name a run by a path relative to the start directory |
| P448 | the result line of a live run counts input tokens without the cache |
| P449 | the series README gives `n` 24 for an unpaired estimate where the pass rule counts 12 per arm |
| P456 | the game READMEs of quarry and econ-lab differ from the play in four places (place bonus, no retro after the last game, the tool list shows the later games, the `pick` tool describes a burn); carried, found by the review |

## Left open

- The owner's: the tag of M2 (below); one look at the provider's usage page against 1.60 USD before the next live
  series (the ledger's cap is only as good as the price table); the go or no for the proposals of LH18 and LH19;
  whether the pushed branch `data/runs` stays (decision A25); the data repository (O8); O10, which may be asked
  for only after check 2 is filled and the tag is set.
- The integrator's: the line of check 2; the row of M2-27 in `ISSUE-RECORD.md`; the row A25 in `DECISIONS.md`.
- Follow-ups that do not block: the game READMEs (P456); `results.json` should record the refusal-code guardrail
  (the gate counted it by hand); P444 to P449; the one recalibration of D4; a live run that really ends at its
  cost cap (done-when 2 is proved by scripted tests only, no live run reached a cap).

## Exit note of M2

Written by issue M2-27 after the milestone review (specification 8.6, last paragraph).

**The done-whens.** 1 (oracle files at level 3): met. 2 (a live run through broker and driver, the cost cap, no
key): met; the stop at the cap is proved by scripted tests only. 3 (facts table in every report): met. 4 (noise
floor and both series by the committed plan, both signs kept at 12 seeds): met. 5 (runs on `data/runs`, the README
findings block and one recorded moment): met with M2-27 (`README.md`, [`FINDINGS.md`](FINDINGS.md)). 6 (kill
criterion checked and recorded): checks 1, 3 and 4 are recorded above; **check 2 waits for the integrator's line**.

**The kill criterion does not fire** on checks 1, 3 and 4. Check 2 is expected to pass (kernel 1393 of 1500 code
lines at `a4e7ea7`) and is recorded when its line is filled.

**The commit of the runs is not the commit that gets the tag.** All 61 runs ran on `b7de6505` ("M3-22 testkit:
replay"), a commit of `rewrite/develop` that already holds the M3 issues up to M3-22 beside all of M2 but the
gate. Between `b7de6505` and the commit of M2-27 the live path changed as follows
(`git diff b7de6505..HEAD --stat` over `apps/cli/src`, `packages/sdk/src`, `packages/kernel`, `packages/models`,
`packages/lab`, `mechanics`, `games/quarry`, `games/econ-lab`):

- **Untouched:** `packages/kernel`, `packages/models`, `packages/lab`; the three mechanics of the two games
  (`draft-rounds`, `econ-games`, `strategy-brain`); the game files of quarry and econ-lab (only their `RUNS.md`
  were added).
- **Changed:** the command line (`apps/cli/src`: `live.ts`, `run.ts`, `flags.ts`, `main.ts`, `index.ts`,
  `errors.ts`, `log-verify.ts`, and the new `assembly.ts`, `hand.ts`, `loop.ts`, `records.ts`, `resume.ts`: the
  run loop, the Human Hand, the snapshot and `swt resume` of M3); the sdk (`game/resolve.ts`, and the new
  `director/plugin.ts`); the M3 mechanics `channels`, `court` and `ledger` and the generated mechanic READMEs.
- So the code that asks the model, counts the cost, and holds the rules and the statistics is the code of the
  runs; the code that starts a live run and resolves a game is not. The oracle tests of quarry and econ-lab are
  green on the commit of M2-27 (`pnpm vitest --run games/quarry games/econ-lab`). No live run was repeated on the
  newer command line; the first live run on it is the M3 smoke (M3-30, `city-slice`).

**The push of `data/runs`.** Specification 8.5 and `CLAUDE.md` said that an agent does not push the data branch.
The integrator pushed it on 2026-11-14 all the same: first at `5bfb55ff` (20:26 UTC, one minute before the gate's
commit), then at `00f05497` (with the M3 smoke). The reason, recorded as decision A25 in `DECISIONS.md` section 9:
the container of the build session is ephemeral, and the run data would otherwise exist nowhere durable. The leak
scan had run before the push (check 4: no key value, and the review's own scan found no key, no mail address and
no local absolute path in a tracked file). The owner can remove the branch from the remote. `CLAUDE.md` now says
that the integrator pushes the branch after the leak scan. The commit of M2-27 on `data/runs` (the loopholes in
the READMEs) is local until the integrator pushes it.

**The tag is owed by the owner.** The git gateway of the build session refuses tag pushes (as for `v0-final`), so
no tag of M2 exists. It belongs on the merge commit of M2-27 on `rewrite/develop`, after the line of check 2 is
filled; the specification fixes no name for it. Until then the commit is named by its hash in
[`ISSUE-RECORD.md`](ISSUE-RECORD.md).

**What M2 hands on.** Two findings with their caveats (LH18, LH19); the open rows P444 to P449 and P456; the
ledger `games/m2-ledger.jsonl` at 1.6022 of 4.00 USD; the proposals above, none built.
