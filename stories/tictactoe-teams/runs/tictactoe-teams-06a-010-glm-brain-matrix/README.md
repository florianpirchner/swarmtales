# tictactoe-teams-06a-010-glm-brain-matrix

11 matches of three games, GLM-5.3-flash (OpenRouter) on both teams, output cap 16000, six rounds per move, run in parallel on 2026-11-06/07: brain on both teams for 3x3 (3 seeds), 4x4 (2) and 5x5 (4), plus two more 5x5 seeds without brain. They are compared with the no-brain GLM vs GLM matches of run 009 (`cap16-glm-*-glmboth-nobrain`, same seeds). Cost **5.15 USD**. Per-match numbers: [summary.txt](summary.txt); event logs are gzipped.

## Result (games: X wins / O wins / draws, 3 games per match)

| Board | No brain | Brain on both | Forfeits (no brain / brain) | Cost per match (no brain / brain) |
|---|---|---|---|---|
| 3x3 | 3 / 2 / 4 (3 matches) | 1 / 3 / 5 (3 matches) | 0 / 2 | 0.09 / 0.17 USD |
| 4x4 | 1 / 1 / 4 (2 matches) | 1 / 0 / 5 (2 matches) | 0 / 5 | 0.33 / 0.48 USD |
| 5x5 | 6 / 3 / 3 (4 matches) | 7 / 3 / 2 (4 matches) | 3 / 10 | 0.60 / 0.67 USD |

**No brain effect on the results.** The shares of decided games and draws are the same within the noise (3x3 and 4x4 stay draw boards, 5x5 is decided in 75 to 85 percent of the games either way). The brain costs more (a retro window per game, longer prompts: 12 to 90 percent more per match) and the brain arms forfeited more (17 against 3). The extra forfeits are probably the retro time and the longer context; that is a guess, not measured.

## Digest highlights

- **The brains turn into operating manuals, not strategy.** Version 1 (220-280 words) is a textbook priority list: win, block, fork, centre, corners. By version 2 and 3 (about 290 words, the cap of 300) the rules are about the interface and the team routine: "viewBoard IMMEDIATELY before every proposeMove, never from memory (cost us an illegal proposal in game 2)", "the vote was the verification, the captain plays at once", "exactly one free cell: propose it, all agree, no debate". On 5x5 a "RENDER TRAP" rule appears: marks replace the cell numbers in the board text, so cells must be read by column and teammates' cell reports must be checked ("15/16 misread nearly cost us").
- **The brain learns from errors it actually made** (an illegal proposal, a misread cell), which is the kind of learning the paper hoped for, but it does not show in the results because GLM seldom errs on 3x3 and 4x4.
- **The 300-word limit is reached by game 2** (264-300 words from version 2 on, 282-300 in version 3): every new rule has to push an old one out.
- **5x5 is the only board that decides games** (75 to 85 percent of the games), as in runs 007-009. GLM vs GLM needs 31-90 minutes there.
- **Capped turns are gone:** 3 turns at the 16000 cap in 11 matches (run 008 with 4000: 202 in 28).

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P146 | **No outcome effect of the brain, at a higher cost and more forfeits** (GLM, 3x3 to 5x5, 11 + 11 matches). | open: a board with room to err for GLM, a larger sample on 5x5, and a brain arm that skips the retro for a draw |
| P147 | **The brain's 300 words fill up by game 2** and the content is operational (interface traps) rather than strategic, so a longer match would have to throw rules away. | open: raise `maxWords`, or ask for a delta against the previous version |

## Optimizations (proposals, not built)

- Count forfeits and capped turns in the run summary so a comparison can be filtered (P94 follow-up).
- Show the board with fixed-width cells in the board text (the "render trap" costs GLM misreads on 5x5).
- Run the brain arms with a retro that ends as soon as the brain is written (the extra minutes are probably where the forfeits come from).

## Notes

- Seeds 1-3 (3x3), 1-2 (4x4), 1-2 (5x5) are paired with run 009; 5x5 seeds 3 and 4 exist in both arms only here (`nobrain-s3`, `nobrain-s4`).
- Reporter (OpenRouter) was not run; this README is the hand-written report.
