# Chess

Two solo seats (A01, A02) play a match of chess games with alternating colours (A01 is White in game 1).
The model never touches the board: it writes its move as text (`Nf3`, `exd5`, `O-O`, `e8=Q`, or `g1f3`),
and **chess.js** is the legality filter and the referee. An illegal or unreadable move is refused and the board
stays as it was; the refusal names the legal moves of the piece the seat wrote (by its from-square or piece
letter), never the whole list unless the variant shows it anyway; chess.js ends the game on checkmate, stalemate,
threefold repetition, the fifty-move rule or insufficient material. A game that reaches the move cap
(160 half-moves by default) is scored on material (a lead of 3 or more wins, else a draw). A seat that ends
three turns in a row on move without a legal move gets a random legal move played for it (seeded, so the
same in every replay); three such forfeit moves lose the game. A seat may resign on its own move.

Every game starts from a fresh context. The only memory a seat carries from one game to the next is its
private **strategy brain**, written before the first game and rewritten after each game. Every move is
scored for the human and the reporter against a **material baseline** (`move_scored`: one ply with a static
exchange check, so it sees hanging pieces and missed free captures, nothing deeper; it is not an engine).
The seats never see it. The design is in [docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.8.

```
swt run --story chess --provider scripted     # offline, no model
swt run --story chess                         # Haiku via Anthropic, two games, brain on
swt run --story chess-nobrain-moves-g4-p120   # four games, no brain, legal moves listed, cap 120 half-moves
```

Variants by name: `chess[-nobrain][-moves][-threats][-teams][-g<games>][-p<plies>]`. `-nobrain` is the control arm (the
same briefings, no brain, no retro); `-moves` lists every legal move in the position shown to the seat on
move (without it the list comes only with a refused move, so the refusal rate measures how well a model
keeps track of the board). `-threats` adds each side's loose pieces to the position every seat sees: pieces
attacked and undefended, or attacked by a cheaper piece (`queen g5 (attacked by knight f3, undefended)`), from
the same static check as the baseline (no pins, no x-rays); it tests whether naming the hanging piece stops
the queen blunders of P113. `-teams` plays two teams of two (A: A01, A02; B: A03, A04): the captain of a
move rotates within the side on move, only the captain may play it, and the teammate gets one advisor turn
per move to post a suggestion on the team channel (`postTeam`, `readTeam`); each team writes one shared
brain. Further options are factory options of `chessStory` in `story.ts`: `maxWords`,
`seed`, `minutes`. Mechanics: `chess` (chess.js 1.4, BSD-2-Clause), `strategy-brain` (solo seats).
Mechanics with `-teams`: also `team-channel`.

**Engine reference (lab only).** `pnpm lab:chess <run-dir> [--depth 14]` replays every game of a run with
Stockfish 10 (npm `stockfish.js`, GPL-3.0, a root dev dependency that no package and no live run imports) and
writes `analysis.json` and `ANALYSIS.md` into the run directory: centipawn loss per half-move against the
engine's best move, inaccuracies (50+), mistakes (100+), blunders (300+) and missed mates per game and side.
Depth 14 takes about a second per position. This is the number to quote for move quality; `move_scored` is
the cheap in-run check.

Runs and results: [runs/README.md](runs/README.md).
