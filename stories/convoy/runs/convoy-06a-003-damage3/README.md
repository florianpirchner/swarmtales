# convoy-06a-003-damage3

The balance test after [convoy-06a-002-brain-vs-nobrain](../convoy-06a-002-brain-vs-nobrain/), run on
2026-11-06. With four damaged stages the convoy won 29 of 30 games, so one of the two proposed levers (P153)
was tested: three damaged stages to lose (`convoy-d3`) or a damage cooldown of 2 (`convoy-c2`). The scripted
bot table (4000 games per cell; loyal leads pick the tracker's least suspected seats, or random seats) chose.
The Haiku saboteurs of the brain run played damage on about half of their chances, so the bots were run with
saboteurs who damage whenever allowed and with saboteurs who damage half the time:

| Variant | Saboteur wins: always damage, tracker town | Half the time, tracker town | Half the time, random town |
|---|---:|---:|---:|
| default (4 damaged, cooldown 3) | 34 % | 8 % | 16 % |
| `damageToLose` 3 | 73 % | **34 %** | 53 % |
| cooldown 2 | 40 % | 14 % | 29 % |

With Haiku-like saboteurs the cooldown barely moves the game (8 % to 14 %), while three damaged stages give
the saboteurs about a third. So `damageToLose` 3 was the more balanced lever, and the expectation for Haiku
was about a third of the games for the saboteurs.

Two live runs with 6 Haiku seats each, brain on, seeds 101 and 102 (the same role deals as the first two
seeds of the brain arm), three games each. All six games finished, no deadline was missed, no role leak, and
both logs verify. **Cost 0.36 USD** (0.16 and 0.20); the reporter drafts about 0.03 USD more. The new names
`convoy-d<n>` and `convoy-c<n>` select these variants (`convoy[-nobrain][-g<games>][-d<damage>][-c<cooldown>]`).

## Result

| | `convoy-d3` (6 games) | `convoy` seeds 101-102 (6 games, for comparison) |
|---|---:|---:|
| Saboteur wins | **2 (33 %)** | 1 |
| Damaged stages per game | 2.0 | 2.5 |
| Saboteur damage cards per chance | 16 / 26 (0.62) | 16 / 21 (0.76) |
| Loyal accusation hits | 0.90 | 0.85 |
| Tracker hits | 0.85 | 0.88 |
| Loyal right votes | 0.59 | 0.59 |
| Crews voted down | 4 | 5 |

| Run | Game 1 | Game 2 | Game 3 |
|---|---|---|---|
| convoy-d3-s101 | convoy (1 damaged) | **saboteurs** (3 damaged, stage 7) | convoy (1) |
| convoy-d3-s102 | **saboteurs** (3 damaged, stage 7) | convoy (2) | convoy (2) |

## Digest highlights

- **Three damaged stages make the game a contest.** The saboteurs won two of six games, as the bot table
  predicted for half-careful saboteurs against a reading town (34 %). Both saboteur wins ended at stage 7,
  one stage before the end.
- **The brains know the cooldown.** The brains plan around it in plain words (convoy-d3-s102, A03, #1244).
- **The loyal side reads well here too** (0.90 of the accusations hit, 11 of 16 in the two lost games), so
  the saboteurs win by tempo, not by hiding: with one damaged stage fewer to reach, the table's reading comes
  too late.

## Loopholes

None found. The reporter's candidates are its city frame (P155) or ordinary play, as in the brain run.

## Problems

- `BRAIN_TOO_LONG` 11 times over the two runs (P152).
- One `accuse` over the 400-character reason cap (P270).
- One `proposeCrew` and one `playCrewCard` refused as `TOOL_LOCKED`: a seat called the tool just after its
  phase had closed.

## Solutions

- P153: `damageToLose` 3 tested and balanced on six games (P273). Proposal, not built: make 3 the default
  damage limit and confirm with five seeds of brain against no brain (about 2 USD); `convoy-c2` stays untested.
- Six games are few: two wins in six are consistent with anything from about 5 % to 70 %.

## Optimizations

- Rerun brain against no brain at `damageToLose` 3: with a real chance to win, the saboteurs' boldness from
  the brain (P271) should show in the win rate, not only in damage counts.
