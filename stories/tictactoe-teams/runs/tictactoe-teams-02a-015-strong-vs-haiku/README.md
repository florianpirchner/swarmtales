# tictactoe-teams-02a-015-strong-vs-haiku

Stronger models against Haiku on 5x5 tic-tac-toe (four in a row), run on 2026-11-11 after the P410 fix
(decided by the coordinator for Flo, who approved Sonnet and Opus runs where Haiku shows weaknesses). One agent
per side, no brain (`tictactoe-teams-5x5-nobrain-solo`), Haiku on one side and Opus or Sonnet on the other
(`--resident-model A01=anthropic/claude-opus-5-5` for X, `A04=...` for O), each pairing on both sides, seeds
1-3, 3 games per match (X opens games 1 and 3, O game 2), plus a Haiku-against-Haiku control on the same seeds.
The optimal referee scores the late positions it can search. **1 forfeit in 45 games** (against 27 before the
fix, run 02a-014).

## Result

| Folder | X | O | Game 1 (X opens) | Game 2 (O opens) | Game 3 (X opens) | Forfeits X / O | Cost |
|---|---|---|---|---|---|---|---:|
| `haikuX-haikuO-s1` | Haiku | Haiku | X (11) | O (9) | O (8) | 0 / 0 | 0.03 USD |
| `haikuX-haikuO-s2` | Haiku | Haiku | draw (25) | X (8) | O (8) | 0 / 0 | 0.05 USD |
| `haikuX-haikuO-s3` | Haiku | Haiku | X (9) | X (8) | O (8) | 0 / 0 | 0.02 USD |
| `haikuX-opusO-s1` | Haiku | Opus | O (8) | draw (25) | O (8) | 0 / 0 | 0.42 USD |
| `haikuX-opusO-s2` | Haiku | Opus | O (8) | draw (25) | X (9) | 0 / 0 | 0.47 USD |
| `haikuX-opusO-s3` | Haiku | Opus | O (10) | X (8) | O (8) | 0 / 0 | 0.23 USD |
| `haikuX-sonnetO-s1` | Haiku | Sonnet | O (16) | O (9) | X (9) | 0 / 0 | 0.16 USD |
| `haikuX-sonnetO-s2` | Haiku | Sonnet | draw (25) | O (9) | X (9) | 1 / 0 | 0.23 USD |
| `haikuX-sonnetO-s3` | Haiku | Sonnet | O (8) | X (10) | X (9) | 0 / 0 | 0.15 USD |
| `opusX-haikuO-s1` | Opus | Haiku | draw (25) | draw (25) | X (7) | 0 / 0 | 0.61 USD |
| `opusX-haikuO-s2` | Opus | Haiku | draw (25) | draw (25) | draw (25) | 0 / 0 | 0.87 USD |
| `opusX-haikuO-s3` | Opus | Haiku | O (8) | draw (25) | draw (25) | 0 / 0 | 0.61 USD |
| `sonnetX-haikuO-s1` | Sonnet | Haiku | O (8) | X (12) | X (9) | 0 / 0 | 0.12 USD |
| `sonnetX-haikuO-s2` | Sonnet | Haiku | X (9) | draw (25) | O (8) | 0 / 0 | 0.23 USD |
| `sonnetX-haikuO-s3` | Sonnet | Haiku | X (9) | X (8) | X (9) | 0 / 0 | 0.10 USD |

(Game result with the number of moves; a draw fills all 25 cells.)

| Stronger model | As X: W / L / D | As O: W / L / D | Total W / L / D | Draws | Cost |
|---|---|---|---|---:|---:|
| Opus against Haiku | 1 / 1 / 7 | 5 / 2 / 2 | 6 / 3 / 9 | 50 % | 3.21 USD |
| Sonnet against Haiku | 6 / 2 / 1 | 4 / 4 / 1 | 10 / 6 / 2 | 11 % | 0.99 USD |
| Haiku against Haiku (control) | | | X 4 / O 4 / draw 1 | 11 % | 0.10 USD |

Cost 4.30 USD for 45 games. Wall time about 15 minutes, all 15 matches in parallel.

## Digest highlights

- **Opus does not lose, it shuts the board.** Opus loses 3 of 18 games to Haiku (Sonnet 6 of 18) but draws
  half of them; as X it draws 7 of 9. Its reasons are prophylaxis, not attack: "Kills O's only live line
  (5-11-17-23 diagonal) and starts row 4", "Column 0 is the only live line left for either side", then
  "No live lines remain; game is a draw. Filling a free cell" (`opusX-haikuO-s2`). It counts dead lines and
  stops playing for a win once none is left.
- **Sonnet wins more, and loses more.** Sonnet takes 10 of 18 games from Haiku, the most wins in the matrix,
  and loses 6; its games are short (8 to 16 moves) like Haiku's own.
- **Haiku beat Opus with the same trap Opus uses.** In `opusX-haikuO-s3` game 1 Opus played 12, 13, 8;
  Haiku answered 6, 11, 16, an open three in column 1 with both ends free, and won on move 8 ("X can only stop
  one"). In `haikuX-opusO-s1` game 1 the very same eight moves (12 6 13 11 8 16, then a block and the win) give
  Opus its win over Haiku. The opening that loses is the same for both models.
- **The forfeits are gone.** 1 forfeit in 45 games against 27 in the same matrix before the fix (P410).

## Problems

- **P411:** stronger models beat Haiku on 5x5, but not by much: Opus wins 6 and loses 3, Sonnet wins 10 and
  loses 6 of 18 games each. Sample of 9 games per side and pairing.
- **P412:** Opus plays for the draw once it sees no winning line; as X (the side that opens two of three
  games) it wins 1 of 9. A draw-heavy player hides how strong it is in a win count.
- **P201-like limit:** the optimal referee scores only the late positions it can search (46 scored moves in
  45 games: 43 optimal, 2 blunders (one Opus, one Haiku), 1 missed win), so it cannot show where the decided games
  went wrong; the openings decide.
- The story id omits `-nobrain` (`tictactoe-teams-5x5-solo` in `000-run.json`); the brain is off (no retro).
- The run reporter was not run (as in runs 011 and 012); this README is the hand-written report.

## Optimizations (proposals, not built)

- Score the opening with a cheaper measure (count of open threes allowed, or a depth-limited search with a
  threat heuristic), so the referee says something about the moves that decide 5x5 games.
- Opus against Sonnet directly, and Opus against the optimal referee as an opponent on 4x4 (a known draw),
  to see whether Opus ever loses a drawn game.
- Count "draw by dead board" as a skill signal: a player that kills every line of the opponent is playing
  well, even without a win.

## Loopholes

None found.
