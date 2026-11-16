# Building the run viewer (docs/ideas/visualization-ui.md)

> **Carried from the old platform.** This paper was written for the old platform, before the rewrite, and is kept as
> it was, except for its links. Links to the other papers of [`docs/history/`](../README.md) stay relative; paths into
> code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do not exist on this
> branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

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
| React stack | React 19, Vite, React Flow (`@xyflow/react`) for the story graph (laid out by a small column layout of our own; elkjs was dropped in the fix wave), charts as small hand-written SVG components (no chart library) | few dependencies; the charts we need are simple |
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
- Ed25519 is checked RFC 8032 strict (`zip215: false`): at least as strict as OpenSSL behind `node:crypto`, and
  stricter for small-order keys (OpenSSL accepts R = identity, S = 0 under the identity key; noble does not, pinned in
  `noble-verifier.test.ts`). Base64 is decoded strictly (no stray characters, padding that fills the last quantum,
  zero unused bits; padding itself stays optional), and `keyFingerprint` names an undecodable key `(not base64: "…")`
  instead of hashing nothing. The signer
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
- `findRuns(source, dir = "", { depth = 6, concurrency = 6, onDetails? }): Promise<RunSummary[]>`: run folders (a folder
  with `events.jsonl`) under `dir`, sorted by path; a run folder is not searched further. `RunSummary`: `dir`, `name`
  (the folder, or the folder above `run/`), `story?`, `title?`, `startedAt?`, `agents?`, `costUsd?` (from `000-run.json`
  and `usage.json` only), `signed`, `hasReport`, `pending?`. The details are read at most `concurrency` runs at a time.
  With `onDetails` the call answers from the listing alone (rows marked `pending: true`) and hands each run's full
  summary to `onDetails` as it is read: the run list shows the rows of a GitHub tree at once and fills story, date
  and cost afterwards.
- `loadRun(source, dir, { actors? }): Promise<RunModel>`: throws only when `events.jsonl` is missing or cannot be read; a
  rejected optional read (a rate limit, a folder that went away) is an issue `could not be read (…)`. `RunModel`: `dir`, `name`, `meta?`
  (`000-run.json`, `RunMeta`), `genesis?` (the chain's genesis as written, not verified), `events: RunEvent[]`,
  `usage?` (`usage.json`, `UsageFile`), `analysis?` (`analysis.json`, raw JSON), `report?` (`REPORT.md`),
  `analysisReport?` (`ANALYSIS.md`), `transcripts: {agent, path, promptPath?}[]` (from `agents/*.md`, read them
  lazily with `source.readText`), `texts` (`events`, `chain?`, `publicKey?`: what `verifyRun` checks), `issues:
  LoadIssue[]` (`{file, line?, reason}`: a broken line or file; the rest still loads).
- `RunEvent`: `seq` (the line's, else its line number), `minute` (else the line before's; a `seq` that is not a safe
  whole number from 0, or a `minute` outside 0 to 100 000, is an issue and is replaced the same way), `type`, `at?`, `actor?` (who
  acted), `subject?` (whom the line was about), `line`, `data` (the whole parsed line). The actor comes from the line's
  type rule in the actor vocabulary, else the first of `ACTOR_FIELDS` (`actor`, `agent`, `by`, `from`, `author`,
  `voter`, `seat`, `resident`). `DEFAULT_ACTORS` (`events.ts`): `group_membership` actor `by`, subject `agent`;
  `director_action`/`director_skipped` actor `director`, subject `actor`; `guard_verdict` actor `guard`, subject `agent`;
  `exiled` actor `by`, subject `agent`; `convoy_audited` actor `by`, subject `seat`; `receipt_forged` actor `by`, subject
  `from`; `piece_claimed` actor `agent`, subject `from`; `goal_dealt`, `goal_resolved`, `exile_gate`, `factor_burned`
  subject `agent` and no actor (the city did it). A rule is `{actor?: field | {name}, subject?: field}`; a caller's rules
  are added to the defaults, a type given replaces its default (`{}`: the plain field order).
- Exported by their source files, not by the index (only tests use them): `parseEvents(text, file?, actors?)`,
  `actorOf(data, rule?)`, `stringField`, `numberField`, `RunMetaSchema`, `UsageFileSchema`, `messagesOf`, `spreadOf`, the
  default vocabularies. The index exports what the hosts use; `scripts/production-exports.json` is back at its
  length before the viewer (217 entries).
- `Vocabulary` (index): `{actors?, messages?, overlay?}`, the three vocabularies in one value for a host
  (`ViewerHost.vocabulary`), each added to its defaults.

**Checking**

- `verifyRun(model, { publicKey? }): RunVerification`: `{signed: false}` without a chain (with `unreadable` when the
  chain file is listed but could not be read: a rate limit, a 403), else `{signed: true, checkedWith: "run.pub" |
  "given key", key?, verdict: ChainVerdict}` (`key`: the fingerprint of the genesis' public key, `keyFingerprint`;
  the verdict from `@swarmtales/chain`: `ok` with `lines`, `head`, `genesis`, `heads`, or the first broken `line` and
  the `reason`, the texts `swt log verify` prints).
- What a valid chain proves (the badge says "chain valid, N lines, signed by run.pub (key fingerprint …)" and the
  Overview says the rest): the log matches the key in the run folder. Whoever can replace the folder can write another
  log and sign it with a new key; only a key published elsewhere (compare the fingerprint, or `swt log verify --key`)
  ties the log to its author, and external anchoring is not built yet (`event-log-signing.md`, "The limit").
- `storyHashOf(story)`: the genesis' `storyHash` of a story value (sha256 of its canonical JSON), `undefined` for a
  value that is no JSON.

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
- `messageGraph(events, seq?, vocabulary?)`: `nodes` and `edges` (`from`, `to`, `count`, `firstSeq`, `lastSeq`,
  `types`) up to a seq. A message is a line of a type the message vocabulary names, never any line with a `text`.
  `DEFAULT_MESSAGES` (`messages.ts`): `dm_sent`, `market_said`, `gamemaker_note` (to `to`; a note to the `board` is
  left out, the same text is a `board_post`), `cast_dm` (to `cast`), `group_post` (`group:<id>`), `team_post`
  (`team:<id>`), `board_post` (to `board`), `convoy_spoken` (table talk, to `table`); system author `CITY` (its board
  posts and group notices are announcements). So `notice` lines (delivery receipts with text), `receipt_issued` and
  `brain_written` are not messages, and a direct message counts once. A `MessageVocabulary` is `{types?: Record<type,
  rule | false>, systemAuthors?}`: types are added to the defaults (`false` removes one), system authors replace them;
  a rule is `{to: {field, prefix?} | {fixed}, from?, except?}`. On cityofkeys act2-12a-003: 130 `dm_sent`, 143
  `gamemaker_note`, 192 `board_post`, 74 `group_post`, 4 `cast_dm` (before: 1,023 "messages", 818 of them non-resident).

**Compare and report**

- `compareRuns(models, metrics?: Record<name, (model) => number | undefined>): Comparison`: `rows` (`dir`, `name`,
  `story?`, `seed?`, `models` (genesis, else `000-run.json`), `result?` (the run end's `reason`), `ended`,
  `costUsd?` and `costSource?` (`log`: the sum of the usage lines, which the chain covers on a signed run; else
  `usage.json`), `minutes`, `events`, `metrics`) and `spread` per column (`costUsd`, `minutes`, `events`, each metric:
  `n`, `mean`, `min`, `max`, `stdev`).
- `reportLinks(markdown, index?): ReportLink[]`: every `#123` (not `&#123;`, not inside a word) with its `start`,
  `end`, `seq` and, with an index, the `event`.

**Story graph and overlay**

- `storyGraph(input: unknown): StoryGraph`: from a story as plain JSON, or a wrapper with it under `story`
  (`swt story show <name> --json`, `000-run.json`). `kind`: `levels`, `mechanics` (a core story: start, its
  mechanics in load order, overseers, run end) or `unknown`. `nodes: GraphNode[]` (a union by `kind` with `id`,
  `label`, `parent?` (the act of a level)): `start`, `level` (`level`, `reward?`), `act` (`fromLevel`), `role`
  (gamemaker, `fromLevel`, `role`), `cast`, `rule` (`rule`, `trigger`, `conditions` as text), `trigger` (a time or
  other trigger without a node of its own, `minute?`), `action` and `lottery` (`rule`, `action` kind, `cast?`, `into?`), `petition`,
  `outcome` (`passed`/`failed`), `collection`, `mechanic`, `overseer`, `end` (`finished`: past the last level; `run`:
  the run end, `minutes?`). `edges: GraphEdge[]` (`id`, `from`, `to`, `kind`, `label?`) of kind `sequence` (levels or
  mechanics in order), `trigger` (level, petition outcome, collection or trigger node to rule), `condition` (what a
  rule's `when` reads, to the rule), `action` (rule to action, petition outcome to its actions), `branch` (petition
  to its outcomes, lottery to its draws), `role`, `cast`, `collection`. `issues`: parts that did not fit.
- `runOverlay(graph, run, vocabulary?: Partial<OverlayVocabulary>): RunOverlay` (the names given replace those of
  `DEFAULT_VOCABULARY`; the log is bucketed by type, rule, action, petition, `into`, cast and actor in one pass, then
  each node is one lookup): `visits` (node id to `{seq, minute, count}`
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

## viewer-ui host contract (wave 2; wave 3, the VS Code extension, builds against it)

`@swarmtales/viewer-ui` ships source (no build step) for a bundler; it imports its CSS (also React Flow's), so the
bundler must handle `.css` imports (Vite and esbuild do). The chain check starts `host.verifyWorker()` when the host
gives one, else a module Web Worker through `new Worker(new URL("./verify-worker.ts", import.meta.url), { type:
"module" })`; where neither starts, the check runs on the main thread after a paint. A check that throws ends as a grey
"could not check the chain: …" badge, never as "checking" forever; a run without a chain file is answered at once.

```ts
import { mountViewer, type ViewerHost, type ViewerHandle } from "@swarmtales/viewer-ui";
import type { ViewDescriptor } from "@swarmtales/viewer-ui/views"; // also: parseViews(text), ViewDescriptorSchema, pathValue

interface ViewerHost {
	readonly source: RunSource;                       // its root is searched for run folders (events.jsonl)
	readonly title?: string;                          // top bar
	readonly stories?: Readonly<Record<string, unknown>>; // story JSON by story id, for the story graph
	readonly views?: readonly ViewDescriptor[];       // story-specific views
	readonly openExternal?: (path: string) => void;   // open a source file in the host's editor; buttons show only when set
	readonly vocabulary?: Vocabulary;                 // viewer-core's actor, message and overlay words, added to the defaults
	readonly initialStory?: { readonly name: string; readonly story: unknown }; // the Story tab shows it first (a story file the user picked)
	readonly verifyWorker?: () => Worker;             // starts the chain-check worker where the module worker cannot load (VS Code: a blob)
}
function mountViewer(element: HTMLElement, host: ViewerHost): ViewerHandle; // { unmount(): void }

interface ViewDescriptor {
	id: string; title?: string;
	kind: string;                    // renderer; "board-fen" is built in, unknown kinds are ignored
	event: string;                   // event type carrying the state (the view shows the last one at or before the replay seq)
	fields: Record<string, string>;  // renderer input name -> dotted path into the event ("fen", "move.to", "$.fen")
}
```

- **Stories for the graph:** a run's story is looked up in `host.stories` by `000-run.json` `storyId`, then the genesis
  `story`, then the same name with trailing `-suffix` parts cut (`chess-p80` finds `chess`), then the `story` the run's own
  `000-run.json` carries (level stories). The value is `swt story show <name> --json`'s `story` (level stories: the story;
  core stories: `storyData`). The user can also open a `.yaml`/`.json` story file in the Story tab.
- **Story version:** a signed run's genesis carries `storyHash`. Each candidate (the run's own `000-run.json` story, the
  host story of the same id, then the shorter names) is hashed with `storyHashOf`; the first that matches is drawn with a
  green note "the version this run played". When none matches (today's story changed since the run), the first
  candidate is drawn under a warning banner and the overlay is labelled approximate (still allowed). An unsigned run
  says it cannot be checked.
- **View descriptors:** `mechanics/<id>/views.json` (a list, or `{ "views": [...] }`), Typebox-checked by `parseViews`.
  `board-fen` reads `fields.fen` (required), `fields.lastMove` (a coordinate move such as `e2e4`) and `fields.caption`.
  Chess ships `mechanics/chess/views.json` (event `move_played`, `fen`, `written`, `san`).
- **Location:** the viewer keeps its place in `location.hash` (`#run=<dir>&view=replay&seq=57`; a bare `#seq=57` opens the
  replay). A webview without a usable `location` should pass through the hash it is given or ignore it.
- **Web app data:** `scripts/export-viewer-data.ts` writes `apps/viewer-web/public/viewer-data.json`
  (`{stories, aliases, views}`; not committed); the extension can reuse the script's output.
- **Story tab:** `story-fold.ts` folds viewer-core's graph for drawing: a rule is one card with its trigger, its
  conditions and its actions as chips (a time trigger is a dotted line from the start); petitions, outcomes, lotteries
  and collections stay cards, so the picture is the level backbone, the rules and the branches. "Show details" turns
  the actions back into cards. `story-layout.ts` puts the backbone top to bottom in one column, the rules a level fires
  in columns to its right (by distance: rule, petition or collection, outcome, the rules those fire), roles and cast
  members left of their level, and each act as a box around its levels; it opens at a readable zoom fitted to the
  width, scrolled to the top (wheel pans, ctrl+wheel zooms). Branch lines are labelled and coloured (passed green,
  failed red, a lottery draw violet); with a run laid over, the backbone the run went down is a thick glowing line,
  reached cards and chips carry their first minute (`m12 · 3×`, click: replay from there), the rest is faded.
- **Licences:** React, React Flow, marked, DOMPurify (MPL-2.0 or Apache-2.0) and yaml are
  permissive.
- **Reports:** a report's text may come from a model or a stranger's pull request. `safeHtml` (`markdown.ts`) renders
  it with marked and sanitises it with DOMPurify (no scripts, event handlers, forms, frames, embeds, `<style>`,
  `<link>`, `<meta>`, `<base>`, and no `style`, `class`, `id` or `target` attributes: a report cannot reuse the viewer's
  classes to fake a badge). `#seq` references become links afterwards, on the text nodes of the sanitised DOM, built
  as elements. The report box is `contain: paint` and `overflow: auto`, so nothing draws outside it.
- **CSP (viewer-web):** the build puts a `Content-Security-Policy` meta into `index.html` (`vite.config.ts`):
  `default-src 'self'`, scripts from `'self'` only, `img-src 'self' data: blob:` (no remote images: a report cannot
  call home), `connect-src 'self' https://api.github.com https://raw.githubusercontent.com`, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'none'`. The dev server has none (Vite injects inline scripts).
- **GitHub source:** when GitHub sends only part of a large repository's tree (`truncated`), the web app shows a notice
  that runs may be missing and suggests a smaller path. The launcher builds its query with `URLSearchParams`.

## VS Code extension (wave 3, `apps/vscode`)

`swarmtales-vscode` (private, SUL): `browser` and `main` entries, bundled by esbuild (`apps/vscode/build.ts`, fast and
offline; part of `pnpm build`; the `.vsix` is `pnpm --filter swarmtales-vscode package`, not part of `pnpm check`).
Details and use: `apps/vscode/README.md`.

- **Bridge:** the webview mounts the viewer with a `RunSource` that sends `list`/`readText` over `postMessage`; the host
  answers with `vscode.workspace.fs` (works on github.dev). Every webview message is a closed Typebox object, paths are
  folder-relative and `..`/absolute paths are refused, so are names ending in a dot or a space, and the host never
  lists or reads through a symbolic link (`stat` per path part). Strict CSP with a nonce, `localResourceRoots` = `dist/`.
- **Worker:** `build.ts` bundles `verify-worker.ts` first as a classic script and inlines it in the webview bundle; the
  webview passes `verifyWorker` (a worker from a blob URL of that code), and the CSP allows `worker-src blob:` and no
  other worker source. VS Code webviews load workers only from blob or data URLs; the check of a large log no longer
  freezes the page. Verified in Chromium under `default-src 'none'; worker-src blob:` on a signed chess run.
- **Data:** `scripts/export-viewer-data.ts [out]` now takes an optional output path; the extension writes `dist/viewer-data.json`.
- **Designer stage 1:** `yamlValidation` (`**/*.story.yaml`, `**/story.yaml`) and `jsonValidation` (`*.story.json`) bind the bundled `story.schema.json`.
- **Run Story…** (desktop only, trusted workspaces only: `capabilities.untrustedWorkspaces` is `limited` and the menus
  carry `isWorkspaceTrusted`; the command checks `workspace.isTrusted` too) types `pnpm swt run --story <file>` into a
  terminal without executing it. The path is never quoted: a name outside letters, digits, `_ . @ + = , -` and `/`
  (no part starting with `-`) is refused with a message to rename the file or type the command.
- **Verified:** the built webview bundle with the real host logic (`answer`, protocol parser) behind a fake `acquireVsCodeApi`,
  served over HTTP with the real CSP, in Chromium over `stories/chess/runs` (no CSP violations; screenshot 5-vscode-web.png).
  **Not verified:** a real VS Code (web or desktop): `@vscode/test-web` needs `update.code.visualstudio.com`, which the sandbox
  blocks. Open: run `npx @vscode/test-web` once on a machine with network.
- **Story graph of a file:** "Open Story Graph" passes the file both as an extra story and as `initialStory` (init
  message field `initialStory: {name, story}`), so the Story tab opens on it.
