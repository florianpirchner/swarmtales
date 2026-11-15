# @swarmtales/game-whispers

Six residents pass the doors of ECHO by trading password fragments by DM, while one of them, the whisperer, is
seeded to sow distrust. Every delivered DM leaves a receipt that quotes it word for word (variant `whispers`), or
there are no receipts to show and it is word against word (variant `whispers-rumours`, the param `receipts: false`).
A gamemaker looks after every round, a Confessor reads the residents' words when the classifier is on, a guard stops
fragments on the board, and the city holds a popularity vote before each door.

The game is a port of `stories/whispers` of the old platform (tag `v0-final`): the story data, the prompts, the tool
names and the model blocks are carried byte for byte.

```
swt run games/whispers/game.ts --fake
```

## Files

| File | Holds |
|---|---|
| `game.ts` | the params `WhispersParams`, `whispersGame(params)`, the family `whispersFamily` and its default export: the Directors, the grants, the locks, the scheduler and its input order |
| `src/story.ts` | the old story data (carried), as `whispersData(receipts)` |
| `src/story/define.ts`, `src/story/motives.ts` | the helpers of the old story builder and the City's core motives (carried) |
| `src/compose.ts` | the compose step: the mechanics of the cluster and their options, read from the story and the dials |
| `test/carried.test.ts` | the story data against `oracles/whispers/setup/*.story.json`, the model blocks |
| `test/oracle.test.ts`, `test/support.ts` | `whispers-s7`, `-s11` and `-rumours-s7` at level 3, after the registered changes of `oracles/whispers/README.md` |

## Params

| Param | Default | Meaning |
|---|---|---|
| `receipts` | true | `false` is the variant `whispers-rumours`: no receipt can be shown |
| `agents` | 6 | the residents; only 6 is played (SWT-G041 otherwise) |
| `minutes`, `lastLevel` | 45, 7 | the run length and the last door |
| `passesPerMinute`, `activation` | 3, `onNews` | the scheduler |
| `stopWhenDone`, `stopWhenSeatsDecided` | false | end the run early |
| `gamemaker`, `classifier`, `names`, `coreMotives`, `whisperer`, `guards` | true | the dials of the old story |
| `figureDirection`, `gmDirection` | 4 | the direction levels of the whisperer's figure and of the gamemaker |

## Turn inputs

The scheduler's `inputs` keeps the old hook order (2.5 rule 2): the script, the status line (`{ kind: "status",
join: " · " }`), the task with the lines its owners write under it (`{ kind: "task", join: "\n" }`), the rest of
`progression`, then `channels`.
