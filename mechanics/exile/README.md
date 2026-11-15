# Exile

Banishing a resident for good. The mechanic keeps the list of the banished, writes one event (`exiled`) and holds one
suspension, so a banished resident is never activated again and has no open tool. It has no tool and no option, and
it names no other mechanic: whoever owns something of a banished resident (points, pieces) listens to `exiled` and
clears it away itself.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-exile` |
| Id | `exile` |
| Summary | Banishing a resident: one event, one suspension, and the list of the banished. |
| Requires | none |
| Uses when loaded | none |
| Provides | `exile` |
| State | kept, snapshot slice version 1 |
| Games | [city-slice](../../games/city-slice/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Who banishes.** No resident can: the mechanic has no tool. Another mechanic (a court) decides and calls the
   command `banish` of the service `exile` with the resident's id. A line on the board about it is the caller's to
   post, before the call.
2. **What a call does.** `banish` writes `exiled {agent, by}` and then suspends the resident with the reason
   `exiled` (the kernel's `actor_suspended`, by `exile`). `by` is the `by` of the call, or the id of the calling
   plugin when the call names none. From then on `RosterService.present` is false for the resident, the scheduler
   skips it and its calls are refused.
3. **Refusals.** For an id that is no resident the answer is `{ ok: false, code: "UNKNOWN_RESIDENT" }`, for a resident
   banished before `{ ok: false, code: "ALREADY_EXILED" }`. Neither writes an event or a suspension; the kernel's own
   record of the command (`service_called`) is still on the log.
4. **Who cleans up.** Listeners to `exiled` run after the call, in load order (changed by `after`), so they find the
   resident suspended already. The [ledger](../ledger/README.md) burns the balance, the
   [puzzles](../puzzles/README.md) burn the pieces. `isExiled` and `exiled` answer who is banished, in the order of the
   calls.
5. **State.** The slice is `{ exiled: string[] }`; a resumed run knows the banished and refuses a second `banish`.
6. **What it does not do.** Nobody comes back: there is no gate, no ransom and no last will, and the suspension is
   never lifted.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `exiled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident that was banished |
| `by` | string | yes | Who banished it: the `by` of the call, or the id of the calling plugin when the call names none |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic takes no options.

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `exile`

Banishes residents and says who is banished.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `banish` | command | resident: string, by?: string | { ok: boolean, code?: "UNKNOWN_RESIDENT" or "ALREADY_EXILED" } | Banishes a resident: writes `exiled`, then suspends it with the reason `exiled`. Writes nothing when the resident is unknown or banished already. |
| `isExiled` | query | resident: string | boolean | Says whether the resident is banished. |
| `exiled` | query | - | string[] | Every banished resident, in the order they were banished. |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic has no prompt files.

<!-- /generated:prompts -->

## Example

From [`games/city-slice/game.ts`](../../games/city-slice/game.ts):

```ts
mechanics: [
	ledger({ startPoints: 30 }),
	channels(),
	exile(),
	// ...
	court({ opensAt: 4, closesAt: 6, window: 2 }),
],
```

`exile` takes no options and has no tool, so no grant names it. The `court` requires its service and banishes;
`ledger` and `puzzles` listen to `exiled`. A mechanic that banishes imports the `/contract` entry, never the mechanic:

```ts
import { ExileService } from "@swarmtales/mechanic-exile/contract";

const done = ctx.call(ExileService, "banish", { resident: "A04" });
if (!done.ok) return refuse(done.code ?? "REFUSED");
```

A mechanic that can play without `exile` names it under `uses` and calls it with `tryCall`, which answers
`undefined` when no loaded mechanic provides the service. The tribunal of sample 5 does so
([`samples/own-mechanic/src/tribunal.ts`](../../samples/own-mechanic/src/tribunal.ts)):

```ts
	const banished = ctx.tryCall(ExileService, "banish", { resident });
	ctx.emit("sentenced", { resident, changed, exiled: banished?.ok === true });
```

A listener of an event is written the same way for `exiled` as for any other: the declared events, the type, the
handler, and the mechanics whose listeners of that event must run first. The same file listens to `marks.marked`:

```ts
		kit.listen(
			MarksEvents,
			"marked",
			({ name }, ctx) => {
				if (ctx.call(MarksService, "against", { resident: name }) !== ctx.options.threshold) return;
				const answer = ctx.call(DecisionsService, "propose", { kind: SENTENCE, proposal: { resident: name }, window: ctx.options.window, schema: Sentence });
				if (answer.committed) sentence(ctx, name, false);
			},
			{ after: ["marks"] },
		),
```

The tutorial [Write a mechanic](../../docs/tutorials/mechanic.md) walks through it.

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

## Tests

`test/exile.test.ts`, offline, with a test mechanic in the place of a court: `banish` writes `exiled` and then the
suspension; a second `banish` and an unknown id are refused and write nothing; the `by` of the event; the slice
after a snapshot and a resume; `RosterService.present` afterwards; and a head that requires and uses nothing.
