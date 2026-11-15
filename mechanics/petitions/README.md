# Petitions

A collective lever. The game's script opens a petition with a text, a threshold and a deadline; residents read the
petitions with `listPetitions` and sign them with `signPetition`. A petition passes the moment enough residents have
signed and fails at its deadline or at the end of the run, and the script reacts to the outcome.

## At a glance

<!-- generated:glance -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

|  |  |
| --- | --- |
| Package | `@swarmtales/mechanic-petitions` |
| Id | `petitions` |
| Summary | Petitions residents sign. |
| Requires | `channels` (from [channels](../channels/README.md)) |
| Uses when loaded | none |
| Provides | `petitions` |
| State | kept, snapshot slice version 1 |
| Games | none of the games in this repository |

<!-- /generated:glance -->

## How it plays

1. **Opening.** Only another mechanic opens a petition, through the service `petitions` (`open`, the old script
   action `openPetition`): an id, a text, a threshold (a count, or a fraction of the residents rounded up), a deadline
   tick and whether the signers are public or secret. `petition_opened` is written and the city announces it on the
   board. A taken id is refused with `DUPLICATE_PETITION`.
2. **Signing.** `signPetition` is free, once per petition and irrevocable (`petition_signed`); its refusals are
   `UNKNOWN_PETITION`, `PETITION_CLOSED` and `ALREADY_SIGNED`. A secret petition keeps its signers out of every reply
   and board post; a public one names them.
3. **Resolution.** At the threshold the petition passes at once, inside the call that reached it. At the start of its
   deadline tick, or when the run ends, an open petition fails. The expiry is a staged call of the actor `script`
   (`ctx.stage`, `resolvePetition`), one per petition, so what the script does on one result runs before the next
   result is written. Either way `petition_resolved` is written and the city posts the result.

## Tools

<!-- generated:tools -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `resolvePetition`

- Granted when the game lists no grants: `script`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes |  |
| `outcome` | "passed" or "failed" | yes |  |

What the caller reads ([petitions/tools/resolvePetition](prompts/petitions/tools/resolvePetition.md)):

> Writes the resolution of a petition that expired: the event and the city's board post. Called by the host for the script, never by a resident.

### `signPetition`

- Granted when the game lists no grants: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `petitionId` | string | yes | Petition ID from listPetitions |

What the caller reads ([petitions/tools/signPetition](prompts/petitions/tools/signPetition.md)):

> Signs an open petition. Free, once per petition and irrevocable. A petition passes as soon as enough residents signed.

### `listPetitions`

- Granted when the game lists no grants: `resident`

No parameters.

What the caller reads ([petitions/tools/listPetitions](prompts/petitions/tools/listPetitions.md)):

> Lists every petition with its text, status, deadline and signature count (and the signers of public petitions).

<!-- /generated:tools -->

## Events

<!-- generated:events -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `petition_opened`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes | The petition's id, for example `P1` |
| `text` | string | yes | The text of the petition |
| `threshold` | integer | yes | The signatures it needs to pass |
| `deadlineMinute` | integer | yes | The tick at whose start it fails when still open |
| `visibility` | "public" or "secret" | yes | Whether the signers are named (`public`) or only counted (`secret`) |
| `against` | string[] | yes | The residents the petition is aimed at, as the opener names them |

### `petition_signed`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes | The petition's id, for example `P1` |
| `agent` | string | yes | The resident that signed |
| `signatures` | integer | yes | The signatures after this one |

### `petition_resolved`

Audience: everyone

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes | The petition's id, for example `P1` |
| `outcome` | "passed" or "failed" | yes | How the petition ended |
| `signatures` | integer | yes | The signatures it ended with |
| `signers` | string[] | yes | Resident ids, in signing order |

<!-- /generated:events -->

## Options

<!-- generated:options -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

This mechanic takes no options.

<!-- /generated:options -->

## Services

<!-- generated:services -->
<!-- Written by `pnpm docs:mechanics` from the head and the prompt files; edit those, not this block. -->

### `petitions`

Petitions residents sign.

| Method | Kind | Input | Output | Summary |
| --- | --- | --- | --- | --- |
| `open` | command | id: string, text: string, threshold: object, deadlineMinute: integer, visibility: "public" or "secret", against?: string[] | { ok: true } or { ok: false, code: string, detail?: string } | Opens a petition (old `openPetition`): writes `petition_opened` and the city's board post. A taken id is refused with `DUPLICATE_PETITION`. |

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
| [petitions/tools/signPetition](prompts/petitions/tools/signPetition.md) | - |
| [petitions/tools/listPetitions](prompts/petitions/tools/listPetitions.md) | - |
| [petitions/replies/petition-signatures](prompts/petitions/replies/petition-signatures.md) | `signatures`, `threshold`, `deadline` |
| [petitions/replies/petition-signers](prompts/petitions/replies/petition-signers.md) | `signers` |
| [petitions/replies/petition-secret](prompts/petitions/replies/petition-secret.md) | - |
| [petitions/replies/petition-you-signed](prompts/petitions/replies/petition-you-signed.md) | - |
| [petitions/replies/petition-you-not-signed](prompts/petitions/replies/petition-you-not-signed.md) | - |
| [petitions/replies/petition-signed](prompts/petitions/replies/petition-signed.md) | `petition` |
| [petitions/replies/petitions-none](prompts/petitions/replies/petitions-none.md) | - |
| [petitions/tools/resolvePetition](prompts/petitions/tools/resolvePetition.md) | - |
| [petitions/signed-by](prompts/petitions/signed-by.md) | `signers` |
| [petitions/visibility-public](prompts/petitions/visibility-public.md) | - |
| [petitions/visibility-secret](prompts/petitions/visibility-secret.md) | - |
| [petitions/noun-one](prompts/petitions/noun-one.md) | - |
| [petitions/noun-many](prompts/petitions/noun-many.md) | - |
| [petitions/opened](prompts/petitions/opened.md) | `id`, `text`, `threshold`, `noun`, `deadline`, `visibility` |
| [petitions/resolved](prompts/petitions/resolved.md) | `id`, `outcome`, `signatures`, `threshold`, `signers` |

<!-- /generated:prompts -->

## Example

A game loads `petitions` after `channels`, whose service it requires, and grants `resolvePetition` to `script`; a
game whose grant `script` lacks it is refused at load (`SWT-G015`), where the old platform left an expired petition
open:

```ts
mechanics: [ledger({ startPoints: 10 }), channels(), petitions(), script(/* ... */)],
```

A mechanic that opens a petition imports the `/contract` entry, never the mechanic:

```ts
import { PetitionsService } from "@swarmtales/mechanic-petitions/contract";

const opened = ctx.call(PetitionsService, "open", { id: "P1", text: "Open the gate.", threshold: { count: 2 }, deadlineMinute: 5, visibility: "public" });
```

**Load order (erratum J18).** The old run end was `progression` (the acts close), `petitions`, `channels` (the
treasuries settle), `arena`. `petitions` runs its `runEnded` after `progression` (`after:`), but it requires
`channels`, so it always loads after it and runs its `runEnded` after the treasuries are settled; with the hook `after`
alone it cannot run before `channels`. No oracle file holds a deposit, so no file holds a `treasury_settled`. At the
start of a tick it runs after `motives`, `progression`, `names`, `tribunal`, `seal`, `standoff`, `whispers`,
`standoff-tribunal` and `exile`, as the old expiry did (old `HOOK_ORDER.minuteStarted`, petitions at 1100).

## Lessons and loopholes

None recorded yet. The log is [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md).

What the port of M5-25 changed against the old platform: the service and the events moved from `mechanics/shared` to
this package's `/contract`; the old `requires` of `ledger` is gone (it was never asked); a game without the grant of
`resolvePetition` is refused at load instead of leaving a petition open; the old migration of the version-0 slice is
not carried (an old snapshot cannot be resumed, A56). Open: the kernel runs no call staged by a `runEnded` hook, so a
petition still open at the end of a run is failed in the state but `petition_resolved` and the city's post are not
written (erratum of M5-25; the test is marked `it.fails`).

## Tests

Offline, with the real `channels` and `ledger` and a stand-in for the script that opens petitions.
`test/petitions.test.ts`: the carried cases of the old `test/mechanics/petitions/petitions.test.ts` (the opening and
the taken id, the fraction and the singular, signing, passing, the closed and secret petitions, the expiry at the
deadline as a call of `script`, the expiry at the end of the run, the load refusal without the grant), replay and
resume from every boundary with the staged resolutions, and a fake run with the samples. `test/prompts.test.ts`: the
seventeen carried prompt texts by their sha256 on `legacy`, the tools and the staged tool.
