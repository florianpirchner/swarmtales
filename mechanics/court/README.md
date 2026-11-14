# Court

A court of one session: for a few ticks every resident may vote for the resident the city should banish, and when
the session closes the resident with the most votes is the verdict. The verdict is proposed as a decision, so the
holders of decisions (a person, a Director) may change it before it is carried out. This is the stand-in of the
slice for the tribunal of the City of Keys and is replaced when the tribunal is ported.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-court` |
| Id | `court` |
| Summary | One session of votes that ends in a verdict: the resident with the most votes is banished. |
| Requires | `decisions` (from [decisions](../decisions/README.md)), `exile` (from [exile](../exile/README.md)), `channels` (from [channels](../channels/README.md)) |
| Uses when loaded | none |
| Provides | none |
| State | kept, snapshot slice version 1 |
| Games | [city-slice](../../games/city-slice/README.md) |

<!-- /generated:glance -->

## How it plays

1. **The session.** At the start of the tick `opensAt` the court writes `session_opened {closesAt}`. From then
   until the start of the tick `closesAt` a resident may call `vote` with the id of another resident. There is one
   session in a run.
2. **A vote.** Each resident has one standing vote; a second vote replaces the first, and each writes `vote_cast`.
   Refusals, in this order: `SESSION_CLOSED` (no session is open), `UNKNOWN_RESIDENT`, `SELF_VOTE`, `EXILED` (the
   target is banished already, asked from the service `exile`).
3. **The close.** At the start of the tick `closesAt` the court counts the votes and writes `session_closed {tally}`:
   the votes per resident that got one, in roster order. Votes against a resident banished since are not counted.
   The resident with the most votes is the verdict. On a tie for the first place, or without a vote, there is no
   verdict and nothing else is written.
4. **The decision.** The court calls `propose` of the service `decisions` with the kind `court.verdict`, the
   proposal `{ exiled: <id> }`, the option `window` and a schema that allows every resident not banished. With a
   window of 0, or when no holder can act, `decisions` writes nothing and the court carries the verdict out at once,
   in the same step. Otherwise `decision_proposed` is on the log and the court waits: at the deadline it hears
   `decision_settled` (kind `court.verdict`, owner `court`) and carries out the proposal that stands, which may be
   an amended one.
5. **Carrying it out.** In this order: the city's line on the board (`post` of the service `channels`, author
   `CITY`, kind `city`, the option `line` with `{resident}` filled), `banish` of the service `exile`, then
   `verdict {exiled, decision?}`; `decision` is absent when there was no window. The listeners of `exiled` (the
   ledger, the puzzles) run after the banishing. A resident that was banished by something else while the verdict
   was open is left alone: no line, no `verdict`.
6. **State.** The slice is `{ open, votes }`; the open decision lives in the slice of `decisions`, so a run resumed
   between the close and the deadline carries the verdict out at the same tick.
7. **What it does not do.** No accused, no factions, no penalty for not voting, no second session, and no line
   that tells residents a session is open: at M3 scripts play, and the tribunal brings all of this back.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `vote`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | The id of the resident to banish. |

What the caller reads ([court/tools/vote](prompts/court/tools/vote.md)):

> Vote in the court's open session: name the resident the city should banish. You cannot vote for yourself. A second vote replaces your first. When the session closes, the resident with the most votes is banished; a tie banishes nobody.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `session_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `closesAt` | integer ≥ 0 | yes | The tick at whose start the session closes and the votes are counted. |

### `vote_cast`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `voter` | string | yes | Who voted. |
| `target` | string | yes | A resident id, for example `A04`. |

### `session_closed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tally` | record of integer | yes | The votes per resident that got one, in roster order; votes against a resident banished meanwhile are left out. |

### `verdict`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `exiled` | string | yes | A resident id, for example `A04`. |
| `decision` | string | no | The id of the settled decision; absent when the verdict was carried out at the close. |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `opensAt` | integer ≥ 0 | required | The tick at whose start the session opens. |
| `closesAt` | integer ≥ 0 | required | The tick at whose start the session closes and the votes are counted. |
| `window` | integer ≥ 0 | required | The ticks the holders of decisions have to amend the verdict; 0: the verdict is carried out when the session closes. |
| `line` | string | `"The gate has closed. The city has struck {resident} from its register. No one will hear {resident} again."` | The city's line on the board before the banishing; `{resident}` is the id of the banished resident. |

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

| Prompt | Variables |
| --- | --- |
| [court/tools/vote](prompts/court/tools/vote.md) | - |
| [court/replies/vote-cast](prompts/court/replies/vote-cast.md) | `target` |
| [court/replies/session-closed](prompts/court/replies/session-closed.md) | - |
| [court/replies/self-vote](prompts/court/replies/self-vote.md) | - |
| [court/replies/unknown-resident](prompts/court/replies/unknown-resident.md) | `target` |
| [court/replies/exiled](prompts/court/replies/exiled.md) | `target` |

<!-- /generated:prompts -->

## Example

The game [city-slice](../../games/city-slice/README.md) lists it last, after the mechanics whose services it requires:

```ts
mechanics: [ledger(), channels(), exile(), decisions({ holders: ["human", "director:warden"] }), humanHand(), puzzles(/* ... */), court({ opensAt: 4, closesAt: 6, window: 2 })],
```

The session is open during the ticks 4 and 5; the verdict of tick 6 is carried out at tick 8 unless a holder amends
it. `line` is left out, so the city speaks the line of the old platform.

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

## Tests

`test/court.test.ts`, offline, with `channels`, `exile` and `decisions` loaded and a test mechanic that banishes
in the place of a seal: the opening, a second vote, the four refusals, a tie and a session without votes; the
verdict with a window of 0 (the event order, and the same log as with a window that nobody holds) and with a window
(proposed at the close, carried out by the settlement); the two tribunal cases of the decision window (the human
amends the verdict to another resident, who is banished; an amendment outside the schema is refused); and a
resident banished while the verdict was open.

`test/sample.test.ts`: what the fake driver (`swt run --fake`) may call. The `sample` of `vote` gives one vote per
resident and session, against another resident that may act; a resident that already has votes against it is in
the draw once more per vote, so the votes gather and a verdict is likelier than a tie.
