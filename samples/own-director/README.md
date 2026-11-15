# @swarmtales/sample-own-director

Sample 6: a Director of your own. The tutorial that walks through it is
[`docs/tutorials/director.md`](../../docs/tutorials/director.md); every code block there is an include of a file here.

| File | What |
|---|---|
| [`game.ts`](game.ts) | the game: three residents name a captain; the decision's holders are the Director and the human |
| [`src/crew.ts`](src/crew.ts) | the mechanic `crew`: the tool `nominate`, the decision `crew.captain` with a window, its commit |
| [`src/steward.ts`](src/steward.ts) | the Director `steward`: an event trigger, a structured answer, an act through its grant, a fallback |
| [`hands/amend.jsonl`](hands/amend.jsonl) | the hand file: pause, snapshot, resume, and the human's amendment |
| [`commands.sh`](commands.sh) | `swt run --fake --hand`, `swt log verify`, `swt resume`, `swt replay`, as the tutorial gives them |
| [`output.txt`](output.txt) | what the first command prints first |

## Tests

`test/play.test.ts` plays the game in process with an asker of the test: a structured answer makes the steward
amend the decision, an answer that does not fit makes it act on its fallback, and both hold the standing checks
`checkReplay` and `checkResumeEveryBoundary`. `test/tutorial.test.ts` checks that every code block of the tutorial
stands in a file of the sample, runs the lines of `commands.sh` through the command line in process, and resumes a
plain fake run from every boundary through `swt resume` (the log is the straight log, verifies with `--previous`
and replays equal). Nothing calls a model.
