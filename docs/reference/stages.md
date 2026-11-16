# The stages of a call

Every tool call, of a resident, a Director, the human or the actor `script`, passes one fixed pipeline in the kernel
(`packages/kernel/src/dispatch.ts`). This page lists the stages, what a mechanic can add to each, the stage `review`
and staged calls. The types are in `packages/sdk/src/mechanic/types.ts`; the tutorial
[Write a mechanic](../tutorials/mechanic.md) shows a tool with its handlers.

## The pipeline

A call is `tool_called`, then the stages below in this order, then `tool_result`. A refusal at any stage is one
`tool_refused` with its stage and code, and ends the call. Every handler runs in its own frame, so the listeners of
what one handler emitted run before the next one.

| Stage | Who | What |
|---|---|---|
| `limit` | kernel | the run's step limit |
| `lock` | kernel, then the `lock` handlers | the tool is known, granted and open for the actor (`TOOL_UNKNOWN`, `TOOL_NOT_GRANTED`, `TOOL_LOCKED`); a `lock` handler of a mechanic refuses before the arguments are checked and must not emit |
| `parse` | kernel | the arguments against the tool's schema (`INVALID_ARGUMENTS`) |
| `rule` | the tool's `check`, then the `rule` handlers | refusals on checked arguments |
| `review` | the `review` handlers, then the tool's own review | a question to a Director, see below; a refusal is logged at `guard` (a handler's) or `consult` (the tool's own) |
| `execute` | the tool's `run` | emits events and returns the reply, or a refusal |
| `after` | the `after` handlers | see the outcome, also a refusal of `run`; the stage-handler trigger of a Director fires here |

`STAGES` of `@swarmtales/contracts` also names `afford` and `settle`; no handler runs at them. The handlers of other
mechanics (`pipeline` in a mechanic's body: `lock`, `rule`, `review`, `after`) see the calls of every tool, by its
bare name (`call.tool`), in load order.

**Who enforces a rule.** A base mechanic names no game mechanic. A rule of a game over a tool of a base mechanic
(a price in marks on a direct message, the guard on a board post, the check of a secret in a Director's note) is
enforced by the mechanic that owns the rule, in its own stage handler on that tool by bare name: `marks` prices the
tools of `channels` in its `rule` and `after` handlers, `puzzles` guards them in its `review` handler.

## The stage `review`

A review is a question asked before a call runs and answered by an actor that is not the caller: a Director whose head
says `answers: "<answerer>"` (see [Directors](directors.md)). The lane is held while the answer is awaited, so no other
call commits in between. A review is a `MechanicReview`:

| Part | What |
|---|---|
| `answerer` | the answerer it asks |
| `ask(input, ctx, answerable)` | returns `{ question }` to ask, `undefined` to go on without asking (a skip: nothing is asked or recorded), or a refusal that ends the call; `answerable` is false when no Director of the run answers |
| `decide(answer, input, ctx)` | optional: refuses on the answer, also on `{ ok: false }` when the answer failed or did not fit the Director's `output`; left out, the call goes on |

There are two places for one:

- **A tool's own review** (`review` beside `check` and `run` in its handlers): it gets the checked arguments, and
  `run` gets the answer as its third argument. Example: `blame` of [receipts](../../mechanics/receipts/README.md),
  whose judge rules on the claim; without a judge it refuses `JUDGE_ABSENT` at `consult`, and on a failed answer
  `run` refuses `JUDGE_FAILED` at `execute`.
- **A `review` handler** in the pipeline of another mechanic: it gets the call. Example: the hand-over guard of
  [puzzles](../../mechanics/puzzles/README.md) on the board, group and transfer tools; its own check refuses a leak at
  once (`GUARD_BLOCKED` at `guard`, nothing asked), else it asks the guard and lets the call through when the answer
  fails ("fail open").

The question and the answer are records of the engine's source `@swarmtales/engine/review` (`asked`, `answered`)
inside the call, before its result, so a replay reads the answer from the log and asks nothing. A snapshot is never
taken inside a call, so no review is open at a boundary. A game whose tool's own review names an answerer that no
Director of the game answers is refused at load (`SWT-D004`); a `review` handler is told `answerable` and decides.

## Staged calls

A mechanic can stage a tool call that the kernel makes as the actor `script` after the step that staged it (a hook,
a job, or a tool call with the listeners of what it emitted):

- `ctx.stage(tool, params, { then })` queues the call. `then` names a job of the same mechanic that runs after the
  call with its outcome, `{ ok: true, reply }` or `{ ok: false, code, detail? }`; `onStaged(job)` gives that job its
  typed form.
- The queue is drained depth first: what a staged call and its `then` job stage runs before the calls queued behind
  it. Each call passes the whole pipeline, logged as `tool_called` with `causedBy` the line that staged it. The drain
  is synchronous: a staged call is not awaited, so a tool with its own review cannot be staged (refused
  `TOOL_NOT_GRANTED` at `lock`), and a `review` handler is told that no answerer answers.
- The head lists the tools a mechanic stages (`stages: ["directorMinute"]`). A game must grant each of them to
  `script` (`grants.script`, or `for: ["script"]` in the tool's head), and that grant may hold no tool with a review;
  otherwise the game is refused at load (`SWT-G015`). At run time a staged call of a tool outside the grant is refused
  like any call, and the refusal is the `then` job's data.
- A staged call is a result of the run, not an input of a replay: the mechanic stages it again when the replay plays
  its hook, job or call, and the line is compared like any other. The queue is empty at every boundary, so a
  snapshot holds none.

Examples: [script](../../mechanics/script/README.md) stages `directorMinute` at every tick start, after the tick hooks
of the mechanics it follows; [petitions](../../mechanics/petitions/README.md) stages `resolvePetition` for an
expired petition.
