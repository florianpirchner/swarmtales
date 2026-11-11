# Building the run viewer (docs/ideas/visualization-ui.md)

Status: being built (Flo's go 2026-11-11 17:52, in German: "then build it ... decide in my name").
This file holds the decisions taken on Flo's behalf and the contracts between the packages, so builders and
challengers work against one text.

## Decisions taken for Flo (2026-11-11)

| Question (paper §9) | Decision | Why |
|---|---|---|
| Scope of this build | Phases 0-3 of the paper plus the read-only story graph with run overlay (§6a) and designer stage 1 (schema binding). Designer forms and editing (phase 4) and the desktop extras (phase 5: MCP, run button, live attach) come later | biggest research value first; editing YAML from a graph is a project of its own |
| Repository | the swarmtales monorepo, new folders (Flo agreed) | shared chain verifier, schema and golden runs |
| Chain verification in the browser | one pure verifier in a new package `@swarmtales/chain` on `@noble/hashes` and `@noble/curves` (pure JS, audited, no native code); `chronicle` keeps signing with `node:crypto` and delegates verification to `chain`; a test checks the Node signer against the noble verifier | one verifier for CLI, browser and extension, synchronous, no crypto port |
| Licence | `@swarmtales/chain` and `@swarmtales/viewer-core` Apache 2.0 like `contracts`/`sdk` (others may build viewers); `viewer-ui`, `apps/viewer-web`, `apps/vscode` SUL like the rest | paper §9.3 |
| Static page public? | not deployed; `pnpm --filter viewer-web build` makes a static folder anyone can host; GitHub Pages deploy waits for Flo | publishing is an outside action |
| Marketplace / Open VSX | not published; the extension is packaged as a local `.vsix` | publishing needs Flo's go |
| React stack | React 19, Vite, React Flow (`@xyflow/react`) with elkjs for the story graph, charts as small hand-written SVG components (no chart library) | few dependencies; the charts we need are simple |
| Story-specific views | JSON view descriptors in `mechanics/<id>/views.json`, read by the UI at build time; first: chess board | no game words in core packages, no plugin code in the webview |
| Story data for the graph | (a) a story file the user opens (`*.yaml`, `*.json`), (b) registered stories exported to JSON at build time of the web app and the extension (not committed) | no generated files to keep fresh in the repository |

## Packages and their contracts

```
packages/chain         @swarmtales/chain        pure: canonical JSON (RFC 8785), schemas, verifyChainText, verifyContinuityText, snapshotStateHash, jsonHash
packages/viewer-core   @swarmtales/viewer-core  pure: RunSource, loadRun, run index, derived series, compare, story graph, run overlay
packages/viewer-ui     @swarmtales/viewer-ui    React: mountViewer(element, host)
apps/viewer-web        static app (Vite): folder drop, File System Access, GitHub raw loader
apps/vscode            VS Code extension (browser + node entry), webview hosting viewer-ui
```

"Pure" means: no `node:*` import, no DOM type, runs in a browser, a Web Worker and Node. A test fails if a pure
package imports `node:` or uses `Buffer` or `process` (`test/viewer-core/pure-packages.test.ts`); both packages
compile with `lib: ES2023` and no `@types/node`, so the compiler refuses a Node or DOM global too.

Decisions of wave 1 (builder):

- `chain` depends on no workspace package. The continuity check compares an old log's event types under their
  current names (`withCurrentType` of `legacy-log`); `legacy-log` is pure, but it is SUL and carries the whole
  old event vocabulary, so `verifyContinuityText` takes a `normalize` function and chronicle's file wrapper
  passes `withCurrentType`. The viewer checks a single run (`verifyRun`); continuity in the browser can pass the
  same function later.
- Ed25519 is checked RFC 8032 strict (`zip215: false`), as OpenSSL behind `node:crypto` checks it. The signer
  still hashes with `node:crypto` (the hot path); `test/chain/noble-verifier.test.ts` shows both hash alike.
- `viewer-core` needs no type from `contracts` (it reads stories by their structure), so it depends only on
  `chain`; the dependency rule still allows `contracts`.

### RunSource (viewer-core)

```ts
interface RunSource {
	/** Entries of a directory, relative to the source root, "" is the root. */
	list(dir: string): Promise<readonly { name: string; kind: "file" | "dir" }[]>;
	/** File content as text, or undefined when missing. */
	readText(path: string): Promise<string | undefined>;
}
```

Implementations: an in-memory map (tests), a dropped folder or File System Access handle (viewer-web), GitHub
raw/contents API (viewer-web), `vscode.workspace.fs` behind a postMessage bridge (apps/vscode).

### What viewer-core offers (built in wave 1; the contract wave 2 builds the UI against)

All from `@swarmtales/viewer-core`; every function is synchronous except the two that read a `RunSource`.

**Reading**

- `memorySource(files: Record<path, text>): RunSource`: a source over a map (tests, files already in memory).
- `joinPath(...parts): string`: joins `/` paths (`""` is the root).
- `findRuns(source, dir = "", { depth = 6 }): Promise<RunSummary[]>`: run folders (a folder with `events.jsonl`) under
  `dir`, sorted by path; a run folder is not searched further. `RunSummary`: `dir`, `name` (the folder, or the folder
  above `run/`), `story?`, `title?`, `startedAt?`, `agents?`, `costUsd?` (from `000-run.json` and `usage.json` only),
  `signed`, `hasReport`.
- `loadRun(source, dir): Promise<RunModel>`: throws only without `events.jsonl`. `RunModel`: `dir`, `name`, `meta?`
  (`000-run.json`, `RunMeta`), `genesis?` (the chain's genesis as written, not verified), `events: RunEvent[]`,
  `usage?` (`usage.json`, `UsageFile`), `analysis?` (`analysis.json`, raw JSON), `report?` (`REPORT.md`),
  `analysisReport?` (`ANALYSIS.md`), `transcripts: {agent, path, promptPath?}[]` (from `agents/*.md`, read them
  lazily with `source.readText`), `texts` (`events`, `chain?`, `publicKey?`: what `verifyRun` checks), `issues:
  LoadIssue[]` (`{file, line?, reason}`: a broken line or file; the rest still loads).
- `parseEvents(text): {events, issues}`; `RunEvent`: `seq` (the line's, else its line number), `minute` (else the
  line before's), `type`, `at?`, `actor?`, `line`, `data` (the whole parsed line). `actorOf(data)` takes the first
  of `ACTOR_FIELDS` (`actor`, `agent`, `by`, `from`, `author`, `voter`, `seat`, `resident`). `stringField(event,
  name)` and `numberField(event, name)` read a field safely.
- `RunMetaSchema`, `UsageFileSchema` (Typebox, open to unknown fields) and their types.

**Checking**

- `verifyRun(model, { publicKey? }): RunVerification`: `{signed: false}` without a chain, else `{signed: true,
  checkedWith: "run.pub" | "given key", verdict: ChainVerdict}` (from `@swarmtales/chain`: `ok` with `lines`, `head`,
  `genesis`, `heads`, or the first broken `line` and the `reason`, the texts `swt log verify` prints).

**Index and series**

- `indexRun(events): RunIndex`: `events` (by seq), `firstSeq`, `lastSeq`, `lastMinute`, `bySeq(seq)`,
  `atMinute(minute)`, `byActor(actor)`, `byType(type)`, `actors()` and `types()` (in first-seen order),
  `seqAtMinute(minute)` (the scrubber's minute to seq), `upTo(seq)`, `latest(type, seq)` (the last event of a type at
  or before seq: the state to show at that point).
- `usageByMinute(events, by = "total" | "actor" | "model"): UsagePoint[]` (`minute`, `key`, `requests`, `input`,
  `output`, `cacheRead`, `cacheWrite`, `costUsd`, from the `usage` lines; the actor is the role or resident, e.g.
  `A01`, `GM`, `CL`); `usageTotals(events, by)` sums them per key.
- `actorLanes(events): Lane[]` (`actor`, `seqs`, `perMinute`): one lane per actor.
- `typeCounts(events, seq?)`, `toolCounts(events, seq?)`: `{key, count}[]`, most frequent first (tools from
  `tool_call` lines).
- `messageOf(event)`: a message is an event with a `text`, an actor and a recipient in `to` (one or a list,
  `"all"` included), `cast`, `group` (`group:<id>`) or `team` (`team:<id>`); a delivery without text is none, so
  a DM counts once. `messageGraph(events, seq?)`: `nodes` and `edges` (`from`, `to`, `count`, `firstSeq`,
  `lastSeq`, `types`) up to a seq.

**Compare and report**

- `compareRuns(models, metrics?: Record<name, (model) => number | undefined>): Comparison`: `rows` (`dir`, `name`,
  `story?`, `seed?`, `models` (genesis, else `000-run.json`), `result?` (the run end's `reason`), `ended`,
  `costUsd?` (`usage.json`, else the usage lines), `minutes`, `events`, `metrics`) and `spread` per column
  (`costUsd`, `minutes`, `events`, each metric: `n`, `mean`, `min`, `max`, `stdev`). `spreadOf(numbers)` alone.
- `reportLinks(markdown, index?): ReportLink[]`: every `#123` (not `&#123;`, not inside a word) with its `start`,
  `end`, `seq` and, with an index, the `event`.

**Story graph and overlay**

- `storyGraph(input: unknown): StoryGraph`: from a story as plain JSON, or a wrapper with it under `story`
  (`swt story show <name> --json`, `000-run.json`). `kind`: `levels`, `mechanics` (a core story: start, its
  mechanics in load order, overseers, run end) or `unknown`. `nodes: GraphNode[]` (a union by `kind` with `id`,
  `label`, `parent?` (the act of a level)): `start`, `level` (`level`, `reward?`), `act` (`fromLevel`), `role`
  (gamemaker, `fromLevel`, `role`), `cast`, `rule` (`rule`, `trigger`, `conditions` as text), `trigger` (a time or
  other trigger without a node of its own, `minute?`), `action` and `lottery` (`rule`, `action` kind), `petition`,
  `outcome` (`passed`/`failed`), `collection`, `mechanic`, `overseer`, `end` (`finished`: past the last level; `run`:
  the run end, `minutes?`). `edges: GraphEdge[]` (`id`, `from`, `to`, `kind`, `label?`) of kind `sequence` (levels or
  mechanics in order), `trigger` (level, petition outcome, collection or trigger node to rule), `condition` (what a
  rule's `when` reads, to the rule), `action` (rule to action, petition outcome to its actions), `branch` (petition
  to its outcomes, lottery to its draws), `role`, `cast`, `collection`. `issues`: parts that did not fit.
- `runOverlay(graph, run, vocabulary = DEFAULT_VOCABULARY): RunOverlay`: `visits` (node id to `{seq, minute, count}`
  of the first and all events that reached it), `skipped` (rule or action node to how often it fired but was
  skipped), `edges` (ids of edges with both ends reached). A level is reached at the first `level_up` with that
  `to` (the first level at the first event), `end:finished` at a `level_up` past the last level, a rule or action
  at its `director_action`, a petition, outcome, collection or cast at an event naming it (`petition` with
  `outcome`/`status`/`result`, `into`, `cast`), an act or role with its first level, `end:run` at `run_end`.
  Mechanic nodes are not marked (the log does not say which mechanic wrote a line). `OverlayVocabulary` names
  the four event types for a log that uses others.

The story JSON for the graph: `swt story show <name> --json` (a level story: the summary plus the whole story
under `story`; a core story such as `chess` or a variant by name: `{id, title, kind: "core", minutes, residents,
mechanics, story}` with `story` the `storyData` of the core story). A build script of viewer-web or the extension
can loop over `swt story list --json` and the core story names (`coreStoryNames()` in `stories/index.ts`) and write
these files.
