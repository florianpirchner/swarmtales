# Chess

Two solo seats (A01, A02) play a match of chess games; the colours swap from game to game, and A01 is White in game
1. A move is text: chess.js reads it, plays a legal move and refuses an illegal one (the board stays), and ends the
game on mate, stalemate, repetition, the fifty-move rule or insufficient material. A move cap stops long games and
scores them on material; a seat that does not move gets a seeded legal move played for it, and three such moves lose
the game. Every game starts from a fresh context, and a seat's only memory is a short private "strategy brain" it
rewrites before the first game and after each game. The mechanic scores every move against a one-ply material
baseline for the report; the seats never see it.

The game is a port of `stories/chess` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, the briefings are byte-identical, and the model block keeps its output cap
of 16000 tokens. Its rules are the mechanic [`chess`](../../mechanics/chess/README.md).

```
swt run games/chess/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `chessGame(options)`, `ticksFor` and the default export (two seats, two games of at most 160 plies, a brain per seat) |
| `briefing.ts` | what a seat reads before the run starts |
| `test/oracle.test.ts` | the five oracle files of the default, the fresh context and the compact board at level 3 (three up to their cut), with the mapping of `endsTurn` below |
| `test/carried.test.ts` | the sha256 of the briefings against the old platform, the tools, the model block, the run length, the old variant names |
| `test/chess.test.ts` | the game's part of the carried game test: a match with a brain per seat (also with a fresh context and the compact board), the timer for seats that never move |
| `test/fake.test.ts`, `test/standing.test.ts` | the fake run; replay and resume from every boundary |

## Variants

The id is always `chess`; a variant is a set of options of `chessGame`, not a name. The old names map to options in
`test/support.ts` (`VARIANTS`), and `test/carried.test.ts` pins them against the old parser.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 2 | games in the match | `-g<n>` |
| `maxPlies` | 160 | half-moves after which a game is scored on material (a lead of 3 wins) | `-p<n>` |
| `fresh` | false | the seat on move starts every half-move from a fresh context: the rules, its brain, its last note, the position | `-fresh` |
| `compact` | false | the compact board: a grid without spaces and only the last 12 half-moves | `-compact` |
| `maxWords` | 150 | the size of a brain | |
| `seed` | 29 | the seed of the run | |
| `ticks` | 250 | the length of the run, the old `minutesFor(games, maxPlies)`: every half-move takes all three idle turns, every retro its two ticks; the match ends the run earlier | |

The legal-move list, the loose pieces, the coach, the teams, the control arm without a brain and the settled cap
(`-moves`, `-threats`, `-coach`, `-teams`, `-nobrain`, `-settle`) are the variants of the next chess issue.

## What the oracle files do not show

- **`call.endsTurn`.** No file of `oracles/` holds the flag, although the old mechanic set it on every accepted
  `playMove` and `resign`. `test/oracle.test.ts` writes it back into those call entries before the comparison;
  without that mapping the first difference of a file with a move is that flag.
- **The brain in a fake run.** `viewBoard` samples during a game only for the seat not on move, and between games
  only every second call, so a fake run reaches `readBrain` and `writeBrain` in the retro window (fixed by M4-28;
  `test/fake.test.ts` asks for an accepted call of all five tools).

## Runs

No run on this platform yet. The recorded runs of the old platform are under `stories/chess/runs/` at the tag
`v0-final`.
