# Lanterns

Two teams of three residents (amber: A01-A03, teal: A04-A06) play a match of an original word-clue game on a grid of
20 words. Each game one member of each team is its keeper (the role rotates game by game) and sees which words
belong to whom; the two others are seekers. The keeper gives one clue word and a number and names, sealed for the
report, the words it means; the seekers take turns calling the guesses while the other advises in the team chat. A
keeper may not post in the team chat while a game runs. Every game starts from a fresh context, and the team's only
memory is a short strategy brain, written as its conventions between keeper and seekers.

The game is a port of `stories/lanterns` of the old platform (tag `v0-final`): the prompts, the tool names, the
options and their defaults, the model block (output cap 16000) are the same, and the briefings are byte-identical.

```
swt run games/lanterns/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | `lanternsGame(options)` and the default export (four games, five clues, a brain for both teams) |
| `briefing.ts` | the two teams and what a resident reads before the run starts |
| `test/oracle.test.ts` | the four oracle files of `oracles/lanterns/` at level 3 |
| `test/carried.test.ts` | the sha256 of the briefings, the tool lists, the output cap, the old variant names against the options |
| `test/lanterns.test.ts` | the carried game tests (roster order): the match, the retro focus, a fresh context per game |
| `test/fake.test.ts`, `test/standing.test.ts` | the fake run and the standing checks |

## Variants

The id is always `lanterns`; a variant is a set of options of `lanternsGame`, not a name. The old names map as:
`lanterns` is `{}`, `lanterns-nobrain` is `{ brain: false }`, `lanterns-g<n>` is `{ games: n }`, `-c<n>` is
`{ maxClues: n }`.

| Option | Default | Meaning |
|---|---|---|
| `games` | 4 | games in the match; each team has the first clue twice |
| `brain` | true | false is the control arm: the same briefings without the brain paragraph, no brain, no retro |
| `maxClues` | 5 | clues per team and game |
| `maxWords` | 200 | words a brain may have |
| `seed`, `minutes` | 31, by `games` and `maxClues` | the seed and the length of the run in ticks (an upper bound; the match ends the run) |

Mechanics: `lanterns`, `team-channel`, `strategy-brain`.

## Open

Resumed from a snapshot file, `lanterns` gives back its cards, clue records and results with sorted keys, so later
events carry the same values with their keys in another order (`test/standing.test.ts`). The fix belongs to
`mechanics/lanterns`.

## Runs

No run on this platform yet. The recorded runs of the old platform are under `stories/lanterns/runs/` at the tag
`v0-final`.
