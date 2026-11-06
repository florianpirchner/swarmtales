# tictactoe-teams-06a-011-haiku-5x5-optimized

8 matches of three games on 5x5 (four in a row), Haiku 5.5 on both teams, run in parallel on 2026-11-06 with the four optimizations from run 010 built: forfeits and capped turns in the run summary, board cells that keep their number under a mark, a retro that ends as soon as the brain is written (at most 4 posts and 2 minutes), and a brain prompt that asks for a delta against the previous version with `maxWords` raised from 300 to 500. Four matches with the brain on both teams (`tictactoe-teams-5x5-r6`, seeds 1-4), four without (`tictactoe-teams-5x5-nobrain-r6`, seeds 1-4). Cost **1.97 USD**. Per-match numbers: [summary.txt](summary.txt); event logs are gzipped.

## Result (games: X wins / O wins / draws, 3 games per match)

| Arm | Games X / O / draw | Forfeits | Cost (4 matches) | Minutes per match |
|---|---|---|---|---|
| No brain | 3 / 5 / 4 | 2 (one match) | 0.85 USD | 18-28 |
| Brain on both | 4 / 2 / 6 | 0 | 1.12 USD | 22-36 |

**Still no outcome effect.** 4 + 2 decided games against 3 + 5 are the same within the noise of 12 games per arm; if anything the brain arm draws more (6 of 12 against 4 of 12). The brain costs about 30 percent more per match. Haiku decided 8 of 12 games without and 6 of 12 with the brain; earlier 5x5 Haiku runs (007) decided 6 of 12.

## Checks of the four optimizations

- **Notes line:** the end-of-run output now says `notes: no turn at the output cap, no forfeited move` or counts both. Seven of eight matches had neither; `nobrain-s2` had 2 forfeited moves (one per side) and no capped turn. Works as intended.
- **Cell numbers under marks:** the "render trap" rule of run 010 did not appear; the brains instead describe the new format ("token X n = X on cell n; an empty cell shows only its number"). Cell misreads were not visible in the results, but Haiku seldom misreads anyway; GLM would be the test.
- **Short retro:** retro windows lasted 7-56 seconds (median about 25 s), the brain being written closes them. Two windows of one match (`brain-s4`, game 1) took 140-147 seconds, the 2-minute limit plus the last call. The retro is no longer a big share of the wall-clock time.
- **Delta prompt and 500 words:** did **not** keep the brains short. Version 1 is 270-450 words, from version 2 on the brains sit at 440-500 words, the new cap, in every match (versions 2 and 3: 429, 487, 494, 488, 476, 481, 496, 500, ...). The models rewrite the whole text and fill the space they get.

## Digest highlights

- **The brain is written fast and fills any cap.** With 500 words the text is a full manual by game 2: geometry of the 4-windows, a move priority list with an "open pair" rule (two adjacent enemy stones with free cells on both sides make a double threat), board-reading rules and the reasons for a lost game ("lost proposals in games 1 and 2" in `brain-s1`, team O).
- **Lessons come from lost games.** The rules the brains add after game 1 or 2 name the game they came from (open pair, quiet two of ours while X has a 3-mark window). That is the learning the paper hoped for, but it did not turn into more wins in 12 games.
- **More draws with a brain** (6 of 12 against 4 of 12). A reading, not a finding: the brain's defensive rules (block first) may trade wins for draws on a board where both teams are close to equal.
- **Cost and time:** 0.28 USD per brain match against 0.21 without, 22-36 minutes against 18-28 minutes. Total for the series is about twice the planned 1 USD because 5x5 matches cost 0.13-0.38 USD each.

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P210 | **The delta prompt does not shorten the brain; it fills the new 500-word cap** (440-500 words from version 2, all four matches). | open: a hard rule in the retro that the new text must be at most the old text (one rule replaces one rule), or a brain length counted in rules instead of words |
| P211 | **Still no outcome effect of the brain on Haiku 5x5** (12 + 12 games), at about 30 percent more cost and more draws. | open: a bigger sample is the only way to say more; or a board where the brain can do more than a model that already plays well |

## Optimizations (proposals, not built)

- Make the brain a fixed-size list of at most N rules, so a new rule has to push an old one out by design (P210).
- Count a "team turn" (proposal, votes, play) in the run summary, to compare the cost of the brain arm per move.
- Run the same comparison with GLM and the new board format, where the cell numbers under the marks should show an effect (run 010 had 10 forfeits in the brain arms).

## Notes

- The story id printed in the run header is `tictactoe-teams-5x5-r6` for both arms; the no-brain arm really runs without the brain (no `brain_written` events, no retro). The id does not carry `-nobrain`; cosmetic, open.
- Reporter (model-written digest) was not run; this README is the hand-written report.
