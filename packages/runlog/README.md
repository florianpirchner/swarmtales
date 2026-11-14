# @swarmtales/runlog

Run folder, JSONL sink, chain writer, snapshot files and run verification.

| File | What it gives |
|---|---|
| `src/folder.ts` | `openRunFolder(directory, manifest, { now })` writes `manifest.json` (canonical JSON), the genesis and `run.pub`, and returns the sink of the log; with `{ resumedFrom, prefix }` it opens the folder of a resumed run, which repeats the log of the previous run up to the snapshot's checkpoint (`SWT-L007` when the prefix is not what the checkpoint signed); `nextRunFolder(root, gameId)` names the next `<game id>-<NNN>`. `SWT-L006` refuses a file that would hold a secret |
| `src/sink.ts` | `createSink(chain, now)`: stamps each event with `at` and hands it to the chain writer |
| `src/chain-writer.ts` | `EventChain`: writes each line of `events.jsonl` as canonical JSON, chains it in `events.chain.jsonl` and signs the head at the run's end |
| `src/snapshot.ts` | `writeSnapshotFile(folder, snapshot, tick)` writes `<run>/snapshots/t<tick>.json` (`SNAPSHOTS_FOLDER`): the kernel's snapshot between two ticks with the run id, the game hash and the chain's signed checkpoint; it writes no event. `readSnapshotFile(path, expected?)` reads one to resume from and refuses it with `SWT-L008` when it cannot be read, is no snapshot file, was changed after it was signed, or belongs to another run or game |
| `src/verify.ts` | `verifyRun(directory, { previous })`: the chain, the manifest and every line, as issues with the codes `SWT-L001` to `SWT-L005`; with `previous`, the folder of the run that was resumed, also the continuity of the two runs (`SWT-L007`, `RunVerdict.continuity`) |
| `src/firings.ts` | `findFirings(log)`: for every firing a Director took, the line that fired it. No payload holds a place on the log (decision A34), so the way from `asked.firings[i]` to the trigger is: the entry whose `director` is the actor of the `asked` line and whose `n` is that number; its `trigger` is the seq of the line of the firing's tick with that event type and payload (the k-th such firing is the k-th such line), its `taken` the seq of the reply of `take` that lists it |
| `src/leaks.ts` | `findLeaks(directory, leaks)`: the files of a run folder in which a given test finds a secret |
| `src/catalogue.ts` | the why and the fix of the codes `SWT-L001` to `SWT-L005`, `SWT-L007` and `SWT-L008` (`SWT-L006` carries its own text in `folder.ts`) |

The clock is injected, so a run written with a fixed clock and a fixed key is the same bytes every time. The
private key of a run lives in memory only. Verification of texts without a file system is in `@swarmtales/chain`.
The package's place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).
