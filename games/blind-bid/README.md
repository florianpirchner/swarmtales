# Blind Bid

Four solo seats (A01-A04) bid on a series of lots with sealed bids and a purse of coins per game. Each game sells
six lots of three kinds, two each: pay-your-bid and pay-the-runner-up lots with private values, and shared-worth
lots with one hidden worth and a noisy estimate per seat (the winner's curse). A match is several games; each starts
from a fresh context, a full purse and fresh lots, and a seat's only memory is a short private "strategy brain" it
rewrites before the first game and after each game. The mechanic scores each game against closed-form single-lot
references (equilibrium shading, truthful bidding, the curse-free ceiling) for the report; the seats never see it.

The game is a port of `stories/blind-bid` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, the briefings are byte-identical, and the model block sets no output cap
(the default of 4000 stands, as in the old entry). Its rules are the mechanic
[`sealed-auction`](../../mechanics/sealed-auction/README.md).

```
swt run games/blind-bid/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `blindBidGame(options)` and the default export (three games of six lots, a brain per seat) |
| `briefing.ts` | what a seat reads before the run starts |
| `test/oracle.test.ts` | the five oracle files of `oracles/blind-bid/` at level 3, and a control that another arm or lot order differs |
| `test/carried.test.ts` | the sha256 of the briefings of both arms against the old platform, the tools, the model block, the run length, the old variant names |
| `test/blind-bid.test.ts` | the game's part of the carried game test: a match with a brain per seat, the control arm, the timer for seats that never bid |
| `test/fake.test.ts`, `test/standing.test.ts` | the fake run with an accepted call of every tool; replay and resume from every boundary |

## Variants

The id is always `blind-bid`; a variant is a set of options of `blindBidGame`, not a name. The old registry names
(`blind-bid[-nobrain][-g<games>]`, and the first name `lantern-auction` for the default) map to options in
`test/support.ts` (`VARIANTS`), and `test/carried.test.ts` pins them against the old parser.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 3 | games in the match (the old parser took 1 to 20) | `-g<games>` |
| `lots` | first-price, second-price, common, first-price, common, second-price | the kinds of each game's lots, in order | |
| `purse` | 100 | coins per seat and game | |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `-nobrain` |
| `maxWords` | 150 | the size of a brain | |
| `seed` | 31 | the seed of the run | |
| `ticks` | 48 | the length of the run: an upper bound from the lots; the match ends the run earlier | |

## What the oracle files do not show

- **`call.endsTurn`.** No file holds the flag, and none needs it: the old mechanic never set it (no tool of
  `sealed-auction` ends a turn), so no mapping is applied.
- **Today's wording.** `blind-bid-s31-live.json` replays a live run; 12 of its 104 turns show inputs worded as the
  old code wrote them at the freeze, not as the recording had them (`source.fidelity`). Level 3 compares against the
  file, so it proves the frozen wording.
- **The order of the turn lines.** The game names its input sources in the order of the old hook numbers (the reset
  line, the brain, the auction). The brain's game opening is the reset line itself, and no file has a turn in which
  another brain line meets an auction line, so the files do not tell this order from the load order.
- **Ties and long matches.** No tie broken by the seeded draw occurs, and no file has more than three games.

## Runs

No run on this platform yet. The one recorded run of the old platform is under `stories/blind-bid/runs/` at the tag
`v0-final`.
