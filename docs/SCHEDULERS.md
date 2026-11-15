# Schedulers

A scheduler decides who acts when in a tick: it wakes actors, opens their activations, hands each one to its
driver and closes it. The kernel writes the log, runs the tools and stays a single writer whatever the scheduler.
A scheduler is a `SchedulerDefinition` of `@swarmtales/contracts` (`packages/contracts/src/kernel/ports.ts`); a
game names one with `scheduler: { id, options }`.

| Scheduler | Where | What it is |
|---|---|---|
| `turns` | `packages/engine/src/turns/` | the scheduler of the platform. Every game is played under it, and it is the reference of every comparison through 1.0 |
| `parallel` | [`samples/own-scheduler/`](../samples/own-scheduler/README.md) | a sample, written outside the engine against the public contract only. `swt run` and `swt experiment` cannot name it, and no game of the platform is played under it. The tutorial [Write a scheduler](tutorials/scheduler.md) walks through it |

Specification: `docs/refactoring-before-release/11-m4-spec.md`, section 3.

## What each scheduler promises

| Level | `turns` | `parallel` |
|---|---|---|
| **reproducible:** the same seed and scripted drivers give the same log | yes | **not promised.** With drivers that answer at once, the order is the one of the JavaScript job queue, which is stable in one Node version and nothing more. No test compares two `parallel` runs with each other |
| **replayable:** the recorded inputs, applied in log order, give every result again | yes | yes, and tested: the log is the schedule (`samples/own-scheduler/test/replay.test.ts`, sixty races) |
| **authentic:** the hash chain | yes | yes |
| the order of calls | the order of the pass: a seeded shuffle or the definition's order (`order`); the calls of member k of a block wait until member k-1 is closed | the order of arrival: an open actor never waits for another actor |
| determinism in the manifest | `"seeded"` | `"recorded"` |

The replay of the testkit (`packages/testkit/src/replay.ts`) makes each call when the replayed log has reached the
line before it, and returns from an activation only when the log has reached the line before its
`activation_closed`. The second input is what makes a `parallel` log replay; under `turns` it changes nothing. Random
draws of mechanics are labelled streams, so the order of arrival moves nobody's dice. The `basis` of a call is the
log length its actor had seen: under `parallel` it tells a seat that ignored a move from a seat that could not know
it.

## When a waiting actor is woken

Both schedulers use the same wake rule, per actor: `always`, news (`hasNews`), a pending answer of its driver
(`answer`, under `onNews`), or the plugin's `toAct`. They differ in when they ask.

| | `turns` | `parallel` |
|---|---|---|
| when the rule is asked | for each member when its block of a pass starts | at every scan: at the start of a tick and at every close, and nowhere else |
| an actor that gets news while others act | is woken at its place in the next pass, or in the next tick | waits until some activation closes; the scan of that close wakes it. While no activation is open the tick has ended, and the first scan of the next tick wakes it |
| how many activations in a tick | at most one per pass (`passes`) | at most `activations` |
| when the tick ends | after the last pass | when no activation is open and a scan opens none |
| `idle` of `endTick` | true only when no pass started | true only when the tick was halted before its first scan; a tick in which nobody was woken is not idle |

So "acts on its own" means: an open actor never waits for another actor; a closed actor waits for the next close.

The `answer` wake is the rule of the old platform: a resident whose model ended its activation on a tool result it
has not read is woken for that result alone, with no news and often no input line. Two marks of a mechanic stop it,
and the scheduler has no option of its own for it: a free look (`free: true` on the tool), and a success that ends the
activation (`reply(text, { endsTurn: true })`). A port keeps the marks of the old mechanic, so its empty answer turns
stay (P474, P475, P477 of `docs/LESSONS-LEARNED.md`). The option `quietEnds` of `strategy-brain`, `trick-play` and
`convoy` (and the param `quietEnds` of liar's dice, Blind Bid, Ember Tricks and Convoy) sets `endsTurn` on a call
after which the seat has nothing open; it is off by default, so the oracle files and the game hashes hold, and the
runtime revision does not change (`games/*/test/quiet-ends.test.ts`).

## What is not supported under `parallel`

| What | Why | Shown by |
|---|---|---|
| a mechanic that keeps a mark from its `turnInputs` hook to the end of the same activation and assumes that no other activation is open, such as the board's "seen" mark of `channels` | the mark is taken when the inputs are built. A post that another open actor writes after that is not marked, also when the resident reads it, and the resident is woken once more for it. Under `turns` the same holds only for a `blockSize` above 1, which `channels` refuses | `samples/own-scheduler/test/channels.test.ts`, "wakes A02 once more for a post it has read: the seen mark was taken while A01 was open". The activation hooks are what lifts the limit (M5) |
| a game whose score depends on the order of arrival | the order is not reproducible. A game fair under `parallel` seals its moves until the tick ends, as the sample game does | `samples/own-scheduler/test/game.test.ts` |
| the standing check "resume equals the straight log" | a resumed part is a new race. The check under `parallel` is that the replay drivers of the rest of the straight log, given to the resumed kernel, write the rest of that log | `samples/own-scheduler/test/replay.test.ts` |
| a snapshot inside a tick | an open activation is not in a snapshot. A boundary is where `endTick` has returned: no activation is open and no call is in flight. A pause comes between ticks only | |
| slots (`afterBlocks`) | `parallel` has no blocks. A kind that `turns` serves in a slot is listed in `kinds`; a Director is then woken by news at the next scan, also while residents are open | `samples/own-scheduler/test/director.test.ts` |
| `SchedulerPort.safePoint`, a fair queue, a cap on requests in flight, a stale policy, ticks by wall clock or by commit count | not built | |

The state of `parallel` in a snapshot is the set of pending actors (`{ pending }`, the slice of `turns`); the count
of activations per tick is zero at every boundary and is not in it.
