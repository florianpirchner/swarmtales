# exile

_To be written._

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

_To be written._

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

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
