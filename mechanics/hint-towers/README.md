# Hint towers

A cooperative game of hidden hands (the game of Harbor Lights) on the [card-table](../card-table/README.md). Every
seat holds cards it cannot see but sees everyone else's; the crew builds one tower per suit in rank order. On its turn
a seat gives a signal about a teammate's hand, plays a card blind, or discards to win a signal back. The engine keeps
every seat's knowledge, so a fresh context loses nothing.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-hint-towers` |
| Id | `hint-towers` |
| Summary | A cooperative game of hidden hands: signals about suit or rank, towers lit in rank order, bridged losses. |
| Requires | `card-table` (from [card-table](../card-table/README.md)) |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `actor`, `baselines`, `scores` |
| Jobs | `nextGame` |
| Stories | [harbor-lights](../../stories/harbor-lights/README.md) (all 4 variants) |

<!-- /generated:glance -->

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
   [strategy-brain](../strategy-brain/README.md).

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewTowers`

- Suggested for: `resident`

No parameters.

What the caller reads ([hint-towers/tools/viewTowers](prompts/hint-towers/tools/viewTowers.md)):

> Look at the game: the towers and their next playable ranks, the lost cards, the signals, strikes and draw pile, every other seat's cards with what that seat knows, what you know about your own hidden slots (and which cards each may be), the last actions and what you may do now.

### `giveSignal`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | string | yes | The seat you signal, for example "A03". |
| `about` | string | yes | One suit name (for example "Moss") or one rank (for example "3"). |

What the caller reads ([hint-towers/tools/giveSignal](prompts/hint-towers/tools/giveSignal.md)):

> Spend one signal to tell another seat every card of one suit, or every card of one rank, in their hand, for example to "A03" about "Moss" or about "3". It must touch at least one of their cards; their other cards learn that they are not that suit or rank. Only on your turn, and only while signals are left.

### `playSlot`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `slot` | integer ≥ 1 | yes | Your slot, from 1 (your oldest card). |

What the caller reads ([hint-towers/tools/playSlot](prompts/hint-towers/tools/playSlot.md)):

> Play one of your own hidden slots (1 is your oldest card) to its suit's tower. If it is that tower's next rank it is lit; otherwise it is a misfire: the card is lost and a strike counts. You draw a new card while the pile lasts. Only on your turn.

### `discardSlot`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `slot` | integer ≥ 1 | yes | Your slot, from 1 (your oldest card). |

What the caller reads ([hint-towers/tools/discardSlot](prompts/hint-towers/tools/discardSlot.md)):

> Discard one of your own hidden slots (1 is your oldest card): the card is lost and the crew gets one signal back. Not while the crew holds every signal. You draw a new card while the pile lasts. Only on your turn.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `brain-source`

A match of games the strategy brain can pause between games: the game's number, hold and release.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `game` | query | - | integer | The running (or last) game's number, from 1; 0 before the first game. |
| `hold` | command | - | boolean | Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game. |
| `release` | command | - | null | Lets a held game start. A no-op when nothing is held. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [hint-towers/tools/viewTowers](prompts/hint-towers/tools/viewTowers.md) | - |
| [hint-towers/tools/giveSignal](prompts/hint-towers/tools/giveSignal.md) | - |
| [hint-towers/tools/playSlot](prompts/hint-towers/tools/playSlot.md) | - |
| [hint-towers/tools/discardSlot](prompts/hint-towers/tools/discardSlot.md) | - |

<!-- /generated:prompts -->

## Example

From [`stories/harbor-lights/story.ts`](../../stories/harbor-lights/story.ts):

```ts
hintTowers.with({ games, handSize: 4, signals: 6, strikes: soft ? SOFT_FROM : 3, strikePenalty: soft ? SOFT_PENALTY : 0,
	maxIdleMinutes: 2, maxConsecutiveForfeits: 24, quietTools: [...chat], ... }),
```

The crew arm adds a [team-channel](../team-channel/README.md) whose tools are quiet during play.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH14** a harmless signal resets the dark count. Kept on purpose.
- **P170, P250** Haiku plays by the habits of the famous original ("dead" cards), and a debrief does not move it. Open.
- **P171, P176** the dark round cut off signalled plays; its wording was ambiguous. Fixed.
- **P172, P175, P177** a signal meant as information is read as "play this"; a written convention is not a played one.
  Partly fixed, open.
- **P174, P178, P251** strike-outs decide the score; soft strikes invite guessing. Measured; P251 open.
- **P173, P252, P331** crew against solo: a small edge that is the pre-game plan, and private notes give more.
- **P432** the chance to light shown at the decision raises misfires: seats rank gambles instead of waiting. See the log.

## Tests

[`test/mechanics/hint-towers/hint-towers.test.ts`](../../test/mechanics/hint-towers/hint-towers.test.ts): the deal and
towers, misfires and bridged ranks, signals and "not" knowledge, the signal cap, the dark round, strikes and soft
strikes, the reference bot, a match with secret deals, own cards never shown, refusals, idle seats and the invalid
match, quiet tools, documented options and prompts, determinism and snapshots.
