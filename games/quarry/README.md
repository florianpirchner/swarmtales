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
| `test/frozen.test.ts` | `frozenHands`: no pick request shows a pick of the same step; off is the game of the oracle files |
| `experiments/`, `noise-floor.legacy.json` | the experiment specifications and the noise floor of the old platform |

## Variants

The id is always `quarry`; a variant is a set of options of `quarryGame`, not a name.

| Option | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 3 | games in the match | |
| `packs`, `packSize` | 2, 6 | pack rounds per game and cards per pack | |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro | `quarry-nobrain` |
| `openHands` | false | every seat sees every quarry during the game | `quarry-open` |
| `frozenHands` | false | with `openHands`: the quarries a seat is shown are those at the start of the running pick (see below) | |
| `burns` | false | a seat may destroy a card of the pack it passes on, two a game | `quarry-burn` |
| `maxWords` | 150 | the size of a brain | |
| `seed` | 29 | the seed of the run | |
| `ticks` | 84 | the length of the run: an upper bound from the picks; the match ends the run earlier | |

## Open quarries, live and frozen (LH18)

With `openHands` every pick request ends with a `Quarries:` line. The mechanic writes it from the live state, and the
seats of one pick are asked one after another. So a seat that is asked later sees the cards the seats before it kept
in this very pick, while the rules, the tool text and the briefing call the picks sealed and simultaneous. In the
gate's series 1292 of 1728 pick requests of the open arm showed such a pick (row LH18 of
[`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md)). The open arm therefore measures two things at once:
visible quarries, and a move order inside each pick.

`frozenHands: true` (together with `openHands`) takes the second away: every pick request of a pick shows the
quarries as they were when the pick opened, whatever the order of the seats. Nothing else changes: the label, the
rules, the tool texts and the briefings are the same. The option is off by default (decision A29): the default game
and the old open arm keep their game hash, the oracle files and the gate's result stay as recorded.
`test/frozen.test.ts` proves both over scripted matches of six seeds.

[`experiments/open-quarries-frozen.json`](experiments/open-quarries-frozen.json) is a small series for the effect:
paired, the control arm against `{ openHands: true, frozenHands: true }`, the first six seeds of the gate's series,
12 runs, at most 0.10 USD a run and 0.60 USD in all. It is exploratory and has no pass rule: with six pairs it
reports an estimate with its interval, to be read beside the gate's +84.5 (standard error 22.0, 12 pairs, live
line), and it gates nothing. Six pairs give a standard error of about 30 points, so the series can show whether the
effect stays clearly positive, not how much of the +84.5 was the move order. It has not been run yet.

## Runs

The runs of the old platform are readable at the tag
[`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry/runs) under
`stories/quarry/runs/`.
