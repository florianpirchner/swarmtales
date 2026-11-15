# The live series of milestone M4

The result of the three series of D11, run by issue M4-59 on 2026-11-15 after the plan in
[`RERUN-PLAN-M4.md`](RERUN-PLAN-M4.md) (section 7 of
[`refactoring-before-release/11-m4-spec.md`](refactoring-before-release/11-m4-spec.md)). Every number below is read
from a file of the run folders (for the branch `data/runs`, pushed by the integrator after the leak scan, decision
A25) or from the spend ledger [`../games/m4-ledger.jsonl`](../games/m4-ledger.jsonl). The rest of the gate of M4
(the nine done-whens, the softer check, the exit note) is issue M4-63.

**Result: both series keep their sign. The chess count is 1.209 requests per half-move (range 1.196 to 1.238)
beside the old 1.18 to 1.22: it holds.**

- **Harbor Lights: private notes raise the crew's score by +1.58 points per game** (standard error 1.37, 95 %
  interval -1.44 to +4.61, exact sign-flip p 0.33, 12 pairs). Sign kept; the interval holds zero, and the estimate
  is half the old +3.2 (SE 0.8), just short of +1.6 (half the old estimate, reported, not gated).
- **Lanterns: the team brain raises recall by +0.058** (standard error 0.022, 95 % interval +0.010 to +0.106, exact
  sign-flip p 0.024, 12 pairs). Sign kept, and the interval excludes zero; the old +0.08 (SE 0.03) agrees in size.
  The shape differs: here the gain is larger in game 1 than in games 2 to 4.
- **Chess: 1.209 requests per half-move on average over four matches** (range 1.196 to 1.238; old 1.18 to 1.22,
  mean 1.1975). Three matches are inside the old range, one is 0.018 above it. The count holds (verdict below).

All 52 runs finished and were included (three more starts were refused before any model call, deviation 2), no
request failed, every run folder verifies and replays equal, and no
held key value was found in any file. The three series cost 4.0901 USD of their caps of 1.60, 2.35 and 2.00;
the ledger holds 4.0901 USD of its 12.00.

## What ran

| | |
|---|---|
| Code | commit `5b6336a6205ccb095b5a5f65e85240abb9f376eb` of `rewrite/develop` ("M4-58 The rerun plan of M4 and its specs"), clean tree (`kernel.dirty` false in every manifest), runtime revision 4 |
| Model | `anthropic/haiku`, resolved to `claude-haiku-5-5` in every manifest; thinking `medium`, provider-default sampling; output cap 4000 tokens in Harbor Lights, 16000 in Lanterns and chess; pricing `pi-ai@1.4.0` |
| Runs | 24 Harbor Lights, 24 Lanterns, 4 chess; at most two in flight, one for chess; Node 22.23.4 |
| Data | `harbor-lights/harbor-lights-private-notes/`, `lanterns/lanterns-team-brain/`, `chess/chess-requests/` and `m4-ledger.jsonl` on `data/runs` |
| Check of each run | `swt log verify` exit 0 and `swt replay --game` "equal" for all 52 folders; a `REPORT.md` by `swt report <run> --game <game file>` in each; `swt scan` over the whole folder: clean |

Before the first run: `pnpm vitest run games/harbor-lights games/lanterns games/chess` green (21 files, 159 tests),
and `swt experiment run <spec> --plan --ledger games/m4-ledger.jsonl` printed each plan with its caps.

## Steps and cost

| Series | Spec, hash | Runs | Cap (USD) | Expected (USD) | Cost (USD) | Dearest run (cap) |
|---|---|---:|---:|---:|---:|---|
| `harbor-lights-private-notes` | `games/harbor-lights/experiments/private-notes.json`, `b215ccf393cc` | 24 | 1.60 | 1.22 | **1.2814** | 0.0645 (0.12) |
| `lanterns-team-brain` | `games/lanterns/experiments/team-brain.json`, `be3337f8c8cb` | 24 | 2.35 | 1.65 | **1.6631** | 0.1053 (0.20) |
| `chess-requests` | `games/chess/experiments/requests.json`, `8a59a7954978` | 4 | 2.00 | 1.28 | **1.1455** | 0.3181 (0.80) |
| **Sum** | | 52 | | 4.15 | **4.0901** | |

The ledger holds 104 lines after its cap line: one reservation and one cost line for each of the 52 runs,
none open. The three runs refused for the dirty tree (deviation 2) never reached the ledger. The cost is what the
platform computes from the token counts and the price table; it was not compared with a bill of the provider.

## Harbor Lights: private notes

One-game matches on the deals 101 to 112. `solo`: every seat writes its own notes before the game; `nobrain`: no
notes. Paired on the deal.

| Seed | `nobrain` score / misfires | `solo` score / misfires | Difference | Old: `nobrain` / `solo` |
|---:|---|---|---:|---|
| 101 | 17 / 2 | 16 / 2 | -1 | 13 / 20 |
| 102 | 19 / 2 | 22 / 1 | +3 | 13 / 19 |
| 103 | 22 / 2 | 25 / 1 | +3 | 22 / 22 |
| 104 | 22 / 1 | 20 / 2 | -2 | 20 / 21 |
| 105 | 14 / 3 | 19 / 2 | +5 | 15 / 21 |
| 106 | 15 / 3 | 21 / 1 | +6 | 22 / 22 |
| 107 | 22 / 1 | 20 / 1 | -2 | 16 / 22 |
| 108 | 21 / 1 | 22 / 1 | +1 | 22 / 22 |
| 109 | 10 / 3 | 23 / 1 | +13 | 19 / 22 |
| 110 | 18 / 3 | 17 / 3 | -1 | 23 / 26 |
| 111 | 22 / 1 | 20 / 2 | -2 | 20 / 24 |
| 112 | 22 / 1 | 18 / 2 | -4 | 16 / 18 |
| **Mean** | 18.67 / 1.92 | 20.25 / 1.58 | **+1.58** | 18.4 / 21.6 (+3.2) |

| | This series | Old platform (`harbor-lights-04a-006-game1-plan`) |
|---|---|---|
| **Estimate** | **+1.58 points per game** | +3.2 |
| Standard error | 1.37 | 0.8 |
| 95 % interval (t) | -1.44 to +4.61 | |
| n | 12 complete pairs, none excluded | 12 |
| Exact sign-flip p (not gated) | 0.33 | |
| Ahead, level, behind | 6, 0, 6 | 9, 3, 0 |
| Reaches +1.6 (half the old estimate) | **no** (+1.58) | |
| Misfires over 12 games | `nobrain` 23, `solo` 19 (difference per game -0.33, SE 0.31) | `nobrain` 26, `solo` 14 |
| Control mean against 16.5 to 20.5 | 18.67: inside | 18.4 |
| **Verdict** | **kept** (`swt experiment analyse` exit 0) | |

What a kept sign says here is little. Six deals are ahead and six behind, and one deal carries the mean: on seed 109
the crew without notes misfired three times and scored 10, the crew with notes 23; without that deal the mean is
+0.55. The old mechanism is visible, weaker: every note has a "play only a known card" line ("Play a slot only when
it is certainly the next rank of its tower", `harbor-lights-002` #55), and the notes arm misfires less (19 against 23),
but not by the old margin (14 against 26), because the crews without notes are careful too ("I won't guess at my
own slots", `harbor-lights-006` #692). The size of the old effect is not reproduced; its sign is.

## Lanterns: the team brain

Four games per match, two teams of three, the seeds of `lanterns-06a-005` and `-006`. `brain`: a team brain written
before game 1 and after each game; `nobrain`: none. Paired on the seed.

| Seed | `nobrain` recall | `brain` recall | Difference |
|---:|---:|---:|---:|
| 59 | 0.843 | 0.951 | +0.108 |
| 61 | 0.856 | 0.835 | -0.021 |
| 67 | 0.866 | 0.881 | +0.016 |
| 71 | 0.702 | 0.810 | +0.108 |
| 73 | 0.750 | 0.871 | +0.121 |
| 79 | 0.665 | 0.777 | +0.112 |
| 83 | 0.716 | 0.821 | +0.105 |
| 89 | 0.717 | 0.906 | +0.189 |
| 97 | 0.749 | 0.727 | -0.023 |
| 101 | 0.733 | 0.682 | -0.052 |
| 103 | 0.754 | 0.747 | -0.007 |
| 107 | 0.761 | 0.796 | +0.034 |
| **Mean** | 0.759 | 0.817 | **+0.058** |

| | This series | Old platform (`lanterns-06a-005` and `-006`) |
|---|---|---|
| **Estimate (recall)** | **+0.058** | +0.08 |
| Standard error | 0.022 | 0.03 |
| 95 % interval (t) | +0.010 to +0.106 | |
| n | 12 complete pairs, none excluded | 12 |
| Exact sign-flip p (not gated) | 0.024 | |
| Ahead, behind | 8, 4 | 10, 2 |
| Reaches +0.04 (half the old estimate) | yes | |
| Games 2 to 4 (`clue-grid.recallLater`) | +0.048 (SE 0.020, +0.004 to +0.093) | +0.11 (SE 0.03) |
| Game 1 (from the two metrics, `4 × recall − 3 × recallLater`) | +0.086 (SE 0.062) | +0.00 (SE 0.04) |
| Precision | +0.035 (SE 0.015, +0.001 to +0.068) | +0.08 (SE 0.02) |
| Games that ran out of clues (`clue_game_ended`, reason `clues`) | `brain` 1 of 48, `nobrain` 0 of 48 | none in the 64 games of `-006` |
| Control mean | 0.759 | 0.73 |
| **Verdict** | **kept** (`swt experiment analyse` exit 0) | |

The sign is kept and the interval excludes zero; the size agrees with the old estimate within its error. **The
shape does not.** The old effect was a memory: level in game 1 (+0.00), +0.11 from game 2 on. Here game 1 already
shows the larger part (+0.086, SE 0.062) and games 2 to 4 less (+0.048, SE 0.020). The brain written before game 1
is a code that the team agrees on ("N is exact. Seekers guess only words that fit the clue; stop at N correct
guesses", `lanterns-002` #116), so part of the gain is a plan, as in Harbor Lights (P330 of the old platform). Twelve
pairs do not separate the two shapes firmly: the game-1 estimate alone has a standard error of 0.062.

## Chess: requests per half-move

One arm, the old `chess-fresh-compact-g4-p80`: four games per match, at most 80 half-moves a game, a fresh context
for every half-move and the compact board. Four matches on the seeds of the old runs 048 to 051.

| Seed | Run | Requests | Half-moves | **Requests per half-move** | Old (run) | Refused moves per 100 half-moves | Turns without a call | Output tokens per half-move | Cost (USD) | USD per 100 half-moves |
|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| 41 | `chess-001` | 361 | 299 | **1.207** | 1.20 (048) | 4.01 | 9 | 1,555 | 0.3048 | 0.102 |
| 43 | `chess-003` | 291 | 235 | **1.238** | 1.18 (049) | 2.98 | 4 | 1,486 | 0.2348 | 0.100 |
| 47 | `chess-004` | 348 | 291 | **1.196** | 1.22 (050) | 3.44 | 8 | 1,689 | 0.3181 | 0.109 |
| 53 | `chess-002` | 342 | 286 | **1.196** | 1.19 (051) | 2.80 | 8 | 1,534 | 0.2878 | 0.101 |
| **Mean** | | 335.5 | 277.8 | **1.209** | 1.1975 | 3.31 | 7.25 | 1,566 | 0.2864 | 0.103 |

| | This series | Old platform (048 to 051, runtime revision 2) |
|---|---|---|
| **Requests per half-move, mean** | **1.209** (the guardrail's mean of the four ratios; `values.csv`) | 1.1975 |
| **Range** | **1.196 to 1.238** | 1.18 to 1.22 |
| Inside the old range | three of four matches; seed 43 is 0.018 above its top | |
| Refused moves per 100 half-moves | 2.80 to 4.01 (mean 3.31; the guardrail "at most 0.04" on the mean held) | at most 4 |
| Cost per match | 0.2348 to 0.3181 USD (USD per 100 half-moves 0.100 to 0.109) | 0.295 to 0.338 (0.104 to 0.109) |
| Output tokens per half-move | 1,486 to 1,689 | 1,585 to 1,693 |
| Turns without a call (`run.noCallActivations`, A44) | 4 to 9 per match, 29 in all | not counted |
| Games: move cap, checkmate, resignation | 11, 3, 2 of 16 | |
| Finished matches | 4 (the plan needs 3) | 4 |

**Verdict of the integrator (section 7.2): the count holds.** The mean lies inside the old range and 0.012 above
the old mean, and the one match above the range is the shortest, where the fixed requests of the retros weigh most.
The facts: the mean 1.209 is
0.012 above the old mean 1.1975 and inside the old range; three matches are inside it and one (seed 43, 1.238) is
0.018 above its top, on the shortest match (235 half-moves, two games ended by resignation, so the fixed requests of
the four retros weigh more). Per seed the differences are +0.007, +0.058, -0.024 and +0.006. Cost per half-move and
output tokens per half-move are where the old runs were.

What a request beyond one per half-move is, read in the logs: the eight brain writes of a match and their
`BRAIN_TOO_LONG` retries (19 in all), the refused moves (37 in all, each answered with the legal moves of that piece or that it has none),
and the turns without a call. All 29 are answer turns, the activation after a seat's own call: 8 before game 1
opens ("The first game hasn't started yet, so there's no position to play", `chess-002` #69, #74), 19 between games
after a brain was written ("Game 2 is over and I won it ... the next game starts soon", `chess-001` #2586), and 2
inside a game ("It's now Black's move, so I can't act until they reply", `chess-001` #4892).

## Guardrails

| Guardrail, mean of the arm | Limit | Value | Held |
|---|---|---:|---|
| Harbor Lights `nobrain`, requests per run | within 10 % of 96 | 97.0 | yes |
| Harbor Lights `solo`, requests per run | within 10 % of 115 | 116.4 | yes |
| Harbor Lights `nobrain`, cost per run | at most 0.060 | 0.0523 | yes |
| Harbor Lights `solo`, cost per run | at most 0.062 | 0.0545 | yes |
| Harbor Lights, refusal codes | the allowed list | `NOT_YOUR_TURN` 39, `TOUCHES_NOTHING` 3, `BRAIN_TOO_LONG` 3, `TOOL_LOCKED` 1 | yes |
| Lanterns `nobrain`, requests per run | within 10 % of 214 | 215.2 | yes |
| Lanterns `brain`, requests per run | within 10 % of 286 | 284.5 | yes |
| Lanterns `nobrain`, cost per run | at most 0.066 | 0.0555 | yes |
| Lanterns `brain`, cost per run | at most 0.10 | 0.0831 | yes |
| Lanterns, refusal codes | the allowed list | `BRAIN_TOO_LONG` 101, `TOOL_LOCKED` 20, `KEEPER_SILENT` 11, `POST_CAP` 2, **`BAD_CLUE` 1** | **no** in the `brain` arm (P467) |
| chess, requests per half-move | reported, no limit | 1.209 | reported |
| chess, refused moves per half-move | at most 0.04 | 0.0331 (one match 0.0401) | yes |
| chess, cost per run | at most 0.40 | 0.2864 | yes |
| chess, refusal codes | the allowed list | `ILLEGAL_MOVE` 37, `BRAIN_TOO_LONG` 19, `TOOL_LOCKED` 7 | yes |

A guardrail that does not hold is a deviation and a lesson row, not a failed gate (section 7.2). The one that did
not hold is a gap of the allowed list: `BAD_CLUE` is a refusal of the old rule (a clue too close to a grid word,
`lanterns-020` #1172) that the old runs the list was counted from never met.

## Exclusions and deviations

- **Exclusions: none.** No run was excluded or replaced. `missed-decision` is blind in these three games (finding B10
  of M2), so forfeits were read in the logs: none in Harbor Lights (`forfeit: false` on every play, signal and
  discard), none in Lanterns (no clue turn without a clue), none in chess (`forfeits` empty in all 16 `game_ended`
  events). One Lanterns clue closed by `timeout` with no guess (`lanterns-002` #997, P469).
- **Deviations from the plan:** none in a threshold, a spec or a pass rule. The refusal-code guardrail did not hold
  in the Lanterns `brain` arm (above, P467).
- **Differences in how the work was done:**
  1. **The first run of each series was played as its smoke** under a separate ledger whose cap held one run
     (0.12, 0.20, 0.80 USD), so that the series stopped after it with the ledger's refusal and nothing else started;
     after reading it, its two ledger lines were copied into the M4 ledger and the same command played the rest. The
     spec, its hash and the order of the plan were not changed.
  2. **Three Lanterns runs were refused for a dirty tree, and their records were removed by hand (P468).** While the
     series ran, the operator wrote `games/harbor-lights/RUNS.md` into the checkout. The next three runs (seed 73 in
     both arms, seed 61 `nobrain`) were refused at their start with `SWT-C023` before any model call; the runner
     recorded them as stopped at 0.20 USD each, so it would never have played them, and stopped the series after
     three failures in a row. The file was moved out, the three records (no folder, no ledger line, no cost) were
     removed from `experiment.json` (the file as the runner wrote it is kept beside it as
     `experiment.before-repair.json`), and the same command played the three runs. No other record was touched.
  3. **The Lanterns series was paused once by the ledger.** The operator's tool stops a command after two hours,
     which would have cut two runs in flight (P462). The cap line of the working copy of the ledger was lowered to
     what was held, the two runs in flight finished and the next start was refused (`SWT-C025`), the cap line was set
     back to 12, and the series continued in a process of its own. Nothing was lost; the ledger in this commit has
     its cap line `{"capUsd":12}`.
  4. The ledger of the runs was a copy outside the checkout, so that the tree stayed clean; the final file is copied
     back in this commit. The run folders were written outside the checkout too.

## The reading of the logs (two per arm)

| Arm | Runs | How far |
|---|---|---|
| Harbor Lights `nobrain` | `harbor-lights-001` (seed 105, the smoke), `harbor-lights-006` (seed 109) | 001: every move and its reason, the status lines; 006: every call, reply and text, the end |
| Harbor Lights `solo` | `harbor-lights-002` (seed 101), `harbor-lights-004` (seed 109) | the notes and their rewrites, the calls before game 1, every move, the refusals |
| Lanterns `nobrain` | `lanterns-003` (seed 71), `lanterns-004` (seed 89) | every clue, the team posts, the keepers' answers; 003 games 1 to 3 in full |
| Lanterns `brain` | `lanterns-001` (seed 101, the smoke), `lanterns-002` (seed 103) | every brain and its refusals, the clues, the retros, the keepers' answers |
| chess `fresh-compact` | `chess-001` (seed 41, the smoke), `chess-002` (seed 53) | every text, brain and refusal, the game ends and their reasons; 001: the four games move by move from the PGN |

## Problems and loopholes

**Loopholes: no new one.** Three old ones were seen again, none with an effect on a measured number:

- **LH14 (a harmless signal keeps the game going), Harbor Lights.** "I passed this turn by signalling A04 'Amber',
  which touched their Amber cards and nothing else useful" (`harbor-lights-006` #600, #621); "That spends my last
  signal but keeps the round alive" (`harbor-lights-012` #814, #930, #945, #989). In 6 of 24 runs. Kept on purpose.
- **LH15 (a silenced keeper writes its warning into its own answer), Lanterns.** "For the record, attic is a fog
  word" (`lanterns-004` #93, #207, #614); "pine is a shadow, so guessing it would cost us 3 points" (`lanterns-002`
  #494). 107 such answers in 24 runs; nobody reads them. Closed by design. A related case: the `brain` team of
  `lanterns-002` wrote "name targets to seekers in chat" into its brain (#1865), a rule the game refuses
  (`KEEPER_SILENT`); a keeper noted that it "can't work, because keepers can't post during a game" (#1121).
- **LH16 (playing for the material verdict at the move cap), chess.** 11 of 16 games reached the cap and 7 of them
  were scored on material; the brains name it ("a new rule to convert material before the cap", `chess-002` #1521;
  "a material lead at move 40 is not a reliable win", `chess-001` #4042). Carried; the count is not touched.

Problems: rows P464 to P469 of [`LESSONS-LEARNED.md`](LESSONS-LEARNED.md).

| Row | In short |
|---|---|
| P464 | a `solo` seat polls the board before game 1 opens: 64 calls in 12 runs |
| P465 | a seat calls a move in the answer turn after its own move: 39 `NOT_YOUR_TURN` in 24 runs |
| P466 | a Lanterns brain is rewritten to fit 200 words: 101 `BRAIN_TOO_LONG` in 12 runs, none lost |
| P467 | the allowed refusal list of the Lanterns spec misses `BAD_CLUE` |
| P468 | a run refused before any call for a dirty tree is charged its whole cap and never played again |
| P469 | a Lanterns brain asks the keeper to name its targets in chat, which the game forbids; the seekers wait and the clue runs out |

Proposals only, nothing is built: the fixes named in the rows. None changes a game's play except P465 (no game
tool in an answer turn), which needs the owner's go.

## Left open

- Done by the integrator: the chess count holds (above); the ledger holds the lines of the smokes of issues 60, 61
  and 70 too (5.1262 USD in all, M4 cap 12.00); the run folders are on `data/runs` at `570801db`, after the leak
  scan; the repair of three dirty-tree records of the Lanterns series (deviation 2) is accepted, as they spent
  nothing.
- The owner's: the go or no for P465; one look at the provider's usage page against 4.09 USD.
- **What entered the findings.** Both signs are kept, so both rows of [`FINDINGS.md`](FINDINGS.md) ("Status on the
  rewrite") and the README's findings block name them with n, SE and a link. Lanterns is "reproduced on the rewrite"
  (the interval excludes zero, the size agrees, the shape differs). Harbor Lights is "sign kept, size not
  reproduced": its interval holds zero and its estimate is half the old one.
