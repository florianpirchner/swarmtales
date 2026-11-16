# Tic-tac-toe teams

Two teams of three residents (X: A01-A03, O: A04-A06) play a short match of tic-tac-toe. Before every move a team
agrees in its private chat and by vote; only the agreed cell can be played. Every game starts from a fresh context,
and the team's only memory is a short "strategy brain" it rewrites after each game. A silent referee scores every
move against minimax for the report; residents never see it.

The game is a port of `stories/tictactoe-teams` of the old platform (tag `v0-final`): the prompts, the tool names,
the options and their defaults are the same, and the briefings are byte-identical.

```
swt run games/tictactoe/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `tictactoeGame(options)` and the default export (three games, 3x3, a brain for both teams) |
| `briefing.ts` | what a resident reads before the run starts |
| `test/oracle.test.ts` | the nine oracle files of `oracles/tictactoe/` at level 3 |
| `test/carried.test.ts` | the sha256 of the briefings against the old platform |
| `test/tictactoe*.test.ts` | the four carried game tests (roster order) |

## Variants

The id is always `tictactoe`; a variant is a set of options of `tictactoeGame`, not a name.

| Option | Default | Meaning |
|---|---|---|
| `games` | 3 | games in the match |
| `size`, `line` | 3, 3 | the board and the marks in a row that win |
| `brain` | true | false is the control arm: the same result-only briefings, no brain, no retro |
| `brainTeams` | both | `["O"]`: only team O keeps a brain |
| `maxWords`, `maxRules` | 500, 0 | the size of a brain; with `maxRules` it is a list of rules (240 words) |
| `retroMaxPosts`, `retroMaxMinutes` | 4, 2 | the length of a retro window |
| `maxRounds` | 3 | rounds of proposal and vote per move before a random cell is played |
| `teamSize` | 3 | 1: one resident per side (A01 against A04) |
| `soloSide` | none | that side plays alone against a team of three |
| `fixedCaptain` | false | the first member of each team is its captain for the whole match |
| `seed`, `minutes` | 11, by `games` and `size` | the seed and the length of the run in ticks |

Mechanics: `grid`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee`.

## Runs

No run on this platform yet. The recorded runs of the old platform are under `stories/tictactoe-teams/runs/` at the
tag `v0-final`.
