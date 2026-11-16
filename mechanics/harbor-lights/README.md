# Hint towers

A cooperative card game of hidden hands on the [card table](../card-table/README.md): every seat sees the others'
cards and never its own, the crew shares a few signals, and it lights one tower per suit in rank order. It is the
rules of [Harbor Lights](../../games/harbor-lights/README.md). The score of a game is the number of cards lit.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-harbor-lights` |
| Id | `harbor-lights` |
| Summary | A cooperative game of hidden hands: signals about suit or rank, towers lit in rank order, bridged losses. |
| Requires | `card-table` (from [card-table](../card-table/README.md)) |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [harbor-lights](../../games/harbor-lights/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The match.** `games` games; the first seat rotates with the game (seat 1 starts game 1, seat 2 game 2). A game
   takes the card table's whole deck: the deal `("card-table", "deal", n)` shuffles it, every seat draws `handSize`
   cards one at a time in seat order, the rest is the draw pile. With fewer than two seats, or hands that take the
   whole deck, the run stops at its start.
2. **A turn is one action** of the seat on turn; the tools refuse everyone else with `NOT_YOUR_TURN`.
   - `giveSignal` spends one of the crew's `signals` to tell another seat every card of one suit, or of one rank, in
     its hand. It must touch a card (`TOUCHES_NOTHING`); the cards not touched learn "not that". The suit is read in
     any case, the seat too. Other refusals: `NO_SIGNALS`, `SELF_SIGNAL`, `UNKNOWN_SEAT`, `UNKNOWN_SIGNAL`.
   - `playSlot` plays a slot (1 is the oldest card) to its suit's tower: lit when it is the tower's next rank, else a
     misfire: the card is lost and a strike counts. A completed tower gives a signal back (`refillOnTower`).
   - `discardSlot` drops a slot and wins a signal back; refused while the crew holds every signal (`SIGNALS_FULL`).
   After a play or a discard the seat draws while the pile lasts (`card_drawn`, for humans only). A slot the seat
   does not hold is `NO_SUCH_SLOT`.
3. **No card is ever dead.** Every card exists once; a lost rank is bridged, so the next rank above it becomes
   playable and a loss costs exactly one point.
4. **The end of a game.** Every card is lit or lost (`complete`); the strikes ran out (`strikes`); or, once the pile
   is empty, a whole round of seats lit no card and gave no signal, or no seat holds a card (`dark`). With
   `strikePenalty` above 0 the strikes are soft: they never end the game, and every misfire from strike `strikes` on
   costs that many points.
5. **What a seat reads.** On its turn it gets the status (also `viewTowers`): the towers with their next rank, the
   lost cards, signals, strikes, the pile, every other hand with what its holder knows, and for each own slot what
   the signals told it and which cards it can still be, `SURELY PLAYABLE NOW` when all of them are playable. The
   mechanic keeps this knowledge, so a fresh context loses nothing. `playableOdds` adds the chance that a play
   lights the slot. After a game every seat gets the record once, with each discarded card and what it was still
   needed for, and `debriefNote` as its last line.
6. **The move timer.** A seat that leaves its turn open for `maxIdleMinutes` whole ticks gets the reference bot's
   action (`forfeit: true`). `maxConsecutiveForfeits` such actions in a row end the match as invalid
   (`match_ended.invalid`, limit `harbor-lights.match`); an accepted action of a seat starts the count again.
7. **The reference crew.** Every deal is also played by a crew of reference bots from the same shuffled deck; its
   score is the `baseline` of `deal_revealed` and `game_scored` (both for humans only). The bot plays a slot it
   knows is playable, else the newest card a signal touched if it may be playable; with a signal left it points at
   a teammate's playable card as the newest card touched; below the signal cap it discards its oldest untouched
   slot; at the cap it tells the next seat the rank of its oldest card.
8. **Quiet tools.** When a game starts, every tool named in `quietTools` is locked for every seat, whichever
   mechanic owns the tool (`tool_locked`, seat by seat); when the game ends, it is unlocked again
   (`tool_unlocked`), as on the old platform. A call of a locked tool is refused with `TOOL_LOCKED` at the stage
   `lock`, and the tool is not among the seat's open tools.
9. **With a strategy brain.** The mechanic provides `brain-source` (the brain holds the next game back for its retro
   window) and tells the brain when a game starts (`side`, default the first seat) and ends, with a one-line result.

Facts: `harbor-lights.scores` and `harbor-lights.baselines` (game by game) and `harbor-lights.actor` (the seat on turn, or
null). The run ends by the limit `harbor-lights.match` after the last game.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewTowers`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([harbor-lights/tools/viewTowers](prompts/harbor-lights/tools/viewTowers.md)):

> Look at the game: the towers and their next playable ranks, the lost cards, the signals, strikes and draw pile, every other seat's cards with what that seat knows, what you know about your own hidden slots (and which cards each may be), the last actions and what you may do now.

### `giveSignal`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes | The seat you signal, for example "A03". |
| `about` | string | yes | One suit name (for example "Moss") or one rank (for example "3"). |

What the caller reads ([harbor-lights/tools/giveSignal](prompts/harbor-lights/tools/giveSignal.md)):

> Spend one signal to tell another seat every card of one suit, or every card of one rank, in their hand, for example to "A03" about "Moss" or about "3". It must touch at least one of their cards; their other cards learn that they are not that suit or rank. Only on your turn, and only while signals are left.

### `playSlot`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `slot` | integer ≥ 1 | yes | Your slot, from 1 (your oldest card). |

What the caller reads ([harbor-lights/tools/playSlot](prompts/harbor-lights/tools/playSlot.md)):

> Play one of your own hidden slots (1 is your oldest card) to its suit's tower. If it is that tower's next rank it is lit; otherwise it is a misfire: the card is lost and a strike counts. You draw a new card while the pile lasts. Only on your turn.

### `discardSlot`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `slot` | integer ≥ 1 | yes | Your slot, from 1 (your oldest card). |

What the caller reads ([harbor-lights/tools/discardSlot](prompts/harbor-lights/tools/discardSlot.md)):

> Discard one of your own hidden slots (1 is your oldest card): the card is lost and the crew gets one signal back. Not while the crew holds every signal. You draw a new card while the pile lasts. Only on your turn.

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
| `first` | string | yes | The seat that acts first. |
| `deck` | integer | yes | Cards in the deck: the most a game can light. |

### `deal_revealed`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `hands` | record of string[] | yes | Every seat's slots after the deal, slot 1 first (secret: audience human only). |
| `pile` | string[] | yes | The draw pile, top card first. |
| `baseline` | integer | yes | Cards the reference bot crew lights on this very deal. |

### `signal_given`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `turn` | integer | yes | The action's number in the game, from 1. |
| `seat` | string | yes |  |
| `to` | string | yes |  |
| `about` | string | yes | The suit or the rank the signal named. |
| `slots` | integer[] | yes |  |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (the reference bot's choice), not the seat itself. |

### `card_played`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `turn` | integer | yes | The action's number in the game, from 1. |
| `seat` | string | yes |  |
| `slot` | integer | yes | The slot, from 1 (the oldest card). |
| `card` | string | yes |  |
| `lit` | boolean | yes | False: a misfire, the card is lost and a strike counts. |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (the reference bot's choice), not the seat itself. |

### `card_discarded`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `turn` | integer | yes | The action's number in the game, from 1. |
| `seat` | string | yes |  |
| `slot` | integer | yes | The slot, from 1 (the oldest card). |
| `card` | string | yes |  |
| `forfeit` | boolean | yes | True when the move timer acted for the seat (the reference bot's choice), not the seat itself. |

### `card_drawn`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `turn` | integer | yes | The action's number in the game, from 1. |
| `seat` | string | yes |  |
| `card` | string | yes | The new card (secret from its holder: audience human only). |

### `game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `reason` | "complete" or "strikes" or "dark" | yes |  |
| `score` | integer | yes | Cards lit. |
| `deck` | integer | yes |  |
| `lost` | integer | yes |  |
| `misfires` | integer | yes |  |
| `signals` | integer | yes | Signals given in the game. |

### `game_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes | The game's number in the match, from 1. |
| `score` | integer | yes |  |
| `baseline` | integer | yes | The reference bot crew on the same deal. |

### `match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scores` | integer[] | yes | Cards lit, game by game. |
| `baselines` | integer[] | yes |  |
| `invalid` | boolean | no | True when the match was ended as invalid (too many forfeits in a row). |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 | `3` | Games in the match; the run ends after the last one. |
| `handSize` | integer ≥ 1 | `4` | Cards each seat holds. |
| `signals` | integer ≥ 1 | `6` | Signal tokens: the crew starts with this many and never holds more. |
| `strikes` | integer ≥ 1 | `3` | Misfires that end a game (with soft strikes: the misfire from which each one costs points). |
| `strikePenalty` | integer ≥ 0 | `0` | Soft strikes: 0 ends the game at the last strike; above 0 the strikes never end it, and every misfire from the last strike on costs this many points. |
| `debriefNote` | string | unset | A line added to the record every seat gets after a game (for example a question for the retro). |
| `refillOnTower` | boolean | `true` | A completed tower gives a signal back. |
| `recent` | integer ≥ 0 | `8` | Last actions of the game shown in the status. |
| `playableOdds` | boolean | `false` | Decision-time aid: each own slot also shows the share of its possible cards that are playable now, the chance a play lights it (P430). |
| `listCandidates` | integer ≥ 0 | `6` | A slot's possible cards are listed when there are at most this many (0: only the count). |
| `maxIdleMinutes` | integer ≥ 1 | `2` | Whole minutes a seat may leave its turn open before the move timer acts for it. |
| `maxConsecutiveForfeits` | integer ≥ 0 | `0` | That many timer actions in a row end the match as invalid (0: off). |
| `side` | string | unset | The side a strategy brain names as moving first (a crew's team name); default: the first seat. |
| `quietTools` | string[] | `[]` | Tools locked for every seat while a game runs and opened between games (for example a team chat). |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
| `harbor-lights.score` | Points per game | points | `game_scored` |
| `harbor-lights.misfires` | Misfires | - | `game_ended` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [harbor-lights/tools/viewTowers](prompts/harbor-lights/tools/viewTowers.md) | - |
| [harbor-lights/tools/giveSignal](prompts/harbor-lights/tools/giveSignal.md) | - |
| [harbor-lights/tools/playSlot](prompts/harbor-lights/tools/playSlot.md) | - |
| [harbor-lights/tools/discardSlot](prompts/harbor-lights/tools/discardSlot.md) | - |

<!-- /generated:prompts -->

## Example

No game of this repository loads it yet: Harbor Lights comes with its own issue. It will load it as the old platform
did, after the card table:

```ts
hintTowers({ games, handSize: 4, signals: 6, strikes: 2, strikePenalty: 3, maxIdleMinutes: 2, maxConsecutiveForfeits: 24, quietTools: ["postTeam", "readTeam"] }),
```

These are soft strikes: the first misfire is free, every later one costs three points.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **P170** seats play by the habits of the famous original ("discard only dead cards"); the status and the record
  say that every card is still needed.
- **P171** the dark round cut off signalled plays; a signal now counts as progress, and the count starts after the
  last draw.
- **P172, P175, P177** a signal meant as information is read as "play this", and a written convention is not a
  played one; `debriefNote` carries the retro question.
- **P174, P178** strike-outs decided the score, and soft strikes (`strikePenalty`) invite guessing.
- **P176** the wording of the dark count was ambiguous; it names the discard now.
- **P430, P432** the decision aid `playableOdds` raises misfires: seats rank gambles instead of asking whether to
  play.

## Tests

[`test/model.test.ts`](test/model.test.ts): the rules as functions (the deal, towers, bridged ranks, signals and
what they teach, the dark round, hard and soft strikes) and the reference bot.
[`test/harbor-lights.test.ts`](test/harbor-lights.test.ts): a scripted match of two games with its secret events, what a
seat sees, the refusals, the replies, the move timer and the invalid match, the quiet tools, the fake driver's calls
of all four tools, determinism and the snapshot. [`test/oracle.test.ts`](test/oracle.test.ts) makes the calls of two
recorded games of the old platform and holds every reply and every event to the recording.
[`test/carried.test.ts`](test/carried.test.ts) holds the prompt files, the tools, the options, the events and the
audiences to those of the old platform.
