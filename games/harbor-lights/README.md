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
| `test/oracle.test.ts` | every file of `oracles/harbor-lights/` at level 3 (`harbor-lights-nobrain-s37.json` up to its cut) |
| `test/carried.test.ts` | the sha256 of the twenty-four briefings and of the retro question against the old platform, the tool lists, the model block, the params behind every old variant name |
| `test/harbor-lights.test.ts` | the carried game test of the three arms, the retro question, the aid and hard strikes (roster order) |
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

## What is proven

Every file of `oracles/harbor-lights/` matches at level 3: the crew arm (`-g1-s103`, `-g1-s110`), `solo`, `nobrain`
(`-nobrain-s37` up to its cut), the aid (`-nobrain-aid-g1-s103`), hard strikes (`-hard-strikes-s13`) and the silent
file, which also exercises the move timer (`maxIdleMinutes: 2`, `maxConsecutiveForfeits: 24`). The crew's quiet chat
tools are locked through `ctx.access` while a game runs (M4-64), with the lock events of the old platform.

The turn lines keep the old hook numbers: the brain's lines, then the hint towers' status and record, then the team
chat. The load order alone would put the chat first (the strategy brain uses the team channel, the hint towers use the
brain), so the scheduler's `inputs` names `hint-towers` after `strategy-brain`; without it the crew files differ at
level 2 where a game begins with unread chat posts.
