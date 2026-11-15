# @swarmtales/sample-own-mechanic

Sample 5: a mechanic of your own. The tutorial that walks through it is
[`docs/tutorials/mechanic.md`](../../docs/tutorials/mechanic.md); every code block there is an include of a file here.

| File | What |
|---|---|
| [`src/contract.ts`](src/contract.ts) | the event `marked` and the service `marks`, declared apart from the mechanic |
| [`src/marks.ts`](src/marks.ts) | the mechanic `marks`: `defineHead` with one tool, one event, one option (checked against `Setup.actors`) and one service; `defineMechanic`; a `sample` function |
| [`src/tribunal.ts`](src/tribunal.ts) | the mechanic `tribunal`: `requires` and `call`, `uses` and `tryCall`, a listener of `marks.marked` with `after:`, the owner of the decision `tribunal.sentence` |
| [`game.ts`](game.ts) | the game: four residents, both mechanics, `decisions` with the human as holder, and `exile` |
| [`commands.sh`](commands.sh) | `swt run --fake`, `swt log verify`, `swt replay`, as the tutorial gives them |
| [`output.txt`](output.txt) | what the first command prints first |

## Tests

`test/play.test.ts` plays the game in process: the threshold brings a resident before the tribunal and `exile`
banishes it; without `exile`, `tryCall` answers undefined and the sentence stands; a holder's amendment is what the
tribunal commits; an immune id that is no actor is refused with `SWT-G020`; the log is the same with the mechanics
in another order. It runs the conformance checks (`checkPackage`, `checkOptionsDocumented`, `checkDeterminism`,
`checkSnapshotRoundTrip`) and the standing checks (`checkReplay`, `checkResumeEveryBoundary`). `test/tutorial.test.ts`
checks that every code block of the tutorial, and each block of the READMEs of `exile` and `decisions` that names
this sample, stands in a file of the sample, and runs the lines of `commands.sh` through the command line in
process. Nothing calls a model.
