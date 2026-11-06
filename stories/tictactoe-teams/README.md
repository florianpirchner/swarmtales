# Tic-tac-toe teams

Two teams of three residents (X: A01-A03, O: A04-A06) play a short match of tic-tac-toe. Before every
move a team agrees in its private chat and by vote; only the agreed cell can be played. Every game
starts from a fresh context, and the team's only memory is a short "strategy brain" it rewrites after
each game. The design and the experiments are in [docs/ideas/tictactoe-teams.md](../../docs/ideas/tictactoe-teams.md).

```
swt run --story tictactoe-teams --provider scripted     # offline, no model
swt run --story tictactoe-teams                         # Haiku via Anthropic, 3 games
```

Variants are factory options of `tictactoeStory` in `story.ts`: `games`, `brain: false` (the control
arm: identical result-only briefings, no brain), `brainTeams: ["O"]` (registered as `tictactoe-teams-brain-o`: only team O keeps a brain, X gets the result-only briefing and no retro), `maxWords`, `seed`. The biased gamemaker is not built.
Mechanics: `grid-game`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee`.

**Combinations by name.** `stories/index.ts` resolves `tictactoe-teams[-<N>x<N>][-nobrain|-brain-o][-r<rounds>]`: board size 3 to 8 (four in a row above 3x3), no brain or a brain for team O only, and the rounds of proposal and vote per move before a random cell is played (default 3). Examples: `tictactoe-teams-4x4`, `tictactoe-teams-5x5-nobrain-r6`. Mixed models: `--resident-model A04,A05,A06=openrouter/google/gemma-4-26b-a4b-it` ([docs/CLI.md](../../docs/CLI.md)). The referee scores only positions with at most 16 free cells. Runs and results: [runs/README.md](runs/README.md).

Two more suffixes: `-solo` (one agent per side, A01 against A04, no chat and no vote) and `-fc` (the first member of each team is its captain for the whole match). The story sets an output cap of 16000 tokens per call; with the default 4000, thinking models (Gemma 4, GLM) lose their turn inside their thinking (P94).
