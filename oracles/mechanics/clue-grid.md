# Clue grid

A word-clue game for two teams. A grid of words is dealt, and each word secretly belongs to team amber, team teal, the
fog (nobody) or the shadows (a penalty). Each game one member of a team is its keeper and sees the key; the others are
seekers and see only the words. The keeper gives one-word clues with a number, the seekers reveal words one at a time,
and the team scores for its own words, loses for shadows and earns a bonus for clues that land.

Copied from `mechanics/clue-grid/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **A game.** `clue_game_started` deals a grid of `size` words: `perTeam` for the team with the first clue,
   `secondFewer` fewer for the other (P196), `shadows` shadows, the rest fog. `clue_key_dealt` tells the keepers
   the key. The keeper rotates through each team's members, one game each, in the order of `teams`.
2. **A clue.** Teams take turns. The keeper gives one clue with `giveClue`: one word that is not on the grid and shares
   no stem with a grid word, a number up to `maxNumber`, and the words it means. `clue_given` is public;
   `clue_intent` (the meant words) is sealed for the report. A keeper who gives no clue within `deadline` minutes
   loses the turn. A keeper may not post in the team chat during a game.
3. **Guesses.** The caller of the clue (the seekers take turns) reveals words one at a time with `guess` while the
   other seekers advise in the team chat (team-channel). An own word lets the caller go on,
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
strategy-brain can open a retro window per team. The scoring is original, not a
recreation of any published word game.

## Tools

### `viewGrid`

- Suggested for: `resident`

No parameters.

What the caller reads (clue-grid/tools/viewGrid):

> Look at the grid: the words (revealed ones with their owner), the clues and guesses of this game so far, whose turn it is and your task. A keeper also sees the owner of every hidden word.

### `giveClue`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `word` | string | yes | The clue: one word, not on the grid and not part of a grid word. |
| `number` | integer ≥ 1 | yes | How many of your team's words the clue points to. |
| `targets` | string[] | yes | Exactly `number` of your team's hidden words you mean. Secret: only the record sees them. |
| `reason` | string | no | A short reason, for the record only. |

What the caller reads (clue-grid/tools/giveClue):

> Keeper only, on your team's clue turn: give one clue word and a number (how many of your team's hidden words it points to), and name exactly that many of your hidden words as targets. The targets stay secret; your seekers see only the word and the number. The clue must be one word that is not on the grid and does not hold or sit inside a grid word.

### `guess`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `word` | string | yes | A hidden word of the grid to reveal. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads (clue-grid/tools/guess):

> The caller of the current clue only: reveal one hidden word of the grid. An own word lets you go on (up to the clue's guess limit, shown in your task); a fog word, a word of the other team or a shadow ends your turn.

### `endGuesses`

- Suggested for: `resident`

No parameters.

What the caller reads (clue-grid/tools/endGuesses):

> The caller of the current clue only: stop guessing after at least one guess; the turn goes to the other team.

## Events

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

## Options

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


