# tictactoe-teams-06a-008-glm-matrix

> **Note 2026-11-06:** the forfeits in this run came largely from the output cap of 4000 tokens per call (P94), which thinking models such as Gemma and GLM exhaust inside their thinking. Conclusions here about forfeits, captains and model strength are biased; see [tictactoe-teams-06a-009-captain-solo-cap](../tictactoe-teams-06a-009-captain-solo-cap/README.md).


28 matches of three games on 3x3, 4x4 and 5x5 (four in a row above 3x3) with `z-ai/glm-5.3-flash` (OpenRouter) instead of Gemma, run in parallel on 2026-11-06, one git worktree per board size, six rounds of proposal and vote per move, no personas, no gamemaker. Total cost **6.88 USD** on OpenRouter (3x3 1.33, 4x4 2.42, 5x5 3.13). Per-match numbers: [summary.txt](summary.txt). Event logs are gzipped (`gunzip events.jsonl.gz`).

| Pairing | Arms | Seeds | Folder prefix |
|---|---|---|---|
| Haiku X vs GLM O (`glmO`) | no brain, brain on both | 3x3: 3, 4x4: 2, 5x5: 2 | `<size>-glmO-*` |
| GLM vs GLM (`glmboth`) | no brain, brain on both | 3x3: 3, 4x4: 2, 5x5: 2 | `<size>-glmboth-*` |

## Results (games: X wins / O wins / draws)

| Board | Pairing | No brain | Brain on both | Forfeits (X + O, all arms) |
|---|---|---|---|---|
| 3x3 | Haiku X vs GLM O | 3 / 0 / 6 | 3 / 0 / 6 | 3 (all O) |
| 3x3 | GLM vs GLM | 2 / 1 / 6 | 2 / 0 / 7 | 3 |
| 4x4 | Haiku X vs GLM O | 1 / 0 / 5 | 1 / 0 / 5 | 5 (all O) |
| 4x4 | GLM vs GLM | 1 / 0 / 5 | 0 / 0 / 4 (one match stopped after one game) | 11 |
| 5x5 | Haiku X vs GLM O | 5 / 1 / 0 | 4 / 2 / 0 | 12 (11 O) |
| 5x5 | GLM vs GLM | 1 / 3 / 2 | 4 / 1 / 1 | 24 |

**Reading.**
- **GLM plays the protocol.** Every GLM match produced games, unlike Gemma 4 (P86): on 3x3 about one forfeit in two matches, 2 per match on 4x4, 4.5 per match on 5x5. Forfeits still grow with the board (P88) and stopped one 4x4 match after one game (4 forfeits in a row).
- **Haiku X vs GLM O:** Haiku wins 6 of 18 games on 3x3; with only 3 forfeits in six matches these numbers are mostly real play. On 5x5 Haiku wins 9 of 12 games against GLM, with many forfeits on the GLM side (11), so strategy and forfeits are mixed again (P81).
- **GLM vs GLM on 5x5** decides most games, partly through forfeits and missed wins (three `missed_win` moves in one match).
- **Brain:** no visible effect on 3x3 and 4x4 (draws either way); on 5x5 the numbers swing both ways with 6 games per arm. Nothing can be claimed.
- **Cost and time:** GLM costs 0.06-0.17 USD per 3x3 match, 0.19-0.54 on 4x4 and 0.15-0.72 on 5x5; GLM vs GLM on 5x5 takes 68-102 real minutes.

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P88 | **Forfeits grow with the board** even for GLM (0.5, 2, 4.5 per match on 3x3, 4x4, 5x5) and two forfeits of one team in a row can stop a match. | open: fixed captain per team (see P86), or more rounds only for big boards |
| P81 | Forfeits and strategy are still mixed on 5x5. | open: count forfeited moves separately in the score |

## Notes

- Runs used `git worktree` checkouts of `main` at 90c1969, one per board size, so that three sets of matches could run at once without touching the working tree.
- Reporter (OpenRouter) was not run; this README is the hand-written report.
