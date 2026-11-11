# tictactoe-teams-02a-014-strong-vs-haiku-stale-captain

First attempt (2026-11-11) at measuring stronger models on 5x5 tic-tac-toe (four in a row): one agent per
side, no brain (`tictactoe-teams-5x5-nobrain-solo`; the story id prints as `tictactoe-teams-5x5-solo`, the brain
is off: no retro, no `brain_written`), Haiku on one side and Opus or Sonnet on the other via
`--resident-model A01=anthropic/claude-opus-5-5` (X) or `A04=...` (O), seeds 1-3, 3 games per match (X opens
games 1 and 3). **Not comparable**: 27 forfeited moves, 21 of them Haiku's (P410), so the results are not used.

| Folder | X | O | Game 1 | Game 2 | Game 3 | Forfeits X / O | Cost |
|---|---|---|---|---|---|---|---:|
| `haikuX-opusO-s1` | Haiku | Opus | X (11) | X (8) | O (8) | 0 / 1 | 0.19 USD |
| `haikuX-opusO-s2` | Haiku | Opus | draw (25) | O (7) | O (8) | 2 / 0 | 0.35 USD |
| `haikuX-opusO-s3` | Haiku | Opus | O (10) | O (11) | draw (25) | 0 / 2 | 0.40 USD |
| `haikuX-sonnetO-s1` | Haiku | Sonnet | O (10) | O (9) | X (9) | 4 / 0 | 0.10 USD |
| `haikuX-sonnetO-s2` | Haiku | Sonnet | draw (25) | O (9) | X (9) | 3 / 0 | 0.21 USD |
| `haikuX-sonnetO-s3` | Haiku | Sonnet | draw (25) | X (8) | draw (25) | 0 / 0 | 0.35 USD |
| `opusX-haikuO-s1` | Opus | Haiku | O (8) | X (8) | X (7) | 0 / 2 | 0.17 USD |
| `opusX-haikuO-s2` | Opus | Haiku | draw (25) | draw (25) | X (9) | 0 / 0 | 0.59 USD |
| `opusX-haikuO-s3` | Opus | Haiku | X (9) | X (10) | X (7) | 0 / 8 | 0.18 USD |
| `sonnetX-haikuO-s1` | Sonnet | Haiku | O (8) | O (9) | X (9) | 3 / 2 | 0.08 USD |
| `sonnetX-haikuO-s2` | Sonnet | Haiku | X (9) | X (8) | O (10) | 0 / 0 | 0.12 USD |
| `sonnetX-haikuO-s3` | Sonnet | Haiku | X (9) | X (12) | O (8) | 0 / 0 | 0.14 USD |

(Game result with the number of moves played.) Cost 2.87 USD. Only the event logs (gzipped), the run header,
the public key and the usage are kept, as in runs 011 and 012.

## Problems

- **P410:** a resident that ended its turn on a stale board ("It's X's move now, so I'll check the board again
  when it's O's turn", A04 in `opusX-haikuO-s3`) got no new input when the move came to it, so the runner never
  asked its model again and the move timer played a random cell (8 forfeits in that match). The strong model
  plays propose and play in one answer, so the turn comes back before the slower Haiku seat has finished its
  own; the same bug as P104 in morris. **Fixed** after this run: the grid game tells the captain of the turn
  once per turn and minute; run 02a-015 repeats the matrix with the fix.

## Digest highlights, optimizations, loopholes

See run 02a-015, the comparable repeat. No loophole found.
