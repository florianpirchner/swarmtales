# puzzles

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-puzzles` |
| Id | `puzzles` |
| Summary | The deal of each level: fragments, factors, teams and exclusions. |
| Requires | none |
| Uses when loaded | `channels` (from [channels](../channels/README.md)), `progression` (from [progression](../progression/README.md)), `exile` (from [exile](../exile/README.md)) |
| Provides | `puzzles` |
| State | kept, snapshot slice version 1 |
| Facts | `dealt`, `exclusions`, `needs`, `secrets`, `solutions` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic defines no tools.

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

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

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `puzzles`

The deal of each level: fragments, factors, teams and who is excluded.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `deal` | command | level: integer ≥ 1 | null | Deals a level once (old `#dealLevel`, stream `puzzle`, level); writes `fragments_dealt` or `factors_dealt`. |
| `isDealt` | query | level: integer ≥ 1 | boolean | Old `isDealt`. |
| `solutionOf` | query | resident: string, level: integer ≥ 1 | string or null | The code that passes the level for the resident, or null (old `#solutionOf`). |
| `teamOf` | query | resident: string, level: integer ≥ 1 | object | The resident's team on a level (old `teamOf`). |
| `passwordPiece` | query | token: string | boolean | Whether a token is part of a dealt password, so names leaves it as written (old `#isPasswordPiece`). |
| `lacking` | query | level: integer ≥ 1, holder: string | string[] | Who still lacks the holder's fragment of a level (old `lackingFragment`). |
| `carriesSecret` | query | resident: string, text: string, minRun: integer ≥ 1 | boolean | Whether a text carries a run of the resident's secrets (old `receiptCarriesFragment`, the leaked-run check). |
| `burn` | command | agent: string, level: integer ≥ 1, piece: string, needers: string[] | null | A piece burns with its exiled holder (old `#onExiled`); writes `factor_burned`. |
| `contract` | command | level: integer ≥ 1, excluded: string[] | null | After an exile, the roles of the excluded pass on for a level nobody left has reached (old `#onExiled`); writes `level_contracted`. |
| `kindOf` | query | level: integer ≥ 1 | "fragments" or "additive" or "none" | The puzzle kind of a level: `none` while it is not dealt (T3 request 1). |
| `taskValues` | query | resident: string, level: integer ≥ 1 | object | The task placeholders a puzzle fills for a resident (old `#puzzleValues`); empty strings on a level not dealt (T3 request 2). |
| `holders` | query | resident: string, level: integer ≥ 1 | object[] | Who holds what the resident needs on an additive level, besides itself (old `#holdersOf`; T3 request 3). |
| `revealFactor` | command | level: integer ≥ 1, target: "board" or string[] | object | Releases the city factor of an additive level (old `revealFactor`); writes `factor_revealed` (T3 request 4). |
| `heldPieces` | query | resident: string | object[] | Old `heldPieces`: every piece the resident holds for others, by level; needers in team-member order (fragments) or holding order (certificates, counters). Uses `ProgressionApi.levelOf` (T4 request R1). |
| `fragmentOf` | query | resident: string, level: integer ≥ 1 | string or null | The resident's own fragment of a fragments level, or null. |
| `inherited` | query | resident: string, level: integer ≥ 1 | object[] | Fragments of excluded or struck teammates the resident holds now (old `#inheritedFragments`): `[from, fragment]` in order. |
| `openFragmentDoors` | query | - | integer[] | Every fragments level whose door is open on the clock, ascending (old `#openFragmentDoors`, the holdout's doors). |
| `secrets` | query | - | object | Every secret of the dealt levels, ascending by level (old gamemaker `#secretGuard`): the passwords of fragment levels and the all-digit values of additive deals (old `dealValues`); the note desk's leak check (round 2, R2-D8). |
| `isHandover` | query | text: string | boolean | Whether a text hands over a dealt fragment (old `isHandover`: a run of `HANDOVER_RUN` of any fragment, in its code-like forms); the whisper tally leaves such DMs out (T1 request 13). |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [replies/guard-check](../../library/prompts/replies/guard-check.md) | - |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
