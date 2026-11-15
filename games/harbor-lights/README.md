# Harbor Lights

A cooperative card game of hidden hands for a crew of four (A01-A04). The harbour wall has five signal towers
(Amber, Cobalt, Moss, Rose, Violet), each lit from rank 1 to 7. Every seat holds four cards it cannot see and sees
everyone else's. On a turn a seat gives a signal (all cards of one suit or one rank in a teammate's hand; six signal
tokens), plays a slot (lit if it is the tower's next rank, else a misfire and a strike), or discards a slot to win a
signal back. Every card exists once, and a lost card is bridged: its tower skips the gap, so a loss costs exactly one
point. The score is the number of cards lit, less 3 points for every misfire from the second on (soft strikes).
Every deal is also played by a crew of reference bots, for the report only.

The game is a port of `stories/harbor-lights` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, and the briefings are byte-identical. Its rules are the mechanics
[`hint-towers`](../../mechanics/hint-towers/README.md) and [`card-table`](../../mechanics/card-table/README.md).

```
swt run games/harbor-lights/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `harborLightsGame(options)`, the family `harborLightsFamily` and its default export (three games, the crew brain) |
| `briefing.ts` | what a seat reads before the run starts, as a function of the arm, the strikes and the number of residents |
| `test/oracle.test.ts` | the files of the arms `solo` and `nobrain` of `oracles/harbor-lights/` at level 3 (`harbor-lights-nobrain-s37.json` up to its cut), and the silent file (see below) |
| `test/carried.test.ts` | the sha256 of the twenty-four briefings and of the retro question against the old platform, the tool lists, the model block, the params behind every old variant name |
| `test/harbor-lights.test.ts` | the carried game test of the arms `solo` and `nobrain` (roster order) |
| `test/standing.test.ts`, `test/fake.test.ts` | the standing checks on one game, and the fake run of each arm |

## Params

The id is always `harbor-lights`; a variant is a set of params of the family, not a name.

| Param | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 3 | games in the match (1 to 20) | `-g<N>` |
| `brain` | `crew` | `crew`: one shared brain, a team chat open only between games, a rotating captain writes it; `solo`: private notes, no chat; `nobrain`: nothing kept | `-solo`, `-nobrain` |
| `strikes` | `soft` | `soft`: strikes never end the game, every misfire from the second on costs 3 points; `hard`: the third strike ends the game | `-hard-strikes` |
| `aid` | false | every own slot shows the chance that a play lights it now (P430) | `-aid` |
| `maxWords` | 150 | the size of a brain | |

The seed (31 when absent) and the run length (`games * 33 + 7` ticks; the match ends the run earlier) are options of
`harborLightsGame`, not params.

## What is proven, and what comes with M4-24

The files of the arms `solo` and `nobrain` match at level 3. The silent file is the registry default, the crew arm:
until M4-64 the crew's quiet chat tools are closed by the lock handler of `hint-towers`' pipeline, which writes no
lock events, so the file matches at level 2, and at level 3 once its eight lock events of `hint-towers` are taken
out. The crew files, the aid and hard strikes are issue M4-24.
