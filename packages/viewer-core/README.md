# @swarmtales/viewer-core

The pure core of the run viewer ([docs/design/viewer-build.md](../../docs/design/viewer-build.md),
[docs/ideas/visualization-ui.md](../../docs/ideas/visualization-ui.md)). Licence: Apache 2.0.

It reads run folders through a `RunSource` (a folder drop, GitHub raw files, `vscode.workspace.fs`, or
`memorySource` in tests), verifies the signed log with `@swarmtales/chain`, indexes the events and derives
what the views draw: cost and tokens per minute, events per actor, counts by type and tool, who wrote to
whom up to a seq, a comparison of several runs with their spread, `#seq` links of a run report, and a story
as a graph with a run laid over it.

The core decides, the UI shows: React and the hosts (`viewer-ui`, `apps/viewer-web`, `apps/vscode`) read
runs only through this package. No `node:*`, no DOM, no game words: events are open records (`seq`,
`minute`, `type`, `at`, an actor from `actor`/`agent`/`by`/`from`/...), and a story is read by its
structure (levels, acts, director rules, cast, gamemaker roles, or mechanics in load order). Untrusted
files are parsed with Typebox and a file that does not fit becomes an issue of the run, not an exception.

The API is listed in docs/design/viewer-build.md, "What viewer-core offers". Tests: `test/viewer-core/`.
