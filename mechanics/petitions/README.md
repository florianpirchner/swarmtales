# petitions

_To be written._

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-petitions` |
| Id | `petitions` |
| Summary | Petitions residents sign. |
| Requires | `channels` (from [channels](../channels/README.md)), `ledger` (from [ledger](../ledger/README.md)) |
| Uses when loaded | none |
| Provides | `petitions` |
| State | kept, snapshot slice version 1 |
| Facts | `open`, `signatures` |
| Jobs | none |
| Stories | [cityofkeys](../../stories/cityofkeys/README.md), [whispers](../../stories/whispers/README.md) (all 2 variants) |

<!-- /generated:glance -->

## How it plays

_To be written._

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `resolvePetition`

- Suggested for: `script`
- Serves only: `script`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes |  |
| `outcome` | "passed" or "failed" | yes |  |

What the caller reads ([tools/resolvePetition](prompts/tools/resolvePetition.md)):

> Writes the resolution of a petition that expired: the event and the city's board post. Called by the host for the script, never by a resident.

### `signPetition`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `petitionId` | string | yes | Petition ID from listPetitions |

What the caller reads ([tools/signPetition](../../library/prompts/tools/signPetition.md)):

> Signs an open petition. Free, once per petition and irrevocable. A petition passes as soon as enough residents signed.

### `listPetitions`

- Suggested for: `resident`

No parameters.

What the caller reads ([tools/listPetitions](../../library/prompts/tools/listPetitions.md)):

> Lists every petition with its text, status, deadline and signature count (and the signers of public petitions).

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `petition_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes |  |
| `text` | string | yes |  |
| `threshold` | integer | yes |  |
| `deadlineMinute` | integer | yes |  |
| `visibility` | "public" or "secret" | yes |  |
| `against` | string[] | yes |  |

### `petition_signed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes |  |
| `agent` | string | yes |  |
| `signatures` | integer | yes |  |

### `petition_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes |  |
| `outcome` | "passed" or "failed" | yes |  |
| `signatures` | integer | yes |  |
| `signers` | string[] | yes |  |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

This mechanic takes no options.

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

### `petitions`

Petitions residents sign.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `open` | command | id: string, text: string, threshold: object, deadlineMinute: integer, visibility: "public" or "secret", against?: string[] | object | Opens a petition (old `openPetition`); writes `petition_opened`. |

<!-- /generated:services -->

## Decisions and prompts

<!-- generated:prompts -->
<!-- Written by `pnpm docs:mechanics` from the code; edit the code or the prompt files, not this block. -->

Decisions: none.

Prompts (the files a story may override in its own `prompts/` folder):

| Prompt | Variables |
| --- | --- |
| [tools/signPetition](../../library/prompts/tools/signPetition.md) | - |
| [tools/listPetitions](../../library/prompts/tools/listPetitions.md) | - |
| [replies/petition-signatures](../../library/prompts/replies/petition-signatures.md) | `signatures`, `threshold`, `deadline` |
| [replies/petition-signers](../../library/prompts/replies/petition-signers.md) | `signers` |
| [replies/petition-secret](../../library/prompts/replies/petition-secret.md) | - |
| [replies/petition-you-signed](../../library/prompts/replies/petition-you-signed.md) | - |
| [replies/petition-you-not-signed](../../library/prompts/replies/petition-you-not-signed.md) | - |
| [replies/petition-signed](../../library/prompts/replies/petition-signed.md) | `petition` |
| [replies/petitions-none](../../library/prompts/replies/petitions-none.md) | - |
| [tools/resolvePetition](prompts/tools/resolvePetition.md) | - |
| [petitions/signed-by](prompts/petitions/signed-by.md) | `signers` |
| [petitions/visibility-public](prompts/petitions/visibility-public.md) | - |
| [petitions/visibility-secret](prompts/petitions/visibility-secret.md) | - |
| [petitions/noun-one](prompts/petitions/noun-one.md) | - |
| [petitions/noun-many](prompts/petitions/noun-many.md) | - |
| [petitions/opened](prompts/petitions/opened.md) | `id`, `text`, `threshold`, `noun`, `deadline`, `visibility` |
| [petitions/resolved](prompts/petitions/resolved.md) | `id`, `outcome`, `signatures`, `threshold`, `signers` |

<!-- /generated:prompts -->

## Example

_To be written._

## Lessons and loopholes

_To be written._

## Tests

_To be written._
