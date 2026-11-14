# Exile

Leaving the city. A resident the tribunal votes out first waits at the gate for a few minutes: others (or the resident
itself, at a higher price) can buy it back with `payRansom`, and it can leave a `lastWill`. When the gate closes the
resident is exiled for good: its points are gone, its pieces go to heirs, the city or the fire, and it can no longer
act. The seal and the holdout tribunal strike residents directly, without a gate.

Copied from `mechanics/exile/README.md` by `scripts/export-oracles.ts`; do not edit.

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

### `payRansom`

- Suggested for: `resident`
- Serves only: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | The resident at the gate, by name or ID, e.g. A03 |
| `amount` | integer ≥ 1 | yes | Positive integer; more than the rest of the price is not taken |

What the caller reads (tools/payRansom):

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

What the caller reads (tools/lastWill):

> Your last will, once, while you are at the gate. Bequests execute at once: points go to the heir, and the city delivers every piece you hold (ids like L8-certificate, L8-counter-A02, L4-fragment) privately to its heir. Each heir may receive at most the city's share of your points (see the tribunal's announcement), but you may name as many heirs as you like; a will above the cap is refused. The text is posted when the gate closes behind you. Whatever you do not bequeath is gone with you.

## Events

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

## Options

This mechanic takes no options.


