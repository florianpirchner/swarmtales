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

The recorded live runs are listed in [`RUNS.md`](RUNS.md).

## Files

| File | Holds |
|---|---|
| `game.ts` | the params `WhispersParams`, `whispersGame(params)`, the family `whispersFamily` and its default export: the Directors, the grants, the locks, the scheduler and its input order |
| `src/story.ts` | the old story data (carried), as `whispersData(receipts)` |
| `src/story/define.ts`, `src/story/motives.ts` | the helpers of the old story builder and the City's core motives (carried) |
| `src/compose.ts` | the compose step: the mechanics of the cluster and their options, read from the story and the dials |
| `prompts/receipts/tools/showReceipt.md` | the description of `showReceipt` as Whispers showed it: a DM receipt quotes the DM (J68) |
| `test/carried.test.ts`, `test/prompt-pins.json` | the story data against `oracles/whispers/setup/*.story.json`, the model blocks, and every prompt file of the game's mechanics, Directors, the library and the game pinned to the sha256 of its old body, with the map of old to new ids |
| `test/oracle.test.ts`, `test/support.ts` | `whispers-s7`, `-s11` and `-rumours-s7` at level 3, after the registered changes of `oracles/whispers/README.md` |
| `test/holdout.test.ts` | `whispers-holdout-s7` at level 3 up to the call of the trial, and the trial to its strike by projection |
| `test/fake.test.ts`, `test/fake.ts` | the fake run of 45 minutes, the gamemaker's look included, with every reachable tool; the drivers of a fake run |
| `test/standing.test.ts` | replay and resume from every boundary, on fake runs with the Directors acting |
| `test/prompts.test.ts` | the residents' system prompts against the sha256 of the old ones (`oracles/system-prompts.md`) |
| `test/metrics.test.ts`, `test/report.test.ts` | the metrics of the facts table against the oracle files, none absent on the holdout file; the facts table of `swt report` |
| `test/story.test.ts` | the old story test (`test/stories/whispers.test.ts` of `legacy`) where it tests the game: one scripted run of all seven doors and the final vote, the control run and the rumours |

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
