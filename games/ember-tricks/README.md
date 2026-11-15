# Ember Tricks

An original trick-taking game with exact bidding for four solo seats (A01-A04). The deck has 40 cards in five suits
of different lengths: Ash 1-10, Brine 1-9, Cinder 1-8, Dust 1-7, Ember 1-6. A game has eight rounds; in round n every
seat gets n cards and bids, from the dealer's left, the exact number of tricks it will take. The lowest bidder (the
earliest on a tie) names the trump once every bid is public; a follower must follow the suit led. A hit scores 10 + 3
per trick, a miss costs 5 plus the error squared. Each seat has one veto per game to send a lead card back. There is
no chat; every round starts from a fresh context, and a seat's only memory across games is its own notes (a strategy
brain for a team of one), written in a short retro after each game.

The game is a port of `stories/ember-tricks` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults are the same, and the briefings are byte-identical. Its rules are the mechanics
[`trick-play`](../../mechanics/trick-play/README.md) and [`card-table`](../../mechanics/card-table/README.md).

```
swt run games/ember-tricks/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `emberTricksGame(options)`, the family `emberTricksFamily` and its default export (two games of eight rounds, notes on) |
| `briefing.ts` | what a seat reads before the run starts, as a function of the notes and the number of residents |
| `test/oracle.test.ts` | every file of `oracles/ember-tricks/` at level 3 (the calibration and bid-aid files up to their cut) |
| `test/carried.test.ts` | the sha256 of the eight briefings against the old platform, the tool lists, the model block, the turn lines, the params behind every old variant name |
| `test/ember-tricks.test.ts` | the carried game test: notes across games, the calibration line, the reference worth in the retro, the reset per round, the control arm (roster order) |
| `test/standing.test.ts`, `test/fake.test.ts` | the standing checks on two games of three rounds, and the fake run of both arms |

## Params

The id is always `ember-tricks`; a variant is a set of params of the family, not a name.

| Param | Default | Meaning | Old name |
|---|---|---|---|
| `games` | 2 | games in the match (1 to 20) | `-g<N>` |
| `rounds` | 8 | rounds of a game, round n deals n cards (1 to 10) | `-r<N>` |
| `brain` | true | each seat keeps notes across games; false is the control arm (same briefings, no notes, no retro) | `-nobrain` |
| `lever` | `none` | one bidding lever: `bidSum` (the bids so far against the round's tricks), `calibration` (the seat's bid-against-taken line in the record), `mcRetro` (that line with the Monte Carlo worth of its hands), `mcBid` (the line, and the hand's worth shown while bidding) | `-sum`, `-calib`, `-mcretro`, `-mcbid` |
| `maxWords` | 200 | the size of the notes | |
| `quietEnds` | false | a bid, trump, card or veto that leaves the seat off turn, and a written note, end the seat's turn (`endsTurn`), so the seat is not woken for the answer alone (P475: 40 % of the requests of `ember-tricks-001` were such turns, each reading "Not your turn"). Off, the seats are woken as on the old platform and the oracle files hold; the next series turns it on | |

The seed (23 when absent) and the run length (`games * (rounds * 6 + 6) + 6` ticks; the match ends the run earlier)
are options of `emberTricksGame`, not params. The old entry set no output cap, so the default of 4000 stands.

## What is proven

Every file of `oracles/ember-tricks/` matches at level 3: the whole one-game match `-g1-s31` (a replay of a live run),
the first game of the calibration lever and of the bid-aid lever (`-calib-g4-s32`, `-mcbid-g4-s32`, replays cut after
game 1) and the silent file of the registry default, in which the move timer forfeits for every seat until
`maxConsecutiveForfeits` calls the match off. The bid-aid file holds today's wording of the worth at the bid, not the
recording's (four turns of the recording differ; `oracles/ember-tricks/README.md`), and that is what the game shows.
The no-brain arm has no file (its first test failed on the old platform) and is proven by the carried tests only.

The turn lines keep the old hook numbers: the brain's reset and retro lines, then trick play's record and table. No
tool of trick play ends a turn, so no oracle test maps `call.endsTurn`. `test/quiet-ends.test.ts` shows the answer
turns after a seat's own move with `quietEnds` off, and none with it on.
