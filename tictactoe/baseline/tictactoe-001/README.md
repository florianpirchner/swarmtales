# tictactoe-001: the live baseline of tic-tac-toe (M6-24, run 1 of the rerun plan of M6)

| Item | Value |
|---|---|
| Game | `games/tictactoe/game.ts`, the default game (three games, 3x3, a brain for both teams, no gamemaker), seed 7 (the first fake seed of `games/index.ts`, not the game's own 11), purpose `exploratory` |
| Command | `swt run games/tictactoe/game.ts --seed 7 --provider anthropic --model claude-haiku-5-5 --budget 0.30 --ledger games/m6-ledger.jsonl --purpose exploratory --out $RUNS/tictactoe/baseline` (`$RUNS` a folder outside the work tree; `swt` is `node --conditions development apps/cli/src/bin.ts`) |
| Models | residents `A01` to `A06` (team X: A01 to A03, team O: A04 to A06) `anthropic/claude-haiku-5-5`, thinking medium, output cap 16000; no Director; pricing `pi-ai@1.4.0` (the manifest matches the plan's table in every line) |
| Code commit | `155d497e37377d46574f574556940e14f518589b`, runtime revision 8, `kernel.dirty: false`, Node v22.23.4 |
| Before the run | `swt doctor` (offline): six `ok`, no `fail` |
| Cost | 0.0785 USD of the cap 0.30, expected 0.10 (403 requests; 1266 input, 78107 output, 1915059 cache-read, 161528 cache-written tokens); the ledger line `exploratory/tictactoe-001` in `games/m6-ledger.jsonl` |
| End | the match was over after 24 ticks (`limit_reached` `grid.match`, #3487), exit code 0; 3488 lines; 11 minutes 18 seconds of wall time |
| Result | `grid.tally`: X 0, O 0, draw 3. `optimal-referee`: 15 moves scored, 15 `optimal` (the other 12 were moves where every cell is equal) |
| Checks | `swt log verify`: ok, 3488 lines; `swt replay --game games/tictactoe/game.ts`: equal, 3488 lines; `swt scan`: clean, 7 files, keys of 2 providers held; `REPORT.md` written with `--game` |
| Deviations | none from `docs/RERUN-PLAN-M6.md` |

## What happened

Three draws by perfect play, 27 moves, no forfeit; 28 proposals and 56 votes, every move agreed 2 for, 0 against, and
no proposal voted down (one was replaced by its captain, below).

- **Game 1** (X starts): 4, 0, 8, 6, 3, 5, 1, 7, 2. X took the centre and the opposite corner; O answered with corner 6,
  which the O retro later called the weak point ("we had to answer with an EDGE", A04 #1162), but X's forcing line
  only led to the draw.
- **Game 2** (O starts): 4, 0, 8, 2, 1, 7, 3, 5, 6.
- **Game 3** (X starts): 4, 0, 8, 2, 1, 7, 3, 5, 6, the same cells in the same order as game 2 with the sides swapped:
  each team opened in the centre, the other took corner 0, the opener took 8, and both brains then forced the same line
  (P85).

The one slip of the match was a misread board: in game 3 X's captain A01 proposed 3 as "a forced block" of O's 0-3-6,
with O on 6 (#3132, #3140); 6 was empty, and A03 corrected it (#3194, "6 is EMPTY ... Please re-check before
proposing"). A01 proposed 3 again for the right reason, naming the cause: "the label '6' is the empty cell" (#3203): the
board shows an empty cell by its number, and A01 read the digit as a mark (the render trap of P147, on 3x3). The cell
was the same, so the slip cost nothing.

The brains grew from 364 and 323 words (version 1, before game 1) to 486 and 482 (version 3), with 5 `BRAIN_TOO_LONG`
refusals (501 to 542 words against 500) and one `BRAIN_REPLAY` (A06 #2336: "The text replays the moves of game 1"); each
team got its version in on a later try. Their content stayed the textbook order (win, block, fork, block their fork,
centre, opposite corner, corner, edge) plus notes on the lines just played. Before game 1, O's retro closed at A04's
first write (#125, `reason: written`, the rule of the mechanic); A05's and A06's additions came after it, and A04's
rewrite was refused `TOOL_LOCKED` (#197; A04 #238: "The fork-defence correction did not make it in"). It went into
version 2 after game 1.

Read for this review: every move, score, consensus, refusal, team post and brain; the CLI's last lines; the cost of
every actor.

## Loopholes

None. The one attempt to carry a game's move list into the brain was refused by the mechanic's replay check (#2336).

## Problems

| Row | What | Solution |
|---|---|---|
| P77 | Haiku plays 3x3 perfectly again: 15 of 15 scored moves optimal, three draws, the brains restate textbook rules; the baseline shows no learning curve and none can be shown on 3x3 | open: as P77 proposes (4x4 with line 4, misere, or a weaker model on one team), a rule change for the owner |
| P85 | games 2 and 3 play the same nine cells in the same order (4, 0, 8, 2, 1, 7, 3, 5, 6) with the sides swapped | open: as P85 proposes (personas or a varied start), a proposal for the owner |
| P497 | `REPORT.md` has no result: `grid` and `optimal-referee` export no metrics, so the facts table holds neither the tally nor the referee's scores, which are the two things the plan says this run must show; they are read from the log (`game_ended`, `move_scored`) and from the CLI's last line (`result grid.tally`) | proposed: `grid` exports the tally per side and `optimal-referee` the scored and optimal moves, as the M4 ports do; open |

Also seen: 163 of 461 activations without a call; 9 refused calls (5 `BRAIN_TOO_LONG`, 2 `TOOL_LOCKED`, 1
`BRAIN_REPLAY`, 1 `NOT_ON_MOVE`); the second `TOOL_LOCKED` is A02 trying to play the agreed cell while A01 was the
captain (#967).
