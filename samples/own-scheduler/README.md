# @swarmtales/sample-own-scheduler

Sample: the scheduler sample `parallel`, a second scheduler written outside the engine, against the public
contract only (decision A30).

Under `parallel` every woken actor acts on its own, and its calls are committed in the order in which they arrive.
A scan runs at the start of a tick and at every close; a tick ends when no activation is open and a scan opens
none, and the option `activations` caps an actor's activations in one tick (decision A35). A game names it with
`scheduler: { id: "parallel" }` and is resolved with the table `{ turns, parallel }` (the testkit's `play` takes it
as the option `schedulers`). It is not a scheduler of the platform: `swt run` cannot name it.

Specification: `docs/refactoring-before-release/11-m4-spec.md`, section 3. The tutorial arrives with issue M4-55.
