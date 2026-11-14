# @swarmtales/chain

Pure verifier of the signed, hash-chained log of a run (layer L0, see [`docs/LAYERS.md`](../../docs/LAYERS.md)).

It holds what checking a run's `events.chain.jsonl` needs, and nothing that needs Node: canonical JSON
(RFC 8785) with the I-JSON checks, the chain's schemas (genesis, line, head, checkpoint), `jsonHash`,
`verifyChainText`, `verifyRunTexts` (the chain plus the manifest its genesis names), `verifyContinuityText` (a
resumed run against the run it resumed from), `snapshotStateHash`, `checkpointVerifies` and `keyFingerprint`.
Hashes and Ed25519 come from [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) and
[`@noble/curves`](https://github.com/paulmillr/noble-curves) (pure JavaScript, audited, no native code); the
`run.pub` PEM is read here (an Ed25519 SPKI DER is a fixed 12-byte prefix and the 32 key bytes). No `node:*`
import and no `Buffer`, so the command line, a browser and a Web Worker give the same verdict.

## What is hashed

Each line of `events.jsonl` is one stored envelope. Line n's hash is `sha256(hash(n-1) + canonical JSON of line
n)`, starting from the hash of the genesis entry. A head entry signs `{format, genesis, lines, hash}` with the
run's Ed25519 key.

## Genesis versions

| Version | Written by | Names |
|---|---|---|
| 1 | the old platform (read only, so old runs still verify) | the definition's name and hash, the seed, the models |
| 2 | this platform (`CHAIN_VERSION`) | the sha256 of the canonical JSON of `manifest.json`, and the log format |

`verifyChainText` reads both. `verifyRunTexts` asks for version 2 and compares the manifest's hash. In a version 1
log the last line must be `run_end`. In a version 2 log nothing may follow the kernel's `run_ended`; a signed log
that ends without it holds here, and the run log's verifier calls it unfinished.

## Signing

Signing needs `node:crypto` and lives in `@swarmtales/runlog`. The tests of this package carry their own copy of
the old signer (`test/signer.ts`), because this package may import no workspace package.

Carried from `packages/chain` of the old platform (tag `v0-final`), with its tests from `test/chain/` and
`test/log/chain.test.ts`.
