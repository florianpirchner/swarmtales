# @swarmtales/runlog

Run folder, JSONL sink, chain writer and run verification.

| File | What it gives |
|---|---|
| `src/folder.ts` | `openRunFolder(directory, manifest, { now })` writes `manifest.json` (canonical JSON), the genesis and `run.pub`, and returns the sink of the log; `nextRunFolder(root, gameId)` names the next `<game id>-<NNN>` |
| `src/sink.ts` | `createSink(chain, now)`: stamps each event with `at` and hands it to the chain writer |
| `src/chain-writer.ts` | `EventChain`: writes each line of `events.jsonl` as canonical JSON, chains it in `events.chain.jsonl` and signs the head at the run's end |
| `src/verify.ts` | `verifyRun(directory)`: the chain, the manifest and every line, as issues with the codes `SWT-L001` to `SWT-L005` |

The clock is injected, so a run written with a fixed clock and a fixed key is the same bytes every time. The
private key of a run lives in memory only. Verification of texts without a file system is in `@swarmtales/chain`.
The package's place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).
