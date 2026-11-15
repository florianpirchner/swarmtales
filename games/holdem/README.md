# Hold'em

Four solo seats (A01-A04), or two heads-up, play a match of fixed-limit Texas Hold'em: several games of several
hands, the button one seat further each hand. The deals are duplicate: every game replays the same deals with the
seats moved one place, so over as many games as seats every seat plays every position's cards and the match totals
are free of the deal's luck. A seat sees only its own cards; there is no table talk. Every game starts from a fresh
context, and a seat's only memory is a short private "strategy brain" it rewrites before the first game and after
each game. The mechanic scores every decision against a simple equity baseline for the report; the seats never see
it.

The game is a port of `stories/holdem` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, the briefings are byte-identical, and the model block keeps its output cap
of 16000 tokens. Its rules are the mechanic [`holdem`](../../mechanics/holdem/README.md).

```
swt run games/holdem/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `holdemGame(options)` and the default export (four seats, four games of eight hands, a brain per seat) |
| `briefing.ts` | what a seat reads before the run starts, also at a mixed table |
| `test/oracle.test.ts` | the five oracle files of `oracles/holdem/` without the aid at level 3 (four up to their cut), with the mapping of `endsTurn` below |
| `test/carried.test.ts` | the sha256 of the briefings of eight tables against the old platform, the tools, the model block, the run length, the old variant names |
| `test/holdem.test.ts` | the game's part of the carried game test: a match with a brain per seat, the timer for seats that never act |
| `test/fake.test.ts`, `test/standing.test.ts` | the fake run with an accepted call of every tool; replay and resume from every boundary |

## Variants

The id is always `holdem`; a variant is a set of options of `holdemGame`, not a name. The old registry names map to
options in `test/support.ts` (`VARIANTS`), and `test/carried.test.ts` pins them against the old naming.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `seats` | 4 | players at the table, 2 to 6; 2 is heads-up | `-hu`, `-<n>max` |
| `games` | one per seat | games in the match (the full duplicate cycle) | |
| `hands` | 8 (12 heads-up) | hands per game | |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `-nobrain` |
| `duplicate` | true | false deals fresh cards in every game | |
| `maxWords` | 150 | the size of a brain | |
| `equitySamples` | the mechanic's 400 | Monte Carlo draws per scored decision | |
| `seed` | 41 | the seed of the run | |
| `ticks` | 206 (154 heads-up) | the length of the run: an upper bound from the hands; the match ends the run earlier | |

A table outside 2 to 6 seats is refused with `SWT-G041`, as the old game refused it. The mixed tables (`-mixed`: a
brain for some seats only) and the decision aid (`-aid-mixed`) are the params of M4-40; the briefing already takes
the brain seats.

## What the oracle files do not show

- **`call.endsTurn`.** No file of `oracles/` holds the flag, although the old mechanic set it on every `act` that
  passed the turn on or ended the hand. The flag follows from the reply, which level 2 compares (a reply that says
  "end your turn now"), and `test/oracle.test.ts` writes it back into the file before the comparison; without that
  mapping the first difference of a file with a call is that flag.
- **The aid and the mixed tables.** `holdem-aid-mixed-s7.json` is played by M4-40; no file has a mixed table of
  brain seats.

## Runs

No run on this platform yet. The recorded runs of the old platform are under `stories/holdem/runs/` at the tag
`v0-final`.
