# Nine men's morris

Two teams of three residents (X: A01 to A03, O: A04 to A06) play a match of nine men's morris on one board, the
tic-tac-toe teams setup on a bigger game. Before every move the team talks in its private chat, the captain of the
turn proposes a move, the two others vote, and only the agreed move can be played; a turn that closes a mill is
followed by a second agreed move, the piece to remove. A team that does not agree within its rounds gets a random
legal move, and six such moves in a row end the match as invalid. Every game starts from a fresh context; the only
memory across games is the team's strategy brain. The Referee scores every turn against an alpha-beta search, for
the report only; residents never see it. With `engineDepth` side O has no residents: the built-in search plays its
whole turn, step and removal, the moment it comes on move.

The game is a port of `stories/morris-teams` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, the briefings are byte-identical, and the model block keeps its output cap
of 16000 tokens. Its rules are the mechanics [`morris`](../../mechanics/morris/README.md) and
[`morris-referee`](../../mechanics/morris-referee/README.md), with [`consensus`](../../mechanics/consensus/README.md),
[`team-channel`](../../mechanics/team-channel/README.md) and [`strategy-brain`](../../mechanics/strategy-brain/README.md).

```
swt run games/morris/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `morrisGame(options)`, `ticksFor` and the default export (two teams of three, three games, a brain per team) |
| `briefing.ts` | what a resident reads before the run starts |
| `test/oracle.test.ts` | the five oracle files at level 3, with the Referee loaded (one file up to its cut) |
| `test/carried.test.ts` | the sha256 of the briefings of nine variants against the old platform, the tools, the model block, the run length, the old variant names |
| `test/morris.test.ts` | the game's part of the carried game test: a scripted match of two teams, a match nobody plays, a resident and a team against the search |
| `test/fake.test.ts`, `test/standing.test.ts` | the fake run; replay and resume from every boundary |

## Variants

The id is always `morris`; a variant is a set of options of `morrisGame`, not a name. The old names of the
oracle files map to options in `test/support.ts` (`VARIANTS`), and `test/carried.test.ts` pins them against the old
parser.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 3 | games in the match; the starting side alternates | `-g<n>` |
| `brain` | true | the teams keep a strategy brain; false is the control arm (same briefings, no brain, no retro) | `-nobrain` |
| `maxRounds` | 3 | rounds of proposal and vote per move before a random legal move | `-r<n>` |
| `maxTurns` | 120 | whole turns after which a game is a draw | `-t<n>` |
| `teamSize` | 3 | residents per side; 1 is a single resident per side (A01, A04) | `-solo` |
| `fixedCaptain` | false | the first member of each team is captain for the whole match | `-fc` |
| `engineDepth` | none | side O is the built-in search at this depth; the residents all play X | `-vs-engine<n>` |
| `maxQuietTurns` | 40 | turns without a mill after the placing after which a game is a draw | |
| `maxWords` | 300 | the size of a brain | |
| `refereeDepth` | 3 | whole turns the Referee's search looks ahead | |
| `seed` | 13 | the seed of the run | |
| `ticks` | 494 | the length of the run, the old `games * (ceil(maxTurns * 1.3) + 6) + 8`; the match ends the run earlier | |

## What the oracle files do not show

- **A played match of two teams of three.** The default is covered only by the silent file (six forfeits, then the
  match is invalid); `test/morris.test.ts` plays a scripted match of two teams, and tic-tac-toe teams covers the
  same consensus gate with recorded play.
- **A fixed captain and the turn limit** have no file.
- **`call.endsTurn`.** No file holds the flag, and neither the old nor the new `morris` sets it, so the files match
  without a mapping.

## Runs

No run on this platform yet. The recorded runs of the old platform are under `stories/morris-teams/runs/` at the tag
`v0-final`.
