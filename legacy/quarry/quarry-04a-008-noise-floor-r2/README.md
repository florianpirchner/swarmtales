# quarry-04a-008-noise-floor-r2

2026-11-14, runtime r2, commit `5593de4`. The first series in this repository that plays the same game, arm and seed more than once: 15
matches of the current Quarry rules (no burns, place bonus 10/5, 3 games of 2 packs of 6), 4 Haiku seats via Anthropic, five
replicates each of

- `quarry` at seed 31 (the control arm of [quarry-04a-007-paired-seeds](../quarry-04a-007-paired-seeds/): brain, hidden quarries),
- `quarry-open` at seed 31 (the treatment arm: brain, every quarry visible),
- `quarry` at seed 37.

The plan was committed before the first run and is, with the analysis, in [../NOISE-FLOOR.md](../NOISE-FLOOR.md) (machine-readable:
[../noise-floor.json](../noise-floor.json)). Command: `pnpm swt run --story <arm> --seed <n> --provider anthropic --model haiku --budget
0.40 --no-reporter`, one batch of quarry runs at a time next to one batch of econ-lab runs. Folders `<arm>-<seed>-rep<k>/run/`.

All 15 matches finished with no turn error and no missed pick; every signed log verifies (`swt log verify`). **Cost 0.556 USD**
(control at seed 31 0.172, open 0.209, control at seed 37 0.176; 181 to 194 requests a match), no reporter spend.

## Result

| Arm, seed | Table points per match (5 replicates) | Mean | SD | Shared lanes per match | Baseline run (007) |
|---|---|---:|---:|---:|---:|
| `quarry`, 31 | 1080, 1163, 1109, 1033, 1021 | 1081 | 58 | 2.0 | 1003 |
| `quarry-open`, 31 | 1042, 1038, 1132, 1139, 1004 | 1071 | 61 | 1.6 | 1116 |
| `quarry`, 37 | 948, 877, 882, 874, 936 | 903 | 36 | 4.4 | 991 |

**Identical runs differ by up to 142 points (13 %), as much as the eight deals of the baseline differ from each other** (SD 52). At
seed 31 open quarries bring nothing (-10, SE 38); the baseline's +113 at this seed was one noisy pair. The series effect of +77 is 2.6
standard errors of pure replicate noise; see [../NOISE-FLOOR.md](../NOISE-FLOOR.md) for what that means for the rerun.

## Digest highlights

- **The spread is made in games 2 and 3.** At seed 31 game 1 scores 379 to 428 in the control arm and the seats take four different
  lanes in games 1 and 2 of all five replicates; game 3 scores 283 to 362, with 0 to 3 shared lanes. What the brains wrote after game
  2 decides it.
- **The deal sets the level.** Seed 37 gives two seats the same opening colour in game 1 in four of five replicates (shared lanes 4.4
  per match against 2.0 at seed 31), and the table is 178 points lower.
- **On a deal with four clean lanes there is nothing for open quarries to fix.** That is the likely reason for the missing effect at
  seed 31; it was not tested on a second deal.

## The reports

Each run has a `REPORT.md` written by `pnpm report:run` without a reporter model (no OpenRouter spend), so it holds the computed part
only, and no model-written highlights, problems or loophole candidates. Reviewed against `events.jsonl`: date, seed, runtime, model,
end minute, cost and the tool-error counts are right. The result tables are city-shaped and wrong for this game (P89, and finding 4 of
paper 02): "Levels solved: none", "Submissions: 0 correct, 0 wrong", "Stuck: A01 on level 1", "Final standings: unknown" and a list of
"Log issues" for every Quarry event. The results of this series are the table above and `noise-floor.json`, computed from the
`draft_match_ended` and `draft_game_scored` lines.

## Loopholes

None. No reporter model looked for candidates; the tool errors and the refused calls of all 15 logs were read by hand (below).

## Problems

- **P440** (new): two identical Quarry runs differ by up to 142 table points; a single run per seed and arm is a weak measurement, and
  the open-quarry effect is not seen at seed 31.
- **P442** (new): the `pick` tool offers its `burn` parameter in an arm without burns. Twice in 2160 picks a seat added a burn and got
  `NO_BURNS_LEFT: You have used all 0 burns of this game` (quarry-31-rep4 #311, quarry-open-31-rep2 #754); both picked again, no pick
  was missed.
- **P443** (new): the story hash of the baseline cannot be reproduced, and `--budget` changes the hash.
- **P120 again**: 63 of 243 brain writes were first refused with `BRAIN_TOO_LONG` (151 to 232 words against 150); every seat then
  wrote a shorter brain, all 180 brain versions exist. The fix of 004 (the cap named as an aim) lowered the rate there to 3 of 27; here
  it is 1 in 4.
- Two `writeBrain` calls outside a retro window were refused with `TOOL_LOCKED` (quarry-31-rep3 #981, quarry-37-rep2 #572): a seat
  tried to update its brain during a game. Harmless.
- **P89 again**: the computed report is city-shaped.

## Solutions

- P440: proposed in [../NOISE-FLOOR.md](../NOISE-FLOOR.md): tolerances from the measured standard errors, the sign rule of DECISIONS
  D11, more seeds before more replicates. Nothing built; open.
- P442: proposed: leave `burn` out of the tool's schema when `maxBurns` is 0. Not built (a ported game keeps its tool schema until
  its baseline is set, DECISIONS D14); open.
- P443: proposed: the run manifest of the rewrite hashes the game and the run limits apart, and a baseline is only taken from a clean
  tree. Not built; open.
