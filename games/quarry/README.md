# Quarry

Four solo seats (A01-A04) play a match of drafting games. In each game every seat opens packs of cards, keeps one
card per pick and passes the rest around the table; at the end every quarry scores the square of each resource it
holds and a bonus for strictly the most of a resource. Every game starts from a fresh context, and a seat's only
memory is a short private "strategy brain" it rewrites before the first game and after each game. The mechanic
scores every pick against the greedy pick and every game against four greedy seats on the same deal, for the report
only; residents never see it.

The game is a port of `stories/quarry` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, and the briefings are byte-identical. Its rules are the mechanic
[`draft-rounds`](../../mechanics/draft-rounds/README.md).

```
swt run games/quarry/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `quarryGame(options)` and the default export (three games, two pack rounds of six cards, a brain per seat) |
| `briefing.ts` | what a seat reads before the run starts |
| `test/oracle.test.ts` | the six oracle files of `oracles/quarry/` at level 3 (`quarry-open-s59.json` up to its cut) |
| `test/carried.test.ts` | the sha256 of the eight briefings against the old platform, the tool names, the id |
| `test/quarry.test.ts` | the carried game test (roster order) and the bot test of the burn (P123) |
| `experiments/`, `noise-floor.legacy.json` | the experiment specifications and the noise floor of the old platform |

## Variants

The id is always `quarry`; a variant is a set of options of `quarryGame`, not a name.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 3 | games in the match | |
| `packs`, `packSize` | 2, 6 | pack rounds per game and cards per pack | |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `quarry-nobrain` |
| `openHands` | false | every seat sees every quarry during the game | `quarry-open` |
| `burns` | false | a seat may destroy a card of the pack it passes on, two a game | `quarry-burn` |
| `maxWords` | 150 | the size of a brain | |
| `seed` | 29 | the seed of the run | |
| `ticks` | 84 | the length of the run: an upper bound from the picks; the match ends the run earlier | |

## Runs

The runs of the old platform are readable at the tag
[`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry/runs) under
`stories/quarry/runs/`.
