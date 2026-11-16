# Clue grid

A word-clue game for two teams (the game of Lanterns). A grid of words is dealt, and each word secretly belongs to
team amber, team teal, the fog (nobody) or the shadows (a penalty). In each game one member of a team is its keeper,
who sees the owners and gives one-word clues; the others are seekers, who reveal words from the clues. A team scores
for its own words, for clues that land and for finishing first, and loses points for a shadow it reveals.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-lanterns` |
| Id | `lanterns` |
| Summary | The word-clue game Lanterns for two teams: a keeper gives one-word clues, the seekers reveal words on a grid of hidden owners. |
| Requires | none |
| Uses when loaded | `strategy-brain` (from [strategy-brain](../strategy-brain/README.md)), `team-channel` (from [team-channel](../team-channel/README.md)) |
| Provides | `brain-source` |
| State | kept, snapshot slice version 1 |
| Games | [lanterns](../../games/lanterns/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Teams and roles.** Two teams (`teams`, or the residents split in half). The keeper of a team rotates through its
   members, one game each; the other members are seekers. The team with the first clue alternates game by game
   (amber starts game 1) and has `perTeam` words; the other team has `secondFewer` fewer.
2. **The grid.** Each game deals `size` words from a pool of plain nouns with the seeded stream
   `("lanterns", "grid", game)`: `clue_game_started` names the words, `clue_key_dealt` (for the human only) the
   owners. `viewGrid` shows the words, the revealed owners, the turn and the game's record; a keeper also sees the
   owner of every hidden word.
3. **A clue turn.** The keeper of the team on turn calls `giveClue`: one word that is not on the grid, does not hold
   or sit inside a grid word and shares no stem with one (`BAD_CLUE`), a number from 1 to `maxNumber`
   (`BAD_NUMBER`), and exactly that many of its team's hidden words as targets (`BAD_TARGETS`). `clue_given` shows
   the word and the number; the targets and the reason are sealed in `clue_intent`.
4. **The guesses.** The caller of the clue (the seekers take turns, one clue each) reveals one word at a time with
   `guess` (`clue_word_revealed`); the other seeker advises in the team chat. An own word lets the caller go on, up
   to the clue's number (one more with `extraGuess`), or stop with `endGuesses` after at least one guess
   (`GUESS_FIRST`). A fog word, a word of the other team or a shadow ends the turn. `clue_closed` (for the human
   only) is the full record of the clue.
5. **Who may call.** `giveClue` is locked for everyone but the keeper on turn, `guess` and `endGuesses` for everyone
   but the caller; the game lists the three tools under `locked`. The handlers check the same again
   (`NOT_YOUR_CLUE`, `NOT_CALLER`), so a mechanic that opens a lock does not open the move.
6. **The keeper is silent.** A `lock` handler of the pipeline refuses the tool `postTeam` of a keeper (of either
   team) while a game runs, with `KEEPER_SILENT` and the text of the prompt `lanterns/keeper-silent`: the clue is
   the only thing a keeper tells its seekers. The refusal comes before the arguments are checked and writes no
   event of the team chat; the tool leaves the keeper's open tools. Between two games a keeper may post again.
7. **Deadlines.** A clue turn or the next guess stays open for `deadline` ticks. At the end of the tick that runs out,
   a missing clue loses the turn (`clue_closed` with end `no-clue`) and a missing guess ends it (`timeout`).
8. **The end of a game.** The game ends when every word of one team is revealed, or when both teams used `maxClues`
   clues. Each revealed word scores `wordPoints` for its owner, whoever revealed it; a shadow costs the team that
   revealed it `shadowPenalty`; a clue of 2 or more whose first guesses (as many as its number) were all own words
   lands and scores `landedBonus` per word beyond the first; the team whose words were all revealed first gets
   `finishBonus` (`clue_game_ended`). `clue_game_scored` (for the human only) holds recall (target hits by the sum of
   the numbers) and precision (own hits by guesses) per team. After the last of `games` games, `clue_match_ended` is
   written and the run limit `lanterns.match` ends the run. The facts are `lanterns.scores` and `lanterns.results`.
9. **With other mechanics.** It provides `brain-source` and tells the
   [strategy-brain](../strategy-brain/README.md) when a game starts and ends (`gameStarted`, `gameEnded` with a
   one-line summary), so a retro can hold the next game back. It starts a new epoch of the
   [team-channel](../team-channel/README.md) for both teams at each game and opens the post cap of a team at each of
   its clues. A game loads it before the strategy brain: its deadline may end a game in the same tick in which the
   brain opens the retro. In the scheduler's `inputs` its source comes after the strategy brain's and before the
   team chat's.
10. **What a resident is told.** Once per game the game's head with its role and the rules; at each turn the new
    lines of the game's record; the keeper and the caller their task at every turn, the advising seeker once per
    clue. Only the keeper on turn, the caller and an advising seeker who was not told yet have news.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `viewGrid`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([lanterns/tools/viewGrid](prompts/lanterns/tools/viewGrid.md)):

> Look at the grid: the words (revealed ones with their owner), the clues and guesses of this game so far, whose turn it is and your task. A keeper also sees the owner of every hidden word.

### `giveClue`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `word` | string | yes | The clue: one word, not on the grid and not part of a grid word. |
| `number` | integer ≥ 1 | yes | How many of your team's words the clue points to. |
| `targets` | string[] | yes | Exactly `number` of your team's hidden words you mean. Secret: only the record sees them. |
| `reason` | string | no | A short reason, for the record only. |

What the caller reads ([lanterns/tools/giveClue](prompts/lanterns/tools/giveClue.md)):

> Keeper only, on your team's clue turn: give one clue word and a number (how many of your team's hidden words it points to), and name exactly that many of your hidden words as targets. The targets stay secret; your seekers see only the word and the number. The clue must be one word that is not on the grid and does not hold or sit inside a grid word.

### `guess`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `word` | string | yes | A hidden word of the grid to reveal. |
| `reason` | string | no | A short reason, for the record. |

What the caller reads ([lanterns/tools/guess](prompts/lanterns/tools/guess.md)):

> The caller of the current clue only: reveal one hidden word of the grid. An own word lets you go on (up to the clue's guess limit, shown in your task); a fog word, a word of the other team or a shadow ends your turn.

### `endGuesses`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([lanterns/tools/endGuesses](prompts/lanterns/tools/endGuesses.md)):

> The caller of the current clue only: stop guessing after at least one guess; the turn goes to the other team.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

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
| `lanterns.recall` | Recall per team and game | - | `clue_game_scored` |
| `lanterns.precision` | Precision per team and game | - | `clue_game_scored` |
| `lanterns.recallLater` | Recall per team and game, from game 2 on | - | `clue_game_scored` |

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [lanterns/tools/viewGrid](prompts/lanterns/tools/viewGrid.md) | - |
| [lanterns/tools/giveClue](prompts/lanterns/tools/giveClue.md) | - |
| [lanterns/tools/guess](prompts/lanterns/tools/guess.md) | - |
| [lanterns/tools/endGuesses](prompts/lanterns/tools/endGuesses.md) | - |
| [lanterns/rules](prompts/lanterns/rules.md) | `size`, `perTeam`, `secondWords`, `fog`, `shadows`, `maxNumber`, `maxClues`, `wordPoints`, `shadowPenalty`, `landedBonus`, `finishBonus`, `deadline`, `guessLimit` |
| [lanterns/game-head](prompts/lanterns/game-head.md) | `game`, `games`, `starting`, `role` |
| [lanterns/task-clue](prompts/lanterns/task-clue.md) | `team`, `clueNo`, `maxClues`, `grid`, `own`, `opponent`, `shadows`, `maxNumber`, `pace` |
| [lanterns/task-caller](prompts/lanterns/task-caller.md) | `team`, `word`, `number`, `keeper`, `partner`, `grid`, `left` |
| [lanterns/task-partner](prompts/lanterns/task-partner.md) | `team`, `word`, `number`, `keeper`, `caller`, `grid` |
| [lanterns/keeper-silent](prompts/lanterns/keeper-silent.md) | - |

<!-- /generated:prompts -->

## Example

The game Lanterns (`games/lanterns/game.ts`) arrives with its own issue; the test game of this package
([`test/support.ts`](test/support.ts)) loads the mechanic as the old platform's Lanterns did:

```ts
clueGrid({ games, maxClues, deadline: 2, teams: TEAMS }),
teamChannel({ teams: TEAMS, maxPostsPerMove: 3 }),
strategyBrain({ enabled: brain, maxWords: 200, teams: TEAMS, retroMaxPosts: 8, retroMaxMinutes: 3, shared: false, brainAtStart: true, retroFocus: RETRO_FOCUS }),
```

`teams` names two teams of three, so the keeper role comes back to the first member in game 4; `maxClues` caps a
game at that many clues per team.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md). The rows were recorded on the old platform; a status says what was true there.

- **P190** a grid word was also the name of an owner ("shadow"). Fixed (the pool holds no owner's name; a test
  checks it).
- **P191** keepers are timid and nobody took the extra guess. Partly fixed (`maxClues` 5, `extraGuess` off, the
  landed bonus grows with the number; the numbers stayed low).
- **P192** a clue pointed at a visible shadow. Open (by design).
- **P194** a keeper called `giveClue` out of turn, and a caller ran out of calls in a tick. Partly fixed (the
  game's call limit was raised).
- **P195** no brain effect on two seeds. Small effect after the retro focus (the game's text).
- **P196** the team that starts more often wins. Partly fixed (`secondFewer`, four games in the game; a finer
  handicap is open).
- **P197** a cautious default number made a game unfinishable. Fixed (the pace line of the keeper's task).

## Tests

[`test/lanterns.test.ts`](test/lanterns.test.ts): four games with a rotating keeper, sealed targets and a brain per
team, the clue and the guess deadline, the refusals of `giveClue`, `guess` and `endGuesses`, the keeper's silence in
the team chat (stage `lock`, the prompt's text, no post written, open again between games), a fake run with an
accepted call of every tool, documented options, determinism and a run resumed from a snapshot.
[`test/model.test.ts`](test/model.test.ts): the word pool, the deal, the clue check, landed clues, scoring, recall and
precision, the pace line, the keeper's rotation. [`test/carried.test.ts`](test/carried.test.ts) holds the prompt
files, the tools with their parameters, the options, the events and the audiences to those of the old platform.
