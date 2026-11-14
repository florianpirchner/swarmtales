# @swarmtales/viewer-core

Viewer library: readers and the event model of a run. Its place in the layer table is in
[`docs/LAYERS.md`](../../docs/LAYERS.md).

It reads run folders through a `RunSource`, verifies the signed log with `@swarmtales/chain`, indexes the events and
derives what the views draw. No `node:*`, no DOM, no React: it runs in a browser, a Web Worker and Node. The views
work on `RunEvent` records (`src/events.ts`); two readers produce them, and `loadRun` picks one:

| | Legacy reader (`src/events.ts`, read only) | Envelope reader (`src/envelope.ts`) |
|---|---|---|
| Recognised by | no `manifest.json` | `manifest.json` with `log.format` `swarmtales.events` |
| Line | flat: `type`, `seq`, `minute`, `at`, the payload's fields beside them | a stored envelope, the payload nested |
| `RunEvent.minute` | the line's `minute` | the envelope's `tick` |
| `RunEvent.actor` | the first of `ACTOR_FIELDS`, or the rule of the type | the name of the envelope's actor id |
| `RunEvent.data` | the whole line | the payload's fields plus `type`, `seq`, `minute`, `source`, `actor`, `causedBy`, `basis`, `tool`, `at` |
| Header | `000-run.json`, `usage.json` | `manifest.json`: run id, game id and title, seed, start, actors with driver and model |
| Chain verdict | `verifyChainText` | `verifyRunTexts`, then `envelopeLogIssues` |

A `manifest.json` that is no manifest of an envelope log is reported as an issue of the run, and the folder is read by
the legacy reader. A payload that is no object stays whole under `data.payload`.

The code is carried from the old platform. Not carried: the graph of a game's definition with the overlay of a run
(the old `story-graph.ts`, `overlay.ts`, `story-hash.ts`).

`test/fixtures/legacy-run/` is a run folder in the old format; its README says where it comes from.
