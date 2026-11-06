# chess-02a-001-smoke

First live run of `chess` (core story, `swt run --story chess-p80 --provider anthropic --model haiku`): two Haiku
seats, seed 29, two games with alternating colours, the move cap lowered to 80 half-moves (40 moves each) to keep
the smoke short, strategy brain on, legal moves not listed. Run on 2026-11-06. A short smoke test; extensive
runs come later.

**Result.** The match finished in 30 virtual minutes (130 allowed), 158 half-moves in two games. Game 1 (A01
White): a Ruy Lopez, stopped at the move cap with Black a rook ahead (material 10 to 6), so **A02 won 0-1 on
material**. Game 2 (A02 White): another Ruy Lopez (the Open variation, 7...Nxe4), traded down to a level minor-piece
ending and **drawn by threefold repetition** at move 39. Final points A02 1.5, A01 0.5. The signed log verifies
(`swt log verify`). **Cost 0.153 USD**, 232 requests, most input from the cache (6.77M cached tokens). The
reporter draft cost 0.003 USD more (OpenRouter).

| Game | White | Result | How | Half-moves | Refused moves | Forfeit moves | Blunders (baseline, loss >= 3) |
|---|---|---|---|---:|---:|---:|---|
| 1 | A01 | 0-1 | move cap, on material (10 to 6) | 80 | 0 | 0 | A01 7, A02 5 |
| 2 | A02 | 1/2-1/2 | threefold repetition | 78 | A01 3 | 0 | A01 1, A02 0 |

## Digest highlights

- **Haiku plays real openings, in from-to notation.** Both games are main-line Ruy Lopez (3. Bb5 a6 4. Ba4 Nf6
  5. O-O Be7 6. c3); nearly every move was written as squares (`e2e4`, `g1f3`) rather than SAN. chess.js read
  all of them.
- **Illegal moves are rare when the board is shown.** 3 refused moves in 158 half-moves (1.9 %), all by A01 in
  game 2: `c8g4` through its own d7 pawn (#1157), `e2c2` (#1382), `d7d5` onto its own king's square (#1686). Each
  time the refusal listed the legal moves and the next try was legal. No forfeit move, no idle turn.
- **Both sides missed mate in one, back to back.** Game 1, move 37: White played Rg1 where Rc8# mated (#835);
  Black answered Rxg1+ where Rh2# mated (#844). Checked with chess.js. The baseline flags both (loss 100).
- **The tactics are where Haiku breaks.** Game 1 swung on hanging rooks from move 26 on (26. Re8+ dropped the
  exchange, then a run of loose rooks and missed captures on e3 and d4, #624-#703); the baseline counts 12
  blunders in game 1 and one in game 2.
- **A chosen draw.** In game 2 A01 shuffled the bishop on purpose: "Safe shuffle toward a draw by repetition or
  move cap, material equal" (A01 transcript, move 37); A02 shuffled its knight, and chess.js called the threefold
  repetition. Legal chess, not a loophole.
- **The brains learn the right lesson in words.** A01 after game 1: "I lost game 1 by missing a rook recapture
  on e8 ... Re-scan lines after each capture" (#916); A02: "check for hanging pieces, including after
  recaptures ... watch back-rank mates" (#929). Game 2 had one baseline blunder instead of twelve, but it was
  also a quieter game, so this is no evidence yet.

## Loopholes

None seen. No seat tried to move out of turn (`playMove` is locked for the waiting seat), no move bypassed
chess.js, the baseline's verdicts and the refused attempts stayed with the human (audience `human`). The
reporter's two loophole candidates ("a private chess match that ignores the city", "a draw by repetition") are
its city framing (P89) and legal chess.

## Problems

| # | Problem | Solution |
|---|---|---|
| P110 | **Mate in one is invisible to Haiku.** Both seats missed a mate in one on consecutive moves (game 1, move 37), although each brain said "check for mate-in-one before anything else" (#22). | open: the skill being measured; compare with the `-moves` arm and a "list checks first" brain from the library |
| P111 | **The material baseline is noisy at a loss of 1.** A one-ply check sees the Ruy Lopez pawn on e4 as hanging (it is a known pseudo-sacrifice), so 31 of 158 moves are "inaccuracies"; only the blunders (loss >= 3) read right. chess.js is too slow for a real search (it builds two FENs per verbose move: 1-15 s per move at two plies). | fixed after this run: Stockfish 10 as a lab-only reference (`pnpm lab:chess`); engine numbers for this run in `run/ANALYSIS.md` (ACPL 212/196 in game 1, 63/68 in game 2; 12 blunders, 2 missed mates) |
| P112 | **The brain's replay check does not cover chess.** It compares integer cell lists; a chess brain can hold move text. A01's brain v2 notes "Ruy Lopez with c3/d4 was fine ... keep this structure" (#916): an opening plan, not yet a transcript, but nothing would stop one. | fixed after this run: `replaysLine` refuses a brain that holds 8 consecutive half-moves of a played game |
| P89 | **The run reporter is still city-shaped** (seen again). The draft counts levels and submissions ("never submitted a move"), 333 log issues for the mechanics' own events, and states game 2 ran to the move cap (it ended by repetition). | open (see P89 in the lessons log); this README is the reviewed report |

## Notes

- Cost per half-move about 0.001 USD; a full 160-half-move game would cost roughly 0.2-0.4 USD with Haiku (the
  context grows within a game). The roadmap guessed two to five times a morris game (0.4-2.5 USD); the low end holds.
- Changed after this run: the story sets the output cap to 16000 tokens per call (as tic-tac-toe, P94), for
  thinking models in later runs; Haiku did not hit the 4000 cap here.
- The reporter draft is `run/REPORT.md` (DeepSeek via OpenRouter); its city metrics and log issues are P89.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
