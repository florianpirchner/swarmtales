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
arm: identical result-only briefings, no brain), `maxWords`, `seed`. The biased gamemaker is not built.
Mechanics: `grid-game`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee`.
