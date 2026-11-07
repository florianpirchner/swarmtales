# tictactoe-teams-06a-012-haiku-5x5-rules8

4 matches of three games on 5x5 (four in a row), Haiku 5.5 on both teams, seeds 1-4, run in parallel on 2026-11-07 with the brain as a **list of at most 8 rules** (`tictactoe-teams-5x5-r6-rules`, new mechanic option `strategy-brain.maxRules`, 240 words as the outer cap). A new rule has to replace an old one once the list is full (P210). Compared with the same seeds of run 011 (free-text brain up to 500 words, and no brain). Cost **1.05 USD**. Per-match numbers: [summary.txt](summary.txt); event logs are gzipped.

## Result (games: X wins / O wins / draws, 3 games per match)

| Arm | Games X / O / draw | Brain words (version 1 / last) | Forfeits | Cost (4 matches) |
|---|---|---|---|---|
| No brain (run 011) | 3 / 5 / 4 | none | 2 | 0.85 USD |
| Free-text brain, 500 words (run 011) | 4 / 2 / 6 | 270-450 / 440-500 | 0 | 1.12 USD |
| **Rule list, 8 rules (this run)** | 4 / 2 / 6 | 115-143 / 171-238 | 1 | 1.05 USD |

**Same outcome as the long brain with less than half the text.** The rule list reaches 4 / 2 / 6, exactly the result of the free-text brain, at 7 percent lower cost (1.05 against 1.12 USD); against no brain it costs 24 percent more. As in run 011, 12 games per arm cannot tell the arms apart.

## Digest highlights

- **The limit holds the length.** Every brain of every version has exactly 8 lines; they grow only from 115-143 words (version 1) to 171-238 (last version), not to the cap. Two writes (one match) were refused as too many lines (`BRAIN_TOO_MANY_RULES`) and corrected at once.
- **A new rule pushes an old one out, as designed.** In `rules-s1` team X version 1 has "8. After each game, note which opening and reply worked and which lost"; by version 3 this empty rule is gone and rule 8 is a board-reading trap: "Board text can look garbled (labels next to marks): 'O 7' means O on cell 7. Confirm the cell is empty before proposing". Rules 3 and 6 were merged to make room for a concrete rule 5 (list live windows for both sides, take the danger cell first, with cells from game 2 as the example).
- **Rules turn concrete but stay readable.** The surviving rules cite cells of the lost game as examples; the two kinds of rule the 500-word brains piled up (interface traps, long priority lists) are both still there, in a third of the text.
- **Cost is the brain's price, not its text length:** most of the extra cost over no brain is the retro window and the longer briefings, which a short list shrinks only a little.

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P260 | **Rule list and free text give the same results** (4 / 2 / 6 each, 12 games), so the shorter brain is cheaper but not better. | open: nothing to fix; the question left is whether any brain helps (P211) |
| P261 | **A rule list can hold a rule that is dead weight** (version 1 rule 8 "note which opening worked" says nothing a player can act on) until a later game pushes it out. | open: ask in the retro to name the rule that is dropped |

## Optimizations (proposals, not built)

- Name the replaced rule in the retro post ("drop rule 8 because ...") so the log shows what the brain forgets.
- Tic-tac-toe is finished for now: all arms (no brain, free-text brain, rule list) give the same outcomes on Haiku; further runs need a game where an agent can improve over games.

## Notes

- Reporter (model-written digest) was not run; this README is the hand-written report.
