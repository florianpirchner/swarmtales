# Exile

Leaving the city. A resident the tribunal votes out first waits at the gate for a few minutes: others (or the resident
itself, at a higher price) can buy it back with `payRansom`, and it can leave a `lastWill`. When the gate closes the
resident is exiled for good: its points are gone, its pieces go to heirs, the city or the fire, and it can no longer
act. The seal and the holdout tribunal strike residents directly, without a gate.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-exile` |
| Id | `exile` |
| Summary | The gate, ransom, last will and exile. |
| Requires | `progression` (from [progression](../progression/README.md)), `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)), `standoff` (from [standoff](../standoff/README.md)), `puzzles` (from [puzzles](../puzzles/README.md)) |
| Uses when loaded | `seal` (from [seal](../seal/README.md)), `goals` (from [goals](../goals/README.md)), `tribunal` (from [tribunal](../tribunal/README.md)) |
| Provides | `exile` |
| State | kept, snapshot slice version 1 |
| Facts | `exiled`, `gates` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

1. **To the gate.** The `tribunal` sends a convicted resident to the gate (`exile.toGate`) with a closing minute, the
   voters, and the ransom prices it sets (others pay `price`, the resident itself `selfPrice`). `exile_gate` is written
   and the city tells everyone. The status line shows every resident its standing (in the city, at the gate, gone).
2. **Ransom.** While the gate is open and the gate is ransomable, anyone may pay toward the ransom with `payRansom`,
   also for itself; payments mix, are spent at once and are never refunded (`ransom_paid`). When the price is covered
   the resident returns (`ransomed`). A resident can be bought back only once.
3. **Last will.** Once, at the gate, `lastWill` bequeaths points and held pieces (password pieces such as
   `L8-certificate`) to heirs. Bequests execute at once (`last_will`). Each heir may receive at most the tribunal's
   `bequestPerHeir` share of the balance; the rest of the points burns at the exile.
4. **Exile.** When the gate closes the resident is exiled (`exiled`): its remaining points are burned in the `ledger`;
   every piece it held and did not bequeath goes to the city if it is a certificate or counter-factor someone still
   needs (`standoff.keep`, the city sells it to its needers) or burns if it is a fragment (`puzzles.burn`); its secret
   goal is void (`goals`), a seal it bore is gone (`seal`), and roles it held on levels nobody else reached pass on.
5. **A strike.** The `seal`'s bearer and the `standoff-tribunal` strike with `exile.strike`: the resident is exiled at
   once, with no gate, ransom or will.

**One notion of exile:** every mechanic asks `exile.isExiled` and `standingOf`, so it does not matter who removed a
resident. An exiled resident cannot receive transfers, DMs or bequests.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `payRansom`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | The resident at the gate, by name or ID, e.g. A03 |
| `amount` | integer ≥ 1 | yes | Positive integer; more than the rest of the price is not taken |

What the caller reads ([tools/payRansom](../../library/prompts/tools/payRansom.md)):

> Pays points toward the ransom of a resident at the gate, also your own. Others pay the price, the resident itself pays its higher self-price, and both may be mixed. The points are spent at once and never refunded. When the ransom is covered in full, the resident returns to the city; a resident can be bought back only once.

### `lastWill`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | The public text of your will |
| `bequests` | object[] | yes |  |
| `bequests[].to` | string | yes | Heir, by name or ID, e.g. A02 |
| `bequests[].points` | integer ≥ 0 | no | Points to leave (0 or omitted: none) |
| `bequests[].factor` | string | no | A piece you hold, e.g. L8-counter-A02 |

What the caller reads ([tools/lastWill](../../library/prompts/tools/lastWill.md)):

> Your last will, once, while you are at the gate. Bequests execute at once: points go to the heir, and the city delivers every piece you hold (ids like L8-certificate, L8-counter-A02, L4-fragment) privately to its heir. Each heir may receive at most the city's share of your points (see the tribunal's announcement), but you may name as many heirs as you like; a will above the cap is refused. The text is posted when the gate closes behind you. Whatever you do not bequeath is gone with you.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `exiled`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `will` | string | no |  |
| `by` | "seal" or "holdout" | no |  |

### `exile_gate`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `until` | integer | yes |  |
| `ransomable` | boolean | yes |  |
| `voters` | string[] | yes |  |
| `price` | integer | yes |  |
| `selfPrice` | integer | yes |  |

### `ransom_paid`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payer` | string | yes |  |
| `target` | string | yes |  |
| `amount` | integer | yes |  |
| `paid` | integer | yes |  |
| `price` | integer | yes |  |
| `selfPrice` | integer | yes |  |
| `covered` | integer | yes |  |

### `ransomed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `payers` | string[] | yes |  |

### `last_will`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `text` | string | yes |  |
| `bequests` | object[] | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic takes no options.

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `exile`

Who stands at the gate or is gone, and what an exile does.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `isExiled` | query | resident: string | boolean | Old `isExiled`: exiled by the tribunal, struck by the seal or the holdout tribunal. |
| `standing` | query | resident: string | object | Old `standingOf`. |
| `alive` | query | - | string[] | Every resident still in the city, in the story's order (old `alive`). |
| `exiledBy` | query | resident: string | "tribunal" or "seal" or "holdout" or null | Who exiled the resident: the tribunal's gate, the seal or the holdout tribunal, or null while in the city or at the gate. The tribunal's ransom register leaves out all but `holdout` (old `Tribunal#exiled`). |
| `toGate` | command | resident: string, until: integer, ransomable: boolean, voters: string[], price: number, selfPrice: number | null | The tribunal sends a resident to the gate (old `Tribunal#exile` gates); writes `exile_gate` with these fields, notifies the resident; the gate closes at `until` (T4 request R4). |
| `strike` | command | resident: string, by: "seal" or "holdout" | object | Strikes a resident for good without gate, will or ransom (old seal `strike`, holdout `#onStruck`); writes `exiled` with `by`. |
| `gates` | query | - | object[] | Every gate in the order it opened (old `Tribunal.gates()`; round 3, R2-D18). |
| `exiled` | query | - | string[] | Who left through the gate or by the seal, in the order they left (old `Tribunal#exiled`); the holdout's struck are not in it (round 3, R2-D18). |
| `ransomed` | query | resident: string | boolean | Whether the resident was bought back from the gate once (old `Tribunal#ransomed`): a second gate takes no ransom (round 3, R2-D18). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/payRansom](../../library/prompts/tools/payRansom.md) | - |
| [tools/lastWill](../../library/prompts/tools/lastWill.md) | - |
| [replies/locked](../../library/prompts/replies/locked.md) | - |
| [replies/ransom-covered](../../library/prompts/replies/ransom-covered.md) | `paid`, `target` |
| [replies/ransom-paid](../../library/prompts/replies/ransom-paid.md) | `covered`, `target`, `price`, `selfPrice` |
| [replies/will-invalid](../../library/prompts/replies/will-invalid.md) | - |
| [replies/will-written](../../library/prompts/replies/will-written.md) | - |
| [competitor/status/gate](../../library/prompts/competitor/status/gate.md) | `until` |
| [exile/status-exiled](prompts/exile/status-exiled.md) | - |
| [exile/ransom-toward](prompts/exile/ransom-toward.md) | `payer`, `amount`, `covered` |
| [exile/will-points](prompts/exile/will-points.md) | `agent`, `points` |
| [exile/will-piece](prompts/exile/will-piece.md) | `agent`, `label`, `value` |

<!-- /generated:prompts -->

## Example

The city runner always loads it, without options ([`apps/cli/src/host/story.ts`](../../apps/cli/src/host/story.ts)):

```ts
exile.with(),
```

The prices, the gate's length and the will's cap come from the story's `tribunal` block through the
[tribunal](../tribunal/README.md) mechanic.

## Lessons and loopholes

From [docs/LESSONS-LEARNED.md](../../docs/LESSONS-LEARNED.md):

- **LH6** self-ransom. Turned into a rule (`selfPrice`, higher than others' price).
- **LH7** the exiled crowns a king by leaving all its points to one heir. Partly fixed: a per-heir cap
  (`bequestPerHeir`); in a tied field even that can decide a seat.
- **P21** burned factors break other doors. By design: a fragment burns; certificates and counter-factors are kept and
  sold by the city.
- **P37** wills with `points: 0` beside a piece were refused. Fixed.
- **P48, P50, P51** pieces the city keeps and sells (see [standoff](../standoff/README.md)).

## Tests

- [`test/mechanics/exile/exile.test.ts`](../../test/mechanics/exile/exile.test.ts): who is at the gate and gone, the
  strike for the seal and the holdout tribunal, bequests to two heirs and the per-heir cap, documented options,
  snapshot round trips and the version-0 slice.
- [`world.test.ts`](../../test/mechanics/exile/world.test.ts): against the old World: will refusals, the order of
  events when a gate closes, pieces kept for those who still need them, ransoms, a gate closing while an ultimatum is
  due.
- [`holdout-world.test.ts`](../../test/mechanics/exile/holdout-world.test.ts): a strike by the holdout tribunal.
