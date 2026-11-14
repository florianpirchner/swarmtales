# human-hand

The Human Hand is a person who steps into a running game. This mechanic gives that person two tools, `pause` and
`resume`: a pause halts the run between two ticks until it is resumed. Each of the two is a tool call of the actor
`human` on the log, like any other call, so a run shows where a person stepped in.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-human-hand` |
| Id | `humanHand` |
| Summary | The tools of the Human Hand: pause and resume a run between two ticks. |
| Requires | none |
| Uses when loaded | none |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [city-slice](../../games/city-slice/README.md) |

<!-- /generated:glance -->

## How it plays

1. **Who.** The tools are for the grant `human`. A game that loads the mechanic has that grant, and with it the
   actor `human`; a resident that calls `pause` is refused with `TOOL_NOT_GRANTED`.
2. **Pausing.** `pause` writes the event `paused` (with the `reason`, when one was given) and sets the fact
   `humanHand.paused` to true. A second `pause` is refused with `ALREADY_PAUSED` and writes nothing.
3. **Resuming.** `resume` writes `resumed` and sets the fact to false. Without a pause it is refused with
   `NOT_PAUSED`.
4. **What holds the run.** The mechanic holds no tick back by itself. The run loop of the command line calls the
   tools between two ticks, reads `humanHand.paused` at every tick boundary and plays no tick while it is true. Tick
   numbers do not move during a pause; the log shows it as the two events.
5. **State.** The slice is `{ paused }`, so a snapshot taken during a pause resumes paused.

It deliberately does not do more: instructions to residents or Directors, single steps and a stop inside a tick are
not part of it. A person's change to a decision is the tool `amendDecision` of the
[decisions](../decisions/README.md) mechanic.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `pause`

- Granted when the game lists no grants: `human`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | no | Why the run is paused; written to the log. |

What the caller reads:

> Halt the run at the next tick boundary until you resume.

### `resume`

- Granted when the game lists no grants: `human`

No parameters.

What the caller reads:

> Let a halted run go on.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `paused`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | string | no | Why the run is paused; written to the log. |

### `resumed`

Audience: everyone

No fields.

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic takes no options.

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic provides no service to other mechanics.

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

No game of this repository lists it yet; `games/city-slice` will. In a game's `mechanics` list:

```ts
humanHand(),
```

It takes no options. The tools go to the grant `human` without an entry in the game's `grants`.

## Lessons and loopholes

None recorded yet ([docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md)).

## Tests

[`test/human-hand.test.ts`](test/human-hand.test.ts) plays the mechanic in a real kernel: `pause` and `resume` on
the log with their events and the fact, the two refusals, a resident's call refused, no tick while paused when a
loop reads the fact, the same log twice from a scripted Human Hand, and the slice across a snapshot. The cases of
the old platform about instructions and single steps are listed there as skipped.
