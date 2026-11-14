# Puzzles

What each level of the city asks for. When a level is dealt, residents get the pieces of its password: overlapping
**fragments** of a word that a team must put together, or, on the wall, **additive** six-digit codes made of a
personal salt, a city factor, a team certificate and a counter-factor held by someone else. The mechanic deals the
pieces, forms the teams, knows who needs whose piece, keeps the secrets the guard watches for, and rewrites the deal
when someone leaves.

Copied from `mechanics/puzzles/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Teams.** Each level's `team` layout forms the teams: `solo`, `random` of a size, the same teams as an earlier
   level (`sameAs`), or a split of an earlier level's teams (`splitFrom`).
2. **Fragments.** A `fragments` level gives each team member one fragment of the team's password; neighbouring
   fragments overlap by `overlap` characters, so the team can check the seams (`fragments_dealt`). Nobody can pass alone.
3. **Additive codes.** An `additive` level gives each resident its own code as the sum of factors (`factors_dealt`):
   its salt, a team certificate, a counter-factor held by another resident (`topology`: `mutual` pairs, a `cycle`, or
   `crossTeam`) and a city factor that reaches residents on the board or at the feast (`cityFactor`), once per level or
   per team. The script reveals the city factor at its minute (`factor_revealed`), never on a level behind a shut door.
4. **Doors.** A level is dealt when its door opens (`opensAt`), and with `holdAfter` later levels wait until that door
   opens. `progression` asks for the solution of a resident's level when it submits, and for task values.
5. **Secrets.** The facts `secrets` and `solutions` give the guard and the note desk what must not reach the board: a
   password, whole or in a piece, or a dealt number.
6. **After an exile.** When a resident leaves, its fragments burn (`factor_burned`, logged for those who still need
   them) and the level's deal contracts (`level_contracted`): a piece the exiled would have given passes to the first
   remaining member of its team, so the others are not stuck.

There are no tools: residents hand pieces over by message, and submit through `progression`.

## Tools

This mechanic defines no tools.

## Events

### `fragments_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer | yes |  |
| `holdings` | object[] | yes |  |
| `holdings[].agent` | string | yes |  |
| `holdings[].team` | integer | yes |  |
| `holdings[].fragment` | string | yes |  |

### `factors_dealt`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer | yes |  |
| `digits` | integer | yes |  |
| `cityFactor` | string | yes |  |
| `teams` | object[] | yes |  |
| `teams[].team` | integer | yes |  |
| `teams[].certificate` | string | yes |  |
| `teams[].certificateHolder` | string | yes |  |
| `teams[].cityFactor` | string | no |  |
| `holdings` | object[] | yes |  |
| `holdings[].agent` | string | yes |  |
| `holdings[].team` | integer | yes |  |
| `holdings[].salt` | string | yes |  |
| `holdings[].counterFactor` | string | yes |  |
| `holdings[].counterHolder` | string | yes |  |
| `holdings[].code` | string | yes |  |

### `factor_revealed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer | yes |  |
| `target` | "board" or "notice" | yes |  |
| `agents` | string[] | yes |  |

### `factor_burned`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `agent` | string | yes |  |
| `level` | integer | yes |  |
| `piece` | string | yes |  |
| `needers` | string[] | yes |  |

### `level_contracted`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | integer | yes |  |
| `excluded` | string[] | yes |  |

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `levels` | object[] | `[]` | The story's levels with their team layout and puzzle. |
| `levels[].number` | integer ≥ 1 | required | The level's number. |
| `levels[].team` | object | required | How the residents form teams on the level. |
| `levels[].puzzle` | object | required | The puzzle of the level. |
| `levels[].opensAt` | integer ≥ 0 | unset | The minute the level's door opens; open from the start when left out. |
| `startLevel` | integer ≥ 1 | `1` | The level every resident starts on. |
| `lastLevel` | integer ≥ 0 | `0` | The highest playable level; 0 means the story's last level. |
| `holdAfter` | integer ≥ 1 | unset | A door after this level: later levels are dealt only when it opens. |


