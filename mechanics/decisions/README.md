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
4. Until the deadline a holder may amend the decision with the tool `amendDecision`: it gives the id, the whole
   proposal that should stand instead, and its reason. `decision_amended` is written and the amendment is kept in
   the slice with its number `n`: 1 for the first amendment of this decision, 2 for the second. The last amendment stands, with one exception: once the
   actor `human` has amended a decision, only the human may amend it again.
5. At the start of the deadline's tick, before anybody acts, the job writes `decision_settled` with the proposal
   that stands; `changed` is true when an amendment stands that differs from the original. The owner listens to
   `decision_settled`, checks `kind` and `owner`, and commits there: its events are caused by the settlement.

`amendDecision` refuses, in this order: `DECISION_CLOSED` (the id names no open decision: it settled already or
never opened), `DECISION_NOT_HELD` (the caller is not in the option `holders`), `DECISION_HUMAN` (the human has
amended it and the caller is not the human), `PROPOSAL_INVALID` (the proposal does not fit the `schema` of the
decision; the detail is the first mismatch, `/exiled must be string`). A refused call writes no event of this
mechanic. The old platform's event `human_amend` is gone: `decision_amended` with `by: "human"` says the same.

The tool goes to the grant `human` when the game lists no grants. Every other holder needs both: its actor id in
`holders` and the tool in its grant (`grants: { resident: { add: ["amendDecision"] } }`, or the grant of a
Director). A caller with the grant that is no holder reads `DECISION_NOT_HELD`.

A decision whose deadline lies after the last tick of the run stays open: it is in the last snapshot and is never
settled. An amendment of such a decision is kept, and the caller is told that nothing will settle. `decisions` never calls its owner back and names no other mechanic, so it cannot be part of a service
cycle. A proposal that does not fit its own `schema` is a mistake of the owner and stops the run.

The option `holders` lists actor ids, not resident ids, because a holder need not be a resident. An id that is no
actor of the run is refused with `SWT-G020` while the kernel is created, before `run_started`: the head's `start`
reads `Setup.actors`, and `propose` asks `ctx.actors.mayAct`.

No payload of this mechanic holds a log position (decision A34): an amendment is named by `n`, its number within
its decision, which the tool counts in the slice. So a resumed run, whose log holds one line more (`run_resumed`),
writes the same payloads as the straight run. The line of the amending call is the `causedBy` of the envelope of
`decision_amended`.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `amendDecision`

- Granted when the game lists no grants: `human`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `decision` | string | yes | The id of the decision: `D1`, `D2`, in the order they were opened. |
| `proposal` | any | yes | The proposal: plain JSON data, shaped as the owner says. |
| `reason` | string | yes | Why the holder amended the decision, in its own words. |

What the caller reads ([decisions/tools/amendDecision](prompts/decisions/tools/amendDecision.md)):

> Change an open decision before its deadline: give the decision's id, the whole proposal that should stand instead (in the decision's schema), and your reason. The last amendment before the deadline stands; a human's amendment stands above every other.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `decision_proposed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `decision` | string | yes | The id of the decision: `D1`, `D2`, in the order they were opened. |
| `kind` | string | yes | What is decided, as the owning mechanic names it: `<mechanic>.<decision>`. |
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
| `n` | integer ≥ 1 | yes | The number of the amendment within its decision, from 1 in the order the amendments were made. It is no log position. |
| `by` | string | yes | The actor id of the holder that amended the decision. |
| `reason` | string | yes | Why the holder amended the decision, in its own words. |
| `proposal` | any | yes | The proposal: plain JSON data, shaped as the owner says. |

### `decision_settled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `decision` | string | yes | The id of the decision: `D1`, `D2`, in the order they were opened. |
| `kind` | string | yes | What is decided, as the owning mechanic names it: `<mechanic>.<decision>`. |
| `owner` | string | yes | The id of the mechanic that proposed the decision and commits it. |
| `changed` | boolean | yes | True when an amendment stands and differs from the original proposal. |
| `by` | string | no | The actor id of the holder that amended the decision. |
| `reason` | string | no | Why the holder amended the decision, in its own words. |
| `proposal` | any | yes | The proposal: plain JSON data, shaped as the owner says. |
| `amendments` | object[] | yes | Every amendment, in order; the last one stands. |
| `amendments[].by` | string | yes | The actor id of the holder that amended the decision. |
| `amendments[].n` | integer ≥ 1 | yes | The number of the amendment within its decision, from 1 in the order the amendments were made. It is no log position. |

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
| `propose` | command | kind: string, proposal: any, window: integer ≥ 0, schema?: any | { committed: true } or { committed: false, decision: string } | Opens a decision owned by the caller. With a window of 0, or when no holder can act, it writes nothing and answers `committed: true`: the caller commits at once. Otherwise it writes `decision_proposed` and answers `committed: false` with the id; the caller commits in a listener to `decision_settled`. |
| `open` | query | - | { decision: string, kind: string, owner: string, deadline: integer }[] | Lists the open decisions, in the order they were opened. |

<!-- /generated:services -->

## Metrics

<!-- generated:metrics -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic exports no metrics.

<!-- /generated:metrics -->

## Prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Prompt | Variables |
| --- | --- |
| [decisions/tools/amendDecision](prompts/decisions/tools/amendDecision.md) | - |
| [decisions/replies/decision-amended](prompts/decisions/replies/decision-amended.md) | `decision`, `proposal` |
| [decisions/replies/decision-outlasts-run](prompts/decisions/replies/decision-outlasts-run.md) | `decision`, `deadline`, `last` |
| [decisions/replies/decision-closed](prompts/decisions/replies/decision-closed.md) | - |
| [decisions/replies/decision-not-held](prompts/decisions/replies/decision-not-held.md) | - |
| [decisions/replies/decision-human](prompts/decisions/replies/decision-human.md) | - |

<!-- /generated:prompts -->

## Example

From [`games/city-slice/game.ts`](../../games/city-slice/game.ts):

```ts
mechanics: [
	// ...
	decisions({ holders: ["human", "director:warden"] }),
	humanHand(),
	// ...
	court({ opensAt: 4, closesAt: 6, window: 2 }),
],
directors: [{ use: warden }],
grants: {
	// ...
	warden: ["postBoard", "amendDecision"],
	human: ["pause", "resume", "amendDecision"],
},
```

The person and the Director `warden` hold every decision: each is named in `holders` and has `amendDecision` in its
grant. The `court` proposes its verdict with a window of 2 ticks, in which a holder may change it.

The owner of a decision proposes it and commits on `decision_settled`. The tribunal of sample 5 proposes a sentence
when the marks against a resident reach its threshold, commits at once on `committed: true`, and otherwise commits
the proposal that stands at the deadline, after it checked the kind, the owner and the shape
([`samples/own-mechanic/src/tribunal.ts`](../../samples/own-mechanic/src/tribunal.ts)):

```ts
				const answer = ctx.call(DecisionsService, "propose", { kind: SENTENCE, proposal: { resident: name }, window: ctx.options.window, schema: Sentence });
				if (answer.committed) sentence(ctx, name, false);
```

```ts
		kit.listen(DecisionsEvents, "decision_settled", (settled, ctx) => {
			if (settled.kind !== SENTENCE || settled.owner !== ctx.mechanic || !Check(Sentence, settled.proposal)) return;
			sentence(ctx, settled.proposal.resident, settled.changed);
		}),
```

The tutorial [Write a mechanic](../../docs/tutorials/mechanic.md) walks through it.

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

## Tests

`test/decisions.test.ts` plays a small game in which a test mechanic (`test/owner.ts`) owns the decisions. It
covers the cases of the old platform's `test/host/decisions.test.ts` that need no amendment: a window of 0 and a
missing or suspended holder commit at once and write nothing; a proposal is logged with its deadline and holders;
the deadline settles with the original proposal and causes the owner's commit; the open decision survives a
snapshot and the resumed run settles at the same tick; a deadline after the last tick leaves the decision open.
The first case is the refusal of a holder that is no actor of the run.

`test/amend.test.ts` holds the amendment cases with residents as holders: an amendment stands and the owner commits
it; of two amendments the last stands, and `changed` is false when it repeats the original; the refusals for a
decision that is not open, a caller that is no holder, a proposal off the schema, and an amendment after the
deadline; the reply for a decision that outlasts the run. `test/human.test.ts` plays the human: its amendment
stands against a later one of another holder, it may amend again, and no `human_amend` is written. The sdk gives
the game the actor `human` because the tool is granted to it.
