# Chess

Two solo seats (A01, A02) play a match of chess games with alternating colours (A01 is White in game 1).
The model never touches the board: it writes its move as text (`Nf3`, `exd5`, `O-O`, `e8=Q`, or `g1f3`),
and **chess.js** is the legality filter and the referee. An illegal or unreadable move is refused with the
list of legal moves and the board stays as it was; chess.js ends the game on checkmate, stalemate,
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

Variants by name: `chess[-nobrain][-moves][-g<games>][-p<plies>]`. `-nobrain` is the control arm (the
same briefings, no brain, no retro); `-moves` lists every legal move in the position shown to the seat on
move (without it the list comes only with a refused move, so the refusal rate measures how well a model
keeps track of the board). Further options are factory options of `chessStory` in `story.ts`: `maxWords`,
`seed`, `minutes`. Mechanics: `chess` (chess.js 1.4, BSD-2-Clause), `strategy-brain` (solo seats).
Runs and results: [runs/README.md](runs/README.md).
