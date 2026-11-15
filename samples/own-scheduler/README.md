# @swarmtales/sample-own-scheduler

Sample: the scheduler sample `parallel`, a second scheduler written outside the engine, against the public
contract only (decision A30). The tutorial that walks through it is
[`docs/tutorials/scheduler.md`](../../docs/tutorials/scheduler.md); every code block there is an include of a file
here. What each scheduler promises, and what is not supported under `parallel`, is in
[`docs/SCHEDULERS.md`](../../docs/SCHEDULERS.md).

Under `parallel` every woken actor acts on its own, and its calls are committed in the order in which they arrive.
A scan runs at the start of a tick and at every close; a tick ends when no activation is open and a scan opens
none, and the option `activations` caps an actor's activations in one tick (decision A35). A game names it with
`scheduler: { id: "parallel" }` and is resolved with the table `{ turns, parallel }` (the testkit's `play` and
`replay` take it as the option `schedulers`). It is not a scheduler of the platform: `swt run` cannot name it.

| File | What |
|---|---|
| [`src/parallel.ts`](src/parallel.ts) | the scheduler: the wake rule, the scan, the start and the close of an activation, one tick |
| [`src/options.ts`](src/options.ts) | its options |
| [`src/sealed.ts`](src/sealed.ts) | the mechanic `sealed` of the sample game: a sealed guess per round, opened when the tick ends |
| [`game.ts`](game.ts) | the sample game: three residents, three rounds, under `parallel` |

## Tests

`test/parallel.test.ts`: arrival order, the wake rule, `idle`, failures and resolution. `test/replay.test.ts`:
replay under sixty interleavings and resume from every boundary by replay. `test/director.test.ts`: a Director
under `parallel` and the pause between ticks. `test/game.test.ts`: the sample game ends with the same result lines
under `turns` and under `parallel`. `test/channels.test.ts`: the limit of `channels`, the "seen" mark that goes
wrong when two activations are open. `test/tutorial.test.ts`: every code block of the tutorial is an include. The
mechanic `board` of `test/board.ts` is the fixture of the first three. Nothing calls a model.

Specification: `docs/refactoring-before-release/11-m4-spec.md`, section 3.
