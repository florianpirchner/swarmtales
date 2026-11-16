# Directors

A **Director** is a model actor that is not a resident. This page lists the head of `defineDirector` and what each
field does in a run: the triggers (an event, every n ticks, a resident's call), the facts it reads, the stage
`review` it answers, and the Director that acts by tool use. The types are in `packages/sdk/src/director/define.ts`;
the queue of the firings is the plugin `directors` (`packages/sdk/src/director/plugin.ts`); the drivers are in
`packages/engine/src/directors/driver.ts`. The tutorial [Write a Director](../tutorials/director.md) builds one.

## The head

| Field | What |
|---|---|
| `id`, `summary` | the id a game names in `directors[].use`, and one sentence on what it does |
| `options` | the schema of its options; a game passes them in the use, checked at load (`SWT-G020`) |
| `on` | its triggers, below; without one it is woken only to answer a review |
| `facts` | the facts of the game it reads, `<mechanic>.<fact>`: its sight. `ctx.facts` holds their values, read when the context is made; a key that no loaded mechanic computes fails the activation (`SWT-R015`) |
| `output` | the schema its model's answer must fit |
| `limits` | `maxCalls` (questions in a run; past it the plugin `directors` writes `skipped` once and queues no firing), `maxCostUsd` (its model calls in US dollars, counted by the asker), `maxRequests` (the requests of one look of a Director that acts by tool use; 2 when left out) |
| `answers` | the answerer of the stage `review` it is |
| `acts` | `answer` (the default) or `tools` |

A Director's actor id is `director:<name>`, its name the `as` of its use, else its id. It calls tools only of its
grant (`grants.<name>`), and a scheduler must activate the kind `director` (`SWT-D003`; for `turns`,
`afterBlocks: ["director"]`).

## Triggers

| Trigger | Fires | The firing's `event` and payload |
|---|---|---|
| `{ event: "<mechanic>.<event>", where?, quiet? }` | when that mechanic writes that event and `where` keeps its payload; an event no loaded mechanic declares fails the game (`SWT-D001`) | the event, its payload |
| `{ every: n }` | at the start of every tick whose number is a multiple of `n` (ticks count from 0, so tick 0 fires), after the tick's jobs and before its first pass | `every`, `{ every: n }` |
| `{ event: "tool_called", tool, where? }` | when a resident's call of that tool (bare or canonical name) has reached `execute`, in the plugin's stage handler `after`; a call refused before `execute` does not fire | `tool_called`, `{ actor, as, params }` with the params checked |

The plugin `directors` queues each firing with its number `n` (from 1, among the firings of this Director) and its
tick; `ctx.firings` holds the firings since the Director was asked last. A firing kept only by triggers with
`quiet: true` wakes nobody: it waits and is taken along by the next activation that another trigger wakes. The
gamemaker of [city-directors](../../mechanics/city-directors/README.md) is woken by `arena.round_end` (with `where`
for its cadence) and takes the events since its last look along through quiet triggers.

## Asking and acting (`acts: "answer"`)

In its activation the Director's driver writes the record `asked` (source `@swarmtales/engine/director`, the
numbers of the firings), asks the model with `system(ctx)` and `input(ctx)`, and writes `answered`. An answer that
fits `output` goes to `act`, whose only way to change the run is `ctx.call(tool, params)`; a refused call is an
outcome, not a throw. Without an answer that fits (a limit, an error, an answer out of shape) `fallback(ctx)` is the
answer, and without a fallback the Director does nothing. A fake run has no model, so it acts on its fallback.
Replay reads the answer from the record and asks nothing.

## Answering a review (`answers`)

A review that names the answerer (see [the stage `review`](stages.md#the-stage-review)) is put to the Director whose
head says `answers: "<answerer>"`, inside the call and while the lane is held. Its `system(ctx)` and `input(ctx)`
read the question in `ctx.question`; `firings` is empty. The question and the answer are the records `asked` and
`answered` of the source `@swarmtales/engine/review`, and the cost counts under the answering Director's limits. An
answer that fails or does not fit `output` reaches the review as `{ ok: false }`, and the review decides; the
Director's `act` and `fallback` are not used. A fake run gives every review a failed answer. A tool's own review
whose answerer no Director of the game answers fails the game at load (`SWT-D004`). The judge and the guard of
[city-directors](../../mechanics/city-directors/README.md) are woken by nothing else.

## Acting by tool use (`acts: "tools"`)

The declared exception of the rewrite: with `acts: "tools"` the model gets the tools of the Director's grant that are
open now and calls them, in order and through its activation, until it answers without a tool call or the look
reaches `limits.maxRequests`. `output`, `act` and `fallback` are not used; `system` and `input` are the texts of the
look. The driver is the resident session of the models package (the same request, tool list and limits as a
resident's), and a look keeps no conversation for the next one. The Director's calls are calls of its activation and are replayed as such. A fake run
plays the look with the fake driver, from the `sample` functions of the tools. The gamemaker is such a Director.

`swt run` and `swt resume` replace the model of one Director for a live run with
`--director-model <name>=<provider>/<model>[:<thinking>[:<output cap>]]`, named in the manifest
([the command line](cli.md)).
