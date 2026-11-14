# @swarmtales/viewer-ui

Viewer library: the views of a run. Its place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).

`mountViewer(element, setup)` shows the viewer in an element of a page: the run list, the games, and per run the
overview with the chain badge, the replay (timeline, event list, lanes per actor, highlights, message graph), the
report, the charts and the comparison. The `ViewerSetup` names the `RunSource` and what the page knows beside the
runs (view descriptors, game descriptions).

The replay reads the projection of `viewer-core` (`projectRun`). An activation is one row of the event list and one
card with its calls, their answers and the records of its driver; a Director's activation is a row of its own kind
with the events it was woken for and its acts; a decision is one card (proposed, each amendment, settled). A call
of the human is a marked row that carries its answer, and the header shows the badge "human-influenced" when the
log has one. A pause is a band of rows from `paused` to `resumed` and a band between two ticks over the actors'
lanes, the resume marker (`run_resumed`) is a line across both with the run it came from, and a suspended actor
(a banished resident) is grey from the event on: its lane, and each later row of it.

The code is carried from the old platform; the views read `RunEvent` records and do not know which reader made them.
A view that keys on an event type of the old platform (`run_end`, `usage`, `tool_call`, `thinking`) finds none in a
run of the new platform. Not carried: the Story tab (the graph of a game's definition), and with it the
dependencies `@xyflow/react` and `yaml`.

The style sheets under `src/styles/` are imported by `src/mount.tsx` and loaded by the bundler of the page; the build
copies them to `dist/styles/`. The chain is checked in a Web Worker (`src/verify-worker.ts`) where the bundler of
the page builds one, and on the main thread otherwise.

## Third-party dependencies

| Package | Version | Licence | For |
|---|---|---|---|
| `react`, `react-dom` | 19.3.1 | MIT | the components |
| `marked` | 18.2.0 | MIT | the report as HTML |
| `dompurify` | 3.4.17 | `MPL-2.0 OR Apache-2.0`, used under Apache-2.0 | sanitising that HTML |
| `@types/react`, `@types/react-dom` (development) | 19.3.0 | MIT | types |
