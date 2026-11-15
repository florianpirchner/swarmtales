# Salt Market

A negotiation game for four solo traders (A01-A04). In each game every trader holds a bundle of five goods (salt,
cloth, copper, spice, wax), values the perishable ones in secret and has a secret contract: a bundle that pays a bonus
if it is held at the game's end. The goods each trader needs sit mostly with the others. All goods move through a bank
that executes an offer only when both sides hold what it moves; part of each trader's goods arrives as a shipment at
the end of a later round and can be sold early only on credit (a plain promise kept with `give`, or escrow the bank
holds for a fee). Trades above a size pay a tax, one good spoils every round, and the deal rotates, so every trader
plays every position once in four games. Every game starts from a fresh context; a trader's only memory is a short
private "strategy brain" it rewrites before the first game and after each game but the last. The mechanic scores every game
against the optimal allocation, for the report only.

The game is a port of `stories/salt-market` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, the briefings are byte-identical, and the model block keeps the old entry's
lack of an output cap (the default of 4000 tokens). Its rules are the mechanic
[`salt-market`](../../mechanics/salt-market/README.md).

```
swt run games/salt-market/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `saltMarketGame(options)` and the default export (four traders, four games of six rounds, a brain per trader) |
| `briefing.ts` | what a trader reads before the run starts |
| `test/oracle.test.ts` | the four oracle files of `oracles/salt-market/` at level 3 (three up to their cut after game 2) |
| `test/carried.test.ts` | the sha256 of the briefings against the old platform, the tools, the model block, the run length, the old variant names |
| `test/salt-market.test.ts` | the game's part of the carried game test: a match of four rotated games with a brain per trader and a fresh context per game, a match where nobody acts |
| `test/fake.test.ts`, `test/standing.test.ts` | the fake run with an accepted call of every tool; replay and resume from every boundary on two games |

## Variants

The id is always `salt-market`; a variant is a set of options of `saltMarketGame`, not a name. The old registry names
map to options in `test/support.ts` (`VARIANTS`), and `test/carried.test.ts` pins them against the old parser.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 4 | games in the match (one full rotation of the deal) | `-g<n>` |
| `rounds` | 6 | trading rounds per game, one tick each | `-r<n>` |
| `spoil` | true | goods spoil at the end of each round but the last | `-nospoil` |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `-nobrain` |
| `maxWords` | 150 | the size of a brain | |
| `seed` | 41 | the seed of the run | |
| `ticks` | 42 | the length of the run: an upper bound from the rounds; the match ends the run earlier (the old option `minutes`) | |

## What the oracle files do not show

Games 3 and 4 of a played match (three files are cut after game 2; the silent file plays all four without a trade,
and the scripted match of `test/salt-market.test.ts` plays them with trades), promises and escrow beyond the one gift
and the one settled promise of `salt-market-s45.json`, other game and round counts. No mapping of `call.endsTurn` is
needed: the old mechanic never set the flag.

## Runs

No run on this platform yet. The recorded runs of the old platform are under `stories/salt-market/runs/` at the tag
`v0-final`.
