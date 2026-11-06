# tictactoe-teams-06a-007-4x4-5x5-matrix

> **Note 2026-11-06:** the forfeits in this run came largely from the output cap of 4000 tokens per call (P94), which thinking models such as Gemma and GLM exhaust inside their thinking. Conclusions here about forfeits, captains and model strength are biased; see [tictactoe-teams-06a-009-captain-solo-cap](../tictactoe-teams-06a-009-captain-solo-cap/README.md).


26 matches of three games each on the 4x4 and 5x5 boards (four in a row wins on both), run in parallel on 2026-11-04/05, no personas, no gamemaker. Total cost **about 3.5 USD**. The container restarted twice during the night and killed running matches; every killed match was started again from scratch, so each folder below is one complete, uninterrupted match. Per-match numbers are in [summary.txt](summary.txt). The event logs are gzipped (`gunzip events.jsonl.gz`; the chain verifies after unzipping both files).

| Pairing | Board | Arms (seeds) | Rounds per move | Folder prefix |
|---|---|---|---|---|
| Haiku X vs Gemma-4-26B O | 4x4 | no brain, brain on both (3 each) | 3 | `4x4-haikuX-gemmaO-r3-*` |
| Haiku vs Haiku | 4x4 | no brain, brain on both (3 each) | 6 | `4x4-haiku-*-r6` |
| Gemma-4-26B vs Gemma-4-26B | 4x4 | no brain, brain on both (3 each) | 6 | `4x4-gemma-*-r6` |
| Haiku vs Haiku | 5x5 | no brain, brain on both (2 each) | 6 | `5x5-haiku-*-r6` |
| Gemma-4-26B vs Gemma-4-26B | 5x5 | no brain, brain on both (2 each) | 6 | `5x5-gemma-*-r6` |

## Results

Games per arm (X wins / O wins / draws):

| Pairing | Board | No brain | Brain on both |
|---|---|---|---|
| Haiku vs Haiku | 4x4 | 1 / 0 / 8 | 0 / 1 / 8 |
| Haiku vs Haiku | 5x5 | 2 / 0 / 4 | 2 / 2 / 2 |
| Haiku X vs Gemma O | 4x4 | 8 / 0 / 1 | 5 / 0 / 4 |
| Gemma vs Gemma | 4x4 and 5x5 | no game finished in 9 of 10 matches | no game finished |

- **Haiku vs Haiku, 4x4:** almost only draws, as in run 005 (P84). The brain changes nothing.
- **Haiku vs Haiku, 5x5:** the first board where Haiku decides games (6 of 12 games are won). The exact referee scores only positions with at most 16 free cells, so some games have no scored move; the scored moves of the other games were optimal except 1 missed block and 2 blunders (all in the no-brain arm). With brain: 2 O wins, without: none. That is 12 games per arm and far too few to call it an effect.
- **Haiku X vs Gemma O, 4x4:** all 62 forfeits (29 and 33 per arm) are Gemma's and 12 scored moves are missed blocks (7 without brain, 5 with), so forfeits and strategy cannot be told apart and the arms cannot be compared, as on 3x3 (P81). Six rounds per move (the `r6` arms) were not run for this pairing.
- **Gemma vs Gemma:** the matches end after 4 forfeits in a row ("the teams did not play", P79 guard). Both teams fail to play the agreed move, with six rounds per move as well. Cause in the log: Gemma loses track of who the captain of the turn is (the captain cannot vote, only the captain proposes), tries `castVote` as captain or `proposeMove` as voter (`CAPTAIN_CANNOT_VOTE`, `NOT_CAPTAIN`), re-reads the board and runs out of rounds. More rounds do not fix this (P86).

## The brains (Haiku, 4x4)

Version 1 is already 210-240 words with a line count ("10 lines only"), cell weights (centres and corners on 3 lines, edge middles on 2) and a move priority ladder: win, block, fork defence, own double threat. Content is general strategy, no position-keyed rules.

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P84 | Haiku draws 4x4 (16 of 18 games drawn). | partly: on 5x5 Haiku decides games, so 5x5 gives the brain room to err; scoring beyond 16 free cells is missing (the first moves of 5x5 are unscored) |
| P86 | **Gemma 4 loses track of the rotating captain** and forfeits most moves; with Gemma on both teams no game finishes. | open: a fixed captain per team, or the captain's name in every turn input |
| P87 | **Containers restart overnight and kill background runs** (twice in 3 hours); there is no resume on the core-story path. | worked around: relaunch unfinished matches from scratch; open: resume from a checkpoint |

## Notes

- Cost per match: Haiku vs Haiku 0.13-0.21 USD on 4x4, 0.08-0.33 USD on 5x5; Gemma vs Gemma 0.03-0.16 USD (short, invalid matches); Haiku X vs Gemma O 0.10-0.27 USD.
- Reporter (OpenRouter) was not run; this README is the hand-written report.
