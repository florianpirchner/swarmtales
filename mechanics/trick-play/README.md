# Trick play

A trick-taking game with exact bidding (the rules of [Ember Tricks](../../games/ember-tricks/README.md)), played by
solo seats on the [card table](../card-table/README.md). Each round every seat bids how many tricks it will take
exactly; a hit pays, a miss costs the square of the error. The mechanic enforces every rule and counts every trick;
the residents only bid, name trump, play cards and may veto a lead once per game.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-trick-play` |
| Id | `trick-play` |
| Summary | A trick-taking game with exact bids, a trump named by the lowest bidder, follow-suit tricks, a lead veto and hit-or-miss scoring. |
| Requires | `card-table` (from [card-table](../card-table/README.md)) |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `trick-play`, `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [ember-tricks](../../games/ember-tricks/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Rounds.** A game is a list of `rounds` (cards dealt per seat); a match is `games` games. The dealer rotates by
   round and game; the deal is the card table's `("card-table", "deal", n)`. A round longer than the deck allows, or
   fewer than two seats, stops the run at its start.
2. **Bids.** Every seat bids in turn from the dealer's left with `placeBid` (0 to the round's cards, else
   `BID_TOO_HIGH`); bids are public (`bid_placed`). With `trump: "lowestBidderNames"` the lowest bidder (the earliest
   on a tie) names the trump suit with `nameTrump` once all bids are public (`UNKNOWN_SUIT` for a suit not in the
   deck; any case is read).
3. **Tricks.** The first bidder leads with `playCard`; a follower must follow the suit led when it can
   (`MUST_FOLLOW`); the highest trump, else the highest card of the suit led, wins (`trick_won`) and leads next. Right
   after a lead the next seat may spend its veto token (`vetoLead`, `vetoTokens` per game): the lead card goes back to
   the leader's hand at the card table, and the leader must lead another suit (`lead_vetoed`, then `VETOED_SUIT`).
   A veto is refused with `NO_VETO`, `NOT_AFTER_LEAD`, `ALREADY_VETOED`, `NO_TOKEN` or `LEADER_HAS_NO_OTHER_SUIT`.
   Every tool refuses a seat out of turn (`NOT_YOUR_TURN`), the wrong phase (`WRONG_PHASE`), a pause between games
   (`NO_ROUND`) and the end (`MATCH_OVER`).
4. **Scoring.** A hit is `hit + perTrick * taken`; a miss costs `missBase` plus the error squared (or 10 per trick off
   with `linear`) (`round_scored`). The game goes to the most points (several joined by `+` on a tie); the match
   counts the games a seat won alone and every seat's points (`match_ended`).
5. **The levers.** `bidSum` adds the bids so far against the round's tricks to the table; `calibration` adds each
   seat's own bid-against-taken line to the record after a game; `reference` rates every fresh hand with a Monte
   Carlo worth (`referenceSamples` random deals of the unseen cards and a random trump, played out by a simple
   reference player: the leader leads its strongest card, a follower plays its strongest legal card when it wins the
   trick as it stands, else its weakest). The worth comes from the stream `("trick-play", "reference", game, round,
   seat)`, so the deal is not touched; `bid` shows the bidder its hand's worth in its action line, `retro` adds the
   seat's own total and the worth of every round to the calibration line.
6. **What a seat reads.** The seat on turn gets the table in its inputs: the round, its own hand, the bids, the
   trump, the tricks of the round, the scores, the veto tokens and the legal cards. `viewTable` is a free look (no
   step, and its answer wakes nobody) and answers a seat not on turn with one wait line. After a game every seat that
   is woken while no round runs gets the record of the game once (with a strategy brain, in its retro).
7. **The move timer.** A seat that leaves its action open for `maxIdleMinutes` whole ticks gets a random legal bid,
   suit or card from the stream `("trick-play", "forfeit", <action key>)` (`forfeit: true`, written by the kernel).
   `maxConsecutiveForfeits` such actions in a row end the match as invalid (`match_ended.invalid`); an accepted
   action of a seat starts the count again.
8. **With a strategy brain.** The mechanic provides `brain-source` (the brain holds the next game back for its retro)
   and tells the brain when a game starts and ends, with a one-line result; with `briefEveryRound` every round counts
   as a start, so each round begins from a fresh context with the briefing.

Facts: `trick-play.totals` (the points of the running game), `trick-play.wins` (games won alone) and
`trick-play.actor` (the seat to act, or null). The run ends by the limit `trick-play.match` after the last game. The
service `trick-play` lets another mechanic read the game, round, phase, actor and the public table.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewTable`

- Granted when the game lists no grants: `resident`
- Free: a read-only look that counts no step

No parameters.

What the caller reads ([trick-play/tools/viewTable](prompts/trick-play/tools/viewTable.md)):

> Look at the table: your own hand, the round and its card count, every bid so far, the trump, the trick on the table, the tricks of this round, the scores, the veto tokens left and what you may do now. It costs no step. When it is not your turn it only says whose turn it is.

### `placeBid`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tricks` | integer ≥ 0 | yes | The exact number of tricks you will take this round. |

What the caller reads ([trick-play/tools/placeBid](prompts/trick-play/tools/placeBid.md)):

> Bid how many tricks you will take in this round, exactly (0 up to the cards each seat holds). Only when it is your turn to bid; a bid cannot be changed.

### `nameTrump`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `suit` | string | yes | The suit's name, for example "Ember". |

What the caller reads ([trick-play/tools/nameTrump](prompts/trick-play/tools/nameTrump.md)):

> Name the trump suit for this round. Only the seat with the lowest bid may, once every bid is public.

### `playCard`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `card` | string | yes | The card, suit and rank, for example "Ember 7". |

What the caller reads ([trick-play/tools/playCard](prompts/trick-play/tools/playCard.md)):

> Play a card from your hand to the trick, for example "Ember 7". Only on your turn. You must follow the suit led when you can.

### `vetoLead`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([trick-play/tools/vetoLead](prompts/trick-play/tools/vetoLead.md)):

> Spend your veto token (one per game) right after the lead card of a trick, before you play: the lead card goes back to the leader, who must lead a different suit. Only the seat after the leader may, and only when the leader holds another suit.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `game_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `seats` | string[] | yes |  |
| `startingSide` | string | yes | The seat that bids and leads first in the game's first round. |

### `round_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes | The round of the game, from 1. |
| `cards` | integer | yes | Cards dealt to each seat. |
| `dealer` | string | yes |  |
| `order` | string[] | yes | Bidding order; the first seat also leads the first trick. |

### `bid_placed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `seat` | string | yes |  |
| `bid` | integer | yes |  |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (a random legal choice), not the seat itself. |

### `trump_named`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `seat` | string | yes |  |
| `suit` | string | yes |  |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (a random legal choice), not the seat itself. |

### `lead_vetoed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trick` | integer | yes |  |
| `seat` | string | yes | Who spent the veto token. |
| `leader` | string | yes |  |
| `suit` | string | yes |  |

### `card_played`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trick` | integer | yes |  |
| `seat` | string | yes |  |
| `card` | string | yes |  |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (a random legal choice), not the seat itself. |

### `trick_won`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trick` | integer | yes |  |
| `seat` | string | yes |  |
| `plays` | object[] | yes |  |
| `plays[].seat` | string | yes |  |
| `plays[].card` | string | yes |  |

### `round_scored`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `round` | integer | yes |  |
| `trump` | string or null | yes |  |
| `bids` | record of integer | yes |  |
| `tricks` | record of integer | yes |  |
| `points` | record of integer | yes |  |
| `totals` | record of integer | yes |  |

### `game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `result` | string | yes | The seat with the most points; several joined by '+' on a tie. |
| `totals` | record of integer | yes |  |

### `match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `wins` | record of integer | yes |  |
| `points` | record of integer | yes | Every seat's points summed over the match's games. |
| `invalid` | boolean | no | True when the match was ended as invalid (too many forfeits in a row); no result. |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 | `3` | Games in the match; the run ends after the last one. |
| `rounds` | (integer ≥ 1)[] | `[1,2,3,4,5,6,7,8]` | Cards dealt to each seat, round by round; a game has one round per entry. |
| `trump` | "lowestBidderNames" or "none" | `"lowestBidderNames"` | lowestBidderNames: the lowest bidder names the trump suit once every bid is public; none: no trump. |
| `vetoTokens` | integer ≥ 0 | `1` | Veto tokens each seat gets per game (0: no veto). |
| `scoring` | object | `{"hit":10,"perTrick":3,"miss":"square"}` | Points of a round: hit plus perTrick per trick on a hit; a miss costs missBase plus the error squared (or 10 per trick off). |
| `scoring.hit` | integer | `10` | Points for taking exactly the tricks bid. |
| `scoring.perTrick` | integer | `3` | Points per trick taken, on a hit only. |
| `scoring.miss` | "square" or "linear" | `"square"` | A miss costs the square of the error (square) or 10 per trick off (linear), plus missBase. |
| `scoring.missBase` | integer ≥ 0 | unset | A fixed cost of every miss on top of the error term (default 0). |
| `maxIdleMinutes` | integer ≥ 1 | `3` | Whole minutes a seat may leave its action open before the move timer acts for it. |
| `maxConsecutiveForfeits` | integer ≥ 0 | `0` | That many timer actions in a row end the match as invalid (0: off). |
| `briefEveryRound` | boolean | `false` | Tell a strategy brain of every round's start, not only the game's, so every round begins from a fresh context with the briefing. |
| `bidSum` | boolean | `false` | The table shows the sum of the bids placed so far against the tricks of the round. |
| `calibration` | boolean | `false` | The end-of-game record tells each seat its own calibration: tricks bid against tricks taken, hits, zero bids. |
| `reference` | "off" or "retro" or "bid" | `"off"` | A Monte Carlo worth of each hand at bidding time (random unseen cards and trump, a simple play policy): retro adds the seat's own total to the calibration line, bid shows the seat its hand's worth while it bids. |
| `referenceSamples` | integer ≥ 1 | `200` | Random deals per hand for the reference worth. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `trick-play`

The trick game: the running game and round, the phase, who acts and the public table.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `round` | query | - | integer | The running (or last) round of the game, from 1. |
| `phase` | query | - | "idle" or "bid" or "trump" or "play" | idle (between rounds or games), bid, trump or play. |
| `actor` | query | - | string or null | The seat that must act now, or null. |
| `table` | query | - | { bids: record of integer, trump: string or null, trick: object[], won: record of integer } | The public table: bids so far, the trump, the plays of the trick on the table and the tricks won this round. |

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

Each number is computed from the mechanic's own events of one finished run; a run without a value reads "absent", never zero.

| Metric | Title | Unit | Computed from |
| --- | --- | --- | --- |
| `trick-play.hits` | Bids hit exactly | - | `round_scored` |
| `trick-play.zeroBids` | Bids of zero tricks | - | `round_scored` |
| `trick-play.meanBid` | Mean bid per seat and round | tricks | `round_scored` |
| `trick-play.points` | Points per seat and round | points | `round_scored` |
| `trick-play.vetoes` | Leads vetoed | vetoes | `round_scored`, `lead_vetoed` |
| `trick-play.forfeits` | Actions of the move timer | actions | `bid_placed`, `trump_named`, `card_played` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [trick-play/tools/viewTable](prompts/trick-play/tools/viewTable.md) | - |
| [trick-play/tools/placeBid](prompts/trick-play/tools/placeBid.md) | - |
| [trick-play/tools/nameTrump](prompts/trick-play/tools/nameTrump.md) | - |
| [trick-play/tools/playCard](prompts/trick-play/tools/playCard.md) | - |
| [trick-play/tools/vetoLead](prompts/trick-play/tools/vetoLead.md) | - |

<!-- /generated:prompts -->

## Example

No game of this repository loads it yet: Ember Tricks comes with its own issue. It will load it as the old platform
did, after the card table:

```ts
trickPlay({ games, rounds: [...rounds], trump: "lowestBidderNames", vetoTokens: 1,
	scoring: { hit: 10, perTrick: 3, miss: "square", missBase: 5 }, maxIdleMinutes: 3, maxConsecutiveForfeits: 24, briefEveryRound, ... }),
```

`missBase: 5` makes a zero bid no longer almost free (P97).

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **LH12** trump as a weapon against another zero bidder. By design, watched.
- **P95** redundant `viewTable` calls. Partly fixed (free, one wait line).
- **P96** notes over the word limit. Partly fixed.
- **P97** zero bids were almost free. Fixed in the rules (`missBase`), effect open.
- **P131** a seat that just acted got another turn and acted again. Fixed.
- **P136, P137, P165** players underbid systematically; notes do not change bidding; better calibration, no more hits.
  Partly answered: showing the worth at the bid pays.
- **P220** models round the reference down. Open.

## Tests

[`test/trick-play.test.ts`](test/trick-play.test.ts): trick winners, following suit and the veto, scoring, trump by
the lowest bidder, a scripted match of two games, idle seats and the invalid match, private hands, the free
`viewTable`, the three levers (the worth at the bid, the bid sum, the calibration line with the worth in the retro),
the fake driver's calls of all five tools, documented options, determinism and snapshots.
[`test/oracle.test.ts`](test/oracle.test.ts) makes the calls of the first game of three recorded runs of the old
platform and holds every reply, every event and every table a seat on turn read to the recording (the bid-aid file
holds 32 worths of the reference stream), and plays the silent file with idle seats: the forfeits land in the
recorded ticks. [`test/carried.test.ts`](test/carried.test.ts) holds the prompt files, the tools, the options and the
events to those of the old platform. The scripted player of the old tests is in [`test/support.ts`](test/support.ts).
