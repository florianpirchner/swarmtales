# Stability of the API

From the merge of the gate of milestone M5 (issue M5-57) until 1.0 is tagged, the public surface of Swarm Tales is
frozen (decision A60). After 1.0, semantic versioning takes over. This page says what is frozen, what may still be
added, and how a break is asked for. The record of every change is [`../API-FREEZE.md`](../API-FREEZE.md).

## What is frozen

| Surface | Frozen as |
|---|---|
| the public exports of `@swarmtales/contracts`, `kernel`, `sdk`, `engine`, `chain`, `prompts`, `runlog`, `testkit`, `models` and of the umbrella package `swarmtales` | their committed API reports, `packages/<name>/<name>.api.md` |
| the contracts of the base mechanics `channels`, `consensus`, `decisions`, `exile`, `human-hand`, `ledger`, `team-channel` and of `mechanics/contracts` (with `identity`, `allowance` and `receipt-source`) | their committed API reports |
| the formats: the log envelope (`EnvelopeSchema`), the run manifest (`RunManifestSchema`), the snapshot file with its section `sessions`, the hand file, the oracle format version 1 (`OracleSchema`) | the hash of each schema in the frozen list |
| the command line: the commands, their flags and exit codes | the table in `apps/cli/src/flags.ts`, printed on [`cli.md`](cli.md) |
| the error codes | a code keeps its meaning and is never reused ([`errors.md`](errors.md)) |

The frozen list is `scripts/api-freeze/frozen.json`; a gate of `pnpm check` holds each file against its row
(issue M5-51).

## What is not frozen

- `@swarmtales/lab`, `viewer-core` and `viewer-ui`: tools of this repository; no author codes against them.
- The game mechanics, `marks` and `names` among them: original games are renamed at M6, and the contract of a game
  mechanic has its game as its only user.
- An export tagged `@internal`: it is no API, even where a package exports it, and it may change or go. Code outside
  its package does not import it.
- The wording of help texts, and the texts of why and fix of an error.
- The reserved parts that M5 did not build ([`../API-FREEZE.md`](../API-FREEZE.md), "Not in the frozen surface").
  When one is built, it comes as an addition.

## What an addition is

A change that only adds lines to a frozen report or schema is an addition: a new export, a new optional field of a
format, a new hook point, a new option that has no effect when it is left out. It comes by an issue of kind
`interface-change` that names its decision row in `DECISIONS.md`. A fix of a TSDoc text changes the report too; it is
an addition "docs only" under decision A60.

The gate, not the builder, decides what a change is: it compares the text now with the text at the row's `base`
commit. A removed or changed line is a break; only added lines are an addition.

How an addition lands:

1. Make the change; run `pnpm build`, then `pnpm api:update`.
2. Add a row to [`../API-FREEZE.md`](../API-FREEZE.md) with the path, the kind and the decision row.
3. Run `pnpm api:freeze --write`; it writes the new hash, the row and the base into `frozen.json` once the row exists.

## How to ask for a break

A break before 1.0 is the owner's decision (section 8 of the M5 specification). Open an issue that says what breaks,
who is hit and why an addition cannot do it, with the evidence (a measurement, a failed test, a licence fact; taste
is no evidence). With the owner's go, the decision row in `DECISIONS.md` section 9 says "the owner's go", and the row
of [`../API-FREEZE.md`](../API-FREEZE.md) names it, of kind "break". The gate refuses a break whose decision row does
not say so.
