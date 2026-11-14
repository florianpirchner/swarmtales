# Petitions

A collective lever. The story's script opens a petition with a text, a threshold and a deadline; residents read open
petitions with `listPetitions` and sign them with `signPetition`. A petition passes the moment enough residents have
signed and fails at its deadline or at the run's end, and the script reacts to the outcome.

Copied from `mechanics/petitions/README.md` by `scripts/export-oracles.ts`; do not edit.

## How it plays

1. **Opening.** Only the script opens petitions (`petitions.open`, the script action `openPetition`): an id, a text, a
   threshold (a count, or a fraction of the residents rounded up), a deadline minute and whether the signers are
   public or secret. `petition_opened` is written and the city announces it.
2. **Signing.** `signPetition` is free, once per petition and irrevocable (`petition_signed`). A secret petition keeps
   its signers out of every reply and board post; a public one names them.
3. **Resolution.** At the threshold the petition passes at once. At the start of its deadline minute, or when the run
   ends, an open petition fails. The expiry is a call of the script: the story must grant `resolvePetition` to
   `script` (without the grant an expired petition stays open). Either way `petition_resolved` is written and the
   city posts the result; the script's `onPass` or `onFail` run on that event (one may open the next petition).

**Note:** the shipped stories load the mechanic, but none of their scripts opens a petition at the moment, so the
tools are granted and unused.

## Tools

### `resolvePetition`

- Suggested for: `script`
- Serves only: `script`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `petition` | string | yes |  |
| `outcome` | "passed" or "failed" | yes |  |

What the caller reads (tools/resolvePetition):

> Writes the resolution of a petition that expired: the event and the city's board post. Called by the host for the script, never by a resident.

### `signPetition`

- Suggested for: `resident`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `petitionId` | string | yes | Petition ID from listPetitions |

What the caller reads (tools/signPetition):

> Signs an open petition. Free, once per petition and irrevocable. A petition passes as soon as enough residents signed.

### `listPetitions`

- Suggested for: `resident`

No parameters.

What the caller reads (tools/listPetitions):

> Lists every petition with its text, status, deadline and signature count (and the signers of public petitions).

## Events

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

## Options

This mechanic takes no options.


