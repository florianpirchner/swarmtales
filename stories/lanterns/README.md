# Lanterns

Two teams of three (amber: A01-A03, teal: A04-A06) play a match of an original **word-clue game**. A grid
of 20 words is dealt from the game's own word pool. Each word secretly belongs to the team with the first clue of
the game (6), the other team (5, which evens out the first move, P196), the fog (7, nobody's) or the shadows
(2). Only the two **keepers** see who owns which word.

- **Roles.** In each game one member of each team is its keeper and the two others are **seekers**. The
  keeper role rotates game by game (game 1 A01 and A04, game 2 A02 and A05, game 3 A03 and A06), so in the
  default match of four games (each team starts twice, P196) A01 and A04 keep twice.
- **A turn.** The keeper gives one clue with `giveClue`: a single word (not on the grid, not holding or
  inside a grid word, not the same stem), a number from 1 to 4, and the words it means (`targets`, sealed:
  only the record sees them). The seekers take turns as the **caller** of a clue; the caller reveals words one
  at a time with `guess` (up to the number; number + 1 with the mechanic option `extraGuess`, the rule of the first two runs) or stops with `endGuesses`, while the other seeker advises in the
  team chat. A fog word, a word of the other team or a shadow ends the turn at once.
- **Silence.** A keeper may not post in the team chat while a game runs; the clue is the only thing it can
  tell its seekers. Between games (the retro) it talks again.
- **Scoring.** 1 point per own word revealed, whoever reveals it; -3 for each shadow a team reveals; for
  each **landed** clue (a number of 2 or more whose first guesses were all own words) +1 per word beyond the
  first (a landed 3 scores 2); +3 for the team whose words are all revealed first, which ends the game.
  Otherwise a game ends after 5 clues per team. (The first run had +1 per landed clue and 8 clues; both
  changed after it, P191.) The keeper's task says how many own words are left against how many clues
  (P197). A keeper who gives no clue in 2 minutes loses the turn; a caller who does nothing for 2 minutes ends it.

The game is an original design ([docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.9) in the
genre of team word-association games; it copies no published title: own word pool, grid size and key, the
point scoring with a shadow penalty instead of a sudden loss, the landed-clue bonus, the sealed targets and
the rotating keeper.

Every game starts from a fresh context. The only memory a team carries is its **strategy brain**, written
before game 1 and after each game in a short retro in the team chat. The question is whether a team builds
conventions between keeper and seekers that survive a change of keeper. There is no solver for word
association; the `clue-grid` mechanic measures **intent transfer** instead: for every clue the keeper's
targets against what the seekers revealed (`recall`: target hits over the clue numbers; `precision`: own
words over guesses), per team and game in the event `clue_game_scored`, for the human and the reporter only.

```
swt run --story lanterns --provider scripted     # offline, no model
swt run --story lanterns                         # Haiku via Anthropic, four games
swt run --story lanterns-g2                      # two games: each team starts once
```

The retro asks for the team's conventions between keeper and seekers, not for caution (the strategy
brain's `retroFocus` option, P195). Registered arms: `lanterns` (team brains) and `lanterns-nobrain` (the same briefings, no brain, no retro);
by name `lanterns[-nobrain][-g<games>][-c<clues>]`. Further options of `lanternsStory` in `story.ts`:
`games`, `brain`, `maxClues`, `maxWords`, `seed`; the grid and scoring numbers are options of the `clue-grid`
mechanic (`size`, `columns`, `perTeam`, `secondFewer`, `shadows`, `maxNumber`, `maxClues`, `wordPoints`, `shadowPenalty`,
`landedBonus`, `finishBonus`, `deadline`). Mechanics: `clue-grid`, `team-channel`, `strategy-brain`. Runs and
results: [runs/README.md](runs/README.md).
