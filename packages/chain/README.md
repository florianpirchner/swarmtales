# @swarmtales/chain

The pure verifier of the signed event log ([docs/design/event-log-signing.md](../../docs/design/event-log-signing.md)).
Licence: Apache 2.0.

It holds what checking a run's `events.chain.jsonl` needs, and nothing that needs Node: canonical JSON
(RFC 8785) with the I-JSON checks, the chain's schemas (genesis, line, head, checkpoint), `linkHash` and
`jsonHash`, `verifyChainText`, `verifyContinuityText` (a resumed run against the run it resumed from),
`snapshotStateHash`, `checkpointVerifies` and `keyFingerprint`. Hashes and Ed25519 come from
[`@noble/hashes`](https://github.com/paulmillr/noble-hashes) and [`@noble/curves`](https://github.com/paulmillr/noble-curves)
(pure JavaScript, audited, no native code); the `run.pub` PEM is read here (an Ed25519 SPKI DER is a fixed
12-byte prefix and the 32 key bytes). No `node:*` import and no `Buffer`, so the CLI, a browser and a Web
Worker give the same verdict (`test/viewer-core/pure-packages.test.ts` holds that).

Signing stays in `@swarmtales/chronicle` (`EventChain`, `node:crypto`), which also keeps the file-based
`verifyChain` and `verifyContinuity` and delegates every check to this package.
`test/chain/noble-verifier.test.ts` checks the Node signer against this verifier, tampered copies, and every
recorded run in `stories/*/runs/*/run/`.

`verifyContinuityText` takes `normalize` for the event types an older log wrote under another name; the
chronicle wrapper passes legacy-log's `withCurrentType`, so this package needs no workspace dependency.
