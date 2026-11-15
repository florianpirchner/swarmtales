# Liar's dice

Four solo seats (A01-A04) play a match of liar's dice. In each game every seat rolls its dice in secret every round;
the seats bid in turn on how many dice of a face the whole table holds, each bid higher than the last, until one
calls the last bid a lie. The call shows every die and the wrong side loses a die; the last seat with dice wins the
game. Ones are wild. A bid may carry a short public remark, true or not. Every game starts from a fresh context, and
a seat's only memory is a short private "strategy brain" it rewrites before the first game and after each game but the last. The
mechanic scores every decision against a simple probability baseline for the report; the seats never see it.

The game is a port of `stories/liars-dice` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, the briefings are byte-identical, and the model block keeps its output cap
of 16000 tokens. Its rules are the mechanic [`liars-dice`](../../mechanics/liars-dice/README.md).

```
swt run games/liars-dice/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `liarsDiceGame(options)` and the default export (four seats, three games, four dice, talk and a brain per seat) |
| `briefing.ts` | what a seat reads before the run starts |
| `test/oracle.test.ts` | the six oracle files of `oracles/liars-dice/` at level 3 (three up to their cut), with the mapping of `endsTurn` below |
| `test/carried.test.ts` | the sha256 of the briefings of nine tables against the old platform, the tools, the model block, the old variant names |
| `test/liars-dice.test.ts` | the game's part of the carried game test: a match with a brain per seat, the timer for seats that never act |
| `test/fake.test.ts`, `test/standing.test.ts` | the fake run with an accepted call of every tool; replay and resume from every boundary |

## Variants

The id is always `liars-dice`; a variant is a set of options of `liarsDiceGame`, not a name. The old names map to
options in `test/support.ts` (`VARIANTS`), and `test/carried.test.ts` pins them against the old parser.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `seats` | 4 | players at the table, 2 to 6; 2 is heads-up | `-hu`, `-3p`, `-5p`, `-6p` |
| `games` | 3 | games in the match | `-g<n>` |
| `dice` | 4 | dice per seat at the start of a game | `-d<n>` |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `-nobrain` |
| `talk` | true | false: no public remark with a bid or a call | `-quiet` |
| `maxWords` | 150 | the size of a brain | |
| `quietEnds` | false | a written brain ends the writer's turn (`endsTurn`), so the writer is not woken for the answer alone, with an empty input before the game (P474). Off, the seats are woken as on the old platform and the oracle files hold; the next series turns it on (`test/quiet-ends.test.ts`) | |
| `seed` | 53 | the seed of the run | |
| `ticks` | 192 | the length of the run: an upper bound from the dice; the match ends the run earlier | |

A table outside 2 to 6 seats is refused with `SWT-G041`, as the old game refused it.

## What the oracle files do not show

- **`call.endsTurn`.** No file of `oracles/` holds the flag, although the old mechanic set it on every bid and call
  that passed the turn on. The flag follows from the reply, which level 2 compares (a reply that says "end your
  turn now"), and `test/oracle.test.ts` writes it back into the file before the comparison; without that mapping the
  first difference of every file with a call is that flag.
- **Resume with a standing bid (open).** Resumed from a snapshot taken while a bid stands, the log differs from the
  straight log in the key order of `standing` in `dice_decision_scored` only: the snapshot file sorts the keys of
  the state, and the mechanic copies the bid as it is. The fix belongs to `mechanics/liars-dice`;
  `test/standing.test.ts` pins the difference until then.

## Runs

No run on this platform yet. The recorded runs of the old platform are under `stories/liars-dice/runs/` at the tag
`v0-final`.
