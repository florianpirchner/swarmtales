# Morris teams

Two teams of three residents (X: A01-A03, O: A04-A06) play a match of **nine men's morris** on one
board: the tic-tac-toe teams setup on a game with real tactics. Each side has nine pieces; it places
them one per turn, then moves them along the lines, and with three left it may jump. Three in a line
(a mill) removes an opposing piece; a side with fewer than three pieces, or with no legal move, loses.
A game is a draw by threefold repetition, after 40 turns without a mill once all pieces are placed, or
at the turn limit (120 turns).

Before every move the team talks in its private chat, the captain of the turn proposes a move, the two
others vote, and only the agreed move can be played. A move is one number: a point (1-24) to place on,
`from * 100 + to` to move, and after a mill a second agreed move names the piece to remove. `viewBoard`
draws the board and lists every legal move with its number; the engine, not the model, checks legality.

Every game starts from a fresh context. The only memory across games is the team's **strategy brain**,
written before game 1 and rewritten after each game. The `morris-referee` scores every turn (a step
with its removal) against a depth-limited alpha-beta search (event `move_scored`: best, inaccuracy,
blunder, missed win, and whether a mill was missed), for the human and the reporter only. The design is
in [docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.8.

```
swt run --story morris-teams --provider scripted     # offline, no model
swt run --story morris-teams                         # Haiku via Anthropic, three games
swt run --story morris-teams-g1-t60-solo             # one game, 60 turns, one agent per side
swt run --story morris-teams-g6-solo-vs-engine2      # six games of one agent against the engine
```

**Against the engine** (`-vs-engine<depth>`, option `engineDepth`): side O has no residents. The same
alpha-beta search the referee uses plays it at the given depth (whole turns; ties broken by the seeded
random) the moment O comes on move, step and removal at once, so the residents' reply to `playMove`
already tells what the engine answered. The opponent is fixed and the same in both arms, so a brain
effect shows against one yardstick instead of against another model that learns too.

Registered arms: `morris-teams` (brain on) and `morris-teams-nobrain` (the same briefings, no brain, no
retro). Combinations by name: `morris-teams[-nobrain][-g<games>][-r<rounds>][-t<turns>][-solo][-fc][-vs-engine<depth>]`
(games in the match, rounds of proposal and vote per move before a random legal move is played, the
turn limit, one agent per side, a fixed captain, the engine on O). More options of `morrisStory` in `story.ts`:
`maxQuietTurns`, `maxWords`, `refereeDepth`, `seed`. Mechanics: `morris`, `consensus`, `team-channel`,
`strategy-brain`, `morris-referee`. Runs and results: [runs/README.md](runs/README.md).
