# Idea: a visual UI for runs and stories (run viewer and story designer)

Status: idea only (2026-11-11). Nothing is built. Brainstorm for Flo; building waits for an explicit go.

Flo asked (2026-11-11): plan the React UI for visualising runs, maybe as a VS Code extension that runs
directly in GitHub. This paper gives one recommendation, not a survey of everything possible. It connects to
the author tooling of [`overseers-and-plugins.md`](overseers-and-plugins.md) §7 (schema, `swt validate --json`,
VS Code extension, `swt mcp`), the TUI of §9, the graphical designer of §10-13 (CEL from boxes) and the signed
event log of [`../design/event-log-signing.md`](../design/event-log-signing.md).

## 1. Recommendation in one paragraph

Build **one React core that runs in a plain browser** (no Node APIs) and put it into **two thin hosts**:

1. a **VS Code web extension** (one extension that also runs on desktop VS Code and in Codespaces), so pressing
   `.` on the repository opens github.dev and a click on any `runs/<run>/` folder shows the run, its replay and
   its chain verdict, with no clone, no install of Node and no server;
2. a **static viewer page** (GitHub Pages or any static host) built from the same bundle, for people outside
   VS Code: a link for Alex or the Locatello group, or a drag-and-drop of a run folder.

The extension is the main home (Flo works in VS Code, the stories and 650+ runs live in the repository, and
github.dev works on a private repository with the GitHub sign-in). The static page comes for free and is the
development harness of the core. Running live stories, the MCP server and live attach stay on desktop or
Codespaces, where Node exists; the web host degrades to "read, verify, compare, edit".

## 2. Why this and not the alternatives

| Option | Good | Bad | Verdict |
|---|---|---|---|
| Desktop-only VS Code extension (Node host + webview) | full power: can call `swt`, read files, run stories | not "in GitHub"; every viewer needs a clone and Node | covered by the recommended extension's desktop entry point |
| **Web extension** (`browser` entry, works in github.dev, vscode.dev, desktop, Codespaces) | opens straight on GitHub, private repo works through the sign-in, the YAML language server and schema binding come with VS Code | no Node: no `swt run`, no `node:crypto`, no `node:fs` (files come through `vscode.workspace.fs`) | **yes**, with a browser-safe core |
| Static GitHub Pages app | a link anyone can open, no VS Code, easy to show | a private repository needs a token or a local folder; no editor features | **yes, as a second host** of the same bundle |
| Codespaces only | everything works, also live runs | needs a running machine (minutes to start, costs money), overkill for looking at a run | use it, do not design for it |
| Separate web platform (`web-platform.md`) | accounts, hosted runs | servers, sign-in, money; a different product | later, can reuse the core |

The deciding points: the run data is already in the repository, the viewer only reads files, and the chain
check needs only SHA-256, RFC 8785 and Ed25519, which all exist in the browser. So nothing forces a server or
Node for the viewer. The designer is mostly schema-driven forms over a YAML file, which VS Code already edits
well.

## 3. Architecture

```
packages/viewer-core   browser-safe TypeScript: parse runs, verify chain, derive views (no React, no Node)
packages/viewer-ui     React components and the app shell (run list, replay, compare, designer)
apps/viewer-web        static host: Vite build, file picker / drag-and-drop / GitHub raw URL loader
apps/vscode            the extension: browser + node entry points, custom editors, webview hosting viewer-ui
```

Rules:

- **The core decides, the UI shows.** `viewer-core` is the only place that reads `events.jsonl`,
  `events.chain.jsonl`, `run.pub`, `usage.json`, `analysis.json`, `000-run.json`, `REPORT.md` and
  `agents/*.md`. It is tested offline with the golden runs like the rest of the repository (Vitest, no DOM).
- **One file reader interface.** `RunSource { list(dir), read(path): Uint8Array }`, with three
  implementations: `vscode.workspace.fs` (extension, works on the github.dev virtual file system), the browser
  File System Access API or a dropped folder (static page), and `fetch` of raw GitHub URLs (static page, public
  repository or a fine-grained read token kept only in the tab's memory).
- **The chain check is shared, not copied.** `packages/chronicle/src/log/chain.ts` uses `node:crypto` and
  `node:fs` today. Split it into a pure verifier (`verifyLines(genesis, lines, heads, key, crypto)`) with an
  injected crypto port, and keep the Node wrapper for `swt log verify`. The browser port uses WebCrypto
  (`crypto.subtle.digest("SHA-256")`, `importKey("spki", ..., "Ed25519")`), which current Chrome, Firefox and
  Safari support; `@noble/ed25519` and `@noble/hashes` (pure JS, no native code) are the fallback. A golden test
  proves both ports give the same verdict on the same runs, including a tampered copy. `canonical.ts` has no
  imports and can move as it is; `legacy-log`'s `withCurrentType` must be checked for Node use.
- **Webview hygiene.** Strict CSP, no remote scripts, all data through `postMessage` from the extension host;
  the webview never gets a file path or a token.
- **Big logs.** The largest log in the repository is about 8 MB (cityofkeys act2-12a-003). Parse in a Web Worker,
  index by `seq` and `minute`, virtualise every list. 96-agent runs later will be several times bigger, so the
  index is built once and kept per run.
- **No game words in the core** (the slim-kernel rule of `monorepo.md` §2a). The core knows events, actors,
  minutes, costs, facts and the chain. Story-specific views (a chess board, a card table, the City of Keys map)
  come from the mechanic, see §5.

## 4. What the viewer shows

Phase order follows research value first (the positioning of 2026-11-01: an instrument for multi-agent
research).

1. **Run overview.** Header from `000-run.json` and the genesis entry (story, story hash, commit, seed,
   models), cost and tokens from `usage.json`, result table, the chain badge.
2. **Chain verification.** Green "valid, N lines, signed by run.pub", or red with the first broken line,
   the reason and a jump to that line. Optional: verify a resumed run against its previous run and snapshot,
   like `swt log verify --previous --snapshot`. A note that the badge proves integrity since the run, not
   that the run was honest before it started (no external timestamp anchoring yet).
3. **Replay.** A scrubber over `seq` and `minute`, one lane per actor (residents, overseers, `human`),
   events as marks, DMs and votes as a who-talks-to-whom graph at the current point, the facts state at that
   point, and the agent's input and answer (`turn_input`, transcripts in `agents/*.md`) beside it. Keyboard
   stepping, play at speed, deep links to `#seq` (so `REPORT.md` evidence like `#1234` becomes a link).
4. **Report beside the log.** `REPORT.md` rendered, every `#seq` reference clickable, so reviewing a draft
   report against `events.jsonl` (CLAUDE.md "after every live run") becomes one click per claim.
5. **Charts.** Cost and tokens over time per role, score or points per resident, action counts by kind, and the
   story's `analysis.json` (chess move quality and so on) through a small chart contract (§5).
6. **Compare runs.** Pick several runs (for example brain against no brain on seeds 41/43/47): a table of
   results, costs and the story's metrics, with spread across seeds. This is the view a research group asks for
   first, and the repository already has the series (chess, convoy, morris, hold'em).
7. **Run list.** Every `stories/<name>/runs/` and `examples/` folder with its index row, filter by story,
   date, model and cost.

## 5. Story-specific views without game code in the core

A mechanic may ship a **view descriptor** next to its Typebox head, for example
`views: [{ id: "board", kind: "chess-board", from: "event:move_made", fen: "$.fen" }]` or a chart descriptor
`{ kind: "line", from: "analysis.json", x: "$.ply", y: "$.cpLoss", series: "$.team" }`. The UI has a fixed set
of renderers (board grid, card table, graph, line, bar, table) and reads only the descriptor. No plugin code
runs in the webview, which matches the sandbox stance of `monorepo.md` §3b. A custom renderer by a third-party
plugin comes later, if ever, in a sandboxed iframe.

## 6. The story designer (from §10-13)

- **Source of truth stays text.** A YAML story is edited as YAML; the designer is a VS Code custom editor
  ("Open with Story Designer") on `story.yaml` that writes back through the `yaml` library's document API, so
  comments and order survive. Text and designer can be open side by side and stay in sync.
- **Stage 1 needs no designer at all:** bind `story.schema.json` to the Red Hat YAML extension (already the plan
  of §7); completion, hover and validation then also work in github.dev.
- **Stage 2, forms:** forms generated from the story schema (and the per-plugin schema once `plugins` drives
  it), showing defaults and presets of §10 with their origin like `swt story explain`.
- **Stage 3, graphs:** levels, doors and quest chains (§11) as a node graph; conditions as CEL text with a
  box builder for the simple cases (§13). CEL is checked in the browser by the chosen CEL library against the
  event, fact and parameter schemas.
- **TypeScript stories** (all registered stories today) are shown read-only in the designer from the effective
  story (`swt story show <name> --yaml`); editing them stays in code.
- **Validation:** the schema check runs in the browser; the deeper `swt validate --json` checks (grants,
  unknown prompt ids, locks on missing tools) need the story loader. Either make that check browser-safe too
  (preferred, it is pure TypeScript over loaded plugin heads) or run it only on desktop/Codespaces.

## 6a. The story as a flow graph (Flo, 2026-11-11)

Flo: stories should be shown as a React Flow graph, "really nice, with branches". Proposal:

- **The graph is derived, not drawn.** `viewer-core` builds nodes and edges from the effective story (levels,
  doors, phases, quest steps of §11, endings, the overseers that act at each point); auto layout with elkjs.
  Hand-tuned positions, if wanted, live in a small sidecar file (`story.layout.json`), never in the story.
- **Branches are edges with conditions.** A door, a quest choice or a delayed consequence becomes an edge
  labelled with its CEL condition (§13); merges and endings are visible as such. Mechanics contribute their
  node kinds through the view descriptors of §5, so the core stays free of game words.
- **The best part is the overlay of runs.** On the same graph, a run lights up the path it actually took
  (which branch, at which minute, link to `#seq`); several runs give a heat map ("in 5 of 9 seeds the city
  took the tribunal branch"). That turns the design view into a research view.
- **Same graph, designer mode.** In the designer (stage 3 of §6) the graph is editable and writes back to YAML.
- **Limit:** flat games (chess, hold'em, morris) have almost no branches; for them the graph shows phases,
  mechanics and overseers, and the real picture is the replay. The graph pays off for City of Keys, Whispers
  and the quest stories.

## 7. MCP and running stories

- **`swt mcp`** (§7 of the plugins paper) stays a Node process. The desktop extension registers it with VS Code
  (`registerMcpServerDefinitionProvider`) so Copilot or Claude in VS Code can list plugins, scaffold and validate
  stories, and read runs. In github.dev there is no MCP; the read-only parts are covered by the viewer.
- **Running a story** from the extension (desktop and Codespaces only) calls `swt run` in a terminal; keys
  come from the environment or the OS keychain, never through the webview. Live runs keep costing money, so the
  button asks once per run and shows the budget.
- **Live attach** to a running run uses the TUI's local event stream (§9) once it exists; the replay view then
  follows the tail of the log. This is a later phase.

## 8. Phased plan

| Phase | What | Where it runs | Rough size |
|---|---|---|---|
| 0 | Split the chain verifier into a pure core with a crypto port; WebCrypto port; golden test Node = browser on real and tampered runs | core | small |
| 1 | `viewer-core` (run parser, index, derived series) + `viewer-ui` with overview, chain badge, replay, report with `#seq` links; static page with folder drop | browser | medium |
| 2 | VS Code web extension: run folder → "Open run", custom editor for `events.jsonl`, schema binding for `story.yaml`; test in github.dev on the private repo | github.dev, desktop, Codespaces | small to medium |
| 3 | Charts and compare view, view and chart descriptors for two mechanics (chess board, a line chart over `analysis.json`) | all | medium |
| 4 | Story designer stage 2 (forms) and stage 3 (graph, CEL boxes) | all | large |
| 5 | Desktop extras: `swt mcp` registration, run button, live attach | desktop, Codespaces | medium |

Phases 0-2 give Flo the thing he asked for: open the repository on GitHub, click a run, see it replayed and
verified. Phase 1 is the riskiest part (replay for 8 MB logs and a useful lane view), so it is built against
the static page first, where the development loop is fastest.

## 9. Open questions for Flo

1. **Static page public or not?** If the repository stays private, the Pages app only loads dropped folders or
   uses a read token; a public "showcase" set of runs (chess series, Whispers 008) would make it a demo link.
2. **Publishing the extension** to the VS Code Marketplace and Open VSX is an outside action and needs your go;
   until then it is installed from a `.vsix` (github.dev can also load an unpublished web extension for testing).
3. **Licence of the new packages:** `viewer-core` could be Apache 2.0 like `contracts`/`sdk` (so others can build
   viewers), the UI and the extension SUL like the rest. Proposal: yes.
4. **Which first story-specific view?** Proposal: the chess board (simple, the most recent series) and the
   City of Keys lanes (the richest log).
5. **React stack:** Vite, React, a small chart library (Visx or uPlot for long time series), React Flow for the
   designer graph. Any preference, or should the spike pick?
