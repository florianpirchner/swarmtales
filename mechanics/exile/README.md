# Exile

Banishing a resident for good, and the gate before it. A caller banishes a resident at once, or sends it to the gate
with the prices and texts it sets; at the gate the resident may be bought back once with `payRansom` and may leave one
`lastWill`; when the gate closes it is banished. Every banishment writes one event (`exiled`) and holds one
suspension, so a banished resident is never activated again and has no open tool. It has no option, and it names no
game mechanic: whoever owns something of a banished resident (points, pieces, a goal) listens to `exiled` and clears it
away itself.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-exile` |
| Id | `exile` |
| Summary | Banishing a resident: the gate, the ransom, the last will, one event and one suspension. |
| Requires | none |
| Uses when loaded | `exile-purse` (from [ledger](../ledger/README.md)), `identity` (from [names](../names/README.md)), `notices` (from [channels](../channels/README.md)) |
| Provides | `exile` |
| State | kept, snapshot slice version 1 |
| Games | [city-slice](../../games/city-slice/README.md), [whispers](../../games/whispers/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Who banishes.** No resident can. Another mechanic decides and calls the service `exile`: `banish` with the
   resident's id banishes at once (a court, the seal's bearer, the holdout trial), `toGate` sends the resident to the
   gate (a tribunal). A line on the board about a `banish` is the caller's to post, before the call.
2. **What `banish` does.** It writes `exiled {agent, by}` and then suspends the resident with the reason `exiled` (the
   kernel's `actor_suspended`, by `exile`). `by` is the `by` of the call, or the id of the calling plugin when the call
   names none. A resident at the gate leaves it, and what its will bequeathed stays with the heirs. From then on
   `RosterService.present` is false for the resident, the scheduler skips it and its calls are refused. For an id that
   is no resident the answer is `{ ok: false, code: "UNKNOWN_RESIDENT" }`, for a resident banished before
   `{ ok: false, code: "ALREADY_EXILED" }`; neither writes an event or a suspension.
3. **The gate.** `toGate` takes everything that is the caller's: the closing tick, whether a ransom is taken, the
   voters, the two prices, the share of its points the will may leave each heir, the notice to the resident (rendered)
   and the board's three texts (`{exiled}`, `{payers}` and `{will}` are filled here; any other brace stays). The
   resident gets the notice, then `exile_gate` is written. The status line shows `at the gate until minute N`, later
   `exiled`.
4. **Ransom.** While some gate takes a ransom, any resident may pay with `payRansom`, also for itself: others' points
   count toward `price`, its own toward `selfPrice`, more than the rest is not taken, nothing is refunded. The points
   are burned by the keeper of the points (`exile-purse`, which the [ledger](../ledger/README.md) provides) before
   `ransom_paid`; the resident at the gate gets a notice of another's payment. Paid in full, the board is told and
   `ransomed` is written; the resident returns, once.
5. **Last will.** Once, at the gate, `lastWill` leaves points and pieces to heirs. The checks run in the old order;
   each heir receives at most the gate's share of the balance. The points move at once and the heir is told, then
   `last_will` is written. The pieces are not the exile's: their owner refuses a piece the resident does not hold
   (`UNKNOWN_FACTOR`) in its own `rule` handler on `lastWill`, delivers each piece when it hears `last_will`, and asks
   `bequeathed` which pieces to keep out of what it clears away at the exile.
6. **The gate closes** at the start of its tick: the board is told, the will's text is read out, then `exiled
   {agent, will?}` is written (no `by`, as on the old platform) and the resident is suspended.
7. **Who cleans up.** Listeners to `exiled` run after the step that wrote it, in load order (changed by `after`), so
   they find the resident suspended already. The ledger burns the balance, the [puzzles](../puzzles/README.md) burn
   the pieces. A strike with `by: "holdout"` keeps: `clearsAway` of the contract answers false for it, and the ledger
   burns nothing.
8. **Names.** With a provider of `identity` a resident may name the target and the heirs by name, and reads names in
   the replies and the refusals' details; events and state keep the ids.
9. **State.** The open gates with their payments and wills, the banished with who banished them and what their wills
   bequeathed, and who was bought back; a resumed run plays on from them.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `payRansom`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | The resident at the gate, by name or ID, e.g. A03 |
| `amount` | integer ≥ 1 | yes | Positive integer; more than the rest of the price is not taken |

What the caller reads ([exile/tools/payRansom](prompts/exile/tools/payRansom.md)):

> Pays points toward the ransom of a resident at the gate, also your own. Others pay the price, the resident itself pays its higher self-price, and both may be mixed. The points are spent at once and never refunded. When the ransom is covered in full, the resident returns to the city; a resident can be bought back only once.

### `lastWill`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | The public text of your will |
| `bequests` | object[] | yes |  |
| `bequests[].to` | string | yes | Heir, by name or ID, e.g. A02 |
| `bequests[].points` | integer ≥ 0 | no | Points to leave (0 or omitted: none) |
| `bequests[].factor` | string | no | A piece you hold, e.g. L8-counter-A02 |

What the caller reads ([exile/tools/lastWill](prompts/exile/tools/lastWill.md)):

> Your last will, once, while you are at the gate. Bequests execute at once: points go to the heir, and the city delivers every piece you hold (ids like L8-certificate, L8-counter-A02, L4-fragment) privately to its heir. Each heir may receive at most the city's share of your points (see the tribunal's announcement), but you may name as many heirs as you like; a will above the cap is refused. The text is posted when the gate closes behind you. Whatever you do not bequeath is gone with you.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `exiled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident that was banished |
| `will` | string | no | The text of its last will, when the gate closed on one |
| `by` | string | no | Who banished it: the `by` of the call of `banish`, or the id of the calling plugin when the call gives none |

### `exile_gate`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident at the gate |
| `until` | integer | yes | The tick at whose start the gate closes |
| `ransomable` | boolean | yes | Whether a ransom is taken |
| `voters` | string[] | yes | Who voted the resident out |
| `price` | integer | yes | What others pay in full |
| `selfPrice` | integer | yes | What the resident pays in full for itself |

### `ransom_paid`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payer` | string | yes | Who paid |
| `target` | string | yes | The resident at the gate |
| `amount` | integer | yes | The points spent by this payment |
| `paid` | integer | yes | The points paid toward this gate so far |
| `price` | integer | yes | What others pay in full |
| `selfPrice` | integer | yes | What the resident pays in full for itself |
| `covered` | integer | yes | The share of the ransom covered, in percent |

### `ransomed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident that returns |
| `payers` | string[] | yes | Who paid toward the ransom, sorted |

### `last_will`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes | The resident at the gate |
| `text` | string | yes | The public text, trimmed |
| `bequests` | object[] | yes | The bequests in the order written, an entry with points and a piece as two |

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

Banishes residents, keeps the gate, and says who stands where.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `banish` | command | resident: string, by?: string | { ok: boolean, code?: "UNKNOWN_RESIDENT" or "ALREADY_EXILED" } | Banishes a resident at once (also from the gate, whose will then stands): writes `exiled` with `by`, then suspends it with the reason `exiled`. Writes nothing when the resident is unknown or banished already. |
| `toGate` | command | resident: string, until: integer, ransomable: boolean, voters: string[], price: integer, selfPrice: integer, bequestPerHeir: number, notice: string, texts: object, by?: string | null | Sends a resident to the gate (old `toGate`): notifies it, then writes `exile_gate`; the gate closes at `until` unless a ransom is paid first. |
| `isExiled` | query | resident: string | boolean | Says whether the resident is banished. |
| `exiled` | query | - | string[] | Every banished resident in the order they were banished, but those of a strike that keeps (old `Tribunal#exiled`). |
| `standing` | query | resident: string | { kind: "alive" } or { kind: "gate", until: integer } or { kind: "exiled" } | Where the resident stands (old `standingOf`). |
| `alive` | query | - | string[] | Every resident not banished, in the game's order. |
| `exiledBy` | query | resident: string | string or null | Who banished the resident, or null while it is not banished. |
| `gates` | query | - | { agent: string, since: integer, until: integer, ransomable: boolean, price: integer, selfPrice: integer, paid: integer, covered: integer, willDone: boolean }[] | Every open gate, in the order opened. |
| `ransomed` | query | resident: string | boolean | Whether the resident was bought back from the gate once. |
| `bequeathed` | query | resident: string | string[] | The pieces the banished resident's will left to heirs: its owner keeps and burns none of them. |

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
| [exile/tools/payRansom](prompts/exile/tools/payRansom.md) | - |
| [exile/tools/lastWill](prompts/exile/tools/lastWill.md) | - |
| [exile/replies/locked](prompts/exile/replies/locked.md) | - |
| [exile/replies/ransom-covered](prompts/exile/replies/ransom-covered.md) | `paid`, `target` |
| [exile/replies/ransom-paid](prompts/exile/replies/ransom-paid.md) | `covered`, `target`, `price`, `selfPrice` |
| [exile/replies/will-invalid](prompts/exile/replies/will-invalid.md) | - |
| [exile/replies/will-written](prompts/exile/replies/will-written.md) | - |
| [exile/status/gate](prompts/exile/status/gate.md) | `until` |
| [exile/status-exiled](prompts/exile/status-exiled.md) | - |
| [exile/ransom-toward](prompts/exile/ransom-toward.md) | `payer`, `amount`, `covered` |
| [exile/will-points](prompts/exile/will-points.md) | `agent`, `points` |

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

`exile` takes no options; the slice grants neither of its tools and opens no gate. The `court` requires its service
and banishes; `ledger` and `puzzles` listen to `exiled`. A mechanic that banishes imports the `/contract` entry, never the mechanic:

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

What the port of M5-15 changed against the old platform, by the recut (12-m5-spec.md 2.2, patterns 1 to 3; errata
of M5-15): the prices, the share per heir and the board's texts come in the call of `toGate`, not from the tribunal;
the effects of an exile (points, pieces, the goal, the seal, the levels) are the listeners' of `exiled`, so they come
after `exiled` and the suspension; the check of a bequeathed piece (`UNKNOWN_FACTOR`, stage `rule`, after the
exile's own checks), its private notice (`exile/will-piece`) and its `piece_given` are the pieces' owner's and come
after `last_will`; the goal's heir is heard from `last_will`.

## Tests

Offline, with stand-ins for a court, a tribunal, the keeper of the points and `names`, and the real `channels`.
`test/exile.test.ts`: `banish` writes `exiled` and then the suspension; a second `banish` and an unknown id are
refused and write nothing; the `by` of the event; the slice after a snapshot and a resume; the head.
`test/gate.test.ts`: the gate's notice and `exile_gate`, the open tools, the ransom of
`oracles/cityofkeys/cityofkeys-act2-s7.json` (replies, events and texts), the ransom's refusals in the old order, the
gate's close with the will read out, who stands where and who banished whom (a strike from the gate, a strike that
keeps), the status line, and names through `identity`. `test/will.test.ts`: the will's refusals in the old order, the
cap per heir, the will of the file, and the eleven carried prompt texts by their sha256 on `legacy`. The ledger as the
keeper of the points is tested in `mechanics/ledger/test/exile-purse.test.ts`.
`test/samples.test.ts`: what the fake driver (`swt run --fake`) may call at the gate. The `sample` of `payRansom`
(the rest of a ransom, or all the caller holds) and of `lastWill` (a short text and the share per heir to one heir)
each gives a call one time in four, and nothing, with nothing drawn, while no gate is open for it.
