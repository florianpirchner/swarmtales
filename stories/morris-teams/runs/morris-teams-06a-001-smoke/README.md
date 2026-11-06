# morris-teams-06a-001-smoke

First live run of `morris-teams` (core story, `swt run --story morris-teams-g1 --provider anthropic --model haiku`):
six Haiku residents in two teams of three (X: A01-A03, O: A04-A06), seed 13, **one game** (the `-g1` arm),
strategy brain on (written once, before the game), no personas, no gamemaker. Run on 2026-11-06. A short
smoke test on Flo's ask; extensive runs come later.

**Result. O won 8 pieces to 2 after 54 turns** (52 virtual minutes, 27 minutes of wall time). No forfeit,
no illegal move played (the gate refused two illegal proposals), 70 proposals and 62 agreements, 8 votes
against (7 of them in team X). The signed log verifies (`swt log verify`). **Cost 0.485 USD**, 857 requests
(the roadmap guessed 0.2-0.5 USD per game); the reporter draft cost 0.007 USD more (OpenRouter).

| Side | Mills | Turns scored best | Inaccuracy | Blunder | Missed win |
|---|---:|---:|---:|---:|---:|
| X (A01-A03) | 1 | 23 | 3 | 1 | 0 |
| O (A04-A06) | 7 | 19 | 5 | 0 | 3 |

Classes from `move_scored` (depth-3 alpha-beta), with the noise rule built after this run applied by hand
(a loss under 12 points counts as best; the run itself recorded 19 more "inaccuracies" of 2-10 points, P102).
X's one blunder is its last turn, where every move lost. O's three missed wins are slower wins it then
played out.

## Digest highlights

- **X won the placing with a fork.** A02 found that 12 threatens both 10-11-12 and 7-12-16 (#979), A01
  checked that O could block only one (#1036), and X closed 10-11-12 at turn 11.
- **O's last placement set up the game.** A06 placed 18 so that 20 to 17 closes 16-17-18 "and X has no piece
  next to 17 to block it" (#2020). X saw it coming (#2108: "we can't block 17") and argued for a full minute
  over the least bad answer (#2138, #2147, #2155).
- **A running mill decided it.** From turn 20 O shuttled its piece between 17 and 20, closing 16-17-18 again
  every second turn (turns 20, 26, 32, 36, 40) and removing a piece each time, plus a second mill 9-13-18 at
  turn 22. X named the cycle (#2763, "its 17 can step to 20 and re-close") and tried to post a piece next to
  20 (#3332, #3735), but O removed exactly that piece every time (#3592: "Removal: X's 19, which is adjacent
  to 20").
- **The team did real tactics, in the chat.** Captains proposed with threat checks ("X has no one-move
  mill", #2020, #4527), voters vetoed weak moves with a reason (A03 #3091: the threat "gains nothing" because
  O's re-close removes the threatening piece), and O avoided a threefold repetition when ahead (#5593).
- **The end was clean.** With three pieces X flew to plug the runner's squares (#4735, #4920, #5080) until
  every piece was pinned: "all three of ours are pinned ... O mills next turn and we drop to 2" (A01, #5727).
  O closed 2-5-8 at turn 54 and won.

## Loopholes

None seen. No resident played out of turn, a move the team had not agreed, or an illegal move; the gate
refused two illegal proposals and six playMove calls by non-captains. The reporter's candidates are not
loopholes: the running mill is the classic tactic of the game (the rules allow it, and humans play it the
same way), the repetition note was O *avoiding* a draw (#5593), and the votes without a proposal were
refused (NO_OPEN_PROPOSAL).

## Problems

| # | Problem | Solution |
|---|---|---|
| P100 | **One game costs about 0.5 USD and half an hour.** 54 turns took 857 requests (about 16 per turn, with team chat and votes) and 27 minutes of wall time; a 3-game match is about 1.5 USD and 1.5 hours, a 10-match series 15 USD. | open: run the `-solo` arm (one agent per side, about a fifth of the calls) for wide sweeps and teams only for the team question; measure before planning a series |
| P101 | **Residents misread the board picture.** A02 got "stuck on the cells around 13 and 14, since the spacing in the grid text is hard to line up" (#1693); A03 took 4 and 5 for free (#5298) and voted against the only good block before correcting itself (#5373); A04 voted against a removal because it thought the mill was not closed yet (#5817). | built after the run: viewBoard also lists the points of each side and the free points ("X pieces on: ..."), so a resident need not parse the picture |
| P102 | **The referee's classes were noisy.** A loss of 2-10 points (one open two) was called an inaccuracy, 19 times; a slower forced win was a "missed win" (3 times) although O won. | built after the run: a loss under 12 points counts as best. Open: count a missed win only when the game is not won later, or search deeper in the endgame |
| P103 | **The reporter misread the protocol.** Its draft calls writeBrain "locked for most residents" (#114: A04 tried again after its own brain was saved and the window had closed) and repeats the city metrics (levels, submissions) of P89. | open (P89): a core-story report mode; this README is the reviewed report |

## Notes

- The O retro captain A04 wrote the first brain at once (#85), before its team had posted; team X discussed
  first and A01 wrote at #123. Both brains are generic placing principles (junctions first, block open twos,
  watch double threats); neither mentions running mills, which is what decided the game. With one game there
  was no retro after it, so this run says nothing yet about learning.
- Minor protocol noise as in tic-tac-toe: 6 votes with no open proposal, 6 playMove calls by non-captains
  (TOOL_LOCKED), one castVote without its reason, one brain of 303 words (limit 300) refused and rewritten.
- The reporter draft is `run/REPORT.md` (DeepSeek via OpenRouter); see P103.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
