# Clue grid

A word-clue game for two teams. A grid of words is dealt, and each word secretly belongs to team amber, team teal, the
fog (nobody) or the shadows (a penalty). Each game one member of a team is its keeper and sees the key; the others are
seekers and see only the words. The keeper gives one-word clues with a number, the seekers reveal words one at a time,
and the team scores for its own words, loses for shadows and earns a bonus for clues that land.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-clue-grid` |
| Id | `clue-grid` |
| Summary | The word-clue game Lanterns for two teams: a keeper gives one-word clues, the seekers reveal words on a grid of hidden owners. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)), `team-channel` (from [team-channel](../team-channel/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Facts | `results`, `scores` |
| Jobs | `nextGame` |
| Stories | [lanterns](../../stories/lanterns/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

1. **A game.** `clue_game_started` deals a grid of `size` words: `perTeam` for the team with the first clue,
   `secondFewer` fewer for the other (P196), `shadows` shadows, the rest fog. `clue_key_dealt` tells the keepers
   the key. The keeper rotates through each team's members, one game each, in the order of `teams`.
2. **A clue.** Teams take turns. The keeper gives one clue with `giveClue`: one word that is not on the grid and shares
   no stem with a grid word, a number up to `maxNumber`, and the words it means. `clue_given` is public;
   `clue_intent` (the meant words) is sealed for the report. A keeper who gives no clue within `deadline` minutes
   loses the turn. A keeper may not post in the team chat during a game.
3. **Guesses.** The caller of the clue (the seekers take turns) reveals words one at a time with `guess` while the
   other seekers advise in the team chat ([team-channel](../team-channel/README.md)). An own word lets the caller go on,
   up to `number` guesses (one more with `extraGuess`); a fog word, the other team's word or a shadow ends the turn
   (`clue_word_revealed`, `clue_closed`). `endGuesses` stops early; a missing guess after `deadline` ends the turn.
4. **Scoring.** `wordPoints` per own word revealed (whoever reveals it), minus `shadowPenalty` per shadow a team
   reveals, `landedBonus` per word beyond the first of a landed clue (number 2 or more and its first `number` guesses
   all own words), and `finishBonus` for the team whose words are all revealed first, which ends the game. Otherwise
   the game ends when both teams used their `maxClues` clues (`clue_game_ended`).
5. **The measure.** `clue_game_scored` (for the human only) reports how much of what the keeper meant the seekers
   found, from the sealed intents. After `games` games, `clue_match_ended` ends the run.

`viewGrid` shows the grid (in `columns` per row) with the revealed owners and, for the keeper, the key. A keeper's turn
also tells it the team's hidden words left against its clues left, so it sees what finishing needs (P197). Between games the mechanic provides `brain-source`, so
[strategy-brain](../strategy-brain/README.md) can open a retro window per team. The scoring is original, not a
recreation of any published word game.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `viewGrid`

- Suggested for: `resident`

No parameters.

What the caller reads ([clue-grid/tools/viewGrid](prompts/clue-grid/tools/viewGrid.md)):

> Look at the grid: the words (revealed ones with their owner), the clues and guesses of this game so far, whose turn it is and your task. A keeper also sees the owner of every hidden word.

### `giveClue`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `word` | string | yes | The clue: one word, not on the grid and not part of a grid word. |
| `number` | integer ≥ 1 | yes | How many of your team's words the clue points to. |
| `targets` | string[] | yes | Exactly `number` of your team's hidden words you mean. Secret: only the record sees them. |
| `reason` | string | no | A short reason, for the record only. |

What the caller reads ([clue-grid/tools/giveClue](prompts/clue-grid/tools/giveClue.md)):

> Keeper only, on your team's clue turn: give one clue word and a number (how many of your team's hidden words it points to), and name exactly that many of your hidden words as targets. The targets stay secret; your seekers see only the word and the number. The clue must be one word that is not on the grid and does not hold or sit inside a grid word.

### `guess`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `word` | string | yes | A hidden word of the grid to reveal. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([clue-grid/tools/guess](prompts/clue-grid/tools/guess.md)):

> The caller of the current clue only: reveal one hidden word of the grid. An own word lets you go on (up to the clue's guess limit, shown in your task); a fog word, a word of the other team or a shadow ends your turn.

### `endGuesses`

- Suggested for: `resident`

No parameters.

What the caller reads ([clue-grid/tools/endGuesses](prompts/clue-grid/tools/endGuesses.md)):

> The caller of the current clue only: stop guessing after at least one guess; the turn goes to the other team.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `clue_game_started`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `startingTeam` | "amber" or "teal" | yes |  |
| `keepers` | object | yes |  |
| `keepers.amber` | string | yes |  |
| `keepers.teal` | string | yes |  |
| `words` | string[] | yes | The grid, row by row. |

### `clue_key_dealt`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `key` | object[] | yes | Every word with its owner (sealed: audience human). |
| `key[].word` | string | yes |  |
| `key[].owner` | "amber" or "teal" or "fog" or "shadow" | yes |  |
| `key[].revealed` | boolean | yes |  |
| `key[].by` | "amber" or "teal" or null | yes |  |

### `clue_given`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `team` | "amber" or "teal" | yes |  |
| `keeper` | string | yes |  |
| `caller` | string | yes |  |
| `clueNo` | integer | yes |  |
| `word` | string | yes |  |
| `number` | integer | yes |  |

### `clue_intent`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `team` | "amber" or "teal" | yes |  |
| `clueNo` | integer | yes |  |
| `targets` | string[] | yes |  |
| `reason` | string | yes |  |

### `clue_word_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `team` | "amber" or "teal" | yes |  |
| `by` | string | yes |  |
| `clueNo` | integer | yes |  |
| `word` | string | yes |  |
| `owner` | string | yes |  |
| `target` | boolean | yes |  |
| `guessNo` | integer | yes |  |

### `clue_closed`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `team` | "amber" or "teal" | yes |  |
| `keeper` | string | yes |  |
| `caller` | string | yes |  |
| `clueNo` | integer | yes |  |
| `word` | string | yes |  |
| `number` | integer | yes |  |
| `targets` | string[] | yes |  |
| `guesses` | object[] | yes |  |
| `guesses[].word` | string | yes |  |
| `guesses[].owner` | "amber" or "teal" or "fog" or "shadow" | yes |  |
| `guesses[].by` | string | yes | The seeker who called it. |
| `guesses[].target` | boolean | yes |  |
| `end` | "wrong" or "stopped" or "limit" or "timeout" or "finished" or "no-clue" or null | yes |  |
| `landed` | boolean | yes |  |

### `clue_game_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `result` | object | yes |  |
| `result.game` | integer | yes |  |
| `result.scores` | record of object | yes |  |
| `result.winner` | "amber" or "teal" or "draw" | yes |  |
| `result.reason` | "finished" or "clues" | yes |  |
| `totals` | record of number | yes |  |
| `key` | object[] | yes |  |
| `key[].word` | string | yes |  |
| `key[].owner` | "amber" or "teal" or "fog" or "shadow" | yes |  |
| `key[].revealed` | boolean | yes |  |
| `key[].by` | "amber" or "teal" or null | yes |  |

### `clue_game_scored`

Audience: `human`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `game` | integer | yes |  |
| `reference` | object | yes |  |
| `reference.amber` | object | yes |  |
| `reference.teal` | object | yes |  |

### `clue_match_ended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scores` | record of number | yes |  |
| `results` | object[] | yes |  |
| `results[].game` | integer | yes |  |
| `results[].scores` | record of object | yes |  |
| `results[].winner` | "amber" or "teal" or "draw" | yes |  |
| `results[].reason` | "finished" or "clues" | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `games` | integer ≥ 1 ≤ 20 | `3` | Games in the match; the run ends after the last. The keeper rotates through each team's members, one game each. |
| `size` | integer ≥ 8 ≤ 40 | `20` | Words on the grid. |
| `columns` | integer ≥ 2 ≤ 8 | `5` | Words per row when the grid is shown. |
| `perTeam` | integer ≥ 2 | `6` | Words of the team with the first clue of a game. |
| `secondFewer` | integer ≥ 0 | `1` | Words fewer for the team without the first clue, to even out the first-move edge (P196). |
| `shadows` | integer ≥ 0 | `2` | Shadow words; the rest is fog. |
| `maxNumber` | integer ≥ 1 | `4` | The highest number a clue may carry. |
| `maxClues` | integer ≥ 1 | `5` | Clues per team and game; the game ends when both teams used theirs (5 since P191: with 8, clues of 1 finished a game). |
| `wordPoints` | integer ≥ 0 | `1` | Points per own word revealed, whoever reveals it. |
| `shadowPenalty` | integer ≥ 0 | `3` | Points a team loses per shadow it reveals. |
| `landedBonus` | integer ≥ 0 | `1` | Points per word beyond the first of a landed clue (number 2 or more, its first `number` guesses all own words): a landed 3 scores twice this (P191). |
| `finishBonus` | integer ≥ 0 | `3` | Points for the team whose words are all revealed first (it ends the game). |
| `extraGuess` | boolean | `false` | A clue allows number + 1 guesses; off (since P191: nobody ever took the extra guess): exactly `number`. |
| `deadline` | integer ≥ 1 | `2` | Minutes a clue or the next guess stays open; a missing clue loses the turn, a missing guess ends it. |
| `teams` | object | unset | The two teams; without it the residents are split in half, the first half amber. |
| `teams.amber` | string[] | required | Resident ids of team amber, in the order the keeper role rotates. |
| `teams.teal` | string[] | required | Resident ids of team teal, in the order the keeper role rotates. |

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
| [clue-grid/tools/viewGrid](prompts/clue-grid/tools/viewGrid.md) | - |
| [clue-grid/tools/giveClue](prompts/clue-grid/tools/giveClue.md) | - |
| [clue-grid/tools/guess](prompts/clue-grid/tools/guess.md) | - |
| [clue-grid/tools/endGuesses](prompts/clue-grid/tools/endGuesses.md) | - |
| [clue-grid/rules](prompts/clue-grid/rules.md) | `size`, `perTeam`, `secondWords`, `fog`, `shadows`, `maxNumber`, `maxClues`, `wordPoints`, `shadowPenalty`, `landedBonus`, `finishBonus`, `deadline`, `guessLimit` |
| [clue-grid/game-head](prompts/clue-grid/game-head.md) | `game`, `games`, `starting`, `role` |
| [clue-grid/task-clue](prompts/clue-grid/task-clue.md) | `team`, `clueNo`, `maxClues`, `grid`, `own`, `opponent`, `shadows`, `maxNumber`, `pace` |
| [clue-grid/task-caller](prompts/clue-grid/task-caller.md) | `team`, `word`, `number`, `keeper`, `partner`, `grid`, `left` |
| [clue-grid/task-partner](prompts/clue-grid/task-partner.md) | `team`, `word`, `number`, `keeper`, `caller`, `grid` |
| [clue-grid/keeper-silent](prompts/clue-grid/keeper-silent.md) | - |

<!-- /generated:prompts -->

## Example

From `stories/lanterns/story.ts`:

```ts
mechanics: [
	clueGrid.with({ games, maxClues, deadline: DEADLINE, teams: TEAMS }),
	teamChannel.with({ teams: TEAMS, maxPostsPerMove: 3 }),
	strategyBrain.with({ enabled: brain, maxWords, teams: TEAMS, retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true, retroFocus: RETRO_FOCUS }),
],
```

Two teams of three play a match on the default 20-word grid; `teams` fixes who is on which team and the keeper order.

## Lessons and loopholes

See the log in [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md).

| ID | What happened | Status |
| --- | --- | --- |
| P190 | A grid word was also the name of a card type. | fixed |
| P191 | Keepers are timid and seekers never take the extra guess. | partly fixed |
| P192 | A clue pointed at a visible shadow. | open (by design) |
| P193 | Brains overrun the word cap. | open |
| P194 | A keeper called `giveClue` out of turn, and a caller ran out of steps. | partly fixed |
| P195 | No brain effect in Lanterns on two seeds. | small effect |
| P196 | The team that starts more often wins. | partly fixed (handicap overcorrects) |
| P197 | A cautious brain default made the game unfinishable. | fixed |
| P230 | Seed sets swing more than the arms. | answered |
| P439 | The brain is a real memory, and the score hides it. | open |
| LH15 | A silenced keeper warned through its own answer. | closed by design |

## Tests

The rules and the scripted match live in `test/stories/lanterns.test.ts`: the word pool (no word inside another, no
shared stem), the deal, refused clues (not one word, on the grid, holding a grid word or sharing its stem), landed
clues, scoring, the keeper's measure, the words-left line (P197), the keeper rotation, a scripted four-game match with
sealed targets and a brain per team, a fresh context per game, a lost clue turn, the silent keeper and the turn handed
on after a wrong word, the registered variants, determinism and a snapshot round trip inside a game and inside a retro
window.
