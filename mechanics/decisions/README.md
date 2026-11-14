# Decisions

The decision window. A mechanic does not commit a weighty decision at once: it proposes it, and for a number of
ticks the holders of the game (a person's hand, a Director, a resident) may put another proposal in its place. At
the deadline the decision settles with the proposal that stands, and the mechanic that proposed it commits that
one. Without a holder that can act, or with a window of 0, there is no window and the mechanic commits at once.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-decisions` |
| Id | `decisions` |
| Summary | A decision window: a proposal that its holders may amend before it settles. |
| Requires | none |
| Uses when loaded | none |
| Provides | `decisions` |
| State | kept, snapshot slice version 1 |
| Games | [city-slice](../../games/city-slice/README.md) |

<!-- /generated:glance -->

## How it plays

1. A mechanic (the **owner**) calls `propose` of the service `decisions` with a `kind`, a `proposal`, a `window` in
   ticks and, if it wants, a JSON `schema` that every amended proposal must fit. The owner is the id of the calling
   mechanic.
2. With a `window` of 0, or when no holder can act, `decisions` writes no event and keeps nothing: the answer is
   `committed: true`, and the owner commits in its own frame. A holder can act when it is an actor of the run that
   no mechanic has suspended. The kernel still writes its `service_called` for the call.
3. Otherwise the decision gets the id `D1`, `D2`, ..., `decision_proposed` is written with the deadline
   (`tick + window`) and the holders that can act, and a job is set at the deadline. The answer is
   `committed: false` with the id.
4. Until the deadline the holders may amend the decision; the last amendment stands. (The tool `amendDecision`, its
   refusals and `decision_amended` arrive with the second issue of this mechanic; the `/contract` entry holds them
   already.)
5. At the start of the deadline's tick, before anybody acts, the job writes `decision_settled` with the proposal
   that stands; `changed` is true when an amendment stands that differs from the original. The owner listens to
   `decision_settled`, checks `kind` and `owner`, and commits there: its events are caused by the settlement.

A decision whose deadline lies after the last tick of the run stays open: it is in the last snapshot and is never
settled. `decisions` never calls its owner back and names no other mechanic, so it cannot be part of a service
cycle. A proposal that does not fit its own `schema` is a mistake of the owner and stops the run.

The option `holders` lists actor ids, not resident ids, because a holder need not be a resident. An id that is no
actor of the run is refused with `SWT-G020` while the kernel is created, before `run_started`.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic declares no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `decision_proposed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `decision` | string | yes | The id of the decision: `D1`, `D2`, in the order they were opened. |
| `kind` | string | yes | What is decided, as the owner names it: `court.verdict`. |
| `owner` | string | yes | The id of the mechanic that proposed the decision and commits it. |
| `proposal` | any | yes | The proposal: plain JSON data, shaped as the owner says. |
| `schema` | any | no | A JSON schema every amended proposal must fit. |
| `deadline` | integer | yes | The tick at whose start the decision settles. |
| `holders` | string[] | yes | The actor ids of the holders that can act now. |

### `decision_amended`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `decision` | string | yes | The id of the decision: `D1`, `D2`, in the order they were opened. |
| `by` | string | yes | The actor id of the holder that amended the decision. |
| `reason` | string | yes | Why the holder amended the decision, in its own words. |
| `proposal` | any | yes | The proposal: plain JSON data, shaped as the owner says. |

### `decision_settled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `decision` | string | yes | The id of the decision: `D1`, `D2`, in the order they were opened. |
| `kind` | string | yes | What is decided, as the owner names it: `court.verdict`. |
| `owner` | string | yes | The id of the mechanic that proposed the decision and commits it. |
| `changed` | boolean | yes | True when an amendment stands and differs from the original proposal. |
| `by` | string | no | The actor id of the holder that amended the decision. |
| `reason` | string | no | Why the holder amended the decision, in its own words. |
| `proposal` | any | yes | The proposal: plain JSON data, shaped as the owner says. |
| `amendments` | object[] | yes | Every amendment, in order; the last one stands. |
| `amendments[].by` | string | yes | The actor id of the holder that amended the decision. |
| `amendments[].seq` | integer | yes | The seq of the amending call's `tool_called`. |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `holders` | string[] | `[]` | The actor ids that may amend a decision (`human`, `director:warden`, `resident:A01`). An id that is no actor of the run is refused when the run is created. |

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `decisions`

Opens a decision that its holders may amend until it settles.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `propose` | command | kind: string, proposal: any, window: integer ≥ 0, schema?: any | object | Opens a decision owned by the caller. With a window of 0, or when no holder can act, it writes nothing and answers `committed: true`: the caller commits at once. Otherwise it writes `decision_proposed` and answers `committed: false` with the id; the caller commits in a listener to `decision_settled`. |
| `open` | query | - | object[] | Lists the open decisions, in the order they were opened. |

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

The game `city-slice` (`games/city-slice/`, built by a later issue of M3) loads it with the person and the Director
`warden` as holders; the mechanic `court` proposes its verdict with a window of 2 ticks:

```ts
mechanics: [/* ... */ decisions({ holders: ["human", "director:warden"] }), /* ... */ court()],
```

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

## Tests

`test/decisions.test.ts` plays a small game in which a test mechanic (`test/owner.ts`) owns the decisions. It
covers the cases of the old platform's `test/host/decisions.test.ts` that need no amendment: a window of 0 and a
missing or suspended holder commit at once and write nothing; a proposal is logged with its deadline and holders;
the deadline settles with the original proposal and causes the owner's commit; the open decision survives a
snapshot and the resumed run settles at the same tick; a deadline after the last tick leaves the decision open.
The first case is the refusal of a holder that is no actor of the run.
