# Hint towers

A cooperative game of hidden hands (the game of Harbor Lights) on the card-table. Every
seat holds cards it cannot see but sees everyone else's; the crew builds one tower per suit in rank order. On its turn
a seat gives a signal about a teammate's hand, plays a card blind, or discards to win a signal back. The engine keeps
every seat's knowledge, so a fresh context loses nothing.

Copied from `mechanics/hint-towers/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **The deal.** Each seat holds `handSize` cards it cannot see. The status shows the other seats' cards, what each of
   them knows, the towers, the signals left, the strikes and the `recent` last actions. Every card is unique.
2. **A turn.** One of:
   - `giveSignal`: spend a signal to tell a teammate every card of one suit, or of one rank, in its hand (it must touch
     a card); the untouched cards learn "not that suit / rank" (`signal_given`);
   - `playSlot`: play a slot to its suit's tower: lit when it is the tower's next rank, else a misfire (the card is
     lost and a strike counts) (`card_played`);
   - `discardSlot`: below the signal cap, drop a slot and get a signal back (`card_discarded`).
   A played or discarded card is replaced from the draw pile (`card_drawn`).
3. **Losses.** A lost rank is bridged (the next rank above it becomes playable), so a loss costs exactly one point. A
   completed tower gives a signal back (`refillOnTower`).
4. **The end of a game.** After the draw pile is empty the game goes on until a whole round of seats lights nothing and
   gives no signal (P171). `strikes` misfires end it, unless `strikePenalty` is above 0 (soft strikes: the game goes
   on, and every misfire from the last strike on costs that many points). The score is the cards lit, less any penalty
   (`game_ended`).
5. **Reference.** Every deal is also played by a crew of reference bots (`game_scored`, for the human only). A seat idle
   for `maxIdleMinutes` gets the bot's action (`forfeit`).
6. **Aids and talk.** `playableOdds` shows each own slot's chance to be playable; `listCandidates` lists a slot's
   possible cards when few remain; `debriefNote` adds a question to the after-game record. `quietTools` (such as the
   team chat) are locked while a game runs and open between games. It provides `brain-source` for the
   strategy-brain.

## Tools

### `viewTowers`

- Suggested for: `resident`

No parameters.

What the caller reads (hint-towers/tools/viewTowers):

> Look at the game: the towers and their next playable ranks, the lost cards, the signals, strikes and draw pile, every other seat's cards with what that seat knows, what you know about your own hidden slots (and which cards each may be), the last actions and what you may do now.

### `giveSignal`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes | The seat you signal, for example "A03". |
| `about` | string | yes | One suit name (for example "Moss") or one rank (for example "3"). |

What the caller reads (hint-towers/tools/giveSignal):

> Spend one signal to tell another seat every card of one suit, or every card of one rank, in their hand, for example to "A03" about "Moss" or about "3". It must touch at least one of their cards; their other cards learn that they are not that suit or rank. Only on your turn, and only while signals are left.

### `playSlot`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `slot` | integer ≥ 1 | yes | Your slot, from 1 (your oldest card). |

What the caller reads (hint-towers/tools/playSlot):

> Play one of your own hidden slots (1 is your oldest card) to its suit's tower. If it is that tower's next rank it is lit; otherwise it is a misfire: the card is lost and a strike counts. You draw a new card while the pile lasts. Only on your turn.

### `discardSlot`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `slot` | integer ≥ 1 | yes | Your slot, from 1 (your oldest card). |

What the caller reads (hint-towers/tools/discardSlot):

> Discard one of your own hidden slots (1 is your oldest card): the card is lost and the crew gets one signal back. Not while the crew holds every signal. You draw a new card while the pile lasts. Only on your turn.

## Events

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

## Options

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


